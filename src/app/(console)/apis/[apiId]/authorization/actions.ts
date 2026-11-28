"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { DenialReason } from "@/contract";
import { SUBJECT_TYPES } from "@/core/authorization/model";
import { type ActionState, parse, perform } from "@/server/actions";
import { modelLanguage } from "@/server/container";

/** OpenFGA's limit on a model, and so Clavia's. */
const MODEL_LIMIT = 256 * 1024;

const settingsSchema = z.object({
  model: z.string().trim().min(1, "Write the model.").max(MODEL_LIMIT, "A model is 256 KiB at most."),
  clients: z
    .array(z.string().min(1))
    .max(20, "Twenty clients at most speak for an API.")
    .refine((clients) => new Set(clients).size === clients.length, { message: "Each client appears once." }),
  denial_reasons: z.boolean(),
});

/**
 * Turn the API's authorization on, or change it: the model as the operator wrote it, read into
 * OpenFGA's JSON here, and the clients that speak for the API. A model whose syntax is wrong never
 * leaves the dashboard; whether it makes sense is the engine's to say.
 */
export async function saveAuthorization(apiId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(settingsSchema, {
    model: form.get("model"),
    // Checked boxes, one id each, or ids typed one per line where the operator cannot list clients.
    clients: form
      .getAll("clients")
      .flatMap((value) => String(value).split(/\s+/))
      .filter((value) => value !== ""),
    denial_reasons: form.get("denial_reasons") === "on",
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  const reading = modelLanguage().read(parsed.data.model);
  if (!reading.ok) {
    const [first, ...others] = reading.problems;
    const where =
      first?.line === null || first?.line === undefined ? "" : `Line ${first.line}, column ${first.column}: `;
    const message = `${where}${first?.message ?? "The model cannot be read."}${others.length > 0 ? ` (and ${others.length} more)` : ""}`;

    return { status: "error", message, fields: { model: message }, at: Date.now() };
  }

  return perform(async ({ api }) => {
    await api.authorization.put(apiId, {
      model: reading.model,
      clients: parsed.data.clients,
      denial_reasons: parsed.data.denial_reasons,
    });
    refresh();

    return "Authorization saved. The API's clients get decisions from this model.";
  });
}

/** Turn it off, keeping the store: its clients are refused until it is turned on again. */
export async function turnOffAuthorization(apiId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.authorization.turnOff(apiId);
    refresh();

    return "Authorization turned off. The store and its relationships are kept.";
  });
}

/** Delete the store and every relationship in it. */
export async function deleteAuthorizationStore(apiId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.authorization.deleteStore(apiId);
    refresh();

    return "Store deleted, with every relationship in it.";
  });
}

/** What a decision tried from the dashboard came to, beside the form's own state. */
export type Trial =
  | ActionState
  | Readonly<{
      status: "answered";
      decision: boolean;
      reason: DenialReason | null;
      question: string;
      at: number;
    }>;

const entity = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Name the ${what}.`)
    .max(256)
    .regex(/^[^#:\s]+$/, `A ${what}'s id has no space, # or :.`);

const trialSchema = z.object({
  subject_type: z.enum(SUBJECT_TYPES, "Choose who the question is about."),
  subject: z.string().trim().min(1, "Name the person or the application.").max(320),
  action: z.string().trim().min(1, "Choose the relation to ask about.").max(50),
  resource_type: z
    .string()
    .trim()
    .min(1, "Choose the resource's type.")
    .max(254)
    .regex(/^[^:#@\s]+$/, "Choose the resource's type."),
  resource: entity("resource"),
  context: z
    .string()
    .trim()
    .max(16 * 1024, "The context is 16 KiB at most.")
    .transform((text, ctx) => {
      if (text === "") {
        return undefined;
      }
      try {
        const value: unknown = JSON.parse(text);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          if ("clavia" in value) {
            ctx.addIssue({ code: "custom", message: "The context has no clavia: Clavia adds its facts itself." });

            return z.NEVER;
          }

          return value as Record<string, unknown>;
        }
      } catch {
        // Said below.
      }
      ctx.addIssue({ code: "custom", message: 'The context is a JSON object, such as {"network": "office"}.' });

      return z.NEVER;
    }),
});

/**
 * Ask the API's store one question, as its own clients would, and say what they would be told.
 * A person can be named by their address, which is looked up when the operator may read users.
 * Nothing is saved, and nothing reaches the audit trail.
 */
export async function tryDecision(apiId: string, _: Trial, form: FormData): Promise<Trial> {
  const parsed = parse(trialSchema, {
    subject_type: form.get("subject_type"),
    subject: form.get("subject"),
    action: form.get("action"),
    resource_type: form.get("resource_type"),
    resource: form.get("resource"),
    context: form.get("context") ?? "",
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  const { subject_type, subject, action, resource_type, resource, context } = parsed.data;

  let trial: Trial | undefined;
  const state = await perform(async ({ operator, api }) => {
    let subjectId = subject;
    if (subject_type === "user" && subject.includes("@")) {
      if (!operator.can("read:users")) {
        trial = refused(
          "subject",
          "Your roles do not grant read:users, which finding a person by address needs: give their id.",
        );

        return "";
      }
      const found = await api.users.list({ search: subject, perPage: 10 });
      const user = found.items.find((candidate) => candidate.email.toLowerCase() === subject.toLowerCase());
      if (user === undefined) {
        trial = refused("subject", `No user has the address “${subject}”.`);

        return "";
      }
      subjectId = user.id;
    } else if (!/^[^#:\s]+$/.test(subject)) {
      trial = refused("subject", "An id has no space, # or :.");

      return "";
    }

    const answer = await api.authorization.evaluate(apiId, {
      subject: { type: subject_type, id: subjectId },
      action: { name: action },
      resource: { type: resource_type, id: resource },
      ...(context === undefined ? {} : { context }),
    });
    trial = {
      status: "answered",
      decision: answer.decision,
      reason: answer.decision ? null : (answer.context?.reason ?? null),
      question: `May ${subject_type}:${subject} be ${action} of ${resource_type}:${resource}?`,
      at: Date.now(),
    };

    return "";
  });

  if (state.status === "error") {
    return state;
  }

  return trial ?? state;
}

function refused(field: string, message: string): ActionState {
  return { status: "error", message, fields: { [field]: message }, at: Date.now() };
}
