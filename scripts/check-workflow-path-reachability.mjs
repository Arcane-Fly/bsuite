#!/usr/bin/env node
/**
 * check-workflow-path-reachability — a `paths:` filter that names a file INSIDE a
 * submodule can never match, because the parent only ever sees a gitlink.
 *
 * WHY
 * ---
 * A submodule is one line in the parent's tree. When an app's pointer moves, the
 * parent's diff contains exactly one path:
 *
 *     $ gh pr view 2322 --json files
 *     business-suite-unified
 *     crm7
 *     docs/nav/route-inventory.json
 *
 * `crm7`, not `crm7/src/...`. So a filter of `crm7/**`, or a `<star>/supabase/functions/**` glob,
 * matches NOTHING a parent PR can contain. The workflow is green because it never runs.
 *
 * `edge-function-typecheck.yml` is the measured case: a `<star>/supabase/functions/**` glob plus a
 * real `supabase/functions/**` for the parent's own two functions. Its last run before
 * this guard was 2026-08-16 — eight days, across many gitlink bumps, during which no
 * app edge function was type-checked at all and the gate reported nothing wrong.
 *
 * THE FIX, per workflow, is to add the BARE submodule paths alongside:
 *     paths:
 *       - 'crm7'                       # the gitlink itself
 *       - 'crm7/supabase/functions/**' # kept: matches when run inside the submodule
 *
 * WHAT THIS IS NOT
 * ----------------
 * Not every such filter is a defect. A workflow may deliberately watch only the parent's
 * own copy of a path. So this RATCHETS against a baseline rather than failing the world:
 * a workflow already known to carry submodule-blind filters is reported, a NEW one fails,
 * and a baselined entry that has since been fixed also fails so the list only shrinks.
 *
 *   node scripts/check-workflow-path-reachability.mjs
 *   node scripts/check-workflow-path-reachability.mjs --self-test
 */

import { readFileSync, readdirSync } from 'node:fs'

const DIR = '.github/workflows'
const BASELINE = 'scripts/workflow-path-reachability-baseline.json'

export function submodulesFrom(gitmodules) {
  return [...gitmodules.matchAll(/^\s*path\s*=\s*(.+)$/gm)].map((m) => m[1].trim())
}

/**
 * Pure. Given a workflow's text and the submodule list, return the path filters that
 * can never match a parent diff.
 */
