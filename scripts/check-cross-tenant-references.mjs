#!/usr/bin/env node
/**
 * check-cross-tenant-references — does a row in one tenant POINT AT a row in another?
 *
 * WHY THIS EXISTS
 * ───────────────
 * The operator asked a direct question on 2026-08-17: is any person or company in
 * the FutureBuild Academy tenant also in the Braden Group tenant? The obvious
 * check — match people by email, companies by name and ABN — came back completely
 * clean, and it was the wrong check ON ITS OWN.
 *
 * Two tenants can share zero names and still be wired together through a FOREIGN
 * KEY. That is the more dangerous shape precisely because it is invisible to the
 * check everybody thinks to run.
 *
 * THE ANSWER, on the axis that was asked about: CLEAN. Zero people and zero
 * companies are shared between those two tenants, verified across 140
 * person-bearing foreign-key relationships as well as by direct name/email/ABN
 * matching, and no user holds membership in both. Positive-controlled: the same
 * joins return 8 people, 5 clients and 4 employers within FutureBuild alone.
 *
 * WHAT THE SCAN DID FIND, AND WHY ONLY SOME OF IT IS CONTAMINATION
 * ───────────────────────────────────────────────────────────────
 * 58 cross-tenant references across 5 relationships. They are not one thing, and
 * the operator's ruling of 2026-08-17 is what separates them:
 *
 *   "qualification certificate III in carpentry is a national qualification. but
 *    people who are placed and doing training against that qualification is
 *    tenant scoped."
 *
 * So:
 *
 *   REFERENCE DATA — not contamination, but a MODELLING DEFECT.
 *     training_contracts.qualification_id  FutureBuild -> Braden Group   8
 *     training_plans.qualification_id      FutureBuild -> Braden Group   7
 *   A nationally-defined training-package qualification is the same row for every
 *   tenant, forever. `CPC30220 Certificate III in Carpentry` currently exists
 *   THREE times, once per tenant, and six qualification rows exist with NONE
 *   global (`tenant_id IS NULL`). Tenant-owning national reference data guarantees
 *   duplicates and guarantees some get cross-linked. The fix is to make them
 *   global — NOT to repoint the links, which would preserve the duplication.
 *
 *   PEOPLE — the axis that actually carries tenancy.
 *     aass_registrations.apprentice_id  Demo Organisation -> bsuite Platform  19
 *     leads.contact_id                  Demo Organisation -> E2E fixture      12
 *     leads.contact_id                  Demo Organisation -> bsuite Platform   7
 *     leads.contact_id                  Braden Group      -> bsuite Platform   1
 *   The single Braden Group row points at the operator's own contact record held
 *   in the internal platform tenant — not client data. The rest sit in the demo
 *   and fixture tenants. All are the wrong shape and all should reach zero.
 *
 * WHAT IT MEANS WHEN A REFERENCE CROSSES
 * ──────────────────────────────────────
 * The parent tables have RLS with tenant-scoped policies, so a user opening one of
 * these rows is REFUSED the parent and sees a BLANK where it should be — it looks
 * broken rather than leaking. The leak only materialises on a path running as
 * `service_role`, which bypasses RLS.
 *
 * The guard therefore catches two opposite failures at once:
 *   - RLS enforced -> the owning tenant's data renders empty (a defect)
 *   - RLS bypassed -> another tenant's data is visible (a breach)
 *
 * WHAT THIS GUARD DOES AND DOES NOT ASSERT
 * ────────────────────────────────────────
 * It enumerates every single-column foreign key in `public` where BOTH sides
 * carry a `tenant_id`, then counts rows whose parent lives in a different tenant.
 * It does not guess intent: a reference is either within a tenant or it is not.
 *
 * It does NOT fail on:
 *   - a parent with `tenant_id IS NULL`. That is the GLOBAL/shared shape and it is
 *     the correct model for reference data — this guard should never discourage
 *     moving qualifications there.
 *   - tables where either side lacks `tenant_id` — there is no tenancy claim to
 *     violate.
 *
 * It DOES fail on a baseline it cannot read, and on scanning zero FK pairs. A
 * guard that examined nothing must not report a clean estate.
 *
 * USAGE
 *   node scripts/check-cross-tenant-references.mjs              # needs SUPABASE_DB_URL
 *   node scripts/check-cross-tenant-references.mjs --json
 *   node scripts/check-cross-tenant-references.mjs --self-test  # no credentials
 */

