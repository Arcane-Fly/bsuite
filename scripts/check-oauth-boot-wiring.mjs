#!/usr/bin/env node
/**
 * check-oauth-boot-wiring.mjs — no @bsuite/auth consumer may quietly lose its
 * cross-app session wiring.
 *
 * THE CLAIM THIS REPLACES, AND WHY IT COULD NOT BE BUILT AS WRITTEN
 *
 * docs/CONSISTENCY-REPORT.md asserted, in the present tense:
 *
 *   "Parent CI guard: .github/workflows/verify-silent-auth-wired.yml runs on every push
 *    to main + development and asserts every consumer's source tree references
 *    attemptSilentAuth in a .ts / .tsx file. Drift fails the guard — no consumer can
 *    quietly remove the wiring."
 *
 * No such workflow has ever existed. Worse, the invariant it describes is superseded:
 * `throughput/src/__tests__/oauth-contract.test.ts` asserts the OPPOSITE — that
 * AuthProvider does NOT call `attemptSilentAuth` on mount, and calls
 * `startBSTokenRefresh()` instead. Building the guard as specified would have enforced a
 * retired design against a live test, and gone red on the app that is most correct.
 *
 * A stale doc plus a missing gate is the dangerous combination: the doc supplies the
 * confidence, and there is nothing to contradict it.
 *
 * WHAT IS ACTUALLY TRUE ACROSS ALL FIVE CONSUMERS, measured 2026-08-22
 *
 *   crm7, conduit, braden, throughput, R80.4 — every one starts BS OAuth token
 *   auto-refresh on boot, and every one handles `error=login_required` at its callback.
 *
 * That pair IS the cross-app session. Losing either silently downgrades a user from a
 * transparent re-auth to a login screen, with nothing failing anywhere. So that pair is
 * what this gate holds.
 *
 * `attemptSilentAuth` is deliberately NOT required. It remains a capability the wrapper
 * re-exports; four of the five re-export it and R80.4 does not, and none of that changes
 * whether a user stays signed in.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Depending on @bsuite/auth is necessary to be a consumer, but not sufficient. */
export function dependsOnAuth(pkgJson) {
  const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
  return Object.prototype.hasOwnProperty.call(deps, '@bsuite/auth');
}

/**
 * THE SERVER IS DETECTED STRUCTURALLY, NEVER BY NAME.
 *
 * BSU depends on @bsuite/auth too — it uses the package to VERIFY tokens it issued. On
 * the dependency test alone it read as a consumer and the gate reported it missing both
 * boot signals, which is true and completely irrelevant: an authorization server does
 * not re-authenticate itself against itself.
 *
 * Hardcoding `business-suite-unified` would fix it and rot. This file's own comment
 * about R80.3 is the cautionary case — a name in a list outlived the repo it named. So
 * the discriminator is what the app SHIPS: only the authorization server implements the
 * OAuth endpoints as edge functions. Rename the repo and it still holds.
 */
export function servesOAuth(edgeFunctionNames) {
  return edgeFunctionNames.some((n) => /oauth/i.test(n));
}

export const REQUIRED = [
  { key: 'tokenRefresh', re: /startBSTokenRefresh\s*\(/,
    why: 'starts BS OAuth token auto-refresh, so a live cross-app session is renewed rather than expiring into a login screen' },
  { key: 'loginRequired', re: /login_required/,
    why: 'handles error=login_required at the callback, so a failed silent attempt falls back to an interactive sign-in instead of a dead end' },
];

export function evaluate(sourceTexts) {
  const joined = sourceTexts.join('\n');
  const missing = REQUIRED.filter((r) => !r.re.test(joined)).map((r) => r.key);
  return { missing, ok: missing.length === 0 };
}

const SELF_TESTS = [
  { name: 'depending on @bsuite/auth is necessary to be a consumer',
    run: () => dependsOnAuth({ dependencies: { '@bsuite/auth': '1.0.0' } }) === true },
  { name: 'an app that does not depend on it is not a consumer',
    run: () => dependsOnAuth({ dependencies: { react: '19' } }) === false },
  { name: 'shipping oauth edge functions marks the SERVER, whatever the repo is called',
    run: () => servesOAuth(['oauth-token', 'send-email']) === true },
  { name: 'a consumer ships no oauth endpoint of its own',
    run: () => servesOAuth(['send-email', 'sta-email-watch']) === false },
  { name: 'both signals present => ok',
    run: () => evaluate(['startBSTokenRefresh()', "if (e === 'login_required') {}"]).ok === true },
  { name: 'POSITIVE CONTROL: losing token refresh fails',
    run: () => evaluate(["if (e === 'login_required') {}"]).missing.join() === 'tokenRefresh' },
  { name: 'POSITIVE CONTROL: losing the login_required fallback fails',
    run: () => evaluate(['startBSTokenRefresh()']).missing.join() === 'loginRequired' },
  { name: 'an EMPTY source set fails — scanning nothing must never read as wired',
    run: () => evaluate([]).ok === false },
  { name: 'attemptSilentAuth is NOT required — throughput forbids it on mount and is correct',
    run: () => evaluate(['startBSTokenRefresh()', 'login_required']).ok === true },
];

if (process.argv.includes('--self-test')) {
  let failed = 0;
  for (const t of SELF_TESTS) {
    let ok = false;
    try { ok = t.run() === true; } catch { ok = false; }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) failed++;
  }
  console.log(`\n  ${SELF_TESTS.length - failed}/${SELF_TESTS.length} self-tests pass`);
  process.exit(failed ? 1 : 0);
}

