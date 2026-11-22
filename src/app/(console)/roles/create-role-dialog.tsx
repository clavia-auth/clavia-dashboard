"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
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
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { fieldError, IDLE } from "@/server/action-state";

import { createRole } from "./actions";

/** A new role; its permissions are chosen on the next screen. */
export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createRole, IDLE);
  useActionFeedback(state);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden /> Create role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Create a role</DialogTitle>
            <DialogDescription>A set of permissions, possibly across APIs, given to people.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-6">
            <TextField
              name="name"
              label="Name"
              required
              maxLength={100}
              placeholder="Support agent"
              error={fieldError(state, "name")}
            />
            <TextField
              name="description"
              label="Description"
              maxLength={500}
              placeholder="Reads accounts to help their owners"
              error={fieldError(state, "description")}
            />
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Create role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
