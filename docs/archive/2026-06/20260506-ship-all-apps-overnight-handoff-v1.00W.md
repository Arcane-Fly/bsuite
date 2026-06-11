# BSuite Ship-All Apps Overnight Handoff — 2026-05-06

Status: Working
Version: v1.00W

## Summary

This handoff records the takeover from Codebuff, the Supabase Auth PR consolidation, and the outstanding-work issue sweep requested for the overnight Copilot queue.

## Completed takeover work

- CRM7 `#451` merged into `development`: `afc7d75c` — `fix(auth): read tenant_id from app_metadata + getClaims() + backfill migration`.
- Conduit `#176` merged into `development`: `4fcffe7` — H1 `app_metadata` + H2 `getClaims()` server-side migration.
- Braden `#196` merged into `development`: `a2600d8` — Edge Functions use `getClaims()`/JWKS validation.
- CRM7 `#452` was not merged because its stale branch diff would have reverted `#451`; its single null-check polish was cherry-picked directly to CRM7 `development` as `92def800`, then `#452` was closed as superseded.
- CRM7 login WCAG/E2E failure was fixed by keeping `/auth/login` accessibility tests on the app shell instead of scanning Supabase's `invalid_redirect_uri` JSON page.

## Verification evidence

- CRM7 PR `#451`: all required checks green before merge; post-merge `development` CI green at run `25377017900` for `92def800`.
- Conduit PR `#176`: all required checks green before merge; `development` CI green at run `25376905445` for `4fcffe7`.
- Braden PR `#196`: all required checks green before merge; `development` CI green at runs `25376910463` and `25376910495` for `a2600d8`.
- Local CRM7 targeted verification before push: `pnpm exec vitest run src/pages/auth/login.test.tsx`; `pnpm exec playwright test tests/e2e/wcag-aa.spec.ts --grep '/auth/login|interactive targets'`.

## Branch state

All repositories have remote `development` and `main` branches present after merges; no auto-deleted `development` branch remained unresolved.

| Repo | Local branch | `origin/development` tip | Status |
| --- | --- | --- | --- |
| `bsuite` | `development` | pending parent push from local `adf9dde` lineage | clean before this handoff doc |
| `crm7` | `development` | `92def800` | clean |
| `conduit` | `development` | `4fcffe7` | clean |
| `braden` | `development` | `a2600d8` | clean |
| `business-suite-unified` | `development` | `101b50f` | clean |
| `R80.3` | `development` | `b4866fa` | clean |
| `throughput` | `development` | `4a0a33e` | clean |

## Supabase/Auth deployment note

CRM7 `#451` includes the backfill migration `20260506000000_backfill_app_metadata_tenant_id.sql`. Keep the documented deploy order:

1. Merge CRM7 `#451` into `development` — completed.
2. Promote/apply the migration through the approved path only: PR/CI pipeline or Supabase MCP `apply_migration`.
3. Confirm zero inconsistent/orphan users before code cutover to `app_metadata`-only assumptions.

Do not run local `supabase db push` against `tuybltdrdefjblnplpqo`.

## Copilot issue sweep

Outstanding work was extracted from `docs/20260501-merged-execution-backlog-v1.00W.md`. Issues were created on the relevant repositories using stable backlog IDs in titles. Direct assignment to `Copilot` failed via GitHub API with `Bot does not have access to the repository`, so actionable issues received `@copilot` handoff comments instead.

Issue counts after sweep:

| Repo | Backlog issues |
| --- | ---: |
| `bsuite` | 45 |
| `business-suite-unified` | 29 |
| `crm7` | 34 |
| `conduit` | 6 |
| `R80.3` | 8 |
| `braden` | 12 |
| `throughput` | 4 |

## Open backlog issue ledger

