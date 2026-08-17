# @bsuite/charge-calc — CHANGELOG

All notable changes to `@bsuite/charge-calc` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.13.0] — 2026-08-17 — casual penalty rows compounded the loading, a 7.14% over-charge

### Fixed — MONEY DEFECT, over-billed to the host, compliance-critical

- `calculate()` multiplied a CASUAL worker's already-loaded wage by the
  STANDARD penalty/overtime multiplier, unconditionally, on every award:
  `base x 1.25 (casual loading) x 1.50 (standard Saturday penalty) = 187.5%`.
  For MA000020 (Building & Construction) cl.12.5/12.6 the correct figure is
  **175%** — the casual conversion is ADDITIVE (+25 percentage points on the
  standard multiplier, applied to the BASE rate), not multiplicative on an
  already-loaded rate. `1.875 / 1.75 = 1.0714` — a **7.14% overstatement**,
  exact, on every casual Saturday penalty line; **11.11%** on Sunday (200%
  standard); **13.64%** on public holidays (250% standard). This package's
  own test file had zero casual-penalty test coverage before this release.

- Ported the verified per-award casual-conversion clause table from
  R80.4's `casual-penalty-convention.ts` (MA000020 cl.12.5/12.6, MA000004
  cl.11.1, MA000009 cl.29.2/cl.28.4, MA000036 cl.12.2/cl.23, MA000010
  cl.11.1(d)) into `src/awards/casual-penalty-convention.ts` — now the
  single canonical copy this package consumes. Preserves the module's
  refusal semantics EXACTLY: `casualPenaltyMultiplierForAward()` throws
  `CasualPenaltyConventionUnmodelled` — never returns a wrong number — for
  any (award, category) pair not individually verified. `calculate()`
  catches that per row: the row is left OUT of `rates` entirely (never a
  default, never zero) and the reason is recorded in the new
  `CalcResult.casualPenaltyViolations` array.

### Added

- `CalcConfig.awardCode?: string` — the modern award code (e.g.
  `"MA000020"`) a `penalties` table was sourced from. Only consulted for a
  casual worker; defaults to `"MA000020"` when omitted, matching R80.4's
  own resolver default and this package's GTO/Building & Construction
  origin.
- `CalcResult.casualPenaltyViolations: string[]` — one entry per casual
  penalty/overtime row refused because its (award, category) pair has no
  verified conversion.
- New exports (also via the existing `@bsuite/charge-calc/awards` subpath):
  `casualPenaltyMultiplierForAward`, `CasualPenaltyConventionUnmodelled`,
  `CasualPenaltyResult`.

### Known follow-up (not in this release)

- R80.4 (a separate git submodule/repo, not part of this package's
  workspace) still carries its own copy of this clause table. It is not
  yet a consumer of `@bsuite/charge-calc`. A follow-up PR against R80.4
  should add the `@bsuite/charge-calc` dependency once this version is
  published and delete R80.4's local copy, so the estate returns to
  exactly one copy of the clause table. Until then the two copies must be
  kept in sync by hand — see the header comment in
  `src/awards/casual-penalty-convention.ts`.
- Consumers (`crm7`, `conduit`) pin `"@bsuite/charge-calc": "^0.12.0"` —
  on 0.x a caret range does NOT admit a minor bump, so publishing 0.13.0
  does not reach them automatically. Each needs its own dependency-bump PR
  (`^0.13.0`) per `docs/DEPENDENCY-BUMP-CHECKLIST.md`.

## [0.12.0] — 2026-08-06 — ALEX48 returned a constant and discarded its inputs

### Fixed — MONEY DEFECT, silent under-recovery

