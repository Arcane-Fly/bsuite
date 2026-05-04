# BSuite — Post-Mortem: Shared-Packages Publish Pipeline Incident (v1.00W)

**Status:** Working — hand-off to user for prevention-measure ratification
**Session:** 2026-05-04
**Incident window:** 2026-05-01 → 2026-05-04 (~3 days of silent publish pipeline failure)
**Scope:** Root-cause analysis and prevention plan for the blocked publish of `@bsuite/nav-core@0.5.1`, `@bsuite/schema-registry@0.3.2`, and `@bsuite/page-builder@0.2.1`
**Outcome:** All 3 packages now live on npm. Two root causes fixed via PRs #435 and #438. Three latent risks identified for follow-up.

---

## TL;DR

Two independent pipeline bugs compounded across PRs #434 / #437 to produce 5 consecutive publish-workflow failures:

1. **Root `pnpm.overrides` drifted from the lockfiles** since PR #417 (2026-05-01). `pnpm install --frozen-lockfile` inside `packages/<pkg>/` aborted with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` because the workspace root's overrides no longer matched either `pnpm-lock.yaml` or `packages/nav-core/pnpm-lock.yaml`.
2. **All 3 publish workflows used `npm publish --provenance`** but bsuite is a **private** repository. Sigstore returned `422 Unprocessable Entity — Unsupported GitHub Actions source repository visibility: "private"`.

PR #435 regenerated both lockfiles. PR #438 dropped `--provenance` and the paired `id-token: write` permission from all 3 workflows. PR #439 re-promoted dev → main, the 3 workflows were manually dispatched, and all succeeded.

**Latent risk:** 3 other publish workflows (`publish-charge-calc`, `publish-eslint-config`, `publish-tsconfig`) still carry `--provenance` and will reproduce Root Cause #2 the next time their respective packages change.

---

## Incident timeline

| Date (UTC) | Event |
|---|---|
| 2026-05-01 | PR #417 regenerated root `pnpm-lock.yaml`. `@bsuite/page-builder@0.2.0` successfully published to npm from commit `7989eec`. |
| 2026-05-01 → 2026-05-04 | Root `pnpm.overrides` in `package.json` silently drifted (+`undici`, +`vite`, +`happy-dom`, +`yaml`; −`serialize-javascript`, −`lodash`; version bumps on `flatted`, `picomatch`, `brace-expansion`). Lockfiles NOT regenerated. |
| 2026-05-01 → 2026-05-04 | 5 consecutive `publish-nav-core.yml` runs failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Failures were interpreted as NPM_TOKEN issues (incorrectly) rather than lockfile drift. |
| 2026-05-04 | PR #434 merged to `development`: attestation bumps (`nav-core` 0.5.0→0.5.1 with added `peerDependencies`, `schema-registry` 0.3.1→0.3.2, `page-builder` 0.2.0→0.2.1) + new `publish-schema-registry.yml` workflow. |
| 2026-05-04 | PR #437 merged to `main` (first promote). Path filter `packages/<pkg>/**` auto-triggered all 3 publish workflows. **ALL 3 FAILED** with Sigstore `422 Unprocessable Entity` (run IDs `25325686036`, `25325685997`, `25325686074`). |
| 2026-05-04 | Diagnosis: two independent root causes identified from failure logs. |
| 2026-05-04 | PR #435 merged: regenerated `pnpm-lock.yaml` + `packages/nav-core/pnpm-lock.yaml` in-place to match current `pnpm.overrides`. |
| 2026-05-04 | PR #436 merged: back-merged `main` commit `603b4a0` (PR #430) into `development` so the next promote is a clean forward delta. |
| 2026-05-04 | PR #438 merged: dropped `--provenance` + `id-token: write` from all 3 publish workflows; added inline comments documenting why. |
| 2026-05-04 | PR #439 merged to `main` (second promote). |
| 2026-05-04 | Manual `gh workflow run` dispatched all 3 publish workflows on `main` (runs `25326167588`, `25326169322`, `25326171083`). **ALL 3 GREEN.** |
| 2026-05-04 | npm verified: `@bsuite/nav-core@0.5.1`, `@bsuite/schema-registry@0.3.2`, `@bsuite/page-builder@0.2.1` live. |

---

