import { type NextRequest, NextResponse } from "next/server";

import { isSignInRefused } from "@/core/auth/ports";
import { config } from "@/server/config";
import { authentication } from "@/server/container";
import { expired, SESSION_COOKIE, SIGN_IN_COOKIE, sessionCookie } from "@/server/cookies";

/**
 * Where Clavia sends the browser back. The attempt is checked against the one this browser
 * started, the code redeemed server-side, and the browser handed a session cookie — the
 * tokens stay here.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const settings = config();
  // Rebuilt on the public URL: what Clavia redirected to, whatever the proxy in front says.
  const callback = new URL(`${settings.dashboardUrl}/auth/callback${request.nextUrl.search}`);

  let response: NextResponse;
  try {
    const { handle, returnTo } = await authentication().completeSignIn(
      callback,
      request.cookies.get(SIGN_IN_COOKIE)?.value,
    );
    response = NextResponse.redirect(`${settings.dashboardUrl}${returnTo === "/" ? "" : returnTo}`, 303);
    response.cookies.set(sessionCookie(handle, settings.sessionLifetime));
  } catch (error) {
    if (!isSignInRefused(error)) {
      throw error;
    }
    console.warn(`Sign-in refused (${error.reason}): ${error.message}`);
    response = NextResponse.redirect(`${settings.dashboardUrl}/signed-out?reason=${error.reason}`, 303);
    response.cookies.set(expired(SESSION_COOKIE));
  }
  response.cookies.set(expired(SIGN_IN_COOKIE));
  response.headers.set("Cache-Control", "no-store");

  return response;
}
