import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Eye, EyeOff, Layers, LayoutGrid, Lock, Plus, RotateCcw, Save, Settings2, Unlock } from 'lucide-react';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Responsive, type EventCallback, type ResizeHandleAxis } from 'react-grid-layout';
import { gridBounds, minMaxSize, minSize } from 'react-grid-layout/core';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { computeAutoHeightRows } from './autoHeight.js';
import { defaultPreferenceAdapter } from './preferences.js';
import { isRelationshipWritable } from './relationshipCatalog.js';
import { usePageGridLayout } from './usePageGridLayout.js';
import { cn } from './utils.js';
import type { GridLayouts, PageGridLayoutProps, RelationshipWidgetDetail } from './types.js';

/**
 * Single source of truth for the grid's pixel geometry — read by both the
 * `<Responsive>` props below AND `GridItem`'s auto-height measurement
 * (blueprint amendment A1). Previously these were separate inline literals
 * (`rowHeight={32}`, `margin={[6, 6]}`) with no shared reference, which is
 * exactly the kind of drift the auto-height px→row conversion cannot
 * tolerate — `computeAutoHeightRows` must use the *same* rowHeight/margin
 * the grid itself renders with, or the computed row count would target the
 * wrong pixel size.
 */
const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_MARGIN: [number, number] = [6, 6];
/**
 * Fixed non-content chrome added before converting measured content px to
 * rows — currently just the unconditional `border border-border` (1px top
 * + 1px bottom) added to every card surface (blueprint item 1).
 */
const DEFAULT_CARD_CHROME_PX = 2;

/**
 * Default resize bounds applied as a *global* constraint to ALL grid items.
 *
 * History
 * -------
 * - 0.2.x: maxH=16 (≈512px) — clipped data tables.
 * - 0.3.0: bumped to maxH=48 (≈1536px) — still a hard ceiling. Operators
 *   reported "the handle hits a wall before all my data fits" on tall
 *   data-table cards even after the bump.
 * - 0.4.0 (this version): **removed the global maxW and maxH ceilings
 *   entirely.** Width is bounded by `gridBounds` (the active column count)
 *   so no separate global `maxSize(...)` is needed; per-item
 *   `LayoutItem.maxW` / `maxH` is honoured via `minMaxSize`. Combined
 *   with the new internal scroll wrapper around `{content}` (see GridItem
 *   render below), cards now grow to their bounds and content scrolls
 *   inside. Per-item `maxH` on `LayoutItem` remains the right knob for
 *   "this widget shouldn't grow past N rows".
 */
const DEFAULT_RESIZE_BOUNDS = { minW: 2, minH: 1 } as const;
const DEFAULT_RESIZE_HANDLES: readonly ResizeHandleAxis[] = ['se'];
const DEFAULT_ADD_ENTITY_WIDGET_EVENT_NAMES = ['bsu-add-entity-widget', 'crm7-add-entity-widget'] as const;
/**
 * Second widget kind (W4-1) — a relationship field, distinct from the
 * entity-list events above. Named analogously so a consumer wiring both
 * kinds recognises the pattern immediately.
 */
const DEFAULT_ADD_RELATIONSHIP_WIDGET_EVENT_NAMES = [
  'bsu-add-relationship-widget',
  'crm7-add-relationship-widget',
] as const;

/**
 * Custom resize handle for react-grid-layout v2.
 *
 * Why this exists (resize bug fix, 2026-05-12)
 * --------------------------------------------
 * react-grid-layout v2 dropped the auto-rendered `.react-resizable-handle`
 * element that v1 appended to every resizable item. With v2, items still
 * get the `react-resizable` CSS class (so the existing override CSS targets
 * the right element) but no handle DOM is created unless the consumer
 * supplies `resizeConfig.handleComponent`.
 *
 * Symptom: operator reported "I can drag but I can't make the cards bigger"
 * across 5+ apps and 50+ flagged occurrences. Live DOM inspection on
 * crm.crm7.app/reports confirmed `react-grid-item` had `.react-resizable`
 * class but 0 `.react-resizable-handle` children — handles literally
 * weren't in the DOM, so the carefully-tuned override CSS in
 * `react-grid-layout-overrides.css` had nothing to style.
 *
 * Fix: provide a `forwardRef` handle component that renders a span with
 * the exact class names the override CSS targets (`react-resizable-handle`
 * + `react-resizable-handle-<axis>`). data-no-drag prevents the parent
 * drag handler from intercepting pointer-down on the handle.
 */
const RGLResizeHandle = React.forwardRef<HTMLSpanElement, { axis?: ResizeHandleAxis } & React.HTMLAttributes<HTMLSpanElement>>(
  function RGLResizeHandle({ axis = 'se', className: injectedClassName, ...rest }, ref) {
    return (
      <span
        ref={ref}
        data-no-drag
        className={`react-resizable-handle react-resizable-handle-${axis}${injectedClassName ? ' ' + injectedClassName : ''}`}
        {...rest}
      />
    );
  },
);

