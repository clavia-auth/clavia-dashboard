import { describe, expect, it } from "vitest";

import { totp } from "../../e2e/totp";

// RFC 6238 appendix B: the SHA-1 secret "12345678901234567890", whose base32 form is below. The RFC lists
// eight digits; an authenticator app, and Clavia, show the last six.
const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totp", () => {
  it.each([
    [59, "287082"],
    [1_111_111_109, "081804"],
    [1_111_111_111, "050471"],
    [1_234_567_890, "005924"],
    [2_000_000_000, "279037"],
  ])("gives the RFC 6238 code at %i seconds", (seconds, expected) => {
    expect(totp(SECRET, seconds * 1000)).toBe(expected);
  });

  it("reads a key written in groups and in lower case", () => {
    expect(totp("gezd gnbv gy3t qojq gezd gnbv gy3t qojq", 59_000)).toBe("287082");
  });

  it("refuses what is not base32", () => {
    expect(() => totp("not a key!", 0)).toThrow(/base32/);
  });
});
