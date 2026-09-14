# feat(page-builder): Global Symbol model with Supabase JSONB propagation

https://github.com/GaryOcean428/bsuite/issues/555

Snapshot updatedAt: 2026-08-24T03:25:59Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · derived from Q1 research synthesis**
> Source: `/home/user/workspace/research/q1-builder-gaps.md`

## Mandatory before merge

Skills required:
- `supabase` + `supabase-postgres-best-practices` (JSONB merge, RLS)
- `bsuite-brand-system`
- `tanstack-query`
- `forms-and-validation`

## Red-team requirements

1. **Security** — RLS on `component_definitions` so a tenant only sees their symbols + the global library.
2. **Performance** — symbol resolution at render <5 ms per instance.
3. **Reliability** — "Detach Symbol" is reversible (creates an undo entry).
4. **Quality** — JSONB merge resolver typed via Drizzle / kysely, no raw SQL string interpolation.

## Problem

BSuite has no Global Symbol model — every component instance is fully duplicated state. Every 2026 competitor ships symbols / components / instances:
- [Builder.io Symbols](https://www.builder.io/c/docs/symbols-intro) — definition + instance with override slots.
- [Webflow components](https://developers.webflow.com/designer/reference/components-overview) — main component + instance properties.
- [Framer Smart Components](https://www.framer.com/learn/components/) — variants + responsive overrides.

Without this, fixing a navbar means editing it on every page.

## Required implementation

1. Two new Supabase tables:
   - `component_definitions(id, tenant_id, name, schema_json, default_config_json, created_at, updated_at)`
   - `component_instances(id, page_id, definition_id, override_config_json, created_at, updated_at)`
   - RLS: tenant scope on definitions; instances inherit page tenant scope.
2. Resolver: `resolveInstance(instance) = merge(definition.default_config, instance.override_config)` using a deep-merge that preserves array identity.
3. UI:
   - "Save as Symbol" on any block in the page-builder.
   - "Detach Symbol" on any instance — creates undo entry, copies resolved config inline, deletes the instance row.
   - Symbol library panel in the editor sidebar, grouped by tenant + global.
4. Edit-symbol flow: opens definition in a modal; saving propagates to all instances on next render (Supabase realtime subscription invalidates `useQuery(['page-layout', id])`).

## Acceptance criteria

- [ ] Migration creates both tables with RLS
- [ ] Resolver passes vitest property tests (merge is deterministic, no aliasing)
- [ ] Save as Symbol round-trips correctly
- [ ] Detach Symbol is undoable
- [ ] Symbol edit propagates to all instances within 1 second via Supabase realtime
- [ ] WCAG-compliant in light + dark
- [ ] No regression to existing flat layouts

## Suggested team

Heavy scope. `bsuite_heavy_work_queue`. Label `needs-team`.

## Citations

- [Builder.io Symbols intro (2026)](https://www.builder.io/c/docs/symbols-intro)
- [Webflow components overview (2026)](https://developers.webflow.com/designer/reference/components-overview)
- [Framer Smart Components (2026)](https://www.framer.com/learn/components/)
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Internal: `/home/user/workspace/research/q1-builder-gaps.md` § "Component / slot model"
