# Bypass-PR Audit — pre-reconcile gate

- **Status:** WORKING (W)
- **Audit date:** 2026-04-27
- **Audit window:** PRs merged direct-to-main 2026-04-14 → 2026-04-20
- **Branch under audit:** `docs/bypass-pr-audit` (off `development`)
- **Repos audited:** `GaryOcean428/bsuite` (parent), `GaryOcean428/crm7` (submodule)
- **Reconcile decision gate:** before any `git reset --hard origin/main` against `origin/development`

## 1. Executive summary

| Metric | bsuite | crm7 | Total |
|--------|-------:|-----:|------:|
| Bypass PRs audited | 10 | 16 | **26** |
| Class (a) — already in dev AND main | 10 | 16 | **26** |
| Class (b) — needs cherry-pick to dev | 0 | 0 | **0** |
| Class (c) — conflicts with dev work | 0 | 0 | **0** |
| Class (d) — reverted on main | 0 | 0 | **0** |

**Audit verdict: the reconcile is SAFE with respect to the 26 bypass PRs.** Every PR's introduced patch (by `git patch-id --stable`) is present on **both** `origin/development` and `origin/main`. A `git reset --hard origin/main` against `origin/development` would NOT lose any of the audited PR content.

**However**, the reconcile would lose **20 dev-only commits in bsuite** and **6 dev-only commits in crm7** that landed AFTER the bypass window — these are unrelated to the 26 audited PRs. See §6 (Dev-only-commit awareness) for the list. The user should review §6 before executing reconcile.

## 2. Methodology

For each of the 26 PRs:

1. **Pull metadata** via `gh pr view <N> --repo GaryOcean428/<repo> --json number,title,headRefName,mergeCommit,mergedAt,author,baseRefName,state,body,files`.
2. **Verify reachability** of `mergeCommit.oid` (the GitHub-recorded merge SHA) from both `origin/development` and `origin/main` via `git merge-base --is-ancestor`.
3. **Find main-side equivalent SHA** by `git log origin/main --grep='(#NNN)'` (squash-merges produce different SHAs from the dev-side merge).
4. **Compare patch content** via `git patch-id --stable` between the dev SHA and the main SHA. Identical patch-ids = same content.
5. **Classify** per the four-class scheme.

Two PRs (`bsuite #147`, `crm7 #212`) initially showed patch-id mismatches. Manual investigation:

- **bsuite #147**: `gh pr view` returned a misleading main SHA (a later commit had `(#147)` matching a different reference). Re-grep'd commit message for `three-tier branding` and identified true main SHA `6f851b7`. Patch-ids match.
- **crm7 #212**: Both dev (`49cdaa5b`) and main (`fa9720bc`) commits are merge commits, so `git patch-id` on the merge SHA returned `EMPTY`. Direct `git diff dev_sha main_sha` produced empty output → content identical.

After overrides, all 26 PRs validated as class (a).

## 3. Per-repo audit tables

### 3.1 Parent `bsuite` (10 PRs)

| PR # | Title | Class | Files | Dev Merge SHA | Main Equiv SHA | Action |
|------|-------|-------|-------|---------------|----------------|--------|
| #137 | docs: mark roadmap items 26c + 27h complete | a | 1 | `972823e40e` | `51fbc8f` | NONE |
| #147 | feat(db): three-tier branding schema | a | 3 | `bed9516977` | `6f851b7` | NONE |
| #156 | chore(bsuite): add Node 24 pins to parent repo | a | 2 | `2ae4b3e2c0` | `f505404` | NONE |
| #176 | docs(bsuite): master roadmap v5.02W + AGENTS.md | a | 2 | `cdb8283447` | `368af7a` | NONE |
| #184 | docs(bsuite): ROADMAP rotation audit | a | 1 | `b81674dde4` | `0205445` | NONE |
| #187 | feat(packages): @bsuite/design-tokens | a | 11 | `41876ac363` | `cd4fa99` | NONE |
| #225 | feat(nav-core): v0.3.0 — tier, useFilteredNav, APPS constants | a | 6 | `2b6b561e6f` | `f2a0aa8` | NONE |
| #235 | chore(bsuite): bump crm7 ref — tenant-management crash-loop fix | a | 1 | `0e780eaae4` | `d3906ef` | NONE |
| #236 | chore(bsuite): bump BSU ref — bulletproof sign-out | a | 1 | `37e3c02bc2` | `cc21ed0` | NONE |
| #237 | chore(bsuite): bump crm7 + BSU refs — layout audit | a | 2 | `ce8109f496` | `d542707` | NONE |

### 3.2 Submodule `crm7` (16 PRs)

