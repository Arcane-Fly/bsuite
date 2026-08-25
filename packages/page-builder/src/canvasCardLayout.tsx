/**
 * The CanvasCard → grid-layout algorithm, extracted from the component so it
 * can be unit-tested and reused without rendering anything.
 *
 * This is the half of `DraggableCardPage` that was copied verbatim into three
 * apps (crm7, braden, throughput) and was absent from two more (BSU, conduit).
 * It has no app dependencies, no permission model and no adapter — those are
 * the parts that legitimately differ per app and stay there.
 */

import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CanvasCardProps } from './CanvasCard.js';
import type { GridLayouts } from './types.js';

/** The 12-column grid every BSuite page canvas is laid out against. */
export const CANVAS_GRID_COLUMNS = 12;

/**
 * The width a `CanvasCard` gets when its author does not say.
 *
 * SIX, i.e. half the grid — changed from twelve in 2.0.0. Twelve on a
 * twelve-column grid means every card that omits `w` renders full width and
 * the page becomes a single vertical stack. Measured across the estate on
 * 2026-08-25: **1,068 of 1,729 CanvasCard usages omit `w`** (BSU and conduit
 * omit it 100% of the time), so 62% of every card surface in BSuite was
 * stacked by a DEFAULT, not by a layout decision. That is the operator's
 * long-standing "the cards don't use the available space" report, and it is
 * one number in one file rather than 1,068 page edits.
 *
 * Six rather than four: at a 1680px container half the grid is still ~820px,
 * which comfortably holds a data table. Four would have traded a stacking
 * complaint for a cramping one.
 *
 * A page that genuinely wants a full-width card still says `w={12}` — an
 * explicit width always wins, and 661 usages already do exactly that.
 */
export const DEFAULT_CANVAS_CARD_WIDTH = 6;

export function isCanvasCardElement(
  node: ReactNode,
): node is ReactElement<CanvasCardProps> {
  return (
    isValidElement(node) &&
    (node.type as { displayName?: string }).displayName === 'CanvasCard'
  );
}

function isFragmentElement(
  node: ReactNode,
): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement(node) && node.type === Fragment;
}

/**
 * Best-effort display name for a node that is about to be discarded.
 * "Something was dropped" is not actionable across hundreds of pages; the
 * component's own name is what makes it findable.
 */
export function describeNode(node: ReactNode): string {
  if (!isValidElement(node))
    return typeof node === 'string'
      ? `text ${JSON.stringify(node)}`
      : String(node);
  const t = node.type as string | { displayName?: string; name?: string };
  if (typeof t === 'string') return `<${t}>`;
  return `<${t?.displayName ?? t?.name ?? 'Unknown'}>`;
}

/**
 * Depth-first flatten: CanvasCards kept, Fragments expanded, everything else
 * dropped — and RECORDED rather than vanishing.
 *
 * The dropping itself is correct and deliberate: this maps children onto grid
 * slots, and a node with no `cardKey` has no slot to occupy. What was wrong is
 * that it happened in total silence, so a page could render with a confirm
 * dialog missing and look completely fine — the button appears, the click
 * handler runs, state flips, and the element it toggles was never mounted.
 *
 * Fragments must be expanded explicitly because `Children.forEach` is shallow:
 * it sees one Fragment node, not the CanvasCards inside it. A Fragment-wrapped
 * conditional branch used to drop every nested card silently (the crm7 burn-7
 * CI class, `leave/[id]`).
 */
export function flattenCanvasCards(nodes: ReactNode): {
  cards: ReactElement<CanvasCardProps>[];
  dropped: string[];
} {
  const cards: ReactElement<CanvasCardProps>[] = [];
  const dropped: string[] = [];
  Children.forEach(nodes, (child) => {
    // Falsy entries are the documented conditional shape — `{cond && <CanvasCard/>}`
    // collapses to `false`, which is intentional and must stay silent.
    if (child == null || child === false || child === true || child === '')
      return;
    if (isCanvasCardElement(child)) {
      cards.push(child);
      return;
    }
    if (isFragmentElement(child)) {
      const inner = flattenCanvasCards(child.props.children);
      cards.push(...inner.cards);
      dropped.push(...inner.dropped);
      return;
    }
    dropped.push(describeNode(child));
  });
  return { cards, dropped };
}

export function clampColumns(value: number, min = 1, max = CANVAS_GRID_COLUMNS) {
  return Math.min(Math.max(value, min), max);
}

export interface CanvasCardLayoutResult {
  /** Widget dict keyed by `cardKey`, ready for `PageGridLayout.widgets`. */
  widgets: Record<string, ReactNode>;
  /** `lg` breakpoint layout, ready for `PageGridLayout.defaultLayouts`. */
  layouts: GridLayouts;
  /** Display names of children that occupied no grid slot and were discarded. */
  dropped: string[];
}

/**
 * Build the `widgets` dict and `defaultLayouts.lg` array from CanvasCard
 * children.
 *
 * Cards flow left-to-right and wrap to a new row when the next card would
 * overflow the 12-column grid. Because the dict is built FROM THE CHILDREN AT
 * RENDER TIME, a `.map()` producing N cards is fully supported and needs no
 * registration mechanism — each mapped card becomes its own independent grid
 * item. (This is the fact that disproves the "dynamic card lists cannot be
 * split into static widget keys" objection recorded in several app ledgers.)
 */
export function buildCanvasCardLayout(
  children: ReactNode,
  options: { defaultWidth?: number } = {},
): CanvasCardLayoutResult {
  const defaultWidth = clampColumns(options.defaultWidth ?? DEFAULT_CANVAS_CARD_WIDTH);
  const widgets: Record<string, ReactNode> = {};
  const lg: GridLayouts['lg'] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const { cards, dropped } = flattenCanvasCards(children);
  for (const child of cards) {
    // autoHeight defaults to TRUE — cards track measured content height unless
    // a card explicitly opts out for a virtualized list. See CanvasCardProps.
    const {
      cardKey,
      h = 6,
      minH = 2,
      minW = 4,
      autoHeight = true,
      children: body,
    } = child.props;
    const normalizedMinW = clampColumns(minW);
    const width = clampColumns(child.props.w ?? defaultWidth, normalizedMinW);
    if (x + width > CANVAS_GRID_COLUMNS) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    widgets[cardKey] = (
      <div className="relative h-full group/canvas-card">{body}</div>
    );
    lg.push({
      i: cardKey,
      x,
      y,
      w: width,
      h,
      minW: normalizedMinW,
      minH,
      ...(autoHeight ? { autoHeight: true } : {}),
    });
    x += width;
    rowHeight = Math.max(rowHeight, h);
  }
  return { widgets, layouts: { lg } satisfies GridLayouts, dropped };
}
