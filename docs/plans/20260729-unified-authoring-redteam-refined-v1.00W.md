# Refined Prompt — Unified Authoring Surface: Red-Team + Execution Plan

## Intent

The operator wants a complete, evidence-backed answer to three architectural
questions about the Unified Authoring Surface, followed by a red-team of the
2026-07-03 approved plan AND the P0–P5 recommendations from the 2026-07-29
audit, then a fable-reasoning-linked team chain to execute the surviving
recommendations. The three questions:

1. Is Jodie AI capable of doing everything a user can?
2. Do developer-level "builds" get pushed/deployed to the codebase, and can
   org admins / enterprise super admins do similar but scoped to their tenants?
3. Can the authoring stack navigate both conduit (Next.js) and the remaining
   Vite/React apps?

## Decomposition

- **WS1: Answer Q1 (Jodie parity)** — inventory all Jodie tools vs all UI
  actions; identify gaps. Depends on: nothing.
- **WS2: Answer Q2 (deploy model + scoping)** — trace deploy_config, RLS
  policies, permission gates. Determine if builds are code or data. Map
  developer vs org-admin vs enterprise-superadmin capabilities. Depends on: nothing.
- **WS3: Answer Q3 (cross-framework)** — verify packages are framework-agnostic,
  conduit integration status, what's missing for full editing in Next.js.
  Depends on: nothing.
- **WS4: Red-team the 2026-07-03 plan** — architecture, security/RLS, DRY,
  developer-UX, completeness lenses. Depends on: WS1–WS3 answers.
- **WS5: Red-team P0–P5** — attack each recommendation; kill what doesn't
  survive. Depends on: WS4.
- **WS6: Form fable-linked team chain** — assign surviving work to the right
  model tiers and CLI agents. Depends on: WS5.

## Best-practice citations (from 2026-07-29 research)

| Finding | Source | Takeaway |
|---------|--------|----------|
| View/edit hybrid wins for sensitive data | UX.SE #20199 | Explicit edit-mode toggle is correct; validates PageEditorLauncher |
| Inline > modals for quick changes | Froala blog | Overlays (not navigation) for complex authoring |
| Slash commands = creation at point of attention | Notion docs | Gold standard for in-page element creation |
| Command palettes work if visible (>20% adoption) | UX.SE #131208, uxpatters.dev | Add visible trigger + Cmd+K for builder actions |
| Edit-mode toggle is industry standard | Wix Studio, Framer, Squarespace | Same canvas, mode switch, side panels — never separate destination |
| Progressive disclosure metrics | jobpreparena | >40% shortcut adoption for top-10 actions when surfaced |

## Blindspots to counter

1. **Assuming Jodie parity from tool existence** — tools exist but BLOCKING
   migrations (tenant_entity_records, add_tenant_field_definition RPC) mean
   the full create-entity loop can't complete. Counter: test the actual
   execution path, not just the tool registry.
2. **Assuming "deploy" means codegen** — the model is config-as-data (DB rows
   with scope columns), not code generation. Counter: verify no file/git
   operations exist in the authoring path.
3. **Assuming conduit can't edit** — packages are framework-agnostic React;
   conduit already imports them. The gap is the editing SURFACE (PageEditorLauncher
   is crm7-only), not the underlying capability. Counter: check what conduit
   actually renders vs what it could render.
4. **Over-scoping the red-team** — the plan is approved and 70% built. Red-team
   should focus on the 30% gap and the P0–P5 delta, not re-litigate settled
   architecture. Counter: constrain red-team to unresolved items only.
5. **Silo contamination** — this is bsuite_ work. Never write qig_ keys.
   Counter: all memory ops use bsuite_ prefix.

## Skills & MCPs to use

- `fable-reasoning` — team chain formation, EXPLORE→ATTACK→CONVERGE
- `multi-agent-red-team-planning` — WS4/WS5 red-team lenses
- `best-practice-research` — already invoked; findings above
- `subagent-orchestration` — team chain dispatch
- `supabase-postgres-best-practices` — RLS verification
- `supabase-auth-comprehensive` — permission model
- `qig-agent-comms` — memory MCP for coordination (bsuite_ silo)
- MCPs: qig-memory (memory_put/search), firecrawl (research if needed)

## The refined prompt

> Answer the three operator questions with file:line evidence from the live
> codebase. Then red-team ONLY the unresolved items of the 2026-07-03 plan
> (the 3 BLOCKING migrations + custom page canvas gap) and the P0–P5
> recommendations. Kill anything that doesn't survive. Form a fable-reasoning
> team chain (model tiers + CLI agents) for the surviving work. Save all
> findings to bsuite_ memory keys. Do NOT re-litigate settled architecture.
> Do NOT write code — this is analysis + planning only.
