#!/usr/bin/env node
/**
 * check-migration-symbol-gaps.mjs — authoring-time gate for migration symbol gaps.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS (bsuite#3136)
 * ─────────────────────────────────────────────────────────────────────────────
 * A migration can reference an object that NO replay path creates. It applies
 * cleanly on production — where the object already exists — and fails only when
 * the tree is rebuilt from scratch, which in this estate means the parent
 * pointer-bump PR, days after the app-repo PR that authored it went green.
 * Found on bsuite#3119:
 *
 *   psql:.../crm7/supabase/migrations/20260906120000_host_supervisor_employers_clients_scope.sql:151:
 *   ERROR:  function public.is_host_supervisor_of_tenant(uuid) does not exist
 *
 * whose only creator was archive/20260820130000_contacts_select_host_employer_limb.sql
 * — invisible to the then-current replay. bsuite#3143 fixed THAT hole (archive/
 * is now replayed). What remains open is the class: nothing fails at AUTHORING
 * time when a migration references a symbol the replay path cannot build.
 *
 * This gate runs WITHOUT A DATABASE. It rebuilds, from static files only, the
 * same universe a rebuild-from-baseline would produce, and checks every symbol
 * a changed migration references against it. A miss fails the PR with the
 * missing symbol named AND the file that (used to) create it — never a count.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UNIVERSE A REBUILD CAN PRODUCE (bsuite#3147 semantics)
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. The baseline dump itself — crm7/supabase/migrations/baseline/
 *      *_prod_baseline_schema_dump.sql, newest by name, exactly one required
 *      (same resolution rule as rehearsal-bootstrap.sh). It is a PUBLIC-schema
 *      snapshot; the labelled CI compatibility tail it ships is parsed like
 *      any other DDL.
 *   2. Every migration the rehearsal would REPLAY: version >= floor, NOT
 *      recorded in the applied-versions artefact (MEMBERSHIP, not magnitude —
 *      bsuite#3147; PR #3295 is the engine-side fix), not quarantined —
 *      applied in the engine's global order (version, then scope, then
 *      basename — the rehearse-migrations.mjs sort).
 *   3. Objects the disposable Supabase image provides out of the box (auth,
 *      storage, cron, vault, realtime, extensions, net …) — allowlisted by
 *      SCHEMA below with reasons, because the rehearsal substrate is the real
 *      Supabase Postgres image, not a bare postgres.
 *   4. catalog.qualifications — the out-of-band stub rehearsal-bootstrap.sh
 *      creates before the replay.
 *
 * Everything else a migration references must come from 1 or 2, or the rebuilt
 * database cannot serve it — exactly the condition that is invisible on
 * production and fatal on a rebuild.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT REPORTS
 * ─────────────────────────────────────────────────────────────────────────────
 * For each missing symbol it names the symbol (schema-qualified, with the kind
 * of reference) and — per the acceptance criterion shared with bsuite#3126 —
 * the file that creates it and that file's replay status, so the author knows
 * WHICH kind of gap they are standing in:
 *   'created by <file>, which replays LATER — ordering defect'
 *   'created by <file>, which is QUARANTINED and never replays'
 *   'created by <file>, which is recorded applied but the baseline dump does
 *    not carry it — the bsuite#3136 shape'
 *   'created by <file>, which is below the rehearsal floor'
 *   'no file in the tree creates this symbol'
 * plus, for references into a non-provided schema, the creator of the SCHEMA
 * itself under the same phrases.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIBERATE LIMITATIONS (each one is a decision, not an oversight)
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Only SCHEMA-QUALIFIED references are extracted. The estate's migration
 *     convention qualifies public.<name> in policy bodies and DDL (the #3119
 *     incident file qualifies every call). Unqualified identifiers are
 *     indistinguishable from column names and builtins without a search_path
 *     and builtin model, and a gate that cries wolf on those gets muted.
 *   - A qualified occurrence whose FIRST component is not a provided schema,
 *     not a created schema, and not any schema any migration in the tree ever
 *     creates, is treated as a TABLE ALIAS (c.employer_id) and skipped. The
 *     alias/reference ambiguity is unsound to resolve statically.
 *   - Function references resolve at NAME level, not arity/arg-types. Overload
 *     confusion is not the failure class this gate exists for.
 *   - Objects created inside a file are available to the WHOLE file (a forward
 *     reference inside one file is a replay-time failure; the engine catches
 *     it by executing the file).
 *   - to_regclass()/to_regprocedure()/… arguments — quoted or bare — and
 *     '...'::reg* casts are EXISTENCE PROBES, not uses; a guarded reference
 *     never fails this gate. That is the point of the GUARDED_NOOP_MARKER
 *     convention.
 *   - String literals ARE scanned (dynamic EXECUTE 'CREATE …' is a real
 *     reference), so prose inside a string that mentions public.<name> can
 *     raise a false positive. `--audit` measures the real-tree rate; refine
 *     then, with those counts as evidence.
 *   - Objects created inside DO/plpgsql blocks are still recorded (the static
 *     walk cannot prove a branch unreachable), so a CONDITIONALLY-created
 *     object resolves here even where a rebuild might not run the branch. The
 *     engine's census, not this gate, is the authority on that.
 *   - Below-floor and applied migrations are NOT replayed, so their objects
 *     must come from the dump. A reference to an object built only by such a
 *     migration is a TRUE finding — the rebuild cannot produce it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NO REGULAR EXPRESSIONS. Standing estate rule: parsers, not patterns. Every
 * extraction below is a character scanner with a token lookback. There is no
 * RegExp in this file.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * USAGE
 *   node scripts/check-migration-symbol-gaps.mjs --self-test
 *   node scripts/check-migration-symbol-gaps.mjs --changed <rel,path,…> [--root DIR]
 *   node scripts/check-migration-symbol-gaps.mjs --audit [--root DIR]
 *
 *   --changed  comma-separated repo-relative migration paths, EXACTLY the
 *              format scripts/supabase/resolve-changed-migrations.sh emits
 *              (the same strings rehearse-migrations.mjs matches on rel).
 *   --audit    walk the whole tree as if every replayable migration were
 *              changed; report every unresolvable symbol. Reporting only —
 *              always exits 0 unless the instrument itself fails. This is the
 *              tree's rebuildability-gap census.
 *   Exit codes: 0 clean · 1 findings (gate mode) · 2 instrument failure
 *               (missing/duplicated artefacts, missing scopes, unknown paths).
 */

import fs from 'node:fs';
import path from 'node:path';

const DIGIT_0 = '0'.charCodeAt(0);
const DIGIT_9 = '9'.charCodeAt(0);
const VERSION_LENGTH = 14;
const DEFAULT_FLOOR = '20260611000000';

