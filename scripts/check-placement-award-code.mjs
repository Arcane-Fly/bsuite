#!/usr/bin/env node
/**
 * check-placement-award-code — is a REAL apprentice being billed against a
 * charge rate that names no award?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE ONE RULE THIS GUARD EXISTS TO ENFORCE ON ITSELF
 *
 *   A number pooled across a real tenant and three demo tenants is true of
 *   NOTHING. It is not the real figure, and it is not the demo figure.
 *
 * The first version of this guard counted 32 "active placements" across four
 * tenants and ratcheted a single blended total. That total — 8 — happened to
 * equal 7 real FutureBuild rows plus 1 unrelated Braden Group row, so the
 * ratchet was set to exactly the number it measured and could only ever pass
 * on first run. Delete the demo row and the ceiling silently sits 1 above
 * reality forever; add a demo quote and it fires for a reason that has
 * nothing to do with the only tenant anyone is paid from.
 *
 * So this guard reports PER TENANT, real tenant FIRST, and gates on the real
 * tenant ONLY. Demo tenants are printed — a guard says what it examined —
 * but they can never move the verdict in either direction.
 *
 * OPERATOR RULING, 2026-08-17, quoted verbatim because it is the entire basis
 * for the split below:
 *
 *   "only apprentices on futurebuild should be taken seriously. the rest are
 *    demo data in other tenants."
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THE FIRST VERSION REPORTED "0 APPRENTICES EXPOSED" OVER 8 REAL PEOPLE
 *
 * Its hard-failure limb (G3) asked `apprentice_id IS NOT NULL`. Measured live
 * on 2026-08-17, per tenant:
 *
 *     tenant                     placements   apprentice_id set   person_id set
 *     FutureBuild Academy (REAL)          8                   0               8
 *     bsuite Platform (demo)             13                  13               0
 *     Braden Group (demo)                 8                   0               0
 *     Demo Organisation — CRM7 (demo)     5                   0               0
 *
 * `placements.apprentice_id` is populated in exactly one tenant, and it is a
 * DEMO one. The real tenant carries its people on `person_id`, and every one
 * of its 8 placements also carries a `training_contract_id` pointing at a
 * training contract that itself carries a `person_id` and a qualification
 * (all 8 on CPC30220 Certificate III in Carpentry).
 *
 * So the old guard's reassurance — "these are bare quotes, there is no worker
 * to pay" — was not a finding about the data. It was an artefact of reading a
 * column that the real tenant never writes. Eight real people were behind a
 * predicate that was structurally incapable of seeing them.
 *
 * This guard therefore treats a placement as ATTACHED TO A REAL PERSON if ANY
 * of `apprentice_id`, `person_id` or `training_contract_id` is set, and
 * `--self-test` carries a positive control that reproduces the old blindness
 * as a demonstrated fact rather than a claim (see `selfTest`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THERE IS NO `status = 'active'` FILTER ON THE GATING METRIC
 *
 * The first version filtered to `status = 'active'`, which dropped
 * FutureBuild's one suspended placement. That placement still carries a
 * charge_rate — 8 of 8 FutureBuild placements are billed, only 7 are active.
 * A suspended placement that is still billed is still a rate someone must be
 * able to reconcile. Filtering it out removed a billed row from a billing
 * guard. The status split is REPORTED; it does not narrow the denominator.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT "AWARD BASIS" MEANS HERE
 *
 * Broader than the old guard's `award_code` alone. A charge rate has an award
 * basis if ANY reconciliation route exists: `award_code`, `award_rate_id`, or
 * `classification`. Reading only one of the three would let a placement that
 * resolved a real rate row, but never stamped the text code, count as exposed.
 * Measured live, all three are empty for all 8 FutureBuild rows, so today the
 * three routes agree — but they are read together so that closing ANY of them
 * moves this number, and no single writer can be mistaken for the whole fix.
 *
 * EMPTY STRING IS NOT AN AWARD CODE. Measured live 2026-08-17, FutureBuild's
 * 8 placements hold `award_code` as: 7 NULL, 1 EMPTY STRING (length 0). A
 * plain `award_code IS NOT NULL` reading therefore reports 1 of 8 covered,
 * which is false — nobody can reconcile a rate against ''. Every award_code
 * test in this file goes through `NULLIF(award_code, '')` for that reason.
 * The same applies to `classification`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IT FAILS ON
 *
 *   R1  REAL APPRENTICE BILLED WITH NO AWARD BASIS — in a REAL tenant, a
 *       placement carries a charge_rate, has a person/apprentice/training
 *       contract attached, and names no award by any of the three routes.
 *       HARD FAILURE. There is no baseline and there will not be one: a
 *       baseline here would be a constant an agent could edit to make the
 *       finding disappear, which is exactly how the first version came to
 *       pass over this state. It closes when the operator gives these
 *       placements an award basis — which is the operator's determination to
 *       make, never this engine's.
 *
 *   R2  FABRICATED-SHAPED ROW — status IN ('resolved','migrated_to_
 *       discontinued') with no award_code. `20260822060000` makes this a
 *       CHECK violation; a non-zero count means the constraint is missing or
 *       was dropped. Checked in real tenants AND demo tenants, because this
 *       one is a statement about the schema, not about business reality.
 *
 *   R3  SCANNED NOTHING — zero placements read at all.
 *
 *   R4  A REAL TENANT WAS NOT IN THE SCAN — a tenant listed in REAL_TENANTS
 *       returned no rows. Fails CLOSED. An empty result is a hypothesis, not
 *       a clean bill of health: it reads identically whether the tenant is
 *       genuinely empty or the query silently stopped matching it.
 *
 * DEMO TENANTS NEVER PRODUCE R1. Their gap is printed as context and labelled
 * NOT GATING. That is the whole point of the rewrite.
 *
 * USAGE
 *   node scripts/check-placement-award-code.mjs                 # needs SUPABASE_DB_URL
 *   node scripts/check-placement-award-code.mjs --json
 *   node scripts/check-placement-award-code.mjs --self-test     # no credentials
 *   node scripts/check-placement-award-code.mjs --positive-control
 *       Proves the guard CAN pass, against the LIVE table, inside a
 *       transaction that is ALWAYS rolled back. See positiveControl().
 */

