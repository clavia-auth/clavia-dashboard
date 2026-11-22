import { ActivityIcon, AppWindowIcon, BoxesIcon, ShieldAlertIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { AuditTable } from "@/components/audit/audit-table";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ManagementScope } from "@/contract";
import type { ManagementApi } from "@/core/management/management-api";
import { auditNames } from "@/server/audit-names";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

export const metadata: Metadata = { title: "Overview" };

type Stat = Readonly<{
  title: string;
  href: Route;
  icon: typeof UsersIcon;
  needs: ManagementScope;
  count: (api: ManagementApi) => Promise<number>;
}>;

const STATS: readonly Stat[] = [
  {
    title: "Users",
    href: "/users",
    icon: UsersIcon,
    needs: "read:users",
    count: totalOf((api) => api.users.list({ perPage: 1 })),
  },
  {
    title: "Applications",
    href: "/applications",
    icon: AppWindowIcon,
    needs: "read:clients",
    count: totalOf((api) => api.clients.list({ perPage: 1 })),
  },
  {
    title: "APIs",
    href: "/apis",
    icon: BoxesIcon,
    needs: "read:resource_servers",
    count: totalOf((api) => api.resourceServers.list({ perPage: 1 })),
  },
  {
    title: "Roles",
    href: "/roles",
    icon: ShieldCheckIcon,
    needs: "read:roles",
    count: totalOf((api) => api.roles.list({ perPage: 1 })),
  },
];

export default async function OverviewPage() {
  const { operator } = await signedIn();
  const stats = STATS.filter((stat) => operator.can(stat.needs));
  const canAudit = operator.can("read:audit_events");

  return (
    <>
      <PageHeader
        title={`Welcome, ${operator.identity.name ?? operator.displayName}`}
        description="Your Clavia deployment at a glance."
      />
      {stats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.href} className="relative transition-colors hover:border-primary/40">
              <CardHeader>
                <CardDescription>{stat.title}</CardDescription>
                <CardAction>
                  <stat.icon className="size-4 text-muted-foreground" aria-hidden />
                </CardAction>
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  <Suspense fallback={<Skeleton className="h-9 w-16" />}>
                    <Count stat={stat} />
                  </Suspense>
                </CardTitle>
              </CardHeader>
              <Link href={stat.href} className="absolute inset-0 rounded-xl" aria-label={`Open ${stat.title}`} />
            </Card>
          ))}
        </div>
      ) : null}
      {canAudit ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>The latest changes and sign-ins, newest first.</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/audit">Open the audit log</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <Suspense fallback={<RowsSkeleton rows={6} />}>
                <RecentActivity />
              </Suspense>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Refused sign-ins</CardTitle>
              <CardDescription>In the last 24 hours.</CardDescription>
              <CardAction>
                <ShieldAlertIcon className="size-4 text-muted-foreground" aria-hidden />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-16 w-full" />}>
                <RefusedSignIns />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

async function Count({ stat }: { stat: Stat }) {
  const { api } = await signedIn();

  return <>{(await load(stat.count(api))).toLocaleString()}</>;
}

async function RecentActivity() {
  const { api, operator } = await signedIn();
  const page = await load(api.auditEvents.list({ perPage: 8 }));
  if (page.items.length === 0) {
    return <EmptyState icon={ActivityIcon} title="Nothing yet" description="Events appear here as they happen." />;
  }

  const names = await auditNames(page.items, api, operator);

  return <AuditTable events={page.items} names={names} />;
}

async function RefusedSignIns() {
  const { api } = await signedIn();
  const page = await load(refusedSince(api, 24));

  return (
    <div className="space-y-3">
      <p className="text-4xl font-semibold tabular-nums">{page.total.toLocaleString()}</p>
      <Button variant="link" className="h-auto p-0" asChild>
        <Link href="/audit?type=authentication.failed">See who and why</Link>
      </Button>
    </div>
  );
}

/** The refused sign-ins of the last `hours`. */
function refusedSince(api: ManagementApi, hours: number) {
  const since = new Date(Date.now() - hours * 3600 * 1000);

  return api.auditEvents.list({ perPage: 1, types: ["authentication.failed"], since });
}

function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2 px-6">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

function totalOf(list: (api: ManagementApi) => Promise<{ total: number }>): (api: ManagementApi) => Promise<number> {
  return async (api) => (await list(api)).total;
}
