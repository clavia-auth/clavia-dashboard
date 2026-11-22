import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Records sealed with AES-256-GCM: `base64url(iv ‖ ciphertext ‖ tag)`, the record's key
 * bound in as associated data, so a ciphertext moved under another key does not open.
 */
export class Sealer {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error("The sealing key must be 32 bytes.");
    }
  }

  seal(value: unknown, context: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(context, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);

    return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString("base64url");
  }

  /** The value, or null when the record does not open (another key, tampered, truncated). */
  open<T>(sealed: string, context: string): T | null {
    const bytes = Buffer.from(sealed, "base64url");
    if (bytes.length < 12 + 16) {
      return null;
    }
    try {
      const decipher = createDecipheriv("aes-256-gcm", this.key, bytes.subarray(0, 12));
      decipher.setAAD(Buffer.from(context, "utf8"));
      decipher.setAuthTag(bytes.subarray(bytes.length - 16));
      const plaintext = Buffer.concat([decipher.update(bytes.subarray(12, bytes.length - 16)), decipher.final()]);

      return JSON.parse(plaintext.toString("utf8")) as T;
    } catch {
      return null;
    }
  }
}

/** A fresh handle for a browser to hold: 256 random bits. */
export function newHandle(): string {
  return randomBytes(32).toString("base64url");
}

/** What a handle is stored under: its SHA-256, so the store never holds what opens a session. */
export function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}
