"use client";

import { useState, useTransition } from "react";

import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import type { Connection } from "@/contract";
import { type ActionState, IDLE } from "@/server/action-state";

import { replaceConnections } from "../../actions";

const STRATEGIES: Record<Connection["strategy"], string> = {
  database: "Password pool",
  social: "Social",
  oidc: "OpenID Connect",
  passwordless: "Email code or link",
  saml: "SAML",
};

/** Which ways in the application offers — switched one by one, saved together. */
export function ConnectionsForm({
  clientId,
  connections,
  enabled,
  editable,
}: {
  clientId: string;
  connections: readonly Connection[];
  enabled: readonly string[];
  editable: boolean;
}) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set(enabled));
  const [state, setState] = useState<ActionState>(IDLE);
  const [pending, startTransition] = useTransition();
  useActionFeedback(state);
  const changed = chosen.size !== enabled.length || enabled.some((name) => !chosen.has(name));

  return (
    <>
      <ul className="divide-y">
        {connections.map((connection) => (
          <li key={connection.name} className="flex items-center gap-4 px-6 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {connection.display_name}
                <Badge variant="secondary">{STRATEGIES[connection.strategy]}</Badge>
                {!connection.is_enabled ? <Badge variant="outline">Switched off</Badge> : null}
                {connection.is_enabled && !connection.usable ? (
                  <Badge variant="outline" className="border-gold/50 text-gold-foreground">
                    Not configured
                  </Badge>
                ) : null}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{connection.name}</p>
            </div>
            <Switch
              aria-label={`Offer ${connection.display_name}`}
              checked={chosen.has(connection.name)}
              disabled={!editable || pending}
              onCheckedChange={(on) =>
                setChosen((current) => {
                  const next = new Set(current);
                  if (on) {
                    next.add(connection.name);
                  } else {
                    next.delete(connection.name);
                  }

                  return next;
                })
              }
            />
          </li>
        ))}
      </ul>
      {editable ? (
        <CardFooter className="justify-end gap-2 border-t">
          <Button variant="ghost" disabled={!changed || pending} onClick={() => setChosen(new Set(enabled))}>
            Reset
          </Button>
          <Button
            disabled={!changed || pending}
            onClick={() => startTransition(async () => setState(await replaceConnections(clientId, [...chosen])))}
          >
            {pending ? <Spinner /> : null}
            Save connections
          </Button>
        </CardFooter>
      ) : null}
    </>
  );
}
