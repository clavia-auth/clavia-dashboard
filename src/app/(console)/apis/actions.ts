"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type ActionState, parse, perform } from "@/server/actions";

const createSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(200),
  identifier: z.url("An absolute URI, such as https://api.example/.").trim().max(2048),
  enforce_policies: z.boolean(),
  allow_skipping_consent: z.boolean(),
});

export async function createApi(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(createSchema, {
    name: form.get("name"),
    identifier: form.get("identifier"),
    enforce_policies: form.get("enforce_policies") === "on",
    allow_skipping_consent: form.get("allow_skipping_consent") === "on",
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  let created: string | undefined;
  const state = await perform(async ({ api }) => {
    created = (await api.resourceServers.create({ ...parsed.data, permissions: [], access_token_format: "opaque" })).id;

    return `Created ${parsed.data.name}.`;
  });
  if (created !== undefined) {
    redirect(`/apis/${created}/permissions` as Route);
  }

  return state;
}

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(200),
  enforce_policies: z.boolean().optional(),
  allow_skipping_consent: z.boolean().optional(),
  mfa_policy: z.enum(["optional", "required"]),
});

export async function updateApi(apiId: string, system: boolean, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(settingsSchema, {
    name: form.get("name"),
    // A system API's policies are the server's: they are not sent at all.
    enforce_policies: system ? undefined : form.get("enforce_policies") === "on",
    allow_skipping_consent: system ? undefined : form.get("allow_skipping_consent") === "on",
    mfa_policy: form.get("mfa_policy") === "on" ? "required" : "optional",
  });
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.resourceServers.update(apiId, parsed.data);
    refresh();

    return "Settings saved.";
  });
}

const permissionsSchema = z
  .array(
    z.object({
      value: z
        .string()
        .trim()
        .min(1, "Every permission needs a value.")
        .max(280)
        .regex(/^[\x21\x23-\x5B\x5D-\x7E]+$/, "A permission is one word of visible characters, such as read:items."),
      description: z.string().trim().max(500),
    }),
  )
  .max(200)
  .refine((permissions) => new Set(permissions.map((permission) => permission.value)).size === permissions.length, {
    message: "Each value appears once.",
  });

export async function savePermissions(
  apiId: string,
  permissions: { value: string; description: string }[],
): Promise<ActionState> {
  const parsed = parse(permissionsSchema, permissions);
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.resourceServers.update(apiId, { permissions: parsed.data });
    refresh();

    return "Permissions saved.";
  });
}

export async function deleteApi(apiId: string): Promise<ActionState> {
  const state = await perform(async ({ api }) => {
    await api.resourceServers.delete(apiId);

    return "API deleted.";
  });
  if (state.status === "success") {
    redirect("/apis");
  }

  return state;
}
