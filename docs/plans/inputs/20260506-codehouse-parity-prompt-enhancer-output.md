# Refined Prompt — Codehouse Parity & Platform 360 (Heavy-Tier · Pass 5)

> Output of `prompt-enhancer` on the user's 2026-05-06 instruction:
> *"make sure the bsuite repo's BSuite Plan Dashboard and roadmaps and issues all track these features and any docs in the parent or submodules covering are linked. key user flows and intuitive user workflows are considered and page and schema builders can all improve features visually from the devs account to create connections or build features visually for any last minute or future additions. full 360 consideration of features their up and downstream flow end users how they access, portals, permissions everything."*

**Tier:** Heavy (5-pass: decompose → research → blindspot → ratify → execute). Pass 4 (red-team) deferred to the multi-agent-red-team-planning stage that runs over the resulting plan doc.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Intent (1-paragraph restatement)

Make the BSuite Plan Dashboard, the Master Roadmap (`v5.04W`), the Single Execution Queue (`merged-execution-backlog-v1.00W`), and every per-submodule `OUTSTANDING.md` + `docs/plans/STATUS.md` file the **single live tracking surface** for two intertwined bodies of work: (a) closing 35 Codehouse Workforce-One parity gaps surfaced in the 2026-05-06 audit, and (b) realising a "Platform 360" capability — every feature visible across every portal, with every role-permission-data-flow path documented and visually buildable from a dev account via the existing `@bsuite/page-builder` + `@bsuite/schema-builder`. The plan must produce a working full-stack dev-account visual feature-creation surface (per the user's "Spec + working full stack" answer), document all 6 portals end-to-end (BSU admin, CRM7 internal, Conduit recruiter+candidate+employer+careers, BSU tenant admin, R80.3 calculator user, braden marketing), and treat AUTH_CANONICAL.md + Supabase RLS + BSuite SSO as the canonical permissions model — no new RBAC/ABAC framework. Every plan row must cite a skill, an MCP tool, and a 2026 best-practice doc citation. The dashboard JSON gains new fields so the dashboard renders the parity status and 360-coverage status alongside existing plan-status rows.

---

## Decomposition (workstreams + dependencies)

```
WS-A. Parity tracking integration
  ├── A1. Add a new top-level plan to bsuite/docs/plans/
  ├── A2. Append parity workstream to the merged-execution-backlog
  ├── A3. Update each submodule's OUTSTANDING.md + STATUS.md to cite the new plan
  └── A4. Update master-roadmap-v5.00W.md to add a "Codehouse parity" section

WS-B. Issue alignment (depends WS-A1)
  ├── B1. File 12 issues at bsuite for the 35 parity gaps grouped (by domain)
  ├── B2. Cross-link each issue to its docs/plans/* and OUTSTANDING.md row
  └── B3. Apply standard label set (filed-by-perplexity, research-driven, parity-codehouse, p1/p2, area:*)

WS-C. Dashboard schema extension (depends WS-B for issue numbers)
  ├── C1. Extend dashboard-data.json schema: add parity_status, feature_360_status, portal_coverage objects
  ├── C2. Update refresh-data.py to populate these from the new plan + issues
  ├── C3. Update dashboard index.html to render the new sections
  └── C4. Co-merge into PR #535 (or follow-up PR if #535 merges first)

WS-D. Platform 360 specification (parallel to WS-A,B,C)
  ├── D1. Per-portal flow diagrams (6 portals) — Mermaid in plan doc
  ├── D2. Role × capability × route matrix per portal (cite RLS policies + AUTH_CANONICAL.md)
  ├── D3. Upstream/downstream data-flow per feature (Supabase tables, channels, edge fns)
  └── D4. End-user access map: how each end-user reaches each feature

WS-E. Visual feature builder full-stack (depends WS-D2 for permissions)
  ├── E1. Dev-account-only `/dev/feature-builder` route in BSU
  ├── E2. Schema-builder ↔ page-builder bridge: define entity → auto-generate Supabase migration → auto-generate page-builder layout → preview
  ├── E3. AI-prompt-to-section integration (Vercel AI Gateway + AI SDK 5 generateObject + Zod)
  ├── E4. Export "feature bundle" as a PR (issue body + migration SQL + page layout JSON + RLS policy)
  └── E5. Tests + docs

WS-F. Doc reconciliation (parallel)
  ├── F1. Fix the 17 doc-drift items from bsuite-inventory
  ├── F2. Update 6 README "Features" sections to surface over-deliveries (BOOT, AI, schema-builder, offline PWA, sub-org tenancy)
  └── F3. Update bsuite/knowledge.md + AGENTS.md if anything changes
```

**Critical path:** WS-A1 → WS-B1 → WS-C1 → WS-C4. WS-D and WS-E run in parallel.

---

## Best-practice citations (2026)

### Plan / Roadmap discipline
- [GitHub Projects v2 — task-list-tracking on issues (2026)](https://docs.github.com/en/issues/planning-and-tracking-with-projects) — issue tasklists are the canonical sub-issue mechanism; we'll use them inside each parity issue's body to track the gaps it covers.
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) — already in BSuite rulebook; every PR commit follows.

### Visual feature builder
- [Webflow Designer 2026 — components & symbols](https://help.webflow.com/hc/en-us/categories/33961235829651-Designer) — for the symbol propagation model in WS-E2.
- [Builder.io Visual Editor 2026](https://www.builder.io/c/docs/visual-editor) — for the AI-prompt-to-section pattern in WS-E3.
- [Plasmic 2026 — code components + slots](https://docs.plasmic.app/learn/code-components/) — for slot architecture in the feature-builder.
- [@dnd-kit/abstract Snap modifier](https://dndkit.com/extend/modifiers) — already filed as bsuite#547; adopt before E1.

### AI-driven structured generation
- [Vercel AI SDK 5 — `generateObject` + Zod schema](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — canonical pattern for AI-prompt-to-section validation.
- [Vercel AI Gateway 2026](https://vercel.com/docs/ai-gateway) — single key, observability, per-request `x-issue-number` tagging.
- [Anthropic Claude Code GitHub Action v1](https://docs.anthropic.com/en/docs/claude-code/github-actions) — for "Export feature bundle as a PR" (E4).

### Supabase + permissions
- [Supabase RLS 2026 best practices](https://supabase.com/docs/guides/database/postgres/row-level-security) — every new entity in WS-E2 must ship with RLS.
- [Supabase Realtime broadcast (2026)](https://supabase.com/docs/guides/realtime/broadcast) — for live propagation of schema changes to consuming pages.
- [Postgres `pg_graphql` 2026](https://supabase.github.io/pg_graphql/) — automatic GraphQL surface for the entity-builder if it gets enabled later.

### Dashboard / Pages
- [GitHub Pages — Actions deployment 2026](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow) — already wired in PR #535.

### Multi-tenant + portals
- [Supabase multi-tenancy patterns 2026](https://supabase.com/docs/guides/auth/multi-tenant) — confirms tenant-id-on-every-row + RLS, which AUTH_CANONICAL.md already enforces.
- [WCAG 2.2 — focus-visible + status messages (2026)](https://www.w3.org/TR/WCAG22/) — every portal must pass.

---

## Blindspots to counter (this model, this task)

1. **Token-budget overflow on plan size.** A "single living plan" tracking 35 gaps + 21 domains + 6 portals + a feature-builder spec will run hundreds of pages. *Counter: structure the plan as a thin index doc + per-domain sub-plans cross-linked from the index. Each sub-plan ≤ 200 lines.*
2. **Re-doing what the parity matrix already did.** The matrix has 142 rows with file:line evidence. *Counter: the new plan REFERENCES `/home/user/workspace/competitor/parity-matrix.md` rather than restating it. Plan rows are "WS-A2 → see matrix row 47" not full feature descriptions.*
3. **Permission-model creep.** Easy to drift into proposing ABAC/Cedar/Casbin during the role-matrix work. *Counter: user explicitly answered "Existing AUTH_CANONICAL.md + Supabase RLS + BSuite SSO (no new model)". Plan must enforce this constraint at every D2 row.*
4. **Visual feature builder scope creep.** WS-E could become a 6-month rebuild of Webflow. *Counter: scope it to **dev-account-only**, **entity → migration → page → preview** loop, **PR export**. Anything else (custom visual logic, runtime-editable production pages) is out of scope.*
5. **Dashboard schema breakage.** PR #535 is already in flight; appending fields naively could conflict on merge. *Counter: WS-C extends `dashboard-data.json` schema additively (new keys, no renames), and the dashboard `index.html` checks `if (data.parity_status) renderParitySection(...)` so the addition is backward-compatible.*
6. **Doc cross-linking that goes stale.** Adding 12 issue numbers across 6 OUTSTANDING.md files + 1 STATUS.md guarantees future drift. *Counter: every cross-link uses GitHub markdown auto-resolved issue refs (`bsuite#NNN`), and the plan ships with a `scripts/check-plan-cross-links.sh` that runs in CI.*
7. **Brainstorming ahead of approval.** The user said "first brainstorm everything" — easy to leap to writing the plan before brainstorming is done. *Counter: brainstorming skill has a HARD-GATE that prevents plan-writing until design is approved. Honor it.*
8. **Forgetting submodule docs.** "any docs in the parent or submodules covering are linked" — easy to miss the 6 submodules' docs. *Counter: WS-A3 explicitly lists each submodule, plus `find */docs -name "*.md"` audit.*
9. **Skipping the prompt-enhancer self-citation.** This refined prompt itself must end up in the plan as Pass-1 evidence. *Counter: WS-A1's plan doc has a "Prompt provenance" section linking back to `/home/user/workspace/competitor/refined-prompt-v1.md`.*
10. **Treating Codehouse as the only competitor.** User asked for Codehouse parity, but the FAQ has no competitor framing. *Counter: this plan is Codehouse-only. Other competitors (FastTrack360, JobAdder, MYOB Greentree, Aurion, Astute) are out of scope unless filed as separate plans.*

---

## Skills & MCPs to use during execution

### Skills (all already loaded in session unless noted)
- `prompt-enhancer` (THIS pass) — done.
- `brainstorming` — Pass 5 next, gates plan-writing.
- `planning-and-roadmapping` — for the plan structure + roadmap updates.
- `writing-plans` — to author `docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md`.
- `multi-agent-red-team-planning` — Pass 4 deferred; runs over the plan doc once written.
- `bsuite-brand-system` — for any UI work in WS-E.
- `dnd-kit` + `framer-motion` + `shadcn-ui` + `tailwind` — WS-E builder UI.
- `supabase` + `supabase-postgres-best-practices` + `supabase-auth-comprehensive` — for WS-E migrations + WS-D2 RLS evidence.
- `forms-and-validation` (RHF + Zod) — WS-E AI-prompt validation.
- `tanstack-query` — WS-E data layer.
- `dispatching-parallel-agents` — running WS-A/B/C/D/E/F in parallel.
- `verification-before-completion` + `qa-and-verification` — every closure.
- `documentation-compliance` (org) — every new doc follows the YYYYMMDD-name-vX.YYS naming.
- `git-workflow` + `using-git-worktrees` + `tandem-dev-main-reconcile` — for parallel branches.
- `accountability-agent` + `memory-synapse` (auto-dispatched per master-orchestration).

### MCPs / Connectors
- **GitHub** (`api_credentials=["github"]`) — issue creation, PR creation, branch protection updates, dashboard refresh dispatches.
- **Supabase MCP** — `apply_migration`, `execute_sql`, `get_advisors`, `list_edge_functions`, `deploy_edge_function`. Required for WS-E2 + WS-D3 RLS audit.
- **Vercel** (`api_credentials=["vercel"]`) — deployment status verification per repo + AI Gateway key configuration.
- **GitHub MCP direct** — for issue tasklist creation (sub-issue tracking on parity issues).
- **`pplx-tool schedule_cron`** — extending Cron A/B routing to surface plan progress alerts.
- **Memory API** (`https://qig-memory-api.vercel.app/api/memory/`) — `bsuite_plan_codehouse_parity_*` keys for cross-session continuity.

### Documents to keep open during execution (already in workspace)
- `/home/user/workspace/competitor/parity-matrix.md` (540 lines) — primary input
- `/home/user/workspace/competitor/bsuite-inventory.md` (306 lines) — secondary input
- `/home/user/workspace/competitor/codehouse-workforce-one-faq.md` (722 lines)
- `/home/user/workspace/competitor/codehouse-ots-faq.md` (143 lines)
- `/home/user/workspace/competitor/codehouse-pdfs/*.txt` (5 files, 142 pages)
- `/tmp/bsuite-fresh/docs/20260227-bsuite-master-roadmap-v5.00W.md`
- `/tmp/bsuite-fresh/docs/20260501-merged-execution-backlog-v1.00W.md`
- `/tmp/bsuite-fresh/docs/plans/STATUS.md`
- `/tmp/bsuite-fresh/AUTH_CANONICAL.md`

---

## The refined prompt (the executor acts on this)

> Brainstorm and design a single plan that integrates **Codehouse Workforce-One parity tracking** AND a **Platform 360 capability spec** (every feature × every portal × every role × every data-flow) into the BSuite repo's existing planning surface.
>
> **Constraints (non-negotiable):**
> 1. The plan must extend, not replace, the existing canonical docs:
>    - `docs/20260227-bsuite-master-roadmap-v5.00W.md` (Master Roadmap v5.04W)
>    - `docs/20260501-merged-execution-backlog-v1.00W.md` (the single execution queue)
>    - `docs/plans/STATUS.md` (parent index)
>    - The 6 submodules' `docs/OUTSTANDING.md` + `docs/plans/STATUS.md`
>    - The Plan Dashboard in PR #535 (`docs/dashboard/`)
> 2. The plan lives at `bsuite/docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` and is structured as an INDEX. Per-domain sub-plans split into smaller files if any single section exceeds 250 lines.
> 3. Permissions model: existing AUTH_CANONICAL.md + Supabase RLS + BSuite SSO. No new RBAC/ABAC framework.
> 4. Visual feature-creation scope: **Spec + working full-stack** dev-account-only `/dev/feature-builder` route in BSU. Entity-builder → Supabase migration → page-builder layout → AI-prompt-to-section → "Export feature bundle as a PR." Out of scope: production-runtime page editing for non-dev users.
> 5. Portals to document end-to-end: **all 6** — BSU admin, CRM7 internal, Conduit recruiter + candidate + employer + careers, BSU tenant admin, R80.3 calculator user, braden marketing.
> 6. Every plan row cites: required skill(s), required MCP(s), 2026 official doc URL, owning app/package, and red-team requirements.
>
> **Brainstorming first.** Use the `brainstorming` skill's HARD-GATE — present the design, ask one question at a time, get user approval per section, then save to `docs/plans/20260506-codehouse-parity-and-platform-360-design.md` BEFORE invoking `writing-plans` to produce the canonical plan + roadmap deltas.
>
> **Workstreams** (full list in §Decomposition above): WS-A parity tracking integration, WS-B issue alignment, WS-C dashboard schema extension, WS-D Platform-360 spec, WS-E visual feature builder, WS-F doc reconciliation.
>
> **Deliverables** (final state):
>
> 1. `docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` — index plan
> 2. Sub-plan files in `docs/plans/20260506-codehouse-parity/` for any domain that exceeds 250 lines
> 3. Updated `docs/20260227-bsuite-master-roadmap-v5.00W.md` — adds a "Codehouse Parity & Platform 360" section linking to the index plan
> 4. Updated `docs/20260501-merged-execution-backlog-v1.00W.md` — adds a new phase or workstream group for parity items
> 5. Updated `docs/plans/STATUS.md` — adds row(s) for the new plan
> 6. Updated 6 submodule `docs/OUTSTANDING.md` + `docs/plans/STATUS.md` — adds plan refs
> 7. Updated `docs/dashboard/data/dashboard-data.json` schema (additive only) + `index.html` rendering for `parity_status` + `feature_360_status` + `portal_coverage`
> 8. ~12 GitHub issues filed at GaryOcean428/bsuite for the 35 parity gaps (grouped by domain), each with task lists referencing the matrix rows + this plan
> 9. WS-E `/dev/feature-builder` route shipped in BSU as a working full-stack feature with tests
> 10. WS-F doc-drift fixes — 17 items resolved
>
> **Use these skills/MCPs during the work:**
>
> Skills: `brainstorming` (THEN gate), `planning-and-roadmapping`, `writing-plans`, `multi-agent-red-team-planning`, `bsuite-brand-system`, `dnd-kit`, `framer-motion`, `shadcn-ui`, `tailwind`, `supabase`, `supabase-postgres-best-practices`, `supabase-auth-comprehensive`, `forms-and-validation`, `tanstack-query`, `dispatching-parallel-agents`, `verification-before-completion`, `qa-and-verification`, `documentation-compliance`, `git-workflow`, `using-git-worktrees`, `tandem-dev-main-reconcile`.
>
> MCPs: GitHub (`gh` CLI w/ `api_credentials=["github"]`), Supabase MCP (apply_migration, execute_sql, get_advisors, deploy_edge_function), Vercel (`vercel` CLI w/ `api_credentials=["vercel"]`), GitHub MCP direct, `pplx-tool schedule_cron`, Memory API (`bsuite_plan_codehouse_parity_*` keys).
>
> **Citation requirement:** Every external claim — particularly in WS-D portal flows, WS-E builder design, WS-C dashboard schema — must link to a 2026 official doc. The list of canonical sources is in §Best-practice citations above.
>
> **Brainstorm output expectation:** A 1-page design that the user can approve / modify in ≤3 rounds. After approval, the canonical plan doc is written, then the plan-deltas to roadmap/backlog/submodules are committed in a single PR.

---

## End of refined prompt
