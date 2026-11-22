import "server-only";

import { cache } from "react";

import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

/** The API a page is about, read once per request by the layout and its tab. */
export const apiById = cache(async (apiId: string) => {
  const { api } = await signedIn();

  return find(api.resourceServers.get(apiId));
});
