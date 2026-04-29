# Archive — 2026-05-01 WYSIWYG / Schema UX Consolidation

This bucket captures plan docs superseded by the **Universal WYSIWYG + Schema UX Master Plan v1.05W** (`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`) during the 2026-05-01 consolidation sweep.

User directive (2026-05-01): *"make sure all past plan docs related to this type of work are considered so we can remove any that diverted us from this path."* + *"archival plan approved. approved phase 1a."* + *"mermaid ui builder doc can be archived because if done correctly our end result will be better."*

Files here are read-only historical references. Do not resurrect — follow the successor doc.

## Contents

| Archived file | Prior status | Archive reason | Successor (authoritative) |
|---------------|--------------|----------------|---------------------------|
| `20260425-universal-canvas-master-execution-plan-v1.00W.md` | Working (W) | Pre-dated v1.05W master plan. The "universal canvas" framing is functionally identical to what v1.05W now calls "Page Builder + Schema Builder + Form Builder unification". Phase 5 of this old plan has already shipped (`@bsuite/page-builder@0.1.0`). Phase 4 schema/page-builder UX rebuild in this old plan is now fully owned by v1.05W §3.2, §3.6, §3.7, §3.9, and §3.10 (strict superset — nothing lost). | [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../../plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) — v1.05W |
| `20260422-entity-linkage-schema-builder-uplift-v1.02W.md` | Working (W) | Schema Builder uplift plan authored 2026-04-22. Every capability (field-level React Flow handles, `SchemaRelationSchema`, cardinality markers, dagre auto-layout, crow's-foot glyphs, relationship persistence) is re-specified in v1.05W §3.6 items 1–8 and §3.9 Zod schemas with tighter DB column-alias mapping. The `SchemaRelationSchema` in v1.05W §3.9 was authored in direct response to this doc — it is the strict superset. | [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../../plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) — §3.6 + §3.9 |
| `20260316-mermaid-ui-builder-reference-v1.00A.md` | Approved (A) | March 2026 legacy Mermaid-diagram-driven UI builder vision. Superseded by the React Flow + dagre runtime architecture in v1.05W (PageGridLayout, @bsuite/schema-registry, TenantLayoutSlot). The actual runtime schema + page-builder is DB-backed and visual, not Mermaid-text-driven. User 2026-05-01: *"mermaid ui builder doc can be archived because if done correctly our end result will be better."* Note: this same file was previously referenced in the 2026-04-25 archive wave README, but was left in `docs/` because the successor at that time (the universal-canvas master execution plan) has itself now been superseded by v1.05W. Final move lands here. | [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../../plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) — §3.2 + §3.6 |

## What was NOT archived in this pass

The following related docs stay live until their owning feature ships or their Working status is naturally obsoleted:

- `docs/plans/20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md` — Phase 2A (page-builder extraction) already shipped as `@bsuite/page-builder@0.1.0`, but Phase 4 relationship/location UX scope items remain referenced by v1.05W §3.6 + §3.9. Will be archived when Phase 1b of v1.05W lands.
- `docs/plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md` — Ongoing shared-package cadence; not divergent.
- `docs/plans/20260423-bsuite-production-plan-v1.00W.md` — Broader production plan, not the WYSIWYG sub-program.
- `docs/adr/ADR-0001-page-builder-ownership.md`, `ADR-0002-schema-builder-ownership.md`, `ADR-0003-consumer-renderer-pattern.md` — Architecture Decision Records remain authoritative; v1.05W explicitly references ADR-0001.
- `docs/20260501-merged-execution-backlog-v1.00W.md` — canonical for the broader 16-24 week program (auth, payday super, GTO billing, etc.); v1.05W is the deep plan for the WYSIWYG/Schema/Page/Form Builder sub-program only.

## Cross-reference

- Previous archive wave: `docs/archive/2026-04-25-universal-canvas-wave/README.md` — same topic area, earlier snapshot (Phase 5 pre-landing).
- Running log of archive batches: `docs/OUTSTANDING.md` §3.
