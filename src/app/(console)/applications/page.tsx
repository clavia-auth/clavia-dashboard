import { AppWindowIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pager, pageFrom } from "@/components/app/pager";
import { RelativeTime } from "@/components/app/relative-time";
import { Restricted } from "@/components/app/restricted";
import { SearchField } from "@/components/app/search-field";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { ApplicationBadges } from "./application-badges";
import { CreateApplicationDialog } from "./create-application-dialog";
import { GRANT_LABELS } from "./kinds";

export const metadata: Metadata = { title: "Applications" };

const PER_PAGE = 25;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { operator } = await signedIn();
  if (!operator.can("read:clients")) {
    return <Restricted scope="read:clients" what="applications" />;
  }
  const { q, page } = await searchParams;

  return (
    <>
      <PageHeader
        title="Applications"
        description="Every client that asks Clavia for tokens: web apps, single-page apps, services, devices."
        actions={operator.can("create:clients") ? <CreateApplicationDialog /> : undefined}
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <SearchField label="Search applications" placeholder="Search by name or client ID…" />
        </div>
        <Suspense key={`${q ?? ""}:${page ?? ""}`} fallback={<TableSkeleton columns={4} rows={6} />}>
          <ApplicationsTable search={q} page={pageFrom(page)} />
        </Suspense>
      </Card>
    </>
  );
}

async function ApplicationsTable({ search, page }: { search: string | undefined; page: number }) {
  const { api } = await signedIn();
  const clients = await load(api.clients.list({ search, page, perPage: PER_PAGE }));

  if (clients.total === 0) {
    return search === undefined ? (
      <EmptyState
        icon={AppWindowIcon}
        title="No applications yet"
        description="Register the first one to sign people in through it."
      />
    ) : (
      <EmptyState icon={AppWindowIcon} title="No match" description={`No application matches “${search}”.`} />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Application</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Grants</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.items.map((client) => (
            <TableRow key={client.client_id} className="group relative">
              <TableCell className="pl-4">
                <Link href={`/applications/${client.client_id}` as Route} className="after:absolute after:inset-0">
                  <span className="block font-medium">{client.name}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{client.client_id}</span>
                </Link>
              </TableCell>
              <TableCell>
                <ApplicationBadges client={client} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {client.grant_types.map((grant) => GRANT_LABELS[grant]).join(", ") || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <RelativeTime value={client.created_at} />
              </TableCell>
              <TableCell>
                <ChevronRightIcon
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pager
        path="/applications"
        query={{ q: search }}
        page={clients.page}
        perPage={clients.per_page}
        total={clients.total}
      />
    </>
  );
}
