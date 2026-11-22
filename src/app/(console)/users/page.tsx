import { ChevronRightIcon, UsersIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pager, pageFrom } from "@/components/app/pager";
import { RelativeTime } from "@/components/app/relative-time";
import { Restricted } from "@/components/app/restricted";
import { SearchField } from "@/components/app/search-field";
import { ActiveBadge, MfaBadge } from "@/components/app/status-badges";
import { UserAvatar } from "@/components/app/user-avatar";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { CreateUserDialog } from "./create-user-dialog";

export const metadata: Metadata = { title: "Users" };

const PER_PAGE = 25;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { operator, api } = await signedIn();
  if (!operator.can("read:users")) {
    return <Restricted scope="read:users" what="users" />;
  }
  const { q, page } = await searchParams;
  const pools = operator.can("read:connections")
    ? (await load(api.connections.list()))
        .filter((connection) => connection.strategy === "database" && connection.is_enabled)
        .map((connection) => ({ name: connection.name, displayName: connection.display_name }))
    : [];

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in through this deployment."
        actions={operator.can("create:users") ? <CreateUserDialog pools={pools} /> : undefined}
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <SearchField label="Search users" placeholder="Search by email…" />
        </div>
        <Suspense key={`${q ?? ""}:${page ?? ""}`} fallback={<TableSkeleton columns={5} rows={8} />}>
          <UsersTable search={q} page={pageFrom(page)} />
        </Suspense>
      </Card>
    </>
  );
}

async function UsersTable({ search, page }: { search: string | undefined; page: number }) {
  const { api } = await signedIn();
  const users = await load(api.users.list({ search, page, perPage: PER_PAGE }));

  if (users.total === 0) {
    return search === undefined ? (
      <EmptyState
        icon={UsersIcon}
        title="No users yet"
        description="Create one, or let people sign up through an application."
      />
    ) : (
      <EmptyState icon={UsersIcon} title="No match" description={`No user's email contains “${search}”.`} />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">User</TableHead>
            <TableHead>Connection</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.items.map((user) => {
            const href = `/users/${user.id}` as Route;

            return (
              <TableRow key={user.id} className="group relative">
                <TableCell className="pl-4">
                  <Link href={href} className="flex items-center gap-3 after:absolute after:inset-0">
                    <UserAvatar user={user} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{user.name ?? user.email}</span>
                      {user.name !== null ? (
                        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                      ) : null}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {user.connection}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <ActiveBadge active={user.is_active} />
                    {user.mfa_enrolled ? <MfaBadge /> : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <RelativeTime value={user.created_at} />
                </TableCell>
                <TableCell>
                  <ChevronRightIcon
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Pager path="/users" query={{ q: search }} page={users.page} perPage={users.per_page} total={users.total} />
    </>
  );
}
