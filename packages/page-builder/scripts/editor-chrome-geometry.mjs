#!/usr/bin/env node
/**
 * Browser geometry of the REAL PageGridLayout GridItem — not toy boxes.
 *
 * WHAT CHANGED AND WHY (2026-09-10)
 * ─────────────────────────────────────────────────────────────────────────────
 * The first version of this script hardcoded ONE page at {width:1440,height:900}
 * and never asserted `window.innerWidth`. A receipt cell labelled "390 emulate"
 * was published against it that reported innerWidth 1560. The cause of that
 * 1560 is NOT established and is not guessed at here — a devicePixelRatio does
 * not change window.innerWidth, so the earlier "a dpr rescaled it" explanation
 * is withdrawn rather than repeated. All that is recorded is the rule this
 * script now enforces:
 *
 *     A CELL WHOSE WIDTH WAS NOT ASSERTED IN THE SAME EVALUATE IS NOT A CELL.
 *
 * `innerWidth`, `documentElement.clientWidth` and `documentElement.scrollWidth`
 * come back from the SAME `page.evaluate` that returns the rects, and a cell
 * whose innerWidth is not the requested width is a HARD FAIL, not a footnote.
 *
 * WHAT IT MEASURES
 * ─────────────────────────────────────────────────────────────────────────────
 *   · every viewport in VIEWPORTS (1440x900 desktop, 390x844 phone)
 *   · page-level horizontal overflow (documentElement.scrollWidth > innerWidth)
 *   · the editor banner in BOTH states, each labelled: COLLAPSED (the
 *     production default — PageGridLayout :1181 `useState(true)` and the
 *     re-collapse effect at :1183) and EXPANDED (disclosure clicked). A 390
 *     measurement that does not say which state it was in cannot answer the
 *     question that was asked of it.
 *   · every card's strip against its heading, and the hide control against the
 *     CARD BOX — the narrow-width claim is that hide gets pushed outside it.
 *   · a POSITIVE CONTROL with its own bite: the `truncate`/`min-w-0` fix is
 *     stripped off the label at run time and the same measurement repeated. If
 *     removing the fix does not reproduce the defect, the pass proves nothing
 *     and the run says so instead of claiming a green.
 *
 * THE THEME IS READ, NEVER FORCED. `colorScheme` is not passed to
 * `newContext`; whatever the DOM reports is recorded. Forcing a theme measures
 * a state no user reaches.
 *
 * THE STYLESHEET IS A MODEL, AND THE SCRIPT SAYS SO. The harness renders the
 * real component against `src/__tests__/fixtures/harness.css`, a hand-written
 * model of Tailwind — not Tailwind. `harness.unmodelledClasses` lists every
 * class token present in the DOM that no rule in that stylesheet matches, so a
 * failure that rides on an unmodelled layout class is reported as an INSTRUMENT
 * result and never as a product result.
 *
 * RUNNING IT
 *   NODE_PATH=/path/to/playwright@x/node_modules node scripts/editor-chrome-geometry.mjs --json
 * playwright is not a dependency of this package. `createRequire` is used
 * deliberately: NODE_PATH is honoured by `require`, and NOT by ESM `import`.
 */
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (err) {
  process.stderr.write(
    'playwright could not be resolved. It is not a dependency of @bsuite/page-builder; point NODE_PATH\n'
      + 'at a store that holds it, e.g.\n'
      + '  NODE_PATH=<repo>/crm7/node_modules/.pnpm/playwright@1.62.0/node_modules \\\n'
      + '    node scripts/editor-chrome-geometry.mjs --json\n'
      + `resolution failure: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json') || process.env.GEOMETRY_JSON === '1';
const outIndex = process.argv.indexOf('--out');
const outPath = outIndex === -1 ? null : process.argv[outIndex + 1];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  // The laptop-with-sidebar geometry. `buildResponsiveLayouts` stacks every
  // card to full width only below a 480px CONTAINER (`xxs`); between 480 and
  // 1200 the breakpoints MIRROR `lg`, so this is where a 2-of-12 card is
  // genuinely ~100px wide. Without this cell the narrow-card claim has no cell
  // that can reproduce it.
  { name: 'laptop-narrow-container', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
];

// PageGridLayout :1668. Repeated here only to LABEL a measured container width,
// never to substitute for one.
const RGL_BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
function breakpointFor(containerWidth) {
  return Object.entries(RGL_BREAKPOINTS)
    .sort((a, b) => b[1] - a[1])
    .find(([, min]) => containerWidth >= min)?.[0] ?? 'xxs';
}

/** Run inside the page. Returns rects AND the width facts in ONE evaluate. */
function collect(phase) {
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.x, y: r.y, width: r.width, height: r.height,
      top: r.top, right: r.right, bottom: r.bottom, left: r.left,
    };
  };

  const win = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    devicePixelRatio: window.devicePixelRatio,
  };

  const colourScheme = {
    documentElementColorScheme: getComputedStyle(document.documentElement).colorScheme,
    dataTheme: document.documentElement.getAttribute('data-theme'),
    classList: [...document.documentElement.classList],
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    bodyBackgroundColor: getComputedStyle(document.body).backgroundColor,
  };

  const canvas = document.querySelector('.page-grid-canvas');
  const containerWidth = canvas ? Math.round(canvas.getBoundingClientRect().width) : null;

  const banner = document.querySelector('[data-page-grid-editor-controls]');
  const bannerBody = document.getElementById('page-grid-editor-controls-body');
  const bannerState = banner
    ? {
        collapsedAttr: banner.getAttribute('data-collapsed'),
        rect: rect(banner),
        scrollWidth: banner.scrollWidth,
        clientWidth: banner.clientWidth,
        body: bannerBody
          ? {
              hiddenAttr: bannerBody.hasAttribute('hidden'),
              computedDisplay: getComputedStyle(bannerBody).display,
              flexWrap: getComputedStyle(bannerBody).flexWrap,
              rect: rect(bannerBody),
              scrollWidth: bannerBody.scrollWidth,
              clientWidth: bannerBody.clientWidth,
            }
          : null,
      }
    : null;

  const cards = [...document.querySelectorAll('.react-grid-item')].map((item) => {
    const strip = item.querySelector('[data-slot="grid-item-editor-chrome"]');
    const heading = item.querySelector('[data-slot="card-heading"]');
    const hide = strip ? strip.querySelector('button[aria-label^="Hide "]') : null;
    const label = strip ? strip.querySelector('span') : null;
    const handle = item.querySelector('.react-resizable-handle');
    const hideRect = hide ? hide.getBoundingClientRect() : null;
    const atHide = hideRect
      ? document.elementFromPoint(
          hideRect.left + hideRect.width / 2,
          hideRect.top + hideRect.height / 2,
        )
      : null;
    return {
      id: item.getAttribute('data-grid-id') ?? item.className,
      label: hide ? hide.getAttribute('aria-label').replace(/^Hide /, '') : null,
      card: rect(item),
      strip: rect(strip),
      heading: rect(heading),
      hide: hideRect ? rect(hide) : null,
      labelBox: rect(label),
      handle: rect(handle),
      stripScrollWidth: strip ? strip.scrollWidth : null,
      stripClientWidth: strip ? strip.clientWidth : null,
      labelScrollWidth: label ? label.scrollWidth : null,
      labelClientWidth: label ? label.clientWidth : null,
      labelOverflowStyle: label ? getComputedStyle(label).overflow : null,
      labelTitle: label ? label.getAttribute('title') : null,
      labelText: label ? label.textContent : null,
      stripPosition: strip ? getComputedStyle(strip).position : null,
      hidePosition: hide ? getComputedStyle(hide).position : null,
      hideHitSlot: atHide
        ? (atHide.closest('[data-slot="grid-item-editor-chrome"]') ? 'chrome' : 'other')
        : null,
      dragHandle: item.classList.contains('drag-handle'),
      resizableHide: item.classList.contains('react-resizable-hide'),
    };
  });

  // Which class tokens in the live DOM does this stylesheet not model?
  const styled = new Set();
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      // A sheet we cannot read is a sheet we cannot vouch for. Say so rather
      // than failing open and calling everything modelled.
      styled.add('__UNREADABLE_SHEET__');
      continue;
    }
    const walk = (list) => {
      for (const r of list) {
        if (r.selectorText) {
          for (const m of r.selectorText.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) {
            styled.add(m[1].replace(/\\/g, ''));
          }
        }
        if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(rules);
  }
  const used = new Set();
  for (const el of document.querySelectorAll('#root *')) {
    for (const c of el.classList) used.add(c);
  }
  const unmodelledClasses = [...used].filter((c) => !styled.has(c)).sort();

  return {
    phase,
    window: win,
    containerWidth,
    colourScheme,
    banner: bannerState,
    cards,
    unmodelledClasses,
    unreadableStylesheet: styled.has('__UNREADABLE_SHEET__'),
  };
}

function rectsOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}
function intersectionArea(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w <= 0 || h <= 0 ? 0 : w * h;
}

/** The card-level contract. Returns the failure strings for one card. */
function judgeCard(c) {
  const f = [];
  const at = (m) => `${c.label ?? c.id}: ${m}`;
  if (!c.strip) return [at('no editor strip in edit mode')];
  if (!c.heading) return [at('no card heading')];
  if (!c.hide) return [at('no hide control on the strip')];

  if (c.stripPosition === 'absolute') f.push(at('strip computed position is absolute'));
  if (c.hidePosition === 'absolute') f.push(at('hide computed position is absolute'));

  const area = intersectionArea(c.strip, c.heading);
  if (rectsOverlap(c.strip, c.heading) || area > 0) f.push(at(`strip intersects heading (area=${area})`));
  if (!(c.heading.top >= c.strip.bottom - 0.5)) f.push(at('heading is not below the in-flow strip'));

  if (!(c.hide.top >= c.strip.top - 0.5 && c.hide.bottom <= c.strip.bottom + 0.5)) {
    f.push(at('hide control is not inside the strip box'));
  }
  // THE NARROW-WIDTH CLAIM, stated as a measurement rather than an assertion.
  if (c.hide.right > c.card.right + 0.5) {
    f.push(at(`hide right edge ${c.hide.right.toFixed(1)} is outside the card box right edge ${c.card.right.toFixed(1)}`));
  }
  if (c.hide.left < c.card.left - 0.5) {
    f.push(at(`hide left edge ${c.hide.left.toFixed(1)} is outside the card box left edge ${c.card.left.toFixed(1)}`));
  }
  if (c.stripScrollWidth > c.stripClientWidth + 1) {
    f.push(at(`strip content overflows its box (scrollWidth ${c.stripScrollWidth} > clientWidth ${c.stripClientWidth})`));
  }
  if (c.hideHitSlot !== 'chrome') f.push(at(`hide is not hittable at its centre (hit slot=${c.hideHitSlot})`));

  const hideMinEdge = Math.min(c.hide.width, c.hide.height);
  if (hideMinEdge < 24) f.push(at(`hide control edge ${hideMinEdge}px is below 24px`));
  if (c.strip.height < 24) f.push(at(`strip height ${c.strip.height} is below 24px`));
  if (!c.dragHandle) f.push(at('grid item lost drag-handle'));
  if (c.resizableHide) f.push(at('resize was hidden on an autoHeight card'));
  if (!c.handle || c.handle.width < 16 || c.handle.height < 16) {
    f.push(at('resize handle missing or smaller than 16px'));
  }
  // The fix must be present and doing something, not merely declared.
  if (c.labelOverflowStyle !== 'hidden') {
    f.push(at(`label overflow is "${c.labelOverflowStyle}", not hidden — truncate is not in force`));
  }
  if (c.labelTitle !== c.labelText) {
    f.push(at('label title does not carry the full name, so clipping loses it'));
  }
  return f;
}

const result = {
  generatedAt: new Date().toISOString(),
  instrument: {
    script: 'packages/page-builder/scripts/editor-chrome-geometry.mjs',
    harness: 'packages/page-builder/vite.harness.config.ts -> src/__tests__/fixtures/',
    stylesheet: 'src/__tests__/fixtures/harness.css — a HAND-WRITTEN MODEL of Tailwind v4.3.3, not Tailwind',
    themePolicy: 'read from the DOM; colorScheme is never passed to newContext',
    widthPolicy: 'innerWidth asserted in the SAME evaluate that returns the rects; a cell that fails it is not a cell',
    playwright: null,
  },
  url: null,
  cells: [],
  ok: false,
  error: null,
};

const server = await createServer({
  configFile: resolve(root, 'vite.harness.config.ts'),
  server: { port: 4177, strictPort: true, host: '127.0.0.1' },
});
await server.listen();
const url = 'http://127.0.0.1:4177/';
result.url = url;

// Theme is NOT forced: no colorScheme is passed anywhere in this launch.
const browser = await chromium.launch({ headless: true });
result.instrument.playwright = browser.version();

try {
  for (const vp of VIEWPORTS) {
    const cell = {
      name: vp.name,
      requested: { width: vp.width, height: vp.height, deviceScaleFactor: 1 },
      widthAsserted: false,
      failures: [],
      instrumentFailures: [],
      banner: {},
      cards: null,
      control: null,
    };

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-slot="card-heading"]', { timeout: 15_000 });
      await page.waitForFunction(() => {
        const canvas = document.querySelector('.page-grid-canvas');
        return canvas && getComputedStyle(canvas.parentElement).opacity !== '0';
      });

      const view = await page.evaluate(collect, 'view');
      cell.viewModeStrips = view.cards.filter((c) => c.strip).length;
      cell.window = view.window;
      cell.colourScheme = view.colourScheme;
      cell.containerWidth = view.containerWidth;
      cell.rglBreakpoint = view.containerWidth === null ? null : breakpointFor(view.containerWidth);
      cell.stacksToOneColumn = cell.rglBreakpoint === 'xxs';

      // ── WIDTH GATE. Everything below is void if this fails. ────────────
      cell.widthAsserted = view.window.innerWidth === vp.width;
      if (!cell.widthAsserted) {
        cell.instrumentFailures.push(
          `requested width ${vp.width} but window.innerWidth is ${view.window.innerWidth} `
            + `(documentElement.clientWidth ${view.window.clientWidth}). The requested width was not the `
            + `observed width; the cause is not established and is not guessed at here. This is NOT a `
            + `${vp.width} cell and nothing measured in it may be reported as one.`,
        );
        result.cells.push(cell);
        continue;
      }
      if (view.window.scrollWidth > view.window.innerWidth) {
        cell.failures.push(
          `page scrolls horizontally in VIEW mode: documentElement.scrollWidth `
            + `${view.window.scrollWidth} > innerWidth ${view.window.innerWidth}`,
        );
      }
      if (cell.viewModeStrips !== 0) {
        cell.failures.push(`view mode renders ${cell.viewModeStrips} editor strip(s); it must render none`);
      }

      // ── open the editor ────────────────────────────────────────────────
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('bsuite-open-page-editor'));
      });
      await page.waitForSelector('[data-slot="grid-item-editor-chrome"]', { timeout: 10_000 });
      await page.waitForSelector('[data-page-grid-editing="true"]');

      // ── BANNER, COLLAPSED. This is the production default. ─────────────
      const collapsed = await page.evaluate(collect, 'edit:banner-collapsed');
      cell.banner.collapsed = {
        state: 'COLLAPSED (production default — useState(true) at PageGridLayout:1181)',
        ...collapsed.banner,
        pageScrollWidth: collapsed.window.scrollWidth,
        pageInnerWidth: collapsed.window.innerWidth,
      };
      if (collapsed.window.innerWidth !== vp.width) {
        cell.instrumentFailures.push(`innerWidth drifted to ${collapsed.window.innerWidth} while collapsed`);
      }
      if (collapsed.banner?.body && collapsed.banner.body.computedDisplay !== 'none') {
        cell.instrumentFailures.push(
          `the collapsed banner body computes display:${collapsed.banner.body.computedDisplay}, not none — `
            + `the harness stylesheet is not modelling the [hidden] preflight rule, so anything it reports `
            + `about the collapsed banner is an INSTRUMENT result`,
        );
      }
      if (collapsed.window.scrollWidth > collapsed.window.innerWidth) {
        cell.failures.push(
          `page scrolls horizontally with the banner COLLAPSED: scrollWidth ${collapsed.window.scrollWidth} `
            + `> innerWidth ${collapsed.window.innerWidth}`,
        );
      }

      // ── BANNER, EXPANDED. Reached only by clicking the disclosure. ─────
      await page.click('button[aria-controls="page-grid-editor-controls-body"]');
      await page.waitForFunction(() => {
        const b = document.getElementById('page-grid-editor-controls-body');
        return b && !b.hasAttribute('hidden');
      });
      const expanded = await page.evaluate(collect, 'edit:banner-expanded');
      cell.banner.expanded = {
        state: 'EXPANDED (disclosure clicked — a state a user must ask for)',
        ...expanded.banner,
        pageScrollWidth: expanded.window.scrollWidth,
        pageInnerWidth: expanded.window.innerWidth,
      };
      if (expanded.window.innerWidth !== vp.width) {
        cell.instrumentFailures.push(`innerWidth drifted to ${expanded.window.innerWidth} while expanded`);
      }
      cell.unmodelledClasses = expanded.unmodelledClasses;
      cell.unreadableStylesheet = expanded.unreadableStylesheet;
      if (expanded.window.scrollWidth > expanded.window.innerWidth) {
        const bucket = expanded.unmodelledClasses.length ? cell.instrumentFailures : cell.failures;
        bucket.push(
          `page scrolls horizontally with the banner EXPANDED: scrollWidth ${expanded.window.scrollWidth} `
            + `> innerWidth ${expanded.window.innerWidth}`
            + (expanded.unmodelledClasses.length
              ? ` — but ${expanded.unmodelledClasses.length} class token(s) in this DOM are unmodelled by the `
                + `harness stylesheet (${expanded.unmodelledClasses.join(' ')}), so this is an INSTRUMENT result`
              : ''),
        );
      }

      // Back to the production default before judging the cards.
      await page.click('button[aria-controls="page-grid-editor-controls-body"]');
      await page.waitForFunction(() => {
        const b = document.getElementById('page-grid-editor-controls-body');
        return b && b.hasAttribute('hidden');
      });

      // ── CARDS, banner collapsed ────────────────────────────────────────
      const edit = await page.evaluate(collect, 'edit:cards');
      if (edit.window.innerWidth !== vp.width) {
        cell.instrumentFailures.push(`innerWidth drifted to ${edit.window.innerWidth} at card measurement`);
      }
      cell.cards = edit.cards;
      for (const c of edit.cards) cell.failures.push(...judgeCard(c));

      // ── POSITIVE CONTROL. Remove the fix; the defect must come back. ───
      const control = await page.evaluate(() => {
        const removed = [];
        for (const span of document.querySelectorAll('[data-slot="grid-item-editor-chrome"] span')) {
          if (span.classList.contains('truncate') || span.classList.contains('min-w-0')) {
            span.classList.remove('truncate', 'min-w-0');
            removed.push(span.textContent);
          }
        }
        return removed;
      });
      await page.waitForTimeout(50);
      const withoutFix = await page.evaluate(collect, 'edit:control-fix-removed');
      const escaped = withoutFix.cards.filter(
        (c) => c.hide && c.card && (c.hide.right > c.card.right + 0.5 || c.stripScrollWidth > c.stripClientWidth + 1),
      );
      const narrowest = edit.cards.reduce(
        (a, c) => (a === null || (c.card && c.card.width < a.card.width) ? c : a),
        null,
      );
      cell.control = {
        what: 'truncate + min-w-0 removed from every editor-strip label at run time',
        strippedFrom: control,
        narrowestCardWidth: narrowest?.card?.width ?? null,
        canReproduceHere: !cell.stacksToOneColumn,
        whyNot: cell.stacksToOneColumn
          ? `container ${cell.containerWidth}px is below 480, so buildResponsiveLayouts stacks EVERY `
            + `card to full width (STACKED_BREAKPOINTS = ['xxs']). There is no narrow card at this `
            + `viewport to push the hide control out of, so this cell cannot reproduce the class and `
            + `a pass here is not evidence about it.`
          : null,
        cardsWhereHideEscapesOrStripOverflows: escaped.map((c) => ({
          label: c.label,
          cardWidth: c.card.width,
          hideRight: c.hide.right,
          cardRight: c.card.right,
          stripScrollWidth: c.stripScrollWidth,
          stripClientWidth: c.stripClientWidth,
          labelScrollWidth: c.labelScrollWidth,
          labelClientWidth: c.labelClientWidth,
        })),
        bit: escaped.length > 0,
      };

      result.cells.push(cell);
    } finally {
      await context.close();
    }
  }

  const measured = result.cells.filter((c) => c.widthAsserted);
  const canReproduce = result.cells.filter((c) => c.control?.canReproduceHere);
  const bit = canReproduce.filter((c) => c.control?.bit);
  const controlFailures = [];
  if (canReproduce.length === 0) {
    controlFailures.push(
      'no cell in this run could reproduce the narrow-card class at all — every cell stacked to one '
        + 'column. The suite has no bite and its green means nothing.',
    );
  }
  for (const c of canReproduce) {
    if (!c.control.bit) {
      controlFailures.push(
        `positive control did NOT bite in cell "${c.name}" (narrowest card `
          + `${c.control.narrowestCardWidth}px): removing truncate + min-w-0 did not push hide out of the `
          + 'card box nor overflow the strip. The fix is therefore UNPROVEN in this cell — the pass is '
          + 'consistent with the fix doing nothing.',
      );
    }
  }
  result.summary = {
    cellsRequested: VIEWPORTS.length,
    cellsThatAssertedTheirWidth: measured.length,
    cellsThatCanReproduceTheNarrowCardClass: canReproduce.map((c) => c.name),
    cellsWhereThePositiveControlBit: bit.map((c) => c.name),
    productFailures: result.cells.flatMap((c) => c.failures),
    instrumentFailures: result.cells.flatMap((c) => c.instrumentFailures),
    controlFailures,
  };
  result.ok =
    measured.length === VIEWPORTS.length
    && result.summary.productFailures.length === 0
    && result.summary.instrumentFailures.length === 0
    && controlFailures.length === 0;
} catch (err) {
  result.error = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
  result.ok = false;
} finally {
  await browser.close();
  await server.close();
}

const text = `${JSON.stringify(result, null, 2)}\n`;
if (outPath) writeFileSync(resolve(process.cwd(), outPath), text);

if (asJson) {
  process.stdout.write(text);
} else {
  const s = result.summary ?? {};
  process.stdout.write(
    `${result.ok ? 'PASS' : 'FAIL'} editor-chrome geometry — `
      + `${s.cellsThatAssertedTheirWidth ?? 0}/${VIEWPORTS.length} cells asserted their own width; `
      + `${(s.productFailures ?? []).length} product failure(s); `
      + `${(s.instrumentFailures ?? []).length} instrument failure(s); `
      + `positive control bit in: [${(s.cellsWhereThePositiveControlBit ?? []).join(', ')}] `
      + `of [${(s.cellsThatCanReproduceTheNarrowCardClass ?? []).join(', ')}]\n`
      + (result.error ? `${result.error}\n` : '')
      + (s.productFailures ?? []).map((x) => `  PRODUCT    ${x}\n`).join('')
      + (s.instrumentFailures ?? []).map((x) => `  INSTRUMENT ${x}\n`).join('')
      + (s.controlFailures ?? []).map((x) => `  CONTROL    ${x}\n`).join(''),
  );
}

process.exit(result.ok ? 0 : 1);
