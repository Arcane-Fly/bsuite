/**
 * Dagre auto-layout on its own subpath.
 *
 * `@bsuite/schema-builder/utils` also exports `exportCanvasToPng`, which pulls
 * in `html-to-image`. A consumer that wants only the layout maths — which is
 * what `@bsuite/workflow-canvas` wants — should not pay for a screenshot
 * library it never calls, and this package cannot declare `sideEffects: false`
 * to let a bundler work that out for itself (SchemaCanvas imports CSS).
 */

export { computeDagreLayout } from './utils/autoLayout.js';
export type { AutoLayoutOptions } from './utils/autoLayout.js';
