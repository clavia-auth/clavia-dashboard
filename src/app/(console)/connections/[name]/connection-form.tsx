"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState } from "react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { SwitchField, TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { Connection } from "@/contract";
import { fieldError, IDLE } from "@/server/action-state";

import { deleteConnection, updateConnection } from "../actions";
import { SelfServiceFields } from "../self-service-fields";

export function ConnectionForm({ connection, editable }: { connection: Connection; editable: boolean }) {
  const oidc = connection.strategy === "oidc";
  const pool = connection.strategy === "database";
  const enterprise = oidc || connection.strategy === "saml";
  const [state, action, pending] = useActionState(
    updateConnection.bind(null, connection.name, connection.strategy),
    IDLE,
  );
  useActionFeedback(state);

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Switched off, nobody signs in through it — whatever the applications enabling it say.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={!editable || pending}>
            <FieldGroup>
              <TextField
                name="display_name"
                label="Display name"
                defaultValue={connection.display_name}
                required
                maxLength={100}
                className="max-w-md"
                error={fieldError(state, "display_name")}
              />
              <SwitchField
                name="is_enabled"
                label="On"
                description="Whether anybody may sign in through it."
                defaultChecked={connection.is_enabled}
              />
              <SwitchField
                name="is_domain_connection"
                label="Domain connection"
                description="Third-party applications offer it too."
                defaultChecked={connection.is_domain_connection}
              />
              {pool ? (
                <>
                  <FieldSeparator />
                  <SelfServiceFields
                    allowSignUp={connection.allow_sign_up}
                    requireVerifiedEmail={connection.require_verified_email}
                  />
                </>
              ) : null}
              {enterprise ? (
                <>
                  <FieldSeparator />
                  <SwitchField
                    name="require_provisioning"
                    label="Only people a directory provisioned"
                    description="Nobody else's account is created by signing in, and somebody the directory removes cannot come back. Set up the directory first, below: until it has provisioned people, nobody signs in."
                    defaultChecked={connection.require_provisioning}
                  />
                </>
              ) : null}
              {oidc ? (
                <>
                  <FieldSeparator />
                  <TextField
                    name="oidc_issuer"
                    label="Issuer"
                    type="url"
                    defaultValue={connection.oidc_issuer ?? ""}
                    error={fieldError(state, "oidc_issuer")}
                  />
                  <div className="grid gap-6 sm:grid-cols-2">
                    <TextField
                      name="oidc_client_id"
                      label="Client ID"
                      defaultValue={connection.oidc_client_id ?? ""}
                      autoComplete="off"
                      error={fieldError(state, "oidc_client_id")}
                    />
                    <TextField
                      name="oidc_client_secret"
                      label="New client secret"
                      type="password"
                      autoComplete="off"
                      placeholder="Unchanged"
                      description="Leave empty to keep the secret Clavia holds."
                      error={fieldError(state, "oidc_client_secret")}
                    />
                  </div>
                  <TextField
                    name="oidc_scope"
                    label="Scope"
                    defaultValue={connection.oidc_scope ?? ""}
                    error={fieldError(state, "oidc_scope")}
                  />
                </>
              ) : null}
            </FieldGroup>
          </fieldset>
        </CardContent>
        {editable ? (
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save connection
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}

export function DeleteConnectionButton({ name, displayName }: { name: string; displayName: string }) {
  return (
    <ConfirmAction
      trigger={
        <Button variant="outline">
          <Trash2Icon aria-hidden /> Delete
        </Button>
      }
      title={`Delete ${displayName}?`}
      description="Refused while an account or a linked identity belongs to it. Every application enabling it stops offering it."
      confirm="Delete connection"
      destructive
      action={deleteConnection.bind(null, name)}
    />
  );
}
