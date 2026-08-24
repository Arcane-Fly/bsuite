---
kind: standard
authority: engineering
owner: bsuite
evidence:
  - scripts/publish-dist-tag.mjs
  - scripts/check-publish-dist-tag-wiring.mjs
  - .github/workflows/dist-tag-wiring.yml
  - scripts/select-prerelease-publishes.mjs
  - scripts/next-prerelease-version.mjs
  - scripts/finalise-prereleases.mjs
  - scripts/check-no-prerelease-in-production.mjs
  - .github/workflows/publish-next.yml
  - .github/workflows/no-prerelease-in-production.yml
---

# The BSuite release model — `next` and `latest`

> **STATUS: IN FORCE. Implemented and proven end to end on 2026-08-24.**
> The model was ruled in force by the operator; this document records the
> implementation, not the decision. It is not open for re-litigation — if you
> believe it needs changing, raise it as a new ruling rather than working
> around it.
>
> Proof, not assertion. A package fix travelled the whole path in one session:
>
> | step | evidence |
> |---|---|
> | fix lands on `development` with a `-next.N` bump | `@bsuite/data-grid` 1.0.0 → 1.0.1-next.0 |
> | `publish-next.yml` publishes it to `next` | `dist-tags {"latest":"1.0.0","next":"1.0.1-next.0"}` — `latest` did **not** move |
> | an app pins it and its preview installs it | crm7 lockfile `specifier 1.0.1-next.0 → version 1.0.1-next.0` |
> | the `d.*` host serves the fix | `d.crm.crm7.app` @ deploy `d82709d7`, 862-chunk crawl, exactly one drag-handle class, the corrected tier |
> | promotion finalises and publishes to `latest` | `dist-tags {"latest":"1.0.1","next":"1.0.1-next.0"}` |
>
> The first publish attempt **failed**, and that is the better evidence: the
> dispatched run died on a real typecheck defect that the parent's PR gate does
> not run, and `publish-next.yml` failed with it rather than reporting success.


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

That is a closed loop and it was not theoretical. On 2026-08-24 it was blocking the
schema-builder package fixes bound for `d.crm.crm7.app`, and every shared-package change
queued behind them.

> **Correction, same day.** The first version of this document also named `bsuite#2321`
> (R80.4 signed-in pages: invisible drag/resize handles, 30 items below contrast, 4
> unlabelled inputs) as "all rooted in shared packages". **That attribution was wrong and
> is withdrawn.** R80.4 does not depend on `@bsuite/data-grid` at all — the `⠿`/`⤢`
> handles come from R80.4's own `charge-calculator-v9-2.tsx:1127,1137`, where they are
> `opacity-0 group-hover:opacity-100 focus:opacity-100` affordances carrying real
> `aria-label`s, and the four inputs are `aria-hidden="true" tabindex="-1"` native date
> pickers held off-screen. Both classes were false positives in the auditors, both were
> fixed in `4d74d958` by teaching `audit-legibility.mjs` and `audit-ui-pages.mjs` to skip
> them (skipped **and counted**, never silently), and #2321 needed no package publish.
> The deadlock is real; that was not an instance of it. Keeping the wrong example would
> have made the loop look better-evidenced than it is.

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

## The version scheme

```
  <released>  ->  <patch+1>-next.0  ->  <patch+1>-next.1  ->  ...  ->  <patch+1>
     1.1.0    ->    1.1.1-next.0    ->    1.1.1-next.1    ->  (promotion)  ->  1.1.1
```

`-next.N` rather than `-rc.N` so the version and the dist-tag tell the same story:
`@bsuite/theme@1.1.1-next.2` served under `next` is one fact, not two that have to be
correlated. `N` is derived from **the registry**, never from the working tree —

```bash
node scripts/next-prerelease-version.mjs --package @bsuite/theme --write
```

— which is what makes it monotonic. Two branches bumping the same package concurrently
read the same registry state, so the second publish collides on an existing version and
is refused rather than silently no-oping. That is the correct outcome, and the one this
estate learned the hard way when two PRs both set `@bsuite/theme` to `0.13.0` and the
second no-oped without failing, leaving the registry and the source disagreeing at the
same version number.

A minor or major bump is deliberate and is passed explicitly: `--base 1.2.0`. The default
is patch+1 of the highest released version, which can never collide with an existing
release line.

The *machinery* is shape-agnostic — `publish-dist-tag.mjs` treats any semver prerelease
as a prerelease — so a one-off `-rc.1` still publishes safely under `next`. `-next.N` is
the convention, not a trap.

## The runbook

1. Land the package fix on parent `development` through the normal PR route, with the
   version bumped to a prerelease in **the same commit as the change**. The full gate
   applies exactly as before; nothing here relaxes it.

   The bump belongs in the same commit because `check-published-matches-source.mjs`
   compares the published tarball against the source *at the version the source
   declares*. Changing `packages/theme` while leaving it at `1.1.0` makes the registry
   and the source disagree at `1.1.0` — the exact defect that guard exists to catch.

