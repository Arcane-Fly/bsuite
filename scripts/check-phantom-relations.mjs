#!/usr/bin/env node
/**
 * check-phantom-relations.mjs — application code that QUERIES A RELATION THAT
 * DOES NOT EXIST.
 *
 * WHY THIS EXISTS
 *
 * `check-phantom-migrations.mjs` asks: a migration was RECORDED — did its
 * objects appear? This asks the mirror question, and it is the one that had
 * never been asked: the code SELECTs from something — is it there at all?
 *
 * Measured on the live database 2026-08-31, scanning the six app `src` trees:
 * 1601 production `.from('<name>')` call sites naming 283 distinct relations.
 * TWENTY-TWO of those relations do not exist in any schema, across 82 call
 * sites. Every one returns HTTP 404 / PGRST205 through PostgREST — the exact
 * path the apps use. Among them:
 *
 *   site_settings            9 sites — braden's whole theme editor
 *   todos, conversations    17 sites — throughput
 *   training_plan_versions   9 sites — crm7's training-plan version history
 *   host_employers           1 site  — BSU's GTO tile, rendering a count
 *
 * This is why the braden site editor never worked. Nobody noticed, because a
 * `.from()` against a missing table does not crash the page: supabase-js
 * returns `{ data: null, error }`, and the overwhelmingly common idiom
 * `const rows = data ?? []` turns that into an empty list. An empty list looks
 * EXACTLY like a feature nobody has used yet. The tile renders `0` and the
 * grid renders "No records". A missing table and a quiet Tuesday are
 * indistinguishable on screen.
 *
 * A TYPE CHECKER CANNOT CATCH THIS. `Database` types are generated from the
 * live schema, so a phantom table is a type error — which is precisely why the
 * casts exist to silence it. crm7 had `.from('gto_compliance_status' as never)`;
 * braden had an entire second Supabase client, `legacyTables.ts`, typed against
 * a hand-written `LegacyDatabase` whose header admits "at runtime these calls
 * return 404/401". The type system was told to stop asking. Only the database
 * can answer this question, so this gate reads the database.
 *
 * WHAT IT CHECKS
 *
 * Every `.from('<literal>')` in the given roots, minus the exclusions below,
 * must name a relation that exists in `pg_class`.
 *
 * WHY pg_class AND NOT pg_tables — this is load-bearing. `pg_tables` shows
 * ordinary tables only. The estate serves 285 of its relations from the
 * `browse` schema as VIEWS, and public carries views and matviews too. An
 * earlier pass of this audit used `pg_tables` and reported five false
 * absences, every one a view. `pg_class` with
 * `relkind IN ('r','v','m','f','p')` sees tables, views, materialised views,
 * foreign tables and partitioned tables alike. (`check-phantom-migrations.mjs`
 * still builds its `tables` key from `pg_tables`; that is sound for the
 * CREATE TABLE claims it parses, but do not copy the pattern here.)
 *
 * FIVE THINGS THAT ARE NOT PHANTOMS, each of which this got wrong first:
 *
 *   1. `supabase.storage.from('avatars')` is a STORAGE BUCKET. Eight such call
 *      sites exist; all eight read as missing tables until the receiver is
 *      examined. `avatars` is a bucket and always was.
 *   2. `Buffer.from('...')`, `Array.from(...)` and friends are builtins that
 *      happen to share the method name.
 *   3. A `.from()` inside a comment. `crm7/src/pages/financial/budget/index.tsx`
 *      contains the prose "0 `.from('budgets')` call sites" — a comment
 *      DOCUMENTING the absence read as an instance of it.
 *   4. Test and fixture files. `conduit/src/test/smoke.test.ts` probes
 *      `candidates` and `jobs` deliberately to assert the client is wired.
 *   5. `pg_catalog` relations. Edge functions read `pg_policies` and
 *      `pg_extension`; they are real, just not in a user schema.
 *
 * AND ONE THING THAT IS NEITHER: a dynamic `.from(tableVariable)`. It cannot
 * be resolved statically, so it is reported as UNRESOLVED and counted
 * separately. It is never silently treated as fine — throughput's
 * `deleteAccount()` loops over `['ideas','business_plans','exports','profiles']`
 * and two of those four are phantoms.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { claimedObjects } from './check-phantom-migrations.mjs';

const args = process.argv.slice(2);

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIR = new Set([
  'node_modules', 'dist', 'build', '.next', 'coverage', '.git',
  '__tests__', '__mocks__', '__fixtures__', 'test', 'tests', 'e2e',
  'playwright', 'fixtures', '.turbo', 'out',
]);
const TEST_FILE = /\.(test|spec|stories)\.[jt]sx?$/;

/** Relations that live in pg_catalog / information_schema — real, not user objects. */
const SYSTEM_PREFIX = /^(pg_|information_schema)/;

