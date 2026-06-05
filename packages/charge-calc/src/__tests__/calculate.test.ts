import { describe, it, expect } from 'vitest';
import { calculate } from '../calculate';
import type { CalcConfig } from '../types';
import type { AustralianState } from '../types';
import { PAYROLL_TAX_RATES, getPayrollTaxRate } from '../defaults';

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
  otOncostFactor: 0.12,
  penaltyOncostAdder: 0.15,
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
      expect(res.allowancePerHour).toBeCloseTo(2.50, 2);
    });

    it('does not include non-super-applicable allowance in super base', () => {
      const res = calculate(BASE_CONFIG);
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
      expect(res.receivedWagePerHour).toBeCloseTo(32.00, 2);
    });

    it('calculates weekly pay as received x hours', () => {
      const res = calculate(BASE_CONFIG);
      expect(res.weeklyPay).toBeCloseTo(1216.00, 2);
    });
  });

  describe('week allocation', () => {
    it('converts leave days to weeks', () => {
      const res = calculate(BASE_CONFIG);
      expect(res.annualLeaveWeeks).toBeCloseTo(4, 1);
      expect(res.publicHolidayWeeks).toBeCloseTo(2, 1);
      expect(res.sickLeaveWeeks).toBeCloseTo(2, 1);
    });
  });

  describe('annual pay components', () => {
    it('calculates worked pay = weeklyPay x billableWeeks', () => {
      const res = calculate(BASE_CONFIG);
      expect(res.workedPay).toBeCloseTo(47424.00, 0);
    });

    it('calculates training pay = weeklyPay x trainingWeeks', () => {
      const res = calculate(BASE_CONFIG);
      expect(res.trainingPay).toBeCloseTo(6080.00, 0);
    });

    it('applies leave loading multiplicatively to AL', () => {
      const res = calculate(BASE_CONFIG);
      // alPay = ($1,216 x 4) x (1 + 0.175) = $4,864 x 1.175 = $5,715.20
      expect(res.annualLeavePay).toBeCloseTo(5715.20, 0);
    });

    it('calculates totalAnnualPay as (weeklyPay x 48) + alPay', () => {
      const res = calculate(BASE_CONFIG);
      // (1216 x 48) + 5715.20 = 58,368 + 5,715.20 = 64,083.20
      expect(res.totalAnnualPay).toBeCloseTo(64083.20, 0);
    });
  });

  describe('superannuation', () => {
    it('calculates super on super-bearing wage only', () => {
      const res = calculate(BASE_CONFIG);
      // Super-bearing = $29.50 (no super-applicable allowances)
      // wkSuperBearing = $29.50 x 38 = $1,121
      // totAnnPaySuper = ($1,121 x 48) + (($1,121 x 4) x 1.175) = $53,808 + $5,268.70 = $59,076.70
      // superAmt = $59,076.70 x 0.12 = $7,089.20
      expect(res.superAmount).toBeCloseTo(7089.20, 0);
    });
  });

  describe('workers compensation', () => {
    it('applies WC to worked + training weeks only (not leave)', () => {
      const res = calculate(BASE_CONFIG);
      // wc = (worked + tafePay) x wcRate
      // = ($47,424 + $6,080) x 0.047 = $53,504 x 0.047 = $2,514.69
      expect(res.workersCompAmount).toBeCloseTo(2514.69, 0);
    });
  });

  describe('total annual cost', () => {
    it('sums all cost components including payroll tax', () => {
      const res = calculate(BASE_CONFIG);
      // annPkg = totalAnnPay + super = 64,083.20 + 7,089.20 = 71,172.40
      // wc = 2,514.69
      // oh = 64,083.20 x 0.065 = 4,165.41
      // payrollTax = 64,083.20 x 0.0485 = 3,108.04
      // totCost = annPkg + study + ppe + wc + oh + payrollTax
      //         = 71,172.40 + 850 + 350 + 2,514.69 + 4,165.41 + 3,108.04 = 82,160.54
      expect(res.totalAnnualCost).toBeCloseTo(82160.54, 0);
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
      // totalAnnualCost = 82,160.54 (includes payroll tax)
      expect(res.costPerHour).toBeCloseTo(82160.54 / 1482, 2);
    });

    it('applies flat margin', () => {
      const res = calculate(BASE_CONFIG);
      expect(res.quotedChargeRate).toBeCloseTo(res.costPerHour + 2.10, 2);
    });

    it('applies percentage margin', () => {
      const cfg = { ...BASE_CONFIG, marginType: 'percent' as const, marginValue: 15 };
      const res = calculate(cfg);
      expect(res.marginPerHour).toBeCloseTo(res.costPerHour * 0.15, 2);
    });
  });

  describe('funding', () => {
    it('spreads total funding over all billable hours x apprenticeship years', () => {
      const res = calculate(BASE_CONFIG);
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

    it('overtime charge = ot1x x multiplier', () => {
      const res = calculate(BASE_CONFIG);
      const ot15 = res.rates['ot15'];
      expect(ot15.charge).toBeCloseTo(res.otBase1x * 1.5, 2);
    });

    it('super on OT adds super component when enabled', () => {
      const cfg = { ...BASE_CONFIG, superOnOT: true };
      const res = calculate(cfg);
      const ot15 = res.rates['ot15'];
      const resNo = calculate(BASE_CONFIG);
      const ot15No = resNo.rates['ot15'];
      expect(ot15.charge).toBeGreaterThan(ot15No.charge);
    });
  });

  describe('named pay item group IDs', () => {
    it('aliases ordinary and penalty rates by CRM7-owned pay item group IDs without changing amounts', () => {
      const ordinaryPayItemGroup = {
        id: 'pig-ordinary',
        name: 'Ordinary Time',
        code: 'ORD',
        category: 'ordinary_time' as const,
        sortPriority: 10,
      };
      const overtimePayItemGroup = {
        id: 'pig-overtime-1-5',
        name: 'Overtime 1.5x',
        code: 'OT1.5',
        category: 'overtime_1_5' as const,
        sortPriority: 20,
      };

      const legacy = calculate(BASE_CONFIG);
      const named = calculate({
        ...BASE_CONFIG,
        ordinaryPayItemGroup,
        penalties: BASE_CONFIG.penalties.map((penalty) =>
          penalty.id === 'ot15'
            ? { ...penalty, payItemGroup: overtimePayItemGroup }
            : penalty,
        ),
      });

      expect(named.ordinaryRateKey).toBe('pig-ordinary');
      expect(named.rates['pig-ordinary']).toBe(named.rates['ord']);
      expect(named.ratesByPayItemGroupId['pig-ordinary']).toBe(named.rates['ord']);
      expect(named.rates['pig-ordinary'].charge).toBeCloseTo(legacy.rates['ord'].charge, 6);
      expect(named.rates['pig-overtime-1-5']).toBe(named.rates['ot15']);
      expect(named.ratesByPayItemGroupId['pig-overtime-1-5']).toBe(named.rates['ot15']);
      expect(named.rates['pig-overtime-1-5'].charge).toBeCloseTo(legacy.rates['ot15'].charge, 6);
      expect(named.rates['pig-overtime-1-5'].payItemGroup?.code).toBe('OT1.5');
    });

    it('rejects conflicting explicit and reference pay item group IDs', () => {
      expect(() =>
        calculate({
          ...BASE_CONFIG,
          penalties: [
            {
              ...BASE_CONFIG.penalties[0],
              payItemGroupId: 'pig-a',
              payItemGroup: {
                id: 'pig-b',
                name: 'Overtime 1.5x',
                code: 'OT1.5',
              },
            },
          ],
        }),
      ).toThrow(/payItemGroupId must match/);
    });
  });

  describe('date-aware superannuation (C4)', () => {
    it('returns 11.5% before July 2025', async () => {
      const { getSuperRate } = await import('../types');
      expect(getSuperRate(new Date('2025-06-30'))).toBe(0.115);
    });

    it('returns 12% from July 2025 onwards', async () => {
      const { getSuperRate } = await import('../types');
      expect(getSuperRate(new Date('2025-07-01'))).toBe(0.12);
    });
  });

  describe('billing model presets', () => {
    it('produces different rates for 39w vs 48w vs 52w', () => {
      const r39 = calculate({ ...BASE_CONFIG, billableWeeks: 39 });
      const r48 = calculate({ ...BASE_CONFIG, billableWeeks: 48 });
      const r52 = calculate({ ...BASE_CONFIG, billableWeeks: 52 });

      expect(r39.quotedChargeRate).toBeGreaterThan(r48.quotedChargeRate);
      expect(r48.quotedChargeRate).toBeGreaterThan(r52.quotedChargeRate);

      // Annual cost varies slightly due to WC being applied to worked weeks,
      // but should be within 1% across billing models (same employer cost).
      const pctDiff = Math.abs(r39.totalAnnualCost - r48.totalAnnualCost) / r39.totalAnnualCost;
      expect(pctDiff).toBeLessThan(0.01);
    });
  });

  describe('payroll tax (D-2)', () => {
    it('computes payroll tax from totalAnnualPay * payrollTaxRate', () => {
      const res = calculate(BASE_CONFIG);
      // totalAnnualPay = 64,083.20
      // payrollTaxAmt = 64,083.20 * 0.0485 = 3,108.0352
      const expectedPayrollTax = 64083.20 * 0.0485;
      // payrollTax is added to totalAnnualCost
      expect(res.totalAnnualCost).toBeCloseTo(
        // annPkg(71172.40) + study(850) + ppe(350) + wc(2514.69) + oh(4165.41) + payrollTax(3108.04)
        79052.50 + expectedPayrollTax,
        0,
      );
    });

    it('includes payroll tax in oncost breakdown per-hour', () => {
      const res = calculate(BASE_CONFIG);
      // payrollTaxAmt / bHrs = (64,083.20 * 0.0485) / 1482
      const expectedPH = (64083.20 * 0.0485) / 1482;
      expect(res.oncosts.payrollTax).toBeCloseTo(expectedPH, 2);
    });

    it('adds payroll tax to oncost total', () => {
      const res = calculate(BASE_CONFIG);
      const summedOncosts =
        res.oncosts.annualLeave +
        res.oncosts.publicHolidays +
        res.oncosts.sickLeave +
        res.oncosts.training +
        res.oncosts.study +
        res.oncosts.ppe +
        res.oncosts.superannuation +
        res.oncosts.workersComp +
        res.oncosts.overhead +
        res.oncosts.payrollTax;
      expect(res.oncosts.total).toBeCloseTo(summedOncosts, 2);
    });

    it('payroll tax is zero when payrollTaxRate is zero', () => {
      const cfg = { ...BASE_CONFIG, payrollTaxRate: 0 };
      const res = calculate(cfg);
      expect(res.oncosts.payrollTax).toBe(0);
    });
  });

  describe('configurable OT/penalty oncost factors (D-1)', () => {
    it('uses cfg.otOncostFactor instead of hardcoded 0.12', () => {
      const resDefault = calculate(BASE_CONFIG);
      const cfgCustom = { ...BASE_CONFIG, otOncostFactor: 0.15 };
      const resCustom = calculate(cfgCustom);
      // Higher OT oncost factor should increase the OT oncost per hour
      expect(resCustom.otOncostPerHour).toBeGreaterThan(resDefault.otOncostPerHour);
    });

    it('uses cfg.penaltyOncostAdder instead of hardcoded 0.15', () => {
      const resDefault = calculate(BASE_CONFIG);
      const cfgCustom = { ...BASE_CONFIG, penaltyOncostAdder: 0.25 };
      const resCustom = calculate(cfgCustom);
      // Higher penalty oncost adder should increase penalty oncost per hour
      expect(resCustom.penaltyOncostPerHour).toBeGreaterThan(resDefault.penaltyOncostPerHour);
    });
  });

  describe('state payroll tax lookup (Part A)', () => {
    it('returns correct rate for each Australian state', () => {
      const expected: Record<AustralianState, number> = {
        NSW: 0.0545,
        VIC: 0.0485,
        QLD: 0.0475,
        SA: 0.0495,
        WA: 0.055,
        TAS: 0.04,
        NT: 0.055,
        ACT: 0.0685,
      };
      for (const [state, rate] of Object.entries(expected)) {
        expect(getPayrollTaxRate(state as AustralianState)).toBe(rate);
      }
    });

    it('PAYROLL_TAX_RATES covers all 8 states/territories', () => {
      expect(Object.keys(PAYROLL_TAX_RATES)).toHaveLength(8);
    });

    it('returned rate can be used directly in CalcConfig.payrollTaxRate', () => {
      const nswRate = getPayrollTaxRate('NSW');
      const cfg = { ...BASE_CONFIG, payrollTaxRate: nswRate };
      const res = calculate(cfg);
      // Verify the payroll tax oncost reflects NSW rate
      const expectedPayrollTaxPerHour = (res.totalAnnualPay * nswRate) / res.billableHours;
      expect(res.oncosts.payrollTax).toBeCloseTo(expectedPayrollTaxPerHour, 2);
    });
  });

  describe('training weeks per year (Part B)', () => {
    it('uses trainingWeeksPerYear with currentYear to override trainingWeeks', () => {
      const cfg: CalcConfig = {
        ...BASE_CONFIG,
        trainingWeeks: 5,
        trainingWeeksPerYear: [8, 6, 5, 4],
        currentYear: 1,
      };
      const res = calculate(cfg);
      // Year 1 = 8 training weeks (instead of default 5)
      expect(res.trainingHours).toBe(8 * BASE_CONFIG.hoursPerWeek);
    });

    it('uses year 4 training weeks when currentYear is 4', () => {
      const cfg: CalcConfig = {
        ...BASE_CONFIG,
        trainingWeeks: 5,
        trainingWeeksPerYear: [8, 6, 5, 4],
        currentYear: 4,
      };
      const res = calculate(cfg);
      // Year 4 = 4 training weeks
      expect(res.trainingHours).toBe(4 * BASE_CONFIG.hoursPerWeek);
    });

    it('falls back to trainingWeeks when trainingWeeksPerYear is not provided', () => {
      const cfg: CalcConfig = {
        ...BASE_CONFIG,
        trainingWeeks: 5,
      };
      const res = calculate(cfg);
      expect(res.trainingHours).toBe(5 * BASE_CONFIG.hoursPerWeek);
    });

    it('falls back to trainingWeeks when currentYear is not provided', () => {
      const cfg: CalcConfig = {
        ...BASE_CONFIG,
        trainingWeeks: 5,
        trainingWeeksPerYear: [8, 6, 5, 4],
      };
      const res = calculate(cfg);
      // No currentYear => falls back to trainingWeeks (5)
      expect(res.trainingHours).toBe(5 * BASE_CONFIG.hoursPerWeek);
    });

    it('falls back to trainingWeeks when currentYear is out of bounds', () => {
      const cfg: CalcConfig = {
        ...BASE_CONFIG,
        trainingWeeks: 5,
        trainingWeeksPerYear: [8, 6, 5, 4],
        currentYear: 6, // out of bounds
      };
      const res = calculate(cfg);
      // Out of bounds => falls back to trainingWeeks (5)
      expect(res.trainingHours).toBe(5 * BASE_CONFIG.hoursPerWeek);
    });

    it('uses per-year training weeks in week allocation and pay calculations', () => {
      const cfgYear1: CalcConfig = {
        ...BASE_CONFIG,
        trainingWeeks: 5,
        trainingWeeksPerYear: [8, 6, 5, 4],
        currentYear: 1,
      };
      const cfgDefault: CalcConfig = {
        ...BASE_CONFIG,
        trainingWeeks: 5,
      };
      const resYear1 = calculate(cfgYear1);
      const resDefault = calculate(cfgDefault);
      // More training weeks = more training pay, different week allocation
      expect(resYear1.trainingPay).toBeGreaterThan(resDefault.trainingPay);
    });
  });
});
