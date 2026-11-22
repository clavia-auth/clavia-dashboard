# Changelog

All notable changes to Clavia Dashboard are written here, for the people who run it. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the dashboard follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html), at the same version as
[Clavia](https://github.com/clavia-auth/clavia).

## [Unreleased]

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

[Unreleased]: https://github.com/clavia-auth/clavia-dashboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/v0.1.0