/**
 * Extract every `.from(...)` call site from one file's source.
 *
 * Returns `{ name, line, kind }` where kind is:
 *   'db'        — a database relation reference to be checked
 *   'storage'   — `.storage.from(...)`, a bucket
 *   'builtin'   — `Buffer.from` and friends
 *   'comment'   — the call site sits inside a comment
 *   'unresolved'— `.from(someVariable)`, not a literal
 */
export function callSites(source) {
  const out = [];

  // Blank out comments across the WHOLE file first, preserving every character
  // offset and every newline, so a match index still maps to its real line.
  //
  // This must be done file-wide rather than line-by-line. A supabase call is
  // routinely written as
  //
  //     const { error } = await supabase.storage
  //       .from('media')
  //
  // and the receiver that makes it a BUCKET rather than a table sits on the
  // previous line. Scanning one line at a time cannot see it — braden has four
  // such call sites, and a line-local scan reports every one as a phantom.
  const chars = source.split('');
  const blank = (from, to) => {
    for (let k = from; k < to && k < chars.length; k++) {
      if (chars[k] !== '\n') chars[k] = ' ';
    }
  };
  for (let i = 0; i < source.length; i++) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      const nl = source.indexOf('\n', i);
      blank(i, nl === -1 ? source.length : nl);
      i = nl === -1 ? source.length : nl;
    } else if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      blank(i, end === -1 ? source.length : end + 2);
      i = end === -1 ? source.length : end + 1;
    } else if (two === "''" || source[i] === "'" || source[i] === '"') {
      // Skip over string literals so an apostrophe or a `//` inside one does
      // not start a phantom comment. Handles escapes; template literals are
      // left alone because `.from(\`x\`)` is a form we must still match.
      const q = source[i];
      let j = i + 1;
      while (j < source.length && source[j] !== q) {
        if (source[j] === '\\') j++;
        if (source[j] === '\n') break;
        j++;
      }
      i = j;
    }
  }
  const scan = chars.join('');

  // Precompute line starts so an offset resolves to a line number in O(log n).
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (idx) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };

  // The receiver may be several lines back, so look at a generous window and
  // collapse whitespace before testing it.
  const receiver = (idx) => scan.slice(Math.max(0, idx - 200), idx).replace(/\s+/g, ' ');

  // Literal `.from('name')`.
  for (const m of scan.matchAll(/\.from\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g)) {
    const before = receiver(m.index);
    let kind = 'db';
    if (/\.storage ?$/.test(before)) kind = 'storage';
    else if (/(?:^|[^\w.])(?:Buffer|Array|Object|Set|Map|BigInt|Number|String|Uint8Array|Int8Array|Float32Array|Float64Array|Blob|Date) ?$/.test(before)) kind = 'builtin';

    // `.schema('x').from('y')` targets schema x, not public.
    const sm = before.match(/\.schema\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\) ?$/);
    out.push({ name: m[1], line: lineOf(m.index), kind, schema: sm ? sm[1] : null });
  }

  // A file-local `const TABLE = 'people_training_day_overrides'` makes
  // `.from(TABLE)` every bit as checkable as a literal, and this idiom covers a
  // third of the dynamic call sites in the estate (crm7's training-day helpers,
  // conduit's saved views, all four R80.4 lib tables). Leaving them
  // "unresolved" would hand a reviewer 69 lines to eyeball by hand, and a list
  // that long is a list nobody reads.
  const consts = new Map();
  for (const m of scan.matchAll(/(?:^|\n)\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*;?/g)) {
    consts.set(m[1], m[2]);
  }

  // Dynamic `.from(identifier)` — resolved through a file-local const where one
  // exists, otherwise reported as genuinely unverifiable.
  for (const m of scan.matchAll(/\.from\(\s*([A-Za-z_$][A-Za-z0-9_$.]*)\s*[),]/g)) {
    const before = receiver(m.index);
    if (/\.storage ?$/.test(before)) continue;
    if (/(?:^|[^\w.])(?:Buffer|Array|Object|Set|Map|BigInt|Number|String|Uint8Array|Blob|Date) ?$/.test(before)) continue;
    const sm = before.match(/\.schema\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]\s*\) ?$/);
    const resolved = consts.get(m[1]);
    out.push({
      name: resolved ?? m[1],
      line: lineOf(m.index),
      kind: resolved ? 'db' : 'unresolved',
      schema: sm ? sm[1] : null,
      via: resolved ? m[1] : undefined,
    });
  }

  // `.rpc('fn')` — the same defect wearing different clothes, and it fails the
  // same silent way. Found live 2026-08-31: four call sites naming functions
  // that do not exist, including `vault_create_secret` on crm7's
  // government-integrations page — where the real function is
  // `vault_create_secret_wrapper`, so saving a credential quietly did nothing.
  for (const m of scan.matchAll(/\.rpc\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g)) {
    out.push({ name: m[1], line: lineOf(m.index), kind: 'rpc', schema: null });
  }

  // `/api/db/<relation>` — crm7's db-proxy path. A relation reached this way
  // never appears in a `.from()` call, so a scanner built only on `.from()` has
  // a hole exactly the width of the AI tool layer. Found live 2026-08-31, after
  // the crm7 lane pointed the hole out rather than letting it pass:
  // `charge_rates` and `training_records` are absent, with six call sites
  // between them under `src/lib/ai/tools/` — the functions Jodie calls when
  // asked about charge rates or training records. The near-misses for the first
  // are `host_charge_rates` and `charge_rate_schedules`, which is precisely the
  // drift this is meant to catch.
  //
  // The captured charset INCLUDES `-`. A proxy path segment is a URL segment,
  // not a SQL identifier, and crm7's allowlist carries `conduit-jobs`,
  // `conduit-applications`, `conduit-interviews` and `email-messages` — which
  // the handler forwards VERBATIM to `/rest/v1/<segment>`. Stopping the capture
  // at the hyphen reported them as `conduit` and `email`: 17 call sites
  // collapsed into two names that nobody wrote, which is worse than missing
  // them. All four 404, and all four have an exact real counterpart —
  // `r7_jobs`, `r7_applications`, `r7_interviews`, `email_messages`.
  for (const m of scan.matchAll(/['"`]\/api\/db\/([A-Za-z_][A-Za-z0-9_-]*)/g)) {
    out.push({ name: m[1], line: lineOf(m.index), kind: 'db', schema: null, via: 'db-proxy' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Self-tests. A gate that cannot fail is not a gate, and this one's whole value
// is telling a real absence from the five things that merely look like one.
// ---------------------------------------------------------------------------

/**
 * Every relation key a migration CLAIMS to create — tables AND functions.
 *
 * The function half was missing, and its absence DEADLOCKED the estate's own
 * promotion path (found 2026-09-03 on bsuite#2939). The applier
 * (.github/workflows/supabase-migrate.yml) runs on push to `main` and NOWHERE
 * ELSE. So a new database function lands on `development` together with the code
 * that calls it, and does not exist in the live database until the promotion
 * merges — but this gate BLOCKED that promotion. The function could not be
 * created until it existed. A deadlock, not a finding, and it was permanent for
 * every new remote procedure the estate would ever add.
 *
 * The excuse machinery was already here and already correct for tables: it
 * harvested `.tables` from the claim parser and silently dropped `.functions`,
 * which that same parser had already returned.
 */
export function claimKeys(sql) {
  const claims = claimedObjects(sql);
  return [...claims.tables, ...claims.functions];
}

// A migration creating a FUNCTION must be excused exactly as one creating a
// TABLE is. Both directions, so a regression cannot pass by excusing everything.
const CLAIM_TESTS = [
  {
    name: 'a CREATE OR REPLACE FUNCTION is claimed (the bsuite#2939 deadlock)',
    sql: 'create or replace function public.set_tenant_oncosts(p_tenant_id uuid) returns void as $$ begin end; $$ language plpgsql;',
    expect: (k) => k.includes('public.set_tenant_oncosts'),
  },
  {
    name: 'a CREATE TABLE is still claimed (the half that already worked)',
    sql: 'create table if not exists public.widgets (id uuid primary key);',
    expect: (k) => k.includes('public.widgets'),
  },
  {
    name: 'a function only MENTIONED in a comment is NOT claimed',
    sql: '-- create or replace function public.not_real()\nselect 1;',
    expect: (k) => !k.includes('public.not_real'),
  },
  {
    name: 'a migration claiming neither yields nothing',
    sql: 'grant select on public.widgets to authenticated;',
    expect: (k) => k.length === 0,
  },
];

const SELF_TESTS = [
  {
    name: 'a plain supabase .from() is a db relation',
    findsSomething: true,
    src: `const { data } = await supabase.from('site_settings').select('*');`,
    expect: (o) => o.some((c) => c.name === 'site_settings' && c.kind === 'db'),
  },
  {
    name: 'a .from() split across lines is still found',
    findsSomething: true,
    src: `await supabase\n  .from('training_plan_versions')\n  .select('*');`,
    expect: (o) => o.some((c) => c.name === 'training_plan_versions' && c.kind === 'db' && c.line === 2),
  },
  {
    name: 'supabase.storage.from() is a BUCKET, not a table',
    src: `const { data } = supabase.storage.from('avatars').getPublicUrl(f);`,
    expect: (o) => o.some((c) => c.name === 'avatars' && c.kind === 'storage'),
  },
  {
    name: 'storage detected across a line break too',
    src: `const { error } = await supabase.storage\n  .from('media')\n  .upload(p, f);`,
    expect: (o) => o.every((c) => c.name !== 'media' || c.kind === 'storage'),
  },
  {
    name: 'Buffer.from is a builtin, never a relation',
    src: `const b = Buffer.from('deadbeef', 'hex');`,
    expect: (o) => o.every((c) => c.kind !== 'db'),
  },
  {
    name: 'a LINE COMMENT mentioning .from() is not a call site',
    src: `// there are 0 \`.from('budgets')\` call sites left\nconst x = 1;`,
    expect: (o) => o.length === 0,
  },
  {
    name: 'a BLOCK COMMENT mentioning .from() is not a call site',
    src: `/**\n * Reads via .from('site_settings') historically.\n */\nconst x = 1;`,
    expect: (o) => o.length === 0,
  },
  {
    name: 'a multi-line block comment does not swallow the code after it',
    findsSomething: true,
    src: `/* header\n   .from('ghost') */\nawait supabase.from('people').select('*');`,
    expect: (o) => o.length === 1 && o[0].name === 'people' && o[0].kind === 'db',
  },
  {
    name: ".schema('catalog').from('qualifications') targets catalog, not public",
    findsSomething: true,
    src: `await client.schema('catalog').from('qualifications').select('*');`,
    expect: (o) => o.some((c) => c.name === 'qualifications' && c.schema === 'catalog'),
  },
  {
    name: 'a DYNAMIC .from(variable) is UNRESOLVED, never assumed fine',
    findsSomething: true,
    src: `for (const table of tables) { await supabase.from(table).delete(); }`,
    expect: (o) => o.some((c) => c.kind === 'unresolved' && c.name === 'table'),
  },
  {
    name: 'a file-local const IS resolved and then checked like a literal',
    findsSomething: true,
    src: `const TABLE = 'people_training_day_overrides';\nawait supabase.from(TABLE).select('*');`,
    expect: (o) => o.some((c) => c.kind === 'db' && c.name === 'people_training_day_overrides' && c.via === 'TABLE'),
  },
  {
    name: 'an EXPORTED const is resolved too',
    findsSomething: true,
    src: `export const WIC_TABLE = "wic_rate_lookup";\nawait supabase.from(WIC_TABLE).select("*");`,
    expect: (o) => o.some((c) => c.kind === 'db' && c.name === 'wic_rate_lookup'),
  },
  {
    name: 'a const resolving to a PHANTOM is caught, not excused',
    findsSomething: true,
    src: `const TABLE = 'ghost_table';\nawait supabase.from(TABLE).select('*');`,
    expect: (o) => o.some((c) => c.kind === 'db' && c.name === 'ghost_table'),
  },
  {
    name: 'a .rpc() call is captured as an rpc, not a relation',
    findsSomething: true,
    src: `const { data } = await supabase.rpc('vault_create_secret', { p: 1 });`,
    expect: (o) => o.length === 1 && o[0].kind === 'rpc' && o[0].name === 'vault_create_secret',
  },
  {
    name: 'a /api/db/<relation> proxy path is checked like a .from()',
    findsSomething: true,
    src: "const res = await apiCall('/api/db/charge_rates?limit=1');",
    expect: (o) => o.some((c) => c.kind === 'db' && c.name === 'charge_rates' && c.via === 'db-proxy'),
  },
  {
    name: 'a template-literal proxy path with a query string is captured',
    findsSomething: true,
    src: 'const r = await apiCall(`/api/db/training_records?${qs}`);',
    expect: (o) => o.some((c) => c.kind === 'db' && c.name === 'training_records'),
  },
  {
    name: 'a HYPHENATED proxy segment keeps its hyphen, not truncated at it',
    findsSomething: true,
    src: "const r = await apiCall('/api/db/conduit-jobs', { method: 'GET' });",
    expect: (o) => o.some((c) => c.name === 'conduit-jobs' && c.via === 'db-proxy'),
  },
  {
    name: 'a /api/db path inside a comment is not a call site',
    src: "// was apiCall('/api/db/ghost_table')\nconst x = 1;",
    expect: (o) => o.length === 0,
  },
  {
    name: 'a .rpc() inside a comment is not a call site',
    src: `// const { error } = await supabase.rpc('exec_sql', { sql });\nconst x = 1;`,
    expect: (o) => o.length === 0,
  },
  {
    name: 'a template literal with an interpolation is not read as a literal name',
    src: 'await supabase.from(`${prefix}_jobs`).select("*");',
    expect: (o) => o.every((c) => c.kind !== 'db'),
  },
  {
    name: 'two call sites on one line are both found',
    findsSomething: true,
    src: `a(supabase.from('todos')); b(supabase.from('notes'));`,
    expect: (o) => o.filter((c) => c.kind === 'db').length === 2,
  },
  {
    name: 'a trailing-comment .from() after real code still yields the real one',
    findsSomething: true,
    src: `await supabase.from('people').select('*'); // was .from('profiles')`,
    expect: (o) => o.filter((c) => c.kind === 'db').length === 1 && o[0].name === 'people',
  },
];

function selfTest() {
  let failed = 0;
  for (const t of CLAIM_TESTS) {
    let ok = false;
    try { ok = t.expect(claimKeys(t.sql)); } catch { ok = false; }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        got: ${JSON.stringify(claimKeys(t.sql))}`); }
  }
  for (const t of SELF_TESTS) {
    let ok = false;
    try { ok = t.expect(callSites(t.src)); } catch { ok = false; }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        got: ${JSON.stringify(callSites(t.src))}`); }
  }
  // The summary states a COUNT of what was exercised, not just a ratio.
  // scripts/check-guard-self-reporting.mjs classifies a guard that exits 0
  // without naming a non-zero denominator as a self-reporting regression — and
  // it was right to fail this one: "18/18 self-tests pass" says nothing about
  // what 18 covers, and a gate whose suite silently shrank to one trivial case
  // would still print a proud ratio.
  const mustFind = SELF_TESTS.filter((t) => t.findsSomething).length;
  console.log(
    `\ncheck-phantom-relations --self-test: ${SELF_TESTS.length + CLAIM_TESTS.length - failed}/${SELF_TESTS.length + CLAIM_TESTS.length} pass — ` +
      `${SELF_TESTS.length} call-site case(s) plus ${CLAIM_TESTS.length} migration-claim case(s), in BOTH directions ` +
      `(${mustFind} that must be FOUND, ${SELF_TESTS.length - mustFind} that must NOT be flagged: ` +
      `storage buckets, builtins, line and block comments, template literals)`,
  );
  process.exit(failed ? 1 : 0);
}

// CLI behaviour must not run on import — the same guard this file's sibling
// needed, and for the same reason: a test or another script importing
// `callSites` would otherwise execute the whole main, print a usage error and
// call process.exit. Found by trying to import it.
const INVOKED_DIRECTLY =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (INVOKED_DIRECTLY) {

if (args.includes('--self-test')) selfTest();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const stateArg = args.find((a) => a.startsWith('--db-state='));
const roots = args.filter((a) => !a.startsWith('--'));
const migrationDirs = args.filter((a) => a.startsWith('--migrations=')).map((a) => a.slice('--migrations='.length));

if (!stateArg || roots.length === 0) {
  console.error('usage: check-phantom-relations.mjs --db-state=<json> <src-dir...> [--migrations=<dir>]... [--require-examined=N] [--self-test]');
  console.error('  db-state json: { "relations": ["public.people", "catalog.qualifications", ...] }');
  process.exit(2);
}

const statePath = stateArg.split('=')[1];
if (!existsSync(statePath)) {
  console.error(`::error::db-state file not found: ${statePath}. Refusing to report a false 'no phantoms'.`);
  process.exit(2);
}

const state = JSON.parse(readFileSync(statePath, 'utf8'));
const relations = new Set(state.relations || []);
// Functions are optional: an older db-state without them disables the RPC half
// rather than failing every `.rpc()` call site as a phantom.
const functions = state.functions ? new Set(state.functions) : null;

// Positive control on the DATABASE side. A phantom scan against an empty or
// truncated catalog says either that everything is missing or that nothing is,
// and both read as a confident answer. Live figure 2026-08-31: 785 relations.
if (relations.size < 200) {
  console.error(`::error::db-state lists only ${relations.size} relations; expected >=200. The catalog read failed or was truncated — refusing to report.`);
  process.exit(3);
}

// An UNQUALIFIED `.from('x')` resolves against PostgREST's exposed schema, which
// is `public`. Matching a bare name against every schema would wave through
// `.from('users')` on the strength of `auth.users`, and `.from('people')` on the
// strength of `browse.people` — measured 2026-08-31, `browse` answers 406 to an
// `Accept-Profile: browse` request, so it is not reachable that way at all.
// Non-public relations are matched only through an explicit `.schema()` call.
const publicRelations = new Set(
  [...relations].filter((r) => r.startsWith('public.')).map((r) => r.slice('public.'.length)),
);

// ---------------------------------------------------------------------------
// Pending migrations — the difference between a PHANTOM and mere SCHEMA LAG.
//
// A relation that does not exist YET, but which an unapplied migration in this
// same tree creates, is not a phantom: it is work correctly done and waiting on
// the applier. Failing it would make this gate RED on the very pull request
// that fixes a phantom properly — and a permanently red gate is an unread gate.
// So a relation is excused when some migration file on the branch claims to
// create it, and reported separately as pending.
//
// The claim parser is imported from `check-phantom-migrations.mjs` rather than
// rewritten. It already handles CREATE TABLE IF NOT EXISTS, unqualified names
// defaulting to public, and — critically — stripping comments so that prose
// mentioning a CREATE TABLE is not read as one. Two parsers for one grammar
// would drift, and the drift would land on whichever gate was read less.
// ---------------------------------------------------------------------------
function pendingRelations(dirs) {
  const claimed = new Set();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    for (const e of entries) {
      if (!e.endsWith('.sql')) continue;
      let sql;
      try { sql = readFileSync(join(dir, e), 'utf8'); } catch { continue; }
      for (const key of claimKeys(sql)) claimed.add(key);
    }
  }
  return claimed;
}

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const e of entries) {
    if (SKIP_DIR.has(e)) continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (CODE_EXT.has(extname(e)) && !TEST_FILE.test(e)) acc.push(p);
  }
  return acc;
}

const pending = pendingRelations(migrationDirs);

const findings = [];
const pendingFindings = [];
const unresolved = [];
let examined = 0;
let files = 0;

for (const root of roots) {
  if (!existsSync(root)) {
    console.error(`::error::root not found: ${root}. A missing tree scans clean, which is the failure this refuses to make silently.`);
    process.exit(2);
  }
  for (const file of walk(root)) {
    files++;
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    // Cheap pre-filter. It MUST name every form callSites() can find: this read
    // `.from(` alone at first, so a file whose only database access is
    // `apiCall('/api/db/charge_rates')` or a bare `.rpc()` was never opened at
    // all. The db-proxy matcher was added, its self-tests passed, and the live
    // run still reported zero — because the two files carrying those six call
    // sites were skipped one line above the matcher that would have caught them.
    if (!src.includes('.from(') && !src.includes('.rpc(') && !src.includes('/api/db/')) continue;
    for (const c of callSites(src)) {
      if (c.kind === 'unresolved') { unresolved.push({ file, ...c }); continue; }
      if (c.kind === 'rpc') {
        if (!functions) continue;
        examined++;
        const qualifiedFn = `public.${c.name}`;
        if (!functions.has(qualifiedFn)) {
          // The second half of the same defect: even with `pending` populated
          // with functions, this branch never consulted it, while the table
          // branch below always has. A remote procedure that a migration ON THIS
          // BRANCH creates is schema lag, exactly as a table would be.
          if (pending.has(qualifiedFn)) {
            pendingFindings.push({ file, line: c.line, relation: `${c.name}()` });
          } else {
            findings.push({ file, line: c.line, relation: `${c.name}()`, rpc: true });
          }
        }
        continue;
      }
      if (c.kind !== 'db') continue;
      if (SYSTEM_PREFIX.test(c.name)) continue;
      examined++;
      const qualified = `${c.schema || 'public'}.${c.name}`;
      const present = c.schema ? relations.has(qualified) : publicRelations.has(c.name);
      if (!present) {
        if (pending.has(qualified)) pendingFindings.push({ file, line: c.line, relation: qualified });
        else findings.push({ file, line: c.line, relation: qualified });
      }
    }
  }
}

// Positive control on the TREE side. A fully populated db-state against an
// unpopulated submodule checkout would otherwise print "0 phantoms" and exit 0.
// Live figure 2026-08-31 across the six app src trees: 1601 examined.
const floorArg = args.find((a) => a.startsWith('--require-examined='));
if (floorArg) {
  const floor = Number(floorArg.split('=')[1]);
  if (!Number.isFinite(floor)) {
    console.error('::error::--require-examined needs a number');
    process.exit(2);
  }
  if (examined < floor) {
    console.error(`::error::examined only ${examined} relation reference(s) across ${files} file(s); floor is ${floor}. The tree is empty or unchecked out — refusing to report 'no phantoms'.`);
    process.exit(3);
  }
}

console.log(`examined ${examined} relation reference(s) in ${files} file(s) against ${relations.size} live relations`);
if (unresolved.length) {
  console.log(`\n${unresolved.length} dynamic .from(<variable>) call site(s) — NOT verifiable statically, review by hand:`);
  for (const u of unresolved) console.log(`  ${u.file}:${u.line}  .from(${u.name})`);
}

if (pendingFindings.length) {
  const rels = [...new Set(pendingFindings.map((f) => f.relation))].sort();
  console.log(`\n${pendingFindings.length} call site(s) reference ${rels.length} relation(s) that a migration ON THIS BRANCH creates but the`);
  console.log(`database does not have yet. Schema lag, not a phantom — not failed here:`);
  for (const r of rels) console.log(`  ${r}`);
}

if (findings.length) {
  const byRelation = new Map();
  for (const f of findings) {
    if (!byRelation.has(f.relation)) byRelation.set(f.relation, []);
    byRelation.get(f.relation).push(f);
  }
  console.error(`\n::error::${findings.length} call site(s) reference ${byRelation.size} relation(s)/function(s) that DO NOT EXIST in the database:`);
  for (const [rel, sites] of [...byRelation].sort()) {
    console.error(`\n  ${rel} — ${sites.length} call site(s)`);
    for (const s of sites) console.error(`    ${s.file}:${s.line}`);
  }
  console.error('\nA query against a missing relation does not crash: supabase-js returns { data: null, error },');
  console.error('and `data ?? []` renders it as an empty result. The surface lies rather than failing.');
  console.error('Fix by pointing the consumer at the real relation, removing dead code, or — if neither is');
  console.error('possible in this pass — making the surface say so with <DataUnavailable state="unavailable" />.');
  process.exit(1);
}

console.log(`\n0 phantom relations.`);
process.exit(0);

} // end INVOKED_DIRECTLY
