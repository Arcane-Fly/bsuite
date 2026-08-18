# ADR-0002 — Schema-Builder Ownership

**Status:** Accepted (2026-05-01)
**Related:** ADR-0001 (Page-Builder Ownership); `docs/20260227-dry-one-shot-architecture-v1.04A.md` §11 Phase 5; `docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md`

---

## Context

Two schema-authoring surfaces currently exist:

| System | Tables | Owner | Purpose |
|---|---|---|---|
| **CRM7 schema-builder (ERD)** | `tenant_entities`, `tenant_relations` | `crm7` | Entity-relationship authoring: which entities a tenant has, how they link |
| **BSU tenant-field-definitions** | `tenant_field_definitions` | `bsu` | Per-tenant custom field metadata for form extensions |

Finish-line roadmap P1-4's subagent investigation (2026-04-25) clarified they are **different concepts** — not competing surfaces. The ERD builder defines *entity shape*; field-definitions extend *existing entities with per-tenant columns*.

## Decision

**The two surfaces stay separate but are co-located for authoring UX:**

1. **CRM7 owns `tenant_entities` + `tenant_relations`** — the ERD builder at `crm7/src/pages/settings/schema-builder/*` remains canonical.
2. **CRM7 also owns `tenant_field_definitions`** — ownership transfers from BSU to CRM7 in a one-time migration.
3. **BSU schema-builder UI surface (`Developer/Schema.tsx`) is removed** — BSU becomes a read-only consumer.
4. **Both authoring surfaces are unified under `crm7/src/pages/settings/schema-builder/`** — the ERD tab + a new Fields tab, sharing navigation.

### Option A (leave `tenant_field_definitions` with BSU) — rejected

The status quo pattern has BSU author `tenant_field_definitions` via its Developer portal, while CRM7 authors `tenant_entities`/`tenant_relations`. This Option A was considered and rejected:

- A tenant admin adding a custom field on `apprentices` must today hop between BSU (to define the field) and CRM7 (to see the entity). The cognitive cost is real and avoidable.
- Field definitions reference entity IDs (FK `tenant_field_definitions.entity_id → tenant_entities.id` per P1-75). Split authoring means the FK target lives in one app and the FK row lives in another — cross-app consistency is harder to enforce than single-app.
- BSU's Developer portal is already documented as less mature than CRM7's (see ADR-0001 context). Adding more authoring surface to BSU's weaker portal compounds the problem rather than fixing it.
- There is no business reason `tenant_field_definitions` must live with platform admin — it is tenant-scoped operational data, same as `tenant_entities`.

## Rationale

1. **Single authoring location for all schema concerns** reduces user confusion — "where do I define this?" has one answer.
2. **CRM7 is the primary entity-consumer** — the same user who adds a custom field on `apprentices` is almost always the user authoring apprentice forms and reports. Co-locating the authoring is the one-shot doctrine in action.
3. **BSU Platform-Kit remains** for platform-admin-level controls (feature flags, tenant provisioning) — it does not need schema-authoring duplication.
4. **No user workflow regresses** — BSU's current Schema tab users are a subset of CRM7 Developer-Portal users.

## Consequences

### Atomic removal disallows

- Keeping the BSU `Developer/Schema.tsx` UI as a "read-only" interim view while CRM7 builds out. Either CRM7 has the Fields tab live or the BSU surface remains; never both.
- Adding a `@deprecated` JSDoc marker to the BSU schema-builder components — they get deleted outright.
- Splitting field-definition columns across both apps (e.g. "leave the writes in BSU, add the reads in CRM7"). Both read and write move atomically.
- A soft-flag toggle to route field-definition writes to one app or the other during a transition window.

### Rollback procedure

If the coordinated BSU + CRM7 PR set fails partway (e.g. CRM7 Fields tab merges but BSU deletion CI breaks), the single-commit revert on each repo removes the additions and restores the deletions. The `tenant_field_definitions` table itself is not schema-changed by this ADR, only re-authored — so no data rollback is required. Ownership-map flip in `packages/dry-lint/src/ownership-map.json` reverts in the same commit as the CRM7 Fields tab revert.

### Atomic replace-and-remove

Single coordinated PR set:

1. **Supabase migration** — update ownership-map for `tenant_field_definitions` to `crm7` (CRUD) with BSU as reader; no DB schema change required (table stays as-is).
2. **BSU removal** — delete `business-suite-unified/src/pages/Developer/Schema.tsx` + `Schema.test.tsx`, remove `/developer/schema` route, remove Schema tab from Developer portal nav.
3. **CRM7 additions** — add `crm7/src/pages/settings/schema-builder/fields/` (new sub-route) reading/writing `tenant_field_definitions` using the same EntitySelector-friendly UX as the ERD tab. Test suite added.
4. **Ownership-map update** — `packages/dry-lint/src/ownership-map.json` flips `tenant_field_definitions` owner from `bsu` → `crm7`.
5. **DRY spec update** — `20260227-dry-one-shot-architecture-v1.04A.md` §1 row updated.

No `@deprecated` BSU components. No dual-authoring period. BSU surface is deleted in the same PR that CRM7 gains the replacement.

### Pending (not this ADR)

The relationship between `tenant_field_definitions.entity_id` → `tenant_entities.id` (P1-75 in the outstanding-work ledger) gets a proper FK constraint in the same PR set. This closes a latent consistency gap.

### Tier-3 EntitySelector implications

Custom fields defined via `tenant_field_definitions` propagate into all EntitySelectors that target the parent entity. The rendering components (per ADR-0003: per-app, no shared package) must read field definitions and render them dynamically. The first consumer to ship this reader is CRM7; other apps follow in Phase 4.

## Compliance Gate

Ratified on user sign-off. Execution begins in Phase 2 / Phase 4 of the consolidated plan. The `entity_id` FK migration step (P1-75) is gated on this ADR landing first.
