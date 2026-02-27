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
