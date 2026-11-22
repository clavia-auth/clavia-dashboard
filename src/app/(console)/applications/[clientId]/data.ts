import "server-only";

import { cache } from "react";

import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

/** The application a page is about, read once per request by the layout and its tab. */
export const applicationById = cache(async (clientId: string) => {
  const { api } = await signedIn();

  return find(api.clients.get(clientId));
});
