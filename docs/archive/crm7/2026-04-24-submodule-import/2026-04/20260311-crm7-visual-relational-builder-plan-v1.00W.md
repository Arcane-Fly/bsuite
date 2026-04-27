# Visual Relational Schema Builder

**Date:** 2026-03-11
**Status:** Implementation Complete — All Phases & Red Team Items Resolved
**Author:** Cascade

## 1. The Requirement Gap

The current UI Customization Architecture (`2026-03-04-admin-ui-customization-design.md`) assumes a fixed set of core database tables (`contacts`, `apprentices`, `placements`, etc.) and allows adding JSONB "custom fields" to them. 

**This is insufficient.**

The true requirement from the start has been a **Visual Database Schema Builder** where a Platform Developer or Enterprise Admin can:
1. Visually create *new* entities (new underlying database tables or robust registry entries).
2. Visually map relationships between them (One-to-One, One-to-Many, Many-to-Many).
3. Visually map inheritance (e.g. "Host Employer is a type of Client").
4. Have this dynamically persist so that the UI layout builder (Phase 1) can automatically read the new entities and bind drag-and-drop form fields to them.

## 2. Core Architecture Options

We have two paths for persisting user-created entities in a Postgres/Supabase environment:

### Option A: Physical DDL (Supabase Schema Migrations)
When a user draws a new entity "Vehicle" and relates it to "Employee", the backend actually runs `CREATE TABLE custom_vehicles` and `ALTER TABLE custom_vehicles ADD CONSTRAINT...`

- **Pros:** True relational integrity, works with raw SQL, native foreign keys.
- **Cons:** Extremely dangerous to let UI actions run DDL. Hard to version control across environments. Tenant-isolation is difficult unless using Row Level Security on every dynamic table.

### Option B: Metadata-Driven Registry (The BSuite Path)
We extend the current `tenant_field_definitions` into a broader `tenant_entities` and `tenant_relationships` registry. The actual data is stored in a flexible EAV or JSONB backing table (e.g. `tenant_custom_records`), but the *schema* is strictly defined in the registry.

- **Pros:** Safe. No runtime DDL. Perfect tenant isolation. Easy to version control and package as "BSuite Apps" or templates.
- **Cons:** Requires a robust query layer so the frontend feels like it's querying a real table.

## 3. Recommended Approach: The Metadata Registry

We will build the Visual Relational Modeler on top of a Metadata Registry.

### 3.1 The Schema Registry

```sql
-- Represents a visual node on the canvas (e.g., "Vehicle", "Shift")
CREATE TABLE tenant_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id), -- NULL for platform defaults
  name text NOT NULL, -- e.g. 'vehicle'
  label text NOT NULL, -- e.g. 'Company Vehicle'
  icon text,
  is_system boolean DEFAULT false, -- true for hardcoded tables like 'contacts'
  created_at timestamptz DEFAULT now()
);

-- Represents the edges connecting nodes on the canvas
CREATE TABLE tenant_entity_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  source_entity_id uuid REFERENCES tenant_entities(id),
  target_entity_id uuid REFERENCES tenant_entities(id),
  relation_type text CHECK (relation_type IN ('one_to_one', 'one_to_many', 'many_to_many', 'inherits_from')),
  source_label text, -- e.g. 'Assigned Vehicles'
  target_label text, -- e.g. 'Driver'
  created_at timestamptz DEFAULT now()
);

-- The fields belonging to the entity (extends current tenant_field_definitions)
ALTER TABLE tenant_field_definitions 
ADD COLUMN entity_id uuid REFERENCES tenant_entities(id);
```

### 3.2 The Visual Modeler UI (XYFlow / React Flow)

The UI is a true node-based graph editor (like Supabase Schema Visualizer or Directus).

- **Nodes:** Represent entries in `tenant_entities` (both system tables like `contacts` and custom entities).
- **Edges:** Represent entries in `tenant_entity_relations`.
- **Interactions:**
  - Drag node onto canvas → `INSERT INTO tenant_entities`.
  - Drag handle from Node A to Node B → Opens "Configure Relationship" dialog → `INSERT INTO tenant_entity_relations`.
  - Click Node → Opens property panel to add custom fields (`tenant_field_definitions`).

### 3.3 Inheritance Mapping
If the user connects "Host Employer" to "Client" with an `inherits_from` edge, the UI layer knows that when building a Form Layout for "Host Employer", it must inherit all fields defined on "Client" automatically.

## 4. Implementation Sequencing

1. ✅ **DB Foundation:** Migration `20260311053135_visual_relational_builder.sql` creates `tenant_entities` and `tenant_entity_relations`. System entities seeded (contact, lead, client, apprentice, employer, placement, project, task, contract, funding_claim, funding_source, person). RLS policies enforce tenant isolation. `tenant_field_definitions.entity_id` FK added.
2. ✅ **Visual Canvas:** XYFlow (`@xyflow/react`) canvas at `/settings/schema-builder` route. Grid background, MiniMap, Controls, D2C Neon Electric CSS overrides.
3. ✅ **Node Management:** Create/Edit/Delete entities via `EntityPropertiesPanel`. Position persistence to `metadata.position`. System entities read-only.
4. ✅ **Edge Management:** `RelationshipConfigDialog` opens on connect. User selects relation type (1:1, 1:N, N:N, inherits_from) and optional source/target labels. Edges styled with D2C theme tokens. Animated edges for inheritance.
5. ✅ **UI Builder Integration:** `getEntityFieldDefsWithInheritance()` resolves fields for an entity by walking the `inherits_from` relation chain. `form-layout-detail.tsx` uses this to load inherited fields so custom entities automatically receive parent entity fields in the FormLayoutBuilder. `EnhancedFieldDefinition.entity_id` links fields to specific tenant entities.

