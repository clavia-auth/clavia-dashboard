/**
 * An operator's session at the dashboard — kept server-side; the browser holds only an
 * opaque handle to it. Every time is in milliseconds since the epoch.
 */

/** Who signed in, as Clavia's userinfo describes them. */
export type OperatorIdentity = Readonly<{
  /** The `sub` Clavia gave this person. */
  subject: string;
  name: string | null;
  email: string | null;
  picture: string | null;
}>;

/** What Clavia issued for the session. Never sent to the browser. */
export type TokenSet = Readonly<{
  accessToken: string;
  accessTokenExpiresAt: number;
  /** Null when Clavia issued none; the session then ends with its access token. */
  refreshToken: string | null;
  /** Kept for RP-Initiated Logout's `id_token_hint`. */
  idToken: string;
  /** The scopes the access token carries: what the operator's roles grant, nothing more. */
  scopes: readonly string[];
}>;

export type DashboardSession = Readonly<{
  operator: OperatorIdentity;
  /** The `sid` of Clavia's browser session, which back-channel logout names. */
  sid: string | null;
  tokens: TokenSet;
  createdAt: number;
  /** The absolute deadline: after it the operator signs in again, however active. */
  expiresAt: number;
  /** When the session was last used, for the idle timeout. */
  lastSeenAt: number;
}>;

/** What a sign-in in progress has to remember between the redirect and the callback. */
export type PendingSignIn = Readonly<{
  /** Verifies the callback belongs to this attempt (OAuth 2.0 `state`). */
  state: string;
  nonce: string;
  codeVerifier: string;
  /** Where to land once signed in: a path inside the dashboard. */
  returnTo: string;
}>;
