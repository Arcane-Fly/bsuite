# HANDOFF-3b — BSU P1-14 FK embed fix (sibling PR)

**Document**: `20260501-handoff-3b-bsu-fk-embed-fix-v1.00W.md`
**Status**: SUPERSEDED 2026-05-02 — work verified complete via other paths; see completion notice below
**Owner**: Codebuff session
**Submodule**: `business-suite-unified`
**Default branch**: `main` (verified 2026-05-01 — supersedes continuation prompt § 2.2 which claimed `master`)
**Vercel project**: `business-suite` (ID `prj_OYfvQ2LzwnSFdV2DzxKHCl1H7ZBu`)
**Note 2026-05-01**: HANDOFF-3a was cancelled (no auth-flicker fix existed on the source branch — see HANDOFF-3a's Cancellation Notice). HANDOFF-3a's Step 1 snapshot creation DID complete and force-pushed to origin as `fix/auth-tier-free-flicker-20260428-snapshot` (commit `c4870e8`). This handoff still works as written — the snapshot branch carries Admin.tsx + leadRoutingStore.ts ready for cherry-pick.

## ✅ Completion Notice (2026-05-02, Codebuff verification)

**Status**: SUPERSEDED — P1-14 fix already landed on `business-suite-unified/main`.

**Evidence of completion**:
- The Map-based join replacement pattern is already present on `origin/main`:
  - `src/pages/Admin.tsx` lines 85/90 (`new Map` + `.in('id', userIds)`)
  - `src/stores/leadRoutingStore.ts` lines 137/142 (same pattern)
- The snapshot branch `fix/auth-tier-free-flicker-20260428-snapshot` has been deleted from `origin` (cleanup post-landing).
- No open BSU PR matching `fix/bsu-fk-embed-*` exists.

**Do not execute the original handoff steps below.** They describe a cherry-pick from a no-longer-existing snapshot branch to fix a bug that has already been fixed. The original content is preserved for audit-trail purposes.

---

## Goal

Two BSU files in the original `fix/auth-tier-free-flicker-20260428` branch are surgical fixes for **backlog item P1-14** ("BSU `user_tenants→profiles` FK embed 400 (primary), R80.3 verification pass" per `docs/20260501-merged-execution-backlog-v1.00W.md`):

- `src/pages/Admin.tsx` — replaces broken `profiles:user_id(...)` PostgREST embed in admin user list with separate `profiles` fetch + `Map<id, profile>` join (~30 line net change)
- `src/stores/leadRoutingStore.ts` — same pattern, applied to lead routing rules + tenant member lookup (~25 line net change)

Both files use **identical refactor**: drop the broken embed, fetch profile IDs separately by `.in('id', userIds)`, build a Map keyed by `id`, then enrich rule/user rows from the Map. Pure bug fix, zero ADR contact.

## Pre-conditions

- ✅ Snapshot branch `fix/auth-tier-free-flicker-20260428-snapshot` exists on origin at commit `c4870e8` (force-pushed 2026-05-01 during cancelled-3a's Step 1; carries the 11 files from the misnamed feature branch)
- ✅ Snapshot includes `src/pages/Admin.tsx` and `src/stores/leadRoutingStore.ts` (the two files this handoff needs)
- Working directory: `/home/braden/Desktop/Dev/bsuite/business-suite-unified`
- Local clone has the snapshot branch fetched (`git fetch origin fix/auth-tier-free-flicker-20260428-snapshot`)
- Note: this handoff is no longer "sibling to 3a" — 3a was cancelled. Treat 3b as the first BSU code PR of the batch.

## Step-by-step actions

### Step 1 — Branch from main

```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
git fetch origin master fix/auth-tier-free-flicker-20260428-snapshot
git checkout -b fix/bsu-fk-embed-20260501 origin/main
```

### Step 2 — Cherry-pick only the 2 files

```bash
git checkout origin/fix/auth-tier-free-flicker-20260428-snapshot -- \
  src/pages/Admin.tsx \
  src/stores/leadRoutingStore.ts
```

### Step 3 — Verify scope

```bash
git status --short
# Expected (in some order):
#   M src/pages/Admin.tsx
#   M src/stores/leadRoutingStore.ts

grep -l tenant_page_layouts src/pages/Admin.tsx src/stores/leadRoutingStore.ts
# Expected: no output
```

If anything else appears in `git status`, halt.

### Step 4 — Local verify

```bash
corepack enable
pnpm typecheck
pnpm lint src/pages/Admin.tsx src/stores/leadRoutingStore.ts

# If unit tests exist for these files, run them. Search:
ls src/pages/__tests__/Admin* src/stores/__tests__/leadRoutingStore* 2>/dev/null
```

If any tests exist, run them: `pnpm test <test-file-path>`.

### Step 5 — Commit

```bash
git add src/pages/Admin.tsx src/stores/leadRoutingStore.ts

git commit -m "$(cat <<'EOF'
fix(bsu): user_tenants→profiles FK embed 400 (P1-14)

Replaces PostgREST embedded selects of the form
  user_tenants.profiles:user_id(...)
  lead_routing_rules.profiles:assigned_to_user_id(...)
with separate `profiles` fetches keyed by id and a Map<id, profile>
join in JS. PostgREST cannot infer the user_tenants.user_id → profiles.id
relationship in the current schema (no FK declared in Supabase metadata),
so the embedded form returns 400.

Two surfaces affected:
- Admin.tsx — admin user list (count of unique users + display rows)
- leadRoutingStore.ts — routing rule editor + tenant member lookup

Pure bug fix. No schema changes. No tenant_page_layouts contact (ADR-0001
unaffected).

Backlog reference: docs/20260501-merged-execution-backlog-v1.00W.md item P1-14.

Branch genealogy: cherry-picked from
fix/auth-tier-free-flicker-20260428-snapshot per HANDOFF-3b (2026-05-01).

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-3b
EOF
)"
```

### Step 6 — Push and PR

```bash
git push -u origin fix/bsu-fk-embed-20260501

gh pr create \
  --base development \
  --head fix/bsu-fk-embed-20260501 \
  --title "fix(bsu): user_tenants→profiles FK embed 400 (P1-14)" \
  --body "$(cat <<'EOF'
## Summary

Two surgical bug fixes for backlog item P1-14. Replaces PostgREST embedded
selects (which return 400 because no FK is declared from
`user_tenants.user_id` → `profiles.id` in the current Supabase schema)
with separate fetches + Map joins.

## Files changed (2)

- `src/pages/Admin.tsx` — admin user list query
- `src/stores/leadRoutingStore.ts` — lead routing rules + tenant members query

## Backlog citation

`docs/20260501-merged-execution-backlog-v1.00W.md` — **P1-14** ("BSU
`user_tenants→profiles` FK embed 400 (primary), R80.3 verification pass —
path-corrected from earlier draft").

## ADR compliance

- ADR-0001 through ADR-0006: untouched.

## Branch genealogy

Cherry-picked from `fix/auth-tier-free-flicker-20260428-snapshot` (preserved
on `origin` from HANDOFF-3a). The snapshot branch carries all originally-mixed
work; this PR isolates only the P1-14 surfaces.

## Follow-up note

R80.3 verification pass for the same FK embed pattern is **not** in scope here
— per the backlog, that's a separate verification step. R80.3's
`leadRoutingStore` (or equivalent) should be audited as a follow-up issue.

## Verification

- [x] No `tenant_page_layouts` references in either file
- [x] Local `pnpm typecheck` passes
- [x] Local `pnpm lint` passes
- [ ] CI green
- [ ] Admin user list renders without 400 errors in Vercel preview
- [ ] Lead routing rule editor populates correctly in Vercel preview
- [ ] User visual smoke test passed

## Stop-short gate

Per continuation prompt § 3.4 — do not merge until user signals smoke test passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code) — HANDOFF-3b
EOF
)"
```

### Step 7 — Watch checks + report

```bash
PR=$(gh pr list --base development --head fix/bsu-fk-embed-20260501 --json number --jq '.[0].number')
gh pr checks "$PR" --watch
```

Report:

```
HANDOFF-3b ready for smoke test.
PR: https://github.com/GaryOcean428/business-suite-unified/pull/<N>
Preview: https://business-suite-<hash>-garyocean428.vercel.app
Checks: all green
Bot comments: <none / list>
```

**Do not merge.** Wait for user signal.

## Stop conditions

| Condition | Action |
|---|---|
| Step 2 cherry-pick brings in unexpected files | Halt — snapshot branch state is wrong, escalate |
| Step 3 grep finds `tenant_page_layouts` | Halt — scope contamination |
| Step 4 typecheck/lint fails | Iterate, max 3 attempts |
| Vercel preview shows admin user list still 400-erroring | Halt, escalate to lead session for MCP-driven runtime log analysis |

## Done definition

- [ ] PR open, checks green, preview deploy renders admin user list correctly
- [ ] Reported to lead session
