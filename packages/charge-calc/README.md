# @bsuite/charge-calc

Shared charge-rate calculation and BOOT assessment engine for Australian GTO and labour-hire operators.

Used by **CRM7** (charge-rate modelling) and **R80.3** (FWC award wage comparisons).

---

## Features

| Capability | Entry point | Key exports |
|---|---|---|
| Charge-rate calculation | `@bsuite/charge-calc` | `calculateChargeRate`, `buildCalcConfig` |
| Billing & recovery | `@bsuite/charge-calc` | `calculateBilling`, `calculateRecovery` |
| FWC award lookup | `@bsuite/charge-calc/awards` | `AwardRegistry`, `fetchAward`, `AwardScheduleZ` |
| **BOOT assessment engine** | `@bsuite/charge-calc/boot` | `compareBOOT`, `compareGTOBOOT`, `detectFailurePatterns`, `generateRecommendations`, `generateF17Data` |
| Shared types | `@bsuite/charge-calc/types` | All Zod schemas and TypeScript types |

---

## Installation

```bash
pnpm add @bsuite/charge-calc
```

Requires `zod ^4.0.0` as a peer dependency.

---

## Charge-rate calculation

```ts
import { calculateChargeRate, buildCalcConfig } from '@bsuite/charge-calc';

const config = buildCalcConfig({
  baseHourlyRate: 28.50,
  casualLoading: 0.25,
  superRate: 0.12,
  workersCompRate: 0.021,
  publicLiabilityRate: 0.005,
  margin: 0.18,
});

const result = calculateChargeRate(config);
// result.chargeRate — all-up hourly charge rate
// result.breakdown — itemised cost components
```

### Named pay item group IDs

`calculate()` accepts CRM7-owned `pay_item_groups.id` values so consumers can
key rates by named pay-item group UUIDs instead of enum-like strings. Legacy
keys remain available during migration.

```ts
import { calculate, DEFAULT_CONFIG } from '@bsuite/charge-calc';

const ordinaryPayItemGroupId = crm7PayItemGroups.ordinary.id;
const overtimePayItemGroupId = crm7PayItemGroups.overtime15.id;

const result = calculate({
  ...DEFAULT_CONFIG,
  ordinaryPayItemGroup: {
    id: ordinaryPayItemGroupId,
    name: 'Ordinary Time',
    code: 'ORD',
    category: 'ordinary_time',
    sortPriority: 10,
  },
  penalties: DEFAULT_CONFIG.penalties.map((penalty) =>
    penalty.id === 'ot15'
      ? {
          ...penalty,
          payItemGroup: {
            id: overtimePayItemGroupId,
            name: 'Overtime 1.5x',
            code: 'OT1.5',
            category: 'overtime_1_5',
            sortPriority: 20,
          },
        }
      : penalty,
  ),
});

result.rates[ordinaryPayItemGroupId]; // canonical named-group lookup
result.rates['ord']; // legacy compatibility alias
result.ratesByPayItemGroupId[overtimePayItemGroupId];
```

---

## BOOT Assessment Engine

The BOOT (Better Off Overall Test) engine implements the comparative analysis required under **ss.193 and 193A of the Fair Work Act 2009** for enterprise agreement approval at the Fair Work Commission.

> **⚠️ Legal disclaimer**: The engine is a decision-support tool only. It does not constitute legal advice. Every result carries `humanReviewRequired: true` and must be reviewed by a qualified industrial relations professional before reliance. See `F17_DISCLAIMER` for the full mandated text.

### Architecture

```
src/boot/
├── types.ts           — Zod schemas: EATerms, AwardSchedule, RosterScenario, BOOTResult, GTOBOOTResult
├── compare.ts         — compareBOOT() — core BOOT comparator (ss.193A algorithm)
├── annual-value.ts    — computeAnnualEmployeeValue() — monetary value per scenario
├── non-monetary.ts    — compareNonMonetary() — span, rostering, leave entitlements
├── failure-detector.ts — detectFailurePatterns() — 8 known EA failure pattern codes
├── recommender.ts     — generateRecommendations() — prioritised remediation steps
├── f17-export.ts      — generateF17Data() — structured JSON for FWC Form F17
└── gto.ts             — compareGTOBOOT() — multi-placement GTO variant (s.193)
```

### Core comparator

```ts
import { compareBOOT } from '@bsuite/charge-calc/boot';
import type { AwardSchedule, EATerms, RosterScenario } from '@bsuite/charge-calc/boot';

const result = compareBOOT(
  [awardSchedule],    // AwardSchedule[] — modern award classification data
  eaTerms,            // EATerms — enterprise agreement to assess
  [typicalScenario, worstCaseScenario], // RosterScenario[]
  { marginalThreshold: 0.05 },          // optional MarginalConfig
);

// result.overallVerdict — 'pass' | 'fail' | 'marginal' | 'indeterminate'
// result.classResults   — per-classification breakdown with scenario-level detail
// result.warnings       — critical / warning / info diagnostics
// result.humanReviewRequired — always true (legally mandated)
```

