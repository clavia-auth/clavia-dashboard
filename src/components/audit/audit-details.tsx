"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AuditEvent } from "@/contract";

import { detailLabel, detailValue, EVENT_TYPES } from "./describe";

/** An event's details, its origin and its id, behind a small button. */
export function AuditDetails({ event }: { event: AuditEvent }) {
  const details = Object.entries(event.details);
  const facts: [string, string][] = [
    ...details.map(([name, value]): [string, string] => [detailLabel(name), detailValue(value)]),
    ...(event.client_address !== null ? [["From", event.client_address] as [string, string]] : []),
    ...(event.user_agent !== null ? [["Browser", event.user_agent] as [string, string]] : []),
    ["Event id", event.id],
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" aria-label={`Details of ${EVENT_TYPES[event.type].label}`}>
          {details.length > 0 ? `${details.length} detail${details.length === 1 ? "" : "s"}` : "More"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <p className="mb-2 font-mono text-xs text-muted-foreground">{event.type}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {facts.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-muted-foreground">{name}</dt>
              <dd className="break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
