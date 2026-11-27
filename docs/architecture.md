# Architecture

The dashboard is a hexagon, like Clavia. A core with no framework in it holds the rules about
sessions and operators. Adapters connect it to Clavia, to Redis and to the browser, and the
Next.js routes drive it.

```
src/
├── contract/      the Management API's published language, generated from its OpenAPI document
├── core/          rules and ports: no Next.js, no fetch, no Redis
│   ├── auth/          sign-in, sessions, refresh, sign-out, back-channel logout; the operator
│   └── management/    the ManagementApi port and the errors it may raise
├── adapters/      the ports' implementations
│   ├── oidc/          ClaviaIdentityProvider (oauth4webapi, jose)
│   ├── session/       sealed Redis session and sign-in stores
│   └── management-api/ ClaviaManagementApi (openapi-fetch) and problem mapping
├── server/        the composition root, the data access layer and the server action helpers
├── app/           routes: the primary adapters
└── components/    UI: ui/ is shadcn's, shell/ the frame, app/ shared pieces, audit/ the log's
```

Dependencies point inwards. `core` imports only `contract`. `adapters` implement `core`'s
ports. `server` wires them together, and only `server` and `app` know Next.js exists.
Everything under `server` imports `server-only`, so it cannot reach a client bundle by mistake.

## A backend for frontend

The dashboard is a confidential OAuth client. Clavia never hands its tokens to the browser:

1. `GET /auth/sign-in` begins an authorization code flow with PKCE (S256), a nonce and a state.
   It asks for the Management API as `audience`. The attempt is stored server-side for ten
   minutes, and the browser gets only its state, in a cookie scoped to `/dashboard/auth`.
   When Clavia cannot be reached, here or at the callback, the adapter refuses the sign-in as
   `unreachable`, naming Clavia's host and the connection's own reason (`ECONNREFUSED`, a
   certificate it does not trust, a timeout) in the log, and the browser lands on
   `/signed-out?reason=unreachable` rather than on an empty error.
2. `GET /auth/callback` checks the state in constant time and takes the attempt, which works
   once only. It then redeems the code with HTTP Basic and checks the ID token (signature,
   issuer, audience, nonce). It stores a session and sets an opaque, `HttpOnly`, `SameSite=Lax`
   handle scoped to `/dashboard`.
3. Each request reads the session through `currentSession()`, which is cached per request. The
   access token is refreshed a minute before it expires, under a Redis lock: concurrent
   requests then spend a rotated refresh token once, and the others read the result. A session
   ends after eight hours, or after an hour unused.
4. `POST /auth/sign-out` (same-origin only) destroys the session, revokes the refresh token and
   sends the browser to Clavia's end-session endpoint with the ID token as a hint.
5. `POST /auth/backchannel-logout` takes Clavia's logout token when the operator signs out
   elsewhere. It checks the signature, `typ: logout+jwt`, the events claim and the absence of a
   nonce, then ends every session the token's `sid` or `sub` names.
6. **Step-up.** When the Management API requires more than one factor and the operator's token
   came from a sign-in with one, it answers `401` with `insufficient_user_authentication` and
   the `acr_values` to ask for (RFC 9470). The adapter turns that into a `step_up_required`
   error; `perform()` and `load()` send the browser to sign in again with those values and back
   to the page it was on. Clavia raises its session with one more factor, so the operator is not
   asked for their password. A session under a minute old is not sent round again: a new
   sign-in would not change the answer, so the refusal is shown.

Session records are sealed with AES-256-GCM, with their key as additional data, so a record
cannot be read, or moved to another key, without `DASHBOARD_SESSION_SECRET`. Redis stores only
the SHA-256 of the handle, never the handle itself.

## Reading and changing data

Server Components read through `signedIn()`, which returns the operator and a Management API
client bound to their access token, or redirects to sign-in. The proxy also redirects a
cookieless request before any rendering, but it only stops requests early: the data access
layer still checks every request.

- `load()` turns a missing resource into the page's 404, and an expired session into a new
  sign-in. `find()` does the same for a resource the URL names, and also treats an identifier
  Clavia refuses as malformed as a 404.
- Server actions go through `perform()`. It re-reads the operator, because the page that showed
  the form is not proof of anything. It maps Clavia's problem documents to field errors and
  messages, and names the missing scope when Clavia refuses one. Inputs are parsed with zod
  before Clavia sees them.
- After a change, `refresh()` re-renders the current route in the same round trip.

What an operator sees follows their token's scopes (`Operator.can()`). A section they cannot
read is not in the navigation. An action they cannot take is hidden, or explained where its
absence would confuse. Clavia enforces the same rules: the UI only avoids offering what would
fail.

## Rendering

Every page is rendered on demand: the dashboard shows live data to a signed-in operator, so
there is nothing to prerender. Navigation stays fast thanks to `loading.tsx` skeletons per
section, Suspense boundaries around independent reads (the overview's figures stream in one by
one), optimistic toggles, and transitions around searches and filters.

**Cache Components and partial prerendering are off.** The Content Security Policy is strict and
nonce-based: `script-src 'nonce-…' 'strict-dynamic'`, with no `'unsafe-inline'`. The proxy makes a
fresh nonce for each request, and a prerendered shell cannot carry one. The dashboard chooses the
strict policy over the static shell. An admin console is a valuable target for script injection,
and every one of its pages is personal and dynamic anyway.

The policy's `form-action` names Clavia's origin as well as the dashboard's. Chromium checks
`form-action` against every hop of a form's redirect chain, and signing out redirects to Clavia.

## Behind Clavia's Caddy

Clavia's Caddy serves the dashboard at `/dashboard` on the management host, next to the API, so
the dashboard's calls to the API and the browser's requests share an origin. Caddy keeps the
`Host` header: Next.js checks server actions against CSRF by comparing `Origin` with `Host`.
`DASHBOARD_URL` is the public address. The callback rebuilds its URL from it rather than trust
the forwarded request line.

## The contract

`contract/management-api.yaml` is a copy of Clavia's OpenAPI document. `npm run contract`
generates the request and response types and the list of management scopes from it. The
generated files are committed, so a build needs neither Clavia nor the generator, and a diff
shows what changed in the API.
