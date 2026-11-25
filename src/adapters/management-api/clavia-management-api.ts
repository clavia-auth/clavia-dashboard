import "server-only";

import createClient, { type Client } from "openapi-fetch";

import type { paths } from "@/contract/management-api";
import { ManagementError } from "@/core/management/errors";
import type {
  AuditEventsApi,
  AuditQuery,
  ClientsApi,
  ConnectionsApi,
  InitialAccessTokensApi,
  ListQuery,
  ManagementApi,
  ResourceServersApi,
  RolesApi,
  SigningKeysApi,
  UsersApi,
  WebhooksApi,
} from "@/core/management/management-api";

import { managementError } from "./problems";

type Answer<T> = { data?: T; error?: unknown; response: Response };

/**
 * The Management API over HTTP, typed by the contract (`openapi-fetch` on the generated
 * `paths`), on behalf of one operator: every request carries their access token, and
 * nothing is cached — each answer is read fresh, as the operator is entitled to it now.
 */
export class ClaviaManagementApi implements ManagementApi {
  readonly users: UsersApi;
  readonly clients: ClientsApi;
  readonly resourceServers: ResourceServersApi;
  readonly roles: RolesApi;
  readonly connections: ConnectionsApi;
  readonly signingKeys: SigningKeysApi;
  readonly initialAccessTokens: InitialAccessTokensApi;
  readonly webhooks: WebhooksApi;
  readonly auditEvents: AuditEventsApi;

