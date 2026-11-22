import { BoxesIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pager, pageFrom } from "@/components/app/pager";
import { Restricted } from "@/components/app/restricted";
import { SearchField } from "@/components/app/search-field";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { CreateApiDialog } from "./create-api-dialog";

export const metadata: Metadata = { title: "APIs" };

const PER_PAGE = 25;

export default async function ApisPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { operator } = await signedIn();
  if (!operator.can("read:resource_servers")) {
    return <Restricted scope="read:resource_servers" what="APIs" />;
  }
  const { q, page } = await searchParams;

  return (
    <>
      <PageHeader
        title="APIs"
        description="What tokens are issued for. Each defines its permissions; roles and client grants hand them out."
        actions={operator.can("create:resource_servers") ? <CreateApiDialog /> : undefined}
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <SearchField label="Search APIs" placeholder="Search by name or identifier…" />
        </div>
        <Suspense key={`${q ?? ""}:${page ?? ""}`} fallback={<TableSkeleton columns={4} rows={4} />}>
          <ApisTable search={q} page={pageFrom(page)} />
        </Suspense>
      </Card>
    </>
  );
}

async function ApisTable({ search, page }: { search: string | undefined; page: number }) {
  const { api } = await signedIn();
  const apis = await load(api.resourceServers.list({ search, page, perPage: PER_PAGE }));

  if (apis.total === 0) {
    return search === undefined ? (
      <EmptyState icon={BoxesIcon} title="No APIs yet" description="Register one to issue tokens for it." />
    ) : (
      <EmptyState icon={BoxesIcon} title="No match" description={`No API matches “${search}”.`} />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">API</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Policies</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {apis.items.map((resourceServer) => (
            <TableRow key={resourceServer.id} className="group relative">
              <TableCell className="pl-4">
                <Link href={`/apis/${resourceServer.id}` as Route} className="after:absolute after:inset-0">
                  <span className="flex items-center gap-2 font-medium">
                    {resourceServer.name}
                    {resourceServer.is_system ? <Badge variant="secondary">System</Badge> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">{resourceServer.identifier}</span>
                </Link>
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{resourceServer.permissions.length}</TableCell>
              <TableCell>
                <span className="flex flex-wrap gap-1.5">
                  {resourceServer.enforce_policies ? <Badge variant="outline">Roles enforced</Badge> : null}
                  {resourceServer.allow_skipping_consent ? <Badge variant="outline">Consent skippable</Badge> : null}
                </span>
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
      <Pager path="/apis" query={{ q: search }} page={apis.page} perPage={apis.per_page} total={apis.total} />
    </>
  );
}
