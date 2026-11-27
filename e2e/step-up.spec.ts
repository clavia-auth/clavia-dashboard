import { expect, test } from "@playwright/test";

import { Management, SEED } from "./clavia";
import { signIn, takeWhatClaviaAsks } from "./support";

// RFC 9470. When the Management API's `mfa_policy` is `required` and the sign-in behind an operator's token
// used one factor, the API refuses the token and names the level to ask for. The dashboard then sends the
// operator to sign in again at that level, back to the page they were on: Clavia asks the missing factor and
// not the password. A session under a minute old is not sent round, since it may itself be the answer to a
// challenge: the refusal is shown, so a step-up that does not help cannot loop.
//
// The Management API's policy is global, so this runs in a project of its own, after the others (see
// playwright.config.ts), and puts the policy back whatever happens.
test.describe("step-up", () => {
  test.skip(!SEED, "E2E_CLAVIA_SEED names the machine client of the stack; clavia's test/e2e/up.sh writes it.");

  test("a one-factor session is sent round to add a factor, and back to the page it was on", async ({ page }) => {
    // The grace period of a young session is a minute: the test waits it out once.
    test.setTimeout(180_000);
    const management = await Management.connect();
    const operator = await management.createOperator();
    try {
      // The operator signs in with one factor: the policy is off for this sign-in.
      await management.setMfaPolicy("optional");
      await signIn(page, "./", operator);
      const signedInAt = Date.now();
      await management.setMfaPolicy("required");

      // The API now refuses their token. The session is a few seconds old, so it is not sent round: the page
      // shows the refusal where it is, which is the error page, and Clavia is not asked anything.
      await page.goto("users");
      await expect(page).toHaveURL(/\/dashboard\/users$/);
      await expect(page.getByText("This page could not be loaded")).toBeVisible();

      // A minute on, the same request is sent round: Clavia, where this operator has no factor yet, has them
      // set one up on the way, and they come back to the page they were on.
      await page.waitForTimeout(Math.max(0, 62_000 - (Date.now() - signedInAt)));
      await page.goto("users");
      await page.waitForURL((url) => url.pathname.startsWith("/auth/"));
      await takeWhatClaviaAsks(page, operator);

      await expect(page).toHaveURL(/\/dashboard\/users$/);
      await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
    } finally {
      await management.setMfaPolicy("required");
      await management.deleteUser(operator.id);
      await management.dispose();
    }
  });
});
