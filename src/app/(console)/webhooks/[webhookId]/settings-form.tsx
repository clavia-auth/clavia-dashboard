"use client";

import { useActionState } from "react";

import { TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { EventPicker } from "@/components/webhooks/event-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { Webhook } from "@/contract";
import { fieldError, IDLE } from "@/server/action-state";

import { updateWebhook } from "../actions";

/**
 * Where an endpoint points and what it hears. `retarget` is whether the operator may change those
 * (Clavia also asks for `read:audit_events`); without it only the description is theirs to edit.
 */
export function WebhookSettingsForm({
  webhook,
  editable,
  retarget,
}: {
  webhook: Webhook;
  editable: boolean;
  retarget: boolean;
}) {
  const [state, action, pending] = useActionState(updateWebhook.bind(null, webhook.id, editable && retarget), IDLE);
  useActionFeedback(state);

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            {retarget
              ? "A new URL is checked as at creation. Changing the events applies to what happens from now on."
              : "Your roles do not grant read:audit_events, which Clavia asks for before the URL or the events change."}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={!editable || pending}>
            <FieldGroup>
              <TextField
                name="url"
                label="URL"
                type="url"
                inputMode="url"
                defaultValue={webhook.url}
                required
                maxLength={2048}
                disabled={!retarget}
                error={fieldError(state, "url")}
              />
              <TextField
                name="description"
                label="Description"
                defaultValue={webhook.description}
                maxLength={120}
                className="max-w-md"
                error={fieldError(state, "description")}
              />
              <EventPicker defaultValue={webhook.events} disabled={!retarget} error={fieldError(state, "events")} />
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