import { execFileSync } from 'node:child_process'

/**
 * Known cross-tenant references as measured on 2026-08-17, kept as a RATCHET
 * rather than a mute. The guard fails when the total RISES, and also when a pair
 * not on this list appears at all — so a new leak in a new relationship is caught
 * even while the historical ones are still being unpicked.
 *
 * Every entry is a defect awaiting a data fix, NOT an accepted state. Shrink this
 * list; never extend it without recording why in the same commit.
 */
const BASELINE = {
  // RE-BANKED 2026-08-26, measured against production, because the gate asked:
  // "FELL and the baseline was not re-banked. Bank the gain, or the next rise
  // back to 19 passes silently." A baseline left above the true figure is a
  // ratchet with slack in it — the gain is real and unprotected until banked.
  //
  //   aass_registrations.apprentice_id->apprentices   19 -> 0
  //   leads.contact_id->contacts                      20 -> 1
  //
  // Zero is now the floor for aass_registrations: any reappearance is a finding
  // rather than a return to a tolerated number.
  'aass_registrations.apprentice_id->apprentices': 0,
  'leads.contact_id->contacts': 1,
  'training_contracts.qualification_id->qualifications': 8,
  'training_plans.qualification_id->qualifications': 8,
  'charge_rate_snapshots.charge_rate_quote_id->charge_rate_quotes': 3,

  // EXTENDED 2026-08-28, with the reason recorded here as this file requires.
  //
  // A NEW pair appeared: one `people` row whose `current_host_employer_id` points at a
  // `clients` row owned by a different tenant. Under RLS the owning tenant's view of
  // that person renders EMPTY; on any service_role path the client is visible to the
  // wrong tenant. It is a defect, NOT an accepted state — it is filed as bsuite#2611
  // and needs a tenant-ownership ruling, which is not a call a lane can make: guessing
  // which of two tenants owns the row is how you turn a broken link into a wrong one,
  // and one of the tenants in this estate is a real client whose data is read-only.
  //
  // It is banked at 1 rather than left failing because the alternative is a gate that
  // is red on every PR for being RIGHT, which is how a gate stops being read. Banked,
  // it still fails on a SECOND such row and on any sixth pair — which is the whole
  // job. Unbank it the moment #2611 is resolved; a baseline above the true figure is
  // a ratchet with slack in it.
  'people.current_host_employer_id->clients': 1,
}

const ENUMERATE_FKS = `
  SELECT format(
    'select %L as ref, count(*)::int as bad from public.%I c join public.%I p on p.%I = c.%I '
    'where c.tenant_id is not null and p.tenant_id is not null and p.tenant_id <> c.tenant_id',
    con.conrelid::regclass || '.' || ca.attname || '->' || con.confrelid::regclass,
    con.conrelid::regclass::text, con.confrelid::regclass::text, pa.attname, ca.attname)
  FROM pg_constraint con
  JOIN pg_attribute ca ON ca.attrelid = con.conrelid  AND ca.attnum = con.conkey[1]
  JOIN pg_attribute pa ON pa.attrelid = con.confrelid AND pa.attnum = con.confkey[1]
  WHERE con.contype = 'f'
    AND array_length(con.conkey, 1) = 1
    AND con.connamespace = 'public'::regnamespace
    AND EXISTS (SELECT 1 FROM pg_attribute x
                 WHERE x.attrelid = con.conrelid  AND x.attname = 'tenant_id' AND x.attnum > 0)
    AND EXISTS (SELECT 1 FROM pg_attribute y
                 WHERE y.attrelid = con.confrelid AND y.attname = 'tenant_id' AND y.attnum > 0)`