type GridItemProps = {
  id: string;
  content: React.ReactNode;
  isEditing: boolean;
  label: string;
  onHide: (id: string) => void;
  /**
   * When true, this item's height tracks its own measured content height
   * (blueprint amendment A1) instead of being manually resizable. See the
   * ResizeObserver effect below and `computeAutoHeightRows`.
   */
  autoHeight?: boolean;
  /** Called with the newly-computed row count whenever the measured content
   * height changes. Only invoked when `autoHeight` is true. */
  onAutoHeightChange?: (id: string, rows: number) => void;
  /**
   * Injected children — react-grid-layout v2 + react-resizable wrap each item
   * with `cloneElement(child, { children: [origChildren, ...resizeHandles] })`.
   * For the cloned `children` to actually mount in the DOM, our component
   * MUST render `{children}` somewhere. Without this, the handle silently
   * drops — bottom-right resize is invisible. Place this at the OUTER level
   * (sibling of the inner wrapper) so the .react-resizable-handle CSS
   * positioning targets `.react-grid-item` correctly.
   * Resize-bug fix, 2026-05-12 (operator-flagged 50+ times).
   */
  children?: React.ReactNode;
  /**
   * Paint this grid item as a card — border, radius, background, shadow.
   *
   * DEFAULT FALSE, and that is an inversion of the behaviour shipped up to
   * 1.0.7. Every grid item used to paint card chrome unconditionally, and
   * 332 files across six apps render their OWN card inside it: 28px inside
   * 24px, two 1px borders, a fat bottom edge. Nesting was the norm at 90%,
   * so the grid item was the wrong side of the argument.
   *
   * The slot keeps its LAYOUT either way — `h-full w-full flex flex-col` and
   * the internal scroll container are unchanged. Only the painted surface is
   * conditional, so turning chrome off cannot move anything.
   */
  chrome?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'content'>;

/* A ZERO MEASUREMENT IS DISCARDED SILENTLY, AND THAT IS HOW A CARD GOES INVISIBLE.
 *
 * `reportRows` is guarded by `contentPx > 0` — correctly, because a zero reading
 * during mount would converge the card to nothing. But a card whose content
 * genuinely measures zero then keeps whatever row count it had, inside a wrapper
 * that is `overflow-hidden`. The card renders. The content does not. Nothing
 * fails, and nothing says so.
 *
 * The reachable cause is a percentage height. The measuring div is deliberately
 * UNCONSTRAINED so the observer reads intrinsic height rather than the clipped
 * flex box — that is the whole reason it exists. An unconstrained parent has
 * `height: auto`, and a child asking for `height: 100%` against `auto` resolves
 * to auto, i.e. its own content height. A chart, a canvas or a map that sizes
 * itself from its parent therefore collapses to nothing, and the taller the
 * intended element the more invisible it is. The same CSS rule produced a
 * 1184x0 schema-builder canvas in production with 45 laid-out nodes inside it.
 *
 * This does NOT change layout. Constraining the wrapper would break the
 * measurement it exists to take, and changing the autoHeight default is how
 * page-builder 2.0.0 discarded every saved layout across 1,729 cards. It makes
 * the silent case audible in development and leaves production untouched, which
 * is the same trade @bsuite/theme 1.3.0 made for its missing-provider warning.
 */
let warnedAboutCollapsedContent = false;
function warnOnceAboutCollapsedContent(el: HTMLElement): void {
  if (warnedAboutCollapsedContent) return;
  /* THE SIGNATURE, not merely "height is zero".
   *
   * Requiring childElementCount > 0 is not enough, and jsdom is why: it has no
   * layout engine, so getBoundingClientRect().height is 0 for EVERY element in
   * every test. A warning keyed on that fires on every mounted card in the suite
   * and means nothing — the recorded lesson is that jsdom cannot model the bug
   * this exists to catch, so the check must not pretend it can.
   *
   * The real defect has a distinctive shape, measured in production: laid-out
   * content inside a zero-height box — scrollHeight 1938 against clientHeight 0.
   * Requiring scrollHeight > 0 selects exactly that, and jsdom reports 0 for
   * both, so it stays silent there rather than crying wolf. */
  if (el.scrollHeight <= 0) return;
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;
  if (!isDev) return;
  warnedAboutCollapsedContent = true;
  console.error(
    '[@bsuite/page-builder] An autoHeight card measured 0px with content inside it, '
      + 'so its height was left unchanged and the content is clipped by overflow-hidden — '
      + 'the card looks empty rather than broken. The usual cause is a child sized with '
      + 'height:100% (a chart, canvas or map): the measuring wrapper is intentionally '
      + 'unconstrained so the observer can read intrinsic height, and a percentage height '
      + 'against an auto-height parent resolves to auto. Give the child an intrinsic height '
      + '(an aspect ratio, a px/rem height, or min-height), or pass autoHeight={false} on '
      + 'this card so it renders into the constrained scrollable wrapper instead.',
  );
}

const GridItem = React.memo(React.forwardRef<HTMLDivElement, GridItemProps>(function GridItem({
  id,
  content,
  isEditing,
  label,
  onHide,
  autoHeight,
  onAutoHeightChange,
  chrome = false,
  children: injectedChildren,
  className: injectedClassName,
  style: injectedStyle,
  ...rest
}, ref) {
    // Auto-height measurement (blueprint amendment A1). `measureRef` wraps
    // `content` with NO height constraint of its own — its parent has
    // `overflow-hidden` + `flex-1 min-h-0` (clips *painting* to the current
    // grid cell height, per MDN's overflow semantics), but that never
    // shrinks this child's own computed box height. So
    // `entry.contentRect.height` here is always the content's true
    // intrinsic size, independent of however many rows the item currently
    // occupies — the property that makes the auto-height loop converge to
    // a fixed point instead of oscillating (see autoHeight.ts).
    const measureRef = useRef<HTMLDivElement | null>(null);
    const lastReportedRowsRef = useRef<number | null>(null);
    const measureRafRef = useRef<number | null>(null);
    /**
     * Latest measured content height, updated on EVERY ResizeObserver entry.
     *
     * D-76 root cause ("cards render half cut off on page open"). The previous
     * implementation captured `contentPx` in the rAF closure and then bailed
     * out of any further entry that arrived before that frame ran:
     *
     *     if (measureRafRef.current !== null) return;   // <- measurement lost
     *
     * That is first-writer-wins inside a frame, and the first writer is
     * routinely the WRONG one: a card mounts empty or skeletonised, the
     * observer fires at (say) 90px and schedules the frame, the query resolves
     * and the observer fires again at 760px — and that second entry returned
     * early, discarding the real height. The frame then converged the card to
     * ~3 rows. Because `computeAutoHeightRows` is a pure function of the height
     * it is given, nothing re-triggered: the card stayed at the empty-state
     * height with its content clipped by the `overflow-hidden` autoHeight
     * wrapper until something else happened to resize it.
     *
     * Storing the height in a ref and READING IT INSIDE the frame makes it
     * last-writer-wins, which is the only correct policy for "how tall is this
     * content right now".
     */
    const latestContentPxRef = useRef<number | null>(null);

    const reportRows = useCallback(
      (contentPx: number) => {
        if (!onAutoHeightChange) return;
        const rows = computeAutoHeightRows({
          contentPx,
          cardChromePx: DEFAULT_CARD_CHROME_PX,
          rowHeightPx: DEFAULT_ROW_HEIGHT,
          marginYPx: DEFAULT_MARGIN[1],
        });
        if (rows === lastReportedRowsRef.current) return;
        lastReportedRowsRef.current = rows;
        onAutoHeightChange(id, rows);
      },
      [id, onAutoHeightChange],
    );

    /**
     * First measurement BEFORE paint (second half of D-76).
     *
     * A ResizeObserver's initial observation is delivered asynchronously, and
     * the rAF hop below adds another frame. Until it lands the card renders at
     * its seed `h` — 6 rows / 192px for a `DraggableCardPage` card — with
     * `overflow-hidden`, so the first painted frame of a taller card is
     * literally cut in half. That is what the operator sees "on page open",
     * every open, on every surface with content taller than its seed.
     *
     * Measuring in a layout effect and reporting synchronously puts the correct
     * row count into state within the same commit, so the browser never paints
     * the clipped frame. React batches these updates across all GridItems
     * mounting together, and `applyAutoHeightRows` is a functional update, so N
     * cards settling at once cost one re-render and cannot clobber each other.
     */
    useLayoutEffect(() => {
      if (!autoHeight || !onAutoHeightChange) return;
      const el = measureRef.current;
      if (!el) return;
      const contentPx = el.getBoundingClientRect().height;
      latestContentPxRef.current = contentPx;
      if (contentPx > 0) reportRows(contentPx);
      else warnOnceAboutCollapsedContent(el);
    }, [autoHeight, onAutoHeightChange, reportRows]);

    useEffect(() => {
      if (!autoHeight || !onAutoHeightChange) return;
      const el = measureRef.current;
      if (!el || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        latestContentPxRef.current = entry.contentRect.height;
        if (measureRafRef.current !== null) return;
        const schedule =
          typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (cb: () => void) => setTimeout(cb, 0);
        measureRafRef.current = schedule(() => {
          measureRafRef.current = null;
          const contentPx = latestContentPxRef.current;
          if (contentPx === null) return;
          reportRows(contentPx);
        }) as unknown as number;
      });
      ro.observe(el);
      return () => {
        ro.disconnect();
        if (
          measureRafRef.current !== null &&
          typeof window !== 'undefined' &&
          typeof window.cancelAnimationFrame === 'function'
        ) {
          window.cancelAnimationFrame(measureRafRef.current);
        }
        measureRafRef.current = null;
      };
    }, [autoHeight, onAutoHeightChange, reportRows]);

    // DnD root-cause fix (2026-05-07): react-draggable@4 (used internally by
    // react-grid-layout@2) checks the drag handle via
    // `matchesSelectorAndParentsTo(target, handle, baseNode)` — it walks UP
    // the ancestor chain from the click target. The previous implementation
    // rendered `.drag-handle` as a SIBLING of the card content, so clicks on
    // any visible card content never matched (ancestors are: card-content →
    // .rounded-3xl → .h-full.w-full.relative → .relative.group; none carry
    // the class). Drag silently failed.
    //
    // Fix: put `.drag-handle` on the outer container. Now any click inside
    // the GridItem has it as an ancestor → drag fires. Interactive elements
    // (buttons, inputs, textarea, select, links, [data-no-drag]) are still
    // protected via the `cancel` selector below in the <Responsive> render.
    const outerClass = cn(
      'relative group overflow-visible',
      isEditing && 'drag-handle cursor-move',
      injectedClassName
    );
    return (
      <div ref={ref} className={outerClass} style={injectedStyle} {...rest}>
        <div className="h-full w-full relative">
          {isEditing && (
            <div className="absolute inset-0 z-10 pointer-events-none rounded-3xl border-2 border-transparent group-hover:border-primary/50 transition-colors bg-primary/5" />
          )}
          {isEditing && (
            <div className="absolute top-2 left-2 z-30 flex items-center gap-1 pointer-events-none">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md opacity-80 font-medium bg-muted text-muted-foreground">
                {label}
              </span>
            </div>
          )}
          {isEditing && (
            <button
              className="absolute top-2 right-2 z-30 h-6 w-6 rounded-full flex items-center justify-center bg-destructive/80 hover:bg-destructive text-destructive-foreground shadow transition-colors"
              data-no-drag
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onHide(id);
              }}
              title={`Hide ${label}`}
              aria-label={`Hide ${label}`}
            >
              <EyeOff className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          <div
            data-slot="grid-item-surface"
            data-chrome={chrome ? 'on' : 'off'}
            className={
              chrome
                ? // ONE radius token, read by the grid item AND available to any
                  // app card that opts into the same surface. Two surfaces
                  // reading the SAME var is what makes their corners align, and
                  // it is also what keeps the radius tenant-configurable —
                  // a literal here would align them and lock white-label out.
                  // `--radius-card` defaults to today's value (1.5rem =
                  // rounded-3xl), so this is byte-identical until a tenant sets
                  // one.
                  'h-full w-full rounded-[var(--radius-card,1.5rem)] transition-all flex flex-col bg-card border border-border shadow-sm dark:shadow-[var(--glow-card,none)]'
                : // Chrome OFF: layout only. Identical box, no paint.
                  'h-full w-full transition-all flex flex-col'
            }
            style={{ contain: 'layout style' }}
          >
            {/*
             * Internal scroll container so card content adapts to whatever
             * pixel size the user resizes the grid item to. `min-h-0` is
             * critical — without it, flex children inherit `min-height: auto`
             * and refuse to shrink below their content size, defeating the
             * scroll. Pair with `flex-1` so the wrapper claims all remaining
             * vertical space inside the card chrome.
             *
             * Consumer card bodies should NOT apply their own `overflow:hidden`
             * on a direct child of `{content}` or the scroll will be intercepted
             * before reaching this container. Internal layout containers in
             * `{content}` that need their own scroll regions (e.g. tab panels,
             * data tables) should use `flex-1 min-h-0 overflow-auto` themselves
             * — those nested scroll containers compose cleanly with this one
             * because pointer/wheel events bubble up only when the inner one
             * is at its scroll edge.
             *
             * `autoHeight` items get `overflow-hidden` instead of
             * `overflow-auto` — the card is sized to fit all of the content
             * (see the ResizeObserver above), so there's nothing to
             * manually scroll; `content` is additionally wrapped in an
             * unconstrained `measureRef` div so the observer reads the
             * content's true intrinsic height rather than the (currently
             * clipped) height of this flex-1 wrapper.
             */}
            <div className={cn('flex-1 min-h-0', autoHeight ? 'overflow-hidden' : 'overflow-auto')}>
              {autoHeight ? <div ref={measureRef}>{content}</div> : content}
            </div>
          </div>
        </div>
        {/*
         * Injected by react-resizable's cloneElement when this item is a child
         * of <Resizable>. Becomes the .react-resizable-handle-se span (or whatever
         * RGLResizeHandle renders). Positioned absolute at bottom-right via
         * react-grid-layout-overrides.css — MUST be a child of .react-grid-item
         * (this outer div), not the inner wrapper, so the CSS targets the right
         * positioning origin.
         */}
        {injectedChildren}
      </div>
    );
  }));

