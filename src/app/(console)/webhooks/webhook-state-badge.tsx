import { CheckCircle2Icon, CircleSlashIcon, TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Webhook } from "@/contract";

/** On, off by an operator, or off because every delivery failed for five days. */
export function WebhookStateBadge({
  webhook,
}: {
  webhook: Pick<Webhook, "is_enabled" | "disabled_reason" | "failing_since">;
}) {
  if (webhook.is_enabled) {
    return webhook.failing_since !== null ? (
      <Badge variant="outline" className="gap-1 border-gold/50 text-gold-foreground">
        <TriangleAlertIcon aria-hidden /> Failing
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1 border-success/40 text-success">
        <CheckCircle2Icon aria-hidden /> On
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleSlashIcon aria-hidden /> {webhook.disabled_reason === "failing" ? "Off: failing" : "Off"}
    </Badge>
  );
}