/* ───────────────────────── schema allowlist ─────────────────────────
 * Schemas the disposable Supabase Postgres image provides before ANY
 * migration or the dump runs. A reference into these schemas can never be
 * a "no replay path creates it" defect, because the substrate carries them.
 *
 * Measured against the rehearsal substrate this estate actually boots
 * (`supabase db start` — the real Supabase image, see rehearsal-bootstrap.sh):
 *   auth, storage, realtime, vault  — core Supabase schemas in the image
 *   extensions                      — where CREATE EXTENSION lands objects
 *   cron                            — pg_cron (rehearsal workflow creates it)
 *   net                             — pg_net   (rehearsal workflow creates it)
 *   graphql, graphql_public         — pg_graphql / PostgREST surface
 *   pgsodium, pgsodium_masks        — pgsodium, referenced by RLS bodies
 *   supabase_functions              — auth hooks schema shipped by the image
 *   catalog                         — rehearsal-bootstrap.sh's out-of-band stub
 *   public, pg_catalog, information_schema, pg_toast, pg_temp,
 *   supabase_migrations             — always present
 *
 * A typo'd reference INTO an allowlisted schema (auth.udi()) still passes —
 * declared limitation: this gate owns the "no replay path creates it" class,
 * not the "typo inside a provided schema" class.
 */
const PROVIDED_SCHEMAS = new Set([
  'public',
  'auth',
  'storage',
  'realtime',
  'vault',
  'extensions',
  'cron',
  'net',
  'graphql',
  'graphql_public',
  'pgsodium',
  'pgsodium_masks',
  'supabase_functions',
  'catalog',
  'pg_catalog',
  'information_schema',
  'pg_toast',
  'pg_temp',
  'supabase_migrations',
]);

/* to_reg* existence probes. A symbol appearing ONLY as the direct first
 * argument of one of these, or inside a string that is, is guarded. */
const REG_PROBE_FUNCTIONS = new Set([
  'to_regclass',
  'to_regproc',
  'to_regprocedure',
  'to_regoper',
  'to_regoperator',
  'to_regtype',
  'to_regnamespace',
  'to_regrole',
  'to_regcollation',
  'to_regdictionary',
]);

/* ───────────────────────── char scanner (no regex) ─────────────────────────
 * Produces a flat token stream from SQL text:
 *   { type: 'word',  value, pos }   identifiers/keywords, lowercased
 *   { type: 'punct', value, pos }   one of . ( ) , ; ::  and 'q' (a quote
 *                                   position marker inside string contents)
 * Comments vanish. Single-quoted strings and dollar-quoted bodies are scanned
 * AS CODE (dynamic SQL inside them is a real reference) and recorded as spans
 * so the walker can mark guarded ones afterwards.
 */
