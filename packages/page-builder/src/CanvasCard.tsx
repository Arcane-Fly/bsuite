import type { ReactNode } from 'react';

export interface CanvasCardProps {
  /** Stable widget key used by PageGridLayout for layout persistence. Required. */
  cardKey: string;
  /**
   * Grid width in columns on the 12-column grid.
   *
   * Defaults to **6** — half the grid, two cards per row. It defaulted to 12
   * up to 1.0.7, which meant every card that omitted `w` rendered full width
   * and stacked; 1,068 of 1,729 usages across the estate omit it. Say `w={12}`
   * when a card genuinely wants the full row.
   */
  w?: 2 | 3 | 4 | 6 | 8 | 12;
  /** Minimum width in columns when the user resizes. Defaults to 4. */
  minW?: 2 | 3 | 4 | 6 | 8 | 12;
  /** Default grid height in 32px row units (seed before first measurement). Defaults to 6. */
  h?: number;
  /** Minimum height in row units when the user resizes. Defaults to 2. */
  minH?: number;
  /**
   * When true, this card's height tracks its measured content height instead
   * of a fixed manual size. `h` is only the seed row count used before the
   * first ResizeObserver measurement lands. Threaded through to the underlying
   * {@link GridLayoutItem.autoHeight} by `DraggableCardPage`.
   *
   * Defaults to TRUE. Cards grow to fit their content so forms and sections
   * never render clipped.
   *
   * `autoHeight={false}` is RESERVED FOR VIRTUALIZED / WINDOWED LISTS ONLY
   * (operator card-surfaces doctrine, 2026-07-23): a card whose body renders a
   * windowed list that owns its own internal scroll and must NOT balloon to
   * the full row count. An ordinary data table must NOT opt out — the doctrine
   * is expand-by-default so every row is visible without an internal
   * scrollbar. A blanket opt-out across ~120 crm7 pages was the 192px clip bug
   * and was swept. Do not reintroduce it on a plain card or table.
   */
  autoHeight?: boolean;
  /**
   * Whether the GRID ITEM paints a card around this slot — border, radius,
   * background, shadow. Threaded through to {@link GridLayoutItem.chrome} by
   * `buildCanvasCardLayout`, and per-item always beats the page-level
   * `itemChrome` prop in either direction.
   *
   * Leave it undefined and the app's `itemChrome` decides. Say `chrome={false}`
   * on a slot whose content is NOT a card — a marketing section, a page
   * heading, a chart that supplies its own surface — in an app that has set
   * `itemChrome` true; say `chrome` on a BARE slot in an app that has not.
   *
   * WHY IT EXISTS AT ALL (2.1.0). 2.0.0 inverted the grid-item chrome default
   * and offered `GridLayoutItem.chrome` as the per-slot escape hatch. That
   * hatch was real for the handful of pages that hand-author a layout array,
   * and UNREACHABLE for the ~1,700 CanvasCard usages that are how BSuite pages
   * are actually written: `CanvasCardProps` did not declare the prop and
   * `buildCanvasCardLayout` destructured a fixed set of fields, so a `chrome`
   * written on a CanvasCard was dropped before it could reach a layout item.
   * crm7's 2.0.0 adoption shipped a comment promising the opt-out and zero
   * call sites able to use it. Declaring it here is what makes the promise
   * true.
   *
   * Unlike `autoHeight`, this is not a hint the grid may override: a slot that
   * says false is never framed. It also survives a drag — see the `chrome`
   * restore in `stripAutoHeightRows`, which exists because react-grid-layout
   * does not round-trip custom item props.
   */
  chrome?: boolean;
  /** Card body — typically a single card or page-header element. */
  children: ReactNode;
}

/**
 * CanvasCard — marker component consumed by `DraggableCardPage`.
 *
 * It renders `null` by design: `DraggableCardPage` reads its props off the JSX
 * tree rather than rendering it, so accidental flat usage outside a
 * `DraggableCardPage` is harmless rather than broken.
 *
 * Kept in its own module so a consumer can import the marker without pulling
 * in `DraggableCardPage`'s transitive dependency on `react-grid-layout`. The
 * `displayName` check inside `DraggableCardPage` compares against the literal
 * string `'CanvasCard'`, so it keeps working across module boundaries, bundler
 * chunk splits and duplicated package instances — an `instanceof`/identity
 * check would not.
 */
export function CanvasCard(_props: CanvasCardProps): null {
  return null;
}
CanvasCard.displayName = 'CanvasCard';