| PR # | Title | Class | Files | Dev Merge SHA | Main Equiv SHA | Action |
|------|-------|-------|-------|---------------|----------------|--------|
| #212 | fix(layout): bound MainLayout SidebarProvider shell height | a | 1 | `49cdaa5b4d` | `fa9720bc` | NONE |
| #235 | style(crm7): migrate Tailwind class patterns to v4 shorthand | a | 33 | `211777a7ce` | `e4b1a712` | NONE |
| #236 | chore(crm7): security + dep hygiene — CORS, markdown sanitize | a | 10 | `8bed49d16c` | `27d4b7b9` | NONE |
| #237 | chore(crm7): final wave — eslint-plugin-react-hooks v7, Compiler | a | 23 | `44a65cd12a` | `b3c46cc1` | NONE |
| #238 | chore(crm7): dep majors (recharts v3, lucide v1) + ContactSelector | a | 11 | `acaa356fbb` | `b1868235` | NONE |
| #239 | style(crm7): Tailwind v4 second-pass sweep | a | 27 | `6ca01137e3` | `db4c32f6` | NONE |
| #240 | fix(crm7): harden is_session_valid — check auth.sessions.not_after | a | 1 | `9cd0eaa45b` | `2e3a6af1` | NONE |
| #241 | feat(crm7): centralize OAuth UI to BSU — delete ~1900 lines | a | 18 | `b02b21dc63` | `d5ec4e70` | NONE |
| #242 | chore(crm7): delete orphaned UnifiedNavigation + barrel | a | 2 | `9bafdbd522` | `c4b8f601` | NONE |
| #243 | feat(crm7): add throughput to AppSwitcher + union | a | 1 | `8bc42a1b04` | `61702796` | NONE |
| #244 | feat(crm7): migrate AppSwitcher to @bsuite/nav-core@0.3.0 | a | 5 | `3afd162755` | `cb60ef9b` | NONE |
| #245 | fix(crm7): Jodie AI panel theme-adaptive + close button prominent | a | 4 | `8b8f4703e2` | `05189ac1` | NONE |
| #247 | fix(crm7): stop infinite reload loop on /settings/organization | a | 3 | `8b3af0dcc1` | `7c3444cf` | NONE |
| #248 | feat(crm7): add 5 missing tenant-management edge-function actions | a | 1 | `a06207af3f` | `26a663f8` | NONE |
| #249 | fix(crm7): rename 4 tenantService actions to match edge cases | a | 1 | `8496428ad2` | `8012ed97` | NONE |
| #250 | fix(crm7): dashboard widget stacking + scroll inflation | a | 2 | `bd40547fe4` | `06ab7e8d` | NONE |

## 4. Cherry-pick plan

**No cherry-picks required.** All 26 PRs are class (a) — content is on both branches.

If, contrary to this audit, a future inspection identifies a missed class-(b) PR, the cherry-pick command template is:

```bash
# Template — DO NOT RUN as part of this audit
cd /home/braden/Desktop/Dev/bsuite        # or .../bsuite/crm7
git fetch origin
git checkout development
git pull origin development
git checkout -b chore/cherry-pick-bypass-prs

# Apply in dependency order (oldest mergedAt first)
git cherry-pick -x <dev_merge_sha_1>
# ... resolve any conflicts ...
git cherry-pick -x <dev_merge_sha_2>

git push -u origin chore/cherry-pick-bypass-prs
gh pr create --base development --title "chore: cherry-pick bypass PRs missed by reconcile" --body "..."
```

## 5. Conflict resolution section

**No class-(c) PRs identified.** No manual conflict resolution required for the 26 audited PRs.

## 6. Dev-only-commit awareness (NOT part of bypass-PR scope)

The reconcile (`git reset --hard origin/main` on `origin/development`) would discard the following dev-only commits. **These are NOT from the 26 bypass PRs** — they are subsequent work on dev that hasn't been promoted to main yet. The user should decide whether to:

- (i) promote these to main FIRST via a normal `dev → main` PR, then reconcile (recommended), OR
- (ii) accept the loss (only safe if the work is already captured elsewhere — e.g., in npm-published packages, in submodule pointers, or in throwaway docs).

### 6.1 Parent `bsuite` — 20 dev-only commits

