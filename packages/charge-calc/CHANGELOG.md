# @bsuite/charge-calc — CHANGELOG

All notable changes to `@bsuite/charge-calc` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
