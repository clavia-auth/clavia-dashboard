import { describe, expect, it } from "vitest";

import { SAML_PRESETS, samlPreset } from "@/app/(console)/connections/saml-presets";

describe("SAML presets", () => {
  it("offers Entra ID, Okta, ADFS and Google Workspace", () => {
    expect(SAML_PRESETS.map((preset) => preset.label)).toEqual([
      "Microsoft Entra ID",
      "Okta",
      "ADFS",
      "Google Workspace",
    ]);
  });

  it("names every attribute a profile needs but the subject, which may be the persistent NameID", () => {
    for (const preset of SAML_PRESETS) {
      expect(preset.email_attribute).not.toBe("");
      expect(preset.given_name_attribute).not.toBe("");
    }
    expect(samlPreset("okta")?.subject_attribute).toBe("");
  });

  it("only ADFS is said to encrypt with CBC", () => {
    expect(SAML_PRESETS.filter((preset) => preset.cbc).map((preset) => preset.id)).toEqual(["adfs"]);
  });

  it("finds a preset by id", () => {
    expect(samlPreset("entra")?.label).toBe("Microsoft Entra ID");
    expect(samlPreset("nope")).toBeUndefined();
  });
});
