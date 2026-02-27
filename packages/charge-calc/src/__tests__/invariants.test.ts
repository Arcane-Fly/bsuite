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
    otOncostFactor: 0.12,
    penaltyOncostAdder: 0.15,
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
    funding: {
      enabled: false,
      milestones: [],
      method: 'reduce',
      passPercentage: 100,
      apprenticeshipYears: 4,
    },
    ...overrides,
  };
}

describe('Mathematical invariants', () => {
  const wages = [20, 25, 29.5, 35, 45, 60];
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

      // When billable weeks are very low (<39), the ordinary rate concentrates
      // all annual fixed costs into fewer hours, inflating it beyond the OT
      // multiplied wage. This invariant holds for realistic billing models.
      if (bw >= 39) {
        it(`wage=$${w} bw=${bw}: OT rates > ordinary rate`, () => {
          const res = calculate(makeConfig({ wage: w, billableWeeks: bw }));
          expect(res.rates['ot15'].charge).toBeGreaterThan(
            res.rates['ord'].charge,
          );
        });
      }

      it(`wage=$${w} bw=${bw}: total hours = 52 x hpw`, () => {
        const res = calculate(makeConfig({ wage: w, billableWeeks: bw }));
        expect(res.totalHours).toBe(52 * 38);
      });
    }
  }

  it('more billable weeks = lower hourly rate, same annual cost', () => {
    const r39 = calculate(makeConfig({ billableWeeks: 39 }));
    const r48 = calculate(makeConfig({ billableWeeks: 48 }));
    expect(r39.quotedChargeRate).toBeGreaterThan(r48.quotedChargeRate);
    // Annual cost varies slightly because workers comp is calculated on
    // worked + training pay, and worked pay changes with billableWeeks.
    // Use percentage tolerance instead of toBeCloseTo.
    const pctDiff =
      Math.abs(r39.totalAnnualCost - r48.totalAnnualCost) /
      r39.totalAnnualCost;
    expect(pctDiff).toBeLessThan(0.01);
  });

  it('funding reduces ordinary rate but not OT', () => {
    const withFunding = calculate(
      makeConfig({
        funding: {
          enabled: true,
          milestones: [{ id: 1, name: 'Test', amount: 10000, month: 12 }],
          method: 'reduce',
          passPercentage: 100,
          apprenticeshipYears: 4,
        },
      }),
    );
    const withoutFunding = calculate(makeConfig());

    // Ordinary funded rate should be lower
    expect(withFunding.rates['ord'].funded).toBeLessThan(
      withoutFunding.rates['ord'].funded,
    );
    // OT rate should be the same
    expect(withFunding.rates['ot15'].charge).toBeCloseTo(
      withoutFunding.rates['ot15'].charge,
      2,
    );
  });
});
