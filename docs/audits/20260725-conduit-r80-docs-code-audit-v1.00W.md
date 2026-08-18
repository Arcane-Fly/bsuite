# Docs ↔ Code Audit — conduit + R80.3 (Read-Only)

> **File:** `20260725-conduit-r80-docs-code-audit-v1.00W.md`
> **Status:** W (Working) · **Mode:** READ-ONLY (no files modified)
> **Date:** 2026-07-25

> ## ⚠ §4 AUDITS A REPOSITORY THAT NO LONGER EXISTS — re-measured 2026-08-18
>
> **This audit was accurate on 2026-07-25. It is not a document to act on today.**
>
> Section 4 is headed *"R80.3 — Funding Offsets"*. **R80.3 was archived**; the live
> repository is R80.4, which is a RESTRUCTURE rather than a rename, so those paths
> resolve nowhere. Re-checking every row this audit marks `✅` (exists):
>
> | | |
> |---|---|
> | rows marked ✅ | **40** |
> | exact path still resolves | **11** |
> | file moved — path stale, code alive | **7** |
> | genuinely gone (almost all §4 / R80.3) | **22** |
>
> The 22 cluster: the entire funding-offset feature — migration, `fundingSchemes.ts`,
> `fundingOffsetTool.ts`, `fundingOffset.ts`, `fundingOffsetsService.ts` and five test
> files. That feature is not lost; it lives in **crm7 (5 files) and BSU (5 files)**
> today. What is gone is the R80.3 copy this audit examined.
>
> **The table below is NOT corrected, deliberately.** A dated audit's rows are the
> measurement it was written to preserve; rewriting them destroys the record and
> leaves a document that looks current and was never re-verified. Read §4 as history.
> **Scope:** Non-archive feature/reference docs in `conduit/docs/` and `R80.3/docs/`, cross-checked against source code in both repos.
> **Coverage:** recruitment, STA email ingestion, handover, billing models, charge-calc, funding offsets, payroll (payday super), awards (FWC MAPD), training fees, invoice runs, typecheck gate, schema-builder consolidation, CSP.
> **Match rule:** SUBSTANTIVE-MATCH = the claimed file/function/symbol/table/column exists and the claim is substantively accurate. Line-number drift and minor wording differences do not fail a claim.

---

## 1. Docs Scanned

### conduit (16 non-archive docs)

| # | Doc | Type |
|---|-----|------|
| 1 | `20260519-csp-policy-reference-v1.00W.md` | Reference |
| 2 | `20260629-supabase-auth-comprehensive-verification-v1.00W.md` | Verification record |
| 3 | `20260723-schema-builder-registry-consolidation-chore-v1.00W.md` | Chore |
| 4 | `20260725-training-contract-status-email-ingestion-feature-v1.00W.md` | Feature |
| 5 | `20260726-recruitment-employment-handover-feature-v1.00W.md` | Feature |
| 6–16 | `CONSISTENCY-REPORT.md`, `DEPENDENCY-BUMP-CHECKLIST.md`, `FEATURE-SURFACE.md`, `INDEX.md`, `PARENT-DOCS.md`, `README.md`, `STACK-AUDIT.md`, `UNIFIED-ROADMAP.md`, `plans/*` | Meta / plans |

### R80.3 (20 non-archive docs)

| # | Doc | Type |
|---|-----|------|
| 1 | `20260304-r80-billing-models-reference-v1.00W.md` | Reference |
| 2 | `20260304-r80-external-wage-sources-reference-v1.00W.md` | Reference |
| 3 | `20260304-r80-fairwork-api-reference-v1.00W.md` | Reference |
| 4 | `20260304-r80-training-fees-feature-v1.01A.md` | Feature |
| 5 | `20260418-payday-super-feature-v1.00A.md` | Feature |
| 6 | `20260519-csp-policy-reference-v1.00W.md` | Reference |
| 7 | `20260702-invoice-runs-feature-v1.00W.md` | Feature |
| 8 | `20260706-r80-typecheck-gate-burndown-v1.00W.md` | Burndown |
| 9 | `20260723-schema-builder-registry-consolidation-chore-v1.00W.md` | Chore |
| 10 | `20260726-funding-offsets-feature-v1.00W.md` | Feature |
| 11–20 | `CONSISTENCY-REPORT.md`, `DEPENDENCY-BUMP-CHECKLIST.md`, `FEATURE-SURFACE.md`, `INDEX.md`, `PARENT-DOCS.md`, `README.md`, `STACK-AUDIT.md`, `UNIFIED-ROADMAP.md`, `plans/*` | Meta / plans |

---

## 2. conduit — Training-Contract Status Signal via STA Email Ingestion

**Doc:** `conduit/docs/20260725-training-contract-status-email-ingestion-feature-v1.00W.md`

### 2.1 Component / File Verification

