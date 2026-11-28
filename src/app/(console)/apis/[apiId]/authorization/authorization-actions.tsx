"use client";

import { PowerOffIcon, Trash2Icon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { Button } from "@/components/ui/button";

import { deleteAuthorizationStore, turnOffAuthorization } from "./actions";

/** Turning authorization off keeps the store; deleting the store cannot be undone. Both ask first. */
export function AuthorizationActions({ apiId, name, enabled }: { apiId: string; name: string; enabled: boolean }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {enabled ? (
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm">
              <PowerOffIcon aria-hidden /> Turn off
            </Button>
          }
          title={`Turn off authorization for ${name}?`}
          description="Its clients are refused from now on, and must not take that as a permit. The store, its model and its relationships are kept: turning it on again brings them back."
          confirm="Turn off"
          action={() => turnOffAuthorization(apiId)}
        />
      ) : null}
      <ConfirmAction
        trigger={
          <Button variant="outline" size="sm" className="text-destructive">
            <Trash2Icon aria-hidden /> Delete store
          </Button>
        }
        title={`Delete the store of ${name}?`}
        description="Every relationship the API wrote is deleted with it, and every version of its model. This cannot be undone: turning authorization on again starts from an empty store."
        confirm="Delete store"
        destructive
        action={() => deleteAuthorizationStore(apiId)}
      />
    </div>
  );
}
