# Deep Bug Excavation — conduit + R80.3 (Read-Only)

> **File:** `20260725-conduit-r80-deep-bug-excavation-v1.00W.md`
> **Status:** W (Working) · **Mode:** READ-ONLY (no source files modified)
> **Date:** 2026-07-25
> **Scope:** Implementation bugs in `conduit` (STA parsers, handover residual, confirm flow) and `R80.3` (charge-calc, funding offsets, payroll/payday super). STRICTLY BSuite — no third-party packages audited for their own correctness, only BSuite's consumption of them.
> **Method:** Static read of source + tests + migrations. No code was executed. Each finding cites exact file:line evidence and notes whether the existing test suite would catch the bug.
> **Severity scheme:** `Critical` = wrong money/compliance/data-corruption · `High` = silent wrong answer or non-atomic state · `Medium` = feature gap with audit-trail risk · `Low` = latent/edge-case only.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. conduit — STA Parser Stubs

**Area:** `conduit/src/lib/recruitment/staParsers/` + `staEmailRegistry.ts` + `supabase/functions/sta-email-watch/index.ts`

### 1.1 Confidence-tier parity is structurally sound; the six stubs are intentional

| # | Item | Evidence | Verdict |
|---|---|---|---|
| 1 | Six stubs (VIC/NSW/QLD/SA/TAS/ACT) all delegate to `baseParse(state, email)` | `vic.ts:14`, `nsw.ts:12`, `qld.ts:12`, `sa.ts:13`, `tas.ts:12`, `act.ts:13` — each one-line wrapper | OK (intentional) |
| 2 | `PROVEN_STATES = Set(['wa','nt'])` is the sole promotion lever | `shared.ts:32` | OK |
| 3 | `scoreConfidence` caps unproven states at 0.3 (ref+outcome), 0.2 (ref only), 0.1 (else) | `shared.ts:62-73` | OK |
| 4 | Edge-fn mirror reproduces the exact tier table | `sta-email-watch/index.ts:189-200` | OK (mirror parity) |
| 5 | `extractReferenceByLabels` is regex-free and identical in app + edge fn | `staEmailRegistry.ts:199` ↔ `sta-email-watch/index.ts:148` | OK |

### 1.2 Bugs / risks in the stub layer

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 1 | **Low** | **`detectOutcome` keyword precedence can misclassify "rejected" emails that mention "approved" earlier in the body.** `REJECTED_HINTS` contains `'cancelled'` and `'unsuccessful'`, which are substrings of common neutral phrases ("application cancelled by candidate", "previously unsuccessful"). The needs_info > rejected > accepted precedence is correct, but a single false-positive keyword hit anywhere in the body flips the outcome — there is no proximity/section weighting. For the six capped-low stubs this only changes the displayed hint (manual-confirm is authoritative), but for WA/NT (proven) a wrong `outcome` at confidence 0.9 is a real misroute. | `shared.ts:34-55` (`NEEDS_INFO_HINTS`/`REJECTED_HINTS`/`ACCEPTED_HINTS` + `detectOutcome`) | `staParsers.test.ts:69-83` tests precedence on synthetic strings but no test covers a body containing BOTH an accepted and a rejected keyword where the rejected one is contextual noise. |
| 2 | **Low** | **`extractReferenceByLabels` returns the first whitespace-delimited token after the label, so a reference with an internal space (e.g. "WA 123456" on one line) is truncated to "WA".** Real STA emails occasionally format contract numbers with a space. The function takes `firstToken(rest)` which stops at the first whitespace. | `staEmailRegistry.ts:221` (`firstToken`) + `:222` (`cleaned`) | No test in `staEmailRegistry.test.ts` covers a multi-token reference. |
| 3 | **Low** | **`senderDomains` suffix match can over-match.** `hostMatchesDomain(host, 'sa.gov.au')` returns true for `evil.sa.gov.au` AND for `sa.gov.au`. The `.gov.au` suffix entries (`'sa.gov.au'`, `'act.gov.au'`, `'nt.gov.au'`) are broad — a spoofed subdomain of a state gov domain would classify as that state. Mitigated by "best-effort, manual-confirm authoritative" doc note, but for proven WA/NT this raises confidence to 0.9. | `staEmailRegistry.ts:157-159` (`hostMatchesDomain`) | No test covers a subdomain spoof scenario. |

---

## 2. conduit — Handover Residual + Confirm-Flow Atomicity

