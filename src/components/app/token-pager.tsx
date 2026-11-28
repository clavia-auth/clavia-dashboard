import { ChevronRightIcon, ChevronsLeftIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Paging for what the decision engine pages by token: it gives the next page's token and no total,
 * so a list goes forward one page at a time, or back to the first. The current query is kept.
 */
export function TokenPager({
  path,
  query,
  current,
  next,
  count,
}: {
  path: string;
  query: Readonly<Record<string, string | undefined>>;
  /** The token this page was read with; undefined on the first. */
  current: string | undefined;
  next: string | undefined;
  /** How many items this page holds. */
  count: number;
}) {
  if (current === undefined && next === undefined) {
    return null;
  }
  const href = (token: string | undefined) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        search.set(key, value);
      }
    }
    if (token !== undefined) {
      search.set("page_token", token);
    }
    const qs = search.toString();

    return (qs === "" ? path : `${path}?${qs}`) as Route;
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
      <span aria-live="polite">
        {count.toLocaleString()} on this page{next === undefined ? ", the last" : ""}
      </span>
      <div className="flex items-center gap-1">
        {current !== undefined ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={href(undefined)} scroll={false}>
              <ChevronsLeftIcon aria-hidden /> First page
            </Link>
          </Button>
        ) : null}
        {next !== undefined ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={href(next)} scroll={false}>
              Next page <ChevronRightIcon aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
