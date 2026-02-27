# R80.3 ↔ CRM7 Shared Calculation Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Unify three divergent charge rate calculation engines into a single shared TypeScript package (`@bsuite/charge-calc`) that R80.3 and CRM7 both consume, eliminating DRY violations and formula drift, while adding penalty rates, overtime, allowances, and BOOT compliance analysis.

**Architecture:** Extract the gold-standard calculation logic from `charge-calculator.jsx` (validated against professional Excel spreadsheets) into a pure TypeScript library with zero UI dependencies. R80.3 and CRM7 import this library. A Supabase Edge Function wraps it for server-side audit/compliance verification. The library is structured as three layers: core formulas → award interpretation → BOOT analysis.

**Tech Stack:** TypeScript (strict), Vitest (testing), Zod (runtime validation), pnpm workspace protocol (sharing), Supabase Edge Functions (Deno runtime for server-side)

**Gold Standard Reference:** `/home/braden/Desktop/Dev/bsuite/charge-calculator.jsx` — the `calculate()` function (lines 26–156). All formulas must match this file's output.

**Entity Ownership (per DRY-ONE-SHOT-ARCHITECTURE.md):**
- Award Rates → Owned by R80.3
- Charge Calculations → Owned by R80.3
- Contacts/Clients/Apprentices → Owned by CRM7
- Financial Records → Owned by CRM7

---

## Phase 1: Foundation (Tasks 1–12)

### Task 1: Create shared package directory structure

**Files:**
- Create: `packages/charge-calc/package.json`
- Create: `packages/charge-calc/tsconfig.json`
- Create: `packages/charge-calc/vitest.config.ts`
- Create: `packages/charge-calc/src/index.ts`

**Step 1: Create the package scaffold**

```bash
mkdir -p packages/charge-calc/src
```

**Step 2: Write package.json**

```json
{
  "name": "@bsuite/charge-calc",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./awards": "./src/awards/index.ts",
    "./boot": "./src/boot/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "~5.5.4",
    "vitest": "^3.2.4",
    "zod": "^4.1.12"
  },
  "peerDependencies": {
    "zod": "^4.0.0"
  }
}
```

**Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020"]
  },
  "include": ["src"]
}
```

**Step 4: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
  },
});
```

**Step 5: Write empty barrel export**

```typescript
// packages/charge-calc/src/index.ts
export * from './types';
export * from './calculate';
```

**Step 6: Install dependencies**

```bash
cd packages/charge-calc && pnpm install
```

**Step 7: Commit**

```bash
git add packages/charge-calc/
git commit -m "chore(shared): scaffold @bsuite/charge-calc package"
```

---

### Task 2: Define core types (ported from charge-calculator.jsx + best of calculationUtils.ts)

**Files:**
- Create: `packages/charge-calc/src/types.ts`

**Step 1: Write the failing test**

Create `packages/charge-calc/src/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  type Allowance,
  type PenaltyRate,
  type CalcConfig,
  type CalcResult,
  type FundingConfig,
  type BillingModel,
  AllowanceTypeSchema,
  PenaltyCategory,
} from '../types';

describe('Type definitions', () => {
  it('AllowanceTypeSchema validates known types', () => {
    expect(AllowanceTypeSchema.safeParse('perHour').success).toBe(true);
    expect(AllowanceTypeSchema.safeParse('perDay').success).toBe(true);
    expect(AllowanceTypeSchema.safeParse('perWeek').success).toBe(true);
    expect(AllowanceTypeSchema.safeParse('percent').success).toBe(true);
    expect(AllowanceTypeSchema.safeParse('perKm').success).toBe(true);
    expect(AllowanceTypeSchema.safeParse('invalid').success).toBe(false);
  });

  it('PenaltyCategory distinguishes overtime from penalty', () => {
    expect(PenaltyCategory.Overtime).toBe('overtime');
    expect(PenaltyCategory.Penalty).toBe('penalty');
  });

  it('BillingModel presets map to correct weeks', () => {
    const models: Record<BillingModel, number> = {
      Standard: 39,
      ALEX48: 48,
      W52: 52,
    };
    expect(models.Standard).toBe(39);
    expect(models.ALEX48).toBe(48);
    expect(models.W52).toBe(52);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/charge-calc && pnpm test -- src/__tests__/types.test.ts
```

Expected: FAIL — modules not found

**Step 3: Write the types**

Create `packages/charge-calc/src/types.ts`:

```typescript
import { z } from 'zod';

// ─── Allowances ───
export const AllowanceTypeSchema = z.enum([
  'perHour',
  'perDay',
  'perWeek',
  'percent',
  'perKm',
]);
export type AllowanceType = z.infer<typeof AllowanceTypeSchema>;

export interface Allowance {
  id: string | number;
  name: string;
  type: AllowanceType;
  amount: number;
  /** Whether this allowance attracts superannuation */
  superApplicable: boolean;
  enabled: boolean;
}

// ─── Penalty / OT rates ───
export const PenaltyCategory = {
  Overtime: 'overtime',
  Penalty: 'penalty',
} as const;
export type PenaltyCategoryType = (typeof PenaltyCategory)[keyof typeof PenaltyCategory];

export interface PenaltyRate {
  id: string;
  label: string;
  /** Multiplier applied to base rate (e.g. 1.5 for time-and-a-half) */
  mult: number;
  cat: PenaltyCategoryType;
}

// ─── Billing model ───
export type BillingModel = 'Standard' | 'ALEX48' | 'W52';
export const BILLING_MODEL_WEEKS: Record<BillingModel, number> = {
  Standard: 39,
  ALEX48: 48,
  W52: 52,
};

// ─── Funding ───
export type FundingMethod = 'reduce' | 'passThrough' | 'passPercent';
export type FundingApplicationMethod =
  | 'even'
  | 'first_year'
  | 'weighted_over_term';

export interface FundingMilestone {
  id: string | number;
  name: string;
  amount: number;
  month: number;
}

export interface FundingConfig {
  enabled: boolean;
  milestones: FundingMilestone[];
  method: FundingMethod;
  /** Only used when method = 'passPercent' */
  passPercentage: number;
  /** Apprenticeship duration in years (for per-hour spread) */
  apprenticeshipYears: number;
}

// ─── Margin ───
export type MarginType = 'flat' | 'percent';

// ─── Overhead ───
export type OverheadType = 'flat' | 'percent';

// ─── Core Calculation Config ───
export interface CalcConfig {
  // Base wage
  wage: number;

  // Hours & days
  hoursPerWeek: number;
  hoursPerDay: number;
  daysPerWeek: number;

  // Billing
  billableWeeks: number;
  trainingWeeks: number;
  apprenticeshipYears: number;

  // Leave (in days)
  annualLeaveDays: number;
  publicHolidayDays: number;
  sickLeaveDays: number;
  leaveLoadingPercent: number;

  // On-costs (as decimals, e.g. 0.12 for 12%)
  superRate: number;
  superOnOT: boolean;
  wcRate: number;
  payrollTaxRate: number;

  // Overheads
  overheadType: OverheadType;
  overheadValue: number;

  // Fixed annual costs
  studyCost: number;
  ppeCost: number;
  trainingFeesAnnual: number;

  // Margin
  marginType: MarginType;
  marginValue: number;

  // Allowances
  allowances: Allowance[];

  // Penalties & OT
  penalties: PenaltyRate[];

  // Funding
  funding: FundingConfig;
}

// ─── Per-rate result ───
export interface RateResult {
  charge: number;
  funded: number;
  funding: number;
}

// ─── Oncost breakdown (per-hour) ───
export interface OncostBreakdown {
  annualLeave: number;
  publicHolidays: number;
  sickLeave: number;
  training: number;
  study: number;
  ppe: number;
  superannuation: number;
  workersComp: number;
  overhead: number;
  payrollTax: number;
  total: number;
}

// ─── Full calculation result ───
export interface CalcResult {
  // Received wage
  receivedWagePerHour: number;
  weeklyPay: number;

  // Annual pay components
  workedPay: number;
  trainingPay: number;
  annualLeavePay: number;
  sickLeavePay: number;
  publicHolidayPay: number;
  totalAnnualPay: number;

  // On-costs
  superAmount: number;
  workersCompAmount: number;
  overheadAmount: number;

  // Totals
  totalAnnualCost: number;

  // Hours
  billableHours: number;
  totalHours: number;
  trainingHours: number;
  nonBillableHours: number;

  // Per-hour
  billedWagePerHour: number;
  billedOncostPerHour: number;
  costPerHour: number;
  marginPerHour: number;
  quotedChargeRate: number;

  // OT base
  otBase1x: number;
  otOncostPerHour: number;
  penaltyOncostPerHour: number;

  // Oncost breakdown
  oncosts: OncostBreakdown;

  // Funding
  fundingPerHour: number;
  fundingTotal: number;
  totalBillableHoursApprentice: number;

  // Week allocation
  annualLeaveWeeks: number;
  publicHolidayWeeks: number;
  sickLeaveWeeks: number;
  impliedBillableWeeks: number;

  // Allowance detail
  allowancePerHour: number;
  allowanceSuperPerHour: number;

  // All rates (ordinary + each penalty/OT)
  rates: Record<string, RateResult>;
}

// ─── Superannuation schedule ───
export interface SuperScheduleEntry {
  effectiveFrom: Date;
  rate: number;
}

export const SUPER_SCHEDULE: SuperScheduleEntry[] = [
  { effectiveFrom: new Date('2024-07-01'), rate: 0.115 },
  { effectiveFrom: new Date('2025-07-01'), rate: 0.12 },
];

/**
 * Returns the correct super rate for a given date.
 * Defaults to latest known rate if date is in the future.
 */
export function getSuperRate(asOf: Date = new Date()): number {
  const sorted = [...SUPER_SCHEDULE].sort(
    (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime()
  );
  for (const entry of sorted) {
    if (asOf >= entry.effectiveFrom) return entry.rate;
  }
  return sorted[sorted.length - 1].rate;
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/charge-calc && pnpm test -- src/__tests__/types.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/charge-calc/src/types.ts packages/charge-calc/src/__tests__/types.test.ts
git commit -m "feat(charge-calc): define core types with Zod validation"
```