**Area:** `conduit/src/app/(dashboard)/settings/staEmailActions.ts` + `conduit/src/app/(dashboard)/candidates/[id]/actions.ts` + `crm7/supabase/functions/handover-to-employment/`

### 2.1 Confirm-flow is non-atomic across 3 separate Supabase calls

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 1 | **High** | **`confirmStaEmail` performs three independent writes (flip offer → insert audit row → mark email confirmed) with NO transaction or RPC wrapper.** If step 2 (audit insert) fails after step 1 (offer flip) succeeds, the offer's `lodgement_outcome` is permanently changed with NO audit trail — a compliance gap. If step 3 fails after step 2, the email stays "pending" while the offer is already approved/rejected, so the admin queue shows a stale email that will be re-confirmed (idempotent re-flip is safe, but the audit row is duplicated on retry). There is no `BEGIN/COMMIT` in the migration and no `CREATE FUNCTION` RPC wrapping these. | `staEmailActions.ts:120-155` (three sequential `supabase.from(...).update/insert(...)` calls, each awaited independently); migration `20260725090000_training_contract_email_ingestion.sql` has no RPC or trigger tying the three tables. | No integration test exercises a mid-flow failure. Unit tests in `staLodgementTransitions.test.ts` only test the transition guard, not the multi-write atomicity. |

### 2.2 Handover edge-function residual: `failed` counter not surfaced in required-doc evaluation

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 2 | **Low** | **The handover edge fn's `required_documents` block evaluates `documents` (the source set) but the copy loop may have `failed` entries that never made it to crm7.** The `evaluation = evaluateRequiredDocuments(required, documents)` at line 412 uses the SOURCE list, not the list of docs that actually landed in crm7. So if a required doc fails to copy (network/SSRF skip), `missing` will report it as "present" because it was in the source set, even though crm7 never received it. The `warnings` array does push `${failed} document(s) failed to copy` but does NOT re-evaluate required-docs against the successfully-copied subset. | `crm7/.../handover-to-employment/index.ts:412` (`evaluateRequiredDocuments(required, documents)`) vs `:417-419` (`failed > 0` warning). The `documents` variable is the source `r7_documents` set, not the post-copy subset. | `helpers.test.ts` tests `evaluateRequiredDocuments` in isolation but no test wires it to a partial-copy scenario. |

### 2.3 Handover snapshot `source_detail` leak (minor)

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 3 | **Low** | **`createApprenticeHandoffToken` includes `source_detail` in the candidate snapshot despite the doc comment claiming "the snapshot excludes all Conduit-internal fields (e.g. rating, source_detail, pools)".** The code at line 349 does `...(typed.source_detail ? { source_detail: typed.source_detail } : {})`. `source_detail` is a Conduit-internal recruitment-source breadcrumb (e.g. "LinkedIn campaign X") that CRM7 has no business seeing. The comment and the code disagree. | `conduit/src/app/(dashboard)/candidates/[id]/actions.ts:180-181` (comment) vs `:349` (code). | No test asserts the snapshot redaction list. |

---

## 3. R80.3 — Charge-Calc Engine (trainingFeesAnnual silently dropped)

**Area:** `R80.3/src/utils/calcBridge.ts` + `packages/charge-calc/src/calculate.ts` + `packages/charge-calc/src/types.ts`