**Verdict rules:**
- `pass` — EA annual value ≥ award across all scenarios, by more than the marginal threshold (default 5%)
- `marginal` — EA passes but within the 5% threshold — reconciliation clause recommended
- `fail` — EA annual value < award in any scenario
- `indeterminate` — missing award classification data

### Failure pattern detector

```ts
import { detectFailurePatterns } from '@bsuite/charge-calc/boot';

const patterns = detectFailurePatterns(bootResult, awards, ea, scenarios);
// patterns[].code — one of 8 known failure codes:
//   'higher_base_no_penalties' | 'loaded_rate_insufficient' | 'casual_overlooked'
//   'allowances_absorbed_unproven' | 'award_entitlements_omitted' | 'stale_modelling'
//   'vague_all_inclusive' | 'non_monetary_offset_claimed'
```

### Recommender

```ts
import { generateRecommendations } from '@bsuite/charge-calc/boot';

const recs = generateRecommendations(bootResult, patterns);
// Sorted by priority: critical → high → medium → low
// recs[].action — human-readable action description
// recs[].estimatedCost — dollar amount where calculable
```

### FWC Form F17 export

Generates structured JSON data matching the FWC's Form F17 comparison spreadsheet format, ready for PDF/XLSX rendering by a presentation layer.

```ts
import { generateF17Data } from '@bsuite/charge-calc/boot';

const f17 = generateF17Data(bootResult, ea, 'IR Consultant Name');
// f17.header              — agreement metadata + mandatory disclaimer
// f17.classifications     — per-classification sheets with scenario matrix
// f17.scenarioMatrix      — rows × columns overview grid
// f17.summary             — pass/fail/marginal counts + totalDelta
// f17.qualitativeAssessment — non-monetary terms and notes
```

### GTO multi-placement variant

For Group Training Organisations with apprentices hosted across multiple employers. Per s.193, **every placement must individually pass** the BOOT.

```ts
import { compareGTOBOOT } from '@bsuite/charge-calc/boot';

const gtoResult = compareGTOBOOT(
  {
    apprenticeId: 'abn-12345',
    currentYear: 2,
    placements: [
      {
        hostEmployerId: 'host-a',
        hostEmployerName: 'Acme Manufacturing',
        applicableAwards: [awardSchedule],
        scenarios: [typicalScenario],
        timeAllocation: 0.6,   // 60% of year at this host
      },
      {
        hostEmployerId: 'host-b',
        hostEmployerName: 'Beta Logistics',
        applicableAwards: [awardSchedule],
        scenarios: [typicalScenario],
        timeAllocation: 0.4,
      },
    ],
  },
  ea,
);

// gtoResult.overallVerdict       — fails if ANY placement fails
// gtoResult.weakestPlacement     — placement with worst delta
// gtoResult.weightedAggregateDelta — Σ(delta × timeAllocation)
```

---

## Test coverage

639 tests on Node 24, TypeScript 6.0, Vite 8.

| Suite | File |
|---|---|
| Core calculation | `src/__tests__/calculate.test.ts` |
| Billing | `src/__tests__/billing.test.ts` |
| Utilities | `src/__tests__/utils.test.ts` |
| Types | `src/__tests__/types.test.ts` |
| Integration (phase 1) | `src/__tests__/integration.test.ts` |
| Integration (phase 2) | `src/__tests__/integration-phase2.test.ts` |
| Golden cases | `src/__tests__/golden.test.ts` |
| Invariants | `src/__tests__/invariants.test.ts` |
| **BOOT — core** | `src/__tests__/boot/compare.test.ts` |
| **BOOT — annual value** | `src/__tests__/boot/annual-value.test.ts` |
| **BOOT — failure detector** | `src/__tests__/boot/failure-detector.test.ts` |
| **BOOT — recommender** | `src/__tests__/boot/recommender.test.ts` |
| **BOOT — F17 export** | `src/__tests__/boot/f17-export.test.ts` |
| **BOOT — GTO** | `src/__tests__/boot/gto.test.ts` |
| **BOOT — types** | `src/__tests__/boot/types.test.ts` |
| **BOOT — golden cases** | `src/__tests__/boot/golden-boot.test.ts` |
| **BOOT — invariants** | `src/__tests__/boot/invariants-boot.test.ts` |

```bash
pnpm test          # run all tests
pnpm test:coverage # generate coverage report
```

---

## Package exports

```jsonc
{
  ".":        "dist/index.js",           // charge-rate calc + billing + awards + boot
  "./types":  "dist/types.js",           // shared types only
  "./awards": "dist/awards/index.js",    // FWC award registry
  "./boot":   "dist/boot/index.js"       // BOOT assessment engine
}
```

---

## Build

```bash
pnpm build      # tsc -p tsconfig.build.json → dist/
pnpm typecheck  # type-check only, no emit
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and the root [CLAUDE.md](../../CLAUDE.md) for project-wide standards.

When modifying this package: build → bump version in `package.json` → `npm publish --access public` → update consumer `package.json` files → regenerate lockfiles per the **Lockfile generation** rule in CLAUDE.md.
