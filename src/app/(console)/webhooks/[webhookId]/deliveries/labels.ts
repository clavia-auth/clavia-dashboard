import type { WebhookDelivery } from "@/contract";

export const STATUSES: Readonly<Record<WebhookDelivery["status"], { label: string; className: string }>> = {
  pending: { label: "Pending", className: "border-gold/50 text-gold-foreground" },
  succeeded: { label: "Delivered", className: "border-success/40 text-success" },
  abandoned: { label: "Abandoned", className: "text-muted-foreground" },
};

/** Why the last attempt failed, in the operator's words. */
export const FAILURES: Readonly<Record<NonNullable<WebhookDelivery["last_failure"]>, string>> = {
  status: "The receiver answered with an error",
  connection: "No answer within ten seconds",
  refused_url: "The address now resolves to a private network",
  disabled: "Not sent: the webhook was switched off",
  event_purged: "Not sent: the event was purged",
};
