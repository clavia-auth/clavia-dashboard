import { expect, test } from "@playwright/test";

import { Management, SEED } from "./clavia";
import { signIn } from "./support";

// Clavia posts a logout token to the dashboard when a session of a person it signed in ends, whatever ends
// it (OpenID Connect Back-Channel Logout 1.0): the dashboard's own session for them goes with it. Without
// that, an operator an administrator signed out would keep working until their access token expired.
test.describe("back-channel logout", () => {
  test.skip(!SEED, "E2E_CLAVIA_SEED names the machine client of the stack; clavia's test/e2e/up.sh writes it.");
  // An operator of its own: ending the sessions of the one the other tests share would end theirs too.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ending a person's sessions at Clavia signs them out of the dashboard", async ({ page }) => {
    const management = await Management.connect();
    const operator = await management.createOperator();
    try {
      await signIn(page, "./", operator);
      await page.goto("users");
      await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();

      await management.endSessions(operator.id);

      // The logout token is posted after Clavia's answer, so the dashboard learns of it a moment later: its
      // next request then finds no session, and Clavia's login page is where the operator is sent.
      await expect(async () => {
        await page.goto("users");
        await expect(page).toHaveURL(/\/auth\/login/);
      }).toPass({ timeout: 20_000 });
    } finally {
      await management.deleteUser(operator.id);
      await management.dispose();
    }
  });
});
