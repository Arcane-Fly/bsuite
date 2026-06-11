import { describe, expect, it } from 'vitest';
import { buildNavOverlay } from './useTenantNavigation.js';

describe('buildNavOverlay (bsuite#1506 — live tenant_navigation row shape)', () => {
  it('returns null for no rows (callers keep static nav)', () => {
    expect(buildNavOverlay([])).toBeNull();
  });

  it('maps one row per section: section_label → label, items → single group', () => {
    const cfg = buildNavOverlay([
      {
        section_label: 'Custom Tools',
        items: [
          { label: 'Wage Checker', href: '/tools/wage-checker' },
          { label: 'External', href: 'https://example.com', external: true },
        ],
        sort_order: 1,
      },
    ]);
    expect(cfg).not.toBeNull();
    expect(cfg!.sections).toHaveLength(1);
    expect(cfg!.sections[0].label).toBe('Custom Tools');
    expect(cfg!.sections[0].groups).toHaveLength(1);
    expect(cfg!.sections[0].groups![0]).toHaveLength(2);
    expect(cfg!.sections[0].groups![0][0].href).toBe('/tools/wage-checker');
  });

  it('orders sections by sort_order and drops malformed/empty rows', () => {
    const cfg = buildNavOverlay([
      { section_label: 'B', items: [{ label: 'b', href: '/b' }], sort_order: 2 },
      { section_label: 'A', items: [{ label: 'a', href: '/a' }], sort_order: 1 },
      { section_label: '', items: [{ label: 'x', href: '/x' }], sort_order: 0 },
      { section_label: 'Empty', items: [], sort_order: 3 },
      { section_label: 'Bad', items: [{ nope: true }], sort_order: 4 },
      { section_label: null, items: 'garbage', sort_order: 5 },
    ]);
    expect(cfg!.sections.map((s) => s.label)).toEqual(['A', 'B']);
  });

  it('synthesizes a type-satisfying placeholder app identity (merge keeps base.app)', () => {
    const cfg = buildNavOverlay([
      { section_label: 'S', items: [{ label: 'i', href: '/i' }], sort_order: 0 },
    ]);
    expect(cfg!.app.homeHref).toBe('/');
  });
});
