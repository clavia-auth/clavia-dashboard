"use client";

import { useActionState, useId, useTransition } from "react";

import { CheckboxesField, LinesField, SwitchField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { fieldError, IDLE } from "@/server/action-state";

import { saveAuthorization } from "./actions";

/**
 * The API's model, written in OpenFGA's modelling language, and who asks for its decisions.
 * Saving turns authorization on; a model that differs from the one in force becomes a new version,
 * and the relationships in the store stay.
 */
export function AuthorizationForm({
  apiId,
  enabled,
  model,
  unwritable,
  speaking,
  denialReasons,
  clients,
  editable,
}: {
  apiId: string;
  enabled: boolean;
  model: string;
  /** The model in force could not be written in the language: it is shown as JSON in the Versions tab. */
  unwritable: boolean;
  speaking: readonly string[];
  denialReasons: boolean;
  /** The first-party machine clients, or null where the operator cannot list applications. */
  clients: readonly { id: string; name: string }[] | null;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState(saveAuthorization.bind(null, apiId), IDLE);
  const [, startTransition] = useTransition();
  // Submitted in a transition rather than through the form's `action`, which resets its fields afterwards:
  // what the operator typed stays, refused or not.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  useActionFeedback(state);
  const modelId = useId();
  const modelError = fieldError(state, "model");
  const known = new Set(clients?.map((client) => client.id));
  const options =
    clients === null
      ? null
      : [
          ...clients.map((client) => ({ value: client.id, label: client.name, description: client.id })),
          // One that speaks for the API but no longer qualifies is shown, so saving does not drop it unseen.
          ...speaking
            .filter((id) => !known.has(id))
            .map((id) => ({ value: id, label: id, description: "No longer a first-party machine client." })),
        ];

  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader>
          <CardTitle>Model</CardTitle>
          <CardDescription>
            The types of the API&apos;s resources, and how relationships combine, in OpenFGA&apos;s modelling language.{" "}
            <code className="font-mono text-xs">user</code>, <code className="font-mono text-xs">client</code>,{" "}
            <code className="font-mono text-xs">role</code> and <code className="font-mono text-xs">group</code> are
            Clavia&apos;s: a role&apos;s members are its holders. A condition reads what Clavia knows of a person
            through a parameter <code className="font-mono text-xs">clavia: map&lt;any&gt;</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <FieldGroup>
            {unwritable ? (
              <Alert>
                <AlertDescription>
                  The model in force cannot be written in the modelling language: it is shown as OpenFGA keeps it in the
                  Versions tab. Saving here writes a new version.
                </AlertDescription>
              </Alert>
            ) : null}
            <Field data-invalid={modelError !== undefined ? true : undefined}>
              <FieldLabel htmlFor={modelId}>Model</FieldLabel>
              <Textarea
                id={modelId}
                name="model"
                defaultValue={model}
                rows={Math.min(30, Math.max(12, model.split("\n").length + 2))}
                className="font-mono text-xs leading-relaxed whitespace-pre"
                wrap="off"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-invalid={modelError !== undefined ? true : undefined}
                aria-describedby={`${modelId}-description`}
                readOnly={!editable || pending}
              />
              <FieldDescription id={`${modelId}-description`}>
                Its syntax is checked here; whether it makes sense is the decision engine&apos;s to say when it is
                saved.
              </FieldDescription>
              {modelError !== undefined ? <FieldError>{modelError}</FieldError> : null}
            </Field>
            <fieldset disabled={!editable || pending}>
              <FieldGroup>
                {options === null ? (
                  <LinesField
                    name="clients"
                    label="Clients speaking for the API"
                    description="Their client ids, one per line: first-party machine clients, each speaking for this API alone. Your roles do not grant read:clients, so they cannot be listed here."
                    defaultValue={speaking}
                    error={fieldError(state, "clients")}
                  />
                ) : options.length === 0 ? (
                  <Field>
                    <FieldLabel>Clients speaking for the API</FieldLabel>
                    <FieldDescription>
                      No first-party machine client exists yet. Create one in Applications, then name it here: it asks
                      for decisions with a token for the Authorization API.
                    </FieldDescription>
                  </Field>
                ) : (
                  <CheckboxesField
                    name="clients"
                    legend="Clients speaking for the API"
                    options={options}
                    defaultValue={speaking}
                    error={fieldError(state, "clients")}
                  />
                )}
                <SwitchField
                  name="denial_reasons"
                  label="Say why a decision is a denial"
                  description="A denial names its kind (no relation, an inactive person, an unknown type, a condition that failed), never who would have granted it."
                  defaultChecked={denialReasons}
                />
              </FieldGroup>
            </fieldset>
          </FieldGroup>
        </CardContent>
        {editable ? (
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {enabled ? "Save" : "Save and turn on"}
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
