#!/usr/bin/env node
/**
 * Every `steps.<id>.outputs.<name>` in a workflow must name a step that exists.
 *
 * WHY THIS EXISTS
 * ───────────────
 * GitHub Actions does not error on a reference to a step id that does not exist —
 * it substitutes the EMPTY STRING. So a typo'd or renamed step id produces an env
 * var that is silently blank, and the job carries on.
 *
 * Measured 2026-08-31: `.github/workflows/supabase-migrate.yml` passed
 * `PROJECT_ID: ${{ steps.project.outputs.project_id }}` to its ledger gate. No step
 * in that workflow has `id: project`, so PROJECT_ID had been empty on every run
 * since the line was written. The gate could not reach the database, and because it
 * FAILED OPEN it reported clean — it had never actually run. It only surfaced when
 * that gate was rewritten to refuse (exit 2) rather than pass when it cannot see.
 *
 * That is the expensive shape: a guard that reports success while being fed
 * nothing. This check makes the reference itself the thing that fails, at lint
 * time, instead of leaving it to be discovered by whatever the guard was meant to
 * catch.
 *
 * THE MATCHER IS THE HARD PART. A step id is written BOTH ways in this estate:
 *
 *     - id: pooler          (first key of a list item)
 *       id: resolve-dir     (a later key)
 *
 * A first draft of this check matched only `^\s*id:` and reported three false
 * positives — `set-matrix` in three workflows, every one of them real and declared
 * as `- id: set-matrix`. Both forms are accepted here, and both are asserted below,
 * because a checker that cries wolf gets switched off.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Step ids declared in a workflow, in either YAML spelling. */
export function declaredStepIds(source) {
  const ids = new Set()
  for (const line of source.split('\n')) {
    const m = line.match(/^[ \t]*-?[ \t]*id:[ \t]*([A-Za-z0-9_-]+)[ \t]*$/)
    if (m) ids.add(m[1])
  }
  return ids
}

/** Every `steps.<id>.outputs.<name>` reference, with the id and the line number. */
export function stepOutputRefs(source) {
  const out = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    // A full-line YAML comment is inert. Skipping it is not cosmetic: this file
    // documents the bad reference in its own prose, and a matcher that reads raw
    // lines reports ITSELF. It did exactly that on first run.
    if (lines[i].trim().startsWith('#')) continue
    const re = /steps\.([A-Za-z0-9_-]+)\.outputs\.([A-Za-z0-9_-]+)/g
    let m
    while ((m = re.exec(lines[i])) !== null) out.push({ line: i + 1, id: m[1], output: m[2] })
  }
  return out
}

/** Refs whose step id is not declared in the same workflow. */
export function danglingRefs(source) {
  const ids = declaredStepIds(source)
  return stepOutputRefs(source).filter((r) => !ids.has(r.id))
}

function selfTest() {
  const cases = []
  const t = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want })

  t('a reference to a missing step is reported',
    danglingRefs('        run: echo ${{ steps.project.outputs.project_id }}').map((r) => r.id), ['project'])

  // The two spellings. Getting either wrong produces false positives, which is
  // what a first draft of this check actually did.
  t('`- id: x` (list-item form) counts as declared',
    danglingRefs('      - id: set-matrix\n        run: echo ${{ steps.set-matrix.outputs.matrix }}').map((r) => r.id), [])
  t('`id: x` (later-key form) counts as declared',
    danglingRefs('        id: pooler\n        run: echo ${{ steps.pooler.outputs.db_host }}').map((r) => r.id), [])

  t('a hyphenated id is matched exactly, not as a prefix',
    danglingRefs('      - id: resolve-dir\n        run: ${{ steps.resolve.outputs.x }}').map((r) => r.id), ['resolve'])
  t('two dangling refs on one line are both reported',
    danglingRefs('run: ${{ steps.a.outputs.x }} ${{ steps.b.outputs.y }}').map((r) => r.id), ['a', 'b'])
  t('a declared id used many times reports nothing',
    danglingRefs('      - id: p\n        run: ${{ steps.p.outputs.a }} ${{ steps.p.outputs.b }}').length, 0)
  // NEGATIVE CONTROL: other contexts are not step outputs and are none of our business.
  t('vars/secrets/needs contexts are not step outputs',
    danglingRefs('run: ${{ vars.X }} ${{ secrets.Y }} ${{ needs.j.outputs.z }}').length, 0)
  t('declaredStepIds finds both spellings',
    [...declaredStepIds('      - id: a\n        id: b\n')].sort(), ['a', 'b'])
  t('a commented id does NOT count as declared',
    danglingRefs('      # id: ghost\n      run: ${{ steps.ghost.outputs.x }}').map((r) => r.id), ['ghost'])
  // NEGATIVE CONTROL: this script and the workflow it fixed both DESCRIBE the bad
  // reference in prose. A matcher over raw lines reports itself — it did.
  t('a commented-out reference is not reported',
    danglingRefs('      # PROJECT_ID: ${{ steps.project.outputs.project_id }}').length, 0)
  t('a commented reference does not mask a real one on another line',
    danglingRefs('      # ${{ steps.ghost.outputs.a }}\n      run: ${{ steps.real.outputs.b }}').map((r) => r.id), ['real'])

  t('line number is reported',
    danglingRefs('one\ntwo\nrun: ${{ steps.z.outputs.q }}')[0].line, 3)

  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) {
    console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  }
  console.log(`\ncheck-workflow-step-refs: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length ? 1 : 0
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest())

  const dir = process.argv[2] || '.github/workflows'
  let files
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).map((f) => join(dir, f))
  } catch {
    console.error(`::error::cannot read ${dir} — that is an ABSENT result, not a clean one.`)
    process.exit(2)
  }
  if (files.length === 0) {
    console.error(`::error::check-workflow-step-refs examined 0 workflows under ${dir} — that is an ABSENT result, not a clean one.`)
    process.exit(2)
  }

  let violations = 0
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const { line, id, output } of danglingRefs(src)) {
      violations += 1
      console.error(`::error file=${f},line=${line}::\`steps.${id}.outputs.${output}\` names a step that does not exist in this workflow. Actions substitutes the EMPTY STRING rather than failing, so whatever consumes it is silently blank — which is how a gate ends up reporting clean while being fed nothing.`)
    }
  }

  console.log(`check-workflow-step-refs: ${files.length} workflow(s) under ${dir}, ${violations} dangling reference(s)`)
  process.exit(violations ? 1 : 0)
}

main()