```
9fe6b6d 2026-04-23 fix(charge-calc): BUG-1 annual allowance ÷52 normalisation
6bbf61f 2026-04-25 docs(bsuite): WS-B orphan branch triage — 12 branches across 7 repos resolved
b04a27d 2026-04-25 docs(docs): WS-D colour-token cleanup audit + WCAG AA verification
5f37446 2026-04-25 docs: amend audit — @bsuite/theme 0.3.0 → 0.3.1 republish (preset-v4 fix)
bd0dea3 2026-04-25 docs(bsuite): operator handoff for finish-line session 2026-04-25
5326515 2026-04-25 feat(packages): @bsuite/dry-lint ESLint plugin for one-shot enforcement
1912ea3 2026-04-25 docs(bsuite): operator-screenshots stub directory (#273)
04a03c0 2026-04-25 chore(packages/theme): forward-port v0.3.1 source from npm
aa88a0e 2026-04-25 docs(bsuite): correct colour-token audit + add TOKEN-MAPPING.md (#276)
5e60be0 2026-04-25 docs(bsuite): dry-lint violation triage + tenant-management ownership decision (#275)
274a98c 2026-04-25 chore(bsuite): bump submodule pointers to current development HEADs (finish-line session)
3ffdcf0 2026-04-25 docs(bsuite): WS-H finish-line doc archival sweep — parent scope
ed3574a 2026-04-25 chore(bsuite): bump submodule pointers post-WS-H + WS-B recoveries (final pre-WS-J)
41bc083 2026-04-25 chore(bsuite): ignore .claude/ + .playwright-mcp/ session artefacts
c6d23b9 2026-04-25 docs(bsuite): finish-line sign-off + DoD scorecard + refined-prompt artefacts
1707af7 2026-04-27 docs(bsuite): ownership-map ratification doc — surfacing 3 doctrine-vs-reality drifts
c4a5624 2026-04-27 docs(bsuite): clarify Conduit cookie-SSO with delegated login UI (1b doctrine fix)
d1d78f2 2026-04-27 docs(bsuite): WS-J branch protection enforcement across all 7 repos
5d4920a 2026-04-27 docs(bsuite): restore Xero (Part O.2) to operator handoff as 7th item (#281)
ed4ecf7 2026-04-27 docs(bsuite): @bsuite/theme@0.3.0 yank narrative + npm deprecation (#282)
```

### 6.2 Submodule `crm7` — 6 dev-only commits

```
33d7a3d4 2026-04-25 chore(crm7): bump @bsuite/theme to ^0.3.0
aa20899b 2026-04-25 chore(crm7): bump @bsuite/theme to ^0.3.1 (preset-v4 nested-comment fix)
3a088433 2026-04-25 fix(crm7): bump @bsuite/nav-core to ^0.5.0 + clean orphaned lockfile entries
63f25484 2026-04-25 feat(crm7): @bsuite/dry-lint warn-mode rule for one-shot enforcement (#311)
91771de2 2026-04-25 docs(crm7): WS-H finish-line archive — duplicate parent plan docs
dcf7f3cb 2026-04-27 fix(crm7): pin pnpm@10.30.3 (doctrine #4 — 10.32.1 has _linkBins bug)
```

### 6.3 Recommended path

A **dev → main promotion PR** in each repo would absorb all class-a PRs (already on main, no-op) AND merge the dev-only commits forward. This is preferable to `git reset --hard` because it preserves the dev-only work. Suggested sequence (per repo):

```bash
# Per-repo
gh pr create --base main --head development \
  --title "chore: promote development → main (post bypass-PR audit)" \
  --body "Audit per docs/20260427-bypass-pr-audit-v1.00W.md confirms bypass PRs already on both branches; this PR forward-merges $(N) dev-only commits."
```

If the user nevertheless prefers `git reset --hard origin/main`, the dev-only commits above MUST be re-cherry-picked after the reset to avoid loss.

## 7. Reproducibility — re-running this audit

```bash
# 1. Pull all 26 PR metadata
mkdir -p /tmp/bypass-audit && cd /tmp/bypass-audit
for pr in 237 236 235 225 187 184 176 156 147 137; do
  gh pr view $pr --repo GaryOcean428/bsuite --json number,title,mergeCommit,baseRefName,files > "bsuite-${pr}.json"
done
for pr in 250 249 248 247 245 244 243 242 241 240 239 238 237 236 235 212; do
  gh pr view $pr --repo GaryOcean428/crm7 --json number,title,mergeCommit,baseRefName,files > "crm7-${pr}.json"
done

# 2. For each PR, verify reachability + patch-id equivalence (script: see /tmp/bypass-audit/cherry-status.json)
# 3. Compare to dev-only commit list:
git -C /home/braden/Desktop/Dev/bsuite cherry origin/main origin/development | grep "^+"
git -C /home/braden/Desktop/Dev/bsuite/crm7 cherry origin/main origin/development | grep "^+"
```

## 8. Audit completeness checklist

- [x] All 26 PRs metadata pulled
- [x] Each PR's introduced patch verified on dev (via `git merge-base --is-ancestor`)
- [x] Each PR's introduced patch verified on main (via `git log --grep`)
- [x] Patch-id equivalence confirmed for 24/26 PRs directly + 2/26 via manual investigation
- [x] No class-(b) PRs identified → no cherry-pick plan needed
- [x] No class-(c) PRs identified → no manual conflict resolution required
- [x] Dev-only commits enumerated (20 bsuite + 6 crm7) for operator awareness
- [x] Reconcile path recommendation documented (dev→main promotion PR preferred over hard reset)

## 9. Sign-off

This audit certifies that the 26 named bypass PRs are NOT a blocking constraint on the planned reconcile. The reconcile path remains an operator decision based on §6.3 (recommendation: dev→main promotion PR rather than `git reset --hard`).
