#!/usr/bin/env node
/**
 * check-migration-collisions-at-branch-tips.mjs
 *
 * bsuite#1914 — the MERGE-TIME half of the version-collision gate.
 *
 * WHY A SECOND COLLISION CHECKER EXISTS
 * ─────────────────────────────────────
 * scripts/check-migration-version-collisions.mjs (bsuite#1707) already unions
 * every scope and fails on a duplicated version. It is correct. It is also
 * structurally unable to catch the collision that cost this estate a security
 * control on 2026-08-13, because of WHERE it reads:
 *
 *   `actions/checkout` with `submodules: recursive` materialises each submodule
 *   at the gitlink SHA the PARENT has already promoted. That is a snapshot of
 *   the past. A migration authored on crm7's `development` an hour ago is not
 *   in it, and will not be until somebody bumps the pointer.
 *
 * The measured failure: version `20260815010000` was claimed by conduit and by
 * crm7 SIXTEEN MINUTES APART, both security migrations. conduit's applied at
 * the 08:46 promotion. crm7's D-66 platform-scope visibility lockdown was
 * recorded as already-applied and silently skipped; it had to be renumbered
 * (crm7#1715). Before that, bsuite#1913 lost an `anon` REVOKE the same way.
 *
 * AND WHY AUTHOR-TIME CHECKING CANNOT REPLACE IT
 * ──────────────────────────────────────────────
 * The estate-wide check was run for conduit at ~12:00 that day and crm7 came
 * back clean. The colliding branch was created AFTERWARDS. An author-time
 * answer is valid for about an hour. The only place the question can be asked
 * with a durable answer is at MERGE time, against the sibling branches as they
 * are then — which is what this script does.
 *
 * THE THREE RULES THAT MAKE IT USABLE
 * ───────────────────────────────────
 * A gate that cries wolf is waived on day one, so all three are load-bearing:
 *
 *  1. CONTENT HASH, NOT JUST VERSION. Some migrations are deliberately copied
 *     into two trees that share the database (enterprise_licence_events is the
 *     known example). Same version + byte-identical content loses NOTHING when
 *     the applier skips the second copy. Only same-version-DIFFERENT-content is
 *     a defect. Measured on the six `development` tips 2026-08-13: 4 of the 25
 *     duplicated versions are identical-content copies.
 *
 *  2. IGNORE VERSIONS BELOW MIGRATION_FLOOR. The applier skips them on every
 *     deploy by design, so two files colliding down there never race for a
 *     ledger row. 19 of the 23 divergent duplicates are sub-floor. Without this
 *     the gate would open with 19 pre-existing failures and be switched off.
 *
 *  3. READ SIBLING `development` TIPS, NOT THE BRANCH POINT AND NOT THE
 *     GITLINK. See above — the gitlink is exactly the blind spot.
 *
 * WHAT COUNTS AS A VERSION — MIRRORED FROM THE APPLIER, NOT REINVENTED
 * ────────────────────────────────────────────────────────────────────
 * .github/workflows/supabase-migrate.yml is the only authority on what the
 * ledger key is, and this script reproduces it exactly rather than assuming
 * "14 digits":
 *
 *   BASE=$(basename "$f" .sql); VERSION=${BASE%%_*}
 *   case "$VERSION" in ''|*[!0-9]*) skip non-versioned ;; esac
 *
 * So the version is the ALL-DIGIT prefix before the first underscore, of ANY
 * length — `20250601_crm7_core_schema.sql` is version `20250601`, and
 * `verify_migrations.sql` is not a migration at all. Assuming 14 digits would
 * have missed short-form collisions outright.
 *
 * FILE DISCOVERY IS ALSO MIRRORED, AND IS NOT UNIFORM
 * ───────────────────────────────────────────────────
 * The applier runs two loops over the same ledger and they disagree on depth:
 *
 *   transactional:      find supabase/migrations -maxdepth 1 -name '*.sql' \
 *                            ! -name '*.nontx.sql'
 *   non-transactional:  find supabase/migrations -name '*.nontx.sql'   (ANY depth)
 *
 * Both consult the same `$APPLIED` list, so both share the version namespace.
 * Getting this wrong in either direction produces a broken gate: a naive
 * recursive walk reports crm7's `supabase/migrations/verify/*.sql` helper files
 * as same-scope collisions (they are never read by the applier — verified
 * during this build, and it was the author's own first draft that made exactly
 * that mistake), while a naive maxdepth-1 walk misses nested `.nontx.sql`
 * files that genuinely do apply.
 *
 * ALLOWLIST — DELIBERATELY THE SAME FILE AS THE SIBLING GATE
 * ──────────────────────────────────────────────────────────
 * scripts/migration-collision-allowlist.txt, shared with
 * check-migration-version-collisions.mjs. Two gates asking the same question
 * about the same estate must not keep two sets of excuses that can disagree;
 * the second list would be the one nobody updates. The `n=<count>` pin is
 * honoured identically, so a THIRD file landing on an already-excused version
 * still fails — that pin exists because, without it, an entry written to waive
 * one known-benign pair silently waived every future file at that timestamp.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT THIS GATE CANNOT SEE — read this before trusting a green run
 * ═══════════════════════════════════════════════════════════════════════════
 * It compares the parent PR against each submodule's `development` TIP. It is
 * therefore blind to:
 *
 *   • OPEN PR BRANCHES in the submodules. Two migrations authored on two
 *     unmerged feature branches collide with each other invisibly here. The
 *     gate only sees them once the first one merges to its `development` — at
 *     which point the second one's own parent PR fails. That is a real
 *     narrowing of the window (hours instead of never), NOT closure of it.
 *   • A gitlink pinned to a SHA that is not an ancestor of `development`
 *     (a hotfix promoted straight off a feature branch).
 *   • Anything already APPLIED to the live ledger that no longer exists in any
 *     tree. prod-migration-history-audit.yml owns that question.
 *   • Sub-floor collisions, by design (rule 2 above).
 *
 * A gate that overstates its reach is worse than no gate, so the workflow
 * header repeats this list and the normal run prints it on every pass.
 *
 * No regex is used to infer SQL semantics; version parsing is a character walk
 * over a filename (precedent__bsuite__20260812__regex_is_forbidden_parse_instead,
 * Tier 2, binding).
 *
 * Usage:
 *   node scripts/check-migration-collisions-at-branch-tips.mjs
 *   node scripts/check-migration-collisions-at-branch-tips.mjs --root=<path>
 *   node scripts/check-migration-collisions-at-branch-tips.mjs --manifest=<tsv>
 *   node scripts/check-migration-collisions-at-branch-tips.mjs --print-manifest
 *   node scripts/check-migration-collisions-at-branch-tips.mjs --self-test
 *
 * Exit 0 clean, 1 violations, 2 usage/environment error.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { compareForCollision, parseAllowlist, ALLOWLIST_RELATIVE_PATH } from './lib/migration-collision-compare.mjs'

/**
 * Every scope the applier's matrix deploys from. Two live in the parent tree
 * and are read from the parent ref; six are submodules and are read from their
 * own `development` tip, which is the entire point of this script.
 */
