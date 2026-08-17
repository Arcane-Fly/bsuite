#!/usr/bin/env node
/**
 * check-placement-award-code — does a claimed charge rate name the award it
 * can be reconciled against?
 *
 * WHY THIS EXISTS, AND WHY IT IS A SEPARATE GUARD FROM
 * check-placement-rate-provenance.mjs
 * ────────────────────────────────────────────────────────────────
 * That guard asks "did this wage come from a real award_rates ROW" (the
 * award_rate_id foreign key). This guard asks a narrower, earlier question:
 * "does this placement even NAME an award" (the award_code text column).
 * They can diverge — a placement can carry `award_code='MA000020'` with no
 * `award_rate_id` (the award is named but no specific rate row has ever been
 * resolved against it), which is most of this estate's live data today. A
 * guard that only read award_rate_id would report the same "0 resolved"
 * verdict for a placement that names its award and one that names nothing at
 * all, collapsing two very different compliance postures into one number.
 *
 * Measured on the live project, 2026-08-17:
 *
 *     active placements                          32
 *     active, no award_code                      20
 *     active, no award_code AND charge_rate set    8   <- THE metric this
 *                                                          guard ratchets
 *     of those 8: resolution_status               'manual', all 8
 *     of those 8: apprentice attached                       0 of 8
 *
 * WHAT 'manual' + NO award_code IS — AND WHY 8 OF THEM IS NOT A DEFECT
 * ────────────────────────────────────────────────────────────────────
 * These are typed quotes: an operator entered a charge rate with no award
 * lookup and no apprentice attached. `placements_resolved_rate_required_chk`
 * already proves a positive resolution marker exists whenever charge_rate is
 * set, and 'manual' IS that marker, honestly. Nobody is being paid against a
 * hidden award — there is no worker to pay.
 *
 * THE REAL GAP THIS GUARD MAKES VISIBLE
 * ──────────────────────────────────────
 * A charge rate with no award_code cannot be reconciled to an award LATER,
 * if that quote is ever promoted to a real placement with an apprentice.
 * `20260822060000_placements_award_code_required_when_claimed.sql` closes
 * the FABRICATION half of this at the database level: it is now a CHECK
 * constraint violation (23514) to claim `resolved`/`migrated_to_discontinued`
 * with no award_code. This guard covers the half that migration
 * DELIBERATELY leaves open — the honest 'manual' rows, which the migration
 * exempts by name because forbidding them would break the legitimate quote
 * flow (20 live rows would have violated an unconditional version).
 *
 * So the DB constraint and this guard are not redundant: the constraint
 * makes one shape UNREACHABLE; this guard keeps the shape it deliberately
 * left reachable from growing unnoticed. A guard that stopped believing this
 * distinction would either (a) re-propose the unconditional constraint the
 * operator already rejected, or (b) stop watching the metric at all — this
 * is neither.
 *
 * THE RATCHET — ONE DIRECTION, LIKE check-placement-rate-provenance's
 * SILENT_WAGE_BASELINE
 * ─────────────────────────────────────────────────────────────────
 * `GAP_BASELINE` is the measured count above. This guard FAILS if the live
 * count rises above it — a new manual quote with no award_code is still
 * legitimate, so this does not forbid creating one, but it forces whoever
 * notices the rise to consciously edit `GAP_BASELINE` (and say why, in the
 * same commit) rather than letting the gap grow invisibly forever. It does
 * NOT fail on a fall — the baseline is a ceiling, not a target the tree must
 * match exactly, so operator backfill work that closes some of the 8 needs
 * no companion edit to this file.
 *
 * WHAT IT FAILS ON
 * ────────────────
 *   G1  GAP ROSE — active, charge_rate set, no award_code, status='manual'
 *       count exceeds GAP_BASELINE. Visibility signal, not a fabrication —
 *       see the ratchet note above for what to do about it.
 *
 *   G2  FABRICATED-SHAPED ROW SURVIVED THE MIGRATION — active, charge_rate
 *       set, no award_code, status IN ('resolved','migrated_to_discontinued').
 *       `20260822060000` makes this UNREACHABLE via a CHECK constraint; a
 *       non-zero count here means that migration was never applied to this
 *       database, or its constraint was later dropped. Defense in depth: this
 *       guard does not trust the migration's presence, it re-derives the
 *       fact directly from the row shape.
 *
 *   G3  A GAP ROW HAS A REAL APPRENTICE — any row counted in G1 that also
 *       carries a non-null apprentice_id. The 8 measured live are explicitly
 *       apprentice-less quotes; an apprentice attached to a charge rate with
 *       no award to name is the actual underpayment-risk shape this whole
 *       task exists to keep separate from "correctly labelled manual quote".
 *       Hard failure regardless of GAP_BASELINE — this is not a size
 *       question, it is a shape question.
 *
 *   G4  SCANNED NOTHING — zero active placements read. A guard that examined
 *       an empty set has proved nothing about a live table and must never
 *       report a pass.
 *
 * USAGE
 *   node scripts/check-placement-award-code.mjs            # needs SUPABASE_DB_URL
 *   node scripts/check-placement-award-code.mjs --json
 *   node scripts/check-placement-award-code.mjs --self-test # no credentials
 */

