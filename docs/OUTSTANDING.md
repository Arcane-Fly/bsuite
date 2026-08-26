# BSuite Docs — Outstanding Work Index (HISTORICAL SNAPSHOT — not a source of truth)

> ## ⚠ DEMOTED 2026-08-14 — do not treat this file as current
>
> This document called itself **"SINGLE SOURCE OF TRUTH for all outstanding work"** from
> 2026-04-24 until 2026-08-14, while:
>
> - its content was last reconciled **2026-07-08** — five weeks stale at demotion;
> - the very next line after the claim **repointed to a different document**, and a second
>   repoint three weeks later superseded *that* one. A source of truth that opens by
>   telling you to read something else is an index, not a truth.
>
> That is the same failure shape as the plan-completion dashboard retired on 2026-08-10
> (`docs/20260810-plan-dashboard-retirement-v1.00F.md`), which was "named 'source of
> truth' in this file for three months while being wrong." Its lesson applies verbatim
> here: **a status surface must show only what it derives at render time. Anything it
> cannot recompute belongs in a dated document, where its age is visible.**
>
> A stale index is worse than no index — it answers confidently and wrongly.
>
> ### Ask the live source instead
>
> | Question | Where the answer actually lives |
> |---|---|
> | What is open? | `gh issue list` / `gh pr list` |
> | What is in the database? | `supabase_migrations.schema_migrations` — better, assert the object: `to_regclass`, `pg_policies`, `information_schema` |
> | Did a promotion apply? | The Supabase Migrations workflow run on `main` |
> | What was decided, and why? | `docs/00-roadmap/20260808-operator-decision-register-v1.00W.md` |
> | What is the canonical roadmap? | `docs/00-roadmap/20260112-master-roadmap-v1.00F.md` |
> | Is irreplaceable data intact? | `scripts/verify-class-a-preservation.mjs` |
>
> The sections below are retained **as a dated 2026-07-08 snapshot** for historical
> context. Treat every claim in them as a statement about 8 July, not about today.

**Status:** HISTORICAL SNAPSHOT — demoted 2026-08-14. Superseded by the live sources above.
**Generated:** 2026-04-24 (docs reconciliation pass — top-level `docs/*.md` + plan indexes)
**Content last reconciled:** 2026-07-08 — pointers updated to the then-current execution queue; leave/pay-periods/admin-parity parity tables marked DONE (see §Updates).

> **2026-07-08 pointer update:** The execution queue reference below points to `docs/20260501-merged-execution-backlog-v1.00W.md` which is now archived (`docs/archive/2026-07/`). The **current** active execution queue is [`docs/plans/20260629-bsuite-remaining-work-roadmap-v1.00F.md`](./plans/20260629-bsuite-remaining-work-roadmap-v1.00F.md). For GTO-specific work, see [`docs/plans/20260703-gto-e2e-gap-map-v1.00F.md`](./plans/20260703-gto-e2e-gap-map-v1.00F.md).
>
> **2026-07-28 repoint:** The 2026-06-29 doc referenced above was itself subordinated on 2026-07-27
> to the suite-wide canonical. The **canonical master roadmap is now**
> [`docs/00-roadmap/20260112-master-roadmap-v1.00F.md`](./00-roadmap/20260112-master-roadmap-v1.00F.md)
> — go there directly rather than via the 0629 doc, which is retained for historical phase context
> only.
>
> **Items completed since 2026-04-24 that were tracked here as outstanding:**
> - Leave persistence layer (leave parity spec, 5 tables) — DONE (migs 20260704150000–150200, W4)
> - Pay periods table — DONE (live, 2026-07-04)
> - Admin parity tables (4 entities: CITB levy, ETP pay items, PH groups, purchase orders) — DONE (mig 20260708130000)
> - ADR-0006 contact propagation trigger — DONE (mig 20260708140000, reverse propagation live)
> - Unified authoring surface Phase 1 — SHIPPED (chunks 1–4, 2026-07-03)
> - GTO E2E gap map — COMPLETE (W0–W7)

