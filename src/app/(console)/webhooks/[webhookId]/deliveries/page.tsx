import { InboxIcon } from "lucide-react";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { Pager, pageFrom } from "@/components/app/pager";
import { RelativeTime } from "@/components/app/relative-time";
import { Restricted } from "@/components/app/restricted";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EVENT_TYPES, isEventType } from "@/components/audit/describe";
import type { WebhookDelivery } from "@/contract";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { webhookById } from "../data";
import { FAILURES, STATUSES } from "./labels";

const PER_PAGE = 25;

export default async function WebhookDeliveriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ webhookId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { operator } = await signedIn();
  if (!operator.can("read:audit_events")) {
    return <Restricted scope="read:audit_events" what="deliveries, which name the audit events sent" />;
  }
  const { webhookId } = await params;
  const { page } = await searchParams;
  const webhook = await webhookById(webhookId);

  return (
    <Card className="gap-0 py-0">
      <p className="border-b p-4 text-sm text-muted-foreground">
        What was sent to {new URL(webhook.url).host}, newest first, kept seven days after it ends. Never a body: neither
        what was sent nor what the receiver answered is kept.
      </p>
      <Suspense key={page ?? ""} fallback={<TableSkeleton columns={5} rows={5} />}>
        <DeliveriesTable webhookId={webhookId} page={pageFrom(page)} />
      </Suspense>
    </Card>
  );
}

async function DeliveriesTable({ webhookId, page }: { webhookId: string; page: number }) {
  const { api } = await signedIn();
  const deliveries = await load(api.webhooks.deliveries(webhookId, { page, perPage: PER_PAGE }));

  if (deliveries.total === 0) {
    return (
      <EmptyState
        icon={InboxIcon}
        title="Nothing sent yet"
        description="Send a test, or wait for an event the webhook subscribes to."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Last answer</TableHead>
            <TableHead>Sent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.items.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="pl-4">
                <p className="font-medium">
                  {isEventType(delivery.event_type) ? EVENT_TYPES[delivery.event_type].label : delivery.event_type}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{delivery.event_type}</p>
              </TableCell>
              <TableCell>
                <StatusBadge delivery={delivery} />
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{delivery.attempts}</TableCell>
              <TableCell className="text-muted-foreground">
                <LastAnswer delivery={delivery} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                <RelativeTime value={delivery.created_at} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pager
        path={`/webhooks/${webhookId}/deliveries`}
        query={{}}
        page={deliveries.page}
        perPage={deliveries.per_page}
        total={deliveries.total}
      />
    </>
  );
}

function StatusBadge({ delivery }: { delivery: WebhookDelivery }) {
  const status = STATUSES[delivery.status];

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="outline" className={status.className}>
        {status.label}
      </Badge>
      {delivery.status === "pending" && delivery.next_attempt_at !== null ? (
        <span className="text-xs text-muted-foreground">
          next <RelativeTime value={delivery.next_attempt_at} />
        </span>
      ) : null}
    </div>
  );
}

function LastAnswer({ delivery }: { delivery: WebhookDelivery }) {
  if (delivery.last_failure === null) {
    return delivery.last_status_code === null ? (
      "—"
    ) : (
      <span className="tabular-nums">
        {delivery.last_status_code}
        {delivery.last_duration_ms !== null ? ` · ${delivery.last_duration_ms} ms` : ""}
      </span>
    );
  }

  return (
    <span>
      {FAILURES[delivery.last_failure]}
      {delivery.last_status_code !== null ? <span className="tabular-nums"> ({delivery.last_status_code})</span> : null}
    </span>
  );
}
