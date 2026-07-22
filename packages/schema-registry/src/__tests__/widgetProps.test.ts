import { describe, it, expect } from 'vitest';
import {
  DataTablePropsSchema,
  StatGridPropsSchema,
  EntitySelectorPropsSchema,
  CardPropsSchema,
  FormRendererPropsSchema,
  EntityRefCellPropsSchema,
  SchemaFieldAdderPropsSchema,
  WidgetPropsSchema,
  LayoutJsonSchema,
} from '../schemas/widgetProps.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const VALID_UUID = '00000000-0000-4000-8000-000000000001';

// ---------------------------------------------------------------------------
// DataTablePropsSchema
// ---------------------------------------------------------------------------

describe('DataTablePropsSchema', () => {
  it('accepts a minimal valid object', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['name', 'email'],
    });
    expect(result.success).toBe(true);
  });

  it('defaults page_size to 25', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['id'],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page_size).toBe(25);
  });

  it('accepts explicit page_size within bounds', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['id'],
      page_size: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page_size).toBe(50);
  });

  it('rejects page_size > 100', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['id'],
      page_size: 101,
    });
    expect(result.success).toBe(false);
  });

  it('rejects page_size < 1', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['id'],
      page_size: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty entity', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: '',
      columns: ['id'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional filters and sort', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['name'],
      filters: [{ column: 'status', op: 'eq', value: 'active' }],
      sort: { column: 'name', direction: 'asc' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid sort direction', () => {
    const result = DataTablePropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['name'],
      sort: { column: 'name', direction: 'random' },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StatGridPropsSchema
// ---------------------------------------------------------------------------

describe('StatGridPropsSchema', () => {
  it('accepts count metric', () => {
    const result = StatGridPropsSchema.safeParse({
      type: 'StatGrid',
      entity: 'leads',
      metric: 'count',
    });
    expect(result.success).toBe(true);
  });

  it('accepts sum:field metric', () => {
    const result = StatGridPropsSchema.safeParse({
      type: 'StatGrid',
      entity: 'leads',
      metric: 'sum:revenue',
    });
    expect(result.success).toBe(true);
  });

  it('accepts avg:field metric', () => {
    const result = StatGridPropsSchema.safeParse({
      type: 'StatGrid',
      entity: 'leads',
      metric: 'avg:score',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid metric format', () => {
    const result = StatGridPropsSchema.safeParse({
      type: 'StatGrid',
      entity: 'leads',
      metric: 'max:value',
    });
    expect(result.success).toBe(false);
  });

  it('rejects metric with spaces', () => {
    const result = StatGridPropsSchema.safeParse({
      type: 'StatGrid',
      entity: 'leads',
      metric: 'sum:my field',
    });
    expect(result.success).toBe(false);
  });

  it('strips HTML tags from group_by via SafeText (server-side path)', () => {
    // In node/jsdom, window.DOMPurify is undefined — the regex strip runs.
    const result = StatGridPropsSchema.safeParse({
      type: 'StatGrid',
      entity: 'leads',
      metric: 'count',
      group_by: '<b>status</b>',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.group_by).toBe('status');
  });
});

// ---------------------------------------------------------------------------
// EntitySelectorPropsSchema — security: system column blocklist
// ---------------------------------------------------------------------------

describe('EntitySelectorPropsSchema', () => {
  it('accepts valid object', () => {
    const result = EntitySelectorPropsSchema.safeParse({
      type: 'EntitySelector',
      entity: 'contacts',
      display_field: 'name',
      target_field: 'contact_id',
    });
    expect(result.success).toBe(true);
  });

  it.each(['tenant_id', 'id', 'user_id', 'auth_id'])(
    'rejects target_field = %s (system column)',
    (col) => {
      const result = EntitySelectorPropsSchema.safeParse({
        type: 'EntitySelector',
        entity: 'contacts',
        display_field: 'name',
        target_field: col,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('system column');
      }
    }
  );

  it('rejects empty entity', () => {
    const result = EntitySelectorPropsSchema.safeParse({
      type: 'EntitySelector',
      entity: '',
      display_field: 'name',
      target_field: 'ref_id',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CardPropsSchema
// ---------------------------------------------------------------------------

describe('CardPropsSchema', () => {
  it('accepts valid object', () => {
    const result = CardPropsSchema.safeParse({
      type: 'Card',
      title: 'My Card',
    });
    expect(result.success).toBe(true);
  });

  it('defaults collapsible to false', () => {
    const result = CardPropsSchema.safeParse({
      type: 'Card',
      title: 'Test',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.collapsible).toBe(false);
  });

  it('accepts explicit collapsible=true', () => {
    const result = CardPropsSchema.safeParse({
      type: 'Card',
      title: 'Test',
      collapsible: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.collapsible).toBe(true);
  });

  it('strips HTML tags from title (regex path — tag delimiters removed, inner text kept)', () => {
    // SafeText uses `/<[^>]*>/g` server-side: strips the tag tokens but keeps
    // the text nodes between them. '<b>My Card</b>' → 'My Card'.
    const result = CardPropsSchema.safeParse({
      type: 'Card',
      title: '<b>My Card</b>',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe('My Card');
  });
});

// ---------------------------------------------------------------------------
// FormRendererPropsSchema — security: system column blocklist in fields
// ---------------------------------------------------------------------------

describe('FormRendererPropsSchema', () => {
  it('accepts valid object', () => {
    const result = FormRendererPropsSchema.safeParse({
      type: 'FormRenderer',
      entity: 'leads',
      fields: ['name', 'email'],
    });
    expect(result.success).toBe(true);
  });

  it('defaults submit_label to "Submit"', () => {
    const result = FormRendererPropsSchema.safeParse({
      type: 'FormRenderer',
      entity: 'leads',
      fields: ['name'],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.submit_label).toBe('Submit');
  });

  it('strips HTML from custom submit_label', () => {
    const result = FormRendererPropsSchema.safeParse({
      type: 'FormRenderer',
      entity: 'leads',
      fields: ['name'],
      submit_label: '<b>Save</b>',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.submit_label).toBe('Save');
  });

  it('rejects empty fields array', () => {
    const result = FormRendererPropsSchema.safeParse({
      type: 'FormRenderer',
      entity: 'leads',
      fields: [],
    });
    expect(result.success).toBe(false);
  });

  it.each(['tenant_id', 'id', 'user_id', 'auth_id'])(
    'rejects fields containing system column %s',
    (col) => {
      const result = FormRendererPropsSchema.safeParse({
        type: 'FormRenderer',
        entity: 'leads',
        fields: ['name', col],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('system columns');
      }
    }
  );
});

// ---------------------------------------------------------------------------
// EntityRefCellPropsSchema — security: display_field blocklist + AppScope
// ---------------------------------------------------------------------------

describe('EntityRefCellPropsSchema', () => {
  const baseValid = {
    type: 'EntityRefCell' as const,
    foreign_app_scope: 'crm7' as const,
    entity: 'contacts',
    entity_id: VALID_UUID,
    display_field: 'name',
  };

  it('accepts valid object', () => {
    const result = EntityRefCellPropsSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('accepts optional tenant_id as UUID', () => {
    const result = EntityRefCellPropsSchema.safeParse({
      ...baseValid,
      tenant_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID tenant_id', () => {
    const result = EntityRefCellPropsSchema.safeParse({
      ...baseValid,
      tenant_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it.each(['tenant_id', 'user_id', 'auth_id'])(
    'rejects display_field = %s (system column)',
    (col) => {
      const result = EntityRefCellPropsSchema.safeParse({
        ...baseValid,
        display_field: col,
      });
      expect(result.success).toBe(false);
    }
  );

  it.each(['bsu', 'crm7', 'conduit', 'r8', 'braden', 'all'] as const)(
    'accepts app scope %s',
    (scope) => {
      const result = EntityRefCellPropsSchema.safeParse({
        ...baseValid,
        foreign_app_scope: scope,
      });
      expect(result.success).toBe(true);
    }
  );

  it('rejects unknown app scope', () => {
    const result = EntityRefCellPropsSchema.safeParse({
      ...baseValid,
      foreign_app_scope: 'myapp',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID entity_id', () => {
    const result = EntityRefCellPropsSchema.safeParse({
      ...baseValid,
      entity_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('strips HTML from href_template', () => {
    const result = EntityRefCellPropsSchema.safeParse({
      ...baseValid,
      href_template: '<b>/crm7/contacts/1</b>',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.href_template).toBe('/crm7/contacts/1');
  });
});

// ---------------------------------------------------------------------------
// SchemaFieldAdderPropsSchema
// ---------------------------------------------------------------------------

describe('SchemaFieldAdderPropsSchema', () => {
  it('accepts valid object', () => {
    const result = SchemaFieldAdderPropsSchema.safeParse({
      type: 'SchemaFieldAdder',
      widget_id: 'w1',
      entity_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('defaults button_label to "+ Add field"', () => {
    const result = SchemaFieldAdderPropsSchema.safeParse({
      type: 'SchemaFieldAdder',
      widget_id: 'w1',
      entity_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.button_label).toBe('+ Add field');
  });

  it('defaults allowed_types to all six types', () => {
    const result = SchemaFieldAdderPropsSchema.safeParse({
      type: 'SchemaFieldAdder',
      widget_id: 'w1',
      entity_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowed_types).toEqual(
        ['text', 'number', 'date', 'link', 'boolean', 'enum']
      );
    }
  });

  it('accepts a restricted allowed_types subset', () => {
    const result = SchemaFieldAdderPropsSchema.safeParse({
      type: 'SchemaFieldAdder',
      widget_id: 'w1',
      entity_id: VALID_UUID,
      allowed_types: ['text', 'number'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown type in allowed_types', () => {
    const result = SchemaFieldAdderPropsSchema.safeParse({
      type: 'SchemaFieldAdder',
      widget_id: 'w1',
      entity_id: VALID_UUID,
      allowed_types: ['text', 'image'],
    });
    expect(result.success).toBe(false);
  });

  it('strips HTML from button_label', () => {
    const result = SchemaFieldAdderPropsSchema.safeParse({
      type: 'SchemaFieldAdder',
      widget_id: 'w1',
      entity_id: VALID_UUID,
      button_label: '<em>+ Add</em>',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.button_label).toBe('+ Add');
  });
});

// ---------------------------------------------------------------------------
// WidgetPropsSchema — discriminated union routing
// ---------------------------------------------------------------------------

describe('WidgetPropsSchema discriminated union', () => {
  it('routes DataTable type to DataTablePropsSchema', () => {
    const result = WidgetPropsSchema.safeParse({
      type: 'DataTable',
      entity: 'leads',
      columns: ['id'],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('DataTable');
  });

  it('routes StatGrid type to StatGridPropsSchema', () => {
    const result = WidgetPropsSchema.safeParse({
      type: 'StatGrid',
      entity: 'leads',
      metric: 'count',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('StatGrid');
  });

  it('routes Card type to CardPropsSchema', () => {
    const result = WidgetPropsSchema.safeParse({
      type: 'Card',
      title: 'hello',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('Card');
  });

  it('rejects unknown widget type', () => {
    const result = WidgetPropsSchema.safeParse({
      type: 'Unknown',
      entity: 'leads',
    });
    expect(result.success).toBe(false);
  });

  it('applies schema-level validation (security refine) inside the union', () => {
    // EntitySelector with a system column target_field should fail inside the union
    const result = WidgetPropsSchema.safeParse({
      type: 'EntitySelector',
      entity: 'contacts',
      display_field: 'name',
      target_field: 'tenant_id',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LayoutJsonSchema
// ---------------------------------------------------------------------------

describe('LayoutJsonSchema', () => {
  it('accepts a valid layout', () => {
    const result = LayoutJsonSchema.safeParse({
      widgets: [
        {
          id: 'w1',
          type: 'DataTable',
          props: { entity: 'leads', columns: ['id'] },
          position: { x: 0, y: 0, w: 4, h: 2 },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty widgets array', () => {
    const result = LayoutJsonSchema.safeParse({ widgets: [] });
    expect(result.success).toBe(true);
  });

  it('rejects a widget entry missing position', () => {
    const result = LayoutJsonSchema.safeParse({
      widgets: [
        { id: 'w1', type: 'Card', props: {} },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a widget entry missing id', () => {
    const result = LayoutJsonSchema.safeParse({
      widgets: [
        { type: 'Card', props: {}, position: { x: 0, y: 0, w: 1, h: 1 } },
      ],
    });
    expect(result.success).toBe(false);
  });
});
