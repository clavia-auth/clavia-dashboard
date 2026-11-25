import { describe, expect, it } from "vitest";

import {
  claimsFor,
  type ClaimDraft,
  type ClaimSubject,
  draftOf,
  joinSource,
  mappingsOf,
  metadataText,
  parseMetadata,
  splitSource,
} from "@/core/claims/claims";

const subject: ClaimSubject = {
  email: "ada@example.com",
  email_verified: false,
  connection: "password",
  profile: { name: "Ada Lovelace", nickname: null, locale: "en-GB" },
  app_metadata: { plan: "enterprise", tenant: { id: "t-1", tags: ["a"] }, empty: null },
  roles: ["admin", "billing"],
};

const draft = (overrides: Partial<ClaimDraft>): ClaimDraft => ({
  name: "x",
  kind: "email",
  detail: "",
  value: "",
  in: ["id_token", "userinfo"],
  ...overrides,
});

describe("sources", () => {
  it.each([
    ["email", "email", ""],
    ["email_verified", "email_verified", ""],
    ["profile.given_name", "profile", "given_name"],
    ["app_metadata.tenant.id", "app_metadata", "tenant.id"],
    ["roles", "roles", ""],
    ["constant", "constant", ""],
  ])("takes %s apart and puts it back", (source, kind, detail) => {
    expect(splitSource(source)).toEqual({ kind, detail });
    expect(joinSource(kind as never, detail)).toBe(source);
  });
});

describe("claimsFor", () => {
  it("reads each source from the account", () => {
    const claims = claimsFor(
      [
        { name: "mail", source: "email" },
        { name: "verified", source: "email_verified" },
        { name: "pool", source: "connection" },
        { name: "who", source: "profile.name" },
        { name: "plan", source: "app_metadata.plan" },
        { name: "tenant", source: "app_metadata.tenant.id" },
        { name: "roles", source: "roles" },
        { name: "region", source: "constant", value: "eu-west" },
      ],
      subject,
    );

    expect(claims).toEqual({
      mail: "ada@example.com",
      verified: false,
      pool: "password",
      who: "Ada Lovelace",
      plan: "enterprise",
      tenant: "t-1",
      roles: ["admin", "billing"],
      region: "eu-west",
    });
  });

  it("leaves a claim out when its source has no value, and never sends null", () => {
    const claims = claimsFor(
      [
        { name: "nick", source: "profile.nickname" },
        { name: "pic", source: "profile.picture" },
        { name: "missing", source: "app_metadata.nope" },
        { name: "deep", source: "app_metadata.plan.level" },
        { name: "nothing", source: "app_metadata.empty" },
        { name: "roles", source: "roles" },
      ],
      { ...subject, roles: [] },
    );

    expect(claims).toEqual({});
  });

  it("keeps a false value, which is a value", () => {
    expect(claimsFor([{ name: "verified", source: "email_verified" }], subject)).toEqual({ verified: false });
  });

  it("sends an application's claim only where it goes", () => {
    const mappings = [
      { name: "a", source: "email", in: ["id_token" as const] },
      { name: "b", source: "connection", in: ["userinfo" as const] },
      { name: "c", source: "constant", value: 1, in: ["id_token" as const, "userinfo" as const] },
    ];

    expect(claimsFor(mappings, subject, "id_token")).toEqual({ a: "ada@example.com", c: 1 });
    expect(claimsFor(mappings, subject, "userinfo")).toEqual({ b: "password", c: 1 });
  });
});

describe("mappingsOf", () => {
  it("builds an API's mappings, and a constant's value from its JSON", () => {
    const result = mappingsOf(
      [
        draft({ name: " tenant ", kind: "app_metadata", detail: "tenant.id" }),
        draft({ name: "limits", kind: "constant", value: '{"rps": 5}' }),
      ],
      false,
    );

    expect(result).toEqual({
      ok: true,
      mappings: [
        { name: "tenant", source: "app_metadata.tenant.id" },
        { name: "limits", source: "constant", value: { rps: 5 } },
      ],
    });
  });

  it("says where an application's claim goes", () => {
    const result = mappingsOf([draft({ kind: "profile", detail: "locale", in: ["userinfo"] })], true);

    expect(result).toEqual({ ok: true, mappings: [{ name: "x", source: "profile.locale", in: ["userinfo"] }] });
  });

  it("names each row that is not complete", () => {
    const result = mappingsOf(
      [
        draft({ name: "  " }),
        draft({ kind: "app_metadata", detail: " " }),
        draft({ kind: "constant", value: "not json" }),
        draft({ kind: "constant", value: "null" }),
        draft({ in: [] }),
        draft({}),
      ],
      true,
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.problems.map((problem) => problem.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it("asks for no destination of an API's claim", () => {
    expect(mappingsOf([draft({ in: [] })], false).ok).toBe(true);
  });

  it("gives back the rows of stored mappings", () => {
    const stored = [
      { name: "region", source: "constant", value: "eu", in: ["id_token" as const] },
      { name: "plan", source: "app_metadata.plan", in: ["id_token" as const, "userinfo" as const] },
    ];

    const rows = stored.map(draftOf);

    expect(rows[0]).toMatchObject({ kind: "constant", value: '"eu"', in: ["id_token"] });
    expect(rows[1]).toMatchObject({ kind: "app_metadata", detail: "plan", value: "" });
    expect(mappingsOf(rows, true)).toEqual({ ok: true, mappings: stored });
  });
});

describe("application metadata", () => {
  it("takes a JSON object and nothing else", () => {
    expect(parseMetadata('{"plan": "pro"}')).toEqual({ plan: "pro" });
    expect(parseMetadata("{}")).toEqual({});
    for (const text of ["", "[]", "null", "3", '"x"', "{", "{'a': 1}"]) {
      expect(parseMetadata(text)).toBeNull();
    }
  });

  it("is shown indented, and empty as an object", () => {
    expect(metadataText({})).toBe("{}");
    expect(metadataText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});
