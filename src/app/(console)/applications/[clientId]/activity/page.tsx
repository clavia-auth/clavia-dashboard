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

export default async function ApplicationActivityPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { operator, api } = await signedIn();
  if (!operator.can("read:audit_events")) {
    return <Restricted scope="read:audit_events" what="the audit trail" />;
  }
  const { clientId } = await params;
  // What it did (tokens, through it) and what was done to it.
  const [events, changes] = await Promise.all([
    find(api.auditEvents.list({ perPage: 25, clientId })),
    find(api.auditEvents.list({ perPage: 25, target: { type: "client", id: clientId } })),
  ]);
  const merged = [...new Map([...events.items, ...changes.items].map((event) => [event.id, event])).values()]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 25);
  const names = await auditNames(merged, api, operator);

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Activity</CardTitle>
        <CardDescription>Tokens it was issued, sign-ins through it, and changes to it — newest first.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/audit?client_id=${encodeURIComponent(clientId)}` as Route}>Open in the audit log</Link>
          </Button>
        </CardAction>
      </CardHeader>
      {merged.length === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={ActivityIcon}
            title="Nothing recorded"
            description="Nothing has happened through this application yet."
          />
        </div>
      ) : (
        <AuditTable events={merged} names={names} />
      )}
    </Card>
  );
}
