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
- [x] Zero active write violations found (for V3 + V4 scope — `users` + `apprentices`)
- [x] Ready for Phase 4 closure and §S.3 Phase 4 exit gate

---

## V5 — Broader cross-app write discovery (2026-04-24 archive-pass follow-up)

**Context:** The original V3+V4 audit scope was narrow (only `users` and `apprentices`). The 2026-04-24 archive-pass discovery expanded the sweep to every shared entity in the one-shot ownership map (`docs/20260227-dry-one-shot-architecture-v1.01A.md §1`). Below are the concrete file:line findings produced by 7 parallel Explore agents on 2026-04-24.

### V5 — Lead-capture writes outside Braden

| App | File | Line | Write | Action |
|-----|------|------|-------|--------|
| business-suite-unified | `src/pages/Embed/LeadForm.tsx` | 109 | `.from('leads').insert({ tenant_id, name, email, ... })` | **VIOLATION** — leads are Braden-owned; BSU should POST to a Braden-exposed endpoint or invoke a shared edge function |

### V6 — Idea-platform writes outside Throughput

| App | File | Line | Write | Action |
|-----|------|------|-------|--------|
| business-suite-unified | `src/lib/ideaService.ts` | 60 | `.from('ideas').update({ status })` + full CRUD surface | **VIOLATION** — ideas are Throughput-owned per `crm7/` CLAUDE.md; BSU either needs to stop exposing idea CRUD or the ownership map must be formally changed |

### V7 — BSU-owned tables (branding, custom pages, tenant config) written from CRM7

| App | File | Line | Write | Action |
|-----|------|------|-------|--------|
| crm7 | `src/services/tenantService.ts` | 63 | `.update({ ... })` on `tenant_branding` and `platform_branding` | **VIOLATION** — BSU owns branding; CRM7 is consumer-only per Phase 5 schema-registry design |
| crm7 | `src/pages/settings/schema-builder/*` | multiple | `.insert()` / `.upsert()` on `custom_pages`, `custom_page_blocks` | **VIOLATION** — BSU `/developer/pages` is the canonical authoring surface per Phase 5; CRM7 should consume via `<TenantLayoutSlot>` not author |

### V8 — CRM7 ↔ R80.3 shared audit tables (ambiguous ownership)

| App | File | Line | Write | Action |
|-----|------|------|-------|--------|
| crm7 | `src/lib/payroll/xeroAdapter.ts` | 87 | `.upsert()` on `apprentice_rate_configs` | **OWNERSHIP UNCLEAR** — this table's owner should be formalised. Candidates: CRM7 (if payroll-owned), R80.3 (if rate-calc-owned), or a new shared "rate" module. |
| crm7 | `src/lib/payroll/xeroAdapter.ts` | 142 | `.upsert()` on `wage_calculation_snapshots` | **SHARED WITH R80.3** — per combined-GTO-plan N-2 finding, audit-trail pattern is duplicated across tenant_entities_revisions (CRM7), timesheet_events (CRM7), and wage_calculation_snapshots (R80.3). Resolution: one shared `create_append_only_audit()` helper; until then, writes from both CRM7 and R80.3 are accepted but need a unified sink. |

### V9 — Throughput shared-table writes

| App | File | Line | Write | Action |
|-----|------|------|-------|--------|
| throughput | `src/lib/teamPermissions.ts` | 302 | `.update()` on `team_members` | **OWNERSHIP UNCLEAR** — `team_members` is a shared tenant table; BSU is the canonical tenant/team owner per the parent `CLAUDE.md §Authentication & OAuth`. Resolution: move team-member writes to a BSU-exposed service, or formally grant throughput co-ownership with RLS review. |

### V10 — Auth callback hardcoded-production fallbacks (feeds WS-4 OAuth preview fix)

These are not database-write violations but architectural violations of the same class — they hardcode the production URL as a fallback, which breaks preview-branch logins (reported by user 2026-04-24).

| App | File | Line | Issue | Feeds |
|-----|------|------|-------|-------|
| business-suite-unified | `src/lib/redirectTargets.ts` | 9–15 | Static production-only URL table | WS-4 primary fix |
| R80.3 | `src/pages/AuthCallback.tsx` | 44 | `(DEV ? 'http://localhost:5675' : 'https://suite.crm7.app')` hardcoded fallback | WS-4 secondary fix |
| throughput | `src/pages/auth/AuthCallback.tsx` | 48–50 | Same hardcoded pattern, but `VITE_BSU_URL` override is present | WS-4 secondary fix (lower priority — env override works) |
| braden | `src/pages/auth/AuthCallback.tsx` | — | CLEAN ✓ (uses `packages/auth/src/oauth-client.ts` dynamic `window.location.origin`) | none |
| conduit | `src/app/auth/callback/route.ts` | 7,13 | CLEAN ✓ (uses request `origin` header) | none |

