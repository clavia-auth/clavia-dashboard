"use client";

import { PencilIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import type { Role } from "@/contract";
import { type ActionState, IDLE } from "@/server/action-state";

import { replaceRoles } from "../../actions";

/** Choose exactly the roles the account holds — given and taken in one change. */
export function RolesEditor({
  userId,
  roles,
  held,
}: {
  userId: string;
  roles: readonly Role[];
  held: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set(held));
  const [state, setState] = useState<ActionState>(IDLE);
  const [pending, startTransition] = useTransition();
  useActionFeedback(state, () => setOpen(false));

  const toggle = (roleId: string, on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      if (on) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }

      return next;
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setChosen(new Set(held));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon aria-hidden /> Edit roles
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Roles</DialogTitle>
          <DialogDescription>
            What they hold decides what their tokens may carry, on every API enforcing roles.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80 rounded-md border">
          <ul className="divide-y">
            {roles.map((role) => (
              <li key={role.id}>
                <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50">
                  <Checkbox
                    checked={chosen.has(role.id)}
                    onCheckedChange={(checked) => toggle(role.id, checked === true)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{role.name}</span>
                    {role.description !== "" ? (
                      <span className="block text-xs text-muted-foreground">{role.description}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            disabled={pending}
            onClick={() => startTransition(async () => setState(await replaceRoles(userId, [...chosen])))}
          >
            {pending ? <Spinner /> : null}
            Save roles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