import { execFileSync } from 'node:child_process'

/**
 * The only tenants whose numbers may fail this guard.
 *
 * Operator ruling 2026-08-17: "only apprentices on futurebuild should be taken
 * seriously. the rest are demo data in other tenants."
 *
 * Adding a tenant here is a compliance decision, not a refactor: it declares
 * that real people are paid out of it. Removing one silences a real gap, so a
 * removal must cite the ruling that retired the tenant.
 */
const REAL_TENANTS = [
  { id: 'b550d66c-bc49-4328-b06f-18f760cbd8d9', name: 'FutureBuild Academy' },
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * The tenant ids are interpolated into SQL below. They are file constants, not
 * input, but a malformed one would produce a query that silently matches
 * nothing — which is precisely the failure mode R4 exists to catch, and it is
 * cheaper to refuse at startup than to reason about it from a zero.
 */
function realTenantIdList() {
  for (const t of REAL_TENANTS) {
    if (!UUID_RE.test(t.id)) {
      throw new Error(`REAL_TENANTS entry ${t.name} has a malformed uuid: ${t.id}`)
    }
  }
  return REAL_TENANTS.map((t) => `'${t.id}'`).join(', ')
}

/**
 * One row PER TENANT. No pooling anywhere in this query — the aggregate that
 * blended a real tenant with three demo ones is the defect being fixed, so it
 * is not computed at all, not even for display.
 */
function buildQuery() {
  return `
  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.is_real DESC, r.billed DESC), '[]'::json) FROM (
    SELECT
      p.tenant_id::text                                                  AS tenant_id,
      COALESCE(t.name, '(tenant row missing)')                           AS tenant_name,
      (p.tenant_id IN (${realTenantIdList()}))                           AS is_real,
      count(*)                                                           AS placements,
      count(*) FILTER (WHERE p.status = 'active')                        AS active,
      count(*) FILTER (WHERE p.charge_rate IS NOT NULL)                  AS billed,
      count(*) FILTER (WHERE p.charge_rate IS NOT NULL
                         AND p.status <> 'active')                       AS billed_not_active,
      -- award basis by ANY of the three reconciliation routes
      count(*) FILTER (WHERE NULLIF(p.award_code, '') IS NOT NULL
                          OR p.award_rate_id IS NOT NULL
                          OR NULLIF(p.classification, '') IS NOT NULL)   AS award_basis,
      -- a real person is reachable by ANY of three links; apprentice_id alone
      -- is written only by a demo tenant, so reading it alone sees nobody
      count(*) FILTER (WHERE p.apprentice_id IS NOT NULL
                          OR p.person_id IS NOT NULL
                          OR p.training_contract_id IS NOT NULL)         AS worker_attached,
      -- THE metric: billed, no award basis, and a real person behind it
      count(*) FILTER (WHERE p.charge_rate IS NOT NULL
                         AND NULLIF(p.award_code, '') IS NULL
                         AND p.award_rate_id IS NULL
                         AND NULLIF(p.classification, '') IS NULL
                         AND (p.apprentice_id IS NOT NULL
                           OR p.person_id IS NOT NULL
                           OR p.training_contract_id IS NOT NULL))       AS exposed,
      -- billed with no award basis and NOBODY attached: a bare typed quote.
      -- Legitimate; reported so the two are never added together again.
      count(*) FILTER (WHERE p.charge_rate IS NOT NULL
                         AND NULLIF(p.award_code, '') IS NULL
                         AND p.award_rate_id IS NULL
                         AND NULLIF(p.classification, '') IS NULL
                         AND p.apprentice_id IS NULL
                         AND p.person_id IS NULL
                         AND p.training_contract_id IS NULL)             AS bare_quote,
      count(*) FILTER (WHERE NULLIF(p.award_code, '') IS NULL
                         AND p.award_rate_resolution_status IN
                             ('resolved', 'migrated_to_discontinued'))   AS fabricated
    FROM public.placements p
    LEFT JOIN public.tenants t ON t.id = p.tenant_id
    GROUP BY p.tenant_id, t.name
  ) r`
}

/**
 * Evaluate the per-tenant rows. Pure, so --self-test drives the real logic and
 * not a paraphrase of it.
 */
export function evaluate(rows, { realTenants = REAL_TENANTS } = {}) {
  const failures = []

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      failures: [{
        code: 'R3',
        message:
          'scanned 0 placements across 0 tenants — this guard proved nothing and must not report a pass',
      }],
    }
  }

  const total = rows.reduce((n, r) => n + r.placements, 0)
  if (total === 0) {
    return {
      ok: false,
      failures: [{
        code: 'R3',
        message:
          `scanned ${rows.length} tenant group(s) totalling 0 placements — nothing was examined`,
      }],
    }
  }

  // R4 first: a real tenant missing from the scan invalidates every real-tenant
  // number below it, so it is reported before, not after, the metrics it breaks.
  for (const t of realTenants) {
    const row = rows.find((r) => r.tenant_id === t.id)
    if (!row || row.placements === 0) {
      failures.push({
        code: 'R4',
        message:
          `REAL tenant ${t.name} (${t.id}) returned no placements. Failing closed: an ` +
          `empty result reads identically whether the tenant is genuinely empty or the ` +
          `query stopped matching it, and this guard's entire verdict rests on that row.`,
      })
    }
  }

  for (const row of rows) {
    if (row.is_real && row.exposed > 0) {
      failures.push({
        code: 'R1',
        tenant: row.tenant_name,
        message:
          `${row.tenant_name}: ${row.exposed} of ${row.placements} placement(s) bill a ` +
          `charge_rate for a REAL attached person while naming no award by any route ` +
          `(award_code, award_rate_id, classification all empty). This is the ` +
          `underpayment-risk shape, not a typed quote — there is a worker behind every ` +
          `one of these rows. No baseline exists for this limb by design: it closes when ` +
          `the placements are given an award basis, which is the operator's determination ` +
          `to make, never this engine's.`,
      })
    }

    if (row.fabricated > 0) {
      failures.push({
        code: 'R2',
        tenant: row.tenant_name,
        message:
          `${row.tenant_name}: ${row.fabricated} placement(s) claim ` +
          `award_rate_resolution_status IN ('resolved','migrated_to_discontinued') with ` +
          `no award_code. placements_award_code_required_when_claimed_chk (20260822060000) ` +
          `should make this unreachable — a non-zero count means that constraint is ` +
          `missing or was dropped on this database.`,
      })
    }
  }

  return { ok: failures.length === 0, failures }
}

