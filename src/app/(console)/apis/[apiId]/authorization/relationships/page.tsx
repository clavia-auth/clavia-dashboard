import { NetworkIcon, SearchIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Form from "next/form";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { Restricted } from "@/components/app/restricted";
import { TokenPager } from "@/components/app/token-pager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RelationshipPage, RelationshipSubject } from "@/contract";
import { objectTypes, parseObject, subjectNotation } from "@/core/authorization/model";
import { signedIn } from "@/server/operator";

import { authorizationOf, type EngineRead, fromEngine } from "../data";
import { EngineState } from "../engine-state";

export const metadata: Metadata = { title: "Relationships" };

const PAGE_SIZE = 50;

/**
 * The relationships written on one of the API's own objects, as the API wrote them: read-only, one
 * object at a time, as OpenFGA reads them. Nothing worked out through other relations is shown;
 * that is what a decision is for.
 */
export default async function RelationshipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ apiId: string }>;
  searchParams: Promise<{ object?: string; page_token?: string }>;
}) {
  const { operator, api } = await signedIn();
  if (!operator.can("read:relationships")) {
    return (
      <Card className="py-0">
        <Restricted scope="read:relationships" what="this API's relationships" />
      </Card>
    );
  }
  const { apiId } = await params;
  const { object = "", page_token: pageToken } = await searchParams;
  const authorization = await authorizationOf(apiId);
  if (authorization === null) {
    return <EngineState read={{ ok: false, reason: "no_store", message: "" }} />;
  }
  const types = objectTypes(authorization.model);
  const base = `/apis/${apiId}/authorization/relationships`;
  const browse = (notation: string) => `${base}?${new URLSearchParams({ object: notation })}` as Route;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Relationships</CardTitle>
        <CardDescription>
          What the API wrote on one of its objects, as it wrote it. Who holds a role is the Roles section&apos;s to
          tell.
        </CardDescription>
        <Form action={base as Route} scroll={false} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="grid min-w-0 flex-1 basis-64 gap-1.5">
            <Label htmlFor="relationships-object">Object</Label>
            <Input
              id="relationships-object"
              name="object"
              defaultValue={object}
              placeholder={types[0] === undefined ? "type:id" : `${types[0]}:id`}
              className="font-mono text-xs"
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-describedby="relationships-object-types"
            />
          </div>
          <Button type="submit" variant="outline">
            <SearchIcon aria-hidden /> Read
          </Button>
          <p id="relationships-object-types" className="basis-full text-xs text-muted-foreground">
            {types.length === 0
              ? "The model declares no type of the API's own yet."
              : `type:id, one of the API's types: ${types.join(", ")}.`}
          </p>
        </Form>
      </CardHeader>
      <CardContent className="px-0">
        <Relationships
          object={object}
          pageToken={pageToken}
          types={types}
          base={base}
          link={(subject) => subjectLink(subject, types, browse)}
          read={(notation) =>
            fromEngine(api.authorization.relationships(apiId, notation, { pageSize: PAGE_SIZE, pageToken }))
          }
        />
      </CardContent>
    </Card>
  );
}

async function Relationships({
  object,
  pageToken,
  types,
  base,
  link,
  read,
}: {
  object: string;
  pageToken: string | undefined;
  types: readonly string[];
  base: string;
  link: (subject: RelationshipSubject) => Route | null;
  read: (notation: string) => Promise<EngineRead<RelationshipPage>>;
}) {
  if (object.trim() === "") {
    return (
      <EmptyState
        icon={NetworkIcon}
        title="Name an object"
        description="Its type and id, as the API writes them, such as document:q3-report."
      />
    );
  }
  const parsed = parseObject(object);
  if (parsed === null) {
    return (
      <EmptyState
        icon={NetworkIcon}
        title="Not an object"
        description="An object is type:id: a type, a colon and an id, with no space or #."
      />
    );
  }
  if (!types.includes(parsed.type)) {
    return (
      <EmptyState
        icon={NetworkIcon}
        title={`${parsed.type} is not one of the API's types`}
        description={
          types.length === 0 ? "The model declares no type of the API's own." : `Its types are ${types.join(", ")}.`
        }
      />
    );
  }
  const notation = `${parsed.type}:${parsed.id}`;
  const result = await read(notation);
  if (!result.ok) {
    return <EngineState read={result} />;
  }
  const { items, next_page_token: next } = result.value;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={NetworkIcon}
        title="No relationships"
        description={`The API has written nothing on ${notation}${pageToken === undefined ? "" : " past the first page"}.`}
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Relation</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Condition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((relationship) => {
            const subject = subjectNotation(relationship.subject);
            const href = link(relationship.subject);

            return (
              <TableRow key={`${relationship.relation} ${subject}`}>
                <TableCell className="pl-4 font-mono text-xs">{relationship.relation}</TableCell>
                <TableCell className="font-mono text-xs">
                  {href === null ? (
                    subject
                  ) : (
                    <Link href={href} className="text-primary underline-offset-4 hover:underline">
                      {subject}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {relationship.condition === undefined ? (
                    "—"
                  ) : (
                    <span className="break-all">
                      {relationship.condition.name}
                      {relationship.condition.context !== undefined &&
                      Object.keys(relationship.condition.context).length > 0
                        ? ` ${JSON.stringify(relationship.condition.context)}`
                        : ""}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TokenPager path={base} query={{ object: notation }} current={pageToken} next={next} count={items.length} />
    </>
  );
}

/** Where a subject is shown: a person, an application or a role in its own section; the API's own objects here. */
function subjectLink(
  subject: RelationshipSubject,
  types: readonly string[],
  browse: (notation: string) => Route,
): Route | null {
  const id = encodeURIComponent(subject.id);
  switch (subject.type) {
    case "user":
      return `/users/${id}` as Route;
    case "client":
      return `/applications/${id}` as Route;
    case "role":
      return `/roles/${id}` as Route;
    default:
      return types.includes(subject.type) ? browse(`${subject.type}:${subject.id}`) : null;
  }
}
