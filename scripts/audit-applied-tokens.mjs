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
 *   · Then the binding was added — and R80.4's own @layer base, later in the
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

// ─── G12 — SEMANTIC EQUIVALENCE ──────────────────────────────────────────────
// Every other gate in this suite compares token NAMES. This one compares what
// they RESOLVE TO, and it exists because the name-based gates have a permanent
// blind spot that shipped a real defect to production:
//
//   --color-error was Electric Purple in crm7, business-suite-unified, R80.4 and
//   throughput while --destructive had ALREADY been corrected to red IN THE SAME
//   FILES. C4 checks --destructive. G4 compares names against the package's
//   --role-error. Both were green the entire time. business-suite-unified's
//   index.css literally carried a comment reading "RED. Was purple 283.1..."
//   twenty lines from three still-purple declarations.
//
// The rule: an app-local token that MEANS the same thing as a package role token
// must RESOLVE to the same value. Names may differ — that is normal and often
// unavoidable, since ~900 call sites bind the local names. Values may not.
//
// Resolved in a real browser rather than by parsing CSS, because the value comes
// from a var() chain that crosses files, modes and @layer boundaries. Only the
// engine knows the answer.
//
// DELIBERATELY NOT LISTED: pairs that SHOULD differ. --role-error is a fill,
// chosen to be seen as a block; --role-error-text is its AA-safe text variant.
// Asserting those equal would be asserting a bug.
const SEMANTIC_GROUPS = [
  { concept: 'error',      canonical: '--role-error-text',      aliases: ['--color-error'] },
  { concept: 'success',    canonical: '--role-success-text',    aliases: ['--color-success'] },
  { concept: 'warning',    canonical: '--role-warning-text',    aliases: ['--color-warning'] },
  { concept: 'info',       canonical: '--role-info-text',       aliases: ['--color-info'] },
  { concept: 'heading',    canonical: '--role-text-heading',    aliases: ['--text-heading'] },
  { concept: 'body text',  canonical: '--role-text-body',       aliases: ['--text-primary'] },
  { concept: 'muted text', canonical: '--role-text-muted',      aliases: ['--text-muted'] },
  { concept: 'secondary',  canonical: '--role-text-secondary',  aliases: ['--text-secondary'] },
];

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