## bsuite (45)
- #503 [G-14] Supabase OAuth dashboard allowlist (O-2, per finish-line remaining-work top 5).
- #502 [G-13] Submodule deprecated-branch cleanup on GitHub.
- #501 [G-12] Payday Super regulatory finalisation — waiting on ATO guidance variations.
- #500 [G-11] RAMS seed data validation.
- #499 [G-10] P1-84 SQL migration push (commit 43fb250).
- #498 [G-9] 20260427-branch-protection-enforcement-v1.00W.md gates on GitHub org admin.
- #497 [G-8] Supabase platform bug bsuite#106 — NULL client_secret_hash on public OAuth clients (Conduit, Throughput).
- #496 [G-7] Deploy-Vercel-green gate on development branches for all 5 apps.
- #495 [G-6] Xero Payroll AU — direct STP path vs passthrough.
- #494 [G-5] rpc_report_page generic RPC security review before go-live.
- #493 [G-4] AVETMISS NCVER validator access.
- #492 [G-2] ADMS / AASS integration (2026 Incentive System — Priority Hiring Incentive, KAP, DAAWS).
- #491 [BL-018] WS-D Production Ship Gate execution — all 6 submodules development → main merge + Playwright smoke vs production URLs + first non-Braden enterprise tenant onboarding end-to-end.
- #490 [BL-017] Zero-workaround/deprecation enforcement — CI fails on new workaround allow-lists, new @deprecated markers, and dual-path interim states. Empty allow-list files are not created; exceptions re
- #489 [BL-016] CI lint rule set locked — no-free-text-where-fk extended, no-new-deprecations active, no-duplicate-allowlists active.
- #488 [BL-015] Canonical OUTSTANDING.md consolidation — remove per-submodule OUTSTANDING files, leaving only the merged backlog as the single execution queue.
- #487 [BL-014] Final docs/README.md rewrite reflecting post-cleanup state + authority chain.
- #486 [BL-013] Archive all Phase 0-5 completed plans/handoffs/signoffs per information-preservation rule (/home/braden/Desktop/Dev/archived-repos-docs/ external or docs/archive/ in-repo).
- #485 [P2-25] DB maintenance — fix auth_rls_initplan in 5 RLS policies; drop 25+ unused indexes (especially people — 9 unused); add 4 missing FK indexes
- #484 [P2-22] PWA asset completion — BSU apple-touch-icon.png+pwa icons; R80.3 webmanifest+apple-touch-icon; Conduit full audit; braden webmanifest+icons; throughput all PWA
- #483 [P2-21] Web Vitals monitoring — web-vitals library wired in 5 apps; CRM7 INP (currently 165–357 ms) resolved
- #482 [P2-15] Xero app registration + flip feature_flags.xero_integration = true
- #481 [P2-12] Remaining hex → oklch sweep: CRM7/BSU MarketingHome.tsx ~62 each, Conduit ConduitLanding.tsx ~55, CRM7 AI message rgba
- #480 [P2-11] Shared <Logo /> component in packages/ui — 4-level resolution (sub-org → enterprise → platform → default)
- #479 [P2-10] PageGridLayout rollout completion — CRM7 batches A–H (41 pages), R80.3, Conduit, throughput, braden
- #478 [P2-9] Playwright E2E smoke per app (5 critical-path specs each)
- #477 [P2-8] CSP headers in all vercel.json (start permissive, tighten)
- #476 [P2-7] Sentry rollout in 5 D2C apps + Conduit (@sentry/nextjs)
- #475 [P2-6] Storybook in packages/ui + primitive centralisation (Button, Dialog, EmptyState, ErrorBoundary, Logo)
- #474 [BL-011b] BSU Supabase CRM-domain migration — post-apply verification (schema diff clean, RLS smoke test, Vercel build green)
- #473 [BL-011a] BSU Supabase CRM-domain migration — apply stakeholder/people/contact schema migrations per OUTSTANDING-SYSTEM runbook (per-migration PR)
- #472 [BL-010] Dep standardisation across suite — single version of React, Tailwind, Radix, AI SDK, Supabase client per AGENTS.md. Atomic per major version bump; breaking-API migrations done in same PR.
- #471 [WS-E.6] Update one-shot spec to v1.02A with new §12 (Propagation Completeness) + fold WS-E patterns into §4 Auto-Population Rules.
- #470 [WS-E.5] One-shot propagation audit — mechanical sweep of every form across 6 apps; matrix populated in 20260501-one-shot-field-audit-v1.00W.md. Atomic PRs fix violations; CI lint extensions block ne
- #469 [WS-E.1] Client↔Host-Employer role unification audit + fill per ADR-0006. Matrix populated from framework doc 20260501-ws-e-client-host-unification-audit-v1.00W.md. Atomic per-app PRs delete any app-
- #468 [P1-84] BLOCKED on operator — push SQL migrations at commit 43fb250 to Supabase project.
- #467 [P1.O-1] WCAG 2.1 AA accessibility audit across all 6 apps.
- #466 [P1-17] Complete @bsuite/auth migration — deprecate local OAuth helpers after P1.C-1 ships. Atomic deletion, no @deprecated marker window.
- #465 [P1.D-2] CI security assertions — add guardrails that fail CI if secret-naming drift appears.
- #464 [P1.D-1] Supabase env-var standardisation — rename inconsistent NEXT_PUBLIC_SUPABASE_ / VITE_SUPABASE_ / SUPABASE_ to canonical names per AGENTS.md §Environment Variables. Atomic per app.
- #463 [P1.C-1] @bsuite/auth package adoption across CRM7, R80.3, braden, throughput, conduit — delete app-local OAuth 2.1 PKCE code in the same PR as the import. No @deprecated on local code.
- #462 [P0-13] Remove wildcard redirect URIs from Supabase dashboard — remove .vercel.app + .vusercontent.net wildcards; replace with explicit preview URLs. Coordinates with ADR-0004 — the AGENTS.md allow-
- #461 [P0-6] Parts A+B+C OAuth preview-redirect sign-off — close all 5 unticked checkboxes: Part C (Supabase allowlist update), Parts B.1–B.4 (CRM7/R80.3/Braden/Throughput return_origin patches), end-to-
- #460 [P1-12c] Cookie SSO audit documentation — all 5 apps already correctly wired (verified in Phase 0 discovery). Produce 20260501-cookie-sso-audit-v1.00W.md as canonical reference; amend first-visit UX 
- #211 [P1 Deps] Migrate all BSuite apps to TypeScript 6.0.3 — prepare for TS 7 Go-native compiler

