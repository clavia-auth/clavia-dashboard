import type { Route } from "next";

import type { AuditEvent, AuditEventType, AuditTargetType } from "@/contract";

/** The words an operator reads for each kind of event, and how much it should catch the eye. */
export const EVENT_TYPES: Readonly<Record<AuditEventType, { label: string; group: string; tone: Tone }>> = {
  "authentication.succeeded": { label: "Signed in", group: "Sign-in", tone: "neutral" },
  "authentication.failed": { label: "Sign-in refused", group: "Sign-in", tone: "warning" },
  "session.ended": { label: "Session ended", group: "Sign-in", tone: "neutral" },
  "session.stepped_up": { label: "Second factor given", group: "Sign-in", tone: "positive" },
  "mfa.enrolled": { label: "Two-factor turned on", group: "Sign-in", tone: "positive" },
  "mfa.removed": { label: "Two-factor turned off", group: "Sign-in", tone: "warning" },
  "consent.given": { label: "Consent given", group: "Consent", tone: "neutral" },
  "consent.refused": { label: "Consent refused", group: "Consent", tone: "neutral" },
  "consent.withdrawn": { label: "Consent withdrawn", group: "Consent", tone: "neutral" },
  "device.approved": { label: "Device approved", group: "Consent", tone: "neutral" },
  "device.refused": { label: "Device refused", group: "Consent", tone: "neutral" },
  "token.issued": { label: "Token issued", group: "Tokens", tone: "neutral" },
  "token.revoked": { label: "Token revoked", group: "Tokens", tone: "neutral" },
  "token.code_replayed": { label: "Code replayed", group: "Tokens", tone: "danger" },
  "token.refresh_replayed": { label: "Refresh token replayed", group: "Tokens", tone: "danger" },
  "client.created": { label: "Application created", group: "Applications", tone: "positive" },
  "client.updated": { label: "Application changed", group: "Applications", tone: "neutral" },
  "client.deleted": { label: "Application deleted", group: "Applications", tone: "warning" },
  "client.secret_rotated": { label: "Secret rotated", group: "Applications", tone: "warning" },
  "client.granted": { label: "Application granted an API", group: "Applications", tone: "neutral" },
  "user.created": { label: "User created", group: "Users", tone: "positive" },
  "user.updated": { label: "User changed", group: "Users", tone: "neutral" },
  "user.deleted": { label: "User deleted", group: "Users", tone: "warning" },
  "user.identity_unlinked": { label: "Identity unlinked", group: "Users", tone: "neutral" },
  "user.roles_changed": { label: "Roles changed", group: "Users", tone: "neutral" },
  "user.signed_up": { label: "Signed up", group: "Users", tone: "positive" },
  "user.email_verified": { label: "Address verified", group: "Users", tone: "positive" },
  "user.password_reset": { label: "Password reset", group: "Users", tone: "warning" },
  "user.password_link_sent": { label: "Password link sent", group: "Users", tone: "neutral" },
  "user.exported": { label: "Users exported", group: "Users", tone: "warning" },
  "passkey.registered": { label: "Passkey added", group: "Passkeys", tone: "positive" },
  "passkey.renamed": { label: "Passkey renamed", group: "Passkeys", tone: "neutral" },
  "passkey.removed": { label: "Passkey removed", group: "Passkeys", tone: "warning" },
  "passkey.counter_regressed": { label: "Passkey counter went back", group: "Passkeys", tone: "danger" },
  "role.created": { label: "Role created", group: "Roles", tone: "positive" },
  "role.updated": { label: "Role changed", group: "Roles", tone: "neutral" },
  "role.deleted": { label: "Role deleted", group: "Roles", tone: "warning" },
  "resource_server.created": { label: "API created", group: "APIs", tone: "positive" },
  "resource_server.updated": { label: "API changed", group: "APIs", tone: "neutral" },
  "resource_server.deleted": { label: "API deleted", group: "APIs", tone: "warning" },
  "resource_server.authorization_enabled": { label: "Authorization turned on", group: "APIs", tone: "positive" },
  "resource_server.authorization_disabled": { label: "Authorization turned off", group: "APIs", tone: "warning" },
  "resource_server.authorization_model_written": {
    label: "Authorization model written",
    group: "APIs",
    tone: "neutral",
  },
  "connection.created": { label: "Connection created", group: "Connections", tone: "positive" },
  "connection.updated": { label: "Connection changed", group: "Connections", tone: "neutral" },
  "connection.deleted": { label: "Connection deleted", group: "Connections", tone: "warning" },
  "signing_key.created": { label: "Signing key created", group: "Signing keys", tone: "positive" },
  "signing_key.rotated": { label: "Signing key rotated", group: "Signing keys", tone: "warning" },
  "saml_key.generated": { label: "SAML keys generated", group: "SAML keys", tone: "positive" },
  "saml_key.rotated": { label: "SAML keys rotated", group: "SAML keys", tone: "warning" },
  "initial_access_token.issued": {
    label: "Initial access token issued",
    group: "Initial access tokens",
    tone: "positive",
  },
  "initial_access_token.revoked": {
    label: "Initial access token revoked",
    group: "Initial access tokens",
    tone: "warning",
  },
  "provisioning_token.issued": {
    label: "Provisioning token issued",
    group: "Provisioning tokens",
    tone: "positive",
  },
  "provisioning_token.revoked": {
    label: "Provisioning token revoked",
    group: "Provisioning tokens",
    tone: "warning",
  },
  "webhook.created": { label: "Webhook created", group: "Webhooks", tone: "positive" },
  "webhook.updated": { label: "Webhook changed", group: "Webhooks", tone: "neutral" },
  "webhook.deleted": { label: "Webhook deleted", group: "Webhooks", tone: "warning" },
  "webhook.secret_rotated": { label: "Webhook secret rotated", group: "Webhooks", tone: "warning" },
  "webhook.tested": { label: "Webhook tested", group: "Webhooks", tone: "neutral" },
  "webhook.disabled": { label: "Webhook switched off", group: "Webhooks", tone: "danger" },
};

