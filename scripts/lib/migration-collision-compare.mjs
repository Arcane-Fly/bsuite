/**
 * scripts/lib/migration-collision-compare.mjs
 *
 * Shared content-comparison and allowlist-parsing primitives for every gate
 * that decides whether two migration files sharing a version are a harmless
 * duplicate or a real collision.
 *
 * WHY THIS EXISTS (bsuite J7, 2026-09-03)
 * ─────────────────────────────────────────────────────────────────────────
 * scripts/audit-prod-migration-history.mjs's Class C compared colliding files
 * with RAW byte equality (`existing.source === source`), never consulted
 * scripts/migration-collision-allowlist.txt, and false-failed on four
 * comment-only pairs (20261103000000, 20261105000000 root vs crm7;
 * 20261009000000, 20261009000100 BSU vs packages/schema-builder) — every one
 * of them a DELIBERATE intentional-duplicate already reviewed and pinned in
 * the allowlist, whose only "difference" was a header/rationale comment block
 * (crm7's copies carry a machine-readable `-- rehearsal: already-enforced`
 * marker the migration rehearsal reads; scripts/supabase/rehearse-migrations.mjs
 * line 138).
 *
 * scripts/check-migration-collisions-at-branch-tips.mjs and
 * scripts/check-migration-collisions-across-open-prs.mjs have the same
 * exposure from the other direction: they compare git BLOB SHAs (byte
 * equality with extra steps — a blob hash is content-addressed, so two
 * comment-different copies get two different blobs) to decide whether a
 * collision is a harmless duplicate. A comment-only pair reads as "different
 * content" there too, unless the pin-matched allowlist entry happens to catch
 * it first.
 *
 * THE COMPARISON RULE, AND WHY IT IS NOT "STRIP ALL COMMENTS"
 * ─────────────────────────────────────────────────────────────────────────
 * A general SQL-comment stripper is unsafe: `--` inside a string literal
 * (`DEFAULT 'a--b'`) is not a comment, and a real SQL statement can carry an
 * inline trailing comment that is NOT safe to blindly discard (it can be the
 * only place a distinguishing detail lives, and a false-equal here silently
 * launders real drift). So this module strips exactly two things, and
 * nothing else:
 *
 *   1. A line that is a comment ON ITS OWN — after trimming, the line starts
 *      with `--`. The rest of the line (including a `--` INSIDE that comment,
 *      or a `--` that happens to appear later in that same line) is
 *      irrelevant, because the whole line is already gone.
 *   2. A blank line (trims to empty).
 *
 * Every other line is kept byte-for-byte, including a line carrying an
 * inline trailing comment or a string literal containing `--`. Two DDL
 * statements that differ only inside a string literal therefore still
 * compare UNEQUAL — see the self-test
 * "two DEFAULTs differing only inside a string literal are not equated".
 *
 * THE SYNC-BOUNDARY MARKER, HONOURED RATHER THAN REINVENTED
 * ─────────────────────────────────────────────────────────────────────────
 * packages/schema-builder/supabase/migrations/README.md documents an existing
 * estate convention: a `-- @sync-boundary-below` marker line separates an
 * annotation header (allowed to differ — "CANONICAL location" vs "DEV-FIXTURE
 * COPY") from the SQL body (required to be byte-identical below the marker).
 * `.github/workflows/schema-builder-migration-parity.yml` Check 3 already
 * enforces this on every PR touching either migrations directory, and
 * scripts/check-schema-lag.mjs's `sqlIdentity()` already slices at the same
 * marker for its own collision check. This module honours the SAME boundary
 * rather than inventing a second rule that could disagree with it — if
 * either file names the marker, only the body below it is compared, and it
 * is a hard mismatch (never a silent full-file comparison) if only ONE of
 * the two copies carries the marker.
 *
 * Usage:
 *   import { compareForCollision, parseAllowlist, ALLOWLIST_RELATIVE_PATH }
 *     from './lib/migration-collision-compare.mjs'
 */

export const ALLOWLIST_RELATIVE_PATH = 'scripts/migration-collision-allowlist.txt'
export const SYNC_BOUNDARY_MARKER = '@sync-boundary-below'

