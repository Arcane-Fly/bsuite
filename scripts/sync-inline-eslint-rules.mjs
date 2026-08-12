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
 *   node scripts/sync-inline-eslint-rules.mjs              # write copies
 *   node scripts/sync-inline-eslint-rules.mjs --check      # verify, exit 1 on drift (CI)
 *   node scripts/sync-inline-eslint-rules.mjs --check-tips # advisory: submodule branch tips
 *   node scripts/sync-inline-eslint-rules.mjs --only crm7
 *   node scripts/sync-inline-eslint-rules.mjs --force      # overwrite copies held by a waiver
 *
 * Each copy keeps its own short header; everything from the first `import` onward
 * must be byte-identical, and that is what --check compares.
 *
 * WHAT --check COVERS, PRECISELY (RT-6 — say what the guard's set actually is)
 *
 *   IT DOES     compare every registered copy at the PINNED gitlink against the
 *               live source body in this working tree.
 *   IT DOES     verify each submodule's parity-manifest.json `sourceBodySha256`
 *               against that same live source, which is the ONLY place in the
 *               estate that check can run: the digest is committed inside the
 *               submodule, every repo is private, and no submodule holds a
 *               cross-repo token. Without this the submodules stay green against
 *               a recorded source that no longer exists.
 *   IT DOES NOT see a submodule's branch TIP. That is `--check-tips`, advisory.
 *   IT DOES NOT cover a copy that is absent at the pinned gitlink — those are
 *               listed by name in the summary rather than folded into a count,
 *               because "registered" and "covered" have already diverged here.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Every submodule that carries inlined rule copies. */
const ALL_SUBMODULES = [
  'crm7',
  'business-suite-unified',
  'conduit',
  'braden',
  'throughput',
  'R80.4',
]

/**
 * Rules that are inlined into submodules, and which submodules take them.
 *
 * `maxWaived` is PER RULE, not global. It used to be one number for the whole
 * file, which worked while there was exactly one rule and silently stopped
 * working the moment there were three: a newly registered rule's pre-existing
 * divergence would eat the colour rule's headroom, and the colour ratchet would
 * appear to loosen without anybody editing it. Per-rule ceilings are strictly
 * tighter than one shared ceiling of the same total, and each may only ever be
 * REDUCED. Every run prints the consumed count against the ceiling.
 */
const SYNCED_RULES = [
  {
    // ADDITION B. _shared.js carries isBradenSubmoduleFile(), which BOTH rules
    // call to decide whether to enforce at all. It was hand-copied into all six
    // siblings and NOTHING checked it — the same preconditions as the colour
    // rule before crm7#1579, on the file that decides whether the colour rule
    // runs. Measured 2026-08-12: all six bodies agree, by luck rather than by
    // any mechanism. A drifted copy here does not weaken one rule, it silently
    // disarms both in one repo.
    source: 'packages/eslint-config/rules/_shared.js',
    filename: '_shared.js',
    submodules: ALL_SUBMODULES,
    maxWaived: 0,
  },
  {
    source: 'packages/eslint-config/rules/no-hardcoded-colours.js',
    filename: 'no-hardcoded-colours.js',
    // braden is BRADEN-EXEMPT from the colour rule but still carries the file, so
    // it is synced for consistency — the rule self-exempts at runtime.
    //
    // ADDITION A: R80.4 was missing from this list entirely, so every colour
    // total the estate has produced excluded it. Registering it is NOT the same
    // as counting it, and the two have already diverged here once — at the
    // pinned gitlink R80.4 has no eslint-rules/ directory at all, so `--check`
    // reports it "absent, skipped" today. That is deliberately NOT waived: the
    // moment the parent advances R80.4's pointer to a commit carrying the copy,
    // this check goes red and blocks the bump until the copy is right. A gate
    // that fires at the moment of promotion is the gate we want.
    submodules: ALL_SUBMODULES,
    maxWaived: 3,
  },
  {
    // Reconciled 2026-08-12 from three divergent bodies — see the source file's
    // header for the differential. Listed only for the three submodules that
    // actually carry the file. throughput and R80.4 have NO no-text-white rule
    // at all, so `text-white` is unbanned in both; propagating it there is real
    // work with real violations to fix, not a line in this array.
    source: 'packages/eslint-config/rules/no-text-white.js',
    filename: 'no-text-white.js',
    submodules: ['crm7', 'business-suite-unified', 'conduit'],
    maxWaived: 2,
  },
]

/**
 * Copies known to be AHEAD of the monorepo source, which write mode must refuse
 * to overwrite.
 *
 * WHY THIS EXISTS, AND WHY DRIFT DETECTION ALONE IS NOT ENOUGH
 *
 * Drift is symmetric: `--check` can prove a copy and the source differ, but not
 * which of them is better. This estate has now twice found the nominal source
 * in packages/ to be the STALEST copy — once at crm7#1579, and again on
 * 2026-08-12 when crm7's colour copy was 69 lines AHEAD of the source, having
 * split the single PURE_RE into four purpose-built constants and closed two
 * real holes the source still has:
 *
 *   #ffffff00          the source's alternation matches `ffffff`, then `\b`
 *                      fails against the following `0`, so an alpha-suffixed
 *                      pure white PASSES the source rule.
 *   rgb(255 255 255)   the source's regex requires commas, so the
 *                      space-separated CSS Color 4 form PASSES.
 *
 * Running the generator against crm7 would overwrite the stronger rule with the
 * weaker one and reopen both holes, on the app with the largest colour surface
 * in the estate — a silent downgrade that every existing check would report as
 * a successful sync. Detection cannot prevent that; only refusing to write can.
 *
 * An entry here is a statement that the FIX DIRECTION IS FORWARD-PORT, source
 * <- copy, and it comes out when the source has absorbed the improvement.
 */
const AHEAD_OF_SOURCE = {
  'crm7/no-hardcoded-colours.js':
    'crm7 is 69 lines ahead: PURE_TAILWIND_RE/PURE_HEX_RE/PURE_RGB_RE/PURE_OKLCH_RE close the ' +
    '#ffffff00 and rgb(255 255 255) holes the source still has. Forward-port into the source first.',
}

/**
 * Submodules that have adopted eslint-rules/parity-manifest.json and must not
 * quietly lose it.
 *
 * A missing manifest cannot be treated as "nothing to check" — that is the
 * silent-pass shape this whole file exists to remove. But it also cannot be a
 * blanket failure, because crm7 and R80.4 have not adopted the manifest yet and
 * a permanently-red step gets ignored. So adoption is an explicit, committed
 * list: on it and missing is a HARD FAILURE; off it is reported and counted as
 * not-yet-adopting. The list may only grow.
 */
const MANIFEST_EXPECTED = ['business-suite-unified', 'braden', 'throughput', 'conduit']

/**
 * Copies that exist on disk in a submodule whose manifest does not list them.
 *
 * Found by this check on its first run, which is the point of it: BSU carries
 * eslint-rules/no-text-white.js and its parity-manifest.json lists only
 * _shared.js and no-hardcoded-colours.js — so BSU's own parity job has never
 * checked that file, and neither did anything else, because the parent had no
 * source of truth for it to be checked against. An unlisted copy is a rule
 * enforcing whatever it happens to say, covered by nothing.
 *
 * Same ratchet as KNOWN_DRIFTED and for the same reason: this cannot be a hard
 * failure today, because the fix belongs in a repo the parent cannot edit, and a
 * gate that is permanently red blocks every unrelated PR until someone switches
 * it off. It must name an issue, and the ceiling may only shrink.
 */
const MANIFEST_UNLISTED_WAIVED = {
  'business-suite-unified/no-text-white.js':
    'bsuite#1889 / BSU#680 — add no-text-white.js to BSU’s parity-manifest.json when it takes the ' +
    'reconciled body; until then its copy is checked here but not by BSU’s own parity job',
}
const MAX_MANIFEST_UNLISTED = 1

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
  // AHEAD OF SOURCE — not a backlog item, a forward-port. See AHEAD_OF_SOURCE.
  // Regenerating this copy would WEAKEN it; write mode refuses to touch it.
  'crm7/no-hardcoded-colours.js':
    'bsuite#1889 — crm7 is AHEAD of the source (four pure-colour regexes the source lacks); ' +
    'forward-port into packages/ first, do not regenerate',

  // BLOCKED ON REAL WORK — these two cannot take the rule until their colours
  // are fixed, or their lint breaks. Both have PRs doing exactly that.
  'business-suite-unified/no-hardcoded-colours.js':
    'bsuite#1889 / BSU#680 — 27 violations, all in edge-function email HTML',
  'conduit/no-hardcoded-colours.js': 'bsuite#1889 / conduit#428 — violations in chart-colour fallbacks',

  // braden/no-hardcoded-colours.js and throughput/no-hardcoded-colours.js were
  // waived here and are NOT any more. Both re-synced on their own development
  // branches; this commit advances their gitlinks, so the copies the parent
  // reads now match the source byte for byte. Measured 2026-08-12: both bodies
  // hash to 7d07a2a6…, the live source body. The colour ratchet drops 5 -> 3.

  // no-text-white, newly registered 2026-08-12. Both copies predate the
  // reconciled source; conduit's is regenerated in this cycle.
  'business-suite-unified/no-text-white.js':
    'bsuite#1889 / BSU#680 — predates the reconciled source; needs the Property walk + tightened ' +
    'lookbehind, after which its two self-referential eslint-disable comments can come out',
  'crm7/no-text-white.js':
    'bsuite#1889 / crm7#1661 — predates the reconciled source; missing the object-Property walk',
}