## business-suite-unified (29)
- #326 [G-8] Supabase platform bug bsuite#106 — NULL client_secret_hash on public OAuth clients (Conduit, Throughput).
- #325 [G-3] CRM7 domain tables via unified migration (inspections, workflows, reports).
- #324 [P2-24] Font alignment — Conduit self-host Inter; BSU confirm 'Inter Variable'; BSU+R80.3 add @fontsource/jetbrains-mono
- #323 [P2-23] FOUC prevention — inline theme script in BSU, R80.3, Conduit layout.tsx (CRM7 already has it)
- #322 [P2-20] F-10 — CRM7 /billing → /financial/invoicing rename + redirect (namespace collision with BSU subscription billing)
- #321 [P2-19] F-08 — BSU /ideas/ "Open in Throughput" deep-link affordance (keep light portfolio lens)
- #320 [P2-13] Sub-organisation hierarchy — tenants.parent_tenant_id + hierarchical branding resolution Tier 0
- #319 [P2-2] Schema / page-builder rebuild — full scope (overlaps WS-B executed across Phases 2 & 4). Phase 6 captures residuals.
- #318 [BL-011c] BSU Supabase CRM-domain migration — downstream CRM7 / conduit consumers updated atomically with each schema change (no dual-path reads)
- #317 [BL-011b] BSU Supabase CRM-domain migration — post-apply verification (schema diff clean, RLS smoke test, Vercel build green)
- #316 [BL-011a] BSU Supabase CRM-domain migration — apply stakeholder/people/contact schema migrations per OUTSTANDING-SYSTEM runbook (per-migration PR)
- #315 [P1.F-1] Storage bucket RLS audit + four-persona matrix verification.
- #314 [P1.H-1f] BSU Platform-Kit — Dynamic Tables admin sub-panel (read-only view of tenant_entities + live data samples; authoring goes to CRM7 per ADR-0002)
- #313 [P1.H-1e] BSU Platform-Kit — Storage admin sub-panel (buckets browser, object list with signed-URL previews, bucket RLS display)
- #312 [P1.H-1d] BSU Platform-Kit — Secrets admin sub-panel (Vault-backed; read-masked by default; edit via Vault RPC only)
- #311 [P1.H-1c] BSU Platform-Kit — Database admin sub-panel (table browser, read-only by default, query history)
- #310 [P1.H-1b] BSU Platform-Kit — Logs admin sub-panel (supabase edge fn logs, audit_events browsing, error surfacing)
- #309 [P1.H-1a] BSU Platform-Kit — Auth admin sub-panel (user list, role assignments, MFA status, session revocation)
- #308 [P1.E-1] React hooks remediation in BSU — stale-closure audit across AuthContext, useBranding, useTenantId.
- #307 [P1.M-1] Realtime blocks — ensure custom_pages, tenant_branding, tenant_app_branding all have realtime publication entries post-Phase 2 cleanup.
- #306 [P1.C-2] OIDC nonce parameter added to OAuth 2.1 flow in @bsuite/auth.
- #305 [P1.B-2] CRM7 misplaced routes redirect to BSU — same pattern for CRM7-side organization admin that should live in BSU.
- #304 [P1.B-1] R80.3 misplaced routes redirect to BSU — organization, branding, tester-licenses admin surfaces in R80.3 currently author data BSU owns; redirect routes in R80.3 to the BSU equivalent; remov
- #303 [BL-001] Execute ADR-0002 — unify schema authoring under CRM7 Developer Portal
- #302 [P1-4(b)] Execute ADR-0001 — CRM7 custom_pages canonical, BSU tenant_page_layouts removed
- #301 [P1-15] BSU Developer portal route fix — nested route /developer/pages/website/schema/ renders blank. Root cause: Pages.tsx retry loop crashing the route subtree (fixed atomically with ADR-0001 exec
- #300 [P1-14] BSU user_tenants→profiles FK embed 400 — client-side PostgREST embed profiles:user_id(id,email,created_at) returns 400 under RLS. Fix: add explicit FK constraint name to the embed hint, or r
- #299 [P1-12b] Branding anon-path fallback — useBranding.ts queries platform_branding directly for force_override_tenant_ids, which anon users don't have SELECT on (view platform_branding_public excludes t
- #298 [P1-12] Auth safety-net single-retry lock-in + ordering repair — AuthContext.tsx already reduced to single-retry 2026-04-28; repair bootstrap ordering so profiles.tier resolves inside the gated sess

