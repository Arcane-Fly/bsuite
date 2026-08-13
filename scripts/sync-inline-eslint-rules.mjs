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
 *   node scripts/sync-inline-eslint-rules.mjs                 # write copies
 *   node scripts/sync-inline-eslint-rules.mjs --check         # verify at the PINNED
 *                                                             # gitlink, exit 1 on drift (CI)
 *   node scripts/sync-inline-eslint-rules.mjs --check-worktree # verify what is ON DISK
 *   node scripts/sync-inline-eslint-rules.mjs --check-tips    # advisory: submodule branch tips
 *   node scripts/sync-inline-eslint-rules.mjs --only crm7
 *   node scripts/sync-inline-eslint-rules.mjs --force         # overwrite copies held by a waiver
 *
 * Each copy keeps its own short header; everything from the first `import` onward
 * must be byte-identical, and that is what --check compares.
 *
 * WHAT --check COVERS, PRECISELY (RT-6 — say what the guard's set actually is)
 *
 *   IT DOES     compare every registered copy at the PINNED gitlink against the
 *               live source body in this working tree.
 *   IT DOES     verify each submodule's parity-manifest.json `sourceBodySha256`
 *               against that same live source, read at the same pinned gitlink.
 *               That is the ONLY place in the estate this check can run: the
 *               digest is committed inside the submodule, every repo is private,
 *               and no submodule holds a cross-repo token. Without it the
 *               submodules stay green against a recorded source that no longer
 *               exists.
 *   IT DOES NOT see a submodule's branch TIP. That is `--check-tips`, advisory.
 *   IT DOES NOT cover a copy that is absent at the pinned gitlink — those are
 *               listed by name in the summary rather than folded into a count,
 *               because "registered" and "covered" have already diverged here.
 *
 * THE SCOPE BUG THIS PARAGRAPH USED TO DESCRIBE INSTEAD OF ENFORCE (bsuite#1889)
 *
 * The four lines above were true of the intent and false of the code. `--check`
 * read `<submodule>/eslint-rules/<rule>` off the WORKING TREE — whatever the
 * developer's disk happened to contain — while claiming, in this comment, to read
 * the pinned gitlink. So the guard was correct and its SCOPE was the bug, the same
 * shape as bsuite#1914.
 *
 * The two scopes do not merely differ, they INVERT. Measured 2026-08-13 on the
 * operator's clone (parent HEAD 000ba68a), no repo touched to produce it:
 *
 *     copy                        at the pinned gitlink   on disk
 *     crm7/no-hardcoded-colours   IN SYNC                 DRIFTED
 *     braden/…                    IN SYNC                 DRIFTED
 *     throughput/…                IN SYNC                 DRIFTED
 *     conduit/…                   DRIFTED                 IN SYNC
 *     R80.4/…                     ABSENT                  IN SYNC
 *     business-suite-unified/…    DRIFTED                 DRIFTED
 *
 * FIVE OF SIX DISAGREED, and the two runs name almost disjoint sets:
 *
 *     a pinned-scope run names    business-suite-unified, conduit
 *     a disk-scope run names      crm7, business-suite-unified, braden, throughput
 *
 * Two agents reached opposite conclusions from the same command on the same day,
 * and both were reading their instrument correctly. Every local run was answering
 * a question about somebody's disk — and a dirty or advanced submodule checkout is
 * the NORMAL state of this monorepo, because lanes share the clone. The R80.4 row
 * is the sharpest: on disk its copy was IN SYNC, so a local run passed it in
 * silence, while the parent had promoted a commit that did not contain the file at
 * all.
 *
 * The disagreement is not stable, either, which is worse than a constant offset:
 * against a freshly-fetched origin/development the same two scopes AGREE on all
 * six. So the bug does not reproduce on a clean clone, only on a working one.
 *
 * `--check` now reads `git -C <sub> show <pinned-sha>:eslint-rules/<rule>`, so it
 * answers the only question the parent can be held to: what have I PROMOTED. When
 * the pinned tree cannot be read at all it HARD-FAILS rather than falling back to
 * the working tree, because a silent fallback is how the scope bug read as a pass
 * for as long as it did. `--check-worktree` is the old behaviour, kept for the
 * local edit loop and labelled every time it runs so it cannot be mistaken for
 * what CI enforces.
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
    // as counting it, and the two diverged here once — at the gitlink pinned on
    // 2026-08-12, R80.4 had no eslint-rules/ directory at all, so `--check`
    // reported "absent, skipped" and that counted as a pass.
    //
    // CORRECTED 2026-08-13: it is no longer absent. R80.4 now carries the copy,
    // an eslint.config.mjs that arms the rule over `src/**` plus
    // charge-calculator-v9-2.tsx, and a `lint:ratchet` in its CI audit chain
    // holding the count at 91. So this row went from silent-pass to genuinely
    // covered, and the comment saying otherwise had already outlived its fact.
    submodules: ALL_SUBMODULES,
    // 3 -> 1 (bsuite#1945), 1 -> 0 (bsuite#1970). crm7#1674 regenerated the last
    // copy and this commit bumps its pointer, so nothing is waived on this rule
    // anywhere in the estate. Ceilings shrink only; a zero ceiling means the next
    // divergence on the colour rule is a hard failure with no place to park it.
    maxWaived: 0,
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
    // 2 -> 1 (bsuite#1945), 1 -> 0 (bsuite#1970). crm7#1674 took the reconciled
    // body in the same commit as the colour rule; all three copies now agree.
    maxWaived: 0,
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
  // EMPTY, and that is the point: the crm7 entry came out on 2026-08-13 when the
  // forward-port actually landed. The source is now a TOKENISER and is strictly
  // stronger than every copy, crm7's included — verified by running all three
  // rules over one corpus rather than by reading them:
  //
  //   the two named holes            closed, and closed inside the format
  //                                  carve-outs where the old rule was silent
  //   crm7's own losses recovered    `rgb(1,1,1)` (pdf-lib's normalised white)
  //                                  was dropped when crm7 split PURE_RE into
  //                                  four; the source had it, so the port is a
  //                                  UNION of the copies, not a copy of the
  //                                  longest one
  //   crm7 false positives removed   3 — `no-text-white` matched its own name
  //   notations added                percent rgb, hwb(), color()
  //
  // Leave this object in place. It is the only mechanism that can stop a
  // regeneration silently overwriting a better copy with a worse source, and
  // this estate has now needed it twice.
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
// EMPTY as of 2026-08-13 (bsuite#1945). BSU#701 adds no-text-white.js to its
// parity-manifest.json in the same commit that regenerates the copy, so the one
// unlisted copy in the estate is now listed and verified at the pinned gitlink.
// The ceiling goes to zero: a new unlisted copy is a hard failure from here.
const MANIFEST_UNLISTED_WAIVED = {}
const MAX_MANIFEST_UNLISTED = 0

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
  // EMPTY as of 2026-08-13 (bsuite#1970). Every entry that was ever here has been
  // cleared by regenerating the copy, not by raising a ceiling.
  //
  // crm7/no-hardcoded-colours.js was the last one out (crm7#1674). Its waiver said
  // "measured 4 violations, all outside its lint scope" against a WHOLE-REPO scan.
  // Re-measured with crm7's OWN lint, which is the gate the sync actually has to
  // survive: `npx eslint .` — 2105 files, 0 errors, identical before and after the
  // swap, and `node scripts/lint-ratchet.mjs` PASS at baseline 0. Positive-controlled
  // first — a forbidden hex, a 0..1 pure white and a chromatic palette class were
  // injected into each of the six crm7#1623 files and every one reported — because
  // an unverified zero is how the 24-entry ignore list in crm7#1579 got written.
  //
  // What the regeneration bought there, specifically: crm7's copy already had the
  // AST-keyed react-pdf carve-out, so the mention-only exemption was closed. What it
  // did NOT have was `rgb(1,1,1)` classified as pure. pdf-lib and react-pdf normalise
  // channels to 0..1, so that IS pure white, and as a mere format violation it was
  // suppressed by both carve-outs — measured NOT REPORTED in a file with a real
  // `import('@react-pdf/renderer')` and in a file marked EMAIL-HTML-EXEMPT. crm7 is
  // the app that emits the e-signature certificate and the invoice email, i.e. the
  // two files carrying those markers. The rule blind to the value ran in the app
  // that writes it.

  // business-suite-unified/no-hardcoded-colours.js and conduit/no-hardcoded-colours.js
  // are GONE from this list. BSU#701 and conduit#448 regenerated both copies and
  // their manifests, both merged, and this commit bumps both pointers.
  //
  // The counts recorded here on 2026-08-13 — BSU 99 violations (12 pure), conduit 3
  // (1 pure) — were a WHOLE-REPO scan, and they are not wrong; they are answering a
  // different question from the one that decides whether a copy can land. Each app's
  // OWN lint is what its CI runs, with its own config, its own `files` globs and its
  // own ignore list, and that is the gate the sync has to survive:
  //
  //   business-suite-unified   508 files   npx eslint . --max-warnings 0   exit 0
  //   conduit                  420 files   npx eslint . --max-warnings 0   exit 0
  //
  // Both merged green on that basis, with their own check-eslint-rule-parity.mjs
  // reporting the armed-ness probe passing. State WHICH denominator a count used
  // when recording one here — two honest measurements of the same repo differing by
  // 99 is exactly how a waiver outlives its reason.

  // braden/no-hardcoded-colours.js, throughput/no-hardcoded-colours.js and
  // R80.4/no-hardcoded-colours.js are NOT here. They have already taken the new
  // source in their own repos and are waiting only on a pointer bump — a
  // different condition with a different fix, tracked in PENDING_POINTER_BUMP
  // below. Filing them here would say "cannot take the source", which is the
  // opposite of true, and would consume the backlog ratchet's headroom.

  // no-text-white, newly registered 2026-08-12. Both copies predate the
  // reconciled source; conduit's is regenerated in this cycle.
  // business-suite-unified/no-text-white.js is GONE: BSU#701 took the reconciled
  // body, and the two self-referential eslint-disable directives its waiver
  // predicted would fall out did exactly that — `reportUnusedDisableDirectives`
  // failed the build on both the moment the copy synced.
  //
  // crm7/no-text-white.js is GONE too (crm7#1674, same commit as its colour rule).
  // The same self-referential directive surfaces there as a WARNING rather than an
  // error, because crm7 does not arm `bsuite/no-text-white` over `eslint-rules/`.
  // Arming it was tried and rejected: that config block arms three other rules,
  // which then produced 17 errors against the rule files themselves. crm7's gate is
  // errors-only and still reads 0. Recorded here so the next person does not
  // rediscover it and "fix" it by editing a generated file.
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
/**
 * Copies that have ALREADY TAKEN the new source in their own repo, and are
 * drifted at the pinned gitlink only because the parent has not advanced the
 * pointer yet.
 *
 * WHY THIS IS A SEPARATE LIST FROM KNOWN_DRIFTED
 *
 * Correcting the source drifts EVERY copy at once — that is arithmetic, not a
 * backlog. Six copies compare against one source; change the source and all six
 * differ until six pointers move. There is no ordering that avoids it: the
 * submodule PRs cannot merge a copy generated from a source that has not landed,
 * and the parent cannot pin a lane-branch SHA (a squash-merge would orphan the
 * gitlink — this estate has that scar already).
 *
 * The previous shape of this file had only KNOWN_DRIFTED, so the transitional
 * state had to borrow the BACKLOG ratchet's headroom. That is corrosive in both
 * directions: it pushes the colour ceiling from 3 to 6 for reasons that have
 * nothing to do with the backlog, and once raised the doctrine two hundred lines
 * up ("each ceiling may only ever SHRINK") makes it very hard to lower again.
 * A number that goes up for a good reason and never comes down is how a ratchet
 * becomes a queue.
 *
 * So the two conditions are named separately, because their FIXES differ:
 *
 *   KNOWN_DRIFTED         "this repo cannot take the source yet"  -> fix colours
 *   PENDING_POINTER_BUMP  "this repo HAS taken it"                -> bump the pointer
 *
 * Every entry must name the open PR that lands it. This list is self-clearing by
 * construction — the moment the pointer moves, the copy is in sync and the check
 * prints a NOTE telling you to delete the entry. Its ceiling exists so that
 * "waiting on a pointer bump" cannot quietly become a parking space: it must
 * return to zero, and it may only shrink.
 */
// EMPTY as of 2026-08-13 (bsuite#1945), because this commit is the bump. All
// three — R80.4#35, braden#382, throughput#277 — merged, and their gitlinks now
// point at commits whose copies hash to the live source body. Each SHA was
// verified against the source before being pinned rather than taken on trust;
// `update-index --cacheinfo` does not check that a submodule object exists.
// Ceiling to zero: this list is for a transient state, and leaving a ceiling
// above the entries would let the next transient sit here unnoticed.
const PENDING_POINTER_BUMP = {}
const MAX_PENDING_POINTER_BUMP = 0

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
const checkWorktree = args.includes('--check-worktree')
const checkOnly = args.includes('--check') || checkWorktree
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
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch {
    return null
  }
}

/** The gitlink SHA the PARENT has promoted for this submodule, at parent HEAD. */
function pinnedSha(submodule) {
  const out = git(REPO_ROOT, 'rev-parse', `HEAD:${submodule}`)
  return out === null ? null : out.trim()
}

/**
 * Read a file out of a submodule AT THE PINNED GITLINK — the commit the parent
 * has actually promoted — rather than off the working tree.
 *
 * Returns one of:
 *   { ok: true, text, sha }
 *   { ok: false, fatal: true,  reason }   the pinned tree is unreadable
 *   { ok: false, fatal: false, reason }   the tree is readable, the path is not in it
 *
 * The fatal/non-fatal split is the whole point. "This submodule has no copy at
 * the pinned commit" is a real, reportable answer. "I could not read the pinned
 * commit" is NOT an answer, and must never be allowed to degrade into reading
 * the working tree instead — that fallback is precisely the scope bug, and it
 * would present as a pass on exactly the clones where it matters most.
 */
function readAtPinned(submodule, relPath) {
  const sha = pinnedSha(submodule)
  if (!sha) {
    return { ok: false, fatal: true, reason: `no gitlink for ${submodule} at parent HEAD` }
  }
  const dir = join(REPO_ROOT, submodule)
  if (!existsSync(dir)) {
    return {
      ok: false,
      fatal: true,
      reason:
        `${submodule} is not checked out, so its pinned tree ${sha.slice(0, 8)} cannot be read. ` +
        `Run \`git submodule update --init ${submodule}\`. This is a hard failure on purpose: ` +
        `an unreadable submodule used to fall through to "absent, skipped", which counted as a pass.`,
    }
  }
  if (git(dir, 'cat-file', '-e', `${sha}^{commit}`) === null) {
    return {
      ok: false,
      fatal: true,
      reason:
        `${submodule} does not contain its pinned commit ${sha.slice(0, 8)} — the checkout is behind ` +
        `the parent pointer or was cloned shallow. Fetch it: \`git -C ${submodule} fetch --all\`.`,
    }
  }
  const text = git(dir, 'show', `${sha}:${relPath}`)
  if (text === null) {
    return { ok: false, fatal: false, reason: `absent at the pinned gitlink ${sha.slice(0, 8)}` }
  }
  return { ok: true, text, sha }
}

/**
 * Rewrite a submodule's parity-manifest.json entry after regenerating its copy.
 *
 * WHY WRITE MODE HAS TO DO THIS, RATHER THAN LEAVING IT TO WHOEVER NOTICES
 *
 * Each submodule's own CI runs `scripts/check-eslint-rule-parity.mjs`, which
 * compares the copy on disk against `localBodySha256` in its manifest. So
 * regenerating the copy and NOT the manifest does not leave the submodule
 * unchanged — it leaves it BROKEN, with its own parity job failing and the
 * message "EDITED. This is a GENERATED file", accusing the next reader of
 * hand-editing a file the generator wrote.
 *
 * Measured on 2026-08-13: regenerating braden's copy and running its own checker
 * produced exactly that failure. Two artifacts describe one fact, one generator
 * wrote only one of them, and the divergence surfaced in a different repo's CI
 * as an accusation of manual editing. One generator now owns both.
 *
 * Only the digests and the capture date are touched. `waiver`, `enforcement`,
 * the `$comment` and every other field are the submodule's to own — this is a
 * targeted field update, not a regeneration of somebody else's file.
 */
function updateManifestEntry(submodule, filename, sourceDigest) {
  const manifestPath = join(REPO_ROOT, submodule, 'eslint-rules', 'parity-manifest.json')
  if (!existsSync(manifestPath)) return
  let manifest
  const raw = readFileSync(manifestPath, 'utf-8')
  try {
    manifest = JSON.parse(raw)
  } catch {
    console.error(`    ! ${submodule}/eslint-rules/parity-manifest.json is not valid JSON — NOT updated`)
    return
  }
  const entry = manifest.files?.[filename]
  if (!entry) {
    console.log(
      `    ! ${submodule}/eslint-rules/parity-manifest.json does not list ${filename} — NOT updated. ` +
        'Its own CI is not checking that copy.',
    )
    return
  }
  entry.localBodySha256 = sourceDigest
  entry.sourceBodySha256 = sourceDigest
  if (manifest.source) manifest.source.capturedAt = new Date().toISOString().slice(0, 10)
  const trailingNewline = raw.endsWith('\n') ? '\n' : ''
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + trailingNewline)
  console.log(`    → ${submodule}/eslint-rules/parity-manifest.json — digests updated for ${filename}`)
}

