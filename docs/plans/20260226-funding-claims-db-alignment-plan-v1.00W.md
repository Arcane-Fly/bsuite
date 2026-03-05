# Funding Claims: DB Alignment + Dedup Sweep

Align CRM7's funding claims code with the actual Supabase schema (~20 column mismatches), consolidate duplicated utilities/types/constants, and flag dead code — without creating any new duplicate features.

---

## Part A: Duplicate & Dead Code Audit

### A1. `formatCurrency` — 5 separate implementations → consolidate to 1

| Location | Locale | Currency | Decimals |
|---|---|---|---|
| `lib/utils.ts:14` | en-US | USD | default |
| `pages/claims/new.tsx:153` | en-AU | AUD | 0 |
| `pages/claims/list.tsx:60` | en-AU | AUD | 0 |
| `pages/claims/[id].tsx:50` | en-AU | AUD | 2 |
| `pages/claims/dashboard.tsx:34` | en-AU | AUD | 0 |

**Fix**: Upgrade `lib/utils.ts` `formatCurrency` to accept `locale`+`currency` params (default `en-AU`/`AUD`). Remove 4 local copies; import from `@/lib/utils`.

### A2. `formatDate` — 3+ implementations → consolidate to 1

| Location | Locale | Already exists? |
|---|---|---|
| `lib/utils.ts:24` | en-US | ✅ but wrong locale |
| `lib/date-utils.ts:5` | en-AU | ✅ **canonical** |
| `pages/claims/list.tsx:69` | en-AU (inline) | duplicate |
| `pages/claims/[id].tsx:58` | en-AU (inline) | duplicate |

**Fix**: Claims pages should import `formatDate` from `@/lib/date-utils` (already `en-AU`). Remove local copies.

### A3. `getApprenticeName` — 5 implementations → extract shared helper

| Location | Signature |
|---|---|
| `pages/claims/list.tsx:78` | `(claim: any) → string` (uses `.apprentice` JOIN) |
| `pages/claims/[id].tsx:68` | identical |
| `pages/claims/dashboard.tsx:44` | identical |
| `pages/timesheets/index.tsx:94` | `(apprenticeId: number) → string` (different — lookup by ID) |
| `pages/progress-reviews/reviews/index.tsx:69` | same as timesheets |

**Fix**: Extract claims-specific `getApprenticeName(claim)` to `lib/entity-display.ts`. Leave timesheets/reviews versions alone (different pattern — they look up by ID, not JOIN).

### A4. `getFundingSourceName` / `getFundingSource` — 2 implementations

| Location | Returns |
|---|---|
| `pages/claims/list.tsx:86` | `string` (just name) |
| `pages/claims/[id].tsx:76` | `{ name, provider }` |

**Fix**: Extract to `lib/entity-display.ts` alongside `getApprenticeName`.

### A5. Status constants — 4 overlapping definitions

| Location | What |
|---|---|
| `fundingWorkflow.ts:93` | `STATUS_COLORS` (color names: 'gray', 'blue'...) |
| `pages/claims/list.tsx:46` | `STATUS_BADGE_CLASSES` (Tailwind classes) |
| `pages/claims/dashboard.tsx:22` | `STATUS_COLORS` (hex values for recharts) |
| `pages/claims/[id].tsx:38` | `STATUS_CONFIG` (label + classes + icon) |

**Fix**: Consolidate into `fundingWorkflow.ts` — export `STATUS_LABELS` (already there), `STATUS_BADGE_CLASSES`, `STATUS_CHART_COLORS`, `STATUS_ICONS`. Pages import from single source.

### A6. `features/financial` module — DEAD CODE

