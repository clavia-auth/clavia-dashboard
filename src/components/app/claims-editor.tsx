"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { ApplicationClaimMapping, ClaimMapping } from "@/contract";
import {
  CLAIM_DESTINATIONS,
  type ClaimDestination,
  type ClaimDraft,
  type ClaimsPreview,
  draftOf,
  MAX_MAPPINGS,
  PROFILE_FIELDS,
  SOURCE_KINDS,
  type SourceKind,
} from "@/core/claims/claims";
import { type ActionState, IDLE } from "@/server/action-state";

type Row = ClaimDraft & { key: number };

const DESTINATION_LABELS: Record<ClaimDestination, string> = { id_token: "ID token", userinfo: "Userinfo" };

function sourceLabel(kind: SourceKind, application: boolean): string {
  switch (kind) {
    case "email":
      return "Email address";
    case "email_verified":
      return "Email verified";
    case "connection":
      return "Connection";
    case "profile":
      return "Profile field";
    case "app_metadata":
      return "Application metadata";
    case "roles":
      return application ? "All their roles" : "Their roles on this API";
    case "constant":
      return "A fixed value";
  }
}

/**
 * The custom claims of an API or an application, edited as rows and saved whole. Clavia holds
 * each to its rules and says which row it refuses; a preview shows what one person would get
 * from the rows as they stand, before anything is saved.
 */