/**
 * The waiver list is a RATCHET, and a ratchet needs a stop.
 *
 * KNOWN_DRIFTED went from 2 entries to 5 in a single commit (d3f81978), at
 * which point every one of the five inlined copies was waived and `--check`
 * reported "No unexpected drift" while nothing was in sync. A list that can
 * grow without limit is not a ratchet, it is a queue.
 *
 * The ceiling now lives on each SYNCED_RULES entry as `maxWaived`, because one
 * shared number across three rules is not a ratchet either — a newly registered
 * rule's pre-existing divergence would consume the colour rule's headroom and
 * loosen it without anyone editing it. Per-rule ceilings this cycle:
 *
 *     _shared.js                 0   all six agree
 *     no-hardcoded-colours.js    3   was 5; braden and throughput re-synced
 *     no-text-white.js           2   newly registered; BSU and crm7 predate it
 *
 * Each may only ever be REDUCED. When a copy is re-synced, remove its entry and
 * lower that rule's ceiling to match — the check prints consumed-against-ceiling
 * on every run, so it cannot drift upward unnoticed.
 */
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

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
 * has become. So a crm7 PR can merge a changed copy into crm7's development and
 * the parent stays green until somebody bumps the pointer, however many days
 * later. Measured 2026-08-12: crm7's pinned copy and its origin/development tip
 * were two different bodies, and every parent run that day reported success.
 *
 * CORRECTION, recorded because it was briefed to three lanes as fact and is
 * wrong. This comment previously said crm7's tip "is missing the PURE_RE
 * pure-white/black ban". It is not. The ban is present at the tip under four
 * different names — PURE_TAILWIND_RE, PURE_HEX_RE, PURE_RGB_RE, PURE_OKLCH_RE —
 * and is STRONGER than the source's single PURE_RE, which still misses
 * `#ffffff00` and `rgb(255 255 255)`. The claim came from grepping for the
 * literal token `PURE_RE` and reading the zero as absence of the behaviour. A
 * zero from a grep is a hypothesis about naming, not a fact about behaviour —
 * and this estate wrote that lesson down from this very rule. Drift direction
 * must be established by reading or running the code, never by token count;
 * see AHEAD_OF_SOURCE, which exists because of this.
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
const force = args.includes('--force')
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

