import type { ProviderMetadata } from "./endpoints";
import type { DashboardSession, OperatorIdentity, PendingSignIn, TokenSet } from "./session";

/**
 * Clavia, as an OpenID Connect provider for a confidential client: the authorization code
 * flow with PKCE, refresh, revocation, RP-Initiated Logout and back-channel logout.
 */
export interface IdentityProvider {
  /**
   * Where to send the browser, and what the callback will be checked against. `acrValues`
   * asks for an authentication level (OpenID Connect Core §3.1.2.1), as a step-up does.
   * Throws {@link SignInRefused} when the provider cannot be reached or answers wrongly.
   */
  authorize(
    scopes: readonly string[],
    acrValues?: string,
  ): Promise<{ url: URL; pending: Omit<PendingSignIn, "returnTo"> }>;
  /**
   * Check the callback against the attempt and redeem its code. Throws
   * {@link SignInRefused} when the provider sent an error, cannot be reached, or anything
   * does not check out.
   */
  redeem(callback: URL, pending: PendingSignIn): Promise<{ tokens: TokenSet; subject: string; sid: string | null }>;
  /**
   * The person behind an access token, from userinfo, as a sign-in completes. Throws
   * {@link SignInRefused} when the provider cannot be reached or answers wrongly.
   */
  describe(accessToken: string, subject: string): Promise<OperatorIdentity>;
  /** A new token set from a refresh token, or null when the provider no longer accepts it. */
  refresh(tokens: TokenSet): Promise<TokenSet | null>;
  /** Give a refresh token back, best effort (RFC 7009). */
  revoke(refreshToken: string): Promise<void>;
  /** Where to send the browser to end its session at the provider too. */
  endSessionUrl(idToken: string, postLogoutRedirectUri: string): Promise<URL>;
  /** The session a back-channel logout token names, once it has been verified; null if it does not verify. */
  verifyLogoutToken(token: string): Promise<{ subject: string | null; sid: string | null } | null>;
  /** The provider's discovery document, as published. */
  discovery(): Promise<ProviderMetadata>;
}

export interface SessionStore {
  /** Store a new session; returns the handle the browser will hold. */
  create(session: DashboardSession, ttlSeconds: number): Promise<string>;
  read(handle: string): Promise<DashboardSession | null>;
  save(handle: string, session: DashboardSession, ttlSeconds: number): Promise<void>;
  /** Remove a session; returns it if there was one. */
  destroy(handle: string): Promise<DashboardSession | null>;
  /** Remove every session established through Clavia's session `sid`; returns how many. */
  destroyBySid(sid: string): Promise<number>;
  /** Remove every session of a person; returns how many. */
  destroyBySubject(subject: string): Promise<number>;
  /**
   * Run `work` while no other caller holds the same handle's lock — across processes, so
   * two requests never spend the same refresh token (Clavia revokes the family on replay).
   */
  exclusively<T>(handle: string, work: () => Promise<T>): Promise<T>;
}

export interface PendingSignInStore {
  put(pending: PendingSignIn, ttlSeconds: number): Promise<void>;
  /** The attempt for this state, removed as it is read: a state is good once. */
  take(state: string): Promise<PendingSignIn | null>;
}

export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number;
}

export type SignInRefusal =
  /** The callback reached a browser that did not start the attempt, or the attempt is unknown. */
  | "unknown_attempt"
  /** The operator, or Clavia on their behalf (no role on the Management API), refused. */
  | "access_denied"
  /** Anything else Clavia answered: an error, or a response that did not check out. */
  | "provider_error"
  /** Clavia could not be reached at all: a refused connection, a certificate, a name, a timeout. */
  | "unreachable";

export class SignInRefused extends Error {
  override readonly name = "SignInRefused";

  constructor(
    readonly reason: SignInRefusal,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Whether `error` is a {@link SignInRefused}, whichever copy of the class threw it. The
 * composition root keeps `Authentication` across development's module reloads, so an error
 * it throws can come from an older copy of the class than the one a route imports, and
 * `instanceof` is then false for it.
 */
export function isSignInRefused(error: unknown): error is SignInRefused {
  return (
    error instanceof SignInRefused || (error instanceof Error && error.name === "SignInRefused" && "reason" in error)
  );
}
