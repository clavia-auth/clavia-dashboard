"use client";

import { Trash2Icon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { Button } from "@/components/ui/button";

import { deleteApi } from "../actions";

export function DeleteApiButton({ apiId, name }: { apiId: string; name: string }) {
  return (
    <ConfirmAction
      trigger={
        <Button variant="outline">
          <Trash2Icon aria-hidden /> Delete
        </Button>
      }
      title={`Delete ${name}?`}
      description="Its permissions leave every role and client grant, and no token is issued for it any more. This cannot be undone."
      confirm="Delete API"
      destructive
      action={deleteApi.bind(null, apiId)}
    />
  );
}
