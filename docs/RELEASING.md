# Releasing

A release is a milestone: `0.2 Passkeys` becomes version `0.2.0`, in
[clavia](https://github.com/clavia-auth/clavia) and clavia-dashboard at the same number. The
dashboard follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html); before 1.0.0 a minor
version may change a setting, and the changelog says so. The clavia repository has the same
document; this one is its dashboard side.

What a release publishes:

| What                                                        | Where                                                                  | Made by                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| A git tag `vX.Y.Z`                                          | the repository                                                         | the maintainer           |
| The container image                                         | `ghcr.io/clavia-auth/clavia-dashboard:X.Y.Z` (also `X.Y` and `latest`) | the **Release** workflow |
| The GitHub release, with the changelog section as its notes | GitHub                                                                 | the **Release** workflow |

Claude prepares the release pull request (the **ticket-release** skill); tagging and publishing
are public and hard to take back, so they are the maintainer's.

## 1. Check the milestone

Every issue of the milestone is closed in both repositories, or moved to the next one by
agreement: unfinished work is never released half-done.

```bash
for r in clavia clavia-dashboard; do
  gh api "repos/clavia-auth/$r/milestones?state=open" --jq '.[] | "\(.number) \(.title) open=\(.open_issues)"'
done
```

## 2. Open the release pull request

Branch `chore/release-X.Y.Z`, pull request `Release X.Y.Z`, with `Part of` the release issue.
It changes two things:

- **`CHANGELOG.md`**: a section `## [X.Y.Z] - YYYY-MM-DD` under `## [Unreleased]`, in
  [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) form (Added, Changed, Fixed, Security),
  written for the people who run the dashboard, not as a list of commits. Settings and any step an
  operator must take on upgrading get their own lines. Add the section's link at the foot
  (`[X.Y.Z]: https://github.com/clavia-auth/clavia-dashboard/releases/tag/vX.Y.Z`) and move
  `[Unreleased]` to compare against it. **This section is the release notes**, word for word.
- **`package.json`** and **`package-lock.json`**: `npm version X.Y.Z --no-git-tag-version`.

Merge it once `npm run check` is green.

## 3. Tag

Wait for the CI run on the merge commit to finish: the Release workflow refuses a commit whose
checks have not succeeded.

```bash
git fetch origin main
git tag -a vX.Y.Z -m "X.Y.Z" origin/main
git push origin vX.Y.Z
```

A tag of the form `vX.Y.Z-rc.1` publishes a **pre-release**: the image is tagged `X.Y.Z-rc.1` only,
and `latest` and `X.Y` do not move.

## 4. What the Release workflow does

`.github/workflows/release.yml` runs on the tag and stops at the first thing that disagrees:

1. **Verify.** The tagged commit is on `main`; the CI checks succeeded on it; `package.json`
   declares the tag's version; `CHANGELOG.md` has a section for it.
2. **Image.** Builds the `production` target of the `Dockerfile` and pushes it to
   `ghcr.io/clavia-auth/clavia-dashboard`. The image is Next.js's standalone server on Node,
   running as an unprivileged user and listening on port 3000, serving under `/dashboard`. It does
   not hold configuration: everything comes from `DASHBOARD_*` variables (`.env.example`), read
   when the first request arrives.
3. **Release.** Creates the GitHub release for the tag with the changelog section as its notes,
   only after the image exists, so no release is ever without its image.

The **Image** workflow builds and starts the same image on every change to what goes into it, so a
release never meets a `Dockerfile` that was not built before. Build it yourself the same way:

```bash
docker build --target production -t clavia-dashboard:local .
docker run --rm -p 3000:3000 --env-file .env clavia-dashboard:local
```

## 5. After the workflow

- **Close the milestone** in both repositories:
  `gh api -X PATCH repos/clavia-auth/clavia-dashboard/milestones/<number> -f state=closed`
- **Check the published image** pulls and starts:
  `docker run --rm -p 3000:3000 ghcr.io/clavia-auth/clavia-dashboard:X.Y.Z`
- The first time, set the package's visibility on ghcr.io (public, linked to the repository), which
  a workflow cannot do.

## If it goes wrong

- **Verify failed**: fix what it names on `main` through a pull request, delete the tag
  (`git push origin :refs/tags/vX.Y.Z`, `git tag -d vX.Y.Z`), and tag the new commit. Nothing was
  published.
- **The image or the release step failed after the image was pushed**: re-run the failed job from
  the Actions tab. A release is created once; if one already exists for the tag, delete it first
  (`gh release delete vX.Y.Z`).
- **A published release is wrong**: do not move the tag. Fix forward with a patch release
  (`X.Y.Z+1`) and say so in its changelog.
