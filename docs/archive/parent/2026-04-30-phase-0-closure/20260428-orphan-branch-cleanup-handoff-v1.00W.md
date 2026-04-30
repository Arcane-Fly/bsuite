# Orphan Branch Cleanup Handoff

**Status:** W (Working — pickup spec for next session)
**Date:** 2026-04-28
**Goal:** End state with **only** `main` + `development` branches across all 7 repos. Zero orphan/feature/release branches. Zero unmerged-but-valuable work lost in the cleanup.
**Predecessor:** `docs/20260428-finish-line-final-signoff-v3.00W.md` + `docs/20260428-operator-handoff-v4.00W.md` (both work-complete; this doc is the source-control-hygiene followup).

---

## Where we are now

After today's `ship-all-apps` execution, every repo's `development` and `main` are content-aligned (`dev_only=0` per `git rev-list --count origin/main...origin/development`; the `main_only=1` is the dev→main merge commit, normal gitflow steady state).

**However**, 47 remote orphan branches remain across the 7 repos. They show as "unmerged" by `git branch -r --no-merged origin/main` because most were **squash-merged** — content landed on main but with different commit SHAs, so git's reachability-based merge check still flags the original branch as unmerged.

The session deleted local branches that `git` could verify as merged, but the cherry-mark equivalence check (`git log --right-only --cherry-mark`) returned 0 matches — that check needs identical commit IDs which squash merging breaks.

**Therefore:** orphan REMOTE branches need a **content-equivalence audit**, not a reachability audit, to determine if they can be safely deleted.

---

## Content-equivalence verification recipe (per branch)

For each orphan branch, run this in the repo's worktree:

```bash
# Replace BRANCH and REPO_DIR for each row
cd /home/braden/Desktop/Dev/bsuite/<REPO_DIR>
git fetch origin --prune --quiet

BRANCH="<orphan-branch-name>"

# 1. Hard check: does main's tree contain identical content for the files this branch touched?
files=$(git diff --name-only "origin/main...origin/$BRANCH" | head -20)
echo "Files this branch modifies vs main:"
echo "$files"

# 2. For each file, compare branch tip vs main
echo ""
echo "Per-file content match (1 = differs, 0 = identical):"
for f in $files; do
  d=$(git diff --quiet "origin/main:$f" "origin/$BRANCH:$f" 2>/dev/null && echo 0 || echo 1)
  echo "  $d $f"
done

# 3. Squash-equivalence shortcut: get the patch hash of the branch's unique commits
echo ""
echo "Branch's net diff vs main (empty = fully on main):"
git diff "origin/main...origin/$BRANCH" --stat | tail -5
```

**Decision rule:**

| Output | Action |
|---|---|
| Per-file match all `0` AND empty stat output | ✅ Safe to delete — content is on main |
| Some files differ AND last commit date older than main's last release merge | ⚠️ Likely squash-merge skew on the differing files. Spot-check 1-2 differing files; if differences are `<<<<<<<` markers from old conflicts or are minor whitespace, safe to delete. Otherwise file an issue. |
| Some files differ AND branch has commits more recent than main's last release | 🛑 Real unmerged work. **Open a fresh PR `branch → development` from this branch BEFORE deleting.** |
| Branch is named `reconcile/*`, `sync/*`, `release/*` from a prior cycle | These are usually safe. Their purpose was to land work that's now on main. Verify with the patch-hash check above and delete. |

---

## The 47 orphan branches (audited 2026-04-28 02:30 UTC)

### Parent monorepo (`bsuite`) — 18 branches

