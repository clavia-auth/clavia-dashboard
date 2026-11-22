import { randomBytes } from "node:crypto";

import { Redis } from "ioredis";
import { afterAll, describe, expect, it } from "vitest";

import { RedisPendingSignInStore, RedisSessionStore } from "@/adapters/session/redis-session-store";
import { digest, Sealer } from "@/adapters/session/sealing";

import { aSession, sessionStoreContract } from "../support/session-store-contract";

/**
 * Against a real Redis, when DASHBOARD_TEST_REDIS_URL names one (a database of its own:
 * keys are written under a prefix unique to the run, and removed afterwards).
 */
const url = process.env.DASHBOARD_TEST_REDIS_URL;

describe.skipIf(url === undefined)("Redis", () => {
  const redis = new Redis(url ?? "redis://localhost:6379/15", { lazyConnect: true });
  const prefix = `dashboard-test-${randomBytes(4).toString("hex")}:`;
  const sealer = new Sealer(randomBytes(32));
  const store = new RedisSessionStore(redis, sealer, prefix);

  afterAll(async () => {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    redis.disconnect();
  });

  sessionStoreContract("RedisSessionStore", () => store);

  it("keeps nothing in the clear: not the tokens, not the handle", async () => {
    const handle = await store.create(aSession(), 60);

    const keys = await redis.keys(`${prefix}*`);
    const values = await Promise.all(keys.filter((key) => key.includes(":session:")).map((key) => redis.get(key)));
    expect(keys.join(" ")).not.toContain(handle);
    expect(values.join(" ")).not.toMatch(/ada@example\.com|"accessToken"/);
  });

  it("expires a session with its time to live", async () => {
    const handle = await store.create(aSession(), 1);

    expect(await redis.ttl(`${prefix}session:${digest(handle)}`)).toBe(1);
  });

  it("gives a sign-in attempt to the first callback only", async () => {
    const attempts = new RedisPendingSignInStore(redis, sealer, prefix);
    const pending = { state: `state-${Math.random()}`, nonce: "n", codeVerifier: "v", returnTo: "/users" };
    await attempts.put(pending, 60);

    expect(await attempts.take(pending.state)).toEqual(pending);
    expect(await attempts.take(pending.state)).toBeNull();
  });
});
