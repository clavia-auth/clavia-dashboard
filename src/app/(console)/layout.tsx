import { cookies } from "next/headers";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { CommandMenu } from "@/components/shell/command-menu";
import { SECTIONS } from "@/components/shell/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { config } from "@/server/config";
import { signedIn } from "@/server/operator";

/**
 * The console: every page an operator works in, behind sign-in. The sidebar lists only
 * the sections the operator's token can read.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [{ operator }, jar] = await Promise.all([signedIn(), cookies()]);
  const sections = SECTIONS.filter((section) => section.needs === null || operator.can(section.needs));

  return (
    <SidebarProvider defaultOpen={jar.get("sidebar_state")?.value !== "false"}>
      <AppSidebar
        sections={sections}
        issuer={config().issuer.host}
        operator={{
          name: operator.displayName,
          email: operator.identity.email,
          initials: operator.initials,
          picture: operator.identity.picture,
        }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <CommandMenu sections={sections} />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