- `calculateBillableWeeks()` had `case 'ALEX48': return 48`. A **constant**. The
  function is handed `annualLeaveDays`, `daysPerWeek`, `publicHolidayDays`,
  `sickLeaveDays` and `trainingWeeks`, and that branch discarded every one of
  them. The identifier baked the number in, so the model could not be renamed
  without renaming the figure.

  48 is right for exactly one case — full-time, five days a week, four weeks of
  leave. Measured against the correct `52 - (annualLeaveDays / daysPerWeek)`:

  | case | correct | ALEX48 said | out by |
  | --- | --- | --- | --- |
  | full-time, 4 weeks leave | 48.00w | 48 | 0.0% |
  | continuous shiftworker, 5 weeks | 47.00w | 48 | 2.1% |
  | part-time 4 days/week | 47.00w | 48 | 2.1% |
  | part-time 3 days/week | 45.33w | 48 | **5.9%** |

  It erred in the expensive direction. Too many billable hours spreads the same
  annual cost thinner, so the hourly rate comes out **low**, and the GTO then
  bills fewer weeks than the divisor assumed. A part-time apprentice on three
  days was 5.9% light on every hour, silently.

  Nothing caught it because 48 is right for the default full-time case, which is
  what every fixture used — and because two tests **asserted the defect**:
  *"always returns 48 regardless of leave inputs"* and *"returns 48 even with
  extreme leave values"*. A test that asserts a constant cannot notice the
  constant is only right once.

- A zero `daysPerWeek` now returns a finite number instead of `Infinity`, which
  read downstream as an absurdly low rate rather than as an error.

### Added — elections replace the shipped model names

Operator ruling 2026-08-06: *"just election with option to save presets by name.
so someone could create an Alex preset. or their own name."*

- `BillingElections` — four flags, one per category that can be billed rather
  than costed: `billAnnualLeave`, `billPublicHoliday`, `billPersonalLeave`,
  `billTraining`. Billable weeks is 52 less every category **not** billed.
- `defaultBillingElections()` — worked hours only. Deliberately unnamed, and
  identical to what `Standard` already did, so an existing caller is unaffected.
- **No preset name is shipped.** A name we ship is a name we have to be right
  about in a vocabulary that is not ours, and a shipped ALEX has to *encode*
  what ALEX means — which is how 48 got hardcoded in the first place.

### Deprecated

- `BillableWeeksInput.billingModel` and `electionsForLegacyModel()`. Pass
  `elections`. Kept so 0.11.x call sites keep compiling; removed at 1.0.0.
  `ALEX48` maps to *annual leave excluded and nothing else* and is now
  **computed** — the name survives the transition, the constant does not.

### Note for consumers

`ALEX48` and `W52` no longer have a fixed week count that can be read from a
table. `BILLING_MODEL_WEEKS` should not be used to short-circuit
`calculateBillableWeeks()` — crm7 did exactly that in
`resolveBillableWeeks()` and so never reached this fix until it was removed
(crm7 `38229673`). `W52` remains genuinely fixed at 52, because every category
is billed.

---

## [0.10.0] — 2026-08-05 — R80.4 reference engine, ported (`@bsuite/charge-calc/r804`)

> **CORRECTION (2026-08-17, M-5 money-chain closeout) — this entry describes
> work that was never actually shipped.** Verified against three
> independent artefacts, not the paperwork below: (1) `git log --all` for
> every filename this entry names (`r804/`, `ordinary-wage-breakdown.ts`,
> `contingent-costs.ts`, `clause-rules.ts`, `src/__tests__/r804/*`) across
> every branch in this repository returns zero commits — none of these
> files were ever committed, anywhere; (2) the current `package.json`
> `exports` map has exactly four entries — `.`, `./types`, `./awards`,
> `./boot` — no `/r804`; (3) `npm pack @bsuite/charge-calc@0.10.0` and every
> later published version's tarball contains no `r804` path at all. The
> 0.10.0 version itself WAS genuinely published (it exists on the npm
> registry) — only the `/r804` subpath and everything under "Added" below
> is fictional. Left in place rather than deleted, so the historical record
> is honest about having been wrong rather than silently rewritten; do not
> cite this entry, `@bsuite/charge-calc/r804`, or any file it names as
> existing. See the money-chain M-5 finding for the real answer to "is
> R80.4's engine published anywhere": no — R80.4 remains a private,
> standalone app with its own ~250-file `src/awards/` catalogue, and the
> ONE piece of it verified to have actually crossed into this package is
> `casual-penalty-convention.ts` in the 0.13.0 entry above, ported by a
> real, git-log-verifiable commit (`45590a09`).

