/**
 * What can go wrong calling the Management API, in terms a page can act on. The adapter
 * turns the HTTP answer (an RFC 9457 problem or an RFC 6750 bearer error) into one of
 * these; nothing above it reads a status code.
 */

/** One field the API refused, by JSON pointer into the request (`/email`) or by parameter. */
export type FieldProblem = Readonly<{ pointer: string | null; parameter: string | null; detail: string }>;

export type ManagementErrorKind =
  /** The token is gone or no longer accepted: the operator must sign in again. */
  | "unauthenticated"
  /** The operator's token lacks the scope this needs; `scope` names it. */
  | "forbidden"
  | "not_found"
  /** A uniqueness or state conflict (a duplicate address, a role in use). */
  | "conflict"
  /** The request was refused as invalid; `fields` says where. */
  | "invalid"
  /** A limit is reached (429): nothing was done, and trying again later may work. */
  | "rate_limited"
  /** The deployment cannot do this now (503): nothing was done. */
  | "service_unavailable"
  /** The API could not be reached, or answered with something it should not have. */
  | "unavailable";

export class ManagementError extends Error {
  override readonly name = "ManagementError";

  constructor(
    readonly kind: ManagementErrorKind,
    message: string,
    readonly fields: readonly FieldProblem[] = [],
    readonly scope: string | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  /** The problem for one request field, by its JSON pointer (`/email`), if the API named one. */
  fieldProblem(pointer: string): string | undefined {
    return this.fields.find((field) => field.pointer === pointer)?.detail;
  }
}

export function isManagementError(error: unknown, kind?: ManagementErrorKind): error is ManagementError {
  return error instanceof ManagementError && (kind === undefined || error.kind === kind);
}
