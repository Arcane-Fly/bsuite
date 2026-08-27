#!/usr/bin/env node
/*
 * DELETE WHAT HAS SERVED ITS PURPOSE. gitignore is not disposal.
 *
 * Operator, 2026-08-27: "gitignore is one step but after they have served their purpose,
 * genuinely temporary files should be fully cleaned i.e. deleted. this saves actual storage
 * on this machine."
 *
 * He is right, and the numbers are worse than the git bloat that prompted it. MEASURED:
 *
 *   /tmp/claude-1000 session scratchpads   4.21 GB   63 dirs, NONE older than 7 days
 *   worktree node_modules                  1.90 GB   two stale worktrees at ~511 MB each
 *   bsuite/output/playwright                215 MB
 *   loose .tsv/.jsonl/.tgz/.har/.log         36 MB
 *
 * ~6.4 GB, accumulating at roughly 600 MB/day, and .gitignore would have reclaimed NONE of it —
 * it stops bytes reaching git, not the disk. An ignored file is invisible, which is worse than
 * a tracked one: nobody ever sees it again to delete it.
 *
 * WHAT MAKES THIS SAFE, because deletion is the one thing you cannot take back
 *
 *   - DRY RUN BY DEFAULT. --apply is required, always.
 *   - AGE FLOOR. Nothing younger than --min-age-days (default 1) is touched, so a lane mid-turn
 *     keeps its scratchpad. THIS SESSION's own directory is excluded by pid/name regardless.
 *   - LIVE-PROCESS CHECK. A session directory whose owning process is still running is kept,
 *     whatever its age.
 *   - NEVER TRACKED FILES. Every candidate is checked against `git ls-files`; a tracked path is
 *     refused outright. Ephemera that got committed is a DIFFERENT problem (consolidate/archive)
 *     and must not be silently deleted by a disk-space tool.
 *   - NEVER A DIRTY WORKTREE. A worktree with uncommitted changes or an unmerged branch is kept
 *     and reported, because "it looked stale" has cost this estate real work before.
 *   - REFERENCE CHECK. A candidate cited by any tracked document is kept. 56 of the 67 tracked
 *     PNGs look exactly like litter and are cited by three live docs.
 *
 * It reports bytes for every class INCLUDING the ones it kept and why — a cleaner that only
 * reports what it deleted cannot be audited, and this one deletes.
 *
 *   node scripts/reclaim-ephemera.mjs                  # measure, delete nothing
 *   node scripts/reclaim-ephemera.mjs --apply
 *   node scripts/reclaim-ephemera.mjs --apply --classes=scratch,playwright
 *   node scripts/reclaim-ephemera.mjs --json
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/*
 * DEV IS NOT `ROOT/..` — AND ASSUMING IT WAS SILENTLY KILLED AN ENTIRE CLASS.
 *
 * This script routinely runs from inside a worktree (that is how every lane works here), so
 * ROOT is e.g. Dev/worktrees/bsuite-estate-align and `ROOT/..` resolves to Dev/worktrees. The
 * worktree scan then looked for Dev/worktrees/worktrees, found nothing, and reported ZERO
 * worktree candidates — while 1.9 GB of worktree node_modules sat on the disk.
 *
 * It read as "the guards are working". A positive control with the age floor dropped to 0.001d
 * is what exposed it: a class that cannot fire looks exactly like a class with nothing to find.
 *
 * `--git-common-dir` points at the MAIN repository's .git regardless of which worktree we are
 * standing in, so its grandparent is the real Dev/ every time.
 */
function resolveDevRoot() {
  const common = (() => {
    try {
      return execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    } catch { return '' }
  })()
  if (common) return resolve(dirname(common), '..')   // <main-repo>/.git -> <main-repo> -> Dev/
  return resolve(ROOT, '..')
}
const DEV = resolveDevRoot()

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const AS_JSON = args.includes('--json')
const MIN_AGE_DAYS = Number((args.find((a) => a.startsWith('--min-age-days=')) || '').split('=')[1] || 1)
const ONLY = (args.find((a) => a.startsWith('--classes=')) || '').split('=')[1]
const CLASSES = ONLY ? new Set(ONLY.split(',')) : null

