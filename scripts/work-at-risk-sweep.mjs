#!/usr/bin/env node
/**
 * scripts/work-at-risk-sweep.mjs — a branch nobody is watching is work nobody
 * can recover once its worktree is gone.
 *
 * THE INCIDENT BEHIND THIS FILE. A single sweep on 2026-08-30 found 2,216
 * unreachable commits, 4 stashes and 1 destroyed edit sitting on refs nothing
 * pointed at — and the operator has had to say "capture the work at risk, no
 * exceptions" fourteen separate times before this gate existed. Work does not
 * go missing because someone deletes it on purpose; it goes missing because a
 * branch sits ahead of `development` with no PR, nobody notices for weeks, and
 * the branch is eventually pruned by something else that only asked "is this
 * merged?" and got the wrong answer for a reason that had nothing to do with
 * the commits themselves.
 *
 * WHAT THIS GATE DOES AND DOES NOT PROVE.
 *
 *   WORK-AT-RISK   ahead of development, no open PR, tip commit >24h old.
 *                  Listed in the standing issue. Never touched.
 *   STALE-MERGED   ahead_by 0 (fully contained in development) OR a merged PR
 *                  exists for it, AND no open PR, AND GitHub branch
 *                  protection is not set on it. Candidate for deletion —
 *                  never main/master/development, defended at the deletion
 *                  call site as well as in classification, so a caller that
 *                  gets classify() to say the wrong thing still cannot delete
 *                  a protected name.
 *   everything else is left alone and not reported.
 *
 * It does NOT prove a branch is safe to delete beyond "GitHub says it has no
 * unique commits and no open PR" — a branch that was merged by copying its
 * diff into a fresh commit (no fast-forward, no PR) would still show ahead_by
 * > 0 and stay WORK-AT-RISK, which is the conservative failure: it gets
 * listed for a human, never silently dropped.
 *
 * Usage:
 *   node scripts/work-at-risk-sweep.mjs                      # full sweep, all 7 repos
 *   node scripts/work-at-risk-sweep.mjs --repos=bsuite,crm7  # scope to named repos
 *   node scripts/work-at-risk-sweep.mjs --out report.json    # also write the JSON summary
 *   node scripts/work-at-risk-sweep.mjs --issue-body body.md # also write the issue body
 *   node scripts/work-at-risk-sweep.mjs --delete             # delete STALE-MERGED branches for real
 *   node scripts/work-at-risk-sweep.mjs --self-test           # no network; disposable local repo
 *
 * Exit codes: 0 clean run (findings are reported, not a failure — this is a
 * non-required scheduled gate, not a merge blocker); 1 self-test failure or a
 * repo could not be read at all; 2 a structurally broken run (examined zero
 * repos or the branch listing itself came back empty for every repo, which
 * means the token could not see anything rather than the estate being tidy).
 */
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);

/** GitHub owner every repo below lives under. */
export const OWNER = 'GaryOcean428';

/** The seven repos this sweep examines by default: bsuite and its six apps. */
export const REPOS = ['bsuite', 'crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4'];

/** Branches this tool never classifies and never deletes, by name alone. */
export const PROTECTED_NAMES = new Set(['main', 'master', 'development']);

/** A branch whose tip is older than this and has no open PR is at risk. */
export const STALE_THRESHOLD_HOURS = 24;

/** Hours between `now` and an ISO date string. Exported for the self-test. */
export function ageHours(dateIso, now = new Date()) {
  return (now.getTime() - new Date(dateIso).getTime()) / 3_600_000;
}

/**
 * Pure classification — no network, no filesystem, no git. Exported and
 * unit-tested directly by --self-test, and it is the SAME function driving
 * both the real `gh api` sweep and the local-git self-test below: a
 * classification bug fails identically in both places rather than only in
 * whichever surface happened to be exercised.
 */
