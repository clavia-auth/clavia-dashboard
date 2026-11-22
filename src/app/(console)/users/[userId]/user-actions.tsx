"use client";

import { MoreHorizontalIcon, PowerIcon, PowerOffIcon, ShieldOffIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { deleteUser, resetMfa, setActive } from "../actions";

type Dialog = "deactivate" | "reactivate" | "reset-mfa" | "delete";

/** What can be done to the account as a whole, each asking first. */
export function UserActions({
  userId,
  email,
  active,
  mfaEnrolled,
  canUpdate,
  canDelete,
  isSelf,
}: {
  userId: string;
  email: string;
  active: boolean;
  mfaEnrolled: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isSelf: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  if (!canUpdate && !canDelete) {
    return null;
  }
  const opened = (name: Dialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Account actions">
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {canUpdate && active ? (
            <DropdownMenuItem onSelect={() => setDialog("deactivate")} disabled={isSelf}>
              <PowerOffIcon aria-hidden /> Deactivate
            </DropdownMenuItem>
          ) : null}
          {canUpdate && !active ? (
            <DropdownMenuItem onSelect={() => setDialog("reactivate")}>
              <PowerIcon aria-hidden /> Reactivate
            </DropdownMenuItem>
          ) : null}
          {canUpdate && mfaEnrolled ? (
            <DropdownMenuItem onSelect={() => setDialog("reset-mfa")}>
              <ShieldOffIcon aria-hidden /> Reset two-factor
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")} disabled={isSelf}>
                <Trash2Icon aria-hidden /> Delete user
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmAction
        {...opened("deactivate")}
        title={`Deactivate ${email}?`}
        description="They are signed out everywhere at once, every application is told, and they cannot sign in until reactivated."
        confirm="Deactivate"
        destructive
        action={setActive.bind(null, userId, false)}
      />
      <ConfirmAction
        {...opened("reactivate")}
        title={`Reactivate ${email}?`}
        description="They can sign in again with the credentials they had."
        confirm="Reactivate"
        action={setActive.bind(null, userId, true)}
      />
      <ConfirmAction
        {...opened("reset-mfa")}
        title="Turn two-factor authentication off?"
        description="For someone who lost both their authenticator and their recovery codes. Their next sign-in takes a password alone, until they set it up again."
        confirm="Turn it off"
        destructive
        action={resetMfa.bind(null, userId)}
      />
      <ConfirmAction
        {...opened("delete")}
        title={`Delete ${email}?`}
        description="The account goes, with every code and token issued on its behalf and every session. This cannot be undone."
        confirm="Delete user"
        destructive
        action={deleteUser.bind(null, userId)}
      />
    </>
  );
}
