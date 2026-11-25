import "server-only";

import { cache } from "react";

import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

/** The webhook a page is about, read once per request by the layout and its tab. */
export const webhookById = cache(async (webhookId: string) => {
  const { api } = await signedIn();

  return find(api.webhooks.get(webhookId));
});