function scanSql(text) {
  const tokens = [];
  const stringSpans = []; // { startTok, endTok }
  const n = text.length;
  let i = 0;

  const isIdentStart = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  const isDigit = (c) => c >= '0' && c <= '9';
  const isIdentChar = (c) => isIdentStart(c) || isDigit(c) || c === '$';

  while (i < n) {
    const c = text[i];

    if (c === '-' && text[i + 1] === '-') {
      while (i < n && text[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (c === "'") {
      const startTok = tokens.length;
      i = scanStringContents(text, tokens, i + 1);
      if (tokens.length > startTok) stringSpans.push({ startTok, endTok: tokens.length - 1 });
      continue;
    }
    if (c === '"') {
      // double-quoted identifier: preserve as a word token (lowercased later
      // at use — the estate convention is lowercase everywhere, and pg_dump's
      // quoting must not break qualified-name detection).
      let j = i + 1;
      let value = '';
      while (j < n && text[j] !== '"') {
        value += text[j];
        j += 1;
      }
      if (j < n) {
        tokens.push({ type: 'word', value: value.toLowerCase(), pos: i });
        i = j + 1;
        continue;
      }
      // unterminated — treat the quote as noise
      i += 1;
      continue;
    }
    if (c === '$') {
      // dollar-quoted string? $tag$ — tag obeys identifier rules, then '$'.
      let j = i + 1;
      let tag = '';
      while (j < n && isIdentChar(text[j]) && text[j] !== '$') {
        tag += text[j];
        j += 1;
      }
      if (j < n && text[j] === '$' && tag.length > 0 && isIdentStart(text[j - tag.length])) {
        const close = '$' + tag + '$';
        i = j + 1;
        while (i < n) {
          if (text.startsWith(close, i)) break;
          if (text[i] === '-' && text[i + 1] === '-') {
            while (i < n && text[i] !== '\n') i += 1;
            continue;
          }
          if (text[i] === '/' && text[i + 1] === '*') {
            i += 2;
            while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
            i += 2;
            continue;
          }
          if (text[i] === "'") {
            const startTok = tokens.length;
            i = scanStringContents(text, tokens, i + 1);
            if (tokens.length > startTok) stringSpans.push({ startTok, endTok: tokens.length - 1 });
            continue;
          }
          if (isIdentStart(text[i])) {
            let j2 = i;
            let w = '';
            while (j2 < n && isIdentChar(text[j2])) {
              w += text[j2];
              j2 += 1;
            }
            tokens.push({ type: 'word', value: w.toLowerCase(), pos: i });
            i = j2;
            continue;
          }
          if (text[i] === ':' && text[i + 1] === '::') {
            tokens.push({ type: 'punct', value: '::', pos: i });
            i += 2;
            continue;
          }
          if ('.,();'.includes(text[i])) {
            tokens.push({ type: 'punct', value: text[i], pos: i });
            i += 1;
            continue;
          }
          i += 1;
        }
        i += close.length;
        continue;
      }
      // not a dollar quote ($1 params etc.) — plain char
      i += 1;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i;
      let w = '';
      while (j < n && isIdentChar(text[j])) {
        w += text[j];
        j += 1;
      }
      tokens.push({ type: 'word', value: w.toLowerCase(), pos: i });
      i = j;
      continue;
    }
    if (c === ':' && text[i + 1] === ':') {
      tokens.push({ type: 'punct', value: '::', pos: i });
      i += 2;
      continue;
    }
    if ('.,();'.includes(c)) {
      tokens.push({ type: 'punct', value: c, pos: i });
      i += 1;
      continue;
    }
    i += 1;
  }
  return { tokens, stringSpans };
}

function isIdentStart(c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
}

/* Scan the contents of a single-quoted string: words + punctuation only.
 * No comments, no dollar quotes, no nested strings (the '' doubling is
 * handled here). Consumes through the closing quote. */
function scanStringContents(text, tokens, i) {
  while (i < text.length) {
    const c = text[i];
    if (c === "'") {
      if (text[i + 1] === "'") {
        tokens.push({ type: 'punct', value: 'q', pos: i });
        i += 2;
        continue;
      }
      return i + 1;
    }
    if (isIdentStart(c)) {
      let j = i;
      let w = '';
      while (j < text.length && (isIdentStart(text[j]) || (text[j] >= '0' && text[j] <= '9') || text[j] === '$')) {
        w += text[j];
        j += 1;
      }
      tokens.push({ type: 'word', value: w.toLowerCase(), pos: i });
      i = j;
      continue;
    }
    if (c === ':' && text[i + 1] === ':') {
      tokens.push({ type: 'punct', value: '::', pos: i });
      i += 2;
      continue;
    }
    if ('.,();'.includes(c)) {
      tokens.push({ type: 'punct', value: c, pos: i });
      i += 1;
      continue;
    }
    i += 1;
  }
  return i;
}

/* ───────────────────────── token walker ─────────────────────────
 * Turns the token stream into creates / drops / refs with context.
 */

const CREATE_KIND_MAP = {
  TABLE: 'rel',
  VIEW: 'rel',
  'MATERIALIZED VIEW': 'rel',
  'FOREIGN TABLE': 'rel',
  FUNCTION: 'fn',
  PROCEDURE: 'fn',
  TYPE: 'type',
  DOMAIN: 'type',
  SEQUENCE: 'seq',
};

const DROP_KIND_MAP = {
  TABLE: 'rel',
  VIEW: 'rel',
  'MATERIALIZED VIEW': 'rel',
  'FOREIGN TABLE': 'rel',
  FUNCTION: 'fn',
  PROCEDURE: 'fn',
  TYPE: 'type',
  DOMAIN: 'type',
  SEQUENCE: 'seq',
};

const CREATE_FILLERS = new Set(['IF', 'NOT', 'EXISTS', 'TEMP', 'TEMPORARY', 'UNLOGGED']);
const DROP_FILLERS = new Set(['IF', 'EXISTS']);
const ALTER_FILLERS = new Set(['ONLY', 'IF', 'EXISTS']);

function kindAfterCreateOrDrop(words, startIdx, kindMap) {
  let j = startIdx + 1;
  if (words[j] === 'OR' && words[j + 1] === 'REPLACE') j += 2;
  if (words[j] === 'MATERIALIZED' && words[j + 1] === 'VIEW') {
    return { kind: 'MATERIALIZED VIEW', gap: words.slice(j + 2) };
  }
  if (words[j] === 'FOREIGN' && words[j + 1] === 'TABLE') {
    return { kind: 'FOREIGN TABLE', gap: words.slice(j + 2) };
  }
  const kind = words[j];
  if (!kindMap[kind]) return { kind: null, gap: [] };
  return { kind, gap: words.slice(j + 1) };
}

function gapIsFiller(gap, allowed) {
  if (gap.length > 3) return false;
  return gap.every((w) => allowed.has(w));
}

/**
 * Classify ONE qualified occurrence (schema.name) given the lookback words.
 * Returns { role, kind, label } or null when no DDL context matches (the
 * caller then applies shape-based fallbacks).
 */
function classifyOccurrence(words, shape) {
  const n = words.length;
  for (let i = n - 1; i >= 0; i -= 1) {
    if (words[i] === 'CREATE') {
      const { kind, gap } = kindAfterCreateOrDrop(words, i, CREATE_KIND_MAP);
      const mapped = CREATE_KIND_MAP[kind];
      if (mapped && gapIsFiller(gap, CREATE_FILLERS)) {
        return { role: 'create', kind: mapped, label: 'create ' + kind.toLowerCase() };
      }
      break;
    }
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    if (words[i] === 'DROP') {
      const { kind, gap } = kindAfterCreateOrDrop(words, i, DROP_KIND_MAP);
      const mapped = DROP_KIND_MAP[kind];
      if (mapped && gapIsFiller(gap, DROP_FILLERS)) {
        return { role: 'drop', kind: mapped, label: 'drop ' + kind.toLowerCase() };
      }
      break;
    }
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    if (words[i] === 'ALTER') {
      const kind = words[i + 1];
      const gap = words.slice(i + 2);
      if (!gapIsFiller(gap, ALTER_FILLERS)) break;
      if (kind === 'TABLE' || kind === 'VIEW') return { role: 'ref', kind: 'rel', label: 'alter ' + kind.toLowerCase() };
      if (kind === 'TYPE' || kind === 'DOMAIN') return { role: 'ref', kind: 'type', label: 'alter ' + kind.toLowerCase() };
      if (kind === 'SEQUENCE') return { role: 'ref', kind: 'seq', label: 'alter sequence' };
      if (kind === 'FUNCTION' || kind === 'PROCEDURE') return { role: 'ref', kind: 'fn', label: 'alter function' };
      if (kind === 'SCHEMA') return { role: 'ref', kind: 'schema', label: 'alter schema' };
      break;
    }
  }
  if (n >= 1 && words[n - 1] === 'ON') {
    const prev = words[n - 2];
    if (prev === 'FUNCTION' || prev === 'PROCEDURE' || prev === 'ROUTINE') return { role: 'ref', kind: 'fn', label: 'function target of ON FUNCTION' };
    if (prev === 'TABLE') return { role: 'ref', kind: 'rel', label: 'table target of ON TABLE' };
    if (prev === 'SEQUENCE') return { role: 'ref', kind: 'seq', label: 'sequence target of ON SEQUENCE' };
    if (prev === 'SCHEMA') return { role: 'ref', kind: 'schema', label: 'schema target of ON SCHEMA' };
    if (prev === 'TYPE') return { role: 'ref', kind: 'type', label: 'type target of ON TYPE' };
    return { role: 'ref', kind: 'rel', label: 'relation after ON' };
  }
  const last = words[n - 1];
  if (last === 'FROM') return { role: 'ref', kind: shape === 'call' ? 'fn' : 'rel', label: shape === 'call' ? 'set-returning call after FROM' : 'relation after FROM' };
  if (last === 'JOIN') return { role: 'ref', kind: 'rel', label: 'relation after JOIN' };
  if (last === 'INTO') return { role: 'ref', kind: 'rel', label: 'relation after INTO' };
  if (last === 'UPDATE' && shape !== 'call') return { role: 'ref', kind: 'rel', label: 'relation after UPDATE' };
  if (last === 'REFERENCES') return { role: 'ref', kind: 'rel', label: 'relation after REFERENCES' };
  if (last === 'TRUNCATE') return { role: 'ref', kind: 'rel', label: 'relation after TRUNCATE' };
  if (last === 'LIKE' || last === 'INHERITS') return { role: 'ref', kind: 'rel', label: 'relation after ' + last };
  if (last === 'RETURNS' || (last === 'SETOF' && words[n - 2] === 'RETURNS')) {
    return { role: 'ref', kind: 'type', label: 'type after RETURNS' };
  }
  return null;
}

/**
 * Extract every schema-qualified reference from a migration's SQL, plus the
 * objects it creates and drops, plus unqualified CREATE/DROP SCHEMA names.
 *
 * `knownSchemas` — the set of schema names this rebuild could know about
 * (provided, or created somewhere in the tree). When supplied, a qualified
 * occurrence whose first component is NOT in that set is a table alias
 * (c.employer_id) and is skipped — the alias/reference ambiguity is resolved
 * here rather than by pretending every qualified word pair is a schema.
 * Pass null ONLY for the cheap first pass that exists to discover
 * schemaCreates (its refs are discarded).
 */
function extractSymbols(sqlText, knownSchemas) {
  const { tokens, stringSpans } = scanSql(sqlText);

  // Guarded spans: a string whose immediately-preceding tokens are
  // `(` + to_reg* word, or which is followed by `::` + REG* word.
  const guardedTok = new Set();
  for (const span of stringSpans) {
    let guarded = false;
    const before = tokens[span.startTok - 1];
    const before2 = tokens[span.startTok - 2];
    if (before && before.type === 'punct' && before.value === '(' && before2 && before2.type === 'word' && REG_PROBE_FUNCTIONS.has(before2.value)) {
      guarded = true;
    }
    if (!guarded) {
      const after = tokens[span.endTok + 1];
      const after2 = tokens[span.endTok + 2];
      if (after && after.type === 'punct' && after.value === '::' && after2 && after2.type === 'word' && after2.value.startsWith('reg')) {
        guarded = true;
      }
    }
    if (guarded) {
      for (let t = span.startTok; t <= span.endTok; t += 1) guardedTok.add(t);
    }
  }

  const lookback = [];
  const creates = [];
  const drops = [];
  const refs = [];
  const schemaCreates = [];
  const schemaDrops = [];

  for (let t = 0; t < tokens.length; t += 1) {
    const tok = tokens[t];
    if (tok.type !== 'word') continue;
    const next = tokens[t + 1];
    const after = tokens[t + 2];

    if (next && next.type === 'punct' && next.value === '.' && after && after.type === 'word') {
      const schema = tok.value;
      const name = after.value;
      const afterName = tokens[t + 3];
      let shape = 'plain';
      if (afterName && afterName.type === 'punct' && afterName.value === '(') {
        shape = 'call';
      }
      const guarded =
        guardedTok.has(t) ||
        guardedTok.has(t + 2) ||
        (nextIsOpenParenOfRegProbe(tokens, t));

      if (!guarded) {
        // ALIAS FILTER: when the caller supplies knownSchemas, a qualified
        // occurrence whose FIRST component is not a schema this rebuild can
        // know about (provided, or created somewhere in the tree) is a table
        // alias (c.employer_id), not a schema reference.
        if (knownSchemas && !knownSchemas.has(schema)) {
          lookback.push(schema.toUpperCase(), name.toUpperCase());
          if (lookback.length > 12) lookback.splice(0, lookback.length - 12);
          continue;
        }
        const context = classifyOccurrence(lookback.slice(), shape);
        let role = context ? context.role : null;
        let kind = context ? context.kind : null;
        let label = context ? context.label : null;
        if (!context) {
          if (shape === 'call') {
            role = 'ref';
            kind = 'fn';
            label = 'function call';
          } else {
            role = 'ref';
            kind = 'any';
            label = 'qualified reference';
          }
        }
        const record = { schema, name, shape, role, kind, label, pos: tok.pos };
        if (role === 'create') creates.push(record);
        else if (role === 'drop') drops.push(record);
        else if (role === 'ref') refs.push(record);
      }

      lookback.push(schema.toUpperCase(), name.toUpperCase());
      if (lookback.length > 12) lookback.splice(0, lookback.length - 12);
      continue;
    }

    // unqualified CREATE SCHEMA / DROP SCHEMA <name> — decided FORWARD from
    // the verb, never backward: a backward walk misreads
    // `CREATE SCHEMA IF NOT EXISTS x` as four schema creations (if, not,
    // exists, x) because every filler word sits right after SCHEMA.
    if ((tok.value === 'create' || tok.value === 'drop') && next && next.type === 'word' && next.value === 'schema') {
      let k = t + 2;
      while (k < tokens.length && tokens[k].type === 'word' && (tokens[k].value === 'if' || tokens[k].value === 'not' || tokens[k].value === 'exists')) k += 1;
      const nameTok = tokens[k];
      if (nameTok && nameTok.type === 'word') {
        if (tok.value === 'create') schemaCreates.push({ schema: nameTok.value, pos: nameTok.pos });
        else schemaDrops.push({ schema: nameTok.value, pos: nameTok.pos });
      }
    }

    lookback.push(tok.value.toUpperCase());
    if (lookback.length > 12) lookback.splice(0, lookback.length - 12);
  }
  return { creates, drops, refs, schemaCreates, schemaDrops };
}

/* A bare (unquoted) to_reg* argument: `to_regclass(public.x)`. */
function nextIsOpenParenOfRegProbe(tokens, t) {
  const prev = tokens[t - 1];
  const prev2 = tokens[t - 2];
  return (
    prev !== undefined && prev.type === 'punct' && prev.value === '(' &&
    prev2 !== undefined && prev2.type === 'word' && REG_PROBE_FUNCTIONS.has(prev2.value)
  );
}

/* ───────────────────────── migration discovery ─────────────────────────
 * Mirrors scripts/supabase/rehearse-migrations.mjs (loadScopes,
 * loadQuarantine, collectMigrations) so --changed paths match the engine's
 * rel strings EXACTLY — the selector's contract, bsuite#1964.
 * Deliberately a local copy: rehearse-migrations.mjs is mid-flight in
 * bsuite#3147 (PR #3295) and this file must not collide with it. Once that
 * merges, a follow-up should extract the shared collector.
 */

function allDigits(text) {
  if (text.length === 0) return false;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < DIGIT_0 || code > DIGIT_9) return false;
  }
  return true;
}

function parseVersion(basename) {
  const underscore = basename.indexOf('_');
  if (underscore !== VERSION_LENGTH) return null;
  const version = basename.slice(0, VERSION_LENGTH);
  return allDigits(version) ? version : null;
}

function stripComment(line) {
  const hash = line.indexOf('#');
  return (hash === -1 ? line : line.slice(0, hash)).trim();
}

function loadScopes(root) {
  const file = path.join(root, 'supabase', 'migration-scopes.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  return manifest.scopes.map((scope) => ({
    id: scope.id,
    workdir: scope.workdir,
    migrationsDir: scope.migrations_dir || path.posix.join(scope.workdir, 'supabase', 'migrations'),
    declaredOwnsDatabase: scope.has_database !== false,
  }));
}

