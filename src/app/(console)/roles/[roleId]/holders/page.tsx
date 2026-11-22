import { UsersIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { Pager, pageFrom } from "@/components/app/pager";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

import { takeRole } from "../../actions";
import { roleById } from "../data";
import { AddHoldersDialog } from "./add-holders-dialog";

export const metadata: Metadata = { title: "Holders" };

const PER_PAGE = 25;

export default async function RoleHoldersPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { operator, api } = await signedIn();
  const [{ roleId }, { page }] = await Promise.all([params, searchParams]);
  const [role, holders] = await Promise.all([
    roleById(roleId),
    find(api.roles.holders(roleId, { page: pageFrom(page), perPage: PER_PAGE })),
  ]);
  const canChange = operator.can("update:roles");

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="py-4">
        <CardTitle>Holders</CardTitle>
        <CardDescription>Everybody this role is given to.</CardDescription>
        {canChange && operator.can("read:users") ? (
          <CardAction>
            <AddHoldersDialog roleId={role.id} roleName={role.name} />
          </CardAction>
        ) : null}
      </CardHeader>
      {holders.total === 0 ? (
        <div className="pb-6">
          <EmptyState
            icon={UsersIcon}
            title="Nobody holds it"
            description="Add holders to give them its permissions."
          />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">User</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {holders.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-6">
                    <Link href={`/users/${user.id}` as Route} className="flex items-center gap-3 hover:underline">
                      <UserAvatar user={user} />
                      <span>
                        <span className="block font-medium">{user.name ?? user.email}</span>
                        {user.name !== null ? (
                          <span className="block text-xs text-muted-foreground">{user.email}</span>
                        ) : null}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {canChange ? (
                      <ConfirmAction
                        trigger={
                          <Button variant="ghost" size="sm">
                            Take away
                          </Button>
                        }
                        title={`Take ${role.name} from ${user.email}?`}
                        description="Their next tokens carry none of its permissions, unless another role grants them."
                        confirm="Take away"
                        destructive
                        action={takeRole.bind(null, role.id, user.id)}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager
            path={`/roles/${role.id}/holders`}
            query={{}}
            page={holders.page}
            perPage={holders.per_page}
            total={holders.total}
          />
        </>
      )}
    </Card>
  );
}
