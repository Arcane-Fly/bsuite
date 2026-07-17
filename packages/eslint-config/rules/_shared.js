/**
 * Shared helpers for @bsuite/eslint-config rules.
 *
 * isBradenSubmoduleFile — bug found 2026-07-17, fixed here + propagated to
 * every consumer (crm7 inline copy + the 5 sibling repos' local copies).
 *
 * BACKGROUND: this rule (and its siblings, e.g. no-text-white.js) exempt the
 * `braden` submodule — Corporate Red/Gold brand, not D2C — from theme-token
 * enforcement. The ORIGINAL exemption check was a naive absolute-path
 * substring match against the file being linted:
 *
 *   filename.includes('/braden/')
 *
 * This is a false-positive trap on TWO independent axes:
 *
 * 1. It matches ANY absolute path containing "/braden/" anywhere, including
 *    a contributor's own home directory (`/home/braden/Desktop/Dev/crm7/
 *    src/App.tsx` contains "/braden/" from `/home/braden/`, nothing to do
 *    with the actual braden submodule). In that environment ALL rules using
 *    this pattern silently exempted EVERY file in EVERY app.
 * 2. A path-anchor fix (e.g. requiring "braden" as the app-root segment
 *    immediately after a `bsuite/` marker, or a right-to-left scan) is
 *    ALSO unsafe: this platform's standard workflow checks each app out
 *    into a dedicated git worktree as a SIBLING of `bsuite/`, not nested
 *    inside it (e.g. `/home/braden/Desktop/Dev/crm7-jodie-worktree/...` —
 *    no `bsuite` segment present at all). Verified empirically: even
 *    `packages/dry-lint/src/app-detection.ts`'s bsuite-marker-anchor +
 *    right-to-left-fallback strategy (designed for exactly this trap)
 *    still misattributes a bare worktree path with no `bsuite` segment to
 *    `braden`, because the right-to-left fallback keeps scanning past the
 *    worktree name and eventually hits the `braden` segment in the home
 *    directory. Any check that inspects the LINTED FILE's path is
 *    fundamentally fragile against directory-naming conventions outside
 *    this codebase's control (worktree names, CI checkout paths, a
 *    contributor's home directory).
 *
 * FIX: don't inspect the linted file's path at all. Read the `name` field
 * of the nearest `package.json` walking up from ESLint's own working
 * directory (the app root being linted — stable regardless of how deep the
 * repo checkout lives, what the checkout directory is named, or what the
 * contributor's home directory is called). Each app's package.json name is
 * an authoritative, version-controlled fact about which app this is —
 * braden's is literally `"braden-app"`.
 */
import fs from 'node:fs'
import path from 'node:path'

const KNOWN_BRADEN_PACKAGE_NAMES = new Set(['braden-app', 'braden', '@bsuite/braden'])

// Memoised per-process — the app root doesn't change mid-lint-run, and this
// avoids a fs.readFileSync per linted file.
let cachedResult

function findNearestPackageJson(startDir) {
  let dir = startDir
  // Bounded walk — package.json is at most a handful of levels up from cwd
  // in every known layout (app root, or a src/ subdirectory at worst).
  for (let i = 0; i < 20; i++) {
    const candidate = path.join(dir, 'package.json')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break // reached filesystem root
    dir = parent
  }
  return null
}

export function isBradenSubmoduleFile(_filename, cwd = process.cwd()) {
  // Intentionally ignores `_filename` — see header comment. Kept as a
  // parameter for call-site compatibility with the previous (path-based)
  // signature across all consumers.
  if (cachedResult !== undefined) return cachedResult

  try {
    const pkgPath = findNearestPackageJson(cwd)
    if (!pkgPath) {
      cachedResult = false
      return cachedResult
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    cachedResult = typeof pkg.name === 'string' && KNOWN_BRADEN_PACKAGE_NAMES.has(pkg.name)
  } catch {
    // Fail closed: if we can't determine the app, don't exempt it — a
    // false "not braden" just means the rule enforces theme tokens as
    // normal, which is always safe. A false "is braden" would silently
    // disable enforcement everywhere, which is the exact bug being fixed.
    cachedResult = false
  }
  return cachedResult
}

// Test-only: allows the test suite to reset memoisation between cases.
export function _resetBradenSubmoduleCacheForTests() {
  cachedResult = undefined
}
