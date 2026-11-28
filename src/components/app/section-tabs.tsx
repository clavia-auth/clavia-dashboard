"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type SectionTab = Readonly<{ label: string; href: Route; count?: number }>;

/**
 * The tabs of a resource's page, as links: each is its own route, so it can be linked to,
 * and moving between them re-renders the tab's content only. Tabs inside a tab name their
 * landmark (`label`), so the two navigations are told apart.
 */
export function SectionTabs({ tabs, label = "Sections" }: { tabs: readonly SectionTab[]; label?: string }) {
  const pathname = usePathname();
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((tab) => pathname.startsWith(tab.href));

  return (
    <nav aria-label={label} className="-mb-px flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const current = tab === active;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              current
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
