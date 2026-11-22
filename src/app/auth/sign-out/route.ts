import { type NextRequest, NextResponse } from "next/server";

import { config } from "@/server/config";
import { authentication } from "@/server/container";
import { expired, SESSION_COOKIE } from "@/server/cookies";

/**
 * Sign out — a POST from the dashboard's own pages only. The session ends here, its
 * refresh token is given back to Clavia, and the browser goes on to Clavia's logout
 * endpoint (RP-Initiated Logout) so the session there ends too, then back to the
 * signed-out page.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const settings = config();
  const origin = new URL(settings.dashboardUrl).origin;
  if (request.headers.get("Origin") !== origin) {
    return new NextResponse(null, { status: 403 });
  }

  const endSession = await authentication().signOut(
    request.cookies.get(SESSION_COOKIE)?.value,
    `${settings.dashboardUrl}/signed-out`,
  );

  const response = NextResponse.redirect(endSession ?? `${settings.dashboardUrl}/signed-out`, 303);
  response.cookies.set(expired(SESSION_COOKIE));
  response.headers.set("Cache-Control", "no-store");

  return response;
}
