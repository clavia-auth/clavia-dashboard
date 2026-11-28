import { CheckCircle2Icon, CircleSlashIcon } from "lucide-react";

import { CopyButton } from "@/components/app/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceServerAuthorization } from "@/contract";
import { modelLanguage } from "@/server/container";
import { signedIn } from "@/server/operator";

import { apiById } from "../data";
import { AuthorizationForm } from "./authorization-form";
import { AuthorizationActions } from "./authorization-actions";
import { authorizationOf, machineClients } from "./data";

/** Where an API with no model starts: Clavia's people, and one type of the API's own. */
const STARTER = `model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define viewer: [user] or owner
`;

export default async function AuthorizationModelPage({ params }: { params: Promise<{ apiId: string }> }) {
  const { operator } = await signedIn();
  const { apiId } = await params;
  const [resourceServer, authorization] = await Promise.all([apiById(apiId), authorizationOf(apiId)]);
  const editable = operator.can("update:resource_servers");
  const clients = editable && operator.can("read:clients") ? await machineClients() : null;
  const written = authorization === null ? STARTER : modelLanguage().write(authorization.model);

  return (
    <>
      <StatusCard
        apiId={resourceServer.id}
        name={resourceServer.name}
        authorization={authorization}
        editable={editable}
      />
      <AuthorizationForm
        // A saved model replaces what the editor holds.
        key={authorization?.model_id ?? "none"}
        apiId={resourceServer.id}
        enabled={authorization?.enabled ?? false}
        model={written ?? ""}
        unwritable={written === null}
        speaking={authorization?.clients ?? []}
        denialReasons={authorization?.denial_reasons ?? false}
        clients={clients?.map((client) => ({ id: client.client_id, name: client.name })) ?? null}
        editable={editable}
      />
    </>
  );
}

function StatusCard({
  apiId,
  name,
  authorization,
  editable,
}: {
  apiId: string;
  name: string;
  authorization: ResourceServerAuthorization | null;
  editable: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Fine-grained authorization
          {authorization?.enabled === true ? (
            <Badge variant="outline" className="gap-1 border-success/40 text-success">
              <CheckCircle2Icon aria-hidden /> On
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <CircleSlashIcon aria-hidden /> Off
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {authorization === null
            ? "The API's clients ask, while they handle a request, whether a person may act on one of its resources, and the decision engine answers from the relationships the API writes. Write a model below and turn it on: the API gets a store of its own."
            : authorization.enabled
              ? "The API's clients get decisions from the model below and the relationships in the API's store."
              : "Turned off: the API's clients are refused. The store, its model and its relationships are kept, and turning it on brings them back."}
        </CardDescription>
        {editable && authorization !== null ? (
          <CardAction>
            <AuthorizationActions apiId={apiId} name={name} enabled={authorization.enabled} />
          </CardAction>
        ) : null}
      </CardHeader>
      {authorization !== null ? (
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Store</dt>
            <dd className="flex min-w-0 items-center gap-1 font-mono text-xs">
              <span className="truncate">{authorization.store_id}</span>
              <CopyButton value={authorization.store_id} label="Copy the store's id" />
            </dd>
            <dt className="text-muted-foreground">Model in force</dt>
            <dd className="flex min-w-0 items-center gap-1 font-mono text-xs">
              <span className="truncate">{authorization.model_id}</span>
              <CopyButton value={authorization.model_id} label="Copy the model's id" />
            </dd>
          </dl>
        </CardContent>
      ) : null}
    </Card>
  );
}
