import { beforeEach, describe, expect, it } from "vitest";

import { ClaviaIdentityProvider } from "@/adapters/oidc/clavia-identity-provider";
import { SignInRefused } from "@/core/auth/ports";

import { CLIENT_ID, CLIENT_SECRET, fakeClavia, ISSUER, REDIRECT_URI } from "../support/fake-clavia";

const EVENT = { "http://schemas.openid.net/event/backchannel-logout": {} };

describe("ClaviaIdentityProvider", () => {
  let clavia: Awaited<ReturnType<typeof fakeClavia>>;
  let provider: ClaviaIdentityProvider;

  beforeEach(async () => {
    clavia = await fakeClavia();
    provider = new ClaviaIdentityProvider({
      issuer: new URL(ISSUER),
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      redirectUri: REDIRECT_URI,
      audience: "https://management.clavia.test/api/v1/",
      fetch: clavia.fetcher,
    });
  });

  describe("authorize", () => {
    it("asks for a code with PKCE S256, a nonce, a state and the Management API as audience", async () => {
      const { url, pending } = await provider.authorize(["openid", "read:users"]);

      expect(url.origin + url.pathname).toBe(`${ISSUER}/oauth2/authorize`);
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        response_type: "code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: "openid read:users",
        audience: "https://management.clavia.test/api/v1/",
        state: pending.state,
        nonce: pending.nonce,
        code_challenge_method: "S256",
      });
      expect(url.searchParams.get("code_challenge")).not.toBe(pending.codeVerifier);
      expect(pending.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(url.searchParams.has("acr_values")).toBe(false);
    });

    it("asks for the authentication level a step-up needs", async () => {
      const { url } = await provider.authorize(
        ["openid"],
        "http://schemas.openid.net/pape/policies/2007/06/multi-factor",
      );

      expect(url.searchParams.get("acr_values")).toBe("http://schemas.openid.net/pape/policies/2007/06/multi-factor");
    });
  });

  describe("discovery", () => {
    it("hands back the document Clavia published", async () => {
      const document = await provider.discovery();

      expect(document.issuer).toBe(ISSUER);
      expect(document.authorization_endpoint).toBe(`${ISSUER}/oauth2/authorize`);
    });
  });

  describe("redeem", () => {
    const pending = { state: "s", nonce: "n", codeVerifier: "v".repeat(43), returnTo: "/" };
    const callback = (query: string) => new URL(`${REDIRECT_URI}?${query}&iss=${encodeURIComponent(ISSUER)}`);

    it("redeems the code with HTTP Basic and the verifier, and checks the ID token", async () => {
      clavia.overrides.set("/oauth2/token", async () =>
        clavia.json({
          access_token: "access",
          token_type: "Bearer",
          expires_in: 300,
          refresh_token: "refresh",
          scope: "openid read:users",
          id_token: await clavia.sign({
            sub: "user-1",
            aud: CLIENT_ID,
            nonce: "n",
            sid: "sid-1",
            exp: Math.floor(Date.now() / 1000) + 300,
          }),
        }),
      );

      const { tokens, subject, sid } = await provider.redeem(callback("code=abc&state=s"), pending);

      expect(subject).toBe("user-1");
      expect(sid).toBe("sid-1");
      expect(tokens).toMatchObject({
        accessToken: "access",
        refreshToken: "refresh",
        scopes: ["openid", "read:users"],
      });
      const token = clavia.requests.find((request) => request.url.endsWith("/oauth2/token"));
      // Each half is form-encoded before joining (RFC 6749 §2.3.1); Clavia decodes both.
      const [scheme, credentials] = token!.headers.get("Authorization")!.split(" ");
      const [id, secret] = atob(credentials!)
        .split(":")
        .map((half) => decodeURIComponent(half));
      expect([scheme, id, secret]).toEqual(["Basic", CLIENT_ID, CLIENT_SECRET]);
      const body = new URLSearchParams(await token!.text());
      expect(body.get("code_verifier")).toBe(pending.codeVerifier);
      expect(body.get("redirect_uri")).toBe(REDIRECT_URI);
    });

    it("refuses an ID token minted for another attempt", async () => {
      clavia.overrides.set("/oauth2/token", async () =>
        clavia.json({
          access_token: "access",
          token_type: "Bearer",
          expires_in: 300,
          id_token: await clavia.sign({
            sub: "user-1",
            aud: CLIENT_ID,
            nonce: "another",
            exp: Math.floor(Date.now() / 1000) + 300,
          }),
        }),
      );

      await expect(provider.redeem(callback("code=abc&state=s"), pending)).rejects.toMatchObject({
        reason: "provider_error",
      });
    });

    it("passes on a refusal Clavia sent back to the browser", async () => {
      const refusal = await provider
        .redeem(callback("error=access_denied&state=s"), pending)
        .catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(SignInRefused);
      expect(refusal).toMatchObject({ reason: "access_denied" });
      expect(clavia.requests.some((request) => request.url.endsWith("/oauth2/token"))).toBe(false);
    });

    it("refuses a callback carrying another attempt's state", async () => {
      await expect(provider.redeem(callback("code=abc&state=other"), pending)).rejects.toBeInstanceOf(SignInRefused);
    });
  });

  describe("refresh", () => {
    const tokens = {
      accessToken: "a",
      accessTokenExpiresAt: 0,
      refreshToken: "r1",
      idToken: "id",
      scopes: ["read:users"],
    };

    it("takes the rotated refresh token and keeps the ID token from sign-in", async () => {
      clavia.overrides.set("/oauth2/token", () =>
        clavia.json({
          access_token: "a2",
          token_type: "Bearer",
          expires_in: 300,
          refresh_token: "r2",
          scope: "read:users",
        }),
      );

      expect(await provider.refresh(tokens)).toMatchObject({ accessToken: "a2", refreshToken: "r2", idToken: "id" });
    });

    it("says null when Clavia no longer accepts the refresh token", async () => {
      clavia.overrides.set("/oauth2/token", () => clavia.json({ error: "invalid_grant" }, 400));

      expect(await provider.refresh(tokens)).toBeNull();
    });
  });

  describe("back-channel logout tokens", () => {
    const claims = (overrides: Record<string, unknown> = {}) => ({
      aud: CLIENT_ID,
      sub: "user-1",
      sid: "sid-1",
      jti: crypto.randomUUID(),
      events: EVENT,
      ...overrides,
    });

    it("names the session of a token Clavia signed", async () => {
      const token = await clavia.sign(claims(), "logout+jwt");

      expect(await provider.verifyLogoutToken(token)).toEqual({ subject: "user-1", sid: "sid-1" });
    });

    it.each([
      ["another audience", claims({ aud: "someone-else" }), "logout+jwt"],
      ["the wrong type", claims(), "JWT"],
      ["a nonce, which no logout token carries", claims({ nonce: "n" }), "logout+jwt"],
      ["no logout event", claims({ events: {} }), "logout+jwt"],
      ["neither a subject nor a session", claims({ sub: undefined, sid: undefined }), "logout+jwt"],
    ])("refuses a token with %s", async (_, body, type) => {
      expect(await provider.verifyLogoutToken(await clavia.sign(body, type))).toBeNull();
    });

    it("refuses a token signed by anybody else", async () => {
      const stranger = await fakeClavia();

      expect(await provider.verifyLogoutToken(await stranger.sign(claims(), "logout+jwt"))).toBeNull();
    });
  });

  describe("when Clavia cannot be reached", () => {
    /** What Node's fetch throws when the connection fails: the reason is in `cause`. */
    const fetchFailed = (code: string) =>
      new TypeError("fetch failed", { cause: Object.assign(new Error("connection failed"), { code }) });
    const pending = { state: "s", nonce: "n", codeVerifier: "v".repeat(43), returnTo: "/" };
    const callback = new URL(`${REDIRECT_URI}?code=abc&state=s&iss=${encodeURIComponent(ISSUER)}`);

    const failing = (fail: (path: string) => unknown) =>
      new ClaviaIdentityProvider({
        issuer: new URL(ISSUER),
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        redirectUri: REDIRECT_URI,
        audience: "https://management.clavia.test/api/v1/",
        fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
          const path = new URL(input instanceof Request ? input.url : input).pathname;
          const error = fail(path);
          if (error !== undefined) {
            throw error;
          }

          return clavia.fetcher(input, init);
        }) as typeof fetch,
      });

    it("refuses to start a sign-in, naming Clavia's host and why the connection failed", async () => {
      const unreachable = failing(() => fetchFailed("UNABLE_TO_VERIFY_LEAF_SIGNATURE"));

      const refusal = await unreachable.authorize(["openid"]).catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(SignInRefused);
      expect(refusal).toMatchObject({ reason: "unreachable" });
      expect((refusal as Error).message).toContain("auth.clavia.test");
      expect((refusal as Error).message).toContain("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
    });

    it("says a request that took too long timed out", async () => {
      const unreachable = failing(() => new DOMException("The operation was aborted due to timeout", "TimeoutError"));

      await expect(unreachable.authorize(["openid"])).rejects.toMatchObject({
        reason: "unreachable",
        message: expect.stringContaining("timed out"),
      });
    });

    it("refuses to finish a sign-in when the code cannot be redeemed", async () => {
      const unreachable = failing((path) => (path === "/oauth2/token" ? fetchFailed("ECONNREFUSED") : undefined));

      await expect(unreachable.redeem(callback, pending)).rejects.toMatchObject({
        reason: "unreachable",
        message: expect.stringContaining("ECONNREFUSED"),
      });
    });

    it("refuses to finish a sign-in when the operator cannot be described", async () => {
      const unreachable = failing((path) => (path === "/oidc/userinfo" ? fetchFailed("ECONNRESET") : undefined));

      await expect(unreachable.describe("access", "user-1")).rejects.toMatchObject({ reason: "unreachable" });
    });

    it("tells a Clavia that answers, but wrongly, from one that cannot be reached", async () => {
      clavia.overrides.set("/.well-known/openid-configuration", () => new Response("Down", { status: 500 }));

      await expect(provider.authorize(["openid"])).rejects.toMatchObject({ reason: "provider_error" });
    });
  });

  it("ends the session at Clavia with the ID token as hint, and comes back to the dashboard", async () => {
    const url = await provider.endSessionUrl("id-token", "https://management.clavia.test/dashboard/signed-out");

    expect(url.origin + url.pathname).toBe(`${ISSUER}/oidc/logout`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      id_token_hint: "id-token",
      post_logout_redirect_uri: "https://management.clavia.test/dashboard/signed-out",
      client_id: CLIENT_ID,
    });
  });
});
