---
name: codehouse-parity-and-platform-360-index
description: Canonical index plan integrating Codehouse Workforce-One parity tracking with full Platform-360 capability/portal/role coverage across the BSuite repo and all six submodules.
type: plan-index
status: W
created: 2026-05-06
owner: GaryOcean428/bsuite (parent monorepo) + 6 submodule maintainers
---

# Codehouse Parity & Platform 360 — Index Plan (v1.00W)

> **Index, not a long-form plan.** Detail lives in (a) `parity-matrix.md` (referenced by row number, never restated), (b) per-portal sub-plans in `20260506-codehouse-parity/`, and (c) the visual-feature-builder spec. This file is the entry point and the single source of truth for cross-link integrity.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Provenance

This plan was generated from the heavy-tier `prompt-enhancer` output produced on 2026-05-06 in response to the operator's 2026-05-06 instruction to "make sure the bsuite repo's BSuite Plan Dashboard and roadmaps and issues all track these features and any docs in the parent or submodules covering are linked … full 360 consideration of features their up and downstream flow end users how they access, portals, permissions everything."

| Provenance artefact | Location | Purpose |
|---|---|---|
| Refined prompt (heavy-tier, 5-pass, 192 lines) | [`docs/plans/inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00W.md`](./inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00W.md) | Workstream decomposition (WS-A through WS-F), best-practice citations, blindspot register, skills/MCPs list |
| Parity matrix (540 lines, 142 rows, 21 domains) | external (operator workspace) — `~/workspace/competitor/parity-matrix.md` | Per-feature evidence with file:line citations. **Referenced by row number from this plan; NOT restated.** |
| BSuite inventory (306 lines, file:line evidence) | external (operator workspace) — `~/workspace/competitor/bsuite-inventory.md` | Code-verified evidence of what exists in BSuite today |
| Codehouse FAQ + PDF corpus | external (operator workspace) — `~/workspace/competitor/codehouse-*` | Codehouse Workforce-One + AnyTime + OTS canonical sources (5 PDFs, 142 pages; 221 FAQ articles) |

**Operator decisions locked in (2026-05-06, before plan-writing):**

1. **Plan structure:** Hybrid — index (this file) + 9 portal sub-plans + 1 visual-feature-builder spec. Domains stay in `parity-matrix.md` only.
2. **Dashboard schema extension is out of scope for THIS PR.** PR #535 (the existing Plan Dashboard ship) lands first; a follow-up PR (different subagent) extends `dashboard-data.json` additively to render `parity_status` / `feature_360_status` / `portal_coverage`.
3. **Permissions model:** Existing `AUTH_CANONICAL.md` + Supabase RLS + BSuite SSO. **No new RBAC/ABAC framework** is introduced.

---

## 2. Scope

Workstreams (verbatim from refined-prompt §Decomposition):

