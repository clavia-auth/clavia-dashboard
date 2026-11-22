# Clavia Dashboard

The administration console of [Clavia](https://github.com/clavia-auth/clavia), the open-source
OAuth 2.1 / OpenID Connect authorization server. Operators sign in through Clavia itself and
manage users, applications, APIs, roles and connections, and read the audit log, all through
Clavia's Management API.

It is a Next.js 16 application. It runs as a backend for frontend: the browser holds only an
opaque session cookie, and every token stays on the server.

## Getting started

You need Node 22.12 or later and a local Clavia (see its README). With Clavia's stack running:

```sh
make up && make seed        # in the Clavia repository; `seed` prints the values below
```

```sh
npm install
cp .env.example .env.local  # then set DASHBOARD_SESSION_SECRET, and the domain if not clavia.test (prefer `.test` to `.local`: see Clavia's README)
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
npm run dev
```

Open <https://management.clavia.test/dashboard> and sign in as `dev@clavia.test` /
`devpassword`. Clavia's Caddy serves the dashboard under `/dashboard` on the management host
and forwards it to port 3000. Set `CLAVIA_DASHBOARD_UPSTREAM` if your dashboard runs elsewhere.

### Settings

| Variable                         | Meaning                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| `CLAVIA_ISSUER`                  | Clavia's issuer, as its discovery document states it                |
| `CLAVIA_CLIENT_ID`               | The dashboard's confidential client                                 |
| `CLAVIA_CLIENT_SECRET`           | Its secret (HTTP Basic at the token endpoint)                       |
| `CLAVIA_MANAGEMENT_API`          | The Management API's identifier, which is also where it is served   |
| `DASHBOARD_URL`                  | Where browsers reach the dashboard, base path included              |
| `DASHBOARD_SESSION_SECRET`       | 32 random bytes, base64url: the key session records are sealed with |
| `DASHBOARD_REDIS_URL`            | Where sessions are kept                                             |
| `DASHBOARD_SESSION_LIFETIME`     | Optional, seconds: a session's longest life (default 8 hours)       |
| `DASHBOARD_SESSION_IDLE_TIMEOUT` | Optional, seconds: how long a session lasts unused (default 1 hour) |

The settings are checked when the first request needs them, not at build time. The same build
therefore runs in every environment.

### Registering the client in production

`clavia seed-dev` registers the development client. A real deployment registers its own
confidential client with:

- grants `authorization_code` and `refresh_token`, and `client_secret_basic` authentication;
- the redirect URI `{DASHBOARD_URL}/auth/callback`;
- the post-logout redirect URI `{DASHBOARD_URL}/signed-out`;
- back-channel logout at `{DASHBOARD_URL}/auth/backchannel-logout`, with a session required.

The client holds no rights of its own. An operator may do whatever their roles grant on the
Management API, and the dashboard shows only what the operator's token allows: a section or an action whose scope the
token lacks is hidden or explained, never offered just to fail.

## Scripts

| Script             | What it does                                                          |
| ------------------ | --------------------------------------------------------------------- |
| `npm run dev`      | The development server                                                |
| `npm run build`    | A production build; `npm start` serves it                             |
| `npm run check`    | Lint, type check and unit tests, as CI runs them                      |
| `npm test`         | The unit tests; the Redis store tests need `DASHBOARD_TEST_REDIS_URL` |
| `npm run e2e`      | The smoke suite in a browser, against a running dashboard (see below) |
| `npm run contract` | Regenerates `src/contract/` from `contract/management-api.yaml`       |

### Tests

The unit tests cover the core and every adapter. The core's sign-in, refresh and sign-out rules
run against in-memory fakes. The OpenID Connect adapter runs against a fake Clavia that signs
real tokens. The Management API adapter runs against recorded responses. Both session stores
pass one shared contract.

```sh
DASHBOARD_TEST_REDIS_URL=redis://localhost:6379/15 npm test
```

The store tests flush that database, so give them one of their own.

The smoke suite signs in through Clavia's real login page, opens every section and signs out:

```sh
npx playwright install chromium   # once
E2E_DASHBOARD_URL=https://management.clavia.test/dashboard npm run e2e
```

`E2E_EMAIL` and `E2E_PASSWORD` override the development operator.

## Updating the contract

The Management API's OpenAPI document is copied from Clavia (`docs/openapi/management-api.yaml` there)
into `contract/`. After Clavia's API changes:

```sh
cp ../Clavia/docs/openapi/management-api.yaml contract/
npm run contract && npm run typecheck
```

The type checker then names every page the change touches.

## Architecture

See [docs/architecture.md](docs/architecture.md).

## License

BSD 3-Clause, like Clavia.
