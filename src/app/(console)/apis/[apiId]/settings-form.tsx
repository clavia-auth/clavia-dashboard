"use client";

import { useActionState } from "react";

import { SwitchField, TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { ResourceServer } from "@/contract";
import { fieldError, IDLE } from "@/server/action-state";

import { updateApi } from "../actions";

export function ApiSettingsForm({ resourceServer, editable }: { resourceServer: ResourceServer; editable: boolean }) {
  const system = resourceServer.is_system;
  const [state, action, pending] = useActionState(updateApi.bind(null, resourceServer.id, system), IDLE);
  useActionFeedback(state);

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            {system
              ? "The server's own API: it can be renamed, and it always enforces roles and never lets consent be skipped."
              : "How tokens for this API are decided."}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={!editable || pending}>
            <FieldGroup>
              <TextField
                name="name"
                label="Name"
                defaultValue={resourceServer.name}
                required
                maxLength={200}
                className="max-w-md"
                error={fieldError(state, "name")}
              />
              <SwitchField
                name="enforce_policies"
                label="Enforce roles"
                description="A person's token carries only what their roles grant here; somebody holding nothing is refused at the authorization endpoint."
                defaultChecked={resourceServer.enforce_policies}
                disabled={system}
              />
              <SwitchField
                name="allow_skipping_consent"
                label="First-party applications skip consent"
                description="Your own applications are not asked to show the consent screen for this API. Third-party ones always are."
                defaultChecked={resourceServer.allow_skipping_consent}
                disabled={system}
              />
            </FieldGroup>
          </fieldset>
        </CardContent>
        {editable ? (
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save settings
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