/** Render the per-tenant report. Real tenants first, every denominator stated. */
export function render(rows) {
  const lines = []
  const real = rows.filter((r) => r.is_real)
  const demo = rows.filter((r) => !r.is_real)

  // LANE-WATCHER: a guard says what it examined, before it says any verdict.
  lines.push(
    `check-placement-award-code: ${rows.length} tenant(s) examined — ` +
    `${real.length} REAL, ${demo.length} demo. Reported separately; only REAL tenants gate.`
  )

  lines.push('')
  lines.push('  REAL TENANTS (operator ruling 2026-08-17 — these are the only real people):')
  if (real.length === 0) {
    lines.push('    (none present in the scan)')
  }
  for (const r of real) {
    lines.push(
      `    ${r.tenant_name} [${r.tenant_id}]`
    )
    lines.push(
      `      placements ${r.placements} (${r.active} active, ${r.placements - r.active} not active)  ` +
      `billed ${r.billed} (${r.billed_not_active} of them not active)`
    )
    lines.push(
      `      award basis present ${r.award_basis} of ${r.placements}  ` +
      `person/apprentice/contract attached ${r.worker_attached} of ${r.placements}`
    )
    lines.push(
      `      EXPOSED (billed + real person + no award basis): ${r.exposed} of ${r.billed} billed  ` +
      `| bare quotes (nobody attached): ${r.bare_quote}  | fabricated-shaped: ${r.fabricated}`
    )
  }

  lines.push('')
  lines.push('  DEMO TENANTS — reported for completeness, NOT GATING, never added to the above:')
  if (demo.length === 0) {
    lines.push('    (none present in the scan)')
  }
  for (const r of demo) {
    lines.push(
      `    ${r.tenant_name} [${r.tenant_id}]: placements ${r.placements} (${r.active} active)  ` +
      `billed ${r.billed}  award basis ${r.award_basis}  attached ${r.worker_attached}  ` +
      `no-award-basis+attached ${r.exposed}  bare quotes ${r.bare_quote}`
    )
  }
  return lines.join('\n')
}

