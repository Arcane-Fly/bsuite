#!/usr/bin/env node
/**
 * IS THE ESTATE'S CRON WATCHDOG STILL ALIVE, AND WHAT IS IT SAYING?
 *
 * ---------------------------------------------------------------------------
 * THE INVERSION THIS HALF EXISTS TO COMPLETE
 * ---------------------------------------------------------------------------
 * `public.pg_cron_watchdog_check()` (crm7 migration 20261117000000) writes ONE
 * row to `public.cron_watchdog_checkins` on EVERY run, healthy or not. That is
 * deliberate and it is the whole design: a control that speaks only when
 * something is wrong makes a healthy estate and a dead control produce
 * identical silence.
 *
 * `sta-email-watch` failed 462 consecutive times over five days and nothing
 * said a word, because the only place it complained was
 * `cron.job_run_details`. `document-retention-sweep-daily` is still failing
 * every night, and `sync-award-rates-weekly` has never once succeeded.
 *
 * So the ALARM lives out here, and it fires on ABSENCE as readily as on a bad
 * verdict. This module owns exactly one decision — given the newest check-in
 * and the banked denominators, is this an alarm — and it is a separate file
 * from the workflow so that decision can be run against fixtures with no
 * database, no secrets and no network.
 *
 * ---------------------------------------------------------------------------
 * THE FIVE WAYS IT ALARMS
 * ---------------------------------------------------------------------------
 *   no_checkin         the table is empty
 *   stale              the newest check-in is older than --max-age-minutes
 *   unhealthy          the newest check-in carries healthy = false
 *   denominator_drift  jobs_examined or manifest_rows no longer equals the bank
 *   unreadable_checkin ran_at could not be parsed at all
 *
 * A sixth case is handled by the workflow rather than here: the table not
 * EXISTING, which means the crm7 migration has not reached production and there
 * is no liveness proof for any scheduled control at all.
 *
 * The last one is the difference between "checked nothing" and "found nothing".
 * A check-in that examined 3 jobs instead of 25 is not a healthy estate, and a
 * manifest that quietly lost a row is not a shorter list of obligations. Both
 * numbers are equality-checked against `.github/cron-watchdog-baseline.json`,
 * and the message distinguishes a count that FELL (something disappeared) from
 * one that ROSE (something was added and nobody updated the bank) — because
 * those need opposite responses and a single "mismatch" hides which one it is.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES NOT ASSERT
 * ---------------------------------------------------------------------------
 *   * That any individual job did its work. It asserts the watchdog observed
 *     the estate recently and did not find a problem.
 *   * That the watchdog's own predicate is correct. That is proven separately,
 *     by crm7's pgTAP suite 91_pg_cron_watchdog_dead_mans_switch.sql, which
 *     plants five distinct violations through the real function.
 *   * Anything about a database it could not reach. The workflow fails on a
 *     connection error rather than reporting a pass, for the same reason.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 *   node scripts/check-cron-watchdog-checkin.mjs --checkin <file.json> \
 *        [--baseline .github/cron-watchdog-baseline.json] \
 *        [--max-age-minutes 45] [--now <ISO8601>]
 *   node scripts/check-cron-watchdog-checkin.mjs --self-test
 *
 * The check-in file holds the JSON object `row_to_json` produced for the newest
 * row, or the four bytes `null` when there is no row at all.
 *
 * EXIT 0 = no alarm. EXIT 1 = alarm (the workflow then opens or updates one
 * issue titled with the reason). EXIT 2 = usage error.
 * ---------------------------------------------------------------------------
 */
import fs from 'node:fs'

export const DEFAULT_MAX_AGE_MINUTES = 45

/**
 * One issue per CLASS, titled from this map, so the observer updates a single
 * thread instead of opening a new one on every run. The wording is the issue
 * title verbatim after the "Cron watchdog: " prefix.
 */
export const TITLES = {
  no_checkin: 'no check-in has ever been recorded',
  unreadable_checkin: 'the newest check-in has an unreadable timestamp',
  stale: 'the watchdog has stopped checking in',
  denominator_drift: 'the watchdog denominators no longer match the bank',
  unhealthy: 'a scheduled control is unhealthy',
  healthy: 'healthy',
}

