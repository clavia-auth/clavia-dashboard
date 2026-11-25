import "server-only";

import { redirect, unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { isManagementError } from "@/core/management/errors";

import type { ActionState } from "./action-state";
import { signedIn, type SignedIn, stepUp } from "./operator";

export { type ActionState, IDLE } from "./action-state";

/**
 * Run a mutation on behalf of the signed-in operator, turning the API's refusals into a
 * state the form can show. The operator is re-read here, whatever the page showed: an
 * action is an endpoint anyone can POST to.
 */
export async function perform(work: (context: SignedIn) => Promise<string>): Promise<ActionState> {
  const context = await signedIn();
  try {
    return { status: "success", message: await work(context), at: Date.now() };
  } catch (error) {
    unstable_rethrow(error);
    if (!isManagementError(error)) {
      throw error;
    }
    if (error.kind === "unauthenticated") {
      redirect("/auth/sign-in");
    }
    if (error.kind === "step_up_required") {
      await stepUp(error);
    }
    const fields: Record<string, string> = {};
    for (const field of error.fields) {
      const pointer = field.pointer?.replace(/^\//, "") ?? null;
      const name = pointer?.split("/")[0] ?? field.parameter;
      if (name !== null && name !== undefined && name !== "" && fields[name] === undefined) {
        fields[name] = field.detail;
      }
      // A refusal of one entry of a list or one key of an object (`claims/2`) is kept under its
      // whole pointer too, for the editor that shows it where it happened.
      if (pointer !== null && pointer.includes("/") && fields[pointer] === undefined) {
        fields[pointer] = field.detail;
      }
    }
    const message =
      error.kind === "forbidden" && error.scope !== null
        ? `Your roles do not grant ${error.scope}, which this needs.`
        : error.message;

    return { status: "error", message, fields, at: Date.now() };
  }
}

/** The form's fields checked against `schema`, or the state that says what is wrong with them. */
export function parse<T extends z.ZodType>(
  schema: T,
  values: unknown,
): { ok: true; data: z.output<T> } | { ok: false; state: ActionState } {
  const result = schema.safeParse(values);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const name = String(issue.path[0] ?? "");
    fields[name] ??= issue.message;
  }

  const [first, ...others] = result.error.issues;
  const message =
    others.length === 0
      ? (first?.message ?? "Check the form.")
      : `${first?.message ?? "Check the form."} (and ${others.length} more)`;

  return { ok: false, state: { status: "error", message, fields, at: Date.now() } };
}
