/**
 * Cross-app sign-in handoff URL builder — single source of truth for
 * navigating from one BSuite app to another while preserving the user's
 * authentication state.
 *
 * Background
 * ──────────
 * Per AUTH_CANONICAL.md (2025-02-27), each BSuite app maintains its own
 * isolated Supabase session under a per-app localStorage key
 * (`sb-bsu-auth`, `sb-crm7-auth`, etc.). There is NO shared cookie scoped
 * to `.crm7.app` — that scheme was deprecated.
 *
 * Consequence
 * ───────────
 * A bare `<a href={appUrl}>` link from one BSuite app to another lands the
 * user on the destination's logged-out marketing/landing page, even when
 * they have a valid suite-wide session, because the destination origin
 * has no token under its own per-app storage key.
 *
 * Fix
 * ───
 * Route every cross-app launcher through `<appUrl>/auth/login?
 * return_path=<encoded path>`. The destination's `/auth/login` entry
 * point — present on every BSuite app (crm7, conduit, R80.3,
 * business-suite-unified, throughput, braden) — auto-fires
 * `signInWithBusinessSuite()` from `@bsuite/auth`. The OAuth Server
 * recognises the user's existing suite session, returns an authorization
 * code immediately (no consent prompt if previously granted), and the
 * destination's `/auth/callback` exchanges it into a per-app session
 * before navigating to `return_path`.
 *
 * `buildLaunchUrl` is the canonical helper. App-level wrappers (such as
 * `business-suite-unified/src/lib/supabase.ts::getCrossAppLoginUrl` and
 * `business-suite-unified/src/components/portal/AppLauncherTile.tsx::buildLaunchUrl`)
 * MUST delegate to this implementation — see the `dedupe` PR for the
 * single-source-of-truth rationale.
 *
 * @example
 *   buildLaunchUrl('https://crm.crm7.app')
 *   // -> 'https://crm.crm7.app/auth/login?return_path=%2Fdashboard'
 *
 *   buildLaunchUrl('https://crm.crm7.app/', '/admin/users')
 *   // -> 'https://crm.crm7.app/auth/login?return_path=%2Fadmin%2Fusers'
 */
export function buildLaunchUrl(
  appUrl: string,
  returnPath: string = '/dashboard',
): string {
  // Trim any trailing slashes so we never produce `//auth/login`. The regex
  // is anchored to the end (`/+$`) so an inner `//` in a path stays intact.
  const base = appUrl.replace(/\/+$/, '');
  return `${base}/auth/login?return_path=${encodeURIComponent(returnPath)}`;
}
