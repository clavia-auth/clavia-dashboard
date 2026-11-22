import { describe, expect, it } from "vitest";

import type { SessionStore } from "@/core/auth/ports";
import type { DashboardSession } from "@/core/auth/session";

/** A session for `subject` through Clavia's session `sid`. */
export function aSession(subject = "user-1", sid: string | null = "sid-1"): DashboardSession {
  const now = Date.now();

  return {
    operator: { subject, name: "Ada", email: "ada@example.com", picture: null },
    sid,
    tokens: {
      accessToken: "a",
      accessTokenExpiresAt: now + 3_600_000,
      refreshToken: "r",
      idToken: "i",
      scopes: ["read:users"],
    },
    createdAt: now,
    expiresAt: now + 8 * 3_600_000,
    lastSeenAt: now,
  };
}

/** What every SessionStore does — run against the in-memory store and against Redis. */
export function sessionStoreContract(name: string, store: () => SessionStore): void {
  describe(`${name} (SessionStore contract)`, () => {
    it("reads back what it stored, under a handle of its own", async () => {
      const session = aSession();
      const handle = await store().create(session, 60);

      expect(handle.length).toBeGreaterThan(0);
      expect(await store().read(handle)).toEqual(session);
    });

    it("knows nothing of a handle it never gave", async () => {
      expect(await store().read("never-issued")).toBeNull();
    });

    it("replaces a session saved again", async () => {
      const handle = await store().create(aSession(), 60);
      const renewed = { ...aSession(), tokens: { ...aSession().tokens, accessToken: "b" } };

      await store().save(handle, renewed, 60);

      expect((await store().read(handle))?.tokens.accessToken).toBe("b");
    });

    it("gives back a session as it destroys it, once", async () => {
      const handle = await store().create(aSession(), 60);

      expect((await store().destroy(handle))?.operator.subject).toBe("user-1");
      expect(await store().destroy(handle)).toBeNull();
      expect(await store().read(handle)).toBeNull();
    });

    it("destroys the sessions of one Clavia session, and only those", async () => {
      const subject = `user-${Math.random()}`;
      const sid = `sid-${Math.random()}`;
      const named = await store().create(aSession(subject, sid), 60);
      const other = await store().create(aSession(subject, `${sid}-other`), 60);

      expect(await store().destroyBySid(sid)).toBe(1);

      expect(await store().read(named)).toBeNull();
      expect(await store().read(other)).not.toBeNull();
    });

    it("destroys every session of a person", async () => {
      const subject = `user-${Math.random()}`;
      const first = await store().create(aSession(subject, `sid-${Math.random()}`), 60);
      const second = await store().create(aSession(subject, null), 60);
      const someoneElse = await store().create(aSession(`${subject}-2`, null), 60);

      expect(await store().destroyBySubject(subject)).toBe(2);

      expect(await store().read(first)).toBeNull();
      expect(await store().read(second)).toBeNull();
      expect(await store().read(someoneElse)).not.toBeNull();
    });

    it("runs one caller at a time on a handle", async () => {
      const handle = await store().create(aSession(), 60);
      const order: string[] = [];
      const work = (label: string) => async () => {
        order.push(`${label} in`);
        await new Promise((resolve) => setTimeout(resolve, 20));
        order.push(`${label} out`);

        return label;
      };

      const results = await Promise.all([
        store().exclusively(handle, work("a")),
        store().exclusively(handle, work("b")),
      ]);

      expect(results).toEqual(["a", "b"]);
      expect(order).toEqual(["a in", "a out", "b in", "b out"]);
    });

    it("lets the next caller in when the work fails", async () => {
      const handle = await store().create(aSession(), 60);

      await expect(store().exclusively(handle, async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
      await expect(store().exclusively(handle, async () => "next")).resolves.toBe("next");
    });
  });
}