/**
 * Drop every line that is ENTIRELY a `--` comment (after trimming) and every
 * blank line. Every other line — including one with an inline trailing
 * comment, or `--` inside a string literal — is kept exactly as written.
 */
export function stripWholeLineCommentsAndBlanks(source) {
  return source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed.length > 0 && !trimmed.startsWith('--')
    })
    .join('\n')
}

/**
 * Slice a source at the FIRST `@sync-boundary-below` marker (substring
 * search, matching check-schema-lag.mjs's `sqlIdentity()` — the marker can
 * sit inside a `-- @sync-boundary-below` comment of any leading indentation).
 * Returns the whole source, unsliced, when no marker is present.
 */
export function sliceAtSyncBoundary(source) {
  const idx = source.indexOf(SYNC_BOUNDARY_MARKER)
  if (idx === -1) return { hasMarker: false, body: source }
  const newline = source.indexOf('\n', idx)
  return { hasMarker: true, body: newline === -1 ? '' : source.slice(newline + 1) }
}

/**
 * Compare two migration file bodies for the purpose of a collision gate.
 *
 * Returns `{ equal, reason }`:
 *   equal=true,  reason='byte-identical'          — raw bytes match, no
 *                                                    normalization needed.
 *   equal=true,  reason='comment-only-difference'  — bytes differ, but only
 *                                                    in whole-line comments
 *                                                    and/or blank lines (and,
 *                                                    if present, only above a
 *                                                    sync-boundary marker
 *                                                    both copies carry).
 *   equal=false, reason='sync-boundary-marker-mismatch' — one copy carries
 *                                                    the marker and the other
 *                                                    does not; the two files
 *                                                    cannot be compared on
 *                                                    the same terms and this
 *                                                    is itself a defect (a
 *                                                    fixture copy that lost
 *                                                    its marker, or a
 *                                                    canonical file that
 *                                                    gained one by mistake).
 *   equal=false, reason='content-differs'          — genuinely different SQL
 *                                                    beyond comments/blanks.
 */
export function compareForCollision(sourceA, sourceB) {
  if (sourceA === sourceB) return { equal: true, reason: 'byte-identical' }

  const a = sliceAtSyncBoundary(sourceA)
  const b = sliceAtSyncBoundary(sourceB)
  if (a.hasMarker !== b.hasMarker) {
    return {
      equal: false,
      reason: 'sync-boundary-marker-mismatch',
      detail:
        `one copy carries \`-- ${SYNC_BOUNDARY_MARKER}\` and the other does not — a bounded ` +
        `body cannot be compared against an unbounded one`,
    }
  }

  const normA = stripWholeLineCommentsAndBlanks(a.body)
  const normB = stripWholeLineCommentsAndBlanks(b.body)
  if (normA === normB) return { equal: true, reason: 'comment-only-difference' }
  return { equal: false, reason: 'content-differs' }
}

/**
 * Parse `VERSION<ws>n=<count><ws>reason` lines from
 * scripts/migration-collision-allowlist.txt; blanks and `#` comments ignored.
 *
 * Canonical copy — was duplicated verbatim in
 * scripts/check-migration-version-collisions.mjs and
 * scripts/check-migration-collisions-at-branch-tips.mjs before this
 * extraction; both now import this one.
 *
 * THE `n=<count>` PIN records how many colliding files the entry was
 * verified against, so a version whose collision group GROWS stops being
 * excused by an entry that described a smaller group (proven by mutation,
 * 2026-08-12 — see the allowlist file's own header).
 *
 * A DUPLICATE VERSION IS A HARD PARSE ERROR, not "last one wins". Two
 * independent lanes each writing an allowlist entry for the SAME version
 * without noticing the other is exactly how 20261105000000 ended up with two
 * live (non-comment) entries carrying different hashes and different
 * verification dates — silently keeping the last means whichever entry
 * happens to sort second determines the count and reason nobody who wrote
 * the first entry ever reviewed. Line numbers are 1-based and refer to the
 * INPUT TEXT, so a caller can point a human at the exact offending lines in
 * the shipped file.
 */
