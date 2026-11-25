import { CheckCircle2Icon, CircleSlashIcon, ClockIcon, KeyRoundIcon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { RelativeTime } from "@/components/app/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProvisioningToken, ProvisioningTokenState } from "@/contract";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { revokeProvisioningToken } from "../actions";
import { IssueProvisioningTokenDialog } from "./issue-provisioning-token-dialog";

const STATES = {
  active: { label: "Active", icon: CheckCircle2Icon, className: "border-success/40 text-success" },
  expired: { label: "Expired", icon: ClockIcon, className: "text-muted-foreground" },
  revoked: { label: "Revoked", icon: CircleSlashIcon, className: "text-muted-foreground" },
} as const satisfies Record<ProvisioningTokenState, unknown>;

function StateBadge({ token }: { token: ProvisioningToken }) {
  const { label, icon: Icon, className } = STATES[token.state];

  return (
    <span className="flex flex-wrap items-center gap-1">
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Icon aria-hidden /> {label}
      </Badge>
      {token.expiring_soon ? (
        <Badge variant="outline" className="border-gold/50 text-gold-foreground">
          Expires soon
        </Badge>
      ) : null}
    </span>
  );
}

/**
 * How a directory (Entra ID, Okta) provisions this connection's accounts through SCIM: the tokens
 * it holds, which an operator issues and revokes. Whether sign-in then needs a provisioned account is
 * the connection's settings above.
 */
export async function ProvisioningPanel({ name, enterprise }: { name: string; enterprise: boolean }) {
  const { operator, api } = await signedIn();
  const tokens = operator.can("read:provisioning_tokens")
    ? await load(api.provisioningTokens.list({ connection: name, perPage: 100 }))
    : undefined;

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Provisioning</CardTitle>
        <CardDescription>
          A directory such as Entra ID or Okta creates, updates and removes this connection&apos;s accounts through SCIM
          2.0, with a token you issue here. A revoked token stops it at once; the accounts it provisioned stay.
        </CardDescription>
        {tokens !== undefined && operator.can("create:provisioning_tokens") ? (
          <CardAction>
            <IssueProvisioningTokenDialog connection={name} enterprise={enterprise} />
          </CardAction>
        ) : null}
      </CardHeader>
      {tokens === undefined ? (
        <p className="border-t px-6 py-4 text-sm text-muted-foreground">
          Your roles do not grant read:provisioning_tokens, which listing the tokens needs.
        </p>
      ) : tokens.total === 0 ? (
        <EmptyState
          icon={KeyRoundIcon}
          title="No token issued"
          description="Issue one, and give it with the base URL to the directory."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Description</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Options</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.items.map((token) => (
              <TableRow key={token.id}>
                <TableCell className="pl-4 font-medium">{token.description}</TableCell>
                <TableCell>
                  <StateBadge token={token} />
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {enterprise ? <Badge variant="secondary">{token.subject_attribute}</Badge> : null}
                    {token.addresses_trusted ? <Badge variant="secondary">Addresses trusted</Badge> : null}
                    {token.delete_deactivates ? <Badge variant="secondary">Delete deactivates</Badge> : null}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime value={token.expires_at} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime value={token.created_at} />
                </TableCell>
                <TableCell className="pr-4 text-right">
                  {operator.can("delete:provisioning_tokens") && token.state === "active" ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="sm" aria-label={`Revoke ${token.description}`}>
                          Revoke
                        </Button>
                      }
                      title={`Revoke “${token.description}”?`}
                      description="The directory holding it provisions nothing more, at once. The accounts it provisioned stay."
                      confirm="Revoke token"
                      destructive
                      action={revokeProvisioningToken.bind(null, token.id)}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
