# BSuite Docs — Outstanding Work Index

**Generated:** 2026-04-24 (docs reconciliation pass — top-level `docs/*.md` + plan indexes)
**Scope:** `docs/*.md` at repo root — excludes `docs/archive/*` and `docs/plans/*` (managed separately).
**Audit authority:** See `docs/plans/README.md` for the plans-layer index.

> **🧭 CANONICAL ACTION LIST:** For the prioritised "what's left to do" roll-up with stable item IDs (P0-*/ P1-* / P2-*/ WS-*), read [`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`](./20260425-bsuite-finish-line-roadmap-v1.00W.md) FIRST. That doc is the single source of truth for remaining work across all 6 apps (154 items, cited to sources). This index remains a per-file status tracker for each living W-status doc; the finish-line roadmap is the cross-cutting action queue.

---

## Development Completion Gates

These gates apply before any item moves from `development` completion to production
promotion:

- Vercel/CI must be green on the owning app's `development` branch.
- The one-shot compliance gate in
  `20260227-dry-one-shot-architecture-v1.01A.md` must pass for changed data flows.
- `@bsuite/*` consumers must use published npm semver ranges in deployable app
  `package.json` files; `workspace:*` and `file:../packages/*` are local-only.
- No merge from `development` to `main`/`master` without explicit user approval.

---

## 1 — Live Reference Files (KEEP — do not archive)

These are authoritative, continuously applicable documents. They evolve in place and are never archived unless explicitly superseded by a named replacement.

| File | Purpose |
|------|---------|
| `20260227-auth-map-reference-v1.00A.md` | Authentication topology across BSU, CRM7, R80.3, Braden — OAuth 2.1, session boundaries, token refresh chains |
| `20260227-bsuite-master-roadmap-v5.00W.md` | **Primary planning source of truth.** All sprints, P0–P3 gaps, audit sprint status, and recently-completed items live here. Currently at v5.02W (see `20260415-roadmap-audit-delta-v1.00W.md` for pending v5.03W bump). |
| `20260227-contributing-standards-guide-v1.00A.md` | Universal code quality, documentation naming, and commit standards for all BSuite projects |
| `20260227-dry-one-shot-architecture-v1.01A.md` | DRY / one-shot data entry architecture; §1 Entity Ownership Map is the canonical cross-app ownership reference |
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

### `20260317-bsuite-gap-report-v2.00W.md`

Living gap register — supersedes v1. Accumulates sprint findings.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Bump master roadmap header to v5.03W and cross off four `#26` subtasks (26a, 26e, 26f, 26g) — details in `20260415-roadmap-audit-delta-v1.00W.md` | ship-all-apps / Cascade |
| 2 | RT-10: Audit BSU `react-day-picker` v8 usage; migrate to v9 or document intentional pin | Claude Code |
| 3 | CC-3: CRM7 Tier 3-4 broad page wiring (remaining pages in SP-3) — in progress | Claude Code |

---

### `20260319-entity-crosswalk-v1.00D.md`

198-entity inventory mapped to DB table, Zustand store, route, selector, gap.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Build P1 priority new selectors: `AwardSelector`, `TrainingPlanSelector`, `PlacementSelector`, `ChargeRateSelector` (all needed for Tier 3-4 page wiring) | Claude Code |
| 2 | Promote status from Draft (D) to Working (W) once P1 selectors land; to Approved (A) once all P2 selectors land | Cascade |
| 3 | P2 selectors: `TrainingProviderSelector`, `FundingClaimSelector`, `VacancySelector`, `HostAgreementSelector` | Claude Code |

---

### `20260415-roadmap-audit-delta-v1.00W.md`

Delta audit confirming four P2 `#26` subtasks already complete; pending rollup into master roadmap.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Roll findings into `20260227-bsuite-master-roadmap-v5.00W.md`: bump header to v5.03W, cross off 26a/26e/26f/26g, update AUD-15/AUD-16 | ship-all-apps / Cascade (next `--admin` pass) |
| 2 | File companion agent-handoff bsuite issue tracking the roadmap rollup | Cascade |
| 3 | Once master roadmap is updated, this delta doc's status moves to A (Approved) and can be archived | — |

