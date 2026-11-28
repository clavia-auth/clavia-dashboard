import type { Metadata } from "next";

import { Restricted } from "@/components/app/restricted";
import { Card } from "@/components/ui/card";
import { objectTypes, relationsOf, subjectTypes } from "@/core/authorization/model";
import { signedIn } from "@/server/operator";

import { authorizationOf } from "../data";
import { EngineState } from "../engine-state";
import { DecisionPanel } from "./decision-panel";

export const metadata: Metadata = { title: "Try a decision" };

export default async function DecisionsPage({ params }: { params: Promise<{ apiId: string }> }) {
  const { operator } = await signedIn();
  if (!operator.can("read:relationships")) {
    return (
      <Card className="py-0">
        <Restricted scope="read:relationships" what="this API's decisions" />
      </Card>
    );
  }
  const { apiId } = await params;
  const authorization = await authorizationOf(apiId);
  if (authorization === null) {
    return <EngineState read={{ ok: false, reason: "no_store", message: "" }} />;
  }
  const { model } = authorization;

  return (
    <DecisionPanel
      apiId={apiId}
      subjectTypes={subjectTypes(model)}
      relations={objectTypes(model).map((type) => ({ type, relations: relationsOf(model, type) }))}
      lookUpPeople={operator.can("read:users")}
    />
  );
}
