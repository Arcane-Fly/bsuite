# Plans / Tracking — STATUS

**Last updated:** 2026-06-06

This is a quick-reference status board for the cross-app tracking issues
in the parent `bsuite` repo. It complements `docs/OUTSTANDING.md`
(per-doc index) and `docs/CONSISTENCY-REPORT.md` (cross-cutting a11y +
dependency status).

> **Plans NOT in this register:** sibling submodule `docs/plans/STATUS.md` files
> (crm7, conduit, business-suite-unified, R80.3, braden, throughput) carry the
> per-app rows. The long-horizon planning reference is
> [`docs/20260227-bsuite-master-roadmap-v5.00W.md`](../20260227-bsuite-master-roadmap-v5.00W.md);
> the active phase-ordered queue is
> [`docs/20260501-merged-execution-backlog-v1.00W.md`](../20260501-merged-execution-backlog-v1.00W.md).
> Cross-app a11y / dependency / auth status lives in
> [`docs/CONSISTENCY-REPORT.md`](../CONSISTENCY-REPORT.md).

## Active tracking issues

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#208](https://github.com/GaryOcean428/bsuite/issues/208) | P0 WCAG: Radix Dialog/Sheet DialogTitle | ✅ Done | All 6 submodules verified — see `CONSISTENCY-REPORT.md`. BSU PR #285 fixed the only finding. |
| [#209](https://github.com/GaryOcean428/bsuite/issues/209) | P0 WCAG: Login/register autoComplete | ✅ Done | Audit on 2026-05-04 found all input-bearing forms compliant. The other three apps redirect to BSU. |
| [#211](https://github.com/GaryOcean428/bsuite/issues/211) | P1 Deps: TypeScript 6.0 migration EPIC | 🟡 Tracked | Plan: `2026-05-04-typescript-6-migration.md`. Six child issues filed. Execution is gated to the 2026-Q3 maintenance window pending TS 6.0 latest + typescript-eslint compatibility. |
| [#635](https://github.com/GaryOcean428/bsuite/issues/635) | feat(uplift): BSuite Unified Design Language rollout — 9-wave loop tracker | 🔄 In progress | W0 + W1 done. W4 scoping landed (`bsuite#681`), W4/W6 BSU impl PRs pending merge (`BSU#376`, `BSU#375`). W2/W3/W5/W7 active or queued; W8 remains blocked on W7. Canonical tracker: `docs/plans/uplift/INDEX.md`. |
| [#1237](https://github.com/GaryOcean428/bsuite/issues/1237) | Reports W2 Uplift — Task 6 RPC schema-gap closure | 🔄 In progress | Tasks 6.1-6.6 shipped via `crm7#956` (`report_rejected_timesheets` + pgTAP + grant hardening), `crm7#957` (`report_hours_by_work_type` from entries JSONB), `crm7#958` (`report_pay_item_group_hours` hours-first pay item group mapping), `crm7#959` (`report_pay_items_by_employee` from invoice line items), `crm7#960` (`report_consultant_kpi` from assigned people/timesheets/invoice lines with selected-tenant field-officer gating), `crm7#985` (`report_coinvest_lsl` from `leave_balances.long_service` with admin/gto_admin gating), `crm7#986` (report delivery timezone/retry/error reliability hardening), and `bsuite#1395` (Task 9 dashboard/outstanding-work links). Remaining Reports W2 work is deferred Task 3a/4 report-list/stepper uplift plus follow-on scheduling UI. Plan: `20260521-reports-w2-uplift-implementation-v1.00W.md`. |
| [#1408](https://github.com/GaryOcean428/bsuite/issues/1408) | chore(shared): publish `@bsuite/charge-calc` 0.5.0 and bump consumers | ✅ Done | Closed 2026-06-05. `@bsuite/charge-calc@0.5.0` was published by the `bsuite#1424` workflow; `npm view @bsuite/charge-calc version` returns 0.5.0; CRM7#1010 and R80.3#303 consume `^0.5.0` on `development` with frozen installs, typechecks, and tests passing. |
| [#1422](https://github.com/GaryOcean428/bsuite/issues/1422) | Production-spec completion execution plan | 🔄 In progress | Plan: `20260605-production-spec-completion-plan-v1.00W.md`. Task 0 inventory verified 0 open PRs across seven repos. Filing #1422 as the durable production-spec tracker and closing #1408 after Task 1 leaves the live count at 157 open issues (bsuite 61, crm7 74, conduit 11, BSU 4, R80.3 3, braden 3, throughput 1). Task 1 is complete. Task 2 auth package rollout is merged: `@bsuite/auth@0.2.5` published via bsuite#1426 and consumed by CRM7#1011, R80.3#304, Braden#315, Throughput#203, Conduit#303, and BSU#535. Braden role hardening is merged via Braden#316. COOKIE-SSO forbidden-pattern CI is verified by `scripts/drift-scan.mjs --self-test` (50/50). Supabase/Vercel preview-env compatibility is merged across the Vite apps: BSU#538/#539, Throughput#209/#210, R80.3#307, Braden#319, and CRM7#1018/#1019 accept `VITE_SUPABASE_*` as primary with Vite-config bridges for `NEXT_PUBLIC_SUPABASE_*` / unprefixed publishable-key aliases on preview DB branches. Remaining Task 2 items continue with RLS/RPC verification and browser smoke. |
| TBD (WS-B) | Codehouse Parity & Platform 360 — index plan + 9 portal sub-plans + visual feature builder spec | 🟡 W (working) | Added 2026-05-06. Plan: `20260506-codehouse-parity-and-platform-360-v1.00W.md` + `20260506-codehouse-parity/` (10 sub-plans). 12 grouped issues will be filed by the issue-filer subagent in a parallel PR. Dashboard JSON extension is a follow-up PR (post #535). |
| TBD (O.11/O.12/O.13) | Theme centralisation, feature-placement boundaries, and docs coherence | 🟡 W (working) | Added 2026-05-11. Plan: `20260511-part-o11-theme-placement-doc-coherence-plan-v1.00W.md`. O.11 BSU theme POC runs before O.12 wizard re-placement; O.13 reconciles ownership/doc drift after the audit returns. |

## 2026-06-09 Production-readiness next-steps plan

| Group | Current status | Next action |
|-------|----------------|-------------|
| Next execution plan | Added `20260609-production-readiness-next-steps-plan-v1.00W.md` after package blockers cleared and Claude-for-Chrome visual smoke was requested. Updated with the 2026-06-09 smoke findings: Conduit production outage (`conduit#307`), CRM7 placement `pay_item_rules` schema error (`crm7#1029`), CRM7 dev blank first load (`crm7#1030`), Throughput dev OAuth loop (`throughput#214`), INP popup evidence, TCID/WAAMS wording, and block-release calendar gap. | Review/approve the plan, then execute in a fresh `executing-plans` thread. Gate 0 fixes Conduit production and CRM7 placement P0s before package rollout/feature work unless a package bump is proven necessary for the fix. |

## 2026-06-05 Production-spec Task 0 inventory matrix

| Group | Current status | Next action |
|-------|----------------|-------------|
| Production blockers | Application repos remain on `development`; do not promote to `main` until the Task 9 ship gate passes. `development` is ahead of `main` in all seven repos. | Finish Tasks 1-8, then open deliberate `development` -> `main` PRs one app at a time. |
| Operator blockers | The charge-calc npm publish blocker is cleared. Supabase/Vercel operator-only settings remain handled through issues when encountered; Task 1 self-reported repeated Vercel preview cancellations from the dashboard on CRM7#1010 and R80.3#303, with GitHub CI/local checks green. The Vite app code now supports both Supabase UI-recommended `VITE_SUPABASE_*` envs and Vercel/Supabase `NEXT_PUBLIC_SUPABASE_*` aliases, so the remaining operator action is native Supabase branching/preview DB wiring in bsuite#1460. | Continue non-blocked plan tasks; file/update issues when operator-only Supabase/Vercel settings block live verification. |
| Package blockers | `charge-calc`, `@bsuite/ui@0.4.0`, `@bsuite/schema-builder@0.7.3`, `@bsuite/page-builder@0.4.1`, `@bsuite/auth@0.2.6`, and `@bsuite/theme@0.4.1` are published. `@bsuite/schema-registry@0.3.5` remains blocked in bsuite#1432 because npm still serves 0.3.2 while source is 0.3.5. The suspected cause is missing npm Trusted Publisher setup for `@bsuite/schema-registry`; package releases should use GitHub Actions OIDC trusted publishing, not local `NPM_TOKEN` publishing. | In npm package settings for `@bsuite/schema-registry`, add Trusted Publisher: GitHub Actions, org/user `GaryOcean428`, repository `bsuite`, workflow filename `publish-schema-registry.yml`, blank environment, allow npm publish. Then rerun the workflow and update consumers whose lockfiles should pin newer package versions. |
| Auth/security | `AUTH_CANONICAL.md` remains the authority: BS OAuth 2.1 PKCE + JWKS only; no cookie SSO. `@bsuite/auth@0.2.5` now adds cross-tab BS token removal handling and refresh-rejected expiry events, all six consumers are on 0.2.5, Braden RoleManager uses `getClaims()` with no hardcoded admin email, and COOKIE-SSO drift-scan self-tests pass. | Continue Task 2 with RLS/client_id checks, Conduit service-role RPC grant verification, and browser smoke. |
| DB/source-of-truth | CRM7 open issues #831 and #758 remain the DB source-of-truth/migration-repair blockers. Parent `bsuite` owns the schema-control-plane implementation merged in bsuite#1461: `supabase/migration-scopes.json`, generated `supabase/schema-manifest.json`, `scripts/supabase/*`, `supabase-preview-db.yml`, and schema-builder migration scope wired into `supabase-migrate.yml`. Vite preview-env alias rollout is merged in BSU#538/#539, Throughput#209/#210, R80.3#307, Braden#319, and CRM7#1018/#1019. | Task 3 reconciles migrations, pgTAP, advisors, and live SECURITY DEFINER/RPC grants; operator issue bsuite#1460 connects native Supabase branching + Vercel preview DB aliases. |
| DRY one-shot | CRM7/R80 entity ownership issues remain open, including CRM7 #460/#461/#463/#484 and related qualification/provider/host-employer issues. | Task 4 completes FK-backed selectors, entity linking, and reader/writer boundaries. |
| CRM7 GTO | CRM7 GTO/reporting/payroll backlog remains broad. GTO catalogue issue crm7#529 is closed by merged PR #570; crm7#527/#528/#530/#531/#532/#533/#534 and payroll/provider follow-ups remain open. | Continue Task 5 with the remaining report catalogue/payroll workstreams. |
| Conduit recruitment | Conduit has 11 open recruitment issues, led by public apply, handoff snapshot, offer/AASS, and consent/compliance scope. The status-constraints slice is merged via Conduit#304: all live `r7_*` status columns have CHECK coverage and TypeScript status mirrors. | Continue Task 6 with public apply, handoff snapshot, offer/AASS, documents, and CRM7 receive/create-person flows. |
| BSU platform | BSU has 4 open platform/admin/design issues, including ADR-0002 schema ownership and branding redesign cascade. Shared UI/schema package availability improved: ui 0.3.0, schema-builder 0.7.2, and theme 0.4.1 are on npm; `@bsuite/ui@0.4.0` source is merged but npm publish is blocked by bsuite#1452; schema-registry 0.3.5 is blocked by bsuite#1432. | Continue platform panels/Visual Feature Builder work; resolve schema-registry/ui npm publish permissions before consumer lockfile rollout. |
| UI/UX/a11y/perf | Suite-wide UI/perf work remains in bsuite #475/#479/#483 and CRM7 #833. Playwright smoke issue bsuite#478 is closed after auditing 5+ E2E tests per app (BSU 16, CRM7 75, Conduit 7, R80.3 10, Throughput 19, Braden 5). Sentry rollout issue bsuite#476 is closed after audit verified optional Sentry init across BSU, CRM7, R80.3, Throughput, and Conduit. Throughput #184 is closed: throughput#204 fixed the focused dark-mode card surfaces and throughput#205 completed the remaining raw Tailwind palette sweep with semantic D2C tokens. CRM7 #478 feature-flags admin UI is closed after verifying `/settings/feature-flags`, 38 `tenant_settings.feature_flags` toggles, `manage_system` gating, and hook/nav tests on development. CRM7 #881 is closed by CRM7#1012-#1016: TS/TSX raw-palette classes scan at 0 and true six/eight-digit color hex outside token/theme/palette files scan at 0, with `pdfOklch()` preserving OKLCH source values for React-PDF compatibility. PWA issue bsuite#484 is closed after R80.3#305, BSU#536, throughput#206, braden#317, and conduit#305 completed the app manifest/icon slices. Task 8 shared primitive/Storybook slice for bsuite#475 is source-merged via bsuite#1451/#1453: `Button`, `Dialog`, `EmptyState`, `ErrorBoundary`, `LoadingSpinner`, `StatusBadge`, Storybook Tailwind/theme preview, and DotPattern semantic-token cleanup; bsuite#475 stays open until npm publish/consumer adoption after bsuite#1452. PageGridLayout issue bsuite#479 remains open, but the Throughput slice is merged via throughput#208 (PageGrid adapter + PageGridPage helper, 14 PageGrid surfaces, and PageEditorLauncher alternate-key preflight fix) the R80.3 slice is merged via R80.3#306 (lazy PageGridPage helper wrapping `/apprentices`, `/compare`, `/agreements`, `/export`, `/payday-super`, and `/boot` view-state pages without changing calculation internals), the BSU slice is merged via BSU#537 (lazy PageGrid route wrapper for `/settings`, `/branding`, and `/admin/branding`), the CRM7 old-pattern list slice is merged via CRM7#1017 (`/apprentices`, `/reports`, and `/training-providers`), the CRM7 compliance batch slice is merged via CRM7#1021 (`/compliance/avetmiss`, `/compliance/financial-viability`, and `/compliance/gto-dashboard`), and the Braden corporate-admin slice is merged via Braden#318 (`/admin/branding`, with public corporate pages intentionally static). Web Vitals issue bsuite#483 has all-app Speed Insights coverage after throughput#207; CRM7#1020 landed first-load remediation for CRM7#833/bsuite#483 (lazy Dashboard route, authenticated-only offline/preload bootstrap, lazy-heavy root-preload filtering, route-preloader tests, and offline a11y polish). CRM7#833 remains open pending real deployed Speed Insights / authenticated Chrome trace evidence once the development deployment is available. | Continue Task 8 with remaining CRM7/R80.3/BSU/Braden PageGrid gaps, cross-app component inventory, accessibility/performance/theme sweeps, consumer primitive adoption after npm publish, and screenshot evidence. |
| Docs/dashboard | Dashboard top-level summary matched current `gh` counts; secondary `counters` block was stale and normalized during this Task 0 update. | Keep dashboard JSON and inline HTML updated in the same PR as each evidence change. |
| Supabase schema topology | One shared Supabase backend (`tuybltdrdefjblnplpqo`) is fed by migrations across parent + submodules/packages. Parent `bsuite` owns the CI connection via `.github/workflows/supabase-migrate.yml`; CRM7 holds the bulk of schema definitions. The parent schema manifest now tracks 8 migration scopes (root, six app repos, and `packages/schema-builder`) with 471 SQL migrations and 60 function directories. Braden's `supabase/config.toml` points at stale/local project `iykrauzuutvmnxpqppzk`, so manual links from Braden must explicitly pass `--project-ref tuybltdrdefjblnplpqo`. Vite apps are now compatible with `VITE_SUPABASE_*` and `NEXT_PUBLIC_SUPABASE_*` preview env injection; Conduit remains the Next.js outlier and already uses `NEXT_PUBLIC_*`. | Use Supabase MCP `apply_migration` as the preferred audited production applier; CI `migration up --include-all` is the fallback/PR path; never run local `supabase db push` against production. Enable parent Supabase GitHub branching/Vercel aliases via bsuite#1460 for preview DB builds. |

## 2026-05-06 Plans Audit

A docs-only audit on 2026-05-06 reconciled in-repo plans against an
external corpus of 49 IDE / Cascade plan files (claude_code IDE +
windsurf cascade) and the `bsuite_*` memory namespace. Key results:

| Source | Total | DONE-V | DUPLICATE-OF-IN-REPO | SUPERSEDED | PARTIAL | OPEN | Dismissed (QIG) |
|--------|------:|------:|--------------------:|-----------:|--------:|-----:|----------------:|
| External (claude_code IDE) | 14 | 4 | 0 | 2 | 0 | 1 | 7 |
| External (windsurf cascade) | 35 | 8 | 2 | 9 | 3 | 1 | 12 |
| Live in-repo (parent + 6) | 19 | 0 | n/a | 0 | 0 | 19 | 0 |
| Already in `archive/` (parent + per-app) | 10 | 10 | n/a | 0 | 0 | 0 | 0 |

- **Plans archived this run:** 0 — every in-repo plan is either active
  multi-phase work or already archived in the 2026-05-04 doc-unification
  wave (parent PR #430) and the throughput Wave A sweep (throughput PR #76).
- **Plans dismissed (QIG silo):** 17 + 2 reclassified during this audit.
- **Loop-closing notes:** the two external "duplicate" plans
  (`crm7-broad-ui-refresh-ec965f.md`, `bsuite-audit-page-builder-branding-relationships-66c734.md`)
  map cleanly to the active in-repo
  `20260316-crm7-broad-ui-refresh-plan-v1.00W.md` and
  `20260427-full-7-audit-page-builder-branding-relationships-plan-v1.00W.md`;
  the in-repo versions are canonical.
- **External-only OPEN plans worth transcribing if picked up:** the
  five-wave stabilisation plan (W5 systemic guards remains open per
  `bsuite_session_20260502_w1_to_w4_complete`) and the email/calendar/
  tasks integration plan (Phases 3+4 still open).

Triage workpapers (out-of-repo, in `~/workspace/plans-review/`):
`external-plans-triage.md`, `in-repo-plans-triage.md`, `memory-archaeology.md`.

## How to update

When you close a tracking issue, mark its row ✅ Done and add the
closing PR / commit reference. When a new cross-app issue opens, add a
row before doing any per-submodule work — the audit comes first.

Future plans live in `docs/plans/` of the relevant repo with a
`STATUS.md` ledger and an `archive/YYYY-MM/` for verified-complete with
an evidence companion (`<plan>.evidence.md`). See the Plan-tracking
convention in [`docs/CONSISTENCY-REPORT.md`](../CONSISTENCY-REPORT.md).
