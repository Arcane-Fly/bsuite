#!/usr/bin/env node
/**
 * check-bot-merge-rollup.mjs — the estate's own automation merged over RED
 * guards, and no required context stopped it, because a bot cannot read a
 * non-required failure as advisory (bsuite#3141 finding 4; measured live on
 * the standing pointer-advance PR, which carried ~13 red checks while the
 * workflow kept arming auto-merge on it).
 *
 * THE INCENTIVE GAP THIS CLOSES
 *
 * Human lanes: red required checks block the merge button. Bot lanes: the bot
 * presses the button itself. If the bot treats non-required failures as
 * advisory — "some ratchet is red, not mine, merge anyway" — no guard anywhere
 * can stop that merge: the only actor who could is the one merging over it.
 * So this gate treats EVERY check on the bot's PR as load-bearing, required
 * or not.
 *
 * WHY NOT A REQUIRED CONTEXT, AND WHY THE GATE RUNS EVERY TICK
 *
 * Adding every guard as a required context fails the producibility gate
 * (path-filtered / if:-gated jobs never report on an ordinary PR) and would
 * deadlock pointer PRs. So the gate lives INSIDE the bot workflow and runs on
 * EVERY run, after the PR exists, before any arming:
 *
 *   all green           -> arm auto-merge (as before)
 *   any red             -> disarm auto-merge if armed + FAIL the run, naming
 *                          every red check (required or not)
 *   any pending         -> do not arm; exit 0 (checks still running)
 *   nothing to do       -> exit 0
 *   unreadable rollup   -> treated as red: disarm + fail. A bot that cannot
 *                          see must not press the button.
 *
 * THE PENDING TRAP — why the old arm-at-force-push shape was the incident
 *
 * GitHub auto-merge merges when REQUIRED checks conclude; nothing waits for a
 * non-required check. Arming while checks are pending merges over a red
 * non-required check by construction — exactly how #3145 landed with five red
 * checks. The gate therefore acts only on a fully-concluded rollup, and the
 * workflow now arms ONLY through this gate, never directly after the push.
 *
 * WHY NOT the commit-status rollup (commits/<sha>/status)
 *   This estate reports ~100 checks through check RUNS, not commit statuses;
 *   commits/<sha>/status read {state: pending, total_count: 0} on the standing
 *   PR's head while ~100 check runs existed. Wrong instrument.
 *
 * WHY `gh pr checks --json`
 *   Its `bucket` field already carries the semantics (pass / fail / skipping /
 *   pending), so no string matching on display names ("Edge function slug
 *   collisions") and no parsing of a human-format table.
 *
 * Exit codes: 0 all-green-or-waiting, 1 any red/unknown (after disarming), 2 usage.
 */

import { execFileSync } from 'node:child_process';

const REPO = process.env.GITHUB_REPOSITORY || 'GaryOcean428/bsuite';

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Bucket one check row into the gate's four states. */
export function bucketOf(row) {
  switch (row.bucket) {
    case 'pass': return 'pass';
    case 'fail':
    case 'cancel':          // a cancelled check is not a passing check
    case 'timed_out':       // and neither is a timed-out one
      return 'fail';
    case 'skipping': return 'skipping';
    // `pending` covers everything not yet concluded; an UNKNOWN bucket is
    // pending until proven otherwise — never "green by default".
    default: return 'pending';
  }
}

/**
 * Roll the check rows up: counts per state + the named red checks.
 * SKIPPED is counted separately, never as pass — a skipped required context
 * does not satisfy protection, and folding it into green would be a lie.
 */
export function rollupOf(rows) {
  const counts = { pass: 0, fail: 0, pending: 0, skipping: 0 };
  const red = [];
  for (const row of rows) {
    const b = bucketOf(row);
    if (b === 'pass') counts.pass += 1;
    else if (b === 'fail') {
      counts.fail += 1;
      red.push(row.workflow ? `${row.name} (${row.workflow})` : row.name);
    } else if (b === 'pending') counts.pending += 1;
    else counts.skipping += 1;
  }
  return { counts, red };
}

