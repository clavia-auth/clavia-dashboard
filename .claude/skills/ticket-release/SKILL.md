---
name: ticket-release
description: Prepare a Clavia Dashboard release when a milestone is complete — check the milestone, write the changelog, bump the version, open the release pull request, and after the maintainer's go, tag and publish. Use when asked to release, cut a version or close a milestone.
---

# Release a milestone

Milestones are versions with the same name in clavia and clavia-dashboard; both repositories are
released together, at the same version number.

## 1. Is it complete?

```bash
for r in clavia clavia-dashboard; do
  gh api "repos/clavia-auth/$r/milestones?state=open" --jq '.[] | "\(.number) \(.title) open=\(.open_issues)"'
done
```

Every issue of the milestone is closed in both repositories, or the maintainer agrees to move it to
the next milestone. Unfinished work is moved, never released half-done.

## 2. Prepare

- `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) form: a section
  `## [X.Y.Z] - <date>` with Added, Changed, Fixed, Security, built from the merged pull requests of
  the milestone (`gh api "repos/clavia-auth/clavia-dashboard/pulls?state=closed&per_page=100"`), written for
  operators, not as a commit list. Settings and migrations get their own lines.
- Bump `version` in `package.json` (and `package-lock.json` with `npm version --no-git-tag-version`).
- Branch `chore/release-X.Y.Z`, pull request `Release X.Y.Z` with `Part of` the release issue,
  review requested, as in **ticket-work**.

## 3. Publish, only after the maintainer merges and says go

Tagging and publishing are public and hard to take back, so they wait for an explicit go.

```bash
git fetch origin main && git tag -a vX.Y.Z -m "X.Y.Z" origin/main && git push origin vX.Y.Z
gh api repos/clavia-auth/clavia-dashboard/releases -f tag_name=vX.Y.Z -f name="X.Y.Z" -F body=@<notes>
gh api -X PATCH repos/clavia-auth/clavia-dashboard/milestones/<number> -f state=closed
```

The release notes are the changelog section. Then report the release links.
