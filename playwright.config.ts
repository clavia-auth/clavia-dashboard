import { defineConfig, devices } from "@playwright/test";

/**
 * The smoke suite runs against a dashboard already running behind Clavia, as `docker compose up`
 * and `npm run dev` leave it: it signs in through Clavia's real login page, so it needs the
 * development data `make seed` writes.
 *
 * E2E_DASHBOARD_URL   where the dashboard is served (default https://management.clavia.test/dashboard)
 * E2E_EMAIL           an operator who may use the dashboard (default dev@clavia.test)
 * E2E_PASSWORD        their password (default devpassword)
 */
const DASHBOARD_URL = process.env.E2E_DASHBOARD_URL ?? "https://management.clavia.test/dashboard";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // Playwright resolves "/users" against the origin; a trailing slash keeps the base path.
    baseURL: DASHBOARD_URL.replace(/\/?$/, "/"),
    // The local certificate is mkcert's, which Playwright's browsers do not trust.
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "sign-in", testMatch: /sign-in\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/operator.json" },
      dependencies: ["sign-in"],
    },
  ],
});
