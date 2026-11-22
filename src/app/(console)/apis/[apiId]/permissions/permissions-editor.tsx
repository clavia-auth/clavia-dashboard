"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Permission } from "@/contract";
import { type ActionState, IDLE } from "@/server/action-state";

import { savePermissions } from "../../actions";

type Row = Permission & { key: number };

/**
 * The API's permissions, edited as a list and saved whole. A permission removed leaves
 * every role and client grant that held it; one kept is untouched, whatever else changes.
 */
export function PermissionsEditor({
  apiId,
  permissions,
  editable,
}: {
  apiId: string;
  permissions: readonly Permission[];
  editable: boolean;
}) {
  const initial = () => permissions.map((permission, index) => ({ ...permission, key: index }));
  const [rows, setRows] = useState<Row[]>(initial);
  const [next, setNext] = useState(permissions.length);
  const [state, setState] = useState<ActionState>(IDLE);
  const [pending, startTransition] = useTransition();
  useActionFeedback(state);

  const changed =
    rows.length !== permissions.length ||
    rows.some(
      (row, index) => row.value !== permissions[index]?.value || row.description !== permissions[index]?.description,
    );
  const edit = (key: number, field: "value" | "description", value: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3 pl-6">Value</TableHead>
            <TableHead>Description</TableHead>
            {editable ? <TableHead className="w-12" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                No permissions yet{editable ? ": add the first, such as read:items." : "."}
              </TableCell>
            </TableRow>
          ) : null}
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="pl-6">
                {editable ? (
                  <Input
                    aria-label="Value"
                    value={row.value}
                    placeholder="read:items"
                    className="font-mono text-xs"
                    onChange={(event) => edit(row.key, "value", event.target.value)}
                  />
                ) : (
                  <code className="font-mono text-xs">{row.value}</code>
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    aria-label="Description"
                    value={row.description}
                    placeholder="Read items"
                    onChange={(event) => edit(row.key, "description", event.target.value)}
                  />
                ) : (
                  <span className="text-muted-foreground">{row.description}</span>
                )}
              </TableCell>
              {editable ? (
                <TableCell className="pr-4">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${row.value || "this permission"}`}
                    onClick={() => setRows((current) => current.filter((candidate) => candidate.key !== row.key))}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {editable ? (
        <CardFooter className="justify-between gap-2 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setRows((current) => [...current, { key: next, value: "", description: "" }]);
              setNext((value) => value + 1);
            }}
          >
            <PlusIcon aria-hidden /> Add permission
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={!changed || pending} onClick={() => setRows(initial())}>
              Reset
            </Button>
            <Button
              disabled={!changed || pending}
              onClick={() =>
                startTransition(async () =>
                  setState(
                    await savePermissions(
                      apiId,
                      rows.map(({ value, description }) => ({ value, description })),
                    ),
                  ),
                )
              }
            >
              {pending ? <Spinner /> : null}
              Save permissions
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </>
  );
}