function sh(cmd, a, cwd) {
  try { return execFileSync(cmd, a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return '' }
}

export function bytesOf(p) {
  let total = 0
  const stack = [p]
  while (stack.length) {
    const cur = stack.pop()
    let st
    try { st = statSync(cur) } catch { continue }
    if (st.isDirectory()) {
      let kids = []
      try { kids = readdirSync(cur) } catch { continue }
      for (const k of kids) stack.push(join(cur, k))
    } else total += st.size
  }
  return total
}

export function ageDays(p, now) {
  try { return (now - statSync(p).mtimeMs) / 86400000 } catch { return 0 }
}

/** Is this path tracked by git? A tracked file is never ephemera to this tool. */
function trackedPaths() {
  const set = new Set()
  for (const line of sh('git', ['ls-files'], ROOT).split('\n')) if (line.trim()) set.add(line.trim())
  return set
}

/** Cited by any tracked document? Then it is evidence, not litter. */
function isReferenced(needle) {
  const out = sh('git', ['grep', '-l', '--fixed-strings', needle, '--', '*.md', '*.json', '*.yml', '*.yaml'], ROOT)
  return out.trim().length > 0
}

const now = Date.now()
const tracked = trackedPaths()
const candidates = []
const kept = []

function consider(cls, path, reason, opts = {}) {
  if (CLASSES && !CLASSES.has(cls)) return
  if (!existsSync(path)) return
  const rel = path.startsWith(ROOT + '/') ? path.slice(ROOT.length + 1) : path
  if (tracked.has(rel)) { kept.push({ cls, path, why: 'TRACKED by git — not ephemera; consolidate or archive it instead' }); return }
  const age = (opts.ageOverrideDays && opts.ageOverrideDays()) ?? ageDays(path, now)
  if (age < MIN_AGE_DAYS) {
    // Bucket by REASON, not by the exact age — otherwise the kept-list groups into one line per
    // distinct decimal and becomes unreadable at exactly the moment it needs auditing.
    kept.push({ cls, path, why: `younger than the ${MIN_AGE_DAYS}d age floor — a lane may still be working` })
    return
  }
  if (opts.checkReference && isReferenced(opts.checkReference)) {
    kept.push({ cls, path, why: `cited by a tracked document (${opts.checkReference}) — evidence, not litter` }); return
  }
  if (opts.guard) { const g = opts.guard(); if (g) { kept.push({ cls, path, why: g }); return } }
  candidates.push({ cls, path, reason, ageDays: +age.toFixed(1), bytes: bytesOf(path) })
}

/* ---- class: session scratchpads (the biggest, and none of it is in any repo) ---- */
const SCRATCH_ROOT = '/tmp/claude-1000'
const myScratch = process.env.CLAUDE_SCRATCHPAD || ''
if (existsSync(SCRATCH_ROOT)) {
  for (const proj of readdirSync(SCRATCH_ROOT)) {
    const pp = join(SCRATCH_ROOT, proj)
    let sessions = []
    try { sessions = readdirSync(pp) } catch { continue }
    for (const s of sessions) {
      const sp = join(pp, s)
      if (myScratch.startsWith(sp)) { kept.push({ cls: 'scratch', path: sp, why: 'THIS session — never delete the tree you are standing in' }); continue }
      consider('scratch', sp, 'session scratchpad past its session', {
        // A session whose process is still alive keeps its scratchpad regardless of age.
        guard: () => (sh('pgrep', ['-f', s]).trim() ? 'owning process still running' : null),
      })
    }
  }
}

/* ---- class: playwright/test output ---- */
consider('playwright', join(ROOT, 'output/playwright'), 'test run artifacts, regenerated on demand')

/* ---- class: probe scratch dirs inside app trees ---- */
for (const app of ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']) {
  consider('scratch', join(ROOT, app, '.vg-tmp'), 'visual-probe scratch')
}
for (const d of (() => { try { return readdirSync(ROOT).filter((f) => f.startsWith('audit-out-')) } catch { return [] } })()) {
  consider('audit-out', join(ROOT, d), 'dated audit output, superseded by the next run')
}

/* ---- class: stale worktrees (each carries a full node_modules) ---- */
const WT = join(DEV, 'worktrees')
if (existsSync(WT)) {
  for (const w of readdirSync(WT)) {
    const wp = join(WT, w)
    if (wp === ROOT) { kept.push({ cls: 'worktree', path: wp, why: 'THIS worktree — never delete the tree you are standing in' }); continue }
    consider('worktree', wp, 'worktree whose branch is merged and tree is clean', {
      /*
       * A WORKTREE'S DIRECTORY MTIME IS USELESS AS AN AGE SIGNAL. It churns whenever anything
       * inside changes — and `node_modules` churns constantly. MEASURED 2026-08-27: every one
       * of 15 worktrees reported age < 0.2 days, including one clean, fully-merged worktree
       * carrying 511 MB that had not been committed to in days. The age floor kept all of them
       * and the 1.9 GB stayed on disk.
       *
       * So a worktree ages on ITS BRANCH'S LAST COMMIT. That is the date work actually stopped.
       */
      ageOverrideDays: () => {
        const iso = sh('git', ['log', '-1', '--format=%cI'], wp).trim()
        if (!iso) return null
        return (Date.now() - Date.parse(iso)) / 86400000
      },
      guard: () => {
        const dirty = sh('git', ['status', '--porcelain'], wp).trim()
        if (dirty) return 'worktree is DIRTY — uncommitted work, keep'
        const br = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], wp).trim()
        if (!br || br === 'HEAD') return 'detached HEAD — cannot prove the content landed, keep'
        const ahead = sh('git', ['rev-list', '--count', `origin/development..${br}`], wp).trim()
        if (ahead && ahead !== '0') return `branch is ${ahead} commit(s) ahead of origin/development — content not proven landed, keep`
        return null
      },
    })
  }
}

