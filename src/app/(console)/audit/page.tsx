import { ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pager, pageFrom } from "@/components/app/pager";
import { Restricted } from "@/components/app/restricted";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { AuditTable } from "@/components/audit/audit-table";
import { isEventType, PERIODS } from "@/components/audit/describe";
import { Card } from "@/components/ui/card";
import type { AuditTargetType } from "@/contract";
import type { AuditQuery } from "@/core/management/management-api";
import { auditNames } from "@/server/audit-names";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { AuditFilters } from "./audit-filters";

export const metadata: Metadata = { title: "Audit log" };

const PER_PAGE = 50;
const TARGETS: readonly AuditTargetType[] = ["user", "client", "resource_server", "role", "connection", "signing_key"];
const HOURS: Record<keyof typeof PERIODS, number> = { "24h": 24, "7d": 7 * 24, "30d": 30 * 24 };

type Search = {
  type?: string;
  outcome?: string;
  period?: string;
  target_type?: string;
  target_id?: string;
  actor_user_id?: string;
  client_id?: string;
  page?: string;
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { operator } = await signedIn();
  if (!operator.can("read:audit_events")) {
    return <Restricted scope="read:audit_events" what="the audit trail" />;
  }
  const search = await searchParams;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Everything that changed who can sign in or what they hold — who did it, to what, and from where."
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <AuditFilters />
        </div>
        <Suspense key={JSON.stringify(search)} fallback={<TableSkeleton columns={5} rows={10} />}>
          <Events search={search} />
        </Suspense>
      </Card>
    </>
  );
}

async function Events({ search }: { search: Search }) {
  const { api, operator } = await signedIn();
  const query = queryFrom(search);
  const events = await load(api.auditEvents.list(query));
  const names = await auditNames(events.items, api, operator);

  if (events.total === 0) {
    return <EmptyState icon={ScrollTextIcon} title="Nothing matches" description="No event matches these filters." />;
  }

  return (
    <>
      <AuditTable events={events.items} names={names} />
      <Pager
        path="/audit"
        query={{ ...search, page: undefined }}
        page={events.page}
        perPage={events.per_page}
        total={events.total}
      />
    </>
  );
}

/** The filters from the URL, each kept only if it is one the API understands. */
function queryFrom(search: Search): AuditQuery {
  const target =
    search.target_type !== undefined &&
    search.target_id !== undefined &&
    (TARGETS as readonly string[]).includes(search.target_type)
      ? { type: search.target_type as AuditTargetType, id: search.target_id }
      : undefined;
  const hours = search.period !== undefined ? HOURS[search.period as keyof typeof PERIODS] : undefined;

  return {
    page: pageFrom(search.page),
    perPage: PER_PAGE,
    ...(search.type !== undefined && isEventType(search.type) ? { types: [search.type] } : {}),
    ...(search.outcome === "success" || search.outcome === "failure" ? { outcome: search.outcome } : {}),
    ...(hours !== undefined ? { since: new Date(Date.now() - hours * 3600 * 1000) } : {}),
    ...(target !== undefined ? { target } : {}),
    ...(search.actor_user_id !== undefined ? { actorUserId: search.actor_user_id } : {}),
    ...(search.client_id !== undefined ? { clientId: search.client_id } : {}),
  };
}
