"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { SwitchField, TextField } from "@/components/app/form-fields";
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

import { createApi } from "./actions";

/** Register an API; its permissions are defined on the next screen. */
export function CreateApiDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createApi, IDLE);
  useActionFeedback(state);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden /> Create API
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Create an API</DialogTitle>
            <DialogDescription>
              What applications name in <code className="font-mono text-xs">audience</code> to get a token for it.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-6">
            <TextField name="name" label="Name" required maxLength={200} error={fieldError(state, "name")} />
            <TextField
              name="identifier"
              label="Identifier"
              placeholder="https://api.example/"
              required
              description="An absolute URI, never changed afterwards: it is the tokens' audience."
              error={fieldError(state, "identifier")}
            />
            <SwitchField
              name="enforce_policies"
              label="Enforce roles"
              description="A person's token carries only what their roles grant here, and somebody holding nothing is refused."
            />
            <SwitchField
              name="allow_skipping_consent"
              label="First-party applications skip consent"
              description="Your own applications are not asked to show the consent screen for it."
              defaultChecked
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
              Create API
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
