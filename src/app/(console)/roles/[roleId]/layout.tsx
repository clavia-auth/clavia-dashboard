import type { Metadata, Route } from "next";

import { PageHeader } from "@/components/app/page-header";
import { Restricted } from "@/components/app/restricted";
import { SectionTabs } from "@/components/app/section-tabs";
import { signedIn } from "@/server/operator";

import { roleById } from "./data";
import { DeleteRoleButton } from "./role-forms";

type Props = { params: Promise<{ roleId: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { roleId } = await params;
  const { name } = await roleById(roleId);

  return { title: { default: name, template: `%s · ${name}` } };
}

export default async function RoleLayout({ params, children }: Props) {
  const { operator } = await signedIn();
  if (!operator.can("read:roles")) {
    return <Restricted scope="read:roles" what="roles" />;
  }
  const { roleId } = await params;
  const role = await roleById(roleId);
  const base = `/roles/${role.id}`;

  return (
    <>
      <PageHeader
        title={role.name}
        description={role.description !== "" ? role.description : undefined}
        crumbs={[{ label: "Roles", href: "/roles" }, { label: role.name }]}
        actions={operator.can("delete:roles") ? <DeleteRoleButton roleId={role.id} name={role.name} /> : undefined}
      />
      <SectionTabs
        tabs={[
          { label: "Settings", href: base as Route },
          { label: "Permissions", href: `${base}/permissions` as Route, count: role.permissions.length },
          { label: "Holders", href: `${base}/holders` as Route },
        ]}
      />
      <div className="flex flex-col gap-6">{children}</div>
    </>
  );
}