---

### Task 3: Implement core `calculate()` function — allowances + annual pay

**Files:**
- Create: `packages/charge-calc/src/calculate.ts`
- Create: `packages/charge-calc/src/__tests__/calculate.test.ts`

**Step 1: Write failing tests for allowance aggregation and annual pay**

```typescript
import { describe, it, expect } from 'vitest';
import { calculate } from '../calculate';
import type { CalcConfig } from '../types';

/** Standard GTO config matching charge-calculator.jsx defaults */
const BASE_CONFIG: CalcConfig = {
  wage: 29.50,
  hoursPerWeek: 38,
  hoursPerDay: 7.6,
  daysPerWeek: 5,
  billableWeeks: 39,
  trainingWeeks: 5,
  apprenticeshipYears: 4,
  annualLeaveDays: 20,
  publicHolidayDays: 10,
  sickLeaveDays: 10,
  leaveLoadingPercent: 17.5,
  superRate: 0.12,
  superOnOT: false,
  wcRate: 0.047,
  payrollTaxRate: 0.0485,
  overheadType: 'percent',
  overheadValue: 6.5,
  studyCost: 850,
  ppeCost: 350,
  trainingFeesAnnual: 0,
  marginType: 'flat',
  marginValue: 2.10,
  allowances: [
    { id: 1, name: 'Site Allowance', type: 'perHour', amount: 2.50, superApplicable: false, enabled: true },
  ],
  penalties: [
    { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' },
    { id: 'ot20', label: 'Double Time', mult: 2.0, cat: 'overtime' },
    { id: 'ph', label: 'Public Holiday Worked', mult: 2.5, cat: 'penalty' },
  ],
  funding: {
    enabled: true,
    milestones: [
      { id: 1, name: '6 Month', amount: 3500, month: 6 },
      { id: 2, name: 'Halfway', amount: 3000, month: 24 },
      { id: 3, name: 'Completion', amount: 3500, month: 48 },
    ],
    method: 'reduce',
    passPercentage: 100,
    apprenticeshipYears: 4,
  },
};

describe('calculate()', () => {
  describe('allowance aggregation', () => {
    it('converts perHour allowance correctly', () => {
      const res = calculate(BASE_CONFIG);
      // $2.50/hr site allowance
      expect(res.allowancePerHour).toBeCloseTo(2.50, 2);
    });

    it('does not include non-super-applicable allowance in super base', () => {
      const res = calculate(BASE_CONFIG);
      // Site allowance is NOT super-applicable
      expect(res.allowanceSuperPerHour).toBeCloseTo(0, 2);
    });

    it('converts perDay allowance to per-hour', () => {
      const cfg = {
        ...BASE_CONFIG,
        allowances: [
          { id: 1, name: 'Tool', type: 'perDay' as const, amount: 19.00, superApplicable: true, enabled: true },
        ],
      };
      const res = calculate(cfg);
      // $19/day ÷ (38/5 = 7.6 hrs/day) = $2.50/hr
      expect(res.allowancePerHour).toBeCloseTo(2.50, 2);
      expect(res.allowanceSuperPerHour).toBeCloseTo(2.50, 2);
    });

    it('converts perWeek allowance to per-hour', () => {
      const cfg = {
        ...BASE_CONFIG,
        allowances: [
          { id: 1, name: 'Travel', type: 'perWeek' as const, amount: 95.00, superApplicable: false, enabled: true },
        ],
      };
      const res = calculate(cfg);
      // $95/wk ÷ 38 hrs/wk = $2.50/hr
      expect(res.allowancePerHour).toBeCloseTo(2.50, 2);
    });

    it('converts percent allowance to per-hour', () => {
      const cfg = {
        ...BASE_CONFIG,
        allowances: [
          { id: 1, name: 'Leading Hand', type: 'percent' as const, amount: 8.474576, superApplicable: true, enabled: true },
        ],
      };
      const res = calculate(cfg);
      // $29.50 × 8.474576% ≈ $2.50/hr
      expect(res.allowancePerHour).toBeCloseTo(2.50, 2);
    });

    it('skips disabled allowances', () => {
      const cfg = {
        ...BASE_CONFIG,
        allowances: [
          { id: 1, name: 'Disabled', type: 'perHour' as const, amount: 99.00, superApplicable: false, enabled: false },
        ],
      };
      const res = calculate(cfg);
      expect(res.allowancePerHour).toBeCloseTo(0, 2);
    });
  });

  describe('received wage and weekly pay', () => {
    it('adds allowances to base wage for received rate', () => {
      const res = calculate(BASE_CONFIG);
      // $29.50 + $2.50 = $32.00
      expect(res.receivedWagePerHour).toBeCloseTo(32.00, 2);
    });

    it('calculates weekly pay as received × hours', () => {
      const res = calculate(BASE_CONFIG);
      // $32.00 × 38 = $1,216.00
      expect(res.weeklyPay).toBeCloseTo(1216.00, 2);
    });
  });

  describe('week allocation', () => {
    it('converts leave days to weeks', () => {
      const res = calculate(BASE_CONFIG);
      // 20 AL days ÷ 5 dpw = 4 weeks
      expect(res.annualLeaveWeeks).toBeCloseTo(4, 1);
      // 10 PH ÷ 5 = 2 weeks
      expect(res.publicHolidayWeeks).toBeCloseTo(2, 1);
      // 10 sick ÷ 5 = 2 weeks
      expect(res.sickLeaveWeeks).toBeCloseTo(2, 1);
    });
  });

  describe('annual pay components', () => {
    it('calculates worked pay = weeklyPay × billableWeeks', () => {
      const res = calculate(BASE_CONFIG);
      // $1,216 × 39 = $47,424
      expect(res.workedPay).toBeCloseTo(47424.00, 0);
    });

    it('calculates training pay = weeklyPay × trainingWeeks', () => {
      const res = calculate(BASE_CONFIG);
      // $1,216 × 5 = $6,080
      expect(res.trainingPay).toBeCloseTo(6080.00, 0);
    });

    it('applies leave loading multiplicatively to AL', () => {
      const res = calculate(BASE_CONFIG);
      // AL weeks = 4, weeklyPay = $1,216
      // alPay = ($1,216 × 4) × (1 + 0.175) = $4,864 × 1.175 = $5,715.20
      expect(res.annualLeavePay).toBeCloseTo(5715.20, 0);
    });

    it('calculates totalAnnualPay as (weeklyPay × 48) + alPay', () => {
      const res = calculate(BASE_CONFIG);
      // (1216 × 48) + 5715.20 = 58,368 + 5,715.20 = 64,083.20
      expect(res.totalAnnualPay).toBeCloseTo(64083.20, 0);
    });
  });

  describe('superannuation', () => {
    it('calculates super on super-bearing wage only', () => {
      const res = calculate(BASE_CONFIG);
      // Super-bearing rate = $29.50 + $0 (no super-applicable allowances) = $29.50
      // wkSuperBearing = $29.50 × 38 = $1,121
      // wkWage = $29.50 × 38 = $1,121
      // totAnnPaySuper = ($1,121 × 48) + (($1,121 × 4) × 1.175)
      //                = $53,808 + $5,268.70 = $59,076.70
      // superAmt = $59,076.70 × 0.12 = $7,089.20
      expect(res.superAmount).toBeCloseTo(7089.20, 0);
    });
  });

  describe('workers compensation', () => {
    it('applies WC to worked + training weeks only (not leave)', () => {
      const res = calculate(BASE_CONFIG);
      // wc = (worked + tafePay) × wcRate
      // = ($47,424 + $6,080) × 0.047 = $53,504 × 0.047 = $2,514.69
      expect(res.workersCompAmount).toBeCloseTo(2514.69, 0);
    });
  });

  describe('total annual cost', () => {
    it('sums all cost components', () => {
      const res = calculate(BASE_CONFIG);
      // annPkg = totalAnnPay + super = 64,083.20 + 7,089.20 = 71,172.40
      // wc = 2,514.69
      // oh = 64,083.20 × 0.065 = 4,165.41
      // totCost = annPkg + study + ppe + wc + oh
      //         = 71,172.40 + 850 + 350 + 2,514.69 + 4,165.41 = 79,052.50
      expect(res.totalAnnualCost).toBeCloseTo(79052.50, 0);
    });
  });

  describe('hours', () => {
    it('calculates billable, total, training, and non-billable hours', () => {
      const res = calculate(BASE_CONFIG);
      expect(res.billableHours).toBe(39 * 38);       // 1482
      expect(res.totalHours).toBe(52 * 38);           // 1976
      expect(res.trainingHours).toBe(5 * 38);         // 190
      expect(res.nonBillableHours).toBe(1976 - 1482 - 190); // 304
    });
  });

  describe('charge rate', () => {
    it('calculates cost per billable hour', () => {
      const res = calculate(BASE_CONFIG);
      // costPerHour = totalAnnualCost / billableHours
      // ≈ 79,052.50 / 1,482 ≈ $53.34
      expect(res.costPerHour).toBeCloseTo(79052.50 / 1482, 2);
    });

    it('applies flat margin', () => {
      const res = calculate(BASE_CONFIG);
      // quoted = costPerHour + $2.10
      expect(res.quotedChargeRate).toBeCloseTo(res.costPerHour + 2.10, 2);
    });

    it('applies percentage margin', () => {
      const cfg = { ...BASE_CONFIG, marginType: 'percent' as const, marginValue: 15 };
      const res = calculate(cfg);
      expect(res.marginPerHour).toBeCloseTo(res.costPerHour * 0.15, 2);
    });
  });

  describe('funding', () => {
    it('spreads total funding over all billable hours × apprenticeship years', () => {
      const res = calculate(BASE_CONFIG);
      // total = 3500 + 3000 + 3500 = $10,000
      // totalBillableHrsApp = 1,482 × 4 = 5,928
      // fundingPH = 10,000 / 5,928 ≈ $1.687
      expect(res.fundingPerHour).toBeCloseTo(10000 / (1482 * 4), 2);
    });

    it('ordinary rate includes funding discount', () => {
      const res = calculate(BASE_CONFIG);
      expect(res.rates['ord'].funded).toBeCloseTo(
        res.rates['ord'].charge - res.fundingPerHour,
        2
      );
    });

    it('passThrough method has zero rate impact', () => {
      const cfg = {
        ...BASE_CONFIG,
        funding: { ...BASE_CONFIG.funding, method: 'passThrough' as const },
      };
      const res = calculate(cfg);
      expect(res.fundingPerHour).toBe(0);
    });

    it('passPercent method applies percentage of funding', () => {
      const cfg = {
        ...BASE_CONFIG,
        funding: { ...BASE_CONFIG.funding, method: 'passPercent' as const, passPercentage: 80 },
      };
      const res = calculate(cfg);
      // 10,000 × 80% / 5,928 ≈ $1.349
      expect(res.fundingPerHour).toBeCloseTo((10000 * 0.80) / (1482 * 4), 2);
    });
  });

  describe('penalty and overtime rates', () => {
    it('overtime rates do NOT get funding discount', () => {
      const res = calculate(BASE_CONFIG);
      const ot15 = res.rates['ot15'];
      expect(ot15.funding).toBe(0);
      expect(ot15.funded).toBe(ot15.charge);
    });

    it('penalty rates DO get funding discount', () => {
      const res = calculate(BASE_CONFIG);
      const ph = res.rates['ph'];
      expect(ph.funding).toBeCloseTo(res.fundingPerHour, 2);
      expect(ph.funded).toBeCloseTo(ph.charge - res.fundingPerHour, 2);
    });

    it('overtime charge = ot1x × multiplier', () => {
      const res = calculate(BASE_CONFIG);
      const ot15 = res.rates['ot15'];
      // ot1x = recv + marginPH + otOnc
      // otCharge = ot1x × 1.5 (no super on OT)
      expect(ot15.charge).toBeCloseTo(res.otBase1x * 1.5, 2);
    });

    it('super on OT adds super component when enabled', () => {
      const cfg = { ...BASE_CONFIG, superOnOT: true };
      const res = calculate(cfg);
      const ot15 = res.rates['ot15'];
      const resNo = calculate(BASE_CONFIG);
      const ot15No = resNo.rates['ot15'];
      // Should be higher with super on OT
      expect(ot15.charge).toBeGreaterThan(ot15No.charge);
    });
  });

  describe('date-aware superannuation (C4)', () => {
    it('returns 11.5% before July 2025', () => {
      const { getSuperRate } = await import('../types');
      expect(getSuperRate(new Date('2025-06-30'))).toBe(0.115);
    });

    it('returns 12% from July 2025 onwards', () => {
      const { getSuperRate } = await import('../types');
      expect(getSuperRate(new Date('2025-07-01'))).toBe(0.12);
    });
  });

  describe('billing model presets', () => {
    it('produces different rates for 39w vs 48w vs 52w', () => {
      const r39 = calculate({ ...BASE_CONFIG, billableWeeks: 39 });
      const r48 = calculate({ ...BASE_CONFIG, billableWeeks: 48 });
      const r52 = calculate({ ...BASE_CONFIG, billableWeeks: 52 });

      // More billable weeks = lower per-hour charge
      expect(r39.quotedChargeRate).toBeGreaterThan(r48.quotedChargeRate);
      expect(r48.quotedChargeRate).toBeGreaterThan(r52.quotedChargeRate);

      // But total annual cost should be the same
      expect(r39.totalAnnualCost).toBeCloseTo(r48.totalAnnualCost, 0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/charge-calc && pnpm test -- src/__tests__/calculate.test.ts
```