export function classify({ branch, aheadBy, hasOpenPR, merged, tipAgeHours, protectedFlag }) {
  if (PROTECTED_NAMES.has(branch)) {
    return { verdict: 'PROTECTED', reason: 'main/master/development are never classified or deleted by this tool' };
  }
  if (hasOpenPR) {
    return { verdict: 'OK', reason: 'has an open PR' };
  }
  if (aheadBy === 0 || merged) {
    if (protectedFlag) {
      return { verdict: 'OK', reason: 'fully merged/contained, but GitHub branch protection forbids deletion' };
    }
    return {
      verdict: 'STALE-MERGED',
      reason: aheadBy === 0
        ? 'fully contained in development (ahead_by 0, no open PR)'
        : 'a merged PR was found for this branch (no open PR)',
    };
  }
  if (aheadBy === null || aheadBy === undefined) {
    return { verdict: 'ERROR', reason: 'ahead_by could not be determined (compare call failed)' };
  }
  if (aheadBy > 0 && tipAgeHours > STALE_THRESHOLD_HOURS) {
    return {
      verdict: 'WORK-AT-RISK',
      reason: `${aheadBy} commit(s) ahead of development, no open PR, tip is ${tipAgeHours.toFixed(1)}h old`,
    };
  }
  return {
    verdict: 'OK',
    reason: aheadBy > 0 ? `only ${tipAgeHours.toFixed(1)}h old (< ${STALE_THRESHOLD_HOURS}h threshold)` : 'no unique commits',
  };
}

/**
 * Delete one remote branch. `remove` is injected so production (gh api DELETE)
 * and the self-test (a real git command against a disposable bare repo) share
 * this exact refusal path — "must refuse main/development even if asked" is
 * proven here, not re-implemented per caller. `remove` is NEVER invoked for a
 * protected name: the refusal happens before any command runs.
 */
export async function deleteBranch({ repo, branch, remove }) {
  if (PROTECTED_NAMES.has(branch)) {
    return {
      repo, branch, deleted: false, refused: true,
      reason: `refusing to delete protected branch '${branch}' on ${repo} — main/master/development are never deleted by this tool`,
    };
  }
  await remove();
  return { repo, branch, deleted: true, refused: false, reason: 'deleted' };
}

// ---------------------------------------------------------------------------
// Production data sources — gh api against the real GitHub API.
// ---------------------------------------------------------------------------

