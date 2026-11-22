import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";

export const ISSUER = "https://auth.clavia.test";
export const CLIENT_ID = "clavia-dashboard";
export const CLIENT_SECRET = "dev-dashboard-secret-for-local-development-only";
export const REDIRECT_URI = "https://management.clavia.test/dashboard/auth/callback";

type Handler = (request: Request) => Response | Promise<Response>;

/**
 * Clavia's endpoints as far as the dashboard reaches them, over a fake `fetch`: discovery,
 * the JWKS, the token, userinfo and revocation endpoints. Tokens are signed with a real
 * RSA key, so the dashboard checks real signatures.
 */
export async function fakeClavia() {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "key-1", alg: "RS256", use: "sig" };
  const requests: Request[] = [];
  const overrides = new Map<string, Handler>();

  const sign = (claims: Record<string, unknown>, type = "JWT") =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "key-1", typ: type })
      .setIssuer(ISSUER)
      .setIssuedAt()
      .sign(privateKey);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const routes: Record<string, Handler> = {
    "/.well-known/openid-configuration": () =>
      json({
        issuer: ISSUER,
        authorization_endpoint: `${ISSUER}/oauth2/authorize`,
        token_endpoint: `${ISSUER}/oauth2/token`,
        userinfo_endpoint: `${ISSUER}/oidc/userinfo`,
        jwks_uri: `${ISSUER}/oidc/jwks.json`,
        revocation_endpoint: `${ISSUER}/oauth2/revoke`,
        end_session_endpoint: `${ISSUER}/oidc/logout`,
        authorization_response_iss_parameter_supported: true,
        id_token_signing_alg_values_supported: ["RS256"],
      }),
    "/oidc/jwks.json": () => json({ keys: [jwk] }),
    "/oidc/userinfo": () => json({ sub: "user-1", name: "Ada Lovelace", email: "ada@example.com" }),
    "/oauth2/revoke": () => new Response(null, { status: 200 }),
  };

  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.clone());
    const path = new URL(request.url).pathname;
    const handler = overrides.get(path) ?? routes[path];

    return handler === undefined ? new Response("Not found", { status: 404 }) : handler(request);
  }) as typeof fetch;

  return { fetcher, requests, overrides, sign, json };
}
