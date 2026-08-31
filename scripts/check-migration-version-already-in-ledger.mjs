#!/usr/bin/env node
/**
 * check-migration-version-already-in-ledger.mjs
 *
 * Fails when a migration FILE claims a version that the shared ledger
 * (supabase_migrations.schema_migrations) already holds under a DIFFERENT name.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS — measured 2026-08-29, braden#545/#548
 * ---------------------------------------------------------------------------
 * A migration was authored as 20260829030000_admin_users_exists_where_the_policies_live.sql.
 * Every existing gate passed it:
 *
 *   check-migration-version-collisions      OK (257 files, 8 of 8 scopes)
 *   check-migration-versions-in-flight      OK - no version is claimed twice
 *   check-migration-collisions-at-branch-tips  OK
 *   check-migration-floor                   OK
 *
 * It then did nothing. The applier reported:
 *
 *   Done: 0 applied, 5 already recorded.
 *
 * because schema_migrations is keyed on the VERSION ALONE, and 20260829030000
 * was already recorded under `drop_adobe_sign_residue` — a migration that had
 * since been DELETED FROM THE REPO. The row outlived the file.
 *
 * THE GAP, STATED PLAINLY: every collision gate in this estate compares FILES
 * TO FILES. A version taken by a file that no longer exists is invisible to all
 * of them, and grepping the repo for the version returns nothing and proves
 * nothing.
 *
 * ---------------------------------------------------------------------------
 * THE TWO SUPPRESSIONS — FIXED 2026-08-31
 * ---------------------------------------------------------------------------
 * As first shipped this gate answered a name mismatch with two blanket skips,
 * evaluated in this order:
 *
 *   1.  if (version < floor) continue;              // the FLOOR
 *   2.  if (/^reconciled[-_]/.test(recorded)) continue;   // the RECONCILE MARKER
 *
 * Both were asserted, never measured. Between them they hid TWELVE name
 * mismatches on the live ledger, in two disjoint sets of six:
 *
 *   the floor alone   6 versions whose ledger row is an ordinary migration name
 *   both together     6 versions whose ledger row is `reconciled-2026-05-19`
 *   the marker alone  0 — every one of the 72 marker rows sits below the floor,
 *                     so lifting the floor by itself reveals none of them
 *
 * That last line is the part worth keeping. Lifting the floor and stopping
 * looks like a fix and leaves the marker set entirely intact — including
 * `20260506000000`, which is the version the whole investigation started from.
 *
 * WHY THE MARKER EXEMPTION EXISTED. `reconciled-2026-05-19` is one bulk stamp
 * written by the crm7#758 history-reconciliation lane (see
 * `crm7/supabase/migrations/CLAUDE.md`, "#758 reconciliation lane CLOSED").
 * Those rows deliberately do not carry a migration's own name: their content
 * was superseded by the 20260807 baseline dump and is marked NEVER replay,
 * NEVER repair. A gate that called all 72 a name mismatch would be red on
 * legitimate, operator-approved history repair — and a permanently red gate is
 * an unread gate. The exemption was not stupid. It was just the wrong
 * instrument.
 *
 * THE MARKER IS NOT THE FACT. THE CATALOG IS. A reconcile marker says a repair
 * was INTENDED. Whether the repair HAPPENED is a question only the live catalog
 * can answer, and the two answers look identical in the ledger:
 *
 *   marker present, objects PRESENT  -> the history really was repaired. Benign.
 *   marker present, objects ABSENT   -> the marker BURNED the version. The file
 *                                       can never run (the applier keys on the
 *                                       version alone) and nothing else will
 *                                       ever create what it claims.
 *
 * Measured 2026-08-31 against tuybltdrdefjblnplpqo — 787 ledger rows, 72 of
 * them `reconciled-2026-05-19`, 227 distinct file versions across 8 scopes:
 *
 *   12 name mismatches
 *   10 RESOLVED — every claimed object present. Legitimate repair.
 *    2 with ABSENT objects:
 *        20260506000000  public.schema_mutations_audit, public.rename_physical_column
 *                        (marker-suppressed; two apps ship a UI control that calls it)
 *        20260228000000  public.update_subscriptions_updated_at
 *                        (floor-suppressed; see the banked entry below)
 *
 * Removing either suppression on its own would have produced six findings, five
 * of them noise. Conditioning both on the catalog produces two, both real. That
 * ratio is the whole argument for the instrument.
 *
 * ---------------------------------------------------------------------------
 * FEEDING IT
 * ---------------------------------------------------------------------------
 *   node scripts/check-migration-version-already-in-ledger.mjs --print-state-query \
 *     | psql "$DATABASE_URL" -tAX -f - > db-state.json
 *   node scripts/check-migration-version-already-in-ledger.mjs --print-query \
 *     | psql "$DATABASE_URL" -tAX -f - \
 *     | node scripts/check-migration-version-already-in-ledger.mjs --db-state=db-state.json
 *
 * FLAGS
 *   --db-state=<path>        the catalog. Without it, any name mismatch comes
 *                            back `unverified` and the gate REFUSES.
 *   --require-scopes=N       refuse a partial checkout. CI passes 8.
 *   --known-burned=v1,v2     bank a measured, explained burned version. A
 *                            RATCHET: a banked version that is no longer burned
 *                            FAILS, so the list can only shrink.
 *   --show-resolved          list the mismatches the catalog cleared, not just
 *                            their count.
 *   --print-query            emit the ledger SQL.
 *   --print-state-query      emit the catalog SQL.
 *
 * EXIT CODES
 *   0  no collision
 *   1  a collision, or a stale --known-burned entry
 *   2  refused: no/malformed ledger, no scopes, or a mismatch it cannot resolve
 *   3  refused: a positive control failed (empty catalog, partial checkout)
 *
 * With no stdin it REFUSES (exit 2) rather than reporting a clean estate it
 * never looked at. With a name mismatch it cannot resolve — no --db-state, or a
 * state file that does not describe a populated database — it REFUSES too, and
 * says so: that is not a verdict. A gate that cannot tell "checked nothing"
 * from "found nothing" is not a gate, and silently exempting the case it cannot
 * check is how the marker hid 20260506000000 for four months.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
// ONE parser for the CREATE-TABLE grammar, shared with the phantom gates rather
// than copied. A second copy would drift, and the drift would land on whichever
// gate is read less. `check-phantom-relations.mjs` imports the same way.
import { claimedObjects, droppedObjects } from './check-phantom-migrations.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
// The floor is NO LONGER a suppression here — see the header. Its one remaining
// job is `pendingFix()`: a below-floor unapplied file can never run, so it can
// never be the fix for anything. Read from MIGRATION_FLOOR first so raising the
// floor in supabase-migrate.yml propagates, exactly as check-phantom-migrations
// reads it. An explicit --floor= still wins, for the self-tests and for probing.
const FLOOR =
  (args.find((a) => a.startsWith('--floor=')) || '').split('=')[1] ||
  process.env.MIGRATION_FLOOR ||
  '20260611000000';

const QUERY = `select coalesce(json_agg(json_build_object('version', version, 'name', name)), '[]'::json)::text
from supabase_migrations.schema_migrations;`;

/**
 * The catalog, in the SAME shape `check-phantom-migrations.mjs` consumes, so the
 * two gates can be fed from one query and can never disagree about what exists.
 * EVERY schema, not just public: a public-only column list makes every
 * `catalog.*` column look missing, which cost the phantom gate five of its
 * original twenty-two false positives.
 */
