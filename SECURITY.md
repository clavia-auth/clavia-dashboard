# Security policy

The dashboard administers a Clavia server, so a flaw in it can reach every account. Thank you
for taking the time to report a problem responsibly.

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request.** Report it privately through
[GitHub's private vulnerability reporting](https://github.com/clavia-auth/clavia-dashboard/security/advisories/new).

Please include what you found, the steps or a proof of concept, the version or commit, and the
impact as you understand it. A problem in the server's protocol handling belongs to
`clavia`; one in the console to `clavia-dashboard`; if unsure, report it to either.

## What to expect

- An acknowledgement within three working days.
- An assessment, and a plan or a reasoned answer, within ten working days.
- A fix released, and an advisory published crediting you unless you ask otherwise, as soon as
  it is ready. Please keep the details private until then.

## Supported versions

Before 1.0, only the latest release and `main` receive security fixes.

## Scope

In scope: anything that breaks the specifications Clavia follows (OAuth 2.1, OpenID Connect and
their RFCs) in a way that matters, or the security invariants in `CLAUDE.md`. Out of scope:
findings that need an already-compromised host or administrator account, missing hardening
headers with no exploit, and denial of service by volume.
