import type { ConnectionStrategy } from "@/contract";

export const STRATEGIES: Readonly<Record<ConnectionStrategy, { label: string; description: string }>> = {
  database: { label: "Password pool", description: "Accounts with a password, kept by Clavia." },
  social: { label: "Social", description: "Google or GitHub, with credentials set on the server." },
  oidc: { label: "OpenID Connect", description: "Any provider that speaks OpenID Connect." },
  passwordless: { label: "Email code or link", description: "A one-time code or link sent by email." },
  saml: { label: "SAML", description: "An enterprise identity provider that speaks SAML 2.0." },
};