```
WS-A. Parity tracking integration
  ├── A1. Add a new top-level plan to bsuite/docs/plans/
  ├── A2. Append parity workstream to the merged-execution-backlog
  ├── A3. Update each submodule's STATUS.md to cite the new plan (per-submodule OUTSTANDING.md files removed 2026-05-19 per bsuite#488; the parent's `docs/20260501-merged-execution-backlog-v1.00W.md` is the single execution queue)
  └── A4. Update master-roadmap-v5.00W.md to add a "Codehouse parity" section

WS-B. Issue alignment (depends WS-A1)
  ├── B1. File 12 issues at bsuite for the 35 parity gaps grouped (by domain)
  ├── B2. Cross-link each issue to its docs/plans/* row (parent `docs/OUTSTANDING.md` is the SSoT; per-submodule OUTSTANDING.md files removed per bsuite#488)
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

**This PR delivers WS-A1 + WS-A4 + WS-D scaffolding + WS-E spec only.** WS-B (issue filing), WS-C (dashboard JSON), WS-E1–E5 (builder code), and WS-F (doc-drift sweep) are follow-up PRs.

---

## 3. Status surface integration

| Surface | File | This-PR change | Future-PR change |
|---|---|---|---|
| Master roadmap | `docs/20260227-bsuite-master-roadmap-v5.00W.md` | New §"Codehouse Parity & Platform 360 (2026-05-06)" linking to this index | Bump revision log when issues filed |
| Single execution queue | `docs/20260501-merged-execution-backlog-v1.00W.md` | New §"Phase P-360 — Codehouse Parity & Platform 360" with rows per parity domain | Issue numbers added once WS-B files them |
| Plans index | `docs/plans/STATUS.md` | New row for this index plan | Status flips W→A on operator approval |
| Plans README | `docs/plans/README.md` | New row in Active Plans table | — |
| Outstanding work index | `docs/OUTSTANDING.md` | New row referencing this plan | — |
| Plan Dashboard | `docs/dashboard/data/dashboard-data.json` | **NOT in this PR** (per operator decision) | Follow-up PR adds `parity_status`, `feature_360_status`, `portal_coverage` keys additively |
| Submodule outstanding indexes (×6) | ~~`<submodule>/docs/OUTSTANDING.md`~~ | **N/A** — removed 2026-05-19 per bsuite#488; parent `docs/OUTSTANDING.md` is the SSoT | — |
| Submodule plan indexes (×6) | `<submodule>/docs/plans/STATUS.md` | Separate one-line PR per submodule | — |

---

## 4. Domain coverage

Parity matrix totals (from `parity-matrix.md` §1 Executive Summary):

| Status | Count | % of 103 rows |
|---|---:|---:|
| ✅ parity | 22 | 21% |
| 🚀 better | 18 | 17% |
| 🟡 partial | 28 | 27% |
| 🔴 gap | 19 | 18% |
| ⛔ missing | 16 | 16% |

**Domains covered (21):** A=Timesheet Entry · B=Approval Workflow · C=Pay Items · D=Award Interpretation · E=Pay Periods · F=Leave · G=Roles & Permissions · H=Hiring/Placements · I=User Accounts · J=Notifications · K=Reporting · L=Export/Integrations · M=Settings · N=Awards/Compliance · O=Mobile/Portal · P=Multi-tenant · Q=Public Portals · R=Documents/E-sign · S=Workflow/Automation · T=Audit · U=Integrations.

> **Authority:** the matrix is the authority for per-row evidence. This plan's roadmap entries reference matrix rows (e.g. "see matrix row 21 — Pay Item Groups CRUD page"); they do not restate them.

---

## 5. Portal coverage

Nine portal sub-plans, each ≤200 lines, each with role × capability × route × RLS-policy matrices and one Mermaid sequence diagram. RLS audit status is tracked per portal (W = working / unaudited, A = audited & approved).

| # | Portal | Sub-plan | Owner app | RLS audit |
|---|---|---|---|---|
| 1 | BSU admin (platform) | [`20260506-portal-bsu-admin-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-bsu-admin-v1.00W.md) | business-suite-unified | W |
| 2 | CRM7 internal (consultant/coordinator) | [`20260506-portal-crm7-internal-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-crm7-internal-v1.00W.md) | crm7 | W |
| 3 | Conduit recruiter | [`20260506-portal-conduit-recruiter-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-conduit-recruiter-v1.00W.md) | conduit | W |
| 4 | Conduit candidate | [`20260506-portal-conduit-candidate-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-conduit-candidate-v1.00W.md) | conduit | W |
| 5 | Conduit employer | [`20260506-portal-conduit-employer-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-conduit-employer-v1.00W.md) | conduit | W |
| 6 | Conduit careers (public) | [`20260506-portal-conduit-careers-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-conduit-careers-v1.00W.md) | conduit | W |
| 7 | BSU tenant admin | [`20260506-portal-bsu-tenant-admin-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-bsu-tenant-admin-v1.00W.md) | business-suite-unified | W |
| 8 | R80.3 calculator user | [`20260506-portal-r80-3-calculator-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-r80-3-calculator-v1.00W.md) | R80.3 | W |
| 9 | Braden marketing | [`20260506-portal-braden-marketing-v1.00W.md`](./20260506-codehouse-parity/20260506-portal-braden-marketing-v1.00W.md) | braden | W |

---

## 6. Visual feature builder

Spec: [`20260506-codehouse-parity/20260506-visual-feature-builder-spec-v1.00W.md`](./20260506-codehouse-parity/20260506-visual-feature-builder-spec-v1.00W.md).

**Goal:** dev-account-only `/dev/feature-builder` route in BSU gated to `platform_role IN ('developer', 'platform_admin')`. Three panels: Entity (schema-builder), Page (page-builder), AI section (Vercel AI Gateway + AI SDK 5 `generateObject` + Zod). Output: a "feature bundle" exported as a PR — migration SQL + page layout JSON + RLS policy + route registration diff.

**Dependency notes:**

- Depends on `@bsuite/schema-builder` and `@bsuite/page-builder` already present in `packages/`.
- Depends on Vercel AI Gateway being configured for the BSU project (operator-pending env var `AI_GATEWAY_API_KEY`).
- Depends on Anthropic Claude Code GitHub Action v1 for the "Export feature bundle as a PR" step ([docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code/github-actions)).
- Permissions strictly via existing `AUTH_CANONICAL.md` (Supabase JWT `platform_role` claim). No new framework.

---

## 7. Roadmap impact

### New entry in `docs/20260227-bsuite-master-roadmap-v5.00W.md` (Cross-Project Initiatives section)

> **Codehouse Parity & Platform 360 (2026-05-06)** — A cross-app workstream tracking 35 Codehouse Workforce-One parity gaps and a Platform-360 capability spec (every feature × every portal × every role × every data-flow). Index plan: [`docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md`](./plans/20260506-codehouse-parity-and-platform-360-v1.00W.md). Domains tracked in the parity matrix (external). Six workstreams: WS-A through WS-F. Permissions remain `AUTH_CANONICAL.md` + Supabase RLS + BSuite SSO — **no new RBAC/ABAC framework**.

### New phase block in `docs/20260501-merged-execution-backlog-v1.00W.md`

> **## Phase P-360 — Codehouse Parity & Platform 360 (parallel to Phases 4–6)**
>
> | ID | Item | Owner | Source |
> |---|---|---|---|
> | **P360-A** | WS-A: Parity tracking integration (this PR) | Cascade / Claude Code | This index plan §2 |
> | **P360-B** | WS-B: 12 grouped GitHub issues for the 35 parity gaps | Issue-filer subagent | This index plan §2 |
> | **P360-C** | WS-C: Dashboard schema additive extension (`parity_status`, `feature_360_status`, `portal_coverage`) | Dashboard subagent (post #535) | This index plan §2 |
> | **P360-D** | WS-D: 9 portal sub-plans (Platform-360 spec) | This PR | This index plan §5 |
> | **P360-E** | WS-E: `/dev/feature-builder` full-stack route in BSU | BSU / Claude Code | This index plan §6 |
> | **P360-F** | WS-F: Doc-drift sweep (17 items from inventory) | Cascade | Refined prompt §F1 |

---

## 8. Issue tracker linkage

Issue numbers were supplied by the issue-filer subagent as bsuite#567–#579. Each row maps a parity-matrix domain to its owning issue where one was filed; `TBD` rows are either better-than-Codehouse domains or broader Platform-360 coverage rows rather than standalone parity gaps.

| Domain | Codehouse area | Owning issue | Owner app |
|---|---|---|---|
| A | Timesheet Entry | bsuite#567 | crm7 |
| B | Approval Workflow | bsuite#568 | crm7 |
| C | Pay Items | bsuite#569 | crm7 + @bsuite/charge-calc |
| D | Award Interpretation | bsuite#TBD | @bsuite/charge-calc |
| E | Pay Periods | bsuite#575 | crm7 |
| F | Leave | bsuite#573 | crm7 |
| G | Roles & Permissions | bsuite#TBD | bsu + supabase |
| H | Hiring / Placements | bsuite#578 | crm7 + conduit |
| I | User Accounts | bsuite#TBD | bsu |
| J | Notifications | bsuite#571 | crm7 + edge functions |
| K | Reporting | bsuite#574 | crm7 |
| L | Export / Integrations | bsuite#570 + bsuite#576 | crm7 + R80.3 |
| M | Settings | bsuite#578 | bsu + crm7 |
| N | Awards / Compliance | bsuite#578 | @bsuite/charge-calc |
| O | Mobile / Portal | bsuite#572 | crm7 + conduit |
| P | Multi-tenant | bsuite#TBD | bsu |
| Q | Public Portals | bsuite#TBD | conduit + braden |
| R | Documents / E-sign | bsuite#TBD | crm7 |
| S | Workflow / Automation | bsuite#TBD | crm7 |
| T | Audit | bsuite#TBD | bsu + crm7 |
| U | Integrations | bsuite#577 | crm7 + R80.3 |

---

## 9. Execution rules

**Anti-Laziness rulebook (CLAUDE.md §1) applies in full.** No "leaving for another session." No "TODO: implement later." Every gap row must be either shipped, blocked-by-external-dep with a tracker issue, or explicitly closed by red-team.

**Red-team requirements (refined-prompt §Skills, `multi-agent-red-team-planning`):**

- Every WS-D portal sub-plan must be reviewed by at least one subagent against `AUTH_CANONICAL.md` for permission-model conformance (no implicit cookie SSO; PKCE only).
- Every WS-E builder spec acceptance criterion must be challenged by a subagent for scope creep (production-runtime page editing for non-dev users is OUT OF SCOPE).
- Every WS-A backlog row that proposes work must cite at least one skill + one MCP + one 2026 official-doc URL — enforced by the `code-review` skill on PR.

**Skills to use during execution** (cite refined-prompt §Skills & MCPs):

- `planning-and-roadmapping` · `writing-plans` · `multi-agent-red-team-planning` · `documentation-compliance` · `git-workflow` · `dispatching-parallel-agents` · `verification-before-completion` · `qa-and-verification` · `bsuite-brand-system` · `dnd-kit` · `framer-motion` · `shadcn-ui` · `tailwind` · `supabase` · `supabase-postgres-best-practices` · `supabase-auth-comprehensive` · `forms-and-validation` · `tanstack-query`.

**MCPs to use during execution:**

- GitHub (issue/PR/branch protection) · Supabase MCP (`apply_migration`, `execute_sql`, `get_advisors`, `deploy_edge_function`) · Vercel (deployment status, AI Gateway key) · GitHub MCP direct (issue tasklists) · Memory API (`bsuite_plan_codehouse_parity_*` keys).

---

## 10. Acceptance criteria

This index plan is considered "shipped at status W" when ALL of the following are verifiable:

1. ✅ This file exists at `docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` and is ≤300 lines.
2. ✅ The refined-prompt copy-in exists at `docs/plans/inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00W.md` and is byte-identical to the source.
3. ✅ All 9 portal sub-plans exist under `docs/plans/20260506-codehouse-parity/20260506-portal-*.md`, each ≤250 lines.
4. ✅ Visual-feature-builder spec exists at `docs/plans/20260506-codehouse-parity/20260506-visual-feature-builder-spec-v1.00W.md` and is ≤250 lines.
5. ✅ `find docs/plans -name "20260506-*" -type f | sort` returns exactly 12 files (1 index + 1 inputs + 9 portals + 1 spec).
6. ✅ Every YAML frontmatter block in the 12 files has `name`, `description`, and `type` keys per `documentation-compliance` skill.
7. ✅ Master roadmap (`docs/20260227-bsuite-master-roadmap-v5.00W.md`) gains the new "Codehouse Parity & Platform 360" section linking to this file.
8. ✅ Merged execution backlog (`docs/20260501-merged-execution-backlog-v1.00W.md`) gains the new "Phase P-360" block.
9. ✅ `docs/plans/STATUS.md`, `docs/plans/README.md`, and `docs/OUTSTANDING.md` each gain at least one row pointing to this file.
10. ✅ All internal links resolve (relative paths work from each file's location).
11. ✅ No code changes / no migrations / no React component edits in this PR — docs-only.
12. ✅ Every row in §7 (roadmap impact) and §8 (issue tracker linkage) is non-empty (issue numbers may be `TBD` pending WS-B).

Status flips W→A only after operator approval AND red-team review of all 9 portal sub-plans.

---

## 11. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-06 | autonomous subagent (Claude Opus 4.7) | Initial creation under branch `docs/codehouse-parity-and-platform-360-plan` from `development`. Status: W. Scope: WS-A1 + WS-A4 + WS-D scaffolding + WS-E spec. WS-B (issues), WS-C (dashboard JSON), WS-E1–E5 (builder code), WS-F (doc-drift sweep) are deferred to follow-up PRs. |

---

## Related documents

- [`./inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00W.md`](./inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00W.md) — refined prompt (heavy-tier)
- [`../20260227-bsuite-master-roadmap-v5.00W.md`](../archive/README.md) *(archived — was `20260227-bsuite-master-roadmap-v5.00W.md`)* — master roadmap
- [`../20260501-merged-execution-backlog-v1.00W.md`](../archive/README.md) *(archived — was `20260501-merged-execution-backlog-v1.00W.md`)* — single execution queue
- [`../../AUTH_CANONICAL.md`](../../AUTH_CANONICAL.md) — auth reference (BS OAuth 2.1 PKCE + Supabase RLS)
- [`./20260506-codehouse-parity/20260506-visual-feature-builder-spec-v1.00W.md`](./20260506-codehouse-parity/20260506-visual-feature-builder-spec-v1.00W.md) — WS-E spec