### Added

- New subpath export `@bsuite/charge-calc/r804` — the R80.4 reference
  calculation engine (`calculate()` + `CalcConfig`/`CalcResult`), ported
  verbatim from `~/Desktop/Dev/R80.4` (`r80-4-charge-calculator` v9.2.0,
  private, NOT published) commit `93b8643951cab759dff8428b63a29629975bb294`
  (2026-08-05T21:06:19+08:00, branch `development`). Binding precedent
  `precedent__bsuite__20260802__r804_is_the_reference_engine` (tier 1):
  R80.4's calculations replace R80.3's; where they disagree, R80.4 wins.
- Ported modules: `calc-types.ts`, `calculate.ts`, `round.ts`,
  `ordinary-wage-breakdown.ts`, `contingent-costs.ts`, `clause-rules.ts`,
  `registry.ts` (types + generic machinery; TRACES ships empty — award data
  is a later pass), `interactions.ts` (types only; catalogue is a later
  pass), `funding.ts` (milestone model only — no seeded scheme catalogue,
  per operator directive), `text-normalise.ts`, and the three MA000020
  modules `calculate()` hard-imports (`ma000020-minimum-engagement.ts`,
  `ma000020-daily-hire.ts`, `ma000020-supervision.ts`).
- Ported tests (`src/__tests__/r804/*.test.ts`, adapted only at the
  vitest-harness boundary — see each file's header comment for the
  exact, itemised adaptations): `round`, `ordinary-wage-breakdown`,
  `contingent-costs`, `ma000020-minimum-engagement`, `ma000020-daily-hire`,
  `ma000020-supervision`, `funding`, `casual`, `clause-rules`,
  `engine-payguide` (the output-equivalence proof against FWC Pay Guide
  MA000020 published dollars, unchanged from upstream).
- The engine natively supports manual entry / no-R8-subscription use: `wage`,
  `allowances`, and `penalties` are plain caller-supplied values with NO
  default wages by design; MAPD auto-populate is one way to fill `CalcConfig`,
  not a requirement.

### Not ported (deferred, scope discipline — "award-specific data modules
### come next")

- The five `analysis/allowance_trace_*.json` files (MA000010/20/25/36/89)
  that populate `registry.ts`'s `TRACES`.
- `interactions.ts`'s `INTERACTION_RULES` / `NTW_REFERENCES` catalogue.
- Every `ma0000NN-*.ts` award-data module beyond the three MA000020 files
  `calculate()` hard-imports.
- `funding-programs.ts`, the seeded named-scheme catalogue — operator
  directive 2026-08-05: never pre-populate funding or schemes; the caller
  enters and saves them.
- The `charge-calculator-v9-2.tsx` UI and everything that only exists to
  drive it (out of scope for an engine port).

### Not consumed by any app yet

