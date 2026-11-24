/** Clavia's discovery document, as it was published: names and values this code does not control. */
export type ProviderMetadata = Readonly<Record<string, unknown>>;

/** A specification, named as it is cited, and where it is published (null when it is not public). */
export type Spec = Readonly<{ label: string; url: string | null }>;

export type Endpoint = Readonly<{
  name: string;
  /** Absolute, with its host: what an application is configured with. */
  url: string;
  /** The specifications that define it. */
  specs: readonly Spec[];
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

const rfc = (number: number, section?: number | string): Spec => ({
  label: section === undefined ? `RFC ${number}` : `RFC ${number} §${section}`,
  url: `https://www.rfc-editor.org/rfc/rfc${number}${section === undefined ? "" : `#section-${section}`}`,
});

const OIDC = "https://openid.net/specs";
const CORE = (section: string, anchor = ""): Spec => ({
  label: `OpenID Connect Core §${section}`,
  url: `${OIDC}/openid-connect-core-1_0.html${anchor}`,
});
const DISCOVERY = (section: string, anchor = ""): Spec => ({
  label: `OpenID Connect Discovery §${section}`,
  url: `${OIDC}/openid-connect-discovery-1_0.html${anchor}`,
});
const LOGOUT: Spec = {
  label: "OpenID Connect RP-Initiated Logout 1.0",
  url: `${OIDC}/openid-connect-rpinitiated-1_0.html`,
};
const BACKCHANNEL: Spec = {
  label: "OpenID Connect Back-Channel Logout 1.0",
  url: `${OIDC}/openid-connect-backchannel-1_0.html`,
};

/** What the provider's metadata names, in the order an integrator reaches for them. */
const PROVIDER_ENDPOINTS: readonly (readonly [key: string, name: string, specs: readonly Spec[], open: boolean])[] = [
  ["authorization_endpoint", "Authorization", [rfc(6749, "3.1")], false],
  ["token_endpoint", "Token", [rfc(6749, "3.2")], false],
  ["userinfo_endpoint", "UserInfo", [CORE("5.3", "#UserInfo")], false],
  ["jwks_uri", "JSON Web Key Set (JWKS)", [rfc(7517), DISCOVERY("3", "#ProviderMetadata")], true],
  ["end_session_endpoint", "End session", [LOGOUT], false],
  ["revocation_endpoint", "Revocation", [rfc(7009)], false],
  ["introspection_endpoint", "Introspection", [rfc(7662)], false],
  ["registration_endpoint", "Dynamic client registration", [rfc(7591)], false],
  ["device_authorization_endpoint", "Device authorization", [rfc(8628)], false],
  ["pushed_authorization_request_endpoint", "Pushed authorization request", [rfc(9126)], false],
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
    { name: "Issuer", url: issuer, specs: [CORE("2", "#IDToken"), rfc(8414, 2)], open: false },
    {
      name: "OpenID configuration",
      url: `${issuer}/.well-known/openid-configuration`,
      specs: [DISCOVERY("4", "#ProviderConfig")],
      open: true,
    },
  ];

  const provider = PROVIDER_ENDPOINTS.flatMap(([key, name, specs, open]): Endpoint[] => {
    const url = httpUrl(published[key]);

    return url === null ? [] : [{ name, url, specs, open }];
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
        {
          name: "Base address",
          url: settings.managementApi.href,
          specs: [{ label: "Clavia Management API", url: null }],
          open: false,
        },
      ],
    },
    {
      title: "This dashboard",
      description: "The addresses Clavia knows it by, registered with its application.",
      endpoints: [
        { name: "Redirect URI", url: `${dashboard}/auth/callback`, specs: [rfc(6749, "3.1.2")], open: false },
        {
          name: "Back-channel logout URI",
          url: `${dashboard}/auth/backchannel-logout`,
          specs: [BACKCHANNEL],
          open: false,
        },
        {
          name: "Post-logout redirect URI",
          url: `${dashboard}/signed-out`,
          specs: [{ ...LOGOUT, label: "OpenID Connect RP-Initiated Logout §3" }],
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
