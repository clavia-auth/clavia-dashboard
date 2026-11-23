import { describe, expect, it } from "vitest";

import { isSignInRefused, SignInRefused } from "@/core/auth/ports";

describe("isSignInRefused", () => {
  it("knows a refusal", () => {
    expect(isSignInRefused(new SignInRefused("unknown_attempt", "No such attempt."))).toBe(true);
  });

  it("knows a refusal thrown by another copy of the class, as after a hot reload", () => {
    class SignInRefused extends Error {
      override readonly name = "SignInRefused";

      constructor(readonly reason: string) {
        super("refused");
      }
    }

    expect(isSignInRefused(new SignInRefused("access_denied"))).toBe(true);
  });

  it.each([
    ["an ordinary error", new Error("boom")],
    ["an error that only has the name", Object.assign(new Error("x"), { name: "SignInRefused" })],
    ["something that is not an error", { name: "SignInRefused", reason: "access_denied" }],
    ["nothing", undefined],
  ])("does not take %s for one", (_, error) => {
    expect(isSignInRefused(error)).toBe(false);
  });
});
