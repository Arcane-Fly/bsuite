export interface ComputeAutoHeightRowsOptions {
  /**
   * Measured intrinsic content height in pixels. Callers MUST measure an
   * UNCONSTRAINED wrapper around the card content (see `GridItem`'s
   * ResizeObserver in `PageGridLayout.tsx`) — `overflow: hidden` on an
   * ancestor clips *painting* only, it does not shrink a descendant's own
   * computed box height, so an unconstrained wrapper reports the content's
   * true size regardless of the grid item's current allocated pixel height.
   * That property is what makes this function converge to a fixed point
   * (see the "idempotent" test below) instead of oscillating: the same
   * content always measures the same, no matter how many rows the item
   * currently occupies.
   */
  contentPx: number;
  /**
   * Fixed non-content chrome (e.g. the card's top+bottom border added by
   * the unconditional `border border-border` — blueprint item 1) added
   * before converting to rows, so rounding/border pixels never clip
   * content by a sub-row amount.
   */
  cardChromePx: number;
  /**
   * Must match the `rowHeight` passed to `<Responsive>`. Single source of
   * truth: `DEFAULT_ROW_HEIGHT` in `PageGridLayout.tsx`.
   */
  rowHeightPx: number;
  /**
   * Must match the vertical component of the `margin` tuple passed to
   * `<Responsive>`. Single source of truth: `DEFAULT_MARGIN` in
   * `PageGridLayout.tsx`.
   */
  marginYPx: number;
  /**
   * Row-count floor. Defaults to 1 — a widget can never auto-collapse to 0
   * rows even if content momentarily measures 0px (e.g. before first paint).
   */
  minRows?: number;
}

/**
 * Pure px→row conversion for auto-height grid items (blueprint amendment
 * A1). Deliberately uses `Math.ceil`, NOT react-grid-layout's own internal
 * `Math.round` convention (see `calcWH` in react-grid-layout's compiled
 * source) — rounding down would silently clip content roughly half the
 * time. Ceiling always over-allocates rather than under-allocates, trading
 * a few pixels of empty card padding for a guarantee that content is never
 * cut off.
 */
export function computeAutoHeightRows({
  contentPx,
  cardChromePx,
  rowHeightPx,
  marginYPx,
  minRows = 1,
}: ComputeAutoHeightRowsOptions): number {
  const rowUnitPx = rowHeightPx + marginYPx;
  if (rowUnitPx <= 0) return minRows;
  const raw = Math.ceil((contentPx + cardChromePx) / rowUnitPx);
  return Math.max(minRows, raw);
}
