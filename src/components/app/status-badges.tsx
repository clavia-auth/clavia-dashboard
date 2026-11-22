import { CheckCircle2Icon, CircleSlashIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="gap-1 border-success/40 text-success">
      <CheckCircle2Icon aria-hidden /> Active
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleSlashIcon aria-hidden /> Deactivated
    </Badge>
  );
}

export function MfaBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-gold/50 text-gold-foreground">
      <ShieldCheckIcon aria-hidden /> Two-factor
    </Badge>
  );
}
