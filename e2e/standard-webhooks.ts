import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The signature of a delivery, as the Standard Webhooks specification has it: HMAC-SHA-256, with the key the
 * secret decodes to (`whsec_` and base64), of `<webhook-id>.<webhook-timestamp>.<body>`, written `v1,<base64>`.
 */
export function sign(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");

  return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

/** What a delivery carries to prove where it came from. */
export type SignedHeaders = Readonly<Record<string, string | string[] | undefined>>;

/**
 * Whether `headers` and `body` are a delivery signed with `secret`: one of the space-separated signatures of
 * `webhook-signature` (two, while a secret is being rotated) is the right one, and the timestamp is within
 * `toleranceSeconds` of `now`, which is what a receiver does to refuse a replay.
 */
export function verifies(
  secret: string,
  headers: SignedHeaders,
  body: string,
  now: number = Date.now(),
  toleranceSeconds = 300,
): boolean {
  const id = single(headers["webhook-id"]);
  const timestamp = single(headers["webhook-timestamp"]);
  const signatures = single(headers["webhook-signature"]);
  if (id === undefined || timestamp === undefined || signatures === undefined) return false;
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > toleranceSeconds) return false;

  const expected = Buffer.from(sign(secret, id, timestamp, body));

  return signatures.split(" ").some((candidate) => {
    const actual = Buffer.from(candidate);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
