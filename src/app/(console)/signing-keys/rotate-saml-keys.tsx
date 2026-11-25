"use client";

import { RefreshCwIcon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { Button } from "@/components/ui/button";

import { rotateSamlKeys } from "./actions";

/** One step of the rollover, after saying what it does: it is a sequence, not a swap. */
export function RotateSamlKeys({ first }: { first: boolean }) {
  return (
    <ConfirmAction
      trigger={
        <Button variant="outline">
          <RefreshCwIcon aria-hidden /> {first ? "Generate keys" : "Rotate keys"}
        </Button>
      }
      title={first ? "Generate the SAML keys?" : "Take the next step of the rotation?"}
      description={
        first ? (
          "Clavia makes the first pair, current at once: one key signs requests, one receives encrypted assertions."
        ) : (
          <>
            A rotation takes steps. With no next pair, one is published beside the current pair, and nothing is used
            yet: identity providers that read this server&apos;s metadata get time to learn it. Once that time has
            passed, the next step makes it current and retires the pair it replaces, whose encryption key still decrypts
            for as long again. Identity providers that pinned the certificates by hand need the new ones before then.
          </>
        )
      }
      confirm={first ? "Generate keys" : "Take the step"}
      action={rotateSamlKeys}
    />
  );
}
