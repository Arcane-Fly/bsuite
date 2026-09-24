#!/usr/bin/env node
/**
 * check-ruleset-drift.mjs — the RULESET sibling of check-branch-protection-drift.mjs.
 *
 * Branch protection has two independent mechanisms on this estate. Classic
 * protection is banked and watched one directory up. Repository RULESETS are
 * the second mechanism, and until this file existed they had no bank and no
 * watch at all — the 2026-09-07 incident proved both layers can change in the
 * same window while only one of them leaves a diff in the classic dumps.
 *
 * THE INCIDENT BEHIND THIS FILE — bsuite#3165.
 *
 * The `default` ruleset on bsuite main (14254675) carried
 * `required_linear_history`, which forbids merge commits. The estate's
 * promotion policy (bsuite-ship-visual-promote, standing rulings) requires
 * merge commits: `gh pr merge --merge`, never `--squash`, never rebase,
 * because squash/rebase rewrite SHAs and a promotion PR is what records that
 * a development tree was promoted to production. The two rules cannot both be
 * satisfied — every development → main promotion was structurally
 * unmergeable, and the escape hatch in use was `--admin`, which is exactly
 * the habit of bypassing protection the drift gates exist to end. The rule
 * was removed from the ruleset on 2026-09-07 and ADR-0012 item 1 (operator
 * decision register, 2026-09-16) ratified the removal: **linear history is
 * not part of the desired posture on any repo; merge commits are the
 * sanctioned promotion mechanism.** This gate exists so that decision cannot
 * silently drift back.
 *
 * THE ONE ABSOLUTE RULE — required_linear_history must not exist live.
 *
 * Most of this gate is the classic gate's asymmetry (weakening fails,
 * strengthening warns) applied to a ruleset's `rules[].type` list. But
 * `required_linear_history` is special, and treating it as just another rule
 * would pass the very state this issue is about: if the BANKED dump carried
 * it, a live comparison would read its reappearance as "identical to banked"
 * and go green. It is not. Linear history on any banked ruleset FAILS even
 * when the dump agrees, because the ratified posture (ADR-0012 item 1) is
 * that it must not exist at all. A dump that banks it is itself stale and
 * must be re-dumped after the rule is removed.
 *
 * WEAKENING FAILS, STRENGTHENING WARNS — the same asymmetry as the classic
 * gate, and for the same reason: a gate that fires on every legitimate
 * protection write is one people switch off.
 *
 *   rule REMOVED live (non_fast_forward, deletion, creation,
 *   required_status_checks, pull_request, code_scanning, ...)  ->  FAIL
 *     (the branch lost a protection the estate banked)
 *   rule ADDED live                                            ->  WARN
 *     (strengthening; re-dump to record it)
 *   required_linear_history ADDED or PRESENT live              ->  FAIL
 *     (breaks the merge-commit promotion policy — the one absolute)
 *   required_linear_history REMOVED live                       ->  WARN
 *     (the ratified direction; re-dump to clear)
 *   enforcement active -> evaluate/disabled                    ->  FAIL
 *   ref pattern stops covering a ref it banked                 ->  FAIL
 *     (the 2026-09-07 incident also gained a malformed ref pattern that
 *     matched no branch — a ruleset that matches nothing protects nothing)
 *
 * FAIL CLOSED, AND SAY WHICH FAILURE IT IS.
 *
 * An unparseable dump, a dump that parses but does not identify its ruleset
 * (no source/name/id), a ruleset that vanished live, and an unreadable API
 * are four different sentences, and each of them fails the job. A gate that
 * cannot tell "checked nothing" from "found nothing" is not a gate.
 *
 * WHAT THIS DOES NOT ASSERT — say it, so nobody reads more into a green tick:
 *   - that bypass_actors are correct. Which roles can bypass a ruleset is
 *     bsuite#3141 territory (the default ruleset's bypass list includes the
 *     account every lane uses, with bypass_mode "always"); this gate watches
 *     the RULE LIST, not the bypass list, and a green tick here says nothing
 *     about who can bypass.
 *   - that classic protection is intact. That is the sibling gate one level
 *     up, which reads the classic dumps and would not see a ruleset change.
 *   - that a banked dump was ever CORRECT. It asserts live has not drifted
 *     below it, plus the one absolute above.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DUMPS_DIR_REL = ['docs', 'security', 'branch-protection', 'rulesets'];
const DUMPS_DIR = path.join(REPO_ROOT, ...DUMPS_DIR_REL);

/** The one rule whose live presence fails regardless of what the dump says. */
export const FORBIDDEN_RULE = 'required_linear_history';

