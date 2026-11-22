import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/server/cookies";

/** Pages a browser without a session may open: signing in and out, and the signed-out page. */
const PUBLIC = [/^\/auth\//, /^\/signed-out$/];

/**
 * Every dashboard response gets a Content-Security-Policy with a fresh nonce, which Next.js
 * puts on the scripts it renders — no other script runs. Form posts may leave for Clavia
 * only: signing out ends in a redirect to its logout endpoint, and Chromium checks
 * `form-action` along a form's whole redirect chain.
 *
 * A browser with no session cookie at all is sent to sign in straight away. That is only
 * a shortcut: whether a session is good is decided by the Data Access Layer
 * (`src/server/operator.ts`) on every request, not here.
 */
export function proxy(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC.some((pattern) => pattern.test(path));

  if (!isPublic && !request.cookies.has(SESSION_COOKIE) && request.method === "GET") {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/auth/sign-in";
    signIn.search = "";
    if (path !== "/") {
      signIn.searchParams.set("return_to", path + request.nextUrl.search);
    }

    return NextResponse.redirect(signIn);
  }

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const forwarded = new Headers(request.headers);
  forwarded.set("x-nonce", nonce);
  forwarded.set("x-dashboard-path", path + request.nextUrl.search);
  forwarded.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: forwarded } });
  response.headers.set("Content-Security-Policy", policy);

  return response;
}

function contentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === "development";
  const issuer = process.env.CLAVIA_ISSUER === undefined ? "" : ` ${new URL(process.env.CLAVIA_ISSUER).origin}`;

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // Radix positions popovers with inline styles, and sonner injects its stylesheet.
    "style-src 'self' 'unsafe-inline'",
    // Profile pictures come from wherever a provider hosts them.
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    `form-action 'self'${issuer}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join("; ");
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|clavia-icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
