/**
 * Shared helpers for @bsuite/eslint-config rules.
 *
 * isBradenSubmoduleFile — bug found 2026-07-17, fixed here + propagated to
 * every consumer (crm7 inline copy + the 5 sibling repos' local copies).
 * REWORKED twice the same session after fable red-team review found each
 * prior fix still unsafe. History kept below because each version's
 * failure mode is the reason the next version looks the way it does.
 *
 * v0 (original bug): `filename.includes('/braden/')` — a raw path-substring
 * match. Matches ANY absolute path containing "/braden/" anywhere,
 * including a contributor's own home directory
 * (`/home/braden/Desktop/Dev/crm7/src/App.tsx`), silently exempting EVERY
 * file in EVERY app for anyone with "braden" in their local path.
 *
 * v1 (superseded): checked `path.relative(process.cwd(), filename)` and
 * required "braden" as the first segment — fixed v0's false positive, but
 * INVERTS the moment it's copied into braden's own repo to fix it there:
 * run with cwd = braden's own app root, `braden/src/App.tsx` has relative
 * path `src/App.tsx` — first segment "src", not "braden" — so braden's OWN
 * files would LOSE their exemption. A path-anchor fix (e.g. requiring
 * "braden" as an app-root segment, or `packages/dry-lint/src/
 * app-detection.ts`'s bsuite-marker-anchor + right-to-left-fallback
 * strategy) is ALSO unsafe: apps are routinely checked out into dedicated
 * git worktrees as SIBLINGS of `bsuite/`, not nested inside it — verified
 * empirically that dry-lint's detector still misattributes a bare
 * worktree path (no `bsuite` segment) to `braden` for the same reason.
 *
 * v2 (superseded): read the `name` field of the nearest `package.json`
 * walking up from `process.cwd()` (not the linted file's path at all).
 * Fable red-team found THREE remaining problems, all now fixed in v3:
 *
 *   F1 — the memo cache was a bare scalar (`let cachedResult`), keyed on
 *   nothing. First call's result won for the ENTIRE PROCESS LIFETIME:
 *   chdir braden -> true; chdir crm7 -> still true (stale) -> crm7 and
 *   every other app silently exempted for the rest of the process.
 *   Real trigger: an editor's ESLint language server linting multiple
 *   apps in one workspace without restarting the server; any
 *   programmatic multi-app lint run in one Node process.
 *
 *   F2 — `findNearestPackageJson` walked up to 20 directories with NO
 *   boundary, and the alias set included bare `'braden'` (not just the
 *   real `braden-app`). If a contributor ever ran `npm init -y` in their
 *   own `$HOME` (which defaults `name` to the directory name — literally
 *   `"braden"` for a user named braden), ANY file linted from anywhere
 *   under that home directory without its own closer package.json would
 *   walk all the way up to `$HOME/package.json`, read name `"braden"`,
 *   and match the alias set -> every rule in every app silently no-ops.
 *   That is v0's exact environmental-coincidence class (the operator's
 *   own username), just moved from path-substring to package-name.
 *
 *   F3 — read `process.cwd()` and ignored `context.cwd` (the host-provided
 *   working directory ESLint editors/lint-staged runners set WITHOUT an
 *   actual `chdir()`). Linting a braden file with `process.cwd()` pointing
 *   at e.g. the monorepo root (name `"bsuite"`, not braden) fails CLOSED —
 *   braden's own Corporate brand hex/red-gold gets incorrectly flagged.
 *   Visible (not a silent leak) but still the wrong answer, and still a
 *   cwd dependency the whole rework was meant to remove.
 *
 * v3 (this version, the fix that kills all three): anchor on
 * `path.dirname(filename)` — walk up from the LINTED FILE's OWN directory,
 * not from any notion of "current working directory" at all. This is
 * immune to worktree names, CI checkout paths, contributor home
 * directories, AND cwd/chdir semantics simultaneously, because it never
 * asks "where is the process/host running from" — only "where does this
 * file live on disk." (Earlier versions' header comments argued against
 * "inspecting the linted file's path" — that conflated path-STRING
 * MATCHING against the file's path, which is fragile and was correctly
 * rejected, with a FILESYSTEM WALK starting from the file's own directory,
 * which is strictly better than a cwd-anchored walk on every axis F1-F3
 * were about.) `context.cwd ?? process.cwd()` is used ONLY as a fallback
 * when the filename is virtual (`<input>`/`<text>` — no real file, e.g.
 * `Linter#verify(code)` without a `filePath`). The walk is bounded at the
 * first ancestor directory containing a `.git` entry (file or directory —
 * covers both normal repos and git-worktree checkouts, where `.git` is a
 * file pointing at the real gitdir) — this is the repo root; nothing
 * outside it (a contributor's `$HOME`, e.g.) is ever inspected. The memo
 * cache is now a `Map` keyed by the resolved starting directory, so
 * multiple apps/directories linted in one process each get their own
 * cached answer instead of one clobbering the other.
 */
import fs from 'node:fs'
import path from 'node:path'

const KNOWN_BRADEN_PACKAGE_NAMES = new Set(['braden-app', '@bsuite/braden'])
const VIRTUAL_FILENAMES = new Set(['<input>', '<text>', ''])

// Keyed by starting directory — NOT a bare scalar (that was F1: the first
// call's result won for the whole process lifetime across every app).
const resultCache = new Map()

function hasGitMarker(dir) {
  try {
    return fs.existsSync(path.join(dir, '.git'))
  } catch {
    return false
  }
}

function findNearestPackageJson(startDir) {
  let dir = startDir
  // Bounded walk: stop at the first repo root (a `.git` marker) so an
  // app with no package.json at its own root can never escape into an
  // unrelated ancestor directory (e.g. a contributor's $HOME) — that
  // escape was F2. Also capped at 20 levels as a hard backstop.
  for (let i = 0; i < 20; i++) {
    const candidate = path.join(dir, 'package.json')
    if (fs.existsSync(candidate)) return candidate
    if (hasGitMarker(dir)) break
    const parent = path.dirname(dir)
    if (parent === dir) break // reached filesystem root
    dir = parent
  }
  return null
}

/**
 * @param {string} filename - `context.filename` from the calling rule.
 * @param {string} [cwd] - `context.cwd ?? process.cwd()`. Used ONLY when
 *   `filename` is virtual (no real file on disk) — see header comment.
 */
export function isBradenSubmoduleFile(filename, cwd = process.cwd()) {
  const isVirtual = !filename || VIRTUAL_FILENAMES.has(filename)
  const startDir = isVirtual ? cwd : path.dirname(filename)

  if (resultCache.has(startDir)) return resultCache.get(startDir)

  let result
  try {
    const pkgPath = findNearestPackageJson(startDir)
    if (!pkgPath) {
      result = false
    } else {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      result = typeof pkg.name === 'string' && KNOWN_BRADEN_PACKAGE_NAMES.has(pkg.name)
    }
  } catch {
    // Fail closed: not-braden just means normal enforcement applies, which
    // is always safe. A false "is braden" silently disables enforcement.
    result = false
  }

  resultCache.set(startDir, result)
  return result
}

// Test-only: allows the test suite to reset memoisation between cases.
export function _resetBradenSubmoduleCacheForTests() {
  resultCache.clear()
}
