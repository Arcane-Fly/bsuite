/**
 * DraggableCardPage — declarative wrapper around `PageGridLayout` that gives
 * each child card its own draggable, independently-resizable widget slot.
 *
 * Why this exists
 * ---------------
 * The default way to reach `PageGridLayout` is
 * `widgets={{ content: <Card/><Card/>… }}`, which packs an entire page into
 * ONE widget. The canvas editor then drags the whole page as a single block
 * instead of letting the user rearrange individual cards, and the page's
 * height is capped at that one grid item's pixel height, so long forms render
 * truncated. That is the operator's most-repeated complaint about this estate
 * ("cards move as one block"), and it is a property of how the page calls the
 * grid, not of the grid itself.
 *
 * Why it lives HERE rather than in an app
 * ---------------------------------------
 * It previously existed as three hand-copied forms (crm7, braden, throughput)
 * and was ABSENT from two apps (BSU, conduit). The absence had a cost beyond
 * duplication: BSU's exclusion ledger recorded that its dynamic card lists
 * "cannot be split into static widget keys without a dynamic-widget
 * registration mechanism", which is FALSE — `buildCanvasCardLayout` derives
 * the widget dict from the children at render time, so a `.map()` over a
 * runtime-variable list already produces N independent grid items. crm7 ships
 * exactly that against a Postgres-backed 0..N array. The objection was an
 * artifact of the primitive not being present, not a real constraint.
 * Tracked as crm7#412 / bsuite#1995.
 *
 * Usage
 * -----
 *   <DraggableCardPage pageKey="/people/:id" layoutVersion={3}>
 *     <CanvasCard cardKey="header" h={4}>
 *       <PageHeader heading="Person" />
 *     </CanvasCard>
 *     <CanvasCard cardKey="personalInfo" h={12}>
 *       <Card>…</Card>
 *     </CanvasCard>
 *     {isTraining && (
 *       <CanvasCard cardKey="trainingContract" h={16}>
 *         <Card>…</Card>
 *       </CanvasCard>
 *     )}
 *   </DraggableCardPage>
 *
 * Heights are 32px row units. Falsy children are skipped, so conditional cards
 * collapse cleanly without leaving empty slots. Fragments are flattened.
 *
 * What this component deliberately does NOT do
 * --------------------------------------------
 * - **Permissions.** Gating is an app concern with an app-specific permission
 *   vocabulary. Wrap this component in the app's own gate.
 * - **`compactType`.** It is NOT accepted, on purpose. `usePageGridLayout`
 *   selects `verticalCompactor` unconditionally for BOTH view and edit mode,
 *   and that is load-bearing: the previous edit-mode config
 *   (`preventCollision: true` with `compactType: null`) made react-grid-layout
 *   full-revert any gesture landing on an occupied cell, and `onDragStop` only
 *   emits when the layout changed — so a reverted gesture emitted nothing and
 *   NOTHING COULD EVER SAVE (bsuite#1588). Accepting a `compactType` prop here
 *   would re-open that hole. crm7's local wrapper passed `compactType ?? null`
 *   through a cast to a component that does not read it; the prop was dead,
 *   and dead is the correct state for it.
 */

import { useMemo, type ComponentType, type ReactNode } from 'react';
import { PageGridLayout as DefaultPageGridLayout } from './PageGridLayout.js';
import { buildCanvasCardLayout } from './canvasCardLayout.js';
import { CanvasCard, type CanvasCardProps } from './CanvasCard.js';
import type { LayoutMigration, PageGridLayoutProps } from './types.js';

// Re-exported so a consumer can import both from one module, matching the
// long-standing crm7 import shape used by ~284 call sites.
export { CanvasCard };
export type { CanvasCardProps };

export type DraggableCardPageProps = Omit<
  PageGridLayoutProps,
  'widgets' | 'defaultLayouts'
> & {
  /**
   * App-wide layout epoch, added to this page's `layoutVersion` before it
   * reaches `PageGridLayout`. Defaults to 0.
   *
   * This is the lever for "a DraggableCardPage-level default changed for EVERY
   * page in this app" — bump it once instead of hand-bumping `layoutVersion`
   * at hundreds of call sites, which is guaranteed to miss some. Per-page
   * `layoutVersion` bumps keep working on top of it.
   *
   * It is deliberately a PROP rather than a package constant, because each app
   * has its own history of saved layouts: crm7 is at 101 (E5a autoHeight flip,
   * then the 2026-07-23 card-surfaces sweep), braden and throughput at 100
   * (the D-74 sweep), and a fresh adopter starts at 0. Baking a single number
   * into the package would silently reset or fail to reset saved layouts
   * depending on which app imported it.
   *
   * Distinct from the package-level `PACKAGE_LAYOUT_EPOCH`, which is a
   * one-time reset applied by `usePageGridLayout` to every consumer at once
   * when a package behaviour change poisons stored layouts suite-wide.
   */
  layoutEpoch?: number;
  /**
   * The grid component to render. Defaults to this package's `PageGridLayout`.
   *
   * Apps that wrap `PageGridLayout` in a local adapter (to inject permissions,
   * a preference adapter, tenant scoping or entity-widget factories) pass that
   * adapter here, so they get the shared card algorithm without giving up
   * their adapter. An app with no adapter passes nothing.
   */
  gridComponent?: ComponentType<PageGridLayoutProps>;
  /**
   * Called with the display names of children that occupied no grid slot and
   * were discarded. Defaults to a development-only `console.error`.
   *
   * A dropped child is a defect, not a style note: if it was a dialog, its
   * trigger appears to do nothing — the button renders, the handler runs, and
   * the element it toggles was never mounted.
   */
  onDroppedChildren?: (dropped: string[], pageKey: string) => void;
  /**
   * Width, in grid columns, for cards that do not set `w` themselves.
   *
   * Defaults to `DEFAULT_CANVAS_CARD_WIDTH` (6 — half the grid, two cards per
   * row) as of 2.0.0. Pass 12 to restore the pre-2.0.0 full-width stack while
   * an app migrates its pages.
   */
  defaultCardWidth?: number;
  /**
   * CanvasCard children. Falsy entries are ignored. Fragments are flattened so
   * a conditional multi-card branch still registers each CanvasCard.
   */
  children: ReactNode;
};