export function parseAllowlist(text) {
  const allowed = new Map()
  const lines = text.split('\n')
  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx]
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    let i = 0
    while (i < line.length && line[i] >= '0' && line[i] <= '9') i++
    const version = line.slice(0, i)
    let rest = line.slice(i).trim()
    // Permissive on length (not "exactly 14"): check-migration-collisions-at-
    // branch-tips.mjs's own versionOf() mirrors the APPLIER's actual version
    // rule — the all-digit prefix before the first underscore, ANY length
    // (.github/workflows/supabase-migrate.yml: `VERSION=${BASE%%_*}`, only a
    // numeric check, no length requirement) — so a short-form version like
    // `20250128_create_notes_table.sql` (version `20250128`) is real and must
    // be lookupable here too. check-migration-version-collisions.mjs's own
    // versionOf() only ever produces 14-digit keys, so this relaxation is a
    // pure superset for that caller: nothing it looks up changes.
    if (version.length === 0 || !rest) continue

    let expectedFiles = null
    if (rest.startsWith('n=')) {
      let j = 2
      while (j < rest.length && rest[j] >= '0' && rest[j] <= '9') j++
      const digits = rest.slice(2, j)
      const atBoundary = j === rest.length || rest[j] === ' ' || rest[j] === '\t'
      if (digits.length && atBoundary) {
        expectedFiles = Number(digits)
        rest = rest.slice(j).trim()
      }
    }
    if (!rest) continue

    const lineNumber = idx + 1
    const existing = allowed.get(version)
    if (existing) {
      const err = new Error(
        `${ALLOWLIST_RELATIVE_PATH} has TWO live entries for version ${version}: ` +
          `line ${existing.lineNumber} and line ${lineNumber}. One shadows the other — ` +
          `a duplicate entry means whichever a parser picks was never reviewed against ` +
          `the other's reason. Merge them into one entry with the current per-copy ` +
          `verification before either can be trusted.`,
      )
      err.code = 'DUPLICATE_ALLOWLIST_VERSION'
      err.version = version
      err.firstLineNumber = existing.lineNumber
      err.secondLineNumber = lineNumber
      throw err
    }
    allowed.set(version, { reason: rest, expectedFiles, lineNumber })
  }
  return allowed
}

// ---------------------------------------------------------------------------
// Self-test — run directly: node scripts/lib/migration-collision-compare.mjs --self-test
// ---------------------------------------------------------------------------

