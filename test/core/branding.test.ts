import { describe, expect, it } from "vitest";

import { ACCENT_COLOR, accentTextColor } from "@/core/branding";

describe("an application's accent colour", () => {
  it("is # and six hexadecimal digits, nothing else", () => {
    expect(ACCENT_COLOR.test("#0f766e")).toBe(true);
    expect(ACCENT_COLOR.test("#0F766E")).toBe(true);
    for (const value of ["0f766e", "#0f7", "red", "#0f766e;}", "#0f766e\n"]) {
      expect(ACCENT_COLOR.test(value)).toBe(false);
    }
  });

  it("carries the text Clavia draws on it: white on a deep colour, dark ink on a pale one", () => {
    expect(accentTextColor("#2d6a4f")).toBe("#ffffff");
    expect(accentTextColor("#000000")).toBe("#ffffff");
    expect(accentTextColor("#f9e27d")).toBe("#12211a");
    expect(accentTextColor("#ffffff")).toBe("#12211a");
  });
});
