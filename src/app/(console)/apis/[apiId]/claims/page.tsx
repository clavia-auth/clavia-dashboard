import { ShieldOffIcon } from "lucide-react";
import type { Metadata } from "next";

import { ClaimsEditor } from "@/components/app/claims-editor";
import { EmptyState } from "@/components/app/empty-state";
import { Card } from "@/components/ui/card";
import { previewClaims } from "@/server/claims-preview";
import { signedIn } from "@/server/operator";

import { saveApiClaims } from "../../actions";
import { apiById } from "../data";

export const metadata: Metadata = { title: "Claims" };

export default async function ApiClaimsPage({ params }: { params: Promise<{ apiId: string }> }) {
  const { operator } = await signedIn();
  const { apiId } = await params;
  const resourceServer = await apiById(apiId);

  if (resourceServer.is_system) {
    return (
      <Card className="py-0">
        <EmptyState
          icon={ShieldOffIcon}
          title="The Management API takes no custom claims"
          description="Its tokens are read by the server alone, which ignores them."
        />
      </Card>
    );
  }
  const canLookUp = operator.can("read:users");

  return (
    <ClaimsEditor
      // A saved list replaces what the editor holds, whatever was typed since.
      key={JSON.stringify(resourceServer.claims)}
      application={false}
      mappings={resourceServer.claims}
      editable={operator.can("update:resource_servers")}
      description="What its access tokens carry about the person, beside the protocol's: a value from their account, their application metadata, or a fixed one. Applications run by others never receive them."
      save={saveApiClaims.bind(null, resourceServer.id)}
      preview={canLookUp ? previewClaims.bind(null, { kind: "api", apiId: resourceServer.id }) : null}
      previewUnavailable="Your roles do not grant read:users, which looking a person up needs."
    />
  );
}
