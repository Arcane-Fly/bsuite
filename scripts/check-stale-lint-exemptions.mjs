#!/usr/bin/env node
/**
 * check-stale-lint-exemptions.mjs
 *
 * BU-5 / BU-6 (docs/20260817-built-unlanded-and-unwired-register-v1.00W.md):
 * a lint exemption can outlive its subject. `eslint.config.js` in every app
 * carries per-file rule overrides — a `files: [...]` block paired with
 * `rules: { 'some/rule': 'off' }`, or a rule-scoped `ignores: [...]` list —
 * that name a SPECIFIC source path. Two ways that goes stale, silently:
 *
 *   1. The file is deleted, renamed, or was never committed under that path.
 *      The exemption then names nothing; ESLint does not warn, because a
 *      `files`/`ignores` glob matching zero files is not an error.
 *   2. The file still exists but nothing imports it any more. The rule it
 *      was excused from — most often `bsuite/no-cross-app-write`, the DRY
 *      one-shot ownership guard — is switched off over dead weight. BU-6's
 *      concrete instance: `throughput/src/lib/user-management.ts`, 552
 *      lines, `bsuite/no-cross-app-write` off, zero importers.
 *
 * This gate FAILS on (1) — a config that references a path outside the tree
 * is a config bug, unambiguously. It only REPORTS on (2) — an unimported
 * file is a candidate for deletion or re-wiring, not automatically wrong
 * (see the header of check-edge-function-slug-collisions.mjs for the same
 * fail/report split applied to a different defect shape), and the estate's
 * hard rule is that source deletion needs a human, not a guard, to decide it.
 *
 * WHAT COUNTS AS "A NAMED PATH"
 * ---------------------------------------------------------------------------
 * Flat ESLint config `files`/`ignores` entries mix two different things:
 * broad globs that scope a rule to an app's source tree (`src/**​/*.{ts,tsx}`)
 * and directory-level build excludes (`dist`, `coverage`, `.vercel`), versus
 * literal paths to one real file (`src/lib/user-management.ts`,
 * `tailwind.config.js`). Only the second kind can go stale in the way BU-5
 * describes — a glob silently matching zero files is invisible by
 * construction, but it was never a promise that ONE particular file exists.
 * This gate scopes itself to literal paths: no `*` wildcard, and an
 * extension ESLint actually lints (`.ts .tsx .js .jsx .mjs .cjs .mts .cts`).
 * That rule alone separates `dist` / `coverage` / `**​/node_modules/**` (skipped)
 * from `tailwind.config.js` / `scripts/drift-scan.mjs` / a 552-line module
 * (checked) without a hand-maintained exceptions list.
 *
 * Next.js-style bracket/paren route segments (`src/pages/billing/\[id\].tsx`)
 * are escaped for minimatch inside the config source — the escaping is real
 * in the JS string value, one literal backslash before the bracket — and are
 * unescaped here before touching the filesystem or git.
 *
 * WHY THE CONFIG IS IMPORTED, NOT REGEXED
 * ---------------------------------------------------------------------------
 * Every app's `eslint.config.{js,mjs}` is a real flat-config ES module:
 * `extends`, spread conditionals (braden's dry-lint-unresolved fallback),
 * and `tseslint.config(...)` all resolve at import time into one flat array
 * of `{ files, ignores, rules }` objects — which is exactly what ESLint
 * itself does before linting a single file. Parsing the source text with
 * string matching would have to reimplement that resolution and would drift
 * from the config's actual behaviour the first time someone reaches for a
 * conditional block or a shared constant (crm7's SET_STATE_IN_EFFECT_FILES,
 * conduit's BSUITE_TOKEN_IGNORES). Importing it and reading the resolved
 * array cannot drift, because it IS what ESLint reads.
 *
 * IMPORTER DETECTION
 * ---------------------------------------------------------------------------
 * `git grep -F` for the target's basename narrows to candidate files fast on
 * every scope; each candidate is then read and its lines classified as a
 * real import (`import ... from`, `import(...)`, `require(...)`) versus a
 * RE-EXPORT (`export ... from`). A re-export is a barrel, not a consumer —
 * counting it as an importer would make an unimported file invisible the
 * moment it is merely re-exported and by nothing else. When direct importers
 * are zero, the gate takes exactly one further hop: does anything import the
 * barrel that re-exports the target? That is enough to clear the common
 * `index.ts` re-export case without walking an unbounded import graph.
 *
 * Usage:
 *   node scripts/check-stale-lint-exemptions.mjs [--root=<path>] [--require-scopes=<n>]
 *   node scripts/check-stale-lint-exemptions.mjs --self-test
 *
 * Exit 0 clean (orphans, if any, are reported not failed), 1 a named path is
 * not a tracked file, 2 usage error.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

/** Every submodule that carries its own flat ESLint config today. */
const SCOPES = [
  { name: 'throughput', dir: 'throughput', config: 'eslint.config.js' },
  { name: 'crm7', dir: 'crm7', config: 'eslint.config.js' },
  { name: 'business-suite-unified', dir: 'business-suite-unified', config: 'eslint.config.js' },
  { name: 'conduit', dir: 'conduit', config: 'eslint.config.mjs' },
  { name: 'braden', dir: 'braden', config: 'eslint.config.js' },
  { name: 'R80.4', dir: 'R80.4', config: 'eslint.config.mjs' },
]

