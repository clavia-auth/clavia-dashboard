import type { AuthMethod, ClientType, GrantType } from "@/contract";

/**
 * The kinds of application an operator registers, each a coherent starting point Clavia
 * accepts: the client type, how it authenticates, and the grants it uses. Everything can
 * be changed afterwards on the application's settings.
 */
export const KINDS = {
  web: {
    label: "Regular web application",
    description: "A server-side app that keeps a secret: sign-in with the code flow, refresh tokens.",
    type: "confidential",
    authMethod: "client_secret_basic",
    grants: ["authorization_code", "refresh_token"],
    redirects: true,
  },
  spa: {
    label: "Single-page or native app",
    description: "Runs where a secret cannot be kept: the code flow with PKCE, refresh tokens.",
    type: "public",
    authMethod: "none",
    grants: ["authorization_code", "refresh_token"],
    redirects: true,
  },
  machine: {
    label: "Machine to machine",
    description: "A service calling an API as itself, with the client credentials grant.",
    type: "confidential",
    authMethod: "client_secret_basic",
    grants: ["client_credentials"],
    redirects: false,
  },
  device: {
    label: "Device or command line",
    description: "No browser of its own: the person approves it on another screen (RFC 8628).",
    type: "public",
    authMethod: "none",
    grants: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
    redirects: false,
  },
} as const satisfies Record<
  string,
  {
    label: string;
    description: string;
    type: ClientType;
    authMethod: AuthMethod;
    grants: readonly GrantType[];
    redirects: boolean;
  }
>;

export type Kind = keyof typeof KINDS;

export const GRANT_LABELS: Readonly<Record<GrantType, string>> = {
  authorization_code: "Authorization code",
  refresh_token: "Refresh token",
  client_credentials: "Client credentials",
  "urn:ietf:params:oauth:grant-type:device_code": "Device code",
};