function loadQuarantine(absMigrationsDir) {
  const file = path.join(absMigrationsDir, 'KNOWN-BROKEN-IN-CI.txt');
  if (!fs.existsSync(file)) return new Set();
  const names = new Set();
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const cleaned = stripComment(rawLine);
    if (cleaned.length === 0) continue;
    names.add(path.basename(cleaned));
  }
  return names;
}

function collectMigrations(root, scopes) {
  const found = [];
  const missingScopes = [];
  for (const scope of scopes) {
    const absDir = path.join(root, scope.migrationsDir);
    if (!fs.existsSync(absDir)) {
      if (!scope.declaredOwnsDatabase) continue;
      missingScopes.push(scope.id);
      continue;
    }
    const quarantined = loadQuarantine(absDir);
    const dirs = [{ abs: absDir, relPrefix: scope.migrationsDir }];
    const archiveAbs = path.join(absDir, 'archive');
    if (fs.existsSync(archiveAbs) && fs.statSync(archiveAbs).isDirectory()) {
      dirs.push({ abs: archiveAbs, relPrefix: path.posix.join(scope.migrationsDir, 'archive') });
    }
    for (const dir of dirs) {
      for (const entry of fs.readdirSync(dir.abs, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith('.sql')) continue;
        const version = parseVersion(entry.name);
        if (version === null) continue;
        found.push({
          scope: scope.id,
          basename: entry.name,
          abs: path.join(dir.abs, entry.name),
          rel: path.posix.join(dir.relPrefix, entry.name),
          version,
          quarantined: quarantined.has(entry.name),
        });
      }
    }
  }
  found.sort((a, b) => {
    if (a.version !== b.version) return a.version < b.version ? -1 : 1;
    if (a.scope !== b.scope) return a.scope < b.scope ? -1 : 1;
    return a.basename < b.basename ? -1 : 1;
  });
  return { migrations: found, missingScopes };
}

/* ───────────────────────── baseline artefacts ─────────────────────────
 * Same resolution rules as rehearsal-bootstrap.sh (dump) and the bsuite#3147
 * membership loader (applied-versions): newest by name under
 * crm7/supabase/migrations/baseline/, exactly one candidate, fail closed.
 */

