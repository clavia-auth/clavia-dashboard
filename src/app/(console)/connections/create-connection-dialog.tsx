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
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { fieldError, IDLE } from "@/server/action-state";

import { createConnection } from "./actions";
import { SelfServiceFields } from "./self-service-fields";
import { STRATEGIES } from "./strategy";

type Creatable = "database" | "oidc";

/** A new pool of password accounts, or an OpenID Connect provider found from its issuer. */
export function CreateConnectionDialog() {
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<Creatable>("database");
  const [state, action, pending] = useActionState(createConnection, IDLE);
  useActionFeedback(state);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon aria-hidden /> Create connection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>Create a connection</DialogTitle>
            <DialogDescription>Applications offer it once you enable it on them.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-6">
            <FieldSet>
              <FieldLegend variant="label">Kind</FieldLegend>
              <RadioGroup
                name="strategy"
                value={strategy}
                onValueChange={(value) => setStrategy(value as Creatable)}
                className="grid gap-2 sm:grid-cols-2"
              >
                {(["database", "oidc"] as const).map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem value={value} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{STRATEGIES[value].label}</span>
                      <span className="block text-xs text-muted-foreground">{STRATEGIES[value].description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </FieldSet>
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                name="name"
                label="Name"
                required
                placeholder={strategy === "oidc" ? "okta" : "staff"}
                description="In URLs and the API; never changed."
                error={fieldError(state, "name")}
              />
              <TextField
                name="display_name"
                label="Display name"
                required
                placeholder={strategy === "oidc" ? "Okta" : "Staff accounts"}
                description="What the login page shows."
                error={fieldError(state, "display_name")}
              />
            </div>
            {strategy === "oidc" ? (
              <>
                <TextField
                  name="oidc_issuer"
                  label="Issuer"
                  type="url"
                  required
                  placeholder="https://example.okta.com"
                  description="Clavia reads the provider's discovery document from it, over https, never at a private address."
                  error={fieldError(state, "oidc_issuer")}
                />
                <div className="grid gap-6 sm:grid-cols-2">
                  <TextField
                    name="oidc_client_id"
                    label="Client ID"
                    required
                    autoComplete="off"
                    error={fieldError(state, "oidc_client_id")}
                  />
                  <TextField
                    name="oidc_client_secret"
                    label="Client secret"
                    type="password"
                    required
                    autoComplete="off"
                    description="Stored encrypted."
                    error={fieldError(state, "oidc_client_secret")}
                  />
                </div>
                <TextField
                  name="oidc_scope"
                  label="Scope"
                  placeholder="openid email profile"
                  error={fieldError(state, "oidc_scope")}
                />
              </>
            ) : (
              <SelfServiceFields />
            )}
            <SwitchField
              name="is_domain_connection"
              label="Domain connection"
              description="Third-party applications offer it too. They offer domain connections and no others."
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
              Create connection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
