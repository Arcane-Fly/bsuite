---
name: visual-feature-builder-spec
description: WS-E specification for the dev-account-only /dev/feature-builder route in BSU. Three panels (Entity / Page / AI). Output is a "feature bundle" exported as a PR.
type: spec
status: W
owner-app: business-suite-unified
related: [portal-bsu-admin, portal-bsu-tenant-admin]
---

# Visual Feature Builder — Spec (WS-E)

> Sub-plan of [`../20260506-codehouse-parity-and-platform-360-v1.00W.md`](../20260506-codehouse-parity-and-platform-360-v1.00W.md). Scope-locked per refined-prompt §Blindspot 4: dev-account-only, **not** a Webflow rebuild for production-runtime page editing.

## Goal

Provide an in-product, dev-account-only path to design new BSuite features visually and export them as a complete PR (migration SQL + page layout JSON + RLS policy + route registration diff). The route lives at `/dev/feature-builder` in BSU and is gated by:

```ts
// pseudo-code, illustrative only
auth.jwt().app_metadata.platform_role IN ('developer', 'platform_admin')
```

(Cite [`../../../AUTH_CANONICAL.md`](../../../AUTH_CANONICAL.md) and [`./20260506-portal-bsu-admin-v1.00W.md`](./20260506-portal-bsu-admin-v1.00W.md). No new RBAC/ABAC framework — strictly Supabase JWT claim + RLS check.)

**Out of scope (locked):** production-runtime visual editing for non-dev users; custom logic / scripting blocks; runtime-mutable RLS policies. Anything beyond the entity → migration → page → preview → PR-export loop is OUT OF SCOPE for the WS-E ship.

## Three panels

### Panel 1 — Entity (schema-builder)

- Powered by `@bsuite/schema-builder` (already in `packages/`).
- User defines an entity: name, fields, types, FK relations, `tenant_id` enforcement (mandatory), `created_at`/`updated_at`/`created_by` audit columns (mandatory).
- Output: a Zod schema + a Postgres `CREATE TABLE` statement + a default RLS policy bundle (tenant-scoped SELECT/INSERT/UPDATE/DELETE).
- File path (planned): `business-suite-unified/src/pages/dev/feature-builder/entity-panel.tsx`.

### Panel 2 — Page (page-builder)

- Powered by `@bsuite/page-builder` (already in `packages/`).
- User assembles a page from existing schema-bound primitives (List / Detail / Form / KPI tiles).
- Page layout is serialised as JSON conforming to the page-builder's existing schema.
- File path (planned): `business-suite-unified/src/pages/dev/feature-builder/page-panel.tsx`.

### Panel 3 — AI (Vercel AI Gateway + AI SDK 5 generateObject + Zod)

- Free-text prompt → AI generates a candidate Section (entity + page primitive layout) using [`generateObject`](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) with a Zod schema constraint.
- Streaming preview while user reviews; user accepts / rejects / edits before the section lands in Panel 2.
- Per-request `x-issue-number` header tag (per refined-prompt §AI-driven structured generation) for observability.
- Provider routing: `xai/grok-4.20-reasoning` primary, `anthropic/claude-sonnet-4.6` fallback (per `crm7/src/lib/ai/config.ts` — established pattern).
- File path (planned): `business-suite-unified/src/pages/dev/feature-builder/ai-panel.tsx`.

## Export feature bundle as PR

A "feature bundle" = `{ migration_sql, page_layout_json, rls_policy_sql, route_registration_diff, generated_zod_schema }`.

Export workflow:

