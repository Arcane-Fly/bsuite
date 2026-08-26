# dev ↔ main Fork RCA — bsuite parent + crm7

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

- **Date:** 2026-04-27
- **Status:** F (Frozen — pre-reconcile gate analysis)
- **Author:** automated agent (RCA only — no reconcile, no enforcement changes)
- **Scope:** `GaryOcean428/bsuite` (parent monorepo) + `GaryOcean428/crm7` (submodule)

---

## TL;DR

Both repos exhibit verdict **(C) Hybrid — but the dominant root cause is neither (A) nor (B) as
originally hypothesised**. The actual mechanism is **dual-merging**: GitHub's PR-merge button creates
one merge commit (its `merge_commit_sha`), then a SECOND, independently-constructed `dev → main`
merge commit with the same title is force-pushed to `main` from a local workstation, replacing
GitHub's merge. The two merges have **identical trees** but **different SHAs and different parent
chains** — so `git rev-list main..dev` cannot reconcile them.

This is silently destroying GitHub's merge ancestry on every promotion cycle and is the direct cause
of the `260 ahead / 406 behind` (parent) and `1122 ahead / 1212 behind` (crm7) divergence numbers.

| Repo | Verdict | Dominant cause | Subordinate cause |
|------|---------|----------------|-------------------|
| `bsuite` (parent) | **C — Hybrid** | Dual-merge / force-push of main | Direct commits to main via `chore/bump-*` PRs that do NOT also land on dev |
| `crm7` | **C — Hybrid** | Dual-merge / squash-merge ambiguity on main | Feature-branch PRs (`fix/*`, `chore/*`, `feat/*`) merged direct to main, never replayed onto dev |

Branch protection on `main` is **functionally absent** in both repos: only one CI check (`gitleaks`
on parent, `build-and-test` on crm7), `enforce_admins=false`, `allow_force_pushes=true`,
`required_pull_request_reviews=null`. So force-pushes succeed silently and PRs can be merged with
zero approvals.

**Reconcile cannot proceed safely until branch protection is locked down on `main` in both repos.**
Otherwise the very next promotion cycle will recreate the same skew.

---

## Methodology

For each repo, the following were measured:

1. Merge vs non-merge ratio in last 100 main commits (`git log --pretty='%h %p'` with parent count).
2. Branch protection state (`gh api .../branches/main/protection`).
3. PR target audit — which branches merged into main (`gh pr list --base main`).
4. Squash-merge detection — examined parent count of each PR's `merge_commit_sha`.
5. Existence check — does each PR's `merge_commit_sha` actually appear on `main`?
6. Patch-id semantic equivalence — do main commits match dev commits by content?
7. Push event log — `gh api .../events --jq 'select(.type=="PushEvent")'` to detect non-FF/force pushes.

---

## Repo 1: `GaryOcean428/bsuite` (parent)

### Divergence

| Metric | Value |
|--------|-------|
| Common ancestor SHA | `c144b30d` ("chore: stage pending changes before branch switch", 2026-03-04) |
| Commits on dev since divergence | 263 |
| Commits on main since divergence | 406 |
| `git cherry main..dev` | 16 unique to dev (`+`), 223 same patch in main (`-`) |
| `git cherry dev..main` | 150 unique to main (`+`), 223 same patch in dev (`-`) |

### Branch protection state

```json
{
  "required_status_checks": { "contexts": ["gitleaks"], "strict": false },
  "required_signatures": { "enabled": false },
  "enforce_admins": { "enabled": false },
  "required_linear_history": { "enabled": false },
  "allow_force_pushes": { "enabled": true },        // <-- THE HOLE
  "allow_deletions": { "enabled": false },
  "required_pull_request_reviews": null,            // <-- THE OTHER HOLE
  "lock_branch": { "enabled": false }
}
```

`main` accepts **direct pushes** and **force-pushes** with **zero PR/review requirement**. The only
gate is one gitleaks status check, and even that is non-strict.

### Direct-vs-merge commit ratio (last 100 main commits)

- **Merge commits:** 10
- **Direct commits:** 90

90% of recent main commits are **direct commits** (single parent). Many are `chore(bsuite): bump
submodules…` style — these were committed locally and pushed directly to main, bypassing dev.

### Smoking gun: dual-merge of PR #265

