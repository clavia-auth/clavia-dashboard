---
name: ticket-pick
description: Choose the next ticket to work on in Clavia Dashboard. Use when asked what to work on next, to pick a ticket, or to start on the backlog without an issue number.
---

# Pick the next ticket

The backlog is the [Clavia board](https://github.com/orgs/clavia-auth/projects/1), shared with
clavia. This skill picks from **this repository** (clavia-dashboard); say when a ticket in clavia would
come first.

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

Prefer **Ready** items. If none is Ready, take from Backlog and say so: the maintainer moves items
to Ready, so a Backlog pick is a suggestion, not a given.

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
