import { describe, it, expect } from 'vitest';
import { buildLaunchUrl } from '../launchUrl';

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
