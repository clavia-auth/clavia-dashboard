import { expect, type Page } from "@playwright/test";

import { answer, remember } from "./second-factor";
import { totp } from "./totp";

export const EMAIL = process.env.E2E_EMAIL ?? "dev@clavia.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "devpassword";

/**
 * Goes to the dashboard, signs in on Clavia's login page, and takes what Clavia asks next: its consent, a
 * second factor to set up (the first time) or to answer (every time after), until the dashboard is open.
 */
export async function signIn(page: Page, path = "./"): Promise<void> {
  await page.goto(path);
  await expect(page).toHaveURL(/\/auth\/login/);

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  // Not just "Sign in": the page has a "Sign in with a passkey" button too.
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  for (let step = 0; step < 5; step++) {
    await page.waitForURL((url) => /^\/(dashboard(\/|$)|auth\/(consent|mfa))/.test(url.pathname));
    const { pathname } = new URL(page.url());
    if (pathname.startsWith("/dashboard")) return;

    if (pathname.startsWith("/auth/consent")) {
      await page.getByRole("button", { name: /^(allow|accept)$/i }).click();
    } else if (pathname.startsWith("/auth/mfa/enroll")) {
      await enrol(page);
    } else {
      await page.getByRole("textbox", { name: "Code" }).fill(answer());
      await page.getByRole("button", { name: "Continue" }).click();
    }
  }

  throw new Error(`Still on ${page.url()} after five steps of signing in.`);
}

/** Sets up an authenticator app, and keeps its key and the recovery codes Clavia shows once. */
async function enrol(page: Page): Promise<void> {
  const start = page.getByRole("button", { name: "Set up an authenticator app" });
  if (await start.isVisible()) {
    await start.click();
  }

  const secret = (await page.getByText(/^[A-Z2-7]{16,}$/).innerText()).trim();
  await page.getByRole("textbox").fill(totp(secret));
  await page.getByRole("button", { name: "Turn on" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Two-factor authentication is on" })).toBeVisible();
  const recoveryCodes = await page.getByRole("listitem").allInnerTexts();
  remember({ secret, recoveryCodes: recoveryCodes.map((code) => code.trim()) });
  await page.getByRole("button", { name: "Continue" }).click();
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