PR #265: `base=main`, `head=development`, title `"chore(bsuite): promote development → main"`,
merged 2026-04-23 11:27:31Z.

GitHub returned `merge_commit_sha = 1a4b30bc791c449fce7faf6110ecbc8998dab0cd`.

Actual commit on main with title "Merge pull request #265 from GaryOcean428/development" =
`5baf2b22c164b29d260c680b583143ac763d5194`.

| | `1a4b30bc` (GitHub's merge) | `5baf2b22` (actual main merge) |
|---|---|---|
| Parents | `[ca40a3d, c62f131]` | `[1939a13, 51e6a84]` |
| Tree | `b23144934797ec87e33c724c8aacb4ab1e632ce4` | `b23144934797ec87e33c724c8aacb4ab1e632ce4` |
| Title | "Merge pull request #265 from GaryOcean428/development" | "Merge pull request #265 from GaryOcean428/development" |
| Reachable from origin/main | NO | YES |
| Reachable from origin/development | NO | NO |

**Trees are identical, parents differ. This proves a SECOND merge commit was constructed
independently and force-pushed to main, replacing GitHub's auto-merged commit.**

The same pattern is visible for PRs #263, #259, #253, #249, #248, #247, #246: every one of them has
`merge_commit_sha` returned by the API that is **not on main**, but each has a same-titled "Merge
pull request #N" commit on main with a different SHA and different parent set.

### Direct-to-main `chore/bump-*` PRs

PR audit (`gh pr list --base main`) shows several PRs whose head is NOT `development`:

| PR | head branch | merged |
|----|-------------|--------|
| #237 | `chore/bump-refs-layout-audit` | 2026-04-20 |
| #236 | `chore/bump-crm7-tenant-management-fix` | 2026-04-20 |
| #235 | `chore/bump-crm7-tenant-management-fix` | 2026-04-20 |
| #225 | `feat/nav-core-v0.3-tier-filtered-nav` | 2026-04-19 |
| #187 | `feat/design-tokens-package` | 2026-04-15 |
| #184 | `claude/festive-newton-NU4GF` | 2026-04-15 |
| #176 | `claude/festive-newton-jnhPW` | 2026-04-15 |
| #156 | `claude/festive-newton-qfQih` | 2026-04-14 |
| #147 | `feat/branding-schema-three-tier` | 2026-04-14 |
| #137 | `docs/mark-implemented-items` | 2026-04-14 |

These PRs landed directly on main and were never replayed onto dev — they appear in `git
cherry main..dev` as `+` (unique-to-main) entries.

### Cascade snapshot orphan commits

`git log --all` on the parent shows 10+ "Cascade snapshot YYYY-MM-DDTHH:MM:SS" commits sitting on
no tracked branch. These are auto-snapshots from Codeium Cascade IDE. Their existence indicates the
local workstation is doing aggressive timestamped commits — the same workflow that builds the
locally-constructed dev→main merge that gets force-pushed.

### Verdict — parent

**(C) Hybrid.** Dominant cause: dual-merge / force-push of locally-built `dev → main` merge commits,
overwriting GitHub's PR-button merges. Subordinate cause: feature/chore PRs targeting main directly
without dev as base, never back-ported to dev.

---

## Repo 2: `GaryOcean428/crm7` (submodule)

### Divergence

| Metric | Value |
|--------|-------|
| Common ancestor SHA | `2c90f9da` ("Complete WCAG 2.1 AA compliance implementation…") |
| Commits on dev since divergence | 1124 |
| Commits on main since divergence | 1214 |
| `git cherry main..dev` | 5 unique to dev (`+`), 1052 same patch in main (`-`) |
| `git cherry dev..main` | 85 unique to main (`+`), 1055 same patch in dev (`-`) |

### Branch protection state

```json
{
  "required_status_checks": { "contexts": ["build-and-test"], "strict": false },
  "enforce_admins": { "enabled": false },
  "allow_force_pushes": { "enabled": true },        // <-- SAME HOLE
  "required_pull_request_reviews": null,            // <-- SAME HOLE
  "lock_branch": { "enabled": false }
}
```

Identical posture to parent — main accepts direct pushes, force pushes, no PR-review requirement.

### Direct-vs-merge ratio (last 100 main commits)

- **Merge commits:** 10
- **Direct commits:** 90

Same 90/10 ratio as parent.

### Smoking gun: PR #234 squash-merged inconsistently

PR #234: `base=main`, `head=development`, title `"Merge development into main"`,
`merge_commit_sha = 0beed62c8d5a25d1207dd4734358c4e2cfa2cb03`, commits=3.

`0beed62c` has **only 1 parent** (squash-merge style) — but it is **NOT on main**. It IS on
`origin/development`.

Actual commit on main with title matching #234 = `937feca6` (with `(#234)` suffix). Different SHA.

This means PR #234 was **squash-merged into main**, but the squash result on main was rewritten as
a separate commit (`937feca6`). The original squash commit `0beed62c` ended up landing on **dev**
instead of main — likely from a "Update branch" / "Sync from main" GitHub click that pushed the
squash commit back into the head branch.

### Recent PRs targeting main with `head ≠ development`

| PR | head branch |
|----|-------------|
| #250 | `fix/dashboard-layout-and-scroll-container` |
| #249 | `fix/tenant-management-action-renames` |
| #248 | `fix/tenant-management-missing-actions` |
| #247 | `fix/organization-crash-loop` |
| #245 | `fix/crm7-jodie-panel-theme-and-close` |
| #244 | `feat/crm7-use-shared-nav-core` |
| #243 | `feat/crm7-add-app-switcher` |
| #242 | `chore/crm7-delete-orphaned-unified-navigation` |
| #241 | `feat/crm7-oauth-centralization` |
| #240 | `chore/crm7-recover-stash-value` |
| #239 | `style/crm7-tailwind-v4-sweep-2` |
| #238 | `perf/crm7-deps-and-lazy-load-2026q2` |
| #237 | `chore/crm7-final-wave-2026q2` |
| #236 | `chore/crm7-security-dep-hygiene-2026q2` |
| #235 | `style/crm7-tailwind-v4-syntax` |
| #212 | `copilot/fix-sidebar-provider-layout` |

Each of these `feature → main` PRs creates content on main that is **never replayed onto dev**,
because dev is being kept in lock-step only via the periodic `dev → main` promotion PRs (which
themselves get rewritten by the dual-merge mechanism above).

### Patch-id semantic equivalence — last 5 main commits

| Main SHA | Title | Equivalent on dev? |
|---------|-------|-------------------|
| `8e6dd651` | Merge pull request #308 from development | YES (dev `91771de2`) |
| `275885b8` | test(crm7): smoke spec accept either login spinner OR misconfigured marker | **NO** |
| `2a94d816` | fix(crm7): use [min-height:100svh] arbitrary syntax on App.tsx root | **NO** |
| `945cc22f` | fix(crm7): silence 5 build warnings | **NO** |
| `1fa401e1` | fix(crm7): require VITE_BSU_URL on BS-OAuth paths | **NO** |

4 of 5 most recent main commits have **no patch-id equivalent on dev**. These commits are reachable
only from `main` and from one branch (`fix/phase0-ci-repair`).

### Verdict — crm7

**(C) Hybrid.** Dominant cause: dual-merge / squash-merge ambiguity (GitHub's `merge_commit_sha`
for promotion PRs frequently does not land on main as-is — main gets a different SHA via local
re-merge or squash). Subordinate cause: large volume of feature-branch PRs merged direct to main
that were never replayed onto dev.

---

## What this means for reconcile

### Why the original hypotheses were both wrong

- **(A) Hotfixes bypassing development** — partially true, but the volume of bypass commits (e.g.
  `chore/bump-*` direct-to-main PRs) is small relative to the 406/1212 numbers. Not enough to
  explain the magnitude alone.
- **(B) Squash-merge skew** — wrong as primary cause. PR-merge commits on main predominantly have
  **2 parents** (proper merge commits), not 1 (squash). The skew comes from a different mechanism.

### The real mechanism — "Dual-merge force-push"

1. GitHub renders a "Merge pull request" button. Operator clicks it. GitHub creates a real merge
   commit (e.g. `1a4b30bc`) at GitHub's view of HEAD-of-main, pushes it to main.
2. Locally (likely from Cascade IDE), the operator does `git checkout main && git merge
   origin/development` against a **different** view of main HEAD (because operator's local main was
   stale, or operator was working from a worktree).
3. This produces a SECOND merge commit (e.g. `5baf2b2`) with identical tree but different parents.
4. Operator then `git push --force origin main` (allowed by current branch protection), overwriting
   GitHub's merge with the local one.
5. Net effect: dev's commits end up content-wise on main, but the SHA chain is broken. Dev's
   former tip is now un-referenced from main; main's actual tip is unknown to dev.

### Required remediation order

This is **NOT safe to reconcile** until the workflow hole is plugged. If `main` were `git
reset --hard origin/main`-onto-dev today, the very next promotion would recreate the skew because:

- `allow_force_pushes=true` permits the dual-merge force-push to succeed silently.
- `required_pull_request_reviews=null` permits PRs to be merged without review (no second pair of
  eyes catches the wrong-base-branch).
- No `required_linear_history` means GitHub will accept the alternative merge commit as valid main
  history.

### Recommended sequencing

1. **GATE: lock down branch protection on main** (both repos). See follow-up issue draft below.
2. **GATE: lock down branch protection on development** (matching). Both branches currently have
   `allow_force_pushes=true`.
3. Audit all `chore/bump-*` and `feat/*` direct-to-main PRs since 2026-04-14 — list of bypass PR
   numbers above. For each: confirm whether content also exists on dev. If not, cherry-pick
   forward to dev BEFORE doing the bulk reconcile.
4. **Once protection is locked**, the choice for the reconcile mechanism becomes:
   - **Option A (preserve dev's unique work):** create a `chore/dev-main-reconcile` branch from
     main, cherry-pick the 16 unique-to-dev (parent) / 5 unique-to-dev (crm7) commits identified
     by `git cherry main..dev` (the `+` lines), open as PR back to main, then `git reset --hard
     origin/main` on dev once merged.
   - **Option B (treat dev as the source of truth and rebuild main):** much more disruptive,
     requires opening a single mega-PR from current dev → main with `--allow-unrelated-histories`,
     manual conflict resolution. Not recommended given tooling complexity and the risk of losing
     `feat/*` work that landed direct on main.
5. After reconcile: enable `delete_branch_on_merge=true` and a workflow-guard that rejects PRs
   targeting `main` whose head is not exactly `development` (or `release/*` / `hotfix/*` if those
   are added to the policy).

---

## Follow-up issue draft (do not file yet — operator decision)

**Title:** `chore: enforce PR-only merges to main on bsuite-suite repos (frozen-decision #1
enforcement gap)`

**Body:**

```markdown
## Context

Frozen decision #1 in `docs/20260227-contributing-standards-guide-v1.00A.md` requires that all
work flow `feature → development → main`, with main only ever updated via PR from `development`.

The 2026-04-27 RCA (`docs/20260427-dev-main-fork-rca-v1.00F.md`) confirmed this rule has been
silently violated across both `bsuite` parent and `crm7` for the entire current development
cycle, producing 406 / 1212 commits of divergence on main vs dev — most of it being identical
content with mismatched SHAs because of dual-merge force-pushes.

## Root cause

- `gh api repos/GaryOcean428/bsuite/branches/main/protection` returns:
  - `allow_force_pushes: true`
  - `required_pull_request_reviews: null`
  - `enforce_admins: false`
  - `required_linear_history: false`
- Same posture on `crm7`.
- This permits both (a) direct pushes/force pushes to main and (b) PRs to be merged with zero
  reviews, both of which have happened in production.

## Proposed remediation

For BOTH `GaryOcean428/bsuite` and `GaryOcean428/crm7` (and ideally extended to all 7 bsuite-suite
repos: bsuite parent, business-suite-unified, crm7, conduit, braden, R80.3, throughput):

```bash
# main branch protection (both repos)
gh api -X PUT repos/GaryOcean428/<repo>/branches/main/protection \
  -F required_status_checks.strict=true \
  -F 'required_status_checks.contexts[]=<existing-check>' \
  -F enforce_admins=true \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_linear_history=true \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F lock_branch=false \
  -F required_conversation_resolution=true \
  -F restrictions=null

# Optional: restrict PRs targeting main to specific source branches via Rulesets API
# (gh api repos/.../rulesets) — restrict head branch to /^(development|release\/.*|hotfix\/.*)$/
```

Apply the same protection (minus `required_linear_history`) to `development`.

## Acceptance criteria

- [ ] Both `bsuite` and `crm7` `main` branches reject force-push attempts (verify with
  `git push --force origin main` from a sandbox clone — should return `! [remote rejected]`).
- [ ] Both `main` branches require at least 1 PR review.
- [ ] Both `main` branches require linear history (no merge commits with multiple parents from
  unrelated histories).
- [ ] An operator-attempted local re-merge + push fails (cannot dual-merge).
- [ ] Documentation updated at `docs/20260227-contributing-standards-guide-v1.00A.md` to add the
  branch-protection enforcement as a normative rule, not a convention.

## Bypass commits found (parent, last 30 days)

PRs from non-`development` head branches that landed on main: #237, #236, #235, #225, #187, #184,
#176, #156, #147, #137. Each needs a back-port assessment to dev.

## Bypass commits found (crm7, last 30 days)

PRs from non-`development` head branches that landed on main: #250, #249, #248, #247, #245, #244,
#243, #242, #241, #240, #239, #238, #237, #236, #235, #212. Each needs a back-port assessment to
dev.
```

---

## Appendix — raw measurements

### Parent: PRs with `merge_commit_sha` not present on main

(Sampled last 10 PRs from `gh pr list --base main --state merged`)

| PR | API merge_sha | On main? | Actual main commit |
|----|---------------|----------|---------------------|
| #268 | `d1c69ec27225c1112887f605b6ab3e0def31bff1` | YES | (same) |
| #267 | `5dbfbfff5e0cf2f885e44a936e527f4b43b21034` | YES | (same) |
| #265 | `1a4b30bc791c449fce7faf6110ecbc8998dab0cd` | **NO** | `5baf2b22c164b29d260c680b583143ac763d5194` |
| #263 | `ca40a3d8f8ad6e17c34ce11e5d28c53b9a579c69` | **NO** | `1939a13195d444bfae4f2ed89bc1623c485d5007` (rewritten) |
| #259 | `1b11f43c09ddd1905cb417009101e79f0139472f` | **NO** | `454c624b1e0f739719ca5983e36761bf78af73ca` (rewritten) |
| #253 | `2ed375a8a78a3d8337a13c329c4f9ee4e72db626` | **NO** | `34c72f90103c3a63b86ef0af5a93a1f1dde26bae` (rewritten) |
| #249 | `08d1e84b0b4d49dff582281f11f5bd5927929605` | **NO** | (rewritten) |
| #248 | `303fd7051e779f9edbb5fe27d65a3249c49f9d88` | **NO** | (rewritten) |
| #247 | `a250ab066aa9c8102db7b256a8d684d1105b23b7` | **NO** | (rewritten) |
| #246 | `ba963a43b76ba121d18cec4bfcd533cbcfd72ec4` | **NO** | (rewritten) |

8 of 10 most recent PRs to main on parent have their GitHub-merge SHA dropped from main.

### CRM7: PRs with `merge_commit_sha` not present on main

| PR | API merge_sha | On main? | Actual main commit |
|----|---------------|----------|---------------------|
| #308 | `8e6dd65164e34a47160d450268bfa95b7b55d65b` | YES | (same) |
| #300 | `7774a3235e9d1491261da42cc3069a5abf4fd724` | YES | (same) |
| #297 | `cacaaef30fe867dbce5cf0b9e781f8006cf47a14` | YES | (same) |
| #234 | `0beed62c8d5a25d1207dd4734358c4e2cfa2cb03` | **NO — squash** | `937feca6` |

For PR #234, the GitHub merge_commit_sha has only **1 parent** (squash), and lives on
`origin/development` (not main). The actual main-side commit of the same PR is `937feca6`.

### Sources

- `git rev-list --count origin/main..origin/development` (parent: 263, crm7: 1124)
- `git rev-list --count origin/development..origin/main` (parent: 406, crm7: 1214)
- `gh api repos/GaryOcean428/<repo>/branches/main/protection`
- `gh pr list --base main --state merged --limit 30`
- `gh api repos/GaryOcean428/<repo>/events --jq '.[] | select(.type=="PushEvent")'`
- `git cat-file -p <merge_sha>` for parent count
- `git log -1 --pretty=%T <sha>` for tree-equality test
- `git merge-base --is-ancestor <sha> <ref>` for reachability
- `git cherry origin/main origin/development` for patch-id equivalence

---

**Status:** Analysis complete. **No reconcile, no protection changes, no PRs opened.** Operator
must decide on enforcement before any reconcile work begins.
