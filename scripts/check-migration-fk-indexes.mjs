#!/usr/bin/env node
/**
 * check-migration-fk-indexes.mjs
 *
 * Fails when a migration SQL file adds a foreign key but does not also create
 * an index whose LEADING column is that FK column, in the same file.
 *
 * Why leading-column: Postgres only uses a composite index for an FK lookup
 * (and for the ON DELETE / ON UPDATE referential-action scan) when the FK
 * column is the index's first column. An index on (tenant_id, owner_id) does
 * NOT accelerate a lookup by owner_id alone, so accepting any-position
 * membership would pass indexes that do not actually solve the problem.
 *
 * Recurring class R1 / pgTAP A1 — caught 3x in 2026-07 (org_documents,
 * email_message_links, ...).
 *
 * Implementation note: this is a token walk, not a regex matcher, per the
 * repo's No-Regex-by-Default discipline (CLAUDE.md > Code Quality). The
 * previous regex implementation silently passed every violating file: its
 * column-definition pattern used the character class [\w\s\[\]], which
 * excludes ".", so `ALTER TABLE public.x ADD COLUMN y uuid REFERENCES ...`
 * — the dominant form in this repo — never matched at all.
 *
 * Usage:
 *   node scripts/check-migration-fk-indexes.mjs [path/to.sql ...]
 *   node scripts/check-migration-fk-indexes.mjs --changed-files=a.sql,b.sql
 *   node scripts/check-migration-fk-indexes.mjs --self-test
 *
 * Exit 0 clean, 1 violations, 2 usage error.
 */
import fs from 'node:fs'

/** Strip line comments, block comments, and single-quoted string bodies. */
function stripNoise(sql) {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const two = sql.slice(i, i + 2)
    if (two === '--') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (two === '/*') {
      i += 2
      while (i < sql.length && sql.slice(i, i + 2) !== '*/') i++
      i += 2
    } else if (sql[i] === "'") {
      // keep a placeholder so token positions stay sane
      out += "''"
      i++
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") i += 2
        else if (sql[i] === "'") { i++; break }
        else i++
      }
    } else if (sql[i] === '$') {
      // dollar-quoted body ($$ ... $$ or $tag$ ... $tag$)
      const close = sql.indexOf('$', i + 1)
      if (close === -1) { out += sql[i]; i++; continue }
      const tag = sql.slice(i, close + 1)
      const end = sql.indexOf(tag, close + 1)
      if (end === -1) { out += sql[i]; i++; continue }
      i = end + tag.length
    } else {
      out += sql[i]
      i++
    }
  }
  return out
}

/** Split into identifier / punctuation tokens. */
function tokenize(sql) {
  const toks = []
  let buf = ''
  const flush = () => { if (buf) { toks.push(buf); buf = '' } }
  for (const ch of sql) {
    if (ch === '(' || ch === ')' || ch === ',' || ch === ';') { flush(); toks.push(ch) }
    else if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') flush()
    else buf += ch
  }
  flush()
  return toks
}

