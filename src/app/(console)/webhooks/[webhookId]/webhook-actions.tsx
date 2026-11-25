"use client";

import { KeyRoundIcon, PowerIcon, SendIcon, Trash2Icon } from "lucide-react";
import { useActionState, useState } from "react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { SecretDialog } from "@/components/app/secret-dialog";
import { useActionFeedback } from "@/components/app/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IDLE } from "@/server/action-state";

import { deleteWebhook, rotateWebhookSecret, type SecretState, setWebhookEnabled, testWebhook } from "../actions";

/** What an operator does to an endpoint as a whole: test it, switch it, rotate its secret, delete it. */
export function WebhookActions({
  webhookId,
  url,
  enabled,
  can,
}: {
  webhookId: string;
  url: string;
  enabled: boolean;
  can: { update: boolean; test: boolean; remove: boolean };
}) {
  const [tested, test, testing] = useActionState(testWebhook.bind(null, webhookId), IDLE);
  const [switched, toggle, toggling] = useActionState(setWebhookEnabled.bind(null, webhookId, !enabled), IDLE);
  const [rotated, rotate, rotating] = useActionState<SecretState, FormData>(
    rotateWebhookSecret.bind(null, webhookId) as (state: SecretState, form: FormData) => Promise<SecretState>,
    IDLE,
  );
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  useActionFeedback(tested);
  useActionFeedback(switched);
  useActionFeedback(rotated);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {can.test ? (
          <form action={test}>
            <Button variant="outline" type="submit" disabled={testing || !enabled}>
              {testing ? <Spinner /> : <SendIcon aria-hidden />} Send a test
            </Button>
          </form>
        ) : null}
        {can.update ? (
          <>
            <form action={toggle}>
              <Button variant="outline" type="submit" disabled={toggling}>
                {toggling ? <Spinner /> : <PowerIcon aria-hidden />} {enabled ? "Switch off" : "Switch on"}
              </Button>
            </form>
            <form action={rotate}>
              <Button variant="outline" type="submit" disabled={rotating}>
                {rotating ? <Spinner /> : <KeyRoundIcon aria-hidden />} Rotate secret
              </Button>
            </form>
          </>
        ) : null}
        {can.remove ? (
          <ConfirmAction
            trigger={
              <Button variant="outline">
                <Trash2Icon aria-hidden /> Delete
              </Button>
            }
            title="Delete this webhook?"
            description={`Nothing more is sent to ${url}, and its delivery log goes with it. This cannot be undone.`}
            confirm="Delete webhook"
            destructive
            action={deleteWebhook.bind(null, webhookId)}
          />
        ) : null}
      </div>
      {rotated.issued !== undefined ? (
        <SecretDialog
          secret={rotated.issued.secret}
          title="Copy the new secret now"
          label={`Secret for ${rotated.issued.url}`}
          lost="rotate it again."
          open={acknowledged !== rotated.issued.secret}
          onDone={() => setAcknowledged(rotated.issued?.secret ?? null)}
        />
      ) : null}
    </>
  );
}
