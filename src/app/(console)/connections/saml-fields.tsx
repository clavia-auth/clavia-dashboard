"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { SwitchField, TextField } from "@/components/app/form-fields";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fieldError } from "@/server/action-state";
import type { ActionState } from "@/server/action-state";

import { SAML_PRESETS, samlPreset } from "./saml-presets";

const CUSTOM = "custom";
/** The largest metadata document Clavia reads (1 MiB). */
const MAX_METADATA = 1_048_576;

/**
 * What registers a SAML identity provider: its metadata (a URL, or the document), how the person
 * is named and described, and the signing and encryption options. A preset fills the attribute
 * names an identity provider usually sends.
 */
export function SamlFields({ state }: { state: ActionState }) {
  const id = useId();
  const [presetId, setPresetId] = useState(CUSTOM);
  const [metadata, setMetadata] = useState("");
  const preset = samlPreset(presetId);
  const metadataError = fieldError(state, "saml/metadata_url") ?? fieldError(state, "saml/metadata");

  return (
    <>
      <FieldSet>
        <FieldLegend variant="label">Identity provider</FieldLegend>
        <FieldGroup>
          <TextField
            name="saml_metadata_url"
            label="Metadata URL"
            type="url"
            placeholder="https://login.example.com/federationmetadata.xml"
            description="Clavia reads it now, over https, never at a private address, and again when you refresh. Or give the document instead."
            error={metadataError}
          />
          <Field data-invalid={metadataError !== undefined ? true : undefined}>
            <FieldLabel htmlFor={`${id}-metadata`}>Metadata document</FieldLabel>
            <Textarea
              id={`${id}-metadata`}
              name="saml_metadata"
              rows={4}
              value={metadata}
              onChange={(event) => setMetadata(event.target.value)}
              className="font-mono text-xs"
              spellCheck={false}
              placeholder="<EntityDescriptor …>"
            />
            <Input
              type="file"
              accept=".xml,application/xml,text/xml"
              aria-label="Upload the metadata document"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file === undefined) {
                  return;
                }
                if (file.size > MAX_METADATA) {
                  toast.error("That file is over 1 MiB, which Clavia refuses.");
                  event.target.value = "";

                  return;
                }
                setMetadata(await file.text());
              }}
            />
            <FieldDescription>
              One identity provider, with its RSA signing certificates. A document is never refreshed: only a URL is.
            </FieldDescription>
            {metadataError !== undefined ? <FieldError>{metadataError}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Who signs in</FieldLegend>
        <Field>
          <FieldLabel htmlFor={`${id}-preset`}>Start from</FieldLabel>
          <Select value={presetId} onValueChange={setPresetId}>
            <SelectTrigger id={`${id}-preset`} className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CUSTOM}>Other identity provider</SelectItem>
              {SAML_PRESETS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {preset?.note ?? "Name the attributes your identity provider sends, as it is set to send them."}
          </FieldDescription>
        </Field>
        {/* Remounted when the preset changes, so its names are the fields' defaults. */}
        <FieldGroup key={presetId}>
          <TextField
            name="saml_subject_attribute"
            label="Subject attribute"
            defaultValue={preset?.subject_attribute ?? ""}
            description="The attribute that names the person. Empty uses the persistent NameID. Never the address, which can change hands."
            error={fieldError(state, "saml/subject_attribute")}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              name="saml_email_attribute"
              label="Email attribute"
              defaultValue={preset?.email_attribute ?? ""}
              error={fieldError(state, "saml/email_attribute")}
            />
            <TextField
              name="saml_name_attribute"
              label="Name attribute"
              defaultValue={preset?.name_attribute ?? ""}
              error={fieldError(state, "saml/name_attribute")}
            />
            <TextField
              name="saml_given_name_attribute"
              label="Given name attribute"
              defaultValue={preset?.given_name_attribute ?? ""}
              error={fieldError(state, "saml/given_name_attribute")}
            />
            <TextField
              name="saml_family_name_attribute"
              label="Family name attribute"
              defaultValue={preset?.family_name_attribute ?? ""}
              error={fieldError(state, "saml/family_name_attribute")}
            />
          </div>
          <SwitchField
            name="saml_email_trusted"
            label="The identity provider verifies addresses"
            description="Only a trusted address can link to an account that already exists. Leave it off unless the provider checks that people own the address it sends."
          />
          <SwitchField
            name="saml_sign_requests"
            label="Sign requests"
            description="Sign the sign-in requests sent to the identity provider, when this server has a SAML key."
            defaultChecked
          />
          <SwitchField
            name="saml_require_encryption"
            label="Require encrypted assertions"
            description="Refuse a plain assertion. The identity provider must encrypt to this server's key."
          />
          <SwitchField
            name="saml_require_gcm"
            label="Require AES-GCM"
            description="Refuse an assertion encrypted with AES-CBC, which is unauthenticated. Turn it off only for a provider that encrypts with CBC, as ADFS does by default."
            defaultChecked={preset?.cbc !== true}
          />
        </FieldGroup>
      </FieldSet>
    </>
  );
}
