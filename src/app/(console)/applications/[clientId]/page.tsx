import { TerminalIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { signedIn } from "@/server/operator";

import { applicationById } from "./data";
import { SettingsForm } from "./settings-form";

export default async function ApplicationSettingsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { operator } = await signedIn();
  const { clientId } = await params;
  const client = await applicationById(clientId);

  return (
    <>
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
      <SettingsForm client={client} editable={operator.can("update:clients")} />
    </>
  );
}