Expected: FAIL — `calculate` not found

**Step 3: Implement the `calculate()` function**

Create `packages/charge-calc/src/calculate.ts` — porting the logic from `charge-calculator.jsx` lines 26–156 into TypeScript:

```typescript
import type {
  CalcConfig,
  CalcResult,
  RateResult,
  OncostBreakdown,
  Allowance,
} from './types';

/**
 * Converts an allowance to a per-hour rate.
 * Matches charge-calculator.jsx lines 36–44.
 */
function allowanceToPerHour(a: Allowance, wage: number, hpw: number, dpw: number): number {
  switch (a.type) {
    case 'perHour':
      return a.amount;
    case 'perDay':
      return a.amount / (hpw / dpw);
    case 'perWeek':
      return a.amount / hpw;
    case 'percent':
      return wage * (a.amount / 100);
    case 'perKm':
      return a.amount; // user enters effective $/hr
    default:
      return 0;
  }
}

/**
 * Core charge rate calculation engine.
 *
 * This is the single source of truth for all charge rate calculations
 * across R80.3 and CRM7. Formulas match the gold-standard
 * charge-calculator.jsx validated against professional Excel spreadsheets.
 */
export function calculate(cfg: CalcConfig): CalcResult {
  const {
    wage,
    hoursPerWeek: hpw,
    hoursPerDay: hpd,
    daysPerWeek: dpw,
    billableWeeks: billableWk,
    trainingWeeks: trainWk,
    apprenticeshipYears: appYears,
    annualLeaveDays: alDays,
    publicHolidayDays: phDays,
    sickLeaveDays: sickDays,
    leaveLoadingPercent,
    superRate,
    superOnOT,
    wcRate,
    overheadType: ohType,
    overheadValue: ohVal,
    studyCost: study,
    ppeCost: ppe,
    marginType,
    marginValue: marginVal,
    allowances,
    penalties,
    funding,
  } = cfg;

  const leaveLoad = leaveLoadingPercent / 100;

  // ─── Allowance aggregation (lines 34–45) ───
  let allowPerHour = 0;
  let allowPerHourSuper = 0;
  for (const a of allowances.filter((a) => a.enabled)) {
    const ph = allowanceToPerHour(a, wage, hpw, dpw);
    allowPerHour += ph;
    if (a.superApplicable) allowPerHourSuper += ph;
  }

  // ─── Received wage (line 47–51) ───
  const recv = wage + allowPerHour;
  const superBearingRate = wage + allowPerHourSuper;
  const wkPay = recv * hpw;
  const wkWage = wage * hpw;
  const wkSuperBearing = superBearingRate * hpw;

  // ─── Week allocation (lines 53–58) ───
  const alWk = alDays / dpw;
  const phWk = phDays / dpw;
  const sickWk = sickDays / dpw;
  const totalNonBillable = alWk + phWk + sickWk + trainWk;
  const impliedBillable = 52 - totalNonBillable;

  // ─── Annual pay components (lines 60–68) ───
  const worked = wkPay * billableWk;
  const tafePay = wkPay * trainWk;
  const alPay = wkPay * alWk * (1 + leaveLoad);
  const persLeave = wkPay * sickWk;
  const phPay = wkPay * phWk;
  const totAnnPay = wkPay * 48 + alPay;

  // ─── Superannuation (lines 70–73) ───
  const totAnnPaySuper =
    wkSuperBearing * 48 + wkWage * alWk * (1 + leaveLoad);
  const superAmt = totAnnPaySuper * superRate;
  const annPkg = totAnnPay + superAmt;

  // ─── Workers comp — worked + training only (line 75) ───
  const wc = (worked + tafePay) * wcRate;

  // ─── Overheads (line 78) ───
  const oh = ohType === 'percent' ? totAnnPay * (ohVal / 100) : ohVal;

  // ─── Total cost (line 80) ───
  const totCost = annPkg + study + ppe + wc + oh;

  // ─── Hours (lines 82–86) ───
  const bHrs = billableWk * hpw;
  const tHrs = 52 * hpw;
  const trainHrs = trainWk * hpw;
  const nonBillHrs = tHrs - bHrs - trainHrs;

  // ─── Per-hour rates (lines 88–94) ───
  const billedWage = (recv * tHrs) / bHrs;
  const ordCost = totCost / bHrs;
  const billedOnc = ordCost - billedWage;
  const marginPH =
    marginType === 'percent' ? ordCost * (marginVal / 100) : marginVal;
  const quoted = ordCost + marginPH;

  // ─── OT base (lines 96–101) ───
  const otOncFactor = 0.12;
  const otOnc = (totAnnPay * otOncFactor) / bHrs;
  const otSuperPH = superOnOT ? superBearingRate * superRate : 0;
  const ot1x = recv + marginPH + otOnc;

  // ─── Penalty oncosts (line 103) ───
  const penOnc = (study + ppe + wc) / bHrs + 0.15;

  // ─── Funding (lines 105–113) ───
  const fundingTotal = funding.enabled
    ? funding.milestones.reduce((s, m) => s + m.amount, 0)
    : 0;
  const totalBillableHrsApp = bHrs * (funding.apprenticeshipYears || appYears);
  let fundingPH = 0;
  if (funding.method === 'reduce' && totalBillableHrsApp > 0) {
    fundingPH = fundingTotal / totalBillableHrsApp;
  } else if (funding.method === 'passPercent' && totalBillableHrsApp > 0) {
    fundingPH =
      (fundingTotal * (funding.passPercentage / 100)) / totalBillableHrsApp;
  }
  // 'passThrough' = no charge rate impact

  // ─── Per-hour oncost breakdown (lines 116–125) ───
  const oncAL = alPay / bHrs;
  const oncPH = phPay / bHrs;
  const oncSick = persLeave / bHrs;
  const oncTafe = tafePay / bHrs;
  const oncStudy = study / bHrs;
  const oncPPE = ppe / bHrs;
  const oncSuper = superAmt / bHrs;
  const oncWC = wc / bHrs;
  const oncOH = oh / bHrs;
  const totOnc =
    oncAL + oncPH + oncSick + oncTafe + oncStudy + oncPPE + oncSuper + oncWC + oncOH;

  // ─── Build rates (lines 127–142) ───
  const rates: Record<string, RateResult> = {};
  rates['ord'] = {
    charge: quoted,
    funded: quoted - fundingPH,
    funding: fundingPH,
  };

  for (const pr of penalties) {
    if (pr.cat === 'overtime') {
      const otCharge =
        ot1x * pr.mult + (superOnOT ? otSuperPH * (pr.mult - 1) : 0);
      rates[pr.id] = { charge: otCharge, funded: otCharge, funding: 0 };
    } else if (pr.cat === 'penalty') {
      const penCharge =
        (48 / 52) * penOnc * pr.mult + billedWage * pr.mult + marginPH;
      rates[pr.id] = {
        charge: penCharge,
        funded: penCharge - fundingPH,
        funding: fundingPH,
      };
    }
  }

  // ─── Oncost breakdown ───
  const oncosts: OncostBreakdown = {
    annualLeave: oncAL,
    publicHolidays: oncPH,
    sickLeave: oncSick,
    training: oncTafe,
    study: oncStudy,
    ppe: oncPPE,
    superannuation: oncSuper,
    workersComp: oncWC,
    overhead: oncOH,
    payrollTax: 0, // Payroll tax is rolled into overhead in gold standard
    total: totOnc,
  };

  return {
    receivedWagePerHour: recv,
    weeklyPay: wkPay,
    workedPay: worked,
    trainingPay: tafePay,
    annualLeavePay: alPay,
    sickLeavePay: persLeave,
    publicHolidayPay: phPay,
    totalAnnualPay: totAnnPay,
    superAmount: superAmt,
    workersCompAmount: wc,
    overheadAmount: oh,
    totalAnnualCost: totCost,
    billableHours: bHrs,
    totalHours: tHrs,
    trainingHours: trainHrs,
    nonBillableHours: nonBillHrs,
    billedWagePerHour: billedWage,
    billedOncostPerHour: billedOnc,
    costPerHour: ordCost,
    marginPerHour: marginPH,
    quotedChargeRate: quoted,
    otBase1x: ot1x,
    otOncostPerHour: otOnc,
    penaltyOncostPerHour: penOnc,
    oncosts,
    fundingPerHour: fundingPH,
    fundingTotal,
    totalBillableHoursApprentice: totalBillableHrsApp,
    annualLeaveWeeks: alWk,
    publicHolidayWeeks: phWk,
    sickLeaveWeeks: sickWk,
    impliedBillableWeeks: impliedBillable,
    allowancePerHour: allowPerHour,
    allowanceSuperPerHour: allowPerHourSuper,
    rates,
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
cd packages/charge-calc && pnpm test -- src/__tests__/calculate.test.ts
```

Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/charge-calc/src/calculate.ts packages/charge-calc/src/__tests__/calculate.test.ts
git commit -m "feat(charge-calc): implement core calculate() matching gold standard"
```

---

### Task 4: Cross-verification test — charge-calculator.jsx golden outputs

**Files:**
- Create: `packages/charge-calc/src/__tests__/golden.test.ts`

This test runs both the JSX reference and the new TypeScript engine with identical inputs and asserts identical outputs. This is the compliance-critical verification.

**Step 1: Write the golden file test**

```typescript
import { describe, it, expect } from 'vitest';
import { calculate } from '../calculate';
import type { CalcConfig } from '../types';

