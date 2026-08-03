/**
 * Payroll tax RELIEF — exemption vs rebate vs none vs unverified.
 *
 * Pins the corrections that made PAYROLL_TAX_EXEMPT_STATES wrong in every row.
 * An unmet condition NEVER becomes an exemption (election at general rate).
 * A rebate NEVER reduces the charge rate.
 */
import { describe, it, expect } from 'vitest';

import {
  RELIEF_TYPE,
  resolvePayrollTax,
  reliefRuleFor,
  rebateOnlyStates,
  statesExempting,
  statesWithNoRelief,
  PAYROLL_TAX_RATES,
} from '../index.js';
import { getPayrollTaxRate } from '../defaults.js';

const WA = () => getPayrollTaxRate('WA');
const NSW = () => getPayrollTaxRate('NSW');

describe('resolvePayrollTax — structural corrections', () => {
  it('NSW is a REBATE: charge rate still carries the tax', () => {
    const r = resolvePayrollTax({ state: 'NSW', rateTypeCode: 'AP' });
    expect(r.reliefType).toBe(RELIEF_TYPE.REBATE);
    expect(r.rate).toBe(NSW());
    expect(r.exempt).toBe(false);
    expect(r.rebateAvailable).toBe(true);
  });

  it('WA trainee is NOT exempt (contracts from 1 Jul 2019)', () => {
    const r = resolvePayrollTax({ state: 'WA', rateTypeCode: 'TN' });
    expect(r.reliefType).toBe(RELIEF_TYPE.NONE);
    expect(r.rate).toBe(WA());
    expect(r.exempt).toBe(false);
  });

  it('WA apprentice with conditions unconfirmed → election at general rate (never silent 0)', () => {
    const r = resolvePayrollTax({ state: 'WA', rateTypeCode: 'AP' });
    expect(r.reliefType).toBe(RELIEF_TYPE.EXEMPTION);
    expect(r.election).toBe(true);
    expect(r.rate).toBe(WA());
    expect(r.exempt).toBe(false);
    expect(r.pendingConditions.length).toBeGreaterThan(0);
  });

  it('WA apprentice with all conditions confirmed → genuine exemption at 0', () => {
    const r = resolvePayrollTax({
      state: 'WA',
      rateTypeCode: 'AP',
      confirmedConditions: {
        wa_contract_registered: true,
        wa_contract_not_suspended: true,
      },
    });
    expect(r.exempt).toBe(true);
    expect(r.rate).toBe(0);
    expect(r.election).toBe(false);
  });

  it('SA has NO relief (exemption window lapsed)', () => {
    const r = resolvePayrollTax({ state: 'SA', rateTypeCode: 'AP' });
    expect(r.reliefType).toBe(RELIEF_TYPE.NONE);
    expect(r.rate).toBe(getPayrollTaxRate('SA'));
    expect(r.exempt).toBe(false);
  });

  it('QLD trainees CAN be exempt (opposite of the old table) once conditions confirmed', () => {
    const r = resolvePayrollTax({
      state: 'QLD',
      rateTypeCode: 'TN',
      confirmedConditions: {
        qld_contract_registered: true,
        qld_wages_in_course: true,
      },
    });
    // endsOn may or may not apply depending on asOf; without asOf, relief still runs
    expect(r.reliefType).toBe(RELIEF_TYPE.EXEMPTION);
    expect(r.rate).toBe(0);
    expect(r.exempt).toBe(true);
  });

  it('NT trainees can be exempt (old table excluded them)', () => {
    const r = resolvePayrollTax({
      state: 'NT',
      rateTypeCode: 'TN',
      confirmedConditions: { nt_approved_contract: true },
    });
    expect(r.exempt).toBe(true);
    expect(r.rate).toBe(0);
  });

  it('ACT is UNVERIFIED — election, not a guessed 0%', () => {
    const r = resolvePayrollTax({ state: 'ACT', rateTypeCode: 'AP' });
    expect(r.reliefType).toBe(RELIEF_TYPE.UNVERIFIED);
    expect(r.election).toBe(true);
    expect(r.rate).toBe(getPayrollTaxRate('ACT'));
  });

  it('ACT rate is 6.75% (1 Jul 2026), not the stale 6.85%', () => {
    expect(PAYROLL_TAX_RATES.ACT).toBe(0.0675);
  });

  it('TAS is a REBATE — charge rate carries the tax', () => {
    const r = resolvePayrollTax({ state: 'TAS', rateTypeCode: 'AP' });
    expect(r.reliefType).toBe(RELIEF_TYPE.REBATE);
    expect(r.rate).toBe(getPayrollTaxRate('TAS'));
  });

  it('below-threshold zeros the rate even where relief is a rebate', () => {
    const r = resolvePayrollTax({
      state: 'NSW',
      rateTypeCode: 'AP',
      thresholdPosition: 'below_threshold',
    });
    expect(r.rate).toBe(0);
    expect(r.belowThreshold).toBe(true);
  });
});

describe('catalog helpers', () => {
  it('rebateOnlyStates includes NSW and TAS', () => {
    const rebates = rebateOnlyStates();
    expect(rebates).toContain('NSW');
    expect(rebates).toContain('TAS');
    expect(rebates).not.toContain('WA');
  });

  it('statesExempting(AP) includes WA and QLD, not NSW', () => {
    const ex = statesExempting('AP');
    expect(ex).toContain('WA');
    expect(ex).toContain('QLD');
    expect(ex).not.toContain('NSW');
  });

  it('statesWithNoRelief(AP) includes SA', () => {
    expect(statesWithNoRelief('AP')).toContain('SA');
  });

  it('reliefRuleFor returns null for unknown state', () => {
    expect(reliefRuleFor('XX', 'AP')).toBeNull();
  });
});
