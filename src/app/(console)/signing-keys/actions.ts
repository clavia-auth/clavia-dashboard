"use server";

import { refresh } from "next/cache";

import { type ActionState, perform } from "@/server/actions";

/** A new key signs from now on; the one it replaces stays published for the grace period. */
export async function rotateSigningKey(): Promise<ActionState> {
  return perform(async ({ api }) => {
    const { active } = await api.signingKeys.rotate();
    refresh();

    return `Key rotated. ${active.kid.slice(0, 8)}… signs from now on.`;
  });
}
