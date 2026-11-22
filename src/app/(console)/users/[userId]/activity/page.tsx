import { ActivityIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { Restricted } from "@/components/app/restricted";
import { AuditTable } from "@/components/audit/audit-table";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditNames } from "@/server/audit-names";
import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

export const metadata: Metadata = { title: "Activity" };

export default async function UserActivityPage({ params }: { params: Promise<{ userId: string }> }) {
  const { operator, api } = await signedIn();
  if (!operator.can("read:audit_events")) {
    return <Restricted scope="read:audit_events" what="the audit trail" />;
  }
  const { userId } = await params;
  const events = await find(api.auditEvents.list({ perPage: 25, target: { type: "user", id: userId } }));
  const names = await auditNames(events.items, api, operator);

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Activity</CardTitle>
        <CardDescription>What happened to this account, newest first: sign-ins, refusals, changes.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/audit?target_type=user&target_id=${userId}` as Route}>Open in the audit log</Link>
          </Button>
        </CardAction>
      </CardHeader>
      {events.items.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={ActivityIcon}
            title="Nothing recorded"
            description="Nothing has happened to this account yet."
          />
        </div>
      ) : (
        <AuditTable events={events.items} names={names} showTarget={false} />
      )}
    </Card>
  );
}