- `crm7` and `R80.3` still import the existing root export surface
  (`@bsuite/charge-calc`'s `calculate`/`types`), not `/r804`. Wiring a
  consumer onto the new engine is a separate task.

## [0.8.0] — 2026-08-02 — Apprentice/trainee payroll tax exemption

### Added

- `PayrollTaxRateTypeCode` (`src/defaults.ts`) — `'AP' | 'AA' | 'TN' | 'JN'`,
  moved verbatim (values) from `R80.3/src/services/awardRulesEngine.ts:40`.
  Named distinctly from the broader MAPD `EmployeeRateTypeCode` already
  exported from `./awards` (which also covers AD/XT/CA, none of which carry
  payroll-tax-exemption meaning).
- `PAYROLL_TAX_EXEMPT_STATES` — moved verbatim from
  `awardRulesEngine.ts:408-417`. States/territories where AP/AA/TN employees
  are exempt from payroll tax. Intentionally non-uniform per state — WA/VIC/
  NSW exempt trainees (TN); QLD/SA/TAS/ACT/NT do not.
- `resolveEffectivePayrollTaxRate(state, rateTypeCode, generalStateRate)` —
  the exemption-aware resolver, moved (logic) from
  `awardRulesEngine.ts:583-610`. The exemption check is a rule about the
  EMPLOYEE, not the rate SOURCE, and always has the last word on the value
  handed to a cost calculator — see the doc comment for the full precedence
  guard.

### Fixed

- `getPayrollTaxRate()`'s doc comment now explicitly warns it is NOT
  exemption-aware and must never be assigned directly to an apprentice/
  trainee/junior worker's cost config — crm7#1265 traced a P0 wrong-money
  defect to exactly this: `@bsuite/charge-calc` owned `PAYROLL_TAX_RATES`
  but not the exemption logic (which lived only in R80.3, which crm7 cannot
  import), so crm7's charge-rate path assigned a bare, non-exempt state rate
  to every worker — a WA apprentice was charged 5.5% payroll tax when the
  legally correct rate is 0%.

### Why

crm7#1265 / G2 unify-calc-paths: this is the same collapse already done for
`PAYROLL_TAX_RATES` itself (see the 0.x history below and R80.3's
`payrollTaxService.ts` G2 comment) — a duplicated exemption table would be
worse than a duplicated rate table, because it fails silently in the
compliance direction. R80.3 deletes its copies and re-exports from this
package in the same PR family.

---

## [0.7.0] — 2026-07-30 — RDO (Rostered Day Off) worked-vs-paid modelling

### Added

- `RdoAccrualConfig` and `DEFAULT_RDO_CONFIG` (`src/types.ts`) — explicit
  configuration for an RDO accrual arrangement (MA000020 cl.16.2: 8h worked /
  7.6h paid / 0.4h banked per day, 19-worked-day cycle). Defaults to
  `enabled: false` — no RDO — because RDOs are NOT universal: cl.16.8 permits
  an employer + majority-of-employees opt-out, many awards never had RDOs,
  and part-time employees may opt out under cl.16.9(b). See
  `docs/references/20260730-rdo-flexibility.md` for the full legal basis.
- `CalcConfig.rdo?: RdoAccrualConfig` — optional, additive field so an RDO
  arrangement has one canonical place to travel through the pipeline.
  **Not yet consumed by `calculate()`** — this release only adds the
  worked-vs-paid vocabulary and stand-alone conversion helpers; wiring it
  into the core calculation, and bumping the crm7/R80.3 consumers, is
  separate follow-up work (CLAUDE.md §12.2).
- `src/rdo.ts` — new module with pure helpers: `workedHoursPerDayFromPaid()`,
  `paidHoursPerDayFromWorked()`, `workedHoursPerWeekFromPaid()`,
  `paidHoursPerWeekFromWorked()`, `deriveRdoAccrual()` (banked hours + cycle
  completion over a run of days worked — reports `cycleCompleted: false`
  rather than fabricating a completed cycle for short engagements per
  cl.16.8), and `billableHoursForRdoDayTaken()` (RDOs ARE billable when
  taken — bills at the worked, not paid, figure for that day).
- `CalcConfig.hoursPerWeek`/`hoursPerDay` doc comments now state unambiguously
  that these are the PAID figure — `calculate()` multiplies wage by this
  value for weekly pay and divides annual cost by it for cost-per-hour, so
  feeding a worked figure in under an RDO arrangement over-computes super and
  wage cost by roughly the accrual fraction (~5% for the standard pattern).

### Why

`pay_item_groups.is_rdo_accrual` and `pay_item_category`'s `'rdo'`/
`'rdo_accrual'` values have existed in the crm7 schema with zero rows and no
producer/consumer, and `public.timesheets` had no RDO column at all
(companion crm7 migration `20260730340000_timesheets_rdo_accrual_columns.sql`
adds `rdo_accrual_hours`/`rdo_taken_hours`). `@bsuite/charge-calc`'s
`hoursPerWeek`/`hoursPerDay`/`daysPerWeek` had no documentation of whether
they were worked or paid — paid-vs-worked was entirely unmodelled, and the
ambiguity was silent. Super and wages are computed on PAID ordinary hours
(SGAA 1992 s.6(1)); this release gives the package a documented, testable
place to express the distinction without changing any existing output.

---

## [0.5.2] — 2026-07-30 — Publish the #1689 allowance rate-unit fix

### Fixed

- `awards/converter.ts` no longer treats a **percentage** allowance rate as a
  dollar amount. `AwardAllowance.rate` is dual-purpose — its meaning is
  disambiguated by `rateUnit`. The converter previously did
  `a.amount ?? a.rate ?? 0`, so an allowance expressed as a percentage (e.g.
  `rate: 0.92`, `rateUnit: '%'`) was emitted as **$0.92**. It now returns
  `null` for a percentage rate with no resolvable base — refusing to fabricate
  a figure rather than emitting a wrong one. Non-percentage `rate` values
  (e.g. Tool allowances) still convert, with annual frequencies divided by 52.
  Fixes bsuite#1689.

### Release note

This fix landed on `main` on 2026-07-29, but **0.5.1 had already been published
on 2026-07-25**. The version was never bumped afterwards, so every consumer
resolving `^0.5.0` was getting a 0.5.1 whose `dist/` predates the fix — the
source was correct and the shipped artifact was not. 0.5.2 exists to actually
deliver it. Consumers must have their lockfiles refreshed to 0.5.2; a published
package is not a delivered one (CLAUDE.md §12.2).

---

## [0.5.0] — 2026-06-03 — Named pay item group rate keys

### Added

- `PayItemGroupRef`, `PayItemCategorySchema`, and `PayItemCategory` describe
  CRM7-owned `pay_item_groups` metadata without duplicating pay item ownership
  inside the shared calculation package.
- `CalcConfig.ordinaryPayItemGroupId` / `ordinaryPayItemGroup` and
  `PenaltyRate.payItemGroupId` / `payItemGroup` let consumers pass named
  pay-item group UUIDs into charge calculation.
- `CalcResult.ratesByPayItemGroupId` and `ordinaryRateKey` expose canonical
  named-group lookup while `rates['ord']` and legacy penalty IDs remain as
  compatibility aliases.

### Migration

- Consumers can adopt CRM7 `pay_item_groups.id` values incrementally. Existing
  `rates['ord']` / `rates[penalty.id]` reads are preserved.
- When both `payItemGroupId` and `payItemGroup.id` are supplied, they must match;
  mismatches throw rather than silently selecting one ID.

### Tests

- Output-equivalence tests assert named pay item group aliases produce identical
  charge/funded/funding values to the legacy `ord`/penalty keys.

---

## [0.4.0] — 2026-05-14 — Remove vestigial `'mapd'` source kind (BREAKING)

### Why

The `'mapd'` value in `LiveApiSourceSchema.api` was a redundant alias for
`'fair-work'` — both resolved through the FWC Modern Awards Pay Database
(developer.fwc.gov.au). Keeping two names for one upstream violated the
DRY one-shot principle and added a meaningless UX dropdown option.

The naming `MAPD` is retained where it belongs: as the formal name of the
FWC dataset, in `awards/mapd-types.ts` + `awards/mapd-client.ts` (Zod
schemas + mapper for the FWC API response shape). Those files are NOT
affected by this release.

### Breaking changes

- `LiveApiSourceSchema.api`: enum no longer accepts `'mapd'`. Use
  `'fair-work'` for all FWC lookups, including apprentice/trainee rates
  (FWC publishes those too).
- `WageDataAccess.fromMapd()`: interface method removed. Consumers should
  call `fromFairWork()` with the appropriate `awardCode` + `classification`.
- `WageResolver`: the `source.api === 'mapd'` dispatch branch is removed.
  Any code passing `api: 'mapd'` at runtime will now throw at Zod parse.

### Migration

Production has zero rows with `source.api === 'mapd'` in
`wage_calculation_snapshots.source_provenance` (verified via Supabase MCP
2026-05-14, before this release). No SQL migration shipped — the JSONB
column is new (added in crm7#784 on 2026-05-14) and was never populated
with a `'mapd'` source kind in production.

Consumer apps (`crm7/src/services/chargeCalcSourceAdapters.ts`,
`R80.3/src/services/chargeCalcSourceAdapters.ts`) have their `fromMapd`
implementations removed alongside this release in the same PR.

### Tests

- `__tests__/sources.test.ts` — `'mapd live-api'` test case removed;
  `fromMapd` mock removed from `makeFakeWageDataAccess()`.
- Consumer `chargeCalcSourceAdapters.test.ts` files — `fromMapd` presence
  + null-return assertions removed.

---

## [0.3.0] — 2026-05-14 — Value-with-source architecture (R80.3#248 Phase 1)

### Added

- `src/sources.ts` — `ValueSource` 7-kind discriminated union (manual,
  tenant-preference, live-api, placement-derived, trade-average,
  trade-year-average, host-agreed), `ResolvedValue<T>`,
  `ValueResolver<T>`, `manualValue()`, `chainResolvers()`, type-guards.
- `src/resolvers/training-days.ts` — `TrainingDaysResolver` covering all
  5 sourcing modes (placement / trade-avg / trade-year-avg / tenant-pref
  / host-agreed) via a `TrainingDaysDataAccess` adapter.
- `src/resolvers/wage.ts` — `WageResolver` covering live-api
  (fair-work / mapd / enterprise-agreement / custom), tenant-preference,
  host-agreed, manual — with stale-rate warning.

### Notes

See PR [#997](https://github.com/GaryOcean428/bsuite/pull/997) for the
full surface. Superseded by 0.4.0 (removes the redundant `'mapd'` enum
value).

---

## [0.2.5] — 2026-05-12 — BUG-1 regression lock (no behaviour change)

### Tests

- **Locked BUG-1 `/52` annual-allowance normalisation at both boundaries.**
  The fix itself has been shipping correctly since 0.2.3 (`converter.mapAllowanceAmount`
  line 104 in published `dist/awards/converter.js`) — a zero-defer audit on
  2026-05-12 surfaced that no regression test suite explicitly guarded either
  boundary, so a future edit in `mapd-mapper.ts` could silently introduce a
  double-divide (1/2704 of actual amount) or a silent no-op regression.
- **`mapd-mapper.test.ts`** — new `BUG-1 regression: annum/year invariants at
  mapper boundary` suite. Locks the invariant that `mapWageAllowance` and
  `mapExpenseAllowance` preserve the raw MAPD `allowance_amount` and
  `payment_frequency` string unchanged (no phantom divide at this layer).
- **`converter.test.ts`** — eight new BUG-1 regression cases covering
  case-variant (`Per Annum`, `PER YEAR`), whitespace padding, expense
  allowance with annum frequency, rate-based annual allowance
  (`amount=null, rate=X`), confirmation that weekly and per-shift allowances
  are NOT divided, and an end-to-end `calculate()` smoke test that asserts a
  $5200/year allowance lands as a narrow per-hour delta (catches a 52× regression).

### Internal

- No public API changes. No runtime behaviour changes. Consumer bump from
  `^0.2.3` → `^0.2.5` is a test-lock upgrade only.

### Notes

- Supersedes HF-1 in PR #861. Issue #864 closed with accurate evidence that
  the fix was never actually missing — the prior audit only grepped
  `mapd-mapper.js` and missed the divide in `converter.js:104`.

---

## [0.2.4] — 2026-05-05 — Toolchain refresh

### Changed

- Bumped dev toolchain: Vite 6 → 8, TypeScript 5.9 → 6.0. No public API changes.
- Lockfile regenerated. All 639 tests passing on Node 24.

### Notes

- Part of the bsuite-wide toolchain refresh (2026-05-05).

---

## [0.2.3] and earlier — Pre-changelog (retrospective)

See `git log -- packages/charge-calc/` for prior history.
