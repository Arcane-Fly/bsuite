import { describe, it, expect } from 'vitest';
import { isActivePath, isSectionActive } from './utils';

describe('isActivePath', () => {
  it('exact match', () => {
    expect(isActivePath('/jobs', '/jobs')).toBe(true);
  });

  it('prefix match (child route)', () => {
    expect(isActivePath('/jobs/1', '/jobs')).toBe(true);
  });

  it('no false prefix on word boundary', () => {
    expect(isActivePath('/jobs-old', '/jobs')).toBe(false);
  });

  it('root path does not match all routes', () => {
    expect(isActivePath('/dashboard', '/')).toBe(false);
  });

  it('root path exact match', () => {
    expect(isActivePath('/', '/')).toBe(true);
  });

  it('empty itemHref never matches', () => {
    expect(isActivePath('/anything', '')).toBe(false);
  });

  it('trailing slash on currentPath', () => {
    expect(isActivePath('/jobs/', '/jobs')).toBe(true);
  });

  it('trailing slash on itemHref', () => {
    expect(isActivePath('/jobs', '/jobs/')).toBe(true);
  });

  it('both trailing slashes', () => {
    expect(isActivePath('/jobs/', '/jobs/')).toBe(true);
  });

  it('completely different paths', () => {
    expect(isActivePath('/settings', '/jobs')).toBe(false);
  });
});

describe('isSectionActive', () => {
  it('active when section href matches', () => {
    expect(
      isSectionActive('/jobs', { href: '/jobs', groups: undefined }),
    ).toBe(true);
  });

  it('active when any group item matches', () => {
    expect(
      isSectionActive('/jobs/1', {
        href: undefined,
        groups: [[{ label: 'Jobs', href: '/jobs' }]],
      }),
    ).toBe(true);
  });

  it('inactive when nothing matches', () => {
    expect(
      isSectionActive('/settings', { href: '/jobs', groups: undefined }),
    ).toBe(false);
  });

  it('inactive with no href and no groups', () => {
    expect(
      isSectionActive('/anything', { href: undefined, groups: undefined }),
    ).toBe(false);
  });
});
