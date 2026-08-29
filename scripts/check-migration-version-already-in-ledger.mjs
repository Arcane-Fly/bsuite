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
 * The estate DOES catch it afterwards — check-phantom-migrations compares what
 * a recorded migration CLAIMS to create against what exists, and it is the only
 * reason this was not shipped as done. But that fires after an apply that
 * reported success. This one fires before the merge.
 *
 * ---------------------------------------------------------------------------
 * FEEDING IT
 * ---------------------------------------------------------------------------
 *   node scripts/check-migration-version-already-in-ledger.mjs --print-query \
 *     | psql "$DATABASE_URL" -tAX -f - > ledger.json
 *   node scripts/check-migration-version-already-in-ledger.mjs < ledger.json
 *
 * With no stdin it REFUSES (exit 2) rather than reporting a clean estate it
 * never looked at. A gate that cannot tell "checked nothing" from "found
 * nothing" is not a gate.
 *
 * Versions below the migration floor are ignored, because the applier ignores
 * them too — flagging what the applier will never run is noise, and noise is
 * how a gate becomes unread.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const FLOOR = (args.find((a) => a.startsWith('--floor=')) || '--floor=20260611000000').split('=')[1];

const QUERY = `select coalesce(json_agg(json_build_object('version', version, 'name', name)), '[]'::json)::text
from supabase_migrations.schema_migrations;`;

if (args.includes('--print-query')) {
  process.stdout.write(QUERY + '\n');
  process.exit(0);
}

/** Every migrations directory this estate applies from. */
function scopes() {
  const out = [];
  for (const dir of ['.', 'business-suite-unified', 'crm7', 'conduit', 'braden', 'throughput', 'R80.4', 'packages/schema-builder']) {
    const p = join(ROOT, dir, 'supabase', 'migrations');
    try { if (statSync(p).isDirectory()) out.push([dir, p]); } catch { /* absent scope */ }
  }
  return out;
}

/** version -> [{scope, name}] from the files on disk. */
function filesByVersion(list) {
  const m = new Map();
  for (const [scope, p] of list) {
    for (const f of readdirSync(p)) {
      const hit = /^(\d{14})_(.+)\.sql$/.exec(f);
      if (!hit) continue;
      const [, version, name] = hit;
      if (!m.has(version)) m.set(version, []);
      m.get(version).push({ scope, name });
    }
  }
  return m;
}

/**
 * A file and a ledger row agree when the names match. They also agree when the
 * ledger row is one of this estate's reconciliation markers, which deliberately
 * do not carry a migration's own name.
 */
const RECONCILE_MARKER = /^reconciled[-_]/i;

export function conflicts(fileMap, ledger, floor) {
  const byVersion = new Map(ledger.map((r) => [String(r.version), String(r.name ?? '')]));
  const out = [];
  for (const [version, files] of fileMap) {
    if (version < floor) continue;
    if (!byVersion.has(version)) continue;
    const recorded = byVersion.get(version);
    if (RECONCILE_MARKER.test(recorded)) continue;
    const names = new Set(files.map((f) => f.name));
    if (names.has(recorded)) continue;
    out.push({ version, recorded, files: files.map((f) => `${f.scope}/${f.name}`) });
  }
  return out.sort((a, b) => a.version.localeCompare(b.version));
}

/* ------------------------------- self-test ------------------------------- */
if (args.includes('--self-test')) {
  const cases = [
    {
      why: 'the real 2026-08-29 defect: the ledger holds a DELETED migration under this version',
      files: new Map([['20260829030000', [{ scope: 'braden', name: 'admin_users_exists_where_the_policies_live' }]]]),
      ledger: [{ version: '20260829030000', name: 'drop_adobe_sign_residue' }],
      want: 1,
    },
    {
      why: 'names agree — the normal case, and it must NOT fire',
      files: new Map([['20261006000000', [{ scope: 'braden', name: 'admin_users_exists_where_the_policies_live' }]]]),
      ledger: [{ version: '20261006000000', name: 'admin_users_exists_where_the_policies_live' }],
      want: 0,
    },
    {
      why: 'version not in the ledger yet — that is schema-lag, not this gate',
      files: new Map([['20261007000000', [{ scope: 'crm7', name: 'brand_new' }]]]),
      ledger: [],
      want: 0,
    },
    {
      why: 'BELOW the floor — the applier skips it, so flagging it is noise',
      files: new Map([['20260504010000', [{ scope: 'braden', name: 'fix_security_definer_search_path' }]]]),
      ledger: [{ version: '20260504010000', name: 'something_else_entirely' }],
      want: 0,
    },
    {
      why: 'a reconciliation marker in the ledger is not a name mismatch',
      files: new Map([['20260701000000', [{ scope: 'crm7', name: 'rename_physical_column_rpc' }]]]),
      ledger: [{ version: '20260701000000', name: 'reconciled-2026-05-19' }],
      want: 0,
    },
    {
      why: 'same-name mirror across two scopes still agrees with the ledger',
      files: new Map([['20260728120000', [
        { scope: 'business-suite-unified', name: 'enterprise_licence_events' },
        { scope: '.', name: 'enterprise_licence_events' },
      ]]]),
      ledger: [{ version: '20260728120000', name: 'enterprise_licence_events' }],
      want: 0,
    },
    {
      why: 'two DIFFERENT files on one version, neither matching the ledger, is still one finding',
      files: new Map([['20260901000000', [
        { scope: 'crm7', name: 'alpha' }, { scope: 'conduit', name: 'beta' },
      ]]]),
      ledger: [{ version: '20260901000000', name: 'gamma' }],
      want: 1,
    },
  ];
  let pass = 0;
  for (const c of cases) {
    const got = conflicts(c.files, c.ledger, '20260611000000').length;
    if (got === c.want) pass++;
    else console.error(`FAIL self-test: ${c.why} — wanted ${c.want}, got ${got}`);
  }
  const firing = cases.filter((c) => c.want > 0).length;
  console.log(`check-migration-version-already-in-ledger self-test: ${pass}/${cases.length} pass (${firing} assert the gate FIRES)`);
  process.exit(pass === cases.length ? 0 : 1);
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
  console.error('    | node scripts/check-migration-version-already-in-ledger.mjs');
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

const list = scopes();
if (list.length === 0) {
  console.error('REFUSING TO RUN: no migrations directory found — submodules are probably not checked out.');
  console.error('Every version would read as unclaimed and this gate would report a confident pass.');
  process.exit(2);
}

const fileMap = filesByVersion(list);
const found = conflicts(fileMap, ledger, FLOOR);

for (const c of found) {
  console.log(`  COLLISION  ${c.version}  ledger holds "${c.recorded}", files claim: ${c.files.join(', ')}`);
}
console.log(`\n  ${list.length} scope(s), ${fileMap.size} distinct version(s), ${ledger.length} ledger row(s), floor ${FLOOR}`);
console.log(`  ${found.length} version(s) already taken in the ledger under another name`);

if (found.length) {
  console.error('\nA version already in schema_migrations under a DIFFERENT name will be SKIPPED,');
  console.error('not applied — the applier keys on the version alone and reports success.');
  console.error('Renumber the file to a version free in every scope AND in the ledger.');
  process.exit(1);
}
console.log('  check-migration-version-already-in-ledger: OK');
