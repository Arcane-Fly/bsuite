#!/usr/bin/env node
/**
 * sync-inline-eslint-rules.mjs — keep each submodule's inlined ESLint rule in step
 * with the monorepo source of truth.
 *
 * WHY THIS EXISTS (crm7#1579)
 * Each submodule carries its own copy of `no-hardcoded-colours.js` because Vercel
 * clones only that submodule's repo — `packages/` does not exist in its build
 * context, so the rule cannot be imported from the monorepo.
 *
 * Six copies existed. All six had the same defect: the Tailwind palette regex
 * matched only `slate|gray|zinc|neutral`, so every chromatic class passed the gate
 * and `text-amber-600` shipped to production with a green lint. Worse, the copies
 * had ALSO drifted apart — the nominal source of truth in `packages/` was the only
 * one MISSING the `(?<![\w#])` guard that stops `crm7#1234` being read as a hex
 * colour. Nothing compared them, so "fixed" meant "fixed in the one I opened".
 *
 * USAGE
 *   node scripts/sync-inline-eslint-rules.mjs           # write copies
 *   node scripts/sync-inline-eslint-rules.mjs --check   # verify, exit 1 on drift (CI)
 *   node scripts/sync-inline-eslint-rules.mjs --only crm7
 *
 * Each copy keeps its own short header; everything from the first `import` onward
 * must be byte-identical, and that is what --check compares.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Rules that are inlined into submodules, and which submodules take them. */
const SYNCED_RULES = [
  {
    source: 'packages/eslint-config/rules/no-hardcoded-colours.js',
    filename: 'no-hardcoded-colours.js',
    // braden is BRADEN-EXEMPT from the colour rule but still carries the file, so
    // it is synced for consistency — the rule self-exempts at runtime.
    submodules: ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput'],
  },
]

/**
 * Copies known to be out of sync, with the issue that will land them.
 *
 * A RATCHET, not an excuse list — same pattern as theme-conformance.yml in this
 * repo. `--check` fails on any drift NOT listed here, so a NEW divergence is
 * still caught immediately; it only tolerates the specific backlog below.
 *
 * These two are held back because the widened rule finds REAL violations in
 * them, and syncing the rule before fixing the colours would just break their
 * lint. Counts measured 2026-08-11 by running the widened rule against each app:
 *
 *   business-suite-unified  27 violations
 *   conduit                  5 violations  (analytics/_view.tsx, talent-pools/_view.tsx,
 *                                           components/pipeline/KanbanColumn.tsx)
 *
 * An earlier measurement reported ZERO for both. It counted chromatic palette
 * CLASSES only and missed the rule's new return/assignment-position checking —
 * the instrument had changed and the old number did not carry. That is the same
 * mistake the 24-entry ignore list in crm7#1579 was measured with.
 *
 * The list can only shrink. Remove an entry the moment its app is synced; the
 * check prints a notice when a listed copy turns out to be in sync already.
 */
const KNOWN_DRIFTED = {
  // IN FLIGHT — each has an open PR carrying the regenerated copy. The entry
  // comes out when the PR merges and the parent bumps that submodule's pointer.
  //
  // These drifted because the SOURCE moved after they were synced: the BSU sweep
  // found two more holes in the rule (CallExpression not walked, HTML numeric
  // entities read as hex) and fixing them re-drifted every copy. That is the
  // inherent sequencing cost of a generated file living in six repos — the
  // parent changes first and the copies follow one PR at a time.
  'crm7/no-hardcoded-colours.js': 'crm7#1622 — regenerated copy in flight',
  'braden/no-hardcoded-colours.js': 'bsuite#1889 — re-sync needed after the CallExpression fix; 0 violations, mechanical',
  'throughput/no-hardcoded-colours.js':
    'bsuite#1889 — re-sync needed after the CallExpression fix; 0 violations, mechanical',

  // BLOCKED ON REAL WORK — these two cannot take the rule until their colours
  // are fixed, or their lint breaks. Both have PRs doing exactly that.
  'business-suite-unified/no-hardcoded-colours.js':
    'bsuite#1889 / BSU#680 — 27 violations, all in edge-function email HTML',
  'conduit/no-hardcoded-colours.js': 'bsuite#1889 / conduit#428 — 5 violations in chart-colour fallbacks',
}