**Updated (original):** 2026-05-19 — Per-submodule `OUTSTANDING.md` / `OUTSTANDING-SYSTEM.md` / `OUTSTANDING-PLANS.md` files removed (bsuite#488). This file is now the only `OUTSTANDING.md` in the BSuite parent + submodule tree.
**Scope:** `docs/*.md` at repo root — excludes `docs/archive/*` and `docs/plans/*` (managed separately).
**Audit authority:** See `docs/plans/README.md` for the plans-layer index.

> **🧭 CANONICAL MASTER ROADMAP (repointed 2026-07-28):** The suite-wide canonical is
> [`docs/00-roadmap/20260112-master-roadmap-v1.00F.md`](./00-roadmap/20260112-master-roadmap-v1.00F.md).
> The previously-designated queue, [`docs/plans/20260629-bsuite-remaining-work-roadmap-v1.00F.md`](./plans/20260629-bsuite-remaining-work-roadmap-v1.00F.md),
> was subordinated to it on 2026-07-27 and is retained for historical phase context only. The
> earlier `20260501-merged-execution-backlog-v1.00W.md` and `20260425-bsuite-finish-line-roadmap-v1.00W.md`
> remain archived in `docs/archive/2026-07/`. This index remains a per-file status tracker for each
> living W-status doc in the parent `docs/` tree.
>
> **Submodule files removed by bsuite#488:** `crm7/docs/OUTSTANDING.md`, `R80.3/docs/OUTSTANDING.md`, `conduit/docs/OUTSTANDING.md`, `braden/docs/OUTSTANDING.md`, `business-suite-unified/docs/OUTSTANDING-SYSTEM.md`, `business-suite-unified/docs/OUTSTANDING-PLANS.md`. All their content lives in the merged execution backlog above.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Development Completion Gates

These gates apply before any item moves from `development` completion to production
promotion:

- Vercel/CI must be green on the owning app's `development` branch.
- The one-shot compliance gate in
  `20260227-dry-one-shot-architecture-v1.04A.md` must pass for changed data flows.
- `@bsuite/*` consumers must use published npm semver ranges in deployable app
  `package.json` files; `workspace:*` and `file:../packages/*` are local-only.
- No merge from `development` to `main`/`master` without explicit user approval.

---

## 1 — Live Reference Files (KEEP — do not archive)

These are authoritative, continuously applicable documents. They evolve in place and are never archived unless explicitly superseded by a named replacement.

| File | Purpose |
|------|---------|
| `20260227-auth-map-reference-v1.00A.md` | Authentication topology across BSU, CRM7, R80.3, Braden — OAuth 2.1, session boundaries, token refresh chains |
| `00-roadmap/20260112-master-roadmap-v1.00F.md` | **Primary planning source of truth.** All sprints, P0–P3 gaps, audit sprint status, and recently-completed items live here. *(repointed 2026-07-28 — the previous entry here, `20260227-bsuite-master-roadmap-v5.00W.md`, was archived 2026-07-08; `20260415-roadmap-audit-delta-v1.00W.md` is retained for historical v5.0xW version-bump context only.)* |
| `20260227-contributing-standards-guide-v1.01W.md` | Universal code quality, documentation naming, and commit standards for all BSuite projects (supersedes v1.00A which is archived) |
| `20260227-dry-one-shot-architecture-v1.04A.md` | DRY / one-shot data entry architecture; §1 Entity Ownership Map is the canonical cross-app ownership reference |
| `20260228-d2c-theme-specification-v1.00A.md` | D2C Neon Electric theme specification — OKLCH palette, Tailwind token map, CSS variable contract |
| `20260228-gto-standards-reference-v1.00A.md` | National Standards for Group Training Organisations evidence guide (GTO compliance) |
| `20260310-fairwork-reference-v1.00A.md` | Fair Work Act compliance reference for Australian VET sector |
| `20260316-claude-code-prompts-reference-v1.00A.md` | Self-contained prompts for Claude Code to execute remaining roadmap items |
| `20260316-compliance-reference-v1.00A.md` | BSuite compliance documentation (WCAG, data handling, regulatory) |
| `20260316-matrix-reference-v1.00A.md` | Feature/requirements matrix across all apps |
| `20260316-navigation-reference-v1.00A.md` | Navigation structure reference (canonical — `navigation-guide-v1.00A` archived as donor/duplicate) |
| `20260316-pricing-strategy-v1.00A.md` | Subscription and per-seat pricing strategy with AI add-on tiers |
| `20260316-ui-reference-v1.00A.md` | BSuite UI architecture — canonical UI source chain, component layer map |
| `20260421-auth-hardening-runbook-v1.00A.md` | Operator runbook for auth hardening — incident response, key rotation, Supabase RLS checks |
| `20260422-tga-api-integration-reference-v1.00W.md` | TGA API integration specification reference (live spec, implementation in progress) |
| `20260424-env-var-audit-findings-v1.00A.md` | 2026-04-24 cross-repo Vercel/env audit findings — security bugs, deploy-time bombs, and cleanup priority |
| `20260424-env-var-audit-matrix-v1.00A.md` | 166-variable × 6-project env declaration/usage matrix |

---

## 2 — Incomplete / Working Documents

Files with `.00W` (Working) or `.00D` (Draft) status that have open actions. Update status to `.00A` (Approved) once all actions are resolved.

<!-- Added 2026-05-06: Codehouse parity & Platform 360 — see docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md -->

### `plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` (added 2026-05-06)

Index plan integrating Codehouse Workforce-One parity tracking with full Platform-360 capability/portal/role coverage. Companion files: 9 portal sub-plans + 1 visual feature builder spec under `plans/20260506-codehouse-parity/`; refined-prompt provenance at `plans/inputs/20260506-codehouse-parity-prompt-enhancer-output-v1.00F.md`.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | ~~File grouped GitHub issues for the Codehouse parity gaps (WS-B)~~ — Filed as bsuite#567–#579; only #570 and #572 remain open as of 2026-06-04. | ✅ Complete |
| 2 | ~~Dashboard JSON additive extension — `parity_status`, `feature_360_status`, `portal_coverage` (WS-C, post PR #535)~~ — Live in `docs/dashboard/data/dashboard-data.json`; #570 adapter-export progress added via crm7#988. | ✅ Complete |
| 3 | Ship `/dev/feature-builder` route in BSU per spec (WS-E) | BSU / Claude Code |
| 4 | Doc-drift sweep — 17 items from `bsuite-inventory.md` (WS-F) | Cascade |
| 5 | ~~6 submodule `OUTSTANDING.md` + `docs/plans/STATUS.md` link rows (WS-A3)~~ — Per-submodule OUTSTANDING files removed entirely per bsuite#488 on 2026-05-19; the parent merged backlog is the SSoT. STATUS.md citations remain in scope but are now decoupled from the OUTSTANDING-link sweep. | ✅ OUTSTANDING-side complete |
| 6 | Red-team review across all 9 portal sub-plans before flipping plan W→A | multi-agent-red-team-planning |
| 7 | Continue bsuite#570 after the adapter/credential/settings/status/EOFY-provider-request slices — crm7#988 merged MYOB/Astute export adapters, crm7#989 merged Vault-backed provider credential storage plus Astute DB provider support, crm7#990 surfaced those credentials in Settings, crm7#991 added ADR-compatible provider-passthrough STP/EOFY status tracking on payroll runs, and crm7#992 added the guarded EOFY provider request confirmation flow. Remaining work is provider API acknowledgement sync beyond the tracked handoff; direct ATO lodgement remains blocked by ADR 0004 unless superseded. | CRM7 implementer |

### `plans/20260521-reports-w2-uplift-implementation-v1.00F.md` (added 2026-05-21)

Reports W2 uplift execution ledger for Codehouse parity reports. Tasks 4, 6.1-6.6, Task 7, and Task 9 are merged on `development`; remaining work is the deferred Task 3a stepper extraction reuse guardrail and follow-on scheduling UI.

| # | Remaining action | Owner |
|---|------------------|-------|
| 1 | ~~Complete Task 9 dashboard/outstanding-work linking and evidence URL refresh~~ | ✅ Complete via bsuite#1395 |
| 2 | ~~Keep report-list uplift linked to the active backlog rather than reopening Task 7 backend reliability~~ | ✅ Complete via crm7#987 |
| 3 | Keep follow-on scheduling UI linked to the active backlog rather than reopening Task 7 backend reliability | CRM7 implementer |

### `archive/2026-06/20260317-bsuite-gap-report-v2.00W.md`

Living gap register — supersedes v1. Accumulates sprint findings.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | ~~Bump master roadmap header to v5.03W and cross off four `#26` subtasks (26a, 26e, 26f, 26g) — details in `20260415-roadmap-audit-delta-v1.00W.md`~~ | ✅ Complete |
| 2 | ~~RT-10: Audit BSU `react-day-picker` v8 usage and migrate to v9~~ | ✅ Complete — BSU uses `react-day-picker@^9.14.0` |
| 3 | CC-3: CRM7 Tier 3-4 broad page wiring (remaining pages in SP-3) — in progress | Claude Code |

---

### `archive/2026-06/20260319-entity-crosswalk-v1.00D.md`

198-entity inventory mapped to DB table, Zustand store, route, selector, gap.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Build P1 priority new selectors: `AwardSelector`, `TrainingPlanSelector`, `PlacementSelector`, `ChargeRateSelector` (all needed for Tier 3-4 page wiring) | Claude Code |
| 2 | Promote status from Draft (D) to Working (W) once P1 selectors land; to Approved (A) once all P2 selectors land | Cascade |
| 3 | P2 selectors: `TrainingProviderSelector`, `FundingClaimSelector`, `VacancySelector`, `HostAgreementSelector` | Claude Code |

---

### `20260415-roadmap-audit-delta-v1.00W.md`

Delta audit confirming four P2 `#26` subtasks already complete. Rollup is now reflected in the master roadmap (`20260227-bsuite-master-roadmap-v5.00W.md` header `v5.03W`, `Last Updated: 2026-05-01`, 26a/26e/26f/26g struck, AUD-15/AUD-16 marked done).

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | ~~Roll findings into `20260227-bsuite-master-roadmap-v5.00W.md`: bump header to v5.03W, cross off 26a/26e/26f/26g, update AUD-15/AUD-16~~ | ✅ Complete |
| 2 | Companion agent-handoff issue no longer required; the master roadmap already cites the merged execution backlog as the active queue | ✅ Superseded |
| 3 | Archive/provenance cleanup only: source delta now lives under `docs/archive/parent/2026-04-30-audits-closed/` | ✅ Complete |

---

### ~~`20260420-react-hooks-v7-tech-debt-v1.00W.md`~~ → archived as `v1.00A` (closed 2026-05-19)

ESLint react-hooks v7 warning remediation tracker — **COMPLETE**. All five rules promoted from `warn` to `error` across BSU, braden, and throughput. Closure PRs: bsu#235 (2026-05-12), braden#290 (2026-05-19), throughput#179 (2026-05-19). Parent ref-bump PR: `chore/bump-react-hooks-v7-cleanup-refs`. Archived tracker: `docs/archive/parent/2026-04-30-audits-closed/20260420-react-hooks-v7-tech-debt-v1.00A.md`.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | ~~Remediate BSU 47 react-hooks warnings~~ | ✅ Closed bsu#235 (2026-05-12) |
| 2 | ~~Remediate braden 21 react-hooks warnings~~ | ✅ Closed braden#290 (2026-05-19) — zero findings at close; config-only promotion |
| 3 | ~~Promote demoted rules from `warn` → `error` in BSU, braden, throughput eslint configs~~ | ✅ Complete in closure PRs |

---

### `20260421-k8-retroactive-audit-v1.00W.md`

Part K.8 retroactive checklist for 7 commits in the 2026-04-21 cycle.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | All future PRs (J.2, J.3, J.5.*, J.6) must include K.8 checklist inline in the PR body per Part K.8 template (ongoing enforcement gate) | All implementers |
| 2 | Verify PR bsuite#126 and conduit#80 descriptions link to this doc for the K.8 state of their respective commits | Cascade |
| 3 | Once all J-series PRs have shipped with K.8 inline, promote this doc to Approved (A) as a permanent retroactive record | — |

---

### `20260421-storage-rls-reserved-prefixes-v1.00W.md`

M.6 state: reserved-prefix RLS policy for `tenant-logos` bucket.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Apply RLS policy update via Supabase Dashboard (5-min click-through): update `tenant_logos_insert/update/delete` to exclude `hero/platform/global` prefixes from tenant-admin clause | Braden (operator) |
| 2 | Run four-persona `execute_sql` verification matrix from Supabase SQL editor after dashboard change | Cascade |
| 3 | Update doc status to F (Frozen) once dashboard changes land and matrix passes | — |

---

### `20260421-supabase-realtime-blocks-rollout-v1.00W.md`

G.3 rollout plan for `realtime-chat` (CRM7), `realtime-cursor` (Conduit), `realtime-monaco` (CRM7).

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Install `realtime-chat` block in CRM7 (separate PR, feature-flagged OFF) — first block per recommended order | Claude Code |
| 2 | Install `realtime-cursor` block in Conduit pipeline page (separate PR, feature-flagged OFF) | Claude Code |
| 3 | Install `realtime-monaco` block in CRM7 (last — biggest UX complexity; after chat integration stabilises) + add `wss:*.supabase.co` to CSP `connect-src` in each app's `vercel.json` | Claude Code |

---

### `20260422-typescript-6-migration-evaluation-v1.00W.md`

N.7.c evaluation doc. All 6 apps are GO at TS 6.0 GA + typescript-eslint compat.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Wait for gate: TS 6.0.0 on `latest` npm + `typescript-eslint@^8.x` compat release + throughput preview-branch trial before any app migration | — |
| 2 | Execute sequenced migration (throughput → braden → conduit → R80.3 → CRM7 → BSU); bump and publish `@bsuite/*` shared packages first, then update consumers to npm semver only | Claude Code |
| 3 | Promote doc status to A (Approved) when next-cycle implementation plan is opened referencing this evaluation as risk assessment | — |

---

### `20260423-cross-app-write-audit-v1.00W.md`

Phase 4 V3+V4 audit. Superseded as a suite-wide one-shot signal by the
2026-04-24 audit. The original V3/V4 checks still stand, but current roadmap
execution must treat the broader ownership leaks below as active blockers.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | R80.3 must stop writing CRM7-owned `apprentices`; R80 should read apprentices and persist calculator state to R80-owned calculation tables only | Claude Code |
| 2 | BSU ideas CRUD (`business-suite-unified/src/lib/ideaService.ts:60`) must be converted to Throughput deep links/read-only aggregation or the ownership map must be formally changed | Claude Code |
| 3 | Braden lead writes from BSU embed (`business-suite-unified/src/pages/Embed/LeadForm.tsx:109`) must route through a Braden-exposed endpoint or shared edge function | Claude Code |
| 4 | Schema-builder authoring — remove CRM7 writes to `custom_pages`/`custom_page_blocks` (`crm7/src/pages/settings/schema-builder/*`); BSU `/developer/pages` is canonical per Phase 5 | Claude Code |
| 5 | Tenant/team writes outside BSU: CRM7 `src/services/tenantService.ts:63` writes `tenant_branding`/`platform_branding` (BSU-owned); Throughput `src/lib/teamPermissions.ts:302` writes `team_members`. Route through BSU API or formalise co-ownership. | Claude Code |
| 6 | `apprentice_rate_configs` + `wage_calculation_snapshots` shared between CRM7 + R80.3 — formalise ownership per the combined-GTO-plan N-2 finding; unified `create_append_only_audit()` helper is the long-term shape | Claude Code |
| 7 | V10 — OAuth auth-callback hardcoded-production fallbacks: R80.3 `src/pages/AuthCallback.tsx:44`, throughput `src/pages/auth/AuthCallback.tsx:48-50`. Fix alongside BSU `redirectTargets.ts` in WS-4 of the dev-branch-closure plan. | Claude Code |

---

### `20260423-misplaced-routes-audit-v1.00W.md`

Phase 12.1 audit. 6 route moves (F-01…F-06) remain active in the merged backlog; they must land as atomic redirect/delete PRs with no duplicate authoring surfaces left behind.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | F-01/F-02/F-03: Replace CRM7 `/settings/branding`, `/settings/organization`, `/settings/tester-licenses` with `<RedirectTo>` pointing at BSU equivalents (post-Phase 7 merge — CRM7 checkout held by Phase 7) | Phase 12 follow-up PR |
| 2 | F-04/F-05/F-06: Remove duplicated branding/onboarding/schema-builder UI from R80.3 (post-Phase 7 merge — R80.3 checkout held by Phase 7) | Phase 12 follow-up PR |
| 3 | Promote doc to A (Approved) once F-01…F-06 PRs merge and F-08/F-10 are closed through merged backlog items P2-19/P2-20 | — |

---

### `20260424-env-var-contributing-rules-v1.00W.md`

Standing env/Vercel rules extracted from the 2026-04-24 audit.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Align all app `.env.example` files and Vercel env entries to the canonical publishable/secret-key naming rules | Claude Code / operator |
| 2 | Add CI assertions for forbidden `VITE_*SECRET`, legacy Supabase JWT-era names, missing `.env.example` entries, and client-bundle secret leaks | Claude Code |
| 3 | Promote doc to A once CI enforcement exists and app examples are aligned | — |

---

### `packages/schema-builder/docs/testing-notes.md` — completed Vitest matcher cleanup

Package-internal testing notes formerly documented a vitest `2.1.9` + `jsdom` +
`@testing-library/jest-dom` interaction where `.rejects.toThrow('string')`
failed. As of 2026-05-05, `@bsuite/schema-builder` is on `vitest@^4.1.5`,
native `.rejects.toThrow(...)` matchers pass in the current setup, and the
legacy workaround has been removed.

| # | Completed action | Owner |
|---|-----------------|-------|
| 1 | ~~Verify the simplest reproduction passes in this package's current `vitest@^4.1.5` setup (`await expect(Promise.reject(new Error('x'))).rejects.toThrow('x')`)~~ | ✅ Complete |
| 2 | ~~Restore the ergonomic `.rejects.toThrow('…')` pattern in affected tests and delete the stale gotcha/history sections from `packages/schema-builder/docs/testing-notes.md`~~ | ✅ Complete |

---

## 3 — Archived / Clarified This Pass

### 2026-05-05 bucket — `docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/`

Schema Builder Phase 3 was red-team verified and archived after completion evidence
confirmed all Phase 3 workstreams were closed.

| File | Status | Moved from | Description |
|------|--------|------------|-------------|
| `20260504-schema-builder-phase-3-plan-v1.00W.md` | A — archived; original `W` filename preserved for traceability | `docs/` | 100% complete: Workstreams A/B/C closed by signoff; `@bsuite/schema-builder@0.7.0` tests, typecheck, and build pass. |
| `20260504-schema-builder-phase-3-signoff-v1.00W.md` | A — archived; original `W` filename preserved for traceability | `docs/` | Authoritative Phase 3 completion record; no Phase 3 follow-ups remain. |

### 2026-05-01 bucket — `docs/archive/2026-05-01-vitest-canonical/`

Vitest-canonical docs cleanup (user directive 2026-04-28 + 2026-05-01 — correct stale Jest claims across the monorepo; every project and shared package uses Vitest). 1 file moved.

| File | Moved from | Archive reason |
|------|-----------|----------------|
| `20260227-contributing-standards-guide-v1.00A.md` | `docs/` | Explicitly superseded by `20260227-contributing-standards-guide-v1.01W.md` — .00A carried the stale "Jest (Next.js)" claim; .01W is the corrected live version |

### 2026-05-01 — Schema-builder migration consolidation

No archive move this time — a documentation/convention clarification. The 3 schema-builder SQL migrations (`20260503000000_add_field_level_relations.sql`, its rollback twin, and `20260504000000_schema_reflection_rpc.sql`) were previously only colocated with the `@bsuite/schema-builder` package, split across two inconsistent paths (`packages/schema-builder/supabase/migrations/` and a stray `packages/schema-builder/src/supabase/migrations/`). This meant consumer apps deploying via Vercel/Railway CI never picked them up, since `supabase db push` targets the consumer's own `supabase/migrations/` dir.

Resolution:

- Copied all 3 migrations verbatim into `business-suite-unified/supabase/migrations/` (BSU is the canonical DB-migration owner for the whole BSuite monorepo — every other consumer reads from BSU's schema via shared Supabase project `tuybltdrdefjblnplpqo`).
- Consolidated the stray `packages/schema-builder/src/supabase/migrations/` path into `packages/schema-builder/supabase/migrations/` so the package has exactly ONE dev-fixture location.
- Added `packages/schema-builder/supabase/migrations/README.md` documenting the canonical-vs-fixture split and the sync workflow.
- Package version bumped 0.5.0 → 0.5.1.

Shipped via:

- `business-suite-unified` PR — migration mirror (target: `development`)
- `bsuite` parent PR — package version bump + README + CHANGELOG + BSU submodule pointer bump + this doc update (target: `development`)

### 2026-04-25 bucket — `docs/archive/2026-04-25-universal-canvas-wave/`

Wave-5 ARCHIVAL sweep (user directive 2026-04-25 — docs cleanup + archival of
completed work). 2 files moved from their prior locations to this bucket. See
`docs/archive/2026-04-25-universal-canvas-wave/README.md` for the full table
and the list of 10 further archive candidates whose triggers have not yet
fired.

| File | Moved from | Archive reason |
|------|-----------|----------------|
| `20260423-phase5-schema-pagebuilder-implementation-v1.00W.md` | `docs/plans/` | 1528-line Phase 5 impl plan — all 7 PRs (5.0 → 5.6) landed; superseded by `docs/20260425-universal-canvas-master-execution-plan-v1.00F.md` |
| `20260316-mermaid-ui-builder-reference-v1.00A.md` | `docs/` | March 2026 legacy diagram-driven UI vision — superseded by universal-canvas architecture (PageGridLayout + @bsuite/schema-registry + TenantLayoutSlot) |

### 2026-04-23 bucket — `docs/archive/2026-04/`

19 files moved from `docs/*.md` to `docs/archive/2026-04/` on 2026-04-23.

| File | Archive reason |
|------|---------------|
| `20260225-cascade-claude-upgrade-coordination-plan-v1.00F.md` | Historical coordination plan — work merged |
| `20260226-ux-oneshot-deep-dive-plan-v1.00W.md` | EntitySelector components built (7 exist); residual items tracked in `entity-crosswalk`; subsumed |
| `20260227-bsuite-deep-audit-report-v1.00A.md` | Point-in-time audit report — superseded by gap reports v1 + v2 |
| `20260301-crm7-page-inventory-v1.00A.md` | Superseded by live per-project inventories in crm7/docs |
| `20260301-crm7-rbac-matrix-v1.00A.md` | Superseded by compliance-reference and per-project RBAC docs |
| `20260303-bsuite-competitive-landscape-v1.00A.md` | Market research snapshot — historical, not maintained |
| `20260303-crm7a-executive-summary-v1.00WA.md` | Self-described ARCHIVED in document header |
| `20260303-crm7a-quick-reference-v1.00WA.md` | Self-described ARCHIVED in document header |
| `20260303-crm7a-repository-research-v1.00WA.md` | Self-described ARCHIVED in document header |
| `20260303-crm8u-code-snippets-v1.00A.md` | Early research — patterns adopted or superseded |
| `20260303-crm8u-github-research-v1.00A.md` | Early research — historical |
| `20260304-ram-credential-government-access-map-v1.00A.md` | Historical government API access map — superseded |
| `20260309-bsuite-completeness-matrix-v1.00A.md` | Superseded by gap report v2 completeness tracking |
| `20260316-bsuite-gap-report-v1.00A.md` | Explicitly superseded by v2 (`archive/2026-06/20260317-bsuite-gap-report-v2.00W.md`) |
| `20260316-docs-compliance-audit-v1.00A.md` | One-time audit — remediation complete |
| `20260316-navigation-guide-v1.00A.md` | Donor/duplicate of `navigation-reference-v1.00A.md`; self-marked ARCHIVED |
| `20260316-performance-report-v1.00A.md` | Snapshot superseded by `20260407-core-web-vitals-baseline` + theme-centralisation perf work |
| `20260407-core-web-vitals-baseline-v1.00A.md` | Measurement plan + baseline table; CWV Vercel Speed Insights wired; snapshot complete |
| `20260407-d2c-wcag-contrast-audit-v1.00A.md` | Remediation complete (2026-04-22 — noted in doc header); axe-core CI gate active; snapshot complete |

---

## Top 5 Outstanding Items (Priority Order)

Re-ranked 2026-04-25 after Wave-1 → Wave-4 of the universal-canvas sweep
landed. The universal-canvas master plan
(`docs/20260425-universal-canvas-master-execution-plan-v1.00F.md`) is the
primary execution source; IDs below match the finish-line roadmap
(`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`).

1. **P0-6 Part C — Supabase dashboard preview-URL allowlist** (operator action). Parts A + B shipped in this session; Part C is a 5-minute click-through in the Supabase dashboard to add preview-URL patterns to `additional_redirect_urls` for all 4 OAuth-client apps (CRM7, R80.3, Braden, Throughput). Blocks preview-branch auth for every client app. See `docs/20260424-oauth-preview-redirect-runbook-v1.00W.md` §Sign-off.
2. **P1-84 — Wave 1-C migration apply to live Supabase**. Code committed (BSU `20260425_phase5_tfd_entity_fk.sql` + `20260425_phase5_tfd_enterprise_admin_rls.sql` + `add_field` RPC at commit `43fb250`). Operator must push via `mcp__claude_ai_Supabase__apply_migration`; post-backfill verification `SELECT count(*) FROM tenant_field_definitions WHERE entity_id IS NULL` must return 0.
3. **Development → production Vercel-green gate**. Resolve production-plan Phase 6 blockers, especially the Conduit SSR prerender guard, before any production merge discussion. Remains the last gate between dev-green and production-promote.
4. **Environment security cleanup** — Execute the 2026-04-24 env audit priority list: remove client-exposed secret names, add missing RAM vars, and align Supabase publishable/secret key naming. Track in `docs/20260424-env-var-audit-findings-v1.00A.md` priority queue.
5. **Submodule deprecated-branch cleanup** — Org-admin cleanup tracked in `docs/20260428-orphan-branch-cleanup-handoff-v1.00W.md` and G-13 of the merged execution backlog.
