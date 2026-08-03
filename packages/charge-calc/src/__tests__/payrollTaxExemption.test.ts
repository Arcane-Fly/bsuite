/**
 * LEGACY surface — PAYROLL_TAX_EXEMPT_STATES / resolveEffectivePayrollTaxRate.
 *
 * These exports are @deprecated and WRONG BY DESIGN (retained so live consumers
 * that still name them fail loudly when they migrate). New code MUST use
 * resolvePayrollTax() from payroll-tax-relief.
 *
 * This file only asserts the legacy API still *runs* and still returns the
 * historical shape — it does NOT re-assert the false legal answers as truth.
 * See payroll-tax-relief.test.ts for the correct doctrine.
 */
import { describe, it, expect } from 'vitest';

import {
  PAYROLL_TAX_RATES,
  PAYROLL_TAX_EXEMPT_STATES,
  resolveEffectivePayrollTaxRate,
  getPayrollTaxRate,
} from '../defaults.js';
import type { AustralianState } from '../types.js';

describe('legacy resolveEffectivePayrollTaxRate (deprecated API surface)', () => {
  it('still returns 0 for combinations the old table marked exempt', () => {
    // Documenting the deprecated behaviour — not endorsing it.
    expect(resolveEffectivePayrollTaxRate('WA', 'AP', 0.055)).toBe(0);
  });

  it('still passes through the general rate for codes the old table left out', () => {
    expect(resolveEffectivePayrollTaxRate('QLD', 'TN', 0.0475)).toBe(0.0475);
  });
});

describe('PAYROLL_TAX_RATES integrity', () => {
  it('every key is a valid AustralianState and ACT is the post-1-Jul-2026 rate', () => {
    const valid: ReadonlyArray<AustralianState> = [
      'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT',
    ];
    for (const key of Object.keys(PAYROLL_TAX_RATES)) {
      expect(valid).toContain(key as AustralianState);
    }
    expect(Object.keys(PAYROLL_TAX_RATES)).toHaveLength(8);
    expect(getPayrollTaxRate('ACT')).toBe(0.0675);
  });

  it('PAYROLL_TAX_EXEMPT_STATES keys are a subset of PAYROLL_TAX_RATES keys', () => {
    const rateStates = new Set(Object.keys(PAYROLL_TAX_RATES));
    for (const state of Object.keys(PAYROLL_TAX_EXEMPT_STATES)) {
      expect(rateStates.has(state)).toBe(true);
    }
  });
});
