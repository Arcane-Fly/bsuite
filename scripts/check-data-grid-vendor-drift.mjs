#!/usr/bin/env node
/**
 * Fail if the vendored copy of the data grid has drifted from its source.
 *
 * crm7 deploys on Vercel from its own repo, so the parent's `packages/`
 * directory does not exist in that build context. The grid therefore reaches
 * crm7 one of two ways: published to npm, or copied in. The npm route is
 * blocked on a credential (the publish token 404s on PUT when CREATING a new
 * package in the @bsuite scope), so the copy is what ships.
 *
 * A copy with no guard is a fork with a delay fuse. Someone fixes a selection
 * bug in one tree, the other keeps the bug, and the two drift apart silently
 * because nothing ever compares them. This compares them, byte for byte, on
 * every PR that touches either side.
 *
 * Deliberately a byte-exact comparison, not a fuzzy or export-surface one:
 *   - a fuzzy check passes on a changed constant, which is exactly the kind of
 *     edit that drifts unnoticed;
 *   - an export-surface check passes on any change that keeps the signature,
 *     which is most real bugs.
 * The whole value here is that the two trees are IDENTICAL, so identity is
 * what gets asserted.
 *
 * Self-test: `node scripts/check-data-grid-vendor-drift.mjs --self-test`
 * mutates a byte in a temp copy and asserts the comparison REPORTS it. A guard
 * that cannot fail is not a guard, and this repo has shipped three of those.
 *
 * Retire this along with the vendored copy once a scope-wide npm token exists.
 */

import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const SOURCE = join(ROOT, 'packages', 'data-grid', 'src')
const VENDOR = join(ROOT, 'crm7', 'src', 'components', 'data-grid')

/** Every file under `dir`, as repo-relative POSIX paths, sorted. */
function listFiles(dir) {
  const out = []
  const walk = (current) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) walk(full)
      else out.push(relative(dir, full).split(sep).join('/'))
    }
  }
  walk(dir)
  return out.sort()
}

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

/** Compare two trees. Returns a list of human-readable differences. */
function diffTrees(sourceDir, vendorDir) {
  const sourceFiles = listFiles(sourceDir)
  const vendorFiles = listFiles(vendorDir)
  const differences = []

  for (const file of sourceFiles) {
    if (!vendorFiles.includes(file)) differences.push(`MISSING from vendored copy: ${file}`)
  }
  for (const file of vendorFiles) {
    if (!sourceFiles.includes(file)) differences.push(`EXTRA in vendored copy: ${file}`)
  }
  for (const file of sourceFiles) {
    if (!vendorFiles.includes(file)) continue
    if (sha(join(sourceDir, file)) !== sha(join(vendorDir, file))) {
      differences.push(`CONTENT differs: ${file}`)
    }
  }
  return differences
}

if (process.argv.includes('--self-test')) {
  // Prove the comparison can actually fail: copy the source, flip one byte,
  // and require that the difference is reported.
  const scratch = mkdtempSync(join(tmpdir(), 'data-grid-drift-'))
  try {
    const files = listFiles(SOURCE)
    if (files.length === 0) {
      console.error('SELF-TEST FAIL: source tree is empty, so nothing could be compared')
      process.exit(1)
    }
    // Reproduce the tree, then corrupt exactly one file.
    const { mkdirSync, copyFileSync } = await import('node:fs')
    for (const file of files) {
      const target = join(scratch, file)
      mkdirSync(join(target, '..'), { recursive: true })
      copyFileSync(join(SOURCE, file), target)
    }
    const cleanDiff = diffTrees(SOURCE, scratch)
    if (cleanDiff.length !== 0) {
      console.error('SELF-TEST FAIL: an exact copy reported differences:', cleanDiff)
      process.exit(1)
    }
    const victim = join(scratch, files[0])
    writeFileSync(victim, readFileSync(victim, 'utf8') + '\n// drift\n')
    const dirtyDiff = diffTrees(SOURCE, scratch)
    if (!dirtyDiff.some((d) => d.startsWith('CONTENT differs'))) {
      console.error('SELF-TEST FAIL: a one-byte change was NOT reported. This guard is blind.')
      process.exit(1)
    }
    console.log(`  clean copy      -> 0 differences`)
    console.log(`  one byte changed -> ${dirtyDiff.length} difference(s) reported`)
    console.log('SELF-TEST PASS')
    process.exit(0)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

const differences = diffTrees(SOURCE, VENDOR)

if (differences.length > 0) {
  console.error('Vendored data grid has DRIFTED from packages/data-grid/src:\n')
  for (const difference of differences) console.error(`  ${difference}`)
  console.error(
    [
      '',
      'These two trees must stay byte-identical. The vendored copy exists only',
      'because crm7 cannot see the parent packages/ directory on Vercel and the',
      'npm publish token cannot create a new @bsuite package — it is a delivery',
      'workaround, not a place to make changes.',
      '',
      'Edit packages/data-grid/src, then re-sync:',
      '  rm -rf crm7/src/components/data-grid',
      '  cp -r packages/data-grid/src/. crm7/src/components/data-grid/',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

console.log(`Vendored data grid matches source (${listFiles(SOURCE).length} files, byte-identical).`)
