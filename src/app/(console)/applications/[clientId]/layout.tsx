import type { Metadata, Route } from "next";

import { CopyButton } from "@/components/app/copy-button";
import { PageHeader } from "@/components/app/page-header";
import { Restricted } from "@/components/app/restricted";
import { SectionTabs, type SectionTab } from "@/components/app/section-tabs";
import { signedIn } from "@/server/operator";

import { ApplicationBadges } from "../application-badges";
import { ApplicationActions } from "./application-actions";
import { applicationById } from "./data";

type Props = { params: Promise<{ clientId: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { clientId } = await params;
  const { name } = await applicationById(clientId);

  return { title: { default: name, template: `%s · ${name}` } };
}

export default async function ApplicationLayout({ params, children }: Props) {
  const { operator } = await signedIn();
  if (!operator.can("read:clients")) {
    return <Restricted scope="read:clients" what="applications" />;
  }
  const { clientId } = await params;
  const client = await applicationById(clientId);
  const base = `/applications/${encodeURIComponent(client.client_id)}`;
  const tabs: SectionTab[] = [
    { label: "Settings", href: base as Route },
    ...(client.grant_types.includes("authorization_code")
      ? [{ label: "Connections", href: `${base}/connections` as Route }]
      : []),
    // A third-party application is shown what it is given, and no consent screen names a claim.
    ...(client.is_first_party
      ? [{ label: "Claims", href: `${base}/claims` as Route, count: client.claims.length }]
      : []),
    ...(operator.can("read:audit_events") ? [{ label: "Activity", href: `${base}/activity` as Route }] : []),
  ];

  return (
    <>
      <PageHeader
        title={client.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {client.client_id}
              <CopyButton value={client.client_id} label="Copy the client ID" />
            </span>
            <ApplicationBadges client={client} />
          </span>
        }
        crumbs={[{ label: "Applications", href: "/applications" }, { label: client.name }]}
        actions={
          <ApplicationActions
            clientId={client.client_id}
            name={client.name}
            confidential={client.client_type === "confidential"}
            canUpdate={operator.can("update:clients")}
            canDelete={operator.can("delete:clients")}
          />
        }
      />
      <SectionTabs tabs={tabs} />
      <div className="flex flex-col gap-6">{children}</div>
    </>
  );
}
