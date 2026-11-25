import type { Route } from "next";
import Link from "next/link";

import { RelativeTime } from "@/components/app/relative-time";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditEvent } from "@/contract";
import type { AuditNames } from "@/server/audit-names";
import { cn } from "@/lib/utils";

import { AuditDetails } from "./audit-details";
import { actorLabel, EVENT_TYPES, TARGET_TYPES, targetHref, type Tone } from "./describe";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted-foreground/40",
  positive: "bg-success",
  warning: "bg-gold",
  danger: "bg-destructive",
};

const NO_NAMES: AuditNames = { users: {}, clients: {}, roles: {}, resourceServers: {} };

/** Events of the audit trail, newest first, each linked to who did it and what to. */
export function AuditTable({
  events,
  names = NO_NAMES,
  showTarget = true,
}: {
  events: readonly AuditEvent[];
  names?: AuditNames;
  showTarget?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-40">When</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Actor</TableHead>
          {showTarget ? <TableHead>Target</TableHead> : null}
          <TableHead className="text-right">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const type = EVENT_TYPES[event.type];

          return (
            <TableRow key={event.id}>
              <TableCell className="text-muted-foreground">
                <RelativeTime value={event.occurred_at} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", TONES[type.tone])} aria-hidden />
                  <span className="font-medium">{type.label}</span>
                  {event.outcome === "failure" ? (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      Failed
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Actor actor={event.actor} names={names} />
              </TableCell>
              {showTarget ? (
                <TableCell>
                  {event.target === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Target type={event.target.type} id={event.target.id} names={names} />
                  )}
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                <AuditDetails event={event} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Actor({ actor, names }: { actor: AuditEvent["actor"]; names: AuditNames }) {
  const via =
    actor.client_id !== null && actor.kind !== "application" ? (
      <span className="text-muted-foreground">
        {" "}
        via{" "}
        <IdLink
          href={`/applications/${encodeURIComponent(actor.client_id)}` as Route}
          id={actor.client_id}
          name={names.clients[actor.client_id]}
        />
      </span>
    ) : null;

  if (actor.kind === "person" && actor.user_id !== null) {
    return (
      <span>
        <IdLink
          href={`/users/${encodeURIComponent(actor.user_id)}` as Route}
          id={actor.user_id}
          name={names.users[actor.user_id]}
        />
        {via}
      </span>
    );
  }
  if (actor.kind === "application" && actor.client_id !== null) {
    return (
      <span>
        <span className="text-muted-foreground">Application </span>
        <IdLink
          href={`/applications/${encodeURIComponent(actor.client_id)}` as Route}
          id={actor.client_id}
          name={names.clients[actor.client_id]}
        />
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      {actorLabel(actor)}
      {via}
    </span>
  );
}

function Target({ type, id, names }: { type: keyof typeof TARGET_TYPES; id: string; names: AuditNames }) {
  const href = targetHref(type, id);
  const name = {
    user: names.users[id],
    client: names.clients[id],
    role: names.roles[id],
    resource_server: names.resourceServers[id],
    connection: id,
    signing_key: undefined,
    saml_key: undefined,
    initial_access_token: undefined,
    provisioning_token: undefined,
    webhook: undefined,
  }[type];

  return (
    <span>
      <span className="text-muted-foreground">{TARGET_TYPES[type]} </span>
      {href === null ? (
        <code className="font-mono text-xs">{short(id)}</code>
      ) : (
        <IdLink href={href} id={id} name={name} />
      )}
    </span>
  );
}

/** A link to what an id names: by its name when it is known, else by the start of the id. */
function IdLink({ href, id, name }: { href: Route; id: string; name?: string }) {
  return (
    <Link
      href={href}
      className={cn("underline-offset-4 hover:underline", name === undefined && "font-mono text-xs")}
      title={id}
    >
      {name ?? short(id)}
    </Link>
  );
}

function short(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…` : id;
}
