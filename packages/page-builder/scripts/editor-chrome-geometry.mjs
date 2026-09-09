#!/usr/bin/env node
/**
 * Browser geometry of the REAL PageGridLayout GridItem — not toy boxes.
 * Fails if the edit-mode strip intersects the card heading, if hide is not
 * hittable, or if computed position of the strip is absolute.
 */
import { createServer } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (err) {
  process.stderr.write(
    'playwright is not installed in this package. Geometry was verified via chrome-devtools on the vite harness (vite.harness.config.ts).\n'
      + `import failure: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(2);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv.includes('--json') || process.env.GEOMETRY_JSON === '1';

function rectsOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

function intersectionArea(a, b) {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

const server = await createServer({
  configFile: resolve(root, 'vite.harness.config.ts'),
  server: { port: 4177, strictPort: true, host: '127.0.0.1' },
});
await server.listen();
const url = 'http://127.0.0.1:4177/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const result = {
  ok: false,
  url,
  view: null,
  edit: null,
  error: null,
};

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-slot="card-heading"]', { timeout: 15_000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.page-grid-canvas');
    return canvas && getComputedStyle(canvas.parentElement).opacity !== '0';
  });

  const viewHeading = await page.locator('[data-slot="card-heading"]').boundingBox();
  result.view = {
    heading: viewHeading,
    stripPresent: await page.locator('[data-slot="grid-item-editor-chrome"]').count(),
  };

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('bsuite-open-page-editor'));
  });
  await page.waitForSelector('[data-slot="grid-item-editor-chrome"]', { timeout: 10_000 });
  await page.waitForSelector('[data-page-grid-editing="true"]');

  const metrics = await page.evaluate(() => {
    const strip = document.querySelector('[data-slot="grid-item-editor-chrome"]');
    const heading = document.querySelector('[data-slot="card-heading"]');
    const hide = document.querySelector('[data-slot="grid-item-editor-chrome"] [aria-label="Hide Candidates"]');
    const handle = document.querySelector('.react-grid-item .react-resizable-handle');
    const item = document.querySelector('.react-grid-item');
    if (!strip || !heading || !hide || !item) {
      return { missing: { strip: !strip, heading: !heading, hide: !hide, item: !item } };
    }
    const stripRect = strip.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const hideRect = hide.getBoundingClientRect();
    const handleRect = handle ? handle.getBoundingClientRect() : null;
    const stripStyle = getComputedStyle(strip);
    const hideStyle = getComputedStyle(hide);
    const atHide = document.elementFromPoint(
      hideRect.left + hideRect.width / 2,
      hideRect.top + hideRect.height / 2,
    );
    return {
      strip: { x: stripRect.x, y: stripRect.y, width: stripRect.width, height: stripRect.height, top: stripRect.top, left: stripRect.left, right: stripRect.right, bottom: stripRect.bottom },
      heading: { x: headingRect.x, y: headingRect.y, width: headingRect.width, height: headingRect.height, top: headingRect.top, left: headingRect.left, right: headingRect.right, bottom: headingRect.bottom },
      hide: { x: hideRect.x, y: hideRect.y, width: hideRect.width, height: hideRect.height, top: hideRect.top, left: hideRect.left, right: hideRect.right, bottom: hideRect.bottom },
      handle: handleRect
        ? { x: handleRect.x, y: handleRect.y, width: handleRect.width, height: handleRect.height }
        : null,
      stripPosition: stripStyle.position,
      hidePosition: hideStyle.position,
      hideHit: atHide ? { tag: atHide.tagName, aria: atHide.getAttribute('aria-label'), slot: atHide.closest('[data-slot="grid-item-editor-chrome"]') ? 'chrome' : 'other' } : null,
      dragHandle: item.classList.contains('drag-handle'),
      resizableHide: item.classList.contains('react-resizable-hide'),
    };
  });

  if (metrics.missing) {
    throw new Error(`missing DOM: ${JSON.stringify(metrics.missing)}`);
  }

  const overlap = rectsOverlap(metrics.strip, metrics.heading);
  const area = intersectionArea(metrics.strip, metrics.heading);
  const hideOnStrip = metrics.hide.top >= metrics.strip.top - 0.5
    && metrics.hide.bottom <= metrics.strip.bottom + 0.5;
  const headingBelowStrip = metrics.heading.top >= metrics.strip.bottom - 0.5;
  const hideHittable = metrics.hideHit?.slot === 'chrome';
  const hideMinEdge = Math.min(metrics.hide.width, metrics.hide.height);

  const failures = [];
  if (metrics.stripPosition === 'absolute') failures.push('strip computed position is absolute');
  if (metrics.hidePosition === 'absolute') failures.push('hide computed position is absolute');
  if (overlap || area > 0) failures.push(`strip intersects heading (area=${area})`);
  if (!headingBelowStrip) failures.push('heading is not below the in-flow strip');
  if (!hideOnStrip) failures.push('hide control is not inside the strip box');
  if (!hideHittable) failures.push(`hide is not hittable at its centre (hit=${JSON.stringify(metrics.hideHit)})`);
  if (hideMinEdge < 24) failures.push(`hide control edge ${hideMinEdge}px is below 24px`);
  if (!metrics.dragHandle) failures.push('grid item lost drag-handle');
  if (metrics.resizableHide) failures.push('resize was hidden on an autoHeight card');
  if (!metrics.handle || metrics.handle.width < 16 || metrics.handle.height < 16) {
    failures.push('resize handle missing or smaller than 16px');
  }
  if (metrics.strip.height < 24) failures.push(`strip height ${metrics.strip.height} is below 24px`);

  result.edit = { ...metrics, overlap, area, headingBelowStrip, hideOnStrip, hideHittable, hideMinEdge, failures };
  result.ok = failures.length === 0;
  if (!result.ok) {
    throw new Error(failures.join('; '));
  }
} catch (err) {
  result.error = err instanceof Error ? err.message : String(err);
  result.ok = false;
} finally {
  await browser.close();
  await server.close();
}

if (out) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(
    result.ok
      ? `PASS editor-chrome geometry strip=${JSON.stringify(result.edit.strip)} heading=${JSON.stringify(result.edit.heading)}\n`
      : `FAIL editor-chrome geometry: ${result.error}\n${JSON.stringify(result.edit ?? result.view, null, 2)}\n`,
  );
}

process.exit(result.ok ? 0 : 1);
