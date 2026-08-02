/**
 * Payroll tax exemption for apprentices/trainees/juniors.
 *
 * crm7#1265 / G2 unify-calc-paths: this exemption logic used to live only in
 * R80.3/src/services/awardRulesEngine.ts, which crm7 cannot import. crm7's
 * charge-rate path therefore assigned `PAYROLL_TAX_RATES` (a bare, non-exempt
 * state rate) directly to every worker regardless of rate-type code — a WA
 * apprentice was charged at 5.5% when the legally correct rate is 0%.
 *
 * These tests assert the exemption wins in the operator's primary case (WA
 * apprentice), preserves the non-uniform per-state shape (QLD does NOT exempt
 * trainees, unlike WA/VIC/NSW), and — critically — wins over a fabricated
 * non-zero general rate, so a test can't accidentally pass by coincidentally
 * matching the table's own value instead of actually distinguishing "exempt"
 * from "looked up".
 */
import { describe, it, expect } from 'vitest';

import {
  PAYROLL_TAX_RATES,
  PAYROLL_TAX_EXEMPT_STATES,
  resolveEffectivePayrollTaxRate,
  getPayrollTaxRate,
} from '../defaults';
import type { AustralianState } from '../types';
import type { PayrollTaxRateTypeCode } from '../defaults';

describe('resolveEffectivePayrollTaxRate', () => {
  it('WA + AP (apprentice) is 0 — the operator primary case the issue got backwards', () => {
    const generalRate = getPayrollTaxRate('WA'); // 0.055
    expect(resolveEffectivePayrollTaxRate('WA', 'AP', generalRate)).toBe(0);
  });

  it('WA + JN (junior, non-apprentice) is the general rate, 0.055 — juniors are never exempt', () => {
    const generalRate = getPayrollTaxRate('WA');
    expect(resolveEffectivePayrollTaxRate('WA', 'JN', generalRate)).toBe(0.055);
  });

  it('QLD + TN (trainee) is the general rate, NOT 0 — QLD does not exempt trainees', () => {
    // QLD's exempt list is ['AP', 'AA'] only (see PAYROLL_TAX_EXEMPT_STATES) —
    // unlike WA/VIC/NSW, which also exempt TN. A uniform rewrite of the
    // per-state table would silently destroy exactly this asymmetry.
    const generalRate = getPayrollTaxRate('QLD');
    expect(resolveEffectivePayrollTaxRate('QLD', 'TN', generalRate)).toBe(generalRate);
    expect(resolveEffectivePayrollTaxRate('QLD', 'TN', generalRate)).not.toBe(0);
  });

  it('exemption wins over ANY non-zero general rate, not just the table value', () => {
    // A fabricated rate unlike any table entry — proves the function is
    // actually checking exemption, not merely returning the input verbatim
    // or coincidentally matching a table lookup.
    const fabricatedRate = 0.0999;
    expect(resolveEffectivePayrollTaxRate('WA', 'AP', fabricatedRate)).toBe(0);
    expect(resolveEffectivePayrollTaxRate('VIC', 'AA', fabricatedRate)).toBe(0);
    expect(resolveEffectivePayrollTaxRate('NSW', 'TN', fabricatedRate)).toBe(0);
  });

  it('a non-exempt state/code combination passes the general rate through unchanged', () => {
    const fabricatedRate = 0.0999;
    expect(resolveEffectivePayrollTaxRate('QLD', 'TN', fabricatedRate)).toBe(fabricatedRate);
    expect(resolveEffectivePayrollTaxRate('SA', 'JN', fabricatedRate)).toBe(fabricatedRate);
  });

  it('full exemption matrix matches the documented, non-uniform shape', () => {
    const cases: Array<[AustralianState, PayrollTaxRateTypeCode, boolean]> = [
      ['WA', 'AP', true], ['WA', 'AA', true], ['WA', 'TN', true], ['WA', 'JN', false],
      ['VIC', 'AP', true], ['VIC', 'AA', true], ['VIC', 'TN', true], ['VIC', 'JN', false],
      ['NSW', 'AP', true], ['NSW', 'AA', true], ['NSW', 'TN', true], ['NSW', 'JN', false],
      ['QLD', 'AP', true], ['QLD', 'AA', true], ['QLD', 'TN', false], ['QLD', 'JN', false],
      ['SA', 'AP', true], ['SA', 'AA', true], ['SA', 'TN', false], ['SA', 'JN', false],
      ['TAS', 'AP', true], ['TAS', 'AA', true], ['TAS', 'TN', false], ['TAS', 'JN', false],
      ['ACT', 'AP', true], ['ACT', 'AA', true], ['ACT', 'TN', false], ['ACT', 'JN', false],
      ['NT', 'AP', true], ['NT', 'AA', true], ['NT', 'TN', false], ['NT', 'JN', false],
    ];
    const fabricatedRate = 0.0999;
    for (const [state, code, exempt] of cases) {
      const result = resolveEffectivePayrollTaxRate(state, code, fabricatedRate);
      expect(result, `${state} + ${code} should be ${exempt ? 'exempt (0)' : 'non-exempt (passthrough)'}`).toBe(
        exempt ? 0 : fabricatedRate,
      );
    }
  });
});

describe('PAYROLL_TAX_EXEMPT_STATES / PAYROLL_TAX_RATES integrity', () => {
  it('every key of PAYROLL_TAX_RATES is a valid AustralianState', () => {
    const validStates: ReadonlyArray<AustralianState> = [
      'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT',
    ];
    for (const key of Object.keys(PAYROLL_TAX_RATES)) {
      expect(validStates).toContain(key as AustralianState);
    }
    expect(Object.keys(PAYROLL_TAX_RATES)).toHaveLength(8);
  });

  it('PAYROLL_TAX_EXEMPT_STATES keys are a subset of PAYROLL_TAX_RATES keys, so the two cannot drift', () => {
    const rateStates = new Set(Object.keys(PAYROLL_TAX_RATES));
    for (const state of Object.keys(PAYROLL_TAX_EXEMPT_STATES)) {
      expect(rateStates.has(state)).toBe(true);
    }
  });

  it('every exempt code is a valid PayrollTaxRateTypeCode', () => {
    const validCodes: ReadonlyArray<PayrollTaxRateTypeCode> = ['AP', 'AA', 'TN', 'JN'];
    for (const codes of Object.values(PAYROLL_TAX_EXEMPT_STATES)) {
      for (const code of codes ?? []) {
        expect(validCodes).toContain(code);
      }
    }
  });
});
