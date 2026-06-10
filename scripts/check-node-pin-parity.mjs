#!/usr/bin/env node
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Must be a semver range ("24.x"), never a bare major ("24"): bare majors
// silently fall back to LTS 22 on actions/setup-node@v4 and Vercel
// (incident 2026-05-25, fixed across all 6 apps).
const CANONICAL_NODE_VERSION = '24.x';
const CANONICAL_NODE_VERSION_FILE_CONTENT = '24.x\n';
const APP_REPOS = [
  'business-suite-unified',
  'braden',
  'conduit',
  'crm7',
  'R80.3',
  'throughput',
];

async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function checkRepo(repoPath) {
  const result = { repo: repoPath, status: 'ok', issues: [] };

  const pkgPath = path.join(repoPath, 'package.json');
  if (!(await pathExists(pkgPath))) {
    result.status = 'missing';
    result.issues.push(
      `${repoPath}: package.json absent (submodule not initialized? run \`git submodule update --init ${repoPath}\`)`,
    );
    return result;
  }

  const nodeVersionPath = path.join(repoPath, '.node-version');
  if (!(await pathExists(nodeVersionPath))) {
    result.status = 'fail';
    result.issues.push(`${nodeVersionPath}: missing — expected file containing exactly "24\\n"`);
  } else {
    const content = await readFile(nodeVersionPath, 'utf8');
    if (content !== CANONICAL_NODE_VERSION_FILE_CONTENT) {
      result.status = 'fail';
      result.issues.push(
        `${nodeVersionPath}: content ${JSON.stringify(content)} != canonical ${JSON.stringify(
          CANONICAL_NODE_VERSION_FILE_CONTENT,
        )}`,
      );
    }
  }

  const raw = await readFile(pkgPath, 'utf8');
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch (error) {
    result.status = 'fail';
    result.issues.push(`${pkgPath}: JSON parse error — ${error.message}`);
    return result;
  }
  const enginesNode = pkg?.engines?.node;
  if (enginesNode !== CANONICAL_NODE_VERSION) {
    result.status = 'fail';
    result.issues.push(
      `${pkgPath}: engines.node = ${JSON.stringify(enginesNode)} != canonical ${JSON.stringify(
        CANONICAL_NODE_VERSION,
      )}`,
    );
  }

  return result;
}

async function runChecks(rootDir, repos) {
  const cwd = process.cwd();
  process.chdir(rootDir);
  try {
    const results = [];
    for (const repo of repos) {
      results.push(await checkRepo(repo));
    }
    return results;
  } finally {
    process.chdir(cwd);
  }
}

