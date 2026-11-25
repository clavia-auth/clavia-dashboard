import { WebhookIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { RelativeTime } from "@/components/app/relative-time";
import { Restricted } from "@/components/app/restricted";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { eventsSummary } from "@/components/webhooks/events";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { CreateWebhookDialog } from "./create-webhook-dialog";
import { WebhookStateBadge } from "./webhook-state-badge";

export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const { operator } = await signedIn();
  if (!operator.can("read:webhooks")) {
    return <Restricted scope="read:webhooks" what="webhooks" />;
  }
  // Clavia also asks for `read:audit_events` to register one: streaming the trail is reading it.
  const creatable = operator.can("create:webhooks") && operator.can("read:audit_events");

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Addresses that receive the audit events they subscribe to, signed as Standard Webhooks. At most twenty."
        actions={creatable ? <CreateWebhookDialog /> : undefined}
      />
      <Card className="gap-0 py-0">
        <Suspense fallback={<TableSkeleton columns={5} rows={3} />}>
          <WebhooksTable creatable={creatable} />
        </Suspense>
      </Card>
    </>
  );
}

async function WebhooksTable({ creatable }: { creatable: boolean }) {
  const { api } = await signedIn();
  const webhooks = await load(api.webhooks.list());

  if (webhooks.length === 0) {
    return (
      <EmptyState
        icon={WebhookIcon}
        title="No webhooks"
        description={
          creatable
            ? "Add one to have audit events sent to a SIEM, a chat or your own service."
            : "None is registered. Adding one needs create:webhooks and read:audit_events."
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Webhook</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Events</TableHead>
          <TableHead>Added</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {webhooks.map((webhook) => (
          <TableRow key={webhook.id}>
            <TableCell className="pl-4">
              <Link href={`/webhooks/${webhook.id}`} className="font-medium hover:underline">
                {webhook.description === "" ? new URL(webhook.url).host : webhook.description}
              </Link>
              <p className="break-all font-mono text-xs text-muted-foreground">{webhook.url}</p>
            </TableCell>
            <TableCell>
              <WebhookStateBadge webhook={webhook} />
            </TableCell>
            <TableCell className="text-muted-foreground">{eventsSummary(webhook.events)}</TableCell>
            <TableCell className="text-muted-foreground">
              <RelativeTime value={webhook.created_at} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
