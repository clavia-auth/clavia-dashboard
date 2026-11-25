import type { AuditEvent } from "@/contract";

/** The columns of the audit log's CSV export, in order. */
export const AUDIT_CSV_COLUMNS = [
  "id",
  "occurred_at",
  "type",
  "outcome",
  "actor_kind",
  "actor_user_id",
  "actor_client_id",
  "actor_provisioning_token_id",
  "target_type",
  "target_id",
  "client_address",
  "user_agent",
  "details",
] as const;

/**
 * One CSV field (RFC 4180): quoted when it holds a comma, a quote or a line break, with quotes doubled.
 * A value a spreadsheet would read as a formula (it starts with `=`, `+`, `-`, `@`, a tab or a return)
 * gets a leading apostrophe, so a hostile user agent or name cannot run in the file's reader.
 */
export function csvField(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** The header line, ended as every row is. */
export function auditCsvHeader(): string {
  return `${AUDIT_CSV_COLUMNS.join(",")}\r\n`;
}

/** An event as one line; `details` is its JSON, since its keys depend on the event's type. */
export function auditCsvRow(event: AuditEvent): string {
  const { actor, target } = event;
  const cells = [
    event.id,
    event.occurred_at,
    event.type,
    event.outcome,
    actor.kind,
    actor.user_id,
    actor.client_id,
    actor.provisioning_token_id,
    target?.type,
    target?.id,
    event.client_address,
    event.user_agent,
    event.details === null || event.details === undefined ? "" : JSON.stringify(event.details),
  ];

  return `${cells.map(csvField).join(",")}\r\n`;
}