## crm7 (34)
- #486 [P0-11] OAuth state HMAC signing — sign OAuth state with HMAC-SHA256 + verify on callback in oauth-google-email + oauth-microsoft-email edge functions.
- #485 [G-3] CRM7 domain tables via unified migration (inspections, workflows, reports).
- #484 [P2-26] Remaining apprentice-ownership audit: R80.3 must stop writing CRM7-owned apprentices (reader-only), persist calc state to R80-owned tables
- #483 [P2-23] FOUC prevention — inline theme script in BSU, R80.3, Conduit layout.tsx (CRM7 already has it)
- #482 [P2-20] F-10 — CRM7 /billing → /financial/invoicing rename + redirect (namespace collision with BSU subscription billing)
- #481 [P2-18] CRM7 Tier 3-4 page wiring (SP-3, in progress) — financial, compliance, WHS, comms, reports, payroll, billing, data mgmt
- #480 [P2-16] Email/Calendar integration UI — settings tab + inbox + tasks sync badge + email_messages/tasks migrations
- #479 [P2-15] Xero app registration + flip feature_flags.xero_integration = true
- #478 [P2-14] Feature-flags admin UI — 37 JSONB flags in tenant_settings.feature_flags
- #477 [P2-4] Report builder (7 pre-built templates + JSONB report_templates + scheduling)
- #476 [P2-3] AVETMISS 8.0 NAT file codegen + State STA extracts
- #475 [P2-2] Schema / page-builder rebuild — full scope (overlaps WS-B executed across Phases 2 & 4). Phase 6 captures residuals.
- #474 [P2-1] GTO billing / payroll / reporting — full scope (overlaps WS-A executed in Phase 5). Phase 6 item captures any residual scope not closed by WS-A.
- #473 [BL-012] CRM7 AI-content-labelling UI hardening — per AGENTS.md §AI Implementation Standards.
- #472 [BL-011c] BSU Supabase CRM-domain migration — downstream CRM7 / conduit consumers updated atomically with each schema change (no dual-path reads)
- #471 [BL-007] CRM7 AI Phases 2-5 — remaining AI-powered strategic vision phases.
- #470 [WS-A] GTO billing / payroll / reporting 6-week workstream. Consumes rams_funding_for(...) as input per ADR-0005.
- #469 [BL-005] CRM7 Xero OAuth activation and integration.
- #468 [BL-004] CRM7 legacy DataContext retirement (Phase 2B-2C of UX oneshot plan).
- #467 [BL-003] CRM7 evidence-capture E2E tests (Playwright) for critical compliance paths.
- #466 [WS-E.4] RAMS funding-matrix derivation + read-only propagation per ADR-0005. Requires RAMS seed data gate cleared.
- #465 [WS-E.3] Training-Provider-driven qualification constraint — training_provider_qualifications junction + filter logic in QualificationSelector when apprentice.training_provider_id or trainingProvider
- #464 [WS-E.2] Qualification↔Host-Employer + Qualification↔Apprentice junction tables + reverse-lookup UI. QualificationSelector gains hostEmployerId + apprenticeId props.
- #463 [P1.I-1] EntityLinker component — generic junction-row authoring UI.
- #462 [P1.H-1f] BSU Platform-Kit — Dynamic Tables admin sub-panel (read-only view of tenant_entities + live data samples; authoring goes to CRM7 per ADR-0002)
- #461 [P1.G-2] FK-backed index additions for new FKs.
- #460 [P1.G-1] Entity FK wiring for remaining free-text references (award rate, training plan, placement).
- #459 [BL-002] braden website lead capture: clients.type='prospect' discriminator — per ADR-0006, new roles use discriminator values, not new tables. Add 'prospect' as allowed value + UI filter.
- #458 [P1.B-2] CRM7 misplaced routes redirect to BSU — same pattern for CRM7-side organization admin that should live in BSU.
- #457 [P1-75] tenant_field_definitions.entity_id FK to tenant_entities.id — lands in same PR set as ADR-0002 execution.
- #456 [BL-001] Execute ADR-0002 — unify schema authoring under CRM7 Developer Portal
- #455 [P1-4(b)] Execute ADR-0001 — CRM7 custom_pages canonical, BSU tenant_page_layouts removed
- #454 [P0-10] Supabase Vault RPC migration completeness — create email_integration_set_encrypted_token; migrate plaintext access_token/refresh_token/smtp_password/imap_password in email_integrations; fini
- #453 [P1-12b] Branding anon-path fallback — useBranding.ts queries platform_branding directly for force_override_tenant_ids, which anon users don't have SELECT on (view platform_branding_public excludes t

