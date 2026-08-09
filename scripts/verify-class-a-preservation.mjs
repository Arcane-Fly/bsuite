#!/usr/bin/env node
/**
 * Class A preservation check — operator rulings D-28 / D-29 / D-31.
 *
 * D-31 asks for "a restore point before the batch applies, verified restorable,
 * not merely taken". A backup nobody has restored is a belief, not a control.
 *
 * This script is NOT that backup, and does not pretend to be. It is the other
 * half of the same concern, and the half that is actually reachable from CI:
 * a census of every Class A table taken BEFORE the batch, so that afterwards
 * the question "did we lose anything?" has an arithmetic answer instead of an
 * opinion. A backup tells you how to recover. This tells you whether you need
 * to — which is the question you have at 2am, and the one nobody could answer
 * for this estate an hour ago.
 *
 * Usage:
 *   node scripts/verify-class-a-preservation.mjs --capture > baseline.json
 *   node scripts/verify-class-a-preservation.mjs --check baseline.json
 *
 * Requires DATABASE_URL (or SUPABASE_DB_URL) with read access.
 *
 * Exit codes: 0 preserved · 1 a Class A table LOST rows · 2 harness error.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// D-28's Class A inventory, plus the D-30 agreement-shaped tables. A table
// absent from the database is reported as absent, never silently as zero —
// "the table is gone" and "the table is empty" are different emergencies.
const CLASS_A = [
  'people', 'apprentices', 'placements', 'contacts', 'clients',
  'employers', 'sites', 'host_agreements', 'host_contracts',
  'training_contracts', 'training_plans', 'training_plan_units',
  'documents', 'document_metadata', 'document_verification_events', 'document_access_log',
  'timesheets', 'acknowledgements', 'signature_requests', 'communications',
  // D-30: evidence of an agreed figure, not a recomputable calculation.
  'charge_rate_quotes', 'contracts', 'invoices', 'invoice_line_items', 'r7_offers',
  // Audit trails — Class A by D-28's "audit trails and access logs of every kind".
  'data_change_sets', 'data_change_set_items', 'organisation_audit_events', 'tenant_switch_audit',
  // Retired-but-not-empty; the batch renames this one.
  'collaborative_documents', 'collaborative_documents_legacy_unused',
  // Identity and tenancy.
  'profiles', 'tenants', 'user_tenants', 'org_members',
];

const DB = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!DB) {
  console.error('DATABASE_URL (or SUPABASE_DB_URL) is required.');
  process.exit(2);
}

function census() {
  const sql = `
    select json_agg(x order by x->>'t')
    from (
      select json_build_object(
        't', c.relname,
        'n', (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I', c.relname), false, true, '')))[1]::text::bigint
      ) as x
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and c.relname = any(string_to_array('${CLASS_A.join(',')}', ','))
    ) s;`;
  const out = execFileSync('psql', [DB, '-t', '-A', '-c', sql], { encoding: 'utf8' }).trim();
  const rows = out && out !== '' ? JSON.parse(out) : [];
  const present = Object.fromEntries(rows.map((r) => [r.t, Number(r.n)]));
  return {
    captured_at: new Date().toISOString(),
    // Recorded explicitly: a table missing from this map is ABSENT from the
    // database, which is a different fact from a count of zero.
    absent: CLASS_A.filter((t) => !(t in present)),
    counts: present,
  };
}

const mode = process.argv[2];
if (mode === '--capture') {
  console.log(JSON.stringify(census(), null, 2));
  process.exit(0);
}

if (mode === '--check') {
  const baselinePath = process.argv[3];
  if (!baselinePath) { console.error('--check needs a baseline file'); process.exit(2); }
  const before = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const after = census();

  const lost = [];
  const vanished = [];
  for (const [t, n] of Object.entries(before.counts)) {
    if (!(t in after.counts)) {
      // The batch renames collaborative_documents on purpose; a rename carries
      // its rows, so the successor must hold them.
      const successor = t === 'collaborative_documents' ? 'collaborative_documents_legacy_unused' : null;
      if (successor && after.counts[successor] >= n) continue;
      vanished.push(`${t} (held ${n} rows, table no longer exists)`);
      continue;
    }
    if (after.counts[t] < n) lost.push(`${t}: ${n} -> ${after.counts[t]} (${n - after.counts[t]} rows LOST)`);
  }

  if (vanished.length || lost.length) {
    console.error('CLASS A PRESERVATION FAILED — operator ruling D-29 is breached.\n');
    for (const v of vanished) console.error(`  TABLE GONE  ${v}`);
    for (const l of lost) console.error(`  ROWS LOST   ${l}`);
    console.error('\nDo not proceed. Restore before anything else.');
    process.exit(1);
  }

  const grew = Object.entries(after.counts).filter(([t, n]) => (before.counts[t] ?? 0) < n);
  console.log(`Class A preserved. ${Object.keys(after.counts).length} tables checked against ${baselinePath}.`);
  if (grew.length) console.log(`Grew (expected, additive): ${grew.map(([t, n]) => `${t} +${n - (before.counts[t] ?? 0)}`).join(', ')}`);
  process.exit(0);
}

console.error('usage: --capture | --check <baseline.json>');
process.exit(2);
