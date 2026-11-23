import { TicketIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Pager, pageFrom } from "@/components/app/pager";
import { RelativeTime } from "@/components/app/relative-time";
import { Restricted } from "@/components/app/restricted";
import { SearchField } from "@/components/app/search-field";
import { TableSkeleton } from "@/components/app/table-skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { load } from "@/server/load";
import { signedIn } from "@/server/operator";

import { revokeInitialAccessToken } from "./actions";
import { IssueTokenDialog } from "./issue-token-dialog";
import { TokenStateBadge } from "./token-state-badge";

export const metadata: Metadata = { title: "Initial access tokens" };

const PER_PAGE = 25;

export default async function InitialAccessTokensPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { operator } = await signedIn();
  if (!operator.can("read:initial_access_tokens")) {
    return <Restricted scope="read:initial_access_tokens" what="initial access tokens" />;
  }
  const { q, page } = await searchParams;

  return (
    <>
      <PageHeader
        title="Initial access tokens"
        description={
          <>
            What lets software register itself as an application (RFC 7591): a token you hand to a partner, good for a
            number of registrations until a date. Registration must also be switched on in the deployment (
            <code className="font-mono text-xs">CLAVIA_CLIENT_REGISTRATION=token</code>) for a token to register
            anything.
          </>
        }
        actions={operator.can("create:initial_access_tokens") ? <IssueTokenDialog /> : undefined}
      />
      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <SearchField label="Search tokens" placeholder="Search by description…" />
        </div>
        <Suspense key={`${q ?? ""}:${page ?? ""}`} fallback={<TableSkeleton columns={5} rows={5} />}>
          <TokensTable search={q} page={pageFrom(page)} />
        </Suspense>
      </Card>
    </>
  );
}

async function TokensTable({ search, page }: { search: string | undefined; page: number }) {
  const { operator, api } = await signedIn();
  const tokens = await load(api.initialAccessTokens.list({ search, page, perPage: PER_PAGE }));
  const revocable = operator.can("delete:initial_access_tokens");

  if (tokens.total === 0) {
    return search === undefined ? (
      <EmptyState
        icon={TicketIcon}
        title="No tokens issued"
        description="Issue one to let a partner's software register itself."
      />
    ) : (
      <EmptyState icon={TicketIcon} title="No match" description={`No token's description matches “${search}”.`} />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Description</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.items.map((token) => (
            <TableRow key={token.id}>
              <TableCell className="pl-4 font-medium">{token.description}</TableCell>
              <TableCell>
                <TokenStateBadge state={token.state} />
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {token.uses} of {token.max_uses}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <RelativeTime value={token.expires_at} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                <RelativeTime value={token.created_at} />
              </TableCell>
              <TableCell className="pr-4 text-right">
                {revocable && token.state === "active" ? (
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="sm" aria-label={`Revoke ${token.description}`}>
                        Revoke
                      </Button>
                    }
                    title={`Revoke “${token.description}”?`}
                    description="It registers nothing more, at once. The applications it already registered keep working."
                    confirm="Revoke token"
                    destructive
                    action={revokeInitialAccessToken.bind(null, token.id)}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pager
        path="/initial-access-tokens"
        query={{ q: search }}
        page={tokens.page}
        perPage={tokens.per_page}
        total={tokens.total}
      />
    </>
  );
}
