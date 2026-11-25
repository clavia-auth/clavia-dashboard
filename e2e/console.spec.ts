import { expect, test } from "@playwright/test";

import { EMAIL, signIn, watchForErrors } from "./support";

const SECTIONS = [
  { path: "users", heading: "Users" },
  { path: "applications", heading: "Applications" },
  { path: "apis", heading: "APIs" },
  { path: "roles", heading: "Roles" },
  { path: "connections", heading: "Connections" },
  { path: "initial-access-tokens", heading: "Initial access tokens" },
  { path: "signing-keys", heading: "Signing keys" },
  { path: "audit", heading: "Audit log" },
  { path: "webhooks", heading: "Webhooks" },
  { path: "endpoints", heading: "Endpoints" },
];

for (const { path, heading } of SECTIONS) {
  test(`${heading} opens without an error`, async ({ page }) => {
    const errors = watchForErrors(page);

    await page.goto(path);

    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: heading }),
    ).toHaveAttribute("aria-current", "page");
    expect(errors).toEqual([]);
  });
}

test("the operator finds themselves among the users", async ({ page }) => {
  await page.goto("users");
  await page.getByRole("searchbox").fill(EMAIL);
  await expect(page).toHaveURL(/[?&]q=/);

  await page.getByRole("link", { name: EMAIL }).click();

  await expect(page).toHaveURL(/\/users\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(EMAIL);
});

test("a password pool offers provisioning tokens", async ({ page }) => {
  const errors = watchForErrors(page);

  await page.goto("connections/password");

  await expect(page.getByText("Provisioning", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Issue token" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the audit log exports as CSV", async ({ page }) => {
  const response = await page.request.get("audit/export?outcome=success");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["content-disposition"]).toContain("audit-log-");
  expect((await response.text()).replace("\uFEFF", "")).toMatch(/^id,occurred_at,type,outcome,/);
});

test("the overview charts the week's sign-ins", async ({ page }) => {
  const errors = watchForErrors(page);

  await page.goto("./");

  await expect(page.getByText("Sign-in activity", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Sign-ins and refused sign-ins by day" })).toBeAttached();
  expect(errors).toEqual([]);
});

test("the command menu jumps to a section", async ({ page }) => {
  await page.goto("./");
  await page.keyboard.press("ControlOrMeta+k");

  await page
    .getByRole("dialog")
    .getByRole("option", { name: /Audit log/ })
    .click();

  await expect(page).toHaveURL(/\/dashboard\/audit$/);
});

test("an unknown page says so", async ({ page }) => {
  await page.goto("users/no-such-user");

  await expect(page.getByText("Not found", { exact: true })).toBeVisible();
});

test.describe("signing out", () => {
  // A fresh session, so signing out does not end the one the other tests share.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ends the session at Clavia too", async ({ page }) => {
    await signIn(page);

    // The account menu is named after the operator it belongs to.
    await page.getByRole("button", { name: EMAIL }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/dashboard\/signed-out/);
    await page.goto("users");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
