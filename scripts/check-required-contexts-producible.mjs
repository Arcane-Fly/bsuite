#!/usr/bin/env node
/**
 * check-required-contexts-producible.mjs — a required check nobody can produce
 * blocks every merge, silently and forever.
 *
 * THE INCIDENT BEHIND THIS FILE.
 *
 * The estate has recorded this class twice, in opposite directions:
 *
 *   1. "a PATH-FILTERED required check can NEVER report — 4 of 12 never ran."
 *      A workflow carrying `on.pull_request.paths:` does not START on a PR whose
 *      changeset misses the filter. GitHub then waits for a status that will
 *      never arrive, and the PR sits on "Expected — waiting for status to be
 *      reported" with every visible check green. The same happens for a
 *      job-level `if:` that evaluates false: the job reports SKIPPED, and a
 *      SKIPPED conclusion does not satisfy a required context.
 *
 *   2. Branch protection is written with PUT in most examples on the internet,
 *      and PUT REPLACES the whole context list. Appending one context by PUT
 *      has erased the other twenty-nine here before. The contexts are therefore
 *      appended with POST, and the before-state is dumped to
 *      docs/security/branch-protection/<branch>-<date>.json in the same PR so
 *      the rollback is in history rather than in someone's terminal scrollback.
 *
 * This gate reads those COMMITTED DUMPS — not the live API — and asserts, for
 * every required context on every protected branch:
 *
 *   producible        some job in .github/workflows/ reports under exactly that
 *                     context string (job `name:`, or the job ID when it has
 *                     none; a matrix job reports as `name (values)` and its bare
 *                     name is therefore NOT a context anyone can produce), or
 *                     the context is registered in the app-provided allowlist.
 *   reachable         at least one producing workflow triggers on `pull_request`
 *                     for THAT branch — not excluded by `branches:` or
 *                     `branches-ignore:`, not narrowed by a `types:` list that
 *                     omits both `opened` and `synchronize`, and with no
 *                     `paths:`/`paths-ignore:` filter.
 *   unconditional     at least one producing job has no job-level `if:`.
 *
 * WHAT IT DOES NOT ASSERT — say it, so nobody reads more into a green tick:
 *   - that the committed dump still matches LIVE branch protection. That needs
 *     an API token and belongs in a nightly lane, not on the PR path; a
 *     protection write made outside a PR leaves the dump stale and this gate
 *     cannot see it. Re-dump in the PR that writes protection.
 *   - that a required gate is CORRECT, or that it can fail. That is each gate's
 *     own `--self-test`, and the LANE-WATCHER that registers it.
 *   - that a `${{ }}` expression in a job-level `if:` is truthy on a PR. The
 *     expression is not evaluated; ANY job-level `if:` on the only producer of a
 *     required context is reported, because "reports SKIPPED sometimes" is
 *     already enough to hang a merge.
 *   - anything about rulesets. Ruleset-level required checks are configured
 *     through a different API and are not in these dumps.
 *
 * Usage:
 *   node scripts/check-required-contexts-producible.mjs
 *   node scripts/check-required-contexts-producible.mjs --json
 *   node scripts/check-required-contexts-producible.mjs --update-baseline
 *   node scripts/check-required-contexts-producible.mjs --self-test
 *
 * Exit codes: 0 clean, 1 a finding or a breached denominator, 2 usage error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWorkflowYaml, jobContext } from './lib/workflow-yaml.mjs';
import { compareRatchet, writeBaseline } from './lib/ratchet.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(REPO_ROOT, '.github', 'required-contexts-baseline.json');

/**
 * Contexts reported by a GitHub App rather than by a workflow in this repo
 * (Supabase Preview, Vercel, …). An entry here is a DELIBERATE registration:
 * without the list, an app-provided required context would read as
 * "nobody can produce this" and this gate would be crying wolf; with the list
 * empty, a new one has to be argued for rather than appearing by accident.
 */
const APP_PROVIDED = new Set([]);

