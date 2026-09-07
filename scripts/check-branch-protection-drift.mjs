#!/usr/bin/env node
/**
 * check-branch-protection-drift.mjs — branch protection is not in the repository,
 * so a change to it leaves no diff, no review and no trace. This gate compares the
 * COMMITTED dump under docs/security/branch-protection/ against LIVE protection and
 * fails when live is WEAKER than what was banked.
 *
 * THE INCIDENT BEHIND THIS FILE.
 *
 * On 2026-09-07, between 15:33 and 16:14 +08, `main` and `development` both LOST
 * classic branch protection entirely. main went from 34 required contexts,
 * enforce_admins=true, allow_force_pushes=false to no protection object at all —
 * production was force-pushable. The repository ruleset was edited in the same
 * window: it lost `non_fast_forward` and `required_linear_history`, and gained a
 * malformed ref pattern, `refs/heads/"main", "development"`, which is one literal
 * ref containing quotes and a comma and therefore matches no branch. That is the
 * shape of a shell-quoting accident, not a deliberate policy change.
 *
 * Nothing detected it. It was found by accident, during an unrelated audit, forty
 * minutes later. scripts/check-required-contexts-producible.mjs had already NAMED
 * this exact gap in its own header — "that the committed dump still matches LIVE
 * branch protection ... belongs in a nightly lane" — and the nightly lane did not
 * exist. This file is that lane.
 *
 * WHY THIS ONE IS BUILDABLE AND THE RLS EQUIVALENT WAS NOT.
 *
 * prod-rls-policy-drift-audit.yml declines to detect a VANISHED policy, and says
 * why: catching a disappearance needs a committed reference to diff against, which
 * needs "a snapshot file, a refresh protocol, and a rule about who may refresh it,
 * or it becomes a warning everyone silences". For branch protection all three
 * already exist — the dated dumps, the README beside them, and the rule that the PR
 * making a protection write re-dumps in the same PR. The objection does not
 * transfer; only the discipline does.
 *
 * WEAKER FAILS, STRONGER WARNS — AND THE ASYMMETRY IS THE POINT.
 *
 * A context ADDED live and not yet re-dumped is a stale dump: a bookkeeping lapse,
 * reported as a warning. A context REMOVED, enforce_admins switched off, or force
 * pushes or deletions switched on is a weakening of production and fails the job.
 * A gate that fails on both directions fires on every legitimate protection write
 * and gets switched off, which is worse than not having it.
 *
 * "NOT PROTECTED" AND "COULD NOT TELL" ARE DIFFERENT ANSWERS.
 *
 * GET /branches/{b}/protection returns 404 "Branch not protected" both when
 * protection is genuinely absent AND when the caller cannot see it. During the
 * 2026-09-07 investigation that same 404 was very nearly read as "protection was
 * removed" before a positive control — the identical call against another repo,
 * which returned 200 — proved the token could read protection where it existed.
 *
 * So a 404 here is not conclusive on its own. This gate consults the branch object:
 *
 *   protection 404 + branch.protected === false  ->  UNPROTECTED   (fail: it is gone)
 *   protection 404 + branch.protected === true   ->  AMBIGUOUS     (fail: say so, do
 *                                                    NOT claim it was removed — this
 *                                                    is the signature of a ruleset,
 *                                                    or of a token that cannot read
 *                                                    administration)
 *   any non-404 error                            ->  UNREADABLE    (fail: the
 *                                                    instrument failed, which is a
 *                                                    claim about the instrument and
 *                                                    not about the branch)
 *
 * All three fail the job. They print different sentences, because the fix for each
 * is different and a gate that cannot tell "checked nothing" from "found nothing"
 * is not a gate.
 *
 * WHAT THIS DOES NOT ASSERT — say it, so nobody reads more into a green tick:
 *   - that the RULESET is intact. Rulesets are a second, independent mechanism, and
 *     on this repo its bypass_actors include the account every lane uses, with
 *     bypass_mode "always" — so it constrains none of our own writes. Classic
 *     protection with enforce_admins=true is what actually binds here. Ruleset
 *     drift is worth a gate; it is not this one, and pretending otherwise would
 *     make this file's green tick mean less than it says.
 *   - that the banked dump was ever CORRECT. It asserts only that live has not
 *     drifted below it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = process.env.PROTECTION_REPO || 'GaryOcean428/bsuite';

/** Newest committed dump per branch: `<branch>-<YYYYMMDD>.json`. */
export function newestDumps(dumpsDir) {
  if (!fs.existsSync(dumpsDir)) return [];
  const byBranch = new Map();
  for (const file of fs.readdirSync(dumpsDir)) {
    const m = /^(.+)-(\d{8})\.json$/.exec(file);
    if (!m) continue;
    const [, branch, date] = m;
    const prev = byBranch.get(branch);
    if (!prev || date > prev.date) byBranch.set(branch, { branch, date, file: path.join(dumpsDir, file) });
  }
  return [...byBranch.values()].sort((a, b) => a.branch.localeCompare(b.branch));
}

