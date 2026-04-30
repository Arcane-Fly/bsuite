# `@bsuite/dry-lint` violations triage — 2026-04-25

**Status:** W (Working — actively triaged)
**Plugin version:** `@bsuite/dry-lint@0.1.1` (bumped from 0.1.0 — `tenants` + `user_tenants` reclassified to `shared`)
**Source report:** `packages/dry-lint/dry-run-report-20260425.md` (54 violations at 0.1.0)
**Post-reclassification count:** 35 violations (19 PHASE-2 ownership-map adjustments + 35 fix targets)

---

## 1. Scope

WS-I PHASE-2 lands `@bsuite/dry-lint` as a `warn`-mode ESLint rule across all D2C consumer apps (CRM7, BSU, conduit, throughput; R80.3 and braden also surveyed but their ESLint wiring lands in PHASE-3). This document triages every violation in the dry-run report and assigns one of four recommended actions:

- **Move to owner** — relocate the write site to the canonical owner app
- **Move to edge function** — wrap the write in a service-role edge function called by the consumer
- **Reclassify** — formally update `ownership-map.json` to mark the table as `shared` with a documented justification
- **Accept-with-justification** — keep the violation but document why it is intentional (rare; requires sign-off)

---

## 2. Summary by app (post-0.1.1)

| App | Violations | Categories |
|-----|-----------:|-----------|
| BSU | 5 | B (schemaBuilder ×3) + Edge-function (tga-search ×2) |
| CRM7 | 11 | A (P1-3 branding ×2, P1-4 settings ×4, P1-5 customFields ×5) |
| Conduit | 4 | B (schemaBuilder ×3) + A (P1-8 settingsStore ×1) |
| Braden | 8 | B (schemaBuilder ×3) + A (P1-9 BrandingAdmin ×4, D-clients ×1) |
| R80.3 | 6 | B (schemaBuilder ×3) + D (P1-11 apprenticeStore ×3) |
| Throughput | 0 | (already clean) |
| **TOTAL** | **35** | |

The 19-violation drop from the 0.1.0 dry-run reflects the §3 ownership decision (12 P1-6 + 4 P1-7 + 2 P1-10 + 1 misc).

---

## 3. Tenant-Management ownership decision (CRITICAL)

**File under decision:** `crm7/supabase/functions/tenant-management/index.ts` — the heaviest violator in the 0.1.0 report (12 hits across `tenants` + `user_tenants`).

### Investigation

