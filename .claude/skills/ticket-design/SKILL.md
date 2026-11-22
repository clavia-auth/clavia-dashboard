---
name: ticket-design
description: Write the design document a needs-design Clavia Dashboard issue requires, open it for the maintainer's review, and once agreed cut it into tickets. Use for issues labelled needs-design, or when asked to design a feature before building it.
---

# Design a feature

A large or security-relevant change is agreed on paper before code is written. Designs live in
clavia's `docs/design/` when the server is involved, otherwise `docs/design/` of this repository.

## 1. Learn the ground

Read the issue, `CLAUDE.md` (architecture, flows, security invariants), the specifications the
feature follows (cite sections), and the existing designs as models of form:
clavia's `docs/design/self-service-accounts.md` and `docs/design/passkeys.md`.

## 2. Write `docs/design/<slug>.md`

```markdown
# Design: <feature>

**Status:** proposed · **Date:** <today> · **Issue:** clavia-auth/<repo>#<n>

## 1. Summary — what and why, goals, not in scope

## 2. Decisions — a table: topic | decision | why (the alternatives rejected)

## 3. Settings — new CLAVIA_* settings, defaults, ranges

## 4. Model — aggregates, value objects, ports, events, migrations

## 5. Flows — step by step, with every refusal

## 6. Interfaces — endpoints, pages, Management API contract changes, dashboard impact

## 7. Security rules — what must never happen, and how the design prevents it

## 8. Tests — what proves it

## 9. Slices — pull request-sized steps, in order, each with its Done when
```

Questions only the maintainer can settle go in a short **Open questions** section at the end,
each with a recommendation.

## 3. Review

Branch `design/<n>-<slug>`, one commit, a pull request titled `Design: <feature>` with
`Part of #<n>` (not `Fixes`: the issue stays open until the feature ships), review requested from
the maintainer, as in **ticket-work** steps 5–7. Answer the review with **ticket-review**.

## 4. After the merge

Set the document's status to **agreed** in the first slice's pull request, then cut the Slices
into tickets with **ticket-triage**, and remove `needs-design` from the issue. When the last slice
merges, the status becomes **built**.
