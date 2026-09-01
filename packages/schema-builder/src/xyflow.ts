/**
 * The two React-Flow-adjacent pieces a SIBLING CANVAS needs, on a subpath that
 * costs it nothing else.
 *
 * `@bsuite/workflow-canvas` needs `XY_TOKEN_BINDINGS` and `useDocumentColorMode`
 * and nothing else from this package's UI layer. Reaching them through
 * `@bsuite/schema-builder` or `/components` would put `SchemaCanvas` — and with
 * it dagre, html-to-image and `@xyflow/react/dist/style.css` — on the import
 * graph, and this package cannot declare `sideEffects: false` (that CSS import
 * is a real side effect) so a bundler cannot be relied on to drop it again.
 * Bundle size is an explicit operator constraint, so the narrow door is the
 * right one.
 *
 * Neither export below pulls in anything heavier than React's type-only
 * `CSSProperties` and `useState`/`useEffect`.
 */

export { XY_TOKEN_BINDINGS } from './components/xyflowTokenBindings.js';
export { useDocumentColorMode } from './hooks/useDocumentColorMode.js';
export type { DocumentColorMode } from './hooks/useDocumentColorMode.js';
