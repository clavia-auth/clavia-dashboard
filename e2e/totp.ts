import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** The bytes of a base32 secret, as an authenticator app reads the key Clavia shows (RFC 4648 §6). */
function decode(secret: string): Buffer {
  const bits = [...secret.replace(/[\s=]+/g, "").toUpperCase()]
    .map((character) => {
      const value = BASE32.indexOf(character);
      if (value < 0) throw new Error(`Not a base32 key: ${secret}`);

      return value.toString(2).padStart(5, "0");
    })
    .join("");

  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
}

/**
 * The six-digit code an authenticator app shows for `secret` at `at` (milliseconds): HOTP over the
 * 30-second time step, HMAC-SHA-1 (RFC 6238, RFC 4226 §5.3), which is what Clavia asks for.
 */
export function totp(secret: string, at: number = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const digest = createHmac("sha1", decode(secret)).update(counter).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const truncated = digest.readUInt32BE(offset) & 0x7fffffff;

  return String(truncated % 1_000_000).padStart(6, "0");
}
