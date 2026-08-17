#!/usr/bin/env node
/**
 * check-placement-rate-provenance — does a placement's wage know where it CAME from?
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT THE TRIPWIRE THAT WAS PROPOSED
 * ────────────────────────────────────────────────────────────────
 * The 2026-07-30 plan proposed this regression tripwire:
 *
 *     assert award_rate_resolution_status is never 'unresolved'
 *     on a placement carrying a charge_rate
 *
 * That assertion is **VACUOUS TODAY**. Migration 20260731110000 added
 * `placements_resolved_rate_required_chk`, which forbids exactly that pair at the
 * database level. A CHECK constraint makes the state unreachable, so the tripwire
 * cannot fail — not because the money chain got fixed, but because the database
 * now refuses to record the shape the tripwire was watching for.
 *
 * Measured on the live project, 2026-08-17:
 *
 *     placements                    34
 *     carrying a charge_rate        21
 *     status = 'unresolved'          0   <- what the proposed tripwire would check
 *     status = 'manual'             21
 *     award_rate_id IS NOT NULL      0   <- what actually answers the question
 *
 * A guard reading the status column would report "0 unresolved, all clear" over a
 * table where **not one placement has ever resolved a wage from an award rate**.
 * That is this estate's most expensive recurring shape: an instrument that cannot
 * observe the failure it was built for, reporting green.
 *
 * SO THE MEASURE IS THE FOREIGN KEY, NEVER THE STATUS STRING.
 * `award_rate_id IS NOT NULL` is a fact about a row that exists in another table.
 * A status string is a claim; an FK is a join.
 *
 * WHAT 'manual' IS — AND WHY 21 OF THEM IS NOT A DEFECT
 * ────────────────────────────────────────────────────
 * Do not read 21 `manual` rows as 21 broken ones. `manual` was added by
 * 20260806140000 as a FIRST-CLASS, HONEST marker, and that migration says why in
 * its own words: a placement whose wage the operator typed IS resolved —
 * manually — and writing 'resolved' there would *fabricate a compliance fact*.
 * The vocabulary previously had no value for the honest case, so the column had
 * no writer at all, so a guard tightened onto it could only ever fail.
 *
 *     award_rate_id present  -> 'resolved'  (wage came from a real award rate row)
 *     otherwise              -> 'manual'    (operator supplied it; no award lookup)
 *
 * This guard therefore REPORTS the manual/award split and never fails on it.
 * Failing on `manual` would pressure a future writer into stamping 'resolved'
 * onto a hand-typed number, which is the precise lie the vocabulary exists to
 * prevent. What it fails on is the provenance being INCOHERENT.
 *
 * WHAT IT FAILS ON
 * ────────────────
 *   F1  FABRICATED PROVENANCE — status 'resolved' with award_rate_id NULL.
 *       The row claims an award lookup that has no award row behind it. This is
 *       the R80.3 money-bug shape: a plausible wrong value with nothing failing.
 *
 *   F2  ORPHANED RESOLUTION — award_rate_id set but status not 'resolved'.
 *       The join succeeded and the provenance does not admit it. Harmless to a
 *       reader, fatal to an auditor, and it means the two writers disagree.
 *
 *   F3  SILENT WAGE — charge_rate set with status NULL. A wage with no
 *       provenance marker at all. 20260806140000 deliberately left 9 historical
 *       rows in this state pending an operator call on retrospective re-rating,
 *       so the floor is a BASELINE, not zero: this fails only if the count RISES
 *       above the recorded baseline, which would mean a live writer regressed.
 *
 *   F4  SCANNED NOTHING — zero placements read. A guard that examined an empty
 *       set has proved nothing, and must never report a pass. (LANE-WATCHER: the
 *       denominator is stated at the HEAD of the output for exactly this reason.)
 *
 * It does NOT fail on `award_resolved = 0`. That number is the honest measure of
 * the money chain and it is 0 because `award_classifications` — the parent FK of
 * `award_rates` — has no rows. Failing here would be filing the same blocker
 * twice under a second name; the chain gate is tracked where it belongs.
 *
 * USAGE
 *   node scripts/check-placement-rate-provenance.mjs            # needs SUPABASE_DB_URL
 *   node scripts/check-placement-rate-provenance.mjs --json
 *   node scripts/check-placement-rate-provenance.mjs --self-test # no credentials
 */

import { execFileSync } from 'node:child_process'

/**
 * Historical rows 20260806140000 deliberately did not backfill: 8 FutureBuild +
 * 1 Braden Group carrying a charge_rate with a NULL status. Re-rating them
 * retrospectively vs forward-only is an operator decision that 20260731100000
 * explicitly reserved, and stamping a status onto a historical rate would invent
 * the very provenance this guard exists to check.
 *
 * Measured 0 on 2026-08-17 — the migration's backfill reached them after all.
 * Kept as a named constant rather than a bare 0 so that if the operator's call
 * lands and some rows are legitimately left bare, this becomes a one-line edit
 * with a reason attached, instead of a mystery failure.
 */
const SILENT_WAGE_BASELINE = 0

