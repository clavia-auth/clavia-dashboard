import { describe, expect, it } from "vitest";

import { AUDIT_CSV_COLUMNS, auditCsvHeader, auditCsvRow, csvField } from "@/components/audit/csv";
import type { AuditEvent } from "@/contract";

const event: AuditEvent = {
  id: "0198f7a1-0000-7000-8000-000000000009",
  type: "client.updated",
  occurred_at: "2026-11-25T10:00:00Z",
  outcome: "success",
  actor: { kind: "person", user_id: "u1", client_id: null, provisioning_token_id: null },
  target: { type: "client", id: "app1" },
  details: { fields: ["redirect_uris", "mfa_policy"] },
  client_address: "203.0.113.42",
  user_agent: "Mozilla/5.0 (X11; Linux)",
};

describe("csvField", () => {
  it("leaves a plain value as it is, and a missing one empty", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField(null)).toBe("");
    expect(csvField(undefined)).toBe("");
  });

  it("quotes what holds a comma, a quote or a line break, doubling the quotes", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("one\r\ntwo")).toBe('"one\r\ntwo"');
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tx", "\rx"])(
    "keeps a spreadsheet from reading %j as a formula",
    (value) => {
      expect(csvField(value).replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );
});

describe("a reader that splits fields at a semicolon or a tab", () => {
  it.each([
    ["x;=cmd()", '"x;\'=cmd()"'],
    ["x\t+1", '"x\t\'+1"'],
    ["a;b;@c", '"a;b;\'@c"'],
  ])("cannot make a formula of the part after the split in %j", (value, expected) => {
    expect(csvField(value)).toBe(expected);
  });

  it("quotes a field holding a semicolon, so a reader that honours quotes keeps it whole", () => {
    expect(csvField("a;b")).toBe('"a;b"');
  });
});

describe("the audit CSV", () => {
  it("has a header naming every column, ended by CRLF", () => {
    expect(auditCsvHeader()).toBe(`${AUDIT_CSV_COLUMNS.join(",")}\r\n`);
  });

  it("writes an event as one line with its details as JSON", () => {
    const line = auditCsvRow(event);

    expect(line.endsWith("\r\n")).toBe(true);
    expect(line).toBe(
      [
        event.id,
        "2026-11-25T10:00:00Z",
        "client.updated",
        "success",
        "person",
        "u1",
        "",
        "",
        "client",
        "app1",
        "203.0.113.42",
        '"Mozilla/5.0 (X11; Linux)"',
        '"{""fields"":[""redirect_uris"",""mfa_policy""]}"',
      ].join(",") + "\r\n",
    );
  });

  it("leaves the target empty for an event with none", () => {
    expect(
      auditCsvRow({ ...event, target: null })
        .split(",")
        .slice(8, 10),
    ).toEqual(["", ""]);
  });
});
