/**
 * The Management API's published language: the resources the dashboard manages, named
 * as the contract names them. Generated from `contract/management-api.yaml` (see
 * `scripts/generate-contract.mjs`), never written by hand — a field the contract adds or
 * removes reaches the type checker at the next `npm run contract`.
 */
import type { components } from "./management-api";

type Schemas = components["schemas"];

export type Page<T> = { items: T[]; total: number; page: number; per_page: number };

export type User = Schemas["User"];
export type AppMetadata = Schemas["AppMetadata"];
export type UserCreate = Schemas["UserCreate"];
export type UserUpdate = Schemas["UserUpdate"];
export type UserSession = Schemas["UserSession"];
export type UserConsent = Schemas["UserConsent"];
export type UserPasskey = Schemas["UserPasskey"];
export type PasswordLinkSent = Schemas["PasswordLinkSent"];
export type Identity = Schemas["Identity"];
export type EffectivePermission = Schemas["EffectivePermission"];

export type Client = Schemas["Client"];
export type ClientWithSecret = Schemas["ClientWithSecret"];
export type ClientCreate = Schemas["ClientCreate"];
export type ClientUpdate = Schemas["ClientUpdate"];
export type ClaimMapping = Schemas["ClaimMapping"];
export type ApplicationClaimMapping = Schemas["ApplicationClaimMapping"];
export type ClientType = Schemas["ClientType"];
export type AuthMethod = Schemas["AuthMethod"];
export type GrantType = Schemas["GrantType"];

export type ResourceServer = Schemas["ResourceServer"];
export type ResourceServerCreate = Schemas["ResourceServerCreate"];
export type ResourceServerUpdate = Schemas["ResourceServerUpdate"];
export type Permission = Schemas["Permission"];

export type Role = Schemas["Role"];
export type RoleWithPermissions = Schemas["RoleWithPermissions"];
export type RoleCreate = Schemas["RoleCreate"];
export type RoleUpdate = Schemas["RoleUpdate"];
export type PermissionReference = Schemas["PermissionReference"];

export type Connection = Schemas["Connection"];
export type ConnectionCreate = Schemas["ConnectionCreate"];
export type ConnectionUpdate = Schemas["ConnectionUpdate"];
export type ConnectionStrategy = Schemas["ConnectionStrategy"];

export type SamlConnection = NonNullable<Schemas["SamlConnection"]>;
export type SamlConnectionCreate = Schemas["SamlConnectionCreate"];
export type SamlKey = Schemas["SamlKey"];
export type SamlKeyRotation = Schemas["SamlKeyRotation"];
export type SigningKey = Schemas["SigningKey"];
export type SigningKeyRotation = Schemas["SigningKeyRotation"];

export type InitialAccessToken = Schemas["InitialAccessToken"];
export type InitialAccessTokenCreate = Schemas["InitialAccessTokenCreate"];
export type IssuedInitialAccessToken = Schemas["IssuedInitialAccessToken"];
export type InitialAccessTokenState = Schemas["InitialAccessTokenState"];
export type ProvisioningToken = Schemas["ProvisioningToken"];
export type ProvisioningTokenCreate = Schemas["ProvisioningTokenCreate"];
export type IssuedProvisioningToken = Schemas["IssuedProvisioningToken"];
export type ProvisioningTokenState = Schemas["ProvisioningTokenState"];
export type ProvisioningSubjectAttribute = Schemas["ProvisioningSubjectAttribute"];

export type AuditEvent = Schemas["AuditEvent"];
export type AuditEventType = AuditEvent["type"];

export type Webhook = Schemas["Webhook"];
export type WebhookWithSecret = Schemas["WebhookWithSecret"];
export type WebhookCreate = Schemas["WebhookCreate"];
export type WebhookUpdate = Schemas["WebhookUpdate"];
export type WebhookDelivery = Schemas["WebhookDelivery"];
export type AuditOutcome = Schemas["AuditOutcome"];
export type AuditTargetType = Schemas["AuditTargetType"];

export type Problem = Schemas["Problem"];

export { MANAGEMENT_SCOPES, type ManagementScope } from "./scopes";