  constructor(baseUrl: string, accessToken: string, fetcher: typeof fetch = fetch) {
    const http: Client<paths> = createClient<paths>({
      baseUrl,
      fetch: (request) => fetcher(request),
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });

    this.users = {
      list: (query) => read(http.GET("/api/v1/users", { params: { query: listParameters(query) } })),
      get: (userId) => read(http.GET("/api/v1/users/{user_id}", { params: { path: { user_id: userId } } })),
      create: (user) => read(http.POST("/api/v1/users", { body: user })),
      update: (userId, changes) =>
        read(http.PATCH("/api/v1/users/{user_id}", { params: { path: { user_id: userId } }, body: changes })),
      delete: (userId) => done(http.DELETE("/api/v1/users/{user_id}", { params: { path: { user_id: userId } } })),
      resetMfa: (userId) => done(http.DELETE("/api/v1/users/{user_id}/mfa", { params: { path: { user_id: userId } } })),
      sendPasswordLink: (userId) =>
        read(http.POST("/api/v1/users/{user_id}/password-reset", { params: { path: { user_id: userId } } })),
      passkeys: (userId) =>
        read(http.GET("/api/v1/users/{user_id}/passkeys", { params: { path: { user_id: userId } } })),
      removePasskey: (userId, passkeyId) =>
        done(
          http.DELETE("/api/v1/users/{user_id}/passkeys/{passkey_id}", {
            params: { path: { user_id: userId, passkey_id: passkeyId } },
          }),
        ),
      sessions: (userId) =>
        read(http.GET("/api/v1/users/{user_id}/sessions", { params: { path: { user_id: userId } } })),
      endSessions: (userId) =>
        done(http.DELETE("/api/v1/users/{user_id}/sessions", { params: { path: { user_id: userId } } })),
      endSession: (userId, sid) =>
        done(http.DELETE("/api/v1/users/{user_id}/sessions/{sid}", { params: { path: { user_id: userId, sid } } })),
      consents: (userId) =>
        read(http.GET("/api/v1/users/{user_id}/consents", { params: { path: { user_id: userId } } })),
      withdrawConsent: (userId, clientId) =>
        done(
          http.DELETE("/api/v1/users/{user_id}/consents/{client_id}", {
            params: { path: { user_id: userId, client_id: clientId } },
          }),
        ),
      identities: (userId) =>
        read(http.GET("/api/v1/users/{user_id}/identities", { params: { path: { user_id: userId } } })),
      unlinkIdentity: (userId, connection) =>
        done(
          http.DELETE("/api/v1/users/{user_id}/identities/{connection}", {
            params: { path: { user_id: userId, connection } },
          }),
        ),
      roles: (userId) => read(http.GET("/api/v1/users/{user_id}/roles", { params: { path: { user_id: userId } } })),
      replaceRoles: (userId, roleIds) =>
        read(
          http.PUT("/api/v1/users/{user_id}/roles", {
            params: { path: { user_id: userId } },
            body: { role_ids: [...roleIds] },
          }),
        ),
      permissions: (userId) =>
        read(http.GET("/api/v1/users/{user_id}/permissions", { params: { path: { user_id: userId } } })),
    };

    this.clients = {
      list: (query) => read(http.GET("/api/v1/clients", { params: { query: listParameters(query) } })),
      get: (clientId) => read(http.GET("/api/v1/clients/{client_id}", { params: { path: { client_id: clientId } } })),
      create: (client) => read(http.POST("/api/v1/clients", { body: client })),
      update: (clientId, changes) =>
        read(http.PATCH("/api/v1/clients/{client_id}", { params: { path: { client_id: clientId } }, body: changes })),
      delete: (clientId) =>
        done(http.DELETE("/api/v1/clients/{client_id}", { params: { path: { client_id: clientId } } })),
      rotateSecret: (clientId) =>
        read(http.POST("/api/v1/clients/{client_id}/rotate-secret", { params: { path: { client_id: clientId } } })),
      replaceConnections: (clientId, connections) =>
        read(
          http.PUT("/api/v1/clients/{client_id}/connections", {
            params: { path: { client_id: clientId } },
            body: { connections: [...connections] },
          }),
        ),
    };

    this.resourceServers = {
      list: (query) => read(http.GET("/api/v1/resource-servers", { params: { query: listParameters(query) } })),
      get: (id) =>
        read(
          http.GET("/api/v1/resource-servers/{resource_server_id}", { params: { path: { resource_server_id: id } } }),
        ),
      create: (resourceServer) => read(http.POST("/api/v1/resource-servers", { body: resourceServer })),
      update: (id, changes) =>
        read(
          http.PATCH("/api/v1/resource-servers/{resource_server_id}", {
            params: { path: { resource_server_id: id } },
            body: changes,
          }),
        ),
      delete: (id) =>
        done(
          http.DELETE("/api/v1/resource-servers/{resource_server_id}", {
            params: { path: { resource_server_id: id } },
          }),
        ),
    };

    this.roles = {
      list: (query) => read(http.GET("/api/v1/roles", { params: { query: listParameters(query) } })),
      get: (roleId) => read(http.GET("/api/v1/roles/{role_id}", { params: { path: { role_id: roleId } } })),
      create: (role) => read(http.POST("/api/v1/roles", { body: role })),
      update: (roleId, changes) =>
        read(http.PATCH("/api/v1/roles/{role_id}", { params: { path: { role_id: roleId } }, body: changes })),
      delete: (roleId) => done(http.DELETE("/api/v1/roles/{role_id}", { params: { path: { role_id: roleId } } })),
      holders: (roleId, query) =>
        read(
          http.GET("/api/v1/roles/{role_id}/users", {
            params: { path: { role_id: roleId }, query: listParameters(query) },
          }),
        ),
      give: (roleId, userIds) =>
        done(
          http.POST("/api/v1/roles/{role_id}/users", {
            params: { path: { role_id: roleId } },
            body: { user_ids: [...userIds] },
          }),
        ),
      take: (roleId, userId) =>
        done(
          http.DELETE("/api/v1/roles/{role_id}/users/{user_id}", {
            params: { path: { role_id: roleId, user_id: userId } },
          }),
        ),
    };

    this.connections = {
      list: () => read(http.GET("/api/v1/connections")),
      get: (name) => read(http.GET("/api/v1/connections/{name}", { params: { path: { name } } })),
      create: (connection) => read(http.POST("/api/v1/connections", { body: connection })),
      update: (name, changes) =>
        read(http.PATCH("/api/v1/connections/{name}", { params: { path: { name } }, body: changes })),
      delete: (name) => done(http.DELETE("/api/v1/connections/{name}", { params: { path: { name } } })),
    };

    this.signingKeys = {
      list: () => read(http.GET("/api/v1/signing-keys")),
      rotate: () => read(http.POST("/api/v1/signing-keys/rotate")),
    };

    this.initialAccessTokens = {
      list: (query) => read(http.GET("/api/v1/initial-access-tokens", { params: { query: listParameters(query) } })),
      issue: (token) => read(http.POST("/api/v1/initial-access-tokens", { body: token })),
      revoke: (tokenId) =>
        done(
          http.DELETE("/api/v1/initial-access-tokens/{initial_access_token_id}", {
            params: { path: { initial_access_token_id: tokenId } },
          }),
        ),
    };

    const webhook = (webhookId: string) => ({ params: { path: { webhook_id: webhookId } } });
    this.webhooks = {
      list: () => read(http.GET("/api/v1/webhooks")),
      get: (webhookId) => read(http.GET("/api/v1/webhooks/{webhook_id}", webhook(webhookId))),
      create: (body) => read(http.POST("/api/v1/webhooks", { body })),
      update: (webhookId, body) => read(http.PATCH("/api/v1/webhooks/{webhook_id}", { ...webhook(webhookId), body })),
      delete: (webhookId) => done(http.DELETE("/api/v1/webhooks/{webhook_id}", webhook(webhookId))),
      rotateSecret: (webhookId) => read(http.POST("/api/v1/webhooks/{webhook_id}/rotate-secret", webhook(webhookId))),
      test: (webhookId) => done(http.POST("/api/v1/webhooks/{webhook_id}/test", webhook(webhookId))),
      deliveries: (webhookId, query) =>
        read(
          http.GET("/api/v1/webhooks/{webhook_id}/deliveries", {
            params: { path: { webhook_id: webhookId }, query: listParameters(query) },
          }),
        ),
    };

    this.auditEvents = {
      list: (query) => read(http.GET("/api/v1/audit-events", { params: { query: auditParameters(query) } })),
    };
  }
}