## 5. D2C Styling Compliance

All schema builder components use the D2C Neon Electric design system:
- **EntityNode:** Shell elevation tokens (`bg-shell-elevated`, `shadow-elev-2`), accent ring (`ring-accent-primary`), tenant primary icon color, `BorderBeam` effect on selection.
- **EntityPropertiesPanel:** Shell surface tokens, shell borders, accent save button.
- **RelationshipConfigDialog:** Standard Dialog pattern with accent-primary icon, shell-aware labels.
- **ReactFlow Canvas:** D2C CSS overrides in `theme.css` for controls, minimap, edges, handles, and selection — dark mode aware.
- **Edge Display:** Human-readable labels (1:1, 1:N, N:N, ⬆ inherits), D2C stroke colors, label backgrounds using shell tokens.

## 6. Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260311053135_visual_relational_builder.sql` | DB schema, RLS, seeding |
| `src/services/schemaBuilderService.ts` | CRUD for entities and relations |
| `src/services/uiConfigService.ts` | Field resolution with inheritance via `getEntityFieldDefsWithInheritance()` |
| `src/pages/settings/schema-builder/index.tsx` | Main canvas page |
| `src/pages/settings/schema-builder/components/EntityNode.tsx` | Custom XYFlow node |
| `src/pages/settings/schema-builder/components/EntityPropertiesPanel.tsx` | Entity edit panel |
| `src/pages/settings/schema-builder/components/RelationshipConfigDialog.tsx` | Relationship type/label dialog |
| `src/pages/settings/form-layout-detail.tsx` | Form builder page — uses inheritance-aware field loading |
| `src/types/ui-customization.ts` | `EnhancedFieldDefinition.entity_id` FK field |
| `src/styles/theme.css` | D2C Neon Electric overrides for ReactFlow |
| `src/components/pipeline/KanbanBoard.tsx` | Sales Pipeline — D2C token-driven stage colors |
| `src/types/supabase.ts` | TypeScript types (auto-generated) |
| `supabase/migrations/20260313005700_schema_builder_indexes.sql` | FK indexes for schema builder tables |
| `supabase/migrations/20260313031700_no_self_inheritance.sql` | CHECK constraint preventing self-inheritance |

## 7. Red Team Audit — Findings & Remediation

A full red team review was conducted on the implementation. Findings categorized by severity:

### Critical (Fixed)
| # | Finding | Remediation |
|---|---------|-------------|
| 1 | `onNodesChange` ignored `NodeRemoveChange` — node delete from keyboard/context-menu orphaned DB records | Added `NodeRemoveChange` handler that calls `deleteSchemaEntity()` and cleans up edges |
| 2 | Entity deletion was one-click with no confirmation | Added `AlertDialog` confirmation with destructive action styling |
| 3 | Self-relationship allowed (entity → itself as `inherits_from`) | `onConnect` rejects `source === target`; dialog shows error banner and disables submit for self-inheritance |

### Important (Fixed)
| # | Finding | Remediation |
|---|---------|-------------|
| 4 | No maxLength on label inputs — potential long-string abuse | `maxLength={100}` on inputs + `.slice(0, 100)` server-side guard |
| 5 | Edge strokes used raw `--neon-electric-purple` instead of semantic `--accent-secondary` | Replaced both occurrences |
| 6 | Schema Builder not discoverable — no sidebar nav link | Added to Settings navigation group |
| 7 | No empty state guidance on blank canvas | Shows icon + text prompt when `nodes.length === 0` |
| 8 | FK columns on `tenant_entity_relations` and `tenant_field_definitions` had no indexes | New migration `20260313005700_schema_builder_indexes.sql` |
| 9 | `form-layout-detail.tsx` silently swallowed field-loading errors | Added `toast.error()` in catch |
| 10 | Entity name input accepted invalid DB identifiers (e.g. starting with digit/underscore) | Added regex validation + error display, save button disabled on invalid |

### Deferred (Completed)
| # | Finding | Remediation |
|---|---------|-------------|
| 11 | Missing aria-labels and keyboard navigation | Added `role`, `aria-label`, `aria-selected`, `tabIndex`, `aria-required`, `aria-invalid`, `aria-describedby`, `aria-live` across EntityNode, EntityPropertiesPanel, RelationshipConfigDialog, and main canvas. `htmlFor`/`id` pairs on all form fields. |
| 12 | No DB CHECK constraint preventing self-inheritance | New migration `20260313031700_no_self_inheritance.sql` adds CHECK constraint on `tenant_entity_relations` |
| 13 | Expanded ReactFlow dark mode CSS coverage | Added `.dark` overrides for controls, minimap, edges, handles, connection paths, selection box, background, attribution. Focus-visible outlines for keyboard navigation. |
| 14 | Entity name uniqueness check against loaded entities | `EntityPropertiesPanel` now receives `existingNames` prop and validates against it during creation |
