import { type NextRequest, NextResponse } from "next/server";

import { SIGN_IN_ATTEMPT_LIFETIME } from "@/core/auth/authentication";
import { authentication } from "@/server/container";
import { signInCookie } from "@/server/cookies";

/**
 * Start signing in: a new attempt (state, nonce, PKCE verifier) kept server-side, its
 * state bound to this browser by a cookie, and the browser sent to Clavia. `acr_values`
 * is a step-up: the level the Management API asked for (RFC 9470).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const { authorizationUrl, state } = await authentication().beginSignIn(
    searchParams.get("return_to"),
    searchParams.get("acr_values"),
  );

  const response = NextResponse.redirect(authorizationUrl, 303);
  response.cookies.set(signInCookie(state, SIGN_IN_ATTEMPT_LIFETIME));
  response.headers.set("Cache-Control", "no-store");

  return response;
}
