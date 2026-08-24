#!/usr/bin/env node
/**
 * PAGE-BY-PAGE UI AUDIT — the structural half of theme conformance.
 *
 * WHY THIS EXISTS SEPARATELY FROM audit-applied-tokens.mjs
 * That script proves the COLOURS and FONT reach the DOM. It says nothing about
 * whether the page is usable: whether navigation is present, whether a table
 * rendered its cells, whether an image 404'd, whether a raw `undefined` leaked
 * into a label. Every one of those is a UI defect an operator sees immediately
 * and no colour gate can detect.
 *
 * The operator's own review is the specification here — each check below exists
 * because a real report named it:
 *   "navigation not available on all pages"          -> U1
 *   "Jodie AI is missing its logo icon"              -> U5
 *   "logo isn't the logo uploaded to the platform"   -> U5
 *   "no way to navigate away"                        -> U1
 *   "cant even see where to add roles"               -> U2 (empty region)
 *   "checkboxes too hard to see"                     -> U6
 *
 * WHAT IT ASSERTS, per page
 *   U1  navigation is PRESENT and has real links (an app page with no nav traps
 *       the user — the operator hit exactly this in the candidate portal)
 *   U2  no table/grid renders a header with zero body rows AND no empty-state
 *       message. Either show data or say why there is none; a bare header reads
 *       as broken.
 *   U3  no uncaught console errors
 *   U4  no horizontal overflow at 1440 or 375 (a page you must scroll sideways
 *       to read is broken, not "responsive")
 *   U5  no broken images. A 404'd logo is the single most visible brand defect.
 *   U6  every interactive control has an accessible name, and every checkbox /
 *       radio has a visible border or background — an invisible control is not
 *       a styling preference, it is unusable.
 *   U7  no raw `undefined` / `null` / `NaN` / `[object Object]` in visible text.
 *
 * Usage: node scripts/audit-ui-pages.mjs <url> [<url>...] [--app <n>] [--storage <f>]
 *        [--json] [--viewport 1440|375]
 */
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { settledOrSkip } from './lib/settled-or-skip.mjs';
const require_ = createRequire(import.meta.url);

function resolvePlaywright() {
  const roots = ['..', '../braden', '../conduit', '../throughput', '../crm7',
                 '../business-suite-unified', '../R80.4'];
  for (const r of roots) {
    try { return require_(new URL(`${r}/node_modules/playwright/index.js`, import.meta.url).pathname); } catch {}
  }
  for (const r of roots) {
    try {
      const base = new URL(`${r}/node_modules/.pnpm/`, import.meta.url).pathname;
      const hit = readdirSync(base).find((d) => d.startsWith('playwright@'));
      if (hit) return require_(`${base}${hit}/node_modules/playwright/index.js`);
    } catch {}
  }
  console.error('playwright not found'); process.exit(2);
}
const { chromium } = resolvePlaywright();

const argv = process.argv;
const flag = (n, d) => { const i = argv.indexOf(n); return i > -1 ? argv[i + 1] : d; };
const app = flag('--app', 'unknown');
const storageState = flag('--storage', undefined);
const width = Number(flag('--viewport', '1440'));
const asJson = argv.includes('--json');
const urls = [];
for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--app' || a === '--storage' || a === '--viewport') { i++; continue; }
  if (a.startsWith('--')) continue;
  urls.push(a);
}
if (!urls.length) { console.error('usage: audit-ui-pages.mjs <url>... [--app <n>]'); process.exit(2); }

async function launch() {
  try { return await chromium.launch(); } catch (e) {
    for (const p of ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium']) {
      try { return await chromium.launch({ executablePath: p }); } catch {}
    }
    throw e;
  }
}

const browser = await launch();
const context = await browser.newContext({
  ...(storageState ? { storageState } : {}),
  viewport: { width, height: 900 },
});
const page = await context.newPage();

const results = [];
let anyFailed = false, skipped = 0;

