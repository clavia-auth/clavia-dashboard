"use client";

import { XIcon } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { ALL_EVENT_TYPES, EVENT_TYPES, PERIODS, TARGET_TYPES } from "@/components/audit/describe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { AuditTargetType } from "@/contract";

const ALL = "all";

const GROUPS = Map.groupBy(ALL_EVENT_TYPES, (type) => EVENT_TYPES[type].group);

/** The audit log's filters, kept in the URL so a filtered view can be shared or bookmarked. */
export function AuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = (changes: Record<string, string | null>) => {
    const query = new URLSearchParams(params);
    query.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === ALL) {
        query.delete(key);
      } else {
        query.set(key, value);
      }
    }
    const qs = query.toString();
    startTransition(() => router.replace((qs === "" ? pathname : `${pathname}?${qs}`) as Route, { scroll: false }));
  };

  const targetType = params.get("target_type") as AuditTargetType | null;
  const targetId = params.get("target_id");
  const actor = params.get("actor_user_id");
  const client = params.get("client_id");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={params.get("type") ?? ALL} onValueChange={(value) => set({ type: value })}>
        <SelectTrigger className="w-60" aria-label="Event">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Every event</SelectItem>
          {[...GROUPS.entries()].map(([group, types]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {EVENT_TYPES[type].label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("outcome") ?? ALL} onValueChange={(value) => set({ outcome: value })}>
        <SelectTrigger className="w-40" aria-label="Outcome">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any outcome</SelectItem>
          <SelectItem value="success">Succeeded</SelectItem>
          <SelectItem value="failure">Failed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={params.get("period") ?? ALL} onValueChange={(value) => set({ period: value })}>
        <SelectTrigger className="w-44" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Any time</SelectItem>
          {Object.entries(PERIODS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {targetType !== null && targetId !== null ? (
        <Chip onClear={() => set({ target_type: null, target_id: null })}>
          {TARGET_TYPES[targetType] ?? targetType} {targetId.slice(0, 12)}
        </Chip>
      ) : null}
      {actor !== null ? <Chip onClear={() => set({ actor_user_id: null })}>By user {actor.slice(0, 12)}</Chip> : null}
      {client !== null ? <Chip onClear={() => set({ client_id: null })}>Via {client.slice(0, 16)}</Chip> : null}
      {pending ? <Spinner className="text-muted-foreground" /> : null}
      {params.size > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => startTransition(() => router.replace(pathname as Route))}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <Badge variant="secondary" className="h-8 gap-1 pr-1 font-normal">
      {children}
      <Button variant="ghost" size="icon-xs" onClick={onClear} aria-label="Remove this filter">
        <XIcon aria-hidden />
      </Button>
    </Badge>
  );
}
