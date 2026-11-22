import { ChevronRightIcon, PlugIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Restricted } from "@/components/app/restricted";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { CreateConnectionDialog } from "./create-connection-dialog";
import { EnabledSwitch } from "./enabled-switch";
import { STRATEGIES } from "./strategy";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage() {
  const { operator, api } = await signedIn();
  if (!operator.can("read:connections")) {
    return <Restricted scope="read:connections" what="connections" />;
  }
  const connections = await load(api.connections.list());
  const editable = operator.can("update:connections");

  return (
    <>
      <PageHeader
        title="Connections"
        description="The ways people sign in. Every account belongs to one; each application offers the ones it enables."
        actions={operator.can("create:connections") ? <CreateConnectionDialog /> : undefined}
      />
      <Card className="gap-0 py-0">
        {connections.length === 0 ? (
          <EmptyState
            icon={PlugIcon}
            title="No connections"
            description="Create a pool of password accounts to start."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Connection</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="w-20">On</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((connection) => (
                <TableRow key={connection.name} className="group">
                  <TableCell className="pl-4">
                    <Link href={`/connections/${connection.name}` as Route} className="hover:underline">
                      <span className="block font-medium">{connection.display_name}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{connection.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{STRATEGIES[connection.strategy].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1.5">
                      {connection.is_domain_connection ? <Badge variant="outline">Domain</Badge> : null}
                      {connection.configured ? null : (
                        <Badge variant="outline" className="border-gold/50 text-gold-foreground">
                          Not configured
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <EnabledSwitch
                      name={connection.name}
                      label={connection.display_name}
                      enabled={connection.is_enabled}
                      editable={editable}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/connections/${connection.name}` as Route}
                      aria-label={`Open ${connection.display_name}`}
                    >
                      <ChevronRightIcon
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
