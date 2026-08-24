#!/usr/bin/env node
/**
 * check-publish-dist-tag-wiring — every publish workflow must decide its dist-tag
 * explicitly, and must decide it BEFORE anything uses it.
 *
 * WHY A GUARD AND NOT JUST THE FIX
 * ────────────────────────────────
 * `npm publish` applies the 'latest' dist-tag unless `--tag` is given — including for
 * a version carrying a semver prerelease. So a publish workflow that omits `--tag` is
 * not merely untidy: the moment anyone bumps a package to `1.2.0-rc.1` to get it onto
 * a preview host, that release candidate becomes what every consumer on `^1.2.0`
 * installs in production. The failure is silent, immediate and estate-wide.
 *
 * Fifteen publish workflows were wired at once (bsuite, 2026-08-24). The sixteenth —
 * the one added next month for a new package, by copying an older file — is the one
 * this guard exists for. A wiring that holds only because someone remembered is the
 * same class of defect as the sync gap that kept two skills invisible for a week.
 *
 * WHAT IT CHECKS, per .github/workflows/publish-*.yml
 *   1. a step invokes scripts/publish-dist-tag.mjs
 *   2. every `npm publish` invocation carries `--tag`
 *   3. the deciding step appears BEFORE the first use of its output
 *      (a dry-run step placed above the decision reads an empty tag)
 *
 * USAGE
 *   node scripts/check-publish-dist-tag-wiring.mjs
 *   node scripts/check-publish-dist-tag-wiring.mjs --self-test
 */

import { readdirSync, readFileSync } from 'node:fs'

const DIR = '.github/workflows'
const DECIDER = 'publish-dist-tag.mjs'
const TAG_OUTPUT = 'steps.dist-tag.outputs.tag'

/** Pure, so the self-test exercises the real rule rather than a paraphrase. */
export function inspect(name, src) {
  const problems = []
  const lines = src.split('\n')

  const deciderLine = lines.findIndex((l) => l.includes(DECIDER))
  if (deciderLine === -1) {
    problems.push(
      `no step invokes ${DECIDER}. Without it the publish falls back to npm's default ` +
        `dist-tag, which is 'latest' even for a prerelease.`,
    )
  }

  // Every real `npm publish` must carry --tag. `--dry-run` counts: it is supposed to
  // exercise the same command shape, and a dry run that omits the flag stops proving
  // anything about the publish that follows it.
  lines.forEach((l, i) => {
    const t = l.trim()
    if (!/^run:\s*npm publish\b/.test(t)) return
    if (!t.includes('--tag')) {
      problems.push(`line ${i + 1}: \`${t}\` does not pass --tag, so npm will apply 'latest'.`)
    }
  })

  const firstUse = lines.findIndex((l) => l.includes(TAG_OUTPUT))
  if (deciderLine !== -1 && firstUse !== -1 && firstUse < deciderLine) {
    problems.push(
      `the dist-tag is used at line ${firstUse + 1} but decided at line ${deciderLine + 1}. ` +
        `A step above the decision reads an EMPTY tag.`,
    )
  }

  return { name, problems }
}

function selfTest() {
  const GOOD = [
    '      - name: Decide the dist-tag',
    '        id: dist-tag',
    '        run: node "$GITHUB_WORKSPACE/scripts/publish-dist-tag.mjs" --version "$V"',
    '      - name: Publish to npm',
    '        run: npm publish --access public --tag "${{ steps.dist-tag.outputs.tag }}"',
  ].join('\n')

  const cases = [
    ['a correctly wired workflow passes', GOOD, 0],
    ['a workflow with no decider is caught',
      '      - name: Publish to npm\n        run: npm publish --access public --tag "x"', 1],
    ['a bare `npm publish` with no --tag is caught',
      GOOD.replace(' --tag "${{ steps.dist-tag.outputs.tag }}"', ''), 1],
    ['a dry run above the decision is caught',
      [
        '      - name: Dry-run publish',
        '        run: npm publish --dry-run --access public --tag "${{ steps.dist-tag.outputs.tag }}"',
        GOOD,
      ].join('\n'), 1],
    ['a workflow missing BOTH decider and --tag reports both',
      '      - name: Publish to npm\n        run: npm publish --access public', 2],
  ]

  let bad = 0
  for (const [label, src, wantCount] of cases) {
    const got = inspect('fixture', src).problems.length
    if (got !== wantCount) {
      console.error(`  FAIL ${label}: wanted ${wantCount} problem(s), got ${got}`)
      bad++
    }
  }
  console.log(
    `check-publish-dist-tag-wiring --self-test: ${cases.length} cases exercised ` +
      `(a clean pass, a missing decider, a missing --tag, an out-of-order dry run, ` +
      `and a doubly-broken workflow) — the checker is proven able to fail before any ` +
      `verdict below is trusted.`,
  )
  return bad
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  if (selfTest() !== 0) {
    console.error('::error::the checker failed its own self-test; its verdict below would be meaningless.')
    process.exit(1)
  }

  // A publish workflow is identified by what it DOES — it invokes `npm publish` —
  // not by what it is called. A name-only glob put this guard's own workflow into
  // its denominator the moment the file was called publish-dist-tag-wiring.yml, and
  // a count that includes a file which cannot publish anything is a count nobody can
  // reason about. Files matching the name but carrying no publish are reported as
  // skipped rather than silently dropped.
  let candidates
  try {
    candidates = readdirSync(DIR).filter((f) => f.startsWith('publish-') && f.endsWith('.yml')).sort()
  } catch (e) {
    console.error(`::error::cannot read ${DIR}: ${e.message}`)
    process.exit(1)
  }
  const sources = new Map(candidates.map((f) => [f, readFileSync(`${DIR}/${f}`, 'utf8')]))
  const files = candidates.filter((f) => /^\s*run:\s*npm publish\b/m.test(sources.get(f)))
  const skipped = candidates.filter((f) => !files.includes(f))

  // A ZERO here means "found nothing to check", which is never a pass. This estate has
  // fifteen publishing workflows; a run that examines none is a broken glob or a renamed
  // convention, not a clean bill.
  if (files.length === 0) {
    console.error(
      `::error::0 of ${candidates.length} ${DIR}/publish-*.yml file(s) invoke \`npm publish\`. ` +
        `That is "could not check", not "nothing to check". Refusing to report a pass.`,
    )
    process.exit(1)
  }

  // A ZERO here means "found nothing to check", which is never a pass. This estate has
  // fifteen publish workflows; a run that examines none is a broken glob, not a clean bill.


  const results = files.map((f) => inspect(f, sources.get(f)))
  const failing = results.filter((r) => r.problems.length > 0)

  // HEAD LINE FIRST — the denominator before any verdict.
  console.log(
    `[publish-dist-tag-wiring] ${candidates.length} publish-*.yml file(s) found; ` +
      `${files.length} invoke \`npm publish\` and were examined; ` +
      `${failing.length} with a wiring defect.`,
  )
  if (skipped.length > 0) {
    console.log(`  not a publish workflow (no \`npm publish\` step), skipped: ${skipped.join(', ')}`)
  }

  for (const r of failing) {
    for (const p of r.problems) console.error(`::error file=${DIR}/${r.name}::${r.name}: ${p}`)
  }

  if (failing.length > 0) {
    console.error(
      `::error::${failing.length} of ${files.length} publish workflow(s) can publish under npm's ` +
        `default dist-tag. See scripts/publish-dist-tag.mjs for the wiring every one of them needs.`,
    )
    process.exit(1)
  }
  console.log(`✓ all ${files.length} publish workflow(s) decide their dist-tag explicitly, before using it.`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