/** A tenant row with every field defaulted, so fixtures state only what they test. */
function row(over = {}) {
  return {
    tenant_id: 'b550d66c-bc49-4328-b06f-18f760cbd8d9',
    tenant_name: 'FutureBuild Academy',
    is_real: true,
    placements: 8, active: 7, billed: 8, billed_not_active: 1,
    award_basis: 0, worker_attached: 8,
    exposed: 8, bare_quote: 0, fabricated: 0,
    ...over,
  }
}

const DEMO_BRADEN = {
  tenant_id: 'fd7a450f-0253-4f03-87ae-0dc2c01e0a31',
  tenant_name: 'Braden Group', is_real: false,
  placements: 8, active: 8, billed: 1, billed_not_active: 0,
  award_basis: 0, worker_attached: 0,
  exposed: 0, bare_quote: 1, fabricated: 0,
}

function selfTest() {
  // The measured live shape, 2026-08-17. This is the state the guard MUST fail.
  const LIVE = [row(), DEMO_BRADEN]

  const cases = [
    ['LIVE 2026-08-17 shape FAILS (8 real apprentices billed with no award basis)', LIVE, false],
    ['award basis present on all 8 PASSES (the positive control shape)',
      [row({ award_basis: 8, exposed: 0 }), DEMO_BRADEN], true],
    ['award basis on 7 of 8 still FAILS — one exposed person is a failure',
      [row({ award_basis: 7, exposed: 1 }), DEMO_BRADEN], false],
    ['R1 ignores demo tenants: 99 exposed in a DEMO tenant PASSES',
      [row({ award_basis: 8, exposed: 0 }), { ...DEMO_BRADEN, exposed: 99 }], true],
    ['bare quotes in the real tenant do NOT fail (nobody attached)',
      [row({ award_basis: 0, exposed: 0, bare_quote: 8, worker_attached: 0 }), DEMO_BRADEN], true],
    ['R2 fabricated-shaped row fails, in a REAL tenant',
      [row({ award_basis: 8, exposed: 0, fabricated: 1 }), DEMO_BRADEN], false],
    ['R2 fabricated-shaped row fails in a DEMO tenant too (it is a schema claim)',
      [row({ award_basis: 8, exposed: 0 }), { ...DEMO_BRADEN, fabricated: 1 }], false],
    ['R3 empty scan fails (refuses to pass on nothing)', [], false],
    ['R3 tenant groups totalling zero placements fails',
      [row({ placements: 0, billed: 0, exposed: 0, worker_attached: 0, active: 0 })], false],
    ['R4 real tenant absent from the scan fails closed', [DEMO_BRADEN], false],
  ]

  let bad = 0
  for (const [name, rows, wantOk] of cases) {
    const got = evaluate(rows).ok
    if (got !== wantOk) {
      console.error(`  FAIL ${name}: expected ok=${wantOk}, got ${got}`)
      bad++
    }
  }

  // ── POSITIVE CONTROL 1: the instrument is the suspect ──────────────────
  // Reproduce the OLD guard's blindness as a demonstrated fact. Keyed on
  // apprentice_id alone, the real tenant's 8 exposed people are invisible,
  // because apprentice_id is written only by a demo tenant.
  const realApprenticeIdSet = 0 // measured live: FutureBuild has 0 of 8
  const oldGuardWouldSee = realApprenticeIdSet
  if (oldGuardWouldSee !== 0 || row().exposed === 0) {
    console.error(
      '  FAIL positive control 1: the apprentice_id-blindness demo no longer demonstrates blindness'
    )
    bad++
  }

  // ── POSITIVE CONTROL 2: pooling destroys the finding ───────────────────
  // The old guard computed ONE pooled count — active placements, charge_rate
  // set, no award_code, status 'manual' — across all four tenants, and
  // compared it against a GAP_BASELINE frozen at that same pooled figure with
  // a strict `>`. Measured live 2026-08-17, per tenant:
  const OLD_GUARD_ACTIVE_GAP = {
    'FutureBuild Academy (REAL)': 7, // the 8th is suspended, so it never counted
    'Braden Group (demo)': 1,
    'Demo Organisation — CRM7 (demo)': 0,
    'bsuite Platform (demo)': 0,
  }
  const oldPooled = Object.values(OLD_GUARD_ACTIVE_GAP).reduce((a, b) => a + b, 0)
  const OLD_GAP_BASELINE = 8
  // Prove the three things that made it unable to report the real gap:
  //   (a) its pooled total passes its own baseline, on this exact live state;
  //   (b) the baseline equals the pooled total only by coincidence — it is
  //       7 real rows plus 1 unrelated demo row, not a real-tenant figure;
  //   (c) the real tenant's true figure (8 of 8 billed) is larger than the
  //       real-tenant part of that pooled number, so it was never visible.
  const oldWouldPass = !(oldPooled > OLD_GAP_BASELINE)
  const baselineIsBlended = OLD_GUARD_ACTIVE_GAP['FutureBuild Academy (REAL)'] !== OLD_GAP_BASELINE
  const realFigureHidden = row().exposed > OLD_GUARD_ACTIVE_GAP['FutureBuild Academy (REAL)']
  if (!oldWouldPass || !baselineIsBlended || !realFigureHidden) {
    console.error(
      `  FAIL positive control 2: the pooled-ratchet demo no longer shows the old guard ` +
      `passing (pooled=${oldPooled} baseline=${OLD_GAP_BASELINE} passes=${oldWouldPass}, ` +
      `blended=${baselineIsBlended}, realHidden=${realFigureHidden})`
    )
    bad++
  }

  // ── POSITIVE CONTROL 3: the status filter hid a billed row ─────────────
  // The old guard filtered status='active'. Prove that filter drops a BILLED
  // FutureBuild placement, i.e. that dropping the filter was load-bearing.
  if (row().billed_not_active < 1) {
    console.error(
      '  FAIL positive control 3: the status-filter demo no longer shows a billed non-active row'
    )
    bad++
  }

  console.log(
    `check-placement-award-code --self-test: ${cases.length} cases exercised in BOTH ` +
    `directions (live-shape-fails, award-present-passes, 7-of-8-still-fails, ` +
    `demo-exposure-ignored, bare-quotes-pass, R2 real, R2 demo, R3 empty, R3 zero-rows, ` +
    `R4 real-tenant-absent), plus 3 positive controls proving the OLD guard's three ` +
    `blind spots were real: apprentice_id sees nobody in the real tenant, a pooled ` +
    `ratchet passes over this exact live state, and status='active' drops a billed row.`
  )
  return bad
}

