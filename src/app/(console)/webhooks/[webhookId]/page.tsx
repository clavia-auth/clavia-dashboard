import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RelativeTime } from "@/components/app/relative-time";
import { signedIn } from "@/server/operator";

import { webhookById } from "./data";
import { WebhookSettingsForm } from "./settings-form";

export default async function WebhookSettingsPage({ params }: { params: Promise<{ webhookId: string }> }) {
  const { operator } = await signedIn();
  const { webhookId } = await params;
  const webhook = await webhookById(webhookId);

  return (
    <>
      {webhook.disabled_reason === "failing" ? (
        <Alert variant="destructive">
          <AlertTitle>Clavia switched this webhook off</AlertTitle>
          <AlertDescription>
            Every delivery to it failed for five days. Switch it on again once the receiver answers: its deliveries show
            why they failed.
          </AlertDescription>
        </Alert>
      ) : webhook.failing_since !== null ? (
        <Alert>
          <AlertTitle>Deliveries are failing</AlertTitle>
          <AlertDescription>
            Every delivery since <RelativeTime value={webhook.failing_since} /> has failed. After five days Clavia
            switches the webhook off.
          </AlertDescription>
        </Alert>
      ) : null}
      {webhook.previous_secret_until !== null && new Date(webhook.previous_secret_until) > new Date() ? (
        <Alert>
          <AlertTitle>A secret was rotated</AlertTitle>
          <AlertDescription>
            The previous one signs beside the new one until <RelativeTime value={webhook.previous_secret_until} />, so
            the receiver can switch without missing a delivery.
          </AlertDescription>
        </Alert>
      ) : null}
      <WebhookSettingsForm
        webhook={webhook}
        editable={operator.can("update:webhooks")}
        retarget={operator.can("read:audit_events")}
      />
    </>
  );
}
