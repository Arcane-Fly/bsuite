/**
 * Estate ledger M-1 — per-tenant super and workers' comp reach the money.
 *
 * MUTATION TEST. The load-bearing assertion is "applyTenantOncosts recomputes
 * otOncostFactor": delete the `otOncostFactor:` key from `applyTenantOncosts`
 * and the "overtime moves with the tenant premium" case goes RED while every
 * other case stays GREEN — which is exactly the defect shape it guards, a
 * tenant rate that moves ordinary time and silently does not move overtime.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveTenantOncosts,
  applyTenantOncosts,
} from '../../resolvers/tenant-oncosts.js';
import { DEFAULT_CONFIG, deriveOtOncostFactor } from '../../defaults.js';
import { calculate } from '../../calculate.js';
import type { CalcConfig } from '../../types.js';

const base: CalcConfig = {
  ...DEFAULT_CONFIG,
  wage: 29.5,
  hoursPerWeek: 38,
  hoursPerDay: 7.6,
  daysPerWeek: 5,
  billableWeeks: 39,
};

describe('resolveTenantOncosts', () => {
  it('falls back to the platform default AND says so when nothing is configured', () => {
    const r = resolveTenantOncosts();
    expect(r.superRate).toBe(DEFAULT_CONFIG.superRate);
    expect(r.wcRate).toBe(DEFAULT_CONFIG.wcRate);
    expect(r.superRateSource).toBe('platform-default');
    expect(r.wcRateSource).toBe('platform-default');
    // The fallback is REPORTED, never silent — that is the difference between
    // "the tenant's rate is 12%" and "we do not know the tenant's rate".
    expect(r.fallbacks).toHaveLength(2);
    expect(r.fallbacks.join(' ')).toContain('platform default');
  });

  it("uses the tenant's own rates when they are configured", () => {
    const r = resolveTenantOncosts({
      settings: { super_rate: 0.115, wc_rate: 0.089 },
    });
    expect(r.superRate).toBe(0.115);
    expect(r.wcRate).toBe(0.089);
    expect(r.superRateSource).toBe('tenant-setting');
    expect(r.wcRateSource).toBe('tenant-setting');
    expect(r.fallbacks).toEqual([]);
  });

  it('accepts PostgREST numeric-as-string without turning a rate into NaN', () => {
    const r = resolveTenantOncosts({ settings: { super_rate: '0.12', wc_rate: '0.047' } });
    expect(r.superRate).toBe(0.12);
    expect(r.wcRate).toBe(0.047);
    expect(r.superRateSource).toBe('tenant-setting');
  });

  it('prefers a negotiated wc_rate over the WIC scheme lookup', () => {
    const r = resolveTenantOncosts({
      settings: { wc_rate: 0.031, wic_code: '421' },
      wicPremiumRate: 0.089,
    });
    expect(r.wcRate).toBe(0.031);
    expect(r.wcRateSource).toBe('tenant-setting');
  });

  it('uses the WIC lookup when no rate is negotiated', () => {
    const r = resolveTenantOncosts({
      settings: { wic_code: '421' },
      wicPremiumRate: 0.089,
    });
    expect(r.wcRate).toBe(0.089);
    expect(r.wcRateSource).toBe('wic-lookup');
    // Super still fell back, so exactly one fallback line, and it is super's.
    expect(r.fallbacks).toHaveLength(1);
    expect(r.fallbacks[0]).toContain('Superannuation');
  });

  it('names the WIC code when it is set but resolves to nothing', () => {
    const r = resolveTenantOncosts({ settings: { wic_code: '421' } });
    expect(r.wcRateSource).toBe('platform-default');
    expect(r.fallbacks.join(' ')).toContain('421');
  });

  it('REFUSES a percent pasted into a fraction field rather than quoting it', () => {
    // 12 means 12%, not 1200%. Accepting it multiplies the tenant's super
    // bill by a hundred; the DB CHECK blocks it at the write, this blocks it
    // on any other path in.
    const r = resolveTenantOncosts({ settings: { super_rate: 12, wc_rate: 4.7 } });
    expect(r.superRate).toBe(DEFAULT_CONFIG.superRate);
    expect(r.wcRate).toBe(DEFAULT_CONFIG.wcRate);
    expect(r.superRateSource).toBe('platform-default');
    expect(r.wcRateSource).toBe('platform-default');
  });

  it('refuses blanks, negatives and unparseable values', () => {
    for (const bad of ['', '   ', 'abc', -0.01, Number.NaN, null, undefined]) {
      const r = resolveTenantOncosts({ settings: { super_rate: bad as never } });
      expect(r.superRateSource).toBe('platform-default');
    }
  });
});

describe('applyTenantOncosts', () => {
  it('moves ordinary-time cost with the tenant super rate', () => {
    const platform = calculate(base);
    const tenant = calculate(
      applyTenantOncosts(base, resolveTenantOncosts({ settings: { super_rate: 0.15 } })),
    );
    expect(tenant.superAmount).toBeGreaterThan(platform.superAmount);
    expect(tenant.quotedChargeRate).toBeGreaterThan(platform.quotedChargeRate);
  });

  it('MOVES OVERTIME with the tenant workers-comp premium, not just ordinary time', () => {
    const resolved = resolveTenantOncosts({ settings: { wc_rate: 0.089 } });
    const cfg = applyTenantOncosts(base, resolved);

    // The mutation target: without the recompute, otOncostFactor stays at the
    // platform figure and overtime is priced off a premium the tenant does
    // not pay.
    expect(cfg.otOncostFactor).toBe(
      deriveOtOncostFactor({ wcRate: 0.089, payrollTaxRate: base.payrollTaxRate }),
    );
    expect(cfg.otOncostFactor).not.toBe(base.otOncostFactor);

    const platform = calculate(base);
    const tenant = calculate(cfg);
    expect(tenant.otOncostPerHour).toBeGreaterThan(platform.otOncostPerHour);
    expect(tenant.rates.ot15.charge).toBeGreaterThan(platform.rates.ot15.charge);
  });

  it('leaves payroll tax alone — it is not a tenant preference', () => {
    const cfg = applyTenantOncosts(
      { ...base, payrollTaxRate: 0.055 },
      resolveTenantOncosts({ settings: { super_rate: 0.115, wc_rate: 0.089 } }),
    );
    expect(cfg.payrollTaxRate).toBe(0.055);
  });

  it('is a no-op on the numbers when the tenant has configured nothing', () => {
    const cfg = applyTenantOncosts(base, resolveTenantOncosts());
    expect(calculate(cfg).quotedChargeRate).toBe(calculate(base).quotedChargeRate);
  });
});