/**
 * The gate. `disarm` is a callable (injected so the self-test can prove the
 * disarm actually fires); it returns 'disarmed' | 'not-armed' | 'failed'.
 * `absent` says the standing PR does not exist yet (first runs, or the PR was
 * never opened) — nothing to gate and nothing to arm, which is a WAIT, not a
 * refusal: the unreadable-rollup verdict is for a PR that EXISTS but whose
 * checks cannot be read.
 * Verdicts:
 *   arm    — every check concluded green (at least one existed): safe to arm
 *   wait   — rollup not fully concluded, or no PR yet: do NOT arm this tick
 *   refuse — any red or an unreadable rollup: disarm, fail, name the reds
 */
export function evaluateRollup({ rows, disarm, subject, absent = false }) {
  const at = subject || 'the PR';
  if (absent) {
    return {
      verdict: 'wait', exit: 0,
      lines: [`no standing PR exists yet (${at}) — nothing to gate and nothing to arm this tick.`],
    };
  }
  const outcome = (want) => {
    let r;
    try { r = want ? want() : 'not-armed'; } catch { r = 'failed'; }
    return r === 'disarmed' || r === 'not-armed' || r === 'failed' ? r : 'failed';
  };
  const disarmLines = (was) => {
    if (was === 'disarmed') return [`auto-merge disarmed on ${at} — it can only be re-armed by a fully green rollup.`];
    if (was === 'not-armed') return [`auto-merge was not armed on ${at}; nothing to disarm — and it must not be armed until the rollup is fully green.`];
    return ['::warning title=Disarm failed::the disarm call did not succeed — remove auto-merge by hand (gh pr merge --disable-auto).'];
  };
  if (!Array.isArray(rows)) {
    const lines = [`::error title=Check rollup unreadable::could not read the check rollup for ${at} — treating UNKNOWN as red (a bot that cannot see must not press the button).`];
    lines.push(...disarmLines(outcome(disarm)));
    return { verdict: 'refuse', exit: 1, lines };
  }
  const { counts, red } = rollupOf(rows);
  const total = counts.pass + counts.fail + counts.pending + counts.skipping;

  if (counts.fail > 0) {
    const lines = [
      `::error title=Bot merge refused — ${counts.fail} red check(s) on ${at}::a bot cannot read a non-required failure as advisory. Red: ${red.join('; ')}`,
    ];
    lines.push(...disarmLines(outcome(disarm)));
    lines.push(`rollup: ${counts.pass} green, ${counts.fail} red, ${counts.pending} pending, ${counts.skipping} skipped of ${total} check(s).`);
    return { verdict: 'refuse', exit: 1, lines };
  }

  if (counts.pending > 0 || total === 0) {
    return {
      verdict: 'wait', exit: 0,
      lines: [`rollup not fully concluded on ${at} (${counts.pass} green, ${counts.pending} pending${total === 0 ? ', none started' : ''}) — NOT arming this tick. Auto-merge is only armed on a fully green rollup; arming while pending merges over a red non-required check, which is the #3145 incident.`],
    };
  }

  return {
    verdict: 'arm', exit: 0,
    lines: [`rollup fully green on ${at}: ${counts.pass} green, ${counts.skipping} skipped of ${total} check(s) — safe to arm.`],
  };
}

/* ------------------------------- self test ------------------------------- */

