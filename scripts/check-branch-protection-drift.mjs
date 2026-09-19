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

/**
 * The estate, as `.gitmodules` plus the parent declare it. The dumps are
 * namespaced per repo under docs/security/branch-protection/<repo>/ — every
 * repo has a `main`, so the old flat `<branch>-<date>.json` scheme collided
 * across repos (bsuite#3141 finding 3). The first path segment under
 * `branch-protection/` is the repo slug; `GaryOcean428/<slug>` is the repo the
 * dump is compared against.
 */
const DEFAULT_REPOS = {
  'GaryOcean428/bsuite': '.',
  'GaryOcean428/crm7': 'crm7',
  'GaryOcean428/business-suite-unified': 'business-suite-unified',
  'GaryOcean428/conduit': 'conduit',
  'GaryOcean428/braden': 'braden',
  'GaryOcean428/throughput': 'throughput',
  'GaryOcean428/R80.4': 'R80.4',
};

/** Repo slug -> the checkout path of that repo (the parent itself for bsuite). */
export const REPOS = (() => {
  // `PROTECTION_REPOS` overrides the derived map entirely — "repos=A,B" or
  // "repos=A@checkout-path,…" for a bisect run over a subset. Absent, the
  // estate is read from .gitmodules + the parent, so a new submodule is
  // picked up without editing this file (the parent is always included).
  const override = process.env.PROTECTION_REPOS;
  if (override !== undefined) {
    const map = {};
    for (const part of override.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [slug, dir] = part.split('@');
      map[slug.startsWith('GaryOcean428/') ? slug : `GaryOcean428/${slug}`] = dir || slug;
    }
    return map;
  }
  try {
    const mods = fs.readFileSync(path.join(REPO_ROOT, '.gitmodules'), 'utf8');
    const map = { 'GaryOcean428/bsuite': '.' };
    for (const m of mods.matchAll(/^\s*path\s*=\s*(\S+)$/gm)) map[`GaryOcean428/${m[1]}`] = m[1];
    return map;
  } catch {
    return { ...DEFAULT_REPOS };
  }
})();

/** Newest committed dump per repo×branch: `<repo>/<branch>-<YYYYMMDD>.json`. */
export function newestDumps(dumpsDir) {
  if (!fs.existsSync(dumpsDir)) return [];
  const byRepoBranch = new Map();
  for (const entry of fs.readdirSync(dumpsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'rulesets') continue; // per-repo namespace only
    const repoDir = path.join(dumpsDir, entry.name);
    for (const file of fs.readdirSync(repoDir)) {
      const m = /^(.+)-(\d{8})\.json$/.exec(file);
      if (!m) continue;
      const [, branch, date] = m;
      const key = `${entry.name}/${branch}`;
      const prev = byRepoBranch.get(key);
      if (!prev || date > prev.date) byRepoBranch.set(key, { branch, date, file: path.join(repoDir, file), repoDir: entry.name });
    }
  }
  return [...byRepoBranch.values()].sort((a, b) => a.repoDir.localeCompare(b.repoDir) || a.branch.localeCompare(b.branch));
}

const enabled = (v) => Boolean(v && typeof v === 'object' ? v.enabled : v);

/**
 * Compare one banked dump against one live reading.
 * `live` is one of:
 *   { kind: 'protection', body }   the protection object
 *   { kind: 'unprotected' }        404, and the branch object says protected=false
 *   { kind: 'ambiguous', detail }  404, but the branch object says protected=true
 *   { kind: 'unreadable', detail } the call failed for any other reason
 * `dump.repo` is `GaryOcean428/<slug>`; `at` renders as `<slug>@<branch>` so a
 * finding names the repo it belongs to.
 */
