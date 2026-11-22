import { describe, expect, it } from "vitest";

import { managementError } from "@/adapters/management-api/problems";

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

describe("managementError", () => {
  it("reads a refused request's problem document, field by field", () => {
    const error = managementError(response(422), {
      type: "about:blank",
      title: "Unprocessable Content",
      status: 422,
      detail: "The request was refused.",
      errors: [
        { pointer: "/email", detail: "Not an email address." },
        { parameter: "page", detail: "Must be at least 1." },
      ],
    });

    expect(error.kind).toBe("invalid");
    expect(error.message).toBe("The request was refused.");
    expect(error.fieldProblem("/email")).toBe("Not an email address.");
    expect(error.fields[1]).toEqual({ pointer: null, parameter: "page", detail: "Must be at least 1." });
  });

  it("names the scope an insufficient_scope challenge asks for", () => {
    const error = managementError(
      response(403, { "WWW-Authenticate": 'Bearer realm="x", error="insufficient_scope", scope="delete:users"' }),
      { error: "insufficient_scope" },
    );

    expect(error.kind).toBe("forbidden");
    expect(error.scope).toBe("delete:users");
  });

  it.each([
    [401, "unauthenticated"],
    [404, "not_found"],
    [409, "conflict"],
    [400, "invalid"],
    [415, "invalid"],
    [429, "rate_limited"],
    [503, "service_unavailable"],
    [500, "unavailable"],
    [502, "unavailable"],
  ] as const)("turns %i into %s", (status, kind) => {
    expect(managementError(response(status), { detail: "x" }).kind).toBe(kind);
  });

  it("does not repeat a server error's body to the operator", () => {
    expect(managementError(response(500), { detail: "SQLSTATE[...] stack trace" }).message).toBe(
      "The Management API answered 500.",
    );
  });
});
