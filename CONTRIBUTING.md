# Contributing

Thank you for helping. This guide says how work is planned, how to propose a change, and what
a change must meet to be merged.

## How work is planned

Everything is tracked on the [Clavia project board](https://github.com/orgs/clavia-auth/projects),
shared by [clavia](https://github.com/clavia-auth/clavia) and
[clavia-dashboard](https://github.com/clavia-auth/clavia-dashboard).

- **Issues** describe one need each. The issue type says what kind (Feature, Bug, Task,
  Security), `area: …` labels say where, and the board adds priority (P0–P3) and size (XS–XL).
- **Milestones** are versions (`0.1 First release`, `0.2 Passkeys`, …), with the same names in
  both repositories, so a release can span them.
- **Large features** get a design first, in `docs/design/` of the clavia repository, and an
  issue labelled `needs-design`. Once the design is agreed, it is cut into issues small enough
  for one pull request each.
- Statuses move **Backlog → Ready → In progress → In review → Done**. An issue is Ready when
  its "Done when" is clear.

## Proposing a change

1. Find or open the issue. For anything beyond a small fix, say in it how you intend to solve it
   before writing much code.
2. Branch from `main`: `feature/<issue>-<slug>`, `fix/<issue>-<slug>`.
3. Open a pull request that says `Fixes #<issue>`, and fill in the checklist.
4. `main` is protected: a pull request, green checks, no force-push.

## Setting up

Node 22.12 or later, `npm ci`, a running Clavia (see its README), then `npm run dev`.

## What a change must meet

- `npm run check` (Prettier, ESLint, TypeScript, Vitest); `npm run build` must pass too is green.
- The behaviour is covered by tests.
- The dashboard knows Clavia only through its OpenAPI document and discovery. A contract
  change is copied from Clavia and the types regenerated with `npm run contract`.
- Tokens stay on the server: the browser never holds an access or refresh token.
- Read `CLAUDE.md` and `AGENTS.md` before a change: they hold the rules.

## Asking Claude

Anyone with write access can mention `@claude` in an issue or a pull request to get an answer,
a review, or an implementation on a branch. Claude follows `CLAUDE.md`, and its pull requests
are reviewed like anyone else's.

## Security

Never report a vulnerability in a public issue: see [SECURITY.md](SECURITY.md).

## Licence

By contributing, you agree that your contribution is licensed under the BSD 3-Clause licence
of this repository.
