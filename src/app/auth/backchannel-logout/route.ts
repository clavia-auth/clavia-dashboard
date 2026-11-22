import { type NextRequest, NextResponse } from "next/server";

import { authentication } from "@/server/container";

/**
 * OpenID Connect Back-Channel Logout 1.0: Clavia posts a logout token here when a session
 * the dashboard signed in through ends anywhere — the operator signing out at Clavia, an
 * administrator ending their sessions, their account deactivated. The dashboard sessions
 * it names end at once. Answered as §2.8 says: 200 on success, 400 for a token that does
 * not verify, never cached.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const headers = { "Cache-Control": "no-store" };
  const form = await request.formData().catch(() => null);
  const token = form?.get("logout_token");
  if (typeof token !== "string" || token === "") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }

  if (!(await authentication().backChannelLogout(token))) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }

  return new NextResponse(null, { status: 200, headers });
}
