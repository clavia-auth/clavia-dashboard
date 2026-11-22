"use client";

import { KeyRoundIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { SecretDialog } from "@/components/app/secret-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { type CredentialsState, deleteApplication, rotateSecret } from "../actions";

/** Rotating the secret (shown once) and deleting, each asking first. */
export function ApplicationActions({
  clientId,
  name,
  confidential,
  canUpdate,
  canDelete,
}: {
  clientId: string;
  name: string;
  confidential: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [dialog, setDialog] = useState<"rotate" | "delete" | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  if (!(canUpdate && confidential) && !canDelete) {
    return null;
  }
  const opened = (name: "rotate" | "delete") => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Application actions">
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canUpdate && confidential ? (
            <DropdownMenuItem onSelect={() => setDialog("rotate")}>
              <KeyRoundIcon aria-hidden /> Rotate secret
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              {canUpdate && confidential ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                <Trash2Icon aria-hidden /> Delete application
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmAction
        {...opened("rotate")}
        title="Rotate the client secret?"
        description="A new secret is issued and the current one stops working at once. Deploy the new one before anything else asks for a token."
        confirm="Rotate secret"
        destructive
        action={async () => {
          const state: CredentialsState = await rotateSecret(clientId);
          if (state.credentials?.secret != null) {
            setSecret(state.credentials.secret);
          }

          return state;
        }}
      />
      <ConfirmAction
        {...opened("delete")}
        title={`Delete ${name}?`}
        description="It can no longer ask for tokens, and every token it holds stops working. This cannot be undone."
        confirm="Delete application"
        destructive
        action={deleteApplication.bind(null, clientId)}
      />
      {secret !== null ? (
        <SecretDialog clientId={clientId} secret={secret} open onDone={() => setSecret(null)} />
      ) : null}
    </>
  );
}
