# @bsuite/data-export

Shared BSuite data export/import primitives for CSV, XLSX, and JSON.
Pure logic, **zero React, zero Supabase, zero DOM in the core**.

## Why

Every BSuite app was re-implementing CSV/XLSX/JSON export slightly differently —
hand-rolled CSV stringifiers that forgot BOM, 4 different `exportToCsv` functions,
no formula-injection guard anywhere, and three different XLSX code paths. This
package is the single source of truth for file-format concerns.

This package is **ADR-0003 compliant**: it's pure logic, not a UI renderer, so
the "consumer owns renderers" rule doesn't apply here.

## Install

```bash
pnpm add @bsuite/data-export
```

`@e965/xlsx` and `papaparse` are regular dependencies — pnpm will dedupe with
any existing copies. No peer-dep wiring required.

## Subpath exports

```ts
import { toCsvBlob, toJsonBlob, downloadBlob } from '@bsuite/data-export';
import { toXlsxBlob } from '@bsuite/data-export/xlsx'; // lazy-loads @e965/xlsx on first call
```

| Subpath | Purpose | Loads |
|---------|---------|-------|
| `.` | Types + CSV + JSON + browser + mappings + detect | papaparse (eager), no xlsx |
| `./csv` | CSV only | papaparse |
| `./xlsx` | XLSX only | @e965/xlsx (lazy dynamic import) |
| `./json` | JSON only | nothing |
| `./browser` | `downloadBlob` DOM helper | nothing |
| `./mappings` | `FieldMapping` + `applyFieldMappings` + `autoDetectMappings` | nothing |
| `./detect` | `detectFormat(file \| filename)` | nothing |

**Key property**: importing from the main barrel does **not** pull `@e965/xlsx`
into your bundle, even transitively. The xlsx implementation is deliberately
not re-exported from `.`. Consumers that don't need XLSX get a ~50 KB footprint
(papaparse only).

## Usage

### CSV export

```ts
import { toCsvBlob, downloadBlob } from '@bsuite/data-export';

const rows = [
  { name: 'Ada', role: 'Mathematician', born: new Date('1815-12-10') },
  { name: 'Grace', role: 'Admiral', born: new Date('1906-12-09') },
];

const blob = toCsvBlob(rows, {
  headers: ['name', 'role', 'born'], // optional: explicit order
  sanitize: 'strict',                 // default — guards against CSV injection
  bom: true,                          // default — Excel-friendly UTF-8 detection
});

downloadBlob(blob, 'mathematicians.csv');
```

### CSV parse

```ts
import { parseCsv } from '@bsuite/data-export';

const { headers, rows, errors } = await parseCsv(file, {
  dynamicTyping: false,  // default — preserves leading zeros and ZIP codes
});
```

### XLSX (multi-sheet, round-trip)

```ts
import { toXlsxBlob, parseXlsx } from '@bsuite/data-export/xlsx';
import { downloadBlob } from '@bsuite/data-export';

const blob = await toXlsxBlob(
  [
    { name: 'Summary', rows: summaryRows, columnWidths: [30, 15, 15] },
    { name: 'Detail', rows: detailRows },
  ],
  { properties: { title: 'Q1 Report', author: 'BSuite' } },
);

downloadBlob(blob, 'q1-report.xlsx');

// Parse an uploaded file back
const sheets = await parseXlsx(uploadedFile);
```

### JSON

```ts
import { toJsonBlob, downloadBlob } from '@bsuite/data-export';

const blob = toJsonBlob({ exportedAt: new Date(), data }, { pretty: true });
downloadBlob(blob, 'snapshot.json');
```

## Security: formula-injection guard

OWASP CSV injection attacks exploit spreadsheet apps by crafting cell values
that begin with `=`, `+`, `-`, `@`, `\t`, or `\r`. Excel evaluates them as
formulas — which can exfiltrate data, run `cmd`, or poison referenced cells.

**Default behaviour** (`sanitize: 'strict'`) prefixes any string starting with
one of these characters with a single quote. The quote is invisible in Excel
but defuses the formula.

**Escape hatch** (`sanitize: 'off'`): use only when every cell is derived from
trusted numeric/boolean sources. Example: R80.3 calculator outputs like
`-$100.00` where the `-` is a legitimate numeric sign and the guard would
prefix it, breaking display.

```ts
// User-entered data — always sanitise
toCsv(userFeedback);

// Trusted calculator output — OK to skip
toCsv(calculatorResults, { sanitize: 'off' });
```

## Type coercion

The package applies a canonical coercion pipeline to every cell:

| Input | Output |
|-------|--------|
| `null`, `undefined` | `''` |
| `string` | unchanged (sanitised if enabled) |
| `number` (finite) | passthrough — preserves Excel numeric semantics |
| `number` (NaN, ±Infinity) | `''` |
| `boolean` | configurable labels (default `'true'` / `'false'`) |
| `Date` | ISO by default, `toLocaleString()` with `dateFormat: 'locale'` |
| `bigint` | decimal string |
| anything else | **throws** `TypeError` with key hint |

Rejecting unserialisable types early (functions, ReactElements, Symbols, plain
objects) is intentional — silently emitting `[object Object]` cells is a bug,
not a feature.

## Bundle budget

| Import | Gzipped cost |
|--------|--------------|
| `.` barrel | ~50 KB (papaparse + coerce/sanitize) |
| `./csv` | ~50 KB (papaparse) |
| `./xlsx` | ~5 KB up-front + ~200 KB lazy chunk on first call |
| `./json` | ~0.5 KB |
| `./browser` | ~0.2 KB |

## Scripts

```bash
pnpm --filter @bsuite/data-export test         # run vitest
pnpm --filter @bsuite/data-export build        # emit dist/
pnpm --filter @bsuite/data-export typecheck    # strict tsc
```

## Security notes

- **Formula-injection guard** (section above) runs on every string cell by default.
- **Prototype-pollution guard**: `parseCsv` and `parseXlsx` strip the keys
  `__proto__`, `constructor`, and `prototype` from every row. Any column with
  one of these header names is silently dropped. This prevents malicious
  CSV/XLSX uploads from polluting `Object.prototype` via `obj[key] = value`
  assignments during parsing.

## Out of scope

- **PDF rendering** — jspdf/pdf-lib/react-pdf have irreconcilable APIs and no
  app currently shares PDF templates. Consumers keep their own PDF code.
- **Supabase query execution** — the package takes rows in, files out. Query
  orchestration stays in the consumer (e.g. crm7's `importExportService.ts`).
- **Google Sheets bidirectional sync** — planned for a separate
  `@bsuite/sheets-sync` package once OAuth 2.1 PKCE flow is designed.