const APPS = execFileSync('git', ['config', '--file', '.gitmodules', '--get-regexp', 'path'])
  .toString().trim().split('\n').map((l) => l.split(' ')[1]).filter(Boolean);

// A HARDCODED APP LIST ROTS SILENTLY. This file named R80.3 for months after that repo
// was archived; derive from .gitmodules so a new submodule is covered the day it lands.
if (APPS.length < 5) {
  console.error(`  POSITIVE CONTROL FAILED: .gitmodules lists only ${APPS.length} app(s).`);
  process.exit(3);
}

let consumers = 0, servers = 0, failed = 0;
for (const app of APPS) {
  const pkgPath = `${app}/package.json`;
  if (!existsSync(pkgPath)) {
    console.error(`  POSITIVE CONTROL FAILED: ${pkgPath} missing — submodule did not check out.`);
    console.error('  An uninitialised submodule is an empty directory; a scan of nothing reports');
    console.error('  exactly what a clean scan reports.');
    process.exit(3);
  }
  if (!dependsOnAuth(JSON.parse(readFileSync(pkgPath, 'utf8')))) {
    console.log(`  ${app.padEnd(24)} does not depend on @bsuite/auth`);
    continue;
  }
  const fns = existsSync(`${app}/supabase/functions`)
    ? readdirSync(`${app}/supabase/functions`) : [];
  if (servesOAuth(fns)) {
    servers++;
    console.log(`  ${app.padEnd(24)} OAuth SERVER — issues the tokens, does not consume them`);
    continue;
  }
  consumers++;
  const files = execFileSync('bash', ['-c',
    `find ${app}/src -type f \\( -name '*.ts' -o -name '*.tsx' \\) -not -path '*__tests__*' 2>/dev/null`,
  ]).toString().trim().split('\n').filter(Boolean);
  const { missing, ok } = evaluate(files.map((f) => readFileSync(f, 'utf8')));
  if (ok) console.log(`  ${app.padEnd(24)} wired (${files.length} source files)`);
  else {
    failed++;
    console.error(`  ${app.padEnd(24)} ** MISSING **`);
    for (const k of missing) console.error(`        ${k} — ${REQUIRED.find((r) => r.key === k).why}`);
  }
}

console.log(`\n  ${consumers} @bsuite/auth consumer(s) checked; ${servers} OAuth server(s).`);
if (!consumers) {
  console.error('  POSITIVE CONTROL FAILED: no consumers found at all. Nothing was checked.');
  process.exit(3);
}
// Exactly one authorization server is an architectural invariant, not a coincidence.
// Two would mean a second app started issuing tokens; zero would mean the discriminator
// stopped matching and every app just got silently reclassified as a consumer.
if (servers !== 1) {
  console.error(`  ARCHITECTURE CHANGED: expected exactly 1 OAuth server, found ${servers}.`);
  console.error('  Either a second app now issues tokens, or the structural discriminator');
  console.error('  (shipping oauth-* edge functions) no longer identifies the server. Both');
  console.error('  invalidate this gate\'s classification — fix the gate before trusting it.');
  process.exit(3);
}
if (failed) {
  console.error('\n  Losing either signal silently downgrades a signed-in user to a login screen.');
  console.error('  Nothing else in CI notices, because nothing throws — the session just ends.');
  console.error('  Authority: docs/CONSISTENCY-REPORT.md, cross-app SSO via OIDC, not cookies.');
  process.exit(1);
}