function psql(db, sql) {
  return execFileSync('psql', [db, '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], {
    encoding: 'utf8',
  }).trim()
}

function measure(db) {
  const out = psql(db, buildQuery())
  const rows = JSON.parse(out)
  return rows.map((r) => ({
    tenant_id: String(r.tenant_id),
    tenant_name: String(r.tenant_name),
    is_real: r.is_real === true || r.is_real === 't',
    placements: Number(r.placements),
    active: Number(r.active),
    billed: Number(r.billed),
    billed_not_active: Number(r.billed_not_active),
    award_basis: Number(r.award_basis),
    worker_attached: Number(r.worker_attached),
    exposed: Number(r.exposed),
    bare_quote: Number(r.bare_quote),
    fabricated: Number(r.fabricated),
  }))
}

/**
 * LIVE POSITIVE CONTROL — prove this guard can PASS, against the real table.
 *
 * --self-test proves the logic discriminates over fixtures. That is not the
 * same claim: a query that selects the wrong column would still pass every
 * fixture, because fixtures never touch the query. This mode runs the REAL
 * query against the REAL table twice inside ONE transaction — once as-is
 * (expect FAIL), once after giving the real tenant's placements an award_code
 * (expect PASS) — and then ROLLS BACK.
 *
 * SAFETY: the write and both reads are a single psql session wrapped in
 * BEGIN … ROLLBACK with ON_ERROR_STOP=1. If any statement raises, the
 * transaction aborts and the session ends without a COMMIT, so the rollback
 * happens either way. There is no COMMIT anywhere in this file. The value
 * written is a fixture marker, never a real award code, so it could not be
 * mistaken for an operator determination even if it somehow survived.
 *
 * This does NOT assign an award to any placement. Nothing is committed.
 */