function newestBaselineFile(root, prefix, suffix, what) {
  const baselineDir = path.join(root, 'crm7', 'supabase', 'migrations', 'baseline');
  let candidates = [];
  try {
    candidates = fs
      .readdirSync(baselineDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.startsWith(prefix) && e.name.endsWith(suffix))
      .map((e) => e.name)
      .sort();
  } catch {
    return { error: `cannot read ${baselineDir} — is the crm7 submodule checked out? (needed for ${what})` };
  }
  if (candidates.length === 0) {
    return { error: `no ${prefix}*${suffix} found under ${baselineDir} — ${what} cannot run without it` };
  }
  if (candidates.length > 1) {
    return {
      error: `${candidates.length} ${prefix}*${suffix} files found under ${baselineDir} — refusing to guess which is production's:\n  ${candidates.join('\n  ')}`,
    };
  }
  return {
    file: candidates[0],
    rel: path.posix.join('crm7/supabase/migrations/baseline', candidates[0]),
    abs: path.join(baselineDir, candidates[0]),
  };
}

function loadAppliedVersions(root) {
  const r = newestBaselineFile(root, 'applied-versions-', '.txt', 'the membership rule (bsuite#3147)');
  if (r.error) return r;
  const raw = fs.readFileSync(r.abs, 'utf8');
  const set = new Set();
  let malformed = 0;
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    // The ledger predates the 14-digit convention and legitimately carries
    // short legacy versions (20250601 …). Malformed = NON-DIGIT line.
    if (!allDigits(line)) {
      malformed += 1;
      continue;
    }
    set.add(line);
  }
  if (set.size === 0) {
    return { error: `applied-versions artefact ${r.rel} parsed to an EMPTY set — refusing to treat "nothing recorded" as a rule` };
  }
  if (malformed > 0) {
    return { error: `applied-versions artefact ${r.rel} holds ${malformed} malformed line(s) — refusing to guess which entries are real versions` };
  }
  return { file: r.rel, set, count: set.size };
}

/* ───────────────────────── universe construction ───────────────────────── */

function newUniverse() {
  return { fn: new Set(), rel: new Set(), type: new Set(), seq: new Set(), schema: new Set(PROVIDED_SCHEMAS) };
}

function universeAdd(u, kind, schema, name) {
  if (kind === 'fn') u.fn.add(schema + '.' + name);
  else if (kind === 'rel') u.rel.add(schema + '.' + name);
  else if (kind === 'type') u.type.add(schema + '.' + name);
  else if (kind === 'seq') u.seq.add(schema + '.' + name);
  else if (kind === 'schema') u.schema.add(schema);
}

function universeDrop(u, kind, schema, name) {
  const key = schema + '.' + name;
  if (kind === 'fn') u.fn.delete(key);
  else if (kind === 'rel') u.rel.delete(key);
  else if (kind === 'type') u.type.delete(key);
  else if (kind === 'seq') u.seq.delete(key);
  else if (kind === 'schema') u.schema.delete(schema);
}

function universeHasWithLocal(universe, ref, selfKinds) {
  // A KNOWN SCHEMA proves only the SCHEMA exists. It says nothing about the
  // object inside it — the object-level sets decide that. Only a ref whose
  // kind IS the schema (GRANT … ON SCHEMA x) resolves via the schema set.
  // Without this distinction every public.* object auto-resolved and the
  // gate was blind to exactly the class it exists for — caught by this
  // file's own self-test (the gate that approved everything).
  if (ref.kind === 'schema') return universe.schema.has(ref.schema);
  const key = ref.schema + '.' + ref.name;
  const kindSets = [];
  if (ref.kind === 'fn') kindSets.push(universe.fn);
  else if (ref.kind === 'rel') kindSets.push(universe.rel);
  else if (ref.kind === 'type') kindSets.push(universe.type, universe.rel);
  else if (ref.kind === 'seq') kindSets.push(universe.seq);
  else if (ref.kind === 'schema') kindSets.push(universe.schema);
  else kindSets.push(universe.fn, universe.rel, universe.type, universe.seq);
  for (const s of kindSets) if (s.has(key)) return true;
  if (selfKinds) {
    const localSets = [];
    if (ref.kind === 'fn') localSets.push(selfKinds.fn);
    else if (ref.kind === 'rel') localSets.push(selfKinds.rel);
    else if (ref.kind === 'type') localSets.push(selfKinds.type, selfKinds.rel);
    else if (ref.kind === 'seq') localSets.push(selfKinds.seq);
    else localSets.push(selfKinds.fn, selfKinds.rel, selfKinds.type, selfKinds.seq);
    for (const s of localSets) if (s.has(key)) return true;
  }
  return false;
}

/**
 * Classify one migration EXACTLY as the rehearsal engine does post-#3147:
 * floor, then MEMBERSHIP in the applied set, then quarantine.
 */
function classifyMigration(migration, context) {
  if (migration.version < context.floor) return { status: 'below-floor' };
  if (context.appliedSet.has(migration.version)) return { status: 'in-baseline' };
  if (migration.quarantined) return { status: 'quarantined' };
  return { status: 'selected' };
}

/* ───────────────────────── creator search ───────────────────────── */

const STATUS_PHRASES = {
  'in-dump': 'the baseline dump provides it — if you are seeing this the instrument has a gap, please report it',
  'in-baseline': 'recorded applied — the rebuild gets its objects ONLY from the baseline dump, which does NOT carry it (the bsuite#3136 shape)',
  quarantined: 'QUARANTINED in KNOWN-BROKEN-IN-CI.txt — it never replays, so its objects never exist on a rebuild',
  'below-floor': 'below the rehearsal floor — never replayed; only the dump could carry its objects',
  selected: 'replays LATER in the global order than the referencing migration — ordering defect',
};

/**
 * For a missing symbol, find every file in the tree (any status) that creates
 * it, plus any file that DROPS it (a create-then-drop explains an "earlier
 * creator" that still leaves the symbol missing), and report each with its
 * rehearsal status — "the file that used to create it", named, never a count.
 */
function findCreators(missing, migrationsWithSymbols, dumpRel) {
  const creators = [];
  const droppers = [];
  if (missing.dumpCreates.has(missing.schema + '.' + missing.name)) {
    creators.push({ where: dumpRel, status: 'in-dump' });
  }
  if (missing.dumpDrops.has(missing.schema + '.' + missing.name)) {
    droppers.push({ where: dumpRel, status: 'in-dump' });
  }
  for (const m of migrationsWithSymbols) {
    for (const c of m.symbols.creates) {
      if (c.schema === missing.schema && c.name === missing.name) {
        creators.push({ where: m.migration.rel, status: m.status });
      }
    }
    for (const d of m.symbols.drops) {
      if (d.schema === missing.schema && d.name === missing.name) {
        droppers.push({ where: m.migration.rel, status: m.status });
      }
    }
  }
  // schema creators — when the SCHEMA itself is not provided and not built by
  // the replay, that is the deepest cause and must be named first.
  const schemaCreators = [];
  for (const m of migrationsWithSymbols) {
    for (const c of m.symbols.schemaCreates) {
      if (c.schema === missing.schema) {
        schemaCreators.push({ where: m.migration.rel, status: m.status });
      }
    }
  }
  return { creators, droppers, schemaCreators };
}

