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

  describe("signing keys", () => {
    const retired = {
      kid: "old",
      algorithm: "RS256",
      status: "retired",
      published: true,
      created_at: "2026-01-01T00:00:00Z",
      retired_at: "2026-02-01T00:00:00Z",
      published_until: "2026-03-01T00:00:00Z",
    };

    it("lists the keys the API names, never asking for more than the list", async () => {
      const { requests, api } = server(() => json([{ ...retired, kid: "new", status: "active" }, retired]));

      const keys = await api.signingKeys.list();

      expect(requests[0]?.method).toBe("GET");
      expect(requests[0]?.url).toBe("https://management.clavia.test/api/v1/signing-keys");
      expect(keys.map((key) => key.kid)).toEqual(["new", "old"]);
    });

    it("rotates with a POST and returns the new key beside the one it replaced", async () => {
      const { requests, api } = server(() => json({ active: { ...retired, kid: "new", status: "active" }, retired }));

      const rotation = await api.signingKeys.rotate();

      expect(requests[0]?.method).toBe("POST");
      expect(requests[0]?.url).toBe("https://management.clavia.test/api/v1/signing-keys/rotate");
      expect(rotation.active.kid).toBe("new");
      expect(rotation.retired?.kid).toBe("old");
    });

    it("says so when the keys live at another provider", async () => {
      const { api } = server(() =>
        json(
          { type: "about:blank", title: "Conflict", status: 409, detail: "The keys are kept by the provider." },
          409,
        ),
      );

      await expect(api.signingKeys.list()).rejects.toMatchObject({
        kind: "conflict",
        message: "The keys are kept by the provider.",
      });
    });
  });

  describe("DPoP on an application", () => {
    it("sends the requirement as the contract names it, and nothing else of the client", async () => {
      const { requests, api } = server(() => json({ client_id: "spa", dpop_bound_access_tokens: true }));

      const client = await api.clients.update("spa", { dpop_bound_access_tokens: true });

      expect(requests[0]?.method).toBe("PATCH");
      expect(requests[0]?.url).toBe("https://management.clavia.test/api/v1/clients/spa");
      expect(await requests[0]?.json()).toEqual({ dpop_bound_access_tokens: true });
      expect(client.dpop_bound_access_tokens).toBe(true);
    });

    it("lets Clavia refuse it where it cannot be honoured, and names the field", async () => {
      const { api } = server(() =>
        json(
          {
            title: "Unprocessable Content",
            status: 422,
            detail: "The request was refused.",
            errors: [
              { pointer: "/dpop_bound_access_tokens", detail: "A public client cannot be required to use DPoP." },
            ],
          },
          422,
        ),
      );

      await expect(api.clients.update("spa", { dpop_bound_access_tokens: true })).rejects.toMatchObject({
        kind: "invalid",
        fields: [{ pointer: "/dpop_bound_access_tokens" }],
      });
    });
  });

  describe("initial access tokens", () => {
    const token = {
      id: "0198f7a1-0000-7000-8000-000000000001",
      description: "Acme",
      created_at: "2026-11-23T10:00:00Z",
      expires_at: "2026-11-30T10:00:00Z",
      max_uses: 3,
      uses: 1,
      state: "active",
      revoked_at: null,
    };

    it("lists a page, searching the description", async () => {
      const { requests, api } = server(() => json({ items: [token], total: 1, page: 2, per_page: 25 }));

      const page = await api.initialAccessTokens.list({ page: 2, perPage: 25, search: " acme " });

      expect(new URL(requests[0]!.url).pathname).toBe("/api/v1/initial-access-tokens");
      expect(new URL(requests[0]!.url).search).toBe("?page=2&per_page=25&q=acme");
      expect(page.items[0]?.description).toBe("Acme");
    });

    it("issues a token with what was asked, and hands back its value", async () => {
      const { requests, api } = server(() => json({ ...token, token: "iat-secret" }, 201));

      const issued = await api.initialAccessTokens.issue({ description: "Acme", max_uses: 3, expires_in: 604800 });

      expect(requests[0]?.method).toBe("POST");
      expect(await requests[0]?.json()).toEqual({ description: "Acme", max_uses: 3, expires_in: 604800 });
      expect(issued.token).toBe("iat-secret");
    });

    it("revokes by id", async () => {
      const { requests, api } = server(() => new Response(null, { status: 204 }));

      await api.initialAccessTokens.revoke(token.id);

      expect(requests[0]?.method).toBe("DELETE");
      expect(requests[0]?.url).toBe(`https://management.clavia.test/api/v1/initial-access-tokens/${token.id}`);
    });

    it("names the field Clavia refuses", async () => {
      const { api } = server(() =>
        json(
          {
            title: "Unprocessable Content",
            status: 422,
            detail: "The request was refused.",
            errors: [{ pointer: "/max_uses", detail: "Must be at most 1000." }],
          },
          422,
        ),
      );

      await expect(
        api.initialAccessTokens.issue({ description: "x", max_uses: 5000, expires_in: 3600 }),
      ).rejects.toMatchObject({
        kind: "invalid",
        fields: [{ pointer: "/max_uses" }],
      });
    });
  });

  describe("webhooks", () => {
    const endpoint = {
      id: "6b0e5c9a-2f4d-4a1e-9b3c-7d8e9f0a1b2c",
      url: "https://siem.acme.example/hooks/clavia",
      description: "SIEM",
      events: ["user.created"],
      is_enabled: true,
      disabled_reason: null,
      failing_since: null,
      previous_secret_until: null,
      created_at: "2026-03-04T09:00:00Z",
      updated_at: "2026-03-04T09:00:00Z",
    };
    const base = "https://management.clavia.test/api/v1/webhooks";

    it("lists the endpoints, all of them", async () => {
      const { requests, api } = server(() => json([endpoint]));

      const endpoints = await api.webhooks.list();

      expect(requests[0]?.url).toBe(base);
      expect(endpoints).toEqual([endpoint]);
    });

    it("registers an endpoint and hands back its secret", async () => {
      const { requests, api } = server(() => json({ ...endpoint, secret: "whsec_abc" }, 201));

      const created = await api.webhooks.create({ url: endpoint.url, description: "SIEM", events: ["*"] });

      expect(requests[0]?.method).toBe("POST");
      expect(await requests[0]?.json()).toEqual({ url: endpoint.url, description: "SIEM", events: ["*"] });
      expect(created.secret).toBe("whsec_abc");
    });

    it("sends only what changes, and switches an endpoint off", async () => {
      const { requests, api } = server(() => json({ ...endpoint, is_enabled: false }));

      await api.webhooks.update(endpoint.id, { is_enabled: false });

      expect(requests[0]?.method).toBe("PATCH");
      expect(requests[0]?.url).toBe(`${base}/${endpoint.id}`);
      expect(await requests[0]?.json()).toEqual({ is_enabled: false });
    });

    it("rotates the secret, tests and deletes by id", async () => {
      const { requests, api } = server((request) =>
        request.url.endsWith("/rotate-secret")
          ? json({ ...endpoint, secret: "whsec_new" })
          : new Response(null, { status: request.method === "POST" ? 202 : 204 }),
      );

      const rotated = await api.webhooks.rotateSecret(endpoint.id);
      await api.webhooks.test(endpoint.id);
      await api.webhooks.delete(endpoint.id);

      expect(rotated.secret).toBe("whsec_new");
      expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
        `POST /api/v1/webhooks/${endpoint.id}/rotate-secret`,
        `POST /api/v1/webhooks/${endpoint.id}/test`,
        `DELETE /api/v1/webhooks/${endpoint.id}`,
      ]);
    });

    it("pages the delivery log", async () => {
      const { requests, api } = server(() => json(PAGE));

      await api.webhooks.deliveries(endpoint.id, { page: 2, perPage: 25 });

      expect(requests[0]?.url).toBe(`${base}/${endpoint.id}/deliveries?page=2&per_page=25`);
    });

    it("names the field Clavia refuses", async () => {
      const { api } = server(() =>
        json(
          {
            title: "Unprocessable Content",
            status: 422,
            detail: "The request was refused.",
            errors: [{ pointer: "/url", detail: "The URL must be https." }],
          },
          422,
        ),
      );

      await expect(
        api.webhooks.create({ url: "http://x.test/", description: "", events: ["*"] }),
      ).rejects.toMatchObject({
        kind: "invalid",
        fields: [{ pointer: "/url" }],
      });
    });
  });

  describe("SAML", () => {
    const base = "https://management.clavia.test/api/v1";

    it("registers a SAML connection with the identity provider's metadata URL and options", async () => {
      const { requests, api } = server(() => json({ name: "acme" }, 201));

      await api.connections.create({
        name: "acme",
        display_name: "Acme",
        strategy: "saml",
        is_enabled: true,
        is_domain_connection: false,
        allow_sign_up: false,
        require_verified_email: false,
        require_provisioning: false,
        saml: {
          metadata_url: "https://idp.example/metadata",
          name_id_format: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
          email_trusted: true,
          sign_requests: true,
          require_encryption: false,
          require_gcm: false,
        },
      });

      expect(await requests[0]?.json()).toMatchObject({
        strategy: "saml",
        saml: { metadata_url: "https://idp.example/metadata", email_trusted: true, require_gcm: false },
      });
    });

    it("reads the metadata again, by connection name", async () => {
      const { requests, api } = server(() => json({ name: "acme" }));

      await api.connections.refreshMetadata("acme");

      expect(requests[0]?.method).toBe("POST");
      expect(requests[0]?.url).toBe(`${base}/connections/acme/refresh-metadata`);
    });

    it("points at the metadata URL when the identity provider's metadata is refused", async () => {
      const { api } = server(() =>
        json(
          {
            title: "Unprocessable Content",
            status: 422,
            detail: "The request was refused.",
            errors: [{ pointer: "/saml/metadata_url", detail: "It must be https." }],
          },
          422,
        ),
      );

      await expect(api.connections.refreshMetadata("acme")).rejects.toMatchObject({
        kind: "invalid",
        fields: [{ pointer: "/saml/metadata_url" }],
      });
    });

    it("lists and rotates the service provider keys, and says so when they live in a KMS", async () => {
      const { requests, api } = server((request) =>
        request.method === "POST"
          ? json({ type: "about:blank", title: "Conflict", status: 409, detail: "The keys are kept in a KMS." }, 409)
          : json([]),
      );

      await expect(api.samlKeys.list()).resolves.toEqual([]);
      await expect(api.samlKeys.rotate()).rejects.toMatchObject({ kind: "conflict" });

      expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
        "GET /api/v1/saml-keys",
        "POST /api/v1/saml-keys/rotate",
      ]);
    });
  });
});
