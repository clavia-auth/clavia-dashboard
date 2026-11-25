"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ALL_EVENTS, SUBSCRIBABLE } from "@/components/webhooks/events";
import { type ActionState, parse, perform } from "@/server/actions";

/** An endpoint's secret, handed to the form once: Clavia keeps it sealed and never shows it again. */
export type SecretState = ActionState & { readonly issued?: { secret: string; url: string } };

const urlSchema = z
  .string()
  .trim()
  .min(9, "An https address, such as https://example.com/hooks.")
  .max(2048, "At most 2048 characters.")
  .refine((value) => value.startsWith("https://"), "It must start with https://.");
const descriptionSchema = z.string().trim().max(120, "At most 120 characters.");
const eventsSchema = z
  .array(z.string())
  .min(1, "Pick at least one event, or choose every event.")
  .refine((events) => events.every((event) => event === ALL_EVENTS || (SUBSCRIBABLE as string[]).includes(event)), {
    message: "Pick events from the list.",
  });

/** What the picker posted: every event, or the types ticked. */
function eventsOf(form: FormData): string[] {
  return form.get("all_events") === "on" ? [ALL_EVENTS] : form.getAll("events").map(String);
}

const createSchema = z.object({ url: urlSchema, description: descriptionSchema, events: eventsSchema });

export async function createWebhook(_: SecretState, form: FormData): Promise<SecretState> {
  const parsed = parse(createSchema, {
    url: form.get("url"),
    description: form.get("description") ?? "",
    events: eventsOf(form),
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  let issued: SecretState["issued"];
  const state = await perform(async ({ api }) => {
    const created = await api.webhooks.create(parsed.data);
    issued = { secret: created.secret, url: created.url };
    refresh();

    return "Webhook created.";
  });

  return { ...state, ...(issued !== undefined ? { issued } : {}) };
}

const updateSchema = z.object({
  description: descriptionSchema,
  url: urlSchema.optional(),
  events: eventsSchema.optional(),
});

/**
 * Save an endpoint. Where it points and what it hears are sent only when the operator may change
 * them (`retarget`: Clavia also asks for `read:audit_events`), so a disabled field is never read as empty.
 */
export async function updateWebhook(
  webhookId: string,
  retarget: boolean,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = parse(updateSchema, {
    description: form.get("description") ?? "",
    url: retarget ? form.get("url") : undefined,
    events: retarget ? eventsOf(form) : undefined,
  });
  if (!parsed.ok) {
    return parsed.state;
  }

  return perform(async ({ api }) => {
    await api.webhooks.update(webhookId, parsed.data);
    refresh();

    return "Webhook saved.";
  });
}

export async function setWebhookEnabled(webhookId: string, enabled: boolean): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.webhooks.update(webhookId, { is_enabled: enabled });
    refresh();

    return enabled ? "Webhook switched on." : "Webhook switched off. Nothing is sent to it.";
  });
}

// `useActionState` hands the previous state first; a rotation has no use for it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function rotateWebhookSecret(webhookId: string, _: SecretState): Promise<SecretState> {
  let issued: SecretState["issued"];
  const state = await perform(async ({ api }) => {
    const rotated = await api.webhooks.rotateSecret(webhookId);
    issued = { secret: rotated.secret, url: rotated.url };
    refresh();

    return "Secret rotated. The previous one signs for 24 more hours.";
  });

  return { ...state, ...(issued !== undefined ? { issued } : {}) };
}

export async function testWebhook(webhookId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.webhooks.test(webhookId);
    refresh();

    return "Test event queued. It is sent within the minute: see the deliveries.";
  });
}

export async function deleteWebhook(webhookId: string): Promise<ActionState> {
  const state = await perform(async ({ api }) => {
    await api.webhooks.delete(webhookId);

    return "Webhook deleted.";
  });
  if (state.status === "success") {
    redirect("/webhooks");
  }

  return state;
}
