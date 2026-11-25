import { ChevronRightIcon, ShieldCheckIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { CreateRoleDialog } from "./create-role-dialog";

export const metadata: Metadata = { title: "Roles" };

const PER_PAGE = 25;

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { operator } = await signedIn();
  if (!operator.can("read:roles")) {
    return <Restricted scope="read:roles" what="roles" />;
  }
  const { q, page } = await searchParams;

  return (
    <>
      <PageHeader
        title="Roles"
        description="How people come to hold an API's permissions. On an API enforcing roles, a token carries what its holder's roles grant."
        actions={operator.can("create:roles") ? <CreateRoleDialog /> : undefined}
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <SearchField label="Search roles" placeholder="Search by name…" />
        </div>
        <Suspense key={`${q ?? ""}:${page ?? ""}`} fallback={<TableSkeleton columns={3} rows={4} />}>
          <RolesTable search={q} page={pageFrom(page)} />
        </Suspense>
      </Card>
    </>
  );
}

async function RolesTable({ search, page }: { search: string | undefined; page: number }) {
  const { api } = await signedIn();
  const roles = await load(api.roles.list({ search, page, perPage: PER_PAGE }));

  if (roles.total === 0) {
    return search === undefined ? (
      <EmptyState
        icon={ShieldCheckIcon}
        title="No roles yet"
        description="Create one, give it permissions, then give it to people."
      />
    ) : (
      <EmptyState icon={ShieldCheckIcon} title="No match" description={`No role matches “${search}”.`} />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.items.map((role) => (
            <TableRow key={role.id} className="group relative">
              <TableCell className="pl-4">
                <Link href={`/roles/${role.id}` as Route} className="after:absolute after:inset-0">
                  <span className="block font-medium">
                    {role.name}
                    {role.provisionable ? (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        Provisionable
                      </Badge>
                    ) : null}
                  </span>
                  {role.description !== "" ? (
                    <span className="block text-xs text-muted-foreground">{role.description}</span>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <RelativeTime value={role.created_at} />
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
      <Pager path="/roles" query={{ q: search }} page={roles.page} perPage={roles.per_page} total={roles.total} />
    </>
  );
}