export function unreachableFilters(src, submodules) {
  const out = []
  const lines = src.split('\n')

  // Collect each `paths:` / `paths-ignore:` BLOCK separately. The question is not
  // "does this filter reach inside a submodule" — `crm7/**` is perfectly sensible and
  // matches when the workflow runs inside crm7's own repo. The question is whether the
  // block ALSO carries the bare gitlink path, which is the only form a parent diff can
  // ever contain. `crm7/**` alone is blind; `crm7` and `crm7/**` together are complete.
  const blocks = []
  let cur = null
  lines.forEach((raw, i) => {
    const t = raw.trim()
    const indent = raw.length - raw.trimStart().length
    if (/^paths(-ignore)?:\s*$/.test(t)) { cur = { indent, entries: [] }; blocks.push(cur); return }
    if (!cur) return
    if (t === '' || t.startsWith('#')) return
    if (!t.startsWith('- ') || indent <= cur.indent) { cur = null; return }
    cur.entries.push({ line: i + 1, value: t.slice(2).trim().replace(/^['"]|['"]$/g, '') })
  })

  for (const block of blocks) {
    const values = block.entries.map((e) => e.value)
    for (const e of block.entries) {
      const first = e.value.split('/')[0]
      if (!e.value.includes('/')) continue          // already the reachable bare form
      if (first === '*') {
        const missing = submodules.filter((s) => !values.includes(s))
        if (missing.length) {
          out.push({
            line: e.line, value: e.value,
            why: `'*' expands to a top-level entry, and every one that could match is a submodule — which a parent diff contains only as a bare path. This block does not list ${missing.join(', ')}`,
          })
        }
      } else if (submodules.includes(first) && !values.includes(first)) {
        out.push({
          line: e.line, value: e.value,
          why: `'${first}' is a submodule; a parent diff contains it as the bare path '${first}', never as '${e.value}', and this block does not list '${first}'`,
        })
      }
    }
  }
  return out
}

function selfTest() {
  const subs = ['crm7', 'conduit']
  const cases = [
    ['a bare submodule path is reachable', "on:\n  pull_request:\n    paths:\n      - 'crm7'", 0],
    ['a path inside a submodule with NO bare path is unreachable', "on:\n  pull_request:\n    paths:\n      - 'crm7/supabase/functions/**'", 1],
    // The fix this guard asks for must itself read as clean, or the guard can never
    // go green and everyone learns to ignore it.
    ['the same path WITH the bare gitlink alongside is fine',
      "on:\n  pull_request:\n    paths:\n      - 'crm7'\n      - 'crm7/supabase/functions/**'", 0],
    ['a */ glob with every submodule listed is fine',
      "on:\n  pull_request:\n    paths:\n      - 'crm7'\n      - 'conduit'\n      - '*/supabase/functions/**'", 0],
    ['a */ glob is unreachable', "on:\n  pull_request:\n    paths:\n      - '*/supabase/functions/**'", 1],
    ['a parent-owned path is reachable', "on:\n  pull_request:\n    paths:\n      - 'supabase/functions/**'", 0],
    ['a parent scripts path is reachable', "on:\n  pull_request:\n    paths:\n      - 'scripts/x.mjs'", 0],
    ['several unreachable filters are all reported',
      "on:\n  pull_request:\n    paths:\n      - 'crm7/**'\n      - 'conduit/**'\n      - 'scripts/x.mjs'", 2],
    ['a second paths: block is judged on its OWN entries, not the first block\'s',
      "on:\n  pull_request:\n    paths:\n      - 'crm7'\n      - 'crm7/**'\n  push:\n    paths:\n      - 'crm7/**'", 1],
    // A `- 'x'` outside a paths: list is not a path filter.
    ['a branches list is not mistaken for paths',
      "on:\n  pull_request:\n    branches:\n      - 'crm7/whatever'\n    paths:\n      - 'scripts/x.mjs'", 0],
    ['paths-ignore is checked too', "on:\n  push:\n    paths-ignore:\n      - 'crm7/docs/**'", 1],
  ]
  let bad = 0
  for (const [label, src, want] of cases) {
    const got = unreachableFilters(src, subs).length
    if (got !== want) { console.error(`  FAIL ${label}: wanted ${want}, got ${got}`); bad++ }
  }
  // submodulesFrom must actually parse .gitmodules, or every verdict below is empty.
  const parsed = submodulesFrom('[submodule "crm7"]\n\tpath = crm7\n\turl = x\n[submodule "a"]\n\tpath = braden\n')
  if (parsed.join(',') !== 'crm7,braden') { console.error(`  FAIL submodulesFrom: got ${parsed}`); bad++ }
  console.log(
    `check-workflow-path-reachability --self-test: ${cases.length} filter cases (bare path, ` +
      `inside-submodule, '*/' glob, parent-owned paths, a multi-filter workflow, a branches ` +
      `list that must NOT be mistaken for paths, and paths-ignore) plus a .gitmodules parse.`,
  )
  return bad
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  if (selfTest() !== 0) { console.error('::error::checker failed its own self-test'); process.exit(1) }

  const submodules = submodulesFrom(readFileSync('.gitmodules', 'utf8'))
  if (submodules.length === 0) {
    console.error('::error::.gitmodules names 0 submodules — that is "could not check", not "nothing to check".')
    process.exit(1)
  }

  const files = readdirSync(DIR).filter((f) => f.endsWith('.yml')).sort()
  const found = new Map()
  for (const f of files) {
    const hits = unreachableFilters(readFileSync(`${DIR}/${f}`, 'utf8'), submodules)
    if (hits.length) found.set(f, hits)
  }

  let baseline = {}
  try { baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).workflows ?? {} } catch { /* first run */ }

  const newly = [...found.keys()].filter((f) => !(f in baseline))
  const fixed = Object.keys(baseline).filter((f) => !found.has(f))

  // HEAD LINE FIRST — the denominator before the verdict.
  console.log(
    `[workflow-path-reachability] ${files.length} workflow(s) examined against ` +
      `${submodules.length} submodule(s); ${found.size} carry a filter a parent diff can never match ` +
      `(${Object.keys(baseline).length} baselined, ${newly.length} new, ${fixed.length} now clean).`,
  )

  for (const [f, hits] of found) {
    const tag = f in baseline ? 'known' : 'NEW'
    for (const h of hits) {
      const msg = `${f}:${h.line} '${h.value}' — ${h.why}. Add the bare submodule path alongside it.`
      if (tag === 'NEW') console.error(`::error file=${DIR}/${f},line=${h.line}::${msg}`)
      else console.log(`  known  ${msg}`)
    }
  }
  for (const f of fixed) {
    console.error(`::error::${f} is in ${BASELINE} but no longer carries an unreachable filter. Remove it — this list may only shrink.`)
  }

  if (newly.length || fixed.length) process.exit(1)
  console.log(`✓ no new submodule-blind path filters.`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