const enabled = (v) => Boolean(v && typeof v === 'object' ? v.enabled : v);

/**
 * Compare one banked dump against one live reading.
 * `live` is one of:
 *   { kind: 'protection', body }   the protection object
 *   { kind: 'unprotected' }        404, and the branch object says protected=false
 *   { kind: 'ambiguous', detail }  404, but the branch object says protected=true
 *   { kind: 'unreadable', detail } the call failed for any other reason
 */
export function compareBranch(dump, live) {
  const out = [];
  const at = dump.branch;

  if (live.kind === 'unprotected') {
    out.push({ severity: 'fail', branch: at, code: 'protection-absent',
      message: `${at}: banked protection exists (${dump.date}) but the branch has NO protection object. It was removed outside a PR.` });
    return out;
  }
  if (live.kind === 'ambiguous') {
    out.push({ severity: 'fail', branch: at, code: 'protection-ambiguous',
      message: `${at}: protection reads 404 yet the branch reports protected=true. This is NOT proof it was removed — it is the signature of a ruleset, or of a token without administration:read. Resolve before trusting either answer. ${live.detail || ''}`.trim() });
    return out;
  }
  if (live.kind === 'unreadable') {
    out.push({ severity: 'fail', branch: at, code: 'protection-unreadable',
      message: `${at}: could not read live protection — this is a claim about the instrument, not about the branch. ${live.detail || ''}`.trim() });
    return out;
  }

  const bankedCtx = new Set(dump.body?.required_status_checks?.contexts ?? []);
  const liveCtx = new Set(live.body?.required_status_checks?.contexts ?? []);

  const removed = [...bankedCtx].filter((c) => !liveCtx.has(c)).sort();
  if (removed.length) {
    out.push({ severity: 'fail', branch: at, code: 'contexts-removed',
      message: `${at}: ${removed.length} required context(s) present in the ${dump.date} dump are GONE live: ${removed.join(', ')}` });
  }
  const added = [...liveCtx].filter((c) => !bankedCtx.has(c)).sort();
  if (added.length) {
    out.push({ severity: 'warn', branch: at, code: 'dump-stale',
      message: `${at}: ${added.length} context(s) live but not in the ${dump.date} dump — re-dump: ${added.join(', ')}` });
  }

  // Weakenings. Each fires only when the dump was the stronger setting.
  if (enabled(dump.body?.enforce_admins) && !enabled(live.body?.enforce_admins)) {
    out.push({ severity: 'fail', branch: at, code: 'enforce-admins-off',
      message: `${at}: enforce_admins was true when banked and is false live — admins now bypass every required check.` });
  }
  if (!enabled(dump.body?.allow_force_pushes) && enabled(live.body?.allow_force_pushes)) {
    out.push({ severity: 'fail', branch: at, code: 'force-pushes-on',
      message: `${at}: allow_force_pushes was false when banked and is true live — history on this branch can be rewritten.` });
  }
  if (!enabled(dump.body?.allow_deletions) && enabled(live.body?.allow_deletions)) {
    out.push({ severity: 'fail', branch: at, code: 'deletions-on',
      message: `${at}: allow_deletions was false when banked and is true live — the branch can be deleted.` });
  }
  if (dump.body?.required_pull_request_reviews && !live.body?.required_pull_request_reviews) {
    out.push({ severity: 'fail', branch: at, code: 'pr-reviews-removed',
      message: `${at}: required_pull_request_reviews was banked and is absent live — changes can land without a pull request.` });
  }
  return out;
}

export function evaluate({ dumpsDir, read }) {
  const dumps = newestDumps(dumpsDir);
  const findings = [];
  for (const d of dumps) {
    let body;
    try {
      body = JSON.parse(fs.readFileSync(d.file, 'utf8'));
    } catch (err) {
      // Fail closed: an unparseable dump means this gate checked nothing for that
      // branch, which must never render as green.
      findings.push({ severity: 'fail', branch: d.branch, code: 'dump-unparseable',
        message: `${d.branch}: committed dump ${path.basename(d.file)} does not parse — ${err.message}` });
      continue;
    }
    findings.push(...compareBranch({ ...d, body }, read(d.branch)));
  }
  return { dumps, findings };
}