### 3.1 `trainingFeesAnnual` is declared in `CalcConfig` but NEVER consumed by the engine

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 1 | **Critical** | **The shared `@bsuite/charge-calc` engine ignores `trainingFeesAnnual` entirely.** `CalcConfig.trainingFeesAnnual` is declared at `types.ts:166` and R80.3 faithfully threads `trainingFeesAnnual: costConfig.trainingFeesAnnual` into the config at `calcBridge.ts:337`, but `calculate.ts` does NOT destructure `trainingFeesAnnual` from `cfg` (line 113-130 destructures `studyCost: study`, `ppeCost: ppe`, margin, allowances, penalties, funding, casualLoading — `trainingFeesAnnual` is absent). The total-cost composition at `calculate.ts:201` is `totCost = annPkg + study + ppe + wc + oh + payrollTaxAmt` — trainingFees is NOT added. So the user-configured `$500/yr` (default) or any custom value is silently dropped from the charge rate. The R80.3 bridge's `fromCalcResult` acknowledges this with a comment at `calcBridge.ts:376-378`: "Training fees are bundled into oncosts.training alongside training-period wage; no separate breakdown available in CalcResult yet" and hardcodes `trainingFeesAnnual: 0` in the returned `oncosts` object. The training-fees feature doc (`R80.3/docs/20260304-r80-training-fees-feature-v1.01A.md` claim #2) states the formula is `fixedOncost = (PPEAnnual + trainingFeesAnnual + adminCostAnnual) ÷ billableHours` — but the engine that `calculateChargeRate` delegates to does not implement this. The legacy `calculateOnCosts` (still exported from `calcBridge.ts:149`) DOES include `trainingFeesAnnual: config.trainingFeesAnnual` in its return, but `calculateOnCosts` is only invoked from TEST files (`chargeRateCalculations.test.ts`, `calculationUtils.comprehensive.test.ts`, `calcBridge.test.ts`, `calculationUtils.test.ts`) — the production store path uses `calculateChargeRate` → `calculateFromR80` → `sharedCalculate`, bypassing `calculateOnCosts`. | `packages/charge-calc/src/calculate.ts:113-130` (no `trainingFeesAnnual` in destructure) + `:201` (total cost omits it) + `R80.3/src/utils/calcBridge.ts:337` (passes it in) + `:376-378` (comment + hardcoded 0). `R80.3/src/stores/calculatorStore.ts:255,393` calls `calculateChargeRate`, not `calculateOnCosts`. | `packages/charge-calc/src/__tests__/` sets `trainingFeesAnnual: 0` in EVERY fixture (`calculate.test.ts:30`, `invariants.test.ts:28`, `golden.test.ts:37,137,191`). No test exercises a non-zero `trainingFeesAnnual` and asserts it changes the charge rate. `R80.3`'s own `calcBridge.fundingOffset.test.ts` and `calcBridge.test.ts` also use 0. The bug is invisible to the suite. |

### 3.2 `calculateOnCosts` is dead production code (only tests call it)

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 2 | **Low** | **`calculateOnCosts` (the ONLY function that correctly surfaces `trainingFeesAnnual`) is dead in production.** It is re-exported via `calculatorStore.ts:55` but never invoked by any component or non-test store path. It survives only because tests assert its shape. This is why the trainingFees bug above is invisible — the "correct" implementation exists but is unreachable. | `grep -rn 'calculateOnCosts(' src/` returns only `src/tests/*` hits. | Tests pass but prove nothing about the production path. |

### 3.3 `fromCalcResult` `payrollTax` field scaling is inconsistent with siblings

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 3 | **Low** | **In `fromCalcResult`, `payrollTax`, `studyCost`, and `ppeCost` are scaled by `× billableHours` while `superannuation`, `workersComp`, `leaveLoading`, `adminCost` are NOT.** Lines 372-379: `payrollTax: result.oncosts.payrollTax * result.billableHours`, `studyCost: result.oncosts.study * result.billableHours`, `ppeCost: result.oncosts.ppe * result.billableHours`. The engine's `oncosts.payrollTax/study/ppe` are already per-hour figures, so this converts them back to annual — but `superannuation: result.superAmount` and `workersComp: result.workersCompAmount` are already annual. The shape is correct (annual), but the conversion is applied inconsistently across fields, making the on-cost breakdown object a mix of "multiply to annualize" vs "already annual". A consumer that assumes all fields are the same unit will misrender. | `calcBridge.ts:370-380`. | No test asserts the unit consistency of the returned on-costs object. |

---

## 4. R80.3 — Funding Offsets

**Area:** `R80.3/src/lib/fundingOffset.ts` + `src/services/fundingOffsetsService.ts` + `src/lib/fundingSchemes.ts` + `src/lib/ai/fundingOffsetTool.ts` + `supabase/migrations/20260726090000_funding_offsets.sql`

### 4.1 Core arithmetic (`applyFundingOffset`) is correct

| # | Item | Evidence | Verdict |
|---|---|---|---|
| 1 | Clamp at zero (charge never negative) | `fundingOffset.ts:74` (`Math.min(rawOffsetPerHour, hourlyCharge)`) | OK |
| 2 | No-op on zero billable hours / zero/negative amount / zero charge | `fundingOffset.ts:60` early return | OK |
| 3 | Reconciliation semantics: not-applied→0, applied+received>0→received, applied+received==0→expected | `fundingOffset.ts:105-110` (`effectiveOffsetAmount`) | OK |
| 4 | `applyFundingOffsetToResult` does not mutate input | `calcBridge.ts:408` (`...result, chargeRate: ...`) | OK (test at `calcBridge.fundingOffset.test.ts:44`) |

