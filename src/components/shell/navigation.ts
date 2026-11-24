import type { Route } from "next";

import type { ManagementScope } from "@/contract";

/** The sections of the dashboard, each shown only to an operator whose token can read it. */
export type Section = Readonly<{
  title: string;
  href: Route;
  icon:
    | "overview"
    | "users"
    | "applications"
    | "apis"
    | "roles"
    | "connections"
    | "keys"
    | "tokens"
    | "audit"
    | "endpoints";
  /** What the operator's token must carry to see it; null for every operator. */
  needs: ManagementScope | null;
  description: string;
}>;

export const SECTIONS: readonly Section[] = [
  { title: "Overview", href: "/", icon: "overview", needs: null, description: "Your deployment at a glance" },
  { title: "Users", href: "/users", icon: "users", needs: "read:users", description: "People who sign in" },
  {
    title: "Applications",
    href: "/applications",
    icon: "applications",
    needs: "read:clients",
    description: "Clients that ask for tokens",
  },
  { title: "APIs", href: "/apis", icon: "apis", needs: "read:resource_servers", description: "What tokens are for" },
  { title: "Roles", href: "/roles", icon: "roles", needs: "read:roles", description: "Who may do what" },
  {
    title: "Connections",
    href: "/connections",
    icon: "connections",
    needs: "read:connections",
    description: "Ways to sign in",
  },
  {
    title: "Initial access tokens",
    href: "/initial-access-tokens",
    icon: "tokens",
    needs: "read:initial_access_tokens",
    description: "Let software register itself",
  },
  {
    title: "Signing keys",
    href: "/signing-keys",
    icon: "keys",
    needs: "read:signing_keys",
    description: "What tokens are signed with",
  },
  { title: "Audit log", href: "/audit", icon: "audit", needs: "read:audit_events", description: "What happened" },
  {
    title: "Endpoints",
    href: "/endpoints",
    icon: "endpoints",
    needs: null,
    description: "Addresses and standards to integrate with",
  },
];