const PARENT_SCOPES = [
  { name: 'root', dir: 'supabase/migrations' },
  { name: 'schema-builder', dir: 'packages/schema-builder/supabase/migrations' },
]

const SUBMODULE_SCOPES = [
  { name: 'crm7', dir: 'supabase/migrations' },
  { name: 'conduit', dir: 'supabase/migrations' },
  { name: 'business-suite-unified', dir: 'supabase/migrations' },
  { name: 'braden', dir: 'supabase/migrations' },
  { name: 'throughput', dir: 'supabase/migrations' },
  { name: 'R80.4', dir: 'supabase/migrations' },
]

const APPLIER_WORKFLOW_RELATIVE_PATH = '.github/workflows/supabase-migrate.yml'
const DEFAULT_SUBMODULE_BRANCH = 'development'

// ---------------------------------------------------------------------------
// Pure logic — everything below the git layer, so the self-test drives the
// same code the real run does.
// ---------------------------------------------------------------------------

/**
 * The applier's version rule, character by character: the all-digit prefix
 * before the first underscore, any length. Returns null for a file the applier
 * would print "Skipping non-versioned file" for.
 */
export function versionOf(filename) {
  let base = path.basename(filename)
  if (base.endsWith('.nontx.sql')) base = base.slice(0, -'.nontx.sql'.length)
  else if (base.endsWith('.sql')) base = base.slice(0, -'.sql'.length)
  else return null

  let i = 0
  while (i < base.length && base[i] >= '0' && base[i] <= '9') i++
  // `${BASE%%_*}` yields the whole basename when there is no underscore; the
  // `*[!0-9]*` case then rejects it unless it is all digits.
  const underscore = base.indexOf('_')
  const versionPart = underscore === -1 ? base : base.slice(0, underscore)
  if (versionPart.length === 0) return null
  if (i < versionPart.length) return null // contains a non-digit -> not a migration
  return versionPart
}

/**
 * True when the applier would ever read this path within its scope directory.
 * Mirrors the two `find` invocations, including their disagreement on depth.
 */
export function isApplierVisible(relativePath) {
  const base = path.basename(relativePath)
  if (!base.endsWith('.sql')) return false
  const nested = relativePath.includes('/')
  if (base.endsWith('.nontx.sql')) return true // `find` with no -maxdepth
  return !nested // `find -maxdepth 1`
}

/**
 * Group manifest entries by version and classify each duplicated group.
 *
 * `entries` are `{ scope, version, blob, file }`. `blob` is the git object id
 * of the file's CONTENT, so equality of blob is byte-equality of the migration
 * — the cheap first pass of rule 1.
 *
 * WHEN BLOBS DIFFER, THAT IS NOT NECESSARILY A REAL COLLISION (bsuite J7,
 * 2026-09-03). A comment-only difference — a header noting which copy is
 * canonical, or the `-- rehearsal: already-enforced` marker
 * scripts/supabase/rehearse-migrations.mjs reads — gives every copy a
 * DIFFERENT blob SHA despite being the same DDL. `readContent`, when
 * supplied, is used to break the tie with the SAME comparator every other
 * migration-collision gate in this estate uses
 * (scripts/lib/migration-collision-compare.mjs), so a comment-only pair
 * lands in `identical` here too instead of falling through to the
 * floor/allowlist path. `readContent` is optional and this function stays
 * pure without it (self-testable with no git access) — a missing or failing
 * read just means the tie-break is skipped and the group falls through to
 * the existing floor/allowlist checks, which is the same fail-safe direction
 * blob-only comparison already had.
 */
