import fs from 'node:fs';
import path from 'node:path';

export type AppKey =
  | 'bsu'
  | 'crm7'
  | 'conduit'
  | 'braden'
  | 'r80'
  | 'throughput'
  | 'shared';

/**
 * Map a `package.json` `name` field to the canonical {@link AppKey} used
 * throughout the rule + ownership map. Source of truth for each app's real
 * `name` field (verified against each repo's `package.json` 2026-07-17):
 * business-suite-unified, conduit, throughput use their directory name
 * verbatim; R80.3 is `r80-calculator`; braden is `braden-app`; crm7 is
 * `crm7-complete`. Any `@bsuite/*`-scoped package (the shared `packages/*`
 * workspace) maps to `shared`.
 */
const KNOWN_PACKAGE_NAMES: ReadonlyMap<string, AppKey> = new Map([
  ['business-suite-unified', 'bsu'],
  ['crm7-complete', 'crm7'],
  ['crm7', 'crm7'],
  ['conduit', 'conduit'],
  ['braden-app', 'braden'],
  ['r80-calculator', 'r80'],
  ['r80.3', 'r80'],
  ['throughput', 'throughput'],
]);

const VIRTUAL_FILENAMES = new Set(['<input>', '<text>', '']);

/**
 * Bounded walk memo — keyed by the resolved starting directory, NOT a bare
 * scalar. A bare-scalar cache lets the first file linted in a process pin
 * its answer for every subsequent file/app linted in the same process (the
 * exact failure class fixed in `@bsuite/eslint-config`'s
 * `isBradenSubmoduleFile` F1 — see `packages/eslint-config/rules/_shared.js`).
 */
const resultCache = new Map<string, AppKey | undefined>();

function hasGitMarker(dir: string): boolean {
  try {
    return fs.existsSync(path.join(dir, '.git'));
  } catch {
    return false;
  }
}

function findNearestPackageJson(startDir: string): string | null {
  let dir = startDir;
  // Bounded walk: stop at the first repo root (a `.git` marker — file or
  // directory, so git-worktree checkouts where `.git` is a file pointing at
  // the real gitdir are covered) so a checkout with no package.json at its
  // own root can never escape into an unrelated ancestor directory (e.g. a
  // contributor's $HOME). Also capped at 20 levels as a hard backstop.
  for (let i = 0; i < 20; i++) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) return candidate;
    if (hasGitMarker(dir)) break;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Detect the BSuite app a source file belongs to from its absolute path.
 *
 * bsuite#1623: the previous implementation matched path SEGMENTS (anchored
 * on a `bsuite/` marker, else a right-to-left scan) rather than reading each
 * app's own `package.json`. That strategy assumes the checkout directory is
 * literally named after the app — false for the platform's standard
 * `git worktree add /home/<user>/Desktop/Dev/<app>-<feature>-worktree`
 * convention, where the worktree is a SIBLING of `bsuite/` (no `bsuite/`
 * marker segment at all) and its directory name doesn't equal any entry in
 * the segment map. The right-to-left fallback then scanned past the
 * worktree name and matched the contributor's own home-directory segment
 * (`/home/braden/...` -> `braden`) — misattributing every file in the
 * worktree to the `braden` app.
 *
 * Fix: anchor on a filesystem walk from the FILE's own directory (not any
 * string-matching against the full absolute path), bounded at the first
 * `.git` marker, reading the app's own `package.json` `name` field as the
 * authoritative signal. This is immune to worktree directory naming, CI
 * checkout paths, and contributor home directories simultaneously, because
 * it never inspects path segments outside the file's own repo root.
 *
 * Returns `undefined` for files outside any known app (or with no resolvable
 * `package.json`) so the rule no-ops rather than misattribute writes — fail
 * closed, matching `isBradenSubmoduleFile`'s safety invariant.
 */
export function detectAppFromPath(filename: string): AppKey | undefined {
  if (!filename || VIRTUAL_FILENAMES.has(filename)) return undefined;

  const startDir = path.dirname(filename);
  if (resultCache.has(startDir)) return resultCache.get(startDir);

  let result: AppKey | undefined;
  try {
    const pkgPath = findNearestPackageJson(startDir);
    if (!pkgPath) {
      result = undefined;
    } else {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: unknown };
      const name = typeof pkg.name === 'string' ? pkg.name.toLowerCase() : undefined;
      if (name && KNOWN_PACKAGE_NAMES.has(name)) {
        result = KNOWN_PACKAGE_NAMES.get(name);
      } else if (name && name.startsWith('@bsuite/')) {
        result = 'shared';
      } else {
        result = undefined;
      }
    }
  } catch {
    // Fail closed: "unknown app" just means the rule no-ops for this file,
    // which is always safe. A false positive attribution is not.
    result = undefined;
  }

  resultCache.set(startDir, result);
  return result;
}

// Test-only: allows the test suite to reset memoisation between cases so
// fixture directories created per-test don't bleed into each other's cache.
export function _resetAppDetectionCacheForTests(): void {
  resultCache.clear();
}
