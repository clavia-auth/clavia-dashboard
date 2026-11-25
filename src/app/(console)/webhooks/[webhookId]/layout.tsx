import type { Metadata, Route } from "next";

import { CopyButton } from "@/components/app/copy-button";
import { PageHeader } from "@/components/app/page-header";
import { Restricted } from "@/components/app/restricted";
import { SectionTabs } from "@/components/app/section-tabs";
import { signedIn } from "@/server/operator";

import { WebhookStateBadge } from "../webhook-state-badge";
import { webhookById } from "./data";
import { WebhookActions } from "./webhook-actions";

type Props = { params: Promise<{ webhookId: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { webhookId } = await params;
  const { url } = await webhookById(webhookId);

  return { title: { default: new URL(url).host, template: `%s · ${new URL(url).host}` } };
}

export default async function WebhookLayout({ params, children }: Props) {
  const { operator } = await signedIn();
  if (!operator.can("read:webhooks")) {
    return <Restricted scope="read:webhooks" what="webhooks" />;
  }
  const { webhookId } = await params;
  const webhook = await webhookById(webhookId);
  const base = `/webhooks/${webhook.id}`;
  // Clavia also asks for `read:audit_events` to test an endpoint and to read its deliveries.
  const audit = operator.can("read:audit_events");

  return (
    <>
      <PageHeader
        title={webhook.description === "" ? new URL(webhook.url).host : webhook.description}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 break-all font-mono text-xs">
              {webhook.url}
              <CopyButton value={webhook.url} label="Copy the URL" />
            </span>
            <WebhookStateBadge webhook={webhook} />
          </span>
        }
        crumbs={[{ label: "Webhooks", href: "/webhooks" }, { label: new URL(webhook.url).host }]}
        actions={
          <WebhookActions
            webhookId={webhook.id}
            url={webhook.url}
            enabled={webhook.is_enabled}
            can={{
              update: operator.can("update:webhooks"),
              test: operator.can("update:webhooks") && audit,
              remove: operator.can("delete:webhooks"),
            }}
          />
        }
      />
      <SectionTabs
        tabs={[
          { label: "Settings", href: base as Route },
          ...(audit ? [{ label: "Deliveries", href: `${base}/deliveries` as Route }] : []),
        ]}
      />
      <div className="flex flex-col gap-6">{children}</div>
    </>
  );
}