function selfTest() {
  let bad = 0;
  const row = (name, bucket, workflow) => ({ name, bucket, workflow });

  // The disarm callable is observed, not assumed — each verdict's proof is
  // that the gate CALLED it (or deliberately did not).
  let disarmCalls = 0;
  const disarm = () => { disarmCalls += 1; return 'disarmed'; };

  const cases = [
    {
      name: 'fully green rollup arms',
      rows: [row('a', 'pass', 'W'), row('b', 'pass', 'W'), row('c', 'skipping', 'W')],
      wantVerdict: 'arm', wantExit: 0, wantDisarm: 0, wantDisarmCalled: 0,
    },
    {
      name: 'one red NON-REQUIRED check refuses — the #3145 shape',
      rows: [row('a', 'pass', 'W'), row('own-package-freshness', 'fail', 'Own-package freshness')],
      wantVerdict: 'refuse', wantExit: 1, wantDisarm: 1, wantDisarmCalled: 1, wantLine: 'auto-merge disarmed',
    },
    {
      name: 'pending checks never arm — the arm-while-pending trap',
      rows: [row('a', 'pass', 'W'), row('b', 'pending', 'W')],
      wantVerdict: 'wait', wantExit: 0, wantDisarm: 0, wantDisarmCalled: 0,
    },
    {
      name: 'no checks started yet waits, and does not arm',
      rows: [],
      wantVerdict: 'wait', wantExit: 0, wantDisarm: 0, wantDisarmCalled: 0,
    },
    {
      name: 'a cancelled check is red, not green',
      rows: [row('a', 'pass', 'W'), row('b', 'cancel', 'W')],
      wantVerdict: 'refuse', wantExit: 1, wantDisarm: 1, wantDisarmCalled: 1, wantLine: 'auto-merge disarmed',
    },
    {
      name: 'an unreadable rollup (null) refuses and disarms',
      rows: null,
      wantVerdict: 'refuse', wantExit: 1, wantDisarm: 1, wantDisarmCalled: 1, wantLine: 'auto-merge disarmed',
    },
    {
      name: 'an unknown bucket is pending, never green-by-default',
      rows: [row('a', 'pass', 'W'), row('b', 'mystery', 'W')],
      wantVerdict: 'wait', wantExit: 0, wantDisarm: 0, wantDisarmCalled: 0,
    },
    {
      name: 'the disarm call failing is surfaced, not swallowed',
      rows: [row('a', 'fail', 'W')],
      disarm: () => { disarmCalls += 1; return 'failed'; }, wantVerdict: 'refuse', wantExit: 1, wantDisarm: 1, wantDisarmCalled: 1, wantLine: '::warning title=Disarm failed',
    },
    {
      name: 'refusal when auto-merge was never armed says so, without a scary warning',
      rows: [row('a', 'fail', 'W')],
      disarm: () => { disarmCalls += 1; return 'not-armed'; }, wantVerdict: 'refuse', wantExit: 1, wantDisarm: 1, wantDisarmCalled: 1, wantLine: 'auto-merge was not armed',
    },
    {
      name: 'a red check names its workflow in the error',
      rows: [row('schema-lag', 'fail', 'Schema Lag')],
      wantVerdict: 'refuse', wantExit: 1, wantDisarm: 1, wantDisarmCalled: 1, wantLine: 'Schema Lag',
    },
    {
      name: 'no standing PR yet is a wait, not a refusal',
      rows: [], absent: true,
      wantVerdict: 'wait', wantExit: 0, wantDisarm: 0, wantDisarmCalled: 0, wantLine: 'no standing PR exists yet',
    },
  ];

  for (const c of cases) {
    disarmCalls = 0;
    const res = evaluateRollup({ rows: c.rows, disarm: c.disarm || disarm, subject: 'PR #123', absent: c.absent || false });
    const named = !c.wantLine || res.lines.join('\n').includes(c.wantLine);
    const ok = res.verdict === c.wantVerdict && res.exit === c.wantExit && disarmCalls === c.wantDisarmCalled && named;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${c.name}  [verdict=${res.verdict} exit=${res.exit} disarmCalled=${disarmCalls}]`);
  }

  const total = cases.length;
  console.log(
    bad === 0
      ? `[bot-merge-rollup] self-test: ${total}/${total} pass — ${total} case(s) exercised ` +
        `(a green rollup that arms, one red NON-REQUIRED check that refuses and disarms — the ` +
        `#3145 shape, pending and not-started rollups that wait without arming, a cancelled ` +
        `check read as red, an unreadable rollup read as red, an unknown bucket read as ` +
        `pending, a failing disarm surfaced, and a refusal that names the red check's workflow)`
      : `[bot-merge-rollup] self-test: ${total - bad}/${total} pass — ${bad} case(s) FAILED`,
  );
  return bad === 0 ? 0 : 1;
}

/* ---------------------------------- main ---------------------------------- */

function main(argv) {
  const args = argv.slice(2).filter((a) => a !== '--arm');
  const arm = argv.slice(2).includes('--arm') && args.length !== argv.slice(2).length;
  if (args.length !== 1 || args[0] === '--help') {
    console.error('usage: node scripts/check-bot-merge-rollup.mjs [--arm] <branch-or-pr>   (--self-test for the hermetic suite)');
    return 2;
  }
  if (args[0] === '--self-test') return selfTest();

  const subject = args[0];
  // Does the standing PR exist at all? Absent is a WAIT (nothing to gate, nothing
  // to arm) — the unreadable-rollup refusal is for a PR that EXISTS but whose
  // checks cannot be read. `gh pr view` exits nonzero with "no pull requests"
  // when the branch has no PR.
  let prState = null;
  try {
    prState = gh(['pr', 'view', subject, '--repo', REPO, '--json', 'state', '--jq', '.state']);
  } catch { prState = null; }
  if (prState === null) {
    const res = evaluateRollup({ rows: [], subject, absent: true });
    for (const line of res.lines) console.log(line);
    return res.exit;
  }
  let rows;
  let ghErr;
  try {
    rows = JSON.parse(gh(['pr', 'checks', subject, '--repo', REPO, '--json', 'name,bucket,workflow']));
  } catch (err) {
    rows = null;
    ghErr = `${err.stdout || ''}${err.stderr || ''}`.trim().split('\n')[0];
  }
  const res = evaluateRollup({
    rows,
    subject: ghErr ? `${subject} (${ghErr})` : subject,
    disarm: () => {
      // Ask whether auto-merge is armed BEFORE calling --disable-auto: the call
      // fails when nothing is armed, and reporting that as a disarm failure
      // would be noise on every refusal. Tri-state, honestly.
      try {
        const number = subject.match(/^\d+$/) ? subject : gh(['pr', 'view', subject, '--repo', REPO, '--json', 'number', '--jq', '.number']);
        const armed = gh(['api', `repos/${REPO}/pulls/${number}`, '--jq', '.auto_merge != null']);
        if (armed.trim() === 'false') return 'not-armed';
        gh(['pr', 'merge', subject, '--repo', REPO, '--disable-auto']);
        return 'disarmed';
      } catch (e) {
        return 'failed';
      }
    },
  });
  for (const line of res.lines) console.log(line);

  // --arm: the arming decision lives IN the gate, keyed on its own verdict —
  // not on an exit code (exit 0 covers both "green" and "pending"), not on a
  // re-read of the rollup (a second call is a TOCTOU window between two reads).
  if (arm && res.verdict === 'arm') {
    try {
      gh(['pr', 'merge', subject, '--repo', REPO, '--auto', '--merge']);
      console.log(`auto-merge armed on ${subject} — rollup was fully green.`);
    } catch (e) {
      // The gate read is green; only the arming call failed. Not a gate failure —
      // the next hourly tick retries, and the PR stays mergeable by hand.
      console.log(`::warning title=Could not arm auto-merge::gh pr merge --auto failed for ${subject}; the PR is open and green, and can be merged by hand, or will retry next scheduled run.`);
      console.log(`${e.stderr || e.message}`.trim().split('\n')[0]);
    }
  } else if (arm) {
    console.log(`verdict ${res.verdict} — not arming this tick.`);
  }
  return res.exit;
}

if (process.argv[1] && process.argv[1].endsWith('check-bot-merge-rollup.mjs')) {
  process.exit(main(process.argv));
}