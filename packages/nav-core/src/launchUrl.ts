import { BSUITE_APP_LANDING_PATHS, type BSuiteAppKey } from './apps.js'

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
 * WHICH HELPER TO USE
 * ───────────────────
 * `buildAppLaunchUrl(key, url)` when you are linking to an app's FRONT DOOR —
 * a sidebar suite link, an app switcher row, a launcher tile. It reads the
 * destination's landing path from `BSUITE_APP_LANDING_PATHS` so the caller
 * cannot get it wrong.
 *
 * `buildLaunchUrl(url, path)` when you are linking to a SPECIFIC PAGE — a deep
 * link into a record, a manual, an idea. The path is the point of the link.
 *
 * `buildLaunchUrl(url)` with no path defaults to `/dashboard`, which is
 * correct for bsu and crm7 and WRONG for the other four apps (see
 * `BSUITE_APP_LANDING_PATHS` for what that cost). The default is retained only
 * so existing deep-link callers keep compiling; new front-door callers should
 * use `buildAppLaunchUrl`.
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

/**
 * Front-door launch URL for a known BSuite app.
 *
 * Identical to `buildLaunchUrl` except the default `return_path` comes from the
 * DESTINATION rather than from the caller's guess — see
 * `BSUITE_APP_LANDING_PATHS` for why the caller's guess was wrong four times
 * out of six.
 *
 * `returnPath` may still be passed explicitly to deep-link into the destination;
 * the app key then only selects the fallback.
 *
 * @example
 *   buildAppLaunchUrl('r8', 'https://r8.crm7.app')
 *   // -> 'https://r8.crm7.app/auth/login?return_path=%2F'
 *
 *   buildAppLaunchUrl('crm7', 'https://crm.crm7.app')
 *   // -> 'https://crm.crm7.app/auth/login?return_path=%2Fdashboard'
 */
export function buildAppLaunchUrl(
  appKey: BSuiteAppKey,
  appUrl: string,
  returnPath: string = BSUITE_APP_LANDING_PATHS[appKey],
): string {
  return buildLaunchUrl(appUrl, returnPath);
}