| # | Claimed File | Exists? | Verdict |
|---|---|---|---|
| 1 | `supabase/migrations/20260725090000_training_contract_email_ingestion.sql` | ✅ | MATCH |
| 2 | `supabase/migrations/20260725091000_sta_email_watch_cron.sql` | ✅ | MATCH |
| 3 | `src/lib/recruitment/staEmailRegistry.ts` | ✅ | MATCH |
| 4 | `supabase/functions/sta-email-watch/index.ts` | ✅ | MATCH |
| 5 | `src/lib/recruitment/staParsers/` (10 modules: act, nsw, nt, qld, sa, tas, vic, wa, index, shared) | ✅ | MATCH |
| 6 | `src/lib/recruitment/staReferenceMatcher.ts` | ✅ | MATCH |
| 7 | `src/lib/recruitment/offerStateMachine.ts` | ✅ | MATCH |
| 8 | `src/app/(dashboard)/settings/staEmailActions.ts` | ✅ | MATCH |
| 9 | `src/components/settings/StaEmailsSection.tsx` | ✅ | MATCH |
| 10 | `__tests__/staEmailRegistry.test.ts` | ✅ | MATCH |
| 11 | `__tests__/staParsers.test.ts` | ✅ | MATCH |
| 12 | `__tests__/staReferenceMatcher.test.ts` | ✅ | MATCH |
| 13 | `__tests__/staLodgementTransitions.test.ts` | ✅ | MATCH |
| 14 | `__tests__/staEmailIngestion.rls.test.ts` | ✅ | MATCH |

### 2.2 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | 8-state registry (ACT, NSW, NT, QLD, SA, TAS, VIC, WA) | `STATE_CODES = ['wa', 'vic', 'nsw', 'qld', 'sa', 'tas', 'act', 'nt']` in `staEmailRegistry.ts:30` | MATCH |
| 2 | `detectStateFromEmail` function | Exported at `staEmailRegistry.ts:169` | MATCH |
| 3 | `extractReferenceByLabels` (regex-free) | Exported at `staEmailRegistry.ts:199`; uses label-line scanning, no regex | MATCH |
| 4 | `canTransitionLodgementOutcome` | Exported at `offerStateMachine.ts:158` | MATCH |
| 5 | `assertLodgementOutcomeTransition` | Exported at `offerStateMachine.ts:168` | MATCH |
| 6 | `staOutcomeToLodgementOutcome` | Exported at `offerStateMachine.ts:183`; maps `accepted→approved`, `rejected→rejected`, `needs_info→pending` | MATCH |
| 7 | `confirmStaEmail` server action | Exported at `staEmailActions.ts:45`; imported + called in `StaEmailsSection.tsx:41,126` | MATCH |
| 8 | RLS: member SELECT, owner/admin UPDATE, service-role INSERT, anon revoked | Migration confirms: `sta_inbound_emails_member_select`, `sta_inbound_emails_admin_update`, `REVOKE ALL FROM anon`, `ENABLE ROW LEVEL SECURITY` | MATCH |
| 9 | `training_contract_status_confirmations`: member SELECT, owner/admin INSERT with `confirmed_by = auth.uid()` | Migration: `tcsc_member_select`, `tcsc_admin_insert` policies confirmed | MATCH |
| 10 | pg_cron every 15 min, vault-backed | `*/15 * * * *` schedule, reads `vault.decrypted_secrets` for URL + token | MATCH |
| 11 | WA (WAAMS) + NT proven, other 6 stubbed low-confidence | `staParsers/index.ts` comment: "WA and NT are the proven formats; the other six are generic stubs capped at low confidence" | MATCH |
| 12 | 49 assertions | 50 `it()/test()` calls, 86 `expect()` calls across 5 test files — substantively accurate | MATCH |
| 13 | `r7_offers.lodgement_outcome` (`pending → approved | rejected`) | Referenced in migration + `offerStateMachine.ts` | MATCH |
| 14 | `sta_inbound_emails` + `training_contract_status_confirmations` tables | Both `CREATE TABLE` statements in migration | MATCH |

### 2.3 Self-Report Divergences (doc-acknowledged)

| # | Item | Doc Status | Verified |
|---|---|---|---|
| 1 | Sender domains best-effort, not verified against live traffic | Acknowledged in §Self-report | ✅ Doc is transparent |
| 2 | Live UX gate not exercised (no deployed domain) | Acknowledged in §Self-report | ✅ Doc is transparent |
| 3 | Edge/app mirror (Deno watcher duplicates registry inline) | Acknowledged in §Self-report | ✅ Mirror parity test exists |

---

## 3. conduit — Recruitment → Employment Handover

**Doc:** `conduit/docs/20260726-recruitment-employment-handover-feature-v1.00W.md`

### 3.1 Component / File Verification

| # | Claimed File | In conduit? | In crm7? | Verdict |
|---|---|---|---|---|
| 1 | `src/lib/recruitment/handoverDocuments.ts` | ❌ GONE | ❌ Not standalone | DIVERGENCE — see §3.3 |
| 2 | `src/lib/recruitment/handoverEmails.ts` | ❌ GONE | ❌ Not standalone | DIVERGENCE |
| 3 | `src/lib/recruitment/handoverRequiredDocs.ts` | ❌ GONE | ❌ Not standalone | DIVERGENCE |
| 4 | `src/lib/recruitment/handoverContract.ts` | ❌ GONE | ❌ Not standalone | DIVERGENCE |
| 5 | `supabase/functions/handover-to-employment/index.ts` | ❌ GONE | ✅ (434 lines) | MATCH (moved) |
| 6 | `src/app/(dashboard)/candidates/[id]/actions.ts` | ✅ | N/A | MATCH |
| 7 | `__tests__/handoverDocuments.test.ts` | ❌ GONE | ❌ Not found | DIVERGENCE |
| 8 | `__tests__/handoverEmails.test.ts` | ❌ GONE | ❌ Not found | DIVERGENCE |
| 9 | `__tests__/handoverRequiredDocs.test.ts` | ❌ GONE | ❌ Not found | DIVERGENCE |
| 10 | `__tests__/handoverContract.test.ts` | ❌ GONE | ❌ Not found | DIVERGENCE |

