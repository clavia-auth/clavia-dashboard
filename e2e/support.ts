import { expect, type Page } from "@playwright/test";

export const EMAIL = process.env.E2E_EMAIL ?? "dev@clavia.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "devpassword";

/** Goes to the dashboard, signs in on Clavia's login page and consents if Clavia asks. */
export async function signIn(page: Page, path = "./"): Promise<void> {
  await page.goto(path);
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  const consent = page.getByRole("button", { name: /^(allow|accept)$/i });
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard") || url.pathname.includes("consent"));
  if (await consent.isVisible()) {
    await consent.click();
  }

  await page.waitForURL(/\/dashboard(\/|$)/);
}

/** Collects what the browser reports as broken while a test runs. */
export function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  return errors;
}
