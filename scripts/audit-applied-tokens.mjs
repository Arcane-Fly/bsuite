#!/usr/bin/env node
/**
 * G5 + G6 — prove the tokens reach the DOM.
 *
 * WHY A BROWSER AND NOT A GREP
 * Every static gate in this suite can be satisfied by a token that nothing
 * consumes. Three times now that gap has produced a defect an operator saw and
 * no script did:
 *
 *   · --role-h1..h6 were added and NOTHING bound them to an h1..h6. Grepping
 *     for "--role-h" showed the ramp correctly wired while every heading on
 *     screen was one flat colour.
 *   · Then the binding was added — and R80.3's own @layer base, later in the
 *     same layer, set `h1,h2,h3,h4,h5,h6 { color: var(--text-heading) }` and
 *     won the cascade. The ramp was present, bound, and still defeated.
 *   · --font-* was specified in the contract and never shipped, so five apps
 *     ran four different families while every file looked fine.
 *
 * The common shape: the source is correct and the computed style is not. Only
 * a real layout engine can tell you which one you shipped.
 *
 * WHAT IT ASSERTS (per app, light and dark)
 *   G5  h1..h6 resolve to SIX DISTINCT colours    (the ramp survives the cascade)
 *   G6  body font-family resolves to the contract family, and is actually loaded
 *   P1  no element computes to pure white or pure black in a colour role
 *   P7  no text is invisible: colour != its own background
 *
 * Usage: node scripts/audit-applied-tokens.mjs <url> [<url> ...] [--app <name>]
 *        [--json] [--storage <storageState.json>]
 * Requires a running dev server or a preview URL.
 *
 * SIGNED-IN RUNS
 * Most routes in this estate are behind auth, and an unauthenticated hit
 * redirects to the OAuth server — which rejects a localhost redirect_uri, so it
 * lands off-origin and is SKIPPED rather than audited. To cover them, sign in
 * once with playwright, save context.storageState() to a path OUTSIDE the repo,
 * and pass it with --storage. That file holds live tokens: never commit it.
 *
 * Note which OAuth server the target uses. d.r8.crm7.app accepts a
 * d.suite.crm7.app session; crm7's preview build redirects to PRODUCTION
 * suite.crm7.app, so a dev session is not enough there.
 */
// The parent repo has no node_modules of its own — every app installs into its
// own submodule, and pnpm does not hoist a transitive playwright to a place a
// bare `import 'playwright'` can see. A gate that only runs where the package
// happens to be hoisted is a gate that quietly never runs, so resolve it: the
// app installs first (CI and local both have one), then the pnpm store.
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
const require_ = createRequire(import.meta.url);

function resolvePlaywright() {
  const roots = ['..', '../braden', '../conduit', '../throughput', '../crm7',
                 '../business-suite-unified', '../R80.3'];
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
  console.error('playwright not found — install it in any app, or `pnpm add -D playwright`');
  process.exit(2);
}
const { chromium } = resolvePlaywright();

const appIdx = process.argv.indexOf('--app');
const app = appIdx > -1 ? process.argv[appIdx + 1] : 'unknown';
const asJson = process.argv.includes('--json');
// --storage <playwright storageState.json> runs the sweep SIGNED IN. Without it
// every authenticated route redirects to the OAuth server, lands off-origin and
// is skipped — which is most of these apps. The file holds real tokens: keep it
// outside the repo and never commit it.
const stIdx = process.argv.indexOf('--storage');
const storageState = stIdx > -1 ? process.argv[stIdx + 1] : undefined;
// Every non-flag argument is a URL. Launching a fresh Chromium per route is what
// made the first version of the sweep unusable: 12 routes meant 12 browser
// starts, and the run had not finished after fifteen minutes. One browser,
// reused across routes, is the whole difference.
const urls = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--app' || a === '--storage') { i++; continue; }   // skip the flag AND its value
  if (a.startsWith('--')) continue;
  urls.push(a);
}

if (!urls.length) {
  console.error('usage: audit-applied-tokens.mjs <url> [<url> ...] [--app <name>] [--json]');
  process.exit(2);
}

// braden is Corporate; everything else is D2C. The contract differs per brand,
// so asserting one family across all six would fail the correct app.
const EXPECT_FONT = app === 'braden' ? /open sans|lato/i : /geist/i;

