import { isEventType, PERIODS } from "@/components/audit/describe";
import type { AuditTargetType } from "@/contract";
import type { AuditQuery } from "@/core/management/management-api";
import { pageFrom } from "@/components/app/pager";

export const PER_PAGE = 50;
const TARGETS: readonly AuditTargetType[] = ["user", "client", "resource_server", "role", "connection", "signing_key"];
const HOURS: Record<keyof typeof PERIODS, number> = { "24h": 24, "7d": 7 * 24, "30d": 30 * 24 };

/** The audit log's filters as the URL carries them, shared by the page and its CSV export. */
export type Search = {
  type?: string;
  outcome?: string;
  period?: string;
  target_type?: string;
  target_id?: string;
  actor_user_id?: string;
  client_id?: string;
  page?: string;
};

/** The filters from the URL, each kept only if it is one the API understands. */
export function queryFrom(search: Search): AuditQuery {
  const target =
    search.target_type !== undefined &&
    search.target_id !== undefined &&
    (TARGETS as readonly string[]).includes(search.target_type)
      ? { type: search.target_type as AuditTargetType, id: search.target_id }
      : undefined;
  const hours = search.period !== undefined ? HOURS[search.period as keyof typeof PERIODS] : undefined;

  return {
    page: pageFrom(search.page),
    perPage: PER_PAGE,
    ...(search.type !== undefined && isEventType(search.type) ? { types: [search.type] } : {}),
    ...(search.outcome === "success" || search.outcome === "failure" ? { outcome: search.outcome } : {}),
    ...(hours !== undefined ? { since: new Date(Date.now() - hours * 3600 * 1000) } : {}),
    ...(target !== undefined ? { target } : {}),
    ...(search.actor_user_id !== undefined ? { actorUserId: search.actor_user_id } : {}),
    ...(search.client_id !== undefined ? { clientId: search.client_id } : {}),
  };
}
