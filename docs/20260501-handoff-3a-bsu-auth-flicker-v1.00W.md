# HANDOFF-3a — BSU auth-flicker fix split

**Document**: `20260501-handoff-3a-bsu-auth-flicker-v1.00W.md`
**Status**: **CANCELLED 2026-05-01** — premise was wrong, no auth-flicker fix exists on the source branch; see Cancellation Notice below
**Owner**: Codebuff session (cancelled before execution)
**Submodule**: `business-suite-unified` (`/home/braden/Desktop/Dev/bsuite/business-suite-unified/`)
**Default branch**: `main` (verified 2026-05-01 via `gh repo view GaryOcean428/business-suite-unified` — supersedes the continuation prompt's earlier claim that BSU defaults to `master`)
**Active feature branch**: `fix/auth-tier-free-flicker-20260428` (misleadingly named — contained no auth-flicker work)
**Vercel project**: `business-suite` (ID `prj_OYfvQ2LzwnSFdV2DzxKHCl1H7ZBu`)

---

## ⚠️ Cancellation Notice (2026-05-01, post-Codebuff verification)

**Codebuff diligence finding (2026-05-01)**:

- `src/contexts/AuthContext.tsx` on `fix/auth-tier-free-flicker-20260428` is byte-identical to `origin/main` (both 801 lines, zero diff).
- `src/contexts/__tests__/AuthContext.test.tsx` already exists on `origin/main` — it is NOT a new untracked file as this handoff originally claimed.
- `src/components/Header.tsx` is also identical to `origin/main`.

**Root cause of the premise error**: the lead-session digest inferred "auth-flicker fix in flight" from three weak signals — branch name, `git status --short` showing `M` markers (which reflect working-tree-vs-branch-HEAD differences, not vs `origin/main`), and the existence of memory note `feedback_useeffect_dep_cycle.md`. None of those, individually or together, prove a fix is in the working tree. File-level `git diff origin/main -- <file>` is the authoritative test, and Codebuff ran it.

**Reality**:

- The auth-tier-free-flicker bug per the memory note already shipped to production (memory text references "BSU second tier=Free incident, 2026-04-21, **PR #129**" — already merged).
- The branch `fix/auth-tier-free-flicker-20260428` was named at creation but populated with **entirely different work**: P1-14 FK embed + P1-15 Developer routes + the repair migration.
- Snapshot commit `c4870e8` on `fix/auth-tier-free-flicker-20260428-snapshot` (force-pushed by Codebuff during HANDOFF-3a Step 1) captured **only 11 files** — none of which are AuthContext / AuthContext.test / Header.

**What this changes**:

- HANDOFF-3a has nothing to ship. Cancelled.
- HANDOFF-3b (P1-14 FK embed: `Admin.tsx` + `leadRoutingStore.ts`) — **valid, both files in snapshot, proceed**.
- HANDOFF-3c (Developer routes deferred: `tenantRoutes.ts` + tests + 5 Developer/* files) — **valid, all on snapshot, stay parked**.
- HANDOFF-3d (drop migration: PR #218) — **already shipped, green Vercel preview, awaiting smoke test**.

**Codebuff cleanup actions taken**:

- `fix/bsu-auth-tier-free-flicker-20260501` local branch (was created from `origin/main`, never received any cherry-picks because there was nothing to cherry-pick): deleted via `git branch -D`.
- `fix/auth-tier-free-flicker-20260428-snapshot` on origin: kept — HANDOFF-3b uses it.
- Original `fix/auth-tier-free-flicker-20260428` local branch: left alone as audit trail.
- No PR was opened for 3a; no GitHub state to clean up.

**Lesson for future digests**: never claim "M src/foo.ts is 100-line work" without `git diff origin/<default-branch> -- src/foo.ts | wc -l` first. Branch HEAD comparison is not the same as default-branch comparison.

---

## (Original handoff content below preserved for audit trail — DO NOT EXECUTE)

## Goal

The BSU feature branch `fix/auth-tier-free-flicker-20260428` mixes three scopes:

1. **Real auth-tier-free-flicker fix** (this handoff): `AuthContext.tsx` (106-line diff) + new `AuthContext.test.tsx` (77-line new file) + `Header.tsx` (18-line user-menu layout polish where the tier badge displays)
2. **P1-14 FK embed fix** (HANDOFF-3b): `Admin.tsx` + `leadRoutingStore.ts`
3. **P1-15 Developer route rework, deferred** (HANDOFF-3c): `tenantRoutes.ts`, new `tenantRoutes.test.ts`, `Developer/{Notices,RateLimits,Routing,Schema,index}.tsx`, new `DeveloperPortalRoutes.test.ts`

Plus a **121-line migration whose record is already in production** (verified via Supabase MCP `list_migrations` 2026-05-01 — `20260428085641_repair_tenant_page_layouts_contract` is applied to `tuybltdrdefjblnplpqo` even though the file is unpushed). The migration's file goes to **HANDOFF-3d** (history preservation + drop on top); it does **not** ride on this auth-flicker PR.

This handoff: **isolate scope 1 onto a fresh branch from `main`, ship as its own PR**. The auth-flicker branch starts clean — the repair migration was never on it because it's branched from `main`, which never had the file.

## Pre-conditions

- Working directory: `/home/braden/Desktop/Dev/bsuite/business-suite-unified`
- Branch: `fix/auth-tier-free-flicker-20260428` (current head is local-only, not pushed)
- Working tree: 11 modified + 3 untracked (`src/config/__tests__/`, `src/contexts/__tests__/AuthContext.test.tsx`, `src/pages/Developer/__tests__/`, `supabase/migrations/20260428085641_repair_tenant_page_layouts_contract.sql`)
- BSU's pre-existing 17-entry stash list — leave it alone, do not pop or drop

## Critical doctrine constraints

- **Default branch is `main`** — verified 2026-05-01; the continuation prompt § 2.2 was wrong (claimed `master`). BSU has only `development` and `main` on `origin`.
- **Lockfile regen via isolated dir if needed** — per § 2.3 (NEVER `pnpm install` from inside the bsuite tree)
- **No submodule pointer bumps from inside BSU** — pointer bumps happen in parent repo after merge
- **Repair migration is NOT in this PR's scope** — file stays on `fix/auth-tier-free-flicker-20260428-snapshot` after Step 1, gets handled by HANDOFF-3d (preserve in git + drop on top). Do not `git rm` it from snapshot; HANDOFF-3d depends on it being there.

## Step-by-step actions

### Step 1 — Snapshot the full pre-split state (CRITICAL — HANDOFF-3b depends on this)

```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
git status --short
# Verify: 11 modified + 3 untracked + the migration. If different, halt.

# Create a backup branch carrying the FULL feature work as one commit
git checkout -b fix/auth-tier-free-flicker-20260428-snapshot
git add -A
git commit -m "snapshot: full pre-split state from fix/auth-tier-free-flicker-20260428

This branch carries every modified + untracked file from the original
feature branch as a single snapshot. HANDOFF-3a cherry-picks the
auth-flicker subset onto a clean branch from main; HANDOFF-3b
cherry-picks the P1-14 subset; HANDOFF-3c stays parked here until
ADR-0001's drop migration lands.

DO NOT delete this branch until HANDOFF-3a, 3b, and 3c are all
resolved.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-3a Step 1"
```

Verify the snapshot:

```bash
git log --oneline -1
git diff origin/main --stat | tail -5  # should show ~14 files / ~400 lines changed
```

### Step 2 — Create the clean auth-flicker branch from main

```bash
git fetch origin master
git checkout -b fix/bsu-auth-tier-free-flicker-20260501 origin/main
```

### Step 3 — Cherry-pick only the 3 auth-flicker files from snapshot

```bash
git checkout fix/auth-tier-free-flicker-20260428-snapshot -- \
  src/contexts/AuthContext.tsx \
  src/contexts/__tests__/AuthContext.test.tsx \
  src/components/Header.tsx
```

Verify nothing else came along:

```bash
git status --short
# Expected output (in some order):
#   M src/components/Header.tsx
#   M src/contexts/AuthContext.tsx
#   ?? src/contexts/__tests__/   ← directory only because the file was new
# (Or A for the new file if it had been tracked. Check with `git diff --cached`.)
```

If anything else appears, halt — diff is wrong.

### Step 4 — Confirm no `tenant_page_layouts` slipped through (per user's explicit ask)

```bash
grep -l tenant_page_layouts \
  src/contexts/AuthContext.tsx \
  src/contexts/__tests__/AuthContext.test.tsx \
  src/components/Header.tsx 2>&1

# Expected: no output. If any file matches, halt — wrong scope.
```

### Step 5 — Local verify (typecheck + test the new test)

```bash
# pnpm install MUST NOT run from inside bsuite tree per § 2.3 of continuation prompt.
# If node_modules is stale, regen via the isolated-dir procedure first:
#   mkdir ~/bsu_lockgen && cp package.json pnpm-lock.yaml ~/bsu_lockgen/
#   cd ~/bsu_lockgen && pnpm install && cd -
#   cp ~/bsu_lockgen/pnpm-lock.yaml . && rm -rf ~/bsu_lockgen
# Then symlink/install node_modules per project convention.

corepack enable
pnpm typecheck
pnpm test src/contexts/__tests__/AuthContext.test.tsx
pnpm lint src/contexts/AuthContext.tsx src/components/Header.tsx
```

All must pass before the next step.

### Step 6 — Stage, commit, push

```bash
git add -A  # ok here because working tree is constrained to 3 files
git status  # final visual check

git commit -m "$(cat <<'EOF'
fix(bsu): auth tier-free flicker via AuthContext deps cycle (#129 follow-up)

Refactors AuthContext bootstrap to mount once and decouple state-closing
useCallbacks from the bootstrap effect's deps. Resolves the documented
useEffect dep-cycle that orphaned the second tier-detection fetch when
auth state changed mid-bootstrap (memory note feedback_useeffect_dep_cycle.md,
incident 2026-04-20 BSU 'Free' chip flash).

Header user-menu layout polish (truncate / shrink-0 / min-w-0) prevents
the tier badge text from overflowing the menu container during the
brief pre-resolution window.

New AuthContext.test.tsx covers:
- bootstrap effect mounts exactly once
- onAuthStateChange does not deadlock on supabase.from(...) calls
- tier resolves to non-Free for entitled users without a Free flicker

Branch genealogy: split from fix/auth-tier-free-flicker-20260428 via
HANDOFF-3a (2026-05-01). The repair migration and Developer/* changes
that originally rode on the same branch are split into HANDOFF-3b
(P1-14 FK embed) and HANDOFF-3c (deferred until ADR-0001 drop
migration lands).

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-3a
EOF
)"

git push -u origin fix/bsu-auth-tier-free-flicker-20260501
```

### Step 7 — Open PR into `development`

BSU's PR pattern is `feature → development → main`. This handoff opens the feature → development PR; the development → main release PR happens later.

```bash
gh pr create \
  --base development \
  --head fix/bsu-auth-tier-free-flicker-20260501 \
  --title "fix(bsu): auth tier-free flicker (split from fix/auth-tier-free-flicker-20260428)" \
  --body "$(cat <<'EOF'
## Summary

Surgical fix for the BSU 'Free' chip flicker — same root cause as the
2026-04-20 incident captured in memory note `feedback_useeffect_dep_cycle.md`.

## Files changed (3)

- `src/contexts/AuthContext.tsx` — bootstrap effect refactor
- `src/contexts/__tests__/AuthContext.test.tsx` — NEW, 77-line test file
- `src/components/Header.tsx` — user-menu truncate/shrink-0 layout polish

## Backlog citation

Maps to backlog item P1-12 (BSU auth safety-net verify-no-regression) per
`docs/20260501-merged-execution-backlog-v1.00W.md`. Per the backlog, this is
the on-going safety-net work — this PR adds the regression test.

## ADR compliance

- ADR-0001 (page-builder ownership): UNTOUCHED. The repair migration that
  contradicted ADR-0001 was DELETED from the branch via the snapshot/cherry-pick
  split in HANDOFF-3a — see branch `fix/auth-tier-free-flicker-20260428-snapshot`
  for the parked work.
- ADR-0002 through ADR-0006: untouched.

## Branch genealogy

- Original feature branch: `fix/auth-tier-free-flicker-20260428` (local-only, never
  pushed) — split into 3a + 3b + 3c + 3d per HANDOFF docs 2026-05-01
- Snapshot: `fix/auth-tier-free-flicker-20260428-snapshot` — preserved for
  HANDOFF-3b, 3c, AND 3d (do not delete until all four resolve)
- This PR: `fix/bsu-auth-tier-free-flicker-20260501` from `main`
- Repair migration: not on this branch (originated only on snapshot); see HANDOFF-3d

## Verification

- [x] No `tenant_page_layouts` references in any of the 3 files (verified per HANDOFF-3a Step 4)
- [x] Local `pnpm typecheck` passes
- [x] Local `pnpm test src/contexts/__tests__/AuthContext.test.tsx` passes
- [x] Repair migration not on this branch (`git ls-files supabase/migrations/ | grep repair_tenant_page_layouts` returns nothing) — that file is HANDOFF-3d's responsibility
- [ ] CI green (`build-and-test` + lint + DOM layout invariants)
- [ ] Vercel preview at `business-suite-<hash>-garyocean428.vercel.app` shows no 'Free' flicker on entitled-user login
- [ ] User visual smoke test passed

## Stop-short gate

Per continuation prompt § 3.4 — do not merge until user signals smoke test passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-3a
EOF
)"
```

### Step 8 — Watch checks + verify Vercel preview

```bash
PR=$(gh pr list --base development --head fix/bsu-auth-tier-free-flicker-20260501 --json number --jq '.[0].number')
gh pr checks "$PR" --watch
```

Lead session will use Vercel MCP `list_deployments` for project `prj_OYfvQ2LzwnSFdV2DzxKHCl1H7ZBu` to verify the preview deploy is healthy.

### Step 9 — Stop and report

```
HANDOFF-3a ready for smoke test.
PR: https://github.com/GaryOcean428/business-suite-unified/pull/<N>
Preview: https://business-suite-<hash>-garyocean428.vercel.app
Checks: all green
Snapshot branch: fix/auth-tier-free-flicker-20260428-snapshot (preserved for 3b/3c)
Bot comments: <none / list>
```

**Do not merge.** Wait for user signal.

## Stop conditions

| Condition | Action |
|---|---|
| Step 1 status output differs from expected (≠ 11 modified + 3 untracked + migration) | Halt, report — another agent has touched the branch |
| Step 4 grep finds `tenant_page_layouts` in any of the 3 files | Halt — scope contamination, refer to HANDOFF-3c instead |
| Step 5 typecheck/test/lint fails | Iterate locally before push, max 3 attempts |
| Step 6 push fails due to branch protection on `fix/bsu-*` namespace | None expected — feature branches typically unprotected |
| Vercel build fails 2+ times for the same reason | Halt, escalate to lead session for MCP-driven log analysis |
| CI complains the repair migration is referenced from elsewhere | Halt, escalate — possible cross-file dependency Codebuff must not resolve unilaterally |

## Done definition

- [ ] PR open into `development`, all checks green
- [ ] Snapshot branch `fix/auth-tier-free-flicker-20260428-snapshot` exists and is pushed
- [ ] Repair migration verifiably absent from `fix/bsu-auth-tier-free-flicker-20260501` (`git ls-files supabase/migrations/` does not list it)
- [ ] Reported back to lead session

## Cross-handoff handoff

After Step 1 completes (snapshot exists and is pushed), **HANDOFF-3b AND HANDOFF-3d** can both begin in parallel — they each branch off `main` and cherry-pick from the snapshot:

- **HANDOFF-3b** picks `src/pages/Admin.tsx` + `src/stores/leadRoutingStore.ts`
- **HANDOFF-3d** (lead session) picks `supabase/migrations/20260428085641_repair_tenant_page_layouts_contract.sql` for git-history preservation, then adds `supabase/migrations/20260502000000_drop_tenant_page_layouts.sql` on top
- HANDOFF-3c stays parked on snapshot until 3d's drop migration lands
