---
name: ticket-triage
description: Classify Clavia Dashboard issues for the backlog (type, area, milestone, priority, size, needs-design) and cut a large issue or an agreed design into tickets. Use for new or untriaged issues, when asked to triage, or to split work into tickets.
---

# Triage

Every open issue carries an **issue type**, at least one `area:` label, a **milestone** (or
deliberately none, for "later"), and on the board a **Priority** and a **Size**. Triage fills in
what is missing; the maintainer can change any of it.

## Find what needs it

```bash
gh api "repos/clavia-auth/clavia-dashboard/issues?state=open&per_page=100" --jq '.[]
  | select(.pull_request | not)
  | select(.type == null or .milestone == null or ([.labels[].name | select(startswith("area: "))] | length == 0))
  | "\(.number) \(.title)"'
```

## Classify one issue

| What         | Values                                                                                        | How                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Type         | Feature, Bug, Task, Security                                                                  | `gh api -X PATCH repos/clavia-auth/clavia-dashboard/issues/<n> -f type=Feature`                                                                |
| Area         | `area: oauth`, `area: sign-in`, `area: management-api`, `area: dashboard`, `area: operations` | `gh api repos/clavia-auth/clavia-dashboard/issues/<n>/labels -f "labels[]=area: oauth"`                                                        |
| Milestone    | `0.1 First release` … `0.5 Operations & experience`                                           | `gh api -X PATCH repos/clavia-auth/clavia-dashboard/issues/<n> -F milestone=<number>` (`gh api repos/clavia-auth/clavia-dashboard/milestones`) |
| Priority     | P0 (drop everything), P1 (this milestone), P2 (soon), P3 (someday)                            | `.claude/scripts/board.sh set <url> Priority P1`                                                                                               |
| Size         | XS (an hour), S (a day), M (a few days), L (a week), XL (split it)                            | `.claude/scripts/board.sh set <url> Size M`                                                                                                    |
| Area (board) | OAuth/OIDC, Sign-in, Management API, Dashboard, Operations                                    | `.claude/scripts/board.sh set <url> Area Sign-in`                                                                                              |

- `needs-design` when the change adds or alters a protocol behaviour, a security rule, the
  schema beyond one table, or is L/XL: it then goes through **ticket-design**.
- An issue that cannot start before another says so on a line of its body: `Depends on #N`, or
  `Depends on clavia-auth/<repo>#N` across repositories. The Board workflow and **ticket-pick**
  skip it until N is closed.
- `good first issue` when it is XS or S, self-contained, and the issue says where to start.
- A **Bug**: reproduce it first where possible; if information is missing, ask in a comment.
- A vulnerability reported in a public issue: do not discuss the details. Ask the reporter to use
  private reporting (`SECURITY.md`), and tell the maintainer at once.
- Everything Claude cannot set (the board unreachable: `board.sh` exits 3), say in the report so
  the maintainer can set it.

## Cut work into tickets

For an XL issue, or a design once merged (its "Slices" or phases):

1. One issue per pull request-sized slice, in the repository the code lives in, each with a
   problem, a **Done when** list and `Part of #<parent>`, typed and labelled as above.
2. Attach each as a sub-issue of the parent (sub-issues join the board on their own):
   `gh api repos/clavia-auth/clavia-dashboard/issues/<parent>/sub_issues -F sub_issue_id=<child id>`
   (the child's numeric `id`, not its number; a child in another repository works too).
3. Remove `needs-design` from the parent; the parent closes when its last slice merges.

End with a short report: what was classified, what was created, what is left to the maintainer.
