import type { Metadata } from "next";

import { Restricted } from "@/components/app/restricted";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { roleById } from "../data";
import { PermissionsPicker } from "./permissions-picker";

export const metadata: Metadata = { title: "Permissions" };

export default async function RolePermissionsPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { operator, api } = await signedIn();
  if (!operator.can("read:resource_servers")) {
    return <Restricted scope="read:resource_servers" what="the APIs whose permissions a role grants" />;
  }
  const { roleId } = await params;
  const [role, apis] = await Promise.all([roleById(roleId), load(api.resourceServers.list({ perPage: 100 }))]);

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Permissions</CardTitle>
        <CardDescription>
          What the role grants, API by API. On an API that enforces roles, a token carries what its holder&apos;s roles
          grant, decided at every issuance.
        </CardDescription>
      </CardHeader>
      <PermissionsPicker
        roleId={role.id}
        apis={apis.items}
        granted={role.permissions}
        editable={operator.can("update:roles")}
      />
    </Card>
  );
}
