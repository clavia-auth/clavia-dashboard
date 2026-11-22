import { AppWindowIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { RelativeTime } from "@/components/app/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

import { withdrawConsent } from "../../actions";

export const metadata: Metadata = { title: "Applications" };

export default async function UserApplicationsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { operator, api } = await signedIn();
  const { userId } = await params;
  const consents = await find(api.users.consents(userId));

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Authorized applications</CardTitle>
        <CardDescription>
          What they allowed each application, on the consent screen or by approving a device.
        </CardDescription>
      </CardHeader>
      {consents.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={AppWindowIcon}
            title="Nothing authorized"
            description="They have not consented to any application."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Application</TableHead>
              <TableHead>API</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Last changed</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {consents.map((consent) => (
              <TableRow key={`${consent.client_id}:${consent.audience ?? ""}`}>
                <TableCell className="pl-6">
                  <Link href={`/applications/${consent.client_id}` as Route} className="font-medium hover:underline">
                    {consent.client_name}
                  </Link>
                  {!consent.is_first_party ? (
                    <Badge variant="outline" className="ml-2">
                      Third-party
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{consent.audience ?? "—"}</TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {consent.scopes.map((scope) => (
                      <code key={scope} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {scope}
                      </code>
                    ))}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime value={consent.updated_at} />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {operator.can("update:users") ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="sm">
                          Withdraw
                        </Button>
                      }
                      title={`Withdraw consent for ${consent.client_name}?`}
                      description="Tokens already issued keep working until they expire; next time, the application asks again."
                      confirm="Withdraw"
                      destructive
                      action={withdrawConsent.bind(null, userId, consent.client_id)}
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