/**
 * Newest committed ruleset dump per (source repo, ruleset name).
 *
 * The file BODY is the authority for identity — `source` ("GaryOcean428/crm7"),
 * `name` ("default"), `id` — exactly as the README in this directory states:
 * a file never depends on its filename to say which ruleset it describes.
 * The filename supplies only the date that makes "newest" meaningful:
 * `<anything>-<YYYYMMDD>.json`. A file without a trailing date (README.md,
 * the `-pre.json` before-states kept as rollback references) is not a dump
 * and is skipped, not an error.
 *
 * Returns { dumps: [{ key, source, name, id, date, file, body }], problems: [] }
 * where problems are fail-closed findings for files that parse badly or
 * parse but do not identify their ruleset — those must FAIL, never skip.
 */
export function newestRulesetDumps(dumpsDir) {
  const dumps = [];
  const problems = [];
  if (!fs.existsSync(dumpsDir)) return { dumps, problems };
  const byKey = new Map();
  for (const file of fs.readdirSync(dumpsDir)) {
    const m = /^(.+)-(\d{8})\.json$/.exec(file);
    if (!m) continue;
    const full = path.join(dumpsDir, file);
    let body;
    try {
      body = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      problems.push({
        severity: 'fail', source: file, code: 'dump-unparseable',
        message: `${file}: committed ruleset dump does not parse — ${err.message}. ` +
          'A dump nobody can read is a bank nobody can restore from.',
      });
      continue;
    }
    if (!body?.source || !body?.name || !body?.id) {
      problems.push({
        severity: 'fail', source: file, code: 'dump-missing-identity',
        message: `${file}: parses but does not identify its ruleset — needs non-empty source, name and id. ` +
          'Comparing an unidentified dump would be comparing nothing and calling it checked.',
      });
      continue;
    }
    const key = `${body.source} :: ${body.name}`;
    const prev = byKey.get(key);
    if (!prev || m[2] > prev.date) {
      byKey.set(key, { key, source: body.source, name: body.name, id: body.id, date: m[2], file: full, body });
    } else if (m[2] === prev.date) {
      // Two same-day dumps for one ruleset: the README convention is that the
      // before-state of a second same-day write lives in git history, not a
      // second file. Two committed same-date dumps for one key is ambiguous.
      problems.push({
        severity: 'fail', source: file, code: 'dump-ambiguous-date',
        message: `${file}: a newer-or-equal dump for ${key} already read (${path.basename(prev.file)}). ` +
          'One ruleset may not carry two dumps of the same date — the before-state belongs in git history.',
      });
    }
  }
  dumps.push(...byKey.values());
  dumps.sort((a, b) => (a.source + a.name).localeCompare(b.source + b.name));
  return { dumps, problems };
}

/** Rule types ordered for readable diffs. */
const ruleTypes = (body) => (body?.rules ?? []).map((r) => r.type);

/**
 * Compare one banked ruleset dump against one live reading.
 * `live` is one of:
 *   { kind: 'ruleset', body, replaced }   the ruleset object (replaced: id differs)
 *   { kind: 'absent' }                    no ruleset with the banked name exists
 *   { kind: 'unreadable', detail }        the API call failed for any reason
 */
