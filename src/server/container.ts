import "server-only";

import { Redis } from "ioredis";

import { MANAGEMENT_SCOPES } from "@/contract";
import { ClaviaManagementApi } from "@/adapters/management-api/clavia-management-api";
import { ClaviaIdentityProvider } from "@/adapters/oidc/clavia-identity-provider";
import { RedisPendingSignInStore, RedisSessionStore } from "@/adapters/session/redis-session-store";
import { Sealer } from "@/adapters/session/sealing";
import { Authentication } from "@/core/auth/authentication";
import type { ManagementApi } from "@/core/management/management-api";

import { config } from "./config";

/**
 * The composition root: the only module that knows which adapter implements which port.
 * Long-lived collaborators (the Redis connection, the provider's cached metadata) are
 * built once per server process — kept on `globalThis` so that development's module
 * reloading does not open a connection per edit.
 */
type Services = { authentication: Authentication; redis: Redis };

const registry = globalThis as typeof globalThis & { __claviaDashboard?: Services };

/** What the dashboard asks Clavia for: who the operator is, and every management scope. */
export const REQUESTED_SCOPES: readonly string[] = ["openid", "profile", "email", ...Object.keys(MANAGEMENT_SCOPES)];

function services(): Services {
  if (registry.__claviaDashboard !== undefined) {
    return registry.__claviaDashboard;
  }
  const settings = config();
  const redis = new Redis(settings.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
  const sealer = new Sealer(settings.sessionKey);
  const provider = new ClaviaIdentityProvider({
    issuer: settings.issuer,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    redirectUri: `${settings.dashboardUrl}/auth/callback`,
    audience: settings.managementApi.href,
  });
  const authentication = new Authentication(
    provider,
    new RedisSessionStore(redis, sealer),
    new RedisPendingSignInStore(redis, sealer),
    { now: () => Date.now() },
    {
      scopes: REQUESTED_SCOPES,
      sessionLifetime: settings.sessionLifetime,
      idleTimeout: settings.sessionIdleTimeout,
    },
  );
  registry.__claviaDashboard = { authentication, redis };

  return registry.__claviaDashboard;
}

export function authentication(): Authentication {
  return services().authentication;
}

/** The Management API on behalf of the operator whose access token this is. */
export function managementApiFor(accessToken: string): ManagementApi {
  return new ClaviaManagementApi(new URL("/", config().managementApi).href.replace(/\/$/, ""), accessToken);
}
