@AGENTS.md

# CLAUDE.md

Guidance for working in this repository: what the dashboard is, how it is built, and the rules a
change must keep. [`docs/architecture.md`](docs/architecture.md) explains the design in prose;
this file is the working reference.

Clavia Dashboard is the administration console of
[Clavia](https://github.com/clavia-auth/clavia), the OAuth 2.1 / OpenID Connect server.
Operators sign in through Clavia and manage users, applications, APIs, roles and connections,
and read the audit log, all through Clavia's Management API. It is a Next.js 16 application
running as a **backend for frontend**: the browser holds an opaque session cookie, and every
token stays on the server.

**The bar:** clean, robust, state-of-the-art code; a hexagonal core; a professional, smooth
interface. Next.js 16 differs from what most training data describes. The block imported above
from `AGENTS.md` applies: read the guide in `node_modules/next/dist/docs/` before using an API.

## Contents

1. [Working agreements](#working-agreements)
2. [Commands](#commands)
3. [Repository map](#repository-map)
4. [Architecture](#architecture)
5. [Authentication and sessions](#authentication-and-sessions)
6. [Reading and changing data](#reading-and-changing-data)
7. [Interface](#interface)
8. [Security](#security)
9. [Testing](#testing)
10. [Recipes](#recipes)
11. [Definition of done](#definition-of-done)
12. [Decisions and known pitfalls](#decisions-and-known-pitfalls)

---

## Working agreements

- **Work goes through the backlog and pull requests.** Claude takes an issue, works on a branch,
  commits, pushes and opens a pull request; the maintainer reviews and merges. Claude never
  merges, approves, or pushes to `main` (a ruleset protects it). The steps are skills in
  `.claude/skills/`: `ticket-pick`, `ticket-work`, `ticket-review`, `ticket-triage`,
  `ticket-design`, `ticket-release`; `CONTRIBUTING.md` describes the board they move issues on.
- **`.env` and `.env.local` are the maintainer's**, and hold secrets: never read them back into
  a file or a message. `.env.example` documents every setting.
- **`AGENTS.md` is written by `next dev`.** Leave its block as it is.
- **`src/contract/` is generated** (`npm run contract`), and `src/components/ui/` is shadcn's:
  regenerate or edit in place, but never hand-write types the contract already defines.
- **`npm run check` is green before anything is proposed.**

## Commands

| Command                           | What it does                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`                     | Development server on port 3000; Clavia's Caddy serves it at `https://management.{domain}/dashboard`   |
| `npm run build` · `npm start`     | Production build · serve it                                                                            |
| `npm run check`                   | Format check, ESLint, `tsc`, unit tests: what CI runs                                                  |
| `npm test` · `npm run test:watch` | Vitest; the Redis store tests need `DASHBOARD_TEST_REDIS_URL` (a database of their own: they flush it) |
| `npm run e2e`                     | Playwright smoke suite against a running dashboard (`E2E_DASHBOARD_URL`, `E2E_EMAIL`, `E2E_PASSWORD`)  |
| `npm run contract`                | Regenerate `src/contract/` from `contract/management-api.yaml`                                         |
| `npm run format`                  | Prettier, 120 columns                                                                                  |

Node needs to trust the local certificate authority to reach Clavia in development:
`export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"`.

## Repository map

```
contract/management-api.yaml   a copy of Clavia's OpenAPI document: the published language
scripts/generate-contract.mjs  generates src/contract/ from it
src/
  contract/      generated types and the list of management scopes; index.ts names them
  core/          rules and ports: no Next.js, no fetch, no Redis
    auth/          Authentication (sign-in, session, refresh, sign-out, back-channel logout),
                   Operator, ports, safeReturnTo
    management/    the ManagementApi port and ManagementError
  adapters/      the ports' implementations
    oidc/          ClaviaIdentityProvider (oauth4webapi, jose)
    session/       sealed Redis session and sign-in stores
    management-api/ ClaviaManagementApi (openapi-fetch) and problem mapping
  server/        composition root, data access layer, action helpers (server-only)
  proxy.ts       per-request CSP and nonce, early redirect to sign-in
  app/           routes
    auth/          sign-in, callback, sign-out, back-channel logout (route handlers)
    signed-out/    the page after sign-out or a refused sign-in
    (console)/     the signed-in console: one folder per section
  components/
    ui/            shadcn components
    shell/         the frame: sidebar, operator menu, command menu, providers
    app/           shared pieces: page header, fields, pager, dialogs, badges
    audit/         the audit log's table, details and labels
test/            Vitest: core/, adapters/, support/ (fakes, shared contracts)
e2e/             Playwright smoke suite
docs/architecture.md
docs/RELEASING.md   how a release is made and what its workflow checks
Dockerfile         the production image (Next.js standalone, port 3000)
CHANGELOG.md       the release notes, one section per version
.claude/         the ticket-* skills and board.sh, which move work through the backlog
.github/         CI, the image and release workflows, the @claude workflow, issue forms, the pull request template
```

## Architecture

A hexagon. Dependencies point inward:

- **`core`** imports only `contract`. It holds the sign-in and session rules (`Authentication`),
  the operator (`Operator.can(scope)`), the ports (`IdentityProvider`, `SessionStore`,
  `PendingSignInStore`, `Clock`, `ManagementApi`) and their errors (`SignInRefused`,
  `ManagementError`). No Next.js, no `fetch`, no Redis, no `process.env`.
- **`adapters`** implement the ports: `ClaviaIdentityProvider`, `RedisSessionStore` and
  `RedisPendingSignInStore`, `ClaviaManagementApi`.
- **`server`** wires them (`container.ts`, the composition root, cached on `globalThis`), reads
  the settings (`config.ts`, zod-validated on first use, never at build time), and gives pages
  and actions their entry points: `signedIn()`, `load()`/`find()`, `perform()`/`parse()`. Every
  file imports `server-only`.
- **`app`** is the primary adapter: routes, pages and server actions. Only `server` and `app`
  know Next.js exists.

The Management API is reached only through the `ManagementApi` port. A page never calls
`fetch`, and never imports an adapter.

## Authentication and sessions

The dashboard is a confidential OAuth client of Clavia (`client_secret_basic`). The flow:

1. **`GET /auth/sign-in`**: `Authentication.beginSignIn()` makes a PKCE (S256) pair, a nonce
   and a state, asks for `openid profile email` plus every management scope with the Management
   API as `audience`, and stores the attempt for ten minutes. The browser gets only the state,
   in `clavia_dashboard_sign_in` (`Path=/dashboard/auth`).
2. **`GET /auth/callback`**: the state is compared in constant time, the attempt taken once,
   the code redeemed, the ID token checked (signature, issuer, audience, nonce). A session is
   created, and the browser gets `clavia_dashboard_session`: an opaque handle, `HttpOnly`,
   `Secure`, `SameSite=Lax`, `Path=/dashboard`. A refusal goes to `/signed-out?reason=`.
3. **Each request** reads the session once (`currentSession`, React `cache`). The access token
   is refreshed a minute before expiry, under a Redis lock, so concurrent requests spend a
   rotated refresh token once and the others re-read the result. Sessions last eight hours at
   most (`DASHBOARD_SESSION_LIFETIME`) and one hour unused (`DASHBOARD_SESSION_IDLE_TIMEOUT`).
4. **`POST /auth/sign-out`** (same origin only): the session is destroyed, the refresh token
   revoked, and the browser sent to Clavia's end-session endpoint with the ID token as hint.
5. **`POST /auth/backchannel-logout`**: Clavia's logout token is verified (signature, issuer,
   audience, `typ: logout+jwt`, the events claim, no nonce, a `sid` or `sub`), and every session
   it names ends.

Session records are sealed with AES-256-GCM under `DASHBOARD_SESSION_SECRET`, with the record's
key as additional data. Redis holds the SHA-256 of the handle, never the handle, plus indexes by
`sid` and by subject for back-channel logout. `safeReturnTo()` keeps a post-sign-in target
inside the dashboard.

## Reading and changing data

### Pages

A page is an async Server Component:

```tsx
const { operator, api } = await signedIn(); // or a redirect to sign-in
if (!operator.can("read:connections")) {
  return <Restricted scope="read:connections" what="connections" />;
}
const connections = await load(api.connections.list());
```

- **`signedIn()`** is the data access layer: the operator and a Management API client bound to
  their access token. `proxy.ts` redirects a cookieless request early, but that only saves a
  render; `signedIn()` is the check.
- **`load()`** turns a missing resource into the page's 404 and an expired session into a new
  sign-in. **`find()`** does the same for a resource the URL names, and also treats an identifier
  Clavia refuses as malformed as a 404. Lists use `load()`, since a 422 there is a query bug.
- **Independent reads stream**: wrap each in its own `<Suspense>` with a skeleton, so one slow or
  failing read does not hold the page. Each section has a `loading.tsx`.
- **What the operator sees follows their scopes** (`operator.can()`): a section they cannot read
  is not in the navigation; an action they cannot take is hidden, or explained where its absence
  would confuse. Clavia enforces the same rules; the UI only avoids offering what would fail.

### Server actions

```ts
export async function updateRole(roleId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parse(roleSchema, { name: form.get("name"), description: form.get("description") ?? "" });
  if (!parsed.ok) return parsed.state;

  return perform(async ({ api }) => {
    await api.roles.update(roleId, parsed.data);
    refresh();
    return "Role saved.";
  });
}
```

- **Every input is parsed with zod** before Clavia sees it (`parse()`; its message is the first
  issue, plus "and N more").
- **`perform()` re-reads the operator**: the page that showed the form proves nothing. It maps a
  `ManagementError` to the form's state: field errors from the problem's pointers, a message
  naming the missing scope on a 403, a new sign-in on a 401.
- **`refresh()`** from `next/cache` re-renders the current route in the same round trip. Call
  `redirect()` outside `perform()`'s callback, after it returns.
- **`unstable_rethrow()`** first in any `catch` that could swallow Next's control flow
  (`redirect`, `notFound`).
- **Actions return `ActionState`** (`idle`, `success` or `error`, with `fields` and `at`); forms
  use `useActionState` and `useActionFeedback()` for the toast.
- **Take identifiers, not records**: an action receives the id and the change, and Clavia decides
  the rest.

### The contract

`contract/management-api.yaml` is Clavia's `docs/openapi/management-api.yaml`, copied unchanged.
`npm run contract` generates `src/contract/management-api.ts` (types) and `scopes.ts`
(`MANAGEMENT_SCOPES`). `src/contract/index.ts` gives the types their names (`User`, `Client`,
`Role`, `AuditEvent`, `Page<T>`…). After Clavia's API changes: copy the document, regenerate,
`npm run typecheck`, and fix what it names. `ClaviaManagementApi` maps Clavia's problem documents
to `ManagementError` kinds: `unauthenticated` (401), `forbidden` (403, with the scope from
`WWW-Authenticate`), `not_found`, `conflict` (409), `invalid` (400, 415, 422, with fields), `rate_limited` (429),
`service_unavailable` (503), and `unavailable` for anything else, without echoing the body.

## Interface

- **shadcn/ui** (radix-nova style) on Tailwind CSS 4. Components in `src/components/ui` are
  shadcn's; compose them in `components/app` rather than forking them. `cn` (the `cn` package)
  merges classes, tailwind-merge style, so a later class overrides an earlier one.
- **The palette** is Clavia's logo, in OKLCH, in `src/app/globals.css`: primary deep green
  (`#2D6A4F` light, `#52B788` dark), gold focus ring (`#D4A843`), plus `--brand`, `--gold` and
  `--success`. Every pair passes WCAG AA. Use the tokens (`bg-primary`, `text-muted-foreground`),
  never raw colours.
- **Fluid, never blocking**: `loading.tsx` per section, Suspense around independent reads,
  `useOptimistic` for toggles, transitions around search and filters, toasts (sonner) for
  outcomes. A destructive action goes through `ConfirmAction`.
- **Shared pieces**: `PageHeader`, `SectionTabs`, `EmptyState`, `Restricted`, `Pager`,
  `SearchField` (debounced, drives `?q=`), `TextField`/`SwitchField`/`LinesField`/
  `CheckboxesField`, `SecretDialog` (a secret shown once), `CopyButton`, `RelativeTime`,
  `StatusBadges`, `UserAvatar`.
- **The shell**: `navigation.ts` lists the sections with the scope each needs; the command menu
  (⌘K) and the sidebar read it. Theme with next-themes (light, dark, system).
- **Accessibility**: landmarks (`<nav aria-label="Sections">`, `main`), `aria-current` on the
  active section, every control labelled, focus visible. The Playwright suite selects by role and
  label, so an inaccessible control fails it.
- **Words**: plain and specific. Name what happened and what to do ("Your roles do not grant
  update:roles, which this needs.").

## Security

- **No token reaches the browser.** Server Components and actions call Clavia from the server;
  the browser talks to the dashboard only.
- **Content-Security-Policy per request**, from `proxy.ts`: a fresh nonce,
  `script-src 'nonce-…' 'strict-dynamic'` (plus `'unsafe-eval'` in development), no inline
  script, `frame-ancestors 'none'`, `base-uri 'none'`, `object-src 'none'`. `form-action` names
  Clavia's origin too: Chromium checks it along a form's whole redirect chain, and sign-out
  redirects there.
- **Server actions are untrusted entry points**: authenticate (`perform`), validate (zod), take
  identifiers. Next checks `Origin` against `Host`, which is why Clavia's Caddy forwards `Host`
  unchanged.
- **The callback rebuilds its URL from `DASHBOARD_URL`**, never from the forwarded request line.
- **Cookies** are `HttpOnly`, `Secure`, `SameSite=Lax`, scoped to `/dashboard` (the sign-in state
  to `/dashboard/auth`).
- **Never log a token, a handle or a session record.**

## Testing

- **Unit tests** (`test/`, Vitest): the core's rules against in-memory fakes
  (`test/support/fakes.ts`: `FrozenClock`, `InMemorySessionStore`, `FakeIdentityProvider`…);
  `ClaviaIdentityProvider` against a fake Clavia that signs real tokens
  (`test/support/fake-clavia.ts`); `ClaviaManagementApi` against recorded responses; both session
  stores against one shared contract (`test/support/session-store-contract.ts`).
- **Smoke tests** (`e2e/`, Playwright): sign in through Clavia's real login page, open every
  section, use the command menu, hit a 404, sign out. Run against a live stack (`make up && make
seed` in Clavia, then `npm run dev`).
- `server-only` is aliased to a no-op in Vitest (`test/support/server-only.ts`).

## Recipes

- **A section**: a folder under `src/app/(console)/` (`page.tsx`, `loading.tsx`, `actions.ts`),
  an entry in `components/shell/navigation.ts` with the scope it needs, an e2e case in
  `e2e/console.spec.ts`.
- **A detail page**: `[id]/data.ts` (a cached `find()` of the resource), `[id]/layout.tsx` with
  `SectionTabs`, one page per tab.
- **A mutation**: a zod schema, an action through `perform()`, `refresh()`, a form using
  `useActionState` and `useActionFeedback()`.
- **A new Management API operation**: copy Clavia's document, `npm run contract`, add the method
  to the `ManagementApi` port and to `ClaviaManagementApi`, with a test.
- **A setting**: a field in `server/config.ts`'s zod schema and a documented line in
  `.env.example`.
- **A shadcn component**: `npx shadcn add <name>`, then use it from `components/app`.

## Definition of done

1. `npm run check` is green, and `npm run build` succeeds.
2. Rules in `core` and every adapter have unit tests; a new section has a smoke test.
3. The page works in light and dark mode, at phone width, by keyboard, with no browser errors.
4. What the operator cannot do is hidden or explained, never offered just to fail.
5. `docs/architecture.md` and this file are updated when a rule or the design changes.

## Decisions and known pitfalls

- **Cache Components and partial prerendering are off**: a nonce per request needs dynamic
  rendering, and every page is personal and live anyway. Smoothness comes from streaming and
  skeletons instead.
- **`proxy.ts`** is Next 16's name for middleware.
- **`basePath: "/dashboard"`**: links and `redirect()` take paths without it; cookies and
  external URLs include it. `typedRoutes` is on, so a path built at runtime needs `as Route`.
- **A Server Component cannot import a value from a `"use client"` module**: shared constants go
  in a plain module (as `components/audit/describe.ts` does).
- **A dialog opened from a dropdown item** is rendered outside the menu and controlled (see
  `ConfirmAction`), or it unmounts when the menu closes.
- **shadcn's sidebar sizes every icon in a menu button to 1rem**: a larger icon overrides it on the
  button (`[&_svg]:size-8`), as the brand does.
- **A slow DNS lookup looks like a timeout**: Node resolves names in a pool of four threads, so on
  macOS a `.local` Clavia domain (resolved through Bonjour) makes parallel API calls time out.
  Use `.test`.
- **The development stack** is Clavia's: `make up && make seed` there prints this dashboard's
  settings, and its Caddy forwards `/dashboard` to port 3000.