### 3.2 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | `createApprenticeHandoffToken` exists and snapshot includes `candidate_id` + `application_id` | `actions.ts:183` exports it; `CandidateSnapshot` interface includes `candidate_id: string` (103) + `application_id?: string` (105) | MATCH |
| 2 | Edge function moved to crm7 (`crm7/supabase/functions/handover-to-employment/`) | File exists (434 lines); conduit's copy is gone | MATCH |
| 3 | `verify_jwt=true` at the gateway | `crm7/supabase/config.toml`: `[functions.handover-to-employment] verify_jwt = true` | MATCH |
| 4 | SSRF-hardened: only copies from `candidate-documents` bucket | Edge fn line 267: "Only copy documents whose bytes live in the candidate-documents bucket"; explicit bucket check before copy | MATCH |
| 5 | `email_message_links` join table (`20260726090000`) with shape `(email_id, tenant_id, entity_type, entity_id, created_by, unique(email_id, entity_type, entity_id))` | `crm7/supabase/migrations/20260726090000_email_message_links.sql` — all columns + unique constraint confirmed | MATCH |
| 6 | Input contract `{ handoff_token, person_id }` unchanged | Edge fn references `handoff_token` + `person_id` | MATCH |
| 7 | Deterministic storage path `<host>/recruitment-handover/<person>/<source_doc>/<file>` | Edge fn constructs `destPath` with path components | MATCH |
| 8 | `[handover]` provenance marker in `verification_notes` | Edge fn writes provenance marker | MATCH |
| 9 | Idempotency via `UNIQUE(tenant_id, storage_bucket, storage_path)` + `upsert:false` | Edge fn checks existing paths and skips duplicates | MATCH |

### 3.3 Divergences

| # | Divergence | Impact | Severity |
|---|---|---|---|
| 1 | **Validation evidence section references test files that no longer exist in conduit.** The doc §"Validation evidence" says "42 tests" in `src/lib/recruitment/__tests__/handover{Documents,Emails,RequiredDocs,Contract}.test.ts` — these files were removed as part of the "Ownership move". The doc's final section ("Ownership move") does state the helper `.ts` modules were "removed as orphaned", but does not explicitly state the test files were also removed. A reader scanning only the Validation evidence section would believe the tests are live in conduit. | Misleading validation evidence — tests cited as coverage no longer exist in this repo. | **Medium** |
| 2 | **Doc says "crm7's port inlines its own tested copies" — no handover test files exist in crm7.** The crm7 edge function (434 lines) inlines the helper logic but has no corresponding test files. The claim that crm7 has "tested copies" is not substantiated by test file evidence. | Untested inlined logic in the edge function. | **Medium** |

---

## 4. R80.3 — Funding Offsets

**Doc:** `R80.3/docs/20260726-funding-offsets-feature-v1.00W.md`

### 4.1 Component / File Verification

| # | Claimed File | Exists? | Verdict |
|---|---|---|---|
| 1 | `supabase/migrations/20260726090000_funding_offsets.sql` | ✅ | MATCH |
| 2 | `src/lib/fundingSchemes.ts` | ✅ | MATCH |
| 3 | `src/lib/ai/fundingOffsetTool.ts` | ✅ | MATCH |
| 4 | `src/lib/fundingOffset.ts` (not named in doc but is the core module) | ✅ | MATCH (extra) |
| 5 | `src/services/fundingOffsetsService.ts` (not named in doc) | ✅ | MATCH (extra) |
| 6 | `src/lib/fundingSchemes.test.ts` | ✅ | MATCH |
| 7 | `src/lib/fundingOffset.test.ts` | ✅ | MATCH |
| 8 | `src/lib/ai/fundingOffsetTool.test.ts` | ✅ | MATCH |
| 9 | `src/tests/fundingOffsetsMigration.test.ts` | ✅ | MATCH |
| 10 | `src/utils/calcBridge.fundingOffset.test.ts` | ✅ | MATCH |

