import { sep } from 'node:path';

export type AppKey =
  | 'bsu'
  | 'crm7'
  | 'conduit'
  | 'braden'
  | 'r80'
  | 'throughput'
  | 'shared';

/**
 * Map filesystem path segments / package directory names to ownership-map app keys.
 * The values are the canonical {@link AppKey}s used throughout the rule + ownership map.
 */
const PATH_SEGMENT_TO_APP: ReadonlyArray<readonly [string, AppKey]> = [
  ['business-suite-unified', 'bsu'],
  ['business_suite_unified', 'bsu'],
  ['bsu', 'bsu'],
  ['crm7', 'crm7'],
  ['conduit', 'conduit'],
  ['braden', 'braden'],
  ['r80.3', 'r80'],
  ['r80', 'r80'],
  ['r8', 'r80'],
  ['throughput', 'throughput'],
];

/**
 * Marker segments that anchor "this is where the BSuite repo starts". When
 * present, app detection only considers path segments AFTER this marker.
 * Without this anchor a path like `/home/braden/Desktop/Dev/bsuite/crm7/src`
 * would falsely match `braden` (the user-home segment) before `crm7`.
 */
const REPO_ROOT_MARKERS = new Set(['bsuite']);

/**
 * Detect the BSuite app a source file belongs to from its absolute path.
 *
 * The lint rule needs to know which app is making a write so it can compare
 * to the ownership map. Detection strategy:
 *
 * 1. If a `bsuite/` segment is present anywhere in the path, only consider
 *    segments that come AFTER it. This avoids false matches from
 *    user-home directories (`/home/braden/...`) or unrelated paths.
 * 2. Walk the (possibly trimmed) segments left-to-right, returning the
 *    FIRST matching app — that's the deepest app-root directory the file
 *    sits under.
 * 3. As a fallback (no `bsuite/` marker — e.g. when ESLint is invoked from
 *    a single-app repo on Vercel), walk RIGHT-TO-LEFT so the closest
 *    enclosing app directory wins, and segments earlier in the path
 *    (like a user-home directory) cannot trigger a false match.
 *
 * Returns `undefined` for files outside any known app so the rule no-ops
 * rather than misattribute writes.
 */
export function detectAppFromPath(filename: string): AppKey | undefined {
  if (!filename) return undefined;
  const allSegments = filename.split(sep);

  // Anchor on `bsuite/` if present — only inspect what comes after.
  const markerIdx = allSegments.findIndex((s) => REPO_ROOT_MARKERS.has(s.toLowerCase()));
  const candidateSegments = markerIdx >= 0 ? allSegments.slice(markerIdx + 1) : allSegments;

  if (markerIdx >= 0) {
    // Strict mode: app dir is the immediate child of `bsuite/`. Only check
    // the first segment to avoid nested misattribution
    // (e.g. `bsuite/crm7/.../node_modules/something/braden/...`).
    const first = candidateSegments[0]?.toLowerCase();
    if (!first) return undefined;
    for (const [needle, app] of PATH_SEGMENT_TO_APP) {
      if (first === needle) return app;
    }
    return undefined;
  }

  // Fallback: scan right-to-left so the closest enclosing app dir wins.
  for (let i = candidateSegments.length - 1; i >= 0; i--) {
    const normalised = candidateSegments[i]!.toLowerCase();
    for (const [needle, app] of PATH_SEGMENT_TO_APP) {
      if (normalised === needle) return app;
    }
  }
  return undefined;
}
