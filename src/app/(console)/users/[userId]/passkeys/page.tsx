import type { Metadata } from "next";
import { KeyRoundIcon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { RelativeTime } from "@/components/app/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

import { removePasskey } from "../../actions";

export const metadata: Metadata = { title: "Passkeys" };

export default async function UserPasskeysPage({ params }: { params: Promise<{ userId: string }> }) {
  const { operator, api } = await signedIn();
  const { userId } = await params;
  const passkeys = await find(api.users.passkeys(userId));

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          What this person can sign in with besides a password. Removing one is for a lost device; their authenticator
          app and recovery codes are turned off from the account menu.
        </CardDescription>
      </CardHeader>
      {passkeys.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={KeyRoundIcon}
            title="No passkeys"
            description="They have not added one. They can from their account when they sign in."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Name</TableHead>
              <TableHead>Kept</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {passkeys.map((passkey) => (
              <TableRow key={passkey.id}>
                <TableCell className="pl-6 font-medium">{passkey.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{passkey.synced ? "Synced" : "This device only"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime value={passkey.created_at} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {passkey.last_used_at === null ? "Never" : <RelativeTime value={passkey.last_used_at} />}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {operator.can("update:users") ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="sm" aria-label={`Remove passkey ${passkey.name}`}>
                          Remove
                        </Button>
                      }
                      title={`Remove “${passkey.name}”?`}
                      description="They can no longer sign in with it. If it was their only second factor, their next sign-in asks for a password alone, unless they have another."
                      confirm="Remove passkey"
                      destructive
                      action={removePasskey.bind(null, userId, passkey.id)}
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
