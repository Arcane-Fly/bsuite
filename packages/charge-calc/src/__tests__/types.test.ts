import { describe, it, expect } from 'vitest';
import {
  type Allowance,
  type PenaltyRate,
  type CalcConfig,
  type CalcResult,
  type FundingConfig,
  type BillingModel,
  type AustralianState,
  AllowanceTypeSchema,
  AustralianStateSchema,
  PenaltyCategory,
  BILLING_MODEL_WEEKS,
  getSuperRate,
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

  it('BILLING_MODEL_WEEKS maps to correct weeks', () => {
    expect(BILLING_MODEL_WEEKS.Standard).toBe(39);
    expect(BILLING_MODEL_WEEKS.ALEX48).toBe(48);
    expect(BILLING_MODEL_WEEKS.W52).toBe(52);
    expect(BILLING_MODEL_WEEKS.Custom).toBeNull();
    // Type-level check: exhaustive BillingModel coverage
    const _check: Record<BillingModel, number | null> = BILLING_MODEL_WEEKS;
    expect(Object.keys(_check)).toHaveLength(4);
  });

  it('AustralianStateSchema validates all 8 states/territories', () => {
    const states: AustralianState[] = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
    for (const state of states) {
      expect(AustralianStateSchema.safeParse(state).success).toBe(true);
    }
    expect(AustralianStateSchema.safeParse('XX').success).toBe(false);
    expect(AustralianStateSchema.safeParse('').success).toBe(false);
  });

  it('getSuperRate returns 11.5% before July 2025', () => {
    expect(getSuperRate(new Date('2025-06-30'))).toBe(0.115);
    expect(getSuperRate(new Date('2024-07-01'))).toBe(0.115);
  });

  it('getSuperRate returns 12% from July 2025 onwards', () => {
    expect(getSuperRate(new Date('2025-07-01'))).toBe(0.12);
    expect(getSuperRate(new Date('2026-01-15'))).toBe(0.12);
  });

  it('core interfaces are structurally valid', () => {
    // Compile-time checks: these objects must satisfy the interfaces
    const allowance: Allowance = {
      id: '1',
      name: 'Travel',
      type: 'perKm',
      amount: 0.95,
      superApplicable: false,
      enabled: true,
    };
    expect(allowance.name).toBe('Travel');

    const penalty: PenaltyRate = {
      id: 'ot15',
      label: 'Overtime 1.5x',
      mult: 1.5,
      cat: 'overtime',
    };
    expect(penalty.mult).toBe(1.5);

    const funding: FundingConfig = {
      enabled: false,
      milestones: [],
      method: 'reduce',
      passPercentage: 0,
      apprenticeshipYears: 4,
    };
    expect(funding.apprenticeshipYears).toBe(4);

    // CalcConfig and CalcResult are large interfaces — assert they
    // are importable as types (compile-time only, no runtime usage needed).
    const _cfg: CalcConfig | undefined = undefined;
    const _res: CalcResult | undefined = undefined;
    expect(_cfg).toBeUndefined();
    expect(_res).toBeUndefined();
  });
});