/** Read every workflow and index what each job can report under. */
export function indexWorkflows(workflowsDir) {
  /** @type {Map<string, {file:string, jobId:string, prBranches:string[]|null, hasPr:boolean, paths:string[]|null, jobIf:string|null}[]>} */
  const exact = new Map();
  /** @type {{base:string, file:string, jobId:string, prBranches:string[]|null, hasPr:boolean, paths:string[]|null, jobIf:string|null}[]} */
  const matrixJobs = [];
  let workflowsScanned = 0;
  let jobsScanned = 0;

  const files = fs.existsSync(workflowsDir)
    ? fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f)).sort()
    : [];

  for (const file of files) {
    const doc = parseWorkflowYaml(fs.readFileSync(path.join(workflowsDir, file), 'utf8'));
    workflowsScanned += 1;
    // `on` is a YAML 1.1 boolean; a stricter parser than ours would hand it
    // back under the key `true`. Accept both rather than depend on which.
    const on = doc.on ?? doc.true ?? doc.yes;
    const pr = on && typeof on === 'object' && !Array.isArray(on) ? on.pull_request : undefined;
    const hasPr = on !== undefined && (
      (on && typeof on === 'object' && !Array.isArray(on) && 'pull_request' in on) ||
      (Array.isArray(on) && on.includes('pull_request')) ||
      on === 'pull_request'
    );
    const prMap = pr && typeof pr === 'object' && !Array.isArray(pr) ? pr : null;
    const prBranches = prMap && Array.isArray(prMap.branches) ? prMap.branches.map(String) : null;
    // `branches-ignore` is the inverse filter and excludes just as absolutely.
    // It cannot be combined with `branches:` in a real workflow, so they are
    // read independently and both consulted below.
    const prBranchesIgnore = prMap && Array.isArray(prMap['branches-ignore'])
      ? prMap['branches-ignore'].map(String) : null;
    const rawPaths = prMap ? (prMap.paths ?? prMap['paths-ignore']) : null;
    const paths = Array.isArray(rawPaths) ? rawPaths.map(String) : null;
    // A `types:` list narrows WHICH pull_request activity starts the workflow.
    // Omitted, GitHub uses [opened, synchronize, reopened] — the shape that makes
    // a check report on a fresh PR and again on every push to it. A list missing
    // BOTH `opened` and `synchronize` (e.g. `[labeled]`) means an ordinary PR
    // never triggers the run at all, so the context never reports.
    const prTypes = prMap && Array.isArray(prMap.types) ? prMap.types.map(String) : null;

    for (const [jobId, job] of Object.entries(doc.jobs ?? {})) {
      if (!job || typeof job !== 'object') continue;
      jobsScanned += 1;
      const { base, matrix } = jobContext(jobId, job);
      const jobIf = typeof job.if === 'string' && job.if.trim() !== '' ? job.if.trim() : null;
      const entry = { base, file, jobId, prBranches, prBranchesIgnore, prTypes, hasPr, paths, jobIf };
      if (matrix) { matrixJobs.push(entry); continue; }
      if (!exact.has(base)) exact.set(base, []);
      exact.get(base).push(entry);
    }
  }
  return { exact, matrixJobs, workflowsScanned, jobsScanned };
}

/** Producers of one context string, matrix jobs included by their `name (…)` shape. */
function producersOf(context, index) {
  const direct = index.exact.get(context) ?? [];
  const viaMatrix = index.matrixJobs.filter((m) => context.startsWith(`${m.base} (`) && context.endsWith(')'));
  return [...direct, ...viaMatrix];
}

/** Newest committed dump per branch, by the date in the filename. */
export function readDumps(dir) {
  if (!fs.existsSync(dir)) return [];
  /** @type {Map<string, {branch:string, file:string, stamp:string}>} */
  const newest = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const m = /^(.+)-(\d{8})\.json$/.exec(f);
    if (!m) continue;
    const [, branch, stamp] = m;
    const prev = newest.get(branch);
    if (!prev || stamp >= prev.stamp) newest.set(branch, { branch, file: path.join(dir, f), stamp });
  }
  return [...newest.values()].sort((a, b) => a.branch.localeCompare(b.branch));
}

