import type { Metadata } from "next";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signedIn } from "@/server/operator";

import { apiById } from "../data";
import { PermissionsEditor } from "./permissions-editor";

export const metadata: Metadata = { title: "Permissions" };

export default async function ApiPermissionsPage({ params }: { params: Promise<{ apiId: string }> }) {
  const { operator } = await signedIn();
  const { apiId } = await params;
  const resourceServer = await apiById(apiId);

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Permissions</CardTitle>
        <CardDescription>
          {resourceServer.is_system ? (
            <>
              The Management API&apos;s permissions are the server&apos;s, brought up to date by{" "}
              <code className="font-mono text-xs">clavia management-api:register</code>.
            </>
          ) : (
            "What a token for this API may carry, as scopes. Roles and client grants choose among them."
          )}
        </CardDescription>
      </CardHeader>
      <PermissionsEditor
        apiId={resourceServer.id}
        permissions={resourceServer.permissions}
        editable={operator.can("update:resource_servers") && !resourceServer.is_system}
      />
    </Card>
  );
}
