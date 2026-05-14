/**
 * Tests for the value-with-source architecture (R80.3#248).
 *
 * Coverage:
 *   - Schema validation for every source kind
 *   - Type guards
 *   - manualValue() helper
 *   - chainResolvers() fallback logic
 *   - TrainingDaysResolver against a fake adapter (all 5 modes + cache + errors)
 *   - WageResolver against a fake adapter (fair-work + EA + MAPD + manual + tenant-pref + host-agreed)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  ValueSourceSchema,
  manualValue,
  chainResolvers,
  isManual,
  isLiveApi,
  isTradeAverage,
  isTradeYearAverage,
  isHostAgreed,
  isPlacementDerived,
  isTenantPreference,
  type ValueResolver,
  type ValueSource,
  type ResolvedValue,
} from '../sources';
import {
  TrainingDaysResolver,
  type TrainingDaysDataAccess,
} from '../resolvers/training-days';
import {
  WageResolver,
  type WageDataAccess,
} from '../resolvers/wage';

describe('ValueSourceSchema validation', () => {
  it('accepts a manual source', () => {
    const result = ValueSourceSchema.safeParse({ kind: 'manual', value: 1.5 });
    expect(result.success).toBe(true);
  });

  it('accepts a live-api source', () => {
    const result = ValueSourceSchema.safeParse({
      kind: 'live-api',
      api: 'fair-work',
      params: { awardCode: 'MA000020', classification: 'EW Y3' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a placement-derived source', () => {
    const result = ValueSourceSchema.safeParse({
      kind: 'placement-derived',
      placementId: '4a3f1c8b-5e2d-4a7f-9c3e-1f8b6d4e2a91',
      field: 'training_days_per_week',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a trade-average source', () => {
    const result = ValueSourceSchema.safeParse({
      kind: 'trade-average',
      tradeCode: 'CER40120',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a trade-year-average source', () => {
    const result = ValueSourceSchema.safeParse({
      kind: 'trade-year-average',
      tradeCode: 'CER40120',
      apprenticeYear: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown kind', () => {
    const result = ValueSourceSchema.safeParse({ kind: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects placement-derived with non-uuid placementId', () => {
    const result = ValueSourceSchema.safeParse({
      kind: 'placement-derived',
      placementId: 'not-a-uuid',
      field: 'training_days_per_week',
    });
    expect(result.success).toBe(false);
  });

  it('rejects trade-year-average with apprenticeYear out of range', () => {
    const result = ValueSourceSchema.safeParse({
      kind: 'trade-year-average',
      tradeCode: 'CER40120',
      apprenticeYear: 99,
    });
    expect(result.success).toBe(false);
  });
});

describe('Type guards', () => {
  it('correctly identifies each source kind', () => {
    const manual: ValueSource = { kind: 'manual', value: 1 };
    const liveApi: ValueSource = { kind: 'live-api', api: 'fair-work', params: {} };
    const placement: ValueSource = {
      kind: 'placement-derived',
      placementId: '4a3f1c8b-5e2d-4a7f-9c3e-1f8b6d4e2a91',
      field: 'x',
    };
    const tradeAvg: ValueSource = { kind: 'trade-average', tradeCode: 'X' };
    const tradeYearAvg: ValueSource = {
      kind: 'trade-year-average',
      tradeCode: 'X',
      apprenticeYear: 1,
    };
    const hostAgreed: ValueSource = {
      kind: 'host-agreed',
      placementId: '4a3f1c8b-5e2d-4a7f-9c3e-1f8b6d4e2a91',
      field: 'x',
    };
    const tenantPref: ValueSource = {
      kind: 'tenant-preference',
      preferenceKey: 'k',
    };

    expect(isManual(manual)).toBe(true);
    expect(isLiveApi(liveApi)).toBe(true);
    expect(isPlacementDerived(placement)).toBe(true);
    expect(isTradeAverage(tradeAvg)).toBe(true);
    expect(isTradeYearAverage(tradeYearAvg)).toBe(true);
    expect(isHostAgreed(hostAgreed)).toBe(true);
    expect(isTenantPreference(tenantPref)).toBe(true);

    expect(isManual(liveApi)).toBe(false);
    expect(isLiveApi(manual)).toBe(false);
  });
});

describe('manualValue helper', () => {
  it('wraps a number with provenance', () => {
    const r = manualValue(42, 'because');
    expect(r.value).toBe(42);
    expect(r.source.kind).toBe('manual');
    expect(r.fromCache).toBe(false);
    expect(r.trace).toContain('because');
  });
});

describe('chainResolvers', () => {
  it('returns first successful result', async () => {
    const r1: ValueResolver = {
      resolve: vi.fn().mockRejectedValue(new Error('first failed')),
    };
    const r2: ValueResolver = {
      resolve: vi.fn().mockResolvedValue({
        value: 7,
        source: { kind: 'manual', value: 7 },
        resolvedAt: new Date(),
        fromCache: false,
        trace: 'r2',
      } as ResolvedValue<number>),
    };
    const chained = chainResolvers(r1, r2);
    const out = await chained.resolve({ kind: 'manual', value: 7 });
    expect(out.value).toBe(7);
    expect(r1.resolve).toHaveBeenCalled();
    expect(r2.resolve).toHaveBeenCalled();
  });

  it('throws when all resolvers fail', async () => {
    const r1: ValueResolver = {
      resolve: vi.fn().mockRejectedValue(new Error('one')),
    };
    const r2: ValueResolver = {
      resolve: vi.fn().mockRejectedValue(new Error('two')),
    };
    const chained = chainResolvers(r1, r2);
    await expect(chained.resolve({ kind: 'manual', value: 0 })).rejects.toThrow(
      /all 2 resolvers failed/,
    );
  });
});

// ─── TrainingDaysResolver ─────────────────────────────────────────────

function makeFakeTrainingDataAccess(): TrainingDaysDataAccess {
  return {
    fromPlacement: vi.fn(async (id: string) => (id === 'p-known' ? 1.5 : null)),
    fromTradeAverage: vi.fn(async (trade: string) =>
      trade === 'CER40120' ? 1.2 : null,
    ),
    fromTradeYearAverage: vi.fn(async (trade: string, year: number) =>
      trade === 'CER40120' && year === 3 ? 0.8 : null,
    ),
    fromTenantPreference: vi.fn(async (key: string) =>
      key === 'default_training_days' ? 1.0 : null,
    ),
    fromHostAgreement: vi.fn(async (id: string) => (id === 'p-agreed' ? 2.0 : null)),
  };
}

describe('TrainingDaysResolver — 5 source modes', () => {
  let dataAccess: TrainingDaysDataAccess;
  let resolver: TrainingDaysResolver;

  beforeEach(() => {
    dataAccess = makeFakeTrainingDataAccess();
    resolver = new TrainingDaysResolver(dataAccess);
  });

  it('mode 1: placement-derived', async () => {
    // Adjust the fake adapter to key on the test UUID
    (dataAccess.fromPlacement as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1.5);
    const r = await resolver.resolve({
      kind: 'placement-derived',
      placementId: '4a3f1c8b-5e2d-4a7f-9c3e-1f8b6d4e2a91',
      field: 'training_days_per_week',
    });
    expect(r.value).toBe(1.5);
    expect(r.trace).toContain('placement 4a3f1c8b-5e2d-4a7f-9c3e-1f8b6d4e2a91');
  });

  it('mode 1: placement-derived (missing data → throws)', async () => {
    await expect(
      resolver.resolve({
        kind: 'placement-derived',
        placementId: '8e1c4d6f-2a3b-4c5d-9e8f-1b6d2c5e8a4f',
        field: 'training_days_per_week',
      }),
    ).rejects.toThrow(/no training_days value/);
  });

  it('mode 2: trade-average', async () => {
    const r = await resolver.resolve({
      kind: 'trade-average',
      tradeCode: 'CER40120',
    });
    expect(r.value).toBe(1.2);
    expect(r.trace).toContain('trade-avg(CER40120');
  });

  it('mode 3: trade-year-average', async () => {
    const r = await resolver.resolve({
      kind: 'trade-year-average',
      tradeCode: 'CER40120',
      apprenticeYear: 3,
    });
    expect(r.value).toBe(0.8);
    expect(r.trace).toContain('trade-year-avg(CER40120, Y3');
  });

  it('mode 4: tenant-preference (flat default)', async () => {
    const r = await resolver.resolve({
      kind: 'tenant-preference',
      preferenceKey: 'default_training_days',
    });
    expect(r.value).toBe(1.0);
    expect(r.trace).toContain('tenant-pref(default_training_days)');
  });

  it('mode 5: host-agreed', async () => {
    (dataAccess.fromHostAgreement as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2.0);
    const r = await resolver.resolve({
      kind: 'host-agreed',
      placementId: '7b8e2d4f-6c1a-4b3e-8d9f-2e5c8a1b6d3f',
      field: 'agreed_training_days',
    });
    expect(r.value).toBe(2.0);
  });

  it('manual override', async () => {
    const r = await resolver.resolve({
      kind: 'manual',
      value: 1.5,
      note: 'host requested',
    });
    expect(r.value).toBe(1.5);
    expect(r.trace).toContain('host requested');
  });

  it('caches within render', async () => {
    const r1 = await resolver.resolve({
      kind: 'trade-average',
      tradeCode: 'CER40120',
    });
    const r2 = await resolver.resolve({
      kind: 'trade-average',
      tradeCode: 'CER40120',
    });
    expect(r1.fromCache).toBe(false);
    expect(r2.fromCache).toBe(true);
    expect(dataAccess.fromTradeAverage).toHaveBeenCalledTimes(1);
  });

  it('rejects live-api source as inappropriate for training-days', async () => {
    await expect(
      resolver.resolve({
        kind: 'live-api',
        api: 'fair-work',
        params: {},
      }),
    ).rejects.toThrow(/not applicable to training-days/);
  });
});

// ─── WageResolver ─────────────────────────────────────────────────────

function makeFakeWageDataAccess(): WageDataAccess {
  return {
    fromFairWork: vi.fn(async (params) =>
      params.awardCode === 'MA000020' && params.classification === 'EW Y3'
        ? { rate: 29.5, effectiveDate: '2026-04-01', sourceUrl: 'https://fwc.test' }
        : null,
    ),
    fromEnterpriseAgreement: vi.fn(async (params) =>
      params.agreementId === 'ea-1'
        ? { rate: 32.0, effectiveDate: '2026-01-01' }
        : null,
    ),
    fromMapd: vi.fn(async (params) =>
      params.qualificationCode === 'CER40120' && params.apprenticeYear === 3
        ? { rate: 24.5, effectiveDate: '2026-01-01' }
        : null,
    ),
    fromTenantPreference: vi.fn(async (key) => (key === 'default_wage' ? 30.0 : null)),
    fromHostAgreement: vi.fn(async (id) => (id === 'p-agreed' ? 35.0 : null)),
  };
}

describe('WageResolver — multi-source', () => {
  let dataAccess: WageDataAccess;
  let resolver: WageResolver;

  beforeEach(() => {
    dataAccess = makeFakeWageDataAccess();
    resolver = new WageResolver(dataAccess, { staleAfterDays: 90 });
  });

  it('fair-work live-api', async () => {
    const r = await resolver.resolve({
      kind: 'live-api',
      api: 'fair-work',
      params: { awardCode: 'MA000020', classification: 'EW Y3' },
    });
    expect(r.value).toBe(29.5);
    expect(r.trace).toContain('fair-work(MA000020/EW Y3)');
  });

  it('fair-work missing required params throws', async () => {
    await expect(
      resolver.resolve({ kind: 'live-api', api: 'fair-work', params: {} }),
    ).rejects.toThrow(/missing required params/);
  });

  it('enterprise-agreement live-api', async () => {
    const r = await resolver.resolve({
      kind: 'live-api',
      api: 'enterprise-agreement',
      params: { agreementId: 'ea-1', classification: 'L3' },
    });
    expect(r.value).toBe(32.0);
  });

  it('mapd live-api', async () => {
    const r = await resolver.resolve({
      kind: 'live-api',
      api: 'mapd',
      params: { qualificationCode: 'CER40120', apprenticeYear: 3 },
    });
    expect(r.value).toBe(24.5);
  });

  it('manual', async () => {
    const r = await resolver.resolve({ kind: 'manual', value: 28.5, note: 'test' });
    expect(r.value).toBe(28.5);
  });

  it('tenant-preference', async () => {
    const r = await resolver.resolve({
      kind: 'tenant-preference',
      preferenceKey: 'default_wage',
    });
    expect(r.value).toBe(30.0);
  });

  it('host-agreed', async () => {
    (dataAccess.fromHostAgreement as ReturnType<typeof vi.fn>).mockResolvedValueOnce(35.0);
    const r = await resolver.resolve({
      kind: 'host-agreed',
      placementId: '9d2f5e7a-3b4c-4e6f-8a1d-5c8e2b9f4a6d',
      field: 'agreed_wage',
    });
    expect(r.value).toBe(35.0);
  });

  it('emits warning when fetched rate is older than staleAfterDays', async () => {
    const oldDateAccess: WageDataAccess = {
      ...makeFakeWageDataAccess(),
      fromFairWork: vi.fn(async () => ({
        rate: 29.5,
        effectiveDate: '2024-01-01', // way past 90 days
      })),
    };
    const r = new WageResolver(oldDateAccess, { staleAfterDays: 90 });
    const result = await r.resolve({
      kind: 'live-api',
      api: 'fair-work',
      params: { awardCode: 'X', classification: 'X' },
    });
    expect(result.warning).toMatch(/days old/);
  });

  it('rejects inappropriate sources (placement-derived, trade-average, trade-year-average)', async () => {
    for (const kind of ['placement-derived', 'trade-average', 'trade-year-average'] as const) {
      const source: ValueSource =
        kind === 'placement-derived'
          ? { kind, placementId: '4a3f1c8b-5e2d-4a7f-9c3e-1f8b6d4e2a91', field: 'x' }
          : kind === 'trade-average'
            ? { kind, tradeCode: 'X' }
            : { kind, tradeCode: 'X', apprenticeYear: 1 };
      await expect(resolver.resolve(source)).rejects.toThrow(/not applicable to wage/);
    }
  });
});
