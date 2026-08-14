#!/usr/bin/env node
/**
 * capture-authed-nav.mjs — §9.2 capture for AUTH-GATED navs on the deployed
 * `development` previews (the `d.` hosts).
 *
 * The unauthenticated harness (capture-nav-screenshots.mjs) can only reach
 * braden's public marketing nav. Every other app's nav renders inside an
 * authenticated shell, so the interesting surfaces — BSU's sidebar, the Route
 * Inspector, throughput's avatar dropdown, crm7's sub-nav — are invisible to it.
 *
 * This signs in once against BSU with the E2E credentials from .env.local, then
 * reuses that browser context across apps. Cross-app SSO rides on BS OAuth 2.1
 * PKCE with per-app storageKey isolation, so a shared context is not guaranteed
 * to carry the session everywhere — each target therefore re-checks whether it
 * actually landed authenticated and reports honestly rather than screenshotting
 * a login page and calling it a nav.
 *
 * Credentials are read from .env.local and NEVER logged.
 *
 * Usage: node docs/nav/capture-authed-nav.mjs [--out <dir>] [--label before|after]
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = '/home/braden/Desktop/Dev/bsuite';

// ---------------------------------------------------------------------------
// Resolve chromium (apps ship @playwright/test, not bare `playwright`)
// ---------------------------------------------------------------------------
let chromium = null;
for (const h of ['braden', 'throughput', 'business-suite-unified', 'crm7', 'conduit']) {
  for (const pkg of ['@playwright/test', 'playwright']) {
    try {
      const mod = createRequire(`${ROOT}/${h}/package.json`)(pkg);
      if (mod?.chromium) { chromium = mod.chromium; break; }
    } catch { /* next */ }
  }
  if (chromium) break;
}
if (!chromium) { console.error('chromium not resolvable'); process.exit(2); }

// ---------------------------------------------------------------------------
// Credentials — read, never printed
// ---------------------------------------------------------------------------
function readEnvLocal() {
  const p = join(ROOT, '.env.local');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = readEnvLocal();
const EMAIL = env.CRM7_E2E_EMAIL;
const PASSWORD = env.CRM7_E2E_PASSWORD;
const BYPASS = env.VERCEL_AUTOMATION_BYPASS_SECRET;
if (!EMAIL || !PASSWORD) {
  console.error('CRM7_E2E_EMAIL / CRM7_E2E_PASSWORD missing from .env.local');
  process.exit(2);
}
console.log(`[creds loaded for ${EMAIL.replace(/(.{2}).*(@.*)/, '$1***$2')}]`);

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const LABEL = args.includes('--label') ? args[args.indexOf('--label') + 1] : 'capture';
const OUT = join(ROOT, 'docs/nav/screenshots-authed', LABEL);

const BREAKPOINTS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

const TARGETS = [
  {
    app: 'bsu',
    url: 'https://d.suite.crm7.app/',
    // BSU sidebar sections from src/config/navigation.ts
    expect: ['Dashboard'],
  },
  {
    app: 'bsu-route-inspector',
    url: 'https://d.suite.crm7.app/developer/route-inspector',
    // Phase 6 tab. Absent until PR #728 merges — that is the point of before/after.
    expect: [],
    note: 'Route Inspector tab — expected ABSENT before PR #728, PRESENT after',
    probe: ['Route Inspector', 'App Tree', 'Cross-app Matrix', 'DB Navigation'],
  },
  {
    app: 'crm7',
    url: 'https://d.crm.crm7.app/dashboard',
    expect: [],
    probe: ['Dashboard', 'People', 'Settings'],
  },
  {
    app: 'crm7-documents',
    url: 'https://d.crm.crm7.app/documents',
    // Phase 3.3 added a 6-tab bar here; it had ZERO sub-nav before.
    expect: [],
    probe: ['Hub', 'Templates', 'Signatures', 'Management', 'Compliance'],
    note: 'documents sub-nav — expected ABSENT before PR #1732',
  },
  {
    app: 'throughput',
    url: 'https://d.ideas.crm7.app/',
    expect: [],
    probe: ['Dashboard', 'Launch Pad', 'Analytics', 'Teams'],
    probeAbsent: ['Todos'],
  },
];

const results = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });

// One shared context so the SSO session persists across apps.
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  extraHTTPHeaders: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {},
});