1. User clicks **Export as PR** on the builder page.
2. Frontend calls edge fn `feature-bundle-export` with the bundle JSON.
3. Edge fn invokes the [Anthropic Claude Code GitHub Action v1](https://docs.anthropic.com/en/docs/claude-code/github-actions) via `gh workflow run` to:
   - Create branch `feat/feature-builder/<entity-name>-<short-hash>` off `development`.
   - Commit the migration SQL to `<owner-app>/supabase/migrations/<timestamp>_feature_<entity>.sql`.
   - Commit the page layout JSON + route registration diff.
   - Commit the Zod schema to `<owner-app>/src/schemas/<entity>.ts`.
   - Open a PR with body templated from the bundle metadata.
4. PR body includes a checklist of red-team review items + RLS-policy verification.

## Architecture

```mermaid
flowchart TD
    Dev[Dev / platform_admin user] -->|/dev/feature-builder| BSU
    subgraph BSU["BSU app"]
      BSU --> Entity[Panel 1 — Entity]
      BSU --> Page[Panel 2 — Page]
      BSU --> AI[Panel 3 — AI]
      Entity -->|@bsuite/schema-builder| Bundle["Feature bundle (in-memory)"]
      Page -->|@bsuite/page-builder| Bundle
      AI -->|generateObject + Zod| Bundle
    end
    Bundle -->|Export as PR| EdgeFn["edge fn feature-bundle-export"]
    EdgeFn -->|Anthropic Claude Code Action v1| GH["GitHub PR on GaryOcean428/<owner-app>"]
    GH -->|review + merge| Sb["Supabase migrations applied + app deployed"]
```

**File paths (planned):**

- `business-suite-unified/src/pages/dev/feature-builder/index.tsx` — route entry point with role gate
- `business-suite-unified/src/pages/dev/feature-builder/{entity,page,ai}-panel.tsx` — three panels
- `business-suite-unified/src/pages/dev/feature-builder/preview.tsx` — live combined preview
- `business-suite-unified/supabase/functions/feature-bundle-export/` — edge fn
- `packages/schema-builder/src/exporters/migration.ts` — entity → migration SQL
- `packages/schema-builder/src/exporters/rls.ts` — entity → default RLS policy bundle

## Acceptance criteria

This spec is "shipped at status W" when the future implementation PR(s) deliver:

1. ✅ `/dev/feature-builder` route in BSU exists and is gated by `platform_role IN ('developer', 'platform_admin')`.
2. ✅ Non-dev users hitting `/dev/feature-builder` get a 403 redirect, not a 404 (server-side enforced — not just client-side).
3. ✅ Panel 1 produces a valid migration SQL file that applies cleanly via `apply_migration` MCP call.
4. ✅ The default RLS policy bundle includes tenant-scoped SELECT/INSERT/UPDATE/DELETE policies and mandatory `tenant_id` + `created_by` columns.
5. ✅ Panel 2 produces a page-builder JSON payload that the existing `<PageRenderer>` component renders without modification.
6. ✅ Panel 3 uses `generateObject` with a Zod schema constraint and streams the generation to the user before commit.
7. ✅ AI prompts are tagged with `x-issue-number` header for observability.
8. ✅ The "Export as PR" edge fn opens a PR on the correct submodule repo (not always BSU — based on the entity's owning app).
9. ✅ The exported PR contains migration SQL + page JSON + RLS SQL + route diff + Zod schema in a single commit.
10. ✅ The exported PR body includes a red-team checklist (RLS-policy completeness + WCAG 2.2 + tenant_id enforcement + naming convention).
11. ✅ Vitest tests cover: role gate (allow + deny), entity → migration round-trip, page → JSON round-trip, AI → bundle round-trip with mocked AI gateway.
12. ✅ The route honours the operator's "no new RBAC/ABAC framework" constraint — gating is JWT claim + Supabase RLS only.
13. ✅ The visual feature builder is documented in `business-suite-unified/docs/` with a screenshot and a how-to.

## Citations

- [Webflow Designer 2026 — components & symbols](https://help.webflow.com/hc/en-us/categories/33961235829651-Designer) — symbol propagation reference (out-of-scope feature; cited for non-goal clarity)
- [Builder.io Visual Editor 2026](https://www.builder.io/c/docs/visual-editor) — AI-prompt-to-section pattern reference
- [Plasmic 2026 — code components + slots](https://docs.plasmic.app/learn/code-components/) — slot architecture reference
- [Vercel AI SDK 5 — `generateObject` + Zod schema](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — canonical pattern
- [Vercel AI Gateway 2026](https://vercel.com/docs/ai-gateway) — single key, observability
- [Supabase RLS 2026 best practices](https://supabase.com/docs/guides/database/postgres/row-level-security) — every emitted entity ships with RLS
- [Anthropic Claude Code GitHub Action v1](https://docs.anthropic.com/en/docs/claude-code/github-actions) — for "Export feature bundle as PR" step
- [@dnd-kit/abstract — Snap modifier 2026](https://dndkit.com/extend/modifiers) — for the page-builder palette
- [WCAG 2.2 — focus visible §2.4.7](https://www.w3.org/TR/WCAG22/#focus-visible) — every emitted page must pass

## Open questions (for red-team review before implementation begins)

1. Should the AI panel be optional (Panel 3 hidden by default) so devs without AI Gateway access can still build features? Recommend yes.
2. What is the rollback path if a generated migration breaks production? Operator decision needed (suggested: `apply_migration` MCP call runs against a preview Supabase branch first).
3. Should the exported PR auto-trigger CI / red-team subagents? Or rely on standard branch-protection?
4. How does the builder handle entity FK relationships to existing tables (e.g., new entity references `tenants`)? Auto-detect + offer FK constraint generation.
5. Versioning of generated bundles — store bundle JSON in a `feature_bundles` table for reproducibility? File issue.
