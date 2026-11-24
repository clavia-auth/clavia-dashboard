import { GlobeIcon } from "lucide-react";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { CopyButton } from "@/components/app/copy-button";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { endpointsOverview, type ProviderMetadata } from "@/core/auth/endpoints";
import { authentication } from "@/server/container";
import { config } from "@/server/config";
import { signedIn } from "@/server/operator";

export const metadata: Metadata = { title: "Endpoints" };

export default async function EndpointsPage() {
  await signedIn();

  let published: ProviderMetadata | null = null;
  try {
    published = await authentication().providerMetadata();
  } catch (error) {
    unstable_rethrow(error);
    // Shown below: the addresses the settings give are still worth listing.
  }
  const settings = config();
  const overview = endpointsOverview(settings, published);

  return (
    <>
      <PageHeader
        title="Endpoints"
        description="The addresses and standards an application or an API needs to work with Clavia, each with its host, ready to copy."
      />
      {overview.discovered ? null : (
        <Alert variant="destructive">
          <GlobeIcon aria-hidden />
          <AlertTitle>Clavia’s discovery document could not be read</AlertTitle>
          <AlertDescription>
            Only the addresses that follow from this dashboard’s settings are listed. Reload to try again.
          </AlertDescription>
        </Alert>
      )}
      {overview.groups.map((group) => (
        <Card key={group.title} className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>{group.title}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="pr-6">Specification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.endpoints.map((endpoint) => (
                <TableRow key={endpoint.name}>
                  <TableCell className="pl-6 font-medium whitespace-normal">{endpoint.name}</TableCell>
                  <TableCell className="whitespace-normal">
                    <span className="flex items-center gap-1">
                      {endpoint.open ? (
                        <a
                          href={endpoint.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs break-all underline-offset-4 hover:underline"
                        >
                          {endpoint.url}
                        </a>
                      ) : (
                        <code className="font-mono text-xs break-all">{endpoint.url}</code>
                      )}
                      <CopyButton value={endpoint.url} label={`Copy the ${endpoint.name} address`} />
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 whitespace-normal">
                    <span className="flex flex-col gap-0.5 text-muted-foreground">
                      {endpoint.specs.map((spec) =>
                        spec.url === null ? (
                          <span key={spec.label}>{spec.label}</span>
                        ) : (
                          <a
                            key={spec.label}
                            href={spec.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline-offset-4 hover:text-foreground hover:underline"
                          >
                            {spec.label}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ),
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ))}
      {overview.capabilities.length === 0 ? null : (
        <Card>
          <CardHeader>
            <CardTitle>What Clavia supports</CardTitle>
            <CardDescription>As its discovery document states it.</CardDescription>
          </CardHeader>
          <dl className="flex flex-col gap-4 px-6">
            {overview.capabilities.map((capability) => (
              <div key={capability.name} className="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
                <dt className="text-sm font-medium sm:w-56 sm:shrink-0">{capability.name}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {capability.values.map((value) => (
                    <Badge key={value} variant="secondary" className="font-mono">
                      {value}
                    </Badge>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </>
  );
}
