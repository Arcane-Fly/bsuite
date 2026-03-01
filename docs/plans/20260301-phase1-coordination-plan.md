# Phase 1 Coordination Plan — Claude Code + Claude 2

> **For Claude:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement your assigned tasks.

**Goal:** Execute Phase 1 (Foundation) of the reconciliation sweep with two agents working in parallel on independent tracks.

**Full Spec:** `docs/plans/20260301-reconciliation-phase1-implementation.md`
**Design Doc:** `docs/plans/20260301-reconciliation-sweep-information-flow-design-v1.00W.md`

---

## DO NOT TOUCH — Auth is Working

All 5 projects use **Supabase's native OAuth 2.1 server**. It works. Do not modify:

- `business-suite-unified/src/lib/supabase.ts` — cookie storage, PKCE, `.crm7.app` domain
- `business-suite-unified/src/pages/oauth/OAuthConsent.tsx` — Supabase OAuth consent flow
- `business-suite-unified/src/contexts/AuthContext.tsx` — session management
- `crm7/src/lib/supabase.ts` — shared cookie, PKCE
- `conduit/src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` — `@supabase/ssr`, PKCE
- `R80.3/src/services/supabaseClient.ts` — shared cookie, PKCE
- `braden/src/integrations/supabase/client.ts` — PKCE

**Auth pattern:** BSU is the OAuth provider via Supabase's `auth.oauth` API. Other apps are OAuth clients. Conduit has BSU OAuth inline in its login page. All use `flowType: 'pkce'`. Shared cookie on `.crm7.app` domain (`storageKey: 'business_suite_auth'`).

**If you think auth needs changing: STOP and ask the user first.**

---

## Current Tech Baseline (March 2026 — Do Not Downgrade)

| Package | BSU | CRM7 | Conduit | R80.3 | Braden |
|---------|-----|------|---------|-------|--------|
| React | 18.3.1 | 18.3.1 | 19.0.0 | 18.3.1 | 19.0.0 |
| Supabase JS | 2.56.0 | 2.75.0 | 2.49.1 | 2.39.7 | 2.97.0 |
| Vite / Next.js | Vite 6.0.1 | Vite 6.3.6 | Next 16.1.6 | Vite 6.4.1 | Vite 6.0.1 |
| Zod | 4.3.6 | 4.1.12 | 4.3.6 | 4.1.12 | 4.3.6 |
| TypeScript | 5.6.2 | 5.6.3 | 5.7.3 | 5.5.4 | 5.7.3 |

**Rules:**
- Do NOT downgrade any version. Upgrades OK if needed for a feature.
- Use Zod v4 syntax (`import { z } from 'zod'`), not v3.
- BSU, CRM7, R80.3, Braden = React + Vite SPAs. Only Conduit = Next.js 16.
- All projects use pnpm.

---

## Task Assignment

### Track A — Claude Code (CC)

Owns: migrations, RLS policies, Conduit verification, parent repo

| Order | Task | What | Dependencies |
|:---:|------|------|:---:|
| 1 | **Task 1** | Migration: expand `user_tenants` role CHECK constraint | None |
| 2 | **Task 5** | 6 new CRM7 entity migrations (training_providers, rto_assignments, site_inspections, training_schedules, escalation_log, welfare_reports) | None |
| 3 | **Task 5b** | Entity-scoping RLS + `user_tenant_links` + `tenant_role_permissions` tables | After Task 5 |
| 4 | **Task 4** | Verify Conduit BSU SSO works (read-only, no changes expected) | None |
| 5 | **Task 7** | Update parent repo submodule refs + push | After ALL tasks done |

### Track B — Claude 2 (C2)

Owns: TypeScript services, Zod schemas, tests

| Order | Task | What | Dependencies |
|:---:|------|------|:---:|
| 1 | **Task 2** | Update BSU permissions service — add external portal roles + tests | None |
| 2 | **Task 3** | CRM7 role mapping layer (`roleMappingService.ts`) + tests | None |
| 3 | **Task 6** | Zod v4 schemas for all 6 new entities + barrel exports + tests | After CC finishes Task 5 (need column names) |

### Parallel Timeline

```
TIME ──────────────────────────────────────────────────►

CC:  [Task 1: migration] → [Task 5: 6 entity tables] → [Task 5b: RLS scoping] → [Task 4: verify] → [Task 7: push]
C2:  [Task 2: BSU perms] → [Task 3: role mapping]    → [Task 6: Zod schemas (after CC Task 5)] ──────────┘
```

---

## Task Details

Full step-by-step instructions for each task are in the implementation plan:
`docs/plans/20260301-reconciliation-phase1-implementation.md`

Read your assigned tasks from that file. Each task has:
- Exact file paths to create/modify
- Complete code to write
- Test commands to run
- Expected outputs
- Commit messages

