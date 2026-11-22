"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";

import { setConnectionEnabled } from "./actions";

/** Switch a connection on or off in place — shown at once, put back if Clavia refuses. */
export function EnabledSwitch({
  name,
  label,
  enabled,
  editable,
}: {
  name: string;
  label: string;
  enabled: boolean;
  editable: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      aria-label={`${label} is ${optimistic ? "on" : "off"}`}
      checked={optimistic}
      disabled={!editable || pending}
      onCheckedChange={(on) =>
        startTransition(async () => {
          setOptimistic(on);
          const state = await setConnectionEnabled(name, on);
          if (state.status === "success") {
            toast.success(state.message);
          } else if (state.status === "error") {
            toast.error(state.message);
          }
        })
      }
    />
  );
}
