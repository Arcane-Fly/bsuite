// Components
export {
  EntityNode,
  EntityPropertiesPanel,
  RelationshipConfigDialog,
  SchemaCanvas,
  CommandPalette,
  SchemaBuilder,
  SchemaToolbar,
  FieldRow,
  FieldCreateDialog,
  FieldEditDialog,
  FIELD_TYPE_OPTIONS,
  SNAKE_CASE_RE,
  SmartEdge,
  SmartEdgeMarkers,
  buildSmartEdgeStyle,
  getMarkerIdsForCardinality,
  XY_TOKEN_BINDINGS,
} from './components/index.js';
export type {
  EntityNodeData,
  EntityNodeType,
  EntityPropertiesPanelProps,
  SchemaCanvasHandle,
  SchemaCanvasProps,
  CommandPaletteProps,
  CommandPaletteNavTarget,
  SchemaBuilderProps,
  SchemaBuilderHandle,
  SchemaToolbarProps,
  FieldRowProps,
  FieldRowField,
  FieldCreateDialogProps,
  FieldCreateDialogPayload,
  FieldEditDialogProps,
  FieldEditDialogPayload,
  SmartEdgeData,
} from './components/index.js';

// Utils
export { computeDagreLayout, exportCanvasToPng, defaultPngFilename } from './utils/index.js';
export type { AutoLayoutOptions } from './utils/index.js';

// Hooks
export {
  useSchemaController,
  useRealtimeSubscription,
  useSchemaReflection,
  useDocumentColorMode,
  schemaEntitiesOptions,
  schemaRelationsOptions,
  entityFieldsOptions,
  tenantFieldsOptions,
} from './hooks/index.js';
export type {
  UseSchemaControllerOptions,
  SchemaController,
  UseRealtimeSubscriptionOptions,
  ReflectedColumn,
  UseSchemaReflectionOptions,
  UseSchemaReflectionResult,
  DocumentColorMode,
} from './hooks/index.js';

// Zod schemas (re-exported for convenience)
export {
  CardinalitySchema,
  ReferentialActionSchema,
  EntityFieldSchema,
  EntityNodeDataSchema,
  SchemaRelationSchema,
  ZOD_TO_DB_ALIASES,
  toDbRelation,
  fromDbRelation,
} from './schemas.js';
export type {
  Cardinality,
  ReferentialAction,
  EntityField,
  EntityNodeData as EntityNodeDataZod,
  SchemaRelation,
} from './schemas.js';

// Shared types
export type {
  AppScope,
  FieldType,
  TenantEntity,
  TenantEntityRelation,
  TenantFieldDefinition,
  EntityMetadata,
  RelationType,
  SchemaControllerOptions,
} from './types.js';
export { APP_SCOPES } from './types.js';

// Service (for advanced consumers who want direct CRUD outside the hook)
export {
  getSchemaEntities,
  getSchemaRelations,
  createSchemaEntity,
  updateSchemaEntity,
  deleteSchemaEntity,
  createSchemaRelation,
  updateSchemaRelation,
  deleteSchemaRelation,
  getEntityFields,
  getTenantFields,
  createEntityField,
  updateEntityField,
  deleteEntityField,
  reorderEntityFields,
  renamePhysicalColumn,
  countPhysicalTableRegistrations,
  getSchemaLayout,
  resolveLayout,
  saveSchemaLayoutPosition,
  updatePlatformEntityLabel,
} from './service.js';
export type {
  LooseSupabaseClient,
  RenamePhysicalColumnResult,
  TenantSchemaLayoutRow,
} from './service.js';
