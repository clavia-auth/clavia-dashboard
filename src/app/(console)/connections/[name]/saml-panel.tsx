import { TriangleAlertIcon } from "lucide-react";

import { CopyButton } from "@/components/app/copy-button";
import { RelativeTime } from "@/components/app/relative-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SamlConnection } from "@/contract";

import { RefreshMetadataButton } from "./refresh-metadata-button";

/** What a SAML connection is set to, and what its identity provider's administrator needs from us. */
export function SamlPanel({ name, saml, canRefresh }: { name: string; saml: SamlConnection; canRefresh: boolean }) {
  const sp = saml.service_provider;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Give these to the identity provider</CardTitle>
          <CardDescription>
            What its administrator enters to register Clavia as a service provider. The metadata URL carries all three,
            with this server&apos;s certificates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sp.warning !== null ? (
            <Alert>
              <TriangleAlertIcon aria-hidden />
              <AlertTitle>Limited until this server has a SAML key</AlertTitle>
              <AlertDescription>{sp.warning}</AlertDescription>
            </Alert>
          ) : null}
          <dl className="space-y-3 text-sm">
            <Value label="Entity ID" value={sp.entity_id} />
            <Value label="Assertion consumer service URL (ACS, HTTP-POST)" value={sp.acs_url} />
            <Value label="Metadata URL" value={sp.metadata_url} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity provider</CardTitle>
          <CardDescription>
            Fixed when the connection is registered, except what its metadata says. To change an option, register the
            connection again.
          </CardDescription>
          {canRefresh && saml.metadata_url !== null ? (
            <CardAction>
              <RefreshMetadataButton name={name} />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-3 text-sm">
            <Value label="Entity ID" value={saml.entity_id} />
            <Value label="Single sign-on URL (HTTP-Redirect)" value={saml.sso_url} />
            {saml.metadata_url !== null ? (
              <Value label="Metadata URL" value={saml.metadata_url} />
            ) : (
              <div>
                <dt className="text-muted-foreground">Metadata</dt>
                <dd>Given as a document: it cannot be refreshed.</dd>
              </div>
            )}
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-medium">Signing certificates</h3>
            <p className="mb-2 text-sm text-muted-foreground">
              Assertions must be signed by one of these keys. They are pinned by key, so an expiry date is shown and
              never enforced. When the provider rolls a certificate over, refresh the metadata.
            </p>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">SHA-256 fingerprint</TableHead>
                    <TableHead className="pr-4">Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saml.certificates.map((certificate) => (
                    <TableRow key={certificate.sha256}>
                      <TableCell className="pl-4">
                        <span className="flex items-center gap-1">
                          <code className="font-mono text-xs break-all">{certificate.sha256}</code>
                          <CopyButton value={certificate.sha256} label="Copy the fingerprint" />
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-muted-foreground">
                        {certificate.not_after === null ? "—" : <RelativeTime value={certificate.not_after} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Attribute
              label="Subject"
              value={saml.subject_attribute}
              fallback={`The ${shortFormat(saml.name_id_format)} NameID`}
            />
            <Attribute label="Email" value={saml.email_attribute} fallback="The NameID, when it is an address" />
            <Attribute label="Name" value={saml.name_attribute} />
            <Attribute label="Given name" value={saml.given_name_attribute} />
            <Attribute label="Family name" value={saml.family_name_attribute} />
          </dl>

          <ul className="flex flex-wrap gap-2">
            <Option on={saml.email_trusted} label="Addresses trusted" />
            <Option on={saml.sign_requests} label="Requests signed" />
            <Option on={saml.require_encryption} label="Encryption required" />
            <Option on={saml.require_gcm} label="AES-GCM required" />
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1">
        <code className="font-mono text-xs break-all">{value}</code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </dd>
    </div>
  );
}

function Attribute({
  label,
  value,
  fallback = "Not mapped",
}: {
  label: string;
  value: string | null;
  fallback?: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value !== null ? <code className="font-mono text-xs break-all">{value}</code> : fallback}</dd>
    </div>
  );
}

function Option({ on, label }: { on: boolean; label: string }) {
  return (
    <li>
      <Badge variant={on ? "secondary" : "outline"} className={on ? undefined : "text-muted-foreground"}>
        {label}: {on ? "yes" : "no"}
      </Badge>
    </li>
  );
}

/** `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent` as "persistent". */
function shortFormat(format: string): string {
  return format.split(":").at(-1) ?? format;
}
