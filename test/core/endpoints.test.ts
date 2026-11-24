import { describe, expect, it } from "vitest";

import { endpointsOverview } from "@/core/auth/endpoints";

const settings = {
  issuer: new URL("https://auth.clavia.test"),
  managementApi: new URL("https://management.clavia.test/api/v1/"),
  dashboardUrl: "https://management.clavia.test/dashboard",
};

const urls = (overview: ReturnType<typeof endpointsOverview>) =>
  Object.fromEntries(overview.groups.flatMap((group) => group.endpoints).map((e) => [e.name, e.url]));

describe("endpointsOverview", () => {
  it("lists the discovery address, the management API and the dashboard's own, with their host", () => {
    const found = urls(endpointsOverview(settings, null));

    expect(found["Issuer"]).toBe("https://auth.clavia.test");
    expect(found["OpenID configuration"]).toBe("https://auth.clavia.test/.well-known/openid-configuration");
    expect(found["Base address"]).toBe("https://management.clavia.test/api/v1/");
    expect(found["Redirect URI"]).toBe("https://management.clavia.test/dashboard/auth/callback");
    expect(found["Back-channel logout URI"]).toBe("https://management.clavia.test/dashboard/auth/backchannel-logout");
  });

  it("says discovery was not read, and lists no provider endpoint it could not know", () => {
    const overview = endpointsOverview(settings, null);

    expect(overview.discovered).toBe(false);
    expect(urls(overview)["Token"]).toBeUndefined();
    expect(overview.capabilities).toEqual([]);
  });

  it("shows the endpoints the document names and leaves out what it does not", () => {
    const overview = endpointsOverview(settings, {
      token_endpoint: "https://auth.clavia.test/oauth2/token",
      jwks_uri: "https://auth.clavia.test/.well-known/jwks.json",
      scopes_supported: ["openid", "email", 3],
      grant_types_supported: [],
    });
    const found = urls(overview);

    expect(overview.discovered).toBe(true);
    expect(found["Token"]).toBe("https://auth.clavia.test/oauth2/token");
    expect(found["JSON Web Key Set (JWKS)"]).toBe("https://auth.clavia.test/.well-known/jwks.json");
    expect(found["Revocation"]).toBeUndefined();
    expect(overview.capabilities).toEqual([{ name: "Scopes", values: ["openid", "email"] }]);
  });

  it("never shows a value that is not an http(s) address as one", () => {
    const found = urls(
      endpointsOverview(settings, {
        token_endpoint: "javascript:alert(1)",
        userinfo_endpoint: "not a url",
        revocation_endpoint: 42,
      }),
    );

    expect(found["Token"]).toBeUndefined();
    expect(found["UserInfo"]).toBeUndefined();
    expect(found["Revocation"]).toBeUndefined();
  });
});