/**
 * Report submodules whose CHECKOUT differs from the gitlink the parent pinned.
 *
 * Not a failure — a dirty or advanced submodule checkout is the normal working
 * state of this monorepo, since lanes share the clone. It is printed because the
 * answer `--check` gives is now about the gitlink, and anyone reading that answer
 * while looking at different files on their disk deserves to be told which is
 * which. Silence here is what let two agents disagree and both be right.
 */
function reportCheckoutDivergence() {
  const diverged = []
  for (const submodule of ALL_SUBMODULES) {
    const dir = join(REPO_ROOT, submodule)
    if (!existsSync(dir)) continue
    const pinned = pinnedSha(submodule)
    const head = (git(dir, 'rev-parse', 'HEAD') || '').trim()
    if (pinned && head && pinned !== head) diverged.push({ submodule, pinned, head })
  }
  if (diverged.length === 0) return
  console.log(
    `\nCHECKOUT vs GITLINK — ${diverged.length} submodule checkout(s) are NOT at the pinned commit.\n` +
      'The verdicts above describe the PINNED trees, not these files. That is deliberate: the\n' +
      'parent can only be held to what it has promoted.',
  )
  for (const d of diverged) {
    console.log(
      `  · ${d.submodule.padEnd(24)} pinned ${d.pinned.slice(0, 8)}  ≠  on disk ${d.head.slice(0, 8)}`,
    )
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
    const expected = MANIFEST_EXPECTED.includes(submodule)

    // Same scope as the copy check above, for the same reason: a manifest on
    // disk is one a lane may be mid-edit, and the question this asks is about
    // what the parent has promoted.
    const manifestRead = checkWorktree
      ? (() => {
          const p = join(REPO_ROOT, submodule, 'eslint-rules', 'parity-manifest.json')
          return existsSync(p)
            ? { ok: true, text: readFileSync(p, 'utf-8') }
            : { ok: false, fatal: false, reason: 'absent on disk' }
        })()
      : readAtPinned(submodule, 'eslint-rules/parity-manifest.json')

    if (!manifestRead.ok && manifestRead.fatal) {
      failures.push(`${submodule} — ${manifestRead.reason}`)
      console.error(`  ✗ ${submodule} — pinned tree unreadable`)
      continue
    }

    if (!manifestRead.ok) {
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
      manifest = JSON.parse(manifestRead.text)
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
        // carry the file has nothing to record. Read at the same scope as
        // everything else, or this asks about a different tree than it reports on.
        const copyPresent = checkWorktree
          ? existsSync(join(REPO_ROOT, submodule, 'eslint-rules', rule.filename))
          : readAtPinned(submodule, `eslint-rules/${rule.filename}`).ok
        if (copyPresent) {
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
      } else if (PENDING_POINTER_BUMP[`${submodule}/${rule.filename}`]) {
        // The corrected manifest exists; it is sitting in the submodule PR
        // alongside the corrected copy. Reading the PINNED gitlink necessarily
        // sees the pre-merge state of BOTH, so this is the same one fact the
        // copy check already reported — not a second, independent failure.
        console.log(
          `  – ${submodule}/${rule.filename} — recorded source is pre-bump, same pointer as the copy above`,
        )
      } else if (KNOWN_DRIFTED[`${submodule}/${rule.filename}`]) {
        // A HELD COPY IS SUPPOSED TO RECORD AN OLD SOURCE.
        //
        // This branch was missing, and its absence made the two halves of the
        // ledger contradict each other: KNOWN_DRIFTED says "this copy has
        // deliberately not taken the new source", and then the manifest check
        // demanded that the copy's record of the source be the new one anyway.
        // Every waived copy therefore also produced a manifest failure, so the
        // gate could not be green for a state the gate itself had sanctioned.
        //
        // The manifest is honest here: it accurately describes the copy that is
        // actually committed. Demanding otherwise would ask the submodule to
        // record a source it has not taken, which is the precise fiction this
        // whole section exists to prevent.
        console.log(
          `  – ${submodule}/${rule.filename} — recorded source ${String(entry.sourceBodySha256).slice(0, 12)} is OLD, ` +
            'consistent with its KNOWN_DRIFTED hold',
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
let pendingBump = 0
const skippedNames = []
/** Pinned trees that could not be read at all — never a pass, never a skip. */
const fatalScope = []
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
    const relPath = `eslint-rules/${rule.filename}`

    // SCOPE. In --check the copy is read at the PINNED GITLINK; in write mode and
    // --check-worktree it is read off disk, because those two are about the disk.
    let current = null
    if (checkOnly && !checkWorktree) {
      const read = readAtPinned(submodule, relPath)
      if (read.ok) {
        current = read.text
      } else if (read.fatal) {
        console.error(`  ✗ ${submodule}/${relPath} — ${read.reason}`)
        fatalScope.push(`${key}: ${read.reason}`)
        continue
      } else {
        // NAMED, not just counted. "absent, skipped" is the shape a registration
        // takes when it is not actually covering anything — R80.4 was registered
        // for the colour rule while its pinned gitlink carried no eslint-rules/
        // directory at all, so it contributed a silent pass. Registered is not
        // the same as counted; the summary now says which.
        console.log(`  – ${submodule}/${relPath} — ${read.reason}, skipped`)
        skippedNames.push(key)
        skipped++
        continue
      }
    } else {
      if (!existsSync(target)) {
        console.log(`  – ${submodule}/${relPath} — absent on disk, skipped`)
        skippedNames.push(key)
        skipped++
        continue
      }
      current = readFileSync(target, 'utf-8')
    }
    const waiver = KNOWN_DRIFTED[key]
    const pending = PENDING_POINTER_BUMP[key]
    if (body(current) === sourceBody) {
      console.log(`  ✓ ${submodule}/eslint-rules/${rule.filename} — in sync`)
      if (waiver) {
        // The list can only shrink, and nothing shrinks it automatically.
        console.log(
          `    NOTE: remove "${key}" from KNOWN_DRIFTED — it is in sync now.`,
        )
      }
      if (pending) {
        console.log(
          `    NOTE: remove "${key}" from PENDING_POINTER_BUMP — the pointer has moved.`,
        )
      }
      // The manifest is refreshed even when the copy needed no rewrite. The two
      // artifacts describe one fact and must not be able to disagree — and they
      // did: a copy committed in an earlier run is "in sync", so the rewrite
      // branch never fires, so the manifest keeps its old digest and the
      // submodule's own CI keeps failing with "EDITED... GENERATED file". An
      // idempotent write here costs nothing and removes the state entirely.
      if (!checkOnly) updateManifestEntry(submodule, rule.filename, sha256(sourceBody))
      continue
    }
    if (checkOnly) {
      if (pending) {
        console.log(
          `  – ${submodule}/eslint-rules/${rule.filename} — drifted, POINTER BUMP PENDING (${pending})`,
        )
        pendingBump++
        continue
      }
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
      updateManifestEntry(submodule, rule.filename, sha256(sourceBody))
    }
  }
}

// The manifest cross-check is the parent-side half of the honesty chain, and it
// is a CHECK-mode concern: write mode regenerates copies, it does not adjudicate
// what other repos have recorded.
const manifestFailures = checkOnly ? checkManifests(sourceBodyByFilename) : []

if (checkOnly) {
  console.log(
    `\nSCOPE OF THIS RUN: ${
      checkWorktree
        ? '--check-worktree — the files ON DISK. This is NOT what CI enforces; CI runs\n' +
          '  --check against the pinned gitlinks. Use this for the local edit loop only.'
        : 'the PINNED GITLINKS at parent HEAD — the commits this repo has promoted.\n' +
          '  Files on disk were not consulted. For the local edit loop use --check-worktree.'
    }`,
  )
  reportCheckoutDivergence()
}

if (fatalScope.length > 0) {
  console.error(
    `\n${fatalScope.length} pinned submodule tree(s) could not be read. This is a FAILURE, not a skip:\n` +
      '  an unreadable tree is an unanswered question, and the previous version answered it by\n' +
      '  silently reading the working tree instead.',
  )
  for (const f of fatalScope) console.error(`  ✗ ${f}`)
  process.exit(1)
}

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
  if (pendingBump > 0 || Object.keys(PENDING_POINTER_BUMP).length > 0) {
    const listed = Object.keys(PENDING_POINTER_BUMP)
    console.log(
      `\nPOINTER BUMPS PENDING (${pendingBump} consumed / ceiling ${MAX_PENDING_POINTER_BUMP}) —\n` +
        'these copies have ALREADY taken the source in their own repo. They are not a backlog;\n' +
        'they are one merge away each, and this list must return to ZERO:',
    )
    for (const k of listed) console.log(`  · ${k.padEnd(40)} ${PENDING_POINTER_BUMP[k]}`)
    if (listed.length > MAX_PENDING_POINTER_BUMP) {
      console.error(
        `\nPENDING_POINTER_BUMP has ${listed.length} entries but the committed ceiling is ` +
          `${MAX_PENDING_POINTER_BUMP}. Like every other list here it may only shrink — and this one\n` +
          'is meant to empty, not to settle at a number.',
      )
      process.exit(1)
    }
  }

  const orphans = [...Object.keys(KNOWN_DRIFTED), ...Object.keys(PENDING_POINTER_BUMP)].filter(
    (k) => !liveKeys.has(k),
  )
  if (orphans.length) {
    console.error(
      `\nKNOWN_DRIFTED / PENDING_POINTER_BUMP has ${orphans.length} entr${orphans.length === 1 ? 'y' : 'ies'} naming a copy this script ` +
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
    ? `\nNo unexpected drift${waived ? ` (${waived} waived — see KNOWN_DRIFTED)` : ''}` +
      `${pendingBump ? `, ${pendingBump} awaiting a pointer bump` : ''}${skipped ? `, ${skipped} absent` : ''}.`
    : `\n${written} rewritten, ${skipped} absent${held ? `, ${held} held under a waiver` : ''}${refused ? `, ${refused} refused (ahead of source)` : ''}.`,
)
