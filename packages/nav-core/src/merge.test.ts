import { describe, expect, it } from 'vitest';
import { mergeNavConfigs } from './merge.js';
import type { NavConfig, NavSection, IconComponent } from './types.js';

// Minimal stub icon — satisfies NavSection's required icon field
const stubIcon: IconComponent = () => null;

// Factory helpers — adapted to actual NavSection shape (groups?: NavItemGroup[])
function makeSection(label: string, groups?: NavSection['groups']): NavSection {
  return { label, icon: stubIcon, groups };
}

function makeConfig(sections: NavSection[]): NavConfig {
  return {
    app: { name: 'Test App', shortName: 'TA', homeHref: '/' },
    sections,
  };
}

describe('mergeNavConfigs', () => {
  it('returns base unchanged (same reference) when overlay is null', () => {
    const base = makeConfig([makeSection('Main', [[{ label: 'Dashboard', href: '/' }]])]);
    const result = mergeNavConfigs(base, null);
    expect(result).toBe(base); // Same reference — no copy
  });

  it('returns base unchanged (same reference) when overlay is undefined', () => {
    const base = makeConfig([makeSection('Main', [])]);
    const result = mergeNavConfigs(base, undefined);
    expect(result).toBe(base);
  });

  it('returns base unchanged (same reference) when overlay has empty sections', () => {
    const base = makeConfig([makeSection('Main', [[{ label: 'A', href: '/a' }]])]);
    const result = mergeNavConfigs(base, makeConfig([]));
    expect(result).toBe(base);
  });

  it('appends overlay groups to matching static section', () => {
    const base = makeConfig([
      makeSection('Main', [[{ label: 'Dashboard', href: '/' }]]),
    ]);
    const overlay = makeConfig([
      makeSection('Main', [[{ label: 'Custom Page', href: '/custom' }]]),
    ]);
    const result = mergeNavConfigs(base, overlay);
    // Section 0 should now have 2 groups
    expect(result.sections[0].groups).toHaveLength(2);
    expect(result.sections[0].groups![0][0].label).toBe('Dashboard'); // static first
    expect(result.sections[0].groups![1][0].label).toBe('Custom Page'); // overlay appended
  });

  it('appends new overlay sections after static sections', () => {
    const base = makeConfig([makeSection('Main', [])]);
    const overlay = makeConfig([
      makeSection('Custom', [[{ label: 'Extra', href: '/extra' }]]),
    ]);
    const result = mergeNavConfigs(base, overlay);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].label).toBe('Main');   // static first
    expect(result.sections[1].label).toBe('Custom'); // new overlay appended
  });

  it('does not mutate base config', () => {
    const base = makeConfig([
      makeSection('Main', [[{ label: 'A', href: '/a' }]]),
    ]);
    const originalGroupCount = base.sections[0].groups!.length;
    const overlay = makeConfig([
      makeSection('Main', [[{ label: 'B', href: '/b' }]]),
    ]);
    mergeNavConfigs(base, overlay);
    expect(base.sections[0].groups).toHaveLength(originalGroupCount); // base not mutated
  });

  it('handles multiple matching and new sections', () => {
    const base = makeConfig([
      makeSection('Main', [[{ label: 'A', href: '/a' }]]),
      makeSection('Admin', [[{ label: 'B', href: '/b' }]]),
    ]);
    const overlay = makeConfig([
      makeSection('Admin', [[{ label: 'C', href: '/c' }]]),
      makeSection('Custom', [[{ label: 'D', href: '/d' }]]),
    ]);
    const result = mergeNavConfigs(base, overlay);
    expect(result.sections).toHaveLength(3);
    expect(result.sections[1].groups).toHaveLength(2); // Admin: [B] + [C]
    expect(result.sections[2].label).toBe('Custom');   // New section appended
  });

  it('handles sections with no groups (undefined) in base', () => {
    const base = makeConfig([makeSection('Main')]);
    const overlay = makeConfig([
      makeSection('Main', [[{ label: 'New', href: '/new' }]]),
    ]);
    const result = mergeNavConfigs(base, overlay);
    expect(result.sections[0].groups).toHaveLength(1);
    expect(result.sections[0].groups![0][0].label).toBe('New');
  });

  it('preserves app metadata from base', () => {
    const base = makeConfig([makeSection('Main', [])]);
    const overlay = makeConfig([makeSection('Extra', [])]);
    const result = mergeNavConfigs(base, overlay);
    expect(result.app.name).toBe('Test App');
    expect(result.app.shortName).toBe('TA');
  });
});
