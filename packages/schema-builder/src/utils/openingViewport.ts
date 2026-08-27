/**
 * WHERE THE CANVAS OPENS, when everything cannot fit at a legible zoom.
 *
 * THE MEASUREMENT. crm.crm7.app/settings/schema-builder, 2026-08-27, signed in,
 * 1440x900 viewport: `.react-flow` is 1184x836 (the zero-height regression is
 * gone), 44 entity cards are laid out 4 wide by 11 deep, and the opening
 * viewport is `matrix(0.75, 0, 0, 0.75, -42.125, -520.625)`. Eight of the 44
 * cards are on screen, every one of them sliced by the top or bottom edge of
 * the frame. That is what "Schema builder makes no sense, I have no idea how to
 * use it" looks like: a first-time user lands on severed rectangles in the
 * middle of nowhere, with no edge, no corner, and no origin to read the diagram
 * from.
 *
 * WHY IT HAPPENS, read from the installed @xyflow/system 0.0.77 rather than
 * inferred. `getViewportForBounds` (dist/esm/index.js:740) computes
 *
 *     zoom = clamp(min((w - padX) / bounds.width, (h - padY) / bounds.height),
 *                  minZoom, maxZoom)
 *     x    = w / 2 - boundsCenterX * zoom
 *     y    = h / 2 - boundsCenterY * zoom
 *
 * and then applies an offset whose every term is `Math.min(..., 0)` — it can
 * only ever pull the view back INSIDE a padding it has overshot, never push it
 * out. So when `zoom` is clamped by `minZoom` the content is larger than the
 * frame, the overshoot is symmetric, the two offsets cancel, and the result is
 * a dead-centre crop. Centring is correct when the content fits. It is the
 * worst available choice when it does not, because it guarantees clipping on
 * all four sides and hides the one landmark — the top-left corner — that tells
 * a reader where the diagram begins.
 *
 * WHAT THIS CHANGES, AND WHAT IT DELIBERATELY DOES NOT. The zoom floor stays
 * exactly as it was and for exactly the reason recorded on `fitViewOptions` in
 * SchemaCanvas: at 44 entities an unclamped fit renders field text at 4.5-7
 * device pixels, and showing everything illegibly is not better than showing
 * some of it legibly. That ruling is about ZOOM. Nothing ever ruled on the
 * ANCHOR — centring is simply React Flow's default, inherited rather than
 * chosen. So: same zoom, different anchor.
 *
 * PER AXIS, not per viewport. An axis whose content fits is still centred,
 * because centring genuinely is the nicest framing when there is room. Only an
 * axis that overflows is anchored to the content's leading edge, one padding in
 * from the frame. A 4-column grid that is 11 rows deep therefore opens centred
 * horizontally and anchored to the first row vertically — whole cards along the
 * top, the overflow honestly below the fold where the minimap and the scroll
 * both already say it is.
 *
 * Pure, zero React dependencies, so the arithmetic is testable without a
 * browser — which matters here, because jsdom cannot lay out a React Flow
 * canvas and a DOM-level test of this would measure nothing.
 */

/** A rectangle in flow coordinates. */
export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A React Flow viewport transform: translate then scale. */
export interface OpeningViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface OpeningViewportOptions {
  /**
   * Same units as React Flow's `fitViewOptions.padding`: a fraction, resolved
   * against each axis the way the library resolves it (see `parsePadding`).
   */
  padding?: number;
  /** Legibility floor. Matches `fitViewOptions.minZoom`. */
  minZoom?: number;
  /** Matches `fitViewOptions.maxZoom`. */
  maxZoom?: number;
}

/**
 * `parsePadding` from @xyflow/system 0.0.77, for a numeric padding. Reproduced
 * rather than imported because it is not exported, and approximating it would
 * make this function and the library disagree about zoom — which is the one
 * thing they must agree about.
 */
function paddingPx(padding: number, extent: number): number {
  return Math.floor((extent - extent / (1 + padding)) * 0.5);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The viewport the canvas should open at.
 *
 * @param bounds    Bounding box of every node, in flow coordinates.
 * @param container Size of the canvas element, in CSS pixels.
 * @returns `null` when there is nothing to frame or nothing to frame it in —
 *   callers should leave the library's own viewport alone in that case rather
 *   than inventing one.
 */
export function computeOpeningViewport(
  bounds: ViewportBounds,
  container: { width: number; height: number },
  options: OpeningViewportOptions = {},
): OpeningViewport | null {
  const { padding = 0.2, minZoom = 0.75, maxZoom = 1.2 } = options;

  if (
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    container.width <= 0 ||
    container.height <= 0
  ) {
    return null;
  }

  const padX = paddingPx(padding, container.width);
  const padY = paddingPx(padding, container.height);

  // Identical to getViewportForBounds: the zoom is not what we are changing.
  const zoom = clamp(
    Math.min(
      (container.width - padX * 2) / bounds.width,
      (container.height - padY * 2) / bounds.height,
    ),
    minZoom,
    maxZoom,
  );

  const scaledWidth = bounds.width * zoom;
  const scaledHeight = bounds.height * zoom;

  // An axis with room to spare is centred, exactly as the library would do it.
  // An axis that overflows is anchored to the content's leading edge, one
  // padding in — so the first row and first column render whole.
  const x =
    scaledWidth <= container.width - padX * 2
      ? container.width / 2 - (bounds.x + bounds.width / 2) * zoom
      : padX - bounds.x * zoom;

  const y =
    scaledHeight <= container.height - padY * 2
      ? container.height / 2 - (bounds.y + bounds.height / 2) * zoom
      : padY - bounds.y * zoom;

  return { x, y, zoom };
}

/**
 * Bounding box of a set of nodes, in flow coordinates.
 *
 * React Flow reports a node's rendered size on `measured` once it has been laid
 * out, and `width`/`height` before that. A node with neither is skipped rather
 * than counted as a zero-size point: a point at the origin would drag the
 * bounding box out to meet it and frame a diagram that is mostly empty canvas.
 */
export function boundsOfNodes(
  nodes: {
    position: { x: number; y: number };
    measured?: { width?: number | null; height?: number | null };
    width?: number | null;
    height?: number | null;
  }[],
): ViewportBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let counted = 0;

  for (const node of nodes) {
    const w = node.measured?.width ?? node.width;
    const h = node.measured?.height ?? node.height;
    if (!w || !h) continue;
    counted += 1;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }

  if (counted === 0) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
