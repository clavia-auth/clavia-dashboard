import { LockIcon } from "lucide-react";

import type { ManagementScope } from "@/contract";

import { EmptyState } from "./empty-state";

/** What a page shows where the operator's roles do not reach: what is missing, by name. */
export function Restricted({ scope, what }: { scope: ManagementScope; what: string }) {
  return (
    <EmptyState
      icon={LockIcon}
      title={`You can't see ${what}`}
      description={
        <>
          Your roles on the Management API do not grant <code className="font-mono text-xs">{scope}</code>. Ask an
          administrator for a role that does, then sign in again.
        </>
      }
    />
  );
}