export function compareRuleset(bank, live) {
  const out = [];
  const at = `${bank.source} :: ${bank.name}`;

  if (live.kind === 'unreadable') {
    out.push({ severity: 'fail', source: bank.source, code: 'ruleset-unreadable',
      message: `${at}: could not read the live ruleset — a claim about the instrument, not about the branch. ${live.detail || ''}`.trim() });
    return out;
  }
  if (live.kind === 'absent') {
    out.push({ severity: 'fail', source: bank.source, code: 'ruleset-absent',
      message: `${at}: banked as ruleset ${bank.id} on ${bank.date} but NO ruleset with that name exists live — it was deleted outside a PR, or renamed. A deleted ruleset protects nothing.` });
    return out;
  }

  // THE ABSOLUTE. Live presence fails even when the banked dump agrees —
  // see the header: a dump that banks linear history is itself stale.
  if (ruleTypes(live.body).includes(FORBIDDEN_RULE)) {
    out.push({ severity: 'fail', source: bank.source, code: 'linear-history-present',
      message: `${at}: live ruleset carries ${FORBIDDEN_RULE}, which forbids merge commits. The estate promotes with gh pr merge --merge (never --squash, never rebase); ADR-0012 item 1 ratified linear history OFF on every repo. Every promotion is unmergeable until the rule is removed from the ruleset in a PR that re-dumps this file.` });
  }

  const bankedTypes = ruleTypes(bank.body);
  const liveTypes = ruleTypes(live.body);
  const bankedSet = new Set(bankedTypes);
  const liveSet = new Set(liveTypes);

  for (const t of bankedTypes) {
    if (liveSet.has(t)) continue;
    if (t === FORBIDDEN_RULE) {
      // Removal is the ratified direction — a stale dump, not a weakening.
      out.push({ severity: 'warn', source: bank.source, code: 'linear-history-removed',
        message: `${at}: ${FORBIDDEN_RULE} was in the ${bank.date} dump and is gone live — the ratified posture (ADR-0012 item 1). Re-dump to record the removal.` });
    } else {
      out.push({ severity: 'fail', source: bank.source, code: 'rule-removed',
        message: `${at}: rule "${t}" was banked on ${bank.date} and is GONE live — the branch lost a protection the estate banked.` });
    }
  }
  const added = liveTypes.filter((t) => !bankedSet.has(t));
  if (added.length) {
    out.push({ severity: 'warn', source: bank.source, code: 'dump-stale',
      message: `${at}: ${added.length} rule(s) live but not in the ${bank.date} dump — strengthening; re-dump: ${added.join(', ')}` });
  }

  // Enforcement: "active" is the only state that binds anyone.
  if (bank.body?.enforcement === 'active' && live.body?.enforcement !== 'active') {
    out.push({ severity: 'fail', source: bank.source, code: 'enforcement-weakened',
      message: `${at}: enforcement was "active" when banked and is "${live.body?.enforcement}" live — the whole ruleset is advisory.` });
  } else if (bank.body?.enforcement !== 'active' && live.body?.enforcement === 'active') {
    out.push({ severity: 'warn', source: bank.source, code: 'dump-stale',
      message: `${at}: enforcement strengthened to "active" live but the ${bank.date} dump says "${bank.body?.enforcement}" — re-dump.` });
  }

  // Ref coverage. A ruleset whose include stops matching the branch it banked
  // is the malformed-pattern shape from the 2026-09-07 incident.
  const bankedRefs = bank.body?.conditions?.ref_name?.include ?? [];
  const liveRefs = live.body?.conditions?.ref_name?.include ?? [];
  const bankedRefSet = new Set(bankedRefs);
  const liveRefSet = new Set(liveRefs);
  const lostRefs = bankedRefs.filter((r) => !liveRefSet.has(r));
  if (lostRefs.length) {
    out.push({ severity: 'fail', source: bank.source, code: 'refs-no-longer-covered',
      message: `${at}: ref pattern(s) ${lostRefs.join(', ')} were banked and are gone live — the ruleset may no longer match the branch it was banked to protect.` });
  }
  const newRefs = liveRefs.filter((r) => !bankedRefSet.has(r));
  if (newRefs.length) {
    out.push({ severity: 'warn', source: bank.source, code: 'dump-stale',
      message: `${at}: ref pattern(s) ${newRefs.join(', ')} live but not in the ${bank.date} dump — re-dump.` });
  }

  if (live.replaced) {
    out.push({ severity: 'warn', source: bank.source, code: 'ruleset-replaced',
      message: `${at}: live ruleset id ${live.body.id} differs from banked id ${bank.id} under the same name — re-created outside a PR? Rule comparison above still ran against the live body; re-dump to bank the new id.` });
  }

  return out;
}

export function evaluate({ dumpsDir, read }) {
  const { dumps, problems } = newestRulesetDumps(dumpsDir);
  const findings = [...problems];
  for (const bank of dumps) {
    findings.push(...compareRuleset(bank, read(bank.source, bank.name, bank.id)));
  }
  return { dumps, findings };
}

