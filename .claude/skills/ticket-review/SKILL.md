---
name: ticket-review
description: Answer the maintainer's review on a Clavia Dashboard pull request — fix what was asked, answer questions, push, and request review again. Use when a pull request has review comments or changes requested, or when asked to address a review.
---

# Address a review

The maintainer reviews; Claude answers every comment and makes the changes. Claude never merges,
approves, or resolves a thread the reviewer opened: resolving is the reviewer's call.

## 1. Read everything

```bash
gh api repos/clavia-auth/clavia-dashboard/pulls/<pr>/reviews    --jq '.[] | "\(.state) \(.user.login): \(.body)"'
gh api repos/clavia-auth/clavia-dashboard/pulls/<pr>/comments   --jq '.[] | "\(.id) \(.path):\(.line) \(.body)"'
gh api repos/clavia-auth/clavia-dashboard/issues/<pr>/comments  --jq '.[] | "\(.user.login): \(.body)"'
```

## 2. Decide, comment by comment

- **A change asked for**: make it.
- **A question**: answer it; change the code too if the question shows it was unclear.
- **A disagreement**: if the request would break a rule in `CLAUDE.md`, a specification or a
  test that matters, say why with the reference, and leave the decision to the maintainer.
  Never comply silently against a security invariant, and never argue for its own sake.
- **Out of scope**: offer a follow-up issue (**ticket-triage**) instead of growing this one.

## 3. Push the changes

- New commits on the same branch; no force-push while the review is open.
- `npm run check` and `npm run build` green before pushing.

## 4. Answer and hand back

```bash
# a reply in an inline thread
gh api repos/clavia-auth/clavia-dashboard/pulls/<pr>/comments/<comment-id>/replies -f body="Done in <sha>: …"
# then ask for review again
gh api repos/clavia-auth/clavia-dashboard/pulls/<pr>/requested_reviewers -f "reviewers[]=jguittard"
```

Each reply says what changed and in which commit, or why not. When the pull request is approved
and green, tell the maintainer it is ready to merge; merging is theirs.