/* ------------------------------- live reader ------------------------------ */

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function readLive(branch) {
  try {
    return { kind: 'protection', body: JSON.parse(gh(['api', `repos/${REPO}/branches/${branch}/protection`])) };
  } catch (err) {
    const blob = `${err.stdout || ''}${err.stderr || ''}`;
    const is404 = /HTTP 404|Branch not protected|"status": *"404"/.test(blob);
    if (!is404) return { kind: 'unreadable', detail: blob.trim().split('\n')[0] || String(err.message) };
    // 404 is not conclusive. Ask the branch object whether it believes it is protected.
    try {
      const b = JSON.parse(gh(['api', `repos/${REPO}/branches/${branch}`]));
      return b.protected
        ? { kind: 'ambiguous', detail: `branch object reports protected=true.` }
        : { kind: 'unprotected' };
    } catch (err2) {
      const blob2 = `${err2.stdout || ''}${err2.stderr || ''}`;
      return { kind: 'unreadable', detail: `protection 404 and the branch object also failed: ${blob2.trim().split('\n')[0] || err2.message}` };
    }
  }
}

/* -------------------------------- self test ------------------------------- */

function selfTest() {
  const os = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'bpd-'));
  const dumpsDir = path.join(os, 'dumps');
  fs.mkdirSync(dumpsDir, { recursive: true });
  const STRONG = {
    required_status_checks: { strict: false, contexts: ['build-and-test', 'gates'] },
    enforce_admins: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
    required_pull_request_reviews: { required_approving_review_count: 0 },
  };
  fs.writeFileSync(path.join(dumpsDir, 'main-20260101.json'), JSON.stringify(STRONG));
  // An OLDER dump for the same branch must be ignored in favour of the newest.
  fs.writeFileSync(path.join(dumpsDir, 'main-20250101.json'), JSON.stringify({ required_status_checks: { contexts: ['ancient-context'] } }));

  const clone = (m) => JSON.parse(JSON.stringify(m));
  const cases = [
    ['identical live and banked passes', () => ({ kind: 'protection', body: clone(STRONG) }), { fail: 0, warn: 0 }],
    ['protection deleted fails', () => ({ kind: 'unprotected' }), { fail: 1, warn: 0, code: 'protection-absent' }],
    ['404 with protected=true is ambiguous, not "removed"', () => ({ kind: 'ambiguous', detail: 'x' }), { fail: 1, warn: 0, code: 'protection-ambiguous' }],
    ['unreadable is its own answer', () => ({ kind: 'unreadable', detail: 'boom' }), { fail: 1, warn: 0, code: 'protection-unreadable' }],
    ['a removed context fails', () => { const b = clone(STRONG); b.required_status_checks.contexts = ['build-and-test']; return { kind: 'protection', body: b }; }, { fail: 1, warn: 0, code: 'contexts-removed' }],
    ['an added context only warns', () => { const b = clone(STRONG); b.required_status_checks.contexts.push('new-gate'); return { kind: 'protection', body: b }; }, { fail: 0, warn: 1, code: 'dump-stale' }],
    ['enforce_admins switched off fails', () => { const b = clone(STRONG); b.enforce_admins.enabled = false; return { kind: 'protection', body: b }; }, { fail: 1, warn: 0, code: 'enforce-admins-off' }],
    ['force pushes switched on fails', () => { const b = clone(STRONG); b.allow_force_pushes.enabled = true; return { kind: 'protection', body: b }; }, { fail: 1, warn: 0, code: 'force-pushes-on' }],
    ['deletions switched on fails', () => { const b = clone(STRONG); b.allow_deletions.enabled = true; return { kind: 'protection', body: b }; }, { fail: 1, warn: 0, code: 'deletions-on' }],
    ['removing PR reviews fails', () => { const b = clone(STRONG); delete b.required_pull_request_reviews; return { kind: 'protection', body: b }; }, { fail: 1, warn: 0, code: 'pr-reviews-removed' }],
    ['the 2026-09-07 incident, end to end', () => ({ kind: 'unprotected' }), { fail: 1, warn: 0, code: 'protection-absent' }],
  ];

  let bad = 0;
  for (const [label, read, want] of cases) {
    const { findings } = evaluate({ dumpsDir, read });
    const fail = findings.filter((f) => f.severity === 'fail').length;
    const warn = findings.filter((f) => f.severity === 'warn').length;
    const codes = findings.map((f) => f.code);
    // Assert the MESSAGE the gate must produce, not only its counts: a gate whose
    // new path is silent passes a count-only self-test while telling nobody anything.
    const spoke = findings.every((f) => typeof f.message === 'string' && f.message.includes(f.branch) && f.message.length > 40);
    const ok = fail === want.fail && warn === want.warn && (!want.code || codes.includes(want.code)) && spoke;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}  [fail=${fail} warn=${warn} codes=${codes.join(',') || '-'} spoke=${spoke}]`);
  }

  // The newest-dump rule needs its own bite: if the older dump were read, the
  // identical-live case above would report 'ancient-context' as removed.
  const newest = newestDumps(dumpsDir);
  const newestOk = newest.length === 1 && newest[0].date === '20260101';
  if (!newestOk) bad++;
  console.log(`  ${newestOk ? 'ok  ' : 'FAIL'} newest dump per branch wins  [${newest.map((n) => n.date).join(',')}]`);

  // An unparseable dump must FAIL, never silently skip.
  const badDir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'bpd-bad-'));
  fs.writeFileSync(path.join(badDir, 'main-20260101.json'), '{not json');
  const broken = evaluate({ dumpsDir: badDir, read: () => ({ kind: 'protection', body: {} }) });
  const brokenOk = broken.findings.some((f) => f.severity === 'fail' && f.code === 'dump-unparseable');
  if (!brokenOk) bad++;
  console.log(`  ${brokenOk ? 'ok  ' : 'FAIL'} an unparseable dump fails closed`);

  fs.rmSync(os, { recursive: true, force: true });
  fs.rmSync(badDir, { recursive: true, force: true });

  // State the DENOMINATOR, not just the verdict. A summary that says "all cases
  // pass" is indistinguishable from a run that executed no cases at all, and the
  // estate's watcher-of-watchers rejects exactly that — as it did to this guard on
  // its first registration, which is why this line names a number.
  const total = cases.length + 2; // + newest-dump-wins + unparseable-fails-closed
  console.log(
    bad === 0
      ? `[protection-drift] self-test: ${total}/${total} pass — ${total} case(s) exercised ` +
        `(${cases.length} comparison verdicts covering an identical read, a deleted ` +
        `protection object, an ambiguous 404, an unreadable one, a removed context, an ` +
        `added context that must only WARN, enforce_admins off, force pushes on, ` +
        `deletions on and removed PR reviews; plus newest-dump-per-branch and an ` +
        `unparseable dump that must fail closed)`
      : `[protection-drift] self-test: ${total - bad}/${total} pass — ${bad} case(s) FAILED`,
  );
  return bad === 0 ? 0 : 1;
}

/* ---------------------------------- main ---------------------------------- */

function main(argv) {
  const flags = new Set(argv.slice(2));
  for (const f of flags) {
    if (!['--json', '--self-test'].includes(f)) {
      console.error(`usage: node scripts/check-branch-protection-drift.mjs [--json] [--self-test]\n  unknown flag: ${f}`);
      return 2;
    }
  }
  if (flags.has('--self-test')) return selfTest();

  const dumpsDir = path.join(REPO_ROOT, 'docs', 'security', 'branch-protection');
  const { dumps, findings } = evaluate({ dumpsDir, read: readLive });

  if (dumps.length === 0) {
    console.error('[protection-drift] no committed dump under docs/security/branch-protection/.');
    console.error('  With no dump this gate has checked nothing, which is not the same as having');
    console.error('  found nothing. Dump each protected branch before relying on this gate.');
    return 1;
  }

  if (flags.has('--json')) {
    console.log(JSON.stringify({ scanned: dumps.map((d) => `${d.branch}@${d.date}`), findings }, null, 2));
  } else {
    console.log(`[protection-drift] compared live protection against ${dumps.length} committed dump(s): ${dumps.map((d) => `${d.branch}@${d.date}`).join(', ')}`);
    for (const f of findings) console.log(`  ${f.severity === 'fail' ? '::error::' : '::warning::'}${f.message}`);
    if (!findings.length) console.log('  no drift.');
  }

  return findings.some((f) => f.severity === 'fail') ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv));
}
