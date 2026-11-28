"use client";

import { CheckCircle2Icon, CircleSlashIcon } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";

import { TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { DenialReason } from "@/contract";
import { type ActionState, fieldError, IDLE } from "@/server/action-state";

import { type Trial, tryDecision } from "../actions";

/** What each kind of denial means, for the operator reading it. */
const DENIALS: Record<DenialReason, string> = {
  no_relation: "No relationship grants it, directly or through another relation.",
  subject_inactive:
    "Clavia does not know this person or application, or the account is deactivated: the decision engine was not asked.",
  unknown_type: "The model declares no such type, or no such relation on it.",
  condition_failed:
    "A condition could not be evaluated: it reads a fact Clavia does not hold for this person, or a context member that was not sent.",
};

/**
 * One question asked of the API's store, as the API's own clients ask it, and the answer they
 * would get — a denial always saying which kind it is here, whatever the API tells its clients.
 */
export function DecisionPanel({
  apiId,
  subjectTypes,
  relations,
  lookUpPeople,
}: {
  apiId: string;
  subjectTypes: readonly string[];
  /** The API's own types, each with its relations, in the model's order. */
  relations: readonly { type: string; relations: readonly string[] }[];
  /** Whether a person can be named by their address. */
  lookUpPeople: boolean;
}) {
  const [trial, action, pending] = useActionState<Trial, FormData>(tryDecision.bind(null, apiId), IDLE);
  const [, startTransition] = useTransition();
  // Submitted in a transition rather than through the form's `action`, which resets its fields afterwards:
  // what the operator typed stays, refused or not.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  const state: ActionState = trial.status === "answered" ? IDLE : trial;
  useActionFeedback(state.status === "success" ? IDLE : state);
  const [subjectType, setSubjectType] = useState(subjectTypes[0] ?? "user");
  const [resourceType, setResourceType] = useState(relations[0]?.type ?? "");
  const actions = relations.find((entry) => entry.type === resourceType)?.relations ?? [];
  const ids = { subjectType: useId(), resourceType: useId(), action: useId(), context: useId() };
  const contextError = fieldError(state, "context");

  return (
    <Card>
      <form onSubmit={submit}>
        <CardHeader>
          <CardTitle>Try a decision</CardTitle>
          <CardDescription>
            Ask the API&apos;s store a question, as its clients do, without the API. Clavia checks the subject and adds
            what it knows of them, as for a real question. Nothing is saved, and nothing is recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={pending}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <Field>
                  <FieldLabel htmlFor={ids.subjectType}>Subject</FieldLabel>
                  <Select name="subject_type" value={subjectType} onValueChange={setSubjectType}>
                    <SelectTrigger id={ids.subjectType} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "user" ? "A person (user)" : "An application (client)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <TextField
                  name="subject"
                  label={subjectType === "user" ? "Who" : "Which application"}
                  placeholder={
                    subjectType === "user"
                      ? lookUpPeople
                        ? "ada@example.com, or their id"
                        : "Their id, the sub of their tokens"
                      : "Its client id"
                  }
                  className="min-w-0"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  required
                  error={fieldError(state, "subject")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <Field data-invalid={fieldError(state, "resource/type") !== undefined ? true : undefined}>
                  <FieldLabel htmlFor={ids.resourceType}>Resource type</FieldLabel>
                  <Select name="resource_type" value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger id={ids.resourceType} className="w-full">
                      <SelectValue placeholder="Choose a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {relations.map((entry) => (
                        <SelectItem key={entry.type} value={entry.type}>
                          {entry.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError(state, "resource/type") !== undefined ? (
                    <FieldError>{fieldError(state, "resource/type")}</FieldError>
                  ) : null}
                </Field>
                <TextField
                  name="resource"
                  label="Resource"
                  placeholder={resourceType === "" ? "Its id" : `The ${resourceType}'s id`}
                  className="min-w-0"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  required
                  error={fieldError(state, "resource/id") ?? fieldError(state, "resource")}
                />
              </div>
              <Field data-invalid={fieldError(state, "action") !== undefined ? true : undefined} className="max-w-xs">
                <FieldLabel htmlFor={ids.action}>Relation</FieldLabel>
                <Select key={resourceType} name="action" defaultValue={actions[0]}>
                  <SelectTrigger id={ids.action} className="w-full">
                    <SelectValue placeholder={actions.length === 0 ? "The type has no relation" : "Choose one"} />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((relation) => (
                      <SelectItem key={relation} value={relation}>
                        {relation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError(state, "action") !== undefined ? (
                  <FieldError>{fieldError(state, "action")}</FieldError>
                ) : null}
              </Field>
              <Field data-invalid={contextError !== undefined ? true : undefined}>
                <FieldLabel htmlFor={ids.context}>Context</FieldLabel>
                <Textarea
                  id={ids.context}
                  name="context"
                  rows={3}
                  placeholder='{"network": "office"}'
                  className="font-mono text-xs"
                  spellCheck={false}
                  aria-invalid={contextError !== undefined ? true : undefined}
                  aria-describedby={`${ids.context}-description`}
                />
                <FieldDescription id={`${ids.context}-description`}>
                  Optional: a JSON object the model&apos;s conditions read, as the API would send it. Clavia&apos;s
                  facts are added under <code className="font-mono text-xs">clavia</code>, which is not yours to send.
                </FieldDescription>
                {contextError !== undefined ? <FieldError>{contextError}</FieldError> : null}
              </Field>
            </FieldGroup>
          </fieldset>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4 border-t">
          <div aria-live="polite">
            {trial.status === "answered" ? (
              <Alert className={trial.decision ? "border-success/40" : undefined}>
                {trial.decision ? (
                  <CheckCircle2Icon aria-hidden className="text-success" />
                ) : (
                  <CircleSlashIcon aria-hidden />
                )}
                <AlertTitle>{trial.decision ? "Permitted" : "Denied"}</AlertTitle>
                <AlertDescription>
                  <p className="font-mono text-xs break-all">{trial.question}</p>
                  <p>
                    {trial.decision
                      ? "The API's clients would be told true, and may act."
                      : trial.reason === null
                        ? "The API's store gave no reason."
                        : DENIALS[trial.reason]}
                  </p>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending || relations.length === 0}>
              {pending ? <Spinner /> : null}
              Ask
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