const STATE_QUERY = `SELECT json_build_object(
  'applied',   (SELECT COALESCE(json_agg(version), '[]'::json)
                  FROM supabase_migrations.schema_migrations),
  'tables',    (SELECT COALESCE(json_agg(schemaname||'.'||tablename), '[]'::json)
                  FROM pg_tables
                 WHERE schemaname NOT IN ('pg_catalog','information_schema')),
  'functions', (SELECT COALESCE(json_agg(DISTINCT n.nspname||'.'||p.proname), '[]'::json)
                  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname NOT IN ('pg_catalog','information_schema')),
  'columns',   (SELECT COALESCE(json_agg(table_schema||'.'||table_name||'.'||column_name), '[]'::json)
                  FROM information_schema.columns
                 WHERE table_schema NOT IN ('pg_catalog','information_schema'))
)::text;`;

if (args.includes('--print-query')) {
  process.stdout.write(QUERY + '\n');
  process.exit(0);
}
if (args.includes('--print-state-query')) {
  process.stdout.write(STATE_QUERY + '\n');
  process.exit(0);
}

/** Every migrations directory this estate applies from. All 8 scopes feed ONE ledger. */
export function scopeDirs(root = ROOT) {
  const out = [];
  for (const dir of ['.', 'business-suite-unified', 'crm7', 'conduit', 'braden', 'throughput', 'R80.4', 'packages/schema-builder']) {
    const p = join(root, dir, 'supabase', 'migrations');
    try { if (statSync(p).isDirectory()) out.push([dir, p]); } catch { /* absent scope */ }
  }
  return out;
}

/** version -> [{scope, name, path}] from the files on disk. */
export function filesByVersion(list) {
  const m = new Map();
  for (const [scope, p] of list) {
    for (const f of readdirSync(p)) {
      const hit = /^(\d{14})_(.+)\.sql$/.exec(f);
      if (!hit) continue;
      const [, version, name] = hit;
      if (!m.has(version)) m.set(version, []);
      m.get(version).push({ scope, name, path: join(p, f) });
    }
  }
  return m;
}

