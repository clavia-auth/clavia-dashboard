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
- **Ready holds up to five issues**, refilled from Backlog by the Board workflow in priority
  order (milestone, priority, type, size), never with an issue that `needs-design` or depends
  on an open one. **At most two are In progress** at a time; In review is the maintainer's
  queue and does not count. The board shows both limits.

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

## Working with Claude

Claude does most of the implementation; the maintainer reviews and merges. Claude never merges,
approves, or pushes to `main`. The steps are skills in `.claude/skills/`, which Claude Code loads
in this repository:

| Skill            | Use it to                                                | Ask for example                |
| ---------------- | -------------------------------------------------------- | ------------------------------ |
| `ticket-pick`    | choose the next issue                                    | "What should we work on next?" |
| `ticket-work`    | take an issue to a pull request awaiting review          | "Work on #12"                  |
| `ticket-review`  | answer a review and push the fixes                       | "Address the review on #30"    |
| `ticket-triage`  | classify issues; cut large work into sub-issues          | "Triage the new issues"        |
| `ticket-design`  | write the design a `needs-design` issue requires         | "Design #10"                   |
| `ticket-release` | prepare and, on the maintainer's go, publish a milestone | "Release 0.1"                  |

Claude picks the skill from the request; `/ticket-work 12` names one explicitly.

- **In Claude Code** (your machine, or a Claude session with the repositories attached), the
  skills work fully. `.claude/scripts/board.sh` sets Status, Priority and Size on the board
  when `gh` has the `project` scope (`gh auth refresh -s project`).
- **On GitHub**, anyone with write access can mention `@claude` in an issue, a pull request or a
  review ("@claude work on this issue"). That run cannot change board fields, so the board's own
  automations move the card when the pull request is opened and merged. It runs `npm ci` and
  `npm run check` there, and relies on the CI checks of its pull request for the build.
- A pull request opened through the maintainer's own login is already theirs: GitHub cannot
  request their review on it. Pull requests opened from `@claude` come from Claude's app and do
  request it.

Claude's pull requests are reviewed like anyone else's.

## Security

Never report a vulnerability in a public issue: see [SECURITY.md](SECURITY.md).

## Licence

By contributing, you agree that your contribution is licensed under the BSD 3-Clause licence
of this repository.