const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/

/** A literal, lint-relevant file path — not a glob, not a bare directory name. */
function isSpecificFilePath(p) {
  return typeof p === 'string' && SOURCE_EXT_RE.test(p) && !p.includes('*')
}

/** Strip the minimatch-escaping backslash in front of a glob metacharacter. */
function unescapeGlobPath(p) {
  return p.replace(/\\([()[\]])/g, '$1')
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function loadFlatConfig(configPath) {
  const mod = await import(pathToFileURL(configPath).href)
  const cfg = mod.default ?? mod
  return Array.isArray(cfg) ? cfg : []
}

function isTracked(repoDir, relPath) {
  try {
    const out = execFileSync('git', ['ls-files', '--', relPath], { cwd: repoDir, encoding: 'utf8' })
    return out.trim().length > 0
  } catch {
    return false
  }
}

function isGitIgnored(repoDir, relPath) {
  try {
    execFileSync('git', ['check-ignore', '-q', '--', relPath], { cwd: repoDir })
    return true // exit 0 — the path IS ignored
  } catch {
    return false // exit 1 (not ignored) or the command errored
  }
}

/**
 * A named path "still exists" if it is a tracked file, OR it is a legitimate
 * gitignored build artifact. The second half matters: `eslint-config-next`'s
 * own recommended config ignores `next-env.d.ts`, a file Next.js regenerates
 * on every build and most teams (this estate included) never commit. That
 * ignore entry is current, correct, third-party-authored config, not a
 * bsuite-authored exemption that outlived its subject — `git ls-files` alone
 * would misclassify it as missing. A path that is neither tracked nor
 * gitignored is the real defect: gone from source, still named in config.
 *
 * PRESENCE ON DISK IS DELIBERATELY *NOT* REQUIRED, corrected 2026-08-19.
 *
 * The first version of this function asked for `onDisk && isGitIgnored(...)`,
 * and that made the verdict depend on whether anyone had run a build. It
 * passed on a developer laptop, where `conduit/next-env.d.ts` had been sitting
 * since 7 August, and FAILED in CI, where the repository is checked out fresh
 * and nothing generates it — reporting a stale exemption for a file that is
 * doing exactly what it is supposed to do.
 *
 * A gate that answers differently on two machines is not a gate, and the half
 * that fails is not the informative half here: whether a generated artifact
 * happens to be present at scan time is a fact about the ENVIRONMENT, while
 * whether the path is gitignored is a fact about the CONFIG, which is what
 * this checker is about. `git check-ignore` answers the second in any
 * checkout, generated or not.
 *
 * What this gives up: an exemption naming a gitignored path that no build ever
 * produces would now pass. That is the correct trade — such an entry is inert
 * rather than misleading, and catching it would cost the determinism above.
 */
function pathStillExists(repoDir, relPath) {
  if (isTracked(repoDir, relPath)) return true
  return isGitIgnored(repoDir, relPath)
}

/** Fixed-string `git grep`, tracked files only. `git grep` exits 1 on no match — that is not an error here. */
function gitGrepFilesContaining(repoDir, needle) {
  try {
    const out = execFileSync('git', ['grep', '-l', '-F', '--', needle], { cwd: repoDir, encoding: 'utf8' })
    return out.split('\n').filter(Boolean)
  } catch (e) {
    if (e.status === 1) return []
    throw e
  }
}

/**
 * Classify a whole file's references to a module basename as a real IMPORT
 * (consumer) or a RE-EXPORT (barrel, not a consumer).
 *
 * A per-line check is not enough: Prettier wraps any import/export with more
 * than a couple of named specifiers onto multiple lines, so the line that
 * actually carries the quoted module path is `} from '...'` — it starts with
 * `}`, not `import` or `export`, and a same-line keyword check misses it
 * completely. Confirmed live: `ApprenticeshipTitleSelector` is genuinely
 * imported (multi-line) by two crm7 pages, and a same-line check reported it
 * as an orphan.
 *
 * Fix: for every line carrying the quoted specifier, walk BACKWARD to the
 * nearest COLUMN-ZERO line starting with `import` or `export` — the ES
 * module grammar requires both keywords to start a top-level statement at
 * column zero, so that nearest line is the one governing this specifier
 * regardless of how many lines the specifier list spans. Dynamic
 * `import(...)`/`require(...)` calls are classified on their own line, since
 * those are expressions, not declarations, and are not restricted to column
 * zero.
 */
function classifyFileReferences(content, base, extNoDot) {
  const specifierRe = new RegExp(`['"\`][^'"\`]*${escapeRegExp(base)}(?:\\.${escapeRegExp(extNoDot)})?['"\`]`)
  const topLevelKeywordRe = /^(import|export)\b/
  // A line that is ONLY the tail of a wrapped import/export clause — Prettier's
  // `}\n} from '...'` or a bare `from '...'` continuation. Deliberately
  // narrow: this is what makes the backward walk below safe. Without this
  // gate, ANY coincidental mention of the basename anywhere in a file — a
  // comment, a route string, JSX copy — would walk back to that file's
  // nearest top import and get misattributed as a real importer, which is
  // worse than the bug this function exists to fix (verified against this
  // estate: it silently turned every genuine orphan clean before this gate
  // was added, because virtually every source file has SOME import above
  // ANY line in it).
  const continuationTailRe = /^\}?\s*from\s*['"`]/
  const lines = content.split('\n')
  let hasImport = false
  let hasReexport = false
  for (let i = 0; i < lines.length; i++) {
    if (!specifierRe.test(lines[i])) continue
    const trimmed = lines[i].trim()
    if (/\bimport\s*\(/.test(trimmed) || /\brequire\s*\(/.test(trimmed)) {
      hasImport = true
      continue
    }
    if (/^import\b/.test(trimmed) && /\bfrom\b/.test(trimmed)) {
      hasImport = true
      continue
    }
    if (/^export\b/.test(trimmed) && /\bfrom\b/.test(trimmed)) {
      hasReexport = true
      continue
    }
    if (!continuationTailRe.test(trimmed)) continue // not import-shaped at all — a coincidental mention
    let governIdx = i
    while (governIdx >= 0 && !topLevelKeywordRe.test(lines[governIdx])) governIdx--
    if (governIdx < 0) continue
    if (/^export\b/.test(lines[governIdx])) hasReexport = true
    else hasImport = true
  }
  return { hasImport, hasReexport }
}

function scanForBasename(repoDir, selfAbs, basename, extNoDot) {
  const direct = new Set()
  const reexports = new Set()
  for (const file of gitGrepFilesContaining(repoDir, basename)) {
    if (path.resolve(repoDir, file) === selfAbs) continue
    let content
    try {
      content = fs.readFileSync(path.join(repoDir, file), 'utf8')
    } catch {
      continue
    }
    const { hasImport, hasReexport } = classifyFileReferences(content, basename, extNoDot)
    if (hasImport) direct.add(file)
    else if (hasReexport) reexports.add(file)
  }
  return { direct: [...direct], reexports: [...reexports] }
}

/**
 * Importers of `targetRelPath`, direct or one barrel-hop away. See the
 * header's IMPORTER DETECTION section for why a re-export alone does not
 * count and why the walk stops at one hop.
 */
function findImporters(repoDir, targetRelPath) {
  const ext = path.extname(targetRelPath)
  const extNoDot = ext.replace(/^\./, '')
  const base = path.basename(targetRelPath, ext)
  const selfAbs = path.resolve(repoDir, targetRelPath)

  const first = scanForBasename(repoDir, selfAbs, base, extNoDot)
  if (first.direct.length > 0) return { importers: first.direct, via: 'direct' }

  const barrelImporters = new Set()
  for (const barrel of first.reexports) {
    const barrelExt = path.extname(barrel)
    const barrelBase = path.basename(barrel, barrelExt)
    const hop = scanForBasename(repoDir, path.resolve(repoDir, barrel), barrelBase, barrelExt.replace(/^\./, ''))
    for (const f of hop.direct) barrelImporters.add(f)
  }
  if (barrelImporters.size > 0) {
    return { importers: [...barrelImporters], via: `barrel via ${first.reexports.join(', ')}` }
  }
  return { importers: [], via: 'none' }
}

/** Every literal, path-scoped exemption declared in one scope's resolved flat config. */
async function collectExemptions(root, scope) {
  const repoDir = path.join(root, scope.dir)
  const configPath = path.join(repoDir, scope.config)
  if (!fs.existsSync(configPath)) return []
  const config = await loadFlatConfig(configPath)
  const found = []
  config.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') return
    const ruleNames = entry.rules ? Object.keys(entry.rules) : null
    const ruleLabel = ruleNames && ruleNames.length ? ruleNames.join(', ') : '(all rules — global ignore)'
    const fromFiles = Array.isArray(entry.files) ? entry.files : []
    const fromIgnores = Array.isArray(entry.ignores) ? entry.ignores : []
    for (const raw of fromFiles) {
      if (!isSpecificFilePath(raw)) continue
      found.push({ scope: scope.name, configEntryIndex: idx, source: 'files', rawPath: raw, relPath: unescapeGlobPath(raw), rule: ruleLabel })
    }
    for (const raw of fromIgnores) {
      if (!isSpecificFilePath(raw)) continue
      found.push({ scope: scope.name, configEntryIndex: idx, source: 'ignores', rawPath: raw, relPath: unescapeGlobPath(raw), rule: ruleLabel })
    }
  })
  return found
}

async function runCheck(root, scopes) {
  const missing = []
  const orphaned = []
  let checked = 0
  const scopesFound = new Set()
  for (const scope of scopes) {
    const repoDir = path.join(root, scope.dir)
    const exemptions = await collectExemptions(root, scope)
    if (exemptions.length === 0) continue
    scopesFound.add(scope.name)
    for (const ex of exemptions) {
      checked++
      if (!pathStillExists(repoDir, ex.relPath)) {
        missing.push(ex)
        continue
      }
      const { importers, via } = findImporters(repoDir, ex.relPath)
      if (importers.length === 0) orphaned.push({ ...ex, via })
    }
  }
  return { checked, missing, orphaned, scopesFound }
}

function describeMissing(ex) {
  return (
    `${ex.scope}/eslint.config.* entry #${ex.configEntryIndex} (${ex.source}, rule "${ex.rule}") ` +
    `names "${ex.rawPath}" — not a tracked file in ${ex.scope}.`
  )
}

function describeOrphan(ex) {
  return (
    `${ex.scope}/${ex.relPath} — rule "${ex.rule}" is exempted here (entry #${ex.configEntryIndex}, ${ex.source}), ` +
    `but no tracked file imports it (checked: direct import + one barrel hop).`
  )
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

// `fn` is async (it awaits runCheck()); this helper must await it too, or the
// `finally` block deletes the fixture tree while runCheck() is still reading
// files out of it — every check then reports "missing" regardless of what
// the case actually set up, which is exactly the false-positive shape this
// gate exists to prevent in the tool it is testing.
async function withTempRepo(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-lint-exempt-selftest-'))
  try {
    return await fn(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function initGitRepo(repoDir) {
  fs.mkdirSync(repoDir, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: repoDir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir })
}

function commitAll(repoDir) {
  execFileSync('git', ['add', '-A'], { cwd: repoDir })
  execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: repoDir })
}

function writeFile(repoDir, relPath, content) {
  const full = path.join(repoDir, relPath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

function writeConfig(repoDir, arrayLiteralSource) {
  writeFile(repoDir, 'eslint.config.mjs', `export default ${arrayLiteralSource};\n`)
}

async function withScope(root, dir, fn) {
  const scope = { name: dir, dir, config: 'eslint.config.mjs' }
  return fn(scope)
}

function selfTest() {
  const cases = []

  cases.push([
    'a files-scoped exemption for a MISSING path fails',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeConfig(
          repoDir,
          `[{ files: ['src/lib/gone.ts'], rules: { 'bsuite/no-cross-app-write': 'off' } }]`,
        )
        commitAll(repoDir)
        const { missing, orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 1 && missing[0].relPath === 'src/lib/gone.ts' && orphaned.length === 0
      }),
  ])

  // Regression, 2026-08-19. This checker passed on a laptop and failed in CI on
  // conduit/next-env.d.ts — gitignored, generated by `next build`, present on a
  // machine that had built and absent from a fresh checkout. `pathStillExists`
  // required presence on disk, which made the verdict an environment fact
  // rather than a config fact. The temp repo below never creates the file, so
  // this case fails against the old behaviour and passes against the new.
  cases.push([
    'a gitignored path is NOT missing even when it does not exist on disk',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        fs.writeFileSync(path.join(repoDir, '.gitignore'), 'next-env.d.ts\n')
        writeConfig(repoDir, `[{ ignores: ['next-env.d.ts'] }]`)
        commitAll(repoDir)
        // Deliberately NOT created — that is the point of the case.
        const { missing } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0
      }),
  ])

  // The other half of the same rule: an untracked, NOT-ignored path is still
  // the real defect, so relaxing the disk check must not relax this.
  cases.push([
    'an untracked path that is not gitignored still fails',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeConfig(repoDir, `[{ ignores: ['src/lib/vanished.ts'] }]`)
        commitAll(repoDir)
        const { missing } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 1 && missing[0].relPath === 'src/lib/vanished.ts'
      }),
  ])

  cases.push([
    'an existing, unimported exempted file is reported as an orphan, not a failure',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/lib/user-management.ts', 'export function grantAdmin() {}\n')
        writeConfig(
          repoDir,
          `[{ files: ['src/lib/user-management.ts'], rules: { 'bsuite/no-cross-app-write': 'off' } }]`,
        )
        commitAll(repoDir)
        const { missing, orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0 && orphaned.length === 1 && orphaned[0].relPath === 'src/lib/user-management.ts'
      }),
  ])

  cases.push([
    'a directly-imported exempted file is clean — neither missing nor orphaned',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/lib/user-management.ts', 'export function grantAdmin() {}\n')
        writeFile(repoDir, 'src/pages/Admin.tsx', `import { grantAdmin } from '../lib/user-management';\ngrantAdmin();\n`)
        writeConfig(
          repoDir,
          `[{ files: ['src/lib/user-management.ts'], rules: { 'bsuite/no-cross-app-write': 'off' } }]`,
        )
        commitAll(repoDir)
        const { missing, orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0 && orphaned.length === 0
      }),
  ])

  cases.push([
    'a re-export barrel alone does NOT count as an importer',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/lib/user-management.ts', 'export function grantAdmin() {}\n')
        writeFile(repoDir, 'src/lib/index.ts', `export * from './user-management';\n`)
        writeConfig(
          repoDir,
          `[{ files: ['src/lib/user-management.ts'], rules: { 'bsuite/no-cross-app-write': 'off' } }]`,
        )
        commitAll(repoDir)
        const { orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return orphaned.length === 1 && orphaned[0].relPath === 'src/lib/user-management.ts'
      }),
  ])

  cases.push([
    'a barrel that IS imported clears the file it re-exports (one-hop resolution)',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/lib/user-management.ts', 'export function grantAdmin() {}\n')
        writeFile(repoDir, 'src/lib/index.ts', `export * from './user-management';\n`)
        writeFile(repoDir, 'src/pages/Admin.tsx', `import { grantAdmin } from '../lib/index';\ngrantAdmin();\n`)
        writeConfig(
          repoDir,
          `[{ files: ['src/lib/user-management.ts'], rules: { 'bsuite/no-cross-app-write': 'off' } }]`,
        )
        commitAll(repoDir)
        const { missing, orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0 && orphaned.length === 0
      }),
  ])

  cases.push([
    'a bare directory ignore (no extension) is skipped, not checked',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeConfig(repoDir, `[{ ignores: ['dist', 'coverage', '**/node_modules/**'] }]`)
        commitAll(repoDir)
        const { checked, missing, orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return checked === 0 && missing.length === 0 && orphaned.length === 0
      }),
  ])

  cases.push([
    'a rule-scoped ignores entry naming a real, unimported file IS checked (not just `files` blocks)',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/legacy-widget.tsx', 'export const Widget = () => null;\n')
        writeConfig(
          repoDir,
          `[{ rules: { 'bsuite/no-hardcoded-colours': 'error' }, ignores: ['src/legacy-widget.tsx'] }]`,
        )
        commitAll(repoDir)
        const { missing, orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0 && orphaned.length === 1 && orphaned[0].source === 'ignores'
      }),
  ])

  cases.push([
    'an escaped Next.js route segment path resolves to the real bracketed file',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/pages/billing/[id].tsx', 'export default function Billing() { return null; }\n')
        writeConfig(
          repoDir,
          String.raw`[{ files: ['src/pages/billing/\\[id\\].tsx'], rules: { 'react-hooks/purity': 'off' } }]`,
        )
        commitAll(repoDir)
        const { missing } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0
      }),
  ])

  cases.push([
    'a MULTI-LINE named import (Prettier-wrapped) is recognised as a real importer',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/components/entity/selectors/ApprenticeshipTitleSelector.tsx', 'export function ApprenticeshipTitleSelector() { return null; }\n')
        writeFile(
          repoDir,
          'src/pages/contracts/training/create.tsx',
          [
            'import {',
            '  ApprenticeshipTitleSelector,',
            '  OccupationSelector,',
            "} from '@/components/entity/selectors/ApprenticeshipTitleSelector'",
            '',
            'export default function Create() { return <ApprenticeshipTitleSelector />; }',
            '',
          ].join('\n'),
        )
        writeConfig(
          repoDir,
          `[{ files: ['src/components/entity/selectors/ApprenticeshipTitleSelector.tsx'], rules: { 'react-hooks/set-state-in-effect': 'off' } }]`,
        )
        commitAll(repoDir)
        const { missing, orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0 && orphaned.length === 0
      }),
  ])

  cases.push([
    'a coincidental basename mention (comment/string) elsewhere in a file is NOT misattributed to that file\'s unrelated top import',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, 'src/components/ui/carousel.tsx', 'export function Carousel() { return null; }\n')
        // This file imports something else entirely, then merely NAMES
        // "carousel" in a route string deep in its body. The naive backward
        // walk (pre-fix) would find THIS file's own `import { Link } from
        // 'wouter'` line and wrongly credit it as importing carousel.tsx.
        writeFile(
          repoDir,
          'src/pages/Nav.tsx',
          [
            "import { Link } from 'wouter'",
            '',
            'export function Nav() {',
            "  return <Link to=\"/carousel\">Carousel demo (not implemented)</Link>;",
            '}',
            '',
          ].join('\n'),
        )
        writeConfig(
          repoDir,
          `[{ files: ['src/components/ui/carousel.tsx'], rules: { 'react-hooks/set-state-in-effect': 'off' } }]`,
        )
        commitAll(repoDir)
        const { orphaned } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return orphaned.length === 1 && orphaned[0].relPath === 'src/components/ui/carousel.tsx'
      }),
  ])

  cases.push([
    'a gitignored-but-present generated file (e.g. next-env.d.ts) is NOT reported missing',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeFile(repoDir, '.gitignore', 'next-env.d.ts\n')
        writeConfig(repoDir, `[{ ignores: ['next-env.d.ts'] }]`)
        commitAll(repoDir)
        // Generated AFTER the commit, same as a real Next.js build would —
        // never staged, never tracked, but genuinely present on disk.
        writeFile(repoDir, 'next-env.d.ts', '/// <reference types="next" />\n')
        const { missing } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 0
      }),
  ])

  cases.push([
    'a path that is neither tracked nor a gitignored on-disk artifact is still MISSING',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeConfig(repoDir, `[{ ignores: ['next-env.d.ts'] }]`)
        commitAll(repoDir)
        // No .gitignore rule and the file was never generated — genuinely gone.
        const { missing } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return missing.length === 1 && missing[0].relPath === 'next-env.d.ts'
      }),
  ])

  cases.push([
    'a broad src/** glob is not treated as a literal path at all',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeConfig(repoDir, `[{ files: ['src/**/*.{ts,tsx}'], rules: { 'bsuite/no-cross-app-write': 'error' } }]`)
        commitAll(repoDir)
        const { checked } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        return checked === 0
      }),
  ])

  cases.push([
    'the failure message names the scope, the rule and the path',
    async () =>
      withTempRepo(async (root) => {
        const repoDir = path.join(root, 'app')
        initGitRepo(repoDir)
        writeConfig(repoDir, `[{ files: ['src/lib/gone.ts'], rules: { 'bsuite/no-cross-app-write': 'off' } }]`)
        commitAll(repoDir)
        const { missing } = await runCheck(root, [{ name: 'app', dir: 'app', config: 'eslint.config.mjs' }])
        if (missing.length !== 1) return false
        const msg = describeMissing(missing[0])
        return msg.includes('app') && msg.includes('bsuite/no-cross-app-write') && msg.includes('src/lib/gone.ts')
      }),
  ])

  return (async () => {
    let fail = 0
    for (const [name, run] of cases) {
      let ok = false
      let err = null
      try {
        ok = await run()
      } catch (e) {
        err = e
      }
      if (!ok) {
        fail++
        console.error(`self-test (${name}) FAILED${err ? `: ${err.stack || err}` : ''}`)
      }
    }
    if (fail) {
      console.error(`check-stale-lint-exemptions: ${fail}/${cases.length} self-test failure(s)`)
      process.exit(1)
    }
    console.log(`check-stale-lint-exemptions: self-test OK (${cases.length} cases)`)
    process.exit(0)
  })()
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usageError(msg) {
  console.error(`check-stale-lint-exemptions: ${msg}`)
  console.error(
    'Usage: node scripts/check-stale-lint-exemptions.mjs [--root=<path>] [--require-scopes=<n>] | --self-test',
  )
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) {
  await selfTest()
} else {
  let rootArg = '.'
  let requireScopes = 0
  for (const a of args) {
    if (a.startsWith('--root=')) {
      rootArg = a.slice('--root='.length)
    } else if (a.startsWith('--require-scopes=')) {
      requireScopes = Number(a.slice('--require-scopes='.length))
      if (!Number.isInteger(requireScopes) || requireScopes < 0) {
        usageError(`--require-scopes must be a non-negative integer, got "${a}"`)
      }
    } else if (a.startsWith('-')) {
      usageError(`unknown flag "${a}"`)
    } else {
      usageError(`unexpected positional argument "${a}"`)
    }
  }

  const root = path.resolve(rootArg)
  if (!fs.existsSync(root)) usageError(`--root path does not exist: ${root}`)

  const { checked, missing, orphaned, scopesFound } = await runCheck(root, SCOPES)

  // Same self-reporting discipline as check-edge-function-slug-collisions.mjs:
  // a scan that examined nothing is not a pass. An uninitialised submodule is
  // an empty directory — collectExemptions() would silently return [] for it.
  if (requireScopes > 0 && scopesFound.size < requireScopes) {
    console.error(
      `check-stale-lint-exemptions: expected path-scoped exemptions in at least ${requireScopes} ` +
        `scope(s) but found ${scopesFound.size} (${[...scopesFound].join(', ') || 'none'}).\n` +
        `Submodules are probably not checked out — refusing to report OK on an unscanned tree.`,
    )
    process.exit(1)
  }

  // Report BOTH categories every run, before deciding the exit code. A human
  // fixing the missing-path failures below should not have to re-run this
  // gate a second time just to learn there were also orphans — the migration
  // version/slug-collision gates get away with fail-fast-and-stop because
  // they have only one finding category; this one has two, and hiding the
  // second behind the first's exit(1) is its own silent-guard failure mode.
  console.log(
    `check-stale-lint-exemptions: checked ${checked} path-scoped exemption(s) across ` +
      `${scopesFound.size} scope(s) (${[...scopesFound].sort().join(', ') || 'none'}). ` +
      `${missing.length} missing, ${orphaned.length} orphaned (no importer).`,
  )

  if (orphaned.length) {
    console.log(
      `\nORPHANED EXEMPTIONS — ${orphaned.length}. The path exists but no tracked file imports it, so the ` +
        `rule it is excused from is protecting dead code. Not a failure: deletion needs operator approval. ` +
        `Candidates for deletion, or for re-enabling the rule and wiring the file in:\n` +
        orphaned.map((o) => `  - ${describeOrphan(o)}`).join('\n'),
    )
  }

  if (missing.length) {
    console.error(
      `\nStale lint exemption check FAILED — ${missing.length} named path(s) are not tracked files:\n` +
        missing.map((m) => `  - ${describeMissing(m)}`).join('\n') +
        `\n\nFix by deleting the exemption entry (or the ignores/files item) that names each path — ` +
        `this is removing dead config, not deleted work.`,
    )
    process.exit(1)
  }

  process.exit(0)
}
