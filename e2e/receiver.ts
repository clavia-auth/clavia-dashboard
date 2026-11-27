import { expect } from "@playwright/test";
import { request } from "@playwright/test";

/**
 * Where the stack's webhook receiver is read from, on this machine (clavia's `test/e2e/receiver.mjs`, started by
 * `CLAVIA_E2E_RECEIVER=1`), and the address Clavia delivers to inside the stack.
 */
export const RECEIVER = process.env.E2E_RECEIVER_URL;
export const DELIVERY_URL = process.env.E2E_RECEIVER_DELIVERY_URL ?? "https://receiver.clavia.test";

/** One request the receiver kept: headers and body exactly as they arrived. */
export type Delivery = {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  receivedAt: string;
};

/** What arrived at `path`, oldest first. */
export async function deliveriesTo(path: string): Promise<Delivery[]> {
  if (!RECEIVER) throw new Error("E2E_RECEIVER_URL names the webhook receiver of the stack.");
  const http = await request.newContext();
  try {
    const response = await http.get(`${RECEIVER}/deliveries`);
    expect(response.ok()).toBe(true);

    return ((await response.json()) as Delivery[]).filter((delivery) => delivery.path === path);
  } finally {
    await http.dispose();
  }
}

/**
 * The deliveries to `path` once there are `count` of them: Clavia sends after its answer, in a worker, so what
 * a scenario provoked arrives a moment later.
 */
export async function waitForDeliveries(path: string, count: number): Promise<Delivery[]> {
  let found: Delivery[] = [];
  await expect(async () => {
    found = await deliveriesTo(path);
    expect(found.length).toBeGreaterThanOrEqual(count);
  }).toPass({ timeout: 30_000 });

  return found;
}
