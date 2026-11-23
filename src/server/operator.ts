import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { Operator } from "@/core/auth/operator";
import type { DashboardSession } from "@/core/auth/session";
import type { ManagementError } from "@/core/management/errors";
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

export type SignedIn = Readonly<{
  operator: Operator;
  api: ManagementApi;
  /** When this dashboard session began, in milliseconds since the epoch. */
  signedInAt: number;
}>;

/** The signed-in operator and their API — or, for a browser with no session, the sign-in. */
export const signedIn = cache(async (): Promise<SignedIn> => {
  const session = await currentSession();
  if (session === null) {
    redirect(signInPath((await headers()).get("x-dashboard-path")));
  }

  return {
    operator: Operator.of(session),
    api: managementApiFor(session.tokens.accessToken),
    signedInAt: session.createdAt,
  };
});

/**
 * A session this young was itself the answer to the Management API's challenge, so asking
 * again would only go round in circles.
 */
const STEP_UP_GRACE = 60_000;

/**
 * The Management API refused the operator's token for a sign-in that fell short (RFC 9470
 * §3): send them to sign in again with the `acr_values` the challenge names, and back to the
 * page they were on. Clavia then asks for the missing factor only, not the password again.
 *
 * Returns, without redirecting, when there is nothing sensible to ask for: the challenge named
 * no level, or the session is too young to be one that fell short and a new sign-in would not
 * change the answer. The caller then shows the refusal.
 */
export async function stepUp(error: ManagementError): Promise<void> {
  if (error.acrValues === null) {
    return;
  }
  const { signedInAt } = await signedIn();
  if (Date.now() - signedInAt < STEP_UP_GRACE) {
    return;
  }

  redirect(signInPath((await headers()).get("x-dashboard-path"), error.acrValues));
}

/**
 * The sign-in route, coming back to `returnTo` (a path inside the dashboard) afterwards, and
 * asking for `acrValues` when a step-up is the reason.
 */
export function signInPath(returnTo: string | null, acrValues: string | null = null): "/auth/sign-in" {
  const query = new URLSearchParams();
  if (returnTo !== null && returnTo !== "/") {
    query.set("return_to", returnTo);
  }
  if (acrValues !== null) {
    query.set("acr_values", acrValues);
  }
  const search = query.size === 0 ? "" : `?${query.toString()}`;

  return `/auth/sign-in${search}` as "/auth/sign-in";
}