const U = (t) => (t || '').toUpperCase()
/** Bare column name from a possibly-qualified / quoted identifier. */
const bare = (t) => (t || '').replace(/"/g, '').split('.').pop().toLowerCase()
const isIdent = (t) => !!t && !['(', ')', ',', ';'].includes(t)

/** Tokens that sit between a boundary and the real column name. */
const FILLER = new Set(['IF', 'NOT', 'EXISTS'])

/**
 * Given the index of a boundary token, return the column name that follows it,
 * skipping `IF NOT EXISTS` (as in `ADD COLUMN IF NOT EXISTS foo ...`).
 */
function columnAfterBoundary(toks, boundaryIdx) {
  let n = boundaryIdx + 1
  while (n < toks.length && FILLER.has(U(toks[n]))) n++
  const col = toks[n]
  if (!isIdent(col) || U(col) === 'CONSTRAINT') return null
  return bare(col)
}

/**
 * True when toks[i] sits inside a GRANT or REVOKE statement.
 *
 * REFERENCES is BOTH a foreign-key clause and a privilege name, and this lint only
 * cares about the first. In
 *     REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.x FROM anon, authenticated;
 * the token before REFERENCES is a comma, which Form B below treats as a column
 * boundary, so the lint read the privilege keyword as a column and demanded
 *     CREATE INDEX ... ON <table> (references)
 * It failed crm7#1536 that way — a migration that creates no foreign key at all and
 * could not have satisfied the rule. Without this guard, every future migration that
 * grants or revokes the REFERENCES privilege is unmergeable.
 *
 * Walks back to the start of the current statement and checks the leading keyword.
 */
function inGrantOrRevoke(toks, i) {
  // Scan back to the start of this statement and look for GRANT or REVOKE ANYWHERE in
  // it, not just as the leading keyword. Checking only toks[0] was not enough — the
  // self-test caught that
  //     ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ... REFERENCES ON TABLES FROM anon
  // begins with ALTER, and that is precisely the form 20260809150000 uses to stop the
  // privilege being re-granted on every new table.
  //
  // No false negatives: a statement that creates a foreign key never also contains GRANT
  // or REVOKE, because Postgres has no DDL form that mixes them.
  for (let j = i - 1; j >= 0; j--) {
    if (toks[j] === ';') return false
    if (['GRANT', 'REVOKE'].includes(U(toks[j]))) return true
  }
  return false
}

/** Column names that gain a FOREIGN KEY in this file. */
function fkColumns(toks) {
  const cols = new Set()
  // boundaries that start a fresh column definition
  const BOUND = new Set(['COLUMN', 'ADD', 'TABLE', '(', ','])
  for (let i = 0; i < toks.length; i++) {
    if (U(toks[i]) !== 'REFERENCES') continue
    if (inGrantOrRevoke(toks, i)) continue   // a privilege, not a foreign key

    // Form A: ... FOREIGN KEY ( a, b ) REFERENCES ...
    if (toks[i - 1] === ')') {
      let depth = 0
      let j = i - 1
      for (; j >= 0; j--) {
        if (toks[j] === ')') depth++
        else if (toks[j] === '(') { depth--; if (depth === 0) break }
      }
      if (j > 1 && U(toks[j - 1]) === 'KEY' && U(toks[j - 2]) === 'FOREIGN') {
        // leading column of the FK is what needs the index
        const first = toks.slice(j + 1, i - 1).find(isIdent)
        if (first) cols.add(bare(first))
        continue
      }
    }

    // Form B: <col> <type...> REFERENCES ...  (inline column constraint)
    let k = i - 1
    while (k >= 0 && !BOUND.has(U(toks[k])) && !BOUND.has(toks[k])) k--
    const col = columnAfterBoundary(toks, k)
    if (col) cols.add(col)
  }
  return cols
}

/** Columns that are the LEADING column of some index created in this file. */
function indexedLeadingColumns(toks) {
  const leads = new Set()
  const takeLeadAfterParen = (start) => {
    const open = toks.indexOf('(', start)
    if (open === -1) return
    const first = toks.slice(open + 1).find(isIdent)
    if (first) leads.add(bare(first))
  }
  for (let i = 0; i < toks.length; i++) {
    const t = U(toks[i])
    if (t === 'INDEX' && ['CREATE', 'UNIQUE', 'CONCURRENTLY'].includes(U(toks[i - 1]))) {
      takeLeadAfterParen(i)
    }
    // PRIMARY KEY (col ...) and UNIQUE (col ...) both create a backing index
    if (t === 'PRIMARY' && U(toks[i + 1]) === 'KEY') takeLeadAfterParen(i)
    if (t === 'UNIQUE' && toks[i + 1] === '(') takeLeadAfterParen(i)
    // inline `<col> ... PRIMARY KEY` / `<col> ... UNIQUE`
    if ((t === 'PRIMARY' && U(toks[i + 1]) === 'KEY') || t === 'UNIQUE') {
      const BOUND = new Set(['COLUMN', 'ADD', 'TABLE', '(', ','])
      let k = i - 1
      while (k >= 0 && !BOUND.has(U(toks[k])) && !BOUND.has(toks[k])) k--
      const col = columnAfterBoundary(toks, k)
      if (col) leads.add(col)
    }
  }
  return leads
}

function checkSql(sql) {
  const toks = tokenize(stripNoise(sql))
  const fks = fkColumns(toks)
  if (fks.size === 0) return []
  const leads = indexedLeadingColumns(toks)
  return [...fks].filter((c) => !leads.has(c))
}

function selfTest() {
  const cases = [
    ['ALTER TABLE public.w ADD COLUMN owner_id uuid REFERENCES public.p(id);', ['owner_id']],
    ['ALTER TABLE public.w ADD COLUMN owner_id uuid REFERENCES public.p(id);\nCREATE INDEX IF NOT EXISTS i ON public.w (owner_id);', []],
    ['CREATE TABLE public.w (id uuid PRIMARY KEY, o_id uuid REFERENCES public.p(id));', ['o_id']],
    ['CREATE TABLE public.w (id uuid PRIMARY KEY, o_id uuid REFERENCES public.p(id));\nCREATE INDEX i ON public.w(o_id);', []],
    ['ALTER TABLE public.w ADD CONSTRAINT fk FOREIGN KEY (o_id) REFERENCES public.p(id);', ['o_id']],
    ['ALTER TABLE public.w ADD CONSTRAINT fk FOREIGN KEY (o_id) REFERENCES public.p(id);\nCREATE INDEX i ON public.w USING btree (o_id, x);', []],
    // composite index NOT leading with the FK column must still fail
    ['ALTER TABLE public.w ADD COLUMN o_id uuid REFERENCES public.p(id);\nCREATE INDEX i ON public.w (tenant_id, o_id);', ['o_id']],
    // FK column that is itself the PK needs no separate index
    ['CREATE TABLE public.w (o_id uuid PRIMARY KEY REFERENCES public.p(id));', []],
    // REFERENCES inside a comment must not count
    ['-- REFERENCES public.p(id)\nALTER TABLE public.w ADD COLUMN x int;', []],
    // ADD COLUMN IF NOT EXISTS must resolve to the real column, not "if"
    ['ALTER TABLE public.w ADD COLUMN IF NOT EXISTS o_id uuid REFERENCES public.p(id);', ['o_id']],
    ['ALTER TABLE public.w ADD COLUMN IF NOT EXISTS o_id uuid REFERENCES public.p(id);\nCREATE INDEX IF NOT EXISTS i ON public.w (o_id);', []],
    // REFERENCES as a PRIVILEGE, not a foreign key (crm7#1536 false positive).
    // Before the inGrantOrRevoke guard these produced a phantom column "references".
    ['REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.w FROM anon, authenticated;', []],
    ['GRANT REFERENCES ON public.w TO some_role;', []],
    ['ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM anon;', []],
    // ...and the guard must not blind the lint to a REAL FK elsewhere in the same file
    ['REVOKE REFERENCES ON public.w FROM anon;\nALTER TABLE public.w ADD COLUMN o_id uuid REFERENCES public.p(id);', ['o_id']],
    ['REVOKE REFERENCES ON public.w FROM anon;\nALTER TABLE public.w ADD COLUMN o_id uuid REFERENCES public.p(id);\nCREATE INDEX i ON public.w (o_id);', []],
    // no FK at all
    ['CREATE INDEX i ON public.w (a);', []],
  ]
  let fail = 0
  cases.forEach(([sql, want], n) => {
    const got = checkSql(sql).sort()
    const ok = JSON.stringify(got) === JSON.stringify([...want].sort())
    if (!ok) { fail++; console.error(`self-test ${n} FAILED: want ${JSON.stringify(want)} got ${JSON.stringify(got)}`) }
  })
  if (fail) { console.error(`check-migration-fk-indexes: ${fail} self-test failure(s)`); process.exit(1) }
  console.log(`check-migration-fk-indexes: self-test OK (${cases.length} cases)`)
  process.exit(0)
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) selfTest()

let files = []
for (const a of args) {
  if (a.startsWith('--changed-files=')) {
    const raw = a.slice('--changed-files='.length)
    if (raw) files.push(...raw.split(',').map((s) => s.trim()).filter(Boolean))
  } else if (!a.startsWith('-')) {
    files.push(a)
  }
}

/* An empty file list has TWO causes that used to print the same line:
 *   (a) a PR legitimately touching no migrations, and
 *   (b) the upstream diff computation silently returning nothing.
 * `check-migration-fk-indexes: no files — OK` named no base ref and no count,
 * so nothing would have looked different if (b) happened on every run — the
 * gate would rubber-stamp every migration in the estate and read as green.
 * LANE-WATCHER filed exactly this (guard-registry knownSilentReason).
 *
 * Two changes: the line now states the count AND where the emptiness came
 * from, and callers that KNOW files must exist can demand it. The workflow
 * knows: migration-fk-index-lint.yml only triggers on a paths filter of
 * `**​/supabase/migrations/**.sql`, so if it fired at all, migrations changed
 * — an empty delta there is a contradiction, not a no-op. */
const sawChangedFilesFlag = args.some((a) => a.startsWith('--changed-files='))
const requireFiles = args.includes('--require-files')
const baseRefArg = args.find((a) => a.startsWith('--base-ref='))
const baseRef = baseRefArg ? baseRefArg.slice('--base-ref='.length) : null

if (files.length === 0) {
  const provenance = sawChangedFilesFlag
    ? '--changed-files= was supplied and resolved to ZERO paths'
    : 'no file arguments were supplied at all'
  const refNote = baseRef ? `, base ref ${baseRef}` : ', no base ref named'

  if (requireFiles) {
    console.error(
      `check-migration-fk-indexes: REFUSING TO PASS — ${provenance}${refNote}.\n` +
        '  The caller asserted files must exist (--require-files), so an empty\n' +
        '  list means the diff that produced it is broken, not that the PR is\n' +
        '  clean. Passing here would green-light every migration in the change.',
    )
    process.exit(1)
  }

  console.log(
    `check-migration-fk-indexes: 0 file(s) examined — ${provenance}${refNote}. ` +
      'Nothing was checked; this is not a pass over any migration.',
  )
  process.exit(0)
}

const violations = []
let scanned = 0
for (const file of files) {
  if (!file.endsWith('.sql')) continue
  if (!fs.existsSync(file)) { console.warn(`skip missing: ${file}`); continue }
  scanned++
  for (const col of checkSql(fs.readFileSync(file, 'utf8'))) {
    violations.push(
      `${file}: FK column "${col}" has REFERENCES but no index leading with "${col}" in the same file (pgTAP A1 / R1)`,
    )
  }
}

if (violations.length) {
  console.error('FK index check FAILED:\n' + violations.map((v) => `  - ${v}`).join('\n'))
  console.error('\nAdd, in the same migration:\n  CREATE INDEX IF NOT EXISTS idx_<table>_<col> ON <table> (<col>);')
  process.exit(1)
}
console.log(`check-migration-fk-indexes: OK (${scanned} file(s))`)
process.exit(0)
