import { Badge } from "@/components/ui/badge";
import type { Client } from "@/contract";

/** What kind of client it is, at a glance: who it belongs to and whether it keeps a secret. */
export function ApplicationBadges({ client }: { client: Client }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{client.client_type === "confidential" ? "Confidential" : "Public"}</Badge>
      {client.is_first_party ? null : (
        <Badge variant="outline" className="border-gold/50 text-gold-foreground">
          Third-party
        </Badge>
      )}
    </span>
  );
}