export function PageGridLayout({
  pageKey,
  defaultLayouts,
  defaultCols,
  layoutVersion,
  canEditPage,
  editorEventNames,
  preferenceAdapter,
  widgets,
  widgetMeta,
  className,
  // Resize default flipped 2026-05-12: rgl v2 dropped auto-handle rendering
  // (see RGLResizeHandle above). Previously this defaulted false; consumer
  // adapters then defaulted it back to true. With v2's handle gap fixed,
  // the safe default is true so any consumer who forgets to set it still
  // gets a usable canvas. Opt out per-page with isResizable={false}.
  isResizable = true,
  resizeHandles = DEFAULT_RESIZE_HANDLES,
  tenantId,
  defaultAutoHeight,
  // CHROME OFF BY DEFAULT — the inversion. See `GridItemProps.chrome`.
  // An app that is not ready to migrate its own card surfaces passes
  // `itemChrome` to get the pre-2.0.0 behaviour back for every slot, and
  // migrates page by page with the per-item `chrome` flag.
  itemChrome = false,
  addEntityWidgetEventNames = DEFAULT_ADD_ENTITY_WIDGET_EVENT_NAMES,
  createEntityWidget,
  onRegisterEntityWidget,
  relationshipCatalog,
  addRelationshipWidgetEventNames = DEFAULT_ADD_RELATIONSHIP_WIDGET_EVENT_NAMES,
  createRelationshipWidget,
  onRegisterRelationshipWidget,
  onRelationshipWidgetRejected,
}: PageGridLayoutProps) {
  const {
    currentLayouts,
    layoutCols,
    isEditing,
    setIsEditing,
    activeCols,
    activeCompactor,
    onLayoutChange,
    handleColumnChange,
    handleBreakpointChange,
    handleCompact,
    handleReset,
    addWidget,
    moveWidget,
    setWidgetLocked,
    applyAutoHeightRows,
    autoHeightRows,
    resetConfirmOpen,
    setResetConfirmOpen,
    containerRef,
    containerWidth,
  } = usePageGridLayout({
    pageKey,
    defaultLayouts,
    defaultCols,
    layoutVersion,
    canEditPage,
    editorEventNames,
    preferenceAdapter,
    defaultAutoHeight,
  });

  // Auto-height dispatcher (blueprint amendment A1, hardened per quality
  // review 2026-07-14). `GridItem`'s ResizeObserver calls this per-widget
  // whenever its measured content height changes; we rAF-batch and flush ALL
  // pending widgets in ONE `applyAutoHeightRows` call — a single functional
  // state update, so two cards settling in the same frame (e.g. card2+card3
  // on /people/:id mount) can never last-writer-wins each other. Measured
  // rows are DERIVED, in-memory-only state: they merge into `activeLayouts`
  // below for ALL viewers and are never persisted (see usePageGridLayout).
  // Updates are suppressed entirely while the user is mid-drag/mid-resize so
  // auto-height never fights a manual gesture. A suppressed update is
  // queued, not dropped — the drag/resize *Stop handlers flush whatever's
  // pending the moment the gesture ends.
  const isInteractingRef = useRef(false);
  const pendingAutoHeightRef = useRef<Map<string, number>>(new Map());
  const autoHeightFrameRef = useRef<number | null>(null);

  const scheduleFrame = useCallback((callback: () => void): number => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(callback);
    }
    return setTimeout(callback, 0) as unknown as number;
  }, []);

  const flushAutoHeightUpdates = useCallback(() => {
    autoHeightFrameRef.current = null;
    if (isInteractingRef.current) return;
    const pending = pendingAutoHeightRef.current;
    if (pending.size === 0) return;
    pendingAutoHeightRef.current = new Map();
    applyAutoHeightRows(Object.fromEntries(pending));
  }, [applyAutoHeightRows]);

  const handleAutoHeightChange = useCallback(
    (widgetKey: string, rows: number) => {
      pendingAutoHeightRef.current.set(widgetKey, rows);
      if (isInteractingRef.current || autoHeightFrameRef.current !== null) return;
      autoHeightFrameRef.current = scheduleFrame(flushAutoHeightUpdates);
    },
    [flushAutoHeightUpdates, scheduleFrame],
  );

  const handleInteractionStart = useCallback<EventCallback>(() => {
    isInteractingRef.current = true;
  }, []);

  /*
   * A pointer gesture just ended. react-grid-layout emits `onLayoutChange` AFTER
   * `onDragStop`/`onResizeStop`, so `isInteractingRef` is already false by then —
   * this ref is what carries "a gesture produced the next emission" across that
   * gap, and the hook needs it to tell a deliberate resize of an auto-height card
   * from the ResizeObserver re-measuring one that a column change just narrowed.
   */
  const gestureJustEndedRef = useRef(false);

  const handleInteractionStop = useCallback<EventCallback>(() => {
    isInteractingRef.current = false;
    gestureJustEndedRef.current = true;
    if (pendingAutoHeightRef.current.size > 0 && autoHeightFrameRef.current === null) {
      autoHeightFrameRef.current = scheduleFrame(flushAutoHeightUpdates);
    }
  }, [flushAutoHeightUpdates, scheduleFrame]);

  const resizeEnabled = isEditing && isResizable;
  const resizeConstraints = useMemo(
    () => [
      // `gridBounds` caps width at the active column count, so we don't need
      // a global maxSize(...). Width and height are unbounded by default;
      // consumers cap individual widgets via LayoutItem.maxW / maxH which
      // `minMaxSize` reads per-item.
      gridBounds,
      minMaxSize,
      minSize(DEFAULT_RESIZE_BOUNDS.minW, DEFAULT_RESIZE_BOUNDS.minH),
    ],
    [],
  );

  const [extraWidgetConfigs, setExtraWidgetConfigs] = useState<Record<string, { entityType: string; label?: string }>>({});
  const [extraRelationshipWidgetConfigs, setExtraRelationshipWidgetConfigs] = useState<
    Record<string, RelationshipWidgetDetail>
  >({});
  const { value: layerNames, setValue: setLayerNames } = (preferenceAdapter ?? defaultPreferenceAdapter)<Record<string, string>>(
    `page:${pageKey}_grid_layer_names`,
    {},
  );
  const { value: hiddenLayerIds, setValue: setHiddenLayerIds } = (preferenceAdapter ?? defaultPreferenceAdapter)<Record<string, boolean>>(
    `page:${pageKey}_grid_hidden_layers`,
    {},
  );
  const extraWidgets = useMemo(() => {
    const rendered: Record<string, React.ReactNode> = {};
    if (!createEntityWidget) return rendered;
    for (const [widgetId, config] of Object.entries(extraWidgetConfigs)) {
      rendered[widgetId] = createEntityWidget({
        widgetId,
        entityType: config.entityType,
        label: config.label,
        isEditing,
        tenantId,
      });
    }
    return rendered;
  }, [createEntityWidget, extraWidgetConfigs, isEditing, tenantId]);

  // Relationship-field widgets (W4-1) — same shape as the entity-list path
  // above (config registry -> render via a consumer-supplied factory), kept
  // as a parallel structure rather than folded in because the two widget
  // kinds are gated differently: an entity-list widget can always be added,
  // a relationship widget only when `relationshipCatalog` proves the FK is
  // real (see the add-relationship-widget listener below).
  const extraRelationshipWidgets = useMemo(() => {
    const rendered: Record<string, React.ReactNode> = {};
    if (!createRelationshipWidget) return rendered;
    for (const [widgetId, detail] of Object.entries(extraRelationshipWidgetConfigs)) {
      rendered[widgetId] = createRelationshipWidget({
        widgetId,
        hostEntityType: detail.hostEntityType,
        fkColumn: detail.fkColumn,
        targetEntityType: detail.targetEntityType,
        label: detail.label,
        isEditing,
        tenantId,
      });
    }
    return rendered;
  }, [createRelationshipWidget, extraRelationshipWidgetConfigs, isEditing, tenantId]);

  const allWidgets = useMemo(
    () => ({ ...widgets, ...extraWidgets, ...extraRelationshipWidgets }),
    [widgets, extraWidgets, extraRelationshipWidgets],
  );
  const renderableWidgetKeys = useMemo(
    () => new Set(Object.keys(allWidgets).filter((key) => allWidgets[key] !== null && allWidgets[key] !== undefined)),
    [allWidgets],
  );
  const activeLayouts = useMemo(() => {
    const filtered: GridLayouts = { lg: [] };
    for (const bp in currentLayouts) {
      filtered[bp] = (currentLayouts[bp] ?? [])
        .filter((item) => renderableWidgetKeys.has(item.i) && !hiddenLayerIds[item.i])
        // autoHeight is a FLOOR, not a lock.
        //
        // This block used to force `isResizable: false` on every autoHeight
        // item and overwrite `h` with the measured height. Between them those
        // two lines removed card resizing from every page whose cards use the
        // default `autoHeight: true` — the force-disable killed the handles,
        // and the unconditional `h` overwrite would have stomped any height a
        // user did manage to set on the next measurement.
        //
        // Resizable cards are an operator-mandated platform capability
        // (Braden, 2026-07-31: "no ruling has ever had my authority to
        // suppress resizing"). The earlier internal note that traded resize
        // away to stop a 192px clipping regression posed a false choice. Both
        // properties hold at once:
        //
        //   minH = measuredRows  -> a card can never be dragged shorter than
        //                           its content, so the clipping regression
        //                           that motivated the original change stays
        //                           fixed.
        //   h    = hUserSet ? max(saved, measured) : measured
        //                        -> content is never clipped, AND a height the
        //                           user deliberately set is preserved instead
        //                           of being reset on every re-measure.
        //
        // That `hUserSet` test is the 2026-08-20 correction. Without it the
        // floor read an AUTHORED SEED as a user choice: every page ships seed
        // heights, most cards are never resized, so `max(saved, measured)`
        // pinned each card at its author's guess forever and auto-height could
        // only grow. Measured signed-in on crm7 /dashboard: 1,143px dead across
        // 7 cards, every allocation equal to its seed h — `recentActivity`
        // seeds 13 rows (488px) to paint 173px. Ceiling wastes at most one row
        // unit (38px), so rounding could never have produced 315px; only a
        // floor that never lowers can.
        //   isResizable untouched -> inherits the grid default (true), so the
        //                           handles are present.
        //
        // Measured rows still merge at the RENDER layer only, so the saved
        // layout (and the preference adapter) never sees a measured height.
        // Until the first measurement lands, `autoHeightRows` has no entry and
        // the item's seed `h` renders as-is.
        .map((item) => {
          // HEAL a persisted `isResizable: false` on ANY item, not just an
          // autoHeight one (D-75: "individual cards can no longer be resized").
          //
          // The 0.6.0 heal was scoped to `item.autoHeight`, which left the
          // whole non-autoHeight population — every card that opted out, and
          // every layout persisted before `autoHeight` existed as a concept —
          // permanently unresizable with no way back: the flag is re-persisted
          // on each load, so clearing it by hand does not survive a refresh.
          //
          // The one legitimate source of a per-item `isResizable: false` is the
          // Layers "lock" control, which writes it together with `static: true`
          // and `isDraggable: false`. Requiring that full signature separates a
          // deliberate lock (kept) from the 0.5.2 leak (dropped), so the heal
          // can be widened without silently unlocking anything a user locked.
          const lockedDeliberately = item.static === true || item.isDraggable === false;
          const needsResizeHeal = item.isResizable === false && !lockedDeliberately;

          if (!item.autoHeight) {
            if (!needsResizeHeal) return item;
            const { isResizable: _dropped, ...unlocked } = item;
            return unlocked;
          }
          //
          // 0.5.2 set this at the render layer, and it leaked out through
          // `onLayoutChange` into the SAVED layout. Removing the override in
          // 0.6.0 was therefore not enough: react-grid-layout resolves
          //
          //   typeof l.isResizable === 'boolean' ? l.isResizable
          //                                      : !l.static && gridResizable
          //
          // so an explicit persisted `false` beats the grid default forever.
          // Every user who ever loaded an affected page has it stored.
          //
          // Confirmed in a real signed-in browser 2026-07-31: the saved
          // preference for /financial/invoicing/:id held
          // `"isResizable":false` on all 6 cards; clearing it by hand did not
          // help, because it was re-persisted on the next load.
          //
          // A per-item `false` on an autoHeight item cannot be a user choice —
          // nothing in the UI sets it, and page-level opt-out uses the
          // `isResizable` PROP, not per-item layout. So it can only have come
          // from the 0.5.2 bug, and dropping it is safe.
          const { isResizable: persisted, ...rest } = item;
          const healed = persisted === false ? rest : item;

          const measuredRows = autoHeightRows[item.i];
          if (measuredRows === undefined) return healed;
          return {
            ...healed,
            // A seed the user never touched has no claim to be preserved; a
            // height they dragged to does. `minH` keeps content unclippable
            // in both cases, so letting the measurement win here cannot clip.
            h: healed.hUserSet ? Math.max(healed.h ?? 0, measuredRows) : measuredRows,
            minH: measuredRows,
          };
        });
    }
    return filtered;
  }, [autoHeightRows, currentLayouts, hiddenLayerIds, renderableWidgetKeys]);

  const hideLayer = (layerId: string) => {
    setHiddenLayerIds((previous) => ({ ...previous, [layerId]: true }));
  };

  const showLayer = (layerId: string, defaultSize?: { w?: number; h?: number; minW?: number; minH?: number }) => {
    setHiddenLayerIds((previous) => {
      if (!previous[layerId]) return previous;
      const { [layerId]: _removed, ...rest } = previous;
      return rest;
    });
    const existsInLayouts = Object.values(currentLayouts).some((items) => (items ?? []).some((item) => item.i === layerId));
    if (!existsInLayouts) {
      addWidget(layerId, defaultSize);
    }
  };

  useEffect(() => {
    if (!createEntityWidget || typeof window === 'undefined') return;
    const handleAddEntityWidget = (event: Event) => {
      const detail = (event as CustomEvent<{ entityType: string; label?: string }>).detail;
      if (!detail?.entityType) return;

      const widgetId = `entity:${detail.entityType}`;
      const alreadyInLayout = activeLayouts.lg?.some((item) => item.i === widgetId);
      if (alreadyInLayout) {
        startTransition(() => setIsEditing(true));
        return;
      }

      onRegisterEntityWidget?.({ widgetId, entityType: detail.entityType, label: detail.label });
      setExtraWidgetConfigs((previous) => ({
        ...previous,
        [widgetId]: { entityType: detail.entityType, label: detail.label },
      }));
      addWidget(widgetId, { w: 6, h: 8, minW: 3, minH: 4 });
      startTransition(() => setIsEditing(true));
    };
    for (const eventName of addEntityWidgetEventNames) {
      window.addEventListener(eventName, handleAddEntityWidget);
    }
    return () => {
      for (const eventName of addEntityWidgetEventNames) {
        window.removeEventListener(eventName, handleAddEntityWidget);
      }
    };
  }, [
    activeLayouts.lg,
    addEntityWidgetEventNames,
    addWidget,
    createEntityWidget,
    onRegisterEntityWidget,
    setIsEditing,
  ]);

  // Relationship-field widget listener (W4-1/W4-2). Mirrors the
  // add-entity-widget listener above, with one structural difference: every
  // request is checked against `relationshipCatalog` via
  // `isRelationshipWritable` BEFORE a widget is ever created. No catalogue
  // match means the FK is not proven to exist, so the request is refused —
  // `onRelationshipWidgetRejected` fires (for the consumer to surface why)
  // and nothing is added to the layout. This is the only place that gate is
  // enforced; there is no other path that creates a relationship widget.
  useEffect(() => {
    if (!createRelationshipWidget || typeof window === 'undefined') return;
    const handleAddRelationshipWidget = (event: Event) => {
      const detail = (event as CustomEvent<RelationshipWidgetDetail>).detail;
      if (!detail?.hostEntityType || !detail.fkColumn || !detail.targetEntityType) return;

      if (!isRelationshipWritable(relationshipCatalog, detail)) {
        onRelationshipWidgetRejected?.(detail);
        return;
      }

      const widgetId = `relationship:${detail.hostEntityType}:${detail.fkColumn}`;
      const alreadyInLayout = activeLayouts.lg?.some((item) => item.i === widgetId);
      if (alreadyInLayout) {
        startTransition(() => setIsEditing(true));
        return;
      }

      onRegisterRelationshipWidget?.({ widgetId, ...detail });
      setExtraRelationshipWidgetConfigs((previous) => ({
        ...previous,
        [widgetId]: detail,
      }));
      addWidget(widgetId, { w: 4, h: 3, minW: 3, minH: 2 });
      startTransition(() => setIsEditing(true));
    };
    for (const eventName of addRelationshipWidgetEventNames) {
      window.addEventListener(eventName, handleAddRelationshipWidget);
    }
    return () => {
      for (const eventName of addRelationshipWidgetEventNames) {
        window.removeEventListener(eventName, handleAddRelationshipWidget);
      }
    };
  }, [
    activeLayouts.lg,
    addRelationshipWidgetEventNames,
    addWidget,
    createRelationshipWidget,
    onRegisterRelationshipWidget,
    onRelationshipWidgetRejected,
    relationshipCatalog,
    setIsEditing,
  ]);

  const visibleKeys = useMemo(() => new Set((activeLayouts.lg ?? []).map((item) => item.i)), [activeLayouts.lg]);
  const hiddenWidgetKeys = useMemo(
    () => [...renderableWidgetKeys].filter((key) => !visibleKeys.has(key)),
    [renderableWidgetKeys, visibleKeys],
  );
  const layerItems = useMemo(
    () =>
      (activeLayouts.lg ?? []).map((item, index, layers) => {
        const fallbackLabel = widgetMeta?.[item.i]?.label ?? item.i;
        return {
          id: item.i,
          label: layerNames[item.i] || fallbackLabel,
          locked: Boolean(item.static || item.isDraggable === false || item.isResizable === false),
          canMoveUp: index > 0,
          canMoveDown: index < layers.length - 1,
        };
      }),
    [activeLayouts.lg, layerNames, widgetMeta],
  );

  const handleLayerRename = (layerId: string, value: string) => {
    const trimmed = value.trim();
    setLayerNames((previous) => {
      if (trimmed.length === 0) {
        if (!(layerId in previous)) return previous;
        const { [layerId]: _removed, ...rest } = previous;
        return rest;
      }
      if (previous[layerId] === trimmed) return previous;
      return { ...previous, [layerId]: trimmed };
    });
  };

  // Reset-confirmation dialog: full ARIA APG dialog-modal pattern.
  // - Escape key closes the dialog.
  // - Tab / Shift+Tab are trapped within the two dialog buttons (cancel ↔ confirm).
  // - Initial focus moves to the Cancel button (safe default for destructive actions).
  // - Focus returns to the invoking element when the dialog closes.
  const resetCancelButtonRef = useRef<HTMLButtonElement>(null);
  const resetConfirmButtonRef = useRef<HTMLButtonElement>(null);

  // Collapsed state for the sticky editor banner. The expanded banner
  // (columns + full Layers list + actions) can obscure most of the viewport
  // while the user arranges cards below it (operator-reported, twice). Two
  // structural guards keep the canvas usable:
  //  1. Default COLLAPSED on every open — the banner enters as a thin single
  //     row (icon + title + Expand + Save & Exit), so the canvas is never
  //     blocked on entry. The prior scroll-to-collapse heuristic failed on
  //     short pages: the tall banner ate the scroll room it needed to trigger.
  //  2. The expanded body is height-capped and scrolls internally (see the
  //     controls-body className), so even expanded it can never cover more
  //     than part of the screen regardless of how many layers exist.
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  const editorBannerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isEditing) return;
    // Re-collapse on each open so re-entering the editor never re-blocks the
    // canvas; the user expands via the toggle to reach columns + Layers.
    setControlsCollapsed(true);
  }, [isEditing]);

  useEffect(() => {
    if (!resetConfirmOpen || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setResetConfirmOpen(false);
        return;
      }
      if (event.key === 'Tab') {
        const cancel = resetCancelButtonRef.current;
        const confirm = resetConfirmButtonRef.current;
        if (!cancel || !confirm) return;
        if (event.shiftKey) {
          if (document.activeElement === cancel) {
            event.preventDefault();
            confirm.focus();
          }
        } else {
          if (document.activeElement === confirm) {
            event.preventDefault();
            cancel.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetConfirmOpen, setResetConfirmOpen]);

  useEffect(() => {
    if (!resetConfirmOpen || typeof document === 'undefined') return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    resetCancelButtonRef.current?.focus();
    return () => {
      previousActiveElement?.focus?.();
    };
  }, [resetConfirmOpen]);

  return (
    <div className={cn('relative', isEditing && 'isolate', className)}>
      {isEditing && (
        <div
          ref={editorBannerRef}
          data-page-grid-editor-controls
          data-collapsed={controlsCollapsed || undefined}
          className={cn(
            // Sticky overlay banner — sits at the top of the scroll container
            // without pushing the form down. `top-0` anchors to the nearest
            // scrolling ancestor; `z-40` keeps it above grid items but below
            // app-level overlays (toaster, dialogs are z-50+).
            'sticky top-0 z-40 isolate flex flex-col gap-3 rounded-xl shadow-lg border-2 mb-4',
            // Collapsed → thin single-row bar so the canvas below stays visible
            // (operator-reported: expanded banner obscured most of the viewport
            // while arranging cards). Expanded → full controls.
            controlsCollapsed ? 'p-2' : 'p-4',
            // Subtle translucent background so the form behind it stays
            // partially visible — mitigates Issue 2 (banner consuming
            // vertical space). `bg-card/95` + `backdrop-blur` keeps text
            // legible while showing form context behind the banner.
            'bg-card/95 supports-[backdrop-filter]:bg-card/80 backdrop-blur border-primary',
          )}
          role="region"
          aria-label="Canvas editor controls"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-full flex items-center justify-center bg-primary/10',
                  controlsCollapsed ? 'h-8 w-8' : 'h-10 w-10 animate-pulse',
                )}
              >
                <Settings2 className={cn('text-primary', controlsCollapsed ? 'h-4 w-4' : 'h-5 w-5')} />
              </div>
              <div>
                <h3 className={cn('font-semibold text-foreground', controlsCollapsed ? 'text-sm' : 'text-lg')}>
                  Canvas Editor Active
                </h3>
                {!controlsCollapsed && (
                  <span className="text-sm text-muted-foreground">
                    Drag anywhere on a card to move it. Resize with the bottom-right handle.
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                aria-expanded={!controlsCollapsed}
                aria-controls="page-grid-editor-controls-body"
                onClick={() => setControlsCollapsed((previous) => !previous)}
              >
                {controlsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                <span className="sr-only sm:not-sr-only">{controlsCollapsed ? 'Expand' : 'Collapse'}</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                onClick={() => startTransition(() => setIsEditing(false))}
              >
                <Save className="h-4 w-4 mr-2" />
                Save &amp; Exit
              </button>
            </div>
          </div>

          <div
            id="page-grid-editor-controls-body"
            hidden={controlsCollapsed}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-border max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm shrink-0 text-muted-foreground">Columns:</span>
              <input
                type="range"
                min={1}
                max={24}
                value={layoutCols}
                onChange={(event) => handleColumnChange(Number(event.target.value))}
                className="w-24 cursor-pointer accent-primary"
                aria-label="Column count"
              />
              <span className="text-sm font-mono w-5 text-center tabular-nums">{layoutCols}</span>
            </div>

            <div className="flex items-center gap-1" role="group" aria-label="Column presets">
              {[1, 2, 3, 4, 6, 12].map((columnCount) => (
                <button
                  type="button"
                  key={columnCount}
                  onClick={() => handleColumnChange(columnCount)}
                  data-active={layoutCols === columnCount || undefined}
                  aria-pressed={layoutCols === columnCount}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium transition-colors border',
                    'bg-muted text-muted-foreground border-border',
                    'hover:bg-muted/80 hover:text-foreground',
                    'data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:border-primary',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  )}
                >
                  {columnCount}
                </button>
              ))}
            </div>

            {hiddenWidgetKeys.length > 0 && (
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm shrink-0 text-muted-foreground">Add widget:</span>
                <div className="flex flex-wrap gap-1">
                  {hiddenWidgetKeys.map((key) => {
                    const meta = widgetMeta?.[key];
                    const Icon = meta?.icon;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => showLayer(key, meta?.defaultSize)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors',
                          'bg-muted text-muted-foreground border-border',
                          'hover:bg-muted/80 hover:text-foreground hover:border-primary/60',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        )}
                        >
                          <Plus className="h-3 w-3" />
                          {Icon && <Icon className="h-3 w-3" />}
                          {layerNames[key] || meta?.label || key}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {layerItems.length > 0 && (
              <div className="basis-full rounded-md border border-border bg-background/80 p-2">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  Layers
                </div>
                <div className="flex flex-col gap-1">
                  {layerItems.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1"
                    >
                      <input
                        type="text"
                        value={layer.label}
                        onChange={(event) => handleLayerRename(layer.id, event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                        aria-label={`Rename ${layer.label}`}
                      />
                      <button
                        type="button"
                        onClick={() => moveWidget(layer.id, 'up')}
                        disabled={!layer.canMoveUp}
                        aria-label={`Move ${layer.label} up`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(layer.id, 'down')}
                        disabled={!layer.canMoveDown}
                        aria-label={`Move ${layer.label} down`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setWidgetLocked(layer.id, !layer.locked)}
                        aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.label}`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => hideLayer(layer.id)}
                        aria-label={`Hide ${layer.label}`}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCompact}
              className={cn(
                'ml-auto inline-flex items-center rounded-md border border-border px-2 py-1 text-sm transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              )}
            >
              <Layers className="h-4 w-4 mr-1" />
              Compact Layout
            </button>

            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className={cn(
                'inline-flex items-center rounded-md border border-border px-2 py-1 text-sm transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              )}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-grid-reset-title"
          aria-describedby="page-grid-reset-description"
        >
          <div className="max-w-md rounded-lg bg-card p-5 shadow-lg border border-border">
            <h2 id="page-grid-reset-title" className="text-lg font-semibold">Reset page layout?</h2>
            <p id="page-grid-reset-description" className="mt-2 text-sm text-muted-foreground">
              This will discard your current layout and restore all widgets to their default positions.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                ref={resetCancelButtonRef}
                onClick={() => setResetConfirmOpen(false)}
                className={cn(
                  'inline-flex items-center rounded-md border border-border px-3 py-2 text-sm transition-colors',
                  'bg-card text-foreground hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                ref={resetConfirmButtonRef}
                onClick={() => {
                  handleReset();
                  setResetConfirmOpen(false);
                }}
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'bg-destructive text-destructive-foreground shadow hover:bg-destructive/90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-1',
                )}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef as React.Ref<HTMLDivElement>}
        className={cn('relative z-0 overflow-visible', isEditing && 'min-h-[200px] bg-muted/30')}
        data-page-grid-editing={isEditing || undefined}
      >
        <div className="relative z-0" style={{ opacity: containerWidth > 0 ? 1 : 0 }} aria-busy={containerWidth <= 0}>
          <Responsive
            width={Math.max(containerWidth, 1)}
            className="layout page-grid-canvas"
            layouts={activeLayouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            rowHeight={DEFAULT_ROW_HEIGHT}
            onLayoutChange={(layout, layouts) => {
              const wasGesture = isInteractingRef.current || gestureJustEndedRef.current;
              gestureJustEndedRef.current = false;
              onLayoutChange(layout, layouts, wasGesture);
            }}
            // Tells the hook which breakpoint a gesture belongs to, so the edit
            // is folded back onto `lg` instead of into a derived breakpoint
            // that is regenerated (and therefore discarded) on the next render.
            onBreakpointChange={handleBreakpointChange}
            dragConfig={{
              enabled: isEditing,
              handle: '.drag-handle',
              bounded: false,
              cancel:
                '.react-resizable-handle, button, input, textarea, select, [contenteditable="true"], [data-no-drag], a[href], [role="button"], [role="combobox"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="switch"], [role="slider"], [role="textbox"]',
            }}
            resizeConfig={{
              enabled: resizeEnabled,
              handles: resizeHandles,
              // Required for v2 — see RGLResizeHandle comment above.
              handleComponent: (axis, ref) => (
                <RGLResizeHandle axis={axis} ref={ref as React.Ref<HTMLSpanElement>} />
              ),
            }}
            constraints={resizeEnabled ? resizeConstraints : undefined}
            compactor={activeCompactor}
            cols={activeCols}
            margin={DEFAULT_MARGIN}
            // Suppress auto-height writes mid-gesture (blueprint amendment
            // A1) — coexists with dragConfig/resizeConfig above; RGL v2's
            // grouped config props and top-level *Start/*Stop callbacks are
            // independent, not mutually exclusive.
            onDragStart={handleInteractionStart}
            onDragStop={handleInteractionStop}
            onResizeStart={handleInteractionStart}
            onResizeStop={handleInteractionStop}
          >
            {activeLayouts.lg.map((layoutItem) => {
              const content = allWidgets[layoutItem.i];
              if (content === undefined || content === null) return null;
              return (
                <GridItem
                  key={layoutItem.i}
                  id={layoutItem.i}
                  content={content}
                  isEditing={isEditing}
                  label={layerNames[layoutItem.i] || widgetMeta?.[layoutItem.i]?.label || layoutItem.i}
                  onHide={hideLayer}
                  autoHeight={layoutItem.autoHeight}
                  onAutoHeightChange={handleAutoHeightChange}
                  chrome={layoutItem.chrome ?? itemChrome}
                />
              );
            })}
          </Responsive>
        </div>
      </div>
    </div>
  );
}