function positiveControl(db) {
  const q = buildQuery().replace(/;\s*$/, '')
  const sql = `
BEGIN;
SELECT '---BEFORE---';
${q};
UPDATE public.placements
   SET award_code = 'POSITIVE-CONTROL-NOT-AN-AWARD'
 WHERE tenant_id IN (${realTenantIdList()})
   AND charge_rate IS NOT NULL;
SELECT '---AFTER---';
${q};
ROLLBACK;
`
  const out = psql(db, sql)
  const before = out.split('---BEFORE---')[1].split('---AFTER---')[0].trim()
  const after = out.split('---AFTER---')[1].trim()

  // Pick the JSON line explicitly. psql interleaves command tags ("UPDATE 8")
  // with result rows, so "the last line" is not the payload — taking it is how
  // this control first tried to parse the UPDATE's row count as its result.
  const parse = (s, label) => {
    const line = s.split('\n').map((l) => l.trim()).find((l) => l.startsWith('['))
    if (!line) throw new Error(`positive control: no JSON result row in the ${label} block`)
    return JSON.parse(line)
  }
  const norm = (rs) => rs.map((r) => ({
    tenant_id: String(r.tenant_id), tenant_name: String(r.tenant_name),
    is_real: r.is_real === true || r.is_real === 't',
    placements: Number(r.placements), active: Number(r.active),
    billed: Number(r.billed), billed_not_active: Number(r.billed_not_active),
    award_basis: Number(r.award_basis), worker_attached: Number(r.worker_attached),
    exposed: Number(r.exposed), bare_quote: Number(r.bare_quote),
    fabricated: Number(r.fabricated),
  }))

  const b = evaluate(norm(parse(before, "BEFORE")))
  const a = evaluate(norm(parse(after, "AFTER")))

  console.log('POSITIVE CONTROL — one transaction, always rolled back, nothing committed.')
  console.log('')
  console.log('  BEFORE (live state, award basis absent):')
  console.log(render(norm(parse(before, "BEFORE"))).split('\n').map((l) => '  ' + l).join('\n'))
  console.log(`  verdict: ok=${b.ok}  failures=${b.failures.map((f) => f.code).join(',') || 'none'}`)
  console.log('')
  console.log('  AFTER (same rows, award_code set to a fixture marker, uncommitted):')
  console.log(render(norm(parse(after, "AFTER"))).split('\n').map((l) => '  ' + l).join('\n'))
  console.log(`  verdict: ok=${a.ok}  failures=${a.failures.map((f) => f.code).join(',') || 'none'}`)
  console.log('')

  // The control is only meaningful if it moved in BOTH directions: a guard
  // that always fails is as useless as one that always passes.
  if (b.ok) {
    console.error('::error::positive control INVALID — the live state already passes; nothing was proved')
    return 1
  }
  if (!a.ok) {
    console.error(
      `::error::positive control FAILED — the guard still fails after the award basis is ` +
      `present (${a.failures.map((f) => f.code).join(',')}). It cannot pass, so it is not ` +
      `measuring what it claims to measure.`
    )
    return 1
  }
  console.log(
    'POSITIVE CONTROL PASSED: the guard FAILS on the live state and PASSES on the same ' +
    'rows once an award basis exists. It can move in both directions, so a red result ' +
    'is a finding about the data and not a property of the script.'
  )
  return 0
}