/**
 * THE OTHER HALF OF THE HONESTY CHAIN.
 *
 * business-suite-unified, braden, throughput and conduit each carry
 * eslint-rules/parity-manifest.json, recording for every inlined copy both its
 * own body digest (`localBodySha256`) and what the monorepo source looked like
 * when it was synced (`sourceBodySha256`). Their own CI verifies the copy
 * against those digests, which closes the direction a standalone checkout can
 * see: the copy being weakened, unwired or disarmed inside its own repo.
 *
 * It cannot close the other direction. `sourceBodySha256` is a number committed
 * in the submodule; nothing in that repo can tell whether it still describes the
 * live monorepo source. So a submodule can sit permanently green against a
 * digest that is months out of date, and its manifest will keep asserting
 * "matches the recorded monorepo source" while the recorded source is fiction.
 * That is not a hypothetical — no submodule holds a cross-repo token and every
 * repo here is private, so the submodule side CANNOT be made to check it. The
 * parent is the only place that can see both the manifests and the live source.
 *
 * This is that check: for every rule the parent syncs into a submodule, the
 * submodule's recorded `sourceBodySha256` must equal the digest of the source
 * body as it exists in THIS working tree, right now.
 *
 * Two further failures it refuses to be silent about:
 *
 *   - A submodule on MANIFEST_EXPECTED with no manifest at all. Deleting the
 *     manifest would otherwise be the cheapest way to make every one of these
 *     assertions vanish, and "nothing to check" would read as a pass.
 *   - A rule that the parent syncs into a submodule but which the submodule's
 *     manifest does not list. Dropping an entry escapes both this check and the
 *     submodule's own — the copy stays on disk, enforcing whatever it likes,
 *     covered by nothing.
 *
 * It also reports how many manifests it actually verified. Zero verified is
 * reported as an anomaly rather than a pass, because a check whose input set is
 * empty reads exactly like a check that passed.
 */