/** The check itself. Returns { findings, scanned, rows }. */
export function evaluate({ workflowsDir, dumpsDir }) {
  const index = indexWorkflows(workflowsDir);
  const dumps = readDumps(dumpsDir);
  /** @type {{branch:string, context:string, verdict:string, detail:string}[]} */
  const rows = [];
  let scanned = 0;

  for (const dump of dumps) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(dump.file, 'utf8'));
    } catch {
      rows.push({ branch: dump.branch, context: '(whole dump)', verdict: 'unreadable-dump', detail: `${dump.file} is not valid JSON` });
      continue;
    }
    const contexts = json?.required_status_checks?.contexts;
    if (!Array.isArray(contexts)) {
      rows.push({ branch: dump.branch, context: '(whole dump)', verdict: 'unreadable-dump', detail: `${dump.file} has no required_status_checks.contexts array` });
      continue;
    }
    for (const context of contexts) {
      scanned += 1;
      if (APP_PROVIDED.has(context)) continue;
      const producers = producersOf(context, index);
      if (producers.length === 0) {
        rows.push({
          branch: dump.branch,
          context,
          verdict: 'unproducible',
          detail: 'no job in .github/workflows/ reports under this exact context string (job `name:`, or the job ID when it has none). A required context nobody can produce blocks every merge into this branch.',
        });
        continue;
      }
      const onThisBranch = producers.filter((p) => p.hasPr
        && (p.prBranches === null || p.prBranches.includes(dump.branch))
        && (p.prBranchesIgnore === null || !p.prBranchesIgnore.includes(dump.branch)));
      if (onThisBranch.length === 0) {
        rows.push({
          branch: dump.branch,
          context,
          verdict: 'branch-scoped-out',
          detail: `produced only by ${producers.map((p) => `${p.file}:${p.jobId}`).join(', ')}, whose pull_request trigger does not cover \`${dump.branch}\``,
        });
        continue;
      }
      // A `types:` list that starts on neither `opened` nor `synchronize` means an
      // ordinary PR never starts the workflow — the same deadlock as a path
      // filter, arrived at through a different field.
      const triggerable = onThisBranch.filter((p) => p.prTypes === null
        || p.prTypes.includes('opened') || p.prTypes.includes('synchronize'));
      if (triggerable.length === 0) {
        rows.push({
          branch: dump.branch,
          context,
          verdict: 'types-restricted',
          detail: `every producer narrows \`on.pull_request.types\` to a list containing neither \`opened\` nor \`synchronize\` (${onThisBranch.map((p) => `${p.file}:${p.jobId} types: [${p.prTypes.join(', ')}]`).join(' | ')}). An ordinary pull request never starts the workflow, so the context never reports.`,
        });
        continue;
      }
      const unfiltered = triggerable.filter((p) => p.paths === null);
      if (unfiltered.length === 0) {
        rows.push({
          branch: dump.branch,
          context,
          verdict: 'path-filtered',
          detail: `every producer is path-filtered (${triggerable.map((p) => `${p.file}:${p.jobId}`).join(', ')}). A PR whose changeset misses the filter never starts the workflow, so the context never reports and the merge waits forever.`,
        });
        continue;
      }
      const unconditional = unfiltered.filter((p) => p.jobIf === null);
      if (unconditional.length === 0) {
        rows.push({
          branch: dump.branch,
          context,
          verdict: 'conditional-job',
          detail: `every producer carries a job-level \`if:\` (${unfiltered.map((p) => `${p.file}:${p.jobId} if: ${p.jobIf}`).join(' | ')}). A job whose \`if:\` is false reports SKIPPED, and SKIPPED does not satisfy a required context.`,
        });
      }
    }
  }
  return { findings: rows.length, scanned, rows, dumps, index };
}

function render(result, { json }) {
  if (json) {
    console.log(JSON.stringify({
      findings: result.findings,
      scanned: result.scanned,
      branches: result.dumps.map((d) => ({ branch: d.branch, dump: path.relative(REPO_ROOT, d.file) })),
      workflows: result.index.workflowsScanned,
      jobs: result.index.jobsScanned,
      rows: result.rows,
    }, null, 2));
    return;
  }
  for (const r of result.rows) {
    console.error(`  [${r.verdict}] ${r.branch} requires "${r.context}"`);
    console.error(`      ${r.detail}`);
  }
  const branches = result.dumps.map((d) => `${d.branch} (${path.relative(REPO_ROOT, d.file)})`).join(', ');
  console.log(
    `[required-contexts] examined ${result.scanned} required context(s) across ${result.dumps.length} branch dump(s) ` +
    `[${branches}] against ${result.index.jobsScanned} job(s) in ${result.index.workflowsScanned} workflow file(s); ` +
    `${result.findings} finding(s).`,
  );
}

// ---------------------------------------------------------------------------
// Self-test — the gate must be SEEN to fail, over the same entry point, before
// any verdict it prints is worth reading. Each case plants ONE defect against
// an otherwise clean fixture and asserts the exact exit shape, not merely
// "non-zero": a probe that CRASHES also exits non-zero without proving
// anything.
// ---------------------------------------------------------------------------
const CLEAN_WORKFLOW = `name: Fixture
on:
  pull_request:
    branches: [main, development]
jobs:
  fixture:
    name: A fixture gate
    runs-on: ubuntu-latest
    steps:
      - run: |
          # this body mentions paths: and if: on purpose — a line-oriented
          # reader would find them and be wrong.
          echo "paths: not a filter"
          echo "if: not a condition"
`;

