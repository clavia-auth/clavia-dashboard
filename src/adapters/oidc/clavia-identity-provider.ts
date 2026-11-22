import "server-only";

import {
  createRemoteJWKSet,
  customFetch as joseFetch,
  errors as joseErrors,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";
import * as oauth from "oauth4webapi";

import type { IdentityProvider } from "@/core/auth/ports";
import { SignInRefused } from "@/core/auth/ports";
import type { OperatorIdentity, PendingSignIn, TokenSet } from "@/core/auth/session";

/** The event a back-channel logout token carries (Back-Channel Logout 1.0 §2.4). */
const BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

export type ClaviaOidcSettings = Readonly<{
  issuer: URL;
  clientId: string;
  clientSecret: string;
  /** Where Clavia sends the browser back: `{dashboard}/auth/callback`. */
  redirectUri: string;
  /** The Management API, named in `audience` so the access token is issued for it. */
  audience: string;
  /** For tests: the `fetch` every request to Clavia goes through. */
  fetch?: typeof fetch;
}>;

/**
 * Clavia as the dashboard's OpenID provider, through `oauth4webapi` (authorization code
 * with PKCE S256 and a nonce, `client_secret_basic`, rotating refresh tokens, RFC 7009
 * revocation, RP-Initiated Logout) and `jose` for back-channel logout tokens.
 *
 * The provider's metadata is read from discovery once and kept; a failed read is retried
 * on the next call rather than remembered.
 */
export class ClaviaIdentityProvider implements IdentityProvider {
  private readonly client: oauth.Client;
  private readonly authentication: oauth.ClientAuth;
  private metadata: Promise<oauth.AuthorizationServer> | null = null;
  private keys: JWTVerifyGetKey | null = null;

  constructor(private readonly settings: ClaviaOidcSettings) {
    this.client = { client_id: settings.clientId };
    this.authentication = oauth.ClientSecretBasic(settings.clientSecret);
  }

  async authorize(scopes: readonly string[]): Promise<{ url: URL; pending: Omit<PendingSignIn, "returnTo"> }> {
    const as = await this.server();
    if (as.authorization_endpoint === undefined) {
      throw new Error("Clavia's discovery document names no authorization endpoint.");
    }
    const codeVerifier = oauth.generateRandomCodeVerifier();
    const state = oauth.generateRandomState();
    const nonce = oauth.generateRandomNonce();

    const url = new URL(as.authorization_endpoint);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: this.settings.clientId,
      redirect_uri: this.settings.redirectUri,
      scope: scopes.join(" "),
      audience: this.settings.audience,
      state,
      nonce,
      code_challenge: await oauth.calculatePKCECodeChallenge(codeVerifier),
      code_challenge_method: "S256",
    }).toString();

    return { url, pending: { state, nonce, codeVerifier } };
  }

  async redeem(
    callback: URL,
    pending: PendingSignIn,
  ): Promise<{ tokens: TokenSet; subject: string; sid: string | null }> {
    const as = await this.server();
    let parameters: URLSearchParams;
    try {
      // Checks `state`, and `iss` when Clavia advertises RFC 9207 (it does).
      parameters = oauth.validateAuthResponse(as, this.client, callback, pending.state);
    } catch (error) {
      if (error instanceof oauth.AuthorizationResponseError) {
        throw new SignInRefused(
          error.error === "access_denied" ? "access_denied" : "provider_error",
          error.error_description ?? error.error,
        );
      }
      throw new SignInRefused("provider_error", describe(error));
    }

    try {
      const response = await oauth.authorizationCodeGrantRequest(
        as,
        this.client,
        this.authentication,
        parameters,
        this.settings.redirectUri,
        pending.codeVerifier,
        this.options(),
      );
      const result = await oauth.processAuthorizationCodeResponse(as, this.client, response, {
        expectedNonce: pending.nonce,
        requireIdToken: true,
      });
      const claims = oauth.getValidatedIdTokenClaims(result);
      if (claims === undefined || result.id_token === undefined) {
        throw new SignInRefused("provider_error", "Clavia issued no ID token.");
      }

      return {
        tokens: tokenSet(result, result.id_token, null),
        subject: claims.sub,
        sid: typeof claims.sid === "string" ? claims.sid : null,
      };
    } catch (error) {
      if (error instanceof SignInRefused) {
        throw error;
      }
      throw new SignInRefused("provider_error", describe(error));
    }
  }

  async describe(accessToken: string, subject: string): Promise<OperatorIdentity> {
    const as = await this.server();
    const response = await oauth.userInfoRequest(as, this.client, accessToken, this.options());
    const info = await oauth.processUserInfoResponse(as, this.client, subject, response);

    return {
      subject: info.sub,
      name: typeof info.name === "string" ? info.name : null,
      email: typeof info.email === "string" ? info.email : null,
      picture: typeof info.picture === "string" ? info.picture : null,
    };
  }

  async refresh(tokens: TokenSet): Promise<TokenSet | null> {
    if (tokens.refreshToken === null) {
      return null;
    }
    const as = await this.server();
    try {
      const response = await oauth.refreshTokenGrantRequest(
        as,
        this.client,
        this.authentication,
        tokens.refreshToken,
        this.options(),
      );
      const result = await oauth.processRefreshTokenResponse(as, this.client, response);

      // A refresh issues no ID token (OIDC Core §12.2): the one from sign-in stays the hint.
      return tokenSet(result, result.id_token ?? tokens.idToken, tokens);
    } catch (error) {
      if (error instanceof oauth.ResponseBodyError && error.error === "invalid_grant") {
        return null;
      }
      throw error;
    }
  }

  async revoke(refreshToken: string): Promise<void> {
    const as = await this.server();
    const response = await oauth.revocationRequest(as, this.client, this.authentication, refreshToken, {
      ...this.options(),
      additionalParameters: { token_type_hint: "refresh_token" },
    });
    await oauth.processRevocationResponse(response);
  }

  async endSessionUrl(idToken: string, postLogoutRedirectUri: string): Promise<URL> {
    const as = await this.server();
    if (as.end_session_endpoint === undefined) {
      throw new Error("Clavia's discovery document names no end_session_endpoint.");
    }
    const url = new URL(as.end_session_endpoint);
    url.search = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: postLogoutRedirectUri,
      client_id: this.settings.clientId,
    }).toString();

    return url;
  }

  async verifyLogoutToken(token: string): Promise<{ subject: string | null; sid: string | null } | null> {
    const as = await this.server();
    try {
      const { payload } = await jwtVerify(token, this.jwks(as), {
        issuer: as.issuer,
        audience: this.settings.clientId,
        typ: "logout+jwt",
        algorithms: ["RS256"],
        requiredClaims: ["iat", "jti", "events"],
        maxTokenAge: "5 minutes",
      });
      const events = payload.events;
      const subject = typeof payload.sub === "string" ? payload.sub : null;
      const sid = typeof payload.sid === "string" ? payload.sid : null;
      if (
        typeof events !== "object" ||
        events === null ||
        typeof (events as Record<string, unknown>)[BACKCHANNEL_LOGOUT_EVENT] !== "object" ||
        "nonce" in payload ||
        (subject === null && sid === null)
      ) {
        return null;
      }

      return { subject, sid };
    } catch (error) {
      if (error instanceof joseErrors.JOSEError) {
        return null;
      }
      throw error;
    }
  }

  private server(): Promise<oauth.AuthorizationServer> {
    this.metadata ??= oauth
      .discoveryRequest(this.settings.issuer, { algorithm: "oidc", ...this.options() })
      .then((response) => oauth.processDiscoveryResponse(this.settings.issuer, response))
      .catch((error: unknown) => {
        this.metadata = null;
        throw error;
      });

    return this.metadata;
  }

  private jwks(as: oauth.AuthorizationServer): JWTVerifyGetKey {
    if (as.jwks_uri === undefined) {
      throw new Error("Clavia's discovery document names no jwks_uri.");
    }
    const fetcher = this.settings.fetch;
    this.keys ??= createRemoteJWKSet(
      new URL(as.jwks_uri),
      fetcher === undefined ? {} : { [joseFetch]: (url: string, init: RequestInit) => fetcher(url, init) },
    );

    return this.keys;
  }

  private options(): { [oauth.customFetch]?: typeof fetch } {
    return this.settings.fetch === undefined ? {} : { [oauth.customFetch]: this.settings.fetch };
  }
}

function tokenSet(result: oauth.TokenEndpointResponse, idToken: string, previous: TokenSet | null): TokenSet {
  const expiresIn = typeof result.expires_in === "number" ? result.expires_in : 300;

  return {
    accessToken: result.access_token,
    accessTokenExpiresAt: Date.now() + expiresIn * 1000,
    // Clavia rotates refresh tokens: the new one replaces the old, which is now spent.
    refreshToken: result.refresh_token ?? previous?.refreshToken ?? null,
    idToken,
    scopes: typeof result.scope === "string" ? result.scope.split(" ").filter(Boolean) : (previous?.scopes ?? []),
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected answer from Clavia.";
}
