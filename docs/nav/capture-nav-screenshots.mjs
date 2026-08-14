#!/usr/bin/env node
/**
 * capture-nav-screenshots.mjs — §9.2 visual-equivalence capture for the nav lane.
 *
 * Drives the SYSTEM Chrome (channel: 'chrome') rather than a Playwright-managed
 * browser, because ~/.cache/ms-playwright is empty on this host and downloading a
 * browser is not worth it when /usr/bin/google-chrome already exists.
 *
 * Captures every target at the three breakpoints the plan mandates: 375 / 768 / 1440.
 *
 * Also records, per target:
 *   - console errors (a nav that renders but throws is not "working")
 *   - failed network requests
 *   - whether the expected nav strings are present in the DOM
 *
 * A screenshot alone proves a page painted. The assertions below are what make it
 * evidence rather than decoration.
 *
 * Usage: node docs/nav/capture-nav-screenshots.mjs
 * Requires the dev servers named in TARGETS to already be running.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// This script lives in docs/nav/, outside any app's module scope, so a bare
// `import 'playwright'` cannot resolve. Each app carries its own playwright —
// resolve from whichever is present rather than adding a dependency at repo root.
const ROOT = '/home/braden/Desktop/Dev/bsuite';
const HOSTS = ['braden', 'throughput', 'business-suite-unified', 'crm7', 'conduit'];
// The apps install `@playwright/test` (which re-exports chromium), not the bare
// `playwright` package — try both names.
const PKGS = ['@playwright/test', 'playwright'];
let chromium = null;
outer: for (const h of HOSTS) {
  for (const pkg of PKGS) {
    try {
      const req = createRequire(`${ROOT}/${h}/package.json`);
      const mod = req(pkg);
      if (mod?.chromium) {
        chromium = mod.chromium;
        console.log(`[chromium resolved from ${h} via ${pkg}]`);
        break outer;
      }
    } catch {
      /* try the next candidate */
    }
  }
}
if (!chromium) {
  console.error(`Could not resolve chromium. Hosts: ${HOSTS.join(', ')} | pkgs: ${PKGS.join(', ')}`);
  process.exit(2);
}

const OUT = new URL('./screenshots/', import.meta.url).pathname;
const BREAKPOINTS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

const TARGETS = [
  {
    app: 'braden',
    url: 'http://localhost:4801/',
    // Phase 3.5 added these three to the primary nav; /traineeships was previously
    // linked from nowhere at all.
    expect: ['Apprenticeships', 'Traineeships', 'Recruitment'],
  },
  {
    app: 'throughput',
    url: 'http://localhost:4802/login',
    // Phase 0 removed the dead /todos link and Phase 3.1 added the avatar dropdown.
    // Both live in <Navigation />, which is mounted by <Layout> — and /login is
    // registered OUTSIDE that group (App.tsx:164 vs the "/" group at :189). So this
    // page NEVER renders the nav, and asserting on it proves nothing either way.
    //
    // It is kept as a smoke target (does the app boot, does it paint) but its nav
    // assertions are empty and it is marked requiresAuth so a pass here is never
    // mistaken for nav verification.
    //
    // The one console error seen here is NOT a product defect: /login fires BS OAuth
    // and Supabase rejects redirect_uri=http://localhost:4802/auth/callback with
    // {"error_code":"validation_failed","msg":"invalid redirect_uri"} because 4802 is
    // an arbitrary port this harness chose and is not in the allowlist. redirect_uri
    // matching is byte-exact. Verifying throughput's nav needs a signed-in session on
    // an allowlisted origin — tracked as outstanding rather than faked.
    expect: [],
    expectAbsent: [],
    requiresAuth: true,
    allowConsoleErrorPattern: /invalid redirect_uri|status of 400/,
  },
];

const results = [];

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// WARM-UP. Vite optimizes dependencies on first request, and that race produced
// phantom 404s / ERR_CONNECTION_CLOSED in whichever slot happened to run first —
// the failure moved between braden and throughput depending on ordering, which is
// the signature of a harness artifact rather than a product defect. Load each
// target once, unmeasured, so the measured runs hit a warm server.
{
  const warm = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const wp = await warm.newPage();
  for (const t of TARGETS) {
    try {
      await wp.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await wp.waitForTimeout(3000);
    } catch {
      /* warm-up failures are not evidence */
    }
  }
  await warm.close();
  console.log('[warm-up complete]');
}