export function compareBranch(dump, live) {
  const out = [];
  const at = `${dump.repo.split('/')[1]}@${dump.branch}`;

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

/** The branches whose protection defines the estate's posture — both on every repo. */
export const PROTECTED_BRANCHES = ['main', 'development'];

/**
 * Walk every committed dump (each namespaced under `<repo>/`) and compare it
 * against the live protection of `GaryOcean428/<repo>` via `read(slug, branch)`.
 * `repos` defaults to the derived estate map; the self-test pins its own so the
 * fixture's two repos are the whole universe. A repo×branch with no committed
 * dump is a finding, not a silent skip — a gate that checked 2 of 14 estate
 * branches must not render as green over 14.
 */
export function evaluate({ dumpsDir, read, repos = REPOS, reposExplicit = false }) {
  const dumps = newestDumps(dumpsDir);
  const findings = [];
  const seen = new Set(dumps.map((d) => `${d.repoDir}/${d.branch}`));
  for (const repoDir of Object.keys(repos).map((r) => r.split('/')[1]).sort()) {
    for (const branch of PROTECTED_BRANCHES) {
      if (!seen.has(`${repoDir}/${branch}`)) {
        findings.push({ severity: 'fail', branch: `${repoDir}/${branch}`, code: 'dump-missing',
          message: `${repoDir}/${branch}: no committed dump under docs/security/branch-protection/${repoDir}/ — this gate has checked nothing for that branch, which is not the same as having found nothing. Dump it (gh api repos/GaryOcean428/${repoDir}/branches/${branch}/protection).` });
      }
    }
  }
  for (const d of dumps) {
    const repo = Object.keys(repos).find((r) => r.split('/')[1] === d.repoDir);
    if (!repo) {
      // A dump directory outside the repo set: on the DERIVED estate map that is
      // a rogue directory compared against nothing (fail). Under an explicit
      // PROTECTION_REPOS subset it is simply out of scope for this run (warn) —
      // failing a deliberate bisect over repos it did not ask about would make
      // the subset unusable.
      findings.push({ severity: reposExplicit ? 'warn' : 'fail', branch: `${d.repoDir}@${d.branch}`, code: 'unknown-repo',
        message: `${d.repoDir}: dump directory is not part of ${reposExplicit ? 'the PROTECTION_REPOS set of this run' : '.gitmodules (plus the parent)'} and would be compared against nothing.` });
      continue;
    }
    let body;
    try {
      body = JSON.parse(fs.readFileSync(d.file, 'utf8'));
    } catch (err) {
      // Fail closed: an unparseable dump means this gate checked nothing for that
      // branch, which must never render as green.
      findings.push({ severity: 'fail', branch: `${d.repoDir}@${d.branch}`, code: 'dump-unparseable',
        message: `${d.repoDir}@${d.branch}: committed dump ${path.basename(d.file)} does not parse — ${err.message}` });
      continue;
    }
    findings.push(...compareBranch({ ...d, repo, body }, read(d.repoDir, d.branch)));
  }
  return { dumps, findings };
}

/* ------------------------------- live reader ------------------------------ */

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function readLive(slug, branch) {
  const repo = Object.keys(REPOS).find((r) => r.split('/')[1] === slug);
  if (!repo) return { kind: 'unreadable', detail: `${slug} is not a repo this gate knows (not the parent and not in .gitmodules).` };
  try {
    return { kind: 'protection', body: JSON.parse(gh(['api', `repos/${repo}/branches/${branch}/protection`])) };
  } catch (err) {
    const blob = `${err.stdout || ''}${err.stderr || ''}`;
    const is404 = /HTTP 404|Branch not protected|"status": *"404"/.test(blob);
    if (!is404) return { kind: 'unreadable', detail: blob.trim().split('\n')[0] || String(err.message) };
    // 404 is not conclusive. Ask the branch object whether it believes it is protected.
    try {
      const b = JSON.parse(gh(['api', `repos/${repo}/branches/${branch}`]));
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
  const bsuiteDir = path.join(dumpsDir, 'bsuite');
  const crm7Dir = path.join(dumpsDir, 'crm7');
  fs.mkdirSync(bsuiteDir, { recursive: true });
  fs.mkdirSync(crm7Dir, { recursive: true });
  const STRONG = {
    required_status_checks: { strict: false, contexts: ['build-and-test', 'gates'] },
    enforce_admins: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
    required_pull_request_reviews: { required_approving_review_count: 0 },
  };
  fs.writeFileSync(path.join(bsuiteDir, 'main-20260101.json'), JSON.stringify(STRONG));
  fs.writeFileSync(path.join(bsuiteDir, 'development-20260101.json'), JSON.stringify(STRONG));
  // An OLDER dump for the same branch must be ignored in favour of the newest.
  fs.writeFileSync(path.join(bsuiteDir, 'main-20250101.json'), JSON.stringify({ required_status_checks: { contexts: ['ancient-context'] } }));
  // A SECOND repo with the SAME branch name — the collision the flat layout
  // could not express (bsuite#3141 finding 3): crm7/main-….json must never be
  // compared against bsuite's main. crm7's dumps sit in their own directory.
  fs.writeFileSync(path.join(crm7Dir, 'main-20260101.json'), JSON.stringify(STRONG));
  fs.writeFileSync(path.join(crm7Dir, 'development-20260101.json'), JSON.stringify(STRONG));
  // The `rulesets/` sibling holds RULESET dumps (a different mechanism) whose
  // filenames — bsu-development-20260919.json — also match <branch>-<date>.json
  // with branch=bsu-development. It must stay invisible to this scan.
  const rulesetsDir = path.join(dumpsDir, 'rulesets');
  fs.mkdirSync(rulesetsDir, { recursive: true });
  fs.writeFileSync(path.join(rulesetsDir, 'bsu-development-20260919.json'), JSON.stringify(STRONG));

  const clone = (m) => JSON.parse(JSON.stringify(m));
  /** read(slug, branch) keyed by `<slug>@<branch>`; unset keys read identical-green. */
  const mkRead = (overrides) => (slug, branch) => {
    const v = overrides[`${slug}@${branch}`];
    if (v === undefined) return { kind: 'protection', body: clone(STRONG) };
    return typeof v === 'function' ? v() : v;
  };
  const weaken = (path_, fn) => () => { const b = clone(STRONG); fn(b); return { kind: 'protection', body: b }; };
  const cases = [
    ['identical live and banked passes', mkRead({}), { fail: 0, warn: 0 }],
    ['protection deleted fails, and names its repo', mkRead({ 'bsuite@main': { kind: 'unprotected' } }), { fail: 1, warn: 0, code: 'protection-absent', at: 'bsuite@main' }],
    ['404 with protected=true is ambiguous, not "removed"', mkRead({ 'crm7@main': { kind: 'ambiguous', detail: 'x' } }), { fail: 1, warn: 0, code: 'protection-ambiguous', at: 'crm7@main' }],
    ['unreadable is its own answer', mkRead({ 'bsuite@main': { kind: 'unreadable', detail: 'boom' } }), { fail: 1, warn: 0, code: 'protection-unreadable', at: 'bsuite@main' }],
    ['a removed context fails', mkRead({ 'bsuite@main': weaken(null, (b) => { b.required_status_checks.contexts = ['build-and-test']; }) }), { fail: 1, warn: 0, code: 'contexts-removed', at: 'bsuite@main' }],
    ['an added context only warns', mkRead({ 'bsuite@main': weaken(null, (b) => { b.required_status_checks.contexts.push('new-gate'); }) }), { fail: 0, warn: 1, code: 'dump-stale' }],
    ['enforce_admins switched off fails', mkRead({ 'bsuite@main': weaken(null, (b) => { b.enforce_admins.enabled = false; }) }), { fail: 1, warn: 0, code: 'enforce-admins-off', at: 'bsuite@main' }],
    ['force pushes switched on fails', mkRead({ 'bsuite@main': weaken(null, (b) => { b.allow_force_pushes.enabled = true; }) }), { fail: 1, warn: 0, code: 'force-pushes-on' }],
    ['deletions switched on fails', mkRead({ 'bsuite@main': weaken(null, (b) => { b.allow_deletions.enabled = true; }) }), { fail: 1, warn: 0, code: 'deletions-on' }],
    ['removing PR reviews fails', mkRead({ 'bsuite@main': weaken(null, (b) => { delete b.required_pull_request_reviews; }) }), { fail: 1, warn: 0, code: 'pr-reviews-removed' }],
    ['the 2026-09-07 incident, end to end', mkRead({ 'bsuite@main': { kind: 'unprotected' } }), { fail: 1, warn: 0, code: 'protection-absent' }],
    // bsuite#3141 plan case (a): weakening only repo 2 fails while repo 1 stays green.
    ['a weakening on repo 2 fails while repo 1 stays green', mkRead({ 'crm7@main': weaken(null, (b) => { b.enforce_admins.enabled = false; }) }), { fail: 1, warn: 0, code: 'enforce-admins-off', at: 'crm7@main' }],
  ];

  let bad = 0;
  const REPOS2 = { 'GaryOcean428/bsuite': '.', 'GaryOcean428/crm7': 'crm7' }; // the fixture's universe
  for (const [label, read, want] of cases) {
    const { findings } = evaluate({ dumpsDir, read, repos: REPOS2 });
    const fail = findings.filter((f) => f.severity === 'fail').length;
    const warn = findings.filter((f) => f.severity === 'warn').length;
    const codes = findings.map((f) => f.code);
    // Assert the MESSAGE the gate must produce, not only its counts: a gate whose
    // new path is silent passes a count-only self-test while telling nobody anything.
    const spoke = findings.every((f) => typeof f.message === 'string' && f.message.includes(f.branch) && f.message.length > 40);
    // `want.at`: the finding must name the REPO it belongs to — a count-only test
    // would pass with every finding mislabelled as another repo's branch.
    const atOk = want.at === undefined || findings.some((f) => f.branch === want.at);
    const ok = fail === want.fail && warn === want.warn && (!want.code || codes.includes(want.code)) && spoke && atOk;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}  [fail=${fail} warn=${warn} codes=${codes.join(',') || '-'} at=${[...new Set(findings.map((f) => f.branch))].join(',') || '-'} spoke=${spoke}]`);
  }

  // The newest-dump rule needs its own bite: if the older dump were read, the
  // identical-live case above would report 'ancient-context' as removed. Four
  // dumps are covered — both repos, both branches.
  const newest = newestDumps(dumpsDir);
  const newestOk = newest.length === 4
    && newest.find((n) => n.repoDir === 'bsuite' && n.branch === 'main')?.date === '20260101'
    && newest.every((n) => ['bsuite', 'crm7'].includes(n.repoDir));
  if (!newestOk) bad++;
  console.log(`  ${newestOk ? 'ok  ' : 'FAIL'} newest dump per repo×branch wins  [${newest.map((n) => `${n.repoDir}/${n.branch}@${n.date}`).join(', ')}]`);

  // The 2026-09-19 layout migration: a repo×branch with NO committed dump
  // (the mini fixture holds only bsuite/main) is a FAIL (dump-missing), never
  // a silent skip — this gate checked 2 of 14 estate branches the day it was
  // built, and only naming the gap stops the other 12 from rendering as green.
  const miniDir = path.join(os, 'mini');
  fs.mkdirSync(path.join(miniDir, 'bsuite'), { recursive: true });
  fs.writeFileSync(path.join(miniDir, 'bsuite', 'main-20260101.json'), JSON.stringify(STRONG));
  const missing = evaluate({ dumpsDir: miniDir, read: mkRead({}), repos: REPOS2 });
  const missingOk = missing.findings.some((f) => f.severity === 'fail' && f.code === 'dump-missing' && f.branch === 'bsuite/development')
    && missing.findings.some((f) => f.severity === 'fail' && f.code === 'dump-missing' && f.branch === 'crm7/main');
  if (!missingOk) bad++;
  console.log(`  ${missingOk ? 'ok  ' : 'FAIL'} a branch with no dump is dump-missing, not silent  [${missing.findings.filter((f) => f.code === 'dump-missing').map((f) => f.branch).join(', ') || '-'}]`);

  // An unparseable dump must FAIL, never silently skip.
  const badDir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'bpd-bad-'));
  const badRepoDir = path.join(badDir, 'bsuite');
  fs.mkdirSync(badRepoDir, { recursive: true });
  fs.writeFileSync(path.join(badRepoDir, 'main-20260101.json'), '{not json');
  const broken = evaluate({ dumpsDir: badDir, read: mkRead({}), repos: REPOS2 });
  const brokenOk = broken.findings.some((f) => f.severity === 'fail' && f.code === 'dump-unparseable' && f.branch === 'bsuite@main');
  if (!brokenOk) bad++;
  console.log(`  ${brokenOk ? 'ok  ' : 'FAIL'} an unparseable dump fails closed`);

  fs.rmSync(os, { recursive: true, force: true });
  fs.rmSync(badDir, { recursive: true, force: true });

  // State the DENOMINATOR, not just the verdict. A summary that says "all cases
  // pass" is indistinguishable from a run that executed no cases at all, and the
  // estate's watcher-of-watchers rejects exactly that — as it did to this guard on
  // its first registration, which is why this line names a number.
  const total = cases.length + 3; // + newest-dump-wins + dump-missing floor + unparseable-fails-closed
  console.log(
    bad === 0
      ? `[protection-drift] self-test: ${total}/${total} pass — ${total} case(s) exercised ` +
        `(${cases.length} comparison verdicts across TWO repos — bsuite and crm7, each with ` +
        `their own main dump — covering an identical read, a deleted protection object, an ` +
        `ambiguous 404, an unreadable one, a removed context, an added context that must only ` +
        `WARN, enforce_admins off, force pushes on, deletions on, removed PR reviews, and a ` +
        `weakening on repo 2 that fails while repo 1 stays green; plus newest-dump-per-repo-branch, ` +
        `a branch with no committed dump that must FAIL dump-missing, and an unparseable dump that ` +
        `must fail closed; the rulesets/ sibling of a different mechanism stays invisible)`
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
  const reposExplicit = process.env.PROTECTION_REPOS !== undefined;
  const { dumps, findings } = evaluate({ dumpsDir, read: readLive, reposExplicit });

  if (dumps.length === 0) {
    console.error('[protection-drift] no committed dump under docs/security/branch-protection/<repo>/.');
    console.error('  With no dump this gate has checked nothing, which is not the same as having');
    console.error('  found nothing. Dump each protected branch of each estate repo before relying');
    console.error('  on this gate (the README beside the dumps has the command).');
    return 1;
  }

  if (flags.has('--json')) {
    console.log(JSON.stringify({ repos: Object.keys(REPOS), scanned: dumps.map((d) => `${d.repoDir}/${d.branch}@${d.date}`), findings }, null, 2));
  } else {
    const compared = new Set(dumps.filter((d) => Object.keys(REPOS).some((r) => r.split('/')[1] === d.repoDir)).map((d) => d.repoDir));
    console.log(`[protection-drift] compared live protection against ${dumps.length} committed dump(s) across ${compared.size} repo(s)${reposExplicit ? ` (PROTECTION_REPOS subset: ${[...compared].join(', ')})` : ''}: ${dumps.map((d) => `${d.repoDir}/${d.branch}@${d.date}`).join(', ')}`);
    for (const f of findings) console.log(`  ${f.severity === 'fail' ? '::error::' : '::warning::'}${f.message}`);
    if (!findings.length) console.log('  no drift.');
  }

  return findings.some((f) => f.severity === 'fail') ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv));
}