function selfTest() {
  const cases = []

  cases.push([
    'byte-identical sources compare equal',
    () => compareForCollision('SELECT 1;\n', 'SELECT 1;\n').equal === true,
  ])

  cases.push([
    'a comment-only difference compares equal',
    () => {
      const a = 'CREATE TABLE t (id int);\n-- a header note\n'
      const b = 'CREATE TABLE t (id int);\n-- a DIFFERENT header note\n-- and a second line\n'
      const r = compareForCollision(a, b)
      return r.equal === true && r.reason === 'comment-only-difference'
    },
  ])

  cases.push([
    'a real DDL difference beyond comments compares unequal',
    () => {
      const a = 'ALTER TABLE t ADD COLUMN a text;\n'
      const b = 'ALTER TABLE t ADD COLUMN b text;\n'
      const r = compareForCollision(a, b)
      return r.equal === false && r.reason === 'content-differs'
    },
  ])

  // THE REGRESSION TEST THIS MODULE EXISTS TO PASS: `--` inside a string
  // literal must never be treated as a comment, so two genuinely different
  // DEFAULT values are never laundered into "equal".
  cases.push([
    'two DEFAULTs differing only inside a string literal are NOT equated',
    () => {
      const a = "ALTER TABLE t ADD COLUMN x text DEFAULT 'a--b';\n"
      const b = "ALTER TABLE t ADD COLUMN x text DEFAULT 'a--c';\n"
      const r = compareForCollision(a, b)
      return r.equal === false && r.reason === 'content-differs'
    },
  ])

  cases.push([
    'an inline trailing comment is never stripped from a kept line',
    () => {
      // The line is not a WHOLE-line comment (it starts with real SQL), so it
      // is kept byte-for-byte, trailing comment included. Two different
      // trailing comments on an otherwise-identical statement still compare
      // unequal — this module never decides a trailing comment is safe to
      // discard.
      const a = "SELECT 1; -- note A\n"
      const b = "SELECT 1; -- note B\n"
      const r = compareForCollision(a, b)
      return r.equal === false && r.reason === 'content-differs'
    },
  ])

  cases.push([
    'both copies carrying the sync-boundary marker compare only the body below it',
    () => {
      const body = '\n-- @sync-boundary-below\nSELECT 1;\n'
      const a = '-- CANONICAL location note' + body
      const b = '-- DEV-FIXTURE COPY note, deliberately different' + body
      const r = compareForCollision(a, b)
      return r.equal === true && r.reason === 'comment-only-difference'
    },
  ])

  cases.push([
    'one copy missing the sync-boundary marker the other carries is a hard mismatch',
    () => {
      const body = '\n-- @sync-boundary-below\nSELECT 1;\n'
      const a = '-- CANONICAL location note' + body
      const b = '-- no marker at all\nSELECT 1;\n'
      const r = compareForCollision(a, b)
      return r.equal === false && r.reason === 'sync-boundary-marker-mismatch'
    },
  ])

  cases.push([
    'content differing BELOW the sync-boundary marker still fails, even with identical headers',
    () => {
      const a = '-- same header\n-- @sync-boundary-below\nSELECT 1;\n'
      const b = '-- same header\n-- @sync-boundary-below\nSELECT 2;\n'
      const r = compareForCollision(a, b)
      return r.equal === false && r.reason === 'content-differs'
    },
  ])

  cases.push([
    'parseAllowlist ignores blanks/comments and reads n= and the line number',
    () => {
      const text = ['# a comment', '', '20260101000000  n=2  reason one', '20260102000000  n=3  reason two'].join(
        '\n',
      )
      const allowed = parseAllowlist(text)
      return (
        allowed.size === 2 &&
        allowed.get('20260101000000').expectedFiles === 2 &&
        allowed.get('20260101000000').lineNumber === 3 &&
        allowed.get('20260102000000').lineNumber === 4
      )
    },
  ])

  // THE REGRESSION TEST FOR THE 20261105000000 DEFECT: a duplicate live entry
  // for one version must be a hard parse error, never "last one wins".
  cases.push([
    'a DUPLICATE live allowlist entry for the same version throws, naming both line numbers',
    () => {
      const text = ['20260101000000  n=2  first entry', '20260101000000  n=3  second entry'].join('\n')
      try {
        parseAllowlist(text)
        return false
      } catch (e) {
        return (
          e.code === 'DUPLICATE_ALLOWLIST_VERSION' &&
          e.firstLineNumber === 1 &&
          e.secondLineNumber === 2
        )
      }
    },
  ])

  cases.push([
    'a commented-out entry does not count as a duplicate of a live one',
    () => {
      const text = ['# 20260101000000  n=1  historical, no longer live', '20260101000000  n=2  live entry'].join(
        '\n',
      )
      const allowed = parseAllowlist(text)
      return allowed.size === 1 && allowed.get('20260101000000').expectedFiles === 2
    },
  ])

  cases.push([
    'the SHIPPED allowlist parses without a duplicate-version error',
    () => {
      // A real regression on 2026-09-03: 20261105000000 had two live entries.
      // This case reads the actual shipped file so a future duplicate is
      // caught by this module's own self-test, not just by CI running the
      // full audit.
      const { readFileSync } = globalThis.__fsForSelfTest
      const path = globalThis.__allowlistPathForSelfTest
      const text = readFileSync(path, 'utf8')
      parseAllowlist(text) // throws on any duplicate
      return true
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
    console.error(`migration-collision-compare: ${fail}/${cases.length} self-test failure(s)`)
    process.exit(1)
  }
  console.log(`migration-collision-compare: self-test OK (${cases.length} cases)`)
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--self-test')) {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const path = await import('node:path')
    globalThis.__fsForSelfTest = { readFileSync }
    globalThis.__allowlistPathForSelfTest = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      ALLOWLIST_RELATIVE_PATH,
    )
    selfTest()
  }
}
