import { describe, expect, it } from "vitest";

import { ClaviaManagementApi } from "@/adapters/management-api/clavia-management-api";
import { ManagementError } from "@/core/management/errors";

/** A fetch that records each request and answers from the script. */
function server(answer: (request: Request) => Response) {
  const requests: Request[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.clone());

    return answer(request);
  }) as typeof fetch;

  return { requests, api: new ClaviaManagementApi("https://management.clavia.test", "the-token", fetcher) };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const PAGE = { items: [], total: 0, page: 1, per_page: 25 };

describe("ClaviaManagementApi", () => {
  it("calls the API with the operator's token, as JSON", async () => {
    const { requests, api } = server(() => json(PAGE));

    await api.users.list();

    expect(requests[0]?.url).toBe("https://management.clavia.test/api/v1/users");
    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer the-token");
    expect(requests[0]?.headers.get("Accept")).toBe("application/json");
  });

  it("pages and searches as the contract names it, and leaves out an empty search", async () => {
    const { requests, api } = server(() => json(PAGE));

    await api.users.list({ page: 3, perPage: 25, search: "  ada " });
    await api.clients.list({ search: "   " });

    expect(new URL(requests[0]!.url).search).toBe("?page=3&per_page=25&q=ada");
    expect(new URL(requests[1]!.url).search).toBe("");
  });

  it("filters the audit trail with every parameter the contract defines", async () => {
    const { requests, api } = server(() => json(PAGE));

    await api.auditEvents.list({
      page: 2,
      perPage: 50,
      types: ["authentication.failed", "session.ended"],
      actorUserId: "u-1",
      clientId: "spa",
      target: { type: "user", id: "u-2" },
      outcome: "failure",
      since: new Date("2026-01-01T00:00:00Z"),
      until: new Date("2026-01-02T00:00:00Z"),
    });

    expect(Object.fromEntries(new URL(requests[0]!.url).searchParams)).toEqual({
      page: "2",
      per_page: "50",
      type: "authentication.failed,session.ended",
      actor_user_id: "u-1",
      client_id: "spa",
      target_type: "user",
      target_id: "u-2",
      outcome: "failure",
      since: "2026-01-01T00:00:00.000Z",
      until: "2026-01-02T00:00:00.000Z",
    });
  });

  it("encodes path parameters and sends bodies as JSON", async () => {
    const { requests, api } = server(() => json([]));

    await api.users.replaceRoles("u/1", ["rol_a", "rol_b"]);

    expect(requests[0]?.url).toBe("https://management.clavia.test/api/v1/users/u%2F1/roles");
    expect(requests[0]?.method).toBe("PUT");
    expect(await requests[0]?.json()).toEqual({ role_ids: ["rol_a", "rol_b"] });
  });

  it("takes a 204 as done", async () => {
    const { api } = server(() => new Response(null, { status: 204 }));

    await expect(api.users.delete("u-1")).resolves.toBeUndefined();
  });

  it("turns a refusal into a ManagementError", async () => {
    const { api } = server(() =>
      json({ type: "about:blank", title: "Conflict", status: 409, detail: "That address is taken." }, 409),
    );

    await expect(
      api.users.create({ email: "a@b.c", password: "x".repeat(8), email_verified: false, is_active: true }),
    ).rejects.toMatchObject({
      kind: "conflict",
      message: "That address is taken.",
    });
  });

  it("asks Clavia to mail a user a password link and says which mail went out", async () => {
    const { requests, api } = server(() => json({ kind: "invitation" }, 202));

    const sent = await api.users.sendPasswordLink("u-1");

    expect(sent).toEqual({ kind: "invitation" });
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://management.clavia.test/api/v1/users/u-1/password-reset");
  });

  it.each([
    [409, "conflict"],
    [429, "rate_limited"],
    [503, "service_unavailable"],
  ] as const)("tells a refused password link (%i) from a failure", async (status, kind) => {
    const { api } = server(() => json({ type: "about:blank", title: "x", status, detail: "Deactivated." }, status));

    const failure = await api.users.sendPasswordLink("u-1").catch((error: unknown) => error);

    expect(failure).toMatchObject({ kind });
  });

  it("lists an account's passkeys and removes one, by the identifiers the contract names", async () => {
    const passkey = {
      id: "0f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f",
      name: "Laptop",
      synced: true,
      backed_up: true,
      aaguid: null,
      created_at: "2026-01-01T00:00:00Z",
      last_used_at: null,
    };
    const { requests, api } = server((request) =>
      request.method === "DELETE" ? new Response(null, { status: 204 }) : json([passkey]),
    );

    const passkeys = await api.users.passkeys("u-1");
    await api.users.removePasskey("u-1", passkey.id);

    expect(passkeys).toEqual([passkey]);
    expect(requests[0]?.url).toBe("https://management.clavia.test/api/v1/users/u-1/passkeys");
    expect(requests[1]?.method).toBe("DELETE");
    expect(requests[1]?.url).toBe(`https://management.clavia.test/api/v1/users/u-1/passkeys/${passkey.id}`);
  });

  it("says a passkey that is not the account's was not found", async () => {
    const { api } = server(() =>
      json({ type: "about:blank", title: "Not found", status: 404, detail: "No passkey." }, 404),
    );

    const failure = await api.users.removePasskey("u-1", "other").catch((error: unknown) => error);

    expect(failure).toMatchObject({ kind: "not_found" });
  });

  it("says the API is unavailable when it cannot be reached", async () => {
    const api = new ClaviaManagementApi("https://management.clavia.test", "t", (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch);

    const failure = await api.roles.list().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ManagementError);
    expect(failure).toMatchObject({ kind: "unavailable" });
  });
});
