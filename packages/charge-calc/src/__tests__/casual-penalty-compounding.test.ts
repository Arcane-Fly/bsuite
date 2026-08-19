import { describe, it, expect } from 'vitest';
import { calculate } from '../calculate.js';
import type { CalcConfig } from '../types.js';

/**
 * Regression coverage for the 2026-08-17 compliance-audit finding (item 1.2):
 * the shared engine multiplied a CASUAL's already-loaded wage by the
 * standard penalty multiplier on every award, unconditionally —
 * base x 1.25 x 1.50 = 187.5% instead of MA000020's correct 175%
 * (cl.12.5/12.6, additive). `grep casual` over this package's own test
 * file returned zero hits before this file existed.
 *
 * Dollar quantification, on a realistic $30/hr casual Saturday line under
 * MA000020 (150% standard penalty), BOTH DIRECTIONS:
 *   - Pre-fix (defective):  $30 x 1.25 x 1.50 = $56.25/hr  — WRONG, over-billed
 *   - Post-fix (correct):   $30 x 1.75        = $52.50/hr  — cl.12.5(a)
 *   - Overcharge avoided:   $3.75/hr = 7.14% (1.875 / 1.75 = 1.07143)
 * On a realistic Sunday line (200% standard penalty) the gap is WORSE:
 *   - Pre-fix:  $30 x 1.25 x 2.00 = $75.00/hr
 *   - Post-fix: $30 x 2.25        = $67.50/hr
 *   - Overcharge avoided: $7.50/hr = 11.11%
 */

