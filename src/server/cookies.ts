import "server-only";

/**
 * The dashboard's two cookies. Both are scoped to its path on `management.{domain}` —
 * the Management API on the same origin never sees them — and neither carries anything
 * but an opaque handle: the session's tokens are in the session store.
 */
export const SESSION_COOKIE = "clavia_dashboard_session";

/** Binds a sign-in in progress to the browser that started it (the OAuth 2.0 `state`). */
export const SIGN_IN_COOKIE = "clavia_dashboard_sign_in";

/** A cookie as `cookies().set()` and `NextResponse.cookies.set()` take it. */
export type DashboardCookie = Readonly<{
  name: string;
  value: string;
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: string;
  maxAge: number;
}>;

const base = { httpOnly: true, secure: true, sameSite: "lax" } as const;

export function sessionCookie(handle: string, maxAgeSeconds: number): DashboardCookie {
  return { ...base, name: SESSION_COOKIE, value: handle, path: "/dashboard", maxAge: maxAgeSeconds };
}

export function signInCookie(state: string, maxAgeSeconds: number): DashboardCookie {
  return { ...base, name: SIGN_IN_COOKIE, value: state, path: "/dashboard/auth", maxAge: maxAgeSeconds };
}

export function expired(name: typeof SESSION_COOKIE | typeof SIGN_IN_COOKIE): DashboardCookie {
  return {
    ...base,
    name,
    value: "",
    path: name === SESSION_COOKIE ? "/dashboard" : "/dashboard/auth",
    maxAge: 0,
  };
}