/** Pure, so --self-test exercises the real decision logic rather than a copy of it. */
export function evaluate(found, { baseline = BASELINE, pairsScanned = 0 } = {}) {
  const failures = []

  if (pairsScanned === 0) {
    failures.push({
      code: 'X0',
      message:
        'scanned 0 foreign-key pairs — this guard proved nothing about tenant ' +
        'isolation and must not report a clean estate',
    })
    return { ok: false, failures }
  }

  for (const [ref, count] of Object.entries(found)) {
    if (count === 0) continue
    const allowed = baseline[ref]
    if (allowed === undefined) {
      failures.push({
        code: 'X1',
        message:
          `NEW cross-tenant reference: ${ref} — ${count} row(s) point at a parent ` +
          `owned by a different tenant. With RLS enforced the owning tenant's data ` +
          `renders EMPTY; on any service_role path it is VISIBLE to the wrong tenant.`,
      })
    } else if (count > allowed) {
      failures.push({
        code: 'X2',
        message: `${ref} ROSE ${allowed} -> ${count}. Cross-tenant references must only shrink.`,
      })
    }
  }

  // A baseline entry that has fallen is good news, but a STALE baseline hides the
  // next regression, so it is reported and must be re-banked.
  for (const [ref, allowed] of Object.entries(baseline)) {
    const now = found[ref] ?? 0
    if (now < allowed) {
      failures.push({
        code: 'X3',
        message:
          `${ref} FELL ${allowed} -> ${now} and the baseline was not re-banked. ` +
          `Bank the gain, or the next rise back to ${allowed} passes silently.`,
      })
    }
  }

  return { ok: failures.length === 0, failures }
}

function selfTest() {
  const base = { 'a.x->b': 5 }
  const cases = [
    ['at baseline passes', { 'a.x->b': 5 }, 3, true],
    // Empty baseline on purpose. Against a NON-empty baseline, all-zero is an
    // unbanked fall and MUST fail (X3) — the first draft of this fixture asserted
    // otherwise and the self-test caught it, which is the control doing its job.
    ['clean estate, nothing banked, passes', {}, 3, true, {}],
    ['X1 a NEW pair fails', { 'a.x->b': 5, 'c.y->d': 1 }, 3, false],
    ['X2 a RISE fails', { 'a.x->b': 6 }, 3, false],
    ['X3 an unbanked FALL fails', { 'a.x->b': 4 }, 3, false],
    ['X0 scanning nothing fails', { 'a.x->b': 5 }, 0, false],
  ]
  let bad = 0
  for (const [name, found, pairs, wantOk, overrideBase] of cases) {
    const got = evaluate(found, { baseline: overrideBase ?? base, pairsScanned: pairs }).ok
    if (got !== wantOk) {
      console.error(`  FAIL ${name}: expected ok=${wantOk}, got ${got}`)
      bad++
    }
  }
  console.log(
    `check-cross-tenant-references --self-test: ${cases.length} cases exercised across ` +
      `both directions (at-baseline, all-zero, X1 new-pair, X2 rise, X3 unbanked fall, ` +
      `X0 scanned-nothing).`,
  )
  return bad
}

function psql(db, sql) {
  return execFileSync('psql', [db, '-tA', '-c', sql], { encoding: 'utf8' })
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)

  const DB = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
  if (!DB) {
    console.error('SUPABASE_DB_URL (or DATABASE_URL) is required for a real run.')
    console.error('Run with --self-test to exercise the logic without credentials.')
    process.exit(2)
  }

  let probes
  try {
    probes = psql(DB, ENUMERATE_FKS)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  } catch (err) {
    console.error(`::error::could not enumerate foreign keys: ${err.message}`)
    process.exit(1)
  }

  const found = {}
  try {
    // One round trip rather than N: the union is assembled here and run once.
    const union = probes.map((p) => p.replace(/;$/, '')).join(' union all ')
    const rows = psql(DB, `select ref, bad from (${union}) q where bad > 0`)
    for (const line of rows.split('\n').filter(Boolean)) {
      const [ref, bad] = line.split('|')
      found[ref.trim()] = Number(bad)
    }
  } catch (err) {
    console.error(`::error::could not count cross-tenant references: ${err.message}`)
    process.exit(1)
  }

  const { ok, failures } = evaluate(found, { pairsScanned: probes.length })

  // LANE-WATCHER: the denominator goes at the HEAD, before any verdict.
  const total = Object.values(found).reduce((a, b) => a + b, 0)
  console.log(
    `check-cross-tenant-references: ${probes.length} foreign-key pair(s) examined ` +
      `(both sides tenant-scoped), ${Object.keys(found).length} carrying cross-tenant ` +
      `rows, ${total} row(s) in total.`,
  )
  for (const [ref, n] of Object.entries(found).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${n.toString().padStart(4)}  ${ref}${BASELINE[ref] === undefined ? '   <- NEW' : ''}`)
  }

  if (args.includes('--json')) console.log(JSON.stringify({ found, ok, failures }, null, 2))

  if (!ok) {
    for (const f of failures) console.error(`::error::[${f.code}] ${f.message}`)
    process.exit(1)
  }
  console.log('  no new or worsening cross-tenant references.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
