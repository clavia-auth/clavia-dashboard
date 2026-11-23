import { safeAcrValues } from "./acr-values";
import type { Clock, IdentityProvider, PendingSignInStore, SessionStore } from "./ports";
import { SignInRefused } from "./ports";
import { safeReturnTo } from "./return-to";
import type { DashboardSession } from "./session";

export type AuthenticationSettings = Readonly<{
  /** What to ask Clavia for: `openid profile email` and every Management API scope. */
  scopes: readonly string[];
  /** How long a session lasts at most, in seconds. */
  sessionLifetime: number;
  /** How long it survives without use, in seconds. */
  idleTimeout: number;
}>;

/** How long a sign-in may take between the redirect and the callback, in seconds. */
export const SIGN_IN_ATTEMPT_LIFETIME = 600;

/** An access token this close to expiring is refreshed before use, in milliseconds. */
export const REFRESH_AHEAD = 60_000;

/** The last-seen time is written back at most this often, in milliseconds. */
const TOUCH_INTERVAL = 60_000;

/**
 * Signing operators in and out of the dashboard, and keeping their sessions alive.
 *
 * The dashboard is a confidential client of Clavia (OAuth 2.0 for Browser-Based
 * Applications, the backend-for-frontend pattern): the code is redeemed here, the tokens
 * stay here, and the browser holds a handle to its session and nothing else. The access
 * token is refreshed on the server before it expires, under a lock, because Clavia treats
 * a refresh token presented twice as stolen and revokes the whole family.
 */
export class Authentication {
  constructor(
    private readonly provider: IdentityProvider,
    private readonly sessions: SessionStore,
    private readonly attempts: PendingSignInStore,
    private readonly clock: Clock,
    private readonly settings: AuthenticationSettings,
  ) {}

  /**
   * Start a sign-in: where to send the browser, and the state it must bring back.
   * `acrValues` is the level a step-up challenge asked for (RFC 9470): Clavia then raises
   * the person's session with one more factor instead of asking for their password again.
   */
  async beginSignIn(
    returnTo: string | null | undefined,
    acrValues?: string | null,
  ): Promise<{ authorizationUrl: URL; state: string }> {
    const { url, pending } = await this.provider.authorize(this.settings.scopes, safeAcrValues(acrValues) ?? undefined);
    await this.attempts.put({ ...pending, returnTo: safeReturnTo(returnTo) }, SIGN_IN_ATTEMPT_LIFETIME);

    return { authorizationUrl: url, state: pending.state };
  }

  /**
   * Finish a sign-in from Clavia's callback. `browserState` is the state the browser that
   * started the attempt holds (in a cookie): a callback reaching any other browser is
   * refused before anything is redeemed (login CSRF).
   *
   * @throws SignInRefused
   */
  async completeSignIn(callback: URL, browserState: string | undefined): Promise<{ handle: string; returnTo: string }> {
    const state = callback.searchParams.get("state");
    if (state === null || browserState === undefined || !constantTimeEqual(state, browserState)) {
      throw new SignInRefused("unknown_attempt", "The sign-in was started in another browser, or not at all.");
    }
    const pending = await this.attempts.take(state);
    if (pending === null) {
      throw new SignInRefused("unknown_attempt", "The sign-in took too long, or was already completed.");
    }

    const { tokens, subject, sid } = await this.provider.redeem(callback, pending);
    const operator = await this.provider.describe(tokens.accessToken, subject);
    const now = this.clock.now();
    const session: DashboardSession = {
      operator,
      sid,
      tokens,
      createdAt: now,
      expiresAt: now + this.settings.sessionLifetime * 1000,
      lastSeenAt: now,
    };
    const handle = await this.sessions.create(session, this.ttl(session, now));

    return { handle, returnTo: pending.returnTo };
  }

  /**
   * The session a browser's handle names, if it is still good — its access token
   * refreshed if it is about to expire. Null means the operator must sign in again.
   */
  async session(handle: string | undefined): Promise<DashboardSession | null> {
    if (handle === undefined || handle === "") {
      return null;
    }
    const session = await this.sessions.read(handle);
    if (session === null) {
      return null;
    }
    const now = this.clock.now();
    if (now >= session.expiresAt || now - session.lastSeenAt >= this.settings.idleTimeout * 1000) {
      await this.sessions.destroy(handle);

      return null;
    }
    if (session.tokens.accessTokenExpiresAt - now > REFRESH_AHEAD) {
      return this.touch(handle, session, now);
    }

    return this.sessions.exclusively(handle, async () => {
      // Another request may have refreshed while this one waited for the lock.
      const current = await this.sessions.read(handle);
      if (current === null) {
        return null;
      }
      if (current.tokens.accessTokenExpiresAt - this.clock.now() > REFRESH_AHEAD) {
        return current;
      }
      const refreshed = current.tokens.refreshToken === null ? null : await this.provider.refresh(current.tokens);
      if (refreshed === null) {
        await this.sessions.destroy(handle);

        return null;
      }
      const renewed: DashboardSession = { ...current, tokens: refreshed, lastSeenAt: this.clock.now() };
      await this.sessions.save(handle, renewed, this.ttl(renewed, this.clock.now()));

      return renewed;
    });
  }

  /**
   * Sign out: the session is gone here, its refresh token given back, and the browser is
   * sent to Clavia to end the session there too — unless there was nothing to end.
   */
  async signOut(handle: string | undefined, postLogoutRedirectUri: string): Promise<URL | null> {
    if (handle === undefined || handle === "") {
      return null;
    }
    const session = await this.sessions.destroy(handle);
    if (session === null) {
      return null;
    }
    if (session.tokens.refreshToken !== null) {
      await this.provider.revoke(session.tokens.refreshToken).catch(() => undefined);
    }

    return this.provider.endSessionUrl(session.tokens.idToken, postLogoutRedirectUri);
  }

  /**
   * Clavia says a session ended elsewhere (OpenID Connect Back-Channel Logout 1.0): every
   * dashboard session it named ends now. Returns false when the token does not verify.
   */
  async backChannelLogout(logoutToken: string): Promise<boolean> {
    const named = await this.provider.verifyLogoutToken(logoutToken);
    if (named === null) {
      return false;
    }
    if (named.sid !== null) {
      await this.sessions.destroyBySid(named.sid);
    } else if (named.subject !== null) {
      await this.sessions.destroyBySubject(named.subject);
    }

    return true;
  }

  private async touch(handle: string, session: DashboardSession, now: number): Promise<DashboardSession> {
    if (now - session.lastSeenAt < TOUCH_INTERVAL) {
      return session;
    }
    const touched: DashboardSession = { ...session, lastSeenAt: now };
    await this.sessions.save(handle, touched, this.ttl(touched, now));

    return touched;
  }

  /** How long the store keeps a session: until it idles out, never past its deadline. */
  private ttl(session: DashboardSession, now: number): number {
    const untilDeadline = Math.ceil((session.expiresAt - now) / 1000);

    return Math.max(1, Math.min(this.settings.idleTimeout, untilDeadline));
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}
