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
 *   · EVERY viewport in VIEWPORTS — THREE of them, and the third is the point:
 *       1440x900  desktop
 *       768x1024  laptop-narrow-container  <- the only cell where the positive
 *                 control bites hardest (155.9px). `buildResponsiveLayouts`
 *                 stacks every card to full width only below a 480px
 *                 CONTAINER, so this is the geometry where a 2-of-12 card is
 *                 genuinely ~100px wide. A header that names only 1440 and 390
 *                 omits the cell the rewrite exists for.
 *       390x844   phone
 *   · page-level horizontal overflow (documentElement.scrollWidth > clientWidth)
 *   · the EXPANDED banner BODY against its own box
 *     (body.scrollWidth > body.clientWidth) — see THE OVERFLOW VERDICT below
 *   · the editor banner in BOTH states, each labelled: COLLAPSED (the
 *     production default — PageGridLayout:1187 `useState(true)` and the
 *     re-collapse effect at :1189-1194) and EXPANDED (disclosure clicked). A
 *     390 measurement that does not say which state it was in cannot answer
 *     the question that was asked of it.
 *   · every card's strip against its heading, and the hide control against the
 *     CARD BOX — the narrow-width claim is that hide gets pushed outside it.
 *   · the FIXED-HEIGHT card's content area with editing false vs true, because
 *     on that branch the strip is IN FLOW above an `overflow-auto` body inside
 *     an unchanged grid slot. Reported as an OBSERVATION, never as a pass — see
 *     THE NON-GATING OBSERVATION below.
 *   · TWO positive controls, each with its own bite:
 *       (1) the `truncate`/`min-w-0` fix is stripped off the label at run time
 *           and the card measurement repeated;
 *       (2) a class-free, inline-width div wider than the banner body is
 *           appended to the EXPANDED banner body and the overflow verdict
 *           repeated — it MUST come back as a PRODUCT failure.
 *     If a control does not reproduce, the pass proves nothing and the run says
 *     so instead of claiming a green.
 *
 * THE OVERFLOW VERDICT, AND WHY IT WAS REWRITTEN (2026-09-10, second pass)
 * ─────────────────────────────────────────────────────────────────────────────
 * The first version of this file routed an expanded-banner overflow with
 *
 *     const bucket = expanded.unmodelledClasses.length ? cell.instrumentFailures
 *                                                      : cell.failures;
 *
 * `unmodelledClasses` is the unmodelled tokens of the WHOLE document, and it is
 * non-empty (59) in every cell of every run. That ternary was therefore
 * STRUCTURALLY ONE-WAY: the product branch could never be taken, and a gate
 * whose failing branch is unreachable is green by construction. It also never
 * looked at the banner BODY at all — its only expanded check was page-level,
 * and at 390 that reads 390 == 390 and never fires, while the body itself sat
 * at scrollWidth 353 vs clientWidth 322.
 *
 * What replaces it:
 *   1. The body's own box IS checked: `scrollWidth > clientWidth + 1`.
 *   2. An overflow is ATTRIBUTED. The instrument finds the OUTERMOST elements
 *      whose box passes the container's content edge, and reports them.
 *   3. Blame is per-offender and SCOPED, not blanket. For each offender the
 *      unmodelled tokens are gathered over: that element, its whole subtree,
 *      and its ancestors up to AND INCLUDING the overflow container. If ONE
 *      offender's scope is fully modelled, the verdict is PRODUCT — a genuine
 *      overflow in a modelled subtree now reaches `cell.failures`.
 *   4. Classes ABOVE the container are EXCLUDED from blame on purpose (the
 *      container's clientWidth is MEASURED, so a class above it changes how
 *      much room there is, not whether the content fits the room measured) and
 *      are recorded in `aboveContainerUnmodelledClasses`, so the exclusion is
 *      auditable rather than silent.
 *   5. An overflow the instrument cannot attribute to any element is an
 *      INSTRUMENT result, because an unattributed overflow cannot be judged.
 *   6. Control (2) proves branch 3 is reachable. Without it this is again a
 *      gate nobody has watched fail.
 *
 * THE NON-GATING OBSERVATION
 * ─────────────────────────────────────────────────────────────────────────────
 * `summary.observationsNotGating` carries MEASURED findings this run
 * deliberately does not fail on — currently the fixed-height card's shrinking
 * content area in edit mode. They are printed as OBSERVE and do not touch
 * `result.ok`. Naming them here rather than failing on them is a decision for
 * the owner, not an oversight, and they are NOT evidence of a pass.
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

