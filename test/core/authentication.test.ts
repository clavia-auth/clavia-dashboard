import { beforeEach, describe, expect, it } from "vitest";

import { Authentication, REFRESH_AHEAD } from "@/core/auth/authentication";
import { SignInRefused } from "@/core/auth/ports";

import { FakeIdentityProvider, FrozenClock, InMemoryPendingSignInStore, InMemorySessionStore } from "../support/fakes";

const HOUR = 3_600_000;
const SETTINGS = { scopes: ["openid", "read:users"], sessionLifetime: 8 * 3600, idleTimeout: 3600 };
const CALLBACK = "https://management.clavia.test/dashboard/auth/callback";

describe("Authentication", () => {
  let clock: FrozenClock;
  let provider: FakeIdentityProvider;
  let sessions: InMemorySessionStore;
  let attempts: InMemoryPendingSignInStore;
  let authentication: Authentication;

  beforeEach(() => {
    clock = new FrozenClock();
    provider = new FakeIdentityProvider(clock);
    sessions = new InMemorySessionStore(clock);
    attempts = new InMemoryPendingSignInStore();
    authentication = new Authentication(provider, sessions, attempts, clock, SETTINGS);
  });

  async function signIn(returnTo = "/users"): Promise<string> {
    const { state } = await authentication.beginSignIn(returnTo);
    const { handle } = await authentication.completeSignIn(new URL(`${CALLBACK}?code=c&state=${state}`), state);

    return handle;
  }

  describe("signing in", () => {
    it("asks for the configured scopes and remembers the attempt, with a safe place to come back to", async () => {
      const { authorizationUrl, state } = await authentication.beginSignIn("//evil.example/");

      expect(authorizationUrl.searchParams.get("scope")).toBe("openid read:users");
      expect(attempts.attempts.get(state)).toEqual({
        state,
        nonce: "nonce-1",
        codeVerifier: "verifier-1",
        returnTo: "/",
      });
    });

    it("asks for the level a step-up names, and for nothing when the value is not a plain list", async () => {
      const mfa = "http://schemas.openid.net/pape/policies/2007/06/multi-factor";

      const stepUp = await authentication.beginSignIn("/users", mfa);
      const plain = await authentication.beginSignIn("/users");
      const forged = await authentication.beginSignIn("/users", "phr\r\nSet-Cookie: x=1");

      expect(stepUp.authorizationUrl.searchParams.get("acr_values")).toBe(mfa);
      expect(plain.authorizationUrl.searchParams.has("acr_values")).toBe(false);
      expect(forged.authorizationUrl.searchParams.has("acr_values")).toBe(false);
    });

    it("redeems the callback of the browser that started it, and keeps the tokens server-side", async () => {
      const { state } = await authentication.beginSignIn("/users/42");

      const { handle, returnTo } = await authentication.completeSignIn(
        new URL(`${CALLBACK}?code=c&state=${state}`),
        state,
      );

      expect(returnTo).toBe("/users/42");
      expect(provider.redeemed).toHaveLength(1);
      const session = await sessions.read(handle);
      expect(session?.operator.email).toBe("ada@example.com");
      expect(session?.sid).toBe("sid-1");
      expect(session?.tokens.accessToken).toBe("access-1");
      expect(session?.expiresAt).toBe(clock.now() + 8 * HOUR);
    });

    it.each([
      ["another browser's state", "state-other"],
      ["no state in the browser", undefined],
    ])("refuses a callback with %s before redeeming anything", async (_, browserState) => {
      const { state } = await authentication.beginSignIn("/");

      await expect(
        authentication.completeSignIn(new URL(`${CALLBACK}?code=c&state=${state}`), browserState),
      ).rejects.toMatchObject({ reason: "unknown_attempt" });
      expect(provider.redeemed).toHaveLength(0);
    });

    it("lets an attempt be completed once", async () => {
      const { state } = await authentication.beginSignIn("/");
      const callback = new URL(`${CALLBACK}?code=c&state=${state}`);
      await authentication.completeSignIn(callback, state);

      await expect(authentication.completeSignIn(callback, state)).rejects.toMatchObject({ reason: "unknown_attempt" });
      expect(provider.redeemed).toHaveLength(1);
    });

    it("passes Clavia's refusal on, and makes no session", async () => {
      provider.redemption = new SignInRefused("access_denied", "No role on the Management API.");
      const { state } = await authentication.beginSignIn("/");

      await expect(
        authentication.completeSignIn(new URL(`${CALLBACK}?error=access_denied&state=${state}`), state),
      ).rejects.toMatchObject({ reason: "access_denied" });
      expect(sessions.size).toBe(0);
    });
  });

  describe("keeping a session", () => {
    it("knows nobody without a handle, or with an unknown one", async () => {
      expect(await authentication.session(undefined)).toBeNull();
      expect(await authentication.session("")).toBeNull();
      expect(await authentication.session("nonsense")).toBeNull();
    });

    it("ends a session at its deadline, however active", async () => {
      const handle = await signIn();
      for (let hour = 0; hour < 8; hour++) {
        clock.advance(HOUR - 1);
        expect(await authentication.session(handle)).not.toBeNull();
      }
      clock.advance(10);

      expect(await authentication.session(handle)).toBeNull();
    });

    it("ends a session left unused for longer than the idle timeout", async () => {
      const handle = await signIn();
      clock.advance(HOUR + 1);

      expect(await authentication.session(handle)).toBeNull();
      expect(sessions.size).toBe(0);
    });

    it("refreshes the access token shortly before it expires", async () => {
      const handle = await signIn();
      clock.advance(HOUR - REFRESH_AHEAD + 1);

      const session = await authentication.session(handle);

      expect(provider.refreshes).toBe(1);
      expect(session?.tokens.accessToken).toBe("access-1+");
      expect((await sessions.read(handle))?.tokens.refreshToken).toBe("refresh-1+");
    });

    it("spends a refresh token once, however many requests need it at the same moment", async () => {
      const handle = await signIn();
      clock.advance(HOUR - REFRESH_AHEAD + 1);

      const results = await Promise.all(Array.from({ length: 5 }, () => authentication.session(handle)));

      // Clavia would revoke the whole family on a second use.
      expect(provider.refreshes).toBe(1);
      expect(new Set(results.map((session) => session?.tokens.accessToken))).toEqual(new Set(["access-1+"]));
    });

    it("ends the session when Clavia no longer accepts its refresh token", async () => {
      const handle = await signIn();
      provider.refreshed = null;
      clock.advance(HOUR);

      expect(await authentication.session(handle)).toBeNull();
      expect(sessions.size).toBe(0);
    });

    it("ends a session that has no refresh token when its access token runs out", async () => {
      provider.redemption = { tokens: provider.tokens({ refreshToken: null }), subject: "user-1", sid: null };
      const handle = await signIn();
      clock.advance(HOUR);

      expect(await authentication.session(handle)).toBeNull();
      expect(provider.refreshes).toBe(0);
    });
  });

  describe("signing out", () => {
    it("ends the session, gives the refresh token back, and sends the browser to Clavia", async () => {
      const handle = await signIn();

      const endSession = await authentication.signOut(handle, "https://management.clavia.test/dashboard/signed-out");

      expect(endSession?.searchParams.get("id_token_hint")).toBe("id-token-1");
      expect(provider.revoked).toEqual(["refresh-1"]);
      expect(await sessions.read(handle)).toBeNull();
    });

    it("has nothing to do for a browser without a session", async () => {
      expect(await authentication.signOut(undefined, "https://x.test/")).toBeNull();
      expect(await authentication.signOut("nonsense", "https://x.test/")).toBeNull();
      expect(provider.revoked).toEqual([]);
    });
  });

  describe("back-channel logout", () => {
    it("ends the sessions established through the named Clavia session, and no other", async () => {
      const first = await signIn();
      provider.redemption = { tokens: provider.tokens(), subject: "user-1", sid: "sid-2" };
      const second = await signIn();
      provider.logoutTokens.set("token", { subject: "user-1", sid: "sid-1" });

      expect(await authentication.backChannelLogout("token")).toBe(true);

      expect(await sessions.read(first)).toBeNull();
      expect(await sessions.read(second)).not.toBeNull();
    });

    it("ends every session of the person when the token names no session", async () => {
      await signIn();
      await signIn();
      provider.logoutTokens.set("token", { subject: "user-1", sid: null });

      await authentication.backChannelLogout("token");

      expect(sessions.size).toBe(0);
    });

    it("refuses a token that does not verify, and ends nothing", async () => {
      await signIn();

      expect(await authentication.backChannelLogout("forged")).toBe(false);
      expect(sessions.size).toBe(1);
    });
  });
});
