// Zero-dependency test using Node's built-in test runner (node:test) —
// this package has no existing test harness; adding a full vitest setup
// for one pure function was judged unnecessary overhead. Run via
// `node --test rules/_shared.test.js` (wired as the package `test` script).
//
// v3 API: `isBradenSubmoduleFile(filename, cwd?)` anchors on
// `path.dirname(filename)` for real files; `cwd` is used ONLY as a
// fallback for virtual filenames (`<input>`/`<text>`/empty string). Tests
// below construct real (temp-directory) file paths rather than passing an
// arbitrary directory as a stand-in — that was the v2 API shape and no
// longer reflects how the function resolves its search root.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isBradenSubmoduleFile, _resetBradenSubmoduleCacheForTests } from './_shared.js'

/** Creates a temp app root: package.json (+ optional .git marker) + a nested src/ dir. */
function makeApp({ pkgName, withGit = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bsuite-eslint-test-'))
  if (pkgName !== undefined) {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: pkgName }))
  }
  if (withGit) {
    fs.writeFileSync(path.join(dir, '.git'), 'gitdir: /elsewhere/.git/worktrees/x\n') // worktree-style .git FILE
  }
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  return dir
}

function fileIn(appDir, ...segments) {
  return path.join(appDir, 'src', ...segments)
}

beforeEach(() => {
  _resetBradenSubmoduleCacheForTests()
})

// ── Basic correctness ───────────────────────────────────────────────────

test('returns true for a real file inside a braden-app package root', () => {
  const app = makeApp({ pkgName: 'braden-app' })
  assert.equal(isBradenSubmoduleFile(fileIn(app, 'App.tsx')), true)
})

test('returns false for a real file inside a non-braden package root', () => {
  const app = makeApp({ pkgName: 'crm7-complete' })
  assert.equal(isBradenSubmoduleFile(fileIn(app, 'AIMessage.tsx')), false)
})

test('walks up from a nested file directory to find the app-root package.json', () => {
  const app = makeApp({ pkgName: 'braden-app' })
  const deeplyNested = path.join(app, 'src', 'components', 'ai', 'AIMessage.tsx')
  fs.mkdirSync(path.dirname(deeplyNested), { recursive: true })
  assert.equal(isBradenSubmoduleFile(deeplyNested), true)
})

test('fails closed (false) when no package.json is found before the .git boundary', () => {
  const app = makeApp({ withGit: true }) // no pkgName -> no package.json written
  assert.equal(isBradenSubmoduleFile(fileIn(app, 'x.ts')), false)
})

// ── F1 regression: Map cache keyed by directory, not a process-lifetime scalar ──

test('F1: two different app directories in ONE process each get their own correct result (no cross-contamination)', () => {
  const bradenApp = makeApp({ pkgName: 'braden-app' })
  const crm7App = makeApp({ pkgName: 'crm7-complete' })

  // Original bug: `let cachedResult` — the FIRST call's result won for the
  // rest of the process. Call braden first, then crm7, with no reset
  // between these two calls (that's the point of this test).
  const bradenResult = isBradenSubmoduleFile(fileIn(bradenApp, 'App.tsx'))
  const crm7Result = isBradenSubmoduleFile(fileIn(crm7App, 'AIMessage.tsx'))

  assert.equal(bradenResult, true)
  assert.equal(crm7Result, false, "crm7 must NOT inherit braden's cached true from the prior call")
})

test('F1: reversed call order gives the same correct results (order-independence)', () => {
  const bradenApp = makeApp({ pkgName: 'braden-app' })
  const crm7App = makeApp({ pkgName: 'crm7-complete' })

  // Reverse order this time: crm7 first, then braden.
  const crm7Result = isBradenSubmoduleFile(fileIn(crm7App, 'AIMessage.tsx'))
  const bradenResult = isBradenSubmoduleFile(fileIn(bradenApp, 'App.tsx'))

  assert.equal(crm7Result, false, 'crm7 checked first must still be false')
  assert.equal(bradenResult, true, 'braden checked second must still be true (not falsely enforced)')
})

