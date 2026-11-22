import "server-only";

import type { Redis } from "ioredis";

import type { PendingSignInStore, SessionStore } from "@/core/auth/ports";
import type { DashboardSession, PendingSignIn } from "@/core/auth/session";

import { digest, newHandle, type Sealer } from "./sealing";

/** How long a lock on a session is held at most, in milliseconds: longer than a refresh takes. */
const LOCK_LEASE = 10_000;
/** How long a request waits for another's lock before giving up, in milliseconds. */
const LOCK_PATIENCE = 12_000;

/** Releases a lock only for its holder: a lease that ran out may now be somebody else's. */
const RELEASE = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

/**
 * Sessions in Redis, under `{prefix}session:{digest of the handle}`, sealed. Two indexes
 * — by Clavia's `sid` and by subject — let back-channel logout find them; an index entry
 * whose session has expired is skipped and cleaned up as it is met.
 */
export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly sealer: Sealer,
    private readonly prefix = "dashboard:",
  ) {}

  async create(session: DashboardSession, ttlSeconds: number): Promise<string> {
    const handle = newHandle();
    await this.save(handle, session, ttlSeconds);

    return handle;
  }

  async read(handle: string): Promise<DashboardSession | null> {
    const key = this.sessionKey(handle);
    const sealed = await this.redis.get(key);

    return sealed === null ? null : this.sealer.open<DashboardSession>(sealed, key);
  }

  async save(handle: string, session: DashboardSession, ttlSeconds: number): Promise<void> {
    const key = this.sessionKey(handle);
    const indexTtl = Math.max(ttlSeconds, Math.ceil((session.expiresAt - Date.now()) / 1000));
    const pipeline = this.redis.multi().set(key, this.sealer.seal(session, key), "EX", ttlSeconds);
    for (const index of this.indexesOf(session)) {
      pipeline.sadd(index, key).expire(index, indexTtl, "GT").expire(index, indexTtl, "NX");
    }
    await pipeline.exec();
  }

  async destroy(handle: string): Promise<DashboardSession | null> {
    const key = this.sessionKey(handle);
    const sealed = await this.redis.getdel(key);
    const session = sealed === null ? null : this.sealer.open<DashboardSession>(sealed, key);
    if (session !== null) {
      const pipeline = this.redis.multi();
      for (const index of this.indexesOf(session)) {
        pipeline.srem(index, key);
      }
      await pipeline.exec();
    }

    return session;
  }

  destroyBySid(sid: string): Promise<number> {
    return this.destroyIndexed(`${this.prefix}sid:${digest(sid)}`);
  }

  destroyBySubject(subject: string): Promise<number> {
    return this.destroyIndexed(`${this.prefix}subject:${digest(subject)}`);
  }

  async exclusively<T>(handle: string, work: () => Promise<T>): Promise<T> {
    const lock = `${this.prefix}lock:${digest(handle)}`;
    const token = newHandle();
    const deadline = Date.now() + LOCK_PATIENCE;
    while ((await this.redis.set(lock, token, "PX", LOCK_LEASE, "NX")) !== "OK") {
      if (Date.now() > deadline) {
        throw new Error("Timed out waiting for another request to finish with this session.");
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    try {
      return await work();
    } finally {
      await this.redis.eval(RELEASE, 1, lock, token);
    }
  }

  private async destroyIndexed(index: string): Promise<number> {
    const keys = await this.redis.smembers(index);
    if (keys.length === 0) {
      return 0;
    }
    const removed = await this.redis.del(...keys);
    await this.redis.del(index);

    return removed;
  }

  private indexesOf(session: DashboardSession): string[] {
    const indexes = [`${this.prefix}subject:${digest(session.operator.subject)}`];
    if (session.sid !== null) {
      indexes.push(`${this.prefix}sid:${digest(session.sid)}`);
    }

    return indexes;
  }

  private sessionKey(handle: string): string {
    return `${this.prefix}session:${digest(handle)}`;
  }
}

/** Sign-ins in progress, under `{prefix}sign-in:{digest of the state}`, sealed, read once. */
export class RedisPendingSignInStore implements PendingSignInStore {
  constructor(
    private readonly redis: Redis,
    private readonly sealer: Sealer,
    private readonly prefix = "dashboard:",
  ) {}

  async put(pending: PendingSignIn, ttlSeconds: number): Promise<void> {
    const key = this.key(pending.state);
    await this.redis.set(key, this.sealer.seal(pending, key), "EX", ttlSeconds);
  }

  async take(state: string): Promise<PendingSignIn | null> {
    const key = this.key(state);
    const sealed = await this.redis.getdel(key);

    return sealed === null ? null : this.sealer.open<PendingSignIn>(sealed, key);
  }

  private key(state: string): string {
    return `${this.prefix}sign-in:${digest(state)}`;
  }
}
