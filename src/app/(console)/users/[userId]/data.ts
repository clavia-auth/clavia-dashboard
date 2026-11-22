import "server-only";

import { cache } from "react";

import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

/** The account a user page is about, read once per request by the layout and its tab. */
export const userById = cache(async (userId: string) => {
  const { api } = await signedIn();

  return find(api.users.get(userId));
});