| Branch | Last commit | Last commit msg | Likely status |
|---|---|---|---|
| `chore/parent-stash-prior-session-docs` | 2026-04-28 | "commit 4 prior-session docs left untracked" | ✅ superseded by PR #316 (merged) |
| `chore/parent-submodule-pointer-bump-20260428` | 2026-04-28 | "bump submodule pointers to post-release main HEADs" | ✅ superseded by PR #317 (merged) |
| `codex/dry-lint-docs-lock` | 2026-04-27 | "docs(dry-lint): document error-level ownership enforcement" | ✅ likely on main via PR #310 |
| `codex/phase2-docs-complete` | 2026-04-27 | "docs(phase2): record shared package completion" | ✅ likely on main via PR #311 |
| `codex/phase2-ledger-dry-lint-followup` | 2026-04-27 | "docs(ledger): remove stale dry-lint backlog item" | ✅ likely on main via PR #312 |
| `codex/phase2-redteam-doc-fixes` | 2026-04-27 | "docs(phase2): reconcile red-team stale wording" | ✅ likely on main via PR #313 |
| `docs/20260428-codex-phase-2-plan` | 2026-04-27 | "docs(plans): Codex Phase 2 shared-packages execution plan v1.00W" | ✅ superseded by PR #299 (merged) |
| `docs/20260428-finish-line-final-signoff-v4` | 2026-04-27 | "docs(bsuite): WS-η finish-line final signoff v3.00W" | ✅ superseded by PR #298 (merged) |
| `docs/20260428-operator-handoff-v4` | 2026-04-28 | "operator handoff v4.00W — all v3.00W items + 3 branding bugs closed" | ✅ superseded by PR #314 (merged) |
| `docs/codex-phase0-handoff-v4` | 2026-04-27 | "record codex phase0 verification handoff" | ⚠️ verify content on main; may be a separate handoff variant |
| `docs/operator-handoff-clarity` | 2026-04-27 | "rewrite operator handoff for clarity (7 items, sequential)" | ✅ closed via PR #290 (superseded by v4.00W) |
| `fix/parent-dom-env-delimiter-20260427` | 2026-04-27 | "fix(bsuite): terminate dom lint env summary" | ⚠️ verify whether this CI fix landed on main |
| `phase2/theme-logo-source-reconcile-20260427` | 2026-04-27 | "fix(theme): reconcile platform logo helper source" | ✅ likely superseded by PR #311's @bsuite/theme@0.3.3 ship |
| `reconcile/parent-main-into-development-20260427` | 2026-04-27 | "Merge main into reconcile/parent-main-into-development" | ✅ superseded by reconcile/parent/main-into-dev-resolve and PR #318 |
| `reconcile/parent/integration-20260428` | 2026-04-27 | "fix(bsuite-ci): oauth-provider-check refs — BSU branch master→main" | ✅ superseded by PR #294 (merged) |
| `reconcile/parent/main-into-dev-resolve` | 2026-04-27 | "merge: main → development — resolve squash-merge skew post-WS-ε" | ✅ superseded by PR #297 (merged) |
| `release/parent-phase0-docs-to-main-20260427` | 2026-04-27 | "address phase0 handoff review" | ⚠️ verify content; may have docs unique to this branch |
| `sync/parent-main-to-development-20260427` | 2026-04-27 | "sync(bsuite): fold main phase0 docs back to development" | ✅ superseded by PR #297 (merged) |

### `crm7` — 8 branches

| Branch | Last commit | Last commit msg | Likely status |
|---|---|---|---|
| `chore/dry-lint-0.2.0-remove-phase-3c-disables` | 2026-04-27 | "remove PHASE-3c eslint-disables" | ✅ superseded by PR #317 (merged in earlier session) |
| `codex/dry-lint-app-override-hardening` | 2026-04-27 | "pin dry-lint app ownership enforcement" | ✅ likely on main via Phase 2 work |
| `codex/dry-lint-error-enforcement` | 2026-04-27 | "enforce dry-lint ownership rule" | ✅ likely on main via Phase 2 work |
| `fix/crm7-tga-cron-vault-migrations-codified` | 2026-04-28 | "codify 2 production migrations for TGA cron + Vault config" | ✅ superseded by PR #328 (merged) |
| `phase2/theme-033-bump-20260427` | 2026-04-27 | "bump @bsuite/theme to 0.3.3" | ✅ likely on main via Phase 2 work |
| `phase2/theme-logo-callsite-migration-20260427` | 2026-04-27 | "use shared platform logo resolver" | ✅ likely on main via Phase 2 work |
| `reconcile/crm7/integration-20260428` | 2026-04-27 | "WS-δ reconcile blocker surface" | ✅ superseded by PR #318 (merged) |
| `release/theme-033-main-20260427` | 2026-04-27 | "ship theme 0.3.3 logo resolver" | ✅ likely on main via direct release |

### `R80.3` — 5 branches

| Branch | Last commit | Last commit msg | Likely status |
|---|---|---|---|
| `codex/dry-lint-app-override-hardening` | 2026-04-27 | "pin dry-lint app ownership enforcement" | ✅ on main via PR #117 |
| `codex/dry-lint-error-enforcement` | 2026-04-27 | "enforce dry-lint ownership rule" | ✅ on main via PR #116 |
| `phase2/theme-033-bump-20260427` | 2026-04-27 | "bump @bsuite/theme to 0.3.3" | ✅ on main via PR #111 |
| `release/theme-033-main-20260427` | 2026-04-27 | "always create dom layout required check" | ⚠️ verify CI workflow on main |
| `sync/theme-033-main-back-to-dev-20260427` | 2026-04-27 | "sync dom layout trigger to development" | ⚠️ verify CI workflow on dev |

### `braden` — 2 branches

| Branch | Last commit | Last commit msg | Likely status |
|---|---|---|---|
| `codex/dry-lint-app-override-hardening` | 2026-04-27 | "pin dry-lint app ownership enforcement" | ✅ on main via PR #164 |
| `codex/dry-lint-error-enforcement` | 2026-04-27 | "enforce dry-lint ownership rule" | ✅ on main via PR #163 |

