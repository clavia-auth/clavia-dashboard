"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { TextField } from "@/components/app/form-fields";
import { SecretDialog } from "@/components/app/secret-dialog";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fieldError, IDLE } from "@/server/action-state";

import { type IssuedState, issueInitialAccessToken } from "./actions";
import { DEFAULT_EXPIRY, EXPIRIES } from "./expiries";

/** Issue an initial access token; its value is shown once, when Clavia hands it out. */
export function IssueTokenDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<IssuedState, FormData>(issueInitialAccessToken, IDLE);
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  useActionFeedback(state, () => setOpen(false));
  const issued = state.issued;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon aria-hidden /> Issue token
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <form action={action}>
            <DialogHeader>
              <DialogTitle>Issue an initial access token</DialogTitle>
              <DialogDescription>
                Hand it to the partner whose software may register itself. Each client it registers is third-party, and
                never reaches a system API.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-6">
              <TextField
                name="description"
                label="Description"
                description="Who it is for. The token is never shown again, so this is how you tell it apart."
                required
                maxLength={120}
                error={fieldError(state, "description")}
              />
              <TextField
                name="max_uses"
                label="Registrations"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                defaultValue={1}
                required
                description="How many clients it may register."
                error={fieldError(state, "max_uses")}
              />
              <Field>
                <FieldLabel htmlFor="expires-in">Expires after</FieldLabel>
                <Select name="expires_in" defaultValue={String(DEFAULT_EXPIRY)}>
                  <SelectTrigger id="expires-in" className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRIES.map((expiry) => (
                      <SelectItem key={expiry.seconds} value={String(expiry.seconds)}>
                        {expiry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>It stops working then, whether or not it was used.</FieldDescription>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                Issue token
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {issued !== undefined ? (
        <SecretDialog
          secret={issued.token}
          title="Copy the token now"
          label={`Token for ${issued.description}`}
          lost="revoke it and issue another."
          open={acknowledged !== issued.token}
          onDone={() => setAcknowledged(issued.token)}
        />
      ) : null}
    </>
  );
}
