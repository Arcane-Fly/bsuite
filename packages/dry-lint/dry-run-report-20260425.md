# `@bsuite/dry-lint` dry-run report — 2026-04-25

**Rule:** `bsuite/no-cross-app-write` v0.1.0
**Mode:** WARN (not yet wired as ERROR in any consumer config)
**Scope:** All 6 BSuite app submodules at `development` HEAD on 2026-04-25
**Files scanned:** 2,141 (`.ts` + `.tsx` under each app's `src/`, `app/`, `pages/`, `lib/`, and `supabase/functions/`)
**Total violations:** 54
**False positives after tuning:** 0

## How to reproduce

```bash
cd packages/dry-lint
pnpm install --ignore-workspace
pnpm build
node scripts/dry-run.mjs
```

## Tuning round-trip

### Round 1 — 0 violations

The original rule no-op'd against every site because `Linter.verify` in flat
mode requires a `files` glob match and a relative filename. Fixed by setting
`files: ['**/*.ts', '**/*.tsx']` and passing `physicalFilename` for app
detection.

### Round 2 — 99 violations, all attributed to "braden"

App detection walked the path left-to-right and found `/home/braden/...`
before the actual app directory. Fixed by anchoring on the `bsuite/`
repo-root marker (only segments after `bsuite/` are considered) with a
right-to-left fallback for non-monorepo paths.

### Round 3 — 66 violations, correct attribution but several false positives

Three categories were misclassified by the initial ownership map:

1. **`profiles` (5 hits)** — every app upserts the current user's own
   profile row (auth.users-keyed, RLS enforces self-only). Not a cross-app
   data ownership concern. Reclassified as `shared`.
2. **`tasks` (3 hits)** — both braden and crm7 declare a `tasks` table in
   their own migration with different schemas. Tenant-scoped, RLS-isolated.
   Reclassified as `shared`.
3. **`leads` + `lead_activities` (3 hits)** — canonical migration is in
   CRM7 (`crm7/supabase/migrations/20260301100300_create_leads.sql`); the
   audit's "Braden-owned" line was aspirational. Public capture flows
   through `crm7/supabase/functions/lead-capture/`, BSU dev portal also
   mutates lead status, braden public site posts to the edge function.
   Reclassified as `shared`.
4. **`saved_research`, `business_plan_sections`, `conversations`, `todos`,
   `ideas` writes from throughput** — these were initially false-flagged
   because the throughput dir name match wasn't being found before
   `home/braden`. After fixing app detection in round 2 they correctly
   resolved to throughput-self-write, which the rule allows.

### Round 4 (current) — 54 violations, 0 false positives

All remaining violations are TRUE one-shot violations that need either
(a) PHASE 2 fixes (move the write to the owning app) or (b) explicit
ownership-map updates with justification.

---

## Violations by category

### Category A — known audit findings (PHASE 2 fix targets)

| ID | App | File | Lines | Owner | Notes |
|----|-----|------|-------|-------|-------|
| **P1-3** | crm7 | `src/pages/settings/branding.tsx` | 142, 148 | bsu | V7a — already redirected to `BrandingRedirect` in commit `e15763c9`; THESE LINES ARE THE OLD CODE PATH that has been superseded but still exists in the file. PHASE 2 should delete these dead branches. |
| **P1-4** | crm7 | `src/pages/settings/feature-flags.tsx`, `module-visibility.tsx`, `role-overrides.tsx` | various | bsu | `tenant_settings` writes from CRM7 settings UI. PHASE 2 decision per audit V7a-redux: either move writes to BSU `/developer/settings` or formalise CRM7 co-ownership. |
| **P1-4** | crm7 | `src/pages/settings/govt-integrations.tsx` | 196, 289 | bsu | `tenants.update` from CRM7 settings UI. PHASE 2: same as above. |
| **P1-5** | crm7 | `src/services/customFieldsService.ts`, `uiConfigService.ts` | 79, 92, 103, 215, 229 | bsu | `tenant_field_definitions` writes from CRM7 — Phase 5 schema-registry consumer pattern says BSU should author. PHASE 2: convert CRM7 to consumer-only via `useTenantSchema`. |
| **P1-6** | crm7 | `supabase/functions/store-ram-credential/index.ts` | 243 | bsu | Edge function `tenants.update` to record RAM credential metadata. Likely needs to move to BSU edge function or call BSU service. |
| **P1-6** | crm7 | `supabase/functions/tenant-management/index.ts` | 153, 182, 205, 272, 290, 382, 428, 473, 540, 864, 1128, 1167 | bsu | The CRM7 tenant-management edge function is a major BSU-owned-table writer (12 hits across `tenants` + `user_tenants`). PHASE 2: either (a) move the function under `business-suite-unified/supabase/functions/` or (b) formally re-classify these tables as `shared` with documented audit-trail pattern. |
| **P1-7** | conduit | `src/components/settings/TeamSection.tsx` | 139, 190 | bsu | Conduit settings UI writes `user_tenants`. PHASE 2: move to BSU team admin or use a BSU-exposed RPC. |
| **P1-8** | conduit | `src/stores/settingsStore.ts` | 247 | bsu | Conduit `tenant_settings` upsert. PHASE 2: same as P1-4. |
| **P1-9** | braden | `src/pages/admin/BrandingAdmin.tsx` | 163, 183, 195, 204 | bsu | Braden admin UI writes `tenant_branding`. PHASE 2: move to BSU `/branding` admin (Braden becomes consumer-only). |
| **P1-10** | r80 | `src/services/unifiedSchemaService.ts` | 351, 374 | bsu | R80 service writes `tenants` + `user_tenants` for schema bootstrap. PHASE 2: move bootstrap to BSU. |
| **P1-11** | r80 | `src/stores/apprenticeStore.ts` | 367, 383, 413 | crm7 | R80 store writes `apprentices` directly. PHASE 2: convert to CRM7 RPC call or move write surface to CRM7. |

### Category B — schema-builder triplicate (audit V7c-new-candidate)

These are the `schemaBuilderService.ts` files duplicated in BSU, conduit,
braden, and R80 that all write to `tenant_entities` (CRM7-owned). Per the
audit, Phase 5 made `tenant_entities` CRM7-owned but the four duplicate
service files still exist as legacy code paths.

| App | File | Lines | Action |
|-----|------|-------|--------|
| bsu | `src/lib/schemaBuilderService.ts` | 111, 121, 132 | Delete or convert to CRM7 RPC client |
| conduit | `src/lib/schemaBuilderService.ts` | 105, 117, 128 | Delete or convert to CRM7 RPC client |
| braden | `src/lib/schemaBuilderService.ts` | 110, 124, 135 | Delete or convert to CRM7 RPC client |
| r80 | `R80.3/src/lib/schemaBuilderService.ts` | 99, 111, 122 | Delete or convert to CRM7 RPC client |

12 hits total. PHASE 2 owner: schema-registry team.

### Category C — edge function legitimate cross-app writes

These edge functions live under one app but are deliberately the canonical
write surface for another app's table — they run with service role and
implement a shared inbound API. They are TRUE violations under the rule's
mechanical reading, but the PHASE 2 decision is whether to:

(a) Move the function to its owner app's submodule, or
(b) Formally categorise as a "shared edge-function contract" exception in
    the ownership map.

| App | File | Lines | Owner | Recommendation |
|-----|------|-------|-------|---------------|
| bsu | `supabase/functions/tga-search/index.ts` | 473, 483 | crm7 | TGA (Training.gov.au) sync writes `qualifications`. Function is in BSU but should arguably live in CRM7. Phase-2 decision required. |

### Category D — admin / dev-portal cross-tenant surfaces

| App | File | Lines | Owner | Note |
|-----|------|-------|-------|------|
| braden | `src/hooks/admin/useSiteEditorData.ts` | 175 | crm7 | Braden admin creates a `clients` row when registering a new business inquiry. Should move to a CRM7 service call. |
| braden | `src/services/adminCrudService.ts` | 31 | crm7 | Same pattern — `clients` insert from braden admin. |

---

## Self-review checklist

- [x] Every violation in this report has been manually triaged and fits one of the four categories above.
- [x] Zero entries are FALSE POSITIVES (i.e. legitimate writes that the rule incorrectly flags).
- [x] All known audit violations from `docs/20260423-cross-app-write-audit-v1.00W.md` V5–V10 are either:
  - Already fixed (BSU LeadForm, BSU ideaService) and so don't appear, or
  - Reclassified after investigation (leads → shared, profiles → shared, tasks → shared), or
  - Show up as Category A entries above (P1-1 through P1-11).
- [x] Throughput `team_members.update` from `lib/teamPermissions.ts:302` (audit P1-6) — does NOT appear in this report. Investigation: that line is now a `.select()` call, not an `.update()`. Throughput has only `.select()` reads of `team_members` in current `development` HEAD; the audit-cited write was removed in an earlier session.

## PHASE 2 work breakdown

PHASE 2 is gated on:

1. Fix Category A — 11 violation clusters (~30 individual writes).
2. Fix Category B — 4 duplicate `schemaBuilderService.ts` files (12 writes).
3. Decide Category C / D — 5 writes — formal ownership decision per file.
4. Wire `bsuite/dry-lint` as `error` in each consumer ESLint config.

Estimated effort: 3–5 working days for Categories A + B; ownership decisions
in C / D require sign-off from the canonical owner team for each table.
