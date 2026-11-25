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

/** What one step of the SAML rollover did, in the operator's words. */
const SAML_STEPS = {
  generated: "SAML keys generated. They are current at once.",
  introduced:
    "A next SAML key pair is published beside the current one. Promote it once identity providers have read it.",
  waiting: "Nothing changed: the next pair cannot be promoted yet.",
  promoted: "The next SAML key pair is current. The pair it replaced is retired.",
} as const;

/** One step of the service provider's key rollover: generate, introduce a next pair, wait, or promote it. */
export async function rotateSamlKeys(): Promise<ActionState> {
  return perform(async ({ api }) => {
    const rotation = await api.samlKeys.rotate();
    refresh();

    return SAML_STEPS[rotation.step];
  });
}
