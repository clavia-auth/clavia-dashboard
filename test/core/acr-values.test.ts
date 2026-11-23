import { describe, expect, it } from "vitest";

import { safeAcrValues } from "@/core/auth/acr-values";

describe("safeAcrValues", () => {
  it.each([
    "phr",
    "http://schemas.openid.net/pape/policies/2007/06/multi-factor",
    "phr http://schemas.openid.net/pape/policies/2007/06/multi-factor",
  ])("keeps %s", (value) => {
    expect(safeAcrValues(value)).toBe(value);
  });

  it.each([
    ["nothing", null],
    ["nothing at all", undefined],
    ["an empty value", ""],
    ["a leading space", " phr"],
    ["a double space", "phr  mfa"],
    ["a line break", "phr\nmfa"],
    ["a quotation mark's neighbour, a tab", "phr\tmfa"],
    ["non-ASCII text", "phr é"],
    ["more than 512 characters", "a".repeat(513)],
  ])("drops %s", (_, value) => {
    expect(safeAcrValues(value)).toBeNull();
  });
});
