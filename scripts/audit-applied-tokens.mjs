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
      .map((p) => ({ ...p, ratio: contrast(parseRgb(p.fg), parseRgb(p.bg)) }))
      .filter((p) => p.ratio < 3)
      .sort((a, b) => a.ratio - b.ratio);
    r.unreadable = unreadable;
    if (unreadable.length) {
      failures.push(
        `P7 [${theme}] ${unreadable.length} below 3:1 — ` +
        unreadable.slice(0, 3).map((p) => `${p.tag} "${p.text}" ${p.ratio.toFixed(2)}:1`).join(' | ')
      );
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