### 4.2 RLS DELETE-policy asymmetry (manager can INSERT/UPDATE but NOT DELETE)

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 1 | **Medium** | **The `funding_offsets` DELETE policy grants only `owner/admin` while INSERT and UPDATE grant `owner/admin/manager`.** A manager can create and toggle a funding offset but cannot delete one. The migration test asserts INSERT/UPDATE include `manager` but does NOT assert the DELETE policy role set, so the asymmetry is untested and undocumented. The feature doc says "admin INSERT/UPDATE" (undersells), but the actual asymmetry (manager can write, cannot delete) is a surprise. A manager who creates a wrong offset must ask an admin to delete it. | `20260726090000_funding_offsets.sql:120` (INSERT: `ARRAY['owner','admin','manager']`) + `:127` (UPDATE: same) + `:137` (DELETE: `ARRAY['owner','admin']` — `manager` absent). | `fundingOffsetsMigration.test.ts` asserts INSERT/UPDATE role set (line "gates INSERT/UPDATE writes to owner/admin/manager") but has NO assertion on the DELETE policy role set. |

### 4.3 `createFundingOffset` always sets `applied: true` default, but AI tool hardcodes `applied: true` without user confirm

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 2 | **Low** | **The AI funding tool's `execute` passes `applied: true` unconditionally, immediately reducing the charge rate, despite the tool description saying "Confirm the placement, scheme, and amount with the user before applying."** The description is advisory text to the LLM; the code does not enforce a confirmation step. If the LLM skips the confirm (or the AI runtime doesn't surface it), the offset is applied instantly. The service's `createFundingOffset` defaults `applied` to `true` as well (`fundingOffsetsService.ts:138`), so any caller that omits the flag gets an immediate reduction. | `fundingOffsetTool.ts:104` (`applied: true` hardcoded) + `:88-90` (description says "Confirm ... before applying"). `fundingOffsetsService.ts:138` (`const applied = input.applied ?? true`). | No test in `fundingOffsetTool.test.ts` asserts a confirmation gate. |

### 4.4 `listApprenticePlacements` embedded-relation shape can drop the host name

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 3 | **Low** | **`listApprenticePlacements` selects `host:clients ( name )` but if the placement has no host (FK nullable), `host` is null and the label becomes just the apprentice name with no "— host" suffix.** This is intentional fallback, but the `firstOrSelf(row.host)` normaliser at line 253 handles `null` → `undefined`, then `host?.name?.trim()` is `undefined`, and the label filter drops it. The result is a placement label with no host indicator — the admin cannot tell which host the placement is for without opening it. | `fundingOffsetsService.ts:234-258` (select + map). | No test in the service covers a null-host placement. |

---

## 5. R80.3 — Payroll / Payday Super

**Area:** `R80.3/src/services/paydaySuperService.ts` + `crm7/src/lib/training/publicHolidays.ts` + `src/services/payrollTaxService.ts` + `src/services/awardRulesEngine.ts`

### 5.1 Payroll tax rates pinned to FY2025-26 — stale as of 1 July 2026

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 1 | **High** | **`payrollTaxService` hardcodes `FINANCIAL_YEAR = 2025` and `EFFECTIVE_DATE = '2025-07-01'` as module constants.** The cache query at line 104 `.eq('year', FINANCIAL_YEAR)` only ever reads rows tagged `year=2025`. As of the audit date (2026-07-25), the Australian financial year is FY2026-27 (started 2026-07-01). The service will (a) never find a cached 2026 row even if an operator inserts one, and (b) return the 2025-26 hardcoded rates with `source: 'hardcoded'` and `effectiveDate: '2025-07-01'` — a year stale. The hardcoded rates themselves (WA 5.5%, VIC 4.85%, etc.) may or may not have changed for FY2026-27, but the service does not know either way. The module comment says "Rates are 2025-26 financial year defaults — update annually." This is a manual bump that was missed. | `payrollTaxService.ts:46-47` (`const FINANCIAL_YEAR = 2025; const EFFECTIVE_DATE = '2025-07-01';`) + `:104` (`.eq('year', FINANCIAL_YEAR)`). | `payrollTaxService.test.ts:21` hardcodes `NOW = new Date('2026-03-04T10:00:00Z').getTime()` (still in FY2025-26) and asserts `financialYear: 2025`. The test is green but proves the service is pinned to 2025. No test asserts the year is current. |

