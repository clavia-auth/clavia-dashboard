import { TerminalIcon, TicketIcon } from "lucide-react";
import Link from "next/link";

import { RelativeTime } from "@/components/app/relative-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { config } from "@/server/config";
import { signedIn } from "@/server/operator";

import { applicationById } from "./data";
import { SettingsForm } from "./settings-form";

export default async function ApplicationSettingsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { operator } = await signedIn();
  const { clientId } = await params;
  const client = await applicationById(clientId);

  const { registration } = client;

  return (
    <>
      {registration !== null ? (
        <Alert>
          <TicketIcon aria-hidden />
          <AlertTitle>Registered itself</AlertTitle>
          <AlertDescription>
            <p>
              It registered at the registration endpoint (RFC 7591), <RelativeTime value={registration.registered_at} />
              ,{" "}
              {registration.initial_access_token_id === null ? (
                "with an initial access token that no longer exists."
              ) : (
                <>
                  with the initial access token{" "}
                  <code className="font-mono text-xs">{registration.initial_access_token_id}</code>
                  {operator.can("read:initial_access_tokens") ? (
                    <>
                      , listed under{" "}
                      <Link href="/initial-access-tokens" className="underline underline-offset-4">
                        Initial access tokens
                      </Link>
                    </>
                  ) : null}
                  .
                </>
              )}{" "}
              It is third-party, and never reaches a system API.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      {client.grant_types.includes("client_credentials") ? (
        <Alert>
          <TerminalIcon aria-hidden />
          <AlertTitle>APIs are granted at the shell</AlertTitle>
          <AlertDescription>
            <p>
              What this application may ask for as itself is its grant on each API, written with{" "}
              <code className="font-mono text-xs">clavia clients:grant {client.client_id} &lt;audience&gt;</code>. An
              endpoint that wrote grants would let a client widen its own access.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
      <SettingsForm
        client={client}
        editable={operator.can("update:clients")}
        dashboard={client.client_id === config().clientId}
      />
    </>
  );
}
