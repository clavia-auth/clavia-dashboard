import { describe, expect, it } from "vitest";

import { Operator } from "@/core/auth/operator";
import type { DashboardSession } from "@/core/auth/session";

function session(identity: Partial<DashboardSession["operator"]>, scopes: string[] = []): DashboardSession {
  return {
    operator: { subject: "user-1", name: null, email: null, picture: null, ...identity },
    sid: null,
    tokens: { accessToken: "a", accessTokenExpiresAt: 0, refreshToken: null, idToken: "i", scopes },
    createdAt: 0,
    expiresAt: 0,
    lastSeenAt: 0,
  };
}

describe("Operator", () => {
  it("can do exactly what the token's scopes say", () => {
    const operator = Operator.of(session({}, ["read:users", "update:users"]));

    expect(operator.can("read:users")).toBe(true);
    expect(operator.can("update:users")).toBe(true);
    expect(operator.can("delete:users")).toBe(false);
    expect(operator.can("read:audit_events")).toBe(false);
  });

  it("is shown by name, else by address, else by subject", () => {
    expect(Operator.of(session({ name: "Ada Lovelace", email: "ada@example.com" })).displayName).toBe("Ada Lovelace");
    expect(Operator.of(session({ email: "ada@example.com" })).displayName).toBe("ada@example.com");
    expect(Operator.of(session({})).displayName).toBe("user-1");
  });

  it.each([
    ["Ada Lovelace", null, "AL"],
    [null, "ada.lovelace@example.com", "AL"],
    [null, "ada@example.com", "AE"],
    ["Ada", null, "A"],
  ])("has initials for an avatar: %s / %s", (name, email, initials) => {
    expect(Operator.of(session({ name, email })).initials).toBe(initials);
  });
});
