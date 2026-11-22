import type { Metadata } from "next";
import { LinkIcon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { RelativeTime } from "@/components/app/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

import { unlinkIdentity } from "../../actions";

export const metadata: Metadata = { title: "Identities" };

export default async function UserIdentitiesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { operator, api } = await signedIn();
  const { userId } = await params;
  const identities = await find(api.users.identities(userId));

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Linked identities</CardTitle>
        <CardDescription>The accounts at other providers this person signs in with.</CardDescription>
      </CardHeader>
      {identities.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={LinkIcon}
            title="None linked"
            description="They have only signed in through this account's own connection."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Connection</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Email at the provider</TableHead>
              <TableHead>Linked</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {identities.map((identity) => (
              <TableRow key={identity.connection}>
                <TableCell className="pl-6">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {identity.connection}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{identity.subject}</TableCell>
                <TableCell className="text-muted-foreground">{identity.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime value={identity.linked_at} />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {operator.can("update:users") ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="sm">
                          Unlink
                        </Button>
                      }
                      title={`Unlink ${identity.connection}?`}
                      description="They can no longer sign in through it; signing in there again would create or link an account anew."
                      confirm="Unlink"
                      destructive
                      action={unlinkIdentity.bind(null, userId, identity.connection)}
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