## Root Cause #1 — Parent `pnpm.overrides` drifted from lockfiles

### What happened

Since PR #417 (2026-05-01 lockfile-regen fix), contributors added and removed entries from the root `package.json` `pnpm.overrides` block without regenerating the lockfiles. The drift:

| Override | `package.json` (HEAD) | `pnpm-lock.yaml` (HEAD, before PR #435) |
|---|---|---|
| `flatted` | `^3.4.2` | `>=3.4.2` |
| `undici` | `^7.24.0` | *(absent)* |
| `vite` | `^6.4.2` | *(absent)* |
| `brace-expansion` | `^5.0.5` | `>=5.0.5` |
| `picomatch` | `^4.0.4` | `>=4.0.4` |
| `happy-dom` | `^20.8.9` | *(absent)* |
| `yaml` | `^2.8.3` | *(absent)* |
| `serialize-javascript` | *(absent)* | `>=7.0.5` |
| `lodash` | *(absent)* | `>=4.18.0` |

Both the root `pnpm-lock.yaml` and `packages/nav-core/pnpm-lock.yaml` encoded the stale snapshot. Note that `packages/schema-registry/pnpm-lock.yaml` and `packages/page-builder/pnpm-lock.yaml` do **not** exist — those packages inherit from the workspace lockfile at install time.

### Why the publish workflows failed

Each publish workflow runs with `working-directory: packages/<pkg>/`:

```yaml
defaults:
  run:
    working-directory: packages/nav-core

steps:
  - run: pnpm install --frozen-lockfile
```

Because the parent `pnpm-workspace.yaml` declares `packages: ['packages/*']`, pnpm auto-resolves into the workspace root and applies the workspace-level overrides. With `--frozen-lockfile`, pnpm's overrides-guard triggers:

```text
ERR_PNPM_LOCKFILE_CONFIG_MISMATCH
Cannot proceed with the frozen installation.
The current "overrides" configuration doesn't match the value found in the lockfile.
```

### Why this wasn't caught pre-merge

The main `build-and-test.yml` CI workflow does **not** currently run `pnpm install --frozen-lockfile` at the parent monorepo level. Only the publish workflows do — and they only run on `main` after promote, not on PRs.

### Misdiagnosis

The 5 prior `publish-nav-core.yml` failures were not investigated before this session; the prevailing assumption in recent commit messages was that `NPM_TOKEN` had expired (evidenced by the `EOTP` → `Granular token + Bypass 2FA` ledger in `NEW_ISSUES_FOUND.md`). That was a correlation, not causation — the token was valid; the install step was failing before `npm publish` was ever reached.

### Fix (PR #435)

```bash
# From a worktree on origin/development
pnpm install --lockfile-only                              # regenerates root pnpm-lock.yaml
cd packages/nav-core && pnpm install --lockfile-only      # regenerates per-package lockfile
```

Result: both lockfiles' `overrides:` blocks now match `package.json` exactly. All 3 publish workflows' install step passes locally.

Merge commit: `d7071b7`.

---

## Root Cause #2 — `--provenance` flag on a private repository

### What happened

All 3 publish workflows contained:

```yaml
permissions:
  contents: read
  id-token: write   # Required for npm provenance attestation

steps:
  - name: Publish to npm
    run: npm publish --access public --provenance
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

After PR #437 promoted to `main`, all 3 workflows triggered via the `packages/<pkg>/**` path filter. All 3 failed at the same step:

```text
npm error 422 Unprocessable Entity - PUT https://registry.npmjs.org/...
Error verifying sigstore provenance bundle:
Unsupported GitHub Actions source repository visibility: "private".
Only public source repositories are supported when publishing with provenance.
```

### Why

npm provenance uses Sigstore, which requires a **public** source repository to verify the build chain. `GaryOcean428/bsuite` is private, so the provenance bundle is rejected at upload time. The `npm publish --dry-run` step earlier in each workflow does **not** exercise provenance, so it cannot catch this bug.

### Prior attempt to fix (PR #422) — incomplete

The commit log shows: `fix(ci): drop --provenance from publish-page-builder (bsuite is private) (#422)`. However at the time of this incident, **all three** workflows still contained `--provenance`:

- `publish-nav-core.yml` — never touched by PR #422
- `publish-schema-registry.yml` — didn't exist at the time of PR #422 (created in PR #434)
- `publish-page-builder.yml` — still had `--provenance` (PR #422's scope or fix appears to have been partial or reverted)

This is why PR #437 failed across all 3 workflows rather than just 2.

### Fix (PR #438)

For each of `publish-nav-core.yml`, `publish-schema-registry.yml`, and `publish-page-builder.yml`:

1. Drop `--provenance` from the `npm publish` step.
2. Remove the `id-token: write` permission (only needed to issue the OIDC token Sigstore consumes).
3. Add an inline comment documenting **why** the flag is absent, so a future agent doesn't naively re-add it:

```yaml
permissions:
  contents: read
  # Note: --provenance is intentionally NOT used because bsuite is a private
  # repository and Sigstore provenance requires a public source repo.
  # If/when bsuite goes public, re-add `id-token: write` here and `--provenance`
  # to the npm publish step.
```

Merge commit: `78c487d` (to development), `90d3ca7` (promoted to main via #439).

### Verification

All 3 manually-dispatched publish runs on `main` succeeded:

| Workflow | Run ID | Conclusion | npm version |
|---|---|---|---|
| `publish-nav-core.yml` | `25326167588` | success | `@bsuite/nav-core@0.5.1` ✅ |
| `publish-schema-registry.yml` | `25326169322` | success | `@bsuite/schema-registry@0.3.2` ✅ |
| `publish-page-builder.yml` | `25326171083` | success | `@bsuite/page-builder@0.2.1` ✅ |

---

## Latent risks

### L1 — Three publish workflows still carry `--provenance`

A ground-truth scan against `origin/main` (post-PR-#439) across all 7 publish workflows:

| Workflow | Package | `--provenance` | `id-token: write` | Status |
|---|---|---|---|---|
| `publish-nav-core.yml` | `@bsuite/nav-core` | — | — | ✅ FIXED by #438 |
| `publish-page-builder.yml` | `@bsuite/page-builder` | — | — | ✅ FIXED by #438 |
| `publish-schema-registry.yml` | `@bsuite/schema-registry` | — | — | ✅ FIXED by #438 |
| `publish-charge-calc.yml` | `@bsuite/charge-calc` | active | active | ⚠️ LATENT |
| `publish-eslint-config.yml` | `@bsuite/eslint-config` | active | active | ⚠️ LATENT |
| `publish-tsconfig.yml` | `@bsuite/tsconfig` | active | active | ⚠️ LATENT |
| `publish-theme.yml` | `@bsuite/theme` | — | — | ✔️ CLEAN (never had it) |

**Probability:** High — guaranteed failure on next version bump for any of the 3 LATENT packages.
**Impact:** Medium — blocks publication of that specific package; no cascade to others.
**Mitigation:** Prevention 2 (below) — one PR applying the #438 pattern to all 3.

### L2 — Path-filter trap: workflow-file-only fixes don't auto-trigger publish workflows

PR #438 was a pure `.github/workflows/` change. The 3 publish workflows have path filters:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'packages/nav-core/**'    # NOTE: does NOT include .github/workflows/
```

So when PR #438 merged to main via PR #439, the filter did **not** match and the workflows did not auto-run. We had to use `gh workflow run` manually to re-publish. This is not a bug, but it's a non-obvious behaviour that caused a moment of confusion during recovery.

**Probability:** Low — only triggers when a workflow-file-only fix lands between package version bumps.
**Impact:** Low — requires one manual `gh workflow run` per affected workflow.
**Mitigation:** document this in the `Shared Packages (npm)` section of `AGENTS.md` alongside Prevention 5. Optional: add a `.github/workflows/**` path to the publish trigger filter — but that would cause every unrelated workflow edit to re-publish, which is worse than the current behaviour.

### L3 — `pnpm.overrides` drift repeats because nothing guards it

PR #417 fixed the lockfile once. Nothing prevented the same drift from re-accumulating over the next 3 days. Prevention 1 closes this gap permanently at the CI layer.

**Probability:** High without Prevention 1 — any contributor modifying `pnpm.overrides` without regenerating the lockfile reproduces the incident.
**Impact:** Medium — next publish-workflow invocation fails; recovery requires one lockfile-regen PR.
**Mitigation:** Prevention 1 (below).

---

## Recovery summary — PRs shipped

| PR | Title | Base | Merge SHA |
|---|---|---|---|
| #434 | React 19 attestation bumps + nav-core peerDeps + schema-registry publish workflow | development | `3270f80` |
| #435 | regenerate pnpm-lock.yaml files to match overrides config | development | `d7071b7` |
| #436 | main → development back-merge of PR #430 docs unification | development | `2dd6b55` |
| #437 | promote development → main (first attempt — publish workflows failed) | main | `85826ad` |
| #438 | drop `--provenance` from all 3 publish workflows (bsuite is private) | development | `78c487d` |
| #439 | promote development → main (second attempt — recovery) | main | `90d3ca7` |

---

## Prevention measures

Numbered by priority. Each has a suggested scope and rough effort estimate.

### Prevention 1 (High) — CI guard: root `pnpm install --frozen-lockfile` on every PR

**Problem:** `build-and-test.yml` (the main CI gate) does not run `pnpm install --frozen-lockfile` at the parent monorepo root. Lockfile / override drift can merge undetected until a publish workflow fires.

**Fix:** Add a step to `build-and-test.yml` (or a dedicated `parent-lockfile-check.yml`) that runs on PRs touching any of:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `packages/*/package.json`
- `packages/*/pnpm-lock.yaml`

Proposed step:

```yaml
- name: Verify parent lockfile in sync with overrides
  run: |
    corepack enable
    corepack prepare pnpm@10.30.3 --activate
    pnpm install --frozen-lockfile
```

**Effort:** ~1 hour. **Would have caught:** the PR that last mutated `pnpm.overrides` between 2026-05-01 and 2026-05-04.

### Prevention 2 (High) — Fix the 3 other publish workflows proactively

**Problem:** `publish-charge-calc.yml`, `publish-eslint-config.yml`, and `publish-tsconfig.yml` still contain `--provenance` + `id-token: write`. They will fail the same way on next trigger.

**Fix:** Open one PR applying the same pattern as PR #438 to all 3 workflows. Include the identical inline comment block so the rationale is self-evident.

**Effort:** ~30 minutes. **Blast radius:** zero — purely defensive.

### Prevention 3 (Medium) — Workflow-lint: forbid `--provenance` while bsuite is private

**Problem:** PR #422 attempted this fix and regressed. Nothing enforces the "no provenance on private" invariant.

**Fix:** Add a lint step to `app-quality-checks.yml` (or a new `workflow-lint.yml`) that fails if any `.github/workflows/publish-*.yml` contains `--provenance` or `id-token: write` while the repository is private.

```yaml
- name: Forbid --provenance on private repo publish workflows
  run: |
    IS_PRIVATE=$(gh repo view --json isPrivate -q .isPrivate)
    if [ "$IS_PRIVATE" != "true" ]; then
      echo "Repo is public — provenance allowed."
      exit 0
    fi
    MATCHES=$(grep -l -E -- '--provenance|id-token:\s*write' .github/workflows/publish-*.yml || true)
    if [ -n "$MATCHES" ]; then
      echo "::error::Private repo cannot use --provenance. Offending files:"
      echo "$MATCHES"
      exit 1
    fi
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Effort:** ~1 hour. **Regression protection:** blocks the PR #422 failure mode from recurring.

### Prevention 4 (Medium, OPTIONAL) — Pre-commit hook for lockfile-in-sync

**Problem:** Drift happens at commit time, not at CI time. A pre-commit hook could catch it one layer earlier.

**Current state:** no husky / lint-staged infrastructure in the parent repo (`.husky/` absent, both `husky` and `lint-staged` are `null` in `package.json`).

**Options:**

- **Option A:** Adopt `husky` + `lint-staged`. Pre-commit hook runs `pnpm install --frozen-lockfile` if `package.json` or `pnpm-workspace.yaml` is staged. **Cost:** new setup step for every contributor across 6 submodules; friction on fresh clones.
- **Option B (recommended):** Skip pre-commit — rely on Prevention 1's CI guard. Lower friction, no new tooling, catches drift at PR time which is sufficient.

**Decision deferred to user.** Prevention 1 is strictly sufficient on its own; Prevention 4 is belt-and-suspenders.

### Prevention 5 (Low) — Document dual-lockfile behavior in AGENTS.md

**Problem:** The existing AGENTS.md `pnpm Lockfile Generation` section (≈ line 90) covers the submodule-app isolation rule but does not mention:

- Per-package `packages/*/pnpm-lock.yaml` files exist for some packages (e.g. `nav-core`) and inherit workspace overrides at snapshot time.
- When modifying root `pnpm.overrides`, **both** root and any affected per-package lockfiles must be regenerated.
- Use `pnpm install --lockfile-only` (not `--frozen-lockfile`) from the worktree root.
- The parent monorepo lockfile is regenerated in-place (unlike submodule-app lockfiles, which require the isolated-directory pattern).

**Fix:** append a subsection under `pnpm Lockfile Generation` titled "Modifying `pnpm.overrides`" with the above.

**Effort:** ~15 minutes.

### Prevention 6 (Low) — Capture incident in QIG persistent memory

**Problem:** Future sessions starting fresh will lack context on this incident.

**Fix:** Write an entry at key `bsuite_incident_20260504_publish_pipeline` containing:

- The two root causes (one-liner each)
- The fix PRs (#435, #438) and the recovery promote (#439)
- A pointer to this post-mortem doc
- The 3 latent-risk workflows pending Prevention 2

```bash
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_incident_20260504_publish_pipeline \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "category": "incident",
  "content": "2026-05-04 publish-pipeline incident. RC1: pnpm.overrides drift from lockfiles (fixed PR #435). RC2: --provenance on private repo (fixed PR #438). Latent: publish-charge-calc/eslint-config/tsconfig still carry --provenance. See docs/20260504-post-mortem-shared-packages-publish-v1.00W.md",
  "updated": "2026-05-04T00:00:00Z"
}
EOF
```

**Effort:** ~5 minutes.

### Recommended bundling for minimum PR count

To close the incident with the fewest PRs:

- **PR A (highest leverage, ship first):** Prevention 2 alone — drop `--provenance` + `id-token: write` from `publish-charge-calc.yml`, `publish-eslint-config.yml`, `publish-tsconfig.yml`. Pure workflow edit, no CI waiting.
- **PR B (CI guard + docs, ship same day):** Prevention 1 + Prevention 5 together — add the parent `pnpm install --frozen-lockfile` step to `build-and-test.yml` AND update `AGENTS.md` `pnpm Lockfile Generation` section with the dual-lockfile paragraph.
- **PR C (regression guard, ship within the week):** Prevention 3 — add the workflow-lint step to forbid `--provenance` while private. Uses `gh` CLI which is already available in GitHub Actions runners.
- **Prevention 4** — user decision only; no PR needed if Option B (skip husky) is chosen, which is the recommendation.
- **Prevention 6** — one `curl` call this session; can be done inline without a PR.

---

## Next actions

| # | Priority | Action | Suggested scope | Owner |
|---|---|---|---|---|
| 1 | High | Add parent `pnpm install --frozen-lockfile` guard to `build-and-test.yml` | One PR to parent repo `.github/workflows/` | TBD |
| 2 | High | Drop `--provenance` + `id-token: write` from `publish-charge-calc.yml`, `publish-eslint-config.yml`, `publish-tsconfig.yml` | One PR, same pattern as #438 | TBD |
| 3 | Medium | Add workflow-lint step forbidding `--provenance` while private | One PR to parent repo | TBD |
| 4 | Medium | Decide husky / lint-staged vs CI-only. Recommended: skip husky. | User decision — no code change if skipped | User |
| 5 | Low | Update `AGENTS.md` `pnpm Lockfile Generation` section with dual-lockfile guidance | Same PR as Prevention 1 (docs + CI together) | TBD |
| 6 | Low | Write QIG memory entry `bsuite_incident_20260504_publish_pipeline` | One-line `curl` — can be done this session | Assistant |

---

## What went well

- Five PRs shipped in clean sequence with no regressions mid-flight.
- All PR CI checks green before every merge.
- Both root causes identified from failure logs alone, without speculative fixes.
- Claude Code WIP preserved throughout — primary workspace's local-only `sync/parent-main-to-development-20260504-final` branch (@ `a869dba`) was never touched.
- Back-merge of `main` → `development` (PR #436) kept the promote topology clean so the recovery promote (PR #439) was a clean fast-forward candidate.
- Final npm publications verified programmatically (`npm view @bsuite/<pkg>@<version>` for all 3) rather than by inspection.

## What went poorly

- PR #422's attempted fix for `--provenance` was incomplete (only named `publish-page-builder` in its title; actual workflow still carried the flag). Nothing prevented the regression between #422 and today.
- `pnpm.overrides` drift went undetected for ~3 days. The 5 consecutive `publish-nav-core.yml` failures during that window were not triaged — assumed to be NPM_TOKEN issues based on recent commit-log correlation rather than reading the failure logs.
- Three other `publish-*.yml` workflows still carry the latent `--provenance` risk (Prevention 2).
- The first promote PR (#437) went to `main` before the two root causes were diagnosed. A pre-promote lockfile + workflow-lint check (Prevention 1 + 3) would have blocked it on PR CI.

---

## Appendix — Evidence pointers

### Failed run logs (Sigstore rejection)

- `publish-nav-core.yml` run `25325686036`
- `publish-schema-registry.yml` run `25325685997`
- `publish-page-builder.yml` run `25325686074`

All three show the identical `422 Unprocessable Entity` Sigstore error at the `Publish to npm` step.

### Lockfile mismatch reproduction

```text
$ cd packages/nav-core && pnpm install --frozen-lockfile
 ERR_PNPM_LOCKFILE_CONFIG_MISMATCH  Cannot proceed with the frozen installation.
 The current "overrides" configuration doesn't match the value found in the lockfile
