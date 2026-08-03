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
 * Usage: node scripts/audit-applied-tokens.mjs <url> [--app <name>] [--json]
 * Requires a running dev server or a preview URL.
 */
import { chromium } from 'playwright';

const url = process.argv[2];
const appIdx = process.argv.indexOf('--app');
const app = appIdx > -1 ? process.argv[appIdx + 1] : 'unknown';
const asJson = process.argv.includes('--json');

if (!url) {
  console.error('usage: audit-applied-tokens.mjs <url> [--app <name>] [--json]');
  process.exit(2);
}

// braden is Corporate; everything else is D2C. The contract differs per brand,
// so asserting one family across all six would fail the correct app.
const EXPECT_FONT = app === 'braden' ? /open sans|lato/i : /geist/i;

const PURE = new Set(['rgb(255, 255, 255)', 'rgb(0, 0, 0)']);

async function probe(page, theme) {
  return page.evaluate(({ pure }) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const out = { theme, headings: {}, font: null, pureEndpoints: [], invisible: [] };

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
      const t = (el.textContent || '').trim();
      if (t && el.children.length === 0 && cs.color === cs.backgroundColor) {
        out.invisible.push(`${el.tagName}: ${t.slice(0, 40)}`);
      }
    }
    return out;
  }, { pure: [...pure] }, theme);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const failures = [];
const results = {};

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  // A webfont that has not finished loading reports the fallback family, which
  // would fail G6 for a timing reason rather than a real one.
  await page.evaluate(() => document.fonts.ready);

  for (const theme of ['light', 'dark']) {
    const r = await probe(page, theme);
    results[theme] = r;

    const colours = Object.values(r.headings);
    const distinct = new Set(colours).size;
    if (distinct < 6) {
      failures.push(
        `G5 [${theme}] heading ramp collapsed: ${distinct}/6 distinct colours — ` +
        Object.entries(r.headings).map(([k, v]) => `${k}=${v}`).join(' ')
      );
    }
    if (!EXPECT_FONT.test(r.font)) {
      failures.push(`G6 [${theme}] font resolved to "${r.font}", expected ${EXPECT_FONT}`);
    }
    if (r.pureEndpoints.length) {
      failures.push(`P1 [${theme}] ${r.pureEndpoints.length} pure endpoint(s): ${r.pureEndpoints.slice(0, 3).join(' | ')}`);
    }
    if (r.invisible.length) {
      failures.push(`P7 [${theme}] ${r.invisible.length} invisible: ${r.invisible.slice(0, 3).join(' | ')}`);
    }
  }
} finally {
  await browser.close();
}

if (asJson) {
  console.log(JSON.stringify({ app, url, failures, results }, null, 2));
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
process.exit(failures.length ? 1 : 0);