/**
 * A reconciliation marker, kept ONLY to label a finding. It is no longer an
 * exemption — that is the whole point of the 2026-08-31 fix — but a reader
 * seeing `reconciled-2026-05-19` in the output deserves to be told what it is.
 */
export const RECONCILE_MARKER = /^reconciled[-_]/i;

/**
 * What a version's files CLAIM that the catalog does not have.
 *
 * Exported and self-tested rather than inlined in the CLI, because a live
 * control cannot reach every branch of it: on the estate as it stands today the
 * only version with a missing TABLE also has a missing FUNCTION, so deleting the
 * table branch entirely changes no live verdict. A mutation test caught exactly
 * that — the table branch survived every live control and had to be killed here.
 *
 *   files  [{ path }]        the migration files claiming this version
 *   have   { tables, functions, columns } of lowercased Sets — the live catalog
 *   gone   Set of objects dropped by this migration or any later one
 *   fix    Set of `kind name` strings an unapplied forward migration will create
 *   read   path -> sql, injected so a fixture can be tested without a filesystem
 */
export function missingObjects({ files, have, gone, fix, read }) {
  const missing = new Set();
  for (const f of files) {
    const o = claimedObjects(read(f.path));
    for (const t of o.tables) if (!have.tables.has(t) && !gone.has(t)) missing.add(`table ${t}`);
    for (const fn of o.functions) if (!have.functions.has(fn) && !gone.has(fn)) missing.add(`function ${fn}`);
    for (const c of o.columns) if (!have.columns.has(c) && !gone.has(c)) missing.add(`column ${c}`);
    for (const t of (o.indexedTables || [])) if (!have.tables.has(t) && !gone.has(t)) missing.add(`table ${t}`);
  }
  const all = [...missing].sort();
  return { missing: all, willBeMade: all.filter((m) => fix.has(m)) };
}

/**
 * Every version a file claims that the ledger already holds under another name,
 * each carrying a verdict.
 *
 *   'collision'  the objects are ABSENT and nothing in the tree will create
 *                them. The file can never run — the applier keys on the version
 *                alone — so those objects are permanently missing. FAILS.
 *   'known'      the same, but the version was banked via --known-burned with a
 *                recorded reason. Reported, does not fail. The bank can only
 *                shrink: a banked version that is no longer burned FAILS, so a
 *                stale entry cannot sit there absorbing a future defect.
 *   'pending'    the objects are absent, but an unapplied forward migration in
 *                the tree creates them. Reported, does not fail — failing here
 *                would block the very apply that clears the finding. The estate
 *                has deadlocked on paired rules before.
 *   'resolved'   every claimed object exists. The history repair really
 *                happened. Reported as a count, does not fail.
 *   'unverified' no catalog was supplied, so none of the above can be decided.
 *                REFUSES — it is not a verdict.
 *
 * `probe(version, files)` returns { missing: string[], willBeMade: string[] } or
 * null when it cannot answer. Injected rather than closed over so this function
 * stays pure and both directions are reachable from --self-test.
 */