function listParameters(query: ListQuery | undefined): { page?: number; per_page?: number; q?: string } {
  const search = query?.search?.trim();

  return {
    ...(query?.page === undefined ? {} : { page: query.page }),
    ...(query?.perPage === undefined ? {} : { per_page: query.perPage }),
    ...(search === undefined || search === "" ? {} : { q: search }),
  };
}

function auditParameters(query: AuditQuery | undefined) {
  if (query === undefined) {
    return {};
  }

  return {
    ...(query.page === undefined ? {} : { page: query.page }),
    ...(query.perPage === undefined ? {} : { per_page: query.perPage }),
    ...(query.types === undefined || query.types.length === 0 ? {} : { type: query.types.join(",") }),
    ...(query.actorUserId === undefined ? {} : { actor_user_id: query.actorUserId }),
    ...(query.clientId === undefined ? {} : { client_id: query.clientId }),
    ...(query.target === undefined ? {} : { target_type: query.target.type, target_id: query.target.id }),
    ...(query.outcome === undefined ? {} : { outcome: query.outcome }),
    ...(query.since === undefined ? {} : { since: query.since.toISOString() }),
    ...(query.until === undefined ? {} : { until: query.until.toISOString() }),
  };
}

/** The body of a successful answer, or the refusal as a {@link ManagementError}. */
async function read<T>(request: Promise<Answer<T>>): Promise<T> {
  const { data, error, response } = await reach(request);
  if (!response.ok || data === undefined) {
    throw managementError(response, error);
  }

  return data;
}

/** A successful answer with no body (204), or the refusal. */
async function done(request: Promise<Answer<unknown>>): Promise<void> {
  const { error, response } = await reach(request);
  if (!response.ok) {
    throw managementError(response, error);
  }
}

async function reach<T>(request: Promise<Answer<T>>): Promise<Answer<T>> {
  try {
    return await request;
  } catch (cause) {
    throw new ManagementError("unavailable", "The Management API could not be reached.", [], null, null, {
      cause,
    });
  }
}