async function selfTest() {
  const tmp = await mkdtemp(path.join(tmpdir(), 'check-node-pin-'));
  try {
    const goodRepo = path.join(tmp, 'good-repo');
    await mkdir(goodRepo, { recursive: true });
    await writeFile(path.join(goodRepo, '.node-version'), '24.x\n');
    await writeFile(
      path.join(goodRepo, 'package.json'),
      JSON.stringify({ name: 'good', engines: { node: '24.x' } }, null, 2),
    );

    const bareMajorRepo = path.join(tmp, 'bare-major-repo');
    await mkdir(bareMajorRepo, { recursive: true });
    await writeFile(path.join(bareMajorRepo, '.node-version'), '24\n');
    await writeFile(
      path.join(bareMajorRepo, 'package.json'),
      JSON.stringify({ name: 'bare', engines: { node: '24' } }, null, 2),
    );

    const driftedRepo = path.join(tmp, 'drifted-repo');
    await mkdir(driftedRepo, { recursive: true });
    await writeFile(path.join(driftedRepo, '.node-version'), '22\n');
    await writeFile(
      path.join(driftedRepo, 'package.json'),
      JSON.stringify({ name: 'drifted', engines: { node: '>=20' } }, null, 2),
    );

    const noPinsRepo = path.join(tmp, 'no-pins-repo');
    await mkdir(noPinsRepo, { recursive: true });
    await writeFile(path.join(noPinsRepo, 'package.json'), JSON.stringify({ name: 'nopins' }, null, 2));

    const results = await runChecks(tmp, [
      'good-repo',
      'bare-major-repo',
      'drifted-repo',
      'no-pins-repo',
      'absent-repo',
    ]);
    const byRepo = Object.fromEntries(results.map((r) => [r.repo, r]));

    const assertions = [
      ['good-repo is ok', byRepo['good-repo']?.status === 'ok'],
      ['good-repo has 0 issues', byRepo['good-repo']?.issues.length === 0],
      ['bare-major-repo is fail (bare "24" falls back to Node 22 on Vercel)', byRepo['bare-major-repo']?.status === 'fail'],
      [
        'bare-major-repo names .node-version drift',
        byRepo['bare-major-repo']?.issues.some((i) => i.includes('.node-version')),
      ],
      [
        'bare-major-repo names engines.node drift',
        byRepo['bare-major-repo']?.issues.some((i) => i.includes('engines.node')),
      ],
      ['drifted-repo is fail', byRepo['drifted-repo']?.status === 'fail'],
      [
        'drifted-repo names .node-version drift',
        byRepo['drifted-repo']?.issues.some((i) => i.includes('.node-version') && i.includes('"22')),
      ],
      [
        'drifted-repo names engines.node drift',
        byRepo['drifted-repo']?.issues.some((i) => i.includes('engines.node') && i.includes('>=20')),
      ],
      ['no-pins-repo is fail', byRepo['no-pins-repo']?.status === 'fail'],
      [
        'no-pins-repo names missing .node-version',
        byRepo['no-pins-repo']?.issues.some((i) => i.includes('.node-version') && i.includes('missing')),
      ],
      [
        'no-pins-repo names missing engines.node',
        byRepo['no-pins-repo']?.issues.some((i) => i.includes('engines.node') && i.includes('undefined')),
      ],
      ['absent-repo is missing', byRepo['absent-repo']?.status === 'missing'],
    ];

    let passed = 0;
    for (const [label, ok] of assertions) {
      if (ok) {
        passed++;
        console.log(`  ✓ ${label}`);
      } else {
        console.error(`  ✗ ${label}`);
      }
    }
    console.log(`\nself-test: ${passed}/${assertions.length} assertions passed`);
    if (passed !== assertions.length) {
      process.exit(1);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);

if (args.includes('--self-test')) {
  await selfTest();
} else {
  const results = await runChecks(process.cwd(), APP_REPOS);
  const failures = results.filter((r) => r.status === 'fail');
  const missing = results.filter((r) => r.status === 'missing');
  const ok = results.filter((r) => r.status === 'ok');

  for (const r of ok) console.log(`  ✓ ${r.repo}: Node 24 pin canonical`);
  for (const r of missing) {
    console.log(`  · ${r.repo}: ${r.issues[0]}`);
  }
  for (const r of failures) {
    console.error(`  ✗ ${r.repo}:`);
    for (const issue of r.issues) console.error(`      ${issue}`);
  }

  if (failures.length > 0) {
    console.error(
      `\nNode 24 pin parity FAILED in ${failures.length} repo(s). AGENTS.md: "All 7 repos pin Node 24 in both .node-version and engines.node — if mismatch found, ship a 1-line PR to fix."`,
    );
    process.exit(1);
  }

  if (missing.length === APP_REPOS.length) {
    console.log(
      `\nAll ${APP_REPOS.length} app repos are uninitialized submodules — run \`git submodule update --init\` before re-running.`,
    );
  } else {
    console.log(
      `\nNode 24 pin parity OK across ${ok.length}/${APP_REPOS.length} app repos${
        missing.length ? ` (${missing.length} skipped — submodule not initialized)` : ''
      }.`,
    );
  }
}