### `business-suite-unified` — 11 branches

| Branch | Last commit | Last commit msg | Likely status |
|---|---|---|---|
| `chore/dry-lint-0.2.0-bump` | 2026-04-27 | "bump @bsuite/dry-lint ^0.1.1 → ^0.2.0" | ✅ on main via PR #201 |
| `codex/dry-lint-app-override-hardening` | 2026-04-27 | "pin dry-lint app ownership enforcement" | ✅ on main via PR #214 |
| `codex/dry-lint-error-enforcement` | 2026-04-27 | "enforce dry-lint ownership rule" | ✅ on main via PR #213 |
| `fix/bsu-edge-fn-env-var-names` | 2026-04-27 | "register conduit oauth client surfaces" | ⚠️ verify — different message than PR #202 which was "fix(bsu): align oauth-{microsoft,google}-email env var names" |
| `fix/bsu-logo-css-preflight-and-branding-bugs` | 2026-04-28 | "codify 3 production migrations for branding bug fixes" | ✅ superseded by PR #215 (merged) |
| `fix/oauth-email-empty-secret-guard-20260427` | 2026-04-27 | "fail closed on empty oauth email secrets" | ⚠️ verify whether this fail-closed guard landed on main |
| `fix/oauth-email-secret-review-followup-20260427` | 2026-04-27 | "harden oauth email env fallbacks" | ⚠️ verify whether this hardening landed on main |
| `phase2/theme-033-bump-20260427` | 2026-04-27 | "bump @bsuite/theme to 0.3.3" | ✅ likely on main via Phase 2 work |
| `phase2/theme-logo-callsite-migration-20260427` | 2026-04-27 | "use shared platform logo resolver" | ✅ likely on main via Phase 2 work |
| `release/theme-033-main-20260427` | 2026-04-27 | "run required checks on main prs" | ⚠️ verify CI workflow on main |
| `sync/theme-033-main-back-to-dev-20260427` | 2026-04-27 | "sync main ci trigger to development" | ⚠️ verify CI workflow on dev |

### `conduit` — 10 branches

| Branch | Last commit | Last commit msg | Likely status |
|---|---|---|---|
| `chore/dry-lint-0.2.0-bump` | 2026-04-27 | "bump @bsuite/dry-lint ^0.1.0 → ^0.2.0" | ✅ on main via PR #120 |
| `codex/dry-lint-app-override-hardening` | 2026-04-27 | "pin dry-lint app ownership enforcement" | ✅ on main |
| `codex/dry-lint-error-enforcement` | 2026-04-27 | "enforce dry-lint ownership rule" | ✅ on main |
| `phase2/theme-033-bump-20260427` | 2026-04-27 | "bump @bsuite/theme to 0.3.3" | ✅ on main |
| `reconcile/conduit-main-into-dev-20260427` | 2026-04-27 | "merge: main into development reconcile" | ✅ superseded by PR #140 (merged) |
| `release/conduit-bsu-oauth-21-merge` | 2026-04-27 | "Merge development into release/conduit-bsu-oauth-21" | ✅ superseded by PR #122 (merged in earlier session) |
| `release/conduit-development-to-main-20260427` | 2026-04-27 | "verify bs oauth token in middleware" | ⚠️ verify whether middleware token verification landed |
| `release/theme-033-main-20260427` | 2026-04-27 | "always create dom layout required check" | ⚠️ verify CI workflow on main |
| `sync/conduit-main-to-development-20260427` | 2026-04-27 | "fold oauth middleware fix back to development" | ⚠️ same source as `release/conduit-development-to-main-20260427` |
| `sync/theme-033-main-back-to-dev-20260427` | 2026-04-27 | "sync dom layout trigger to development" | ⚠️ verify CI workflow on dev |

### `throughput` — 5 branches

| Branch | Last commit | Last commit msg | Likely status |
|---|---|---|---|
| `chore/dry-lint-0.2.0-bump` | 2026-04-27 | "bump @bsuite/dry-lint ^0.1.1 → ^0.2.0" | ✅ on main via PR #52 |
| `codex/dry-lint-app-override-hardening` | 2026-04-27 | "pin dry-lint app ownership enforcement" | ✅ on main |
| `codex/dry-lint-error-enforcement` | 2026-04-27 | "enforce dry-lint ownership rule" | ✅ on main |
| `phase2/theme-033-bump-20260427` | 2026-04-27 | "allow vercel github previews without cli token" | ⚠️ verify CI workflow on main (note: message diverges from theme bump — likely was rewritten to fix CI mid-flight) |
| `release/theme-033-main-20260427` | 2026-04-27 | "ship theme 0.3.3" | ✅ likely on main via direct release |

---

## Cleanup execution plan

