import { NextResponse } from "next/server";

import { isManagementError } from "@/core/management/errors";
import { signedIn } from "@/server/operator";

/**
 * The application's logo, for the Branding tab's preview: read from the Management API on this server
 * with the operator's token, never by the browser. Sent as the image it is, `nosniff`, under a policy that
 * allows nothing, so it is only ever an image. The page names it by its version (`?v=`), so a new logo is
 * a new address.
 */
export async function GET(_: Request, { params }: { params: Promise<{ clientId: string }> }): Promise<Response> {
  const { api, operator } = await signedIn();
  if (!operator.can("read:clients")) {
    return new NextResponse(null, { status: 403 });
  }
  const { clientId } = await params;
  try {
    const logo = await api.clients.logo(clientId);

    return new Response(logo.bytes, {
      headers: {
        "Content-Type": logo.type,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (isManagementError(error, "not_found") || isManagementError(error, "invalid")) {
      return new NextResponse(null, { status: 404 });
    }
    throw error;
  }
}
