# Schema-Builder Service + Feature-Gate Hook — @bsuite/schema-registry 0.4.0

**Status:** W (Working) · **Date:** 2026-07-23 · **Package:** `@bsuite/schema-registry@0.4.0`

## Summary

`@bsuite/schema-registry@0.4.0` adds two client-agnostic capabilities so the five
BSuite consumer apps (crm7, bsu, conduit, r8, braden) can stop triplicating
their `src/lib/schemaBuilderService.ts`:

1. **`createSchemaBuilderService(supabase, currentScope)`** — a factory that
   returns the eight schema CRUD/read functions bound to an injected supabase
   client + app scope.
2. **`useFeatureEnabled(supabase, tenantId, featureType, featureKey)`** — a
   fail-open TanStack Query hook over the `is_feature_enabled` Postgres RPC.

Neither imports an app supabase client — the client is always injected, so the
package stays standalone (Vercel clones only the consumer repo, never
`packages/`; see root `CLAUDE.md` → "Shared Packages").

## 1. `createSchemaBuilderService`

```ts
import {
  createSchemaBuilderService,
  APP_SCOPES,
  type SchemaBuilderService,
  type SchemaBuilderAppScope,
  type TenantEntity,
  type TenantEntityRelation,
  type FieldType,
  type EntityFieldDefinition,
} from '@bsuite/schema-registry/react';
```

### Factory

```ts
function createSchemaBuilderService(
  supabase: SupabaseClient,
  currentScope: SchemaBuilderAppScope,
): SchemaBuilderService;
```

Returns an object bound to the injected client + scope:

| Method | Table | Notes |
|---|---|---|
| `getSchemaEntities(tenantId, appScope?)` | `tenant_entities` | tenant-or-null + scope filter; `appScope` defaults to `currentScope` |
| `getSchemaRelations(tenantId, appScope?)` | `tenant_entity_relations` | same filter semantics |
| `getEntityFieldDefinitions(entityType, tenantId)` | `tenant_field_definitions` | `is_active=true`, tenant-or-null, sorted by `sort_order` |
| `createSchemaEntity(entity)` | `tenant_entities` | insert → `.select().single()` |
| `updateSchemaEntity(id, updates)` | `tenant_entities` | stamps `updated_at` |
| `deleteSchemaEntity(id)` | `tenant_entities` | delete by id |
| `createSchemaRelation(relation)` | `tenant_entity_relations` | insert → `.select().single()` |
| `deleteSchemaRelation(id)` | `tenant_entity_relations` | delete by id |

### Semantics mirrored exactly from the BSU original

- **PostgREST no-double-`or`**: PostgREST rejects two root-level `or=` params
  (`or=(A)&or=(B)`) with a 400. For a tenant read with a non-`all` scope the
  service emits a **single nested** expression so both filters `AND` together:

  ```text
  and(or(tenant_id.eq.<uuid>,tenant_id.is.null),or(app_scope.eq.<scope>,app_scope.eq.all))
  ```

  For scope `all` it collapses to `tenant_id.eq.<uuid>,tenant_id.is.null`. A
  `null` tenant uses `.is('tenant_id', null)` plus `.in('app_scope', [scope, 'all'])`.
- **`validateTenantId` UUID guard**: a non-UUID `tenantId` throws
  `Invalid tenant ID format` **before** any client call.

### `AppScope` naming — `r8` vs `r80` (IMPORTANT)

This service's scope union is `('all' | 'crm7' | 'bsu' | 'conduit' | 'r8' | 'braden')`,
matching the DB CHECK constraint on `tenant_entities.app_scope` (and the R80.3
OAuth domain `r8.crm7.app`). It is exported from the module as `AppScope` and
re-exported from the package barrels **aliased to `SchemaBuilderAppScope`**.