## conduit (6)
- #182 [G-8] Supabase platform bug bsuite#106 — NULL client_secret_hash on public OAuth clients (Conduit, Throughput).
- #181 [P2-24] Font alignment — Conduit self-host Inter; BSU confirm 'Inter Variable'; BSU+R80.3 add @fontsource/jetbrains-mono
- #180 [P2-23] FOUC prevention — inline theme script in BSU, R80.3, Conduit layout.tsx (CRM7 already has it)
- #179 [P2-17] Conduit candidate documents tab — wire r7_documents
- #178 [BL-011c] BSU Supabase CRM-domain migration — downstream CRM7 / conduit consumers updated atomically with each schema change (no dual-path reads)
- #177 [P0-8] Conduit SSR hotfix — cherry-pick commits 2f38cc3 + 5870990 onto fix/conduit-ssr-prerender-guard from development; merge.

## R80.3 (8)
- #179 [P2-26] Remaining apprentice-ownership audit: R80.3 must stop writing CRM7-owned apprentices (reader-only), persist calc state to R80-owned tables
- #178 [P2-24] Font alignment — Conduit self-host Inter; BSU confirm 'Inter Variable'; BSU+R80.3 add @fontsource/jetbrains-mono
- #177 [P2-23] FOUC prevention — inline theme script in BSU, R80.3, Conduit layout.tsx (CRM7 already has it)
- #176 [P2-1] GTO billing / payroll / reporting — full scope (overlaps WS-A executed in Phase 5). Phase 6 item captures any residual scope not closed by WS-A.
- #175 [R80-BL-001] R80.3 training-fees UI validation bounds + per-apprentice overrides.
- #174 [P1.B-1] R80.3 misplaced routes redirect to BSU — organization, branding, tester-licenses admin surfaces in R80.3 currently author data BSU owns; redirect routes in R80.3 to the BSU equivalent; remov
- #173 [P1.J] R80.3 Payday Super regulatory ship — DEADLINE 1-JULY-2026. Public holiday awareness, salary-sacrifice refinements, UI snapshot tests. Atomic funding-derivation constraint (per governance): P
- #172 [P1-14] BSU user_tenants→profiles FK embed 400 — client-side PostgREST embed profiles:user_id(id,email,created_at) returns 400 under RLS. Fix: add explicit FK constraint name to the embed hint, or r