export type Tone = "neutral" | "positive" | "warning" | "danger";

/** The periods the audit log offers, by their value in the URL. */
export const PERIODS = { "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" } as const;

/** Every event type, in the order the filter lists them. */
export const ALL_EVENT_TYPES = Object.keys(EVENT_TYPES) as AuditEventType[];

export function isEventType(value: string): value is AuditEventType {
  return Object.hasOwn(EVENT_TYPES, value);
}

/**
 * Where an event's target lives in the dashboard; null for what has no page (a signing key, an
 * initial access token, a provisioning token).
 */
export function targetHref(type: AuditTargetType, id: string): Route | null {
  const path = {
    user: "/users",
    client: "/applications",
    resource_server: "/apis",
    role: "/roles",
    connection: "/connections",
    signing_key: null,
    saml_key: null,
    initial_access_token: null,
    provisioning_token: null,
    webhook: "/webhooks",
  }[type];

  return path === null ? null : (`${path}/${encodeURIComponent(id)}` as Route);
}

export const TARGET_TYPES: Readonly<Record<AuditTargetType, string>> = {
  user: "User",
  client: "Application",
  resource_server: "API",
  role: "Role",
  connection: "Connection",
  signing_key: "Signing key",
  saml_key: "SAML key",
  initial_access_token: "Initial access token",
  provisioning_token: "Provisioning token",
  webhook: "Webhook",
};

/** Who acted, in a few words. */
export function actorLabel(actor: AuditEvent["actor"]): string {
  switch (actor.kind) {
    case "person":
      return "User";
    case "application":
      return "Application";
    case "provisioning":
      return "Directory";
    case "system":
      return "System";
    case "anonymous":
      return "Anonymous";
  }
}

/** A detail's name as a phrase: `grant_type` → "Grant type". */
export function detailLabel(name: string): string {
  const words = name.replace(/_/g, " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function detailValue(value: string | number | boolean | string[]): string {
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return String(value);
}
