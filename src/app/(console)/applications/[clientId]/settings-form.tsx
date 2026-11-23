"use client";

import { useActionState } from "react";

import { CheckboxesField, LinesField, SwitchField, TextField } from "@/components/app/form-fields";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { Client } from "@/contract";
import { fieldError, IDLE } from "@/server/action-state";

import { updateApplication } from "../actions";
import { GRANT_LABELS } from "../kinds";

const GRANT_HELP: Record<string, string> = {
  authorization_code: "Sign people in through the browser.",
  refresh_token: "Keep a session going past one access token. Needs a person's grant beside it.",
  client_credentials: "Ask for tokens as itself, for an API it holds a grant on. Confidential only.",
  "urn:ietf:params:oauth:grant-type:device_code": "Let a person approve it on another screen. Public, first-party.",
};

/** Everything about how the application signs people in and out. */
export function SettingsForm({
  client,
  editable,
  dashboard,
}: {
  client: Client;
  editable: boolean;
  /** Whether this is the dashboard's own application, which cannot present DPoP proofs. */
  dashboard: boolean;
}) {
  const confidential = client.client_type === "confidential";
  const [state, action, pending] = useActionState(updateApplication.bind(null, client.client_id, confidential), IDLE);
  useActionFeedback(state);

  return (
    <Card>
      <form action={action}>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Clavia refuses a combination that could never work — a refresh token without a person&apos;s grant, a code
            flow without a redirect URI — and says which.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={!editable || pending}>
            <FieldGroup>
              <TextField
                name="name"
                label="Name"
                defaultValue={client.name}
                required
                maxLength={200}
                error={fieldError(state, "name")}
              />
              <CheckboxesField
                name="grant_types"
                legend="Grants"
                defaultValue={client.grant_types}
                error={fieldError(state, "grant_types")}
                options={Object.entries(GRANT_LABELS).map(([value, label]) => ({
                  value,
                  label,
                  description: GRANT_HELP[value],
                }))}
              />
              {confidential ? (
                <Field>
                  <FieldLabel htmlFor="auth-method">Client authentication</FieldLabel>
                  <Select name="token_endpoint_auth_method" defaultValue={client.token_endpoint_auth_method}>
                    <SelectTrigger id="auth-method" className="w-full sm:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_secret_basic">HTTP Basic (client_secret_basic)</SelectItem>
                      <SelectItem value="client_secret_post">Form body (client_secret_post)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    How it presents its secret at the token endpoint — that way and no other.
                  </FieldDescription>
                </Field>
              ) : null}
              <FieldSeparator />
              <LinesField
                name="redirect_uris"
                label="Redirect URIs"
                defaultValue={client.redirect_uris}
                placeholder="https://app.example/callback"
                description="One per line, matched exactly — no wildcard, no prefix."
                error={fieldError(state, "redirect_uris")}
              />
              <LinesField
                name="post_logout_redirect_uris"
                label="Post-logout redirect URIs"
                defaultValue={client.post_logout_redirect_uris}
                placeholder="https://app.example/signed-out"
                description="Where the browser may land after RP-Initiated Logout."
                error={fieldError(state, "post_logout_redirect_uris")}
              />
              <TextField
                name="backchannel_logout_uri"
                label="Back-channel logout URI"
                type="url"
                defaultValue={client.backchannel_logout_uri ?? ""}
                placeholder="https://app.example/backchannel-logout"
                description="Clavia posts a logout token here when a session the application signed in through ends."
                error={fieldError(state, "backchannel_logout_uri")}
              />
              <SwitchField
                name="backchannel_logout_session_required"
                label="Needs the session id"
                description={
                  <>
                    The application expects <code className="font-mono text-xs">sid</code> in the logout token. Clavia
                    always sends it.
                  </>
                }
                defaultChecked={client.backchannel_logout_session_required}
              />
              <SwitchField
                name="mfa_policy"
                label="Require a second factor"
                description="Whoever signs in through this application must give more than one factor. Someone signed in with one is asked for another without typing their password again; someone with none sets one up on the way, if their address is verified. It applies from the next sign-in."
                defaultChecked={client.mfa_policy === "required"}
              />
              <SwitchField
                name="dpop_bound_access_tokens"
                label="Require DPoP"
                description={
                  dashboard ? (
                    "This is the dashboard's own application. It sends no DPoP proofs, so requiring them would lock every operator out."
                  ) : (
                    <>
                      Every token it is issued is bound to a key it holds (RFC 9449): a token request without a{" "}
                      <code className="font-mono text-xs">DPoP</code> proof is refused, and a stolen token is useless
                      without that key. The application must send a proof with each token request and each API call.
                      Tokens already issued keep working.
                    </>
                  )
                }
                defaultChecked={client.dpop_bound_access_tokens}
                disabled={dashboard}
              />
              {confidential ? (
                <SwitchField
                  name="require_pkce"
                  label="Require PKCE"
                  description="Off only for a confidential client that cannot send PKCE: it must then send a nonce, which binds the code instead."
                  defaultChecked={client.require_pkce}
                />
              ) : null}
            </FieldGroup>
          </fieldset>
        </CardContent>
        {editable ? (
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Save settings
            </Button>
          </CardFooter>
        ) : null}
      </form>
    </Card>
  );
}