// Corporate deliberately has NO colour ramp — operator ruling 2026-08-03. A base
// `h1 { color }` only reaches headings that do not colour themselves, which on a
// marketing site is almost none, so it cannot build a hierarchy there; all it did
// was repaint the one hero heading that took its colour by inheritance and make
// it stop matching the other 25. Corporate sets the heading FACE only.
// Asserting a six-colour ramp here would fail the app for being correct.
const EXPECT_RAMP = app !== 'braden';

const PURE = new Set(['rgb(255, 255, 255)', 'rgb(0, 0, 0)']);

// WCAG relative luminance, for P7. The previous test was `color === backgroundColor`,
// which only catches a heading that is EXACTLY its background — the perfectly
// invisible case and nothing else. The defect this suite actually keeps meeting is
// text at 1.3:1 or 1.7:1: still technically two different colours, still unreadable.
function srgbLuminance([r, g, b]) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function parseRgb(v) {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(v || '');
  // A colour we cannot parse must NOT quietly become black-on-white and pass.
  if (!m) return null;
  return [+m[1], +m[2], +m[3]];
}
function contrast(a, b) {
  if (!a || !b) return Infinity;  // unparseable -> not a finding, reported separately
  const [l1, l2] = [srgbLuminance(a), srgbLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

async function probe(page, theme) {
  // page.evaluate forwards exactly ONE argument. The previous version passed
  // `theme` as a third, so inside the browser it was undefined and the dark
  // toggle compared undefined === 'dark' — always false. Every 'dark' result
  // this gate would have printed was a second light-mode run.
  return page.evaluate(({ pure, theme }) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const out = { theme, headings: {}, font: null, pureEndpoints: [], pairs: [] };

    // G5 — the ramp must produce six DISTINCT colours.
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      const el = document.createElement(tag);
      el.textContent = 'x';
      document.body.appendChild(el);
      out.headings[tag] = getComputedStyle(el).color;
      el.remove();
    }

    // G6 — the family that actually resolved, not the one declared.
    out.font = getComputedStyle(document.body).fontFamily;

    // P1 + P7 — walk what is really on the page.
    const seen = new Set();
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (!el.getClientRects().length) continue;
      for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
        const v = cs[prop];
        if (pure.includes(v) && cs.opacity !== '0') {
          const k = `${prop}:${el.tagName}.${el.className}`.slice(0, 120);
          if (!seen.has(k)) { seen.add(k); out.pureEndpoints.push(k); }
        }
      }
      // P7 — collect raw colour pairs; the contrast maths happens in Node.
      // A form control's text is its VALUE or PLACEHOLDER, neither of which is
      // textContent — so the first version of this check walked straight past
      // every input on the page. braden's contact fields were near-white text on
      // a light gold fill (~1.3:1, unreadable as you typed) and scored clean.
      const isField = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      const t = isField
        ? (el.value || el.placeholder || '').trim()
        : (el.textContent || '').trim();
      if (!t || (!isField && el.children.length)) continue;
      // Gradient text sets `color: transparent` ON PURPOSE and paints via
      // background-clip. Reading its computed colour says "fully transparent",
      // which is not the same thing as invisible.
      if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') continue;
      if (cs.opacity === '0' || cs.visibility === 'hidden') continue;

      // The element's own background is usually transparent; what the text sits
      // on is the nearest painted ancestor.
      let bg = cs.backgroundColor, up = el;
      while (up && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
        up = up.parentElement;
        if (!up) break;
        bg = getComputedStyle(up).backgroundColor;
      }
      // An image or gradient behind the text makes the computed background
      // colour meaningless — skip rather than report a number we cannot stand up.
      if (up && getComputedStyle(up).backgroundImage !== 'none') continue;
      out.pairs.push({ tag: el.tagName, text: t.slice(0, 40), fg: cs.color, bg });
    }
    return out;
  }, { pure: [...PURE], theme });
}

// Playwright's bundled browser is pinned per version and the local cache holds a
// different build, which is a `npx playwright install` away in CI and a dead end
// on a machine that already has Chrome. Prefer the managed browser; fall back to
// the system one rather than making the only gate that sees pixels unrunnable.
async function launch() {
  try { return await chromium.launch(); } catch (e) {
    for (const p of ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium']) {
      try { return await chromium.launch({ executablePath: p }); } catch {}
    }
    throw e;
  }
}
const browser = await launch();
const context = await browser.newContext(storageState ? { storageState } : {});
const page = await context.newPage();

