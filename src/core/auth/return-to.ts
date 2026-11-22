/**
 * Where a browser may be sent after signing in: a path inside the dashboard, never an
 * absolute or protocol-relative URL (`//evil.example`), nor anything a browser would read
 * as one (`/\evil.example`, a control character). Anything else is the overview.
 */
export const DEFAULT_RETURN_TO = "/";

export function safeReturnTo(candidate: string | null | undefined): string {
  if (candidate === null || candidate === undefined || candidate.length > 2048) {
    return DEFAULT_RETURN_TO;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return DEFAULT_RETURN_TO;
  }
  if (/[\u0000-\u001f\u007f\\]/.test(candidate)) {
    return DEFAULT_RETURN_TO;
  }
  // Resolved against a placeholder origin, a path that stays on it is a path.
  const resolved = new URL(candidate, "https://dashboard.invalid");
  if (resolved.origin !== "https://dashboard.invalid") {
    return DEFAULT_RETURN_TO;
  }

  return resolved.pathname + resolved.search;
}
