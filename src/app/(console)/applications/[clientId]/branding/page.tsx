import type { Metadata } from "next";

import { signedIn } from "@/server/operator";

import { applicationById } from "../data";
import { BrandingForm } from "./branding-form";

export const metadata: Metadata = { title: "Branding" };

/** The application's look on its sign-in pages: its colour and its logo, beside its name. */
export default async function ApplicationBrandingPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { operator } = await signedIn();
  const { clientId } = await params;
  const client = await applicationById(clientId);
  const base = `/dashboard/applications/${encodeURIComponent(client.client_id)}/branding/logo`;

  return (
    <BrandingForm
      clientId={client.client_id}
      name={client.name}
      accentColor={client.accent_color}
      logoUrl={client.logo_version === null ? null : `${base}?v=${client.logo_version}`}
      editable={operator.can("update:clients")}
    />
  );
}
