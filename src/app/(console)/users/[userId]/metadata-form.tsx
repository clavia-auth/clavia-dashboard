"use client";

import { useActionState, useId, useState } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/contract";
import { metadataText, parseMetadata } from "@/core/claims/claims";
import { fieldError, IDLE } from "@/server/action-state";

import { updateAppMetadata } from "../actions";

/**
 * What the operators keep about the account, as JSON: a tenant, a plan, a department. Claim
 * mappings copy it into tokens, and APIs authorize on it, so writing it takes a scope of its
 * own, and it is replaced whole.
 */
export function MetadataForm({
  user,
  editable,
  missing,
}: {
  user: User;
  editable: boolean;
  /** The scope the operator lacks, when that is why it cannot be changed. */
  missing: string | null;
}) {
  const [state, action, pending] = useActionState(updateAppMetadata.bind(null, user.id), IDLE);
  const [text, setText] = useState(() => metadataText(user.app_metadata));
  const id = useId();
  useActionFeedback(state);

  const valid = parseMetadata(text) !== null;
  const unchanged = text === metadataText(user.app_metadata);
  const refusals =
    state.status === "error"
      ? Object.entries(state.fields)
          .filter(([key]) => key.startsWith("app_metadata/"))
          .map(([key, detail]) => `${key.split("/").slice(1).join(".")}: ${detail}`)
      : [];
  const error =
    (!valid && text.trim() !== "" ? "Not a JSON object yet." : undefined) ?? fieldError(state, "app_metadata");

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Application metadata</CardTitle>
          <CardDescription>
            Facts only operators write about this account. Claim mappings on an API or an application copy them into
            tokens, so keep nothing secret here: whatever it holds can reach a token an application reads.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <Field data-invalid={error !== undefined || refusals.length > 0 ? true : undefined}>
            <FieldLabel htmlFor={id}>Metadata (JSON)</FieldLabel>
            <Textarea
              id={id}
              name="app_metadata"
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={!editable || pending}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              rows={Math.min(16, Math.max(5, text.split("\n").length + 1))}
              aria-invalid={error !== undefined || refusals.length > 0 ? true : undefined}
              className="font-mono text-xs"
            />
            <FieldDescription>
              {missing !== null
                ? `Your roles do not grant ${missing}, which changing this needs.`
                : "A JSON object of at most 16 KiB, five levels deep, with keys of letters, digits, _ and -. Saving replaces it whole: a key is removed by leaving it out."}
            </FieldDescription>
            {error !== undefined ? <FieldError>{error}</FieldError> : null}
            {refusals.length > 0 ? (
              <FieldError>
                <ul className="list-inside list-disc">
                  {refusals.map((refusal) => (
                    <li key={refusal} className="font-mono text-xs">
                      {refusal}
                    </li>
                  ))}
                </ul>
              </FieldError>
            ) : null}
          </Field>
        </CardContent>
        {editable ? (
          <CardFooter className="justify-end gap-2 border-t">
            <Button
              type="button"
              variant="ghost"
              disabled={unchanged || pending}
              onClick={() => setText(metadataText(user.app_metadata))}
            >
              Reset
            </Button>
            <Button type="submit" disabled={!valid || unchanged || pending}>
              {pending ? <Spinner /> : null}
              Save metadata
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
