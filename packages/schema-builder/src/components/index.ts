/**
 * Components barrel — all public React components exported from
 * @bsuite/schema-builder/components. The package's top-level `index.ts`
 * re-exports from this file.
 */

export {
  CommandPalette,
  type CommandPaletteProps,
  type CommandPaletteNavTarget,
} from './CommandPalette.js';
export {
  EntityNode,
  type EntityNodeData,
  type EntityNodeType,
} from './EntityNode.js';
export {
  EntityPropertiesPanel,
  type EntityPropertiesPanelProps,
} from './EntityPropertiesPanel.js';
export {
  FieldCreateDialog,
  FIELD_TYPE_OPTIONS,
  SNAKE_CASE_RE,
  type FieldCreateDialogPayload,
  type FieldCreateDialogProps,
} from './FieldCreateDialog.js';
export {
  FieldEditDialog,
  type FieldEditDialogPayload,
  type FieldEditDialogProps,
} from './FieldEditDialog.js';
export { FieldRow, type FieldRowField, type FieldRowProps } from './FieldRow.js';
export { RelationshipConfigDialog } from './RelationshipConfigDialog.js';
export {
  SchemaBuilder,
  type SchemaBuilderProps,
  type SchemaBuilderHandle,
} from './SchemaBuilder.js';
export {
  SchemaCanvas,
  type SchemaCanvasHandle,
  type SchemaCanvasProps,
} from './SchemaCanvas.js';
export { SchemaToolbar, type SchemaToolbarProps } from './SchemaToolbar.js';
export {
  SmartEdge,
  SmartEdgeMarkers,
  buildSmartEdgeStyle,
  getMarkerIdsForCardinality,
  type SmartEdgeData,
} from './edges/SmartEdge.js';
export { XY_TOKEN_BINDINGS } from './xyflowTokenBindings.js';
