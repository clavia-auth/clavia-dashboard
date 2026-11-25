"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { TextField } from "@/components/app/form-fields";
import { SecretDialog } from "@/components/app/secret-dialog";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { EventPicker } from "@/components/webhooks/event-picker";
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

import { createWebhook, type SecretState } from "./actions";

/** Register an endpoint; its secret is shown once, when Clavia generates it. */
export function CreateWebhookDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SecretState, FormData>(createWebhook, IDLE);
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  useActionFeedback(state, () => setOpen(false));
  const issued = state.issued;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon aria-hidden /> Add webhook
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form action={action}>
            <DialogHeader>
              <DialogTitle>Add a webhook</DialogTitle>
              <DialogDescription>
                Clavia sends each event you pick to this address, signed with a secret it shows once.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-6">
              <TextField
                name="url"
                label="URL"
                type="url"
                inputMode="url"
                placeholder="https://example.com/hooks/clavia"
                description="https only. It is checked now and again before every delivery: an address that resolves to a private network is refused."
                required
                maxLength={2048}
                error={fieldError(state, "url")}
              />
              <TextField
                name="description"
                label="Description"
                description="What receives it, so you can tell endpoints apart."
                maxLength={120}
                error={fieldError(state, "description")}
              />
              <EventPicker error={fieldError(state, "events")} />
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                Add webhook
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {issued !== undefined ? (
        <SecretDialog
          secret={issued.secret}
          title="Copy the signing secret now"
          label={`Secret for ${issued.url}`}
          lost="rotate it."
          open={acknowledged !== issued.secret}
          onDone={() => setAcknowledged(issued.secret)}
        />
      ) : null}
    </>
  );
}