async function ghApi(args) {
  const { stdout } = await run('gh', ['api', ...args], { maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

async function listBranches(repo) {
  const stdout = await ghApi([
    `repos/${OWNER}/${repo}/branches`, '--paginate',
    '--jq', '.[] | {name: .name, sha: .commit.sha, protected: .protected}',
  ]);
  return stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

async function commitDate(repo, sha) {
  const stdout = await ghApi([`repos/${OWNER}/${repo}/commits/${sha}`, '--jq', '.commit.committer.date']);
  return stdout.trim();
}

async function aheadByRemote(repo, branch) {
  try {
    const stdout = await ghApi([
      `repos/${OWNER}/${repo}/compare/development...${encodeURIComponent(branch)}`, '--jq', '.ahead_by',
    ]);
    return Number(stdout.trim());
  } catch {
    return null;
  }
}

async function prInfo(repo, branch) {
  // `--method GET` is NOT optional here: `gh api` silently switches to POST
  // the moment any `-f`/`-F` field is present unless the method is pinned,
  // which against /pulls means "create a pull request" rather than "list
  // pull requests" — caught live against bsuite (422 "base" wasn't supplied,
  // i.e. it tried to OPEN a PR from a branch that already exists).
  const stdout = await ghApi([
    `repos/${OWNER}/${repo}/pulls`, '--method', 'GET', '-f', `head=${OWNER}:${branch}`, '-f', 'state=all',
    '--jq', '[.[] | {state: .state, merged_at: .merged_at}]',
  ]);
  const prs = JSON.parse(stdout || '[]');
  return {
    hasOpenPR: prs.some((p) => p.state === 'open'),
    merged: prs.some((p) => p.merged_at),
  };
}

async function deleteRemoteBranch(repo, branch) {
  // refs/heads/<branch> is a literal multi-segment path for a branch with
  // slashes in its name — GitHub's own docs show it unencoded. `main`
  // guards against ever reaching here for a protected name; this is the
  // execution edge, not the decision.
  await run('gh', ['api', '-X', 'DELETE', `repos/${OWNER}/${repo}/git/refs/heads/${branch}`]);
}

/** Sweep one repo. Returns { repo, rows, error }. Never throws. */
export async function sweepRepo(repo, deps) {
  let branches;
  try {
    branches = await deps.listBranches(repo);
  } catch (e) {
    return { repo, rows: [], branchesSeen: 0, error: String((e && (e.stderr || e.message)) || e).split('\n')[0].slice(0, 200) };
  }
  const rows = [];
  for (const b of branches) {
    if (PROTECTED_NAMES.has(b.name)) continue; // not examined per the task's own scope
    const [ahead, pr, date] = await Promise.all([
      deps.aheadBy(repo, b.name),
      deps.prInfo(repo, b.name),
      deps.commitDate(repo, b.sha),
    ]);
    const tipAgeHours = date ? ageHours(date) : null;
    const verdict = classify({
      branch: b.name, aheadBy: ahead, hasOpenPR: pr.hasOpenPR, merged: pr.merged,
      tipAgeHours: tipAgeHours ?? 0, protectedFlag: !!b.protected,
    });
    rows.push({
      repo, branch: b.name, sha: b.sha, aheadBy: ahead, hasOpenPR: pr.hasOpenPR,
      merged: pr.merged, tipAgeHours, protectedFlag: !!b.protected, ...verdict,
    });
  }
  return { repo, rows, branchesSeen: branches.length, error: null };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function formatReport(results) {
  const lines = [];
  let examined = 0;
  let atRisk = [];
  let deletable = [];
  let errors = [];

  for (const r of results) {
    if (r.error) {
      errors.push(r);
      lines.push(`## ${r.repo} — COULD NOT BE READ`);
      lines.push(`  ${r.error}`);
      lines.push('');
      continue;
    }
    lines.push(`## ${r.repo} (${r.rows.length} branch(es) examined, ${r.branchesSeen} total incl. protected)`);
    if (r.rows.length === 0) {
      lines.push('  (no branches other than main/master/development)');
    }
    for (const row of r.rows) {
      if (row.verdict === 'OK') continue; // quiet on the common case
      const age = row.tipAgeHours === null ? 'unknown age' : `${row.tipAgeHours.toFixed(1)}h old`;
      lines.push(`  [${row.verdict}] ${row.branch} — ahead_by=${row.aheadBy ?? '?'}, openPR=${row.hasOpenPR}, ${age} — ${row.reason}`);
    }
    lines.push('');
    examined += r.rows.length;
    atRisk = atRisk.concat(r.rows.filter((row) => row.verdict === 'WORK-AT-RISK').map((row) => ({ ...row })));
    deletable = deletable.concat(r.rows.filter((row) => row.verdict === 'STALE-MERGED').map((row) => ({ ...row })));
  }

  const guardLine = `[work-at-risk-sweep] examined ${examined} branch(es) across ${results.length} repo(s); ${atRisk.length} at risk, ${deletable.length} deletable`;
  lines.push(guardLine);
  return { text: lines.join('\n'), examined, atRisk, deletable, errors, guardLine };
}

function buildIssueBody(summary, runUrl) {
  const lines = [];
  lines.push(`Sweep run: ${runUrl || '(local)'}`);
  lines.push('');
  if (summary.atRisk.length === 0) {
    lines.push('No branches are currently at risk. This issue is cleared automatically when it clears — a recurrence reopens the same thread rather than starting a new one.');
    return lines.join('\n');
  }
  lines.push(`**${summary.atRisk.length} branch(es) at risk** — ahead of development, no open PR, tip >24h old.`);
  lines.push('');
  const byRepo = new Map();
  for (const row of summary.atRisk) {
    if (!byRepo.has(row.repo)) byRepo.set(row.repo, []);
    byRepo.get(row.repo).push(row);
  }
  for (const [repo, rows] of byRepo) {
    lines.push(`### ${repo}`);
    for (const row of rows.sort((a, b) => (b.tipAgeHours ?? 0) - (a.tipAgeHours ?? 0))) {
      const age = row.tipAgeHours === null ? 'unknown age' : `${row.tipAgeHours.toFixed(1)}h`;
      lines.push(`- \`${row.branch}\` — ${row.aheadBy} commit(s) ahead, tip ${age} old`);
    }
    lines.push('');
  }
  if (summary.deletable.length > 0) {
    lines.push(`(${summary.deletable.length} additional branch(es) are STALE-MERGED and are candidates for cleanup by a scheduled \`delete=true\` run — not listed here, since they are not at risk.)`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Self-test — a disposable local git repo with a bare origin. No network,
// no gh api. The classification and deletion-refusal paths are proven
// against a REAL git repository, not a fixture object, because the deletion
// path is destructive and the estate's own precedent
// (feedback_a_safety_check_in_the_same_command_as_the_delete_gates_nothing)
// is that a safety check proves nothing unless it is exercised for real.
// ---------------------------------------------------------------------------

function git(cwd, args, env) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } }).trim();
}

async function selfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'work-at-risk-'));
  let failed = 0;
  const cases = [];
  const t = (name, ok, detail) => {
    cases.push({ name, ok, detail });
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` — ${detail ?? ''}`}`);
    if (!ok) failed += 1;
  };

  try {
    const bare = path.join(tmp, 'origin.git');
    const work = path.join(tmp, 'work');
    git(tmp, ['init', '--bare', '-q', bare]);
    git(tmp, ['clone', '-q', bare, work]);
    git(work, ['config', 'user.name', 'Work At Risk Self Test']);
    git(work, ['config', 'user.email', 'selftest@example.invalid']);
    git(work, ['checkout', '-q', '-b', 'development']);
    fs.writeFileSync(path.join(work, 'README.md'), 'seed\n');
    git(work, ['add', 'README.md']);
    git(work, ['commit', '-q', '-m', 'seed development']);
    git(work, ['push', '-q', 'origin', 'development']);

    const now = new Date();
    const old = new Date(now.getTime() - 48 * 3_600_000).toISOString();

    // Case 1: at risk — ahead of development, no PR, tip 48h old.
    git(work, ['checkout', '-q', '-b', 'feat/at-risk', 'development']);
    fs.writeFileSync(path.join(work, 'at-risk.txt'), 'work in progress\n');
    git(work, ['add', 'at-risk.txt']);
    git(work, ['commit', '-q', '-m', 'unfinished work'], { GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old });
    git(work, ['push', '-q', 'origin', 'feat/at-risk']);

    // Case 2: merged-empty — merged into development, so ahead_by becomes 0.
    git(work, ['checkout', '-q', '-b', 'chore/merged-empty', 'development']);
    fs.writeFileSync(path.join(work, 'merged.txt'), 'small fix\n');
    git(work, ['add', 'merged.txt']);
    git(work, ['commit', '-q', '-m', 'small fix']);
    git(work, ['checkout', '-q', 'development']);
    git(work, ['merge', '-q', '--no-ff', '-m', 'merge small fix', 'chore/merged-empty']);
    git(work, ['push', '-q', 'origin', 'development']);
    git(work, ['push', '-q', 'origin', 'chore/merged-empty']);

    // Case 3: active-with-pr — ahead of development, no merge, but a PR
    // stub is asserted true (this repo is disposable and never talks to
    // GitHub, so the "open PR" signal is fabricated data, not a live call).
    git(work, ['checkout', '-q', '-b', 'feat/active-with-pr', 'development']);
    fs.writeFileSync(path.join(work, 'active.txt'), 'has a PR open\n');
    git(work, ['add', 'active.txt']);
    git(work, ['commit', '-q', '-m', 'work with an open PR'], { GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old });
    git(work, ['push', '-q', 'origin', 'feat/active-with-pr']);

    // Case 4 (negative control): fresh WIP — ahead, no PR, but pushed
    // moments ago. Must NOT alarm; a detector that flags fresh work as
    // "at risk" is flagging everything, which is the same as flagging
    // nothing.
    git(work, ['checkout', '-q', '-b', 'feat/fresh-wip', 'development']);
    fs.writeFileSync(path.join(work, 'fresh.txt'), 'just pushed\n');
    git(work, ['add', 'fresh.txt']);
    git(work, ['commit', '-q', '-m', 'just pushed']);
    git(work, ['push', '-q', 'origin', 'feat/fresh-wip']);

    git(work, ['fetch', '-q', 'origin']);

    const localAheadBy = (branch) => Number(git(work, ['rev-list', '--count', `origin/development..origin/${branch}`]));
    const localTipDate = (branch) => git(work, ['log', '-1', '--format=%cI', `origin/${branch}`]);

    const rows = {
      'feat/at-risk': classify({
        branch: 'feat/at-risk', aheadBy: localAheadBy('feat/at-risk'), hasOpenPR: false, merged: false,
        tipAgeHours: ageHours(localTipDate('feat/at-risk'), now), protectedFlag: false,
      }),
      'chore/merged-empty': classify({
        branch: 'chore/merged-empty', aheadBy: localAheadBy('chore/merged-empty'), hasOpenPR: false, merged: false,
        tipAgeHours: ageHours(localTipDate('chore/merged-empty'), now), protectedFlag: false,
      }),
      'feat/active-with-pr': classify({
        branch: 'feat/active-with-pr', aheadBy: localAheadBy('feat/active-with-pr'), hasOpenPR: true, merged: false,
        tipAgeHours: ageHours(localTipDate('feat/active-with-pr'), now), protectedFlag: false,
      }),
      'feat/fresh-wip': classify({
        branch: 'feat/fresh-wip', aheadBy: localAheadBy('feat/fresh-wip'), hasOpenPR: false, merged: false,
        tipAgeHours: ageHours(localTipDate('feat/fresh-wip'), now), protectedFlag: false,
      }),
    };

    t('an old, unmerged, PR-less branch is WORK-AT-RISK', rows['feat/at-risk'].verdict === 'WORK-AT-RISK', rows['feat/at-risk'].verdict);
    t('a branch merged into development (ahead_by 0) is STALE-MERGED', rows['chore/merged-empty'].verdict === 'STALE-MERGED', rows['chore/merged-empty'].verdict);
    t('an old, unmerged branch WITH an open PR is OK, not at risk', rows['feat/active-with-pr'].verdict === 'OK', rows['feat/active-with-pr'].verdict);
    t('fresh WIP (<24h, no PR) is OK — the detector does not cry wolf', rows['feat/fresh-wip'].verdict === 'OK', rows['feat/fresh-wip'].verdict);

    // The deletion path, for real, against the disposable bare repo.
    let removeCalled = false;
    const del = await deleteBranch({
      repo: 'self-test/origin', branch: 'chore/merged-empty',
      remove: () => { removeCalled = true; execFileSync('git', ['-C', bare, 'branch', '-D', 'chore/merged-empty']); },
    });
    const stillOnRemoteAfterDelete = git(tmp, ['ls-remote', bare, 'refs/heads/chore/merged-empty']);
    t('deleteBranch() actually removes a STALE-MERGED ref from the bare origin', del.deleted === true && removeCalled === true, JSON.stringify(del));
    t('the deleted ref is gone from the bare origin', stillOnRemoteAfterDelete === '', `ls-remote still returned: ${stillOnRemoteAfterDelete}`);

    // The refusal, proven by the ref STILL BEING PRESENT afterward — not
    // merely by a returned flag. This is the literal "must refuse main/
    // development even if asked" requirement.
    let devRemoveCalled = false;
    const delDev = await deleteBranch({
      repo: 'self-test/origin', branch: 'development',
      remove: () => { devRemoveCalled = true; execFileSync('git', ['-C', bare, 'branch', '-D', 'development']); },
    });
    const devStillPresent = git(tmp, ['ls-remote', bare, 'refs/heads/development']);
    t('deleteBranch() refuses "development" and never invokes the remover', delDev.refused === true && devRemoveCalled === false, JSON.stringify(delDev));
    t('"development" is still present on the bare origin after the refused delete', devStillPresent !== '', 'ref vanished — the refusal did not actually protect it');

    let mainRemoveCalled = false;
    const delMain = await deleteBranch({
      repo: 'self-test/origin', branch: 'main',
      remove: () => { mainRemoveCalled = true; },
    });
    t('deleteBranch() refuses "main" even though it was never pushed to this repo', delMain.refused === true && mainRemoveCalled === false, JSON.stringify(delMain));
  } catch (e) {
    t('self-test harness ran without throwing', false, String(e && e.stack || e));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n[work-at-risk-sweep --self-test] ${cases.length - failed}/${cases.length} case(s) passed.`);
  return failed === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = { repos: null, out: null, issueBody: null, delete: false, selfTest: false, json: false };
  for (const a of argv) {
    if (a === '--self-test') flags.selfTest = true;
    else if (a === '--delete') flags.delete = true;
    else if (a === '--json') flags.json = true;
    else if (a.startsWith('--repos=')) flags.repos = a.slice('--repos='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--out=')) flags.out = a.slice('--out='.length);
    else if (a === '--out') flags.out = '__NEXT__';
    else if (a.startsWith('--issue-body=')) flags.issueBody = a.slice('--issue-body='.length);
    else if (a === '--issue-body') flags.issueBody = '__NEXT__';
    else if (flags.out === '__NEXT__') flags.out = a;
    else if (flags.issueBody === '__NEXT__') flags.issueBody = a;
    else if (a === '--help' || a === '-h') {
      console.log('usage: node scripts/work-at-risk-sweep.mjs [--repos=name,name] [--out file.json] [--issue-body body.md] [--delete] [--json] [--self-test]');
      process.exit(0);
    }
  }
  return flags;
}

async function main(argv) {
  const flags = parseArgs(argv.slice(2));
  if (flags.selfTest) process.exit(await selfTest());

  const repos = flags.repos && flags.repos.length ? flags.repos : REPOS;
  if (repos.length === 0) {
    console.error('work-at-risk-sweep: examined ZERO repos. That is a broken run, not a clean one.');
    process.exit(2);
  }

  const deps = { listBranches, aheadBy: aheadByRemote, prInfo, commitDate };
  const results = [];
  for (const repo of repos) {
    results.push(await sweepRepo(repo, deps));
  }

  const totalBranchesSeen = results.reduce((n, r) => n + (r.branchesSeen || 0), 0);
  if (totalBranchesSeen === 0) {
    console.error('work-at-risk-sweep: every repo came back with ZERO branches (including main/development). That means the token could not see anything, not that the estate is tidy.');
    console.error(results.map((r) => `  ${r.repo}: ${r.error || 'no branches at all'}`).join('\n'));
    process.exit(2);
  }

  const summary = formatReport(results);
  console.log(summary.text);

  if (flags.out) {
    fs.writeFileSync(flags.out, JSON.stringify({
      examined: summary.examined,
      repos: repos.length,
      atRisk: summary.atRisk,
      deletable: summary.deletable,
      errors: summary.errors.map((e) => ({ repo: e.repo, error: e.error })),
      guardLine: summary.guardLine,
    }, null, 2));
  }
  if (flags.issueBody) {
    fs.writeFileSync(flags.issueBody, buildIssueBody(summary, process.env.RUN_URL || ''));
  }

  if (flags.delete) {
    console.log('\n[work-at-risk-sweep] --delete: removing STALE-MERGED branches');
    for (const row of summary.deletable) {
      const result = await deleteBranch({
        repo: row.repo, branch: row.branch,
        remove: () => deleteRemoteBranch(row.repo, row.branch),
      });
      console.log(`  ${result.deleted ? 'deleted' : 'REFUSED'} ${result.repo}/${result.branch} — ${result.reason}`);
    }
  }

  if (summary.errors.length > 0) {
    console.error(`\nwork-at-risk-sweep: ${summary.errors.length} repo(s) could not be read at all — see above.`);
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main(process.argv).catch((e) => { console.error(e); process.exit(2); });
}
