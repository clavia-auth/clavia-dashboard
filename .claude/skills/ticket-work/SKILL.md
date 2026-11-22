---
name: ticket-work
description: Take one Clavia Dashboard issue from Ready to a pull request awaiting the maintainer's review — branch, implement, test, commit, push, open the pull request, request review. Use when asked to work on, implement, fix or take an issue or ticket (e.g. "work on #12").
---

# Work a ticket

Roles: **Claude does the work, the maintainer reviews and merges.** Claude never merges,
approves, pushes to `main`, closes an issue by hand, or rewrites history someone has reviewed.
`main` is protected: every change reaches it through a pull request with green checks.

## 1. Understand

- Read the issue, its comments, its parent and sub-issues, and every design it links
  (`docs/design/`). Read `CLAUDE.md` for the rules the change must keep.
- The issue's **Done when** is the scope. If it is missing or ambiguous, or the work needs a
  decision that is the maintainer's (a protocol choice, a security trade-off, a new dependency,
  a schema change not in a design), ask in the conversation or in an issue comment, and wait.
- Found more work than the issue covers? Open a new issue (**ticket-triage**); never widen the
  scope silently.

## 2. Start

```bash
git fetch origin main && git switch -c <branch> origin/main
.claude/scripts/board.sh status <issue html_url> "In progress"   # exit 3: carry on
```

Branch: `feature/<n>-<slug>` (Feature), `fix/<n>-<slug>` (Bug, Security), `chore/<n>-<slug>`
(Task), `design/<n>-<slug>` (a design document). The slug is three to five words of the title.

## 3. Build

- Follow `CLAUDE.md`: its recipes for the kind of change, its conventions, its definition of done.
- Tests come with the change; a bug fix starts with the test that fails without it.
- Files the maintainer owns (`.env` and `.env.local` (never read them back), and the `AGENTS.md` block `next dev` writes) may change only when the issue asks; say so in the pull
  request.

## 4. Check

Run `npm run check` and `npm run build` until it is green. Never weaken a test, a rule or a check to make it pass.

## 5. Commit and push

- Small, coherent commits. Subject in the imperative, at most 72 characters; a body that says
  why. End each message with the attribution trailer the session asks for.
- `git push -u origin <branch>`.

## 6. Open the pull request

- **Title**: the issue's title, or what the change does.
- **Body**: the repository's template (`.github/pull_request_template.md`). Say what and why,
  then `Fixes #<n>` (another repository: `Fixes clavia-auth/<repo>#<n>`; a design or one slice of
  a larger issue: `Part of #<n>`). Tick only what is true, and explain any box left unticked.
- A page change has a screenshot in light and dark mode in the pull request, and works at phone width and by keyboard.
- How to try it, and anything the reviewer should look at first.

```bash
gh pr create --base main --head <branch> --title "…" --body-file <file>
# where gh pr create is unavailable (a REST-only sandbox):
gh api repos/clavia-auth/clavia-dashboard/pulls -f title="…" -f head=<branch> -f base=main -F body=@<file>
gh api repos/clavia-auth/clavia-dashboard/pulls/<pr>/requested_reviewers -f "reviewers[]=jguittard"   # skip when the pull request is opened as jguittard: GitHub refuses (422)
```

Where Claude works through the maintainer's own login (their machine, this kind of session), the
pull request is theirs and no review can be requested: it already sits in their queue. From the
`@claude` workflow it is opened by Claude's app, and the request goes through.

Linking the issue moves it to **In review** on the board (a board workflow); merging moves it to
Done and closes it.

## 7. Watch the checks

```bash
gh pr checks <pr> --watch
# REST: gh api repos/clavia-auth/clavia-dashboard/commits/<sha>/check-runs --jq '.check_runs[] | "\(.name) \(.conclusion)"'
```

A red check is Claude's to fix before handing over. Then report in one or two lines: the pull
request, what changed, and what to look at. Review feedback goes through **ticket-review**.
