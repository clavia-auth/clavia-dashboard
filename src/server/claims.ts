import "server-only";

import { refresh } from "next/cache";
import { z } from "zod";

import type { ApplicationClaimMapping, ClaimMapping } from "@/contract";
import { CLAIM_DESTINATIONS, type ClaimDraft, MAX_MAPPINGS, mappingsOf, SOURCE_KINDS } from "@/core/claims/claims";
import type { ManagementApi } from "@/core/management/management-api";

import { type ActionState, parse, perform } from "./actions";

/** What the editor sends: untrusted, so its shape is checked before its meaning. */
const draftsSchema = z
  .array(
    z.object({
      name: z.string().max(255),
      kind: z.enum(SOURCE_KINDS as [string, ...string[]]),
      detail: z.string().max(330),
      value: z.string().max(4096),
      in: z.array(z.enum(CLAIM_DESTINATIONS as [string, ...string[]])).max(CLAIM_DESTINATIONS.length),
    }),
  )
  .max(MAX_MAPPINGS, `At most ${MAX_MAPPINGS} claims.`);

/**
 * Replace a list of mappings with the editor's rows. What the dashboard can tell is refused
 * at the row; the rest is Clavia's, whose refusals come back pointing at an entry
 * (`/claims/2`) and are shown there.
 */
export async function saveClaims(
  drafts: unknown,
  application: boolean,
  send: (api: ManagementApi, mappings: (ClaimMapping | ApplicationClaimMapping)[]) => Promise<unknown>,
): Promise<ActionState> {
  const shaped = parse(draftsSchema, drafts);
  if (!shaped.ok) {
    return shaped.state;
  }
  const mapped = mappingsOf(shaped.data as ClaimDraft[], application);
  if (!mapped.ok) {
    const fields = Object.fromEntries(mapped.problems.map((problem) => [`claims/${problem.index}`, problem.message]));

    return {
      status: "error",
      message:
        mapped.problems.length === 1
          ? "One claim is not complete."
          : `${mapped.problems.length} claims are not complete.`,
      fields,
      at: Date.now(),
    };
  }

  return perform(async ({ api }) => {
    await send(api, mapped.mappings);
    refresh();

    return "Claims saved.";
  });
}
