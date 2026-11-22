import { KeyRoundIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Fragment } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { Restricted } from "@/components/app/restricted";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { find, load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { RolesEditor } from "./roles-editor";

export const metadata: Metadata = { title: "Roles" };

export default async function UserRolesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { operator, api } = await signedIn();
  if (!operator.can("read:roles")) {
    return <Restricted scope="read:roles" what="roles" />;
  }
  const { userId } = await params;
  const [held, permissions, all] = await Promise.all([
    find(api.users.roles(userId)),
    find(api.users.permissions(userId)),
    operator.can("update:roles") ? load(api.roles.list({ perPage: 100 })) : null,
  ]);
  const byApi = Map.groupBy(permissions, (permission) => permission.resource_server_identifier);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          <CardDescription>The roles this account holds.</CardDescription>
          {all !== null && all.items.length > 0 ? (
            <CardAction>
              <RolesEditor userId={userId} roles={all.items} held={held.map((role) => role.id)} />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          {held.length === 0 ? (
            <EmptyState
              icon={ShieldCheckIcon}
              title="No roles"
              description="They hold no permission on any API that enforces roles."
            />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {held.map((role) => (
                <li key={role.id}>
                  <Badge variant="secondary" asChild>
                    <Link href={`/roles/${role.id}` as Route}>{role.name}</Link>
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Effective permissions</CardTitle>
          <CardDescription>Everything their roles grant, API by API, and which role grants it.</CardDescription>
        </CardHeader>
        {permissions.length === 0 ? (
          <CardContent className="pb-6">
            <EmptyState icon={KeyRoundIcon} title="No permissions" description="Their roles grant nothing yet." />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Permission</TableHead>
                <TableHead>Granted by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...byApi.entries()].map(([identifier, granted]) => (
                <Fragment key={identifier}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={2} className="pl-6 text-xs font-medium text-muted-foreground">
                      {identifier}
                    </TableCell>
                  </TableRow>
                  {granted.map((permission) => (
                    <TableRow key={`${identifier}:${permission.value}`}>
                      <TableCell className="pl-6">
                        <code className="font-mono text-xs">{permission.value}</code>
                        <span className="block text-xs text-muted-foreground">{permission.description}</span>
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-wrap gap-1">
                          {permission.roles.map((role) => (
                            <Badge key={role.id} variant="outline">
                              {role.name}
                            </Badge>
                          ))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
