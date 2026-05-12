import { describe, expect, it } from 'vitest';
import { normalizeResponsiveStyleCascade, resolveStyles } from '../utils/cascade.js';

describe('resolveStyles', () => {
  it('keeps legacy flat style objects as desktop styles', () => {
    const legacy = { color: '#111111', marginTop: 8 };
    const normalized = normalizeResponsiveStyleCascade(legacy);
    expect(normalized).toEqual({ desktop: legacy });
  });

  it('resolves desktop styles without overrides', () => {
    const out = resolveStyles(
      {
        desktop: { color: '#111111', marginTop: 8 },
        tablet: { marginTop: 12 },
        mobile: { color: '#222222' },
      },
      'desktop',
    );

    expect(out.styles).toEqual({ color: '#111111', marginTop: 8 });
    expect([...out.overriddenProperties]).toEqual([]);
  });

  it('resolves tablet cascade as desktop + tablet and tracks tablet overrides', () => {
    const out = resolveStyles(
      {
        desktop: { color: '#111111', marginTop: 8, padding: 20 },
        tablet: { marginTop: 12 },
        mobile: { color: '#222222' },
      },
      'tablet',
    );

    expect(out.styles).toEqual({ color: '#111111', marginTop: 12, padding: 20 });
    expect([...out.overriddenProperties]).toEqual(['marginTop']);
  });

  it('resolves mobile cascade as desktop + tablet + mobile and tracks only mobile overrides', () => {
    const out = resolveStyles(
      {
        desktop: { color: '#111111', marginTop: 8, padding: 20 },
        tablet: { marginTop: 12 },
        mobile: { color: '#222222' },
      },
      'mobile',
    );

    expect(out.styles).toEqual({ color: '#222222', marginTop: 12, padding: 20 });
    expect([...out.overriddenProperties]).toEqual(['color']);
  });
});
