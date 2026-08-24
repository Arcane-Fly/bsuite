#!/usr/bin/env node
/**
 * A document byte-sequence that exists under more than one tenant.
 *
 * On 2026-07-15 a bulk import copied a real tenant's document set onto fabricated
 * identities in another tenant. Nothing caught it, and nothing would catch it
 * happening again: row-level security was never breached — every row's tenant_id
 * agreed with its person's — so no authorisation gate had anything to say. The
 * defect is that the rows were CREATED, and the only signal is that the bytes are
 * the same on both sides.
 *
 * The measurement is the storage object's eTag, which is its MD5. Equal eTag means
 * equal bytes. Filenames do not work: `Passport.pdf` is generic, and matching on
 * name and size alone over-counts by 28 in the known case (190 vs the true 162).
 *
 * MEASURED 2026-08-25: 158 distinct eTags appear under more than one tenant,
 * involving 323 of 425 document rows, 24 of them marked sensitive.
 *
 * This is a RATCHET, not a hard gate. The existing 158 are a known, contained
 * condition — the receiving tenant has two members and both are the operator's own
 * accounts (docs/20260825-braden-group-duplicated-documents-v1.00D.md). Failing all
 * of them on day one produces a permanently red gate, which is how a rule gets
 * disarmed. A NEW one turns it red, and the number may only fall.
 *
 * Input is TSV on stdin: one line per shared eTag, `etag<TAB>tenant_count<TAB>row_count`.
 * Deliberately no file names and no ids — this gate proves a SHAPE, and does not need
 * to carry a second copy of anything identifying to do it.
 *
 * Usage:
 *   psql "$DB_URL" -At -F $'\t' -f scripts/sql/cross-tenant-duplicate-objects.sql \
 *     | node scripts/audit-cross-tenant-duplicate-objects.mjs
 *   node scripts/audit-cross-tenant-duplicate-objects.mjs --self-test
 */
import fs from 'node:fs'

const BASELINE_FILE = 'scripts/cross-tenant-duplicate-objects-baseline.json'

/** Parse the TSV. Returns { etags, rows, tenantsMax } or throws on a malformed line. */
export function parse(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let rows = 0
  let tenantsMax = 0
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length !== 3) throw new Error(`malformed line (want 3 tab-separated fields): ${line.slice(0, 60)}`)
    const [, tenantsRaw, rowsRaw] = parts
    const tenants = Number(tenantsRaw)
    const n = Number(rowsRaw)
    if (!Number.isInteger(tenants) || tenants < 2) throw new Error(`tenant_count must be an integer >= 2, got ${tenantsRaw}`)
    if (!Number.isInteger(n) || n < 2) throw new Error(`row_count must be an integer >= 2, got ${rowsRaw}`)
    rows += n
    if (tenants > tenantsMax) tenantsMax = tenants
  }
  return { etags: lines.length, rows, tenantsMax }
}

/** A gate that cannot tell "measured nothing" from "found nothing" is not a gate. */
export function verdict({ etags, rows }, baseline, sawTotalMarker) {
  if (!sawTotalMarker) return { ok: false, code: 2, why: 'no TOTAL marker — the query did not run to completion, so an empty result proves nothing' }
  if (etags > baseline) return { ok: false, code: 1, why: `RATCHET BROKEN: baseline ${baseline}, now ${etags}` }
  if (etags < baseline) return { ok: false, code: 1, why: `improved ${baseline} -> ${etags}; bank it with --bank` }
  return { ok: true, code: 0, why: `ratchet held at ${baseline} (${rows} rows involved)` }
}