/**
 * `process.env.NODE_ENV` rather than `import.meta.env`: every bundler in the
 * estate (Vite, Next, Rollup) statically replaces it, and the `typeof` guard
 * keeps the expression safe in a raw browser ESM context where `process` does
 * not exist. This package must not assume a Vite consumer.
 */
function isDevelopment(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production'
  );
}

function defaultOnDroppedChildren(dropped: string[], pageKey: string): void {
  if (!isDevelopment()) return;
  // console.error, not warn: React uses error for "you have written something
  // that will not work", and this is that.
  //
  // Deliberately NOT a thrown error. Hundreds of pages use this component and
  // a throw would turn a missing dialog into a blank page for a shape that has
  // been shipping for months — trading a partial page for no page at all is
  // not an improvement for the user in front of it.
  console.error(
    `[DraggableCardPage] ${dropped.length} child(ren) of "${pageKey}" were DISCARDED and will not render: ${dropped.join(', ')}. ` +
      `Only <CanvasCard> children (optionally inside a Fragment) occupy a grid slot — everything else is dropped. ` +
      `If this is a dialog or a modal, its trigger will appear to do nothing: the button renders, the handler runs, and the element it toggles was never mounted. ` +
      `Wrap it in <CanvasCard cardKey="…"> or move it outside <DraggableCardPage>.`,
  );
}

export function DraggableCardPage({
  layoutEpoch = 0,
  gridComponent,
  onDroppedChildren,
  children,
  ...pageProps
}: DraggableCardPageProps) {
  const { widgets, layouts, dropped } = useMemo(
    () => buildCanvasCardLayout(children),
    [children],
  );

  if (dropped.length > 0) {
    (onDroppedChildren ?? defaultOnDroppedChildren)(dropped, pageProps.pageKey);
  }

  // Ensure a sensible default 12-column grid when the consumer does not
  // override. Without this, PageGridLayout's fallback collapses to cols=1 at
  // every breakpoint and the page renders as a single vertical column with no
  // horizontal canvas area — the user-reported "drag cards into these white
  // spaces" surface had no white spaces because the grid was 1 column wide.
  const defaultCols = pageProps.defaultCols ?? 12;
  const Grid = gridComponent ?? DefaultPageGridLayout;

  /*
   * `layoutMigrations` keys live in the same version space as `layoutVersion`,
   * so they cross the epoch boundary with it. A page writes the number it
   * bumped — `layoutVersion={2}` with `{ 2: … }` — and never has to know this
   * app's epoch, or the package's.
   *
   * Getting this wrong fails SILENTLY and in the worst direction: an unshifted
   * key simply never matches the step being migrated, the version gate finds
   * nothing registered, and it falls back to the wholesale discard the
   * migration existed to prevent. Pinned by
   * `DraggableCardPage.layoutMigrations.test.tsx`.
   *
   * Memoised because the shifted map is an effect dependency inside
   * `usePageGridLayout`; a fresh object per render would re-run an effect that
   * writes state.
   */
  const layoutMigrations = useMemo(() => {
    const declared = pageProps.layoutMigrations;
    if (!declared || layoutEpoch === 0) return declared;
    const shifted: Record<number, LayoutMigration> = {};
    for (const [version, migration] of Object.entries(declared)) {
      shifted[Number(version) + layoutEpoch] = migration;
    }
    return shifted;
  }, [pageProps.layoutMigrations, layoutEpoch]);

  return (
    <Grid
      {...pageProps}
      layoutVersion={(pageProps.layoutVersion ?? 1) + layoutEpoch}
      // AFTER the spread, deliberately — `pageProps` still carries the
      // consumer's unshifted map, and letting the spread lay it back over this
      // would look wired and silently discard instead of migrate.
      layoutMigrations={layoutMigrations}
      defaultCols={defaultCols}
      widgets={widgets}
      defaultLayouts={layouts}
    />
  );
}
DraggableCardPage.displayName = 'DraggableCardPage';
