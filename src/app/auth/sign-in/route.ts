import { type NextRequest, NextResponse } from "next/server";

import { SIGN_IN_ATTEMPT_LIFETIME } from "@/core/auth/authentication";
import { isSignInRefused } from "@/core/auth/ports";
import { config } from "@/server/config";
import { authentication } from "@/server/container";
import { signInCookie } from "@/server/cookies";

/**
 * Start signing in: a new attempt (state, nonce, PKCE verifier) kept server-side, its
 * state bound to this browser by a cookie, and the browser sent to Clavia. `acr_values`
 * is a step-up: the level the Management API asked for (RFC 9470). When Clavia cannot be
 * reached, or answers wrongly, the browser is told so on the signed-out page.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  let response: NextResponse;
  try {
    const { authorizationUrl, state } = await authentication().beginSignIn(
      searchParams.get("return_to"),
      searchParams.get("acr_values"),
    );
    response = NextResponse.redirect(authorizationUrl, 303);
    response.cookies.set(signInCookie(state, SIGN_IN_ATTEMPT_LIFETIME));
  } catch (error) {
    if (!isSignInRefused(error)) {
      throw error;
    }
    console.warn(`Sign-in refused (${error.reason}): ${error.message}`);
    response = NextResponse.redirect(`${config().dashboardUrl}/signed-out?reason=${error.reason}`, 303);
  }
  response.headers.set("Cache-Control", "no-store");

  return response;
}
