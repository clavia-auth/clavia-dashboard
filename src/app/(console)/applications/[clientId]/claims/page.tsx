import { ShieldOffIcon } from "lucide-react";
import type { Metadata } from "next";

import { ClaimsEditor } from "@/components/app/claims-editor";
import { EmptyState } from "@/components/app/empty-state";
import { Card } from "@/components/ui/card";
import { previewClaims } from "@/server/claims-preview";
import { signedIn } from "@/server/operator";

import { saveApplicationClaims } from "../../actions";
import { applicationById } from "../data";

export const metadata: Metadata = { title: "Claims" };

export default async function ApplicationClaimsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { operator } = await signedIn();
  const { clientId } = await params;
  const client = await applicationById(clientId);

  if (!client.is_first_party) {
    return (
      <Card className="py-0">
        <EmptyState
          icon={ShieldOffIcon}
          title="A third-party application takes no custom claims"
          description="It is shown what it is given, and no consent screen could name these claims to the person."
        />
      </Card>
    );
  }
  const canLookUp = operator.can("read:users");

  return (
    <ClaimsEditor
      key={JSON.stringify(client.claims)}
      application
      mappings={client.claims}
      editable={operator.can("update:clients")}
      description="What its ID tokens and userinfo answers carry about the person, beside the protocol's and what the scopes release. Each claim says where it goes."
      save={saveApplicationClaims.bind(null, client.client_id)}
      preview={canLookUp ? previewClaims.bind(null, { kind: "application" }) : null}
      previewUnavailable="Your roles do not grant read:users, which looking a person up needs."
    />
  );
}
