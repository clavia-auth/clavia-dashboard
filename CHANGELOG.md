# Changelog

All notable changes to Clavia Dashboard are written here, for the people who run it. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the dashboard follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html), at the same version as
[Clavia](https://github.com/clavia-auth/clavia).

## [Unreleased]

## [0.5.1] - 2026-11-27

A fix to signing in, for the console of Clavia 0.5.1. Nothing needs doing on upgrade: no new setting, no
new scope, and it runs against Clavia 0.5.0 as well.

### Fixed

- **Signing in when Clavia cannot be reached** no longer answers an empty error page (#81). The browser
  lands on the signed-out page, which says Clavia cannot be reached, and the server's log names Clavia's
  host and why the connection failed: a refused connection, a name that does not resolve, a certificate
  Node does not trust (in development, `NODE_EXTRA_CA_CERTS` not set), or a timeout. The same holds at
  the callback, where a failed discovery or userinfo request also ended in an empty error.

## [0.5.0] - 2026-11-27

Branding, for the console of Clavia 0.5.0: an application's colour and logo on its sign-in pages, set from
its page.

### Added

- **Branding per application.** A Branding tab on an application that signs people in sets its accent
  colour (a picker and a hex field) and its logo (PNG, JPEG or WebP, at most 256 KiB), with a preview
  of the sign-in card wearing them; removing either gives the pages Clavia's back. For Clavia 0.5's
  branding (clavia-auth/clavia#25). Without `update:clients` the tab is read only.
- **A `:edge` container image.** `ghcr.io/clavia-auth/clavia-dashboard:edge` is the dashboard as `main` has it,
  rebuilt after its checks pass, for those who try their own changes against it (clavia's end-to-end suite
  does). It is not a release: run a version.

### Changed

- **Branding needs Clavia 0.5.0 or later**, which adds the logo operations and an application's accent
  colour: run its migrations first. The Branding tab is the only part of the dashboard that does; the rest
  runs against 0.4. No new scope and no new setting.

### Fixed

- After signing out, "Sign in" on the signed-out page could end on "That sign-in has expired" instead of
  Clavia's login page: the button ran the sign-in twice, each run storing a new attempt, and the browser
  could keep the cookie of the one Clavia was not sent. It runs once now.

## [0.4.0] - 2026-11-25

Integrations, for the console of Clavia 0.4.0: webhooks, SAML connections, SCIM provisioning,
custom claims and application metadata, with the audit log exported and the week's sign-ins charted.

### Added

- **Sign-in activity on the overview.** A chart of the last seven days' sign-ins and refused
  sign-ins, by day (UTC), in light and dark, with the numbers on the bars and in a table for screen
  readers. Drawn without a chart library, from the audit log's counts, and shown to those who may
  read it (`read:audit_events`).
- **Export the audit log as CSV.** The audit log's "Export CSV" button downloads every event matching
  the filters on screen, not just the page shown. The file is streamed from Clavia page by page, so a
  long log never sits in memory, and it stops at the moment the export began. Values a spreadsheet
  would read as a formula are neutralised. Needs `read:audit_events`, as the page does.
- **SAML connections.** Create a connection to a SAML identity provider from its metadata URL or an
  uploaded document, choosing which attribute names the person, which carries the address (and
  whether the provider verifies it), and the profile attributes, starting from a preset for Microsoft
  Entra ID, Okta, ADFS or Google Workspace. Signing requests, requiring encryption and requiring
  AES-GCM are options; the ADFS preset turns the GCM requirement off, since ADFS encrypts with CBC by
  default. The connection's page gives what the identity provider's administrator needs (entity ID,
  ACS URL, metadata URL, each with a copy button), shows the provider's certificates with their
  fingerprints and expiry, and refreshes the metadata when the provider rolls a certificate over. A
  SAML connection's options are fixed when it is registered, as Clavia has no way to change them.
- **SAML keys, beside the signing keys.** This server's keys as a SAML service provider, by
  certificate: what each is for, its place in the rotation (current, next, retired) and when the
  certificate expires, with a button for the next step of the rotation. Needs Clavia 0.4.0 or later.
- **Provisioning, on the connection page.** For a password pool, an OpenID Connect or a SAML
  connection: issue the token a directory (Entra ID, Okta) provisions its accounts with, and see
  the token and the SCIM base URL once, with copy buttons. Choose when it expires, which attribute
  names a person (`externalId` for Entra ID, `userName` for Okta), whether the addresses it sends are
  trusted and whether a delete deactivates. A token is flagged thirty days before it expires, and
  revoking one stops the directory at once. An enterprise connection can require provisioning, so only
  the people the directory sent can sign in. Roles have a switch for whether a directory's group may
  grant them, unavailable for a role holding a Management API permission. Needs Clavia 0.4.0 or later
  and the `*:provisioning_tokens` scopes.
- **A Webhooks section.** Register the addresses that receive Clavia's audit events, signed as
  Standard Webhooks: add one (its secret is shown once, with a copy button), change its URL, events
  and description, switch it on or off, rotate its secret (the old one still signs for 24 hours),
  send it a test and read its delivery log, with why each failed. The event picker offers the
  configuration and security events first, and says `token.issued` is most of the volume. Needs
  Clavia 0.4.0 or later and the `*:webhooks` scopes; registering, changing the URL or events,
  testing and the delivery log also need `read:audit_events`, and the page says so where it is missing.
- **Application metadata, on the user page.** A JSON editor for the facts operators keep about an
  account (a tenant, a plan, a department), which claim mappings copy into tokens. Saving replaces
  it whole, and Clavia's refusals (too large, too deep, a bad key) are shown with the key they name.
  Writing it takes `update:users_app_metadata` beside `update:users`: without it the editor is
  read-only and says which scope is missing.
- **Custom claims, on APIs and applications.** A Claims tab lists what an API's access tokens, or
  an application's ID tokens and userinfo answers, carry about the person: an email, a profile
  field, a path in the application metadata, their roles, or a fixed value, and for an application
  where each goes. Each refusal from Clavia appears on the row it names. A preview shows the claims
  one person would get from the rows as they stand, before they are saved. The tab is absent where
  Clavia refuses claims: the Management API, and third-party applications.
- **An Endpoints section**, open to every operator: the addresses an application or an API needs to
  work with Clavia, each with its host and a copy button, and the specification that defines it,
  linked to the RFC Editor or openid.net. It lists the issuer and its OpenID configuration, the
  endpoints Clavia's discovery document names (authorization, token, userinfo, JWKS, end session,
  revocation, introspection, registration and the others it offers), the Management API's base
  address, this dashboard's redirect, back-channel logout and post-logout addresses, and what
  Clavia says it supports (scopes, grant types, PKCE methods, signing algorithms). If discovery
  cannot be read, the page says so and lists what the dashboard's settings give.

### Changed

- **Needs Clavia 0.4.0 or later**, which adds the endpoints behind everything above. Run its
  migrations and seed its permissions first: the dashboard asks for every management scope when an
  operator signs in, and Clavia refuses a sign-in that names a scope it does not have (the dashboard
  then shows "provider error").
- **New scopes.** `update:users_app_metadata` (application metadata), `read:webhooks`,
  `create:webhooks`, `update:webhooks` and `delete:webhooks`, and `read:provisioning_tokens`,
  `create:provisioning_tokens` and `delete:provisioning_tokens`. The SAML keys use the signing keys'
  scopes. A role must grant a scope for an operator to use what needs it, and a session opened before
  it was granted has to sign in again to carry it. Nothing else to set up.

## [0.3.0] - 2026-11-23

Tokens and policies, for the console of Clavia 0.3.0: MFA policies and the step-up challenge,
signing keys, DPoP, and initial access tokens for clients that register themselves.

### Added

- **MFA policies.** Applications and APIs have a "Require a second factor" switch, which makes
  signing in through that application, or being issued a token for that API, take more than one
  factor. The Management API is among the APIs: switching it on makes every administrator sign in
  with a second factor. Someone signed in with one is asked for another without typing their
  password again; someone with none sets one up on the way, if their address is verified. It
  applies from the next sign-in.
- **The step-up challenge.** When the Management API refuses a token because the sign-in behind it
  used one factor (RFC 9470), the dashboard sends the operator to sign in again with the level it
  asks for, and back to the page they were on. A session under a minute old is not sent round
  again: the refusal is shown, so a step-up that does not help cannot loop.
- **A Signing keys section**, for operators holding `read:signing_keys`: the active key and the
  retired ones, with their key id, algorithm, state and dates, including when each leaves the
  published key set. An operator holding `create:signing_keys` can rotate the active key, after a
  confirmation that explains the grace period. Where Clavia keeps its keys at another provider,
  the page says so and offers no rotation.
- **Require DPoP of an application.** A switch on the application settings makes every token the
  application is issued bound to a key it holds (RFC 9449), and says what that asks of the
  application. The dashboard's own application cannot be switched: it sends no DPoP proofs, so
  requiring them would lock every operator out.
- **An Initial access tokens section**, for operators holding `read:initial_access_tokens`: the
  tokens that let software register itself as an application (RFC 7591), with their state (active,
  used up, expired, revoked), uses and expiry, searchable by description. An operator holding
  `create:initial_access_tokens` can issue one (a description, a number of registrations, a
  duration), and its value is shown once. With `delete:initial_access_tokens` they can revoke an
  active one, after a confirmation.
- **A self-registered application says so** on its settings page: when it registered and with which
  initial access token.
- **The audit log names the new events**: `session.stepped_up`, `initial_access_token.issued` and
  `initial_access_token.revoked`, and the initial access token as a target.

### Changed

- Needs Clavia 0.3.0 or later: these pages read Clavia's new fields and endpoints of the Management
  API. There is no new setting and no migration.
- **Three groups of scopes are new**: `read:signing_keys` and `create:signing_keys`, and
  `read:initial_access_tokens`, `create:initial_access_tokens` and `delete:initial_access_tokens`.
  The dashboard asks for every scope at sign-in, but an operator's role must grant them, and a
  session opened before upgrading does not carry them: they sign in again.
- Registration must also be switched on in Clavia (`CLAVIA_CLIENT_REGISTRATION=token`) for an
  initial access token to register anything; the page says so.

### Fixed

- In development, a refused sign-in showed an error page instead of the signed-out page after the
  server had reloaded a module.

## [0.2.0] - 2026-11-23

Passkeys, for the console of Clavia 0.2.0 (`docs/design/passkeys.md`, phases 1 and 2).

### Added

- **A Passkeys tab on every user**: what the account has registered (its name, whether a credential
  manager syncs it or it stays on one device, when it was added and when it was last used). An
  operator holding `update:users` can remove one, after a confirmation: for somebody who lost the
  device it lived on. The dashboard never sees a credential id or key, and removing a passkey does
  not touch the authenticator app or the recovery codes (they are turned off from the account
  menu).
- **The audit log names the passkey events**: `passkey.registered`, `passkey.renamed` and
  `passkey.removed`, so a removal shows in the log and in the user's activity, and
  `passkey.counter_regressed`, shown as a danger since a counter that goes back can mean a cloned
  authenticator.

### Changed

- Needs Clavia 0.2.0 or later: the tab reads Clavia's new passkey endpoints of the Management API,
  which are in no earlier version. No new scope, and no new setting.

## [0.1.0] - 2026-11-22

The first release: the administration console of Clavia 0.1.0. Operators sign in through Clavia and
manage it through its Management API, from a Next.js application that keeps every token on the
server.

### Added

**Signing in**

- Sign-in through Clavia as a confidential OAuth client (authorization code with PKCE, a state and
  a nonce, ID token checked), and sign-out that ends the Clavia session too.
- Back-channel logout: when Clavia ends a session, the dashboard ends the sessions it names.
- Sessions held on the server and sealed in Redis (AES-256-GCM); the browser holds only an opaque
  `HttpOnly` cookie. An access token is refreshed a minute before it expires, and a session lasts
  eight hours at most and one hour unused.
- A Content-Security-Policy with a fresh nonce on every request.

**The console**

- Users: search, create, edit the profile, set a password, deactivate and reactivate, turn
  two-factor off, delete; their roles, sessions, applications they allowed, linked identities and
  activity.
- **Send a password link** on a user: an invitation for an account with no password yet, a reset for
  one that has one, with the answer saying which mail went out. It needs `create:user_tickets`, and
  says so when the send limit is reached or the deployment sends no mail.
- Applications, APIs, roles with their permissions and holders, and connections, each listed,
  created, edited and deleted; a secret is shown once.
- Connections: the sign-up and verified-address switches, and audit labels for the self-service
  events.
- The audit log, filtered by event type, outcome, actor, application and date, with the details of
  each event.
- What an operator sees follows the scopes of their roles: a section they cannot read is not in the
  navigation, and an action they cannot take is hidden or explained.
- A command menu (`Ctrl/⌘ K`), light, dark and system themes, and loading states that stream rather
  than block.

**Running it**

- A container image, `ghcr.io/clavia-auth/clavia-dashboard`, published with each release.
- Settings, all read from the environment when the first request arrives: `DASHBOARD_URL`,
  `DASHBOARD_SESSION_SECRET`, `DASHBOARD_REDIS_URL`, `DASHBOARD_SESSION_LIFETIME` and
  `DASHBOARD_SESSION_IDLE_TIMEOUT`, plus the client credentials `make seed` prints in Clavia
  (`.env.example` lists them all).

### Not included

- Passkeys, signing keys and sign-in charts, which come with the next versions (0.2 to 0.4).
- Exporting the audit log.

[Unreleased]: https://github.com/clavia-auth/clavia-dashboard/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.5.1
[0.5.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.5.0
[0.4.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.4.0
[0.3.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.3.0
[0.2.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.2.0
[0.1.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.1.0