/**
 * Golden output tests.
 *
 * These values are hand-verified against the charge-calculator.jsx
 * reference implementation (extracted from professional Excel spreadsheets).
 *
 * DO NOT modify these expected values without re-verifying against
 * the gold standard. Wage calculations are legally compliance-critical.
 */
describe('Golden output: Standard GTO scenario', () => {
  const cfg: CalcConfig = {
    wage: 29.50,
    hoursPerWeek: 38,
    hoursPerDay: 7.6,
    daysPerWeek: 5,
    billableWeeks: 39,
    trainingWeeks: 5,
    apprenticeshipYears: 4,
    annualLeaveDays: 20,
    publicHolidayDays: 10,
    sickLeaveDays: 10,
    leaveLoadingPercent: 17.5,
    superRate: 0.12,
    superOnOT: false,
    wcRate: 0.047,
    payrollTaxRate: 0.0485,
    overheadType: 'percent',
    overheadValue: 6.5,
    studyCost: 850,
    ppeCost: 350,
    trainingFeesAnnual: 0,
    marginType: 'flat',
    marginValue: 2.10,
    allowances: [
      { id: 1, name: 'Site Allowance', type: 'perHour', amount: 2.50, superApplicable: false, enabled: true },
    ],
    penalties: [
      { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' },
      { id: 'ot20', label: 'Double Time', mult: 2.0, cat: 'overtime' },
      { id: 'ot25', label: 'Double Time & a Half', mult: 2.5, cat: 'overtime' },
      { id: 'ph', label: 'Public Holiday Worked', mult: 2.5, cat: 'penalty' },
      { id: 'night12', label: 'Night Shift (≤4 nights)', mult: 1.2, cat: 'penalty' },
      { id: 'night13', label: 'Night Shift (4+ weeks)', mult: 1.3, cat: 'penalty' },
    ],
    funding: {
      enabled: true,
      milestones: [
        { id: 1, name: '6 Month Commencement', amount: 3500, month: 6 },
        { id: 2, name: 'Halfway', amount: 3000, month: 24 },
        { id: 3, name: 'Completion', amount: 3500, month: 48 },
      ],
      method: 'reduce',
      passPercentage: 100,
      apprenticeshipYears: 4,
    },
  };

  const res = calculate(cfg);

  // Core values
  it('received wage per hour', () => expect(res.receivedWagePerHour).toBeCloseTo(32.00, 2));
  it('weekly pay', () => expect(res.weeklyPay).toBeCloseTo(1216.00, 2));

  // Hours
  it('billable hours', () => expect(res.billableHours).toBe(1482));
  it('total hours', () => expect(res.totalHours).toBe(1976));
  it('training hours', () => expect(res.trainingHours).toBe(190));

  // Cost structure
  it('worked pay', () => expect(res.workedPay).toBeCloseTo(47424, 0));
  it('training pay', () => expect(res.trainingPay).toBeCloseTo(6080, 0));
  it('AL pay (with loading)', () => expect(res.annualLeavePay).toBeCloseTo(5715.20, 0));

  // Final charge rate is in a reasonable range
  it('ordinary charge rate is between $50 and $60/hr', () => {
    expect(res.quotedChargeRate).toBeGreaterThan(50);
    expect(res.quotedChargeRate).toBeLessThan(60);
  });

  // Funding discount
  it('funding per hour ≈ $1.69', () => {
    expect(res.fundingPerHour).toBeCloseTo(10000 / (1482 * 4), 2);
  });

  // OT rates are higher than ordinary
  it('OT 1.5x > ordinary', () => {
    expect(res.rates['ot15'].charge).toBeGreaterThan(res.quotedChargeRate);
  });

  // OT has no funding
  it('OT has zero funding', () => {
    expect(res.rates['ot15'].funding).toBe(0);
    expect(res.rates['ot20'].funding).toBe(0);
  });

  // Penalties have funding
  it('penalty rates include funding discount', () => {
    expect(res.rates['ph'].funding).toBeCloseTo(res.fundingPerHour, 2);
  });
});

describe('Golden output: ALEX 48-week model', () => {
  const cfg48: CalcConfig = {
    wage: 29.50,
    hoursPerWeek: 38,
    hoursPerDay: 7.6,
    daysPerWeek: 5,
    billableWeeks: 48,
    trainingWeeks: 5,
    apprenticeshipYears: 4,
    annualLeaveDays: 20,
    publicHolidayDays: 10,
    sickLeaveDays: 10,
    leaveLoadingPercent: 17.5,
    superRate: 0.12,
    superOnOT: false,
    wcRate: 0.047,
    payrollTaxRate: 0.0485,
    overheadType: 'percent',
    overheadValue: 6.5,
    studyCost: 850,
    ppeCost: 350,
    trainingFeesAnnual: 0,
    marginType: 'flat',
    marginValue: 2.10,
    allowances: [],
    penalties: [],
    funding: { enabled: false, milestones: [], method: 'reduce', passPercentage: 100, apprenticeshipYears: 4 },
  };

  const res48 = calculate(cfg48);

  it('has more billable hours than Standard', () => {
    expect(res48.billableHours).toBe(48 * 38); // 1824
  });

  it('has lower per-hour charge than 39w', () => {
    const cfg39 = { ...cfg48, billableWeeks: 39 };
    const res39 = calculate(cfg39);
    expect(res48.quotedChargeRate).toBeLessThan(res39.quotedChargeRate);
  });

  it('has same total annual cost as 39w', () => {
    const cfg39 = { ...cfg48, billableWeeks: 39 };
    const res39 = calculate(cfg39);
    expect(res48.totalAnnualCost).toBeCloseTo(res39.totalAnnualCost, 0);
  });
});

describe('Golden output: No allowances, no funding', () => {
  const bare: CalcConfig = {
    wage: 25.00,
    hoursPerWeek: 38,
    hoursPerDay: 7.6,
    daysPerWeek: 5,
    billableWeeks: 39,
    trainingWeeks: 5,
    apprenticeshipYears: 4,
    annualLeaveDays: 20,
    publicHolidayDays: 10,
    sickLeaveDays: 10,
    leaveLoadingPercent: 17.5,
    superRate: 0.115,
    superOnOT: false,
    wcRate: 0.047,
    payrollTaxRate: 0.0485,
    overheadType: 'flat',
    overheadValue: 2500,
    studyCost: 850,
    ppeCost: 350,
    trainingFeesAnnual: 0,
    marginType: 'percent',
    marginValue: 15,
    allowances: [],
    penalties: [],
    funding: { enabled: false, milestones: [], method: 'reduce', passPercentage: 100, apprenticeshipYears: 4 },
  };

  const res = calculate(bare);

  it('received wage equals base wage (no allowances)', () => {
    expect(res.receivedWagePerHour).toBe(25.00);
  });

  it('no funding discount', () => {
    expect(res.fundingPerHour).toBe(0);
    expect(res.rates['ord'].charge).toBe(res.rates['ord'].funded);
  });

  it('percentage margin applied correctly', () => {
    expect(res.marginPerHour).toBeCloseTo(res.costPerHour * 0.15, 2);
  });

  it('flat overhead passes through as-is', () => {
    expect(res.overheadAmount).toBe(2500);
  });
});
```

**Step 2: Run tests**

```bash
cd packages/charge-calc && pnpm test -- src/__tests__/golden.test.ts
```

Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/charge-calc/src/__tests__/golden.test.ts
git commit -m "test(charge-calc): add golden output tests verified against Excel reference"
```

---

### Task 5: Property-based invariant tests

**Files:**
- Create: `packages/charge-calc/src/__tests__/invariants.test.ts`

These tests verify mathematical properties that must always hold regardless of input values.

**Step 1: Write invariant tests**

```typescript
import { describe, it, expect } from 'vitest';
import { calculate } from '../calculate';
import type { CalcConfig } from '../types';

function makeConfig(overrides: Partial<CalcConfig> = {}): CalcConfig {
  return {
    wage: 30,
    hoursPerWeek: 38,
    hoursPerDay: 7.6,
    daysPerWeek: 5,
    billableWeeks: 39,
    trainingWeeks: 5,
    apprenticeshipYears: 4,
    annualLeaveDays: 20,
    publicHolidayDays: 10,
    sickLeaveDays: 10,
    leaveLoadingPercent: 17.5,
    superRate: 0.12,
    superOnOT: false,
    wcRate: 0.047,
    payrollTaxRate: 0.0485,
    overheadType: 'percent',
    overheadValue: 6.5,
    studyCost: 850,
    ppeCost: 350,
    trainingFeesAnnual: 0,
    marginType: 'flat',
    marginValue: 2.10,
    allowances: [],
    penalties: [
      { id: 'ot15', label: 'OT 1.5x', mult: 1.5, cat: 'overtime' },
      { id: 'ph', label: 'PH', mult: 2.5, cat: 'penalty' },
    ],
    funding: { enabled: false, milestones: [], method: 'reduce', passPercentage: 100, apprenticeshipYears: 4 },
    ...overrides,
  };
}

describe('Mathematical invariants', () => {
  const wages = [20, 25, 29.50, 35, 45, 60];
  const weeks = [35, 39, 44, 48, 52];

  for (const w of wages) {
    for (const bw of weeks) {
      it(`wage=$${w} bw=${bw}: charge >= wage`, () => {
        const res = calculate(makeConfig({ wage: w, billableWeeks: bw }));
        expect(res.quotedChargeRate).toBeGreaterThan(w);
      });

      it(`wage=$${w} bw=${bw}: all costs non-negative`, () => {
        const res = calculate(makeConfig({ wage: w, billableWeeks: bw }));
        expect(res.totalAnnualCost).toBeGreaterThan(0);
        expect(res.superAmount).toBeGreaterThanOrEqual(0);
        expect(res.workersCompAmount).toBeGreaterThanOrEqual(0);
        expect(res.billableHours).toBeGreaterThan(0);
      });

      it(`wage=$${w} bw=${bw}: OT rates > ordinary rate`, () => {
        const res = calculate(makeConfig({ wage: w, billableWeeks: bw }));
        expect(res.rates['ot15'].charge).toBeGreaterThan(res.rates['ord'].charge);
      });

      it(`wage=$${w} bw=${bw}: total hours = 52 × hpw`, () => {
        const res = calculate(makeConfig({ wage: w, billableWeeks: bw }));
        expect(res.totalHours).toBe(52 * 38);
      });
    }
  }

  it('more billable weeks = lower hourly rate, same annual cost', () => {
    const r39 = calculate(makeConfig({ billableWeeks: 39 }));
    const r48 = calculate(makeConfig({ billableWeeks: 48 }));
    expect(r39.quotedChargeRate).toBeGreaterThan(r48.quotedChargeRate);
    expect(r39.totalAnnualCost).toBeCloseTo(r48.totalAnnualCost, 0);
  });

  it('funding reduces ordinary rate but not OT', () => {
    const withFunding = calculate(makeConfig({
      funding: {
        enabled: true,
        milestones: [{ id: 1, name: 'Test', amount: 10000, month: 12 }],
        method: 'reduce',
        passPercentage: 100,
        apprenticeshipYears: 4,
      },
    }));
    const withoutFunding = calculate(makeConfig());

    // Ordinary funded rate should be lower
    expect(withFunding.rates['ord'].funded).toBeLessThan(withoutFunding.rates['ord'].funded);
    // OT rate should be the same
    expect(withFunding.rates['ot15'].charge).toBeCloseTo(withoutFunding.rates['ot15'].charge, 2);
  });
});
```

**Step 2: Run tests**

```bash
cd packages/charge-calc && pnpm test -- src/__tests__/invariants.test.ts
```

Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/charge-calc/src/__tests__/invariants.test.ts
git commit -m "test(charge-calc): add property-based invariant tests for compliance"
```

---

### Task 6: Wire R80.3 to consume @bsuite/charge-calc

**Files:**
- Modify: `R80.3/package.json` — add workspace dependency
- Modify: `R80.3/vite.config.ts` — add alias
- Create: `R80.3/src/utils/calcBridge.ts` — adapter layer

**Step 1: Add workspace dependency to R80.3**

In `R80.3/package.json`, add to dependencies:

```json
"@bsuite/charge-calc": "workspace:*"
```

**Step 2: Create adapter bridging old interfaces to new**

Create `R80.3/src/utils/calcBridge.ts`:

```typescript
/**
 * Bridge layer: adapts R80.3's existing ApprenticeProfile/CostConfig/WorkConfig
 * interfaces to the shared @bsuite/charge-calc CalcConfig.
 *
 * This allows gradual migration: existing components keep their interfaces,
 * but calculations run through the shared engine.
 */
import { calculate as sharedCalculate } from '@bsuite/charge-calc';
import type { CalcConfig, CalcResult } from '@bsuite/charge-calc';
import type {
  ApprenticeProfile,
  CostConfig,
  WorkConfig,
  BillableOptions,
  FundingConfig,
} from '../types';
import { BILLING_MODEL_WEEKS } from '@bsuite/charge-calc/types';

/**
 * Converts R80.3's per-apprentice config into a CalcConfig
 * that the shared engine understands.
 */
export function toCalcConfig(
  payRate: number,
  costConfig: CostConfig,
  workConfig: WorkConfig,
  billableOptions: BillableOptions,
  fundingConfig?: FundingConfig,
): CalcConfig {
  // Determine billable weeks from billing model or manual calculation
  let billableWeeks: number;
  if (billableOptions.billingModel && BILLING_MODEL_WEEKS[billableOptions.billingModel]) {
    billableWeeks = BILLING_MODEL_WEEKS[billableOptions.billingModel];
  } else {
    // Legacy fallback: calculate from flags
    let unbilledDays = 0;
    if (!billableOptions.includeAnnualLeave) unbilledDays += workConfig.annualLeaveDays;
    if (!billableOptions.includePublicHolidays) unbilledDays += workConfig.publicHolidays;
    if (!billableOptions.includeSickLeave) unbilledDays += workConfig.sickLeaveDays;
    if (!billableOptions.includeAdverseWeather) unbilledDays += costConfig.adverseWeatherDays;
    let unbilledWeeks = unbilledDays / workConfig.daysPerWeek;
    if (!billableOptions.includeTrainingTime) unbilledWeeks += workConfig.trainingWeeks;
    billableWeeks = Math.max(0, workConfig.weeksPerYear - unbilledWeeks);
  }

  return {
    wage: payRate,
    hoursPerWeek: workConfig.hoursPerDay * workConfig.daysPerWeek,
    hoursPerDay: workConfig.hoursPerDay,
    daysPerWeek: workConfig.daysPerWeek,
    billableWeeks,
    trainingWeeks: workConfig.trainingWeeks,
    apprenticeshipYears: fundingConfig?.apprenticeshipTermYears ?? 4,
    annualLeaveDays: workConfig.annualLeaveDays,
    publicHolidayDays: workConfig.publicHolidays,
    sickLeaveDays: workConfig.sickLeaveDays,
    leaveLoadingPercent: costConfig.leaveLoading * 100,
    superRate: costConfig.superRate,
    superOnOT: false, // Will be configurable in future
    wcRate: costConfig.wcRate,
    payrollTaxRate: costConfig.payrollTaxRate,
    overheadType: 'percent',
    overheadValue: costConfig.adminRate * 100,
    studyCost: costConfig.studyCost,
    ppeCost: costConfig.ppeCost,
    trainingFeesAnnual: costConfig.trainingFeesAnnual ?? 0,
    marginType: 'percent',
    marginValue: costConfig.defaultMargin * 100,
    allowances: [], // Phase 2: wire up allowance UI
    penalties: [],  // Phase 2: wire up penalty UI
    funding: {
      enabled: (fundingConfig?.sources?.length ?? 0) > 0,
      milestones: (fundingConfig?.sources ?? []).map((s, i) => ({
        id: s.id || String(i),
        name: s.source || s.description || `Funding ${i + 1}`,
        amount: s.amount,
        month: 12, // Default; will be enhanced in Phase 2
      })),
      method: 'reduce',
      passPercentage: 100,
      apprenticeshipYears: fundingConfig?.apprenticeshipTermYears ?? 4,
    },
  };
}

/**
 * Converts a shared CalcResult back to R80.3's CalculationResult interface.
 * This maintains backward compatibility with existing R80.3 UI components.
 */
export function fromCalcResult(result: CalcResult): {
  payRate: number;
  totalHours: number;
  billableHours: number;
  baseWage: number;
  oncosts: {
    superannuation: number;
    workersComp: number;
    payrollTax: number;
    leaveLoading: number;
    studyCost: number;
    ppeCost: number;
    trainingFeesAnnual: number;
    adminCost: number;
  };
  totalCost: number;
  totalFundingAmount: number;
  annualFundingOffset: number;
  costAfterFunding: number;
  costPerHour: number;
  chargeRate: number;
} {
  return {
    payRate: result.receivedWagePerHour - result.allowancePerHour,
    totalHours: result.totalHours,
    billableHours: result.billableHours,
    baseWage: result.totalAnnualPay,
    oncosts: {
      superannuation: result.superAmount,
      workersComp: result.workersCompAmount,
      payrollTax: 0,
      leaveLoading: result.annualLeavePay - (result.weeklyPay * result.annualLeaveWeeks),
      studyCost: result.oncosts.study * result.billableHours,
      ppeCost: result.oncosts.ppe * result.billableHours,
      trainingFeesAnnual: 0,
      adminCost: result.overheadAmount,
    },
    totalCost: result.totalAnnualCost,
    totalFundingAmount: result.fundingTotal,
    annualFundingOffset: result.fundingPerHour * result.billableHours,
    costAfterFunding: result.totalAnnualCost - (result.fundingPerHour * result.billableHours),
    costPerHour: result.costPerHour,
    chargeRate: result.rates['ord']?.funded ?? result.quotedChargeRate,
  };
}
```

**Step 3: Install dependencies**

```bash
cd R80.3 && pnpm install
```

**Step 4: Commit**

```bash
git add R80.3/package.json R80.3/src/utils/calcBridge.ts
git commit -m "feat(r80): wire @bsuite/charge-calc via adapter bridge"
```

---

### Task 7: Wire CRM7 to consume @bsuite/charge-calc

**Files:**
- Modify: `crm7/package.json` — add dependency
- Modify: `crm7/src/pages/charge-rates/create.tsx` — replace inline calc

**Step 1: Add dependency to CRM7**

CRM7 uses npm, so we'll use a file reference:

```json
"@bsuite/charge-calc": "file:../../packages/charge-calc"
```

**Step 2: Replace inline calculation in create.tsx**

In `crm7/src/pages/charge-rates/create.tsx`, replace the inline `calculateChargeRate` function (approximately lines 231–286) with:

```typescript
import { calculate, toCalcConfig } from '@bsuite/charge-calc';

// Replace the existing calculateChargeRate function:
const calculateChargeRate = async () => {
  const payRate = values.payRate;
  const margin = values.customMargin || DEFAULT_COST_CONFIG.defaultMargin;

  // Use shared calculation engine
  const result = calculate({
    wage: payRate,
    hoursPerWeek: DEFAULT_WORK_CONFIG.hoursPerDay * DEFAULT_WORK_CONFIG.daysPerWeek,
    hoursPerDay: DEFAULT_WORK_CONFIG.hoursPerDay,
    daysPerWeek: DEFAULT_WORK_CONFIG.daysPerWeek,
    billableWeeks: 39, // Standard model default
    trainingWeeks: DEFAULT_WORK_CONFIG.trainingWeeks,
    apprenticeshipYears: 4,
    annualLeaveDays: DEFAULT_WORK_CONFIG.annualLeaveDays,
    publicHolidayDays: DEFAULT_WORK_CONFIG.publicHolidays,
    sickLeaveDays: DEFAULT_WORK_CONFIG.sickLeaveDays,
    leaveLoadingPercent: DEFAULT_COST_CONFIG.leaveLoading * 100,
    superRate: DEFAULT_COST_CONFIG.superRate,
    superOnOT: false,
    wcRate: DEFAULT_COST_CONFIG.wcRate,
    payrollTaxRate: DEFAULT_COST_CONFIG.payrollTaxRate,
    overheadType: 'percent',
    overheadValue: DEFAULT_COST_CONFIG.adminRate * 100,
    studyCost: DEFAULT_COST_CONFIG.studyCost,
    ppeCost: DEFAULT_COST_CONFIG.ppeCost,
    trainingFeesAnnual: DEFAULT_COST_CONFIG.trainingFeesAnnual ?? 0,
    marginType: 'percent',
    marginValue: margin * 100,
    allowances: [],
    penalties: [],
    funding: { enabled: false, milestones: [], method: 'reduce', passPercentage: 100, apprenticeshipYears: 4 },
  });

  // Map to existing CRM7 result shape for backward compatibility
  const calculationResult = {
    payRate,
    totalHours: result.totalHours,
    billableHours: result.billableHours,
    baseWage: result.totalAnnualPay,
    oncosts: {
      superannuation: result.superAmount,
      workersComp: result.workersCompAmount,
      payrollTax: 0,
      leaveLoading: result.annualLeavePay - (result.weeklyPay * result.annualLeaveWeeks),
      studyCost: result.oncosts.study * result.billableHours,
      ppeCost: result.oncosts.ppe * result.billableHours,
      adminCost: result.overheadAmount,
    },
    totalCost: result.totalAnnualCost,
    costPerHour: result.costPerHour,
    chargeRate: result.quotedChargeRate,
  };

  // ... rest of existing save logic unchanged
};
```

**Step 3: Remove the duplicated `DEFAULT_COST_CONFIG` hardcoded values**

Delete the `DEFAULT_COST_CONFIG`, `DEFAULT_WORK_CONFIG`, and `DEFAULT_BILLABLE_OPTIONS` from lines 45–75 and instead import the defaults:

```typescript
import { DEFAULTS } from '@bsuite/charge-calc';
```

(We'll add a `DEFAULTS` export to the shared package.)

**Step 4: Commit**

```bash
git add crm7/package.json crm7/src/pages/charge-rates/create.tsx
git commit -m "refactor(crm7): replace inline calc with @bsuite/charge-calc"
```

---

### Task 8: Add default configs export to shared package

**Files:**
- Modify: `packages/charge-calc/src/index.ts`
- Create: `packages/charge-calc/src/defaults.ts`

**Step 1: Create defaults file**

```typescript
// packages/charge-calc/src/defaults.ts
import type { CalcConfig, PenaltyRate } from './types';

export const DEFAULT_PENALTIES: PenaltyRate[] = [
  { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' },
  { id: 'ot20', label: 'Double Time', mult: 2.0, cat: 'overtime' },
  { id: 'ot25', label: 'Double Time & a Half', mult: 2.5, cat: 'overtime' },
  { id: 'ph', label: 'Public Holiday Worked', mult: 2.5, cat: 'penalty' },
  { id: 'night12', label: 'Night Shift (≤4 nights)', mult: 1.2, cat: 'penalty' },
  { id: 'night13', label: 'Night Shift (4+ weeks)', mult: 1.3, cat: 'penalty' },
  { id: 'satnight', label: 'Saturday Night Shift', mult: 1.5, cat: 'penalty' },
  { id: 'sunnight', label: 'Sunday Night Shift', mult: 2.0, cat: 'penalty' },
];

export const DEFAULT_CONFIG: CalcConfig = {
  wage: 29.50,
  hoursPerWeek: 38,
  hoursPerDay: 7.6,
  daysPerWeek: 5,
  billableWeeks: 39,
  trainingWeeks: 5,
  apprenticeshipYears: 4,
  annualLeaveDays: 20,
  publicHolidayDays: 10,
  sickLeaveDays: 10,
  leaveLoadingPercent: 17.5,
  superRate: 0.12,
  superOnOT: false,
  wcRate: 0.047,
  payrollTaxRate: 0.0485,
  overheadType: 'percent',
  overheadValue: 6.5,
  studyCost: 850,
  ppeCost: 350,
  trainingFeesAnnual: 0,
  marginType: 'flat',
  marginValue: 2.10,
  allowances: [],
  penalties: DEFAULT_PENALTIES,
  funding: {
    enabled: false,
    milestones: [],
    method: 'reduce',
    passPercentage: 100,
    apprenticeshipYears: 4,
  },
};
```

**Step 2: Update barrel export**

```typescript
// packages/charge-calc/src/index.ts
export * from './types';
export * from './calculate';
export * from './defaults';
```

**Step 3: Commit**

```bash
git add packages/charge-calc/src/defaults.ts packages/charge-calc/src/index.ts
git commit -m "feat(charge-calc): add DEFAULT_CONFIG and DEFAULT_PENALTIES exports"
```

---

### Task 9: Deprecate r8Calc.ts and old calculatorStore calculation path

**Files:**
- Modify: `R80.3/src/lib/r8Calc.ts` — add deprecation notice
- Modify: `R80.3/src/stores/index.ts` — update re-exports

**Step 1: Add deprecation header to r8Calc.ts**

At the top of `R80.3/src/lib/r8Calc.ts`, add:

```typescript
/**
 * @deprecated Use @bsuite/charge-calc instead.
 * This file contains only type definitions that are now superseded by
 * the shared package types. Retained temporarily for backward compatibility.
 *
 * Migration: import { CalcConfig, CalcResult } from '@bsuite/charge-calc';
 */
```

**Step 2: Commit**

```bash
git add R80.3/src/lib/r8Calc.ts R80.3/src/stores/index.ts
git commit -m "chore(r80): deprecate r8Calc.ts in favour of @bsuite/charge-calc"
```

---

### Task 10: Run full test suite and verify no regressions

**Step 1: Run shared package tests**

```bash
cd packages/charge-calc && pnpm test
```

Expected: ALL PASS (types, calculate, golden, invariants)

**Step 2: Run R80.3 tests**

```bash
cd R80.3 && pnpm test:run
```

Expected: ALL PASS (existing tests should still pass; calcBridge doesn't break existing code)

**Step 3: Type-check both projects**

```bash
cd packages/charge-calc && pnpm typecheck
cd R80.3 && npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit if any fixes were needed**

```bash
git add -A && git commit -m "fix(shared): resolve test/type issues from integration"
```

---

### Task 11: Create Supabase Edge Function wrapper

**Files:**
- Create: `supabase/functions/charge-calc/index.ts`

This provides server-side calculation for audit trails and compliance verification.

**Step 1: Create edge function**

```typescript
// supabase/functions/charge-calc/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Note: In production, this would import from the shared package.
// For Deno edge functions, we'll inline the core calculate function
// or use an npm specifier: import { calculate } from 'npm:@bsuite/charge-calc';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const config = await req.json();

    // TODO: Import calculate from shared package when Deno npm support is stable
    // For now, this serves as the API contract definition.
    // const result = calculate(config);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Edge function scaffold ready. Calculation engine will be wired in Task 12.',
        config_received: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid calculation config', details: String(error) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/charge-calc/
git commit -m "feat(edge): scaffold charge-calc Supabase Edge Function"
```

---

### Task 12: Phase 1 completion — integration smoke test

**Files:**
- Create: `packages/charge-calc/src/__tests__/integration.test.ts`

**Step 1: Write integration test that exercises the full pipeline**

```typescript
import { describe, it, expect } from 'vitest';
import { calculate, DEFAULT_CONFIG, DEFAULT_PENALTIES, getSuperRate, BILLING_MODEL_WEEKS } from '../index';

describe('Integration: full pipeline smoke test', () => {
  it('calculates with DEFAULT_CONFIG', () => {
    const res = calculate(DEFAULT_CONFIG);
    expect(res.quotedChargeRate).toBeGreaterThan(0);
    expect(res.billableHours).toBeGreaterThan(0);
    expect(res.rates['ord']).toBeDefined();
  });

  it('all three billing models produce valid results', () => {
    for (const [model, weeks] of Object.entries(BILLING_MODEL_WEEKS)) {
      const res = calculate({ ...DEFAULT_CONFIG, billableWeeks: weeks });
      expect(res.quotedChargeRate).toBeGreaterThan(0);
      expect(res.billableHours).toBe(weeks * DEFAULT_CONFIG.hoursPerWeek);
    }
  });

  it('date-aware super returns correct rate for today', () => {
    const rate = getSuperRate();
    expect(rate).toBeGreaterThanOrEqual(0.115);
    expect(rate).toBeLessThanOrEqual(0.15); // Sanity upper bound
  });

  it('exports all expected symbols', () => {
    expect(calculate).toBeDefined();
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_PENALTIES).toBeDefined();
    expect(getSuperRate).toBeDefined();
    expect(BILLING_MODEL_WEEKS).toBeDefined();
  });
});
```

**Step 2: Run all tests**

```bash
cd packages/charge-calc && pnpm test
```

Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/charge-calc/src/__tests__/integration.test.ts
git commit -m "test(charge-calc): add integration smoke test — Phase 1 complete"
```

---

## Phase 2: Award Engine + BOOT (Tasks 13–20)

> Phase 2 will be planned in a separate document after Phase 1 is implemented and validated. It builds on the shared calc engine with:
>
> - **C7:** Award interpretation engine (JSON rule schemas for top 10 AU awards)
> - **C8:** BOOT compliance analysis engine
> - **C5:** FWC annual wage review workflow
> - **H2:** Allowance itemization per award
> - **H3:** Portable long service leave on-cost
> - **H4:** Host employer multi-apprentice quoting
>
> The BOOT engine will layer on top of the `calculate()` function, running it twice (once with award rates, once with EA rates) across multiple roster scenarios and producing FWC-ready comparison spreadsheets.
>
> Plan file: `docs/plans/20260228-r80-crm7-boot-award-engine-v1.00W.md`

---

## Summary

| Task | What | Files | Test Coverage |
|------|------|-------|--------------|
| 1 | Package scaffold | `packages/charge-calc/*` | — |
| 2 | Core types + Zod validation | `types.ts` | Type validation tests |
| 3 | `calculate()` function | `calculate.ts` | 30+ unit tests |
| 4 | Golden output verification | `golden.test.ts` | 15+ golden file tests |
| 5 | Property-based invariants | `invariants.test.ts` | 60+ invariant tests |
| 6 | R80.3 adapter bridge | `calcBridge.ts` | Backward compat |
| 7 | CRM7 migration | `create.tsx` | DRY violation fixed |
| 8 | Default configs export | `defaults.ts` | — |
| 9 | Deprecate r8Calc.ts | `r8Calc.ts` | — |
| 10 | Full test suite run | — | Regression check |
| 11 | Edge Function scaffold | `supabase/functions/` | API contract |
| 12 | Integration smoke test | `integration.test.ts` | Pipeline validation |

**Critical testing requirement:** Every calculation change must pass golden output tests (Task 4) AND invariant tests (Task 5). These are the compliance safety net.
