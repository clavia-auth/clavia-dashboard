import { describe, expect, it } from "vitest";

import { ALL_EVENT_TYPES } from "@/components/audit/describe";
import { eventsSummary, PICKER_SECTIONS, SUBSCRIBABLE } from "@/components/webhooks/events";

describe("the event picker", () => {
  it("offers every event type the audit trail records, but the test event", () => {
    expect([...SUBSCRIBABLE].sort()).toEqual(ALL_EVENT_TYPES.filter((type) => type !== "webhook.tested").sort());
  });

  it("offers each type once", () => {
    expect(new Set(SUBSCRIBABLE).size).toBe(SUBSCRIBABLE.length);
  });

  it("puts configuration and security before the traffic", () => {
    expect(PICKER_SECTIONS.map((section) => section.title)).toEqual(["Configuration and security", "Activity"]);
    expect(PICKER_SECTIONS[1]?.description).toContain("token.issued");
  });

  it("summarises what an endpoint hears", () => {
    expect(eventsSummary(["*"])).toBe("Every event");
    expect(eventsSummary(["user.created"])).toBe("User created");
    expect(eventsSummary(["user.created", "user.deleted"])).toBe("2 event types");
  });
});