let anyFailed = false;
let skipped = 0;

for (const url of urls) {
  const failures = [];
  const results = {};
  let offOrigin = null;

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

  // ORIGIN GUARD. An unauthenticated app route redirects to the OAuth server,
  // and if that server rejects the request you end up on ITS error page — a
  // different origin entirely. Without this check the gate audits that page and
  // attributes it to the app: crm7 scored 8 pure endpoints, Times New Roman and
  // a collapsed ramp on six routes, all of it Supabase's raw JSON 400 rendered
  // with browser defaults. Every one of those would have been a false finding
  // filed against a healthy app.
  const landed = new URL(page.url());
  const asked = new URL(url);
  if (landed.origin !== asked.origin) {
    offOrigin = `redirected off-origin to ${landed.origin} — not audited`;
    skipped++;
  }

  if (!offOrigin) {
    // A webfont that has not finished loading reports the fallback family, which
    // would fail G6 for a timing reason rather than a real one.
    await page.evaluate(() => document.fonts.ready);

    for (const theme of ['light', 'dark']) {
      const r = await probe(page, theme);
      results[theme] = r;

      if (EXPECT_RAMP) {
        const distinct = new Set(Object.values(r.headings)).size;
        if (distinct < 6) {
          failures.push(
            `G5 [${theme}] heading ramp collapsed: ${distinct}/6 distinct colours — ` +
            Object.entries(r.headings).map(([k, v]) => `${k}=${v}`).join(' ')
          );
        }
      }
      if (!EXPECT_FONT.test(r.font)) {
        failures.push(`G6 [${theme}] font resolved to "${r.font}", expected ${EXPECT_FONT}`);
      }
      if (r.pureEndpoints.length) {
        failures.push(`P1 [${theme}] ${r.pureEndpoints.length} pure endpoint(s): ${r.pureEndpoints.slice(0, 3).join(' | ')}`);
      }
      // P7 — real contrast, not exact equality. 3:1 is the WCAG large-text floor and
      // deliberately lenient: this gate is hunting text you cannot read at all, and a
      // stricter bar on a first pass produces a list nobody acts on.
      const unreadable = r.pairs
        .map((q) => ({ ...q, ratio: contrast(parseRgb(q.fg), parseRgb(q.bg)) }))
        .filter((q) => q.ratio < 3)
        .sort((a, b) => a.ratio - b.ratio);
      r.unreadable = unreadable;
      if (unreadable.length) {
        failures.push(
          `P7 [${theme}] ${unreadable.length} below 3:1 — ` +
          unreadable.slice(0, 3).map((q) => `${q.tag} "${q.text}" ${q.ratio.toFixed(2)}:1`).join(' | ')
        );
      }
    }
  }

  if (failures.length) anyFailed = true;

  if (asJson) {
    console.log(JSON.stringify({ app, url, skipped: offOrigin, failures, results }, null, 2));
  } else if (offOrigin) {
    console.log(`\n${app} — ${url}\n  – SKIPPED: ${offOrigin}\n    (an authenticated route needs a session; this is not a theme result)`);
  } else {
    console.log(`\n${app} — ${url}`);
    for (const t of ['light', 'dark']) {
      const r = results[t];
      if (!r) continue;
      console.log(`  ${t}: ${new Set(Object.values(r.headings)).size}/6 distinct headings · font ${r.font.split(',')[0]}`);
    }
    if (failures.length) {
      console.log('');
      failures.forEach((f) => console.log(`  ✗ ${f}`));
    } else {
      console.log('  ✓ ramp, font, pure endpoints and visibility all clean');
    }
  }
}

await browser.close();

// A skip is missing coverage, never a pass — but it must not fail the run
// either, or every auth-gated app would be permanently red for a reason the
// theme cannot fix. It is surfaced in the exit banner instead.
if (skipped && !asJson) {
  console.log(`\n  ${skipped} route(s) skipped — not audited, not passed.`);
}
process.exit(anyFailed ? 1 : 0);