The function exposes 22 actions (per the source's `case` statements):

```
create-org, create-division, create-team, create-location,
invite-member, accept-invite, update-member-role, request-membership,
approve-membership, reject-membership, set-sharing-policy,
set-sharing-policies-bulk, seed-sharing-defaults, impersonate-start,
impersonate-end, remove-member, list-hierarchy, list-members,
get-user-tenants, update-tenant, update-portal-role
```

Every action is **scoped to a CRM7 tenant admin operating on their own org hierarchy** — `create-division`/`create-team`/`create-location` build sub-tenant nodes; `invite-member`/`update-member-role`/`remove-member` manage that tenant's `user_tenants` rows; `set-sharing-policy` configures cross-tenant data-sharing for that tenant. RLS enforces tenant scope on every read and write.

This is **not** platform-level tenant CRUD. Platform-level tenant CRUD is BSU's `/developer/tenants` admin surface plus the `stripe-webhook` edge function (which writes `tenants.subscription_id` after Stripe checkout). Those flows belong to BSU because they require platform_admin / developer roles, not tenant-admin.

### Decision

**Reclassify `tenants` and `user_tenants` as `shared` (BSU + CRM7 co-owned).** Path (b) per the WS-I PHASE-2 task brief.

**Justification:**
- `tenants`: BSU owns platform-level tenant CRUD via `/developer/tenants` and Stripe webhook (`stripe-webhook` writes subscription metadata). CRM7 owns tenant-admin surfaces (`tenant-management` edge function: create-org, create-division, update-tenant, invite-member, set-sharing-policy — all scoped to a CRM7 tenant admin managing their own org hierarchy). RLS enforces tenant scope.
- `user_tenants`: BSU owns invitation acceptance flow (canonical signup); CRM7 owns tenant-admin membership operations (invite-member, approve-membership, update-member-role, remove-member) via the `tenant-management` edge function. Same RLS guarantees.

### Trade-off

`shared` in the current rule means **any** app may write — there is no per-app reader/writer list. This means conduit P1-7 (TeamSection.tsx — 2 hits) and R80.3 P1-10 (unifiedSchemaService.ts — 2 hits) become non-violations under the rule, even though the architectural intent is **only BSU + CRM7** should write.

This is accepted as a **PHASE-2 trade-off**. PHASE-3 work items:

- **PHASE-3a:** Conduit P1-7 (`src/components/settings/TeamSection.tsx`) — convert tenant-admin membership writes to call the CRM7 `tenant-management` edge function (the canonical surface). Conduit becomes a consumer of the CRM7 RPC, not a direct writer.
- **PHASE-3b:** R80.3 P1-10 (`src/services/unifiedSchemaService.ts`) — schema-bootstrap writes must move to BSU (this is platform-level provisioning, not tenant-admin). Either an edge function or invocation through `@bsuite/schema-registry` consumer hooks.
- **PHASE-3c:** Optionally extend the rule to support per-app writer lists (e.g. `{"owner": "shared", "writers": ["bsu", "crm7"]}`) so the `shared` accommodation can be tightened back without losing enforcement.

### Implementation

Update applied to `packages/dry-lint/src/ownership-map.json` in this PR; `@bsuite/dry-lint` bumped to `0.1.1` and republished to npm.

---

## 4. Per-violation triage

### 4.1 BSU (5 violations)

| File | Line | Verb / Table | Owner | Action | Notes |
|------|-----:|--------------|-------|--------|-------|
| `business-suite-unified/src/lib/schemaBuilderService.ts` | 111 | `insert tenant_entities` | crm7 | **Move to CRM7 RPC** | Category B — schemaBuilder triplicate. Per Phase 5 schema-registry contract, BSU should consume via `useTenantSchema` and never author. |
| `business-suite-unified/src/lib/schemaBuilderService.ts` | 121 | `update tenant_entities` | crm7 | **Move to CRM7 RPC** | Same as above. |
| `business-suite-unified/src/lib/schemaBuilderService.ts` | 132 | `delete tenant_entities` | crm7 | **Move to CRM7 RPC** | Same as above. |
| `business-suite-unified/supabase/functions/tga-search/index.ts` | 473 | `update qualifications` | crm7 | **Move to CRM7 edge fn** | TGA (Training.gov.au) sync. Function should arguably live under `crm7/supabase/functions/`; deferred until TGA sync is split into a publishable shared package. |
| `business-suite-unified/supabase/functions/tga-search/index.ts` | 483 | `insert qualifications` | crm7 | **Move to CRM7 edge fn** | Same as above. |

### 4.2 CRM7 (11 violations)

| File | Line | Verb / Table | Owner | Action | Notes |
|------|-----:|--------------|-------|--------|-------|
| `crm7/src/pages/settings/branding.tsx` | 142 | `upsert tenant_branding` | bsu | **Delete dead code** | P1-3 — V7a: already redirected to `BrandingRedirect` in commit `e15763c9`. These lines are the OLD code path. PHASE-2 fix: delete the dead branches. |
| `crm7/src/pages/settings/branding.tsx` | 148 | `update tenant_settings` | bsu | **Delete dead code** | Same as above. |
| `crm7/src/pages/settings/feature-flags.tsx` | 135 | `update tenant_settings` | bsu | **Move to BSU `/developer/settings`** | P1-4 — V7a-redux. Either move the entire UI to BSU or formalise CRM7 co-ownership of `tenant_settings`. Recommended: move (BSU is the canonical settings surface). |
| `crm7/src/pages/settings/module-visibility.tsx` | 165 | `update tenant_settings` | bsu | **Move to BSU `/developer/settings`** | Same cluster as P1-4. |
| `crm7/src/pages/settings/module-visibility.tsx` | 176 | `insert tenant_settings` | bsu | **Move to BSU `/developer/settings`** | Same cluster as P1-4. |
| `crm7/src/pages/settings/role-overrides.tsx` | 199 | `upsert tenant_settings` | bsu | **Move to BSU `/developer/settings`** | Same cluster as P1-4. |
| `crm7/src/services/customFieldsService.ts` | 79 | `insert tenant_field_definitions` | bsu | **Convert to consumer-only via `useTenantSchema`** | P1-5 — Phase 5 schema-registry pattern says BSU authors. CRM7 should use `useTenantSchema(supabase, 'crm7')` for reads and not write. |
| `crm7/src/services/customFieldsService.ts` | 92 | `update tenant_field_definitions` | bsu | **Convert to consumer-only** | Same cluster as P1-5. |
| `crm7/src/services/customFieldsService.ts` | 103 | `update tenant_field_definitions` | bsu | **Convert to consumer-only** | Same cluster as P1-5. |
| `crm7/src/services/uiConfigService.ts` | 215 | `insert tenant_field_definitions` | bsu | **Convert to consumer-only** | Same cluster as P1-5. |
| `crm7/src/services/uiConfigService.ts` | 229 | `update tenant_field_definitions` | bsu | **Convert to consumer-only** | Same cluster as P1-5. |

> **Note — `crm7/supabase/functions/tenant-management/index.ts` (12 hits) and `crm7/supabase/functions/store-ram-credential/index.ts:243` (1 hit)**: addressed by the §3 reclassification of `tenants`/`user_tenants` to `shared`. No code change required.

### 4.3 Conduit (4 violations)

| File | Line | Verb / Table | Owner | Action | Notes |
|------|-----:|--------------|-------|--------|-------|
| `conduit/src/lib/schemaBuilderService.ts` | 105 | `insert tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Category B — schemaBuilder triplicate. |
| `conduit/src/lib/schemaBuilderService.ts` | 117 | `update tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Same. |
| `conduit/src/lib/schemaBuilderService.ts` | 128 | `delete tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Same. |
| `conduit/src/stores/settingsStore.ts` | 247 | `upsert tenant_settings` | bsu | **Move to BSU `/developer/settings`** | P1-8 — same as CRM7 P1-4 cluster. Conduit settings UI should consume BSU's tenant_settings via RPC, not write directly. |

> **Note — `conduit/src/components/settings/TeamSection.tsx` (2 hits previously)**: addressed by the §3 `user_tenants` → `shared` reclassification. PHASE-3a tracks the future tightening (route through CRM7 `tenant-management` RPC).

### 4.4 Braden (8 violations)

| File | Line | Verb / Table | Owner | Action | Notes |
|------|-----:|--------------|-------|--------|-------|
| `braden/src/hooks/admin/useSiteEditorData.ts` | 175 | `insert clients` | crm7 | **Move to CRM7 service call** | Braden admin creates a `clients` row when registering a new business inquiry. Should call CRM7 RPC. |
| `braden/src/lib/schemaBuilderService.ts` | 110 | `insert tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Category B — schemaBuilder triplicate. |
| `braden/src/lib/schemaBuilderService.ts` | 124 | `update tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Same. |
| `braden/src/lib/schemaBuilderService.ts` | 135 | `delete tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Same. |
| `braden/src/pages/admin/BrandingAdmin.tsx` | 163 | `upsert tenant_branding` | bsu | **Move to BSU `/branding` admin** | P1-9 — Braden becomes consumer-only via `BrandingProvider` + RPC reads. |
| `braden/src/pages/admin/BrandingAdmin.tsx` | 183 | `upsert tenant_branding` | bsu | **Move to BSU `/branding` admin** | Same as above. |
| `braden/src/pages/admin/BrandingAdmin.tsx` | 195 | `upsert tenant_branding` | bsu | **Move to BSU `/branding` admin** | Same as above. |
| `braden/src/pages/admin/BrandingAdmin.tsx` | 204 | `upsert tenant_branding` | bsu | **Move to BSU `/branding` admin** | Same as above. |
| `braden/src/services/adminCrudService.ts` | 31 | `insert clients` | crm7 | **Move to CRM7 service call** | Same pattern as `useSiteEditorData.ts`. |

### 4.5 R80.3 (6 violations)

| File | Line | Verb / Table | Owner | Action | Notes |
|------|-----:|--------------|-------|--------|-------|
| `R80.3/src/lib/schemaBuilderService.ts` | 99 | `insert tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Category B — schemaBuilder triplicate. |
| `R80.3/src/lib/schemaBuilderService.ts` | 111 | `update tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Same. |
| `R80.3/src/lib/schemaBuilderService.ts` | 122 | `delete tenant_entities` | crm7 | **Delete or convert to CRM7 RPC client** | Same. |
| `R80.3/src/stores/apprenticeStore.ts` | 367 | `upsert apprentices` | crm7 | **Move to CRM7 RPC** | P1-11 — R80.3 should call a CRM7-exposed RPC, not write `apprentices` directly. |
| `R80.3/src/stores/apprenticeStore.ts` | 383 | `delete apprentices` | crm7 | **Move to CRM7 RPC** | Same cluster as P1-11. |
| `R80.3/src/stores/apprenticeStore.ts` | 413 | `upsert apprentices` | crm7 | **Move to CRM7 RPC** | Same cluster as P1-11. |

> **Note — `R80.3/src/services/unifiedSchemaService.ts` (2 hits previously)**: addressed by the §3 `tenants`/`user_tenants` → `shared` reclassification. PHASE-3b tracks the future tightening (move to BSU schema-registry consumer hooks).

### 4.6 Throughput (0 violations)

Throughput is already clean — its `team_members` write was removed in an earlier session per the dry-run report's self-review.

---

## 5. PHASE-3 work breakdown

After this PHASE-2 PR lands, the following items remain for PHASE-3 fix-up sprints:

1. **Category B kill-shot (12 violations across 4 repos)** — delete the `schemaBuilderService.ts` duplicate in BSU, conduit, braden, R80.3. Replace with a thin client that calls a CRM7 RPC. Owner: schema-registry team.
2. **CRM7 settings cluster (P1-3 + P1-4 + P1-5 — 11 violations)** — relocate or reclassify per §4.2.
3. **Edge function lift-and-shift (BSU tga-search ×2 — 2 violations)** — move TGA sync to CRM7 submodule.
4. **Cross-tenant inquiry surfaces (Braden P1-9 + clients ×6 — 6 violations)** — Braden → consumer-only via BSU branding admin + CRM7 client RPC.
5. **R80.3 apprenticeStore (3 violations)** — convert direct `apprentices` writes to CRM7 RPC.
6. **PHASE-3a/b/c per §3** — tighten the `shared` reclassification once the rule supports per-app writer lists.
7. **Promote `bsuite/no-cross-app-write` from `warn` → `error`** in all four consumer ESLint configs (separate per-repo PRs).

---

## 6. Self-review checklist

- [x] Every violation in the source dry-run has been triaged (54/54)
- [x] §3 ownership decision documented with full justification + trade-off section
- [x] `ownership-map.json` updated with `$comment` fields cross-linking to this doc
- [x] `@bsuite/dry-lint` version bumped to 0.1.1 and published to npm
- [x] PHASE-3 work breakdown identifies follow-up sprints
- [x] No PII / secrets in this document