### Quick Reference — What Each Task Produces

**Task 1** (CC) — `crm7/supabase/migrations/20260301200000_expand_user_tenants_roles.sql`
- Drops old CHECK, adds: host_employer, training_provider, apprentice, field_officer, claims_records, hr_coordinator, finance

**Task 2** (C2) — Modify `business-suite-unified/src/lib/permissionsService.ts` + new test file
- Add `host_employer`, `training_provider`, `apprentice` to `ROLE_PERMISSIONS` (read-only)
- Add to `ROLE_HIERARCHY` below viewer
- Test: `cd business-suite-unified && npx vitest run src/lib/__tests__/permissionsService.test.ts`

**Task 3** (C2) — Create `crm7/src/lib/roleMappingService.ts` + test file
- `mapPortalRoleToOperational()` with default mapping + per-tenant overrides
- Types: `PortalRole`, `OperationalRole`
- Test: `cd crm7 && npx vitest run src/lib/__tests__/roleMappingService.test.ts`

**Task 4** (CC) — Verification only, no files created
- Grep for BSU OAuth in Conduit login page
- Verify PKCE in all 3 Supabase client files
- Check cookie domain config
- Document findings

**Task 5** (CC) — 6 migration files in `crm7/supabase/migrations/`
- `20260301200100_create_training_providers.sql`
- `20260301200200_create_rto_assignments.sql`
- `20260301200300_create_site_inspections.sql`
- `20260301200400_create_training_schedules.sql`
- `20260301200500_create_escalation_log.sql`
- `20260301200600_create_welfare_reports.sql`
- All with: tenant_id, RLS enabled, tenant isolation policy, indexes, custom_fields JSONB
- welfare_reports has RESTRICTIVE policies blocking host_employer/training_provider from confidential reports

**Task 5b** (CC) — 2 migration files in `crm7/supabase/migrations/`
- `20260301200700_entity_scoping_rls.sql` — RESTRICTIVE RLS for external roles + `user_tenant_links` table
- `20260301200800_create_tenant_role_permissions.sql` — configurable per-tenant permission overrides

**Task 6** (C2) — 6 schema files + barrel exports + test file in `crm7/src/schemas/`
- `trainingProvider.ts`, `rtoAssignment.ts`, `siteInspection.ts`, `trainingSchedule.ts`, `escalation.ts`, `welfareReport.ts`
- Each: create schema + full schema (with id, tenant_id, timestamps)
- Update `crm7/src/schemas/index.ts` barrel exports
- Test: `cd crm7 && npx vitest run src/schemas/__tests__/newEntities.test.ts`
- **IMPORTANT:** Match column names exactly from Task 5 migrations

**Task 7** (CC) — Parent repo
- `git add crm7 business-suite-unified && git commit`
- Push all repos

---

## Coordination Rules

1. **No file conflicts.** CC works in `crm7/supabase/migrations/` and Conduit. C2 works in `crm7/src/` and `business-suite-unified/src/`. No overlap.

2. **Task 6 sync point.** C2 must wait for CC to finish Task 5 before starting Task 6. The Zod schemas must match the migration column names exactly.

3. **Commit in submodules first.** Both agents commit inside `crm7/` or `business-suite-unified/` before CC does Task 7 (parent repo update).

4. **Branch: `development`** for all repos. Do not create feature branches — we're already on development.

5. **Don't touch auth.** See "DO NOT TOUCH" section above.

6. **Don't downgrade versions.** See tech baseline table.

7. **Tests must pass.** Run tests after each task. Don't commit failing tests.

8. **TDD per task.** Write failing test → implement → verify pass → commit.

---

## Verification

After all tasks complete, both agents should verify:

```bash
# CRM7 typecheck
cd crm7 && npx tsc --noEmit --skipLibCheck

# CRM7 tests
cd crm7 && npx vitest run

# BSU typecheck
cd business-suite-unified && npx tsc --noEmit --skipLibCheck

# BSU tests
cd business-suite-unified && npx vitest run

# Count migrations
ls crm7/supabase/migrations/20260301*.sql | wc -l
# Expected: 17 (9 existing Wave 1 + 1 role expansion + 6 entities + 1 scoping RLS)
# Plus 20260301200800 (tenant_role_permissions) = 18 total with 20260301 prefix
```

---

## After Phase 1

Phase 2 tasks (planned but not yet detailed):
- Request/mediation workflow engine
- Conduit custom fields
- BSU Field Sharing admin panel
- External portal views
- Org identity migration
- Notification flows
- BSU auth UI upgrade (add Google + MS social login — CRM7 as reference)
- Organisation Settings → Permissions UI
- Field officer workload partitioning
