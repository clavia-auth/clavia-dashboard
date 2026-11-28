import { ShieldOffIcon } from "lucide-react";
import type { Metadata, Route } from "next";

import { EmptyState } from "@/components/app/empty-state";
import { SectionTabs } from "@/components/app/section-tabs";
import { Card } from "@/components/ui/card";

import { apiById } from "../data";

type Props = { params: Promise<{ apiId: string }>; children: React.ReactNode };

// A tab's own title is followed by the API's name, as every tab of the API's page is.
export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { apiId } = await params;
  const { name } = await apiById(apiId);

  return { title: { absolute: `Authorization · ${name}`, template: `%s · Authorization · ${name}` } };
}

export default async function AuthorizationLayout({ params, children }: Props) {
  const { apiId } = await params;
  const resourceServer = await apiById(apiId);

  if (resourceServer.is_system) {
    return (
      <Card className="py-0">
        <EmptyState
          icon={ShieldOffIcon}
          title="A system API takes no fine-grained authorization"
          description="Its tokens are read by the server itself, which decides with roles alone."
        />
      </Card>
    );
  }
  const base = `/apis/${resourceServer.id}/authorization`;

  return (
    <>
      <SectionTabs
        label="Authorization"
        tabs={[
          { label: "Model", href: base as Route },
          { label: "Versions", href: `${base}/versions` as Route },
          { label: "Relationships", href: `${base}/relationships` as Route },
          { label: "Try a decision", href: `${base}/decisions` as Route },
        ]}
      />
      {children}
    </>
  );
}