- `financialService.ts` hits `/api/financial` (no backend exists, same pattern as removed `features/auth`)
- `useFinancial.ts` hooks wrap the dead service
- `financial.ts` types use camelCase (not Supabase-aligned)
- **Only consumer**: `ModernDashboard.tsx` line 10 (imports `useRevenueMetrics` — returns undefined since API doesn't exist)

**Fix**: Flag for removal (separate PR). For now, do NOT duplicate any of its types or patterns.

### A7. Invoice type — 2 definitions (no conflict)

- `types/entities.ts:478` — canonical, snake_case, Supabase-aligned ✅
- `features/financial/types/financial.ts:33` — dead code, camelCase

**Status**: No action needed — they don't conflict. The dead one will be cleaned up with A6.

### A8. `ValidationError` — 2 definitions (different concepts)

- `types/entities.ts:628` — service-layer: `{ field, message, code }`
- `shared/hooks/useFormValidation.ts:4` — form-level: `{ [key: string]: string[] }`

**Status**: Different shapes for different purposes. No action needed — they're used in separate scopes and don't clash at import level.

---

## Part B: DB ↔ Type/Service Column Alignment

### B1. `funding_sources` — Type vs DB

| TS Type Field | DB Column | Fix |
|---|---|---|
| `type` | `source_type` | Align type → `source_type` |
| `total_amount` | `total_budget` | Align type → `total_budget` |
| `remaining_amount` | `remaining_budget` | Align type → `remaining_budget` |
| `provider` | ❌ missing | Add column via migration |
| `program_name` | ❌ missing | Add column via migration |
| `contact_person` | `contact_name` | Align type → `contact_name` |
| ❌ | `contact_email`, `contact_phone` | Add to type |
| ❌ | `description` | Add to type |
| `eligibility_criteria?: string` | `eligibility_criteria JSONB` | Fix type to `Record<string, unknown>` |

### B2. `funding_claims` — Type vs DB

| TS Type Field | DB Column | Fix |
|---|---|---|
| `documents` | `supporting_documents` | Align type → `supporting_documents` |
| `timeline_events` | ❌ missing | Add column via migration |
| eligibility fields (7) | ❌ missing | Add columns via migration |
| ❌ | `claim_period_start/end` | Add to type |
| ❌ | `approved_amount`, `paid_amount` | Add to type |
| ❌ | `rejection_reason` | Add to type |
| ❌ | `workforceone_claim_id` | Add to type |

### B3. Pages — wrong column names

| Page | References | DB Has |
|---|---|---|
| `list.tsx`, `dashboard.tsx`, `[id].tsx` | `claim.amount` | `claim_amount` |
| `list.tsx`, `dashboard.tsx`, `[id].tsx` | `claim.claim_date` | `claim_period_start` |
| `[id].tsx` | `claim.payment_date` | `paid_at` |
| `[id].tsx` | `claim.payment_reference` | ❌ (add column) |
| `new.tsx` form | `amount`, `claim_date` | `claim_amount`, `claim_period_start` |

### B4. Service layer — wrong JOIN columns

- All JOINs use `funding_sources(id, name, provider, remaining_amount)` → DB has `remaining_budget`, no `provider` (until migration)
- `createClaim` writes `timeline_events`, `documents` → DB has `supporting_documents`, no `timeline_events` (until migration)

### B5. Stores — wrong columns

- `fundingClaimStore.ts`: JOIN references `provider`, `remaining_amount`
- `fundingSourceStore.ts`: filter uses `type` but DB has `source_type`

---

## Implementation Plan (ordered)

### Phase 1: DB Migration — add missing columns (10 min)

Via Supabase MCP `apply_migration`:

- `funding_claims`: add `timeline_events JSONB DEFAULT '[]'`, `payment_reference TEXT`, 7 eligibility columns
- `funding_sources`: add `provider TEXT`, `program_name TEXT`

### Phase 2: Consolidate shared utilities (15 min)

- Upgrade `lib/utils.ts` `formatCurrency(amount, currency='AUD', locale='en-AU')`
- Create `lib/entity-display.ts` with `getApprenticeName(claim)`, `getFundingSourceDisplay(claim)`
- Move status constants into `fundingWorkflow.ts` exports

### Phase 3: Align types to DB (10 min)

- `entities.ts` `FundingSource`: rename fields to match DB + add missing
- `entities.ts` `FundingClaim`: rename `documents` → `supporting_documents`, add missing DB fields, fix JOIN type

### Phase 4: Fix service layer (10 min)

- `fundingService.ts`: fix JOIN selects, column writes, import shared utils

### Phase 5: Fix stores (5 min)

- `fundingClaimStore.ts`: fix `selectColumns` JOIN
- `fundingSourceStore.ts`: fix filter column name

### Phase 6: Fix pages — use shared utils + correct columns (20 min)

- All 4 claims pages: remove local `formatCurrency`/`formatDate`/`getApprenticeName`, import from shared
- Fix column references (`amount` → `claim_amount`, `claim_date` → `claim_period_start`, etc.)
- Import status constants from `fundingWorkflow.ts`

### Phase 7: Build verify + stale reference grep (5 min)

---

## Files to Modify

| # | File | Changes |
|---|---|---|
| 1 | **DB migration** (Supabase MCP) | Add ~10 columns |
| 2 | `lib/utils.ts` | Upgrade `formatCurrency` signature |
| 3 | `lib/entity-display.ts` | **NEW** — shared display helpers |
| 4 | `lib/fundingWorkflow.ts` | Add status badge/chart/icon exports |
| 5 | `types/entities.ts` | Align FundingSource + FundingClaim |
| 6 | `services/fundingService.ts` | Fix JOINs + column refs |
| 7 | `stores/fundingClaimStore.ts` | Fix selectColumns |
| 8 | `stores/fundingSourceStore.ts` | Fix filter column |
| 9 | `pages/claims/list.tsx` | Dedup + column fixes |
| 10 | `pages/claims/dashboard.tsx` | Dedup + column fixes |
| 11 | `pages/claims/[id].tsx` | Dedup + column fixes |
| 12 | `pages/claims/new.tsx` | Dedup + column fixes |

**NOT modified** (flagged only): `features/financial/` module (dead code — separate cleanup PR)

## Estimated Time: ~75 minutes
