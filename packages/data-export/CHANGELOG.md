# @bsuite/data-export

## 0.1.3 (2026-04-30)

### Changed

- **`SheetSpec` and `HeaderStyle` are now exported from the types barrel
  (`@bsuite/data-export` main entry and `@bsuite/data-export/types`) as
  well as the `/xlsx` subpath.** The canonical single-source-of-truth
  moved from `src/xlsx/index.ts` into `src/types.ts` so package-internal
  modules and test suites can reference it without risking a circular
  dependency with the lazy-loaded xlsx entry. Re-exported from `/xlsx`
  for back-compat — all existing imports continue to work unchanged.

### Fixed

- Type-only relocation resolves a `TS2305: Module '../types.js' has no
  exported member 'SheetSpec'` typecheck error in the variance test
  suite.

## 0.1.2 (2026-04-30)

### Fixed

- **Public signatures now accept `Record<string, unknown>[]`.**
  `toCsv`, `toCsvBlob`, `toXlsx`, and `SheetSpec.rows` previously declared
  `readonly Row[]` (where `Row = Record<string, CellValue>`). Consumer
  apps (crm7, business-suite-unified, R80.3) pass
  `Record<string, unknown>[]` from Supabase queries and analytics rows —
  TS rejected the assignment with `TS2345` because `unknown` is wider
  than `CellValue`.
- Introduces a new exported type `InputRow = Record<string, unknown>` as
  the canonical **public input** shape. The internal `Row` type stays
  narrow (`Record<string, CellValue>`) for the coerce pipeline.
- Runtime is unchanged — `prepareRow` already coerces every value
  (`Date → string`, `null → ''`, `bigint → number`, any
  non-`CellValue` → `String(v)`). Only the compile-time surface widened.

### Tests

- Added `src/__tests__/input-row-variance.test.ts` pinning that all
  public APIs accept `Record<string, unknown>[]` without a cast, and
  that non-`CellValue` values (functions, Symbols, objects) are coerced
  rather than thrown on.

## 0.1.1 (2026-04-30)

### Added

- Initial public release of `@bsuite/data-export`.
- Subpath exports: `/csv`, `/xlsx`, `/json`, `/browser`.
- OWASP CSV formula-injection guard (`= + - @ \t \r`) with opt-out via
  `{ sanitize: 'off' }`.
- UTF-8 BOM on CSV output by default.
- Lazy dynamic import of `@e965/xlsx` inside `/xlsx` entry to keep
  consumers' main bundles lean.
- Prototype-pollution guard on `parseCsv` / `parseXlsx`
  (`__proto__`, `constructor`, `prototype` silently stripped).
- `SheetSpec` supports multi-sheet workbooks with bold / coloured
  header rows and a freezeable header pane (used by crm7 F17).
- JSON helpers with BigInt-safe replacer.
- 67 vitest tests covering sanitisation, coercion, and edge cases.

## 0.1.0

- (Yanked — initial placeholder publish, superseded by 0.1.1.)
