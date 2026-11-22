import { signedIn } from "@/server/operator";

import { apiById } from "./data";
import { ApiSettingsForm } from "./settings-form";

export default async function ApiSettingsPage({ params }: { params: Promise<{ apiId: string }> }) {
  const { operator } = await signedIn();
  const { apiId } = await params;

  const resourceServer = await apiById(apiId);

  return <ApiSettingsForm resourceServer={resourceServer} editable={operator.can("update:resource_servers")} />;
}
