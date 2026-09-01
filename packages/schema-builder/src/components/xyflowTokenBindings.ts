/**
 * `XY_TOKEN_BINDINGS` — React Flow's own palette, bound to BSuite role tokens.
 *
 * EXTRACTED FROM `SchemaCanvas.tsx` (v1.9.0) SO IT CAN BE IMPORTED WITHOUT
 * IMPORTING THE WHOLE CANVAS.
 *
 * This object had been copy-pasted THREE times across the estate —
 * `SchemaCanvas.tsx` (with `colorMode`), `business-suite-unified/src/lib/
 * xyflowThemeTokens.ts`, and a third, independently-authored copy in
 * `crm7/src/pages/sales/pipeline-flow-inner.tsx` — which is the anti-pattern
 * the estate's DRY doctrine forbids, tracked at
 * https://github.com/GaryOcean428/bsuite/issues/2550. `@bsuite/workflow-canvas`
 * needed a FOURTH; this export is what it consumes instead. The two app-level
 * copies can now be collapsed onto it, which is what closes #2550.
 *
 * Importing it from `SchemaCanvas.tsx` was not an option: that module pulls in
 * dagre and html-to-image, and bundle size is an explicit operator constraint.
 * Hence its own file with no dependencies but React's CSSProperties type.
 */

import type { CSSProperties } from 'react';

/**
 * React Flow ships its own palette as raw hex, split into `-default` values
 * under `.react-flow` and `.react-flow.dark`. Even with `colorMode` set
 * correctly that palette is the library's, not the tenant's: the minimap ground
 * would be the library's own near-white in light and its own near-black in
 * dark, regardless of what the surface
 * behind it actually is.
 *
 * `-props` is the layer the library reserves for the consumer (it is what the
 * component props write to), so overriding it here does not fight the
 * stylesheet's own cascade. Every value is a role token, so both themes and any
 * tenant branding follow automatically and nothing here needs a dark variant.
 */
export const XY_TOKEN_BINDINGS = {
  /*
   * TOKEN BINDINGS ONLY. DO NOT PUT SIZING HERE — IT IS SILENTLY DISCARDED.
   *
   * `@xyflow/react` v12 builds its root element as:
   *
   *     const wrapperStyle = {
   *       width: '100%', height: '100%', overflow: 'hidden',
   *       position: 'relative', zIndex: 0,
   *     };
   *     <div ... style={{ ...style, ...wrapperStyle }} className={cc(['react-flow', ...])}>
   *
   * `wrapperStyle` is spread AFTER the caller's `style`, so `width`, `height`,
   * `overflow`, `position` and `zIndex` passed through this prop are always
   * overwritten. Only keys the library does not set — the custom properties
   * below, and `inset` — survive. That is the whole reason this file previously
   * carried `position: 'absolute', inset: 0` and production STILL rendered a
   * zero-height canvas: `position` was overwritten back to `relative`, `inset: 0`
   * survived, and `inset` on a `relative` element does nothing at all.
   *
   * The sizing problem it was trying to solve is real. React Flow's own
   * `height: 100%` resolves against this component's wrapper, whose specified
   * height is itself `100%` of an indefinite chain. `min-h-[420px]` gives that
   * wrapper a USED height of 420px — which `getComputedStyle().height` reports,
   * and which is why the wrapper LOOKS definite when you inspect it — but a
   * percentage on a descendant resolves against the SPECIFIED height, and a
   * min-height never makes that definite. So `100%` collapses to auto, i.e. 0.
   *
   * The fix therefore has to live on a div we own, where no library can
   * overwrite it: `canvasContent` is rendered inside an `absolute inset-0`
   * child of the already-`relative` wrapper. Absolute positioning resolves
   * against the containing block's USED size, so it gets the real 420px, and
   * React Flow's `height: 100%` then resolves against something definite.
   *
   * The earlier fix was "verified in the live DOM" by setting these two
   * properties directly on the element, which does work — a direct write is not
   * subject to the spread. What was never verified was the DELIVERY PATH. The
   * mechanism was right and the prop was the wrong way to deliver it.
   */
  '--xy-minimap-background-color-props': 'var(--role-bg-panel)',
  '--xy-minimap-mask-background-color-props': 'var(--role-bg-body)',
  '--xy-minimap-mask-stroke-color-props': 'var(--role-border-interactive)',
  '--xy-minimap-node-background-color-props': 'var(--role-primary)',
  '--xy-minimap-node-stroke-color-props': 'var(--role-border-interactive)',
  /*
   * BOTH SPELLINGS, DELIBERATELY — and only for this one property.
   *
   * `@xyflow/react` 12.11.2 does NOT chain the `-props` layer for the Controls
   * button's BASE background. Read from the installed stylesheet, not from the
   * docs:
   *
   *   background: var(--xy-controls-button-background-color,
   *                   var(--xy-controls-button-background-color-default))
   *
   * No `-props`. Its HOVER counterpart DOES chain it, and so do all five
   * minimap properties and the button's colour and border-color — which is
   * exactly what made this so easy to miss: nine of the ten bindings in this
   * object work, and the tenth silently rendered the library default
   * (#fefefe light / #2b2b2b dark) while the token sat here looking applied.
   *
   * AUDITED, all ten, against the installed stylesheet: this is the only gap.
   * `SchemaCanvas.tokenBindings.test.tsx` now re-runs that audit so the next
   * xyflow bump cannot reopen it silently.
   *
   * Same failure shape as the zero-height canvas above: a styling fix routed
   * through a mechanism the library never reads is INERT, and inert is
   * indistinguishable from applied unless you measure the rendered result.
   */
  '--xy-controls-button-background-color': 'var(--role-bg-panel)',
  '--xy-controls-button-background-color-props': 'var(--role-bg-panel)',
  '--xy-controls-button-background-color-hover-props': 'var(--role-bg-body)',
  '--xy-controls-button-color-props': 'var(--role-text-body)',
  '--xy-controls-button-color-hover-props': 'var(--role-text-body)',
  '--xy-controls-button-border-color-props': 'var(--role-border-interactive)',
} as CSSProperties;