/* ------------------------------- live reader ------------------------------ */

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// The ruleset LIST endpoint returns no rules; one GET per ruleset is needed.
// Cache the list per repo — every dump of a repo shares it.
function makeReader() {
  const listCache = new Map();
  return function readLive(source, name, bankedId) {
    let list = listCache.get(source);
    if (list === undefined) {
      try {
        list = JSON.parse(gh(['api', `repos/${source}/rulesets`]));
      } catch (err) {
        const blob = `${err.stdout || ''}${err.stderr || ''}`.trim().split('\n')[0] || String(err.message);
        return { kind: 'unreadable', detail: `ruleset list for ${source} failed: ${blob}` };
      }
      listCache.set(source, list);
    }
    const matches = (Array.isArray(list) ? list : []).filter((r) => r?.name === name);
    if (!matches.length) return { kind: 'absent' };
    const pick = matches.find((r) => r.id === bankedId) ?? matches[0];
    try {
      const body = JSON.parse(gh(['api', `repos/${source}/rulesets/${pick.id}`]));
      return { kind: 'ruleset', body, replaced: pick.id !== bankedId };
    } catch (err) {
      const blob = `${err.stdout || ''}${err.stderr || ''}`.trim().split('\n')[0] || String(err.message);
      return { kind: 'unreadable', detail: `ruleset ${pick.id} GET failed: ${blob}` };
    }
  };
}

/* -------------------------------- self test ------------------------------- */

