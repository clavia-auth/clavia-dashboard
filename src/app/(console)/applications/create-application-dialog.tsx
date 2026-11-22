"use client";

import { PlusIcon } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { LinesField, SwitchField, TextField } from "@/components/app/form-fields";
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
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { fieldError, IDLE } from "@/server/action-state";

import { createApplication, type CredentialsState } from "./actions";
import { KINDS, type Kind } from "./kinds";

/** Register an application from one of the kinds; a confidential one's secret is shown once. */
export function CreateApplicationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("web");
  const [state, action, pending] = useActionState<CredentialsState, FormData>(createApplication, IDLE);
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  useActionFeedback(state, () => setOpen(false));
  const credentials = state.credentials;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon aria-hidden /> Create application
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
          <form action={action}>
            <DialogHeader>
              <DialogTitle>Create an application</DialogTitle>
              <DialogDescription>Pick what it is; every setting can be changed afterwards.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-6">
              <TextField name="name" label="Name" required maxLength={200} error={fieldError(state, "name")} />
              <FieldSet>
                <FieldLegend variant="label">Kind</FieldLegend>
                <RadioGroup
                  name="kind"
                  value={kind}
                  onValueChange={(value) => setKind(value as Kind)}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {(Object.entries(KINDS) as [Kind, (typeof KINDS)[Kind]][]).map(([value, preset]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value={value} className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium">{preset.label}</span>
                        <span className="block text-xs text-muted-foreground">{preset.description}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </FieldSet>
              {KINDS[kind].redirects ? (
                <LinesField
                  name="redirect_uris"
                  label="Redirect URIs"
                  placeholder="https://app.example/callback"
                  description="One per line, matched exactly. Where Clavia sends the browser back with a code."
                  error={fieldError(state, "redirect_uris")}
                />
              ) : null}
              <SwitchField
                name="is_first_party"
                label="First-party"
                description="Yours: it can skip consent and reach the Management API. A third-party one never can — and stays third-party."
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
                Create application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {credentials?.secret != null ? (
        <SecretDialog
          clientId={credentials.clientId}
          secret={credentials.secret}
          open={acknowledged !== credentials.clientId}
          onDone={() => {
            setAcknowledged(credentials.clientId);
            router.push(`/applications/${credentials.clientId}` as Route);
          }}
        />
      ) : null}
    </>
  );
}
