import "server-only";

import type { AuditEvent } from "@/contract";
import type { Operator } from "@/core/auth/operator";
import type { ManagementApi } from "@/core/management/management-api";

/** What the audit trail's ids stand for, as far as the operator may read them. */
export type AuditNames = Readonly<{
  users: Readonly<Record<string, string>>;
  clients: Readonly<Record<string, string>>;
  roles: Readonly<Record<string, string>>;
  resourceServers: Readonly<Record<string, string>>;
}>;

/**
 * The names behind the ids a page of events mentions — an email for a person, a name for
 * an application, a role, an API — looked up in parallel, once each. An id the operator
 * may not read, or that names something since deleted, stays an id.
 */
export async function auditNames(
  events: readonly AuditEvent[],
  api: ManagementApi,
  operator: Operator,
): Promise<AuditNames> {
  const ids = {
    users: new Set<string>(),
    clients: new Set<string>(),
    roles: new Set<string>(),
    apis: new Set<string>(),
  };
  for (const event of events) {
    if (event.actor.user_id !== null) ids.users.add(event.actor.user_id);
    if (event.actor.client_id !== null) ids.clients.add(event.actor.client_id);
    if (event.target?.type === "user") ids.users.add(event.target.id);
    if (event.target?.type === "client") ids.clients.add(event.target.id);
    if (event.target?.type === "role") ids.roles.add(event.target.id);
    if (event.target?.type === "resource_server") ids.apis.add(event.target.id);
  }

  const [users, clients, roles, resourceServers] = await Promise.all([
    lookup(operator.can("read:users") ? ids.users : new Set(), async (id) => (await api.users.get(id)).email),
    lookup(operator.can("read:clients") ? ids.clients : new Set(), async (id) => (await api.clients.get(id)).name),
    lookup(operator.can("read:roles") ? ids.roles : new Set(), async (id) => (await api.roles.get(id)).name),
    lookup(
      operator.can("read:resource_servers") ? ids.apis : new Set(),
      async (id) => (await api.resourceServers.get(id)).name,
    ),
  ]);

  return { users, clients, roles, resourceServers };
}

async function lookup(
  ids: ReadonlySet<string>,
  name: (id: string) => Promise<string>,
): Promise<Record<string, string>> {
  const settled = await Promise.allSettled([...ids].map(async (id) => [id, await name(id)] as const));

  return Object.fromEntries(settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])));
}
