/**
 * Estate ledger M-2 — `cfg.rdo` reaches the money.
 *
 * The defect this file exists to keep closed: `CalcConfig.rdo` was carried
 * through the whole pipeline and never read by `calculate()`. crm7's
 * `usePlacementChargeCalc` populated it, documented that "calculate() itself
 * does not consume cfg.rdo", and emitted an operator warning telling them to
 * verify the charge rate by hand.
 *
 * MUTATION TEST. Every assertion below is anchored to `cfg.rdo` actually
 * changing an output. Revert `bHrs` in `calculate.ts` to
 * `billableWk * hpw` (drop `+ rdoHoursAnnual`) and the "moves the money"
 * cases go RED; restore it and they go GREEN. The no-RDO cases stay GREEN in
 * both states — that is the point: `enabled: false` must be byte-identical to
 * the pre-M-2 engine, so no existing quote or FWC reconciliation moves.
 */
import { describe, it, expect } from 'vitest';
import { calculate } from '../calculate.js';
import { DEFAULT_CONFIG } from '../defaults.js';
import type { CalcConfig, RdoAccrualConfig } from '../types.js';
import { DEFAULT_RDO_CONFIG } from '../types.js';

/** MA000020 cl.16.2: 8h attended per day, 7.6h paid, 0.4h banked. */
const MA000020_RDO: RdoAccrualConfig = {
  enabled: true,
  accrualHoursPerDay: 0.4,
  cycleDays: 19,
};

/** `hoursPerWeek` is the PAID week (38 = 5 x 7.6), exactly as crm7 passes it. */
const base: CalcConfig = {
  ...DEFAULT_CONFIG,
  wage: 29.5,
  hoursPerWeek: 38,
  hoursPerDay: 7.6,
  daysPerWeek: 5,
  billableWeeks: 39,
};

describe('M-2: cfg.rdo reaches billable hours and the charge rate', () => {
  it('is a no-op when no RDO arrangement applies (default posture)', () => {
    const omitted = calculate(base);
    const explicitlyOff = calculate({ ...base, rdo: DEFAULT_RDO_CONFIG });

    // Byte-identical to the pre-M-2 engine: bHrs = billableWeeks x hoursPerWeek.
    expect(omitted.billableHours).toBe(39 * 38);
    expect(omitted.rdoDaysAnnual).toBe(0);
    expect(omitted.rdoHoursAnnual).toBe(0);
    expect(explicitlyOff.billableHours).toBe(omitted.billableHours);
    expect(explicitlyOff.quotedChargeRate).toBe(omitted.quotedChargeRate);
  });

  it('reproduces the clause arithmetic: 0.4h/day over a 7.6h paid day = 13 RDO days = 98.8h', () => {
    // r = 0.4D / (hpdPaid + 0.4), D = 52 x 5 = 260  ->  104/8 = 13 days.
    // 13 days is exactly the 19-worked-days-per-RDO cl.16 states.
    const r = calculate({ ...base, rdo: MA000020_RDO });
    expect(r.rdoDaysAnnual).toBeCloseTo(13, 10);
    expect(r.rdoHoursAnnual).toBeCloseTo(98.8, 10);
    expect(r.billableHours).toBeCloseTo(39 * 38 + 98.8, 10);
  });

  it('MOVES the money: an RDO placement quotes below an otherwise identical non-RDO one', () => {
    const without = calculate(base);
    const withRdo = calculate({ ...base, rdo: MA000020_RDO });

    // This is the assertion the pre-M-2 engine failed: the two were equal.
    expect(withRdo.quotedChargeRate).not.toBe(without.quotedChargeRate);
    expect(withRdo.costPerHour).toBeLessThan(without.costPerHour);
    expect(withRdo.quotedChargeRate).toBeLessThan(without.quotedChargeRate);

    // ~6.3% cheaper per hour: the same annual cost spread over 6.7% more
    // billable hours (98.8 banked hours on top of 1482).
    const delta = 1 - withRdo.costPerHour / without.costPerHour;
    expect(delta).toBeGreaterThan(0.05);
    expect(delta).toBeLessThan(0.08);
  });

  it('does NOT move annual paid cost — the accrual is deferred pay, not less pay', () => {
    const without = calculate(base);
    const withRdo = calculate({ ...base, rdo: MA000020_RDO });

    // Guards the opposite-direction money bug: deriving paid hours as
    // `hoursPerWeek - accrual x daysPerWeek` would pay a full-timer for 36
    // hours and understate wage, super and leave by the accrual fraction.
    expect(withRdo.totalAnnualPay).toBe(without.totalAnnualPay);
    expect(withRdo.superAmount).toBe(without.superAmount);
    expect(withRdo.totalAnnualCost).toBe(without.totalAnnualCost);
    expect(withRdo.totalHours).toBe(without.totalHours);
  });

  it('scales with the accrual rather than switching on a flag', () => {
    const light = calculate({ ...base, rdo: { ...MA000020_RDO, accrualHoursPerDay: 0.2 } });
    const standard = calculate({ ...base, rdo: MA000020_RDO });

    expect(light.rdoHoursAnnual).toBeGreaterThan(0);
    expect(light.rdoHoursAnnual).toBeLessThan(standard.rdoHoursAnnual);
    expect(light.costPerHour).toBeGreaterThan(standard.costPerHour);
  });

  it('refuses to accrue on a nonsense arrangement instead of dividing by zero', () => {
    const zeroAccrual = calculate({
      ...base,
      rdo: { enabled: true, accrualHoursPerDay: 0, cycleDays: 19 },
    });
    expect(zeroAccrual.rdoHoursAnnual).toBe(0);
    expect(zeroAccrual.billableHours).toBe(39 * 38);

    const zeroDays = calculate({ ...base, daysPerWeek: 0, rdo: MA000020_RDO });
    expect(Number.isFinite(zeroDays.rdoHoursAnnual)).toBe(true);
    expect(zeroDays.rdoHoursAnnual).toBe(0);
  });
});
