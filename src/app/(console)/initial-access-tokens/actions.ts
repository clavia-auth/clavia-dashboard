"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { type ActionState, parse, perform } from "@/server/actions";

import { EXPIRIES } from "./expiries";

/** An issued token's value, handed to the form once: Clavia keeps only its digest. */
export type IssuedState = ActionState & { readonly issued?: { token: string; description: string } };

const issueSchema = z.object({
  description: z.string().trim().min(1, "Say who it is for.").max(120, "At most 120 characters."),
  max_uses: z.coerce.number().int("A whole number.").min(1, "At least 1.").max(1000, "At most 1000."),
  expires_in: z.coerce
    .number()
    .refine((seconds) => EXPIRIES.some((expiry) => expiry.seconds === seconds), "Pick one of the durations."),
});

export async function issueInitialAccessToken(_: IssuedState, form: FormData): Promise<IssuedState> {
  const parsed = parse(issueSchema, {
    description: form.get("description"),
    max_uses: form.get("max_uses"),
    expires_in: form.get("expires_in"),
  });
  if (!parsed.ok) {
    return parsed.state;
  }
  let issued: { token: string; description: string } | undefined;
  const state = await perform(async ({ api }) => {
    const created = await api.initialAccessTokens.issue(parsed.data);
    issued = { token: created.token, description: created.description };
    refresh();

    return `Issued “${created.description}”.`;
  });

  return { ...state, ...(issued !== undefined ? { issued } : {}) };
}

export async function revokeInitialAccessToken(tokenId: string): Promise<ActionState> {
  return perform(async ({ api }) => {
    await api.initialAccessTokens.revoke(tokenId);
    refresh();

    return "Token revoked. It registers nothing more.";
  });
}
