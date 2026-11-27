import type { Metadata } from "next";

import { ClaviaMark } from "@/components/shell/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Signed out" };

const MESSAGES: Record<string, { title: string; description: string }> = {
  access_denied: {
    title: "No access to the dashboard",
    description:
      "Clavia did not grant you the Management API. Ask an administrator to give you a role on it, then sign in again.",
  },
  unknown_attempt: {
    title: "That sign-in has expired",
    description: "It took too long, or was started in another browser. Start again from here.",
  },
  provider_error: {
    title: "Signing in did not work",
    description: "Clavia could not complete the sign-in. Try again; if it keeps failing, check the server's logs.",
  },
  unreachable: {
    title: "Clavia cannot be reached",
    description:
      "The dashboard could not connect to Clavia to sign you in. Try again in a moment; if it keeps failing, the server's logs say why.",
  },
};

const SIGNED_OUT = { title: "You're signed out", description: "Your dashboard session has ended." };

export default async function SignedOutPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = (reason !== undefined ? MESSAGES[reason] : undefined) ?? SIGNED_OUT;

  return (
    <main className="grid min-h-svh place-items-center bg-[radial-gradient(60rem_30rem_at_50%_-10rem,color-mix(in_oklch,var(--brand)_18%,transparent),transparent_70%)] p-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <ClaviaMark className="mx-auto mb-2 size-12" />
          <CardTitle className="text-xl">{message.title}</CardTitle>
          <CardDescription>{message.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            {/* A plain anchor: the route redirects off-site, and a <Link> would run it twice (a background fetch, then a navigation), each setting a new state cookie. */}
            <a href="/dashboard/auth/sign-in">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
