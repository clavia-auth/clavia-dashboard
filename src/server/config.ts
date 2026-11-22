import "server-only";

import { z } from "zod";

/**
 * The dashboard's settings, read once from the environment and checked whole: a missing
 * or malformed value stops the server at its first request with every problem listed,
 * rather than surfacing as a failed sign-in later.
 */
const schema = z.object({
  /** The issuer, exactly as Clavia's discovery document states it: `https://auth.{domain}`. */
  CLAVIA_ISSUER: z.url({ protocol: /^https$/, error: "must be an https URL" }),
  /** The dashboard's own client id at Clavia (a confidential, first-party client). */
  CLAVIA_CLIENT_ID: z.string().min(1),
  /** Its client secret; sent with HTTP Basic, never to the browser. */
  CLAVIA_CLIENT_SECRET: z.string().min(16, "must be at least 16 characters"),
  /** The Management API's identifier, which is also where it is served: `https://management.{domain}/api/v1/`. */
  CLAVIA_MANAGEMENT_API: z
    .url({ protocol: /^https$/, error: "must be an https URL" })
    .refine((value) => value.endsWith("/"), "must end with a slash"),
  /** Where the dashboard is reached by browsers: `https://management.{domain}/dashboard`. */
  DASHBOARD_URL: z
    .url({ protocol: /^https$/, error: "must be an https URL" })
    .transform((value) => value.replace(/\/+$/, "")),
  /**
   * 32 random bytes, base64url (`openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`): the
   * key the session records are encrypted with at rest.
   */
  DASHBOARD_SESSION_SECRET: z
    .string()
    .refine((value) => Buffer.from(value, "base64url").length === 32, "must be 32 bytes, base64url-encoded"),
  /** Where sessions are kept. A database of its own, or a prefix nobody else uses. */
  DASHBOARD_REDIS_URL: z.url({ protocol: /^rediss?$/, error: "must be a redis:// or rediss:// URL" }),
  /** How long an operator stays signed in, whatever they do, in seconds. */
  DASHBOARD_SESSION_LIFETIME: z.coerce
    .number()
    .int()
    .min(300)
    .max(7 * 24 * 3600)
    .default(8 * 3600),
  /** How long a session survives without use, in seconds. */
  DASHBOARD_SESSION_IDLE_TIMEOUT: z.coerce
    .number()
    .int()
    .min(60)
    .max(24 * 3600)
    .default(3600),
});

export type DashboardConfig = Readonly<{
  issuer: URL;
  clientId: string;
  clientSecret: string;
  managementApi: URL;
  /** The public base URL, without a trailing slash. */
  dashboardUrl: string;
  sessionKey: Buffer;
  redisUrl: string;
  sessionLifetime: number;
  sessionIdleTimeout: number;
}>;

let loaded: DashboardConfig | undefined;

export function config(): DashboardConfig {
  if (loaded !== undefined) {
    return loaded;
  }

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`The dashboard's configuration is invalid:\n${problems.join("\n")}`);
  }
  const env = parsed.data;

  loaded = Object.freeze({
    issuer: new URL(env.CLAVIA_ISSUER),
    clientId: env.CLAVIA_CLIENT_ID,
    clientSecret: env.CLAVIA_CLIENT_SECRET,
    managementApi: new URL(env.CLAVIA_MANAGEMENT_API),
    dashboardUrl: env.DASHBOARD_URL,
    sessionKey: Buffer.from(env.DASHBOARD_SESSION_SECRET, "base64url"),
    redisUrl: env.DASHBOARD_REDIS_URL,
    sessionLifetime: env.DASHBOARD_SESSION_LIFETIME,
    sessionIdleTimeout: env.DASHBOARD_SESSION_IDLE_TIMEOUT,
  });

  return loaded;
}
