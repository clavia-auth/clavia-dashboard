"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState } from "react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { RoleWithPermissions } from "@/contract";
import { fieldError, IDLE } from "@/server/action-state";

import { deleteRole, updateRole } from "../actions";

export function RoleSettingsForm({ role, editable }: { role: RoleWithPermissions; editable: boolean }) {
  const [state, action, pending] = useActionState(updateRole.bind(null, role.id), IDLE);
  useActionFeedback(state);

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>What the role is called, and what it is for.</CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={!editable || pending}>
            <FieldGroup className="max-w-xl">
              <TextField
                name="name"
                label="Name"
                defaultValue={role.name}
                required
                maxLength={100}
                error={fieldError(state, "name")}
              />
              <TextField
                name="description"
                label="Description"
                defaultValue={role.description}
                maxLength={500}
                error={fieldError(state, "description")}
              />
            </FieldGroup>
          </fieldset>
        </CardContent>
        {editable ? (
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save role
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}

export function DeleteRoleButton({ roleId, name }: { roleId: string; name: string }) {
  return (
    <ConfirmAction
      trigger={
        <Button variant="outline">
          <Trash2Icon aria-hidden /> Delete
        </Button>
      }
      title={`Delete ${name}?`}
      description="It is taken from everybody who holds it; their next tokens carry none of its permissions. This cannot be undone."
      confirm="Delete role"
      destructive
      action={deleteRole.bind(null, roleId)}
    />
  );
}
