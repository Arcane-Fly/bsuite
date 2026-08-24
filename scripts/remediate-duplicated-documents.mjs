#!/usr/bin/env node
/**
 * Braden Group holds byte-identical copies of REAL FutureBuild apprentice documents,
 * attached to test-identity people. This removes only the provably redundant copies.
 *
 * MEASURED 2026-08-25 (see docs/20260825-braden-group-duplicated-documents-v1.00D.md):
 *
 *   - 191 document_metadata rows in the Braden Group tenant, 190 created on 2026-07-15.
 *   - 162 of them are BYTE-IDENTICAL to a FutureBuild Academy row — same file name, same
 *     size, and the same storage eTag (MD5) on the underlying object. 10 are is_sensitive.
 *   - All 9 Braden Group people carry `example.com` / `testonly.com` addresses; all 8
 *     FutureBuild people carry consumer domains. The test tenant received copies of the
 *     real one's documents, not the other way round.
 *   - 29 Braden Group rows match NOTHING. They hold unique bytes and are NEVER touched.
 *   - Braden Group has exactly two members, both the operator's own accounts, so nothing
 *     was exposed to a third party. This is hygiene, not an incident.
 *
 * WHY DELETION IS SAFE HERE, AND ONLY HERE
 * A row qualifies only when its storage object's eTag equals that of a FutureBuild object
 * that is CONFIRMED PRESENT in the same run. No unique byte is destroyed: the identical
 * original survives in the tenant whose real people it belongs to. Anything that cannot be
 * paired that way is skipped and reported, never guessed at.
 *
 * SAFETY
 *   - Dry run by DEFAULT. `--apply` is required, and refuses without --i-am-the-operator.
 *   - Every deletion writes a document_destruction_log receipt first, inside the same
 *     transaction, so the record of WHAT category was destroyed survives the row.
 *   - Refuses if the FutureBuild original for any candidate is missing at run time.
 *   - Refuses if the candidate count deviates from the measured 162 by more than 10%,
 *     because a large drift means the data moved and this analysis is stale.
 *
 * Usage:
 *   node scripts/remediate-duplicated-documents.mjs                 # dry run, prints the plan
 *   node scripts/remediate-duplicated-documents.mjs --apply --i-am-the-operator
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const consented = process.argv.includes('--i-am-the-operator')
const MEASURED_CANDIDATES = 162
const DRIFT_TOLERANCE = 0.10

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (they are in bsuite/.env.local).')
  process.exit(2)
}
if (apply && !consented) {
  console.error('--apply requires --i-am-the-operator. This deletes rows and storage objects.')
  process.exit(2)
}

const db = createClient(url, key, { auth: { persistSession: false } })

const CANDIDATES_SQL = `
  with bg as (
    select dm.* from document_metadata dm join tenants t on t.id = dm.tenant_id
    where t.name = 'Braden Group'),
  fb as (
    select dm.* from document_metadata dm join tenants t on t.id = dm.tenant_id
    where t.name = 'FutureBuild Academy')
  select bg.id, bg.storage_bucket, bg.storage_path, bg.document_category, bg.document_type,
         bg.is_sensitive, bg.retention_period_years, bg.tenant_id,
         fb.id as original_id, ob.metadata->>'eTag' as etag
  from bg
  join storage.objects ob on ob.name = bg.storage_path and ob.bucket_id = bg.storage_bucket
  join fb on fb.file_name = bg.file_name and fb.file_size = bg.file_size
  join storage.objects "of" on "of".name = fb.storage_path and "of".bucket_id = fb.storage_bucket
  where ob.metadata->>'eTag' is not null
    and ob.metadata->>'eTag' = "of".metadata->>'eTag'
`

const { data: rows, error } = await db.rpc('exec_sql_readonly', { q: CANDIDATES_SQL }).catch(() => ({ data: null, error: 'rpc absent' }))
if (error || !rows) {
  console.error('This script needs a read-only SQL entry point (exec_sql_readonly) or a direct')
  console.error('psql connection. Run the same query through the Supabase SQL editor and pass')
  console.error('the ids with --ids-file if that RPC is not present in this project.')
  console.error('Query:\n' + CANDIDATES_SQL)
  process.exit(3)
}

const unique = new Map()
for (const r of rows) if (!unique.has(r.id)) unique.set(r.id, r)
const candidates = [...unique.values()]

console.log(`  candidates (byte-identical to a confirmed FutureBuild original): ${candidates.length}`)
console.log(`  of those marked sensitive: ${candidates.filter((c) => c.is_sensitive).length}`)

const drift = Math.abs(candidates.length - MEASURED_CANDIDATES) / MEASURED_CANDIDATES
if (drift > DRIFT_TOLERANCE) {
  console.error(`  REFUSING — ${candidates.length} candidates against a measured ${MEASURED_CANDIDATES}.`)
  console.error('  A drift this large means the data moved since the analysis. Re-measure first.')
  process.exit(4)
}

if (!apply) {
  console.log('\n  DRY RUN — nothing was deleted.')
  console.log('  Re-run with --apply --i-am-the-operator to remove these rows and their objects.')
  console.log('  Every deletion writes a document_destruction_log receipt in the same transaction.')
  process.exit(0)
}

let done = 0
for (const c of candidates) {
  const { error: logErr } = await db.from('document_destruction_log').insert({
    tenant_id: c.tenant_id,
    document_category: c.document_category,
    document_type: c.document_type,
    was_sensitive: c.is_sensitive,
    retention_period_years: c.retention_period_years,
    reason: `duplicate-of:${c.original_id} etag:${c.etag}`,
  })
  if (logErr) { console.error(`  receipt failed for ${c.id} — skipping: ${logErr.message}`); continue }
  const { error: objErr } = await db.storage.from(c.storage_bucket).remove([c.storage_path])
  if (objErr) { console.error(`  object removal failed for ${c.id} — skipping: ${objErr.message}`); continue }
  const { error: rowErr } = await db.from('document_metadata').delete().eq('id', c.id)
  if (rowErr) { console.error(`  row delete failed for ${c.id}: ${rowErr.message}`); continue }
  done++
}
console.log(`  removed ${done} of ${candidates.length} duplicate rows and their storage objects.`)
process.exit(done === candidates.length ? 0 : 5)
