import { DownloadIcon, ScrollTextIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pager } from "@/components/app/pager";
import { Restricted } from "@/components/app/restricted";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { AuditTable } from "@/components/audit/audit-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { auditNames } from "@/server/audit-names";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { AuditFilters } from "./audit-filters";
import { queryFrom, type Search } from "./query";

export const metadata: Metadata = { title: "Audit log" };

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
        actions={
          <Button variant="outline" asChild>
            {/* A download, not a page: a plain link, so the router leaves it to the browser. The base path is next.config's. */}
            <a href={`/dashboard/audit/export${exportQuery(search)}`} download>
              <DownloadIcon aria-hidden /> Export CSV
            </a>
          </Button>
        }
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

/** The filters on screen, without the page: the export covers every page of them. */
function exportQuery(search: Search): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (key !== "page" && value !== undefined) {
      query.set(key, value);
    }
  }
  const qs = query.toString();

  return qs === "" ? "" : `?${qs}`;
}
