import type { Metadata, Route } from "next";

import { CopyButton } from "@/components/app/copy-button";
import { PageHeader } from "@/components/app/page-header";
import { Restricted } from "@/components/app/restricted";
import { SectionTabs } from "@/components/app/section-tabs";
import { Badge } from "@/components/ui/badge";
import { signedIn } from "@/server/operator";

import { DeleteApiButton } from "./api-actions";
import { apiById } from "./data";

type Props = { params: Promise<{ apiId: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { apiId } = await params;
  const { name } = await apiById(apiId);

  return { title: { default: name, template: `%s · ${name}` } };
}

export default async function ApiLayout({ params, children }: Props) {
  const { operator } = await signedIn();
  if (!operator.can("read:resource_servers")) {
    return <Restricted scope="read:resource_servers" what="APIs" />;
  }
  const { apiId } = await params;
  const resourceServer = await apiById(apiId);
  const base = `/apis/${resourceServer.id}`;

  return (
    <>
      <PageHeader
        title={resourceServer.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1">
              {resourceServer.identifier}
              <CopyButton value={resourceServer.identifier} label="Copy the identifier" />
            </span>
            {resourceServer.is_system ? <Badge variant="secondary">System — the server&apos;s own</Badge> : null}
          </span>
        }
        crumbs={[{ label: "APIs", href: "/apis" }, { label: resourceServer.name }]}
        actions={
          operator.can("delete:resource_servers") && !resourceServer.is_system ? (
            <DeleteApiButton apiId={resourceServer.id} name={resourceServer.name} />
          ) : undefined
        }
      />
      <SectionTabs
        tabs={[
          { label: "Settings", href: base as Route },
          { label: "Permissions", href: `${base}/permissions` as Route, count: resourceServer.permissions.length },
          // The Management API's tokens are read by the server alone: no claims to add.
          ...(resourceServer.is_system
            ? []
            : [
                { label: "Claims", href: `${base}/claims` as Route, count: resourceServer.claims.length },
                { label: "Authorization", href: `${base}/authorization` as Route },
              ]),
        ]}
      />
      <div className="flex flex-col gap-6">{children}</div>
    </>
  );
}
