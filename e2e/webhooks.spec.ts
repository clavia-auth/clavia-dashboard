import { expect, test } from "@playwright/test";

import { Management, SEED } from "./clavia";
import { DELIVERY_URL, RECEIVER, waitForDeliveries } from "./receiver";
import { verifies } from "./standard-webhooks";

// Clavia sends the audit events an operator subscribes a webhook to, signed as Standard Webhooks, to the
// address registered. The secret is shown once, when the webhook is added; a test event goes to that endpoint
// alone, and the delivery log says what was sent and how it went.
test.describe("webhooks", () => {
  test.skip(!RECEIVER || !SEED, "E2E_RECEIVER_URL and E2E_CLAVIA_SEED name the stack's receiver and machine client.");

  test("a webhook the operator adds receives signed events, and its log says so", async ({ page }) => {
    test.setTimeout(120_000);
    const run = Math.random().toString(36).slice(2, 10);
    const path = `/hook/${run}`;
    const description = `e2e receiver ${run}`;
    const management = await Management.connect();
    let userId: string | undefined;
    let webhookId: string | undefined;

    try {
      // The operator adds a webhook for the stack's receiver, to hear when a user is created.
      await page.goto("webhooks");
      await page.getByRole("button", { name: "Add webhook" }).click();
      const form = page.getByRole("dialog", { name: "Add a webhook" });
      await form.getByLabel("URL").fill(`${DELIVERY_URL}${path}`);
      await form.getByLabel("Description").fill(description);
      await form.getByRole("checkbox", { name: /user\.created/ }).check();
      await form.getByRole("button", { name: "Add webhook" }).click();

      // The signing secret, once.
      const shown = page.getByRole("dialog", { name: "Copy the signing secret now" });
      await expect(shown).toBeVisible();
      const secret = await shown.locator("code").innerText();
      expect(secret).toMatch(/^whsec_[A-Za-z0-9+/]{43}=$/);
      await shown.getByRole("button", { name: "I have copied it" }).click();

      // A test goes to this endpoint alone.
      await page.getByRole("link", { name: description }).click();
      webhookId = /\/webhooks\/([^/]+)/.exec(page.url())?.[1];
      await page.getByRole("button", { name: "Send a test" }).click();
      const [test1] = await waitForDeliveries(path, 1);
      expect(test1?.method).toBe("POST");
      expect(verifies(secret, test1!.headers, test1!.body)).toBe(true);
      expect(JSON.parse(test1!.body)).toMatchObject({ type: "webhook.tested" });

      // An event it subscribed to goes to it, signed with the same secret, under the id of the audit event.
      userId = (await management.createUsers(1))[0];
      const [, created] = await waitForDeliveries(path, 2);
      expect(verifies(secret, created!.headers, created!.body)).toBe(true);
      const event = JSON.parse(created!.body) as { type: string; data: { id: string; target: { id: string } } };
      expect(event.type).toBe("user.created");
      expect(event.data.target.id).toBe(userId);
      expect(created!.headers["webhook-id"]).toBe(event.data.id);

      // The delivery log says both went through.
      await page.getByRole("link", { name: "Deliveries" }).click();
      await expect(page).toHaveURL(/\/deliveries$/);
      const log = page.getByRole("table");
      await expect(log.getByRole("row", { name: /webhook\.tested.*Delivered/ })).toBeVisible();
      await expect(log.getByRole("row", { name: /user\.created.*Delivered/ })).toBeVisible();
    } finally {
      // The stack is shared, and an operator may have twenty webhooks: this one goes, and the person made.
      if (webhookId !== undefined) await management.deleteWebhook(webhookId).catch(() => undefined);
      if (userId !== undefined) await management.deleteUser(userId).catch(() => undefined);
      await management.dispose();
    }
  });
});
