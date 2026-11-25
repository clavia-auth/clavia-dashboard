/**
 * The attribute names an identity provider usually sends, as starting points for a SAML connection:
 * every identity provider names its attributes as its administrator set them, so an operator checks
 * these against the provider's attribute statements. A preset never says an address is trusted:
 * only the operator knows whether the provider verifies the addresses it sends.
 */
export type SamlPreset = Readonly<{
  id: string;
  label: string;
  /** The attribute naming the person; empty for the persistent `NameID`, the safest subject. */
  subject_attribute: string;
  email_attribute: string;
  name_attribute: string;
  given_name_attribute: string;
  family_name_attribute: string;
  /** Whether the provider is known to encrypt with AES-CBC, which Clavia refuses unless told otherwise. */
  cbc: boolean;
  note: string;
}>;

const CLAIMS = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims";

export const SAML_PRESETS: readonly SamlPreset[] = [
  {
    id: "entra",
    label: "Microsoft Entra ID",
    subject_attribute: "http://schemas.microsoft.com/identity/claims/objectidentifier",
    email_attribute: `${CLAIMS}/emailaddress`,
    name_attribute: "http://schemas.microsoft.com/identity/claims/displayname",
    given_name_attribute: `${CLAIMS}/givenname`,
    family_name_attribute: `${CLAIMS}/surname`,
    cbc: false,
    note: "The object id names the person, and never changes when the address does.",
  },
  {
    id: "okta",
    label: "Okta",
    subject_attribute: "",
    email_attribute: "email",
    name_attribute: "displayName",
    given_name_attribute: "firstName",
    family_name_attribute: "lastName",
    cbc: false,
    note: "Add these attribute statements to the Okta application, and set its Name ID format to Persistent.",
  },
  {
    id: "adfs",
    label: "ADFS",
    subject_attribute: "",
    email_attribute: `${CLAIMS}/emailaddress`,
    name_attribute: `${CLAIMS}/name`,
    given_name_attribute: `${CLAIMS}/givenname`,
    family_name_attribute: `${CLAIMS}/surname`,
    cbc: true,
    note: "ADFS encrypts with AES-CBC by default, so this turns the AES-GCM requirement off. Switch it back on if you set ADFS to GCM.",
  },
  {
    id: "google",
    label: "Google Workspace",
    subject_attribute: "",
    email_attribute: "email",
    name_attribute: "",
    given_name_attribute: "first_name",
    family_name_attribute: "last_name",
    cbc: false,
    note: "Map these names in the Google app's attribute mapping, and set its Name ID format to Persistent.",
  },
];

export function samlPreset(id: string): SamlPreset | undefined {
  return SAML_PRESETS.find((preset) => preset.id === id);
}