export function classify({ entries, floor, allowlist, readContent }) {
  const groups = new Map()
  for (const e of entries) {
    if (!groups.has(e.version)) groups.set(e.version, [])
    groups.get(e.version).push(e)
  }

  const identical = []
  const subFloor = []
  const violations = []
  const allowlisted = []

  for (const version of [...groups.keys()].sort()) {
    const group = groups.get(version)
    if (group.length < 2) continue

    // Rule 1 before rule 2: an identical-content duplicate is benign at any
    // height, and reporting it as "waived by the floor" would misdescribe it.
    if (new Set(group.map((g) => g.blob)).size === 1) {
      identical.push({ version, group, reason: 'byte-identical' })
      continue
    }

    if (readContent) {
      const [anchor, ...rest] = group
      const anchorContent = readContent(anchor)
      const allCommentOnly =
        anchorContent != null &&
        rest.every((g) => {
          const c = readContent(g)
          return c != null && compareForCollision(anchorContent, c).equal
        })
      if (allCommentOnly) {
        identical.push({ version, group, reason: 'comment-only-difference' })
        continue
      }
    }

    // Rule 2. Same string comparison the applier uses:
    //   [ "$VERSION" \< "$MIGRATION_FLOOR" ]
    // so a version EQUAL to the floor is in scope, not below it.
    if (version < floor) {
      subFloor.push({ version, group })
      continue
    }

    const entry = allowlist.get(version)
    if (!entry) {
      violations.push({ version, group })
      continue
    }
    if (entry.expectedFiles === null) {
      violations.push({ version, group, unpinned: true })
      continue
    }
    if (entry.expectedFiles !== group.length) {
      violations.push({
        version,
        group,
        pinMismatch: { expected: entry.expectedFiles, actual: group.length },
      })
      continue
    }
    allowlisted.push({ version, group })
  }

  return { identical, subFloor, violations, allowlisted }
}

// parseAllowlist moved to scripts/lib/migration-collision-compare.mjs
// (bsuite J7, 2026-09-03) — was byte-for-byte duplicated here and in
// check-migration-version-collisions.mjs; both now import the one shared
// implementation (imported at the top of this file).

/**
 * Read MIGRATION_FLOOR from the applier workflow rather than hardcoding a third
 * copy of it. migration-floor-lint.yml already asserts the applier's copy and
 * prod-migration-history-audit.yml's copy agree; a hardcoded literal here would
 * be a new drift source with no alarm on it, and a floor that silently drifts
 * DOWN re-arms 19 historical collisions while a floor that drifts UP disarms
 * the gate entirely.
 *
 * An anchored key/value scan, not a YAML parse and not a regex.
 */
export function extractFloor(workflowText) {
  for (const raw of workflowText.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('MIGRATION_FLOOR:')) continue
    let value = line.slice('MIGRATION_FLOOR:'.length).trim()
    const hash = value.indexOf('#')
    if (hash !== -1) value = value.slice(0, hash).trim()
    if (
      (value.startsWith("'") && value.endsWith("'") && value.length > 1) ||
      (value.startsWith('"') && value.endsWith('"') && value.length > 1)
    ) {
      value = value.slice(1, -1)
    }
    if (!value) continue
    let allDigits = true
    for (const ch of value) if (ch < '0' || ch > '9') allDigits = false
    if (!allDigits) continue
    return value
  }
  return null
}

export function describeViolation({ version, group, unpinned, pinMismatch }) {
  const files = group.map((g) => `${g.scope}:${g.file}`).join('  vs  ')
  const scopes = new Set(group.map((g) => g.scope))
  const shape =
    scopes.size === 1
      ? `SAME-SCOPE within "${[...scopes][0]}" (one of these is DEFINITELY skipped by that scope's own loop, independent of job ordering)`
      : `CROSS-SCOPE across ${[...scopes].join(', ')} (which one is skipped depends on matrix job ordering, not a stable contract)`

  if (pinMismatch) {
    return (
      `${version} — ALLOWLISTED for ${pinMismatch.expected} file(s) but now has ${pinMismatch.actual}. ` +
      `A new migration has landed on an already-excused version, which is exactly the bsuite#1913 shape. ` +
      `Re-verify the group, then update \`n=\` in ${ALLOWLIST_RELATIVE_PATH}.\n      ${files}`
    )
  }
  if (unpinned) {
    return (
      `${version} — allowlist entry has no \`n=<count>\` pin, so it silently waives files nobody verified. ` +
      `Add \`n=${group.length}\` in ${ALLOWLIST_RELATIVE_PATH}.\n      ${files}`
    )
  }
  return `${version} — ${shape}, and the contents DIFFER.\n      ${files}`
}

// ---------------------------------------------------------------------------
// Git layer
// ---------------------------------------------------------------------------

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function gitOrNull(args, cwd) {
  try {
    return git(args, cwd)
  } catch {
    return null
  }
}

