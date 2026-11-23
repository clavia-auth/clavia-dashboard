import { type FieldProblem, ManagementError } from "@/core/management/errors";

/**
 * Clavia's refusal, as a {@link ManagementError}: RFC 9457 problems for a request it
 * refused, RFC 6750 bearer errors (body and `WWW-Authenticate`) for the token.
 */
export function managementError(response: Response, body: unknown): ManagementError {
  const problem = isRecord(body) ? body : {};
  const detail =
    typeof problem.detail === "string"
      ? problem.detail
      : typeof problem.error_description === "string"
        ? problem.error_description
        : response.statusText || `The Management API answered ${response.status}.`;

  switch (response.status) {
    case 401: {
      const challenge = response.headers.get("WWW-Authenticate");
      if (challengeError(challenge) === "insufficient_user_authentication") {
        return new ManagementError(
          "step_up_required",
          "The Management API asks for a second factor. Sign in again to give one.",
          [],
          null,
          challengeParameter(challenge, "acr_values"),
        );
      }

      return new ManagementError("unauthenticated", "Your session at Clavia has ended. Sign in again.");
    }
    case 403:
      return new ManagementError(
        "forbidden",
        "Your roles do not allow this.",
        [],
        scopeOf(response.headers.get("WWW-Authenticate")),
      );
    case 404:
      return new ManagementError("not_found", detail);
    case 409:
      return new ManagementError("conflict", detail);
    case 400:
    case 415:
    case 422:
      return new ManagementError("invalid", detail, fieldsOf(problem.errors));
    case 429:
      return new ManagementError("rate_limited", "A sending limit is reached. Nothing was done; try again later.");
    case 503:
      return new ManagementError("service_unavailable", "Clavia cannot do this right now. Nothing was done.");
    default:
      return new ManagementError("unavailable", `The Management API answered ${response.status}.`);
  }
}

function fieldsOf(errors: unknown): FieldProblem[] {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.filter(isRecord).map((error) => ({
    pointer: typeof error.pointer === "string" ? error.pointer : null,
    parameter: typeof error.parameter === "string" ? error.parameter : null,
    detail: typeof error.detail === "string" ? error.detail : "Invalid.",
  }));
}

/** The scope an `insufficient_scope` challenge names (RFC 6750 §3). */
function scopeOf(challenge: string | null): string | null {
  return challengeParameter(challenge, "scope");
}

/** The `error` a Bearer challenge carries (RFC 6750 §3). */
function challengeError(challenge: string | null): string | null {
  return challengeParameter(challenge, "error");
}

/** One quoted auth-param of a challenge, such as `acr_values` (RFC 9470 §3). */
function challengeParameter(challenge: string | null, name: string): string | null {
  const value = challenge?.match(new RegExp(`(?:^|[\\s,])${name}="([^"]*)"`))?.[1];

  return value === undefined || value === "" ? null : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
