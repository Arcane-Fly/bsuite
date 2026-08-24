import { describe, it, expect } from 'vitest';
import { buildAppLaunchUrl, buildLaunchUrl } from '../launchUrl.js';
import { BSUITE_APP_KEYS, BSUITE_APP_LANDING_PATHS, isBSuiteAppKey } from '../apps.js';
import { sanitizeReturnPath } from '../sanitizeReturnPath.js';

/**
 * buildLaunchUrl is the canonical cross-app handoff URL builder. Every
 * launcher in every BSuite app (AppSwitcher, AppLauncherTile,
 * UnifiedDashboard quick-launch buttons, header nav) must produce URLs
 * via this helper or via a thin alias over it. See launchUrl.ts header.
 *
 * Contract:
 *   - Returns `${base}/auth/login?return_path=<encoded>` for every input.
 *   - Trims trailing slashes off base (single, multiple).
 *   - URL-encodes the return_path query value (must survive
 *     sanitizeReturnPath on every destination).
 *   - Defaults return_path to `/dashboard` when omitted.
 */
describe('buildLaunchUrl', () => {
  it('appends /auth/login?return_path=%2Fdashboard by default', () => {
    expect(buildLaunchUrl('https://crm.crm7.app')).toBe(
      'https://crm.crm7.app/auth/login?return_path=%2Fdashboard',
    );
  });

  it('honours a custom return_path and URL-encodes it', () => {
    expect(buildLaunchUrl('https://crm.crm7.app', '/admin/users')).toBe(
      'https://crm.crm7.app/auth/login?return_path=%2Fadmin%2Fusers',
    );
  });

  it('trims a single trailing slash off appBaseUrl', () => {
    expect(buildLaunchUrl('https://r8.crm7.app/')).toBe(
      'https://r8.crm7.app/auth/login?return_path=%2Fdashboard',
    );
  });

  it('trims multiple trailing slashes off appBaseUrl', () => {
    expect(buildLaunchUrl('https://r8.crm7.app///')).toBe(
      'https://r8.crm7.app/auth/login?return_path=%2Fdashboard',
    );
  });

  it('preserves query-unsafe chars in return_path via encodeURIComponent', () => {
    expect(buildLaunchUrl('https://crm.crm7.app', '/search?q=a b&x=1')).toBe(
      'https://crm.crm7.app/auth/login?return_path=%2Fsearch%3Fq%3Da%20b%26x%3D1',
    );
  });

  it('works against localhost dev URLs', () => {
    expect(buildLaunchUrl('http://localhost:5173')).toBe(
      'http://localhost:5173/auth/login?return_path=%2Fdashboard',
    );
  });

  it('preserves inner double slashes in paths but trims trailing', () => {
    // Sanity: the regex anchor `/+$` only matches at end of string.
    expect(buildLaunchUrl('https://app.example.com//api//foo/')).toBe(
      'https://app.example.com//api//foo/auth/login?return_path=%2Fdashboard',
    );
  });
});

/**
 * buildAppLaunchUrl — the front-door builder.
 *
 * These assertions are the regression guard for the 2026-08-24 report: BSU's
 * sidebar "R8 Calculator" row completed its OAuth round trip and then landed on
 * R80.4's not-found page, because the generic `/dashboard` default is a path
 * only two of the six apps serve.
 *
 * A test that asserted `buildAppLaunchUrl('r8', …)` returns `/dashboard` would
 * lock in the bug it was named to protect against, so these assert the
 * DESTINATION'S OWN route in each case, per BSUITE_APP_LANDING_PATHS.
 */
describe('buildAppLaunchUrl', () => {
  it('lands an R8 launch on the calculator, not the non-existent /dashboard', () => {
    expect(buildAppLaunchUrl('r8', 'https://r8.crm7.app')).toBe(
      'https://r8.crm7.app/auth/login?return_path=%2F',
    );
  });

  it('still lands crm7 and bsu on /dashboard, which they do serve', () => {
    expect(buildAppLaunchUrl('crm7', 'https://crm.crm7.app')).toBe(
      'https://crm.crm7.app/auth/login?return_path=%2Fdashboard',
    );
    expect(buildAppLaunchUrl('bsu', 'https://suite.crm7.app')).toBe(
      'https://suite.crm7.app/auth/login?return_path=%2Fdashboard',
    );
  });

  it('lands conduit and throughput on / rather than bouncing off their catch-all route', () => {
    expect(buildAppLaunchUrl('conduit', 'https://conduit.crm7.app')).toBe(
      'https://conduit.crm7.app/auth/login?return_path=%2F',
    );
    expect(buildAppLaunchUrl('throughput', 'https://ideas.crm7.app')).toBe(
      'https://ideas.crm7.app/auth/login?return_path=%2F',
    );
  });

  it("lands braden on its own /auth/login default", () => {
    expect(buildAppLaunchUrl('braden', 'https://www.braden.com.au')).toBe(
      'https://www.braden.com.au/auth/login?return_path=%2Fadmin%2Fbranding',
    );
  });

  it('honours an explicit deep-link path over the app default', () => {
    expect(buildAppLaunchUrl('r8', 'https://r8.crm7.app', '/calculate')).toBe(
      'https://r8.crm7.app/auth/login?return_path=%2Fcalculate',
    );
  });

  it('trims trailing slashes exactly as buildLaunchUrl does', () => {
    expect(buildAppLaunchUrl('r8', 'https://r8.crm7.app///')).toBe(
      'https://r8.crm7.app/auth/login?return_path=%2F',
    );
  });
});

describe('BSUITE_APP_LANDING_PATHS', () => {
  it('covers every app key — a new app cannot ship without declaring where it opens', () => {
    for (const key of BSUITE_APP_KEYS) {
      expect(BSUITE_APP_LANDING_PATHS[key], `landing path for ${key}`).toBeTruthy();
    }
    expect(Object.keys(BSUITE_APP_LANDING_PATHS).sort()).toEqual([...BSUITE_APP_KEYS].sort());
  });

  it('declares a same-origin absolute path for every app', () => {
    // Every value is fed to `sanitizeReturnPath` on arrival. Anything that
    // fails that filter is silently swapped for the destination's own default,
    // which would make this map look effective while doing nothing.
    for (const [key, path] of Object.entries(BSUITE_APP_LANDING_PATHS)) {
      expect(sanitizeReturnPath(path, '/sentinel'), `${key} survives sanitizeReturnPath`).toBe(path);
    }
  });

  it('narrows only real app keys', () => {
    expect(isBSuiteAppKey('r8')).toBe(true);
    expect(isBSuiteAppKey('not-an-app')).toBe(false);
  });
});