export function conflicts(fileMap, ledger, probe = null, knownBurned = new Set()) {
  const byVersion = new Map(ledger.map((r) => [String(r.version), String(r.name ?? '')]));
  const out = [];
  for (const [version, files] of fileMap) {
    if (!byVersion.has(version)) continue;
    const recorded = byVersion.get(version);
    const names = new Set(files.map((f) => f.name));
    if (names.has(recorded)) continue;

    const base = {
      version,
      recorded,
      marker: RECONCILE_MARKER.test(recorded),
      files: files.map((f) => `${f.scope}/${f.name}`),
    };

    const answer = probe ? probe(version, files) : null;
    if (!answer) { out.push({ ...base, verdict: 'unverified', missing: [] }); continue; }

    const unfixed = answer.missing.filter((m) => !answer.willBeMade.includes(m));
    if (!answer.missing.length) { out.push({ ...base, verdict: 'resolved', missing: [] }); continue; }
    if (!unfixed.length) { out.push({ ...base, verdict: 'pending', missing: answer.missing }); continue; }
    out.push({
      ...base,
      verdict: knownBurned.has(version) ? 'known' : 'collision',
      missing: unfixed,
    });
  }
  return out.sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * A banked version that is NO LONGER burned. The bank is a ratchet: it exists so
 * one measured, explained case does not hold the estate red, and it must only
 * ever shrink. A stale entry is a live suppression waiting to absorb the next
 * defect — exactly what the reconcile marker was — so it is a failure, not a
 * shrug.
 */
export function staleBankEntries(found, knownBurned) {
  const stillBurned = new Set(found.filter((f) => f.verdict === 'known').map((f) => f.version));
  return [...knownBurned].filter((v) => !stillBurned.has(v)).sort();
}

/* ------------------------------- self-test ------------------------------- */
if (args.includes('--self-test')) {
  const F = (version, entries) => new Map([[version, entries]]);
  // A probe over a fixture catalog: `present` lists what exists, `pendingList`
  // what an unapplied forward migration would create, `claims` what each
  // version's file claims. Mirrors the real probe's contract exactly.
  const fixtureProbe = (claims, present, pendingList = []) => (version) => {
    if (!claims[version]) return null;
    const missing = claims[version].filter((o) => !present.includes(o));
    return { missing, willBeMade: missing.filter((o) => pendingList.includes(o)) };
  };
  const NO_PROBE = null;
  const ALWAYS_RESOLVED = () => ({ missing: [], willBeMade: [] });

  const cases = [
    {
      why: 'the real 2026-08-29 defect: the ledger holds a DELETED migration under this version, and the object is absent',
      files: F('20260829030000', [{ scope: 'braden', name: 'admin_users_exists_where_the_policies_live' }]),
      ledger: [{ version: '20260829030000', name: 'drop_adobe_sign_residue' }],
      probe: fixtureProbe({ '20260829030000': ['public.admin_users'] }, []),
      want: { collision: 1 },
    },
    {
      why: 'names agree — the normal case, and it must NOT fire',
      files: F('20261006000000', [{ scope: 'braden', name: 'admin_users_exists_where_the_policies_live' }]),
      ledger: [{ version: '20261006000000', name: 'admin_users_exists_where_the_policies_live' }],
      probe: ALWAYS_RESOLVED,
      want: {},
    },
    {
      why: 'version not in the ledger yet — that is schema-lag, not this gate',
      files: F('20261007000000', [{ scope: 'crm7', name: 'brand_new' }]),
      ledger: [],
      probe: ALWAYS_RESOLVED,
      want: {},
    },
    {
      why: 'THE MARKER BUG: a reconcile marker whose objects are ABSENT is a burned version, not an exemption',
      files: F('20260506000000', [{ scope: 'business-suite-unified', name: 'rename_physical_column_rpc' }]),
      ledger: [{ version: '20260506000000', name: 'reconciled-2026-05-19' }],
      probe: fixtureProbe({ '20260506000000': ['public.rename_physical_column'] }, []),
      want: { collision: 1 },
    },
    {
      why: 'NEGATIVE: a reconcile marker whose objects are ALL PRESENT is a legitimate repair and must NOT fire',
      files: F('20260701000000', [{ scope: 'crm7', name: 'rename_physical_column_rpc' }]),
      ledger: [{ version: '20260701000000', name: 'reconciled-2026-05-19' }],
      probe: fixtureProbe({ '20260701000000': ['public.rename_physical_column'] }, ['public.rename_physical_column']),
      want: { resolved: 1 },
    },
    {
      why: 'THE FLOOR BUG: a BELOW-FLOOR mismatch with absent objects is judged by the catalog, not skipped by the version',
      files: F('20260228000000', [{ scope: 'business-suite-unified', name: 'add_billing_tables' }]),
      ledger: [{ version: '20260228000000', name: 'ensure_apprentice_gto_fields' }],
      probe: fixtureProbe({ '20260228000000': ['public.update_subscriptions_updated_at'] }, []),
      want: { collision: 1 },
    },
    {
      why: 'NEGATIVE: a BELOW-FLOOR mismatch whose objects all exist is the legitimate repair and must NOT fire',
      files: F('20260306000001', [{ scope: 'business-suite-unified', name: 'create_platform_admin_tables' }]),
      ledger: [{ version: '20260306000001', name: 'ots_parity_schema' }],
      probe: fixtureProbe({ '20260306000001': ['public.platform_admins'] }, ['public.platform_admins']),
      want: { resolved: 1 },
    },
    {
      why: 'NO CATALOG and a real mismatch: REFUSE. Exempting what it cannot check is the defect being fixed',
      files: F('20260506000000', [{ scope: 'business-suite-unified', name: 'rename_physical_column_rpc' }]),
      ledger: [{ version: '20260506000000', name: 'reconciled-2026-05-19' }],
      probe: NO_PROBE,
      want: { unverified: 1 },
    },
    {
      why: 'a pending forward migration creates the missing object — reported, never failed, or it blocks its own fix',
      files: F('20260506000000', [{ scope: 'packages/schema-builder', name: 'rename_physical_column_rpc' }]),
      ledger: [{ version: '20260506000000', name: 'reconciled-2026-05-19' }],
      probe: fixtureProbe({ '20260506000000': ['public.rename_physical_column'] }, [], ['public.rename_physical_column']),
      want: { pending: 1 },
    },
    {
      why: 'PARTIAL fix: one of two absent objects is pending, the other is not — that is still a collision',
      files: F('20260506000000', [{ scope: 'business-suite-unified', name: 'rename_physical_column_rpc' }]),
      ledger: [{ version: '20260506000000', name: 'reconciled-2026-05-19' }],
      probe: fixtureProbe(
        { '20260506000000': ['public.rename_physical_column', 'public.schema_mutations_audit'] },
        [],
        ['public.rename_physical_column'],
      ),
      want: { collision: 1 },
    },
    {
      why: 'a BANKED burned version is reported as known, not failed',
      files: F('20260228000000', [{ scope: 'business-suite-unified', name: 'add_billing_tables' }]),
      ledger: [{ version: '20260228000000', name: 'ensure_apprentice_gto_fields' }],
      probe: fixtureProbe({ '20260228000000': ['public.update_subscriptions_updated_at'] }, []),
      known: new Set(['20260228000000']),
      want: { known: 1 },
    },
    {
      why: 'NEGATIVE: banking one version does NOT bank a different one',
      files: F('20260506000000', [{ scope: 'business-suite-unified', name: 'rename_physical_column_rpc' }]),
      ledger: [{ version: '20260506000000', name: 'reconciled-2026-05-19' }],
      probe: fixtureProbe({ '20260506000000': ['public.rename_physical_column'] }, []),
      known: new Set(['20260228000000']),
      want: { collision: 1 },
    },
    {
      why: 'same-name mirror across two scopes still agrees with the ledger',
      files: F('20260728120000', [
        { scope: 'business-suite-unified', name: 'enterprise_licence_events' },
        { scope: '.', name: 'enterprise_licence_events' },
      ]),
      ledger: [{ version: '20260728120000', name: 'enterprise_licence_events' }],
      probe: ALWAYS_RESOLVED,
      want: {},
    },
    {
      why: 'two DIFFERENT files on one version, neither matching the ledger, is still one finding',
      files: F('20260901000000', [
        { scope: 'crm7', name: 'alpha' }, { scope: 'conduit', name: 'beta' },
      ]),
      ledger: [{ version: '20260901000000', name: 'gamma' }],
      probe: fixtureProbe({ '20260901000000': ['public.gone'] }, []),
      want: { collision: 1 },
    },
    {
      why: 'a NULL ledger name is not a reconcile marker and is not a free pass',
      files: F('20260610002141', [{ scope: 'crm7', name: 'reconcile_empty_statement_schema_drift_831' }]),
      ledger: [{ version: '20260610002141', name: null }],
      probe: fixtureProbe({ '20260610002141': ['public.something'] }, []),
      want: { collision: 1 },
    },
  ];

  let pass = 0;
  for (const c of cases) {
    const got = conflicts(c.files, c.ledger, c.probe, c.known || new Set());
    const tally = {};
    for (const f of got) tally[f.verdict] = (tally[f.verdict] || 0) + 1;
    const ok = JSON.stringify(tally) === JSON.stringify(c.want);
    if (ok) pass++;
    else console.error(`FAIL self-test: ${c.why}\n      wanted ${JSON.stringify(c.want)}, got ${JSON.stringify(tally)}`);
  }

  // The PROBE, one case per object kind in BOTH directions. A live control can
  // only reach the kinds the estate happens to be missing right now, and a
  // mutation test proved the table branch could be deleted outright without any
  // live control noticing. These reach every branch on a fixture instead.
  const SET = (...xs) => new Set(xs);
  const probeCases = [
    {
      why: 'an absent TABLE is missing',
      sql: 'CREATE TABLE public.schema_mutations_audit (id uuid);',
      have: { tables: SET(), functions: SET(), columns: SET() },
      want: ['table public.schema_mutations_audit'],
    },
    {
      why: 'NEGATIVE: a PRESENT table is not missing',
      sql: 'CREATE TABLE public.schema_mutations_audit (id uuid);',
      have: { tables: SET('public.schema_mutations_audit'), functions: SET(), columns: SET() },
      want: [],
    },
    {
      why: 'an absent FUNCTION is missing',
      sql: 'CREATE OR REPLACE FUNCTION public.rename_physical_column() RETURNS void AS $$ BEGIN END $$;',
      have: { tables: SET(), functions: SET(), columns: SET() },
      want: ['function public.rename_physical_column'],
    },
    {
      why: 'NEGATIVE: a PRESENT function is not missing',
      sql: 'CREATE OR REPLACE FUNCTION public.rename_physical_column() RETURNS void AS $$ BEGIN END $$;',
      have: { tables: SET(), functions: SET('public.rename_physical_column'), columns: SET() },
      want: [],
    },
    {
      why: 'an absent COLUMN is missing',
      sql: 'ALTER TABLE public.gto_complaints ADD COLUMN IF NOT EXISTS external_referral boolean;',
      have: { tables: SET(), functions: SET(), columns: SET() },
      want: ['column public.gto_complaints.external_referral'],
    },
    {
      why: 'NEGATIVE: a PRESENT column is not missing',
      sql: 'ALTER TABLE public.gto_complaints ADD COLUMN IF NOT EXISTS external_referral boolean;',
      have: { tables: SET(), functions: SET(), columns: SET('public.gto_complaints.external_referral') },
      want: [],
    },
    {
      why: 'an INDEX on an absent table names that table',
      sql: 'CREATE INDEX idx_x ON public.host_employers (col);',
      have: { tables: SET(), functions: SET(), columns: SET() },
      want: ['table public.host_employers'],
    },
    {
      why: 'NEGATIVE: an object DROPPED by this or a later migration is not missing',
      sql: 'CREATE TABLE public.scratch (id uuid);',
      have: { tables: SET(), functions: SET(), columns: SET() },
      gone: SET('public.scratch'),
      want: [],
    },
    {
      why: 'a claim spread over TWO scopes is pooled into one set, not double-counted',
      sql: 'CREATE TABLE public.schema_mutations_audit (id uuid);',
      files: 2,
      have: { tables: SET(), functions: SET(), columns: SET() },
      want: ['table public.schema_mutations_audit'],
    },
  ];
  for (const c of probeCases) {
    const got = missingObjects({
      files: Array.from({ length: c.files || 1 }, (_, i) => ({ path: `fixture-${i}.sql` })),
      have: c.have,
      gone: c.gone || new Set(),
      fix: new Set(),
      read: () => c.sql,
    });
    const ok = JSON.stringify(got.missing) === JSON.stringify(c.want);
    if (ok) pass++;
    else console.error(`FAIL self-test: ${c.why} — wanted ${JSON.stringify(c.want)}, got ${JSON.stringify(got.missing)}`);
  }

  // The bank ratchet, in both directions.
  const bankCases = [
    {
      why: 'a banked version that is STILL burned is not stale',
      found: [{ version: '20260228000000', verdict: 'known' }],
      known: new Set(['20260228000000']),
      want: 0,
    },
    {
      why: 'THE RATCHET: a banked version that is no longer burned is STALE and must be removed',
      found: [{ version: '20260228000000', verdict: 'resolved' }],
      known: new Set(['20260228000000']),
      want: 1,
    },
    {
      why: 'a banked version that vanished from the tree entirely is stale too',
      found: [],
      known: new Set(['20260228000000']),
      want: 1,
    },
  ];
  for (const c of bankCases) {
    const got = staleBankEntries(c.found, c.known).length;
    if (got === c.want) pass++;
    else console.error(`FAIL self-test: ${c.why} — wanted ${c.want}, got ${got}`);
  }

  const total = cases.length + probeCases.length + bankCases.length;
  const firing =
    cases.filter((c) => Object.keys(c.want).length > 0).length +
    probeCases.filter((c) => c.want.length > 0).length + 2;
  console.log(`check-migration-version-already-in-ledger self-test: ${pass}/${total} pass (${firing} assert the gate FIRES)`);
  process.exit(pass === total ? 0 : 1);
}

/* --------------------------------- main ---------------------------------- */
let raw = '';
try { raw = readFileSync(0, 'utf8').trim(); } catch { /* no stdin */ }

if (!raw) {
  console.error('REFUSING TO RUN: no ledger on stdin.');
  console.error('A scan with no ledger finds no conflicts and reads exactly like a clean estate.');
  console.error('Feed it:');
  console.error('  node scripts/check-migration-version-already-in-ledger.mjs --print-query \\');
  console.error('    | psql "$DATABASE_URL" -tAX -f - \\');
  console.error('    | node scripts/check-migration-version-already-in-ledger.mjs --db-state=db-state.json');
  process.exit(2);
}

let ledger;
try {
  ledger = JSON.parse(raw);
  if (!Array.isArray(ledger)) throw new Error('expected a JSON array');
} catch (e) {
  console.error(`REFUSING TO RUN: stdin is not the expected JSON array — ${e.message}`);
  process.exit(2);
}

const list = scopeDirs();
if (list.length === 0) {
  console.error('REFUSING TO RUN: no migrations directory found — submodules are probably not checked out.');
  console.error('Every version would read as unclaimed and this gate would report a confident pass.');
  process.exit(2);
}

const fileMap = filesByVersion(list);
const applied = new Set(ledger.map((r) => String(r.version)));

// POSITIVE CONTROL ON THE TREE SIDE. `list.length === 0` catches a wholly
// unpopulated checkout, but a PARTIAL one — say two of eight submodules — reads
// as a confident pass: every version the missing trees claim is simply not
// looked at, and the summary line still prints a plausible-looking count. The
// phantom gate carries --require-examined for exactly this hole. 8 scopes:
// root + 6 apps + packages/schema-builder, the same set supabase-migrate.yml
// applies from.
const scopesArg = args.find((a) => a.startsWith('--require-scopes='));
if (scopesArg) {
  const need = Number(scopesArg.split('=')[1]);
  if (!Number.isFinite(need)) {
    console.error(`REFUSING TO RUN: --require-scopes needs a number, got "${scopesArg.split('=')[1]}"`);
    process.exit(2);
  }
  if (list.length < need) {
    console.error(`REFUSING TO RUN: found ${list.length} migration scope(s), expected at least ${need}.`);
    console.error(`  present: ${list.map(([d]) => d).join(', ')}`);
    console.error('  A partial checkout never looks at the missing trees, so their versions read as');
    console.error('  unclaimed and this gate reports a confident pass over work it never saw.');
    process.exit(3);
  }
}

/**
 * The catalog. Optional in the argv sense only: without it every name mismatch
 * comes back `unverified` and the gate refuses. It is optional so that a run
 * with NO mismatches at all — the overwhelmingly common case, and the one CI
 * hits on every ordinary merge — is still a complete verdict without a second
 * database round trip.
 */
const stateArg = args.find((a) => a.startsWith('--db-state='));
let have = null;
if (stateArg) {
  const p = stateArg.split('=')[1];
  if (!existsSync(p)) {
    console.error(`REFUSING TO RUN: --db-state file not found: ${p}`);
    process.exit(2);
  }
  const state = JSON.parse(readFileSync(p, 'utf8'));
  have = {
    tables: new Set((state.tables || []).map((s) => s.toLowerCase())),
    functions: new Set((state.functions || []).map((s) => s.toLowerCase())),
    columns: new Set((state.columns || []).map((s) => s.toLowerCase())),
  };
  // Positive control, the same one the phantom gate carries and for the same
  // reason: an empty catalog makes every claimed object look absent, which turns
  // every legitimate reconcile into a confident false collision. A state file
  // that describes nothing is not evidence of absence.
  if (have.tables.size < 50) {
    console.error(`REFUSING TO RUN: --db-state describes ${have.tables.size} table(s). That is not a populated database.`);
    console.error('Every claimed object would read as absent and every reconcile as a collision.');
    process.exit(3);
  }
}

/**
 * Objects DROPPED at or after a version, pooled across every scope and into
 * subdirectories. Same asymmetry the phantom gate settled on: all 8 trees apply
 * to ONE database, so a drop anywhere is a real event, and an ARCHIVED
 * migration's drop still happened even though its creates are retired.
 */
let dropIndex = null;
function sqlFilesRecursive(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...sqlFilesRecursive(join(dir, e.name)));
    else if (e.name.endsWith('.sql')) out.push(join(dir, e.name));
  }
  return out;
}
function droppedAtOrAfter(from) {
  if (!dropIndex) {
    dropIndex = [];
    for (const [, p] of list) {
      for (const f of sqlFilesRecursive(p)) {
        const v = (f.split('/').pop().match(/^(\d{14})/) || [])[1];
        if (!v) continue;
        dropIndex.push({ v, d: droppedObjects(readFileSync(f, 'utf8')) });
      }
    }
  }
  const out = new Set();
  for (const { v, d } of dropIndex) {
    if (v < from) continue;
    for (const k of ['tables', 'functions', 'columns']) d[k].forEach((x) => out.add(x));
  }
  return out;
}

