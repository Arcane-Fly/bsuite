/**
 * PNG export for the Schema Builder canvas.
 *
 * Reference: `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`
 * §3.6 item 8.
 *
 * Uses `html-to-image` against a DOM element (typically the React Flow
 * `.react-flow` wrapper) to produce a high-DPI PNG data URL, then triggers a
 * browser download via an invisible anchor element.
 *
 * The `filter` callback strips the minimap, controls, and floating toolbar
 * overlays so the exported image shows only the pure schema diagram (matching
 * user expectation from Figma / dbdiagram).
 */

import { toPng } from 'html-to-image';

/**
 * Default filename derived from the current timestamp. Colons/dots are
 * replaced so the filename is valid on Windows filesystems.
 */
export function defaultPngFilename(): string {
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace(/Z$/, '');
  return `schema-${ts}.png`;
}

const OVERLAY_CLASSES = [
  'react-flow__minimap',
  'react-flow__controls',
  'react-flow__panel',
];

function isOverlayNode(node: HTMLElement): boolean {
  if (!node.classList) return false;
  for (const cls of OVERLAY_CLASSES) {
    if (node.classList.contains(cls)) return true;
  }
  return false;
}

/**
 * Render the given element to a PNG and trigger a download.
 *
 * @param element - DOM element to snapshot (typically `.react-flow` wrapper).
 * @param filename - Optional filename. Defaults to `schema-<ISO-timestamp>.png`.
 * @returns a promise that resolves once the download has been initiated, or
 *   rejects if the snapshot fails. Callers should surface rejection to a toast.
 */
export async function exportCanvasToPng(
  element: HTMLElement,
  filename: string = defaultPngFilename(),
): Promise<void> {
  // Read the plate colour off the live element rather than pinning one. It was
  // oklch(1 0 0) — pure white, which the ban covers here too: a generated PNG
  // is a surface like any other. It also meant exporting a dark-mode diagram
  // stamped it onto a white plate, so the export did not match the screen.
  // No literal fallback: if the token is somehow absent the option is omitted
  // and the PNG is transparent, which is recoverable. A wrong opaque plate is
  // baked in and is not.
  const plate = getComputedStyle(element).getPropertyValue('--role-bg-panel').trim();

  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: plate || undefined,
    cacheBust: true,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !isOverlayNode(node);
    },
  });

  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  // Append → click → remove for Safari + strict test runners (jsdom) where
  // an un-mounted anchor may silently fail to dispatch the download.
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
