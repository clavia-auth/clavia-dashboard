import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { Operator } from "@/core/auth/operator";
import type { DashboardSession } from "@/core/auth/session";
import type { ManagementApi } from "@/core/management/management-api";

import { authentication, managementApiFor } from "./container";
import { SESSION_COOKIE } from "./cookies";

/**
 * The Data Access Layer: the one way a page or an action learns who is signed in and
 * reaches the Management API on their behalf. Read once per request (React `cache`),
 * re-checked by every server action, never trusted from the client.
 */
const currentSession = cache(async (): Promise<DashboardSession | null> => {
  const handle = (await cookies()).get(SESSION_COOKIE)?.value;

  return authentication().session(handle);
});

export type SignedIn = Readonly<{ operator: Operator; api: ManagementApi }>;

/** The signed-in operator and their API — or, for a browser with no session, the sign-in. */
export const signedIn = cache(async (): Promise<SignedIn> => {
  const session = await currentSession();
  if (session === null) {
    redirect(signInPath((await headers()).get("x-dashboard-path")));
  }

  return { operator: Operator.of(session), api: managementApiFor(session.tokens.accessToken) };
});

/** The sign-in route, coming back to `returnTo` (a path inside the dashboard) afterwards. */
export function signInPath(returnTo: string | null): "/auth/sign-in" {
  const query = returnTo === null || returnTo === "/" ? "" : `?return_to=${encodeURIComponent(returnTo)}`;

  return `/auth/sign-in${query}` as "/auth/sign-in";
}