/**
 * Objects an UNAPPLIED migration AT OR ABOVE the floor claims to create — work
 * that is in the tree and will run on the next apply. This is the ONE job the
 * floor still has here, and it is the right one: a below-floor unapplied file
 * can never run, so it can never fix anything.
 *
 * Without this the gate deadlocks the PR that fixes a burned version. The only
 * possible remedy is a forward migration above the ledger high-water mark (a
 * replay is impossible — the version is recorded), and that migration is by
 * definition unapplied while CI runs on its own PR.
 */
let pendingCreates = null;
function pendingFix() {
  if (!pendingCreates) {
    pendingCreates = new Set();
    for (const [, p] of list) {
      for (const f of readdirSync(p).filter((n) => n.endsWith('.sql')).sort()) {
        const v = (f.match(/^(\d{14})/) || [])[1];
        if (!v || v < FLOOR || applied.has(v)) continue;
        const o = claimedObjects(readFileSync(join(p, f), 'utf8'));
        o.tables.forEach((x) => pendingCreates.add(`table ${x}`));
        o.functions.forEach((x) => pendingCreates.add(`function ${x}`));
        o.columns.forEach((x) => pendingCreates.add(`column ${x}`));
      }
    }
  }
  return pendingCreates;
}

const probe = have
  ? (version, files) =>
      missingObjects({
        files,
        have,
        gone: droppedAtOrAfter(version),
        fix: pendingFix(),
        read: (path) => readFileSync(path, 'utf8'),
      })
  : null;