// PageGridLayout:1674. Repeated here only to LABEL a measured container width,
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
  const round1 = (n) => Math.round(n * 10) / 10;

  // ── WHAT THIS STYLESHEET MODELS ───────────────────────────────────────────
  // Computed FIRST, because the overflow verdict below is scoped by it. A sheet
  // that cannot be read is a sheet that cannot be vouched for, so it is
  // recorded rather than failed open on.
  const styled = new Set();
  let unreadableStylesheet = false;
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      unreadableStylesheet = true;
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

  const describe = (el) => {
    const cls =
      typeof el.className === 'string' && el.className.trim()
        ? `.${el.className.trim().split(/\s+/).join('.')}`
        : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`;
  };
  /** Unmodelled class tokens across a SET of elements, each with where it sits. */
  const unmodelledAcross = (elements) => {
    const found = new Map();
    for (const el of elements) {
      if (!el || !el.classList) continue;
      for (const c of el.classList) {
        if (styled.has(c) || found.has(c)) continue;
        found.set(c, describe(el));
      }
    }
    return [...found.entries()].map(([token, on]) => ({ token, on }));
  };

  const BLAME_SCOPE =
    'per offender: that element, its whole subtree, and its ancestors up to AND INCLUDING the '
    + 'overflow container. Classes ABOVE the container are excluded deliberately — the container\'s '
    + 'own clientWidth is MEASURED, so a class above it changes how much room there is, not whether '
    + 'the content fits the room that was measured — and are listed in aboveContainerUnmodelledClasses '
    + 'so that exclusion is auditable rather than silent.';

  /**
   * Does `container`'s content overflow its own box horizontally, and if so
   * WHICH element does it, and is that element's styling something this
   * stylesheet actually models?
   *
   * This exists because the previous version asked neither question: it checked
   * only the PAGE, and routed on the whole document's unmodelled-class count,
   * which is never zero. Attribution is what makes a product verdict possible.
   */
  const overflowReport = (container, what) => {
    if (!container) return null;
    const cs = getComputedStyle(container);
    const cr = container.getBoundingClientRect();
    const borderLeft = parseFloat(cs.borderLeftWidth) || 0;
    const paddingBoxLeft = cr.left + borderLeft - container.scrollLeft;
    const paddingBoxRight = paddingBoxLeft + container.clientWidth;
    const report = {
      what,
      container: describe(container),
      scrollWidth: container.scrollWidth,
      clientWidth: container.clientWidth,
      overflowBy: container.scrollWidth - container.clientWidth,
      overflows: container.scrollWidth > container.clientWidth + 1,
      offenders: [],
      offendersFound: 0,
      productAttributableOffenders: 0,
      aboveContainerUnmodelledClasses: [],
      blameScope: BLAME_SCOPE,
    };
    if (!report.overflows) return report;

    const hits = [];
    for (const el of container.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const past = Math.max(r.right - paddingBoxRight, paddingBoxLeft - r.left);
      if (past > 0.5) hits.push({ el, past, r });
    }
    // An offender inside another offender adds nothing: the outer one already
    // carries the blame and the inner one would double-count its own ancestors.
    const hitSet = new Set(hits.map((h) => h.el));
    const outermost = hits.filter((h) => !(h.el.parentElement && hitSet.has(h.el.parentElement)));

    report.offenders = outermost.map((h) => {
      const scope = [h.el, ...h.el.querySelectorAll('*')];
      let parent = h.el.parentElement;
      while (parent) {
        scope.push(parent);
        if (parent === container) break;
        parent = parent.parentElement;
      }
      const blamed = unmodelledAcross(scope);
      return {
        element: describe(h.el),
        instrumentProbe: h.el.getAttribute('data-instrument-control'),
        pastContentEdgeBy: round1(h.past),
        width: round1(h.r.width),
        left: round1(h.r.left),
        right: round1(h.r.right),
        blamedUnmodelledClasses: blamed,
        // The whole point: an offender whose blame scope is fully modelled is a
        // PRODUCT verdict, and reaches cell.failures.
        productAttributable: blamed.length === 0,
      };
    });
    report.offendersFound = report.offenders.length;
    report.productAttributableOffenders = report.offenders.filter((o) => o.productAttributable).length;

    const above = [];
    let parent = container.parentElement;
    while (parent) {
      above.push(parent);
      parent = parent.parentElement;
    }
    report.aboveContainerUnmodelledClasses = unmodelledAcross(above);
    return report;
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

  const cards = [...document.querySelectorAll('.react-grid-item')].map((item, domIndex) => {
    const strip = item.querySelector('[data-slot="grid-item-editor-chrome"]');
    const heading = item.querySelector('[data-slot="card-heading"]');
    const hide = strip ? strip.querySelector('button[aria-label^="Hide "]') : null;
    const label = strip ? strip.querySelector('span') : null;
    const handle = item.querySelector('.react-resizable-handle');
    // The card's CONTENT area. On the fixed-height branch this is the
    // `overflow-auto` body the in-flow strip now sits ABOVE (PageGridLayout:684),
    // so its clientHeight is what edit mode actually costs the reader.
    const body = item.querySelector('[data-slot="grid-item-body"]');
    const bodyStyle = body ? getComputedStyle(body) : null;
    const hideRect = hide ? hide.getBoundingClientRect() : null;
    const atHide = hideRect
      ? document.elementFromPoint(
          hideRect.left + hideRect.width / 2,
          hideRect.top + hideRect.height / 2,
        )
      : null;
    return {
      // THE JOIN KEY. `item.className` is IDENTICAL on every grid item and it
      // CHANGES between view and edit mode, so it identifies nothing: joining
      // the view-mode and edit-mode passes on it silently matched nothing and
      // the fixed-height measurement below came back `measured: false` on every
      // card. The heading text is stable across both passes; domIndex is the
      // fallback and is recorded either way so a mismatch is visible.
      key: heading?.textContent?.trim() || `dom-index-${domIndex}`,
      domIndex,
      headingText: heading?.textContent?.trim() ?? null,
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
      body: body
        ? {
            rect: rect(body),
            clientHeight: body.clientHeight,
            scrollHeight: body.scrollHeight,
            clientWidth: body.clientWidth,
            scrollWidth: body.scrollWidth,
            overflowY: bodyStyle.overflowY,
            overflowX: bodyStyle.overflowX,
            flexGrow: bodyStyle.flexGrow,
            // The fixed-height branch is the one whose body scrolls; autoHeight
            // renders `flex-none overflow-visible` and has no scroll container.
            scrollingBody: bodyStyle.overflowY === 'auto' || bodyStyle.overflowY === 'scroll',
          }
        : null,
    };
  });

  // Every unmodelled token in the rendered tree. Kept as a DISCLOSURE, not as
  // a router: routing on this number is what made the old gate unreachable.
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
    unreadableStylesheet,
    pageOverflow: overflowReport(document.documentElement, 'the page (documentElement)'),
    bannerBodyOverflow: overflowReport(bannerBody, 'the editor banner body (#page-grid-editor-controls-body)'),
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

const round1 = (n) => (n === null || n === undefined ? n : Math.round(n * 10) / 10);

/**
 * Send ONE overflow finding to the bucket its own evidence earns.
 *
 * PRODUCT    at least one outermost overflowing element has a fully modelled
 *            blame scope, so the overflow cannot be blamed on the stylesheet.
 * INSTRUMENT every offender's scope carries at least one unmodelled token, or
 *            no offender could be identified at all.
 *
 * This replaces `unmodelledClasses.length ? instrumentFailures : failures`,
 * which read the WHOLE document's unmodelled count — never zero — and so could
 * only ever take the instrument branch.
 */
function routeOverflow(cell, label, ov) {
  const head =
    `${label}: scrollWidth ${ov.scrollWidth} > clientWidth ${ov.clientWidth} `
    + `(over by ${ov.overflowBy}px) on ${ov.container}. `;
  if (ov.offendersFound === 0) {
    cell.instrumentFailures.push(
      `${head}NO element could be attributed as the overflowing one, so the instrument cannot say `
        + 'whether this is a product defect. INSTRUMENT, because an unattributed overflow is a claim '
        + 'about the measurement and not about the product.',
    );
    return 'instrument-unattributed';
  }
  const product = ov.offenders.filter((o) => o.productAttributable);
  if (product.length > 0) {
    cell.failures.push(
      `${head}${product.length} of ${ov.offendersFound} outermost overflowing element(s) have a FULLY `
        + `MODELLED blame scope: `
        + product
            .map((o) => `${o.element} past the content edge by ${o.pastContentEdgeBy}px (width ${o.width})`)
            .join('; ')
        + `. Blame scope = ${ov.blameScope} This is a PRODUCT failure.`,
    );
    return 'product';
  }
  cell.instrumentFailures.push(
    `${head}every one of the ${ov.offendersFound} outermost overflowing element(s) has at least one `
      + 'class token the harness stylesheet does not model, so this cell is INSTRUMENT-LIMITED and cannot '
      + 'return a product verdict here: '
      + ov.offenders
          .map(
            (o) =>
              `${o.element} (over by ${o.pastContentEdgeBy}px) blames [`
              + o.blamedUnmodelledClasses.map((b) => `${b.token} on ${b.on}`).join(', ')
              + ']',
          )
          .join('; ')
      + `. Blame scope = ${ov.blameScope}`,
  );
  return 'instrument-unmodelled';
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
      cell.viewPageOverflow = view.pageOverflow;
      if (view.pageOverflow?.overflows) {
        routeOverflow(cell, 'the page scrolls horizontally in VIEW mode', view.pageOverflow);
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
        state: 'COLLAPSED (production default — useState(true) at PageGridLayout:1187)',
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
      cell.banner.collapsed.pageOverflow = collapsed.pageOverflow;
      if (collapsed.pageOverflow?.overflows) {
        routeOverflow(cell, 'the page scrolls horizontally with the banner COLLAPSED', collapsed.pageOverflow);
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

      // ── THE EXPANDED-BANNER OVERFLOW VERDICT ──────────────────────────
      // Two containers, each judged on its own attributed evidence: the page,
      // and — the one the previous version never looked at — the banner BODY.
      cell.banner.expanded.pageOverflow = expanded.pageOverflow;
      cell.banner.expanded.bodyOverflow = expanded.bannerBodyOverflow;
      cell.expandedVerdicts = {
        page: expanded.pageOverflow?.overflows
          ? routeOverflow(cell, 'the page scrolls horizontally with the banner EXPANDED', expanded.pageOverflow)
          : 'no overflow',
        bannerBody: expanded.bannerBodyOverflow?.overflows
          ? routeOverflow(cell, 'the EXPANDED banner body overflows its own box', expanded.bannerBodyOverflow)
          : 'no overflow',
      };

      // ── POSITIVE CONTROL 2. The expanded-banner PRODUCT path must be
      // REACHABLE. A class-free div with an inline width wider than the body is
      // appended to the body: nothing in its own subtree can be an unmodelled
      // token, and the body's own classes are modelled, so its blame scope is
      // empty by construction and it MUST come back PRODUCT. If it does not,
      // the check is decoration and the run says so.
      const probeInjected = await page.evaluate(() => {
        const body = document.getElementById('page-grid-editor-controls-body');
        if (!body) return null;
        const el = document.createElement('div');
        el.setAttribute('data-instrument-control', 'banner-overflow-probe');
        const width = body.clientWidth + 200;
        el.style.cssText = `width:${width}px;height:8px;flex:0 0 auto;background:transparent;`;
        body.appendChild(el);
        return { bodyClientWidth: body.clientWidth, probeWidth: width };
      });
      await page.waitForTimeout(50);
      const probed = await page.evaluate(collect, 'edit:control-banner-overflow');
      const probedOverflow = probed.bannerBodyOverflow;
      const probeOffender = (probedOverflow?.offenders ?? []).find(
        (o) => o.instrumentProbe === 'banner-overflow-probe',
      );
      cell.bannerOverflowControl = {
        what: 'a class-free div with an inline width 200px wider than the banner body, appended to the '
          + 'EXPANDED banner body at run time',
        why: 'the expanded-banner overflow path must be able to REACH cell.failures. The previous routing '
          + 'read `unmodelledClasses.length ? instrumentFailures : failures` over the whole document, which '
          + 'is non-empty in every cell, so the product branch was unreachable and that gate was green by '
          + 'construction.',
        ...(probeInjected ?? { bodyClientWidth: null, probeWidth: null }),
        detectedOverflow: Boolean(probedOverflow?.overflows),
        overflowBy: probedOverflow?.overflowBy ?? null,
        probeSeenAsOffender: Boolean(probeOffender),
        probeBlamedUnmodelledClasses: probeOffender?.blamedUnmodelledClasses ?? null,
        probeVerdict: probeOffender
          ? probeOffender.productAttributable
            ? 'PRODUCT'
            : 'INSTRUMENT'
          : probedOverflow?.overflows
            ? 'overflow detected but the probe was not among the outermost offenders'
            : 'no overflow detected at all',
        bit: Boolean(probeOffender?.productAttributable),
      };
      await page.evaluate(() => {
        document.querySelector('[data-instrument-control="banner-overflow-probe"]')?.remove();
      });
      await page.waitForTimeout(50);

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

      // ── WHAT EDIT MODE COSTS THE CONTENT AREA ─────────────────────────
      // The strip is IN FLOW. On an autoHeight card that is fine — the
      // ResizeObserver grows the slot to fit it. On a FIXED-HEIGHT card the
      // slot does NOT grow: the strip is a sibling above an `overflow-auto`
      // body (PageGridLayout:679-687), so the visible content area shrinks by
      // the strip's height the moment the editor opens. Nothing measured that
      // before. It is measured here and REPORTED — it does not fail the run;
      // whether it ships is the owner's call, not the instrument's.
      const viewByKey = new Map(view.cards.map((c) => [c.key, c]));
      cell.editModeContentArea = edit.cards.map((c) => {
        const before = viewByKey.get(c.key);
        const vb = before?.body;
        const eb = c.body;
        if (!vb || !eb) {
          return {
            key: c.key,
            label: c.label ?? before?.label ?? null,
            measured: false,
            why: !before
              ? `no view-mode card joined on key "${c.key}" — the join failed, so this is an INSTRUMENT gap`
              : 'one of the two passes reported no [data-slot="grid-item-body"]',
          };
        }
        const hiddenBefore = Math.max(0, vb.scrollHeight - vb.clientHeight);
        const hiddenAfter = Math.max(0, eb.scrollHeight - eb.clientHeight);
        return {
          key: c.key,
          domIndexViewMode: before.domIndex,
          domIndexEditMode: c.domIndex,
          label: c.label ?? before?.label ?? null,
          measured: true,
          // `scrollingBody` true == the FIXED-HEIGHT branch.
          scrollingBody: eb.scrollingBody,
          bodyOverflowY: eb.overflowY,
          stripHeight: c.strip ? round1(c.strip.height) : null,
          bodyClientHeightViewMode: vb.clientHeight,
          bodyClientHeightEditMode: eb.clientHeight,
          visibleContentAreaLostPx: round1(vb.clientHeight - eb.clientHeight),
          bodyScrollHeightViewMode: vb.scrollHeight,
          bodyScrollHeightEditMode: eb.scrollHeight,
          contentHiddenAtAnyOneScrollPositionViewMode: round1(hiddenBefore),
          contentHiddenAtAnyOneScrollPositionEditMode: round1(hiddenAfter),
          extraContentHiddenByEditMode: round1(hiddenAfter - hiddenBefore),
          // Hidden and scrollable is a cost. Hidden and NOT scrollable is a loss.
          reachableByScrolling: eb.scrollingBody,
          clippedUnreachable: hiddenAfter > 0.5 && !eb.scrollingBody,
        };
      });

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
  // ── POSITIVE CONTROL 2's own bite ────────────────────────────────────────
  const bannerControlCells = result.cells.filter((c) => c.bannerOverflowControl);
  const bannerControlBit = bannerControlCells.filter((c) => c.bannerOverflowControl.bit);
  for (const c of bannerControlCells) {
    if (c.bannerOverflowControl.bit) continue;
    controlFailures.push(
      `the EXPANDED-banner overflow check has NO BITE in cell "${c.name}": a class-free div `
        + `${c.bannerOverflowControl.probeWidth}px wide was appended to a `
        + `${c.bannerOverflowControl.bodyClientWidth}px body and the check returned `
        + `"${c.bannerOverflowControl.probeVerdict}" instead of PRODUCT. The product branch of that check `
        + 'is therefore unreachable and its green means nothing — exactly the defect this control exists '
        + 'to catch.',
    );
  }
  for (const c of measured) {
    if (c.bannerOverflowControl) continue;
    controlFailures.push(
      `cell "${c.name}" asserted its width but ran no expanded-banner overflow control, so the product `
        + 'branch of that check is unproven here.',
    );
  }

  // A content-area row that did not MEASURE is an INSTRUMENT failure, not a
  // silent absence. The first version of this join keyed on `item.className`,
  // which is the same string on every grid item AND different between the view
  // and edit passes: every row came back unmeasured, the observation list was
  // empty, and an empty observation list reads exactly like "nothing to report".
  for (const cellRef of measured) {
    const rows = cellRef.editModeContentArea ?? [];
    if (rows.length === 0) {
      cellRef.instrumentFailures.push(
        'no edit-mode content-area rows were produced at all, so the fixed-height question was not asked '
          + 'in this cell.',
      );
      continue;
    }
    for (const m of rows) {
      if (m.measured) continue;
      cellRef.instrumentFailures.push(
        `content area for card "${m.label ?? m.key}" could not be measured: ${m.why}. An unmeasured row `
          + 'reads the same as a clean one, so it is failed rather than omitted.',
      );
    }
  }
  if (!result.cells.some((c) => (c.editModeContentArea ?? []).some((m) => m.measured && m.scrollingBody))) {
    for (const cellRef of measured.slice(0, 1)) {
      cellRef.instrumentFailures.push(
        'no FIXED-HEIGHT (scrolling-body) card was measured in ANY cell, so the claim that an in-flow strip '
          + 'costs a fixed-height card visible content area was never tested. The fixture must carry a '
          + 'non-autoHeight card.',
      );
    }
  }

  // ── MEASURED, REPORTED, DELIBERATELY NOT GATED ───────────────────────────
  const observationsNotGating = [];
  for (const cellRef of result.cells) {
    for (const m of cellRef.editModeContentArea ?? []) {
      if (!m.measured || !m.scrollingBody) continue;
      if (!(m.visibleContentAreaLostPx > 0.5)) continue;
      observationsNotGating.push(
        `${cellRef.name}: FIXED-HEIGHT card "${m.label ?? m.key}" — entering edit mode puts the strip `
          + `(${m.stripHeight}px) IN FLOW above the overflow-auto body inside an UNCHANGED grid slot, so the `
          + `visible content area falls ${m.bodyClientHeightViewMode}px -> ${m.bodyClientHeightEditMode}px `
          + `(${m.visibleContentAreaLostPx}px lost). Content hidden at any one scroll position goes `
          + `${m.contentHiddenAtAnyOneScrollPositionViewMode}px -> `
          + `${m.contentHiddenAtAnyOneScrollPositionEditMode}px `
          + `(+${m.extraContentHiddenByEditMode}px). `
          + (m.clippedUnreachable
            ? `The body computes overflow-y:${m.bodyOverflowY} and does NOT scroll, so that content is `
              + 'UNREACHABLE while arranging.'
            : `The body computes overflow-y:${m.bodyOverflowY} and scrolls, so the content stays REACHABLE — `
              + 'the cost is scrolling and a smaller window on the content, not access.')
          + ' NOT GATED: this is reported for an owner decision, not fixed in this run.',
      );
    }
  }

  result.summary = {
    cellsRequested: VIEWPORTS.length,
    cellsThatAssertedTheirWidth: measured.length,
    cellsThatCanReproduceTheNarrowCardClass: canReproduce.map((c) => c.name),
    cellsWhereThePositiveControlBit: bit.map((c) => c.name),
    cellsWhereTheBannerOverflowControlBit: bannerControlBit.map((c) => c.name),
    expandedBannerVerdicts: Object.fromEntries(
      result.cells.filter((c) => c.expandedVerdicts).map((c) => [c.name, c.expandedVerdicts]),
    ),
    productFailures: result.cells.flatMap((c) => c.failures),
    instrumentFailures: result.cells.flatMap((c) => c.instrumentFailures),
    controlFailures,
    observationsNotGating,
    observationPolicy:
      'observationsNotGating are MEASURED findings this run deliberately does NOT fail on. They are '
      + 'printed as OBSERVE and do not touch result.ok. They are NOT evidence of a pass, and leaving them '
      + 'ungated is an owner decision recorded here rather than an oversight hidden here.',
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
      + `narrow-card control bit in: [${(s.cellsWhereThePositiveControlBit ?? []).join(', ')}] `
      + `of [${(s.cellsThatCanReproduceTheNarrowCardClass ?? []).join(', ')}]; `
      + `banner-overflow control bit in: [${(s.cellsWhereTheBannerOverflowControlBit ?? []).join(', ')}]\n`
      + (result.error ? `${result.error}\n` : '')
      + (s.productFailures ?? []).map((x) => `  PRODUCT    ${x}\n`).join('')
      + (s.instrumentFailures ?? []).map((x) => `  INSTRUMENT ${x}\n`).join('')
      + (s.controlFailures ?? []).map((x) => `  CONTROL    ${x}\n`).join('')
      + (s.observationsNotGating ?? []).map((x) => `  OBSERVE    ${x}\n`).join(''),
  );
}

process.exit(result.ok ? 0 : 1);