---

### `20260420-react-hooks-v7-tech-debt-v1.00W.md`

ESLint react-hooks v7 warning remediation tracker. 47 warnings in BSU, 21 in braden, ~30 in throughput.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Remediate BSU 47 react-hooks warnings (batch by rule: `set-state-in-effect` ×30, `refs` ×6, `purity` ×4, `immutability` ×4, `preserve-manual-memoization` ×3) | Claude Code |
| 2 | Remediate braden 21 react-hooks warnings; tighten `pnpm lint` to `--max-warnings 0` once count reaches zero | Claude Code |
| 3 | Promote demoted rules from `warn` → `error` in `business-suite-unified/eslint.config.js` and `throughput/eslint.config.js` once counts reach zero | Cascade / Claude Code |

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

Phase 12.1 audit. 6 deferred route moves (F-01…F-06) pending Phase 7 merge.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | F-01/F-02/F-03: Replace CRM7 `/settings/branding`, `/settings/organization`, `/settings/tester-licenses` with `<RedirectTo>` pointing at BSU equivalents (post-Phase 7 merge — CRM7 checkout held by Phase 7) | Phase 12 follow-up PR |
| 2 | F-04/F-05/F-06: Remove duplicated branding/onboarding/schema-builder UI from R80.3 (post-Phase 7 merge — R80.3 checkout held by Phase 7) | Phase 12 follow-up PR |
| 3 | Promote doc to A (Approved) once F-01…F-06 PRs merge and F-08/F-10 (deferred P2 items) have owning tickets | — |

---

### `20260424-env-var-contributing-rules-v1.00W.md`

Standing env/Vercel rules extracted from the 2026-04-24 audit.

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Align all app `.env.example` files and Vercel env entries to the canonical publishable/secret-key naming rules | Claude Code / operator |
| 2 | Add CI assertions for forbidden `VITE_*SECRET`, legacy Supabase JWT-era names, missing `.env.example` entries, and client-bundle secret leaks | Claude Code |
| 3 | Promote doc to A once CI enforcement exists and app examples are aligned | — |

---

### `packages/schema-builder/docs/testing-notes.md` — vitest/jsdom workaround tracker

Package-internal testing notes. Documents a vitest `2.1.9` + `jsdom` +
`@testing-library/jest-dom` interaction where `.rejects.toThrow('string')`
fails with `TypeError: Cannot read properties of undefined (reading
'indexOf')` because `.message` is stripped across the async rejection
boundary. Current workaround: manual `.catch((e) => e)` +
`toBeInstanceOf(Error)` + `.message` property assertion (applied to 3
tests across `fieldService.test.ts` and `exportPng.test.ts`).

| # | Remaining action | Owner |
|---|-----------------|-------|
| 1 | Upgrade `@bsuite/schema-builder` to `vitest@^3` as part of the cross-project vitest upgrade; verify the simplest reproduction passes in this package's setup (`await expect(Promise.reject(new Error('x'))).rejects.toThrow('x')`) before declaring the upgrade successful | Claude Code |
| 2 | Once vitest 3 is confirmed-good, revert the manual-catch workaround in `src/__tests__/fieldService.test.ts` (2 assertions) and `src/__tests__/exportPng.test.ts` (1 assertion) back to the ergonomic `.rejects.toThrow('…')` pattern; delete the `## Gotcha` and `## History` sections of `packages/schema-builder/docs/testing-notes.md` | Claude Code |

---

## 3 — Archived This Pass

### 2026-04-25 bucket — `docs/archive/2026-04-25-universal-canvas-wave/`

Wave-5 ARCHIVAL sweep (user directive 2026-04-25 — docs cleanup + archival of
completed work). 2 files moved from their prior locations to this bucket. See
`docs/archive/2026-04-25-universal-canvas-wave/README.md` for the full table
and the list of 10 further archive candidates whose triggers have not yet
fired.

