"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ApplicationClaimMapping, GrantType } from "@/contract";
import { type ActionState, parse, perform } from "@/server/actions";
import { saveClaims } from "@/server/claims";
import { config } from "@/server/config";

import { KINDS } from "./kinds";

/** A created or rotated application's credentials, handed to the form once. */
export type CredentialsState = ActionState & { readonly credentials?: { clientId: string; secret: string | null } };

const lines = z
  .string()
  .transform((value) =>
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== ""),
  )
  .pipe(z.array(z.url("Each line must be a URL.")).max(20, "At most 20."));

const createSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(200),
  kind: z.enum(Object.keys(KINDS) as [keyof typeof KINDS, ...(keyof typeof KINDS)[]]),
  redirect_uris: lines,
  is_first_party: z.boolean(),
});

export async function createApplication(_: CredentialsState, form: FormData): Promise<CredentialsState> {
  const parsed = parse(createSchema, {
    name: form.get("name"),
    kind: form.get("kind"),
    redirect_uris: form.get("redirect_uris") ?? "",
    is_first_party: form.get("is_first_party") === "on",
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  const { name, kind, redirect_uris, is_first_party } = parsed.data;
  const preset = KINDS[kind];
  const grants: readonly GrantType[] = preset.grants;
  let credentials: { clientId: string; secret: string | null } | undefined;
  const state = await perform(async ({ api }) => {
    const created = await api.clients.create({
      name,
      client_type: preset.type,
      token_endpoint_auth_method: preset.authMethod,
      grant_types: [...grants],
      response_types: grants.includes("authorization_code") ? ["code"] : [],
      redirect_uris: preset.redirects ? redirect_uris : [],
      is_first_party,
    });
    credentials = { clientId: created.client_id, secret: created.client_secret };

    return `Created ${name}.`;
  });
  if (credentials !== undefined && credentials.secret === null) {
    // Nothing to show once: go straight to it.
    redirect(`/applications/${credentials.clientId}` as Route);
  }

  return { ...state, ...(credentials !== undefined ? { credentials } : {}) };
}

const GRANTS = [
  "authorization_code",
  "refresh_token",
  "client_credentials",
  "urn:ietf:params:oauth:grant-type:device_code",
] as const satisfies readonly GrantType[];

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(200),
  token_endpoint_auth_method: z.enum(["none", "client_secret_basic", "client_secret_post"]).optional(),
  redirect_uris: lines,
  post_logout_redirect_uris: lines,
  grant_types: z.array(z.enum(GRANTS)),
  backchannel_logout_uri: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.url("Enter an https URL.").nullable()),
  backchannel_logout_session_required: z.boolean(),
  require_pkce: z.boolean().optional(),
  mfa_policy: z.enum(["optional", "required"]),
  dpop_bound_access_tokens: z.boolean().optional(),
});

export async function updateApplication(
  clientId: string,
  confidential: boolean,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = parse(settingsSchema, {
    name: form.get("name"),
    token_endpoint_auth_method: confidential ? form.get("token_endpoint_auth_method") : undefined,
    redirect_uris: form.get("redirect_uris") ?? "",
    post_logout_redirect_uris: form.get("post_logout_redirect_uris") ?? "",
    grant_types: form.getAll("grant_types"),
    backchannel_logout_uri: form.get("backchannel_logout_uri") ?? "",
    backchannel_logout_session_required: form.get("backchannel_logout_session_required") === "on",
    require_pkce: confidential ? form.get("require_pkce") === "on" : undefined,
    mfa_policy: form.get("mfa_policy") === "on" ? "required" : "optional",
    // The dashboard sends no DPoP proofs: requiring them of its own application would lock every
    // operator out, so that switch is never sent, whatever the form says.
    dpop_bound_access_tokens:
      clientId === config().clientId ? undefined : form.get("dpop_bound_access_tokens") === "on",
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  const settings = parsed.data;

  return perform(async ({ api }) => {
    await api.clients.update(clientId, {
      ...settings,
      response_types: settings.grant_types.includes("authorization_code") ? ["code"] : [],
    });
    refresh();

    return "Settings saved.";
  });
}

export async function rotateSecret(clientId: string): Promise<CredentialsState> {
  let credentials: { clientId: string; secret: string | null } | undefined;
  const state = await perform(async ({ api }) => {
    const rotated = await api.clients.rotateSecret(clientId);
    credentials = { clientId: rotated.client_id, secret: rotated.client_secret };

    return "Secret rotated. The old one no longer works.";
  });

  return { ...state, ...(credentials !== undefined ? { credentials } : {}) };
}

export async function replaceConnections(clientId: string, connections: string[]): Promise<ActionState> {
  const parsed = parse(z.array(z.string().min(1).max(64)).max(100), connections);
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.clients.replaceConnections(clientId, parsed.data);
    refresh();

    return "Connections saved.";
  });
}

export async function deleteApplication(clientId: string): Promise<ActionState> {
  const state = await perform(async ({ api }) => {
    await api.clients.delete(clientId);

    return "Application deleted.";
  });
  if (state.status === "success") {
    redirect("/applications");
  }

  return state;
}

/** Replace the application's custom claims with the editor's rows. */
export async function saveApplicationClaims(clientId: string, drafts: unknown): Promise<ActionState> {
  return saveClaims(drafts, true, (api, claims) =>
    api.clients.update(clientId, { claims: claims as ApplicationClaimMapping[] }),
  );
}
