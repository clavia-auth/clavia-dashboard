import { expect, type Page, test } from "@playwright/test";

import { Management, SEED } from "./clavia";
import { parseCsvRecords } from "./csv";

/** What the export route answers to the signed-in browser, fetched as a download link is. */
async function exportCsv(page: Page, query: string) {
  return page.evaluate(async (search) => {
    const response = await fetch(`/dashboard/audit/export?${search}`);

    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body: await response.text(),
    };
  }, query);
}

// The audit log's "Export CSV" button downloads every event the filters match, not the page on screen: the
// file is streamed from Clavia a page at a time, and a long log never sits in memory. The page shows fifty
// events and the export reads Clavia's log a hundred at a time, so the events this test makes are more than
// either holds.
test.describe("the audit log's CSV export", () => {
  test.skip(!SEED, "E2E_CLAVIA_SEED names the machine client of the stack; clavia's test/e2e/up.sh writes it.");

  test("holds every event the filters match, beyond a page and beyond one read of Clavia's log", async ({ page }) => {
    test.setTimeout(120_000);
    const management = await Management.connect();
    const users = await management.createUsers(110);
    const role = await management.createRole();
    try {
      // The log on screen shows a page of fifty.
      await page.goto("audit?type=user.created");
      await expect(page.getByRole("row")).toHaveCount(51);

      // The export of the same filter holds every one of the 110 people made, and nothing of another kind.
      const created = await exportCsv(page, "type=user.created&outcome=success");
      expect(created.status).toBe(200);
      expect(created.contentType).toContain("text/csv");
      const records = parseCsvRecords(created.body);
      expect(records.length).toBeGreaterThanOrEqual(110);
      expect(records.every((record) => record.type === "user.created" && record.outcome === "success")).toBe(true);
      const targets = new Set(records.map((record) => record.target_id));
      expect(users.filter((id) => !targets.has(id))).toEqual([]);
      expect(targets.has(role)).toBe(false);

      // The filter is the reason: the role's own event is in the export of its type, and of no other.
      const roles = parseCsvRecords((await exportCsv(page, "type=role.created")).body);
      expect(roles.find((record) => record.target_id === role)).toMatchObject({ target_type: "role" });
    } finally {
      await management.deleteUsers(users);
      await management.deleteRole(role);
      await management.dispose();
    }
  });
});
