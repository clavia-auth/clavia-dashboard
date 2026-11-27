import { expect, type Page, test } from "@playwright/test";

import { Management, SEED } from "./clavia";

type Scim = { status: number; contentType: string; body: Record<string, unknown> | null };

/**
 * One call as a directory makes it: the base URL and token the dashboard showed, as a bearer. It goes out
 * from the page, which is on the same origin as Clavia's SCIM endpoint (the `management.` host), so a
 * browser lets it through without CORS and the stack's names resolve as they do for the page.
 */
async function scim(page: Page, call: { method: string; url: string; token: string; body?: object }): Promise<Scim> {
  return page.evaluate(async ({ method, url, token, body }) => {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/scim+json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();

    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body: text === "" ? null : (JSON.parse(text) as Record<string, unknown>),
    };
  }, call);
}

// A directory (Entra ID, Okta) creates, updates and removes a connection's accounts through SCIM 2.0 with a
// token the operator issues from the connection's page. The token and the base URL are shown once; a revoked
// token stops the directory at once, and the accounts it provisioned stay.
test.describe("provisioning", () => {
  test("a directory provisions an account with the token the dashboard issues, until it is revoked", async ({
    page,
  }) => {
    const run = Math.random().toString(36).slice(2, 10);
    const description = `e2e directory ${run}`;
    const email = `e2e-scim-${run}@clavia.test`;
    let userId: string | undefined;

    try {
      // The operator issues a token for the password pool.
      await page.goto("connections/password");
      await page.getByRole("button", { name: "Issue token" }).click();
      await page.getByLabel("Description").fill(description);
      await page.getByRole("dialog").getByRole("button", { name: "Issue token" }).click();

      // The base URL and the token, once.
      const shown = page.getByRole("dialog", { name: "Copy the token and the base URL now" });
      await expect(shown).toBeVisible();
      const [baseUrl, token] = await shown.locator("code").allInnerTexts();
      expect(baseUrl).toMatch(/\/scim\/v2$/);
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      await shown.getByRole("button", { name: "I have copied it" }).click();
      await expect(page.getByRole("row", { name: new RegExp(description) })).toContainText("Active");

      // The directory creates an account.
      const created = await scim(page, {
        method: "POST",
        url: `${baseUrl}/Users`,
        token,
        body: {
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: email,
          emails: [{ value: email, primary: true, type: "work" }],
          name: { givenName: "Directory", familyName: run },
          active: true,
        },
      });
      expect(created.status).toBe(201);
      expect(created.contentType).toContain("application/scim+json");
      expect(created.body).toMatchObject({ userName: email });
      userId = String(created.body?.id);

      // The account is among the users, where the operator sees it.
      await page.goto(`users?q=${encodeURIComponent(email)}`);
      await expect(page.getByRole("link", { name: email })).toBeVisible();

      // The operator revokes the token: the directory is refused at once, and the account stays.
      await page.goto("connections/password");
      await page.getByRole("button", { name: `Revoke ${description}` }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Revoke token" }).click();
      await expect(page.getByRole("row", { name: new RegExp(description) })).toContainText("Revoked");

      const refused = await scim(page, { method: "GET", url: `${baseUrl}/Users/${userId}`, token });
      expect(refused.status).toBe(401);
      await page.goto(`users?q=${encodeURIComponent(email)}`);
      await expect(page.getByRole("link", { name: email })).toBeVisible();
    } finally {
      // The account stays after the token is revoked, so the test removes it, as the stack is shared.
      if (userId !== undefined && SEED) {
        const management = await Management.connect();
        await management.deleteUser(userId).catch(() => undefined);
        await management.dispose();
      }
    }
  });
});