/** `git ls-tree -r <ref> -- <dir>` into `{ blob, file }`, filtered to what the applier reads. */
function readScopeFromRef({ repoDir, ref, scopeDir, scopeName }) {
  const out = gitOrNull(['ls-tree', '-r', '-z', ref, '--', scopeDir], repoDir)
  if (out === null) return null
  const entries = []
  for (const record of out.split('\0')) {
    if (!record) continue
    // `<mode> SP <type> SP <object> TAB <path>` — split on the TAB first so a
    // path containing spaces survives, then take the object id positionally.
    const tab = record.indexOf('\t')
    if (tab === -1) continue
    const meta = record.slice(0, tab).split(' ')
    const filePath = record.slice(tab + 1)
    if (meta.length < 3 || meta[1] !== 'blob') continue
    const blob = meta[2]

    const rel = filePath.startsWith(scopeDir + '/') ? filePath.slice(scopeDir.length + 1) : filePath
    if (!isApplierVisible(rel)) continue
    const version = versionOf(rel)
    if (!version) continue
    // repoDir travels WITH the entry so a later `git cat-file -p <blob>` can
    // run against the repo that actually holds this object — a submodule's
    // blob does not exist in the parent's object store, and vice versa.
    entries.push({ scope: scopeName, version, blob, file: rel, repoDir })
  }
  return entries
}

/** `git cat-file -p <blob>` in the entry's OWN repo — a comment-only-diff tie-break, read lazily. */
function readEntryContent(entry) {
  return gitOrNull(['cat-file', '-p', entry.blob], entry.repoDir)
}

/** Each submodule's configured branch from .gitmodules, defaulting to `development`. */
function submoduleBranch(root, name) {
  const out = gitOrNull(
    ['config', '--file', '.gitmodules', '--get', `submodule.${name}.branch`],
    root,
  )
  const value = out === null ? '' : out.trim()
  return value || DEFAULT_SUBMODULE_BRANCH
}

/**
 * Scope lists are parameters, not globals, so the end-to-end self-test can
 * drive this exact function over a two-repo fixture. The defaults are the real
 * estate; nothing in the CLI path overrides them.
 */
function buildManifest({
  root,
  parentRef,
  parentScopes = PARENT_SCOPES,
  submoduleScopes = SUBMODULE_SCOPES,
}) {
  const entries = []
  const notes = []
  const failures = []

  for (const scope of parentScopes) {
    const got = readScopeFromRef({
      repoDir: root,
      ref: parentRef,
      scopeDir: scope.dir,
      scopeName: scope.name,
    })
    if (got === null) {
      failures.push(`${scope.name}: cannot read ${parentRef}:${scope.dir} in the parent repo`)
      continue
    }
    entries.push(...got)
    notes.push(`${scope.name} @ ${parentRef} — ${got.length} file(s)`)
  }

  for (const scope of submoduleScopes) {
    const repoDir = path.join(root, scope.name)
    if (!fs.existsSync(path.join(repoDir, '.git'))) {
      failures.push(`${scope.name}: submodule is not checked out (no .git) — cannot read its tip`)
      continue
    }
    const branch = submoduleBranch(root, scope.name)
    const ref = `refs/remotes/origin/${branch}`
    const sha = gitOrNull(['rev-parse', '--verify', '--quiet', ref], repoDir)
    if (!sha) {
      failures.push(
        `${scope.name}: ${ref} does not exist. The workflow must fetch it BEFORE this runs — ` +
          `without it this scope contributes zero files and the gate quietly narrows.`,
      )
      continue
    }
    const got = readScopeFromRef({
      repoDir,
      ref,
      scopeDir: scope.dir,
      scopeName: scope.name,
    })
    if (got === null) {
      failures.push(`${scope.name}: cannot read ${ref}:${scope.dir}`)
      continue
    }
    entries.push(...got)
    notes.push(`${scope.name} @ origin/${branch} ${sha.trim().slice(0, 8)} — ${got.length} file(s)`)
  }

  return { entries, notes, failures }
}

// ---------------------------------------------------------------------------
// Manifest serialisation — lets a failing CI run be reproduced locally, and
// lets the negative control replay the REAL estate with one row planted.
// ---------------------------------------------------------------------------

function serialiseManifest(entries) {
  return entries.map((e) => [e.scope, e.version, e.blob, e.file].join('\t')).join('\n') + '\n'
}

function parseManifest(text) {
  const entries = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split('\t')
    if (parts.length < 4) continue
    const [scope, version, blob, ...rest] = parts
    entries.push({ scope, version, blob, file: rest.join('\t') })
  }
  return entries
}

// ---------------------------------------------------------------------------
// Self-test — negative control in BOTH directions
// ---------------------------------------------------------------------------

/** The e2e fixture builds one submodule; the real list would report the other five absent. */
const E2E_SUBMODULE_SCOPES = [{ name: 'crm7', dir: 'supabase/migrations' }]