### 5.2 Payday super monthly schedule overflows on month-end start dates

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 2 | **Medium** | **`generateComplianceSchedule` for monthly frequency uses `payday.setMonth(payday.getMonth() + i)`, which is the well-known JS Date overflow pitfall.** If `startDate` is 31 January, `setMonth(1 + 1)` (i=1, Feb) yields 3 March (JS rolls over because Feb has 28-29 days). Subsequent iterations advance from the rolled-over date, so the schedule drifts: payday for "period 2" lands on 3 March instead of 28 Feb, "period 3" on 3 April, etc. This produces wrong paydays for ~5 of 12 periods when the start day is 29-31. The deadline (7 business days) is then computed from the wrong payday, so the compliance schedule is wrong. | `paydaySuperService.ts:279-280` (`payday = new Date(startDate); payday.setMonth(payday.getMonth() + i)`). | `paydaySuperService.test.ts` only tests `weekly` and `fortnightly` schedules (`generateComplianceSchedule` tests at lines 41, 64, 77 all pass `'weekly'`). No test exercises `payFrequency: 'monthly'`. |

### 5.3 Payday super `isCapApplied` uses annual QE but cap pro-rate rounding can mismatch annual obligation

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 3 | **Low** | **`calculatePaydaySuper` computes `superPerPeriod = round(cappedQEPerPeriod * sgRate * 100)/100` then `annualSuperObligation = round(superPerPeriod * periodsPerYear * 100)/100`.** Because per-period rounding happens BEFORE the annual multiply, the annual obligation can drift from the "true" `round(annualQE * sgRate * 100)/100` by up to `(periodsPerYear-1) * 0.005`. For weekly (52 periods) this is up to ~$0.26/yr; for the cap test (fortnightly, 26 periods, $11500/period) the test already uses `toBeCloseTo(30_000, 0)` to absorb this. It is a known artefact, documented in the test comment at line 218-219, but the `isCapApplied` flag is computed from `annualQE > MAX_CONTRIBUTION_BASE_ANNUAL_2026` (line 211) while the actual super uses the pro-rated capped per-period — so a worker just under the cap (annualQE = $249,999) has `isCapApplied: false` but the per-period super is computed from the uncapped `qePerPeriod`, while a worker at $250,001 has `isCapApplied: true` and super from `cappedAnnualQE/periods`. The boundary is correct, but the rounding means `annualSuperObligation` for a just-under-cap worker can exceed a just-over-cap worker's obligation by a few cents. | `paydaySuperService.ts:211-220`. | `paydaySuperService.test.ts:199-222` covers the over-cap path but does not test the boundary (annualQE = $250,000 exactly, or $249,999 vs $250,001). |

### 5.4 Public holiday calendar hard-coded through 2027 only

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 4 | **Low** | **`publicHolidays.ts` ships `NATIONAL_2026`, `NATIONAL_2027`, `STATE_2026`, `STATE_2027` only.** From 2028-01-01, `getHolidays(2028, ...)` returns an empty array, so `isPublicHoliday` returns false for every date, `addBusinessDays` treats every weekday as a business day, and the 7-business-day Payday Super deadline will NOT skip 2028+ public holidays — creating SGC exposure. The module doc acknowledges this: "Lists are intentionally explicit (not generated). The Payday Super deadline only requires correctness across the regulatory ship window." But the ship window (2026-2027) ends in 5 months. | `publicHolidays.ts:70-95` (only 2026+2027 arrays) + `:178-184` (`getHolidays` filter on `yearPrefix`). | No test covers a 2028 date. |

### 5.5 Payroll tax exemption table excludes trainees (TN) in QLD/SA/TAS/ACT/NT

| # | Severity | Bug | Evidence | Test coverage |
|---|---|---|---|---|
| 5 | **Low** | **`PAYROLL_TAX_EXEMPT_STATES` exempts AP/AA/TN in WA/VIC/NSW but only AP/AA in QLD/SA/TAS/ACT/NT.** Trainees (TN) in the latter five states are NOT exempt and are charged the full state payroll tax. This may be correct per current state law (QLD/SA/TAS/ACT/NT may not exempt trainees), but it is an asymmetry that is not flagged in the doc and not testable against a live source. If a state changes its TN exemption (several states review annually), this table needs a manual update with no staleness signal. | `awardRulesEngine.ts:363-372` (`PAYROLL_TAX_EXEMPT_STATES`). | No test asserts the TN-exemption matrix against an external source. |