test('F1: repeated calls for the same directory are cached (do not re-derive on every call)', () => {
  const app = makeApp({ pkgName: 'braden-app' })
  const f1 = fileIn(app, 'App.tsx')
  const f2 = fileIn(app, 'Other.tsx') // same directory, different file
  assert.equal(isBradenSubmoduleFile(f1), true)
  assert.equal(isBradenSubmoduleFile(f2), true)
  // Mutate the on-disk package.json AFTER the first call — if caching is
  // working, later calls for this directory must still reflect the FIRST
  // answer (proving the Map is actually being hit, not re-derived).
  fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'crm7-complete' }))
  assert.equal(isBradenSubmoduleFile(f1), true, 'cached result must not flip after the file changes on disk')
})

// ── F2 regression: rogue $HOME/package.json named "braden" must not leak ──

test('F2a: a rogue home-directory package.json named exactly "braden" (npm init -y default) does NOT match — bare "braden" was dropped from the alias set', () => {
  // Simulate `npm init -y` run in a user's home directory named "braden":
  // npm defaults `name` to the directory basename, i.e. literally "braden"
  // (not "braden-app"). The walk reaches this file (no .git boundary
  // between it and the file below), proving the SECOND, independent
  // defense (alias-set exclusion) is what saves this case.
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'bsuite-fakehome-braden-'))
  fs.writeFileSync(path.join(fakeHome, 'package.json'), JSON.stringify({ name: 'braden' }))
  // A file living under this home with NO package.json and NO .git marker
  // anywhere between it and the rogue home package.json.
  const nested = path.join(fakeHome, 'Desktop', 'Dev', 'some-project', 'src', 'x.ts')
  fs.mkdirSync(path.dirname(nested), { recursive: true })

  assert.equal(
    isBradenSubmoduleFile(nested),
    false,
    'bare "braden" package name must not match the alias set (only braden-app/@bsuite/braden do)',
  )
})

test('F2b: a .git boundary stops the walk before it ever reaches a rogue ancestor package.json — even one named "braden-app"', () => {
  // Isolate the OTHER independent defense: even if the rogue ancestor
  // package.json's name WOULD match (literally "braden-app"), a .git
  // marker between the file and that ancestor must stop the walk first.
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'bsuite-fakehome-bradenapp-'))
  fs.writeFileSync(path.join(fakeHome, 'package.json'), JSON.stringify({ name: 'braden-app' }))

  const repoRoot = path.join(fakeHome, 'Desktop', 'Dev', 'crm7-jodie-worktree')
  fs.mkdirSync(repoRoot, { recursive: true })
  fs.writeFileSync(path.join(repoRoot, '.git'), 'gitdir: /elsewhere\n') // repo boundary, no package.json here
  const nested = path.join(repoRoot, 'src', 'components', 'ai', 'AIMessage.tsx')
  fs.mkdirSync(path.dirname(nested), { recursive: true })

  assert.equal(
    isBradenSubmoduleFile(nested),
    false,
    'the .git boundary must stop the walk before reaching the rogue home package.json, regardless of its name',
  )
})

// ── F3 regression: virtual filenames use context.cwd, never process.cwd() ──

test('F3: a virtual filename ("<input>") uses the explicitly-passed cwd, not the real process.cwd()', () => {
  const bradenApp = makeApp({ pkgName: 'braden-app' })
  // process.cwd() during this test run is wherever `node --test` was
  // invoked from (this package's own directory) — definitely not braden.
  assert.notEqual(process.cwd(), bradenApp)
  assert.equal(
    isBradenSubmoduleFile('<input>', bradenApp),
    true,
    'virtual filenames must resolve against the passed-in cwd (simulating context.cwd), not process.cwd()',
  )
})

test('F3: an empty-string filename is also treated as virtual and uses the passed cwd', () => {
  const crm7App = makeApp({ pkgName: 'crm7-complete' })
  assert.equal(isBradenSubmoduleFile('', crm7App), false)
})

test('F3: a REAL filename ignores a mismatched cwd argument entirely (file-anchor wins over any cwd)', () => {
  const bradenApp = makeApp({ pkgName: 'braden-app' })
  const crm7App = makeApp({ pkgName: 'crm7-complete' })
  // Pass crm7App as "cwd" while the actual filename lives in bradenApp —
  // the real file's own directory must win; cwd is irrelevant here.
  assert.equal(isBradenSubmoduleFile(fileIn(bradenApp, 'App.tsx'), crm7App), true)
})
