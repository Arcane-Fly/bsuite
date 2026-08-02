import { describe, it, expect, vi } from 'vitest';
import { WageResolver } from '../../resolvers/wage.js';
import type { WageDataAccess } from '../../resolvers/wage.js';
import type { ValueSource } from '../../sources.js';

/** ISO timestamp `days` days before now — for stale-rate assertions. */
const isoDaysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString();

/** A fully-stubbed WageDataAccess; tests override only the methods they exercise. */
function makeDataAccess(overrides: Partial<WageDataAccess> = {}): WageDataAccess {
  return {
    fromFairWork: vi.fn(async () => null),
    fromEnterpriseAgreement: vi.fn(async () => null),
    fromTenantPreference: vi.fn(async () => null),
    fromHostAgreement: vi.fn(async () => null),
    ...overrides,
  };
}

const PLACEMENT_ID = '11111111-1111-4111-8111-111111111111';

describe('WageResolver — manual source', () => {
  it('returns the typed-in value with a $/hr trace', async () => {
    const r = new WageResolver(makeDataAccess());
    const result = await r.resolve({ kind: 'manual', value: 31.5 });

    expect(result.value).toBe(31.5);
    expect(result.fromCache).toBe(false);
    expect(result.warning).toBeUndefined();
    expect(result.trace).toBe('manual: $31.50/hr');
    expect(result.resolvedAt).toBeInstanceOf(Date);
  });

  it('appends the operator note to the trace when present', async () => {
    const r = new WageResolver(makeDataAccess());
    const result = await r.resolve({
      kind: 'manual',
      value: 40,
      note: 'paying above award',
    });

    expect(result.trace).toBe('manual: $40.00/hr — paying above award');
  });
});

describe('WageResolver — live-api fair-work', () => {
  const source: ValueSource = {
    kind: 'live-api',
    api: 'fair-work',
    params: { awardCode: 'MA000025', classification: 'Electrical worker Y1' },
  };

  it('resolves an FWC Modern Award rate and passes through asOfDate', async () => {
    const fromFairWork = vi.fn(async () => ({
      rate: 24.61,
      effectiveDate: isoDaysAgo(10),
      sourceUrl: 'https://fwc.example/MA000025',
    }));
    const r = new WageResolver(makeDataAccess({ fromFairWork }));

    const result = await r.resolve({ ...source, asOfDate: '2026-04-01' });

    expect(result.value).toBe(24.61);
    expect(result.fromCache).toBe(false);
    expect(result.warning).toBeUndefined();
    expect(result.trace).toContain('fair-work(MA000025/Electrical worker Y1)');
    expect(result.trace).toContain('$24.61/hr');
    expect(fromFairWork).toHaveBeenCalledWith({
      awardCode: 'MA000025',
      classification: 'Electrical worker Y1',
      asOfDate: '2026-04-01',
    });
  });

  it('surfaces a stale-rate warning when the effective date is past the threshold', async () => {
    const fromFairWork = vi.fn(async () => ({
      rate: 22.0,
      effectiveDate: isoDaysAgo(200),
    }));
    const r = new WageResolver(makeDataAccess({ fromFairWork }));

    const result = await r.resolve(source);

    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('days old');
  });

  it('honours a custom staleAfterDays threshold', async () => {
    const fromFairWork = vi.fn(async () => ({
      rate: 22.0,
      effectiveDate: isoDaysAgo(10),
    }));
    const strict = new WageResolver(makeDataAccess({ fromFairWork }), {
      staleAfterDays: 5,
    });
    const lenient = new WageResolver(makeDataAccess({ fromFairWork }));

    expect((await strict.resolve(source)).warning).toBeDefined();
    expect((await lenient.resolve(source)).warning).toBeUndefined();
  });

  it('throws when awardCode is missing', async () => {
    const r = new WageResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'live-api', api: 'fair-work', params: { classification: 'EW Y1' } }),
    ).rejects.toThrow(/missing required params/);
  });

  it('throws when classification is missing', async () => {
    const r = new WageResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'live-api', api: 'fair-work', params: { awardCode: 'MA000025' } }),
    ).rejects.toThrow(/missing required params/);
  });

  it('throws when the data source has no matching rate', async () => {
    const r = new WageResolver(makeDataAccess({ fromFairWork: vi.fn(async () => null) }));
    await expect(r.resolve(source)).rejects.toThrow(/no rate for MA000025/);
  });
});