if (process.argv.includes('--self-test')) {
  const cases = []
  const t = (name, fn) => { try { fn(); cases.push([name, true]) } catch (e) { cases.push([name, false, e.message]) } }
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`) }

  t('empty input parses to zero', () => eq(parse(''), { etags: 0, rows: 0, tenantsMax: 0 }, 'empty'))
  t('one shared etag', () => eq(parse('abc\t2\t2'), { etags: 1, rows: 2, tenantsMax: 2 }, 'one'))
  t('rows are summed, not counted', () => eq(parse('a\t2\t2\nb\t3\t7').rows, 9, 'sum'))
  t('tenantsMax tracks the worst', () => eq(parse('a\t2\t2\nb\t4\t9').tenantsMax, 4, 'max'))
  t('blank lines ignored', () => eq(parse('a\t2\t2\n\n\nb\t2\t3').etags, 2, 'blanks'))
  t('trailing newline ignored', () => eq(parse('a\t2\t2\n').etags, 1, 'trailing'))
  t('a 2-field line is REFUSED, not silently skipped', () => {
    let threw = false
    try { parse('abc\t2') } catch { threw = true }
    if (!threw) throw new Error('accepted a malformed line')
  })
  t('tenant_count of 1 is REFUSED — the query is wrong, not the data clean', () => {
    let threw = false
    try { parse('abc\t1\t2') } catch { threw = true }
    if (!threw) throw new Error('accepted tenant_count=1')
  })
  t('non-numeric row_count is REFUSED', () => {
    let threw = false
    try { parse('abc\t2\tmany') } catch { threw = true }
    if (!threw) throw new Error('accepted a non-numeric count')
  })
  t('no TOTAL marker is exit 2, NOT a pass', () => eq(verdict({ etags: 0, rows: 0 }, 158, false).code, 2, 'marker'))
  t('zero WITH the marker is a genuine improvement, not a pass', () => eq(verdict({ etags: 0, rows: 0 }, 158, true).code, 1, 'zero'))
  t('holding at baseline passes', () => eq(verdict({ etags: 158, rows: 323 }, 158, true).code, 0, 'hold'))
  t('one more than baseline fails', () => eq(verdict({ etags: 159, rows: 325 }, 158, true).code, 1, 'rise'))
  t('a fall is reported, not silently accepted', () => {
    const v = verdict({ etags: 100, rows: 200 }, 158, true)
    if (v.ok || !/bank it/.test(v.why)) throw new Error('a fall must ask to be banked')
  })

  const failed = cases.filter((c) => !c[1])
  console.log(`cross-tenant-duplicate-objects self-test: ${cases.length - failed.length}/${cases.length} pass`)
  for (const f of failed) console.error(`  FAILED ${f[0]}: ${f[2]}`)
  process.exit(failed.length ? 1 : 0)
}

const raw = fs.readFileSync(0, 'utf8')
/* The SQL emits a final `TOTAL<TAB>n<TAB>n` line. Its absence means the query was cut
 * off, and an empty result from a query that did not finish is not a clean estate. */
const lines = raw.split('\n')
const sawTotalMarker = lines.some((l) => l.startsWith('TOTAL\t'))
const body = lines.filter((l) => !l.startsWith('TOTAL\t')).join('\n')

let parsed
try {
  parsed = parse(body)
} catch (e) {
  console.error(`cross-tenant-duplicate-objects: REFUSING — ${e.message}`)
  process.exit(2)
}

let baseline = 158
if (fs.existsSync(BASELINE_FILE)) baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).etags

if (process.argv.includes('--bank')) {
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify({ etags: parsed.etags, rows: parsed.rows, banked: 'see git log' }, null, 2)}\n`)
  console.log(`banked at ${parsed.etags} shared eTags (${parsed.rows} rows)`)
  process.exit(0)
}

const v = verdict(parsed, baseline, sawTotalMarker)
console.log(`cross-tenant-duplicate-objects: ${parsed.etags} eTag(s) under more than one tenant, ${parsed.rows} row(s) involved`)
if (parsed.tenantsMax > 2) console.log(`  worst case: one byte-sequence under ${parsed.tenantsMax} different tenants`)
console.log(`  ${v.why}`)
if (!v.ok && !/bank it/.test(v.why)) {
  console.error('\n  A document byte-sequence under two tenants means one tenant received a copy of')
  console.error("  another's files. RLS will not catch it: the rows are correctly tenant-scoped.")
  console.error('  See docs/20260825-braden-group-duplicated-documents-v1.00D.md.')
}
process.exit(v.code)
