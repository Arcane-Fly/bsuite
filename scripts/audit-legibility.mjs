#!/usr/bin/env node
/**
 * G13 — LEGIBILITY. Is this text readable against what is actually behind it?
 *
 * WHY THIS EXISTS, AND WHY IT ASKS NOTHING ABOUT CLASSES OR TOKENS
 * On 2026-08-04 I shipped dark-on-dark text to crm7's dashboard. "Add New
 * Contact", "Create Opportunity", "Schedule Meeting" and the username were
 * painted oklch(0.166 0.026 269.4) — the dark background itself — on that same
 * background. Not low contrast. THE SAME COLOUR. The operator found it; every
 * gate in the suite was green.
 *
 * Each existing gate looks at a different layer and none of them could see it:
 *   · the palette gates check which COLOURS exist          -> all legal
 *   · G12 checks which VALUE a token resolves to           -> all correct
 *   · the defect was which token the CLASS binds to        -> unchecked
 * `.text-body{color:var(--bg-body)}` is a legal class, naming a legal token,
 * holding a legal colour. Every layer was individually fine.
 *
 * So this gate refuses to look at any of them. It reads the COMPUTED colour of
 * rendered text and the COMPUTED colour actually behind it, and asks whether a
 * human could read it. That is the property the operator was reporting, and it
 * is invariant to whatever caused it — a bad class, a wrong token, a stray
 * opacity, an inline style, a future mistake nobody has made yet.
 *
 * WHAT IT MEASURES
 *   WCAG contrast ratio  — the actionable standard (4.5:1 body, 3:1 large text)
 *   ΔE in OKLab          — separates "hard to read" from "literally the same
 *                          colour". A ratio of 1.05 and a ΔE of 0.01 is not a
 *                          contrast problem, it is invisible text, and it wants
 *                          a different reaction from a human triaging the list.
 *
 * EVERY EXCLUSION BELOW COST ME A FALSE POSITIVE OR A MISS. They are not
 * defensive coding; each one is a measurement I got wrong first:
 *   · own text nodes, not textContent — my first probe skipped any element with
 *     a child, so <button><svg/>Add New Contact</button> — every icon+label
 *     control, i.e. exactly the broken ones — was never measured. It reported
 *     0 findings on a dashboard with four invisible labels.
 *   · composite alpha against the backdrop, and multiply ANCESTOR opacity —
 *     rgba(255,255,255,0.06) on white is invisible; naive parsing calls it 1:1
 *     white-on-white, which is right by luck, and rgba(0,0,0,0.5) on white it
 *     gets badly wrong.
 *   · background-clip:text is gradient text — its `color` is deliberately
 *     transparent and the glyphs are painted by the background image. Reading
 *     its computed colour reports "invisible" on text that is perfectly legible.
 *   · a background IMAGE or gradient behind the text makes the computed
 *     background colour meaningless. Skip rather than report a number that
 *     cannot be defended.
 *   · disabled controls are SUPPOSED to be low contrast. WCAG exempts them.
 *
 * Usage: node scripts/audit-legibility.mjs <url> [<url>...] [--app <n>]
 *        [--storage <f>] [--theme dark|light|both] [--json]
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
const themeArg = flag('--theme', 'both');
const asJson = argv.includes('--json');
const urls = [];
for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (['--app', '--storage', '--theme'].includes(a)) { i++; continue; }
  if (a.startsWith('--')) continue;
  urls.push(a);
}
if (!urls.length) { console.error('usage: audit-legibility.mjs <url>... [--app <n>]'); process.exit(2); }
const THEMES = themeArg === 'both' ? ['light', 'dark'] : [themeArg];

// ── colour maths, in Node so the page cannot lie about it ────────────────────
const srgbToLinear = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** sRGB -> OKLab. ΔE here answers "are these the same colour", which a contrast
 *  ratio cannot: 1.0:1 is reported for any two colours of equal luminance, and
 *  pure blue on pure yellow can be a perfectly visible 1.0:1. */