// ---------------------------------------------------------------------------
// Sign in at BOTH the dev-preview BSU and PRODUCTION BSU.
//
// Why both: the cross-app handoff does NOT point at whichever BSU you came
// from. `signInWithBusinessSuite` sends the browser to Supabase's own
// `/auth/v1/oauth/authorize` (packages/auth/src/oauth-client.ts:506), and
// Supabase renders that against its configured SITE_URL — production
// `suite.crm7.app`. Measured: from d.crm.crm7.app an unauthenticated visit
// bounces to https://suite.crm7.app/login, not d.suite.
//
// So a session on d.suite alone leaves every OTHER dev preview anonymous. This
// is a platform fact (Supabase SITE_URL is single-valued), not a crm7 defect —
// crm7#1405 already fixed the separate bug where suiteLinks hardcoded prod
// literals, and `bsuiteAppUrl()` now resolves from env correctly.
// ---------------------------------------------------------------------------
async function signIn(origin) {
  const p = await ctx.newPage();
  try {
    await p.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(4000);
    if (!(await p.$('#auth-email'))) {
      console.log(`[sign-in] ${origin}: no email field (already signed in, or a different login UI)`);
      await p.close();
      return;
    }
    await p.fill('#auth-email', EMAIL);
    await p.fill('#auth-password', PASSWORD);
    await Promise.all([
      p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {}),
      p.click('button:has-text("Sign In")'),
    ]);
    await p.waitForTimeout(8000);
    const url = p.url();
    console.log(`[sign-in] ${origin} -> ${/\/login/.test(url) ? `STILL ON LOGIN (${url})` : `authenticated (${url})`}`);
  } catch (e) {
    console.log(`[sign-in] ${origin} FAILED: ${String(e).slice(0, 140)}`);
  }
  await p.close();
}

await signIn('https://d.suite.crm7.app');
await signIn('https://suite.crm7.app');

// ---------------------------------------------------------------------------
for (const t of TARGETS) {
  for (const bp of BREAKPOINTS) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: bp.width, height: bp.height });

    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

    let status = null, error = null;
    try {
      const r = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      status = r?.status() ?? null;
      await page.waitForTimeout(6000);
    } catch (e) { error = String(e).slice(0, 200); }

    const dir = join(OUT, t.app);
    mkdirSync(dir, { recursive: true });
    const shot = join(dir, `${bp.name}.png`);
    await page.screenshot({ path: shot });

    const text = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    const landedUrl = page.url();
    // If we bounced to a login/auth screen the screenshot is of a login page, and
    // reporting it as nav evidence would be a lie.
    const authed = !/\/login|\/auth\//.test(landedUrl);

    results.push({
      app: t.app,
      breakpoint: bp.name,
      requestedUrl: t.url,
      landedUrl,
      authenticated: authed,
      httpStatus: status,
      navError: error,
      screenshot: shot.replace(`${ROOT}/`, ''),
      consoleErrorCount: consoleErrors.length,
      expectedPresent: (t.expect ?? []).map((s) => ({ s, found: text.includes(s) })),
      probes: (t.probe ?? []).map((s) => ({ s, found: text.includes(s) })),
      probesAbsent: (t.probeAbsent ?? []).map((s) => ({ s, stillPresent: text.includes(s) })),
      note: t.note ?? null,
    });
    await page.close();
  }
}

await browser.close();
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'report.json'), JSON.stringify(results, null, 2) + '\n');

for (const r of results) {
  const auth = r.authenticated ? 'AUTHED' : 'ANON  ';
  console.log(`${auth} ${r.app.padEnd(21)} ${r.breakpoint.padEnd(5)} http=${r.httpStatus} err=${r.consoleErrorCount}`);
  for (const p of r.expectedPresent) if (!p.found) console.log(`         MISSING: "${p.s}"`);
  const hits = r.probes.filter((p) => p.found).map((p) => p.s);
  const miss = r.probes.filter((p) => !p.found).map((p) => p.s);
  if (r.probes.length) console.log(`         probe found: [${hits.join(', ')}] missing: [${miss.join(', ')}]`);
  for (const a of r.probesAbsent) console.log(`         absent-check "${a.s}": ${a.stillPresent ? 'STILL PRESENT' : 'gone'}`);
  if (!r.authenticated) console.log(`         bounced to ${r.landedUrl}`);
}
console.log(`\nwrote ${OUT}/report.json`);
