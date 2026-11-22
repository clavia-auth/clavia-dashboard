import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * "41–60 of 213", with links to the pages either side — the current query kept, only
 * `page` changed, so a search or filter survives paging.
 */
export function Pager({
  path,
  query,
  page,
  perPage,
  total,
}: {
  path: string;
  query: Readonly<Record<string, string | undefined>>;
  page: number;
  perPage: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(total, page * perPage);
  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "" && key !== "page") {
        search.set(key, value);
      }
    }
    if (target > 1) {
      search.set("page", String(target));
    }
    const qs = search.toString();

    return (qs === "" ? path : `${path}?${qs}`) as Route;
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
      <span aria-live="polite">
        {total === 0 ? "No results" : `${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-1">
        <PageLink href={page > 1 ? href(page - 1) : null} label="Previous page">
          <ChevronLeftIcon aria-hidden />
        </PageLink>
        <span className="px-2 tabular-nums">
          Page {page} of {pages}
        </span>
        <PageLink href={page < pages ? href(page + 1) : null} label="Next page">
          <ChevronRightIcon aria-hidden />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({ href, label, children }: { href: Route | null; label: string; children: React.ReactNode }) {
  if (href === null) {
    return (
      <Button variant="ghost" size="icon-sm" disabled aria-label={label}>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon-sm" asChild>
      <Link href={href} aria-label={label} scroll={false}>
        {children}
      </Link>
    </Button>
  );
}

/** A page number from the query: a positive integer, else 1. */
export function pageFrom(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}