/* ───────────────────────── the gate ───────────────────────── */

function fmtRef(r) {
  return r.schema + '.' + r.name + ' (' + r.label + ')';
}

function runGate(options) {
  const { root, changedList, floor, audit } = options;
  const problems = [];

  let scopes;
  try {
    scopes = loadScopes(root);
  } catch (err) {
    return { exit: 2, lines: [`::error::cannot read supabase/migration-scopes.json: ${err.message}`] };
  }
  const { migrations, missingScopes } = collectMigrations(root, scopes);
  if (missingScopes.length > 0) {
    return { exit: 2, lines: [`::error::scopes not checked out: ${missingScopes.join(', ')} — a symbol universe missing a scope is not the tree's universe`] };
  }

  const applied = loadAppliedVersions(root);
  if (applied.error) return { exit: 2, lines: [`::error::${applied.error}`] };
  const dump = newestBaselineFile(root, '', '_prod_baseline_schema_dump.sql', 'the substrate seed');
  if (dump.error) return { exit: 2, lines: [`::error::${dump.error}`] };
  const dumpText = fs.readFileSync(dump.abs, 'utf8');

  const context = { floor, appliedSet: applied.set };
  const classifications = new Map();
  for (const m of migrations) classifications.set(m.rel, classifyMigration(m, context).status);

  const changedSet = new Set(changedList);
  if (!audit && changedSet.size === 0) {
    return { exit: 0, lines: ['No changed migrations supplied — nothing to gate (exit 0).'] };
  }
  if (!audit) {
    const known = changedList.filter((p) => classifications.has(p));
    const unknown = changedList.filter((p) => !classifications.has(p));
    if (known.length === 0) {
      return {
        exit: 2,
        lines: [
          `::error::none of the ${changedList.length} --changed path(s) match a discovered migration — the selector's format and this collector's rel strings have diverged (the bsuite#1964 shape). First unmatched: ${changedList[0]}`,
        ],
      };
    }
    for (const u of unknown) {
      if (u.endsWith('.sql') && parseVersion(path.posix.basename(u)) !== null) {
        problems.push(`::error::--changed path not found in the discovered tree: ${u}`);
      }
    }
  }

  // scan every migration twice:
  //   pass 1 (cheap): discover unqualified CREATE SCHEMA names anywhere in the
  //     tree, so pass 2's alias filter knows every schema the rebuild could
  //     possibly know about.
  //   pass 2 (full): the real symbol extraction. The pass-1 refs are discarded
  //     because the alias filter needs the complete knownSchemas set.
  const treeSchemas = new Set(PROVIDED_SCHEMAS);
  const migrationsWithSymbols = [];
  for (const m of migrations) {
    let sqlText;
    try {
      sqlText = fs.readFileSync(m.abs, 'utf8');
    } catch (err) {
      return { exit: 2, lines: [`::error::cannot read ${m.rel}: ${err.message}`] };
    }
    const s1 = extractSymbols(sqlText, null);
    for (const s of s1.schemaCreates) treeSchemas.add(s.schema);
    migrationsWithSymbols.push({ migration: m, sqlText, status: classifications.get(m.rel), pass1: s1 });
  }
  for (const entry of migrationsWithSymbols) {
    entry.symbols = extractSymbols(entry.sqlText, treeSchemas);
    entry.pass1 = undefined;
  }

  // Schemas known to the rebuild: provided + dump-created + created by any
  // SELECTED migration (pre-seeded regardless of order — a schema ref is
  // gateable the moment SOME replay path builds the schema; ordering within
  // the replay is the engine's business). Schemas created ONLY by
  // in-baseline / below-floor / quarantined files are deliberately NOT
  // pre-seeded: the rebuild cannot produce them, so a reference into one is
  // a finding, and the creator search names the file that would have built it.
  const universe = newUniverse();

  // seed the universe with the dump (creates/drops in statement order)
  const dumpSymbols = extractSymbols(dumpText, treeSchemas);
  const dumpCreates = new Set();
  const dumpDrops = new Set();
  {
    const ops = [
      ...dumpSymbols.creates.map((c) => ({ op: 'add', ...c })),
      ...dumpSymbols.drops.map((d) => ({ op: 'drop', ...d })),
    ].sort((a, b) => a.pos - b.pos);
    for (const o of ops) {
      if (o.op === 'add') {
        universeAdd(universe, o.kind, o.schema, o.name);
        dumpCreates.add(o.schema + '.' + o.name);
      } else {
        universeDrop(universe, o.kind, o.schema, o.name);
        dumpDrops.add(o.schema + '.' + o.name);
        dumpCreates.delete(o.schema + '.' + o.name);
      }
    }
  }
  const dumpSchemaCreates = dumpSymbols.schemaCreates.map((s) => s.schema);
  for (const s of dumpSchemaCreates) universeAdd(universe, 'schema', s, s);

  // pre-seed schemas created by any SELECTED migration (see comment above)
  for (const entry of migrationsWithSymbols) {
    if (entry.status !== 'selected') continue;
    for (const s of entry.symbols.schemaCreates) universeAdd(universe, 'schema', s.schema, s.schema);
  }

  const findings = [];
  const notices = [];

  // walk in global order, evaluating changed/audited files and applying
  // selected migrations' creates/drops as the rebuild would.
  for (const entry of migrationsWithSymbols) {
    const m = entry.migration;
    const status = entry.status;
    const isChanged = changedSet.has(m.rel);

    if (status === 'selected') {
      if (isChanged || audit) {
        // The file's own creates are available to the whole file (documented
        // decision: whole-file self-containment).
        const selfKinds = { fn: new Set(), rel: new Set(), type: new Set(), seq: new Set() };
        for (const c of entry.symbols.creates) selfKinds[c.kind].add(c.schema + '.' + c.name);
        for (const r of entry.symbols.refs) {
          // TRUST BOUNDARY: a schema the SUBSTRATE provides (auth, storage,
          // cron, …) is trusted INCLUDING its objects — this gate has no
          // static inventory of the image's built-in objects, and policing
          // them would cry wolf on auth.uid() and storage.objects. 'public'
          // is deliberately NOT trusted at object level: the baseline dump
          // carries the public inventory, so public objects are exactly what
          // this gate polices. Objects in tree-created schemas must resolve
          // against the replay universe.
          if (r.schema !== 'public' && PROVIDED_SCHEMAS.has(r.schema)) continue;
          if (!universeHasWithLocal(universe, r, selfKinds)) findings.push({ migration: m, ref: r });
        }
      }
      // apply this file's effects in statement order
      const ops = [
        ...entry.symbols.creates.map((c) => ({ op: 'add', ...c })),
        ...entry.symbols.drops.map((d) => ({ op: 'drop', ...d })),
      ].sort((a, b) => a.pos - b.pos);
      for (const o of ops) {
        if (o.op === 'add') universeAdd(universe, o.kind, o.schema, o.name);
        else universeDrop(universe, o.kind, o.schema, o.name);
      }
      for (const s of entry.symbols.schemaCreates) universeAdd(universe, 'schema', s.schema, s.schema);
      for (const s of entry.symbols.schemaDrops) universeDrop(universe, 'schema', s.schema, s.schema);
      continue;
    }

    if (isChanged) {
      if (status === 'quarantined') {
        notices.push(`::notice::${m.rel} is changed by this PR but QUARANTINED (KNOWN-BROKEN-IN-CI.txt) — the ratchet owns it; its symbols are not gated here.`);
      } else if (status === 'in-baseline') {
        notices.push(`::notice::${m.rel} is changed by this PR but is RECORDED APPLIED — no replay path re-runs it, so edits to it are invisible to every replay. If this PR means to change behaviour, ship a NEW migration instead.`);
      } else if (status === 'below-floor') {
        notices.push(`::notice::${m.rel} is changed by this PR but is below the rehearsal floor ${floor} — not gated here; the baseline dump must carry its dependencies.`);
      }
    }
  }

  // resolve creators for each finding
  const lines = [];
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.migration.rel)) byFile.set(f.migration.rel, []);
    byFile.get(f.migration.rel).push(f);
  }
  const errorLines = [];
  for (const [rel, list] of byFile) {
    lines.push(`\n${rel}`);
    for (const f of list) {
      const probe = {
        schema: f.ref.schema,
        name: f.ref.name,
        dumpCreates,
        dumpDrops,
      };
      const { creators, droppers, schemaCreators } = findCreators(probe, migrationsWithSymbols, dump.rel);
      lines.push(`  MISSING  ${fmtRef(f.ref)}`);
      errorLines.push(`::error::${rel}: unresolvable ${f.ref.schema}.${f.ref.name} (${f.ref.label})`);
      const schemaMissing = !PROVIDED_SCHEMAS.has(f.ref.schema) && !universe.schema.has(f.ref.schema);
      if (schemaMissing) {
        if (schemaCreators.length === 0) {
          lines.push(`    schema: no file in the tree creates schema ${f.ref.schema} — the rebuilt database has nowhere to put it.`);
        } else {
          for (const c of schemaCreators) {
            lines.push(`    schema ${f.ref.schema}: ${c.where} — ${STATUS_PHRASES[c.status] || c.status}`);
          }
        }
      }
      if (creators.length === 0) {
        lines.push('    creator: no file in the tree creates this symbol — nothing a rebuild can run will produce it.');
      } else {
        for (const c of creators) {
          lines.push(`    creator: ${c.where} — ${STATUS_PHRASES[c.status] || c.status}`);
        }
      }
      for (const d of droppers) {
        if (d.status === 'selected') {
          lines.push(`    dropped by: ${d.where} — replays and REMOVES it; an earlier creator is not enough, the drop must go or the reference must move before it`);
        }
      }
    }
  }

  const selectedCount = migrationsWithSymbols.filter((e) => e.status === 'selected').length;
  const header = audit
    ? `Symbol-gap audit over all ${selectedCount} replayable migration(s) — substrate: ${dump.rel} + ${applied.count} recorded applied versions (membership, bsuite#3147). Dump objects seeded: ${dumpCreates.size} creates / ${dumpDrops.size} drops.`
    : `Symbol gate over ${changedList.length} changed migration(s) — substrate: ${dump.rel} + ${applied.count} recorded applied versions (membership, bsuite#3147). Dump objects seeded: ${dumpCreates.size} creates / ${dumpDrops.size} drops.`;

  const out = [header, ...notices];
  if (problems.length > 0) out.push(...problems);
  if (findings.length === 0) {
    out.push(audit ? 'No unresolvable symbols found in the replayable set.' : 'All referenced symbols resolve against the rebuild universe — gate PASSED.');
  } else {
    out.push(...lines);
    out.push(`\n${findings.length} unresolvable symbol reference(s) across ${byFile.size} migration file(s).`);
  }
  const exit = problems.length > 0 ? 2 : findings.length === 0 ? 0 : 1;
  return { exit, lines: out, errorLines, findings, stats: { selectedCount, dumpCreates: dumpCreates.size, dumpDrops: dumpDrops.size } };
}

