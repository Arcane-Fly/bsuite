import { describe, it, expect, vi } from 'vitest';
import { TrainingDaysResolver } from '../../resolvers/training-days';
import type { TrainingDaysDataAccess } from '../../resolvers/training-days';
import type { ValueSource } from '../../sources';

/** A fully-stubbed TrainingDaysDataAccess; tests override only what they exercise. */
function makeDataAccess(
  overrides: Partial<TrainingDaysDataAccess> = {},
): TrainingDaysDataAccess {
  return {
    fromPlacement: vi.fn(async () => null),
    fromTradeAverage: vi.fn(async () => null),
    fromTradeYearAverage: vi.fn(async () => null),
    fromTenantPreference: vi.fn(async () => null),
    fromHostAgreement: vi.fn(async () => null),
    ...overrides,
  };
}

const PLACEMENT_ID = '22222222-2222-4222-8222-222222222222';

describe('TrainingDaysResolver — manual source', () => {
  it('returns the typed-in value with a days/wk trace', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    const result = await r.resolve({ kind: 'manual', value: 1 });

    expect(result.value).toBe(1);
    expect(result.fromCache).toBe(false);
    expect(result.trace).toBe('manual: 1 days/wk');
  });

  it('appends the operator note to the trace when present', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    const result = await r.resolve({
      kind: 'manual',
      value: 2,
      note: 'block-release schedule',
    });

    expect(result.trace).toBe('manual: 2 days/wk — block-release schedule');
  });
});

describe('TrainingDaysResolver — placement-derived source', () => {
  const source: ValueSource = {
    kind: 'placement-derived',
    placementId: PLACEMENT_ID,
    field: 'training_days_per_week',
  };

  it('reads the value from the placement record', async () => {
    const fromPlacement = vi.fn(async () => 2);
    const r = new TrainingDaysResolver(makeDataAccess({ fromPlacement }));

    const result = await r.resolve(source);

    expect(result.value).toBe(2);
    expect(result.trace).toContain(PLACEMENT_ID);
    expect(fromPlacement).toHaveBeenCalledWith(PLACEMENT_ID);
  });

  it('throws when the placement has no training-days value', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    await expect(r.resolve(source)).rejects.toThrow(/has no training_days value/);
  });
});

describe('TrainingDaysResolver — trade-average source', () => {
  it('averages across the trade and tags the trace with the lookback window', async () => {
    const fromTradeAverage = vi.fn(async () => 2.5);
    const r = new TrainingDaysResolver(makeDataAccess({ fromTradeAverage }));

    const result = await r.resolve({
      kind: 'trade-average',
      tradeCode: 'CARP',
      lookbackMonths: 6,
    });

    expect(result.value).toBe(2.5);
    expect(result.warning).toBeUndefined();
    expect(result.trace).toContain('trade-avg(CARP, 6mo)');
    expect(fromTradeAverage).toHaveBeenCalledWith('CARP', {
      tenantId: undefined,
      lookbackMonths: 6,
    });
  });

  it('defaults the lookback window to 12 months in the trace', async () => {
    const r = new TrainingDaysResolver(
      makeDataAccess({ fromTradeAverage: vi.fn(async () => 3) }),
    );
    const result = await r.resolve({ kind: 'trade-average', tradeCode: 'CARP' });

    expect(result.trace).toContain('12mo');
  });

  it.each([
    ['below the plausible floor', 0.2],
    ['above the plausible ceiling', 6],
  ])('warns when the averaged value is %s', async (_label, value) => {
    const r = new TrainingDaysResolver(
      makeDataAccess({ fromTradeAverage: vi.fn(async () => value) }),
    );
    const result = await r.resolve({ kind: 'trade-average', tradeCode: 'CARP' });

    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('unusual training-days value');
  });

  it('does not warn for an in-range averaged value', async () => {
    const r = new TrainingDaysResolver(
      makeDataAccess({ fromTradeAverage: vi.fn(async () => 3) }),
    );
    const result = await r.resolve({ kind: 'trade-average', tradeCode: 'CARP' });

    expect(result.warning).toBeUndefined();
  });

  it('throws when the trade has no data', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'trade-average', tradeCode: 'CARP' }),
    ).rejects.toThrow(/no data for trade CARP/);
  });
});