2. **The publish is automatic.** Merging to `development` runs
   `.github/workflows/publish-next.yml`, which selects every changed package carrying an
   unpublished prerelease and publishes it under `next`. `latest` does not move, so no
   production install changes.

   It does not build anything itself — it dispatches each package's own
   `publish-<pkg>.yml` on the `development` ref and **waits for it**, so the prerelease
   path runs the release path: same steps, same tests, same dry run, same tag decision.
   Then it asks the registry whether the version is actually there, because a green
   publish run is not the same as a published artifact (`publish-eslint-config.yml`
   reported success on three consecutive runs while the package 404'd — `bsuite#1908`).

   To publish by hand instead: `gh workflow run publish-<pkg>.yml --ref development`, or
   `gh workflow run publish-next.yml --ref development -f scope=all` for everything
   pending.

3. In the consuming app's own repo, on its `development` branch, pin the exact prerelease
   and regenerate the lockfile. `--frozen-lockfile` is satisfied because the lockfile now
   contains a genuine registry version — the constraint is respected, not relaxed.

4. The `d.*` preview build installs a **real published artifact containing the fix**. The
   visual gate finally has something truthful to measure. The gate reads the `d.*`
   development deployments (`scripts/theme-session.sh`), which is exactly the host this
   step changes.

5. On promotion, in this order, and the order is not negotiable:

   | # | Step | Command |
   |---|---|---|
   | 1 | Finalise the package versions | `node scripts/finalise-prereleases.mjs` |
   | 2 | Promote — main publishes them to `latest` | the normal promotion PR |
   | 3 | Repoint each app onto the released version and regenerate its lockfile | per app |

   Doing 3 before 2 pins the apps to a version that does not exist yet, and
   `--frozen-lockfile` fails with a 404 that reads like a registry outage.
   `check-own-package-freshness` is what forces 3 to actually happen: the moment `latest`
   moves, every app still resolving the prerelease is `STALE-BUT-IN-RANGE`, which is a
   hard failure and not a warning.

## Which branch publishes which tag — the whole model on one page

| | Preview | Production |
|---|---|---|
| Branch | `development` | `main` |
| Package version | `x.y.z-next.N` | `x.y.z` |
| dist-tag | `next` | `latest` |
| Publishes via | `publish-next.yml` (push to `development`) | `publish-<pkg>.yml` (push to `main`) |
| Resolved by | **only** a lockfile naming that exact version | any consumer on `^x.y.z` |
| Host | `d.crm.crm7.app`, `d.r8.crm7.app`, … | `crm.crm7.app`, `r8.crm7.app`, … |
| Install flag | `--frozen-lockfile` | `--frozen-lockfile` |

`--frozen-lockfile` is **satisfied on both paths, relaxed on neither**. The
preview resolves a genuine, immutable, published registry version — not a
workspace symlink — which is the point: a visual gate's verdict is only worth
something if the preview is faithful to what would ship.

**Nothing here weakens the production path.** `latest` still moves only through
a push to `main`, behind the same promotion gate as before.

## What stops the two paths being confused

The model is tabulated once, further down under *Which branch publishes which
tag*. This section is the enforcement.

Both ends are guarded, because each fails in a different direction.

**Producer** — `scripts/publish-dist-tag.mjs`: a prerelease never takes `latest` on any
ref, and a release is refused anywhere but `main`.

**Consumer** — `scripts/check-no-prerelease-in-production.mjs`, run on every PR into
`main`, on every push to `main`, and daily:

| | Assertion |
|---|---|
| P1 | no package manifest under `packages/` declares a prerelease version |
| P2 | no app `package.json` declares an `@bsuite/*` range containing a prerelease |
| P3 | no app `pnpm-lock.yaml` **resolves** an `@bsuite/*` to a prerelease |
| P4 | the registry's own `dist-tags.latest` is not a prerelease — checked on **every** ref |

P3 is the one that matters most and the one nobody reads: the lockfile's resolved column
is what actually gets installed, and this estate has already been burned by drift living
entirely there while `package.json` looked correct (`@bsuite/theme` 0.11.2,
`@bsuite/ui` 1.0.3, `@bsuite/nav-core` 0.9.1 — all invisible to every check that existed
at the time).

P1 exists because the producer-side guard working correctly is what makes its absence
invisible: a prerelease version sitting on `main` means `publish-<pkg>.yml` correctly
declines to move `latest`, and then `latest` silently stops advancing while every
freshness check reports the apps current against a stale tag.

## What happens to the whole estate when a promotion publishes

**Every open PR goes red, and that is the model working.** Know this before it
happens to you, because the natural reaction is to assume it is your branch.

Measured 2026-08-24. `bsuite#2341` merged at 09:57Z and published
`@bsuite/nav-core 1.1.0` and `@bsuite/data-grid 1.0.1` to `latest`. Within two
minutes `own-package-freshness` was failing on every open PR in the estate:

```
✗ business-suite-unified  @bsuite/nav-core 1.0.1 < 1.1.0   STALE-BUT-IN-RANGE
✗ braden / conduit / crm7 / R80.4 / throughput  … same
✗ crm7                    @bsuite/data-grid 1.0.0 < 1.0.1
```

It is attributable to **no PR**. It arrives with **no diff at all** — the
registry moves underneath every branch simultaneously. That is exactly the class
the guard was written for, and the proof it is not your branch is that the same
workflow succeeded at 09:46Z and failed at 09:59Z on one unchanged branch.

**Treat it as a P0 until cleared, and say so where people will see it.** Not
because the failure is dangerous — the packages are fine — but because a
permanently red gate trains people to ignore it, and an ignored gate is a
deleted gate. This one is the only thing making apps actually consume what we
publish.

**Clearing it is TWO STEPS, not one.** `check-shared-package-reach` and
`own-package-freshness` read each app **at the parent gitlink**, so a green
result needs *both*:

1. the app's own lockfile refresh merged (in the app repo), **and**
2. the parent's gitlink advanced onto that commit.

Expect a second round of red between those two steps. That is not a regression;
it is the second half not being done yet.

| the app declares | what it needs |
|---|---|
| a caret range (`^1.0.0` already admits `1.1.0`) | lockfile-only refresh |
| an **exact** prerelease pin | `EXACT-PINNED-BEHIND` — needs the `package.json` edit too |

The exact pin is deliberate. A caret on a canary would silently absorb the
released version and nobody would ever notice the app was still nominally on a
release candidate; the exact pin turns that into a hard failure that must be
answered.


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
