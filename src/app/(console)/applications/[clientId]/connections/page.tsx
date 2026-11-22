import { GlobeIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/app/empty-state";
import { Restricted } from "@/components/app/restricted";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { applicationById } from "../data";
import { ConnectionsForm } from "./connections-form";

export const metadata: Metadata = { title: "Connections" };

export default async function ApplicationConnectionsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { operator, api } = await signedIn();
  const { clientId } = await params;
  const client = await applicationById(clientId);
  if (!client.is_first_party) {
    return (
      <EmptyState
        icon={GlobeIcon}
        title="The domain connections"
        description="A third-party application offers the connections marked as domain connections, and no others. Mark them on the Connections page."
      />
    );
  }
  if (!operator.can("read:connections")) {
    return <Restricted scope="read:connections" what="connections" />;
  }
  const connections = await load(api.connections.list());

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Connections</CardTitle>
        <CardDescription>
          The ways people may sign in to this application. Its login page offers these and no others, and a session made
          another way does not count for it.
        </CardDescription>
      </CardHeader>
      <ConnectionsForm
        clientId={client.client_id}
        connections={connections}
        enabled={client.connections}
        editable={operator.can("update:clients")}
      />
    </Card>
  );
}