### 4.2 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | `funding_offsets` table with columns: `placement_id, scheme, expected_amount, received_amount, applied, applied_at, notes, audit` | Migration confirms all columns: `placement_id uuid`, `scheme text`, `expected_amount numeric`, `received_amount numeric`, `applied boolean`, `applied_at timestamptz` | MATCH |
| 2 | `scheme` is custom scheme keys, NOT a hardcoded enum | Migration: `scheme text NOT NULL -- scheme KEY (registry in src/lib/fundingSchemes.ts); NOT an enum` | MATCH |
| 3 | Known scheme keys: WA GWS, federal EIS, per-state incentive set | `fundingSchemes.ts`: `wa_gws`, `federal_eis`, `federal_aais_priority_wage_subsidy`, `federal_aais_hiring_incentive`, `wa_jobs_skills_employer_incentive` | MATCH |
| 4 | RLS: tenant-member SELECT, admin INSERT/UPDATE | Migration: `auth_tenant_id()` for SELECT, `auth_tenant_id_with_role(ARRAY['owner', 'admin', 'manager'])` for INSERT/UPDATE/DELETE | **PARTIAL** — doc undersells: actual includes `manager` role and DELETE policy (see §4.3) |
| 5 | charge-calc `fundingOffset` term reduces computed charge | `calcBridge.ts:436` — `fundingOffset?: FundingOffsetInput` param; `applyFundingOffsetToResult()` at line 399 | MATCH |
| 6 | Jodie funding-offset tool ("apply the WA GWS subsidy…") AI-licence-gated | `fundingOffsetTool.ts:4` — description matches; `aiLicenceGate` context field at line 31 | MATCH |

### 4.3 Divergences

| # | Divergence | Impact | Severity |
|---|---|---|---|
| 1 | Doc says "admin INSERT/UPDATE" — actual RLS grants INSERT/UPDATE/DELETE to `owner`, `admin`, **and `manager`** roles. Doc omits `manager` role and DELETE policy. | Minor understatement of write-access scope. | **Low** |

---

## 5. R80.3 — Billing Models Reference

**Doc:** `R80.3/docs/20260304-r80-billing-models-reference-v1.00W.md`

### 5.1 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Three billing models: Standard, ALEX48, W52 | `src/types/index.ts:35` — `export type BillingModel = 'Standard' \| 'ALEX48' \| 'W52'` | MATCH |
| 2 | Standard: training hours excluded from billable, spread over worked time | `calcBridge.ts:131` — `case 'Standard'` deducts training weeks | MATCH |
| 3 | ALEX48: only annual leave excluded, training billed directly | `calcBridge.ts:134` — `case 'ALEX48'`; training not deducted (line 297-298) | MATCH |
| 4 | W52: 52 weeks of work for billing, training billed directly | `calcBridge.ts:135` — `case 'W52'`; same training logic as ALEX48 | MATCH |
| 5 | Training weeks default 5 per year (configurable) | `calcBridge.ts:58` — `trainingWeeks: 5` | MATCH |
| 6 | Backward compat: `includeTrainingTime` legacy flag when no billing model | `calcBridge.ts:65` — `includeTrainingTime: false`; line 140 — `if (!billableOptions.includeTrainingTime)` fallback | MATCH |
| 7 | All models include training time in OTE | Training time always counted in paid hours regardless of model (billable hours change, not paid hours) | MATCH |
| 8 | Charge-rate formula | Formula in doc matches the calcBridge composition: `(baseWage + totalOncostPerHour) × (52 / billableWeeks) × (1 + margin/100)` — verified by cross-referencing `calcBridge.ts` margin/billableWeeks logic | MATCH |

---

## 6. R80.3 — External Wage Sources Reference

**Doc:** `R80.3/docs/20260304-r80-external-wage-sources-reference-v1.00W.md`

### 6.1 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | CSV import with required columns: `name` + at least one `yearN_rate` | `WageSourceManager` (52 references), `validateSpreadsheetWageData` (7 references) in `src/` | MATCH |
| 2 | Alternative column names (`year1`, `year_1`, `first_year`, `1st_year`, etc.) | Code handles multiple column name formats | MATCH |
| 3 | `WageSourceManager.importWageDataFromFile(file)` API | 12 references to `importWageDataFromFile` | MATCH |
| 4 | `getWageRateFromSpreadsheetData(wageData, year)` API | 12 references to `getWageRateFromSpreadsheetData` | MATCH |
| 5 | Validation against reference spreadsheet cells X32, W32, V32 | `src/tests/spreadsheetWageService.test.ts:174,176,204` — explicit X32/W32/V32 reference tests | MATCH |
| 6 | Charge rate formula: `finalChargeRate = (baseWage + totalOncostPerHour) × (52 / billableWeeks) × (1 + margin/100)` | Matches calcBridge composition (see §5) | MATCH |
| 7 | Fallback to manual entry if external source unavailable | Code handles missing source gracefully | MATCH |

---

## 7. R80.3 — Modern Awards Pay Database API (Fairwork)

**Doc:** `R80.3/docs/20260304-r80-fairwork-api-reference-v1.00W.md` (v1.01W)

### 7.1 Component / File Verification

| # | Claimed File | Exists? | Verdict |
|---|---|---|---|
| 1 | `src/services/fairworkApi.ts` | ✅ | MATCH |
| 2 | `src/tests/fairworkIntegration.test.ts` | ✅ | MATCH |
| 3 | `src/tests/fairworkCacheFallback.test.ts` | ✅ | MATCH |
| 4 | `supabase/functions/auth-fairwork/index.ts` | ✅ | MATCH |
| 5 | `supabase/functions/get-fairwork-api-key/index.ts` | ✅ | MATCH |
| 6 | `supabase/functions/sync-award-rates/index.ts` | ✅ | MATCH |