describe('TrainingDaysResolver — trade-year-average source', () => {
  const source: ValueSource = {
    kind: 'trade-year-average',
    tradeCode: 'CARP',
    apprenticeYear: 3,
  };

  it('averages across trade and apprentice year', async () => {
    const fromTradeYearAverage = vi.fn(async () => 2);
    const r = new TrainingDaysResolver(makeDataAccess({ fromTradeYearAverage }));

    const result = await r.resolve(source);

    expect(result.value).toBe(2);
    expect(result.trace).toContain('trade-year-avg(CARP, Y3, 12mo)');
    expect(fromTradeYearAverage).toHaveBeenCalledWith('CARP', 3, {
      tenantId: undefined,
      lookbackMonths: undefined,
    });
  });

  it('throws when the trade-year combination has no data', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    await expect(r.resolve(source)).rejects.toThrow(/no data for trade CARP year 3/);
  });
});

describe('TrainingDaysResolver — tenant-preference and host-agreed', () => {
  it('resolves a tenant preference', async () => {
    const r = new TrainingDaysResolver(
      makeDataAccess({ fromTenantPreference: vi.fn(async () => 1) }),
    );
    const result = await r.resolve({
      kind: 'tenant-preference',
      preferenceKey: 'default_training_days',
    });

    expect(result.value).toBe(1);
    expect(result.trace).toContain('tenant-pref(default_training_days)');
  });

  it('throws when the tenant preference key is unset', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'tenant-preference', preferenceKey: 'default_training_days' }),
    ).rejects.toThrow(/preference key 'default_training_days' not set/);
  });

  it('resolves a host-agreed value from the placement contract', async () => {
    const r = new TrainingDaysResolver(
      makeDataAccess({ fromHostAgreement: vi.fn(async () => 1.5) }),
    );
    const result = await r.resolve({
      kind: 'host-agreed',
      placementId: PLACEMENT_ID,
      field: 'agreed_training_days',
    });

    expect(result.value).toBe(1.5);
    expect(result.trace).toContain('host-agreed');
  });

  it('throws when the host-agreed field is missing', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    await expect(
      r.resolve({
        kind: 'host-agreed',
        placementId: PLACEMENT_ID,
        field: 'agreed_training_days',
      }),
    ).rejects.toThrow(/agreement field 'agreed_training_days' missing/);
  });
});

describe('TrainingDaysResolver — inapplicable source', () => {
  it('throws "not applicable" for the live-api source kind', async () => {
    const r = new TrainingDaysResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'live-api', api: 'fair-work', params: {} }),
    ).rejects.toThrow(/not applicable to training-days/);
  });
});

describe('TrainingDaysResolver — caching', () => {
  const source: ValueSource = {
    kind: 'placement-derived',
    placementId: PLACEMENT_ID,
    field: 'training_days_per_week',
  };

  it('serves a repeat resolve from cache without re-fetching', async () => {
    const fromPlacement = vi.fn(async () => 2);
    const r = new TrainingDaysResolver(makeDataAccess({ fromPlacement }));

    const first = await r.resolve(source);
    const second = await r.resolve(source);

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(second.value).toBe(2);
    expect(fromPlacement).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after resetCache()', async () => {
    const fromPlacement = vi.fn(async () => 2);
    const r = new TrainingDaysResolver(makeDataAccess({ fromPlacement }));

    await r.resolve(source);
    r.resetCache();
    const afterReset = await r.resolve(source);

    expect(afterReset.fromCache).toBe(false);
    expect(fromPlacement).toHaveBeenCalledTimes(2);
  });

  it('never caches when cacheWithinRender is false', async () => {
    const fromPlacement = vi.fn(async () => 2);
    const r = new TrainingDaysResolver(makeDataAccess({ fromPlacement }), {
      cacheWithinRender: false,
    });

    const first = await r.resolve(source);
    const second = await r.resolve(source);

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(false);
    expect(fromPlacement).toHaveBeenCalledTimes(2);
  });
});
