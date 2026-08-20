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
 *
 * THE MARGIN IS *BETWEEN* ROWS, NOT INSIDE EVERY ROW. This is the correction
 * that this file existed for a month without.
 *
 * react-grid-layout allocates an item of `n` rows exactly:
 *
 *     px(n) = n * rowHeight + (n - 1) * marginY
 *
 * so `n` rows are worth `n * (rowHeight + marginY) - marginY` pixels — one
 * margin LESS than the row unit suggests. Dividing the needed height by the
 * bare row unit therefore credits every item with `marginY` pixels it does
 * not get, and `Math.ceil` cannot rescue that: the shortfall is inside the
 * rounding, not beyond it.
 *
 * Inverting the real formula for the smallest `n` that fits:
 *
 *     n * rowHeight + (n - 1) * marginY  >=  needed
 *     n                                  >= (needed + marginY) / (rowHeight + marginY)
 *
 * MEASURED ON PRODUCTION, 2026-08-20, crm7 /clients/create at 1366x768. The
 * card holding the form's Create/Cancel row measured 32px tall around a 36px
 * button, with `overflow-hidden`, so the button was cut off and a neighbouring
 * card's helper text was painted over what remained — `elementFromPoint` at the
 * button's centre returned a `<p>`, not the button. The form could not be
 * submitted by a person. rowHeight 32 + marginY 6: 36px of content came to
 * `ceil((36 + 2) / 38) = 1` row, and one row is 32 pixels.
 *
 * The old form clips whenever the needed height lands 1..marginY pixels above a
 * row boundary — 6 of every 38 possible heights, about one card in six.
 *
 * It survived because the tests asserted the ARITHMETIC rather than the
 * OUTCOME: they checked the division, never whether the resulting row count
 * buys enough pixels. Three of them encoded a clipping case as the expected
 * answer. They now assert against react-grid-layout's own formula instead.
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
  // `+ marginYPx` inverts px(n) = n*rowHeight + (n-1)*marginY. Without it every
  // item is credited with one margin it never receives. See the docblock.
  const raw = Math.ceil((contentPx + cardChromePx + marginYPx) / rowUnitPx);
  return Math.max(minRows, raw);
}
