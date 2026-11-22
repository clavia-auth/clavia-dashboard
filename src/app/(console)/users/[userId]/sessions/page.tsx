import type { Metadata } from "next";
import { MonitorSmartphoneIcon } from "lucide-react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { RelativeTime } from "@/components/app/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

import { endAllSessions, endSession } from "../../actions";

/** The `amr` values Clavia records, in words. */
const METHODS: Record<string, string> = {
  pwd: "Password",
  otp: "One-time code",
  mfa: "Two-factor",
  ext: "External provider",
};

export const metadata: Metadata = { title: "Sessions" };

export default async function UserSessionsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { operator, api } = await signedIn();
  const { userId } = await params;
  const sessions = await find(api.users.sessions(userId));
  const canEnd = operator.can("update:users");

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Browser sessions</CardTitle>
        <CardDescription>
          Where they are signed in at Clavia. Ending a session tells every application that signed in through it.
        </CardDescription>
        {canEnd && sessions.length > 0 ? (
          <CardAction>
            <ConfirmAction
              trigger={
                <Button variant="outline" size="sm">
                  End every session
                </Button>
              }
              title="End every session?"
              description="They are signed out of Clavia everywhere, and each application they signed in to is told."
              confirm="End every session"
              destructive
              action={endAllSessions.bind(null, userId)}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      {sessions.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={MonitorSmartphoneIcon}
            title="Not signed in"
            description="They have no session open at Clavia."
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Signed in</TableHead>
              <TableHead>With</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.sid}>
                <TableCell className="pl-6">
                  <RelativeTime value={session.created_at} />
                  <span className="block font-mono text-xs text-muted-foreground">{session.sid.slice(0, 12)}…</span>
                </TableCell>
                <TableCell>
                  <span className="flex flex-wrap gap-1">
                    {session.amr.map((method) => (
                      <Badge key={method} variant="outline">
                        {METHODS[method] ?? method}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="font-mono text-xs">
                      {session.connection}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {session.clients.length === 0 ? "—" : session.clients.map((client) => client.name).join(", ")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime value={session.expires_at} />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  {canEnd ? (
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="sm">
                          End
                        </Button>
                      }
                      title="End this session?"
                      description="That browser is signed out of Clavia, and the applications it signed in to are told."
                      confirm="End session"
                      destructive
                      action={endSession.bind(null, userId, session.sid)}
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
