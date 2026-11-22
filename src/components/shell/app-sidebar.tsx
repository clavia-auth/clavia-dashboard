"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { ClaviaMark } from "./brand";
import type { Section } from "./navigation";
import { OperatorMenu, type OperatorSummary } from "./operator-menu";
import { SectionIcon } from "./section-icon";

export function AppSidebar({
  sections,
  operator,
  issuer,
}: {
  sections: readonly Section[];
  operator: OperatorSummary;
  issuer: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* The menu button sizes every icon in it to 1rem; the mark is the button's full height. */}
            <SidebarMenuButton size="lg" asChild tooltip="Clavia" className="[&_svg]:size-8">
              <Link href="/">
                <ClaviaMark />
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Clavia</span>
                  <span className="truncate text-xs text-muted-foreground">{issuer}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <nav aria-label="Sections">
            <SidebarMenu>
              {sections.map((section) => {
                const active = section.href === "/" ? pathname === "/" : pathname.startsWith(section.href);

                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={section.title}>
                      <Link href={section.href} aria-current={active ? "page" : undefined}>
                        <SectionIcon icon={section.icon} />
                        <span>{section.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <OperatorMenu operator={operator} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