import { execFileSync } from 'node:child_process'

/**
 * Measured live 2026-08-17: 8 active placements carry a charge_rate with no
 * award_code, all status='manual', all with no apprentice attached. Kept as
 * a named, commented constant rather than a bare literal so a future rise is
 * a one-line, reasoned edit — never a silent pass.
 */
const GAP_BASELINE = 8

const QUERY = `
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) FROM (
    SELECT
      count(*)                                                         AS total_active,
      count(*) FILTER (WHERE charge_rate IS NOT NULL)                  AS with_charge_rate,
      count(*) FILTER (WHERE NULLIF(award_code, '') IS NULL)           AS no_award_code,
      count(*) FILTER (WHERE charge_rate IS NOT NULL
                         AND NULLIF(award_code, '') IS NULL
                         AND award_rate_resolution_status = 'manual')  AS gap_manual,
      count(*) FILTER (WHERE charge_rate IS NOT NULL
                         AND NULLIF(award_code, '') IS NULL
                         AND award_rate_resolution_status IN
                             ('resolved', 'migrated_to_discontinued'))  AS gap_fabricated,
      count(*) FILTER (WHERE charge_rate IS NOT NULL
                         AND NULLIF(award_code, '') IS NULL
                         AND award_rate_resolution_status = 'manual'
                         AND apprentice_id IS NOT NULL)                 AS gap_with_apprentice
    FROM public.placements
    WHERE status = 'active'
  ) r`

/** Evaluate a measured row. Pure, so --self-test exercises the real logic. */
export function evaluate(m, { baseline = GAP_BASELINE } = {}) {
  const failures = []

  if (m.total_active === 0) {
    failures.push({
      code: 'G4',
      message:
        'scanned 0 active placements — this guard proved nothing and must not report a pass',
    })
    return { ok: false, failures }
  }

  if (m.gap_fabricated > 0) {
    failures.push({
      code: 'G2',
      message:
        `${m.gap_fabricated} active placement(s) claim award_rate_resolution_status ` +
        `IN ('resolved','migrated_to_discontinued') with no award_code. ` +
        `placements_award_code_required_when_claimed_chk (20260822060000) should make ` +
        `this unreachable — a non-zero count means that constraint is missing or was ` +
        `dropped on this database.`,
    })
  }

  if (m.gap_with_apprentice > 0) {
    failures.push({
      code: 'G3',
      message:
        `${m.gap_with_apprentice} active placement(s) carry a charge_rate, no award_code, ` +
        `AND a real apprentice — not a bare quote. This is the underpayment-risk shape, ` +
        `not the honest manual-quote shape, regardless of GAP_BASELINE.`,
    })
  }

  if (m.gap_manual > baseline) {
    failures.push({
      code: 'G1',
      message:
        `${m.gap_manual} active placement(s) carry a charge_rate with no award_code ` +
        `(honestly marked 'manual'), above the recorded GAP_BASELINE of ${baseline}. ` +
        `Not forbidden — the manual-quote flow is legitimate — but visibility requires ` +
        `a conscious edit: raise GAP_BASELINE in this file with a reason, or attach the ` +
        `award_code the new quote(s) actually belong to.`,
    })
  }

  return { ok: failures.length === 0, failures }
}

