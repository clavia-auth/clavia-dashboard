import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Restricted } from "@/components/app/restricted";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { find } from "@/server/load";
import { signedIn } from "@/server/operator";

import { STRATEGIES } from "../strategy";
import { ConnectionForm, DeleteConnectionButton } from "./connection-form";
import { ProvisioningPanel } from "./provisioning-panel";
import { SamlPanel } from "./saml-panel";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const { api } = await signedIn();

  return { title: (await find(api.connections.get(name))).display_name };
}

export default async function ConnectionPage({ params }: Props) {
  const { operator, api } = await signedIn();
  if (!operator.can("read:connections")) {
    return <Restricted scope="read:connections" what="connections" />;
  }
  const { name } = await params;
  const connection = await find(api.connections.get(name));
  const enterprise = connection.strategy === "oidc" || connection.strategy === "saml";
  // A directory provisions a pool's accounts or an enterprise connection's; the other kinds have none.
  const provisionable = enterprise || connection.strategy === "database";
  const builtIn =
    connection.strategy === "social" || connection.strategy === "passwordless" || connection.name === "password";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={connection.display_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-xs">{connection.name}</code>
            <Badge variant="secondary">{STRATEGIES[connection.strategy].label}</Badge>
            {builtIn ? <Badge variant="outline">Built in</Badge> : null}
            {!connection.usable && connection.is_enabled ? (
              <Badge variant="outline" className="border-gold/50 text-gold-foreground">
                On, but cannot work yet
              </Badge>
            ) : null}
          </span>
        }
        crumbs={[{ label: "Connections", href: "/connections" }, { label: connection.display_name }]}
        actions={
          operator.can("delete:connections") && !builtIn ? (
            <DeleteConnectionButton name={connection.name} displayName={connection.display_name} />
          ) : undefined
        }
      />
      <ConnectionForm connection={connection} editable={operator.can("update:connections")} />
      {connection.saml !== null ? (
        <SamlPanel name={connection.name} saml={connection.saml} canRefresh={operator.can("update:connections")} />
      ) : null}
      {provisionable ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <ProvisioningPanel name={connection.name} enterprise={enterprise} />
        </Suspense>
      ) : null}
    </div>
  );
}
