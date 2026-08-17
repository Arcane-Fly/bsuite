# @bsuite/schema-builder

Canonical Schema Builder canvas, hooks, and Zod schemas for BSuite consumer apps
(crm7, business-suite-unified, conduit, R80.3).

Consolidates the four previously-duplicated React Flow schema builders per
[ADR-0008](../../docs/adr/ADR-0008-schema-builder-consolidation.md) and
[`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../../docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md)
Phase 1a. Net removal of ~1500 lines of duplicated code across the suite.

## Installation

```bash
pnpm add @bsuite/schema-builder @xyflow/react @tanstack/react-query @supabase/supabase-js zod lucide-react cmdk
```

Caller apps must also run `pnpm dlx shadcn@latest add command` from an
isolated directory (per the parent monorepo's pnpm-workspace lockfile rules)
if `cmdk` is not already present.

## Usage (thin wrapper — ~30 lines per consumer app)

```tsx
import { SchemaBuilder } from '@bsuite/schema-builder';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTenantId } from '@/hooks/useTenantId';

export default function SchemaBuilderPage() {
  const { tenantId } = useTenantId();
  const navigate = useNavigate();

  return (
    <SchemaBuilder
      supabase={supabase}
      tenantId={tenantId}
      appScope="crm7"
      navigationTargets={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/contacts', label: 'Contacts' },
        { path: '/settings/schema-builder', label: 'Schema Builder' },
      ]}
      onNavigate={(path) => navigate(path)}
    />
  );
}
```

## Current package line: 0.7.0

- `SchemaBuilder` — top-level canvas component (used by consumer thin wrappers)
- `useSchemaController` — canonical hook owning load/save/persist via TanStack
  Query with native optimistic mutations + Supabase Realtime cross-tab sync.
  Follows `queryOptions` factory pattern.
- Zod schemas: `CardinalitySchema`, `EntityFieldSchema`, `EntityNodeDataSchema`,
  `SchemaRelationSchema` (full field-level relationship model used by
  column-level handles and relation authoring).
- Command palette and toolbar foundations for entity search, navigation,
  schema editing, auto-layout, and export workflows.
- Supabase migration `20260503000000_add_field_level_relations.sql`
  (+ rollback twin) in `supabase/migrations/`, with canonical application via
  BSU-owned migrations per the migration README.
- Column-level handles, crow's-foot relation markers, dagre auto-layout,
  `SmartEdge` routing, minimap/zoom-to-fit controls, inline rename, and PNG
  export.
- `FieldCreateDialog` and `FieldEditDialog` for metadata-backed field CRUD.
- Phase 3 field reorder (`Alt+ArrowUp` / `Alt+ArrowDown`) via
  `reorder_entity_fields`, `sort_order`, optimistic rollback, and aria-live
  announcements.
- Phase 3 physical column rename via opt-in dry-run → confirm → wet-run flow,
  `rename_physical_column`, and `schema_mutations_audit`.

## Related signoff docs

- Phase 1a/1b source plan:
  [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../../docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md)
- Consolidation ADR:
  [`docs/adr/ADR-0008-schema-builder-consolidation.md`](../../docs/adr/ADR-0008-schema-builder-consolidation.md)
  (renumbered from ADR-0004 on 2026-08-17 to resolve a duplicate-number collision)
- Phase 3 plan:
  [`docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-plan-v1.00W.md`](../../docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-plan-v1.00W.md)
- Phase 3 signoff:
  [`docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-signoff-v1.00W.md`](../../docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-signoff-v1.00W.md)

## API surface stability

0.7.0 is public but pre-1.0 — minor bumps may adjust shape. Consumer apps pin
to `^0.7.0` and re-verify on minor bumps (per the BSuite Dependency Version
Policy in `AGENTS.md`).