describe('WageResolver — live-api enterprise-agreement', () => {
  const source: ValueSource = {
    kind: 'live-api',
    api: 'enterprise-agreement',
    params: { agreementId: 'ea-7', classification: 'Level 3' },
  };

  it('resolves an EA rate with an EA-tagged trace', async () => {
    const fromEnterpriseAgreement = vi.fn(async () => ({
      rate: 38.4,
      effectiveDate: isoDaysAgo(5),
    }));
    const r = new WageResolver(makeDataAccess({ fromEnterpriseAgreement }));

    const result = await r.resolve(source);

    expect(result.value).toBe(38.4);
    expect(result.trace).toContain('EA(ea-7/Level 3)');
    expect(fromEnterpriseAgreement).toHaveBeenCalledWith({
      agreementId: 'ea-7',
      classification: 'Level 3',
      asOfDate: undefined,
    });
  });

  it('throws when agreementId is missing', async () => {
    const r = new WageResolver(makeDataAccess());
    await expect(
      r.resolve({
        kind: 'live-api',
        api: 'enterprise-agreement',
        params: { classification: 'Level 3' },
      }),
    ).rejects.toThrow(/missing required params/);
  });

  it('throws when the EA has no matching rate', async () => {
    const r = new WageResolver(makeDataAccess());
    await expect(r.resolve(source)).rejects.toThrow(/no rate for ea-7/);
  });
});

describe('WageResolver — unsupported and inapplicable sources', () => {
  it('throws on the custom live-api kind (not wired in 0.4.0)', async () => {
    const r = new WageResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'live-api', api: 'custom', params: {} }),
    ).rejects.toThrow(/unsupported api 'custom'/);
  });

  it.each(['placement-derived', 'trade-average', 'trade-year-average'] as const)(
    'throws "not applicable" for the %s source kind',
    async (kind) => {
      const r = new WageResolver(makeDataAccess());
      const source =
        kind === 'placement-derived'
          ? { kind, placementId: PLACEMENT_ID, field: 'agreed_wage' }
          : kind === 'trade-average'
            ? { kind, tradeCode: 'ELEC' }
            : { kind, tradeCode: 'ELEC', apprenticeYear: 2 };
      await expect(r.resolve(source as ValueSource)).rejects.toThrow(/not applicable to wage/);
    },
  );
});

describe('WageResolver — tenant-preference and host-agreed', () => {
  it('resolves a tenant preference', async () => {
    const r = new WageResolver(
      makeDataAccess({ fromTenantPreference: vi.fn(async () => 33) }),
    );
    const result = await r.resolve({ kind: 'tenant-preference', preferenceKey: 'default_wage' });

    expect(result.value).toBe(33);
    expect(result.trace).toContain('tenant-pref(default_wage)');
  });

  it('throws when the tenant preference key is unset', async () => {
    const r = new WageResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'tenant-preference', preferenceKey: 'default_wage' }),
    ).rejects.toThrow(/preference key 'default_wage' not set/);
  });

  it('resolves a host-agreed wage from the placement contract', async () => {
    const r = new WageResolver(
      makeDataAccess({ fromHostAgreement: vi.fn(async () => 35.75) }),
    );
    const result = await r.resolve({
      kind: 'host-agreed',
      placementId: PLACEMENT_ID,
      field: 'agreed_wage',
    });

    expect(result.value).toBe(35.75);
    expect(result.trace).toContain('host-agreed');
  });

  it('throws when the host-agreed field is missing', async () => {
    const r = new WageResolver(makeDataAccess());
    await expect(
      r.resolve({ kind: 'host-agreed', placementId: PLACEMENT_ID, field: 'agreed_wage' }),
    ).rejects.toThrow(/agreement field 'agreed_wage' missing/);
  });
});

describe('WageResolver — caching', () => {
  const source: ValueSource = {
    kind: 'live-api',
    api: 'fair-work',
    params: { awardCode: 'MA000025', classification: 'EW Y1' },
  };

  it('serves a repeat resolve from cache without re-fetching', async () => {
    const fromFairWork = vi.fn(async () => ({ rate: 24, effectiveDate: isoDaysAgo(1) }));
    const r = new WageResolver(makeDataAccess({ fromFairWork }));

    const first = await r.resolve(source);
    const second = await r.resolve(source);

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(second.value).toBe(24);
    expect(fromFairWork).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after resetCache()', async () => {
    const fromFairWork = vi.fn(async () => ({ rate: 24, effectiveDate: isoDaysAgo(1) }));
    const r = new WageResolver(makeDataAccess({ fromFairWork }));

    await r.resolve(source);
    r.resetCache();
    const afterReset = await r.resolve(source);

    expect(afterReset.fromCache).toBe(false);
    expect(fromFairWork).toHaveBeenCalledTimes(2);
  });

  it('never caches when cacheWithinRender is false', async () => {
    const fromFairWork = vi.fn(async () => ({ rate: 24, effectiveDate: isoDaysAgo(1) }));
    const r = new WageResolver(makeDataAccess({ fromFairWork }), {
      cacheWithinRender: false,
    });

    const first = await r.resolve(source);
    const second = await r.resolve(source);

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(false);
    expect(fromFairWork).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed resolve', async () => {
    const fromFairWork = vi
      .fn<WageDataAccess['fromFairWork']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ rate: 26, effectiveDate: isoDaysAgo(1) });
    const r = new WageResolver(makeDataAccess({ fromFairWork }));

    await expect(r.resolve(source)).rejects.toThrow(/no rate/);
    const recovered = await r.resolve(source);

    expect(recovered.value).toBe(26);
    expect(recovered.fromCache).toBe(false);
  });
});