---

## 6. Summary Scoreboard

### By Repo

| Repo | Bugs Found | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| conduit | 5 | 0 | 1 | 0 | 4 |
| R80.3 | 9 | 1 | 1 | 2 | 5 |
| **Total** | **14** | **1** | **2** | **2** | **9** |

### Bugs Ranked by Severity

| # | Severity | Repo | Area | Bug |
|---|---|---|---|---|
| 1 | **Critical** | R80.3 | charge-calc | `trainingFeesAnnual` declared in `CalcConfig`, threaded by `calcBridge`, but NEVER destructured or summed by `@bsuite/charge-calc` `calculate()`. User-configured training fees are silently dropped from every charge rate. Tests all set the field to 0, so the suite is green. |
| 2 | **High** | conduit | STA confirm flow | `confirmStaEmail` is 3 non-atomic Supabase writes (flip offer → audit row → mark email). A mid-flow failure leaves the offer flipped with no audit trail (compliance gap) or a stale email queue. No RPC/transaction wrapper. |
| 3 | **High** | R80.3 | payroll tax | `payrollTaxService` hardcodes `FINANCIAL_YEAR = 2025` / `EFFECTIVE_DATE = '2025-07-01'`. As of 2026-07-25 (FY2026-27) the service returns year-stale rates and cannot read a cached 2026 row. Cache query `.eq('year', 2025)` is pinned. |
| 4 | **Medium** | R80.3 | funding offsets | RLS DELETE policy grants only `owner/admin` while INSERT/UPDATE grant `owner/admin/manager`. Manager can create/toggle but cannot delete. Asymmetry untested and undocumented. |
| 5 | **Medium** | R80.3 | payday super | `generateComplianceSchedule` monthly uses `setMonth(+i)` — JS Date overflow on 29-31 start days. ~5/12 paydays drift. No monthly test in the suite. |
| 6 | **Low** | conduit | STA parsers | `detectOutcome` keyword scan has no proximity weighting; a single false-positive keyword in the body flips the outcome. For proven WA/NT (confidence 0.9) this is a real misroute. |
| 7 | **Low** | conduit | STA parsers | `extractReferenceByLabels` returns only the first whitespace-delimited token; multi-token references (e.g. "WA 123456") are truncated. |
| 8 | **Low** | conduit | STA parsers | `senderDomains` suffix match over-matches subdomains (`sa.gov.au` matches `evil.sa.gov.au`). For proven WA/NT this raises confidence to 0.9 on a spoof. |
| 9 | **Low** | conduit | handover | Edge fn's required-doc evaluation uses the SOURCE document set, not the post-copy subset. A failed copy is reported as "present" in `required_documents`. |
| 10 | **Low** | conduit | handover | `createApprenticeHandoffToken` includes `source_detail` in the snapshot despite the doc comment claiming it is excluded. |
| 11 | **Low** | R80.3 | charge-calc | `calculateOnCosts` (the only function that surfaces `trainingFeesAnnual` correctly) is dead production code — only tests call it. |
| 12 | **Low** | R80.3 | charge-calc | `fromCalcResult` on-costs object mixes "multiply to annualize" (payrollTax/study/ppe) with "already annual" (super/workersComp) fields — inconsistent units. |
| 13 | **Low** | R80.3 | funding offsets | AI funding tool hardcodes `applied: true` despite description saying "Confirm with user before applying." No enforced gate. |
| 14 | **Low** | R80.3 | payroll | `publicHolidays` calendar hard-coded through 2027 only; from 2028 the Payday Super deadline stops skipping holidays (SGC exposure). |

### Overall Assessment

- **1 Critical** — the `trainingFeesAnnual` silent drop is the most serious finding. It is invisible to the test suite (every fixture sets the field to 0), the production path provably bypasses the one function that handles it correctly (`calculateOnCosts`), and the feature doc claims a formula the engine does not implement. Every R80.3 charge rate quote is under-costing by the configured training-fees amount (default $500/yr ÷ billable hours ≈ $0.25/hr).
- **2 High** — the conduit confirm-flow non-atomicity is a compliance audit-trail gap; the R80.3 payroll-tax year pin is a silent year-stale bug.
- **2 Medium** — the funding-offset DELETE asymmetry and the monthly-schedule overflow are both untested paths with real user-facing impact.
- **9 Low** — latent edge cases, mostly untested but low blast radius.

