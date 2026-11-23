import type {
  AuditEvent,
  AuditOutcome,
  AuditTargetType,
  Client,
  ClientCreate,
  ClientUpdate,
  ClientWithSecret,
  Connection,
  ConnectionCreate,
  ConnectionUpdate,
  EffectivePermission,
  Identity,
  Page,
  PasswordLinkSent,
  ResourceServer,
  ResourceServerCreate,
  ResourceServerUpdate,
  Role,
  RoleCreate,
  RoleUpdate,
  RoleWithPermissions,
  SigningKey,
  SigningKeyRotation,
  User,
  UserConsent,
  UserCreate,
  UserPasskey,
  UserSession,
  UserUpdate,
} from "@/contract";

/**
 * The Management API, as the dashboard uses it — one method per operation of the
 * contract, grouped by resource, every one on behalf of the signed-in operator.
 *
 * Every method throws a {@link ManagementError} when the API refuses; a value returned
 * is what the API answered, never a guess.
 */
export interface ManagementApi {
  readonly users: UsersApi;
  readonly clients: ClientsApi;
  readonly resourceServers: ResourceServersApi;
  readonly roles: RolesApi;
  readonly connections: ConnectionsApi;
  readonly signingKeys: SigningKeysApi;
  readonly auditEvents: AuditEventsApi;
}

/** A page of a list: 1-based, at most 100 items, and a literal search where the API takes one. */
export type ListQuery = Readonly<{ page?: number; perPage?: number; search?: string }>;

export interface UsersApi {
  list(query?: ListQuery): Promise<Page<User>>;
  get(userId: string): Promise<User>;
  create(user: UserCreate): Promise<User>;
  update(userId: string, changes: UserUpdate): Promise<User>;
  delete(userId: string): Promise<void>;
  resetMfa(userId: string): Promise<void>;
  /** Mail the user a link to choose a password: an invitation or a reset, as the API words it. */
  sendPasswordLink(userId: string): Promise<PasswordLinkSent>;
  /** The account's passkeys, oldest first: never a credential id or key. */
  passkeys(userId: string): Promise<UserPasskey[]>;
  removePasskey(userId: string, passkeyId: string): Promise<void>;
  sessions(userId: string): Promise<UserSession[]>;
  endSessions(userId: string): Promise<void>;
  endSession(userId: string, sid: string): Promise<void>;
  consents(userId: string): Promise<UserConsent[]>;
  withdrawConsent(userId: string, clientId: string): Promise<void>;
  identities(userId: string): Promise<Identity[]>;
  unlinkIdentity(userId: string, connection: string): Promise<void>;
  roles(userId: string): Promise<Role[]>;
  replaceRoles(userId: string, roleIds: readonly string[]): Promise<Role[]>;
  permissions(userId: string): Promise<EffectivePermission[]>;
}

export interface ClientsApi {
  list(query?: ListQuery): Promise<Page<Client>>;
  get(clientId: string): Promise<Client>;
  create(client: ClientCreate): Promise<ClientWithSecret>;
  update(clientId: string, changes: ClientUpdate): Promise<Client>;
  delete(clientId: string): Promise<void>;
  rotateSecret(clientId: string): Promise<ClientWithSecret>;
  replaceConnections(clientId: string, connections: readonly string[]): Promise<string[]>;
}

export interface ResourceServersApi {
  list(query?: ListQuery): Promise<Page<ResourceServer>>;
  get(resourceServerId: string): Promise<ResourceServer>;
  create(resourceServer: ResourceServerCreate): Promise<ResourceServer>;
  update(resourceServerId: string, changes: ResourceServerUpdate): Promise<ResourceServer>;
  delete(resourceServerId: string): Promise<void>;
}

/**
 * The keys tokens are signed with: never key material, only what identifies each key and when
 * it signed. Both operations answer a `conflict` where the keys live at another provider and
 * are rotated there.
 */
export interface SigningKeysApi {
  /** The active key and every retired one, newest first. */
  list(): Promise<SigningKey[]>;
  /** A new key signs from now on; the one it replaces stays published for the grace period. */
  rotate(): Promise<SigningKeyRotation>;
}

export interface RolesApi {
  list(query?: ListQuery): Promise<Page<Role>>;
  get(roleId: string): Promise<RoleWithPermissions>;
  create(role: RoleCreate): Promise<RoleWithPermissions>;
  update(roleId: string, changes: RoleUpdate): Promise<RoleWithPermissions>;
  delete(roleId: string): Promise<void>;
  holders(roleId: string, query?: Omit<ListQuery, "search">): Promise<Page<User>>;
  give(roleId: string, userIds: readonly string[]): Promise<void>;
  take(roleId: string, userId: string): Promise<void>;
}

export interface ConnectionsApi {
  list(): Promise<Connection[]>;
  get(name: string): Promise<Connection>;
  create(connection: ConnectionCreate): Promise<Connection>;
  update(name: string, changes: ConnectionUpdate): Promise<Connection>;
  delete(name: string): Promise<void>;
}

/** Filters on the audit trail; they combine. `types` are matched as any of them. */
export type AuditQuery = Readonly<{
  page?: number;
  perPage?: number;
  types?: readonly AuditEvent["type"][];
  actorUserId?: string;
  clientId?: string;
  target?: Readonly<{ type: AuditTargetType; id: string }>;
  outcome?: AuditOutcome;
  since?: Date;
  until?: Date;
}>;

export interface AuditEventsApi {
  list(query?: AuditQuery): Promise<Page<AuditEvent>>;
}
