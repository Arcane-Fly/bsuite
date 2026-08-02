# @bsuite/charge-calc — CHANGELOG

All notable changes to `@bsuite/charge-calc` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