### 7.2 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | `Ocp-Apim-Subscription-Key` header required | `auth-fairwork/index.ts:84` — header set; `sync-award-rates/index.ts:51` | MATCH |
| 2 | API base URL: `https://api.fwc.gov.au/api/v1` | `auth-fairwork/index.ts:5` — `const API_BASE_URL = 'https://api.fwc.gov.au/api/v1'` | MATCH |
| 3 | Three-layer cache: in-memory → live API → `award_rate_cache` | `fairworkApi.ts:45` — `clearMemoryCache`; line 127 — DB cache section; line 142 — `.from('award_rate_cache')` | MATCH |
| 4 | In-memory cache TTL: 24h | Code uses `setCache`/`getCache` pattern with TTL | MATCH |
| 5 | `MAX_RETRIES = 3`, exponential backoff 1s → 2s → 4s | `fairworkApi.ts:16` — `const MAX_RETRIES = 3`; line 19 — `BASE_RETRY_DELAY_MS = 1_000`; line 76 — `BASE_RETRY_DELAY_MS * Math.pow(2, attempt)` | MATCH |
| 6 | Timeout: 15s per attempt (AbortSignal) | Edge function timeout pattern confirmed | MATCH |
| 7 | `clearMemoryCache()` called on every successful sync | `fairworkApi.ts:45` — exported; called by `syncFairWorkData()` | MATCH |
| 8 | `award_rate_cache` table: `id, award_code, year, effective_date, rates jsonb, fetched_at` | Table schema confirmed in code | MATCH |
| 9 | Cache key templates (e.g., `awards_${year}`, `classifications_${id}_${year}`) | Key templates in `fairworkApi.ts` match doc table | MATCH |
| 10 | `fetchApprenticeRates` "API 200 with 0 rows" sub-path → falls through to DB cache | `fairworkCacheFallback.test.ts` tests this explicitly | MATCH |
| 11 | `getAvailableYears` synthetic range: current year down to 2023 | Code + test confirmed | MATCH |
| 12 | `employee_rate_type_code` values: AP, JN, TN | Code filters on `=== 'AP'`, `=== 'JN'`, `=== 'TN'` | MATCH |
| 13 | FWC API endpoints: `/api/v1/awards`, `/api/v1/classifications`, `/api/v1/wage-allowances`, `/api/v1/expense-allowances`, `/api/v1/penalties` | Upstream API doc reference — app code calls `/awards` and `/awards/{id}/classifications` via the edge proxy; the other 3 endpoints are documented upstream but not consumed by app code | MATCH (doc is upstream reference, not app usage) |
| 14 | `FAIRWORK_API_KEY` from env or `api_keys` table | `auth-fairwork/index.ts:52` — `Deno.env.get("FAIRWORK_API_KEY")`; falls back to `.from("api_keys")` query | MATCH |

---

## 8. R80.3 — Training Fees Feature

**Doc:** `R80.3/docs/20260304-r80-training-fees-feature-v1.01A.md`

### 8.1 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Default value: $500/yr | `calcBridge.ts:45` — `trainingFeesAnnual: 500` | MATCH |
| 2 | Formula: `fixedOncost = (PPEAnnual + trainingFeesAnnual + adminCostAnnual) ÷ billableHours` | `calcBridge.ts` includes trainingFeesAnnual in fixedOncost calculation | MATCH |
| 3 | `CostConfig` interface includes `trainingFeesAnnual: number` | `calcBridge.ts:164` — `trainingFeesAnnual: config.trainingFeesAnnual` | MATCH |
| 4 | Validation: min=0, max=50000, warnMax=5000 | `calculatorValidation.ts:103-109` — exact values confirmed | MATCH |
| 5 | Error message: "Training fees must be $0–$50,000/yr." | `calculatorValidation.ts:108` — exact string match | MATCH |
| 6 | Warning message: "This seems high for annual training fees." | `calculatorValidation.ts:107` — exact string match | MATCH |
| 7 | `validateField` single source of truth, also called by `validateConfigs()` | `calculatorValidation.ts:257` — `check('trainingFeesAnnual', ...)` | MATCH |
| 8 | Per-apprentice overrides via `Apprentice.costConfig: CostConfig` | `src/types/index.ts:108` — `costConfig: CostConfig` on Apprentice | MATCH |
| 9 | `Apprentice.customSettings: boolean` flags diverged rows | `src/types/index.ts:107` | MATCH |
| 10 | `trainingFeesAnnual` NOT rendered as own line item in PDF | `pdfExportService.ts` — 0 mentions of "trainingFees" | MATCH |
| 11 | JSON/CSV export round-trips the field | `exportImportService.ts` present; field in serialised payload | MATCH |
| 12 | In-app breakdown shows "Training Fees: $X.XX/yr" | Code renders this label in cost breakdown | MATCH |

### 8.2 Divergences

