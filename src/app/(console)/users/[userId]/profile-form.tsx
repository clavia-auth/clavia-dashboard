"use client";

import { useActionState, useRef } from "react";

import { SwitchField, TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@/contract";
import { fieldError, IDLE } from "@/server/action-state";

import { setPassword, updateProfile } from "../actions";

/** The account's address and profile claims — what userinfo releases to applications. */
export function ProfileForm({ user, editable }: { user: User; editable: boolean }) {
  const [state, action, pending] = useActionState(updateProfile.bind(null, user.id), IDLE);
  useActionFeedback(state);

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            What applications receive from userinfo when they ask for the <code className="font-mono">profile</code> and{" "}
            <code className="font-mono">email</code> scopes. A new address starts unverified.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={!editable || pending}>
            <FieldGroup className="grid gap-6 md:grid-cols-2">
              <TextField
                name="email"
                label="Email"
                type="email"
                defaultValue={user.email}
                required
                error={fieldError(state, "email")}
              />
              <TextField name="name" label="Name" defaultValue={user.name ?? ""} error={fieldError(state, "name")} />
              <TextField
                name="given_name"
                label="Given name"
                defaultValue={user.given_name ?? ""}
                error={fieldError(state, "given_name")}
              />
              <TextField
                name="family_name"
                label="Family name"
                defaultValue={user.family_name ?? ""}
                error={fieldError(state, "family_name")}
              />
              <TextField
                name="nickname"
                label="Nickname"
                defaultValue={user.nickname ?? ""}
                error={fieldError(state, "nickname")}
              />
              <TextField
                name="locale"
                label="Locale"
                placeholder="en-GB"
                defaultValue={user.locale ?? ""}
                error={fieldError(state, "locale")}
              />
              <TextField
                name="picture"
                label="Picture URL"
                type="url"
                className="md:col-span-2"
                defaultValue={user.picture ?? ""}
                error={fieldError(state, "picture")}
              />
              <div className="md:col-span-2">
                <SwitchField
                  name="email_verified"
                  label="Email verified"
                  description="Whether applications are told the address is confirmed."
                  defaultChecked={user.email_verified}
                />
              </div>
            </FieldGroup>
          </fieldset>
        </CardContent>
        {editable ? (
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save profile
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}

/** A new password, for an account in a pool. Never shown, never sent back. */
export function PasswordForm({ userId, hasPassword }: { userId: string; hasPassword: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(setPassword.bind(null, userId), IDLE);
  useActionFeedback(state, () => form.current?.reset());

  return (
    <Card>
      <form ref={form} action={action}>
        <CardHeader>
          <CardTitle>{hasPassword ? "Password" : "Set a password"}</CardTitle>
          <CardDescription>
            {hasPassword
              ? "Replace their password. Tell them the new one another way: it is not emailed."
              : "This account signs in another way. A password lets it use the login form too."}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <TextField
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            description="8 to 72 characters."
            className="max-w-sm"
            error={fieldError(state, "password")}
          />
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? <Spinner /> : null}
            Set password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
