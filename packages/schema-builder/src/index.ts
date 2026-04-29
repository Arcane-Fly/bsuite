// Components
export {
  EntityNode,
  RelationshipConfigDialog,
  SchemaCanvas,
  CommandPalette,
  SchemaBuilder,
} from './components/index.js';
export type {
  EntityNodeData,
  EntityNodeType,
  SchemaCanvasHandle,
  SchemaCanvasProps,
  CommandPaletteProps,
  CommandPaletteNavTarget,
  SchemaBuilderProps,
} from './components/index.js';

// Hooks
export {
  useSchemaController,
  useRealtimeSubscription,
  schemaEntitiesOptions,
  schemaRelationsOptions,
} from './hooks/index.js';
export type {
  UseSchemaControllerOptions,
  SchemaController,
  UseRealtimeSubscriptionOptions,
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
  TenantEntity,
  TenantEntityRelation,
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
} from './service.js';
export type { LooseSupabaseClient } from './service.js';