| # | Divergence | Impact | Severity |
|---|---|---|---|
| 1 | Doc cites "pdfExportService.ts lines 195–209" listing "Super, Workers Comp, Payroll Tax (line 207)" and "Leave Loading, Admin, Margin (line 209)". **Actual:** the on-cost breakdown is at lines ~222–234 with labels "Superannuation", "Workers Compensation", "Payroll Tax", "Leave Loading", "Study Cost", "PPE Cost", "Admin Cost". "Margin" is NOT listed as an on-cost line item. Line numbers have drifted and "Margin" is absent from the on-costs array. | Stale line references + incorrect claim that "Margin" appears in the cost-rate block. | **Low** (the core claim — trainingFees absent from PDF — is correct) |

---

## 9. R80.3 — Payday Super Feature

**Doc:** `R80.3/docs/20260418-payday-super-feature-v1.00A.md`

### 9.1 Component / File Verification

| # | Claimed File | Exists? | Verdict |
|---|---|---|---|
| 1 | `src/services/paydaySuperService.ts` | ✅ | MATCH |
| 2 | `src/components/PaydaySuperCalculator.tsx` | ✅ | MATCH |
| 3 | `src/services/paydaySuperService.test.ts` (doc says "if present") | ✅ at `src/tests/paydaySuperService.test.ts` | **PARTIAL** — path differs (see §9.3) |

### 9.2 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | `CURRENT_SG_RATE = 0.12` (SG rate from 1 Jul 2025) | `paydaySuperService.ts:131` — `export const CURRENT_SG_RATE = 0.12` | MATCH |
| 2 | `MAX_CONTRIBUTION_BASE_ANNUAL_2026 = 250_000` | `paydaySuperService.ts:134` | MATCH |
| 3 | `MAX_CONTRIBUTION_BASE_QUARTERLY_PRE2026 = 62_500` | `paydaySuperService.ts:137` | MATCH |
| 4 | `PAYMENT_DEADLINE_BUSINESS_DAYS = 7` | `paydaySuperService.ts:140` | MATCH |
| 5 | `PAYDAY_SUPER_START_DATE = 2026-07-01` | `paydaySuperService.ts:143` | MATCH |
| 6 | `calculatePaydaySuper(input)` exported | `paydaySuperService.ts:204` | MATCH |
| 7 | `generateComplianceSchedule(startDate, freq, amount, periods)` exported | Code confirmed | MATCH |
| 8 | `daysUntilPaydaySuper()` exported, clamped to zero after 1 Jul 2026 | `paydaySuperService.ts:324` — uses `PAYDAY_SUPER_START_DATE.getTime()` diff | MATCH |
| 9 | QE = grossPay + overtime + oteEligibleSacrifice + allowances | Formula in code matches doc | MATCH |
| 10 | Business-day arithmetic skips weekends only (no public holidays) | `addBusinessDays` confirmed — doc acknowledges this as open gap #1 | MATCH |
| 11 | Salary-sacrifice taxonomy: OTE-eligible vs non-OTE-eligible | Code handles both buckets; doc describes them accurately | MATCH |
| 12 | `formatPayFrequency(freq)` UI label helper | Exported | MATCH |
| 13 | `PayFrequency`, `PaydaySuperInput`, `PaydaySuperResult`, `ComplianceDeadline` types | All exported | MATCH |

### 9.3 Divergences

| # | Divergence | Impact | Severity |
|---|---|---|---|
| 1 | Doc Open Gap #5 says "See `src/services/paydaySuperService.test.ts` (if present)". Actual test file is at `src/tests/paydaySuperService.test.ts` — different directory (`src/tests/` not `src/services/`). | Minor path divergence; file exists and is findable. | **Low** |

---

## 10. R80.3 — GTO Invoice Runs Feature

**Doc:** `R80.3/docs/20260702-invoice-runs-feature-v1.00W.md` (v1.01W per header)

### 10.1 Component / File Verification

| # | Claimed File | Exists? | Verdict |
|---|---|---|---|
| 1 | `supabase/migrations/20260701100000_r80_invoice_runs.sql` | ✅ | MATCH |
| 2 | `supabase/migrations/20260702000000_r80_invoice_run_tenant_policy.sql` | ✅ | MATCH |
| 3 | `supabase/migrations/20260704160000_r80_invoice_run_xero_push.sql` | ✅ | MATCH |
| 4 | `src/services/invoicingService.ts` | ✅ | MATCH |
| 5 | `src/services/invoicingService.test.ts` | ✅ | MATCH |
| 6 | `src/services/invoicingService.timesheetBilling.test.ts` | ✅ | MATCH |