/**
 * @param {object|null} checkin  the newest row, or null when there is none
 * @param {{jobs_examined:number, manifest_rows:number}} bank
 * @param {{maxAgeMinutes:number, now:Date}} opts
 * @returns {{alarm:boolean, klass:string, reason:string, detail:string, ageMinutes:number|null}}
 *
 * `klass` is the STABLE half and `reason` the human half, and they are separate
 * on purpose. The workflow titles its issue from the class, because a title
 * built from `reason` would embed a changing minute count — "no check-in for
 * 210 minutes" — and open a BRAND NEW issue every thirty minutes forever. The
 * varying detail belongs in the body, where it is history rather than identity.
 */
export function verdict(checkin, bank, opts) {
  const maxAge = opts.maxAgeMinutes ?? DEFAULT_MAX_AGE_MINUTES
  const now = opts.now ?? new Date()

  if (checkin === null || checkin === undefined) {
    return {
      alarm: true,
      klass: 'no_checkin',
      reason: 'no check-in has ever been recorded',
      detail:
        'public.cron_watchdog_checkins is empty. Either the crm7 migration ' +
        '20261117000000 has not reached production, or cron-watchdog-every-15m ' +
        'has never once run. Silence here is the alarm, not the all-clear.',
      ageMinutes: null,
    }
  }

  const ranAt = new Date(checkin.ran_at)
  if (Number.isNaN(ranAt.getTime())) {
    return {
      alarm: true,
      klass: 'unreadable_checkin',
      reason: 'the newest check-in has an unreadable ran_at',
      detail: `ran_at was ${JSON.stringify(checkin.ran_at)}. A timestamp that cannot be parsed cannot be judged fresh.`,
      ageMinutes: null,
    }
  }

  const ageMinutes = Math.round((now.getTime() - ranAt.getTime()) / 60000)

  // STALENESS FIRST. A stale check-in's CONTENT is history, and reporting
  // "healthy" from a three-hour-old row is exactly the failure being closed.
  if (ageMinutes > maxAge) {
    return {
      alarm: true,
      klass: 'stale',
      reason: `no check-in for ${ageMinutes} minutes`,
      detail:
        `The newest check-in is from ${ranAt.toISOString()}, ${ageMinutes} minutes ago; ` +
        `the watchdog runs every 15 minutes and anything past ${maxAge} minutes means it ` +
        'has missed at least two runs. Check cron.job for cron-watchdog-every-15m, and ' +
        'cron.job_run_details for its last return_message.',
      ageMinutes,
    }
  }

  // DENOMINATORS BEFORE VERDICT. A fresh check-in over a shrunken sweep is the
  // most convincing false pass available.
  const drift = []
  for (const key of ['jobs_examined', 'manifest_rows']) {
    const seen = Number(checkin[key])
    const banked = Number(bank[key])
    if (!Number.isFinite(seen)) {
      drift.push(`${key} was ${JSON.stringify(checkin[key])}, which is not a number`)
    } else if (seen < banked) {
      drift.push(`${key} scanned ${seen}, less than the banked ${banked} — something disappeared`)
    } else if (seen > banked) {
      drift.push(
        `${key} scanned ${seen}, more than the banked ${banked} — something was added and ` +
          '.github/cron-watchdog-baseline.json was not raised to match',
      )
    }
  }
  if (drift.length > 0) {
    return {
      alarm: true,
      klass: 'denominator_drift',
      reason: 'the watchdog denominators no longer match the bank',
      detail: drift.join('; '),
      ageMinutes,
    }
  }

  if (checkin.healthy !== true) {
    const names = (checkin.unhealthy_jobs ?? [])
      .map((j) => `${j.jobname} (${String(j.reason ?? '').split(':')[0]})`)
      .join(', ')
    const missing = (checkin.expected_missing ?? []).map((m) => m.jobname).join(', ')
    const http = (checkin.http_failures ?? []).length
    const parts = []
    if (names) parts.push(`unhealthy jobs: ${names}`)
    if (missing) parts.push(`declared but not scheduled: ${missing}`)
    if (http) parts.push(`${http} http-layer failure(s) since the previous check-in`)
    return {
      alarm: true,
      klass: 'unhealthy',
      reason: 'the newest check-in reports an unhealthy estate',
      detail: parts.length > 0 ? parts.join('; ') : 'healthy = false with no detail recorded',
      ageMinutes,
    }
  }

  return {
    alarm: false,
    klass: 'healthy',
    reason: 'healthy',
    detail:
      `Check-in ${ageMinutes} minute(s) old; ${checkin.jobs_examined} cron job(s) examined ` +
      `against ${checkin.manifest_rows} manifest row(s); nothing unhealthy, nothing missing, ` +
      'no http-layer failure.',
    ageMinutes,
  }
}

