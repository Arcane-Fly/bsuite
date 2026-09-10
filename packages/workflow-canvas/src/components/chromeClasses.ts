/**
 * Chrome surface classes are NOT optional.
 *
 * `className ?? fullDefault` was the public API until 0.3.0-rc.3. Consumers
 * (crm7's adapter) passed placement-only strings — `absolute left-2 top-2` —
 * and silently discarded `bg-card`, `border-border`, padding, flex and width.
 * Tailwind cannot resolve two competing `left-*` utilities by source order, and
 * this package has zero runtime deps so it cannot `tailwind-merge`. The only
 * conflict-free option the old API offered was replace-all, which destroyed the
 * surface.
 *
 * Surface is therefore ALWAYS applied. `className` is extras only. Placement is
 * no longer the chrome's job: `WorkflowCanvas` owns reserved regions, so the
 * defaults here carry no `absolute` / `z-*`. A leftover placement className is
 * contained by the region's `relative` box rather than painted over the diagram.
 */

export type WorkflowChromeRegion = 'toolbar' | 'palette' | 'inspector';

export const WORKFLOW_CHROME_SURFACE =
  'pointer-events-auto rounded-xl border border-border bg-card shadow-md dark:shadow-[var(--glow-card,none)]';

export const WORKFLOW_PALETTE_WIDTH = 'w-56';
export const WORKFLOW_INSPECTOR_WIDTH = 'w-72';

/** Reserved column. No padding — padding on a w-56 cell plus an inner w-56 card overflows 16px. */
export const WORKFLOW_REGION_PALETTE =
  'relative min-h-0 w-56 min-w-0 shrink-0 empty:hidden';
export const WORKFLOW_REGION_INSPECTOR =
  'relative min-h-0 w-72 min-w-0 shrink-0 empty:hidden';
export const WORKFLOW_REGION_PALETTE_COMPACT = 'relative min-w-0 shrink-0 px-2 pb-2 empty:hidden';
export const WORKFLOW_REGION_TOOLBAR = 'relative min-w-0 shrink-0 p-2 empty:hidden';

export const WORKFLOW_TOOLBAR_SURFACE = `${WORKFLOW_CHROME_SURFACE} flex flex-wrap items-center gap-2 p-2`;
export const WORKFLOW_PALETTE_SURFACE = `${WORKFLOW_CHROME_SURFACE} ${WORKFLOW_PALETTE_WIDTH} p-2`;
export const WORKFLOW_INSPECTOR_SURFACE = `${WORKFLOW_CHROME_SURFACE} h-full min-h-0 min-w-0 overflow-y-auto p-3`;

/**
 * A padded region whose content box is smaller than a child of the same
 * outer width overflows (parent SEND_BACK on b92517dff: 224/240 and 288/304).
 */
export function nestedFixedWidthOverflows(
  regionClientPx: number,
  regionPaddingXPx: number,
  childOuterPx: number,
): boolean {
  return childOuterPx > regionClientPx - regionPaddingXPx;
}

export function joinClassNames(...parts: Array<string | undefined | false | null>): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.trim() !== '').join(' ');
}
