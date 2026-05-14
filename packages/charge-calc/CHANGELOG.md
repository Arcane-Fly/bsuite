# @bsuite/charge-calc — CHANGELOG

All notable changes to `@bsuite/charge-calc` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
