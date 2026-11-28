import { expect, test } from "@playwright/test";

import { Management, SEED } from "./clavia";
import { watchForErrors } from "./support";

/** Whether the stack runs a decision engine (OpenFGA beside Clavia): CI's does not yet. */
const ENGINE = process.env.E2E_FGA === "1";

const MODEL = `model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define viewer: [user] or owner
`;

// An API's fine-grained authorization, set up from the dashboard: the model written in OpenFGA's language and
// checked before it leaves, its versions, its relationships and a decision tried without the API.
test.describe("an API's authorization", () => {
  test.skip(!SEED, "E2E_CLAVIA_SEED names the stack's machine client, which makes the API.");

  let management: Management;
  let apiId: string;

  test.beforeAll(async () => {
    management = await Management.connect();
    apiId = await management.createApi();
  });

  test.afterAll(async () => {
    await management?.deleteApi(apiId);
    await management?.dispose();
  });

  test("the tab opens, and a model whose syntax is wrong never leaves the dashboard", async ({ page }) => {
    const errors = watchForErrors(page);

    await page.goto(`apis/${apiId}/authorization`);

    await expect(
      page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Authorization" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("navigation", { name: "Authorization" }).getByRole("link", { name: "Model" }),
    ).toHaveAttribute("aria-current", "page");
    const model = page.getByRole("textbox", { name: "Model" });
    await expect(model).toHaveValue(/type user/);

    await model.fill("model\n  schema 1.1\ntype user\ntype document\n  relations\n    define viewer: [user");
    await page.getByRole("button", { name: "Save and turn on" }).click();

    await expect(page.getByText(/^Line 6, column \d+:/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a tab the engine has nothing for says why", async ({ page }) => {
    test.skip(ENGINE, "With an engine, the next test turns authorization on.");
    const errors = watchForErrors(page);

    await page.goto(`apis/${apiId}/authorization/versions`);

    await expect(page.getByText("No store yet")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("turned on, it keeps versions and answers a decision", async ({ page }) => {
    test.skip(!ENGINE, "E2E_FGA=1 says the stack runs OpenFGA.");
    const errors = watchForErrors(page);

    await page.goto(`apis/${apiId}/authorization`);
    await page.getByRole("textbox", { name: "Model" }).fill(MODEL);
    await page.getByRole("button", { name: "Save and turn on" }).click();
    await expect(page.getByText("On", { exact: true })).toBeVisible();

    await page.getByRole("navigation", { name: "Authorization" }).getByRole("link", { name: "Versions" }).click();
    await expect(page.getByText("In force")).toBeVisible();

    await page.getByRole("navigation", { name: "Authorization" }).getByRole("link", { name: "Try a decision" }).click();
    await page.getByRole("textbox", { name: "Who" }).fill("00000000-0000-4000-8000-000000000000");
    await page.getByRole("textbox", { name: "Resource" }).fill("q3-report");
    await page.getByRole("button", { name: "Ask" }).click();
    // A person Clavia does not know is refused before the engine is asked.
    await expect(page.getByText("Denied")).toBeVisible();
    await expect(page.getByText(/Clavia does not know this person/)).toBeVisible();

    await page.goto(`apis/${apiId}/authorization`);
    await page.getByRole("button", { name: "Delete store" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete store" }).click();
    await expect(page.getByText("Off", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
