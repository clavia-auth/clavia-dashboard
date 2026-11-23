# Changelog

All notable changes to Clavia Dashboard are written here, for the people who run it. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the dashboard follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html), at the same version as
[Clavia](https://github.com/clavia-auth/clavia).

## [Unreleased]

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

[Unreleased]: https://github.com/clavia-auth/clavia-dashboard/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.3.0
[0.2.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.2.0
[0.1.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.1.0
