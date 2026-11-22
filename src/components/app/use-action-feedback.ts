"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/server/action-state";

/**
 * Toast each new outcome of a server action once — the success, or the reason it was
 * refused — and run `onSuccess` (closing a dialog, resetting a form).
 */
export function useActionFeedback(state: ActionState, onSuccess?: () => void): void {
  const seen = useRef<number | null>(null);
  const succeeded = useEffectEvent(() => onSuccess?.());

  useEffect(() => {
    if (state.status === "idle" || seen.current === state.at) {
      return;
    }
    seen.current = state.at;
    if (state.status === "success") {
      toast.success(state.message);
      succeeded();
    } else {
      toast.error(state.message);
    }
  }, [state]);
}