```

Reproduced on a fresh clone of `GaryOcean428/bsuite@origin/development` pre-PR-#435.

### Successful recovery runs

- `publish-nav-core.yml` run `25326167588` → `@bsuite/nav-core@0.5.1` ✅
- `publish-schema-registry.yml` run `25326169322` → `@bsuite/schema-registry@0.3.2` ✅
- `publish-page-builder.yml` run `25326171083` → `@bsuite/page-builder@0.2.1` ✅

### Related docs

- `AGENTS.md` — § `pnpm Lockfile Generation`, § `Shared Packages (npm)`, § `Dependency Version Policy`
- `docs/NEW_ISSUES_FOUND.md` — earlier `NPM_TOKEN` ledger entries (partial misdirection)
- PR #417 — original parent lockfile regen (the precedent PR #435 mirrors)
- PR #422 — partial prior attempt at the `--provenance` fix

### Runnable verification commands

All commands below were used during the session; paste into a shell at the repo root to verify state at any time.

```bash
# 1. Confirm npm has the 3 target versions
for pkg_ver in 'nav-core@0.5.1' 'schema-registry@0.3.2' 'page-builder@0.2.1'; do
  printf '@bsuite/%-30s %s\n' "$pkg_ver" "$(npm view "@bsuite/$pkg_ver" version 2>&1 | head -1)"
