import { describe, expect, it } from "vitest";

import { parseCsv, parseCsvRecords } from "../../e2e/csv";

describe("parseCsv", () => {
  it("reads rows ending in CRLF or LF, and a last row with no end", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("leaves a byte order mark out of the first field", () => {
    expect(parseCsv("﻿id,type\r\n1,x\r\n")).toEqual([
      ["id", "type"],
      ["1", "x"],
    ]);
  });

  it("reads quoted fields: commas, doubled quotes and line breaks stay in the field", () => {
    expect(parseCsv('a,"b,c","say ""hi""","line\r\nbreak"\r\n')).toEqual([["a", "b,c", 'say "hi"', "line\r\nbreak"]]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a,,c\r\n,,\r\n")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ]);
  });

  it("is what the dashboard writes", async () => {
    const { auditCsvHeader, auditCsvRow } = await import("@/components/audit/csv");
    const event = {
      id: "evt_1",
      occurred_at: "2026-11-27T01:00:00Z",
      type: "user.created",
      outcome: "success",
      actor: { kind: "application", user_id: null, client_id: "c1", provisioning_token_id: null },
      target: { type: "user", id: "u1" },
      client_address: null,
      user_agent: '=cmd|"x", y',
      details: { email: "a@b.c" },
    } as unknown as Parameters<typeof auditCsvRow>[0];

    const [record] = parseCsvRecords(auditCsvHeader() + auditCsvRow(event));

    expect(record).toMatchObject({ id: "evt_1", type: "user.created", target_id: "u1", actor_client_id: "c1" });
    // The formula guard's apostrophe, and the quotes and comma, come back as written.
    expect(record?.user_agent).toBe('\'=cmd|"x", y');
  });
});

describe("parseCsvRecords", () => {
  it("keys each row by the header", () => {
    expect(parseCsvRecords("id,type\r\n1,x\r\n2,y\r\n")).toEqual([
      { id: "1", type: "x" },
      { id: "2", type: "y" },
    ]);
  });

  it("is empty for an empty document", () => {
    expect(parseCsvRecords("")).toEqual([]);
  });
});
