"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";

/**
 * When a page could not be built — the Management API down, an answer it did not expect.
 * What went wrong is in the server's log under `digest`; the browser is told nothing more.
 */
export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlertIcon}
      title="This page could not be loaded"
      description={
        <>
          Clavia did not answer as expected. Try again in a moment.
          {error.digest !== undefined ? (
            <span className="mt-2 block font-mono text-xs">Reference {error.digest}</span>
          ) : null}
        </>
      }
    >
      <Button variant="outline" onClick={reset}>
        <RotateCwIcon aria-hidden /> Try again
      </Button>
    </EmptyState>
  );
}
