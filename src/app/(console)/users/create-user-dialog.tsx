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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fieldError, IDLE } from "@/server/action-state";

import { createUser } from "./actions";

/** A new account with a password, in one of the pools — the operator lands on it once made. */
export function CreateUserDialog({ pools }: { pools: readonly { name: string; displayName: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createUser, IDLE);
  useActionFeedback(state);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden /> Create user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Create a user</DialogTitle>
            <DialogDescription>They sign in with this address and password; they can change both.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-6">
            <TextField
              name="email"
              label="Email"
              type="email"
              autoComplete="off"
              required
              error={fieldError(state, "email")}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              description="8 to 72 characters."
              error={fieldError(state, "password")}
            />
            <TextField name="name" label="Name" autoComplete="off" error={fieldError(state, "name")} />
            {pools.length > 1 ? (
              <Field>
                <FieldLabel htmlFor="create-user-connection">Connection</FieldLabel>
                <Select name="connection" defaultValue={pools[0]?.name}>
                  <SelectTrigger id="create-user-connection" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pools.map((pool) => (
                      <SelectItem key={pool.name} value={pool.name}>
                        {pool.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <SwitchField
              name="email_verified"
              label="Email verified"
              description="Mark the address as confirmed, as if they had followed a link."
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
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