/**
 * The waiver list is a RATCHET, and a ratchet needs a stop.
 *
 * KNOWN_DRIFTED went from 2 entries to 5 in a single commit (d3f81978), at
 * which point every one of the five inlined copies was waived and `--check`
 * reported "No unexpected drift" while nothing was in sync. A list that can
 * grow without limit is not a ratchet, it is a queue.
 *
 * MAX_WAIVED is the high-water mark. Adding a sixth waiver fails until one
 * comes out. It is a committed number rather than a computed one precisely so
 * that raising it is a deliberate, reviewable edit with a reason attached.
 *
 * It may only ever be REDUCED. When a copy is re-synced, remove its entry and
 * lower this to match — the check prints the new count on every run so there is
 * no excuse for it drifting upward unnoticed.
 */
const MAX_WAIVED = 5

const INLINE_HEADER = (filename) => `/**
 * Inline copy of @bsuite/eslint-config ${filename.replace(/\.js$/, '')} rule.
 * Inlined so standalone submodule CI can resolve it without the monorepo.
 *
 * DO NOT EDIT THIS FILE DIRECTLY — it is generated.
 * Source of truth: packages/eslint-config/rules/${filename}
 * Regenerate:      node scripts/sync-inline-eslint-rules.mjs
 * CI parity check: node scripts/sync-inline-eslint-rules.mjs --check
 */
`

/** Everything from the first top-level `import` onward — the part that must match. */
function body(text) {
  const i = text.search(/^import /m)
  if (i === -1) throw new Error('no top-level import found; cannot locate rule body')
  return text.slice(i)
}

/**
 * --check-tips: compare each submodule's origin/<branch> TIP, not the pinned SHA.
 *
 * THE SCOPE GAP THIS CLOSES. The parent's parity gate reads the submodule
 * working trees, which CI checks out at the PINNED gitlink SHA. That is the
 * commit the parent has already promoted — not what the submodule's own branch
 * has become. So a crm7 PR can merge a weakened copy into crm7's development
 * and the parent stays green until somebody bumps the pointer, however many
 * days later. Measured 2026-08-12: the parent's pinned crm7 (b11d9d7) is
 * byte-identical to the source, while crm7's origin/development tip (7a5e94c)
 * is missing the PURE_RE pure-white/black ban — an absolute operator ruling —
 * and the @react-pdf/renderer real-import fix. Every parent run that day
 * reported success.
 *
 * Fixing this properly means the check running inside each submodule's own CI,
 * which cannot be done from this repo. This mode is the parent-side half: it
 * looks at where the submodules actually ARE, so the drift is visible the day
 * it lands rather than at the next pointer bump.
 *
 * Advisory by design — it reports and annotates, it does not fail the parent.
 * A submodule tip is not something a parent PR author can fix, and failing them
 * for it would be the "permanently red, therefore ignored" trap this branch has
 * spent three commits removing.
 */
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const checkTips = args.includes('--check-tips')
const onlyIdx = args.indexOf('--only')
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null