The package's pre-existing nav/schema/widget layer (`useTenantNavigation`,
`useTenantSchema`, `TenantLayoutSlot`, `EntityRefCell`) uses a **different**
`AppScope` from `src/react/types.ts` whose R80.3 value is **`r80`**. That union
remains the barrel's `AppScope`. The two are aliased apart to avoid a
name collision; the underlying `r8`-vs-`r80` inconsistency across layers is a
known discrepancy to reconcile in a separate change (it touches widget tests and
consumer nav calls that pass `r80`).

## 2. `useFeatureEnabled`

```ts
import { useFeatureEnabled, type FeatureType } from '@bsuite/schema-registry/react';

function useFeatureEnabled(
  supabase: SupabaseClient,
  tenantId: string | null | undefined,
  featureType: 'page' | 'entity' | 'feature',
  featureKey: string | undefined,
): boolean;
```

Calls `supabase.rpc('is_feature_enabled', { p_tenant_id, p_feature_type, p_feature_key })`.

- `queryKey`: `['feature-enabled', tenantId, featureType, featureKey]`
- `staleTime`: `30_000`
- `enabled`: `!!tenantId && !!featureKey`

**Fail-open doctrine** — returns `true` unless the RPC explicitly returns
`false`. Missing `tenantId`/`featureKey`, RPC error, `null`, or the loading /
disabled state all resolve to enabled. This prevents a transient DB hiccup, a
slow first paint, or an un-provisioned tenant from silently hiding working UI.

| RPC state | Return |
|---|---|
| `tenantId` / `featureKey` missing | `true` (RPC not called) |
| loading / disabled | `true` |
| RPC error | `true` |
| RPC → `null` | `true` |
| RPC → `true` | `true` |
| RPC → `false` | **`false`** |

## Migration path for consumer apps

Each app currently keeps its own `src/lib/schemaBuilderService.ts` with local
`AppScope` / `APP_SCOPES` / entity types and the CRUD functions. To migrate,
replace the body with a single factory call and re-export for back-compat so no
call sites change:

```ts
// app/src/lib/schemaBuilderService.ts  (after migration)
import { createSchemaBuilderService, type SchemaBuilderAppScope } from '@bsuite/schema-registry/react';
import { supabase } from '@/lib/supabase'; // the app's own configured client

export const CURRENT_APP_SCOPE: SchemaBuilderAppScope = 'crm7'; // per app: 'bsu' | 'conduit' | 'r8' | 'braden'

const service = createSchemaBuilderService(supabase, CURRENT_APP_SCOPE);

// Re-export the bound methods so existing imports keep working unchanged.
export const {
  getSchemaEntities,
  getSchemaRelations,
  getEntityFieldDefinitions,
  createSchemaEntity,
  updateSchemaEntity,
  deleteSchemaEntity,
  createSchemaRelation,
  deleteSchemaRelation,
} = service;

// Re-export the shared types.
export type {
  TenantEntity,
  TenantEntityRelation,
  FieldType,
  EntityFieldDefinition,
} from '@bsuite/schema-registry/react';
export { APP_SCOPES } from '@bsuite/schema-registry/react';
export type { SchemaBuilderAppScope as AppScope } from '@bsuite/schema-registry/react';
```

Per the root `CLAUDE.md` "Consumer Package Gate" (§12.2), the migration is only
**done** when every consumer pins `@bsuite/schema-registry@^0.4.0`, each CI is
green, and at least one deployed consumer verifies no `tenant_*` 400s.

## Tests

- `src/react/schemaBuilderService.test.ts` — chainable supabase mock asserting
  the exact `.from/.or/.eq/.is/.in/.order` call patterns for tenant, null-tenant,
  and scope variants, the UUID guard, default-scope binding, and mutation paths.
- `src/react/useFeatureEnabled.test.tsx` — fail-open semantics across missing
  args, loading, explicit `true`/`false`, `null`, and RPC error.

## Gates run

`pnpm build` (tsc -p tsconfig.build.json) · `pnpm typecheck` · `pnpm test` — all green.
