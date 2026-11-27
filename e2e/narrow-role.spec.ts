import { expect, test } from "@playwright/test";

import { Management, SEED } from "./clavia";
import { signIn } from "./support";

// What an operator sees follows the scopes their roles grant, and Clavia narrows the token to them when it is
// issued: a section they cannot read is not in the navigation, a page they reach by its address says what is
// missing, by name, and an action they cannot take is not offered.
test.describe("an operator with a narrow role", () => {
  test.skip(!SEED, "E2E_CLAVIA_SEED names the machine client of the stack; clavia's test/e2e/up.sh writes it.");
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sees only what the role allows, and is told what is missing", async ({ page, browser }) => {
    const management = await Management.connect();
    // They may read users, and nothing else.
    const operator = await management.createOperator({ permissions: ["read:users"] });
    try {
      await signIn(page, "./", operator);

      // The sections that need no scope, and the one the role reaches: nothing else.
      const sections = page.getByRole("navigation", { name: "Sections" });
      await expect(sections.getByRole("link")).toHaveText(["Overview", "Users", "Endpoints"]);

      // They can read users, and not create one.
      await page.goto("users");
      await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create user" })).toHaveCount(0);

      // A page they reach by its address names the scope that is missing.
      await page.goto("roles");
      await expect(page.getByText("You can't see roles")).toBeVisible();
      await expect(page.getByText("read:roles")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: "Roles" })).toHaveCount(0);

      // The control: the operator the other tests share is offered the action this one is not.
      const { baseURL, ignoreHTTPSErrors } = test.info().project.use;
      const administrator = await browser.newContext({
        baseURL,
        ignoreHTTPSErrors,
        storageState: "e2e/.auth/operator.json",
      });
      const administratorPage = await administrator.newPage();
      await administratorPage.goto("users");
      await expect(administratorPage.getByRole("button", { name: "Create user" })).toBeVisible();
      await administrator.close();
    } finally {
      await management.deleteUser(operator.id);
      if (operator.roleId !== undefined) await management.deleteRole(operator.roleId);
      await management.dispose();
    }
  });
});