function selfTest() {
  const os = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'rsd-'));
  const mkDir = () => {
    const dir = path.join(os, `case-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };
  // Each case runs evaluate() over its OWN directory holding ONLY its own
  // dumps: a shared accumulating directory made every case compare every
  // earlier case's dumps too, and the counts stopped meaning anything. The
  // reader is keyed by "<source> :: <name>"; an unexpected key is an
  // unreadable instrument rather than a silent pass.
  const runCase = (entries, liveByKey) => {
    const dir = mkDir();
    for (const { file, body } of entries) fs.writeFileSync(path.join(dir, file), JSON.stringify(body));
    const read = (source, name) => liveByKey[`${source} :: ${name}`] ?? { kind: 'unreadable', detail: 'no fixture live object for this key' };
    return evaluate({ dumpsDir: dir, read });
  };

  const mkRuleset = (over = {}) => ({
    id: 1001, name: 'default', target: 'branch', enforcement: 'active',
    source_type: 'Repository', source: 'GaryOcean428/example',
    conditions: { ref_name: { exclude: [], include: ['~DEFAULT_BRANCH'] } },
    rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'required_status_checks' }],
    ...over,
  });
  const BASE = mkRuleset();
  const clone = (m) => JSON.parse(JSON.stringify(m));
  const withSource = (body, source, id) => { const b = clone(body); b.source = source; if (id) b.id = id; return b; };

  const linear = () => {
    const b = clone(BASE);
    b.rules = [...b.rules, { type: FORBIDDEN_RULE }];
    return b;
  };
  const devBank = clone(BASE);
  devBank.id = 2002; devBank.name = 'development';
  devBank.conditions.ref_name.include = ['refs/heads/development'];
  devBank.rules = [{ type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'pull_request' }];
  const linearDev = () => {
    const b = clone(devBank);
    b.rules = [...b.rules, { type: FORBIDDEN_RULE }];
    return b;
  };

  const liveOf = (body, replaced = false) => ({ kind: 'ruleset', body, replaced });
  const oneDump = (body, file = 'example-default-20260201.json') => [{ file, body }];
  const oneLive = (body) => ({ [`${body.source} :: ${body.name}`]: liveOf(body) });
  const withId = (b, id) => { const c = clone(b); c.id = id; return c; };
  const linearWith = (source, id) => withSource(withId(linear(), id), source);

  const cases = [
    ['identical banked and live passes',
      () => runCase(oneDump(BASE), oneLive(BASE)), { fail: 0, warn: 0 }],
    // THE case this gate exists for: linear history appears live on a
    // default-branch ruleset that was banked without it.
    ['required_linear_history added live fails',
      () => runCase(oneDump(BASE), oneLive(linear())), { fail: 1, warn: 1, code: 'linear-history-present' }],
    // ...and it fails even when the BANKED dump carried it too — the dump is
    // stale, the posture is absolute; a green tick here would be the exact
    // false-complete bsuite#3165 describes.
    ['linear history present in BOTH bank and live still fails',
      () => runCase(oneDump(linear()), oneLive(linear())), { fail: 1, warn: 0, code: 'linear-history-present' }],
    ['linear history on a development ruleset fails too (class, not just default)',
      () => runCase([{ file: 'example-development-20260201.json', body: devBank }],
        oneLive(linearDev())), { fail: 1, warn: 1, code: 'linear-history-present' }],
    ['linear history removed live only warns (ratified direction)',
      () => runCase(oneDump(linearWith('GaryOcean428/example', 1001)), oneLive(BASE)), { fail: 0, warn: 1, code: 'linear-history-removed' }],
    ['a protection rule removed live fails',
      () => { const b = clone(BASE); b.rules = b.rules.filter((r) => r.type !== 'non_fast_forward');
        return runCase(oneDump(BASE), oneLive(b)); }, { fail: 1, warn: 0, code: 'rule-removed' }],
    ['an added rule only warns',
      () => { const b = clone(BASE); b.rules = [...b.rules, { type: 'copilot_code_review' }];
        return runCase(oneDump(BASE), oneLive(b)); }, { fail: 0, warn: 1, code: 'dump-stale' }],
    ['a deleted ruleset fails',
      () => runCase(oneDump(BASE), { 'GaryOcean428/example :: default': { kind: 'absent' } }), { fail: 1, warn: 0, code: 'ruleset-absent' }],
    ['an unreadable ruleset fails and says the instrument failed',
      () => runCase(oneDump(BASE), { 'GaryOcean428/example :: default': { kind: 'unreadable', detail: 'boom' } }), { fail: 1, warn: 0, code: 'ruleset-unreadable' }],
    ['enforcement active -> evaluate fails',
      () => { const b = clone(BASE); b.enforcement = 'evaluate';
        return runCase(oneDump(BASE), oneLive(b)); }, { fail: 1, warn: 0, code: 'enforcement-weakened' }],
    ['a lost ref pattern fails (the malformed-pattern shape)',
      () => { const b = clone(BASE); b.conditions.ref_name.include = ['refs/heads/"main", "development"'];
        return runCase(oneDump(BASE), oneLive(b)); }, { fail: 1, warn: 1, code: 'refs-no-longer-covered' }],
    ['a re-created ruleset (new id, same rules) warns',
      () => { const b = withId(BASE, 9999);
        // replaced: true is what makeReader sets when the live id differs from
        // the banked id; compareRuleset only emits ruleset-replaced then.
        return runCase(oneDump(BASE), { 'GaryOcean428/example :: default': liveOf(b, true) });
      }, { fail: 0, warn: 1, code: 'ruleset-replaced' }],
    ['newest dump per ruleset wins — an older dump carrying linear history is ignored',
      () => {
        // OLD dump has linear history, NEW dump does not, live has not.
        const newB = withId(BASE, 4004);
        const { dumps, findings } = runCase([
          { file: 'example-default-20260101.json', body: linear() },
          { file: 'example-default-20260201.json', body: newB },
        ], oneLive(newB));
        return { ...({ dumps, findings }), newestCount: dumps.length };
      }, { fail: 0, warn: 0, newestCount: 1 }],
  ];

  let bad = 0;
  for (const [label, run, want] of cases) {
    const { dumps, findings } = run();
    const fail = findings.filter((f) => f.severity === 'fail').length;
    const warn = findings.filter((f) => f.severity === 'warn').length;
    const codes = findings.map((f) => f.code);
    // Assert the MESSAGE, not only counts: a gate whose new path is silent
    // passes a count-only self-test while telling nobody anything.
    const spoke = findings.every((f) => typeof f.message === 'string' && f.message.length > 40);
    const newestOk = want.newestCount === undefined || dumps.length === want.newestCount;
    const ok = fail === want.fail && warn === want.warn
      && (!want.code || codes.includes(want.code)) && spoke && newestOk;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}  [fail=${fail} warn=${warn} codes=${codes.join(',') || '-'} spoke=${spoke}${want.newestCount !== undefined ? ` dumps=${dumps.length}` : ''}]`);
  }

  // Fail-closed: an unparseable dump and an identity-less dump must each FAIL.
  {
    const dir = mkDir();
    fs.writeFileSync(path.join(dir, 'broken-default-20260201.json'), '{not json');
    fs.writeFileSync(path.join(dir, 'hollow-default-20260201.json'), JSON.stringify({ name: 'default' }));
    const broken = evaluate({ dumpsDir: dir, read: () => ({ kind: 'unreadable', detail: 'n/a' }) });
    const has = (code) => broken.findings.some((f) => f.severity === 'fail' && f.code === code);
    const brokenOk = has('dump-unparseable') && has('dump-missing-identity');
    if (!brokenOk) bad++;
    console.log(`  ${brokenOk ? 'ok  ' : 'FAIL'} unparseable and identity-less dumps fail closed`);
  }

  // A missing directory is "checked nothing", which must not render green.
  {
    const empty = evaluate({ dumpsDir: path.join(os, 'absent-dir'), read: () => ({ kind: 'absent' }) });
    const emptyOk = empty.dumps.length === 0 && empty.findings.length === 0;
    if (!emptyOk) bad++;
    console.log(`  ${emptyOk ? 'ok  ' : 'FAIL'} absent directory yields no dumps (main() must then fail closed)`);
  }

  fs.rmSync(os, { recursive: true, force: true });

  // State the DENOMINATOR, not just the verdict (house rule — a bare "pass"
  // is indistinguishable from a run that executed nothing).
  const total = cases.length + 2; // + fail-closed pair + absent-directory
  console.log(
    bad === 0
      ? `[ruleset-drift] self-test: ${total}/${total} pass — ${total} case(s) exercised ` +
        `(${cases.length} comparison verdicts over 1 fixture repo holding default and ` +
        `development rulesets — identical read, linear history added live, linear history ` +
        `present in BOTH bank and live, linear history on a development ruleset, linear ` +
        `history removed (the ratified warn), a protection rule removed, a rule added that ` +
        `must only warn, a deleted ruleset, an unreadable API, enforcement weakened, a lost ` +
        `ref pattern, a re-created ruleset id, newest-dump-wins over an older banked ` +
        `linear-history dump — plus 2 structural cases: both fail-closed dump shapes and ` +
        `an absent dumps directory)`
      : `[ruleset-drift] self-test: ${total - bad}/${total} pass — ${bad} case(s) FAILED`,
  );
  return bad === 0 ? 0 : 1;
}