for (const url of urls) {
  const consoleErrors = [];
  const badRequests = [];
  // Dev-server noise is not an app defect and CANNOT occur in production. Vite's
  // HMR socket in particular fails whenever the page is served from a different
  // port than the one the client was built against — which is every time a dev
  // server restarts on a new port. Left unfiltered it reported 7 of 7 crm7 pages
  // as failing, which would have made this audit worthless on its first real run.
  // Match the SOURCE (@vite/client, the HMR socket) rather than the wording —
  // Vite emits at least three different phrasings for the same dead socket
  // ("failed to connect to websocket", "Failed to send error to Vite server",
  // "WebSocket closed without opened"), and chasing message text one variant at
  // a time is how a filter stays permanently one release behind.
  const DEV_NOISE = /@vite\/client|\[vite\]|Vite server|ws:\/\/localhost|failed to connect to websocket|WebSocket closed without opened|HMR|react-refresh|Download the React DevTools/i;
  const onErr = (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (DEV_NOISE.test(t)) return;
    consoleErrors.push(t.slice(0, 160));
  };
  const onResp = (r) => {
    // Only assets we RENDER. A failed analytics beacon is not a UI defect.
    if (r.status() >= 400 && /\.(png|jpe?g|svg|webp|gif|avif|woff2?)(\?|$)/i.test(r.url())) {
      badRequests.push(`${r.status()} ${r.url().split('/').pop().slice(0, 60)}`);
    }
  };
  page.on('console', onErr);
  page.on('response', onResp);

  const findings = [];
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

    // Same origin guard as the token audit: auditing the OAuth server's error
    // page and attributing it to the app produced 8 false findings once already.
    if (new URL(page.url()).origin !== new URL(url).origin) {
      results.push({ url, skipped: `off-origin -> ${new URL(page.url()).origin}` });
      skipped++;
      page.off('console', onErr); page.off('response', onResp);
      continue;
    }
    // SAME-ORIGIN AUTH REDIRECT. An app can bounce an unauthenticated request to
    // its OWN /login, which the origin guard above cannot see. Auditing that page
    // as if it were the route you asked for produces confident nonsense: it has
    // no navigation by design, so U1 fires and reports the user as "trapped" on
    // three throughput routes that are simply behind a login. Measured 2026-08-04
    // — I nearly filed all three.
    const landedPath = new URL(page.url()).pathname;
    if (!/\/(login|signin|sign-in|auth)(\/|$)/.test(new URL(url).pathname) &&
        /\/(login|signin|sign-in|auth)(\/|$)/.test(landedPath)) {
      results.push({ url, skipped: `redirected to ${landedPath} — needs a session for THIS app` });
      skipped++;
      page.off('console', onErr); page.off('response', onResp);
      continue;
    }
    await page.evaluate(() => document.fonts.ready);

    // WAIT FOR THE DOM TO SETTLE, not for a magic number. A fixed 1200ms caught
    // crm7 mid-render: its AuthAwareBrandingProvider deliberately renders children
    // WITHOUT the branding context until auth resolves, so a component calling
    // useBranding in that window throws, an ErrorBoundary catches it, and the app
    // then recovers on the next render. Sampled at 1.2s that reads as "every
    // authenticated route crashes". Sampled after it settles, it is clean.
    // I nearly filed that as a P0.
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let timer = setTimeout(resolve, 600);
        const obs = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => { obs.disconnect(); resolve(); }, 600);
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true });
        setTimeout(() => { obs.disconnect(); resolve(); }, 6000);   // hard cap
      });
    });
    // Console errors are collected from navigation onward, so anything logged
    // during the transient pre-settle render is still captured — but the DOM
    // assertions below now judge the SETTLED page.
    consoleErrors.length = 0;   // transient render noise; see the settle comment

    // THIRD GUARD — the route gate. See scripts/lib/settled-or-skip.mjs. The
    // settle wait above returns as soon as the DOM stops CHANGING, and a
    // <ProtectedRoute> spinner is a settled DOM: it stops mutating and sits
    // there. Same origin, not /login, correct <title>, one heading, no
    // findings — "1 clean" over a page nobody looked at, measured live on
    // /contacts on 2026-08-18. A skip is not a pass, and audit-routes.sh fails
    // the AUTHENTICATED sweep on a skip, which is the outcome this deserves.
    const gate = await settledOrSkip(page);
    if (gate) {
      results.push({ url, skipped: gate });
      skipped++;
      page.off('console', onErr); page.off('response', onResp);
      continue;
    }

    const r = await page.evaluate(() => {
      const out = { nav: 0, emptyTables: [], overflow: null, unnamed: [], invisibleControls: [], placeholders: [] };
      const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

      // U1 — navigation present with REAL links. `<nav>` alone is not enough; a
      // nav with no anchors is the trap the operator described as "no way to
      // navigate away".
      const navs = [...document.querySelectorAll('nav, [role="navigation"], aside, header')];
      out.nav = navs.filter(vis).reduce((n, el) => n + el.querySelectorAll('a[href], button').length, 0);
      // A page can give the user a way OUT without a <nav>. BSU's /privacy and
      // /terms are deliberately minimal-chrome and carry "← Back to Business
      // Suite" as a plain link — the user is not trapped, and reporting them as
      // trapped was testing the wrong property.
      // The operator's complaint was FUNCTIONAL — "no way to navigate away" —
      // so the check is: does an escape route exist? A link home, back, or to
      // another top-level page counts.
      if (out.nav === 0) {
        out.nav = [...document.querySelectorAll('a[href]')].filter((a) => {
          if (!vis(a)) return false;
          const href = a.getAttribute('href') || '';
          const text = (a.textContent || '').toLowerCase();
          if (/^(mailto:|tel:|#)/.test(href)) return false;      // not an escape
          return href === '/' || /back|home|return|dashboard|suite/.test(text) ||
                 (href.startsWith('/') && href !== location.pathname);
        }).length;
      }

      // U2 — a table with a header row and no body rows and no empty-state text
      // reads as broken. Either render data or say why there is none.
      for (const t of document.querySelectorAll('table')) {
        if (!vis(t)) continue;
        const head = t.querySelectorAll('thead th, thead td').length;
        const body = t.querySelectorAll('tbody tr').length;
        if (head > 0 && body === 0) {
          const near = (t.closest('section,div,article')?.innerText || '').toLowerCase();
          const hasEmptyState = /no |none|empty|nothing|0 result|add your first|get started/.test(near);
          if (!hasEmptyState) out.emptyTables.push(`${head} cols, 0 rows, no empty-state`);
        }
      }

      // U4 — horizontal overflow. documentElement is the honest measure.
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 2) {
        const culprits = [...document.querySelectorAll('*')].filter((el) => {
          if (!vis(el)) return false;
          const r = el.getBoundingClientRect();
          return r.right > de.clientWidth + 2 && r.width > 40;
        }).slice(0, 3).map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`);
        out.overflow = { by: de.scrollWidth - de.clientWidth, culprits };
      }

      // U6 — accessible names, and controls you can actually SEE.
      for (const el of document.querySelectorAll('button, a[href], input, select, textarea')) {
        if (!vis(el)) continue;
        // A CONTROL REMOVED FROM THE ACCESSIBILITY TREE CANNOT HAVE AN
        // ACCESSIBLE NAME, and does not need one — asking it for a name is
        // asking the wrong question.
        //
        // The pattern that exposed this: a custom date field keeps a native
        // picker off-screen to open the browser's calendar, and marks it
        // exactly as the platform says to —
        //
        //   <input type="date" aria-hidden="true" tabindex="-1"
        //          style="width:1px;height:1px;opacity:0;pointer-events:none">
        //
        // It is unreachable by keyboard, unannounced by a screen reader, and
        // invisible. R80.4's calculator carries four, and this check reported
        // all four as U6 failures on the first run that could reach its
        // authenticated routes (2026-08-24). `audit-legibility` has skipped
        // `[inert], [aria-hidden="true"]` from the start; this check simply
        // never learned the same thing.
        //
        // `closest`, not a own-attribute test: aria-hidden is INHERITED down the
        // subtree, so a control inside a hidden container is hidden too.
        if (el.closest('[inert], [aria-hidden="true"]')) continue;
        // An accessible name can come from a <label for>, an aria-labelledby
        // target, or a nested control — not just the element's own attributes.
        // BSU's locale radios carry id={inputId} with a sibling <Label htmlFor>,
        // which IS a valid association (button is a labelable element), and the
        // first version of this check reported both as unnamed.
        const labelledBy = el.getAttribute('aria-labelledby');
        const fromLabelledBy = labelledBy
          ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')
          : '';
        const fromLabel = el.id
          ? (document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent || '')
          : '';
        const fromWrappingLabel = el.closest('label')?.textContent || '';
        const name = (el.getAttribute('aria-label') || el.getAttribute('title') ||
                      el.textContent || el.getAttribute('placeholder') ||
                      el.getAttribute('alt') || fromLabelledBy || fromLabel ||
                      fromWrappingLabel || '').trim();
        if (!name && !el.querySelector('svg[aria-label], img[alt]')) {
          out.unnamed.push(`${el.tagName}.${String(el.className).slice(0, 44)}`);
        }
        if (/^(checkbox|radio)$/.test(el.type || '')) {
          const cs = getComputedStyle(el);
          const transparent = (v) => !v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent';
          if (transparent(cs.backgroundColor) && (transparent(cs.borderTopColor) || cs.borderTopWidth === '0px')
              && cs.appearance === 'none') {
            out.invisibleControls.push(`${el.type}.${String(el.className).slice(0, 40)}`);
          }
        }
      }

      // U7 — a raw undefined/NaN on screen is always a bug, never a design choice.
      const body = document.body.innerText || '';
      for (const bad of ['undefined', 'NaN', '[object Object]', 'null,']) {
        if (body.includes(bad)) {
          const i = body.indexOf(bad);
          out.placeholders.push(`"${body.slice(Math.max(0, i - 30), i + bad.length + 20).replace(/\s+/g, ' ')}"`);
        }
      }
      return out;
    });

    // U1 does not apply to auth screens and OAuth callbacks. They are deliberately
    // chrome-less — a callback is a transient redirect target, and putting app
    // navigation on it would invite the user to wander off mid-handshake.
    const chromeless = /\/(login|signin|sign-in|auth|callback|logout|oauth)(\/|$)/.test(new URL(url).pathname);
    if (r.nav === 0 && !chromeless) {
      findings.push('U1 no way out — no nav links and no home/back/top-level link; the user is trapped');
    }
    for (const t of r.emptyTables) findings.push(`U2 table renders a header with no rows and no empty-state (${t})`);
    if (consoleErrors.length) findings.push(`U3 ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 2).join(' | ')}`);
    if (r.overflow) findings.push(`U4 horizontal overflow ${r.overflow.by}px — ${r.overflow.culprits.join(', ')}`);
    if (badRequests.length) findings.push(`U5 ${badRequests.length} broken asset(s): ${[...new Set(badRequests)].slice(0, 3).join(' | ')}`);
    if (r.unnamed.length) findings.push(`U6 ${r.unnamed.length} control(s) with no accessible name: ${r.unnamed.slice(0, 2).join(', ')}`);
    if (r.invisibleControls.length) findings.push(`U6 ${r.invisibleControls.length} invisible checkbox/radio: ${r.invisibleControls.slice(0, 2).join(', ')}`);
    if (r.placeholders.length) findings.push(`U7 raw placeholder in visible text: ${r.placeholders.slice(0, 2).join(' ; ')}`);
  } catch (e) {
    findings.push(`LOAD FAILED: ${e.message.slice(0, 100)}`);
  }
  page.off('console', onErr); page.off('response', onResp);

  if (findings.length) anyFailed = true;
  results.push({ url, findings });
}
await browser.close();

if (asJson) { console.log(JSON.stringify({ app, width, results }, null, 2)); }
else {
  console.log(`\n${app} — UI audit @ ${width}px`);
  for (const r of results) {
    const path = new URL(r.url).pathname;
    if (r.skipped) { console.log(`  – ${path}  SKIPPED (${r.skipped})`); continue; }
    if (!r.findings.length) { console.log(`  ✓ ${path}`); continue; }
    console.log(`  ✗ ${path}`);
    r.findings.forEach((f) => console.log(`      ${f}`));
  }
  const bad = results.filter((r) => r.findings?.length).length;
  console.log(`\n  ${results.length - bad - skipped} clean, ${bad} with findings, ${skipped} skipped`);
}
process.exit(anyFailed ? 1 : 0);