function oklab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const deltaE = (a, b) => { const [x, y] = [oklab(a), oklab(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

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
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

const report = [];
let worst = null, failed = 0, skipped = 0;

for (const url of urls) {
  let landed;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    landed = new URL(page.url());
  } catch (e) { report.push({ url, error: e.message.slice(0, 90) }); continue; }

  // The same two guards the other audits learned the hard way: an off-origin
  // redirect means we are measuring the OAuth server, and a same-origin bounce
  // to /login means we are measuring a login screen.
  if (landed.origin !== new URL(url).origin) {
    report.push({ url, skipped: `off-origin -> ${landed.origin}` }); skipped++; continue;
  }
  if (!/\/(login|signin|auth)(\/|$)/.test(new URL(url).pathname) &&
      /\/(login|signin|auth)(\/|$)/.test(landed.pathname)) {
    report.push({ url, skipped: `bounced to ${landed.pathname} — needs a session` }); skipped++; continue;
  }

  for (const theme of THEMES) {
    // Set the theme the way the APP does. Toggling the class directly is
    // reverted by the app's own theme controller on the next render, and the
    // whole run then silently measures light mode twice — which is exactly what
    // hid the dark-mode regression from me the first time.
    await page.evaluate((t) => localStorage.setItem('bsuite_theme', t), theme);
    await page.reload({ waitUntil: 'networkidle', timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      await new Promise((res) => {
        let t = setTimeout(res, 500);
        const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { o.disconnect(); res(); }, 500); });
        o.observe(document.body, { childList: true, subtree: true, attributes: true });
        setTimeout(() => { o.disconnect(); res(); }, 6000);
      });
    });

    // THIRD GUARD — the route gate. See scripts/lib/settled-or-skip.mjs: a
    // full-viewport "Checking access for Contacts..." is same-origin, is not
    // /login, and passes every check in this file. Measuring it produced three
    // green ticks over a spinner on 2026-08-18.
    const gate = await settledOrSkip(page);
    if (gate) { report.push({ url, theme, skipped: gate }); skipped++; continue; }

    const samples = await page.evaluate(() => {
      const out = [];
      // MUST handle oklch(). Chrome returns the colour in the SPACE IT WAS
      // DECLARED IN — this estate declares everything in oklch, so
      // getComputedStyle().color is "oklch(0.166 0.026 269.4)", not rgb().
      // An rgb-only parser returns null for every single element and the whole
      // audit silently measures NOTHING while reporting a confident zero. That
      // is exactly how an earlier probe of mine reported "0 below AA" on a
      // dashboard whose labels were the same colour as the background.
      const parse = (v) => {
        if (!v) return null;
        const rgb = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?/.exec(v);
        if (rgb) {
          const a = rgb[4] === undefined ? 1 : (String(rgb[4]).endsWith('%') ? parseFloat(rgb[4]) / 100 : +rgb[4]);
          return [+rgb[1], +rgb[2], +rgb[3], a];
        }
        // Let the ENGINE do the conversion rather than reimplementing oklch->sRGB
        // and risking a second, subtly different colour pipeline: paint it and
        // read the pixel back. This is the only conversion that is guaranteed to
        // agree with what the user actually sees.
        try {
          const cv = document.createElement('canvas'); cv.width = cv.height = 1;
          const c2 = cv.getContext('2d', { willReadFrequently: true });
          c2.clearRect(0, 0, 1, 1);
          c2.fillStyle = v;
          if (!c2.fillStyle) return null;
          c2.fillRect(0, 0, 1, 1);
          const d = c2.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        } catch { return null; }
      };
      for (const el of document.querySelectorAll('body *')) {
        if (!el.getClientRects().length) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;

        // OWN text nodes. Not textContent — that would attribute a child's text
        // to a parent with a different colour. Not "leaf nodes only" — that
        // skips every icon+label control, which is where this broke.
        const text = [...el.childNodes].filter((n) => n.nodeType === 3)
          .map((n) => n.textContent).join('').trim();
        if (!text) continue;

        if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') continue;   // gradient text
        if (el.matches(':disabled, [aria-disabled="true"], [disabled]')) continue; // WCAG-exempt
        if (el.closest('[inert], [aria-hidden="true"]')) continue;
        // A CONTRAST DEMONSTRATION IS NOT A CONTRAST DEFECT.
        // BSU's OklchColorPicker paints the operator's chosen colour on a white
        // swatch and on a black one, and prints the measured WCAG ratio beside
        // each. Reporting that ratio as a failure is reporting the feature. On
        // the first five-app run this produced 7 of the 8 findings on /branding
        // — "Aa on white" at 1.97:1 next to a badge that already SAYS 1.97,
        // plus the badge text itself.
        //
        // The estate already has a marker for exactly this claim,
        // `theme-audit-ok`, but it lives in a SOURCE COMMENT — which the colour
        // greps can read and a runtime auditor never can. The two swatches
        // carry it and this auditor could not see it. So the same claim now has
        // a DOM form, `data-theme-audit-ok`, whose value is the REASON: it has
        // to be stated rather than merely asserted, and it shows up in devtools
        // where the next person will look.
        //
        // Deliberately narrow. It suppresses a SUBTREE its author explicitly
        // marked and nothing else — not a path exemption, and it never reads a
        // route name.
        if (el.closest('[data-theme-audit-ok]')) continue;

        // Visually-hidden text is not text on screen. A `sr-only` skip link is
        // clipped to 1x1px and only paints when focused — where it carries its
        // own `focus:bg-accent focus:text-accent-foreground` pair — so reading
        // its resting colour reports a failure on something nobody can see.
        // Both R80.4 skip links measured 4.47:1 this way.
        const box = el.getBoundingClientRect();
        if (box.width < 2 || box.height < 2) continue;

        const fg = parse(cs.color);
        if (!fg) continue;

        // Composite the real backdrop: walk up through transparent ancestors,
        // and bail if anything paints an image or gradient behind the text.
        //
        // STOPPING AT THE FIRST NON-ZERO-ALPHA BACKGROUND IS WRONG, and wrong in
        // the direction that manufactures findings. The estate's badges are
        // `bg-destructive/10 text-destructive` — a 10% wash of the SAME hue as
        // the text. Take that wash as the backdrop and you have compared the
        // colour against itself: 1.00:1, ΔE 0, reported as INVISIBLE, on a pill
        // that renders perfectly legibly because the 90% showing through is the
        // near-black panel. Every translucent layer has to be composited down
        // onto what is behind it until something opaque stops the walk.
        //
        // AND THE BACKDROP IS NOT ONLY OVERHEAD. A hero is built as a stack of
        // ABSOLUTELY POSITIONED SIBLINGS: a photo, a dark scrim over it, then
        // the copy in a separate z-20 layer. None of those siblings is an
        // ancestor of the text, so an ancestor-only walk sails straight past
        // the scrim to the white page behind and reports 1:1 INVISIBLE on a
        // headline that is perfectly legible on navy. braden's home hero
        // produced exactly that, and "fixing" it would have meant recolouring
        // correct design to satisfy a broken measurement.
        //
        // So before trusting the ancestor chain, look for a positioned element
        // that geometrically COVERS this text and paints beneath it.
        const rect = el.getBoundingClientRect();
        const covers = (r) => r.left <= rect.left + 1 && r.right >= rect.right - 1 &&
                              r.top <= rect.top + 1 && r.bottom >= rect.bottom - 1;
        let occluded = false, occludedBy = '';
        for (let a = el.parentElement; a && !occluded; a = a.parentElement) {
          // The branch of `a` that actually contains our text — what the
          // sibling has to be compared AGAINST for paint order.
          const branch = [...a.children].find((c) => c === el || c.contains(el));
          if (!branch) continue;
          const zOf = (n) => { const z = getComputedStyle(n).zIndex; return z === 'auto' ? 0 : (parseInt(z, 10) || 0); };
          const zBranch = zOf(branch);
          for (const sib of a.children) {
            if (sib === branch) continue;
            const ss = getComputedStyle(sib);
            if (ss.position === 'static' || ss.display === 'none') continue;
            if (parseFloat(ss.opacity || '1') < 0.5) continue;
            if (!covers(sib.getBoundingClientRect())) continue;

            // PAINT ORDER IS THE WHOLE QUESTION, and ignoring it inverted the
            // answer. crm7's cards carry `pointer-events-none absolute inset-0`
            // decoration painted IN FRONT of their text; treating those as the
            // backdrop skipped 13 real measurements per route. braden's hero
            // scrim sits in a z-0 wrapper UNDER a z-20 copy layer and is a
            // genuine backdrop. Same shape, opposite meaning — separated only
            // by z-index, then by document order when the z-indexes tie.
            const zSib = zOf(sib);
            const below = zSib < zBranch ||
              (zSib === zBranch &&
               (sib.compareDocumentPosition(branch) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
            if (!below) continue;

            // The paint may be on the wrapper OR on something inside it. A hero
            // is `<div class="absolute inset-0 z-0">` holding a photo and a
            // scrim: the WRAPPER paints nothing, so checking only the sibling
            // itself walks straight past the scrim and back to the white page.
            const paints = (n, st) =>
              (st.backgroundImage && st.backgroundImage !== 'none') ||
              (parse(st.backgroundColor)?.[3] ?? 0) >= 0.5;
            let hit = paints(sib, ss) ? sib : null;
            if (!hit) {
              for (const inner of sib.querySelectorAll('*')) {
                const is = getComputedStyle(inner);
                if (is.display === 'none' || parseFloat(is.opacity || '1') < 0.5) continue;
                if (!covers(inner.getBoundingClientRect())) continue;
                if (paints(inner, is)) { hit = inner; break; }
              }
            }
            if (hit) {
              const hs = getComputedStyle(hit);
              occluded = true;
              occludedBy = hit.tagName + '.' + ((hit.className?.baseVal ?? hit.className ?? '') + '').slice(0, 40) +
                           ' z=' + zSib + '/' + zBranch + ' img=' + (hs.backgroundImage !== 'none');
              break;
            }
          }
        }
        if (occluded) { out.push({ occluded: true, text: text.slice(0,30), by: occludedBy }); continue; }

        const layers = [];              // top-most first
        let node = el, imaged = false;
        while (node) {
          const s = getComputedStyle(node);
          if (s.backgroundImage && s.backgroundImage !== 'none') { imaged = true; break; }
          const c = parse(s.backgroundColor);
          if (c && c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
          node = node.parentElement;
        }
        if (imaged) continue;
        // Nothing opaque was found on the way up — the canvas is what shows
        // through. Only fall back to white once that is also unpainted.
        if (!layers.length || layers[layers.length - 1][3] < 0.999) {
          const b = parse(getComputedStyle(document.documentElement).backgroundColor);
          layers.push(b && b[3] > 0.999 ? b : [255, 255, 255, 1]);
        }
        // Composite bottom-up: the deepest layer is the base, each shallower
        // layer paints over the accumulated result at its own alpha.
        let bg = layers[layers.length - 1];
        for (let i = layers.length - 2; i >= 0; i--) {
          const t = layers[i], a = t[3];
          bg = [t[0] * a + bg[0] * (1 - a), t[1] * a + bg[1] * (1 - a), t[2] * a + bg[2] * (1 - a), 1];
        }

        // Effective opacity is the PRODUCT of every ancestor's opacity — a 0.5
        // on a wrapper is indistinguishable from a 0.5 on the text itself.
        let op = 1, a2 = el;
        while (a2 && a2 !== document.documentElement) { op *= parseFloat(getComputedStyle(a2).opacity || '1'); a2 = a2.parentElement; }

        out.push({ text: text.slice(0, 40), fg, bg, op,
                   size: parseFloat(cs.fontSize), weight: cs.fontWeight,
                   tag: el.tagName, cls: String(el.className).slice(0, 56) });
      }
      return out;
    });

    const bad = [];
    const occluded = samples.filter((s) => s.occluded).length;
    if (process.env.G13_DEBUG_OCCLUDED) {
      const byWhat = {};
      for (const s of samples) if (s.occluded) (byWhat[s.by] ??= []).push(s.text);
      for (const [k, v] of Object.entries(byWhat)) console.log(`    OCCLUDED x${v.length} by ${k} :: ${v.slice(0,2).join(' | ')}`);
    }
    if (occluded) skipped += occluded;
    for (const s of samples) {
      if (s.occluded) continue;
      const bg = [s.bg[0], s.bg[1], s.bg[2]];
      // fg over bg, including its own alpha and every inherited opacity
      const alpha = s.fg[3] * s.op;
      const eff = [0, 1, 2].map((i) => s.fg[i] * alpha + bg[i] * (1 - alpha));
      const ratio = contrast(eff, bg);
      const dE = deltaE(eff, bg);
      const large = s.size >= 24 || (s.size >= 18.66 && +s.weight >= 700);
      const floor = large ? 3 : 4.5;
      if (ratio >= floor) continue;
      bad.push({ ...s, ratio: +ratio.toFixed(2), dE: +dE.toFixed(3), floor,
                 invisible: dE < 0.02 });
    }
    bad.sort((a, b) => a.ratio - b.ratio);
    if (bad.length) failed += bad.length;
    if (bad.length && (!worst || bad[0].ratio < worst.ratio)) worst = bad[0];
    report.push({ url, theme, count: bad.length, findings: bad.slice(0, 8) });
  }
}
await browser.close();

if (asJson) { console.log(JSON.stringify({ app, failed, report }, null, 2)); }
else {
  console.log(`\n${app} — LEGIBILITY (WCAG AA + OKLab ΔE)`);
  for (const r of report) {
    const path = r.url ? new URL(r.url).pathname : r.url;
    if (r.skipped) { console.log(`  – ${path}  SKIPPED (${r.skipped})`); continue; }
    if (r.error) { console.log(`  ! ${path}  ${r.error}`); continue; }
    if (!r.count) { console.log(`  ✓ ${path} [${r.theme}]`); continue; }
    console.log(`  ✗ ${path} [${r.theme}] — ${r.count} below AA`);
    for (const f of r.findings) {
      const tag = f.invisible ? 'INVISIBLE' : 'low';
      console.log(`      ${String(f.ratio).padStart(5)}:1 (need ${f.floor})  ΔE ${String(f.dE).padStart(5)}  ${tag}  ${f.size}px  "${f.text}"`);
      if (f.invisible) console.log(`             ^ ΔE < 0.02 — this is not low contrast, it is the SAME COLOUR as its background`);
    }
  }
  console.log(`\n  ${failed} finding(s), ${skipped} skipped`);
  if (worst) console.log(`  worst: ${worst.ratio}:1 "${worst.text}"`);
}
process.exit(failed ? 1 : 0);