for (const target of TARGETS) {
  for (const bp of BREAKPOINTS) {
    const ctx = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    const consoleErrors = [];
    const failedRequests = [];
    const badResponses = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
    });
    page.on('requestfailed', (r) => {
      failedRequests.push(`${r.method()} ${r.url().slice(0, 120)}`);
    });
    // A 4xx/5xx is a SUCCESSFUL network request, so `requestfailed` never sees it.
    // Without this the console shows a bare "status of 400" with no URL, which is
    // unattributable — you cannot tell your own regression from a pre-existing one.
    page.on('response', async (resp) => {
      const s = resp.status();
      if (s >= 400) {
        let body = '';
        try {
          body = (await resp.text()).slice(0, 300);
        } catch {
          /* body may be unavailable */
        }
        badResponses.push({ status: s, method: resp.request().method(), url: resp.url().slice(0, 200), body });
      }
    });

    let status = null;
    let error = null;
    try {
      const resp = await page.goto(target.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      status = resp?.status() ?? null;
      // Let the SPA hydrate and the nav render. 2500ms was not enough: at 375 it
      // raced an in-flight request and produced a phantom 404 that did not reproduce
      // at 4000ms on either viewport. Flaky evidence is worse than none.
      await page.waitForTimeout(4000);
    } catch (e) {
      error = String(e).slice(0, 300);
    }

    const dir = join(OUT, target.app);
    mkdirSync(dir, { recursive: true });
    const shot = join(dir, `${bp.name}.png`);
    await page.screenshot({ path: shot, fullPage: false });

    const bodyText = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');

    const present = (target.expect ?? []).map((s) => ({ s, found: bodyText.includes(s) }));
    const absent = (target.expectAbsent ?? []).map((s) => ({ s, stillPresent: bodyText.includes(s) }));

    results.push({
      app: target.app,
      breakpoint: bp.name,
      url: target.url,
      httpStatus: status,
      navError: error,
      screenshot: shot.replace(/.*\/docs\//, 'docs/'),
      consoleErrorCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 5),
      failedRequestCount: failedRequests.length,
      failedRequests: failedRequests.slice(0, 5),
      badResponses: badResponses.slice(0, 8),
      expectedPresent: present,
      expectedAbsent: absent,
      // A target passes only if it loaded, threw no console errors, and every
      // string assertion held in both directions.
      requiresAuth: Boolean(target.requiresAuth),
      // Console errors matching an explicitly-documented allowance do not fail the
      // run. The allowance must name WHY in the target definition — this is not a
      // blanket mute, and anything unmatched still fails.
      pass:
        !error &&
        consoleErrors.filter(
          (e) => !(target.allowConsoleErrorPattern && target.allowConsoleErrorPattern.test(e))
        ).length === 0 &&
        present.every((p) => p.found) &&
        absent.every((a) => !a.stillPresent),
    });

    await ctx.close();
  }
}

await browser.close();

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'report.json'), JSON.stringify(results, null, 2) + '\n');

for (const r of results) {
  const flag = r.pass ? (r.requiresAuth ? 'SMOKE' : 'PASS') : 'FAIL';
  console.log(
    `${flag}  ${r.app.padEnd(11)} ${r.breakpoint.padEnd(5)} http=${r.httpStatus} ` +
      `consoleErr=${r.consoleErrorCount} netFail=${r.failedRequestCount}`
  );
  for (const p of r.expectedPresent) if (!p.found) console.log(`        MISSING expected string: "${p.s}"`);
  for (const a of r.expectedAbsent) if (a.stillPresent) console.log(`        STILL PRESENT (should be gone): "${a.s}"`);
  if (r.navError) console.log(`        navError: ${r.navError}`);
  for (const e of r.consoleErrors) console.log(`        console: ${e}`);
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
