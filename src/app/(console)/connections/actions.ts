"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Connection } from "@/contract";
import { type ActionState, parse, perform } from "@/server/actions";

const optional = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value));

/** An attribute name or a URL left empty is not sent, so Clavia's default stands. */
const attribute = optional.pipe(z.string().max(255, "At most 255 characters.").optional());

const PERSISTENT = "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent";

const samlSchema = z
  .object({
    metadata_url: optional.pipe(z.url("An https URL.").max(2048).optional()),
    metadata: optional.pipe(z.string().max(1_048_576, "At most 1 MiB.").optional()),
    subject_attribute: attribute,
    // Persistent is Clavia's default, and the only format a subject should come from.
    name_id_format: z.literal(PERSISTENT),
    email_attribute: attribute,
    email_trusted: z.boolean(),
    name_attribute: attribute,
    given_name_attribute: attribute,
    family_name_attribute: attribute,
    sign_requests: z.boolean(),
    require_encryption: z.boolean(),
    require_gcm: z.boolean(),
  })
  .refine((saml) => (saml.metadata_url === undefined) !== (saml.metadata === undefined), {
    message: "Give the identity provider's metadata, as a URL or as a document, not both.",
    path: ["metadata_url"],
  });

const createSchema = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("database"),
    name: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{0,62}$/, "Lowercase letters, digits and dashes, such as staff."),
    display_name: z.string().trim().min(1, "Give it a name people read.").max(100),
    is_domain_connection: z.boolean(),
    allow_sign_up: z.boolean(),
    require_verified_email: z.boolean(),
  }),
  z.object({
    strategy: z.literal("oidc"),
    name: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{0,62}$/, "Lowercase letters, digits and dashes, such as okta."),
    display_name: z.string().trim().min(1, "Give it a name people read.").max(100),
    is_domain_connection: z.boolean(),
    oidc_issuer: z.url("The provider's issuer, an https URL.").trim(),
    oidc_client_id: z.string().trim().min(1, "The client id Clavia has there.").max(255),
    oidc_client_secret: z.string().min(1, "The client secret Clavia has there.").max(1024),
    oidc_scope: optional,
    // Self-service belongs to a pool; Clavia refuses either switch on for another kind.
    allow_sign_up: z.literal(false),
    require_verified_email: z.literal(false),
  }),
  z.object({
    strategy: z.literal("saml"),
    name: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{0,62}$/, "Lowercase letters, digits and dashes, such as acme-entra."),
    display_name: z.string().trim().min(1, "Give it a name people read.").max(100),
    is_domain_connection: z.boolean(),
    saml: samlSchema,
    allow_sign_up: z.literal(false),
    require_verified_email: z.literal(false),
  }),
]);

export async function createConnection(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(createSchema, {
    strategy: form.get("strategy"),
    name: form.get("name"),
    display_name: form.get("display_name"),
    is_domain_connection: form.get("is_domain_connection") === "on",
    allow_sign_up: form.get("allow_sign_up") === "on",
    require_verified_email: form.get("require_verified_email") === "on",
    oidc_issuer: form.get("oidc_issuer") ?? "",
    oidc_client_id: form.get("oidc_client_id") ?? "",
    oidc_client_secret: form.get("oidc_client_secret") ?? "",
    oidc_scope: form.get("oidc_scope") ?? "",
    saml: {
      metadata_url: form.get("saml_metadata_url") ?? "",
      metadata: form.get("saml_metadata") ?? "",
      subject_attribute: form.get("saml_subject_attribute") ?? "",
      name_id_format: PERSISTENT,
      email_attribute: form.get("saml_email_attribute") ?? "",
      email_trusted: form.get("saml_email_trusted") === "on",
      name_attribute: form.get("saml_name_attribute") ?? "",
      given_name_attribute: form.get("saml_given_name_attribute") ?? "",
      family_name_attribute: form.get("saml_family_name_attribute") ?? "",
      sign_requests: form.get("saml_sign_requests") === "on",
      require_encryption: form.get("saml_require_encryption") === "on",
      require_gcm: form.get("saml_require_gcm") === "on",
    },
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  const state = await perform(async ({ api }) => {
    // Requiring provisioning is switched on from the connection's SCIM settings, once a directory is set up.
    await api.connections.create({ ...parsed.data, is_enabled: true, require_provisioning: false });

    return `Created ${parsed.data.display_name}.`;
  });
  if (state.status === "success") {
    redirect(`/connections/${parsed.data.name}` as Route);
  }

  return state;
}

const updateSchema = z.object({
  display_name: z.string().trim().min(1, "Give it a name people read.").max(100),
  is_enabled: z.boolean(),
  is_domain_connection: z.boolean(),
  allow_sign_up: z.boolean().optional(),
  require_verified_email: z.boolean().optional(),
  oidc_issuer: optional.pipe(z.url("The provider's issuer, an https URL.").optional()),
  oidc_client_id: optional,
  oidc_client_secret: z
    .string()
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  oidc_scope: optional,
});

/**
 * Saves a connection's settings. `strategy` says which fields its form has: the OpenID Connect
 * settings for a provider, the self-service switches for a pool.
 */
export async function updateConnection(
  name: string,
  strategy: Connection["strategy"],
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const oidc = strategy === "oidc";
  const pool = strategy === "database";
  const parsed = parse(updateSchema, {
    display_name: form.get("display_name"),
    is_enabled: form.get("is_enabled") === "on",
    is_domain_connection: form.get("is_domain_connection") === "on",
    allow_sign_up: pool ? form.get("allow_sign_up") === "on" : undefined,
    require_verified_email: pool ? form.get("require_verified_email") === "on" : undefined,
    oidc_issuer: oidc ? (form.get("oidc_issuer") ?? "") : "",
    oidc_client_id: oidc ? (form.get("oidc_client_id") ?? "") : "",
    // Left empty, the secret Clavia holds is kept.
    oidc_client_secret: oidc ? (form.get("oidc_client_secret") ?? "") : "",
    oidc_scope: oidc ? (form.get("oidc_scope") ?? "") : "",
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  const changes = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined));

  return perform(async ({ api }) => {
    await api.connections.update(name, changes);
    refresh();

    return "Connection saved.";
  });
}

/** Read a SAML connection's metadata URL again, after its identity provider rolled a certificate over. */
export async function refreshSamlMetadata(name: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.connections.refreshMetadata(name);
    refresh();

    return "Metadata read again.";
  });
}

export async function setConnectionEnabled(name: string, enabled: boolean): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.connections.update(name, { is_enabled: enabled });
    refresh();

    return enabled ? "Connection switched on." : "Connection switched off.";
  });
}

export async function deleteConnection(name: string): Promise<ActionState> {
  const state = await perform(async ({ api }) => {
    await api.connections.delete(name);

    return "Connection deleted.";
  });
  if (state.status === "success") {
    redirect("/connections");
  }

  return state;
}
