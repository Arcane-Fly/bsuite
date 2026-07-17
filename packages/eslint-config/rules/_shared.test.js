// Zero-dependency test using Node's built-in test runner (node:test) —
// this package has no existing test harness; adding a full vitest setup
// for one pure function was judged unnecessary overhead. Run via
// `node --test rules/_shared.test.js` (wired as the package `test` script).
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { isBradenSubmoduleFile, _resetBradenSubmoduleCacheForTests } from './_shared.js'

function makeTempApp(pkgName) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bsuite-eslint-test-'))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: pkgName }))
  return dir
}

beforeEach(() => {
  _resetBradenSubmoduleCacheForTests()
})

test('returns true when the nearest package.json name is braden-app', () => {
  const dir = makeTempApp('braden-app')
  assert.equal(isBradenSubmoduleFile('irrelevant.tsx', dir), true)
})

test('returns false for a non-braden package name', () => {
  const dir = makeTempApp('crm7-complete')
  assert.equal(isBradenSubmoduleFile('irrelevant.tsx', dir), false)
})

test('returns false for a contributor home directory containing "braden" with no package.json context match', () => {
  // Regression: the ORIGINAL bug — a path like /home/braden/... must not
  // exempt files just because "braden" appears in the path.
  const dir = makeTempApp('crm7-complete')
  const fakeHomeStyleFile = '/home/braden/Desktop/Dev/crm7-jodie-worktree/src/components/ai/AIMessage.tsx'
  assert.equal(isBradenSubmoduleFile(fakeHomeStyleFile, dir), false)
})

test('returns false for a worktree directory named with a "braden" prefix but a non-braden package.json', () => {
  // Regression: directory NAMING must not matter, only the package.json fact.
  const dir = makeTempApp('crm7-complete')
  assert.equal(isBradenSubmoduleFile('src/App.tsx', dir), false)
})

test('walks up from a nested cwd to find the app-root package.json', () => {
  const dir = makeTempApp('braden-app')
  const nested = path.join(dir, 'src', 'components')
  fs.mkdirSync(nested, { recursive: true })
  assert.equal(isBradenSubmoduleFile('irrelevant.tsx', nested), true)
})

test('fails closed (false) when no package.json is found', () => {
  // Use the filesystem root as cwd — no package.json should exist there
  // in any real environment.
  assert.equal(isBradenSubmoduleFile('irrelevant.tsx', path.parse(process.cwd()).root), false)
})