| File | Moved from | Archive reason |
|------|-----------|----------------|
| `20260423-phase5-schema-pagebuilder-implementation-v1.00W.md` | `docs/plans/` | 1528-line Phase 5 impl plan — all 7 PRs (5.0 → 5.6) landed; superseded by `docs/20260425-universal-canvas-master-execution-plan-v1.00W.md` |
| `20260316-mermaid-ui-builder-reference-v1.00A.md` | `docs/` | March 2026 legacy diagram-driven UI vision — superseded by universal-canvas architecture (PageGridLayout + @bsuite/schema-registry + TenantLayoutSlot) |

### 2026-04-23 bucket — `docs/archive/2026-04/`

19 files moved from `docs/*.md` to `docs/archive/2026-04/` on 2026-04-23.

| File | Archive reason |
|------|---------------|
| `20260225-cascade-claude-upgrade-coordination-plan-v1.00A.md` | Historical coordination plan — work merged |
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
| `20260316-bsuite-gap-report-v1.00A.md` | Explicitly superseded by v2 (`20260317-bsuite-gap-report-v2.00W.md`) |
| `20260316-docs-compliance-audit-v1.00A.md` | One-time audit — remediation complete |
| `20260316-navigation-guide-v1.00A.md` | Donor/duplicate of `navigation-reference-v1.00A.md`; self-marked ARCHIVED |
| `20260316-performance-report-v1.00A.md` | Snapshot superseded by `20260407-core-web-vitals-baseline` + theme-centralisation perf work |
| `20260407-core-web-vitals-baseline-v1.00A.md` | Measurement plan + baseline table; CWV Vercel Speed Insights wired; snapshot complete |
| `20260407-d2c-wcag-contrast-audit-v1.00A.md` | Remediation complete (2026-04-22 — noted in doc header); axe-core CI gate active; snapshot complete |

---

## Top 5 Outstanding Items (Priority Order)

Re-ranked 2026-04-25 after Wave-1 → Wave-4 of the universal-canvas sweep
landed. The universal-canvas master plan
(`docs/20260425-universal-canvas-master-execution-plan-v1.00W.md`) is the
primary execution source; IDs below match the finish-line roadmap
(`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md`).

1. **P0-6 Part C — Supabase dashboard preview-URL allowlist** (operator action). Parts A + B shipped in this session; Part C is a 5-minute click-through in the Supabase dashboard to add preview-URL patterns to `additional_redirect_urls` for all 4 OAuth-client apps (CRM7, R80.3, Braden, Throughput). Blocks preview-branch auth for every client app. See `docs/20260424-oauth-preview-redirect-runbook-v1.00W.md` §Sign-off.
2. **P1-84 — Wave 1-C migration apply to live Supabase**. Code committed (BSU `20260425_phase5_tfd_entity_fk.sql` + `20260425_phase5_tfd_enterprise_admin_rls.sql` + `add_field` RPC at commit `43fb250`). Operator must push via `mcp__claude_ai_Supabase__apply_migration`; post-backfill verification `SELECT count(*) FROM tenant_field_definitions WHERE entity_id IS NULL` must return 0.
3. **P0-15 — Master roadmap v5.03W rollup**. Bump `docs/20260227-bsuite-master-roadmap-v5.00W.md` header to v5.03W, strike `#26a/26e/26f/26g`, mark AUD-15/AUD-16 done. Unblocks archival of `20260415-roadmap-audit-delta-v1.00W.md`.
4. **Development → production Vercel-green gate**. Resolve production-plan Phase 6 blockers, especially the Conduit SSR prerender guard, before any production merge discussion. Remains the last gate between dev-green and production-promote.
5. **Environment security cleanup** — Execute the 2026-04-24 env audit priority list: remove client-exposed secret names, add missing RAM vars, and align Supabase publishable/secret key naming. Track in `docs/20260424-env-var-audit-findings-v1.00A.md` priority queue.
