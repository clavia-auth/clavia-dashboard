"use client";

import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import type { ActionState } from "@/server/action-state";

import { useActionFeedback } from "./use-action-feedback";

/**
 * An action that asks first: a dialog saying what will happen, then the server action,
 * its outcome toasted. Either `trigger` opens it (a button), or the caller controls it
 * with `open` — what a menu item does, since the menu unmounts as it closes.
 */
export function ConfirmAction({
  trigger,
  open: controlled,
  onOpenChange,
  title,
  description,
  confirm,
  destructive = false,
  action,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirm: string;
  destructive?: boolean;
  action: () => Promise<ActionState>;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlled ?? uncontrolled;
  const setOpen = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
  };
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  useActionFeedback(state, () => setOpen(false));

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      {trigger !== undefined ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => {
              // Stay open until the action answers.
              event.preventDefault();
              startTransition(async () => setState(await action()));
            }}
          >
            {pending ? <Spinner /> : null}
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