## braden (12)
- #208 [BL-013] Archive all Phase 0-5 completed plans/handoffs/signoffs per information-preservation rule (/home/braden/Desktop/Dev/archived-repos-docs/ external or docs/archive/ in-repo).
- #207 [P2-5] Braden Phase 2 + Phase 3 (visual editing, advanced customisation, publishing workflow, permissions) — overlaps BL-008 Phase 5.
- #206 [BL-008] braden visual drag-and-drop layout editor (Phase 2-3 of roadmap).
- #205 [BL-006g] braden bot-protection hardening — unchecked TODOs in 20260316-braden-bot-protection-v1.00W.md
- #204 [BL-006f] braden UI/UX best-practices sweep — unchecked TODOs in 20260316-braden-ui-ux-best-practices-v1.00W.md
- #203 [BL-006e] braden CSP security hardening — unchecked TODOs in 20260316-braden-csp-security-v1.00W.md
- #202 [BL-006d] braden environment-setup dev guide completion — unchecked TODOs in 20260316-braden-environment-setup-dev-guide-v1.00W.md
- #201 [BL-006c] braden QA config — enable strict TS mode (tsconfig strict: true) atomically; fix all strict errors in same PR
- #200 [BL-006b] braden QA config — reduce test duplication
- #199 [BL-006a] braden QA config — fix failing tests
- #198 [P1.E-2] React hooks remediation in braden.
- #197 [BL-002] braden website lead capture: clients.type='prospect' discriminator — per ADR-0006, new roles use discriminator values, not new tables. Add 'prospect' as allowed value + UI filter.

## throughput (4)
- #103 [G-8] Supabase platform bug bsuite#106 — NULL client_secret_hash on public OAuth clients (Conduit, Throughput).
- #102 [P2-19] F-08 — BSU /ideas/ "Open in Throughput" deep-link affordance (keep light portfolio lens)
- #101 [BL-009] throughput production-readiness — migrate npm → pnpm, rename uppercase docs to date-versioned format, bring in-line with suite conventions.
- #100 [P1.E-3] React hooks remediation in throughput.