function selfTest() {
  const FLOOR = '20260611000000'
  const noAllowlist = new Map()
  const cases = []
  const mk = (scope, version, blob, file) => ({ scope, version, blob, file })

  // ---- the two negative controls this gate lives or dies by -----------------

  cases.push([
    'NEGATIVE CONTROL A — divergent contents at one version above the floor FAILS',
    () => {
      const { violations } = classify({
        entries: [
          mk('crm7', '20260815010000', 'aaaa', '20260815010000_platform_scope_lockdown.sql'),
          mk('conduit', '20260815010000', 'bbbb', '20260815010000_r7_revoke_anon.sql'),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      return (
        violations.length === 1 &&
        violations[0].version === '20260815010000' &&
        describeViolation(violations[0]).includes('CROSS-SCOPE')
      )
    },
  ])

  cases.push([
    'NEGATIVE CONTROL B — IDENTICAL contents at one version above the floor PASSES',
    () => {
      const r = classify({
        entries: [
          mk('crm7', '20260728120000', 'same', '20260728120000_enterprise_licence_events.sql'),
          mk(
            'business-suite-unified',
            '20260728120000',
            'same',
            '20260728120000_enterprise_licence_events.sql',
          ),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      return r.violations.length === 0 && r.identical.length === 1
    },
  ])

  // bsuite J7, 2026-09-03: a comment-only difference gives every copy a
  // DIFFERENT blob (a blob SHA is content-addressed), so rule 1's cheap
  // byte-equality check alone would send this group to the floor/allowlist
  // path. With `readContent` supplied, the tie-break via
  // scripts/lib/migration-collision-compare.mjs classifies it as `identical`
  // instead — the same real defect this whole extraction fixes in
  // audit-prod-migration-history.mjs, reproduced here for THIS gate.
  cases.push([
    'a comment-only difference (different blobs) is IDENTICAL when readContent is supplied',
    () => {
      const body = 'CREATE TABLE public.workflow_definitions (id uuid primary key);\n'
      const content = {
        aaaa: `-- canonical header\n${body}`,
        bbbb: `-- DIFFERENT header, rationale only\n-- and a second line\n${body}`,
      }
      const r = classify({
        entries: [
          mk('crm7', '20261103000000', 'aaaa', '20261103000000_workflow_definitions.sql'),
          mk('business-suite-unified', '20261103000000', 'bbbb', '20261103000000_workflow_definitions.sql'),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
        readContent: (e) => content[e.blob],
      })
      return r.violations.length === 0 && r.identical.length === 1 && r.identical[0].reason === 'comment-only-difference'
    },
  ])

  // ...and WITHOUT readContent, the same group falls through to rule 2/3 as
  // before — proving the tie-break is additive, not a silent behaviour
  // change for callers that do not supply it (self-tests above this one).
  cases.push([
    'the same comment-only group WITHOUT readContent falls through to the allowlist path',
    () => {
      const r = classify({
        entries: [
          mk('crm7', '20261103000000', 'aaaa', '20261103000000_workflow_definitions.sql'),
          mk('business-suite-unified', '20261103000000', 'bbbb', '20261103000000_workflow_definitions.sql'),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      return r.identical.length === 0 && r.violations.length === 1
    },
  ])

  // The pair above must differ ONLY in content hash — otherwise control B is
  // passing for some unrelated reason and proves nothing.
  cases.push([
    'controls A and B differ only in the blob, so B is not passing by accident',
    () => {
      const divergent = classify({
        entries: [
          mk('crm7', '20260815010000', 'aaaa', 'x.sql'),
          mk('conduit', '20260815010000', 'bbbb', 'x.sql'),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      const identical = classify({
        entries: [
          mk('crm7', '20260815010000', 'aaaa', 'x.sql'),
          mk('conduit', '20260815010000', 'aaaa', 'x.sql'),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      return divergent.violations.length === 1 && identical.violations.length === 0
    },
  ])

  // ---- rule 2, the floor ----------------------------------------------------

  cases.push([
    'divergent contents BELOW the floor are reported, not failed',
    () => {
      const r = classify({
        entries: [
          mk('crm7', '20260519100000', 'aaaa', 'a.sql'),
          mk('business-suite-unified', '20260519100000', 'bbbb', 'b.sql'),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      return r.violations.length === 0 && r.subFloor.length === 1
    },
  ])

  cases.push([
    'a version EQUAL to the floor is in scope (the applier uses strict <)',
    () => {
      const r = classify({
        entries: [mk('crm7', FLOOR, 'aaaa', 'a.sql'), mk('conduit', FLOOR, 'bbbb', 'b.sql')],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      return r.violations.length === 1 && r.subFloor.length === 0
    },
  ])

  // ---- same-scope shape -----------------------------------------------------

  cases.push([
    'a same-scope divergent duplicate fails and is labelled SAME-SCOPE',
    () => {
      const { violations } = classify({
        entries: [
          mk('crm7', '20260901000000', 'aaaa', 'a.sql'),
          mk('crm7', '20260901000000', 'bbbb', 'b.sql'),
        ],
        floor: FLOOR,
        allowlist: noAllowlist,
      })
      if (violations.length !== 1) return false
      const msg = describeViolation(violations[0])
      return msg.includes('SAME-SCOPE') && !msg.includes('CROSS-SCOPE')
    },
  ])

  // ---- allowlist ------------------------------------------------------------

  cases.push([
    'an allowlisted divergent pair passes',
    () => {
      const r = classify({
        entries: [
          mk('crm7', '20260701090000', 'aaaa', 'a.sql'),
          mk('business-suite-unified', '20260701090000', 'bbbb', 'b.sql'),
        ],
        floor: FLOOR,
        allowlist: parseAllowlist('20260701090000  n=2  verified pair\n'),
      })
      return r.violations.length === 0 && r.allowlisted.length === 1
    },
  ])

  cases.push([
    'a THIRD file at an allowlisted version is NOT waived (the n= pin)',
    () => {
      const { violations } = classify({
        entries: [
          mk('crm7', '20260701090000', 'aaaa', 'a.sql'),
          mk('business-suite-unified', '20260701090000', 'bbbb', 'b.sql'),
          mk('conduit', '20260701090000', 'cccc', 'c.sql'),
        ],
        floor: FLOOR,
        allowlist: parseAllowlist('20260701090000  n=2  verified pair\n'),
      })
      return (
        violations.length === 1 &&
        violations[0].pinMismatch?.expected === 2 &&
        violations[0].pinMismatch?.actual === 3
      )
    },
  ])

  cases.push([
    'an allowlist entry with no n= pin is rejected',
    () => {
      const { violations } = classify({
        entries: [
          mk('crm7', '20260702090000', 'aaaa', 'a.sql'),
          mk('conduit', '20260702090000', 'bbbb', 'b.sql'),
        ],
        floor: FLOOR,
        allowlist: parseAllowlist('20260702090000  no count here\n'),
      })
      return violations.length === 1 && violations[0].unpinned === true
    },
  ])

  cases.push([
    'the allowlist cannot waive a SUB-FLOOR group into a violation or vice versa',
    () => {
      const r = classify({
        entries: [
          mk('crm7', '20260101000000', 'aaaa', 'a.sql'),
          mk('conduit', '20260101000000', 'bbbb', 'b.sql'),
        ],
        floor: FLOOR,
        allowlist: parseAllowlist('20260101000000  n=99  stale entry\n'),
      })
      // Sub-floor short-circuits before the allowlist, so a wrong n= down there
      // cannot manufacture a failure.
      return r.violations.length === 0 && r.subFloor.length === 1
    },
  ])

  // ---- version parsing, mirrored from the applier ---------------------------

  cases.push([
    'version is the all-digit prefix before the first underscore, any length',
    () =>
      versionOf('20260815010000_a.sql') === '20260815010000' &&
      versionOf('20250601_crm7_core_schema.sql') === '20250601' &&
      versionOf('20260611000000_x.nontx.sql') === '20260611000000',
  ])

  cases.push([
    'non-versioned helper files are not migrations',
    () =>
      versionOf('verify_migrations.sql') === null &&
      versionOf('comprehensive_validation.sql') === null &&
      versionOf('run_all_migrations.sql') === null &&
      versionOf('README.md') === null,
  ])

  cases.push([
    'a mixed alphanumeric prefix is rejected rather than truncated to digits',
    () => versionOf('2026abc_x.sql') === null && versionOf('20250611005738-09467d20_x.sql') === null,
  ])

  // ---- file discovery, mirrored from the applier's two `find`s --------------
  //
  // THE REGRESSION TEST FOR THIS BUILD'S OWN FIRST DRAFT. A recursive walk
  // reported crm7's supabase/migrations/verify/*.sql as two same-scope
  // collisions above the floor. They are helper scripts the applier's
  // `-maxdepth 1` never reads. Had that shipped, the gate would have opened RED
  // on two fabricated failures and been waived immediately.
  cases.push([
    'a nested non-nontx .sql is INVISIBLE (applier uses -maxdepth 1)',
    () => !isApplierVisible('verify/20260807070000_verify.sql'),
  ])

  cases.push([
    'a nested .nontx.sql IS visible (that `find` has no -maxdepth)',
    () => isApplierVisible('nested/20260807070000_x.nontx.sql'),
  ])

  cases.push([
    'a top-level .sql and a top-level .nontx.sql are both visible',
    () =>
      isApplierVisible('20260807070000_x.sql') && isApplierVisible('20260807070000_x.nontx.sql'),
  ])

  cases.push(['a non-.sql file is never visible', () => !isApplierVisible('README.md')])

  // ---- floor extraction -----------------------------------------------------

  cases.push([
    'MIGRATION_FLOOR is read from the applier workflow, quotes and comments stripped',
    () =>
      extractFloor("env:\n  MIGRATION_FLOOR: '20260611000000'\n") === '20260611000000' &&
      extractFloor('  MIGRATION_FLOOR: "20260611000000"  # raised 2026-06-10\n') ===
        '20260611000000',
  ])

  cases.push([
    'a missing or non-numeric MIGRATION_FLOOR yields null rather than a wrong floor',
    () =>
      extractFloor('env:\n  SOMETHING_ELSE: 1\n') === null &&
      extractFloor('  MIGRATION_FLOOR: latest\n') === null,
  ])

  cases.push([
    'the SHIPPED applier workflow still exposes a parseable floor',
    () => {
      const p = path.join(repoRoot(), APPLIER_WORKFLOW_RELATIVE_PATH)
      if (!fs.existsSync(p)) return false
      const floor = extractFloor(fs.readFileSync(p, 'utf8'))
      return typeof floor === 'string' && floor.length === 14
    },
  ])

  // ---- manifest round-trip --------------------------------------------------

  cases.push([
    'manifest serialise/parse round-trips',
    () => {
      const e = [mk('crm7', '20260815010000', 'deadbeef', '20260815010000_a.sql')]
      const back = parseManifest(serialiseManifest(e))
      return (
        back.length === 1 &&
        back[0].scope === 'crm7' &&
        back[0].version === '20260815010000' &&
        back[0].blob === 'deadbeef' &&
        back[0].file === '20260815010000_a.sql'
      )
    },
  ])

  // ---- end-to-end over a REAL git tree, exercising the git layer -------------
  //
  // Everything above tests pure functions. This one builds an actual parent
  // repo with an actual submodule holding an actual `origin/development` ref,
  // and drives buildManifest() through git — because a verdict function that is
  // perfect over data it never receives is not a gate.
  cases.push([
    'END-TO-END over real git refs: planted divergent collision is FOUND at the sibling tip',
    () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tipcollision-e2e-'))
      try {
        const built = buildE2EFixture(tmp, { collidingContent: 'SELECT 2;\n' })
        const { entries, failures } = buildManifest({
          root: built,
          parentRef: 'HEAD',
          submoduleScopes: E2E_SUBMODULE_SCOPES,
        })
        if (failures.length) return false
        const { violations } = classify({
          entries,
          floor: '20260611000000',
          allowlist: new Map(),
        })
        return violations.length === 1 && violations[0].version === '20260815010000'
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true })
      }
    },
  ])

  cases.push([
    'END-TO-END over real git refs: identical content at the same version is CLEAN',
    () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tipcollision-e2e-'))
      try {
        // Byte-identical to the parent-side file, so git gives both the same blob.
        const built = buildE2EFixture(tmp, { collidingContent: 'SELECT 1;\n' })
        const { entries, failures } = buildManifest({
          root: built,
          parentRef: 'HEAD',
          submoduleScopes: E2E_SUBMODULE_SCOPES,
        })
        if (failures.length) return false
        const r = classify({ entries, floor: '20260611000000', allowlist: new Map() })
        return r.violations.length === 0 && r.identical.length === 1
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true })
      }
    },
  ])

  cases.push([
    'END-TO-END: a submodule with no origin/development ref FAILS LOUDLY, never silently narrows',
    () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tipcollision-e2e-'))
      try {
        const built = buildE2EFixture(tmp, { collidingContent: 'SELECT 2;\n' })
        // Delete the remote-tracking ref the gate depends on.
        git(['update-ref', '-d', 'refs/remotes/origin/development'], path.join(built, 'crm7'))
        const { failures } = buildManifest({
          root: built,
          parentRef: 'HEAD',
          submoduleScopes: E2E_SUBMODULE_SCOPES,
        })
        return failures.length === 1 && failures[0].includes('crm7')
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true })
      }
    },
  ])

  let fail = 0
  cases.forEach(([name, run], n) => {
    let ok = false
    let err = null
    try {
      ok = run()
    } catch (e) {
      err = e
    }
    if (!ok) {
      fail++
      console.error(`self-test ${n} (${name}) FAILED${err ? `: ${err.stack || err}` : ''}`)
    }
  })
  if (fail) {
    console.error(`check-migration-collisions-at-branch-tips: ${fail}/${cases.length} FAILED`)
    process.exit(1)
  }
  console.log(
    `check-migration-collisions-at-branch-tips: self-test OK (${cases.length} cases, ` +
      `including both negative controls and 3 end-to-end runs over real git refs)`,
  )
  process.exit(0)
}

/**
 * Build a throwaway parent+submodule pair with a real `origin/development` ref,
 * a parent-side migration at 20260815010000, and a crm7-side migration at the
 * SAME version whose content is the caller's choice. Returns the parent path.
 */
function buildE2EFixture(tmp, { collidingContent }) {
  const parent = path.join(tmp, 'parent')
  const sub = path.join(parent, 'crm7')
  fs.mkdirSync(path.join(parent, 'supabase', 'migrations'), { recursive: true })
  fs.mkdirSync(path.join(sub, 'supabase', 'migrations'), { recursive: true })

  const id = ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false']

  // The sibling repo, with its migration on a real `development` branch that we
  // then mirror into refs/remotes/origin/development exactly as a fetch would.
  git(['init', '-q', '-b', 'development'], sub)
  fs.writeFileSync(
    path.join(sub, 'supabase', 'migrations', '20260815010000_sibling.sql'),
    collidingContent,
  )
  // A helper file in a subdirectory — the applier never reads it, and neither
  // must we. If discovery regresses to a recursive walk this fixture catches it.
  fs.mkdirSync(path.join(sub, 'supabase', 'migrations', 'verify'), { recursive: true })
  fs.writeFileSync(
    path.join(sub, 'supabase', 'migrations', 'verify', '20260815010000_verify.sql'),
    'SELECT 99;\n',
  )
  git(['add', '--', 'supabase'], sub)
  git([...id, 'commit', '-q', '-m', 'sibling migration'], sub)
  git(['update-ref', 'refs/remotes/origin/development', 'refs/heads/development'], sub)

  // The parent, holding its own migration at the same version.
  git(['init', '-q', '-b', 'development'], parent)
  fs.writeFileSync(
    path.join(parent, 'supabase', 'migrations', '20260815010000_parent.sql'),
    'SELECT 1;\n',
  )
  fs.writeFileSync(
    path.join(parent, '.gitmodules'),
    '[submodule "crm7"]\n\tpath = crm7\n\turl = ./crm7\n\tbranch = development\n',
  )
  git(['add', '--', 'supabase', '.gitmodules'], parent)
  git([...id, 'commit', '-q', '-m', 'parent migration'], parent)
  return parent
}

function repoRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usageError(msg) {
  console.error(`check-migration-collisions-at-branch-tips: ${msg}`)
  console.error(
    'Usage: node scripts/check-migration-collisions-at-branch-tips.mjs ' +
      '[--root=<path>] [--parent-ref=<ref>] [--manifest=<tsv>] [--print-manifest] | --self-test',
  )
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) selfTest()

let rootArg = '.'
let parentRef = 'HEAD'
let manifestPath = null
let printManifest = false
for (const a of args) {
  if (a.startsWith('--root=')) rootArg = a.slice('--root='.length)
  else if (a.startsWith('--parent-ref=')) parentRef = a.slice('--parent-ref='.length)
  else if (a.startsWith('--manifest=')) manifestPath = a.slice('--manifest='.length)
  else if (a === '--print-manifest') printManifest = true
  else usageError(`unknown argument "${a}"`)
}

const root = path.resolve(rootArg)
if (!fs.existsSync(root)) usageError(`--root path does not exist: ${root}`)

// The floor comes from the applier, never from a literal here.
const applierPath = path.join(root, APPLIER_WORKFLOW_RELATIVE_PATH)
if (!fs.existsSync(applierPath)) {
  usageError(
    `cannot find ${APPLIER_WORKFLOW_RELATIVE_PATH} under ${root}. ` +
      `MIGRATION_FLOOR is read from the applier so it can never drift; refusing to guess it.`,
  )
}
const floor = extractFloor(fs.readFileSync(applierPath, 'utf8'))
if (!floor) {
  usageError(
    `could not read MIGRATION_FLOOR from ${APPLIER_WORKFLOW_RELATIVE_PATH}. ` +
      `Refusing to run with a guessed floor — a wrong floor either disarms this gate ` +
      `entirely or re-arms every historical sub-floor collision.`,
  )
}

let entries
let notes = []
if (manifestPath) {
  if (!fs.existsSync(manifestPath)) usageError(`--manifest file does not exist: ${manifestPath}`)
  entries = parseManifest(fs.readFileSync(manifestPath, 'utf8'))
  notes.push(`manifest replayed from ${manifestPath} — ${entries.length} entries`)
} else {
  const built = buildManifest({ root, parentRef })
  if (built.failures.length) {
    console.error('check-migration-collisions-at-branch-tips: cannot see the whole estate:')
    for (const f of built.failures) console.error(`  - ${f}`)
    console.error(
      '\nRefusing to report OK on a partial sweep. A collision gate that quietly ' +
        'skipped a scope reports success for exactly the collisions it failed to load.',
    )
    process.exit(1)
  }
  entries = built.entries
  notes = built.notes
}

if (printManifest) {
  process.stdout.write(serialiseManifest(entries))
  process.exit(0)
}

if (entries.length === 0) {
  console.error(
    'check-migration-collisions-at-branch-tips: zero migration files loaded. ' +
      'That is never true of this estate — treating it as an environment failure, not a pass.',
  )
  process.exit(1)
}

const allowlistPath = path.join(root, ALLOWLIST_RELATIVE_PATH)
const allowlist = parseAllowlist(
  fs.existsSync(allowlistPath) ? fs.readFileSync(allowlistPath, 'utf8') : '',
)

const { identical, subFloor, violations, allowlisted } = classify({
  entries,
  floor,
  allowlist,
  readContent: readEntryContent,
})

console.log('Scopes read (submodules at their own branch tip, NOT the parent gitlink):')
for (const n of notes) console.log(`  ${n}`)
console.log(
  `\n${entries.length} versioned migration file(s); MIGRATION_FLOOR=${floor} ` +
    `(read from ${APPLIER_WORKFLOW_RELATIVE_PATH})`,
)
console.log(
  `  ${identical.length} duplicated version(s) with IDENTICAL content — benign, a copy shared between trees`,
)
console.log(
  `  ${subFloor.length} divergent duplicate(s) BELOW the floor — the applier never runs these`,
)
console.log(`  ${allowlisted.length} divergent duplicate(s) above the floor, allowlisted`)
console.log(`  ${violations.length} UNRESOLVED collision(s)`)

if (violations.length) {
  console.error('\nMerge-time migration collision check FAILED:')
  for (const v of violations) console.error(`  - ${describeViolation(v)}`)
  console.error(
    `\nAll scopes share ONE supabase_migrations.schema_migrations, keyed on the version\n` +
      `string alone. Whichever file the applier reaches SECOND is recorded as already\n` +
      `applied and silently SKIPPED — its DDL never runs and the pipeline stays green.\n` +
      `That is how bsuite#1913 lost an anon REVOKE and crm7#1715 lost a platform-scope\n` +
      `lockdown.\n\n` +
      `FIX: renumber the newer migration to an unused timestamp. Only if the two files\n` +
      `are genuinely the same migration, or verified harmless, add the version to\n` +
      `${ALLOWLIST_RELATIVE_PATH} with an \`n=<count>\` pin and a reason.`,
  )
  process.exit(1)
}

console.log(
  '\nOK — no unresolved collisions between this PR and the sibling branch tips.\n' +
    'WHAT THIS RUN DID NOT CHECK: migrations on OPEN PR branches in the submodules,\n' +
    'gitlinks pinned off-branch, and sub-floor collisions. Two migrations authored on\n' +
    'two unmerged feature branches still collide invisibly until the first one merges.',
)
process.exit(0)