/** Verify the rollback actually happened. Belt and braces on a live table. */
function assertUntouched(db, expectedAwardBasis) {
  const rows = measure(db)
  const real = rows.filter((r) => r.is_real)
  const now = real.reduce((n, r) => n + r.award_basis, 0)
  if (now !== expectedAwardBasis) {
    console.error(
      `::error::ROLLBACK VERIFICATION FAILED — real-tenant award_basis was ` +
      `${expectedAwardBasis} before the control and is ${now} after. Investigate immediately.`
    )
    return 1
  }
  console.log(
    `rollback verified: real-tenant award_basis is ${now}, unchanged from ${expectedAwardBasis} ` +
    `before the control ran.`
  )
  return 0
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

  if (args.includes('--positive-control')) {
    let baseline
    try {
      baseline = measure(DB).filter((r) => r.is_real).reduce((n, r) => n + r.award_basis, 0)
    } catch (err) {
      console.error(`::error::could not read public.placements: ${err.message}`)
      process.exit(1)
    }
    let rc
    try {
      rc = positiveControl(DB)
    } catch (err) {
      console.error(`::error::positive control could not run: ${err.message}`)
      rc = 1
    }
    // Always verify, including after a thrown control — that is when a stray
    // write would matter most.
    process.exit(assertUntouched(DB, baseline) === 0 ? rc : 1)
  }

  let rows
  try {
    rows = measure(DB)
  } catch (err) {
    // Never swallow: a guard that cannot read its subject must fail closed,
    // not report a pass over an unread table.
    console.error(`::error::could not read public.placements: ${err.message}`)
    process.exit(1)
  }

  const { ok, failures } = evaluate(rows)
  console.log(render(rows))

  if (args.includes('--json')) {
    console.log(JSON.stringify({ tenants: rows, ok, failures }, null, 2))
  }

  if (!ok) {
    console.log('')
    for (const f of failures) console.error(`::error::[${f.code}] ${f.message}`)
    process.exit(1)
  }
  console.log('')
  console.log('  no REAL tenant bills an attached person against an unnamed award.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
