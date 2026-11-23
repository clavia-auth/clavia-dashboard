import type { Clock, IdentityProvider, PendingSignInStore, SessionStore } from "@/core/auth/ports";
import { SignInRefused } from "@/core/auth/ports";
import type { DashboardSession, OperatorIdentity, PendingSignIn, TokenSet } from "@/core/auth/session";

/** Time the test moves by hand. */
export class FrozenClock implements Clock {
  constructor(private current = Date.parse("2026-01-15T10:00:00Z")) {}

  now(): number {
    return this.current;
  }

  advance(milliseconds: number): void {
    this.current += milliseconds;
  }
}

/** Sessions in a map — the same behaviour the Redis store has, checked by the same contract. */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, { session: DashboardSession; expiresAt: number }>();
  private readonly locks = new Map<string, Promise<unknown>>();
  private counter = 0;

  constructor(private readonly clock: Clock = { now: () => Date.now() }) {}

  async create(session: DashboardSession, ttlSeconds: number): Promise<string> {
    const handle = `handle-${++this.counter}`;
    await this.save(handle, session, ttlSeconds);

    return handle;
  }

  async read(handle: string): Promise<DashboardSession | null> {
    const entry = this.sessions.get(handle);
    if (entry === undefined || entry.expiresAt <= this.clock.now()) {
      this.sessions.delete(handle);

      return null;
    }

    return structuredClone(entry.session);
  }

  async save(handle: string, session: DashboardSession, ttlSeconds: number): Promise<void> {
    this.sessions.set(handle, { session: structuredClone(session), expiresAt: this.clock.now() + ttlSeconds * 1000 });
  }

  async destroy(handle: string): Promise<DashboardSession | null> {
    const session = await this.read(handle);
    this.sessions.delete(handle);

    return session;
  }

  async destroyBySid(sid: string): Promise<number> {
    return this.destroyWhere((session) => session.sid === sid);
  }

  async destroyBySubject(subject: string): Promise<number> {
    return this.destroyWhere((session) => session.operator.subject === subject);
  }

  async exclusively<T>(handle: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(handle) ?? Promise.resolve();
    const run = previous.then(work, work);
    this.locks.set(
      handle,
      run.catch(() => undefined),
    );

    return run;
  }

  /** How many sessions are live, for assertions. */
  get size(): number {
    return [...this.sessions.values()].filter((entry) => entry.expiresAt > this.clock.now()).length;
  }

  private destroyWhere(matches: (session: DashboardSession) => boolean): number {
    let removed = 0;
    for (const [handle, entry] of this.sessions) {
      if (entry.expiresAt > this.clock.now() && matches(entry.session)) {
        this.sessions.delete(handle);
        removed++;
      }
    }

    return removed;
  }
}

export class InMemoryPendingSignInStore implements PendingSignInStore {
  readonly attempts = new Map<string, PendingSignIn>();

  async put(pending: PendingSignIn): Promise<void> {
    this.attempts.set(pending.state, pending);
  }

  async take(state: string): Promise<PendingSignIn | null> {
    const pending = this.attempts.get(state) ?? null;
    this.attempts.delete(state);

    return pending;
  }
}

/** Clavia as far as the core sees it: answers set by the test, calls recorded. */
export class FakeIdentityProvider implements IdentityProvider {
  readonly redeemed: PendingSignIn[] = [];
  readonly revoked: string[] = [];
  refreshes = 0;
  nextAttempt = 1;
  /** What the next redemption yields, or the refusal it throws. */
  redemption: { tokens: TokenSet; subject: string; sid: string | null } | SignInRefused;
  /** What a refresh yields: a new token set, or null when Clavia refuses the refresh token. */
  refreshed: ((tokens: TokenSet) => TokenSet) | null = (tokens) => ({
    ...tokens,
    accessToken: `${tokens.accessToken}+`,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt + 3_600_000,
    refreshToken: `${tokens.refreshToken ?? ""}+`,
  });
  logoutTokens = new Map<string, { subject: string | null; sid: string | null }>();

  constructor(
    private readonly clock: Clock,
    readonly operator: OperatorIdentity = {
      subject: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      picture: null,
    },
  ) {
    this.redemption = { tokens: this.tokens(), subject: operator.subject, sid: "sid-1" };
  }

  tokens(overrides: Partial<TokenSet> = {}): TokenSet {
    return {
      accessToken: "access-1",
      accessTokenExpiresAt: this.clock.now() + 3_600_000,
      refreshToken: "refresh-1",
      idToken: "id-token-1",
      scopes: ["read:users"],
      ...overrides,
    };
  }

  async authorize(scopes: readonly string[], acrValues?: string) {
    const n = this.nextAttempt++;
    const url = new URL("https://auth.clavia.test/oauth2/authorize");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", `state-${n}`);
    if (acrValues !== undefined) {
      url.searchParams.set("acr_values", acrValues);
    }

    return { url, pending: { state: `state-${n}`, nonce: `nonce-${n}`, codeVerifier: `verifier-${n}` } };
  }

  async redeem(_: URL, pending: PendingSignIn) {
    this.redeemed.push(pending);
    if (this.redemption instanceof SignInRefused) {
      throw this.redemption;
    }

    return this.redemption;
  }

  async describe(_: string, subject: string): Promise<OperatorIdentity> {
    return { ...this.operator, subject };
  }

  async refresh(tokens: TokenSet): Promise<TokenSet | null> {
    this.refreshes++;
    // Let concurrent callers interleave, as a real round trip would.
    await new Promise((resolve) => setTimeout(resolve, 5));

    return this.refreshed === null ? null : this.refreshed(tokens);
  }

  async revoke(refreshToken: string): Promise<void> {
    this.revoked.push(refreshToken);
  }

  async endSessionUrl(idToken: string, postLogoutRedirectUri: string): Promise<URL> {
    const url = new URL("https://auth.clavia.test/oidc/logout");
    url.searchParams.set("id_token_hint", idToken);
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);

    return url;
  }

  async verifyLogoutToken(token: string) {
    return this.logoutTokens.get(token) ?? null;
  }
}
