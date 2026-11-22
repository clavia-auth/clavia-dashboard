---
name: ticket-pick
description: Choose the next ticket to work on in Clavia Dashboard. Use when asked what to work on next, to pick a ticket, or to start on the backlog without an issue number.
---

# Pick the next ticket

The backlog is the [Clavia board](https://github.com/orgs/clavia-auth/projects/1), shared with
clavia. This skill picks from **this repository** (clavia-dashboard); say when a ticket in clavia would
come first.

## 0. Respect the WIP limit

At most **two** issues are In progress at a time, across both repositories. In review does not
count: it is the maintainer's queue. Count first:

```bash
.claude/scripts/board.sh show | grep -c '^In progress'
```

Where the board cannot be reached (`board.sh` exits 3), count work in progress instead: branches
of the ticket form in both repositories that have no open pull request yet.

```bash
for r in clavia clavia-dashboard; do
  open=$(gh api "repos/clavia-auth/$r/pulls?state=open&per_page=100" --jq '[.[].head.ref]')
  gh api "repos/clavia-auth/$r/branches?per_page=100" | jq -r --argjson open "$open" \
    '.[].name | select(test("^(feature|fix|chore|design)/")) | select(. as $b | $open | index($b) | not)'
done
```

At two, start nothing new: say so, and offer to finish one of them instead (its checks, its
review).

## 1. Gather

```bash
gh api "repos/clavia-auth/clavia-dashboard/issues?state=open&per_page=100" \
  --jq '.[] | select(.pull_request | not) | [.number, (.type.name // "-"), (.milestone.title // "-"),
        ([.labels[].name] | join(",")), (.assignee.login // "-"), .title] | @tsv'
gh api "repos/clavia-auth/clavia-dashboard/pulls?state=open&per_page=100" --jq '.[] | "\(.number) \(.title) | \(.body // "")"'
.claude/scripts/board.sh show     # Status, Priority, Size; exits 3 where the board is unreachable
```

## 2. Keep only what can start

Leave out an issue that:

- is labelled `needs-design`: it goes through the **ticket-design** skill first; offer that instead;
- already has an open pull request that names it (`Fixes #N`, `Part of #N`);
- is assigned to someone, or says it depends on an issue that is still open;
- is in Done or In review on the board.

Prefer **Ready** items. The Board workflow keeps up to five there, moving them up from Backlog in
the order below; the maintainer can move others. If Ready is empty, nothing in Backlog could
start (it needs triage or a design): say so and offer **ticket-triage**, rather than picking from
Backlog.

## 3. Order

1. The earliest open milestone (0.1 before 0.2…); no milestone comes last.
2. Priority, P0 first (from the board; without it, keep the milestone order).
3. Security and Bug before Feature and Task.
4. Smaller size first, then the lowest number.

## 4. Propose

Give the first choice and two alternatives, one line each on why. If the maintainer is in the
conversation, wait for their choice. If nobody is (a scheduled run, an `@claude` mention asking to
"take the next ticket"), take the first choice and say so at the top of the work.

Then continue with the **ticket-work** skill.
