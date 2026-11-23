import { CheckCircle2Icon, CircleSlashIcon, ClockIcon, TicketCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { InitialAccessTokenState } from "@/contract";

const STATES = {
  active: { label: "Active", icon: CheckCircle2Icon, className: "border-success/40 text-success" },
  used_up: { label: "Used up", icon: TicketCheckIcon, className: "text-muted-foreground" },
  expired: { label: "Expired", icon: ClockIcon, className: "text-muted-foreground" },
  revoked: { label: "Revoked", icon: CircleSlashIcon, className: "text-muted-foreground" },
} as const satisfies Record<InitialAccessTokenState, unknown>;

export function TokenStateBadge({ state }: { state: InitialAccessTokenState }) {
  const { label, icon: Icon, className } = STATES[state];

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon aria-hidden /> {label}
    </Badge>
  );
}
