import { describe, expect, it } from "vitest";

import { DEFAULT_RETURN_TO, safeReturnTo } from "@/core/auth/return-to";

describe("safeReturnTo", () => {
  it.each([
    ["/users", "/users"],
    ["/users/42?tab=roles", "/users/42?tab=roles"],
    ["/audit?type=authentication.failed&page=2", "/audit?type=authentication.failed&page=2"],
  ])("keeps a path inside the dashboard: %s", (candidate, expected) => {
    expect(safeReturnTo(candidate)).toBe(expected);
  });

  it.each([
    ["nothing", undefined],
    ["null", null],
    ["an absolute URL", "https://evil.example/"],
    ["a protocol-relative URL", "//evil.example/"],
    ["a backslash a browser reads as a slash", "/\\evil.example"],
    ["a backslash later on", "/users\\..\\evil"],
    ["a scheme", "javascript:alert(1)"],
    ["a relative path", "users"],
    ["a control character", "/users\n/evil"],
    ["a tab", "/\t/evil.example"],
    ["something far too long", `/${"a".repeat(2048)}`],
  ])("sends %s to the overview", (_, candidate) => {
    expect(safeReturnTo(candidate)).toBe(DEFAULT_RETURN_TO);
  });

  it("drops a fragment, which the server never sees anyway", () => {
    expect(safeReturnTo("/users#top")).toBe("/users");
  });
});
