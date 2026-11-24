/** Clavia's discovery document, as it was published: names and values this code does not control. */
export type ProviderMetadata = Readonly<Record<string, unknown>>;

export type Endpoint = Readonly<{
  name: string;
  /** Absolute, with its host: what an application is configured with. */
  url: string;
  /** The specification that defines it. */
  spec: string;
  /** Whether a browser can fetch it as it is, so it is worth a link. */
  open: boolean;
}>;

export type EndpointGroup = Readonly<{ title: string; description: string; endpoints: readonly Endpoint[] }>;

export type Capability = Readonly<{ name: string; values: readonly string[] }>;

export type EndpointsOverview = Readonly<{
  groups: readonly EndpointGroup[];
  capabilities: readonly Capability[];
  /** False when discovery could not be read: only what is derived from the settings is listed. */
  discovered: boolean;
}>;

/** What the provider's metadata names, in the order an integrator reaches for them. */
const PROVIDER_ENDPOINTS: readonly (readonly [key: string, name: string, spec: string, open: boolean])[] = [
  ["authorization_endpoint", "Authorization", "RFC 6749 §3.1", false],
  ["token_endpoint", "Token", "RFC 6749 §3.2", false],
  ["userinfo_endpoint", "UserInfo", "OpenID Connect Core §5.3", false],
  ["jwks_uri", "JSON Web Key Set (JWKS)", "RFC 7517 · OpenID Connect Discovery §3", true],
  ["end_session_endpoint", "End session", "OpenID Connect RP-Initiated Logout 1.0", false],
  ["revocation_endpoint", "Revocation", "RFC 7009", false],
  ["introspection_endpoint", "Introspection", "RFC 7662", false],
  ["registration_endpoint", "Dynamic client registration", "RFC 7591", false],
  ["device_authorization_endpoint", "Device authorization", "RFC 8628", false],
  ["pushed_authorization_request_endpoint", "Pushed authorization request", "RFC 9126", false],
];

const CAPABILITIES: readonly (readonly [key: string, name: string])[] = [
  ["scopes_supported", "Scopes"],
  ["response_types_supported", "Response types"],
  ["grant_types_supported", "Grant types"],
  ["code_challenge_methods_supported", "PKCE methods"],
  ["token_endpoint_auth_methods_supported", "Client authentication"],
  ["id_token_signing_alg_values_supported", "ID token signing"],
  ["dpop_signing_alg_values_supported", "DPoP signing"],
  ["acr_values_supported", "Authentication levels (acr)"],
];

/**
 * Every address an integrator needs, with its host: the issuer's discovery document and the
 * endpoints it names, the Management API, and the addresses of this dashboard that Clavia
 * calls. What the document names is shown as published; a value that is not an http(s) URL is
 * left out rather than shown as an address.
 */
export function endpointsOverview(
  settings: Readonly<{ issuer: URL; managementApi: URL; dashboardUrl: string }>,
  metadata: ProviderMetadata | null,
): EndpointsOverview {
  const issuer = settings.issuer.href.replace(/\/+$/, "");
  const published = metadata ?? {};

  const discovery: Endpoint[] = [
    { name: "Issuer", url: issuer, spec: "OpenID Connect Core §2 · RFC 8414 §2", open: false },
    {
      name: "OpenID configuration",
      url: `${issuer}/.well-known/openid-configuration`,
      spec: "OpenID Connect Discovery 1.0 §4",
      open: true,
    },
  ];

  const provider = PROVIDER_ENDPOINTS.flatMap(([key, name, spec, open]): Endpoint[] => {
    const url = httpUrl(published[key]);

    return url === null ? [] : [{ name, url, spec, open }];
  });

  const dashboard = settings.dashboardUrl;
  const groups: EndpointGroup[] = [
    {
      title: "Discovery",
      description: "Where an application finds everything else. Give it the issuer, and it reads the rest.",
      endpoints: discovery,
    },
    {
      title: "OAuth 2.1 and OpenID Connect",
      description: "What Clavia serves, as its discovery document publishes it.",
      endpoints: provider,
    },
    {
      title: "Management API",
      description: "What this dashboard calls. The base address is also the audience of its access tokens.",
      endpoints: [
        { name: "Base address", url: settings.managementApi.href, spec: "Clavia Management API", open: false },
      ],
    },
    {
      title: "This dashboard",
      description: "The addresses Clavia knows it by, registered with its application.",
      endpoints: [
        { name: "Redirect URI", url: `${dashboard}/auth/callback`, spec: "RFC 6749 §3.1.2", open: false },
        {
          name: "Back-channel logout URI",
          url: `${dashboard}/auth/backchannel-logout`,
          spec: "OpenID Connect Back-Channel Logout 1.0",
          open: false,
        },
        {
          name: "Post-logout redirect URI",
          url: `${dashboard}/signed-out`,
          spec: "OpenID Connect RP-Initiated Logout 1.0 §3",
          open: false,
        },
      ],
    },
  ];

  const capabilities = CAPABILITIES.flatMap(([key, name]): Capability[] => {
    const values = strings(published[key]);

    return values.length === 0 ? [] : [{ name, values }];
  });

  return { groups, capabilities, discovered: metadata !== null };
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
