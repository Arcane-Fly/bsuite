#!/usr/bin/env node
/**
 * FOLLOW 32 self-test — proves scripts/gitleaks-scan.sh scans the PR's own
 * range, not this repo's entire reachable history.
 *
 * WHY A DISPOSABLE REPO AND THE REAL BINARY, NOT A MOCK
 * ------------------------------------------------------
 * The bug this fixes is a property of `git log`'s default ref walk combined
 * with gitleaks' own default `--log-opts`, measured empirically 2026-09-04
 * against the installed `gitleaks` binary: with NO `--log-opts`, `gitleaks
 * detect --source .` scans every LOCAL branch ref reachable in the repo, not
 * just the checked-out ref's ancestry — a fixture planted on an unrelated
 * side branch was found while scanning from an unrelated branch's tip with
 * zero shared ancestry. A mock of gitleaks or of git's log walk would only
 * prove the mock's own assumptions; this test reproduces the exact shape of
 * the incident (bsuite#3027's f7ac5285 reddening every unrelated open PR) in
 * a repo built for the purpose, then runs the real script against it.
 *
 * SHAPE
 * -----
 *   A (main)  --  C (main, unrelated later commit — this is "the PR under test")
 *    \
 *     B (side branch — carries the planted secret, never merged into main)
 *
 * The fixture is a randomly-generated AKIA-shaped key, not the textbook
 * `AKIAIOSFODNN7EXAMPLE` from AWS's own docs — measured 2026-09-04: gitleaks
 * 8.24.3 allowlists that exact literal (it is the world's most-copied
 * placeholder, and scanners exclude it to cut noise on documentation), so a
 * test built around it would silently detect nothing and every control below
 * would read as a false pass.
 *
 * NEGATIVE CONTROL — a PR from A to C (the range this repo's own
 * gitleaks-scan.sh would compute for a real PR against `development` that
 * never touched the side branch) must find NOTHING. This is the exact
 * regression: the OLD unscoped invocation found B's secret even while
 * checked out on C, because it walks every ref, not the PR's own commits.
 *
 * POSITIVE CONTROL — a PR from A to B (one that DOES carry the fixture) must
 * find it, with a specific rule id and file. Without this, the negative
 * control could pass merely because detection itself is silently broken —
 * the exact "a probe passes loudest when it measures nothing" failure this
 * estate has hit before.
 *
 * Usage: node scripts/test-gitleaks-scan-scope.mjs
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const SCAN_SCRIPT = resolve(here, 'gitleaks-scan.sh');

let pass = 0;
let fail = 0;
const t = (name, fn) => {
  try {
    fn();
    pass++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL  ${name}\n      ${e.message}`);
  }
};

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(
      `${cmd} ${args.join(' ')} failed (exit ${r.status}):\n${r.stdout}\n${r.stderr}`,
    );
  }
  return r;
}

const repo = mkdtempSync(join(tmpdir(), 'gitleaks-scope-test-'));
const binDir = mkdtempSync(join(tmpdir(), 'gitleaks-scope-bin-'));

// AKIA + 16 base32-ish chars, matching the real rule's shape — freshly
// random per run so this is never mistaken for a real key, and never the
// canonical AWS-docs example gitleaks 8.24.3 deliberately allowlists.
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const FAKE_KEY =
  'AKIA' +
  Array.from(randomBytes(16))
    .map((b) => CHARSET[b % CHARSET.length])
    .join('');

try {
  sh('git', ['init', '-q', '-b', 'main'], { cwd: repo });
  sh('git', ['config', 'user.email', 'test@test.local'], { cwd: repo });
  sh('git', ['config', 'user.name', 'test'], { cwd: repo });

  writeFileSync(join(repo, 'file.txt'), 'hello\n');
  sh('git', ['add', 'file.txt'], { cwd: repo });
  sh('git', ['commit', '-q', '-m', 'A: initial'], { cwd: repo });
  const A = sh('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();

  sh('git', ['checkout', '-q', '-b', 'side'], { cwd: repo });
  // A real gitleaks default-rule shape (aws-access-token), not a made-up
  // pattern — the positive control must prove the REAL rule set catches it,
  // not a rule this test invented for itself.
  writeFileSync(join(repo, 'secret.txt'), `AWS_KEY=${FAKE_KEY}\n`);
  sh('git', ['add', 'secret.txt'], { cwd: repo });
  sh('git', ['commit', '-q', '-m', 'B: secret on side branch, never merged'], { cwd: repo });
  const B = sh('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();

  sh('git', ['checkout', '-q', 'main'], { cwd: repo });
  writeFileSync(join(repo, 'other.txt'), 'unrelated change\n');
  sh('git', ['add', 'other.txt'], { cwd: repo });
  sh('git', ['commit', '-q', '-m', 'C: unrelated commit, this is "the PR under test"'], { cwd: repo });
  const C = sh('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();

  const runScan = (base, head) =>
    spawnSync('bash', [SCAN_SCRIPT], {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        GITLEAKS_BASE_SHA: base,
        GITLEAKS_HEAD_SHA: head,
        GITLEAKS_BIN_DIR: binDir,
      },
    });

  // Prime the binary cache once so both controls below measure the SCOPE
  // logic, not two separate cold downloads racing each other.
  sh('bash', [SCAN_SCRIPT], {
    cwd: repo,
    env: { ...process.env, GITLEAKS_BASE_SHA: A, GITLEAKS_HEAD_SHA: A, GITLEAKS_BIN_DIR: binDir },
    allowFail: true,
  });

  t('REGRESSION CONTROL — the pre-fix invocation (no --log-opts) finds the side branch secret even from an unrelated tip', () => {
    // Reproduces the actual incident shape: checked out on C (no ancestry to
    // B at all), the OLD gitleaks invocation still finds B's secret because
    // it walks every local ref, not the checked-out ref's history.
    const r = spawnSync(join(binDir, 'gitleaks'), ['detect', '--source', '.', '--no-banner', '-v', '--redact'], {
      cwd: repo,
      encoding: 'utf8',
    });
    if (r.status !== 1 || !r.stdout.includes('aws-access-token') || !r.stdout.includes('secret.txt')) {
      throw new Error(
        `expected the unscoped invocation to reproduce the bug (exit 1, finding the secret) — ` +
          `got exit ${r.status}. If this changed, gitleaks' own default ref-walk behaviour ` +
          `changed and the regression this fix addresses may no longer apply the same way.\n${r.stdout}`,
      );
    }
  });

  t('NEGATIVE CONTROL — an unrelated PR range (A..C) finds nothing', () => {
    const r = runScan(A, C);
    if (r.status !== 0) {
      throw new Error(
        `expected exit 0 (no leaks) for range A..C, which never touches the side branch — ` +
          `got exit ${r.status}. This is the exact bug: a PR with no relation to the leaking ` +
          `branch was reddened by it.\n${r.stdout}\n${r.stderr}`,
      );
    }
  });

  t('POSITIVE CONTROL — a PR range that DOES carry the secret (A..B) is caught', () => {
    const r = runScan(A, B);
    if (r.status !== 1) {
      throw new Error(
        `expected exit 1 (leak found) for range A..B, which is exactly the commit that ` +
          `introduces the secret — got exit ${r.status}. Without this control the negative ` +
          `control above could pass merely because detection is broken.\n${r.stdout}\n${r.stderr}`,
      );
    }
    if (!r.stdout.includes('aws-access-token') || !r.stdout.includes('secret.txt')) {
      throw new Error(`leak was found but not attributed to the right rule/file:\n${r.stdout}`);
    }
  });

  t('FATAL, NOT SILENT — an unresolvable base SHA fails loudly rather than scanning nothing', () => {
    const r = runScan('0000000000000000000000000000000000000000', C);
    if (r.status === 0) {
      throw new Error(
        'an unresolvable base must never exit 0 — that is "scan nothing, report green", ' +
          'the exact failure mode this script exists to refuse.',
      );
    }
    if (!r.stderr.includes('FATAL')) {
      throw new Error(`expected a named FATAL diagnostic on stderr, got:\n${r.stderr}`);
    }
  });
} finally {
  rmSync(repo, { recursive: true, force: true });
  rmSync(binDir, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