export function ClaimsEditor({
  application,
  mappings,
  editable,
  description,
  save,
  preview,
  previewUnavailable,
}: {
  /** An application's claims say where they go; an API's are for its access tokens. */
  application: boolean;
  mappings: readonly (ClaimMapping | ApplicationClaimMapping)[];
  editable: boolean;
  description: React.ReactNode;
  save: (drafts: ClaimDraft[]) => Promise<ActionState>;
  /** Null where the operator cannot look people up. */
  preview: ((search: string, drafts: ClaimDraft[]) => Promise<ClaimsPreview>) | null;
  previewUnavailable?: string;
}) {
  const initial = () => mappings.map((mapping, key) => ({ ...draftOf(mapping), key }));
  const [rows, setRows] = useState<Row[]>(initial);
  const [next, setNext] = useState(mappings.length);
  const [state, setState] = useState<ActionState>(IDLE);
  const [saving, startSaving] = useTransition();
  useActionFeedback(state);

  const drafts = (): ClaimDraft[] =>
    rows.map((row) => ({ name: row.name, kind: row.kind, detail: row.detail, value: row.value, in: row.in }));
  const saved = JSON.stringify(mappings.map(draftOf));
  const changed = JSON.stringify(drafts()) !== saved;
  const fields = state.status === "error" ? state.fields : {};
  const entryErrors = Object.keys(fields).some((key) => key.startsWith("claims/"));

  const edit = (key: number, patch: Partial<ClaimDraft>) => {
    setState(IDLE);
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  return (
    <>
      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Custom claims</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {rows.length === 0 ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No custom claims{editable ? ": add one to put something about the person in a token." : "."}
          </CardContent>
        ) : (
          <ul className="divide-y border-t">
            {rows.map((row, index) => {
              const error = fields[`claims/${index}`];

              return (
                <li key={row.key} className="flex flex-col gap-3 px-6 py-4">
                  <div className="grid items-start gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input
                      aria-label={`Claim ${index + 1} name`}
                      aria-invalid={error !== undefined ? true : undefined}
                      value={row.name}
                      placeholder="tenant"
                      className="font-mono text-xs"
                      disabled={!editable}
                      onChange={(event) => edit(row.key, { name: event.target.value })}
                    />
                    <Select
                      value={row.kind}
                      disabled={!editable}
                      onValueChange={(kind) =>
                        edit(row.key, {
                          kind: kind as SourceKind,
                          detail: kind === "profile" ? "name" : "",
                          value: "",
                        })
                      }
                    >
                      <SelectTrigger aria-label={`Claim ${index + 1} source`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_KINDS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {sourceLabel(kind, application)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Detail row={row} index={index} editable={editable} edit={edit} />
                    {editable ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove claim ${row.name || index + 1}`}
                        onClick={() => {
                          setState(IDLE);
                          setRows((current) => current.filter((candidate) => candidate.key !== row.key));
                        }}
                      >
                        <Trash2Icon aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                  {application ? (
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-muted-foreground">Goes in</span>
                      {CLAIM_DESTINATIONS.map((destination) => (
                        <label key={destination} className="flex items-center gap-2">
                          <Checkbox
                            checked={row.in.includes(destination)}
                            disabled={!editable}
                            onCheckedChange={(checked) =>
                              edit(row.key, {
                                in:
                                  checked === true
                                    ? [...row.in, destination]
                                    : row.in.filter((candidate) => candidate !== destination),
                              })
                            }
                          />
                          {DESTINATION_LABELS[destination]}
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {error !== undefined ? (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {fields.claims !== undefined && !entryErrors ? (
          <p role="alert" className="border-t px-6 py-3 text-sm text-destructive">
            {fields.claims}
          </p>
        ) : null}
        {editable ? (
          <CardFooter className="justify-between gap-2 border-t">
            <Button
              variant="outline"
              disabled={rows.length >= MAX_MAPPINGS || saving}
              onClick={() => {
                setState(IDLE);
                setRows((current) => [
                  ...current,
                  { key: next, name: "", kind: "app_metadata", detail: "", value: "", in: CLAIM_DESTINATIONS },
                ]);
                setNext(next + 1);
              }}
            >
              <PlusIcon aria-hidden />
              Add a claim
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={!changed || saving}
                onClick={() => {
                  setState(IDLE);
                  setRows(initial());
                }}
              >
                Reset
              </Button>
              <Button
                disabled={!changed || saving}
                onClick={() => startSaving(async () => setState(await save(drafts())))}
              >
                {saving ? <Spinner /> : null}
                Save claims
              </Button>
            </div>
          </CardFooter>
        ) : null}
      </Card>
      <PreviewCard
        application={application}
        preview={preview}
        unavailable={previewUnavailable}
        drafts={drafts}
        changed={changed}
      />
    </>
  );
}

/** What goes with the source: a profile field to choose, a path to type, a JSON value to give. */
function Detail({
  row,
  index,
  editable,
  edit,
}: {
  row: Row;
  index: number;
  editable: boolean;
  edit: (key: number, patch: Partial<ClaimDraft>) => void;
}) {
  switch (row.kind) {
    case "profile":
      return (
        <Select value={row.detail} disabled={!editable} onValueChange={(detail) => edit(row.key, { detail })}>
          <SelectTrigger aria-label={`Claim ${index + 1} profile field`} className="w-full font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROFILE_FIELDS.map((field) => (
              <SelectItem key={field} value={field} className="font-mono text-xs">
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "app_metadata":
      return (
        <Input
          aria-label={`Claim ${index + 1} metadata path`}
          value={row.detail}
          placeholder="tenant.id"
          className="font-mono text-xs"
          disabled={!editable}
          onChange={(event) => edit(row.key, { detail: event.target.value })}
        />
      );
    case "constant":
      return (
        <Input
          aria-label={`Claim ${index + 1} value, as JSON`}
          value={row.value}
          placeholder={'"eu-west"'}
          className="font-mono text-xs"
          disabled={!editable}
          onChange={(event) => edit(row.key, { value: event.target.value })}
        />
      );
    default:
      // The slot stays, so the remove button keeps its column.
      return <span aria-hidden className="hidden md:block" />;
  }
}

function PreviewCard({
  application,
  preview,
  unavailable,
  drafts,
  changed,
}: {
  application: boolean;
  preview: ((search: string, drafts: ClaimDraft[]) => Promise<ClaimsPreview>) | null;
  unavailable: string | undefined;
  drafts: () => ClaimDraft[];
  changed: boolean;
}) {
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<ClaimsPreview>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const id = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>
          The claims one person would get from the rows above{changed ? ", as you have edited them" : ""}, worked out
          from their account as it is now.{" "}
          {application
            ? "It is what an ID token and a userinfo answer would carry."
            : "It is what a JWT access token and introspection would carry. A machine token carries only fixed values."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {preview === null ? (
          <p className="text-sm text-muted-foreground">{unavailable}</p>
        ) : (
          <form
            className="flex max-w-xl flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => setResult(await preview(search, drafts())));
            }}
          >
            <Input
              id={id}
              type="search"
              aria-label="Address of the person to preview"
              placeholder="ada@example.com"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoComplete="off"
            />
            <Button type="submit" variant="outline" disabled={pending || search.trim() === ""}>
              {pending ? <Spinner /> : null}
              Preview
            </Button>
          </form>
        )}
        {result.status === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {result.message}
          </p>
        ) : null}
        {result.status === "success" ? (
          <div className="grid gap-4 md:grid-cols-2" aria-live="polite">
            {result.sections.map((section) => (
              <div key={section.title} className="flex min-w-0 flex-col gap-1.5">
                <h3 className="text-sm font-medium">
                  {section.title} <span className="font-normal text-muted-foreground">for {result.person}</span>
                </h3>
                {Object.keys(section.claims).length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No custom claims: every source is empty for them.
                  </p>
                ) : (
                  <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
                    {JSON.stringify(section.claims, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
