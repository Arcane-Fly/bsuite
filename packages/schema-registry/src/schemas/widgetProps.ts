import { z } from 'zod';

// Safe text — strips all HTML tags. DOMPurify is only available browser-side,
// so we do a simple regex strip on server and DOMPurify on client.
const SafeText = z.string().transform((val) => {
  if (typeof window !== 'undefined' && typeof (window as unknown as Record<string, unknown>)['DOMPurify'] !== 'undefined') {
    return ((window as unknown as Record<string, unknown>)['DOMPurify'] as { sanitize: (v: string, o: object) => string }).sanitize(val, { ALLOWED_TAGS: [] });
  }
  // Server-side: strip HTML tags with regex
  return val.replace(/<[^>]*>/g, '');
});

export const DataTablePropsSchema = z.object({
  type: z.literal('DataTable'),
  entity: z.string().min(1),
  columns: z.array(z.string()),
  filters: z.array(z.object({ column: z.string(), op: z.string(), value: z.unknown() })).optional(),
  sort: z.object({ column: z.string(), direction: z.enum(['asc', 'desc']) }).optional(),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const StatGridPropsSchema = z.object({
  type: z.literal('StatGrid'),
  entity: z.string().min(1),
  metric: z.union([z.literal('count'), z.string().regex(/^(sum|avg):[a-zA-Z_]+$/)]),
  group_by: SafeText.optional(),
  filters: z.array(z.object({ column: z.string(), op: z.string(), value: z.unknown() })).optional(),
});

export const EntitySelectorPropsSchema = z.object({
  type: z.literal('EntitySelector'),
  entity: z.string().min(1),
  display_field: z.string().min(1),
  target_field: z.string().min(1).refine(
    (v) => !['tenant_id', 'id', 'user_id', 'auth_id'].includes(v),
    { message: 'target_field cannot be a system column' }
  ),
});

export const CardPropsSchema = z.object({
  type: z.literal('Card'),
  title: SafeText,
  collapsible: z.boolean().default(false),
});

export const FormRendererPropsSchema = z.object({
  type: z.literal('FormRenderer'),
  entity: z.string().min(1),
  fields: z.array(z.string()).min(1).refine(
    (fields) => !fields.some(f => ['tenant_id', 'id', 'user_id', 'auth_id'].includes(f)),
    { message: 'fields cannot include system columns' }
  ),
  submit_label: SafeText.default('Submit'),
});

// AppScope allow-list — mirrors types.ts AppScope union but re-declared here to
// avoid circular imports between schema + types layers.
const AppScopeEnum = z.enum(['bsu', 'crm7', 'conduit', 'r80', 'braden', 'all']);

export const EntityRefCellPropsSchema = z.object({
  type: z.literal('EntityRefCell'),
  // tenant scoping — server-side RLS still applies; this is a UX hint only.
  tenant_id: z.uuid().optional(),
  foreign_app_scope: AppScopeEnum,
  // Whitelist of entities this cell can cross-read. Server RLS enforces auth.
  entity: z.string().min(1),
  entity_id: z.uuid(),
  // Which field's value to display. Must not be a system column.
  display_field: z.string().min(1).refine(
    (v) => !['tenant_id', 'user_id', 'auth_id'].includes(v),
    { message: 'display_field cannot be a system column' }
  ),
  // Optional deep-link target override; default is `/${foreign_app_scope}/${entity}/${entity_id}`.
  href_template: SafeText.optional(),
});

export const SchemaFieldAdderPropsSchema = z.object({
  type: z.literal('SchemaFieldAdder'),
  widget_id: z.string().min(1),
  entity_id: z.uuid(),
  allowed_types: z.array(z.enum(['text', 'number', 'date', 'link', 'boolean', 'enum'])).default(
    ['text', 'number', 'date', 'link', 'boolean', 'enum']
  ),
  button_label: SafeText.default('+ Add field'),
});

export const WidgetPropsSchema = z.discriminatedUnion('type', [
  DataTablePropsSchema,
  StatGridPropsSchema,
  EntitySelectorPropsSchema,
  CardPropsSchema,
  FormRendererPropsSchema,
  EntityRefCellPropsSchema,
  SchemaFieldAdderPropsSchema,
]);

export const LayoutJsonSchema = z.object({
  widgets: z.array(z.object({
    id: z.string(),
    type: z.string(),
    // props is intentionally typed as Record<string, unknown> — each widget
    // type has its own props schema (see WidgetPropsSchema variants above).
    // LayoutJsonSchema validates the outer envelope; individual props are
    // narrowed per-type when the widget is rendered.
    props: z.record(z.string(), z.unknown()),
    position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  })),
});

export type WidgetProps = z.infer<typeof WidgetPropsSchema>;
export type LayoutJson = z.infer<typeof LayoutJsonSchema>;