/* ---------------------------------- main ---------------------------------- */

function main(argv) {
  const flags = new Set(argv.slice(2));
  for (const f of flags) {
    if (!['--json', '--self-test'].includes(f)) {
      console.error(`usage: node scripts/check-ruleset-drift.mjs [--json] [--self-test]\n  unknown flag: ${f}`);
      return 2;
    }
  }
  if (flags.has('--self-test')) return selfTest();

  const { dumps, findings } = evaluate({ dumpsDir: DUMPS_DIR, read: makeReader() });

  if (dumps.length === 0 && !findings.length) {
    console.error(`[ruleset-drift] no committed ruleset dump under ${path.join(...DUMPS_DIR_REL)}/.`);
    console.error('  With no dump this gate has checked nothing, which is not the same as having');
    console.error('  found nothing. Dump each default-branch ruleset (rulesets/README.md) before');
    console.error('  relying on this gate.');
    return 1;
  }

  if (flags.has('--json')) {
    console.log(JSON.stringify({
      scanned: dumps.map((d) => `${d.source} :: ${d.name}@${d.date}`),
      findings,
    }, null, 2));
  } else {
    console.log(`[ruleset-drift] compared live rulesets against ${dumps.length} committed dump(s): ${dumps.map((d) => `${d.source} :: ${d.name}@${d.date}`).join(', ')}`);
    for (const f of findings) console.log(`  ${f.severity === 'fail' ? '::error::' : '::warning::'}${f.message}`);
    if (!findings.length) console.log('  no drift.');
  }

  return findings.some((f) => f.severity === 'fail') ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv));
}