import { describe, expect, it } from "vitest";

import { dayBuckets } from "@/components/audit/activity";

describe("dayBuckets", () => {
  it("gives the last days up to today, oldest first, cut at midnight UTC", () => {
    const buckets = dayBuckets(new Date("2026-11-25T22:30:00Z"), 3);

    expect(buckets.map((bucket) => bucket.since.toISOString())).toEqual([
      "2026-11-23T00:00:00.000Z",
      "2026-11-24T00:00:00.000Z",
      "2026-11-25T00:00:00.000Z",
    ]);
  });

  it("ends each day where the next begins, so no instant is counted twice or missed", () => {
    const buckets = dayBuckets(new Date("2026-11-25T00:00:00Z"), 7);

    for (let index = 1; index < buckets.length; index += 1) {
      expect(buckets[index]!.since.getTime()).toBe(buckets[index - 1]!.until.getTime());
    }
    expect(buckets.at(-1)!.until.toISOString()).toBe("2026-11-26T00:00:00.000Z");
  });

  it("crosses a month and a year", () => {
    const buckets = dayBuckets(new Date("2027-01-01T08:00:00Z"), 3);

    expect(buckets[0]!.since.toISOString()).toBe("2026-12-30T00:00:00.000Z");
  });
});
