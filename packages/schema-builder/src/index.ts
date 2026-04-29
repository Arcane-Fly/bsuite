/**
 * @bsuite/schema-builder — public API barrel
 *
 * Exports all types, the service class, the controller hook, and all
 * React components. Consumer apps import from '@bsuite/schema-builder'.
 */

// Types
export type {
  EntityField,
  CreateFieldPayload,
  UpdateFieldPayload,
  FieldType,
  SchemaController,
  ReorderFieldEventDetail,
  SupabaseLike,
  SupabaseError,
  SupabaseResult,
  SupabaseQueryChain,
} from './types.js'

// Service
export { SchemaService } from './service.js'

// Hook
export { useSchemaController } from './hooks/useSchemaController.js'
export type { UseSchemaControllerOptions } from './hooks/useSchemaController.js'

// Components
export { FieldRow } from './components/FieldRow.js'
export type { FieldRowProps } from './components/FieldRow.js'

export { FieldCreateDialog } from './components/FieldCreateDialog.js'
export type { FieldCreateDialogProps } from './components/FieldCreateDialog.js'

export { FieldEditDialog } from './components/FieldEditDialog.js'
export type { FieldEditDialogProps } from './components/FieldEditDialog.js'

export { SchemaCanvas } from './components/SchemaCanvas.js'
export type { SchemaCanvasProps } from './components/SchemaCanvas.js'
