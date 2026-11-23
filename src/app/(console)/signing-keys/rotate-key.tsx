"use client";

import { RefreshCwIcon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { Button } from "@/components/ui/button";

import { rotateSigningKey } from "./actions";

/** Replaces the active key, after saying what happens to the one it replaces. */
export function RotateKey() {
  return (
    <ConfirmAction
      trigger={
        <Button variant="outline">
          <RefreshCwIcon aria-hidden /> Rotate key
        </Button>
      }
      title="Rotate the signing key?"
      description={
        <>
          A new key signs every token from now on. The current key stops signing at once, and stays published for a
          grace period of twice the longest token lifetime plus a day, so tokens it already signed keep verifying until
          they expire. Applications that fetch the key set again on an unknown key pick up the new one straight away.
        </>
      }
      confirm="Rotate key"
      action={rotateSigningKey}
    />
  );
}