### Test-suite blind spots (cross-cutting)

1. **Every `trainingFeesAnnual` fixture is 0.** No test proves the field influences the charge rate. (Critical bug #1)
2. **No monthly `generateComplianceSchedule` test.** (Medium bug #5)
3. **No `confirmStaEmail` mid-flow failure test.** (High bug #2)
4. **No funding-offset DELETE policy role assertion.** (Medium bug #4)
5. **No payroll-tax "year is current" assertion.** (High bug #3 — the test pins `NOW` to 2026-03 and asserts `financialYear: 2025`, so it actively locks in the staleness.)
6. **No `detectOutcome` keyword-noise test for proven states.** (Low bug #6)
7. **No multi-token reference extraction test.** (Low bug #7)
8. **No 2028+ public holiday test.** (Low bug #14)

---

## 7. Recommendations (prioritised)

1. **Critical — fix `trainingFeesAnnual` in `@bsuite/charge-calc` `calculate.ts`.** Destructure `trainingFeesAnnual` from `cfg` and add it to `totCost` (line 201): `totCost = annPkg + study + ppe + wc + oh + payrollTaxAmt + trainingFees`. Add a golden test with `trainingFeesAnnual > 0` asserting the charge rate increases by `trainingFees / billableHours`. Update `fromCalcResult` to surface it as its own on-cost line (remove the `trainingFeesAnnual: 0` hardcode at `calcBridge.ts:378`).
2. **High — wrap `confirmStaEmail` in a Postgres RPC or transaction.** Ship a `confirm_sta_email(email_id, offer_id, outcome)` SECURITY DEFINER function that flips the offer, inserts the audit row, and marks the email in a single `BEGIN/COMMIT`, returning a typed result. Update the server action to call the RPC.
3. **High — bump `payrollTaxService` to FY2026-27.** Make `FINANCIAL_YEAR` dynamic: `const FINANCIAL_YEAR = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;` (Australian FY starts July). Refresh `HARDCODED_PAYROLL_TAX_RATES` against 2026-27 state budgets. Add a test asserting `financialYear` equals the current Australian FY.
4. **Medium — reconcile funding-offset DELETE policy.** Either add `manager` to the DELETE policy (matching INSERT/UPDATE) or document the asymmetry in the migration comment and the feature doc. Add a `fundingOffsetsMigration.test.ts` assertion for the DELETE role set.
5. **Medium — fix monthly `generateComplianceSchedule`.** Replace `setMonth(+i)` with a day-of-month-preserving advance (set to 1st, advance month, then re-apply original day clamped to the target month's length) or use a calendar library. Add a monthly test starting on the 31st.
6. **Low — add `trainingFeesAnnual` to the dead-code audit.** Either re-wire `calculateOnCosts` into the production path (replacing the engine delegation) or delete it and its tests, since it currently gives a false impression of coverage.
7. **Low — redact `source_detail` from the handover snapshot** to match the doc comment, or update the comment to admit it is included.
8. **Low — extend the public holiday calendar to 2028** (or wire a Fair Work API / Supabase-backed refresh per the module's own WS-E.4 follow-up note) before 2028-01-01.
9. **Low — add proximity weighting to `detectOutcome`** (e.g. only match keywords in the subject line or the first N lines of the body) to reduce false-positive misroutes for proven states.
10. **Low — tighten `senderDomains` matching** to require an exact host match or a one-level subdomain, to prevent `evil.sa.gov.au` matching `sa.gov.au`.

---

## 8. Methodology Notes

- This audit is READ-ONLY. No source files, migrations, or tests were modified.
- Evidence cited as `file:line` is accurate as of the audit date; line numbers may drift.
- "Test coverage" columns were verified by `grep` over the relevant `__tests__/` and `src/tests/` directories.
- The `packages/charge-calc` engine was treated as BSuite-owned for the purpose of the trainingFees finding (it lives in the BSuite monorepo at `packages/charge-calc/`); no third-party npm packages were audited for their own correctness.
- The prior docs↔code audit (`20260725-conduit-r80-docs-code-audit-v1.00W.md`) found divergences between docs and code; this audit finds bugs in the CODE itself that the docs do not necessarily cover.