import "server-only";

import { cache } from "react";

import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

/** The role a page is about, read once per request by the layout and its tab. */
export const roleById = cache(async (roleId: string) => {
  const { api } = await signedIn();

  return find(api.roles.get(roleId));
});