/** `git -C <dir> <args>`, or null when the command fails for any reason. */
function git(dir, ...gitArgs) {
  try {
    return execFileSync('git', ['-C', dir, ...gitArgs], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return null
  }
}

function checkSubmoduleTips() {
  let tipDrift = 0
  let unresolved = 0
  for (const rule of SYNCED_RULES) {
    const sourcePath = join(REPO_ROOT, rule.source)
    const sourceBody = body(readFileSync(sourcePath, 'utf-8'))
    for (const submodule of rule.submodules) {
      const dir = join(REPO_ROOT, submodule)
      if (!existsSync(dir)) {
        console.log(`  – ${submodule} — not checked out, tip not inspected`)
        unresolved++
        continue
      }
      // The branch the submodule's own PRs merge into. Fall back to main.
      let ref = null
      for (const candidate of ['origin/development', 'origin/main', 'origin/master']) {
        if (git(dir, 'rev-parse', '--verify', '--quiet', candidate)) {
          ref = candidate
          break
        }
      }
      if (!ref) {
        console.log(`  – ${submodule} — no origin/development|main|master ref, tip not inspected`)
        unresolved++
        continue
      }
      const tipSha = (git(dir, 'rev-parse', ref) || '').trim()
      const pinnedSha = (git(REPO_ROOT, 'rev-parse', `HEAD:${submodule}`) || '').trim()
      const shown = git(dir, 'show', `${ref}:eslint-rules/${rule.filename}`)
      if (shown === null) {
        console.log(`  – ${submodule} — no eslint-rules/${rule.filename} at ${ref}, skipped`)
        continue
      }
      const inSync = body(shown) === sourceBody
      const same = tipSha && pinnedSha && tipSha === pinnedSha
      const where = same
        ? 'tip == pinned'
        : `tip ${tipSha.slice(0, 8)} != pinned ${pinnedSha.slice(0, 8)}`
      if (inSync) {
        console.log(`  ✓ ${submodule} @ ${ref} — in sync (${where})`)
      } else {
        tipDrift++
        const waiver = KNOWN_DRIFTED[`${submodule}/${rule.filename}`]
        console.log(
          `::warning title=Inline rule drift at submodule tip::${submodule} @ ${ref} has DRIFTED from ` +
            `${rule.source} (${where})${waiver ? ` — waived in KNOWN_DRIFTED: ${waiver}` : ' — NOT waived'}`,
        )
      }
    }
  }
  console.log(
    `\nTip check: ${tipDrift} cop${tipDrift === 1 ? 'y' : 'ies'} drifting at the submodule branch tip` +
      `${unresolved ? `, ${unresolved} not inspectable` : ''}.` +
      '\nAdvisory only — the parent cannot fix a submodule branch. This exists so the drift is' +
      '\nvisible the day it lands instead of at the next pointer bump.',
  )
  process.exit(0)
}

let drifted = 0
let written = 0
let skipped = 0
let waived = 0

if (checkTips) checkSubmoduleTips()

for (const rule of SYNCED_RULES) {
  const sourcePath = join(REPO_ROOT, rule.source)
  if (!existsSync(sourcePath)) {
    console.error(`✗ source missing: ${rule.source}`)
    process.exit(1)
  }
  const sourceBody = body(readFileSync(sourcePath, 'utf-8'))
  const expected = INLINE_HEADER(rule.filename) + sourceBody

  for (const submodule of rule.submodules) {
    if (only && submodule !== only) continue
    const target = join(REPO_ROOT, submodule, 'eslint-rules', rule.filename)
    if (!existsSync(target)) {
      console.log(`  – ${submodule}/eslint-rules/${rule.filename} — absent, skipped`)
      skipped++
      continue
    }
    const current = readFileSync(target, 'utf-8')
    const waiver = KNOWN_DRIFTED[`${submodule}/${rule.filename}`]
    if (body(current) === sourceBody) {
      console.log(`  ✓ ${submodule}/eslint-rules/${rule.filename} — in sync`)
      if (waiver) {
        // The list can only shrink, and nothing shrinks it automatically.
        console.log(
          `    NOTE: remove "${submodule}/${rule.filename}" from KNOWN_DRIFTED — it is in sync now.`,
        )
      }
      continue
    }
    if (checkOnly) {
      if (waiver) {
        console.log(
          `  – ${submodule}/eslint-rules/${rule.filename} — drifted, WAIVED (${waiver})`,
        )
        waived++
        continue
      }
      console.error(`  ✗ ${submodule}/eslint-rules/${rule.filename} — DRIFTED from ${rule.source}`)
      drifted++
    } else {
      writeFileSync(target, expected)
      console.log(`  → ${submodule}/eslint-rules/${rule.filename} — rewritten from source`)
      written++
    }
  }
}

if (checkOnly && drifted > 0) {
  console.error(
    `\n${drifted} inlined rule cop${drifted === 1 ? 'y has' : 'ies have'} drifted from the monorepo source.\n` +
      `Fix: node scripts/sync-inline-eslint-rules.mjs`,
  )
  process.exit(1)
}

// The waiver count is stated on EVERY run, passing or not. "No unexpected
// drift (5 waived)" reads like a pass, and it was one — while all five copies
// diverged from the source. A number nobody prints is a number nobody watches.
if (checkOnly) {
  const listed = Object.keys(KNOWN_DRIFTED).length
  if (waived > 0) {
    console.log(
      `\nWAIVER BUDGET: ${waived} cop${waived === 1 ? 'y is' : 'ies are'} drifting under a waiver ` +
        `(${listed} listed in KNOWN_DRIFTED, ceiling ${MAX_WAIVED}). ` +
        'A waived copy is a submodule running a WEAKER rule than the monorepo source.',
    )
  }
  if (listed > MAX_WAIVED) {
    console.error(
      `\nKNOWN_DRIFTED has ${listed} entries but the committed ceiling is ${MAX_WAIVED}.\n` +
        'The waiver list is a ratchet: it may only shrink. Re-sync a copy and remove its\n' +
        'entry, or raise MAX_WAIVED deliberately with a reason if a new copy genuinely\n' +
        'cannot take the rule yet.',
    )
    process.exit(1)
  }
}

console.log(
  checkOnly
    ? `\nNo unexpected drift${waived ? ` (${waived} waived — see KNOWN_DRIFTED)` : ''}${skipped ? `, ${skipped} absent` : ''}.`
    : `\n${written} rewritten, ${skipped} absent.`,
)