/* -------------------------------------------------------------------------
 * SELF-TEST — the same entry point, over fixtures, with a planted violation
 * asserted non-zero and a clean fixture asserted zero. A gate never seen to
 * fail is not a gate; a gate never seen to PASS flags everything, which is the
 * same as flagging nothing.
 * ---------------------------------------------------------------------- */
const NOW = new Date('2026-09-03T08:00:00Z')
const BANK = { jobs_examined: 25, manifest_rows: 27 }

const healthyRow = (over = {}) => ({
  ran_at: '2026-09-03T07:52:00Z',
  healthy: true,
  jobs_examined: 25,
  manifest_rows: 27,
  unhealthy_jobs: [],
  expected_missing: [],
  http_failures: [],
  ...over,
})

function selfTest() {
  let failures = 0
  const check = (name, got, want) => {
    if (got === want) {
      console.log(`  ok   ${name}`)
    } else {
      console.error(`  FAIL ${name} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`)
      failures += 1
    }
  }
  const o = { maxAgeMinutes: DEFAULT_MAX_AGE_MINUTES, now: NOW }

  // CLEAN FIXTURE FIRST — if this alarms, every assertion below is vacuous.
  check('a fresh healthy check-in does NOT alarm', verdict(healthyRow(), BANK, o).alarm, false)

  // PLANT 1 — the dead-man's switch itself: no check-in at all.
  check('no check-in row at all alarms', verdict(null, BANK, o).alarm, true)
  check(
    '...and names absence, not a verdict',
    verdict(null, BANK, o).reason,
    'no check-in has ever been recorded',
  )

  // PLANT 2 — a stale check-in. The watchdog ran, then stopped.
  const stale = verdict(healthyRow({ ran_at: '2026-09-03T04:30:00Z' }), BANK, o)
  check('a check-in older than 45 minutes alarms', stale.alarm, true)
  check('...and reports the age', stale.reason, 'no check-in for 210 minutes')

  // A check-in exactly AT the boundary is not yet an alarm; one minute past is.
  check(
    'a check-in exactly at the threshold does not alarm',
    verdict(healthyRow({ ran_at: '2026-09-03T07:15:00Z' }), BANK, o).alarm,
    false,
  )
  check(
    'a check-in one minute past the threshold does',
    verdict(healthyRow({ ran_at: '2026-09-03T07:14:00Z' }), BANK, o).alarm,
    true,
  )

  // PLANT 3 — a fresh check-in that reports an unhealthy estate.
  const unhealthy = verdict(
    healthyRow({
      healthy: false,
      unhealthy_jobs: [{ jobname: 'document-retention-sweep-daily', reason: 'last_run_failed: failed' }],
    }),
    BANK,
    o,
  )
  check('healthy = false alarms', unhealthy.alarm, true)
  check(
    '...and names the job',
    unhealthy.detail.includes('document-retention-sweep-daily'),
    true,
  )

  // PLANT 4 — the denominator fell. This is "checked nothing", and it is the
  // one a fresh, healthy-looking check-in hides best.
  const shrunk = verdict(healthyRow({ jobs_examined: 3 }), BANK, o)
  check('a sweep smaller than the bank alarms', shrunk.alarm, true)
  check(
    '...and says scanned-less-than-banked rather than just "mismatch"',
    shrunk.detail.includes('less than the banked'),
    true,
  )

  // PLANT 5 — the denominator ROSE. A new job appeared and nobody declared it.
  const grew = verdict(healthyRow({ manifest_rows: 29 }), BANK, o)
  check('a manifest larger than the bank alarms', grew.alarm, true)
  check('...and says the bank was not raised', grew.detail.includes('was not raised'), true)

  // PLANT 6 — staleness is judged BEFORE content, so a stale row that claims to
  // be healthy still alarms, and alarms as stale.
  check(
    'a stale but "healthy" check-in alarms as stale, not as healthy',
    verdict(healthyRow({ ran_at: '2026-09-03T04:30:00Z' }), BANK, o).reason.startsWith('no check-in for'),
    true,
  )

  // Every alarming class must have a stable title, or the workflow opens a new
  // issue per run for whichever one it forgot.
  for (const k of ['no_checkin', 'unreadable_checkin', 'stale', 'denominator_drift', 'unhealthy']) {
    check(`class ${k} has a stable issue title`, typeof TITLES[k] === 'string' && TITLES[k].length > 0, true)
  }
  check(
    'a stale check-in titles by class, not by the minute count that changes every run',
    TITLES[verdict(healthyRow({ ran_at: '2026-09-03T04:30:00Z' }), BANK, o).klass],
    'the watchdog has stopped checking in',
  )

  console.log(
    failures === 0
      ? `\ncheck-cron-watchdog-checkin: 20/20 self-test(s) passed`
      : `\ncheck-cron-watchdog-checkin: ${failures} self-test(s) FAILED`,
  )
  return failures === 0 ? 0 : 1
}

