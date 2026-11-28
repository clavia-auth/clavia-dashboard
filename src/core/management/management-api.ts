import type {
  AccessDecision,
  AccessEvaluation,
  AuditEvent,
  AuthorizationModelPage,
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
  InitialAccessToken,
  InitialAccessTokenCreate,
  IssuedInitialAccessToken,
  Page,
  PasswordLinkSent,
  RelationshipPage,
  ResourceServer,
  ResourceServerAuthorization,
  ResourceServerAuthorizationUpdate,
  ResourceServerCreate,
  ResourceServerUpdate,
  ProvisioningToken,
  ProvisioningTokenCreate,
  IssuedProvisioningToken,
  Role,
  RoleCreate,
  RoleUpdate,
  RoleWithPermissions,
  SamlKey,
  SamlKeyRotation,
  SigningKey,
  SigningKeyRotation,
  User,
  UserConsent,
  UserCreate,
  UserPasskey,
  UserSession,
  UserUpdate,
  Webhook,
  WebhookCreate,
  WebhookDelivery,
  WebhookUpdate,
  WebhookWithSecret,
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
  readonly authorization: AuthorizationApi;
  readonly roles: RolesApi;
  readonly connections: ConnectionsApi;
  readonly signingKeys: SigningKeysApi;
  readonly samlKeys: SamlKeysApi;
  readonly initialAccessTokens: InitialAccessTokensApi;
  readonly provisioningTokens: ProvisioningTokensApi;
  readonly webhooks: WebhooksApi;
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

/**
 * An application's logo on its sign-in pages, as Clavia keeps it: a PNG, JPEG or WebP image, its media type
 * the one Clavia recognised it as.
 */
export interface ClientLogo {
  readonly type: string;
  readonly bytes: ArrayBuffer;
}

export interface ClientsApi {
  list(query?: ListQuery): Promise<Page<Client>>;
  get(clientId: string): Promise<Client>;
  create(client: ClientCreate): Promise<ClientWithSecret>;
  update(clientId: string, changes: ClientUpdate): Promise<Client>;
  delete(clientId: string): Promise<void>;
  rotateSecret(clientId: string): Promise<ClientWithSecret>;
  replaceConnections(clientId: string, connections: readonly string[]): Promise<string[]>;
  /** The logo its sign-in pages show; `not_found` when it has none. */
  logo(clientId: string): Promise<ClientLogo>;
  /** Put this image in place of its logo: Clavia reads what it is from its content, and refuses the rest. */
  setLogo(clientId: string, logo: ClientLogo): Promise<void>;
  /** The sign-in pages show Clavia's logo again; `not_found` when it had none. */
  removeLogo(clientId: string): Promise<void>;
}

export interface ResourceServersApi {
  list(query?: ListQuery): Promise<Page<ResourceServer>>;
  get(resourceServerId: string): Promise<ResourceServer>;
  create(resourceServer: ResourceServerCreate): Promise<ResourceServer>;
  update(resourceServerId: string, changes: ResourceServerUpdate): Promise<ResourceServer>;
  delete(resourceServerId: string): Promise<void>;
}

/** A page of what the decision engine pages by token: the previous page's `next_page_token`. */
export type TokenPageQuery = Readonly<{ pageSize?: number; pageToken?: string }>;

/**
 * An API's fine-grained authorization, by the API's id: its settings, the versions of its model,
 * the relationships in its store and a decision tried there. Everything but the settings is read
 * from the decision engine, whether authorization is on or off, and answers `not_found` when the
 * API has no store, `conflict` when the server names no engine, `service_unavailable` when the
 * engine does not answer.
 */
export interface AuthorizationApi {
  /** The settings and the model in force; `not_found` when it was never set up, or its store deleted. */
  get(resourceServerId: string): Promise<ResourceServerAuthorization>;
  /** Turn it on, or change it: a model that differs from the one in force becomes a new version. */
  put(resourceServerId: string, settings: ResourceServerAuthorizationUpdate): Promise<ResourceServerAuthorization>;
  /** Turn it off. The store, its model and its relationships are kept for when it is turned on again. */
  turnOff(resourceServerId: string): Promise<void>;
  /** Delete the store and every relationship in it, for good. */
  deleteStore(resourceServerId: string): Promise<void>;
  /** The model's versions, newest first, the one in force marked. */
  models(resourceServerId: string, query?: TokenPageQuery): Promise<AuthorizationModelPage>;
  /** The relationships written on one of the API's own objects (`type:id`), as written. */
  relationships(resourceServerId: string, object: string, query?: TokenPageQuery): Promise<RelationshipPage>;
  /** The decision the API's own clients would get, a denial always saying which kind it is. */
  evaluate(resourceServerId: string, question: AccessEvaluation): Promise<AccessDecision>;
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

/**
 * This server's own keys as a SAML service provider: certificates, never key material. Both
 * operations answer a `conflict` where the keys live in a KMS and are rotated there.
 */
export interface SamlKeysApi {
  /** The current pair, the next one if a rotation is under way, and the retired ones still kept. */
  list(): Promise<SamlKey[]>;
  /** One step of the rollover: generate, introduce a next pair, wait, or promote it. */
  rotate(): Promise<SamlKeyRotation>;
}

/**
 * What lets software register itself as a client (RFC 7591): a token an operator hands to a
 * partner, good for a number of registrations until a date. Its value is shown once, when it is
 * issued, and never read again.
 */
export interface InitialAccessTokensApi {
  /** Newest first; the description is what a search matches. Never a token's value. */
  list(query?: ListQuery): Promise<Page<InitialAccessToken>>;
  issue(token: InitialAccessTokenCreate): Promise<IssuedInitialAccessToken>;
  /** Stop it registering more. The clients it registered keep working. */
  revoke(tokenId: string): Promise<void>;
}

/**
 * What lets a directory (Entra ID, Okta) provision a connection's accounts through SCIM: a bearer
 * token an operator hands to it. Its value, and the base URL to give the directory, are shown once,
 * when it is issued, and never read again.
 */
export interface ProvisioningTokensApi {
  /** Newest first; `connection` keeps one connection's tokens. Never a token's value. */
  list(query?: ListQuery & { connection?: string }): Promise<Page<ProvisioningToken>>;
  issue(token: ProvisioningTokenCreate): Promise<IssuedProvisioningToken>;
  /** The directory holding it reaches SCIM no more, at once. The accounts it provisioned stay. */
  revoke(tokenId: string): Promise<void>;
}

/**
 * The endpoints audit events are sent to, signed per Standard Webhooks. A secret is shown once, by
 * `create` and `rotateSecret`, and never read again. Registering, changing where one points or
 * what it hears, testing it and reading its log also need `read:audit_events`.
 */
export interface WebhooksApi {
  /** Oldest first; at most twenty, so never paged. */
  list(): Promise<Webhook[]>;
  get(webhookId: string): Promise<Webhook>;
  create(webhook: WebhookCreate): Promise<WebhookWithSecret>;
  update(webhookId: string, changes: WebhookUpdate): Promise<Webhook>;
  delete(webhookId: string): Promise<void>;
  /** A new secret; the previous one keeps signing beside it for 24 hours. */
  rotateSecret(webhookId: string): Promise<WebhookWithSecret>;
  /** Queue a `webhook.tested` event for this endpoint alone; it is sent within the minute. */
  test(webhookId: string): Promise<void>;
  /** Newest first, kept seven days after they end. Never a body. */
  deliveries(webhookId: string, query?: Omit<ListQuery, "search">): Promise<Page<WebhookDelivery>>;
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
  /** Read a SAML connection's metadata URL again, after its identity provider rolled a certificate over. */
  refreshMetadata(name: string): Promise<Connection>;
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
