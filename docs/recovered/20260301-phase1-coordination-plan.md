<!-- G5-VERDICT-BANNER -->
> **VERDICT (SUPERSEDED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⚠️ VERDICT: SUPERSEDED — dead coordination board
>
> Two-agent parallel task split ("Claude Code + Claude 2") for the reconciliation sweep. The work
> it coordinates is **delivered** (see the sibling `20260301-reconciliation-phase1-implementation.md`
> banner); the coordination protocol is obsolete.
>
> Its `DO NOT TOUCH — Auth is Working` fence refers to a 2026-03 auth state that has since been
> replaced by the BSU OAuth 2.1 PKCE bridge. Do not treat that fence as current.
>
> **Marker defect:** carries **no version or status marker at all**, against this estate's naming
> convention — one of 26 such documents counted in the 2026-08-17 completion ledger.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

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

## Cleanup Step

After all tasks pass verification:

1. **Remove dead code / unused imports** introduced during implementation
2. **Lint check** — run ESLint + Prettier on all changed files:
   ```bash
   cd crm7 && npx eslint src/lib/roleMappingService.ts src/schemas/ --fix
   cd ../business-suite-unified && npx eslint src/lib/permissionsService.ts --fix
   ```
3. **Typecheck all 5 projects** (BSU, CRM7, Conduit, R80.3, Braden)
4. **Build all 5 projects** — no regressions
5. **Review git status** — no untracked files, no uncommitted changes
6. **Squash fixup commits** if any (interactive rebase within feature scope only)

---

## Merge Back to Development

All work is on `development` branch already. Final steps:

1. **CC commits parent repo** (Task 7) with updated submodule refs
2. **Push all submodules** to origin/development
3. **Push parent repo** to origin/development
4. **Verify CI** — if any CI checks exist, wait for green

```bash
# Push order: submodules first, then parent
cd /home/braden/Desktop/Dev/bsuite/crm7 && git push origin development
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && git push origin development
cd /home/braden/Desktop/Dev/bsuite && git push origin development
```

---

## Sweep Step

After merge, systematic sweep to verify nothing was missed:

### Migration Sweep
- [ ] Count all `20260301*` migrations — verify expected count
- [ ] Every new table has: `id UUID PK`, `tenant_id`, `RLS ENABLED`, tenant isolation policy, indexes
- [ ] `welfare_reports` has RESTRICTIVE confidential block policy
- [ ] `user_tenant_links` has unique constraint on (user_id, tenant_id, link_type, linked_entity_id)
- [ ] `tenant_role_permissions` has unique constraint on (tenant_id, role, entity)
- [ ] No migration references tables that don't exist yet (ordering)

### Schema Sweep
- [ ] Every Zod schema field name matches its migration column name exactly
- [ ] All schemas exported from `crm7/src/schemas/index.ts`
- [ ] All schema tests pass
- [ ] create vs full schema distinction maintained (full includes id, tenant_id, timestamps)

### Permission Sweep
- [ ] BSU `ROLE_PERMISSIONS` includes all 3 external roles
- [ ] BSU `ROLE_HIERARCHY` has external roles below viewer
- [ ] CRM7 `DEFAULT_ROLE_MAPPING` covers all portal roles
- [ ] `mapPortalRoleToOperational()` handles unknown roles gracefully (returns 'viewer')

### Auth Sweep (VERIFY UNCHANGED)
- [ ] `conduit/src/lib/supabase/client.ts` — still has `flowType: 'pkce'`
- [ ] `conduit/src/lib/supabase/server.ts` — still has `flowType: 'pkce'`
- [ ] `conduit/src/lib/supabase/middleware.ts` — still has `flowType: 'pkce'`
- [ ] `business-suite-unified/src/lib/supabase.ts` — unchanged (cookie storage, PKCE)
- [ ] `business-suite-unified/src/pages/oauth/OAuthConsent.tsx` — unchanged
- [ ] `crm7/src/lib/supabase.ts` — unchanged
- [ ] No new auth-related files created

### Cross-Reference Sweep
- [ ] Design doc and implementation plan are consistent
- [ ] Coordination plan task list matches what was actually implemented
- [ ] No version downgrades in any package.json

---

## Red Team Step

After sweep, each agent red-teams the other's work:

### CC Red-Teams C2's Work (TypeScript)
Dispatch a red-team subagent to review:
1. **BSU permissionsService.ts** — are external roles truly read-only? Can a host_employer escalate to admin via any code path?
2. **CRM7 roleMappingService.ts** — does `mapPortalRoleToOperational()` handle edge cases? What if `tenantOverrides` maps a role to something not in `OperationalRole` type?
3. **Zod schemas** — do CHECK constraints in SQL match Zod enums exactly? Any mismatch = runtime bugs.
4. **Test coverage** — are there negative tests? (invalid input, missing required fields, boundary values)

### C2 Red-Teams CC's Work (Migrations + RLS)
Dispatch a red-team subagent to review:
1. **RLS policy correctness** — do RESTRICTIVE policies actually block what they claim? Walk through each policy with a concrete user scenario.
2. **Welfare reports** — can a host_employer see confidential reports through ANY join path? What about aggregates? Views?
3. **Entity-scoping RLS** — does `user_tenant_links` correctly prevent cross-host data leakage? What if a user has multiple link_types?
4. **tenant_role_permissions** — can a non-admin modify this table? Is the admin-write policy correct?
5. **Migration ordering** — do scoping policies (200700) reference tables from earlier migrations (200100-200600)? Will they fail if run in isolation?

### Red Team Output
Each agent produces a findings report:
- **CRITICAL**: Must fix before merge (security holes, data leakage, broken RLS)
- **IMPORTANT**: Should fix (missing edge cases, incomplete tests)
- **MINOR**: Nice to fix (naming, comments, style)

Fix all CRITICAL and IMPORTANT findings. MINOR findings can be deferred to Phase 2.

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
- RTO email ingestion pipeline (auto-populate training schedules from RTO comms)
