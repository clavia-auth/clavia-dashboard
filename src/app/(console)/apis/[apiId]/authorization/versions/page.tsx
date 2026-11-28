import type { Metadata } from "next";

import { CopyButton } from "@/components/app/copy-button";
import { RelativeTime } from "@/components/app/relative-time";
import { TokenPager } from "@/components/app/token-pager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthorizationModel } from "@/contract";
import { modelLanguage } from "@/server/container";
import { signedIn } from "@/server/operator";

import { fromEngine } from "../data";
import { EngineState } from "../engine-state";

export const metadata: Metadata = { title: "Versions" };

/** A model can be 256 KiB: a page holds a few. */
const PAGE_SIZE = 10;

export default async function VersionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ apiId: string }>;
  searchParams: Promise<{ page_token?: string }>;
}) {
  const { api } = await signedIn();
  const { apiId } = await params;
  const { page_token: pageToken } = await searchParams;
  const read = await fromEngine(api.authorization.models(apiId, { pageSize: PAGE_SIZE, pageToken }));
  if (!read.ok) {
    return <EngineState read={read} />;
  }
  const { items, next_page_token: next } = read.value;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Versions of the model</CardTitle>
        <p className="text-sm text-muted-foreground">
          Newest first. Every model saved is kept as a version; the API&apos;s questions are answered with the one in
          force.
        </p>
      </CardHeader>
      <CardContent className="divide-y px-0">
        {items.map((version) => {
          const model = version.model as AuthorizationModel;
          const text = modelLanguage().write(model) ?? JSON.stringify(model, null, 2);

          return (
            <details key={version.id} open={version.in_force} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="font-mono text-xs">{version.id}</span>
                {version.in_force ? (
                  <Badge variant="outline" className="border-success/40 text-success">
                    In force
                  </Badge>
                ) : null}
                <span className="text-sm text-muted-foreground">
                  <RelativeTime value={version.created_at} />
                </span>
                <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show the model</span>
                <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide the model</span>
              </summary>
              <div className="relative mt-3">
                <div className="absolute top-2 right-2">
                  <CopyButton value={text} label="Copy the model" />
                </div>
                <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
                  {text}
                </pre>
              </div>
            </details>
          );
        })}
      </CardContent>
      <TokenPager
        path={`/apis/${apiId}/authorization/versions`}
        query={{}}
        current={pageToken}
        next={next}
        count={items.length}
      />
    </Card>
  );
}