done

# 2. Scan every publish workflow for --provenance / id-token (shows LATENT ones)
for wf in .github/workflows/publish-*.yml; do
  name=$(basename "$wf")
  prov=$(grep -cE '^\s*run:.*--provenance' "$wf" || true)
  tok=$(grep -cE '^\s*id-token:\s*write' "$wf" || true)
  printf '%-35s provenance=%s id-token=%s\n' "$name" "$prov" "$tok"
done

# 3. Verify root pnpm-lock.yaml overrides match package.json
diff \
  <(jq -r '(.pnpm.overrides // {}) | to_entries[] | "\(.key)=\(.value)"' package.json | sort) \
  <(awk '/^overrides:/,/^[a-zA-Z]/' pnpm-lock.yaml | grep -E "^\s+\S+:" | sed 's/://' | awk '{print $1"="$2}' | tr -d "'" | sort)
# no output = in sync; any diff = drift

# 4. Reproduce the frozen-lockfile install the publish workflows run
(cd packages/nav-core && pnpm install --frozen-lockfile)
(cd packages/schema-registry && pnpm install --frozen-lockfile)
(cd packages/page-builder && pnpm install --frozen-lockfile)
```

---

*End of post-mortem. Ratify Prevention 1–3 (and decide on Prevention 4) to close this incident.*