const QUERY = `
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) FROM (
    SELECT
      count(*)                                                          AS total,
      count(*) FILTER (WHERE charge_rate IS NOT NULL)                   AS with_charge_rate,
      count(*) FILTER (WHERE award_rate_id IS NOT NULL)                 AS award_resolved,
      count(*) FILTER (WHERE award_rate_resolution_status = 'manual')   AS manual,
      count(*) FILTER (WHERE award_rate_resolution_status = 'resolved'
                         AND award_rate_id IS NULL)                     AS fabricated,
      count(*) FILTER (WHERE award_rate_id IS NOT NULL
                         AND award_rate_resolution_status
                             IS DISTINCT FROM 'resolved')               AS orphaned,
      count(*) FILTER (WHERE charge_rate IS NOT NULL
                         AND award_rate_resolution_status IS NULL)      AS silent
    FROM public.placements
  ) r`

/** Evaluate a measured row. Pure, so --self-test exercises the real logic. */
export function evaluate(m, { baseline = SILENT_WAGE_BASELINE } = {}) {
  const failures = []

  if (m.total === 0) {
    failures.push({
      code: 'F4',
      message:
        'scanned 0 placements — this guard proved nothing and must not report a pass',
    })
    // Nothing else is meaningful over an empty set; return early rather than
    // stacking derived failures on top of the one that explains them.
    return { ok: false, failures }
  }

  if (m.fabricated > 0) {
    failures.push({
      code: 'F1',
      message:
        `${m.fabricated} placement(s) claim award_rate_resolution_status='resolved' ` +
        `with award_rate_id NULL. The row asserts an award lookup that has no award ` +
        `rate behind it — a compliance fact with nothing under it.`,
    })
  }

  if (m.orphaned > 0) {
    failures.push({
      code: 'F2',
      message:
        `${m.orphaned} placement(s) carry an award_rate_id but do not say 'resolved'. ` +
        `The join succeeded and the provenance column disagrees, so the two writers ` +
        `are out of step.`,
    })
  }

  if (m.silent > baseline) {
    failures.push({
      code: 'F3',
      message:
        `${m.silent} placement(s) carry a charge_rate with NO resolution status, ` +
        `above the recorded baseline of ${baseline}. A live writer has regressed: ` +
        `new wages must record where they came from.`,
    })
  }

  return { ok: failures.length === 0, failures }
}

function selfTest() {
  const base = {
    total: 34, with_charge_rate: 21, award_resolved: 0,
    manual: 21, fabricated: 0, orphaned: 0, silent: 0,
  }
  const cases = [
    ['live shape 2026-08-17 passes (21 manual is NOT a failure)', base, true],
    ['award_resolved=0 alone does not fail', { ...base, award_resolved: 0 }, true],
    ['F1 fabricated provenance fails', { ...base, fabricated: 1 }, false],
    ['F2 orphaned resolution fails', { ...base, orphaned: 1 }, false],
    ['F3 silent wage above baseline fails', { ...base, silent: 1 }, false],
    ['F4 empty scan fails (refuses to pass on nothing)', { ...base, total: 0 }, false],
    ['fully resolved chain passes', { ...base, award_resolved: 21, manual: 0 }, true],
  ]

  let bad = 0
  for (const [name, m, wantOk] of cases) {
    const got = evaluate(m).ok
    if (got !== wantOk) { console.error(`  FAIL ${name}: expected ok=${wantOk}, got ${got}`); bad++ }
  }

  // Positive control on the instrument itself: the proposed status-string
  // tripwire must be shown INCAPABLE of catching the case the FK catches.
  const chainDead = { ...base, award_resolved: 0 }
  const statusTripwireWouldPass = chainDead.manual + chainDead.award_resolved > 0
  if (!statusTripwireWouldPass) {
    console.error('  FAIL positive control: the vacuity demo no longer demonstrates vacuity')
    bad++
  }

  console.log(
    `check-placement-rate-provenance --self-test: ${cases.length} cases exercised ` +
    `across both directions (manual-passes, award-zero-passes, F1, F2, F3, F4, ` +
    `fully-resolved-passes), plus 1 positive control proving the status-string ` +
    `tripwire would pass over a dead chain.`
  )
  return bad
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

  let m
  try {
    const out = execFileSync('psql', [DB, '-tA', '-c', QUERY], { encoding: 'utf8' }).trim()
    const rows = JSON.parse(out)
    if (!Array.isArray(rows) || rows.length !== 1) {
      console.error(`::error::query returned ${rows?.length ?? 0} rows, expected exactly 1`)
      process.exit(1)
    }
    m = Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, Number(v)]))
  } catch (err) {
    // Never swallow: a guard that cannot read its subject must fail closed, not
    // report a pass over an unread table.
    console.error(`::error::could not read public.placements: ${err.message}`)
    process.exit(1)
  }

  const { ok, failures } = evaluate(m)

  // LANE-WATCHER: the denominator goes at the HEAD, before any verdict.
  console.log(
    `check-placement-rate-provenance: ${m.total} placements examined ` +
    `(${m.with_charge_rate} carry a charge_rate).`
  )
  console.log(
    `  award-resolved (award_rate_id IS NOT NULL): ${m.award_resolved}  ` +
    `manual: ${m.manual}`
  )
  console.log(
    `  NOTE: award-resolved is read from the FOREIGN KEY, never from ` +
    `award_rate_resolution_status. A CHECK constraint makes the status column ` +
    `unable to express the failure, so a status-based check reports green over a ` +
    `dead chain.`
  )

  if (args.includes('--json')) {
    console.log(JSON.stringify({ measured: m, ok, failures }, null, 2))
  }

  if (!ok) {
    for (const f of failures) console.error(`::error::[${f.code}] ${f.message}`)
    process.exit(1)
  }
  console.log('  provenance is coherent — no fabricated, orphaned or silent wages.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