// Two tokens can be the SAME colour and different strings — the engine serialises
// oklch() when the chain stayed in oklch and lab() when it passed through a
// color-mix(). Compare the parsed values, not the text, or the gate reports a
// conflict between a colour and itself.
function sameColour(a, b) {
  if (a === b) return true;
  const norm = (v) => {
    const m = /^(?:rgba?|lab|oklch)\(\s*([\d.%-]+)[,\s]+([\d.%-]+)[,\s]+([\d.%-]+)/.exec(v);
    return m ? `${m[1]}|${m[2]}|${m[3]}` : v;
  };
  return norm(a) === norm(b);
}

async function probe(page, theme) {
  // page.evaluate forwards exactly ONE argument. The previous version passed
  // `theme` as a third, so inside the browser it was undefined and the dark
  // toggle compared undefined === 'dark' — always false. Every 'dark' result
  // this gate would have printed was a second light-mode run.
  return page.evaluate(({ pure, theme, groups }) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const out = { theme, headings: {}, font: null, pureEndpoints: [], pairs: [],
                  skipped: { gradientText: 0, unsampleableBackdrop: 0, offscreen: 0, visuallyHidden: 0 } };

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

    // G12 — resolve every semantic token to its COMPUTED value. getComputedStyle
    // on documentElement walks the whole var() chain, which is the only way to
    // learn what a token actually is once it crosses files and modes.
    out.tokens = {};
    for (const g of groups) {
      const read = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      out.tokens[g.concept] = { canonical: read(g.canonical), aliases: {} };
      for (const a of g.aliases) { const v = read(a); if (v) out.tokens[g.concept].aliases[a] = v; }
    }

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
      if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') { out.skipped.gradientText++; continue; }
      if (cs.opacity === '0' || cs.visibility === 'hidden') continue;
      // VISUALLY HIDDEN IS NOT LOW CONTRAST. The sr-only idiom clips a 1x1 box
      // (`clip-path: inset(50%)`, or the legacy `clip: rect(0 0 0 0)`) and parks
      // it off-flow. It is read aloud, never painted, so its computed colour has
      // no backdrop in any meaningful sense — a skip link measured 2.76:1 or
      // 7.02:1 purely on where the sample point happened to land. Neither number
      // says anything about anyone's experience.
      const clipped = cs.clipPath === 'inset(50%)' || (cs.clip && cs.clip !== 'auto');
      const boxRect = el.getBoundingClientRect();
      if (clipped || (boxRect.width <= 1 && boxRect.height <= 1)) { out.skipped.visuallyHidden++; continue; }

      // The backdrop is COMPOSITED, not "the nearest ancestor that is not fully
      // transparent". That earlier walk stopped at the first background whose
      // string was not `rgba(0, 0, 0, 0)` and reported it as-is, so a 15% wash
      // read as the fully saturated fill underneath it. Measured 2026-08-30 on
      // crm7 /reports: the selected grid cell is `bg-primary/15` over a card, and
      // treating that as opaque compares muted text against saturated blue —
      // a number that is wrong in both directions depending on the hue.
      //
      // So: collect every painted layer up to the first OPAQUE one, then fold
      // them back down in paint order.
      // NORMALISE THROUGH A CANVAS. getComputedStyle hands back whatever syntax
      // the author wrote — `oklch(...)`, `lab(...)`, `color(display-p3 ...)` — and a
      // regex for `rgb()` does not merely fail to parse those, it SKIPS THE LAYER.
      // Measured 2026-08-30 on braden.com.au: a label's chain is
      //   LABEL(transparent) -> FORM(transparent) -> DIV.bg-card oklch(0.982 …)
      //   -> SECTION.bg-braden-navy rgb(44,62,80)
      // The card is opaque and is what the text sits on. Skipping it walked
      // through to the navy section and compared navy text against navy: 1.00:1,
      // seven false failures on one page. The estate's palette gate REQUIRES
      // oklch, so almost every card and panel was invisible to this walk.
      const _cv = document.createElement('canvas'); _cv.width = _cv.height = 1;
      const _ctx = _cv.getContext('2d', { willReadFrequently: true });
      const norm = (v) => {
        if (!v || v === 'transparent') return { rgb: [0, 0, 0], a: 0 };
        _ctx.clearRect(0, 0, 1, 1);
        _ctx.fillStyle = '#000';
        _ctx.fillStyle = v;                       // invalid syntax leaves the previous value
        _ctx.fillRect(0, 0, 1, 1);
        const d = _ctx.getImageData(0, 0, 1, 1).data;
        // Alpha survives in the string, not in the 1x1 read-back, so take it there.
        const m = String(v).match(/(?:rgba?|oklch|oklab|lab|hsla?|color)\([^)]*?[,/]\s*([\d.]+%?)\s*\)$/);
        let a = 1;
        if (m) { a = parseFloat(m[1]); if (String(m[1]).endsWith('%')) a /= 100; }
        return { rgb: [d[0], d[1], d[2]], a };
      };

      // THE STACK AT A POINT, not the ancestor chain. A hero's dark backdrop is
      // very often an absolutely-positioned SIBLING (`z-0` under a `z-20` content
      // layer), which no ancestor walk can see: it resolves to the page background
      // and reports near-white text on near-white. Measured 2026-08-30 on
      // braden.com.au — one such paragraph read 1.03:1 while rendering perfectly.
      // elementsFromPoint returns everything painting under the point, siblings
      // included, topmost first.
      const rect = el.getBoundingClientRect();
      const cx = Math.round(rect.left + Math.min(rect.width / 2, 40));
      const cy = Math.round(rect.top + rect.height / 2);
      const inView = rect.width > 0 && rect.height > 0 &&
        cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight;

      // OFF-SCREEN IS UNMEASURED, NOT MEASURED-BY-A-WORSE-METHOD. The first
      // version of this fell back to an ancestor walk for anything below the
      // fold, which is precisely the sibling-blind method the point-stack was
      // added to replace — and it produced NINE false failures on braden's dark
      // pass. Scrolling the same page and measuring each element while it was
      // actually in view gave 82 candidates, 70 measured, ZERO failures.
      //
      // A gate may not report a finding it obtained by a method it already knows
      // is wrong. Counting these as unmeasured is the honest answer; measuring
      // them properly means scrolling, which belongs in the harness, not here.
      if (!inView) { out.skipped.offscreen++; continue; }
      const layers = [];
      let unsampleable = false;
      const stack = document.elementsFromPoint(cx, cy);
      // Start AT the element: text sits on its own background first. Skipping it
      // resolved a filled button's white label against the page ground — 1.01:1
      // on six buttons that render fine. Everything painted ABOVE the text in the
      // stack is not its backdrop, so begin at the element's own index.
      const from = stack.indexOf(el);
      for (const node of stack.slice(from > -1 ? from : 0)) {
        const ucs = getComputedStyle(node);
        // An image or gradient behind the text makes the computed background
        // colour meaningless — skip rather than report a number we cannot stand up.
        if (ucs.backgroundImage !== 'none') { unsampleable = true; break; }
        const p = norm(ucs.backgroundColor);
        if (p.a > 0) { layers.push(p); if (p.a >= 1) break; }
      }
      // Nothing opaque under the text means the stack ran out before a solid
      // ground — an honest unknown, not a white default.
      if (!unsampleable && (!layers.length || layers[layers.length - 1].a < 1)) unsampleable = true;
      if (unsampleable || !layers.length) { out.skipped.unsampleableBackdrop++; continue; }
      let base = layers[layers.length - 1].rgb;
      for (let i = layers.length - 2; i >= 0; i--) {
        const L = layers[i];
        base = L.rgb.map((c, j) => Math.round(c * L.a + base[j] * (1 - L.a)));
      }
      const bg = `rgb(${base[0]}, ${base[1]}, ${base[2]})`;
      // The text colour needs the same normalisation, for the same reason.
      const fgN = norm(cs.color);
      const fg = `rgb(${fgN.rgb[0]}, ${fgN.rgb[1]}, ${fgN.rgb[2]})`;
      // Size and weight decide WHICH floor applies (WCAG 1.4.3), so they travel
      // with the pair rather than being guessed in Node.
      out.pairs.push({ tag: el.tagName, text: t.slice(0, 40), fg, bg,
                       size: parseFloat(cs.fontSize) || 16,
                       weight: parseInt(cs.fontWeight, 10) || 400 });
    }
    return out;
  }, { pure: [...PURE], theme, groups: SEMANTIC_GROUPS });
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
  // Not failures — coverage the probe could not evaluate. Reported so a clean
  // run cannot be mistaken for full coverage (ruling V-3: unevaluable is never PASS).
  const notes = [];
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
      // EMULATE THE PREFERENCE, not just the class. Some surfaces drive their
      // brand tokens off `prefers-color-scheme` and ignore a bare `.dark` class,
      // so toggling the class alone produces a HYBRID no user can reach: package
      // tokens go dark while hardcoded brand classes stay light. Measured on
      // braden.com.au 2026-08-30 — the class alone reported a cookie-consent
      // button at 1.63:1 and eight other failures; with the media preference
      // emulated, the same buttons read 5.51:1 and 6.52:1 and the page is clean.
      // Setting both makes the two mechanisms agree instead of fighting.
      await page.emulateMedia({ colorScheme: theme });
      // RELOAD after setting it. A ThemeProvider that reads the preference once
      // at mount, with no matchMedia listener, never sees a change applied to an
      // already-running page — so emulating without reloading measures the
      // previous theme wearing the new one's name.
      await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
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
      // G12 — a token that MEANS the same thing must RESOLVE to the same thing.
    // Colours are compared after normalising to rgb, because the engine may
    // serialise the same colour as oklch() in one place and lab() in another
    // depending on how the var() chain was written — a string compare would
    // report a false conflict on identical colours.
    const conflicts = [];
    for (const [concept, t] of Object.entries(r.tokens || {})) {
      if (!t.canonical) continue;
      for (const [alias, val] of Object.entries(t.aliases)) {
        if (!sameColour(val, t.canonical)) {
          conflicts.push(`${alias}="${val}" != ${SEMANTIC_GROUPS.find((g) => g.concept === concept).canonical}="${t.canonical}" (${concept})`);
        }
      }
    }
    if (conflicts.length) {
      failures.push(`G12 [${theme}] ${conflicts.length} semantic conflict(s) — ${conflicts.slice(0, 3).join(' | ')}`);
    }

    if (r.pureEndpoints.length) {
        failures.push(`P1 [${theme}] ${r.pureEndpoints.length} pure endpoint(s): ${r.pureEndpoints.slice(0, 3).join(' | ')}`);
      }
      // P7 — real contrast, at the floor WCAG 1.4.3 actually specifies: 4.5:1 for
      // normal-weight body text, 3:1 only for large text (>=24px, or >=18.66px bold).
      //
      // This was a flat 3:1, and the comment said so honestly: "deliberately
      // lenient ... a stricter bar on a first pass produces a list nobody acts on."
      // That was true when written. It is no longer true, and the difference was
      // MEASURED before this line moved, on production, both themes:
      //
      //     crm7 /dashboard    68 elements    0 below AA
      //     crm7 /reports     181 elements    1 below AA   (4.05:1, since fixed)
      //     BSU  /            112 elements    0 below AA
      //
      // 722 measured element-readings, ONE failure. The lenient band 3.0-4.5 is
      // where the estate's remaining text defects live now that the sub-3:1 ones
      // are gone: every real finding on 2026-08-30 sat in it — 4.05 (crm7 reports),
      // 4.45 (crm7 sidebar, dark), 3.74 (braden ErrorAlert). A flat 3:1 passes all three.
      const floorFor = (q) =>
        (q.size >= 24 || (q.size >= 18.66 && q.weight >= 700)) ? 3 : 4.5;
      const unreadable = r.pairs
        .map((q) => ({ ...q, ratio: contrast(parseRgb(q.fg), parseRgb(q.bg)), need: floorFor(q) }))
        .filter((q) => q.ratio < q.need)
        .sort((a, b) => a.ratio - b.ratio);
      r.unreadable = unreadable;
      if (unreadable.length) {
        failures.push(
          `P7 [${theme}] ${unreadable.length} below the AA floor — ` +
          unreadable.slice(0, 3)
            .map((q) => `${q.tag} "${q.text}" ${q.ratio.toFixed(2)}:1 < ${q.need}`).join(' | ')
        );
      }
      // COVERAGE, stated rather than implied. Gradient-clipped text and
      // gradient/image backdrops are not measurable by computed colour, and a
      // gate that cannot tell "checked nothing" from "found nothing" is not a
      // gate. These are UNKNOWN, never PASS — resolving one needs the gradient's
      // own colour stops read off backgroundImage, which found a live 1.70:1 on
      // the public CTA when it was last done.
      if (r.skipped && (r.skipped.gradientText || r.skipped.unsampleableBackdrop ||
                        r.skipped.offscreen || r.skipped.visuallyHidden)) {
        const cand = r.pairs.length + r.skipped.gradientText + r.skipped.unsampleableBackdrop +
                     r.skipped.offscreen + r.skipped.visuallyHidden;
        notes.push(
          `P7 [${theme}] UNMEASURED: ${r.skipped.gradientText} gradient-clipped text, ` +
          `${r.skipped.unsampleableBackdrop} on an image/gradient backdrop, ` +
          `${r.skipped.offscreen} below the fold, ` +
          `${r.skipped.visuallyHidden} visually hidden — ${r.pairs.length} of ${cand} candidates measured`
        );
      }
    }
  }

  if (failures.length) anyFailed = true;

  if (asJson) {
    console.log(JSON.stringify({ app, url, skipped: offOrigin, failures, notes, results }, null, 2));
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
    if (notes.length) {
      console.log('');
      notes.forEach((n) => console.log(`  ? ${n}`));
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
