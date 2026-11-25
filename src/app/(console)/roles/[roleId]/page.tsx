import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { roleById } from "./data";
import { RoleSettingsForm } from "./role-forms";

export default async function RoleSettingsPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { operator, api } = await signedIn();
  const { roleId } = await params;

  const role = await roleById(roleId);
  // Which APIs are the server's own is read where the operator may; without it Clavia has the last word.
  const systemApis = operator.can("read:resource_servers")
    ? new Set(
        (await load(api.resourceServers.list({ perPage: 100 }))).items
          .filter((resourceServer) => resourceServer.is_system)
          .map((resourceServer) => resourceServer.id),
      )
    : new Set<string>();
  const holdsSystemPermission = role.permissions.some((permission) => systemApis.has(permission.resource_server_id));

  return (
    <RoleSettingsForm
      role={role}
      editable={operator.can("update:roles")}
      holdsSystemPermission={holdsSystemPermission}
    />
  );
}
