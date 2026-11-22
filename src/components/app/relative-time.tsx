"use client";

import { useSyncExternalStore } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago", with the exact instant on hover — computed in the browser, in its time zone. */
export function RelativeTime({ value, className }: { value: string; className?: string }) {
  const now = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 30_000),
    () => null,
  );
  const date = new Date(value);
  const exact = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(date);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={value} className={className} suppressHydrationWarning>
          {now === null ? exact : relative(date, now * 30_000)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{exact}</TooltipContent>
    </Tooltip>
  );
}

function relative(date: Date, now: number): string {
  const seconds = Math.round((date.getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit);
    }
  }

  return Math.abs(seconds) < 45 ? "just now" : format.format(Math.round(seconds / 60), "minute");
}

function subscribe(onChange: () => void): () => void {
  const timer = setInterval(onChange, 30_000);

  return () => clearInterval(timer);
}