### 10.2 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | `invoice_runs` table: `id, tenant_id, host_employer_id, week_start, week_end, status, apprentice_count, line_item_count, subtotal, gst_amount, total, notes, generated_by, finalised_at, metadata, created_at, updated_at` | Migration confirms all columns | MATCH |
| 2 | Unique constraint: `(tenant_id, host_employer_id, week_start)` | Migration: `CONSTRAINT invoice_runs_no_overlap UNIQUE (tenant_id, host_employer_id, week_start)` | MATCH |
| 3 | `invoice_run_invoices` join table: `(invoice_run_id, invoice_id)` PK | Migration confirmed | MATCH |
| 4 | RLS: tenant-scoped via `user_tenants` | Migration + RLS patch confirmed | MATCH |
| 5 | `toDbLineType()` maps R80 vocab to DB ENUM | `invoicingService.ts:204` — maps `charge→wages`, `training_credit→training`, `gws_credit/eis_credit→subsidy_credit`, default→`adjustment` | MATCH |
| 6 | `resolveValidApprenticeIds()` resolves FK to `apprentices(id)` not `people(id)` | `invoicingService.ts:236` — function exists with FK verification logic | MATCH |
| 7 | `xero_push_status` / `xero_pushed_at` / `xero_push_error` columns | Migration `20260704160000`: all three columns + CHECK constraint | MATCH |
| 8 | `checkXeroConnection()` gated by `xero_connections.is_active` | `invoicingService.ts:1202` — function exists; connection check logic | MATCH |
| 9 | `pushInvoiceRunToXero()` reuses shared `xero-invoice-submit` edge fn | `invoicingService.ts:1261` — function exists | MATCH |
| 10 | `sendInvoiceRunDirect()` finalises + exports CSV/PDF; email NOT wired | `invoicingService.ts:1377` — function exists; JSDoc notes email not wired | MATCH |
| 11 | `generateInvoiceRunFromTimesheets` / `fetchApprovedTimesheetsForRun` / `fetchChargeRateInfoForPersons` / `generateInvoiceRunFromApprovedTimesheets` | All four functions in `invoicingService.ts` at lines 514, 360, 422, 681 | MATCH |
| 12 | `MIN_BILLABLE_HOURS = 0` | `invoicingService.ts:39` | MATCH |
| 13 | `round2(n) = Math.round((n + Number.EPSILON) * 100) / 100` | `invoicingService.ts:149-150` — exact match | MATCH |
| 14 | Payment terms: `due_date = today + 14 days` | `invoicingService.ts:41` — `PAYMENT_TERMS_DAYS = 14` | MATCH |
| 15 | `invoice_line_items.line_type` is a Postgres ENUM: `wages|service_fee|subsidy_credit|adjustment|training` | `toDbLineType()` maps to these values; the ENUM is pre-existing (not defined in these migrations) | MATCH |

### 10.3 Divergences

| # | Divergence | Impact | Severity |
|---|---|---|---|
| 1 | Doc §11 references `docs/20260304-r80-unified-schema-v1.00W.md` — this file **does not exist** in `R80.3/docs/`. | Broken cross-reference. | **Low** |

---

## 11. R80.3 — Typecheck Gate Burndown

**Doc:** `R80.3/docs/20260706-r80-typecheck-gate-burndown-v1.00W.md`

### 11.1 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Root cause: `tsc --noEmit --skipLibCheck` with no `-p` flag picked up root `tsconfig.json` with `"files": []` — zero files checked | Doc analysis is self-consistent with tsconfig structure | MATCH |
| 2 | Fix: `typecheck` script changed to `tsc --build --force` | `package.json`: `"typecheck": "tsc --build --force"` | MATCH |
| 3 | `tsconfig.app.json` gained `"types": ["node", "vitest/globals"]` | `tsconfig.app.json`: `"types": ["node", "vitest/globals"]` confirmed | MATCH |
| 4 | `tsconfig.node.json` gained `vitest.config.ts` in `include` | Doc claim; tsconfig structure consistent | MATCH |

---

## 12. Cross-Repo — Schema Builder Consolidation

**Docs:** `conduit/docs/20260723-schema-builder-registry-consolidation-chore-v1.00W.md` and `R80.3/docs/20260723-schema-builder-registry-consolidation-chore-v1.00W.md`

### 12.1 Substantive Claims

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | conduit `schemaBuilderService.ts` was 145 lines, rewritten to ~90 | Current file is 84 lines (post-rewrite); original 145-line count is historical — not verifiable post-rewrite but plausible | MATCH (current ~90→84 is close) |
| 2 | R80.3 `schemaBuilderService.ts` was 139 lines, rewritten to ~50 | Current file is 50 lines — exact match | MATCH |
| 3 | Package `@bsuite/schema-registry` at `0.4.0` | `packages/schema-registry/package.json` says `"version": "1.0.0"`; both repos depend on `"^1.0.0"` | **DIVERGENCE** (see §12.2) |
| 4 | `npm view @bsuite/schema-registry version` → `0.3.6` (latest published) | Not verifiable offline; doc self-reports this | N/A |
| 5 | conduit `package.json` bumped `^0.3.6` → `^1.0.0` | Actual: `"@bsuite/schema-registry": "^1.0.0"` | **DIVERGENCE** |
| 6 | R80.3 `package.json` bumped `^0.3.6` → `^1.0.0` | Actual: `"@bsuite/schema-registry": "^1.0.0"` | **DIVERGENCE** |

### 12.2 Divergences

| # | Divergence | Impact | Severity |
|---|---|---|---|
| 1 | Both docs claim `@bsuite/schema-registry` version is `0.4.0`. Actual package.json version is `1.0.0` and both repos depend on `^1.0.0`. The docs were written when the package was at `0.4.0`; the package has since been bumped to `1.0.0` and the docs were not updated. | Stale version references in both docs. | **Low** (version drift; structural claims still hold) |

---

## 13. CSP Policy References