**Per repo, run this loop after applying the verification recipe to each ⚠️ branch:**

```bash
cd /home/braden/Desktop/Dev/bsuite/<REPO_DIR>
git fetch origin --prune --quiet

# Branches confirmed safe to delete (✅ rows above + any ⚠️ rows that verified clean)
SAFE_BRANCHES=(
  # paste the validated branch names here, one per line
  # e.g.:
  # chore/dry-lint-0.2.0-bump
  # codex/dry-lint-error-enforcement
)

for branch in "${SAFE_BRANCHES[@]}"; do
  git push origin --delete "$branch" || echo "FAIL: $branch (may already be deleted)"
done
```

**For ⚠️ rows that the verification reveals have UNIQUE work not on main:**

```bash
# Per branch with real unmerged work:
cd /home/braden/Desktop/Dev/bsuite/<REPO_DIR>
git fetch origin --quiet
git checkout -b "rescue/<branch-name>" "origin/<branch-name>"

# Verify the unique commits aren't reverts/regressions
git log --oneline origin/main..HEAD

# If valuable, open a PR to development:
git push -u origin "rescue/<branch-name>"
gh pr create --base development --head "rescue/<branch-name>" \
  --title "rescue: salvage work from <branch-name>" \
  --body "Salvages <commit-list> from orphan branch <branch-name>. Audited as not on main."
```

---

## Branch-protection note

The session confirmed that all 7 repos have branch-protection rulesets on `main` and `development` (server-side, enforced for admins). Direct push is impossible. The cleanup is safe in terms of branch deletion (deleting non-protected feature branches is allowed) — but the rescue path needs a PR.

---

## Final-state checklist (when this is done)

- [ ] `git branch -r` per repo shows ONLY `origin/main` + `origin/development` + `origin/HEAD`
- [ ] Local `git branch` per repo shows ONLY `main` + `development` (or just `development` if main never checked out locally)
- [ ] All 7 repos: `git status` clean, on `development`
- [ ] Zero open PRs across all 7 repos
- [ ] `git worktree list` per repo shows ONLY the working directory (no leftover worktrees in `/tmp` or `.claude/worktrees`)
- [ ] `git log --oneline -1` on `development` per repo matches `git log --oneline -1` on `main` modulo 1 merge commit (the dev→main release merge sits on main only — standard gitflow)

---

## Risk inventory

1. **Squash-merge skew false positives.** Many branches will appear "unmerged" but their content is on main with different SHAs. The verification recipe's per-file diff check handles this.

2. **Auto-delete of branches with unique CI workflows.** Several branches end with `ci(repo): allow vercel github previews without cli token` or similar — these may have been rewritten mid-PR and the original commit was dropped. If that's the case, the *content* is still on main but the *commit message wording* differs. Spot-check 1-2 of these via the per-file diff before bulk-deleting.

3. **`fix/oauth-email-empty-secret-guard-20260427` + `fix/oauth-email-secret-review-followup-20260427`** are explicitly flagged ⚠️ — they may have hardening logic (fail-closed empty-secret guard) that didn't make it into PR #202's env-name fix. Verify before deleting; if not on main, this is a real security fix to rescue.

4. **`docs/codex-phase0-handoff-v4`** in parent — exists alongside `docs/codex-operator-handoff-v4.00W.md` on dev (which I saw earlier). May be a separate handoff variant by the codex agent. Read both files; if content differs, decide which to keep.

5. **`release/conduit-development-to-main-20260427`** + matching `sync/conduit-main-to-development-20260427` — both reference an "oauth middleware fix" message that doesn't match any merged conduit PR I can confirm. Verify whether middleware token verification is in conduit production code.

---

## Skills + MCPs to use

- **`git-workflow`** skill — branch hygiene patterns, especially for the rescue PR path
- **`github` MCP** — `delete_branch`, `list_branches`, `pull_request_read` for verifying merge state
- **`Sourcegraph` MCP** (`searching-sourcegraph` skill) — to confirm specific code is on main when patch-hash equivalence isn't conclusive
- **`tandem-dev-main-reconcile`** skill — already used today, applies if any rescue PR creates new skew

---

## Out of scope for this cleanup

- Resolving any test/lint failures discovered while validating branches
- Reopening any of the 47 orphan branches as PRs (only the ⚠️ verified-unique ones get rescue PRs)
- The Phase 2-10 broader Codex ledger work (separate plan in `docs/plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md`)
- The remaining windsurf worktree at `/home/braden/.windsurf/worktrees/bsuite/bsuite-98bb5e37` — that's a separate Cascade IDE session's workspace, leave alone unless that session is also being closed

---

## Done criteria

When the final-state checklist is 100% true. Estimated time: 30-60 min for one focused session. Most branches are confirmed-safe via spot-checking 2-3 of the ⚠️ rows; the bulk delete is then mechanical.