const BASE: CalcConfig = {
  wage: 30,
  hoursPerWeek: 38,
  hoursPerDay: 7.6,
  daysPerWeek: 5,
  billableWeeks: 46,
  trainingWeeks: 0,
  apprenticeshipYears: 1,
  annualLeaveDays: 0,
  publicHolidayDays: 0,
  sickLeaveDays: 0,
  leaveLoadingPercent: 0,
  superRate: 0.12,
  superOnOT: false,
  wcRate: 0.047,
  payrollTaxRate: 0.0485,
  otOncostFactor: 0.12,
  penaltyOncostAdder: 0,
  overheadType: 'flat',
  overheadValue: 0,
  studyCost: 0,
  ppeCost: 0,
  trainingFeesAnnual: 0,
  marginType: 'flat',
  marginValue: 0,
  allowances: [],
  penalties: [
    { id: 'sat', label: 'Saturday', mult: 1.5, cat: 'penalty' },
    { id: 'sun', label: 'Sunday', mult: 2.0, cat: 'penalty' },
    { id: 'ph', label: 'Public Holiday', mult: 2.5, cat: 'penalty' },
    { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' },
  ],
  funding: {
    enabled: false,
    milestones: [],
    method: 'passThrough',
    passPercentage: 0,
    apprenticeshipYears: 1,
  },
};

const CASUAL: CalcConfig = { ...BASE, casualLoading: 0.25, awardCode: 'MA000020' };

/**
 * Independent oracle for a penalty/overtime-row charge, cross-checking the
 * loop's arithmetic rather than copying it.
 *
 * `penaltyOncostPerHour` / `otOncostPerHour` / `marginPerHour` are read
 * straight off the REAL scenario's own `CalcResult` — untouched by this
 * fix (only how the loop's MULTIPLIER consumes them changed) — because
 * workers' comp (and therefore these oncost figures) genuinely differs
 * between a casual and a non-casual: WC premium is levied on ACTUAL wages
 * paid, which for a casual legitimately includes the loading once. A
 * "non-casual" or "zero-loading" probe would silently understate them and
 * produce a false mismatch unrelated to this fix.
 *
 * `recvBase` (the UNLOADED wage — not exposed on `CalcResult`) is
 * `cfg.wage` directly: every fixture in this file configures zero
 * allowances, so `wage + allowPerHour === wage`.
 */
function expectedPenaltyCharge(cfg: CalcConfig, effMult: number): number {
  const real = calculate(cfg);
  const tHrs = 52 * cfg.hoursPerWeek;
  const bHrs = cfg.billableWeeks * cfg.hoursPerWeek;
  const recvBase = cfg.wage; // allowances: [] in every fixture below
  const billedWageBase = (recvBase * tHrs) / bHrs;
  return (48 / 52) * real.penaltyOncostPerHour * effMult + billedWageBase * effMult + real.marginPerHour;
}

function expectedOvertimeCharge(cfg: CalcConfig, effMult: number, otSuperPH = 0): number {
  const real = calculate(cfg);
  const recvBase = cfg.wage; // allowances: [] in every fixture below
  const ot1xBase = recvBase + real.marginPerHour + real.otOncostPerHour;
  return ot1xBase * effMult + otSuperPH * (effMult - 1);
}

describe('calculate() — casual penalty conversion is per-award, never compounded', () => {
  it('a casual Saturday line under MA000020 resolves to exactly the additive 175% figure (cl.12.5(a))', () => {
    const res = calculate(CASUAL);
    expect(res.rates.sat!.charge).toBeCloseTo(expectedPenaltyCharge(CASUAL, 1.75), 6);
    // And explicitly NOT the pre-fix compounded 187.5% figure.
    expect(res.rates.sat!.charge).not.toBeCloseTo(expectedPenaltyCharge(CASUAL, 1.875), 2);
  });

  it('dollar quantification — Saturday (150%): pre-fix $56.25/hr vs post-fix $52.50/hr wage component, 7.14% overcharge avoided', () => {
    const preFixWageComponent = 30 * 1.25 * 1.5;
    const postFixWageComponent = 30 * 1.75;
    expect(preFixWageComponent).toBeCloseTo(56.25, 2);
    expect(postFixWageComponent).toBeCloseTo(52.5, 2);
    const overchargeRatio = preFixWageComponent / postFixWageComponent;
    expect(overchargeRatio).toBeCloseTo(1.0714, 4);
    expect((overchargeRatio - 1) * 100).toBeCloseTo(7.14, 1);
  });

  it('dollar quantification — Sunday (200%): pre-fix $75.00/hr vs post-fix $67.50/hr wage component, 11.11% overcharge avoided', () => {
    const preFixWageComponent = 30 * 1.25 * 2.0;
    const postFixWageComponent = 30 * 2.25;
    expect(preFixWageComponent).toBeCloseTo(75.0, 2);
    expect(postFixWageComponent).toBeCloseTo(67.5, 2);
    const overchargeRatio = preFixWageComponent / postFixWageComponent;
    expect((overchargeRatio - 1) * 100).toBeCloseTo(11.11, 1);
  });

  it('a casual Sunday line resolves to exactly the additive 225% figure', () => {
    const res = calculate(CASUAL);
    expect(res.rates.sun!.charge).toBeCloseTo(expectedPenaltyCharge(CASUAL, 2.25), 6);
    expect(res.rates.sun!.charge).not.toBeCloseTo(expectedPenaltyCharge(CASUAL, 2.5), 2);
  });

  it('public holiday (250% standard) resolves to the flat 275% cl.12.6 figure, not 312.5%', () => {
    const res = calculate(CASUAL);
    expect(res.rates.ph!.charge).toBeCloseTo(expectedPenaltyCharge(CASUAL, 2.75), 6);
    expect(res.rates.ph!.charge).not.toBeCloseTo(expectedPenaltyCharge(CASUAL, 3.125), 2);
  });

  it('a NON-casual line is completely unaffected (regression safety) — standard multiplier applies as-is', () => {
    const res = calculate(BASE);
    expect(res.rates.sat!.charge).toBeCloseTo(expectedPenaltyCharge(BASE, 1.5), 6);
    expect(res.casualPenaltyViolations).toEqual([]);
  });

  it('defaults awardCode to MA000020 when a casual calculation omits it (matches R80.4\'s own default)', () => {
    const withoutAwardCode: CalcConfig = { ...BASE, casualLoading: 0.25 };
    const withAwardCode: CalcConfig = { ...BASE, casualLoading: 0.25, awardCode: 'MA000020' };
    const a = calculate(withoutAwardCode);
    const b = calculate(withAwardCode);
    expect(a.rates.sat!.charge).toBeCloseTo(b.rates.sat!.charge!, 6);
    expect(a.casualPenaltyViolations).toEqual([]);
  });

  it('overtime rows use the SAME per-award resolution as penalty rows, not a hardcoded multiplier', () => {
    const res = calculate(CASUAL);
    // MA000020's overtime table is additive too — 150% -> 175%, same
    // method as the penalty row, resolved via otBase1x (not billedWage).
    expect(res.rates.ot15!.charge).toBeCloseTo(expectedOvertimeCharge(CASUAL, 1.75), 6);
    expect(res.rates.ot15!.charge).not.toBeCloseTo(expectedOvertimeCharge(CASUAL, 1.875), 2);
  });

  it('superOnOT scales with the RESOLVED effective multiplier, not the standard one', () => {
    const cfg: CalcConfig = { ...CASUAL, superOnOT: true };
    const res = calculate(cfg);
    // otSuperPH = superBearingRate x superRate. superBearingRate carries no
    // casual-loading component by design (`wage + allowPerHourSuper`, and
    // no allowances are configured here) — 30 x 0.12, fixed regardless of
    // casual status.
    const otSuperPH = 30 * 0.12;
    const expectedCharge = expectedOvertimeCharge(cfg, 1.75, otSuperPH);
    const wrongChargeAtStandardMult = expectedOvertimeCharge(cfg, 1.75, otSuperPH) - otSuperPH * (1.75 - 1) + otSuperPH * (1.5 - 1);
    expect(res.rates.ot15!.charge).toBeCloseTo(expectedCharge, 6);
    expect(res.rates.ot15!.charge).not.toBeCloseTo(wrongChargeAtStandardMult, 4);
  });

  it('an award with OPPOSITE conventions per category (MA000009) resolves each row independently', () => {
    const cfg: CalcConfig = {
      ...BASE,
      casualLoading: 0.25,
      awardCode: 'MA000009',
      penalties: [
        { id: 'sun', label: 'Sunday', mult: 1.5, cat: 'penalty' }, // additive: cl.29.2
        { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' }, // multiplicative: cl.28.4
      ],
    };
    const res = calculate(cfg);
    // Additive penalty: 150% + 25pts = 175%. Multiplicative overtime:
    // 150% x 1.25 = 187.5%. These must NOT come out equal — proving the
    // resolution is genuinely per-category, not a single award-level rule.
    expect(res.rates.sun!.charge).toBeCloseTo(expectedPenaltyCharge(cfg, 1.75), 6);
    expect(res.rates.ot15!.charge).toBeCloseTo(expectedOvertimeCharge(cfg, 1.875), 6);
    expect(res.rates.sun!.charge).not.toBeCloseTo(res.rates.ot15!.charge, 1);
  });

  describe('refusal — an unverified award never renders a computed number', () => {
    it('a casual under an unlisted award produces NO rate entry and a recorded violation', () => {
      const cfg: CalcConfig = { ...BASE, casualLoading: 0.25, awardCode: 'MA000025' };
      const res = calculate(cfg);
      expect(res.rates.sat).toBeUndefined();
      expect(res.rates.sun).toBeUndefined();
      expect(res.rates.ph).toBeUndefined();
      expect(res.rates.ot15).toBeUndefined();
      expect(res.casualPenaltyViolations.length).toBe(4);
      expect(res.casualPenaltyViolations[0]).toMatch(/MA000025/);
      expect(res.casualPenaltyViolations[0]).toMatch(/cannot price a CASUAL/);
    });

    it('a refused penalty row does not prevent the ordinary rate or other calc fields from computing', () => {
      const cfg: CalcConfig = { ...BASE, casualLoading: 0.25, awardCode: 'MA000025' };
      const res = calculate(cfg);
      expect(res.rates.ord).toBeDefined();
      expect(res.quotedChargeRate).toBeGreaterThan(0);
      expect(Number.isFinite(res.totalAnnualCost)).toBe(true);
    });

    it('never falls back to MA000020\'s convention for a different, unverified award', () => {
      const cfg: CalcConfig = { ...BASE, casualLoading: 0.25, awardCode: 'MA000025' };
      const res = calculate(cfg);
      // If this ever silently borrowed MA000020's additive rule, rates.sat
      // would be defined at ~$52.50. It must not be.
      expect(res.rates.sat).toBeUndefined();
    });
  });
});

/**
 * THE FLAG THAT NOTHING IN THIS PACKAGE COULD SEE.
 *
 * `calculate()` passes `isPublicHoliday: pr.id === 'ph'` into
 * `casualPenaltyMultiplierForAward`. Deleting that line left this package's
 * ENTIRE suite green — 17 passed, 0 failed. Mutation-proved 2026-08-19.
 *
 * WHY EVERY EXISTING FIXTURE IS BLIND TO IT. They price `ph` at mult 2.5, and
 * under MA000020 the two limbs COINCIDE exactly there:
 *
 *     cl.12.5 additive     2.5 + 0.25 (casual loading)  = 2.75
 *     cl.12.6 flat PH rate                              = 2.75
 *
 * One number reached two ways. An assertion on the result cannot tell which
 * limb produced it, so it cannot tell whether the flag arrived at all.
 *
 * 2.25 IS THE DISCRIMINATING MULTIPLIER — the limbs diverge:
 *
 *     additive (flag LOST)   2.25 + 0.25 = 2.50
 *     flat PH  (flag PASSED)              = 2.75
 *
 * That 0.25 is a quarter of an hourly rate on every public holiday worked, on
 * the award this engine is used for most. `isPublicHoliday?: boolean` is
 * OPTIONAL in the signature, so dropping it is a silent edit and not a type
 * error — which is precisely why a test has to hold it.
 *
 * Found by the R80.4 lane (R80.4#108) on ITS copy and broadcast to the estate.
 * This is the same hole in the SHARED package — the one crm7, conduit and R80.4
 * all consume — so fixing it there did not fix it here.
 */
describe('MA000020 public-holiday flag reaches the convention', () => {
  const PH_225: CalcConfig = {
    ...CASUAL,
    penalties: [{ id: 'ph', label: 'Public Holiday', mult: 2.25, cat: 'penalty' }],
  };
  const SAT_225: CalcConfig = {
    ...CASUAL,
    penalties: [{ id: 'sat', label: 'Saturday', mult: 2.25, cat: 'penalty' }],
  };

  it('prices a casual public holiday at the FLAT 275%, not the additive 250%', () => {
    const res = calculate(PH_225);
    // 2.75 = cl.12.6's flat public-holiday rate.
    expect(res.rates.ph!.charge).toBeCloseTo(expectedPenaltyCharge(PH_225, 2.75), 6);
    // 2.50 = 2.25 + 0.25, the additive limb — what you get if the flag never
    // arrived. Asserting NOT-2.50 is the half that makes this test discriminate.
    expect(res.rates.ph!.charge).not.toBeCloseTo(expectedPenaltyCharge(PH_225, 2.5), 2);
  });

  it('a non-public-holiday penalty at the SAME multiplier stays additive — the control', () => {
    // Without this, the assertion above could be measuring the award rather
    // than the flag: if both rows read 2.75 the flag proves nothing.
    const res = calculate(SAT_225);
    expect(res.rates.sat!.charge).toBeCloseTo(expectedPenaltyCharge(SAT_225, 2.5), 6);
    expect(res.rates.sat!.charge).not.toBeCloseTo(expectedPenaltyCharge(SAT_225, 2.75), 2);
  });

  it('dollar quantification — the flag is worth 0.25x the hourly wage on every PH hour', () => {
    const flat = 30 * 2.75;      // flag passed, cl.12.6
    const additive = 30 * 2.5;   // flag lost, cl.12.5
    expect(flat - additive).toBeCloseTo(7.5, 2);
    expect(flat / additive).toBeCloseTo(1.1, 4);
  });
});
