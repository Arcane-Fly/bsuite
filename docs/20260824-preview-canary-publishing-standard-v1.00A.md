---
kind: standard
authority: engineering
owner: bsuite
evidence:
  - scripts/publish-dist-tag.mjs
  - scripts/check-publish-dist-tag-wiring.mjs
  - .github/workflows/dist-tag-wiring.yml
---

# Getting a package fix onto a preview host

## The deadlock this replaces

Every `packages/*` publish workflow triggers on `push: branches: [main]`, and every app
installs with `--frozen-lockfile`. Those two facts together made a shared-package fix
**unverifiable before the promotion its verification was supposed to authorise**:

```
the fix needs a publish
  -> publishing needs main
    -> main needs the visual gate green
      -> the gate measures a d.* preview host
        -> which installs from the npm registry
          -> which does not have the fix
```

That is a closed loop and it was not theoretical. On 2026-08-24 it was simultaneously
blocking `bsuite#2321` (R80.4 signed-in pages: invisible drag/resize handles, 30 items
below contrast, 4 unlabelled inputs — all rooted in shared packages), the schema-builder
package fixes bound for `d.crm.crm7.app`, and every shared-package change queued behind
them.

## The cut: prereleases publish from anywhere, releases only from `main`

npm dist-tags do the work. `latest` is what an app resolves from `^1.2.0` and what every
production install lands on. `next` is resolved by **nobody** unless a lockfile names
that exact version.

| Version | Publishable from | dist-tag | Who gets it |
|---|---|---|---|
| `1.2.0` (release) | `main` only | `latest` | every consumer on `^1.2.0` |
| `1.2.0-rc.1` (prerelease) | **any ref** | `next` | only a lockfile that pins the exact version |

A prerelease **never** takes `latest` — not even when published from `main`. That rule
exists because `npm publish` applies `latest` unless `--tag` is given, *including* for a
version with a semver prerelease component; npm does not infer it. All fifteen publish
workflows previously ran bare `npm publish --access public`, so a single `-rc.1` bump
would have put a release candidate in front of every production consumer, silently.

`scripts/publish-dist-tag.mjs` makes that decision and refuses anything it cannot
classify. `scripts/check-publish-dist-tag-wiring.mjs` proves every publish workflow
consults it, and runs a positive control against a real workflow file so a clean pass is
never just an unexercised checker.

## The runbook

1. Land the package fix on parent `development` through the normal PR route. The full
   gate applies exactly as before; nothing here relaxes it.
2. Bump the package to a prerelease version — `1.2.0-rc.1`, then `-rc.2`, and so on.
3. Dispatch that package's publish workflow **from `development`**:
   `gh workflow run publish-<pkg>.yml --ref development`.
   It publishes under `next`. `latest` does not move, so no production install changes.
4. In the consuming app's own repo, on its `development` branch, pin the exact
   prerelease and regenerate the lockfile. `--frozen-lockfile` is satisfied because the
   lockfile now contains the rc — the constraint is respected, not relaxed.
5. The `d.*` preview build installs a **real published artifact containing the fix**.
   The visual gate finally has something truthful to measure.
6. On promotion, bump to the release version. Publishing from `main` takes `latest`, and
   the consuming apps move off the rc in the same promotion.

## Why not the alternatives

- **Relaxing `--frozen-lockfile` for previews.** Makes preview builds irreproducible and
  lets a preview pass against a dependency tree production will never install. It trades
  a visible deadlock for an invisible one.
- **Workspace-linking packages in preview.** The preview then builds *source* while
  production installs a *tarball* — different resolution, different `exports` handling,
  different bundling. That is a whole class of "green in preview, broken in production",
  and this estate has already been bitten by `exports`-map and extensionless-re-export
  defects that only appear in the published artifact.
- **A recorded D1–D7 gate waiver.** The legitimate last resort, and it was not needed:
  a waiver would have to be re-issued for every future package fix, because it treats
  the symptom and leaves the loop intact.

## Reversibility

A `next`-tagged prerelease changes nothing for anyone who has not explicitly pinned it.
Backing one out is `npm dist-tag rm`, or simply publishing the next rc; no consumer is
affected either way. Nothing in this standard can move `latest` from a non-`main` ref —
`scripts/publish-dist-tag.mjs`'s self-test asserts that directly, across every
ref-and-version combination it can construct.