### Sign-off (V5–V10)

- [x] Discovery complete: 2026-04-24
- [ ] Concrete fixes pending: 6 write-path violations + 3 auth-callback fallback fixes
- [x] Findings tagged `— discovered during 2026-04-24 archive pass (plan: completed-the-current-development-branch)` per provenance convention

**Follow-up owners:**

1. V5 lead writes → Braden team (move `src/pages/Embed/LeadForm.tsx:109` to POST an edge function or Braden-exposed API)
2. V6 idea writes → Throughput team (deep-link approach or formal ownership change)
3. V7 CRM7→BSU branding/page writes → converge on Phase 5 TenantLayoutSlot/BrandingProvider consumer pattern only; remove CRM7 authoring surface
4. V8 rate-config + wage-snapshot ownership → formalise in a new sub-doc under `docs/plans/`; for now, both apps can read/write until unified audit helper ships (N-2)
5. V9 team_members → Phase-by-phase migration to BSU-owned service
6. V10 auth fallbacks → WS-4 (this plan) fixes primary; R80.3/throughput fixes in same WS

---

**Artefact generated by:** Claude Code Phase 4 implementer, 2026-04-23. V5–V10 appended by Claude Opus 4.7 archive-pass, 2026-04-24.

---

## 2026-04-25 correction to V7 (ground-truth after investigation)

The V7 entries above listed `platform_branding` writes and `custom_pages` writes in paths that do not match the actual code. Corrected per a 2026-04-25 subagent investigation ahead of shipping V7a:

### V7a-actual (SHIPPED crm7@`e15763c9`)

The V7a authoring writes were in `crm7/src/pages/settings/branding.tsx` — `saveMutation` called `.upsert()` on `tenant_branding` and `.update()` on `tenant_settings`. That entire UI was reduced to a 16-line re-export of `BrandingRedirect` which navigates to `${VITE_BSU_URL}/branding`. The original audit's cite of `src/services/tenantService.ts:63` was inaccurate — that line is whitespace/type in the current file. Also: CRM7 never wrote to `platform_branding` — the V7 entry mentioning it was aspirational. All current `platform_branding` references are `.select()` reads.

Post-ship state: `grep -rn "\.(insert|update|upsert|delete)\s*\(.*\bfrom\s*\(\s*['\"]platform_branding['\"]\|tenant_branding['\"]` in `crm7/src/` returns zero matches. `useBranding.ts` consumes via `.select()` only.

### V7b-needs-rescope (NOT actionable as written)

The V7b entry claimed `crm7/src/pages/settings/schema-builder/*` writes to `custom_pages` / `custom_page_blocks`. Neither is true:

1. `schema-builder/*` writes to `tenant_entities` + `tenant_relations` (the entity-relationship diagram builder). This is a data-model authoring surface, not a page-layout builder.
2. `custom_page_blocks` does NOT exist in CRM7 source at all.
3. BSU `/developer/pages` writes to `tenant_page_layouts` (Phase 5 table), not `custom_pages`. So "consume via `<TenantLayoutSlot>` only" doesn't apply — TenantLayoutSlot renders `tenant_page_layouts`, which is a different table from what CRM7 authors.
4. CRM7 legitimately authors `custom_pages` via `src/pages/settings/custom-page-{create,edit,detail}.tsx` + `src/services/customPageService.ts`. No BSU equivalent exists.

Decision needed (outside Phase 4 scope):

- **Option A:** Build a BSU `custom_pages` authoring surface in `/developer/pages` (currently authors `tenant_page_layouts` only), then convert CRM7 custom-page-*.tsx to consumers. Adds BSU workstream.
- **Option B:** Accept `custom_pages` as CRM7-owned and update `docs/20260227-dry-one-shot-architecture-v1.01A.md §1 Entity Ownership Map` to reflect this. V7b closes as "not a violation."

Tracked as P1-4 in `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` with AUDIT MISMATCH flag until the decision lands.

### V7c-new-candidate (unscoped — future audit entry)

If `schema-builder/*` (tenant_entities/relations writes) should ALSO move to a centralised owner, that's a separate audit question. It would need a BSU authoring surface built first (same shape as the Phase 5 Developer Portal, but for schema). Out of scope for this audit pass.
