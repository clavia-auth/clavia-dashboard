"use client";

import { useState, useTransition } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { ResourceServer } from "@/contract";
import { type ActionState, IDLE } from "@/server/action-state";

import { saveRolePermissions } from "../../actions";

const key = (resourceServerId: string, value: string) => `${resourceServerId}\u0000${value}`;

/** Every API's permissions, ticked for what the role grants — saved together. */
export function PermissionsPicker({
  roleId,
  apis,
  granted,
  editable,
}: {
  roleId: string;
  apis: readonly ResourceServer[];
  granted: readonly { resource_server_id: string; value: string }[];
  editable: boolean;
}) {
  const initial = () => new Set(granted.map((permission) => key(permission.resource_server_id, permission.value)));
  const [chosen, setChosen] = useState<ReadonlySet<string>>(initial);
  const [state, setState] = useState<ActionState>(IDLE);
  const [pending, startTransition] = useTransition();
  useActionFeedback(state);
  const before = initial();
  const changed = chosen.size !== before.size || [...chosen].some((item) => !before.has(item));

  const set = (items: readonly string[], on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      for (const item of items) {
        if (on) {
          next.add(item);
        } else {
          next.delete(item);
        }
      }

      return next;
    });

  return (
    <>
      <CardContent className="space-y-6 py-2">
        {apis.map((resourceServer) => {
          const items = resourceServer.permissions.map((permission) => key(resourceServer.id, permission.value));
          const all = items.length > 0 && items.every((item) => chosen.has(item));
          const some = items.some((item) => chosen.has(item));

          return (
            <section key={resourceServer.id} className="rounded-lg border">
              <header className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
                <Checkbox
                  aria-label={`Every permission of ${resourceServer.name}`}
                  checked={all ? true : some ? "indeterminate" : false}
                  disabled={!editable || items.length === 0}
                  onCheckedChange={(checked) => set(items, checked === true)}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{resourceServer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{resourceServer.identifier}</p>
                </div>
              </header>
              {resourceServer.permissions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">This API defines no permission yet.</p>
              ) : (
                <ul className="grid gap-x-6 gap-y-2 p-4 sm:grid-cols-2">
                  {resourceServer.permissions.map((permission) => {
                    const item = key(resourceServer.id, permission.value);

                    return (
                      <li key={item}>
                        <label className="flex cursor-pointer items-start gap-3">
                          <Checkbox
                            checked={chosen.has(item)}
                            disabled={!editable}
                            onCheckedChange={(checked) => set([item], checked === true)}
                            className="mt-0.5"
                          />
                          <span>
                            <code className="block font-mono text-xs">{permission.value}</code>
                            <span className="block text-xs text-muted-foreground">{permission.description}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </CardContent>
      {editable ? (
        <CardFooter className="justify-end gap-2 border-t">
          <Button variant="ghost" disabled={!changed || pending} onClick={() => setChosen(initial())}>
            Reset
          </Button>
          <Button
            disabled={!changed || pending}
            onClick={() =>
              startTransition(async () =>
                setState(
                  await saveRolePermissions(
                    roleId,
                    [...chosen].map((item) => {
                      const [resource_server_id = "", value = ""] = item.split("\u0000");

                      return { resource_server_id, value };
                    }),
                  ),
                ),
              )
            }
          >
            {pending ? <Spinner /> : null}
            Save permissions
          </Button>
        </CardFooter>
      ) : null}
    </>
  );
}