const knownArg = args.find((a) => a.startsWith('--known-burned='));
const knownBurned = new Set(
  (knownArg ? knownArg.split('=')[1] : '').split(',').map((s) => s.trim()).filter(Boolean),
);

const found = conflicts(fileMap, ledger, probe, knownBurned);
const by = (v) => found.filter((f) => f.verdict === v);
const label = (c) => (c.marker ? ' [bulk reconcile marker]' : '');

for (const c of by('collision')) {
  console.log(`  COLLISION  ${c.version}  ledger holds "${c.recorded}"${label(c)}, files claim: ${c.files.join(', ')}`);
  for (const m of c.missing) console.log(`             ABSENT: ${m} — nothing in the tree will ever create it`);
}
for (const c of by('unverified')) {
  console.log(`  UNVERIFIED ${c.version}  ledger holds "${c.recorded}"${label(c)}, files claim: ${c.files.join(', ')}`);
}
for (const c of by('known')) {
  console.log(`  KNOWN BURNED  ${c.version}  ledger holds "${c.recorded}"${label(c)}, files claim: ${c.files.join(', ')}`);
  for (const m of c.missing) console.log(`             ABSENT: ${m} — banked via --known-burned`);
}
for (const c of by('pending')) {
  console.log(`  PENDING FIX  ${c.version}  ledger holds "${c.recorded}"${label(c)}, files claim: ${c.files.join(', ')}`);
  for (const m of c.missing) console.log(`             ABSENT: ${m} — an unapplied forward migration creates it`);
}
if (args.includes('--show-resolved')) {
  for (const c of by('resolved')) {
    console.log(`  RESOLVED   ${c.version}  ledger holds "${c.recorded}"${label(c)} — every object it claims EXISTS`);
  }
}