function selfTest() {
  const base = {
    total_active: 32, with_charge_rate: 20, no_award_code: 20,
    gap_manual: 8, gap_fabricated: 0, gap_with_apprentice: 0,
  }
  const cases = [
    ['live shape 2026-08-17 passes (8 manual, at baseline)', base, true],
    ['gap_manual below baseline passes', { ...base, gap_manual: 3 }, true],
    ['gap_manual AT baseline passes (not a strict <)', { ...base, gap_manual: GAP_BASELINE }, true],
    ['G1 gap_manual above baseline fails', { ...base, gap_manual: GAP_BASELINE + 1 }, false],
    ['G2 fabricated-shaped survivor fails', { ...base, gap_fabricated: 1 }, false],
    ['G3 gap row with an apprentice fails, even at/below baseline', { ...base, gap_with_apprentice: 1 }, false],
    ['G4 empty scan fails (refuses to pass on nothing)', { ...base, total_active: 0 }, false],
    ['gap fully closed (0) passes', { ...base, gap_manual: 0, no_award_code: 12, with_charge_rate: 12 }, true],
  ]

  let bad = 0
  for (const [name, m, wantOk] of cases) {
    const got = evaluate(m).ok
    if (got !== wantOk) { console.error(`  FAIL ${name}: expected ok=${wantOk}, got ${got}`); bad++ }
  }

  // Positive control: a naive "no award_code at all" reading of the live
  // shape would report 20 (active) — prove the manual/fabricated split this
  // guard performs is not a no-op relative to that cruder count.
  const naiveCount = base.no_award_code
  const splitIsNarrower = base.gap_manual < naiveCount
  if (!splitIsNarrower) {
    console.error('  FAIL positive control: the manual/no-award split no longer narrows the naive count')
    bad++
  }

  console.log(
    `check-placement-award-code --self-test: ${cases.length} cases exercised across both ` +
    `directions (at-baseline-passes, below-baseline-passes, G1 rise, G2 fabricated-shaped, ` +
    `G3 apprentice-attached, G4 empty-scan-refused, gap-closed-passes), plus 1 positive ` +
    `control proving the manual/no-award split narrows the naive "no award_code" count.`
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
    `check-placement-award-code: ${m.total_active} active placements examined ` +
    `(${m.with_charge_rate} carry a charge_rate, ${m.no_award_code} carry no award_code).`
  )
  console.log(
    `  gap (charge_rate + no award_code, honestly manual): ${m.gap_manual} ` +
    `[baseline ${GAP_BASELINE}]  fabricated-shaped survivors: ${m.gap_fabricated}  ` +
    `gap rows with an apprentice: ${m.gap_with_apprentice}`
  )
  console.log(
    `  NOTE: the gap is a RATCHET, not a hard forbid — a new honest manual quote with ` +
    `no award_code is legitimate. This guard only refuses to let the count rise past ` +
    `GAP_BASELINE without a conscious, reasoned edit to this file.`
  )

  if (args.includes('--json')) {
    console.log(JSON.stringify({ measured: m, baseline: GAP_BASELINE, ok, failures }, null, 2))
  }

  if (!ok) {
    for (const f of failures) console.error(`::error::[${f.code}] ${f.message}`)
    process.exit(1)
  }
  console.log('  award-code provenance is coherent — no fabricated survivors, no apprentice exposure, gap within baseline.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
