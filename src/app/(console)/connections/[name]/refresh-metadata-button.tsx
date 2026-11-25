"use client";

import { RefreshCwIcon } from "lucide-react";
import { useActionState } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IDLE } from "@/server/action-state";

import { refreshSamlMetadata } from "../actions";

/** Read the identity provider's metadata again, after it rolled a certificate over. */
export function RefreshMetadataButton({ name }: { name: string }) {
  const [state, action, pending] = useActionState(refreshSamlMetadata.bind(null, name), IDLE);
  useActionFeedback(state);

  return (
    <form action={action}>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Spinner /> : <RefreshCwIcon aria-hidden />} Refresh metadata
      </Button>
    </form>
  );
}
