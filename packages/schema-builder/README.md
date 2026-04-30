# @bsuite/schema-builder

Canonical Schema Builder canvas, hooks, and Zod schemas for BSuite consumer apps
(crm7, business-suite-unified, conduit, R80.3).

Consolidates the four previously-duplicated React Flow schema builders per
[ADR-0004](../../docs/adr/ADR-0004-schema-builder-consolidation.md) and
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

## What's in 0.1.0 (Phase 1a)

- `SchemaBuilder` — top-level canvas component (used by consumer thin wrappers)
- `useSchemaController` — canonical hook owning load/save/persist via TanStack
  Query with native optimistic mutations + Supabase Realtime cross-tab sync.
  Follows `queryOptions` factory pattern.
- Zod schemas: `CardinalitySchema`, `EntityFieldSchema`, `EntityNodeDataSchema`,
  `SchemaRelationSchema` (full field-level relationship model ready for
  Phase 1b column-level handles).
- Minimal `CommandPalette` (Cmd+K / Ctrl+K) — Phase 1a subset only:
  `Find Entity` + `Go to <page-path>`. Full command catalogue ships in
  Phase 1b / 3 / 5.
- Supabase migration `20260503000000_add_field_level_relations.sql`
  (+ rollback twin) in `supabase/migrations/`. Must be applied to the dev
  Supabase project before Phase 1b starts. See migration README for the
  BSU-owned application path.

## What's coming in 0.2.0 (Phase 1b)

- Column-level handles (Airtable / dbdiagram parity) — `fields[]` already
  typed by `EntityNodeDataSchema`.
- Crow's-foot cardinality markers at edge endpoints.
- Dagre auto-layout (`@dagrejs/dagre@^3.0.0`, `rankdir: 'LR'`).
- `useEntityColumns` hook for live `information_schema` reflection.
- `SmartEdge.tsx` routing + PNG export + full Cmd+K command catalogue.

## API surface stability

0.1.0 is a public API but pre-1.0 — minor bumps may adjust shape. Consumer
apps pin to `^0.1.0` and re-verify on minor bumps (per the BSuite Dependency
Version Policy in `AGENTS.md`).
