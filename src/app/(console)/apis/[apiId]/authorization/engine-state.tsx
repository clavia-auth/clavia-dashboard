import { CloudOffIcon, DatabaseIcon, ServerOffIcon } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { Card } from "@/components/ui/card";

import type { EngineRead } from "./data";

/** What a tab shows when the decision engine gave it nothing to show. */
export function EngineState({ read }: { read: Extract<EngineRead<unknown>, { ok: false }> }) {
  const [icon, title, description] =
    read.reason === "no_store"
      ? [
          DatabaseIcon,
          "No store yet",
          "Authorization was never turned on for this API, or its store was deleted. Write a model in the Model tab and turn it on.",
        ]
      : read.reason === "no_engine"
        ? [
            ServerOffIcon,
            "No decision engine",
            "This Clavia deployment is not connected to a decision engine (OpenFGA, CLAVIA_FGA_URL), so there is nothing to read.",
          ]
        : [CloudOffIcon, "Nothing to show", read.message];

  return (
    <Card className="py-0">
      <EmptyState icon={icon} title={title} description={description} />
    </Card>
  );
}
