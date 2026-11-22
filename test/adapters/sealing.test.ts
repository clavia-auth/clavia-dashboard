import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { digest, newHandle, Sealer } from "@/adapters/session/sealing";

describe("Sealer", () => {
  const sealer = new Sealer(randomBytes(32));

  it("opens what it sealed, under the same key", () => {
    const sealed = sealer.seal({ subject: "user-1", scopes: ["read:users"] }, "dashboard:session:abc");

    expect(sealer.open(sealed, "dashboard:session:abc")).toEqual({ subject: "user-1", scopes: ["read:users"] });
  });

  it("never seals the same value to the same bytes", () => {
    expect(sealer.seal("x", "k")).not.toBe(sealer.seal("x", "k"));
  });

  it("refuses a record moved under another key", () => {
    expect(sealer.open(sealer.seal("x", "dashboard:session:a"), "dashboard:session:b")).toBeNull();
  });

  it("refuses a record sealed with another secret", () => {
    expect(new Sealer(randomBytes(32)).open(sealer.seal("x", "k"), "k")).toBeNull();
  });

  it("refuses a tampered or truncated record", () => {
    const sealed = Buffer.from(sealer.seal("x", "k"), "base64url");
    sealed[sealed.length - 1] ^= 1;

    expect(sealer.open(sealed.toString("base64url"), "k")).toBeNull();
    expect(sealer.open("short", "k")).toBeNull();
  });

  it("insists on a 256-bit key", () => {
    expect(() => new Sealer(randomBytes(16))).toThrow("32 bytes");
  });
});

describe("handles", () => {
  it("are 256 random bits, stored as their digest", () => {
    const handle = newHandle();

    expect(Buffer.from(handle, "base64url")).toHaveLength(32);
    expect(digest(handle)).not.toContain(handle);
    expect(digest(handle)).toBe(digest(handle));
  });
});