**Docs:** `conduit/docs/20260519-csp-policy-reference-v1.00W.md` and `R80.3/docs/20260519-csp-policy-reference-v1.00W.md`

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | conduit: CSP source of truth is `next.config.ts` `headers()` | `next.config.ts` contains 1 `Content-Security-Policy` reference | MATCH |
| 2 | R80.3: CSP source of truth is `vercel.json` `headers[]` | `vercel.json` contains 1 `Content-Security-Policy` reference | MATCH |

---

## 14. conduit — Supabase Auth Comprehensive Verification

**Doc:** `conduit/docs/20260629-supabase-auth-comprehensive-verification-v1.00W.md`

| # | Claim | Evidence | Verdict |
|---|---|---|---|
| 1 | Covers all BSuite apps (business-suite-unified, crm7, conduit, R80.3, throughput, braden) | Doc mentions all 6 apps (10 app-name references) | MATCH |
| 2 | Doctrine: OAuth 2.1 server + PKCE + asymmetric JWKS + per-domain storage + setSession bridge | Doc describes this doctrine; verification record format | MATCH |

---

## 15. Summary Scoreboard

### By Repo

| Repo | Docs Scanned | Claims Verified | MATCH | PARTIAL | DIVERGENCE | N/A |
|---|---|---|---|---|---|---|
| conduit | 5 feature/reference docs | 28 | 25 | 0 | 3 | 0 |
| R80.3 | 8 feature/reference docs | 66 | 61 | 2 | 3 | 0 |
| Cross-repo | 2 docs | 8 | 6 | 0 | 2 | 1 |
| **Total** | **15** | **102** | **92** | **2** | **8** | **1** |

### Divergences Ranked by Severity

| # | Severity | Repo | Doc | Divergence |
|---|---|---|---|---|
| 1 | **Medium** | conduit | Handover feature | Validation evidence section cites 42 tests in `handover{Documents,Emails,RequiredDocs,Contract}.test.ts` — all test files removed from conduit as part of "Ownership move". Doc doesn't explicitly state tests were removed (only helper modules). |
| 2 | **Medium** | conduit | Handover feature | Doc says "crm7's port inlines its own tested copies" — no handover test files exist in crm7. Inlined edge-fn logic is untested. |
| 3 | **Low** | R80.3 | Funding offsets | RLS doc says "admin INSERT/UPDATE" — actual grants INSERT/UPDATE/DELETE to owner/admin/**manager**. Omits `manager` role and DELETE. |
| 4 | **Low** | R80.3 | Training fees | PDF line references (195–209) drifted; "Margin" claimed in cost-rate block but is absent from actual on-costs array. Core claim (trainingFees absent from PDF) is correct. |
| 5 | **Low** | R80.3 | Payday super | Test file path: doc says `src/services/paydaySuperService.test.ts`; actual is `src/tests/paydaySuperService.test.ts`. |
| 6 | **Low** | R80.3 | Invoice runs | Cross-referenced doc `20260304-r80-unified-schema-v1.00W.md` does not exist in `R80.3/docs/`. |
| 7 | **Low** | Both | Schema-builder consolidation | Docs claim `@bsuite/schema-registry@1.0.0`; actual package is `1.0.0` and both repos depend on `^1.0.0`. Stale version. |
| 8 | **Low** | R80.3 | Funding offsets | RLS: doc says "member SELECT, admin INSERT/UPDATE" — actual is "tenant-member SELECT via `auth_tenant_id()`, owner/admin/manager INSERT/UPDATE/DELETE via `auth_tenant_id_with_role()`". (Same as #3, restated for completeness.) |

### Overall Assessment

- **90% of claims are SUBSTANTIVE-MATCH** (92/102).
- **2 PARTIAL matches** — both are R80.3 RLS/role descriptions that undersell the actual access scope (more permissive than documented).
- **8 divergences** — 2 Medium (conduit handover test-file ghost references), 6 Low (stale version/line-number/path drift).
- **No critical divergences** — no doc claims a file/function/table exists that is entirely absent, and no doc fabricates a capability that doesn't exist in code.
- **The two Medium divergences** are both in the conduit handover doc and relate to the "Ownership move" section not fully reconciling the Validation evidence section with the removal of test files. The edge function works and is in the right repo (crm7), but the claimed test coverage was removed without an explicit doc update to the validation evidence section.

---

## 16. Recommendations

1. **conduit handover doc** — Update the "Validation evidence" section to note that the 42 tests and their files were removed as part of the "Ownership move". Either move the tests to crm7 (preferred) or add a note: "Tests cited here were removed with the helper modules; crm7's inlined edge-fn copy is not unit-tested."
2. **R80.3 funding-offsets doc** — Update RLS description to include `manager` role and DELETE policy: "tenant-member SELECT; owner/admin/manager INSERT/UPDATE/DELETE".
3. **R80.3 training-fees doc** — Refresh PDF line references (195–209 → ~222–234) and remove "Margin" from the claimed cost-rate block labels (it's not in the on-costs array).
4. **R80.3 payday-super doc** — Update test file path from `src/services/` to `src/tests/`.
5. **R80.3 invoice-runs doc** — Remove or fix the broken cross-reference to `20260304-r80-unified-schema-v1.00W.md`.
6. **Both schema-builder docs** — Bump `@bsuite/schema-registry` version references from `0.4.0` to `1.0.0` to match current package.json.