const stale = staleBankEntries(found, knownBurned);
for (const v of stale) {
  console.log(`  STALE BANK  ${v}  is in --known-burned but is NOT burned any more — remove it`);
}

console.log(`\n  ${list.length} scope(s), ${fileMap.size} distinct version(s), ${ledger.length} ledger row(s)`);
console.log(`  catalog: ${have ? `${have.tables.size} table(s), ${have.functions.size} function(s), ${have.columns.size} column(s)` : 'NOT SUPPLIED'}`);
console.log(`  ${found.length} version(s) taken in the ledger under another name — ` +
  `${by('collision').length} collision, ${by('known').length} known-burned, ${by('pending').length} pending-fix, ` +
  `${by('resolved').length} resolved by the catalog, ${by('unverified').length} unverifiable`);
if (by('resolved').length && !args.includes('--show-resolved')) {
  console.log('  (pass --show-resolved to list the resolved ones — their history repair really happened)');
}

if (by('unverified').length) {
  console.error('\nREFUSING TO REPORT: the run found name mismatches it cannot resolve, because no');
  console.error('--db-state was supplied. A reconcile marker says a repair was INTENDED; only the');
  console.error('catalog says whether it HAPPENED, and the two look identical in the ledger. That');
  console.error('is not a verdict — feed it a catalog:');
  console.error('  node scripts/check-migration-version-already-in-ledger.mjs --print-state-query \\');
  console.error('    | psql "$DATABASE_URL" -tAX -f - > db-state.json');
  process.exit(2);
}

if (stale.length) {
  console.error('\nThe --known-burned bank is a RATCHET and must only ever shrink. The version(s)');
  console.error('above are banked but no longer burned — a stale entry is a live suppression');
  console.error('waiting to absorb the next defect, which is exactly what the reconcile marker was.');
  console.error('Remove them from --known-burned in .github/workflows/supabase-migrate.yml.');
  process.exit(1);
}

if (by('collision').length) {
  console.error('\nA version already in schema_migrations under a DIFFERENT name will be SKIPPED,');
  console.error('not applied — the applier keys on the version alone and reports success. The');
  console.error('object(s) named above therefore do not exist and nothing will ever create them.');
  console.error('Ship a FORWARD migration above the ledger high-water mark. A replay is impossible:');
  console.error('the version is recorded, so the applier will skip the file no matter what it holds.');
  process.exit(1);
}
console.log('  check-migration-version-already-in-ledger: OK');
