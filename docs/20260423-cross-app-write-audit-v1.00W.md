# Cross-App Write Audit — Phase 4 V3 + V4

**Date:** 2026-04-23
**Scope:** All 6 BSuite apps — `business-suite-unified`, `crm7`, `conduit`, `braden`, `R80.3`, `throughput`
**Parent plan:** [docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md](plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md) §7 V3 (users) + V4 (apprentices)
**Status:** W (Working)

## Objective

Confirm that no BSuite app owns a local mirror table for the shared entities `users` or `apprentices`. These entities are owned by a single canonical table in the shared Supabase project `tuybltdrdefjblnplpqo`:

- `users` → `auth.users` (Supabase GoTrue, read-only for applications)
- `apprentices` → `public.apprentices` owned by CRM7 (migration `20250614000002_crm7_apprenticeship_tables.sql`)

All other apps are READERS only — they must query the canonical table, never duplicate it.

## Method

Two grep passes per app:

1. **Migration pass** — search `supabase/migrations/*.sql` for `CREATE TABLE` statements targeting `users` or `apprentices` (excluding auth.users, user_tenants, user_roles, user_sessions, user_permissions, user_invitations which are legitimate derivatives).

   ```bash
   grep -rEn 'CREATE TABLE[[:space:]]+(IF NOT EXISTS[[:space:]]+)?(public\.)?(users|apprentices)\b' \
     {app}/supabase/migrations/*.sql
   ```

2. **Client code pass** — search `src/` for Supabase client reads/writes against these tables:

   ```bash
   grep -rEn "\.from\(['\"](users|apprentices)['\"]" {app}/src/
   ```

## Findings

### V3 — `users` table

| App | Local CREATE TABLE? | Client usage | Status |
|-----|---------------------|--------------|--------|
| business-suite-unified | ❌ None | ❌ None | ✅ Clean |
| crm7 | ❌ None | ❌ None | ✅ Clean |
| conduit | ❌ None | ❌ None | ✅ Clean |
| braden | ❌ None | ⚠️ `src/lib/tasks/taskService.ts:37` — `.from('users').select('id, email, first_name, last_name')` | 🔶 **Observation, not a violation** |
| R80.3 | ❌ None | ❌ None | ✅ Clean |
| throughput | ❌ None | ❌ None | ✅ Clean |

**braden observation:** `taskService.ts` queries a `public.users` table that does not exist — `public.users` is never CREATE-TABLE'd in any migration. The code path has a `try/catch` and silently falls back to a mock staff record. This is pre-existing dead code (not a write violation), predating Phase 4 scope. Recommend tracking as a braden technical-debt item; behaviour is benign because no write occurs and error is swallowed. Not a Phase 4 blocker.

**V3 overall:** ✅ **Zero write violations.** No app mirrors `users`. All auth is via `auth.users` (GoTrue managed). No action required in Phase 4.

### V4 — `apprentices` table

| App | Local CREATE TABLE? | Client usage | Status |
|-----|---------------------|--------------|--------|
| business-suite-unified | ❌ None | ✅ Reader — `src/pages/GTO.tsx:149` | ✅ Clean reader |
| crm7 | ✅ **CANONICAL** — `supabase/migrations/20250614000002_crm7_apprenticeship_tables.sql:98` | ✅ Owner | ✅ Source of truth |
| conduit | ❌ None | ❌ None | ✅ Clean |
| braden | ❌ None | ❌ None | ✅ Clean |
| R80.3 | ❌ None | ✅ Reader — `src/stores/apprenticeStore.ts:321,368,384,414` | ✅ Clean reader |
| throughput | 🔶 **CREATE-TABLE-IF-NOT-EXISTS in local-only migration** — `supabase/migrations/20251014120000_unified_business_suite_schema.sql:472` | ❌ None | 🔶 **Dormant duplicate declaration** |

**throughput observation:** `20251014120000_unified_business_suite_schema.sql` is a 1700+ line bootstrap-style migration that re-declares 20+ tables (apprentices, clients, contacts, tenants, etc.) from the canonical CRM7/BSU schema. The migration is:

- `CREATE TABLE IF NOT EXISTS` throughout — will NOT overwrite an existing table
- Never deployed to `tuybltdrdefjblnplpqo` (throughput has no `supabase/config.toml`, no CI pipeline, no deploy automation targeting that project)
- Effectively dead schema documentation from an earlier standalone-project phase

Because it's idempotent (`IF NOT EXISTS`) and not executed against the shared project, it does NOT create a second `apprentices` table in production. It IS, however, schema drift waiting to bite: if someone ever runs `supabase db push` from the throughput directory against the shared project, all `IF NOT EXISTS` tables are no-ops but any `ALTER TABLE` / additional indexes would collide.

**Recommendation (non-blocking):** In a future cleanup pass, delete or gate throughput's `20251014120000_unified_business_suite_schema.sql` behind a clear "FOR REFERENCE ONLY — NEVER APPLY" comment, or split it into throughput-owned tables only (ideas, conversations, saved_research, todos). Tracked as throughput-debt item.

**V4 overall:** ✅ **Zero write violations in production.** CRM7 owns `apprentices`; R80.3 and BSU are readers via the shared Supabase project. Throughput carries a dormant duplicate schema declaration that is never executed against the shared project.

## Stop-ship boxes (§R.4)

- [x] `grep -rEn 'CREATE TABLE.*(users|apprentices)'` — zero unresolved write violations across all 6 apps
- [x] `grep -rEn '\.from\(...users|apprentices...'` — every caller queries the shared canonical tables, none queries a local mirror
- [x] braden's dead `.from('users')` reference is a pre-existing observation, not a write violation; logged as technical debt
- [x] throughput's `IF NOT EXISTS` duplicate declaration is dormant (never executed); logged as technical debt

## Actions

None required for Phase 4 completion. This artefact is the Phase 4 V3+V4 deliverable.

Follow-up technical-debt items (NOT Phase 4 blockers):

1. **braden-debt-001:** Remove or repoint `src/lib/tasks/taskService.ts#getStaffDetails` — target real auth.users via RLS-safe view or delete dead code path.
2. **throughput-debt-001:** Either gate `throughput/supabase/migrations/20251014120000_unified_business_suite_schema.sql` behind "REFERENCE ONLY" annotation or replace with throughput-owned-tables-only migration.

## Sign-off

- [x] Audit complete: 2026-04-23
- [x] Zero active write violations found
- [x] Ready for Phase 4 closure and §S.3 Phase 4 exit gate

---

**Artefact generated by:** Claude Code Phase 4 implementer, 2026-04-23.
