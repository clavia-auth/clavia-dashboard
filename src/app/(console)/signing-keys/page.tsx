import { KeyRoundIcon, LockKeyholeIcon } from "lucide-react";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { CopyButton } from "@/components/app/copy-button";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { RelativeTime } from "@/components/app/relative-time";
import { Restricted } from "@/components/app/restricted";
import { ActiveBadge } from "@/components/app/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SamlKey, SigningKey } from "@/contract";
import { isManagementError } from "@/core/management/errors";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { RotateKey } from "./rotate-key";
import { RotateSamlKeys } from "./rotate-saml-keys";

export const metadata: Metadata = { title: "Signing keys" };

export default async function SigningKeysPage() {
  const { operator, api } = await signedIn();
  if (!operator.can("read:signing_keys")) {
    return <Restricted scope="read:signing_keys" what="signing keys" />;
  }

  let keys: SigningKey[] | null = null;
  let elsewhere = "";
  try {
    keys = await load(api.signingKeys.list());
  } catch (error) {
    unstable_rethrow(error);
    if (!isManagementError(error, "conflict")) {
      throw error;
    }
    // The keys live at another provider and are rotated there: nothing to show or do here.
    elsewhere = error.message;
  }

  return (
    <>
      <PageHeader
        title="Signing keys"
        description="The keys ID tokens, logout tokens and JWT access tokens are signed with. Applications and APIs verify them with the public keys Clavia publishes; a private key never leaves its backend."
        actions={keys !== null && operator.can("create:signing_keys") ? <RotateKey /> : undefined}
      />
      <Card className="gap-0 py-0">
        {keys === null ? (
          <EmptyState icon={LockKeyholeIcon} title="Keys are kept elsewhere" description={elsewhere} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={KeyRoundIcon}
            title="No signing key yet"
            description="Clavia makes one the first time it needs to sign."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Key id</TableHead>
                <TableHead>Algorithm</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Stopped signing</TableHead>
                <TableHead className="pr-4">Leaves the key set</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.kid}>
                  <TableCell className="pl-4">
                    <span className="flex items-center gap-1">
                      <code className="font-mono text-xs break-all">{key.kid}</code>
                      <CopyButton value={key.kid} label={`Copy key id ${key.kid}`} />
                    </span>
                  </TableCell>
                  <TableCell>{key.algorithm}</TableCell>
                  <TableCell>
                    {key.status === "active" ? (
                      <ActiveBadge active />
                    ) : (
                      <Badge variant="secondary">{key.published ? "Retired, still published" : "Retired"}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <RelativeTime value={key.created_at} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.retired_at === null ? "—" : <RelativeTime value={key.retired_at} />}
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">
                    {key.published_until === null ? "—" : <RelativeTime value={key.published_until} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <SamlKeys canRotate={operator.can("create:signing_keys")} />
    </>
  );
}

const SAML_STATUS = { current: "Current", next: "Next, not used yet", retired: "Retired" } as const;

/**
 * This server's keys as a SAML service provider, beside the token keys: the certificates identity
 * providers pin, and each pair's place in the rotation. Never key material.
 */
async function SamlKeys({ canRotate }: { canRotate: boolean }) {
  const { api } = await signedIn();
  let keys: SamlKey[] | null = null;
  let elsewhere = "";
  try {
    keys = await load(api.samlKeys.list());
  } catch (error) {
    unstable_rethrow(error);
    if (!isManagementError(error, "conflict")) {
      throw error;
    }
    elsewhere = error.message;
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">SAML keys</h2>
          <p className="text-sm text-muted-foreground">
            This server&apos;s keys as a SAML service provider: one signs its requests, one receives the assertions
            identity providers encrypt. Each is published as a self-signed certificate in the metadata an identity
            provider reads; the private half never leaves its backend.
          </p>
        </div>
        {keys !== null && canRotate ? <RotateSamlKeys first={keys.length === 0} /> : null}
      </div>
      <Card className="gap-0 py-0">
        {keys === null ? (
          <EmptyState icon={LockKeyholeIcon} title="SAML keys are kept elsewhere" description={elsewhere} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={KeyRoundIcon}
            title="No SAML key yet"
            description="Without one, requests to identity providers are unsigned and assertions cannot be encrypted."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Certificate (SHA-256)</TableHead>
                <TableHead>Use</TableHead>
                <TableHead>Place</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-4">Certificate expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.kid}>
                  <TableCell className="pl-4">
                    <span className="flex items-center gap-1">
                      <code className="font-mono text-xs break-all">{key.certificate_sha256}</code>
                      <CopyButton value={key.certificate_sha256} label="Copy the fingerprint" />
                    </span>
                  </TableCell>
                  <TableCell>{key.usage === "signing" ? "Signs requests" : "Receives encrypted assertions"}</TableCell>
                  <TableCell>
                    <Badge variant={key.status === "current" ? "secondary" : "outline"}>
                      {SAML_STATUS[key.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <RelativeTime value={key.created_at} />
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">
                    <RelativeTime value={key.valid_until} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