/* ───────────────────────── self-test ─────────────────────────
 * A gate never seen to fail is not a gate. Builds a synthetic estate in a
 * temp dir (scopes manifest, crm7 baseline pair, app migrations) and asserts
 * verdicts AND the fail-BY-NAME requirement on every case. No database.
 */

function runSelfTest() {
  const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'symbol-gap-selftest-'));
  const outcomes = [];
  const record = (name, ok, detail) => {
    outcomes.push({ name, ok, detail });
  };

  try {
    const root = path.join(tmpDir, 'estate');
    fs.mkdirSync(path.join(root, 'supabase'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'supabase', 'migration-scopes.json'),
      JSON.stringify({
        schema_version: '1.0',
        scopes: [
          { id: 'root', label: 'Root', workdir: '.', migrations_dir: 'supabase/migrations' },
          { id: 'app', label: 'App', workdir: 'app', migrations_dir: 'app/supabase/migrations' },
        ],
      }),
    );
    const baselineDir = path.join(root, 'crm7', 'supabase', 'migrations', 'baseline');
    fs.mkdirSync(baselineDir, { recursive: true });
    fs.writeFileSync(
      path.join(baselineDir, '20260914_prod_baseline_schema_dump.sql'),
      [
        '-- synthetic dump',
        'CREATE SCHEMA IF NOT EXISTS "public";',
        'CREATE TABLE "public"."base_table" (id integer);',
        'CREATE FUNCTION "public"."base_fn"() RETURNS integer LANGUAGE sql AS $fn$ SELECT 1 $fn$;',
        '',
      ].join('\n'),
    );
    fs.writeFileSync(path.join(baselineDir, 'applied-versions-20260914.txt'), '20260612000000\n');

    fs.mkdirSync(path.join(root, 'supabase', 'migrations'), { recursive: true });
    fs.mkdirSync(path.join(root, 'app', 'supabase', 'migrations'), { recursive: true });

    const writeMig = (rel, textLines) => fs.writeFileSync(path.join(root, rel), textLines.join('\n') + '\n');

    writeMig('app/supabase/migrations/20260910000000_helper_fn.sql', [
      'CREATE OR REPLACE FUNCTION public.helper_fn() RETURNS integer LANGUAGE sql AS $f$ SELECT 2 $f$;',
    ]);
    writeMig('app/supabase/migrations/20260911000000_uses_helper.sql', [
      'CREATE POLICY p ON public.base_table USING (public.helper_fn() > 0);',
    ]);
    writeMig('app/supabase/migrations/20260912000000_references_later.sql', [
      'CREATE POLICY p ON public.base_table USING (public.later_fn() > 0);',
    ]);
    writeMig('app/supabase/migrations/20260913000000_later_fn.sql', [
      'CREATE OR REPLACE FUNCTION public.later_fn() RETURNS integer LANGUAGE sql AS $f$ SELECT 3 $f$;',
    ]);
    writeMig('app/supabase/migrations/20260914000000_quarantined_creator.sql', [
      'CREATE OR REPLACE FUNCTION public.q_fn() RETURNS integer LANGUAGE sql AS $f$ SELECT 4 $f$;',
    ]);
    writeMig('app/supabase/migrations/20260915000000_references_quarantined.sql', [
      'CREATE POLICY p ON public.base_table USING (public.q_fn() > 0);',
    ]);
    writeMig('app/supabase/migrations/20260916000000_references_missing.sql', [
      'CREATE POLICY p ON public.base_table USING (public.totally_absent_fn() > 0);',
    ]);
    writeMig('app/supabase/migrations/20260917000000_guarded_probe.sql', [
      'DO $do$ BEGIN',
      '  IF to_regprocedure(\'public.totally_absent_fn(uuid)\') IS NOT NULL THEN',
      '    NULL;',
      '  END IF;',
      'END $do$;',
    ]);
    writeMig('app/supabase/migrations/20260918000000_builtin_and_dump.sql', [
      'CREATE POLICY p ON public.base_table USING (auth.uid() IS NOT NULL AND public.base_fn() > 0);',
    ]);
    writeMig('app/supabase/migrations/20260919000000_self_contained.sql', [
      'CREATE OR REPLACE FUNCTION public.own_fn() RETURNS integer LANGUAGE sql AS $f$ SELECT 5 $f$;',
      'CREATE POLICY p ON public.base_table USING (public.own_fn() > 0);',
    ]);
    writeMig('app/supabase/migrations/20260920000000_alias_column.sql', [
      'CREATE POLICY p ON public.base_table USING (EXISTS (SELECT 1 FROM public.base_table c WHERE c.id = public.helper_fn()));',
    ]);
    writeMig('app/supabase/migrations/20260921000000_cast_ref.sql', [
      // 'x'::reg* existence probe — a guarded reference, must NOT gate
      "SELECT 'public.totally_absent_fn'::regprocedure IS NULL;",
    ]);
    fs.writeFileSync(path.join(root, 'app/supabase/migrations/KNOWN-BROKEN-IN-CI.txt'), '20260914000000_quarantined_creator.sql\n');

    const changed = [
      'app/supabase/migrations/20260911000000_uses_helper.sql',
      'app/supabase/migrations/20260912000000_references_later.sql',
      'app/supabase/migrations/20260915000000_references_quarantined.sql',
      'app/supabase/migrations/20260916000000_references_missing.sql',
      'app/supabase/migrations/20260917000000_guarded_probe.sql',
      'app/supabase/migrations/20260918000000_builtin_and_dump.sql',
      'app/supabase/migrations/20260919000000_self_contained.sql',
      'app/supabase/migrations/20260920000000_alias_column.sql',
      'app/supabase/migrations/20260921000000_cast_ref.sql',
    ].join(',');

    const result = runGate({ root, changedList: changed.split(','), floor: DEFAULT_FLOOR, audit: false });
    const outText = result.lines.join('\n');
    const findingsByFile = new Map();
    for (const f of result.findings || []) findingsByFile.set(f.migration.rel, f);

    const expectPass = [
      '20260911000000_uses_helper.sql',
      '20260917000000_guarded_probe.sql',
      '20260918000000_builtin_and_dump.sql',
      '20260919000000_self_contained.sql',
      '20260920000000_alias_column.sql',
      '20260921000000_cast_ref.sql',
    ];
    for (const base of expectPass) {
      const rel = 'app/supabase/migrations/' + base;
      record(`PASS — ${base}`, !findingsByFile.has(rel), findingsByFile.has(rel) ? 'unexpected finding: ' + (findingsByFile.get(rel) ? 'present' : '') : 'clean');
    }

    {
      const rel = 'app/supabase/migrations/20260916000000_references_missing.sql';
      const f = findingsByFile.get(rel);
      record(
        'FAIL-BY-NAME — missing symbol named, creator absent',
        !!f && outText.includes('totally_absent_fn') && outText.includes('no file in the tree creates'),
        f ? 'finding present' : 'NO finding — gate is blind',
      );
    }
    {
      const f = findingsByFile.get('app/supabase/migrations/20260912000000_references_later.sql');
      record(
        'FAIL-BY-NAME — ordering defect names the later file',
        !!f && outText.includes('20260913000000_later_fn.sql') && outText.includes('ordering defect'),
        f ? 'finding names later file' : 'NO finding — gate is blind',
      );
    }
    {
      const f = findingsByFile.get('app/supabase/migrations/20260915000000_references_quarantined.sql');
      record(
        'FAIL-BY-NAME — quarantined creator named',
        !!f && outText.includes('20260914000000_quarantined_creator.sql') && outText.includes('QUARANTINED'),
        f ? 'finding names quarantined file' : 'NO finding — gate is blind',
      );
    }
    record('EXIT — findings produce exit 1', result.exit === 1, `exit=${result.exit}`);

    // membership control: planted version below a refreshed max, absent from
    // the artefact, must classify SELECTED (replayed) — never by magnitude.
    {
      const cls = classifyMigration(
        { version: '20260908999999', quarantined: false },
        { floor: DEFAULT_FLOOR, appliedSet: new Set(['20261121000000']) },
      );
      record('MEMBERSHIP CONTROL — below refreshed max, absent from artefact: selected', cls.status === 'selected', `status=${cls.status}`);
    }
    // and a recorded version classifies in-baseline regardless of magnitude
    {
      const cls = classifyMigration(
        { version: '20260612000000', quarantined: false },
        { floor: DEFAULT_FLOOR, appliedSet: new Set(['20260612000000', '20261121000000']) },
      );
      record('MEMBERSHIP CONTROL — recorded applied: in-baseline', cls.status === 'in-baseline', `status=${cls.status}`);
    }

    let allOk = true;
    const lines = ['Positive control — the symbol gate must be seen to fail, by name:'];
    for (const o of outcomes) {
      if (!o.ok) allOk = false;
      lines.push(`  ${o.ok ? 'OK  ' : 'BAD '} ${o.name}`);
      lines.push(`       ${o.detail}`);
    }
    if (!allOk) {
      lines.push('\n::error::self-test did not reproduce its expected verdicts — the INSTRUMENT is broken, not the tree.');
      lines.push('(self-test tree kept at ' + tmpDir + ' for inspection)');
      return { exit: 1, lines };
    }
    lines.push('\nSelf-test passed: good, ordering-broken, quarantined-creator, missing-symbol, alias, cast and guarded migrations all judged correctly, by name.');
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { exit: 0, lines };
  } catch (err) {
    return { exit: 2, lines: [`::error::self-test could not run: ${err.message}`, err.stack || ''] };
  }
}

/* ───────────────────────── cli ───────────────────────── */

function parseArgs(argv) {
  const options = { root: process.cwd(), changed: null, floor: DEFAULT_FLOOR, audit: false, selfTest: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') { options.root = argv[i + 1]; i += 1; }
    else if (arg === '--changed') { options.changed = argv[i + 1]; i += 1; }
    else if (arg === '--floor') { options.floor = argv[i + 1]; i += 1; }
    else if (arg === '--audit') { options.audit = true; }
    else if (arg === '--self-test') { options.selfTest = true; }
    else if (arg === '-h' || arg === '--help') { options.help = true; }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
    return 0;
  }
  if (options.selfTest) {
    const r = runSelfTest();
    for (const l of r.lines) console.log(l);
    return r.exit;
  }
  let changedList = [];
  if (options.changed !== null) {
    changedList = options.changed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }
  const audit = options.audit || options.changed === null;
  const result = runGate({ root: options.root, changedList, floor: options.floor, audit });
  for (const l of result.lines) console.log(l);
  if (result.errorLines) {
    for (const l of result.errorLines) console.error(l);
  }
  return result.exit;
}

process.exit(main());