function fixtureDir(tmp, { workflow, contexts }) {
  const wf = path.join(tmp, '.github', 'workflows');
  const dumps = path.join(tmp, 'docs', 'security', 'branch-protection');
  fs.mkdirSync(wf, { recursive: true });
  fs.mkdirSync(dumps, { recursive: true });
  fs.writeFileSync(path.join(wf, 'fixture.yml'), workflow);
  fs.writeFileSync(
    path.join(dumps, 'development-20260101.json'),
    `${JSON.stringify({ required_status_checks: { strict: false, contexts } }, null, 2)}\n`,
  );
  return { workflowsDir: wf, dumpsDir: dumps };
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || '/tmp', 'req-contexts-'));
  const cases = [
    {
      name: 'clean — the context is produced, unfiltered, unconditional',
      workflow: CLEAN_WORKFLOW,
      contexts: ['A fixture gate'],
      expect: 0,
      expectVerdict: null,
    },
    {
      name: 'planted STALE context — required, produced by nothing',
      workflow: CLEAN_WORKFLOW,
      contexts: ['A fixture gate', 'A gate that was renamed last month'],
      expect: 1,
      expectVerdict: 'unproducible',
    },
    {
      name: 'planted PATH FILTER on the only producer',
      workflow: CLEAN_WORKFLOW.replace(
        '    branches: [main, development]\n',
        "    branches: [main, development]\n    paths:\n      - 'src/**'\n",
      ),
      contexts: ['A fixture gate'],
      expect: 1,
      expectVerdict: 'path-filtered',
    },
    {
      name: 'planted job-level if: on the only producer',
      workflow: CLEAN_WORKFLOW.replace(
        '    runs-on: ubuntu-latest\n',
        "    if: github.event_name == 'schedule'\n    runs-on: ubuntu-latest\n",
      ),
      contexts: ['A fixture gate'],
      expect: 1,
      expectVerdict: 'conditional-job',
    },
    {
      name: 'planted branch scope that excludes the protected branch',
      workflow: CLEAN_WORKFLOW.replace('    branches: [main, development]\n', '    branches: [main]\n'),
      contexts: ['A fixture gate'],
      expect: 1,
      expectVerdict: 'branch-scoped-out',
    },
    {
      name: 'a MATRIX job cannot satisfy its own bare name',
      workflow: CLEAN_WORKFLOW.replace(
        '    runs-on: ubuntu-latest\n',
        '    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        app: [crm7, conduit]\n',
      ),
      contexts: ['A fixture gate'],
      expect: 1,
      expectVerdict: 'unproducible',
    },
    {
      name: 'planted branches-ignore that excludes the protected branch',
      workflow: CLEAN_WORKFLOW.replace(
        '    branches: [main, development]\n',
        '    branches-ignore: [development]\n',
      ),
      contexts: ['A fixture gate'],
      expect: 1,
      expectVerdict: 'branch-scoped-out',
    },
    {
      name: 'planted types: list with neither opened nor synchronize',
      workflow: CLEAN_WORKFLOW.replace(
        '    branches: [main, development]\n',
        '    branches: [main, development]\n    types: [labeled]\n',
      ),
      contexts: ['A fixture gate'],
      expect: 1,
      expectVerdict: 'types-restricted',
    },
    {
      name: '…but a types: list that KEEPS synchronize is fine',
      workflow: CLEAN_WORKFLOW.replace(
        '    branches: [main, development]\n',
        '    branches: [main, development]\n    types: [opened, synchronize, labeled]\n',
      ),
      contexts: ['A fixture gate'],
      expect: 0,
      expectVerdict: null,
    },
    {
      name: 'a `- run: |` body never swallows the step keys that follow it',
      // `- run: |` stays ON THE DASH LINE on purpose — that is the only shape
      // the bug had. Moving it to its own line makes the header indent and the
      // sibling indent equal, and the fixture stops testing anything.
      workflow: CLEAN_WORKFLOW.replace(
        '          echo "if: not a condition"\n',
        '          echo "if: not a condition"\n        shell: bash\n        env:\n          PATHS: not-a-filter\n',
      ),
      contexts: ['A fixture gate'],
      expect: 0,
      expectVerdict: null,
      // The floor for a `- key: |` body is the KEY's indent, not the dash's;
      // using the dash's swallowed `shell:`/`env:` into the run scalar. Asserted
      // structurally below, not just by exit code — a case that only checks the
      // exit code would pass with the bug still in.
      assertStructure: true,
    },
    {
      name: '…and it DOES satisfy the parenthesised form GitHub actually reports',
      workflow: CLEAN_WORKFLOW.replace(
        '    runs-on: ubuntu-latest\n',
        '    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        app: [crm7, conduit]\n',
      ),
      contexts: ['A fixture gate (crm7)'],
      expect: 0,
      expectVerdict: null,
    },
  ];

  let failed = 0;
  for (const [i, c] of cases.entries()) {
    const dir = path.join(tmp, `case-${i}`);
    fs.mkdirSync(dir, { recursive: true });
    const dirs = fixtureDir(dir, c);
    const result = evaluate(dirs);
    // A structural case asserts what the PARSE produced, not only what the gate
    // concluded — the block-scalar floor bug this covers changed no verdict, so
    // an exit-code-only case would have passed throughout.
    let structureOk = true;
    if (c.assertStructure) {
      const doc = parseWorkflowYaml(fs.readFileSync(path.join(dirs.workflowsDir, 'fixture.yml'), 'utf8'));
      const step = ((doc.jobs?.fixture?.steps) || [])[0] || {};
      structureOk = step.shell === 'bash'
        && step.env && step.env.PATHS === 'not-a-filter'
        && typeof step.run === 'string' && !step.run.includes('shell:');
      if (!structureOk) {
        console.error(`       block scalar swallowed its siblings: keys=[${Object.keys(step).join(',')}] run=${JSON.stringify(step.run)}`);
      }
    }
    const rc = result.findings > 0 ? 1 : 0;
    const verdicts = result.rows.map((r) => r.verdict);
    const okExit = rc === c.expect;
    const okVerdict = c.expectVerdict === null ? verdicts.length === 0 : verdicts.includes(c.expectVerdict);
    // The clean case must also prove it EXAMINED something — a fixture that
    // silently scanned zero contexts would "pass" every case above.
    const okDenominator = result.scanned === c.contexts.length;
    if (okExit && okVerdict && okDenominator && structureOk) {
      console.log(`  ok   ${c.name} (exit ${rc}, scanned ${result.scanned}${verdicts.length ? `, ${verdicts.join('+')}` : ''})`);
    } else {
      failed += 1;
      console.error(`  FAIL ${c.name}`);
      console.error(`       expected exit ${c.expect} / verdict ${c.expectVerdict ?? 'none'} / scanned ${c.contexts.length}`);
      console.error(`       got      exit ${rc} / verdict ${verdicts.join('+') || 'none'} / scanned ${result.scanned}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`[required-contexts --self-test] ${cases.length - failed}/${cases.length} case(s) passed.`);
  return failed === 0 ? 0 : 1;
}

function main(argv) {
  const flags = new Set(argv.slice(2));
  for (const f of flags) {
    if (!['--json', '--self-test', '--update-baseline'].includes(f)) {
      console.error(`usage: node scripts/check-required-contexts-producible.mjs [--json] [--self-test] [--update-baseline]\n  unknown flag: ${f}`);
      return 2;
    }
  }
  if (flags.has('--self-test')) return selfTest();

  const result = evaluate({
    workflowsDir: path.join(REPO_ROOT, '.github', 'workflows'),
    dumpsDir: path.join(REPO_ROOT, 'docs', 'security', 'branch-protection'),
  });

  if (result.dumps.length === 0) {
    console.error('[required-contexts] no committed protection dump under docs/security/branch-protection/.');
    console.error('  This gate reads the COMMITTED dump, never the live API — with no dump it has');
    console.error('  checked nothing, which is not the same as having found nothing. Dump both');
    console.error('  branches before requiring anything:');
    console.error('    gh api repos/GaryOcean428/bsuite/branches/development/protection > docs/security/branch-protection/development-$(date +%Y%m%d).json');
    return 1;
  }

  render(result, { json: flags.has('--json') });

  if (flags.has('--update-baseline')) {
    writeBaseline(BASELINE, {
      findings: result.findings,
      scanned: result.scanned,
      banked: new Date().toISOString().slice(0, 10),
      note: 'findings must stay 0; scanned is the number of required contexts across the committed branch dumps.',
    });
    console.log(`[required-contexts] baseline re-banked: findings=${result.findings} scanned=${result.scanned}`);
    return 0;
  }

  const ratchet = compareRatchet({
    file: BASELINE,
    findings: result.findings,
    scanned: result.scanned,
    mode: 'equality',
    label: 'required contexts that no PR can produce',
    scriptPath: 'scripts/check-required-contexts-producible.mjs',
  });
  if (!ratchet.ok) {
    console.error(ratchet.message);
    return 1;
  }
  if (result.findings > 0) return 1;
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv));
}