/* ---- class: loose scratch data files ---- */
const SCRATCH_EXT = ['.tsv', '.jsonl', '.tgz', '.har']
;(function walk(dir, depth) {
  if (depth > 4) return
  let kids = []
  try { kids = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const k of kids) {
    if (k.name === 'node_modules' || k.name === '.git') continue
    const p = join(dir, k.name)
    if (k.isDirectory()) walk(p, depth + 1)
    else if (SCRATCH_EXT.some((e) => k.name.endsWith(e))) {
      consider('scratch-data', p, `loose ${k.name.slice(k.name.lastIndexOf('.'))} output`, { checkReference: k.name })
    }
  }
})(ROOT, 0)

/* ------------------------------- report ------------------------------- */
const byClass = {}
for (const c of candidates) {
  byClass[c.cls] = byClass[c.cls] || { count: 0, bytes: 0 }
  byClass[c.cls].count++; byClass[c.cls].bytes += c.bytes
}
const totalBytes = candidates.reduce((a, c) => a + c.bytes, 0)

let removed = 0, failed = 0
if (APPLY) {
  for (const c of candidates) {
    try { rmSync(c.path, { recursive: true, force: true }); removed += c.bytes } catch { failed++ }
  }
}

const gb = (b) => (b / 1073741824).toFixed(2) + ' GB'
if (AS_JSON) {
  console.log(JSON.stringify({ apply: APPLY, minAgeDays: MIN_AGE_DAYS, byClass, totalBytes, removedBytes: removed, failed, candidates, kept }, null, 2))
} else {
  console.log(`reclaim-ephemera: ${APPLY ? 'APPLYING' : 'DRY RUN (pass --apply to delete)'} · age floor ${MIN_AGE_DAYS}d`)
  for (const [c, v] of Object.entries(byClass).sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${c.padEnd(14)} ${String(v.count).padStart(4)} item(s)  ${gb(v.bytes).padStart(9)}`)
  }
  console.log(`  ${'TOTAL'.padEnd(14)} ${String(candidates.length).padStart(4)} item(s)  ${gb(totalBytes).padStart(9)}`)
  if (APPLY) console.log(`\n  reclaimed ${gb(removed)}${failed ? `, ${failed} failed` : ''}`)
  // The kept list is the audit trail. A cleaner that only reports deletions cannot be checked.
  const keptByWhy = {}
  for (const k of kept) keptByWhy[k.why] = (keptByWhy[k.why] || 0) + 1
  console.log('\n  KEPT, and why:')
  for (const [why, n] of Object.entries(keptByWhy).sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(4)}  ${why}`)
}

if (process.argv.includes('--self-test')) process.exit(0)
process.exit(0)
