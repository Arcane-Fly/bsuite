#!/usr/bin/env node
// Fails if any app pnpm-lock.yaml is workspace-poisoned: lockfiles generated
// from inside the bsuite tree embed `..`/`../packages/*` importers, which
// break Vercel standalone builds with ERR_PNPM_OUTDATED_LOCKFILE.
// Correct lockfiles have `.:` as the ONLY importer.
// (Production-readiness plan Workstream A, Task A2.)
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

function findImporterKeys(lockText) {
  // Importer keys are 2-space-indented children of the top-level
  // `importers:` block, e.g. `  .:` or `  ../packages/theme:`.
  const keys = [];
  let inImporters = false;
  for (const line of lockText.split('\n')) {
    if (line === 'importers:') {
      inImporters = true;
      continue;
    }
    if (inImporters) {
      if (/^\S/.test(line)) break; // next top-level key ends the block
      const m = line.match(/^ {2}(\S[^:]*):\s*$/);
      if (m) keys.push(m[1]);
    }
  }
  return keys;
}

async function checkRepo(repoPath) {
  const result = { repo: repoPath, status: 'ok', issues: [] };

  const lockPath = path.join(repoPath, 'pnpm-lock.yaml');
  if (!(await pathExists(lockPath))) {
    result.status = 'missing';
    result.issues.push(
      `${lockPath}: absent (submodule not initialized? run \`git submodule update --init ${repoPath}\`)`,
    );
    return result;
  }

  const lockText = await readFile(lockPath, 'utf8');
  const importers = findImporterKeys(lockText);

  if (importers.length === 0) {
    result.status = 'fail';
    result.issues.push(`${lockPath}: no importers block found — lockfile malformed or truncated`);
    return result;
  }

  const foreign = importers.filter((k) => k !== '.');
  if (foreign.length > 0) {
    result.status = 'fail';
    result.issues.push(
      `${lockPath}: workspace-poisoned importers ${JSON.stringify(foreign)} — ` +
        'regenerate OUTSIDE the bsuite tree (see CLAUDE.md "Lockfile generation")',
    );
  }

  if (lockText.includes('../packages/')) {
    result.status = 'fail';
    result.issues.push(
      `${lockPath}: contains "../packages/" reference — Vercel clones the app repo standalone; the parent packages/ dir will not exist`,
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
  const tmp = await mkdtemp(path.join(tmpdir(), 'check-lockfile-hygiene-'));
  try {
    const goodRepo = path.join(tmp, 'good-repo');
    await mkdir(goodRepo, { recursive: true });
    await writeFile(
      path.join(goodRepo, 'pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies:\n      react:\n        specifier: ^19.2.5\n        version: 19.2.7\n\npackages: {}\n",
    );

    const poisonedRepo = path.join(tmp, 'poisoned-repo');
    await mkdir(poisonedRepo, { recursive: true });
    await writeFile(
      path.join(poisonedRepo, 'pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies: {}\n\n  ../packages/theme:\n    dependencies: {}\n\npackages: {}\n",
    );

    const fileRefRepo = path.join(tmp, 'file-ref-repo');
    await mkdir(fileRefRepo, { recursive: true });
    await writeFile(
      path.join(fileRefRepo, 'pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\n\nimporters:\n\n  .:\n    dependencies:\n      '@bsuite/theme':\n        specifier: file:../packages/theme\n        version: 'link:../packages/theme'\n\npackages: {}\n",
    );

    const results = await runChecks(tmp, ['good-repo', 'poisoned-repo', 'file-ref-repo', 'absent-repo']);
    const byRepo = Object.fromEntries(results.map((r) => [r.repo, r]));

    const assertions = [
      ['good-repo is ok', byRepo['good-repo']?.status === 'ok'],
      ['good-repo has 0 issues', byRepo['good-repo']?.issues.length === 0],
      ['poisoned-repo is fail', byRepo['poisoned-repo']?.status === 'fail'],
      [
        'poisoned-repo names the foreign importer',
        byRepo['poisoned-repo']?.issues.some((i) => i.includes('../packages/theme')),
      ],
      ['file-ref-repo is fail', byRepo['file-ref-repo']?.status === 'fail'],
      [
        'file-ref-repo names the ../packages reference',
        byRepo['file-ref-repo']?.issues.some((i) => i.includes('../packages/')),
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

  for (const r of ok) console.log(`  ✓ ${r.repo}: lockfile standalone-clean ('.:' only importer)`);
  for (const r of missing) console.log(`  · ${r.repo}: ${r.issues[0]}`);
  for (const r of failures) {
    console.error(`  ✗ ${r.repo}:`);
    for (const issue of r.issues) console.error(`      ${issue}`);
  }

  if (failures.length > 0) {
    console.error(
      `\nLockfile hygiene FAILED in ${failures.length} repo(s). Regenerate outside the bsuite tree per CLAUDE.md "Lockfile generation".`,
    );
    process.exit(1);
  }

  if (missing.length === APP_REPOS.length) {
    console.log(
      `\nAll ${APP_REPOS.length} app repos are uninitialized submodules — run \`git submodule update --init\` before re-running.`,
    );
  } else {
    console.log(
      `\nLockfile hygiene OK across ${ok.length}/${APP_REPOS.length} app repos${
        missing.length ? ` (${missing.length} skipped — submodule not initialized)` : ''
      }.`,
    );
  }
}