function checkManifests(sourceBodyByFilename) {
  const failures = []
  let verified = 0
  let notAdopting = 0
  let unlistedWaived = 0

  const rulesBySubmodule = new Map()
  for (const rule of SYNCED_RULES) {
    for (const submodule of rule.submodules) {
      if (!rulesBySubmodule.has(submodule)) rulesBySubmodule.set(submodule, [])
      rulesBySubmodule.get(submodule).push(rule)
    }
  }

  console.log('\nSubmodule parity-manifest source digests vs the LIVE monorepo source:')

  for (const [submodule, rules] of rulesBySubmodule) {
    const manifestPath = join(REPO_ROOT, submodule, 'eslint-rules', 'parity-manifest.json')
    const expected = MANIFEST_EXPECTED.includes(submodule)

    if (!existsSync(manifestPath)) {
      if (expected) {
        failures.push(
          `${submodule} — MANIFEST_EXPECTED lists this repo but eslint-rules/parity-manifest.json is ABSENT ` +
            `at the pinned gitlink. Either the pointer predates its adoption (bump it), or the manifest was ` +
            `removed — which would silently retire every cross-repo assertion it carries.`,
        )
        console.error(`  ✗ ${submodule} — manifest ABSENT but expected`)
      } else {
        notAdopting++
        console.log(
          `  – ${submodule} — no parity-manifest.json (not on MANIFEST_EXPECTED; its copies are ` +
            `checked here but nothing verifies them inside its own CI)`,
        )
      }
      continue
    }

    let manifest
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (e) {
      failures.push(`${submodule} — parity-manifest.json is not valid JSON: ${e.message}`)
      console.error(`  ✗ ${submodule} — manifest unparseable`)
      continue
    }

    const files = manifest.files ?? {}
    for (const rule of rules) {
      const sourceDigest = sourceBodyByFilename.get(rule.filename)
      const entry = files[rule.filename]

      if (!entry) {
        // Only a defect if the copy is actually there. A submodule that does not
        // carry the file has nothing to record.
        const copyPath = join(REPO_ROOT, submodule, 'eslint-rules', rule.filename)
        if (existsSync(copyPath)) {
          const unlistedWaiver = MANIFEST_UNLISTED_WAIVED[`${submodule}/${rule.filename}`]
          if (unlistedWaiver) {
            unlistedWaived++
            console.log(
              `  – ${submodule}/${rule.filename} — copy present but NOT listed in the manifest, ` +
                `WAIVED (${unlistedWaiver})`,
            )
          } else {
            failures.push(
              `${submodule}/${rule.filename} — the copy exists on disk but the manifest does not list it. ` +
                `An unlisted copy is covered by neither this check nor ${submodule}'s own parity job.`,
            )
            console.error(`  ✗ ${submodule}/${rule.filename} — copy present, NOT listed in the manifest`)
          }
        }
        continue
      }

      if (entry.sourceBodySha256 === sourceDigest) {
        verified++
        console.log(
          `  ✓ ${submodule}/${rule.filename} — recorded source digest ${String(sourceDigest).slice(0, 12)} matches live source`,
        )
      } else {
        failures.push(
          `${submodule}/${rule.filename} — recorded sourceBodySha256 ${String(entry.sourceBodySha256).slice(0, 12)} ` +
            `does NOT match the live monorepo source ${String(sourceDigest).slice(0, 12)}. ` +
            `${submodule}'s own CI is green against a stale digest: it is asserting agreement with a version of ` +
            `${rule.source} that no longer exists. Re-sync the copy and regenerate its manifest.`,
        )
        console.error(
          `  ✗ ${submodule}/${rule.filename} — STALE recorded source digest ` +
            `${String(entry.sourceBodySha256).slice(0, 12)} != live ${String(sourceDigest).slice(0, 12)}`,
        )
      }
    }
  }

  console.log(
    `\n  ${verified} manifest entr${verified === 1 ? 'y' : 'ies'} verified against the live source` +
      `${notAdopting ? `, ${notAdopting} submodule(s) not yet carrying a manifest` : ''}` +
      `${unlistedWaived ? `, ${unlistedWaived} unlisted copy waived (ceiling ${MAX_MANIFEST_UNLISTED})` : ''}.`,
  )
  if (verified === 0) {
    console.log(
      '  NOTE: zero entries verified. That is not a pass — it means no submodule the parent has\n' +
        '  pinned carries a manifest, so this whole section asserted nothing on this run.',
    )
  }
  const listedUnlisted = Object.keys(MANIFEST_UNLISTED_WAIVED).length
  if (listedUnlisted > MAX_MANIFEST_UNLISTED) {
    failures.push(
      `MANIFEST_UNLISTED_WAIVED has ${listedUnlisted} entries but the committed ceiling is ` +
        `${MAX_MANIFEST_UNLISTED}. That list is a ratchet: it may only shrink.`,
    )
  }
  return failures
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
let refused = 0
let held = 0
const skippedNames = []
/** filename -> sha256 of the live source body, for the manifest cross-check. */
const sourceBodyByFilename = new Map()
/** rule filename -> waivers consumed, so each ceiling is judged on its own rule. */
const waivedByRule = new Map()

if (checkTips) checkSubmoduleTips()

for (const rule of SYNCED_RULES) {
  const sourcePath = join(REPO_ROOT, rule.source)
  if (!existsSync(sourcePath)) {
    console.error(`✗ source missing: ${rule.source}`)
    process.exit(1)
  }
  const sourceBody = body(readFileSync(sourcePath, 'utf-8'))
  sourceBodyByFilename.set(rule.filename, sha256(sourceBody))
  waivedByRule.set(rule.filename, 0)
  const expected = INLINE_HEADER(rule.filename) + sourceBody

  for (const submodule of rule.submodules) {
    if (only && submodule !== only) continue
    const key = `${submodule}/${rule.filename}`
    const target = join(REPO_ROOT, submodule, 'eslint-rules', rule.filename)
    if (!existsSync(target)) {
      // NAMED, not just counted. "absent, skipped" is the shape a registration
      // takes when it is not actually covering anything — R80.4 was registered
      // for the colour rule while its pinned gitlink carried no eslint-rules/
      // directory at all, so it contributed a silent pass. Registered is not
      // the same as counted; the summary now says which.
      console.log(`  – ${submodule}/eslint-rules/${rule.filename} — absent, skipped`)
      skippedNames.push(key)
      skipped++
      continue
    }
    const current = readFileSync(target, 'utf-8')
    const waiver = KNOWN_DRIFTED[key]
    if (body(current) === sourceBody) {
      console.log(`  ✓ ${submodule}/eslint-rules/${rule.filename} — in sync`)
      if (waiver) {
        // The list can only shrink, and nothing shrinks it automatically.
        console.log(
          `    NOTE: remove "${key}" from KNOWN_DRIFTED — it is in sync now.`,
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
        waivedByRule.set(rule.filename, waivedByRule.get(rule.filename) + 1)
        continue
      }
      console.error(`  ✗ ${submodule}/eslint-rules/${rule.filename} — DRIFTED from ${rule.source}`)
      drifted++
    } else if (AHEAD_OF_SOURCE[key]) {
      // REFUSE. This copy is ahead of the source; rewriting it from the source
      // is a silent downgrade that every other check in this file would report
      // as a successful sync.
      console.error(
        `  ✗ ${submodule}/eslint-rules/${rule.filename} — REFUSING to regenerate: this copy is AHEAD of ` +
          `${rule.source}.\n      ${AHEAD_OF_SOURCE[key]}`,
      )
      refused++
    } else if (waiver && !force) {
      // A waiver says, in writing, "this copy CANNOT take the source yet" —
      // usually because the widened rule finds real violations that would break
      // that repo's lint. Write mode used to ignore waivers entirely and
      // overwrite anyway, which turns a documented, issue-tracked hold into a
      // broken build in a repo the operator was not touching. Measured while
      // building this: a bare run rewrote four waived copies, including BSU's
      // colour rule, which its own waiver records as 27 violations away from
      // being able to take it.
      console.log(
        `  – ${submodule}/eslint-rules/${rule.filename} — HELD, not regenerated (${waiver})\n` +
          `      Re-run with --force to overwrite it anyway, after checking that repo's lint.`,
      )
      held++
    } else {
      writeFileSync(target, expected)
      console.log(`  → ${submodule}/eslint-rules/${rule.filename} — rewritten from source`)
      written++
    }
  }
}

// The manifest cross-check is the parent-side half of the honesty chain, and it
// is a CHECK-mode concern: write mode regenerates copies, it does not adjudicate
// what other repos have recorded.
const manifestFailures = checkOnly ? checkManifests(sourceBodyByFilename) : []

if (!checkOnly && refused > 0) {
  console.error(
    `\n${refused} cop${refused === 1 ? 'y was' : 'ies were'} NOT regenerated because they are ahead of the source.\n` +
      'Forward-port the improvement into packages/eslint-config/rules/ first, then remove the\n' +
      'AHEAD_OF_SOURCE entry. Overwriting them would reopen the holes they close.',
  )
  process.exit(1)
}

if (checkOnly && (drifted > 0 || manifestFailures.length > 0)) {
  if (drifted > 0) {
    console.error(
      `\n${drifted} inlined rule cop${drifted === 1 ? 'y has' : 'ies have'} drifted from the monorepo source.\n` +
        `Fix: node scripts/sync-inline-eslint-rules.mjs`,
    )
  }
  if (manifestFailures.length > 0) {
    console.error(
      `\n${manifestFailures.length} parity-manifest failure(s) — a submodule's own CI is asserting agreement\n` +
        'with a monorepo source that no longer looks like that:',
    )
    for (const f of manifestFailures) console.error(`  ✗ ${f}`)
  }
  process.exit(1)
}

// The waiver count is stated on EVERY run, passing or not. "No unexpected
// drift (5 waived)" reads like a pass, and it was one — while all five copies
// diverged from the source. A number nobody prints is a number nobody watches.
if (checkOnly) {
  console.log('\nWAIVER BUDGET (per rule — a waived copy is a submodule running a rule the monorepo did not sanction):')
  let over = false
  for (const rule of SYNCED_RULES) {
    const used = waivedByRule.get(rule.filename) ?? 0
    const flag = used > rule.maxWaived ? ' ← OVER CEILING' : ''
    if (used > rule.maxWaived) over = true
    console.log(`  ${rule.filename.padEnd(26)} ${used}/${rule.maxWaived} waived${flag}`)
  }

  // A waiver key that matches no copy the parent actually syncs is dead weight:
  // it inflates nothing, gates nothing, and makes the ledger read as busier than
  // it is. It is also how a stale entry survives a rule being retired.
  const liveKeys = new Set()
  for (const rule of SYNCED_RULES) {
    for (const submodule of rule.submodules) liveKeys.add(`${submodule}/${rule.filename}`)
  }
  const orphans = Object.keys(KNOWN_DRIFTED).filter((k) => !liveKeys.has(k))
  if (orphans.length) {
    console.error(
      `\nKNOWN_DRIFTED has ${orphans.length} entr${orphans.length === 1 ? 'y' : 'ies'} naming a copy this script ` +
        `does not sync:\n  ${orphans.join('\n  ')}\n` +
        'Either the submodule was removed from that rule or the key is misspelt. A waiver that\n' +
        'covers nothing is not a waiver.',
    )
    process.exit(1)
  }

  if (over) {
    console.error(
      '\nA per-rule waiver ceiling has been exceeded.\n' +
        'The waiver list is a ratchet: each ceiling may only ever SHRINK. Re-sync a copy and\n' +
        "remove its entry. Raising a ceiling is a deliberate, reviewable edit — and it is not\n" +
        'the fix when the copy could simply be brought back into line.',
    )
    process.exit(1)
  }
}

if (skippedNames.length) {
  console.log(
    `\nNOT COVERED THIS RUN (${skippedNames.length}) — registered, but no file at the pinned gitlink:\n  ` +
      skippedNames.join('\n  ') +
      '\nThese contribute a silent pass. Registration is not coverage; the check starts gating each\n' +
      'one the moment its copy appears.',
  )
}

console.log(
  checkOnly
    ? `\nNo unexpected drift${waived ? ` (${waived} waived — see KNOWN_DRIFTED)` : ''}${skipped ? `, ${skipped} absent` : ''}.`
    : `\n${written} rewritten, ${skipped} absent${held ? `, ${held} held under a waiver` : ''}${refused ? `, ${refused} refused (ahead of source)` : ''}.`,
)
