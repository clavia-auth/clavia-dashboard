"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

import { SwitchField, TextField } from "@/components/app/form-fields";
import { SecretDialog } from "@/components/app/secret-dialog";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fieldError, IDLE } from "@/server/action-state";

import { issueProvisioningToken, type ProvisioningIssuedState } from "../actions";
import { DEFAULT_PROVISIONING_EXPIRY, PROVISIONING_EXPIRIES } from "./provisioning-expiries";

/**
 * Issue the token a directory provisions this connection with. Its value and the base URL to give
 * the directory are shown once, when Clavia hands them out. `enterprise` is an OpenID Connect or
 * SAML connection, where the directory's person is matched to a sign-in by an attribute.
 */
export function IssueProvisioningTokenDialog({ connection, enterprise }: { connection: string; enterprise: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ProvisioningIssuedState, FormData>(
    issueProvisioningToken.bind(null, connection, enterprise),
    IDLE,
  );
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  useActionFeedback(state, () => setOpen(false));
  const issued = state.issued;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <PlusIcon aria-hidden /> Issue token
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <form action={action}>
            <DialogHeader>
              <DialogTitle>Issue a provisioning token</DialogTitle>
              <DialogDescription>
                Give it, with the base URL shown next, to the directory that manages this connection&apos;s accounts.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-6">
              <TextField
                name="description"
                label="Description"
                placeholder="Entra ID, production tenant"
                description="Which directory it is for. The token is never shown again, so this is how you tell it apart."
                required
                maxLength={120}
                error={fieldError(state, "description")}
              />
              <Field>
                <FieldLabel htmlFor="provisioning-expires-in">Expires after</FieldLabel>
                <Select name="expires_in" defaultValue={String(DEFAULT_PROVISIONING_EXPIRY)}>
                  <SelectTrigger id="provisioning-expires-in" className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVISIONING_EXPIRIES.map((expiry) => (
                      <SelectItem key={expiry.seconds} value={String(expiry.seconds)}>
                        {expiry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Provisioning stops then. This page flags a token thirty days before, so you can issue the next one.
                </FieldDescription>
              </Field>
              {enterprise ? (
                <Field>
                  <FieldLabel htmlFor="provisioning-subject">Person&apos;s identifier</FieldLabel>
                  <Select name="subject_attribute" defaultValue="externalId">
                    <SelectTrigger id="provisioning-subject" className="w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="externalId">externalId (Entra ID)</SelectItem>
                      <SelectItem value="userName">userName (Okta)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    The SCIM attribute that names a person on the sign-in: their first sign-in is found by it. Entra ID
                    sends externalId, mapped from the object id, which its SAML claim carries. Okta sends its login as
                    userName.
                  </FieldDescription>
                </Field>
              ) : null}
              <SwitchField
                name="addresses_trusted"
                label="Trust the addresses it sends"
                description="Off, the directory cannot verify an address it does not own, so it cannot reach an existing account through one. Switch it on only for a directory that owns its domain."
              />
              <SwitchField
                name="delete_deactivates"
                label="Deleting deactivates"
                description="A delete from the directory deactivates the account instead of removing it, for those who must keep accounts."
              />
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                Issue token
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {issued !== undefined ? (
        <SecretDialog
          secret={issued.token}
          also={[{ label: "Base URL", value: issued.baseUrl }]}
          title="Copy the token and the base URL now"
          label={`Token for ${issued.description}`}
          lost="revoke it and issue another."
          open={acknowledged !== issued.token}
          onDone={() => setAcknowledged(issued.token)}
        />
      ) : null}
    </>
  );
}
