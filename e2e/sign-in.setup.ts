import { expect, test as setup } from "@playwright/test";

import { signIn } from "./support";

/** Signs the operator in once; the other tests start from the session it leaves. */
setup("an operator signs in through Clavia", async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
  await page.context().storageState({ path: "e2e/.auth/operator.json" });
});
