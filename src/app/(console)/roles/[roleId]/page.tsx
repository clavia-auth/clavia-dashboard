import { signedIn } from "@/server/operator";

import { roleById } from "./data";
import { RoleSettingsForm } from "./role-forms";

export default async function RoleSettingsPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { operator } = await signedIn();
  const { roleId } = await params;

  const role = await roleById(roleId);

  return <RoleSettingsForm role={role} editable={operator.can("update:roles")} />;
}
