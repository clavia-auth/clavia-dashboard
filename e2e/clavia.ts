import { readFileSync } from "node:fs";

import { type APIRequestContext, request } from "@playwright/test";

import type { Operator } from "./support";

/** The origin of the dashboard, which is also Clavia's `management.` host. */
const MANAGEMENT = new URL(process.env.E2E_DASHBOARD_URL ?? "https://management.clavia.test/dashboard").origin;
const AUTH = process.env.E2E_CLAVIA_AUTH ?? MANAGEMENT.replace("//management.", "//auth.");

/** The file `seed-dev` wrote what it printed to: clavia's `test/e2e/up.sh` leaves it in `.work/seed.txt`. */
export const SEED = process.env.E2E_CLAVIA_SEED;

/**
 * Clavia's Management API, as the machine client `seed-dev` made calls it: for what a test must arrange or
 * undo without a screen (an operator of its own, a session ended from elsewhere). What the test is about
 * still goes through the dashboard.
 */
export class Management {
  private constructor(
    private readonly http: APIRequestContext,
    private readonly token: string,
  ) {}

  static async connect(): Promise<Management> {
    if (!SEED) throw new Error("E2E_CLAVIA_SEED names the file `seed-dev` printed to, for the machine client.");
    const credentials = /-u '([^']+)'/.exec(readFileSync(SEED, "utf8"))?.[1];
    if (!credentials) throw new Error(`No machine client in ${SEED}.`);

    const http = await request.newContext({ ignoreHTTPSErrors: true });
    const response = await http.post(`${AUTH}/oauth2/token`, {
      headers: { Authorization: `Basic ${Buffer.from(credentials).toString("base64")}` },
      form: { grant_type: "client_credentials", audience: `${MANAGEMENT}/api/v1/` },
    });
    if (!response.ok()) throw new Error(`The machine client got ${response.status()}: ${await response.text()}`);
    const { access_token: token } = (await response.json()) as { access_token: string };

    return new Management(http, token);
  }

  /** An operator of their own, with every permission, under a name no other test uses. */
  async createOperator(): Promise<Operator & { id: string }> {
    const email = `e2e-${Math.random().toString(36).slice(2, 10)}@clavia.test`;
    const password = `pw-${Math.random().toString(36).slice(2, 18)}`;
    const { id } = await this.call<{ id: string }>("POST", "/users", {
      email,
      password,
      email_verified: true,
    });
    const roles = await this.call<{ items: { id: string; name: string }[] }>("GET", "/roles?per_page=100");
    const administrator = roles.items.find((role) => role.name === "Administrator");
    if (!administrator) throw new Error("There is no Administrator role: was the stack seeded?");
    await this.call("POST", `/roles/${administrator.id}/users`, { user_ids: [id] });

    return { id, email, password };
  }

  /**
   * Whether signing in to the Management API, which is to say to the dashboard, takes a second factor. It is
   * `required` in a stack as `seed-dev` leaves it, and it is for everyone: a test that changes it puts it back,
   * and runs when no other test does.
   */
  async setMfaPolicy(policy: "optional" | "required"): Promise<void> {
    const servers = await this.call<{ items: { id: string; identifier: string }[] }>(
      "GET",
      "/resource-servers?per_page=100",
    );
    const api = servers.items.find((server) => server.identifier === `${MANAGEMENT}/api/v1/`);
    if (!api) throw new Error("Clavia does not list the Management API among its APIs.");
    await this.call("PATCH", `/resource-servers/${api.id}`, { mfa_policy: policy });
  }

  /** Signs a person out of Clavia everywhere, and has it tell the applications they signed in to. */
  async endSessions(userId: string): Promise<void> {
    await this.call("DELETE", `/users/${userId}/sessions`);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.call("DELETE", `/users/${userId}`);
  }

  async dispose(): Promise<void> {
    await this.http.dispose();
  }

  private async call<T = undefined>(method: string, path: string, body?: object): Promise<T> {
    const response = await this.http.fetch(`${MANAGEMENT}/api/v1${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}` },
      ...(body === undefined ? {} : { data: body }),
    });
    if (!response.ok()) throw new Error(`${method} ${path}: ${response.status()} ${await response.text()}`);

    return (response.status() === 204 ? undefined : await response.json()) as T;
  }
}
