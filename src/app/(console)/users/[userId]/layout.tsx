import type { Metadata, Route } from "next";

import { PageHeader } from "@/components/app/page-header";
import { Restricted } from "@/components/app/restricted";
import { SectionTabs, type SectionTab } from "@/components/app/section-tabs";
import { ActiveBadge, MfaBadge } from "@/components/app/status-badges";
import { UserAvatar } from "@/components/app/user-avatar";
import { Badge } from "@/components/ui/badge";
import { signedIn } from "@/server/operator";

import { userById } from "./data";
import { UserActions } from "./user-actions";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const { email } = await userById(userId);

  return { title: { default: email, template: `%s · ${email}` } };
}

export default async function UserLayout({
  params,
  children,
}: {
  params: Promise<{ userId: string }>;
  children: React.ReactNode;
}) {
  const { operator } = await signedIn();
  if (!operator.can("read:users")) {
    return <Restricted scope="read:users" what="users" />;
  }
  const { userId } = await params;
  const user = await userById(userId);
  const base = `/users/${user.id}`;
  const tabs: SectionTab[] = [
    { label: "Profile", href: base as Route },
    ...(operator.can("read:roles") ? [{ label: "Roles", href: `${base}/roles` as Route }] : []),
    { label: "Sessions", href: `${base}/sessions` as Route },
    { label: "Applications", href: `${base}/applications` as Route },
    { label: "Identities", href: `${base}/identities` as Route },
    ...(operator.can("read:audit_events") ? [{ label: "Activity", href: `${base}/activity` as Route }] : []),
  ];

  return (
    <>
      <PageHeader
        title={user.name ?? user.email}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {user.name !== null ? <span>{user.email}</span> : null}
            <ActiveBadge active={user.is_active} />
            {user.mfa_enrolled ? <MfaBadge /> : null}
            <Badge variant="secondary" className="font-mono text-xs">
              {user.connection}
            </Badge>
          </span>
        }
        crumbs={[{ label: "Users", href: "/users" }, { label: user.email }]}
        actions={
          <UserActions
            userId={user.id}
            email={user.email}
            active={user.is_active}
            mfaEnrolled={user.mfa_enrolled}
            canUpdate={operator.can("update:users")}
            canDelete={operator.can("delete:users")}
            isSelf={user.id === operator.identity.subject}
          />
        }
      >
        <UserAvatar user={user} className="size-12" />
      </PageHeader>
      <SectionTabs tabs={tabs} />
      <div className="flex flex-col gap-6">{children}</div>
    </>
  );
}