/* ---------------------------------------------------------------------- */

function main(argv) {
  if (argv.includes('--self-test')) return selfTest()

  const arg = (name, fallback) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`))
    if (hit) return hit.slice(name.length + 3)
    const i = argv.indexOf(`--${name}`)
    return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
  }

  const checkinPath = arg('checkin', null)
  if (!checkinPath) {
    console.error('usage: check-cron-watchdog-checkin.mjs --checkin <file.json> [--baseline <file.json>] [--max-age-minutes N] [--now <ISO>]')
    return 2
  }
  const baselinePath = arg('baseline', '.github/cron-watchdog-baseline.json')
  const maxAgeMinutes = Number(arg('max-age-minutes', DEFAULT_MAX_AGE_MINUTES))
  const nowArg = arg('now', null)
  const now = nowArg ? new Date(nowArg) : new Date()

  let raw
  try {
    raw = fs.readFileSync(checkinPath, 'utf8').trim()
  } catch (e) {
    console.error(`::error::could not read the check-in projection at ${checkinPath}: ${e.message}. That is "could not check", not a pass.`)
    return 1
  }
  // An EMPTY file is not the same fact as the literal `null` psql emits for
  // "no row": empty means the query itself produced nothing, which is a broken
  // query, not an empty table. Both alarm; only one of them is about the estate.
  if (raw === '') {
    console.error(`::error::${checkinPath} is empty — the projection query returned no output at all. Refusing to read that as "no check-in yet".`)
    return 1
  }

  let checkin
  try {
    checkin = JSON.parse(raw)
  } catch (e) {
    console.error(`::error::${checkinPath} is not JSON: ${e.message}`)
    return 1
  }

  const bank = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  const v = verdict(checkin, bank, { maxAgeMinutes, now })

  // HEAD LINE FIRST, WITH THE DENOMINATORS, before any verdict — so a reader
  // scrolling the log sees what was examined before they see what was found.
  console.log(
    `[cron-watchdog] newest check-in: ${checkin ? `${v.ageMinutes} minute(s) old, ` +
      `${checkin.jobs_examined} job(s) examined against ${checkin.manifest_rows} manifest row(s)` : 'NONE'}` +
      ` | banked ${bank.jobs_examined} job(s) / ${bank.manifest_rows} manifest row(s)`,
  )
  console.log(`[cron-watchdog] verdict: ${v.alarm ? 'ALARM' : 'ok'} — ${v.reason}`)
  console.log(`[cron-watchdog] ${v.detail}`)

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `alarm=${v.alarm}\nclass=${v.klass}\ntitle=${TITLES[v.klass] ?? v.reason}\nreason=${v.reason}\ndetail=${v.detail.replace(/\n/g, ' ')}\n`,
    )
  }

  return v.alarm ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)))
}
