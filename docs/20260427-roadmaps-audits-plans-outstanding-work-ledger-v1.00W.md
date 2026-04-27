# BSuite Roadmaps, Audits, Plans, and Outstanding Work Ledger

Status: Working  
Date: 2026-04-27  
Scope: Parent docs plus app/module docs in `business-suite-unified`, `crm7`, `conduit`, `R80.3`, `braden`, `throughput`, and `packages/theme`.

## Purpose

This ledger consolidates outstanding work found across BSuite roadmaps, audits, gap analyses, plans, handoffs, and app-level outstanding-work indexes.

It is an execution index, not a replacement for the source documents. Use it to decide what is still open, what is blocked by operator or branch-gate work, and what older roadmap material should be treated as historical until revalidated.

## Scan Method

- Searched all repo-local docs folders under the parent workspace and submodules.
- Counted 321 markdown files under `*/docs/*`.
- Identified 87 candidate roadmap, audit, gap, plan, status, ledger, triage, review, signoff, handoff, backlog, matrix, or outstanding-work docs.
- Treated app-level `OUTSTANDING.md` files as primary app indexes where present.
- Treated the newest parent execution ledgers, signoffs, gap reports, and operator handoffs as higher authority than older plans.
- Treated `docs/archive/` and explicitly superseded roadmaps as historical unless a newer active doc carries their work forward.

Existing repo-local docs dated `20260428` were present during this 2026-04-27 scan. They were used as current workspace evidence because they supersede older handoff files by filename and content, but this pass did not create or rename those files.

## Authority Order

1. `docs/20260427-full-7-execution-ledger-v1.00W.md`
2. `docs/20260428-codex-operator-handoff-v4.00W.md`
3. `docs/20260427-finish-line-review-signoff-v1.00W.md`
4. `docs/20260317-bsuite-gap-report-v2.00W.md`
5. App-level `OUTSTANDING.md` files
6. Active plans in `docs/plans/` and app `docs/plans/`
7. Older roadmaps and archived docs, for historical context only

## Candidate Inventory

| Area | Active source docs reviewed | Notes |
| --- | --- | --- |
| Parent workspace | Master roadmap, gap report, full-7 ledger, finish-line signoffs, operator handoff v4, bypass-PR audit, dry-lint triage, color-token audit, universal-canvas plan, `docs/plans/*` | Parent docs contain the current cross-app gates and architecture backlog. |
| `business-suite-unified` | `OUTSTANDING-PLANS.md`, `OUTSTANDING-SYSTEM.md`, WCAG audit, BSU/CRM7 Supabase audit | Open work is mostly platform admin, Supabase CRM domain schema, and WCAG verification. |
| `crm7` | `OUTSTANDING.md`, `00-roadmap/*`, `docs/plans/*`, schema/page-builder audit, GTO plans, AI plans | CRM7 has the largest live backlog and owns much of the cross-app data architecture. |
| `conduit` | `OUTSTANDING.md` plus parent full-7/OAuth ledger references | Conduit docs have no incomplete local plans; parent-ledger runtime smoke remains. |
| `R80.3` | `OUTSTANDING.md`, roadmap, Payday Super plan, training fees plan | App `OUTSTANDING.md` is current; the older roadmap is broad and superseded. |
| `braden` | `OUTSTANDING.md`, roadmap and QA/security plans | Open work centers on visual editing, CMS/API coverage, accessibility, performance, and bot protection. |
| `throughput` | `OUTSTANDING.md`, `roadmap.md`, audit summaries, quality audit | Live gaps are production readiness, accessibility/testing/logging, and React 19/schema-registry work carried into Priority 11. |
| `packages/theme` | Package README and current source | Theme package has active consumer migration work after `@bsuite/theme@0.3.3`. |

## Priority 0: Current Blockers and Gates

### Branch and Reconcile Gates

- `crm7` development to main reconcile is still blocked by deep fork history.
- Parent `bsuite` development to main reconcile is still blocked by deep fork history.
- Do not reconcile, merge, reset, delete branches, or update parent submodule pointers until the active integration work finishes.
- Cascade/IDE workflows need PR-based pushes where branch protection blocks direct pushes.
- Bypass-PR audit classified direct-to-main PRs, but the reconcile itself remains unresolved.

### Full-7 Plan Gates

- Phase 0 reconciliation is blocked.
- Phase 1 audit is in progress.
- Phase 2 shared package work is in progress or blocked by missing local source for some packages.
- Phase 3 universal canvas/page-builder package extraction has not started.
- Phase 4 relationship/location UX has not started.
- Phase 5 platform logos are partially complete: shared package work exists, but consumers still need migration.
- Phase 6 verification is partial.
- Phase 7 docs/signoff is in progress.
- Phase 8 ship cycle is not started and remains blocked by earlier gates.

### Runtime Smoke Gates

- CRM7 dev/review preview OAuth smoke remains.
- Conduit release alias OAuth smoke remains.
- R80.3 dev preview OAuth smoke remains.
- Throughput dev preview OAuth smoke remains.
- Braden dev preview OAuth smoke remains.
- 2026-04-27 implementation note: Conduit source no longer has direct `suite.crm7.app/login` stubs; local `/auth/login` delegates to `@bsuite/auth`. Stale Conduit agent docs and smoke/WCAG expectations were corrected so future work preserves that architecture. Authenticated WCAG route sweeps now require `CONDUIT_E2E_AUTH_STORAGE_STATE` instead of removed email/password login fields.

## Priority 1: Operator, Security, and Infrastructure Items

Current operator handoff v4 items:

- Add `app.tga_sync_url` and `app.tga_sync_secret` custom Postgres GUCs.
- After sandbox dry-run, set `TGA_SYNC_ENABLED=true`, set `TGA_SYNC_TRIGGER_SECRET`, deploy `tga-sync`, verify real sync run, and verify cron behavior.
- Confirm Azure `xms_edov` optional claim through Microsoft Graph.
- Complete runtime verification that `xms_edov` is present in a real Microsoft sign-in and consumed by the fail-closed code path.
- Ratify the Supabase Auth allow-list doctrine conflict: `AGENTS.md` says client `/auth/callback` URIs must remain, while `docs/20260428-operator-verification/02-vercel-wildcard-redirect.md` says the current GoTrue-only allow-list is correct because BS OAuth client callbacks live in the OAuth registry.

Items verified complete in the newest handoff, not current backlog:

- W1-C migrations.
- `pg_cron` and `pg_net`.
- Wildcard redirect URI cleanup.
- HS256 previous JWK revocation.
- Xero OAuth app and secrets presence.
- Delete-branch-on-merge disabled.
- Security-definer hardening.
- Branch protection, subject to later spot checks.
- `OAUTH_STATE_SECRET` set.
- `oauth-google-email` and `oauth-microsoft-email` redeployed to active version 28.
- CRM7 Xero env/secrets are present as server-side `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, and `XERO_REDIRECT_URI`; the older `VITE_XERO_CLIENT_ID` verification wording is stale. Xero developer-portal registration and token-exchange smoke remain separate verification items before Xero is treated as active.

## Priority 2: Shared Packages and Platform Architecture

### `@bsuite/page-builder`

- Local source package is absent.
- App-local `PageGridLayout` and `usePageGridLayout` copies remain in BSU, CRM7, Conduit, and R80.3.
- Extract canonical page-builder components into a shared package.
- Replace app-local duplicates with the shared package.
- Add package tests and consumer typechecks.
- Keep package publishing compatible with independently deployed submodule repos.

### `@bsuite/schema-registry`

- Consumers exist, but local source is absent in this workspace state.
- Restore or reconcile source of truth.
- Confirm package version and npm availability.
- Reconcile CRM7 schema builder, page builder, and consumer app expectations against one canonical registry.

### `@bsuite/theme`

- `@bsuite/theme@0.3.3` provides platform-logo helpers.
- Consumers still need migration to shared `resolvePlatformLogo()` or `usePlatformLogo()`.
- Remove local logo/path fallback logic after consumers migrate.
- Run app typechecks/builds after migration.

### `@bsuite/dry-lint`

- `@bsuite/dry-lint@0.2.0` writers schema support is shipped.
- `tenants`, `user_tenants`, `teams`, and `team_invitations` ownership maps are tightened for current DRY one-shot rules.
- Direct-write checks are promoted from warning to error in BSU, CRM7, Conduit, R80.3, Braden, and Throughput.
- Consumer configs pin `appOverride` so the rule remains active in temporary worktrees and independently cloned app repos.
- Phase 5 still owns relocation of the known legacy write paths currently isolated by narrow per-file overrides.

### Charge Calc and Navigation

- Continue charge-calc convergence across CRM7 and R80.3.
- Keep `@bsuite/charge-calc` as an npm dependency in consumer apps, not `workspace:*` or `file:`.
- Continue unified navigation and app-switching convergence where not already complete.

## Priority 3: Auth, OAuth, and Session Topology

- Preserve distinct OAuth behavior per app; do not make all apps identical.
- Avoid duplicate OAuth implementation code.
- Keep BSU as the only BS OAuth server and consent surface.
- Keep Conduit aligned with its intended auth architecture and local login entry points where current docs specify it.
- Keep Conduit OAuth mechanics delegated to `@bsuite/auth`; app code should remain a thin client-ID wrapper plus local route/return-path handling.
- Finish runtime smoke for CRM7, Conduit, R80.3, Throughput, and Braden preview/login flows.
- Verify return-origin or equivalent preview-origin preservation for all direct login entry points.
- Confirm CRM7 callback still correctly handles dual BS OAuth and native Supabase PKCE flows.
- Confirm mandatory Google and Microsoft provider surfaces remain exactly two providers where applicable; do not re-add GitHub.
- After email OAuth edge redeploy, verify `xms_edov` and state-secret behavior.

## Priority 4: Schema Builder, Page Builder, Relationships, and Location UX

From CRM7 schema/page-builder audit and full-7 ledger:

- Port BSU fixed PostgREST nested `.or()` query behavior to CRM7 `schemaBuilderService`.
- Unify permission gates around `canEditPlatformSchema()` and `canEditTenantViews()`.
- Remove inconsistent use of `subscription.bypass` or `manage_system` as ad hoc schema-builder gates.
- Add `tenant_field_definitions.entity_id` FK, backfill, and constraints.
- Expand self-relation guards.
- Surface position-save errors and debounce saves.
- Replace widget-selector paradigm with direct-manipulation canvas UX.
- Move schema-builder data loading to TanStack Query.
- Replace module-level widget registry `Map` with a reactive store.
- Replace `CustomEvent` patterns with Zustand or context.
- Derive `EntityTableWidget` columns from field registry or information schema, not `rows[0]`.
- Add `DragOverlay` and structured drag IDs to `FormLayoutBuilder`.
- Remove silent catches on writes.
- Derive `EntityLinker` options from relations and foreign keys.
- Remove or fix register-on-open side effects.
- Add BSU edge style tokens where CRM7 page builder still diverges.
- Add audit trail for entity, relation, and field changes.
- Add Zod validation for layout JSON writes.
- Wire or delete unused `updateSchemaRelation`.
- Build the Phase 1 data-model/codegen work: entity FK, `dbSchemaToZod`, `/admin/codegen`, `is_system` trigger, scalar-subquery RLS.
- Build the Phase 2 schema-builder upgrade: database schema nodes, TanStack Query, Zustand registry, token use, migration emitter.
- Build the Phase 3 page-builder rebuild: shared canvas components and direct manipulation.
- Start Phase 4 relationship/location UX work after shared packages and ownership rules are stable.

## Priority 5: DRY One-Shot and Cross-App Write Ownership

Outstanding cross-app ownership and duplicate-write fixes:

- Finish DRY auto-population chains.
- Add missing DB FK migrations and ContactSelector usage on remaining forms.
- Replace duplicate schema-builder writes in BSU, Conduit, Braden, and R80.3 with CRM7-owned RPC or edge-function paths.
- Move CRM7 settings, branding, custom fields, and UI config writes to correct owner surfaces or make consumers read-only.
- Move BSU `tga-search` writes behind a CRM7-owned edge function if CRM7 owns the data.
- Move Braden `clients` writes and `BrandingAdmin` behavior to CRM7 or BSU owner surfaces as appropriate.
- Move R80 apprentice-store writes behind CRM7-owned APIs or RPC.
- Tighten `tenants` and `user_tenants` writer lists now that the dry-lint writers schema exists.
- Keep ownership enforcement in CI once violations are fixed.

## Priority 6: CRM7 Product and Data Work

### GTO Owner Flow

- Prove evidence coverage for partial Standards 1.1-1.4, 2.1-2.6, and 3.1-3.3.
- Implement field parity for missing GTO owner-flow fields.
- Add verification coverage for standards evidence paths.

### WS-2 MAPD and Wage Snapshots

- Harden MAPD sync.
- Add or finish `wage_calculation_snapshots`.
- Finish `wageSnapshotService`.
- Ensure downstream R80.3 and CRM7 selectors read `apprentice_rate_configs`.
- Ensure `resolveRatePackage` applies percentage overrides.
- Ensure CRM7 sync pushes `host_charge_rates` where required.

### WS-3 Invoicing

- Add migrations for invoices, invoice line items, invoice batches, enums, RLS, and triggers.
- Implement bulk invoice generation.
- Add subsidy credit lines.
- Add `XeroInvoiceAdapter`.
- Add PDF invoice renderer.
- Add annual reconciliation report.
- Update BSU `bi_metrics` once the invoice schema is live.

### WS-4 Timesheets and Payroll

- Add 7-state enum, events, pay runs, and payroll records.
- Complete STP/Xero payroll ADR and adapter.
- Implement timesheet state-machine service.
- Add UI badges, approval views, and history.

### WS-5 Reports

- Extend report templates, preferences, and deliveries.
- Seed seven report templates.
- Add interactive report viewer.
- Wire `pg_cron` plus report-delivery edge function.

### WS-6 AVETMISS

- Add `v_avetmiss_client_data`.
- Build `avetmiss-export` edge function and NAT files.
- Add WA, NSW, QLD, and SA STA variants.
- Add deadline notifications.

### WS-7 GTO Standards

- Add financial viability dashboard.
- Add induction records/register.
- Add guardian sign-off.
- Add WHS audit UI.
- Add monitoring visits and LLN work.
- Add F17 PDF/XLSX renderer.

### WS-8 Security

- Add or finish `org_members`, `gto_role` helpers, and RLS templates.
- Add pgTap tests through anon-key paths.

### WS-9 Portals

- Add apprentice, host, and field-officer subroutes.
- Finish portal workflow routing.
- Finish guardian flow.
- Continue portal subdirectory refactor.

### Funding Claims

- Add funding template catalog.
- Run stale-reference grep and fix live references.
- Wire `DynamicFieldRenderer` into funding pages.
- Extend constraints for `funding_claim` and `funding_source`.

### Xero

- Newest handoff says Xero app and secrets are present.
- Still verify feature flag, token-exchange deployment, and smoke behavior before treating Xero as active.

## Priority 7: CRM7 AI, Modernization, and One-Shot UX

### AI Strategic Vision

- Phase 2: conversational data entry, form filling, document extraction, web search, AI reports.
- Phase 3: autonomous workflow engine.
- Phase 4: predictive compliance, advanced analytics, competitive intelligence.
- Phase 5: AI cost tracking UI.
- Verify AI chat session persistence.
- Tie tenant quota enforcement to actual AI costs.

### Cascade/Claude Upgrade Coordination

- Task 2.2 settings module is blocked by missing backend schema.
- Task 2.3 FairWork API to Supabase Edge Function remains open.
- Task 2.8 CRM7 onboarding flow remains open.

### UX One-Shot Deep Dive

- Retire `DataContextSimple`.
- Retire `EnhancedDataContext`.
- Implement "view in context" links.
- Implement create-related shortcuts.
- Wire `DynamicFieldRenderer` and `EntityLinker` into contracts, compliance, host agreements, and funding sources.
- Extend `tenant_field_definitions.entity_type` constraints.

### Modernization Guide

- Migrate remaining legacy components using old patterns.
- Remove `EnhancedApprenticeForm`.
- Remove `EnhancedEmployerForm`.
- Add focused tests around replacements.

### One-Shot Entry Roadmap

- Implement Training Provider entity-specific one-shot entry.
- Implement GTO entity-specific one-shot entry.
- Implement Client entity-specific one-shot entry.
- Add validation and workflow templates.
- Complete docs and security review.

## Priority 8: Business Suite Unified Work

### Platform Kit Admin

Port or finish six admin subpanels:

- Auth config/providers.
- Deeper users/admin.
- Logs.
- Database.
- Secrets.
- Storage.

Shared primitives still needed:

- SQL editor.
- Results table.
- Dynamic form.

### WCAG and Accessibility

- Manually verify focus-not-obscured behavior.
- Perform screen-reader narration checks.
- Complete keyboard-only end-to-end flow.
- Ensure toast timing is at least 20 seconds or dismissable-on-focus where required.
- Roll WCAG verification across CRM7, R80.3, Braden, Throughput, and Conduit.
- Add or run `jest-axe` coverage where applicable.

### Supabase CRM Domain Audit

- Create and apply migrations for CRM7 domain tables: `inspections`, `inspection_checklists`, `inspection_reminders`, `workflow_triggers`, `workflow_escalation_rules`, `workflow_followup_tasks`, `report_configs`, `report_executions`, and `report_templates`.
- Include `org_id` as required.
- Implement RLS policies per RBAC/RLS reference.
- Add functions `send_inspection_reminders`, `execute_report`, and `get_inspection_calendar`.
- Add harness tests.

### Supabase Apply Runbook

- Missing migration reference needs correction or creation: `external-apps/crm7/supabase/migrations/20250601_crm7_core_schema.sql`.
- Execute the runbook.
- Verify tables, functions, and RLS.
- Update checklist/results.

### Other BSU Items

- Audit or migrate `react-day-picker` v8 usage.
- Keep AppSwitcher/session-handoff work aligned with current auth topology.
- Add or finish BSU usage analytics where still current.
- Keep cross-app notifications work tied to current data ownership rules.

## Priority 9: R80.3 Work

### Training Fees

- Document maximum validation cap.
- Decide and document per-apprentice overrides.
- Clarify PDF/report inclusion for `trainingFeesAnnual`.

### Payday Super

- Add public holiday awareness.
- Add salary-sacrifice qualifying-earnings nuance.
- Add director and close-associate rules.
- Integrate with timesheet/pay-run pipeline.
- Add UI snapshot/component tests.
- Add JSDoc source URLs on constants.

### Cross-App Dependencies

- Ensure R80 selectors read CRM7 `apprentice_rate_configs`.
- Ensure R80 applies percentage override through `resolveRatePackage`.
- Ensure CRM7 sync paths push host charge rates needed by R80.

### Superseded Roadmap Backlog

The old R80 roadmap is archived or superseded by newer parent plans and `R80.3/docs/OUTSTANDING.md`. Treat these as low-confidence backlog until revalidated:

- Error/logging improvements.
- Performance and state-management improvements.
- Testing and type-safety expansion.
- PWA/offline support.
- Onboarding.
- Accessibility and responsiveness.
- Reporting/export improvements.
- Templates and branding.
- Multi-user, RBAC, and portal work.
- Award administration and rate management.
- Historical analytics and scenarios.
- Integrations, webhooks, and notifications.
- Commercialization/support work.
- Agent-os integration.
- R80.1 salvage.

## Priority 10: Braden Work

### Visual Editing

- Add drag/drop layout editor.
- Add component-specific editors.
- Add visual preview.
- Add responsive design tools.
- Add reusable content blocks.

### Advanced Editing

- Add version history and rollback.
- Add publishing workflow.
- Add advanced component customization.
- Add performance optimization.
- Add role-based editing permissions.

### Current Sprint Items

- Finish site preview.
- Enable component placement in layout sections.
- Save and load layouts from the database.

### Security and QA

- Keep credential-rotation checklist ready for exposure scenarios.
- Verify Speed Insights and analytics data under CSP.
- Confirm no new security vulnerabilities.
- Finish existing function testing.
- Fix failing tests.
- Continue component modularization and clone reduction.
- Add error boundaries.
- Optimize bundles.
- Add performance testing.
- Clean strict-mode `any` usage.
- Generate docs where planned.
- Improve CI caching/parallelism and automated metrics.
- Work toward documented targets: greater than 95 percent coverage, less than 400 kB JS, less than 50 kB CSS, no components above 200 lines, and zero `any`.

### CMS and UX

- Add CMS API coverage for services, applications, and site metadata.
- Run accessibility audit.
- Verify keyboard navigation, screen reader behavior, ARIA, contrast, and focus states.
- Run Lighthouse, bundle analysis, load testing, waterfall checks, and memory leak checks.

### Bot Protection

- Add server-side `checkBotId` where planned.
- Add custom protection rules.
- Add monitoring and alerts.
- Add rate limiting.

## Priority 11: Throughput Work

### Current Outstanding Index

- React 19 and schema-registry consumer wiring remains open in current docs and should be completed under Priority 11.
- Docs naming convention non-compliance remains low priority.
- npm to pnpm migration appears handled by finish-line work, but should be rechecked before closing permanently.

### Quality Audit

- Fix accessibility gaps.
- Expand test coverage toward the documented 80 percent target.
- Add production logging.
- Add WCAG 2.2 AA checklist to standards.
- Run Lighthouse, axe, and screen-reader QA.
- Add visual regression coverage.
- Optimize performance.

### Product Roadmap

- Production database optimization.
- Edge-function enhancements.
- Expanded E2E, visual, performance, and browser tests.
- Security audit.
- Mobile responsiveness.
- Accessibility.
- CI/CD hardening.
- Production deployment and monitoring.
- Observability and scalability.
- MFA, OAuth, security, compliance, data retention, and audit logging.
- User management.
- Billing and subscriptions.
- Collaboration and communication features.
- Enhanced AI.
- Integrations.
- Analytics.
- Advanced business tools.
- Mobile and desktop apps.

## Priority 12: Conduit Work

- `conduit/docs/OUTSTANDING.md` reports no incomplete local plans.
- Keep Conduit-specific docs as live references.
- Parent-ledger items still apply where they touch Conduit:
  - OAuth/login runtime smoke.
  - Shared page-builder duplicate removal if Conduit still owns local copies.
  - Theme/logo consumer migration if Conduit has local platform-logo logic.
- Next.js cacheComponents/PPR work appears parent-tracked by finish-line docs; recheck current code before reopening it.

## Priority 13: Documentation Hygiene

- Update stale docs that still list items now verified complete in newer handoffs.
- Add source-of-truth notes to older plans that conflict with newer ledgers.
- Update `docs/README.md`, `docs/plans/README.md`, and `docs/archive/README.md` whenever documents are moved or archived.
- Keep top-level docs naming convention: `YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md`.
- Throughput docs naming convention cleanup remains low priority.
- Do not treat archived docs as live backlog without an active doc carrying the item forward.
- Maintain the split between useful historical docs in repo archives and generated/low-value bulk in external archive storage if cleanup resumes.

## Stale or Superseded Sources

These docs contain useful evidence but should not be used as current backlog without revalidation:

- Older operator handoffs before `docs/20260428-operator-handoff-v3.00W.md`.
- Older finish-line signoff before `docs/20260427-finish-line-review-signoff-v1.00W.md`, except for evidence not repeated elsewhere.
- `R80.3/docs/20260304-r80-roadmap-v1.00W.md`, which is broad and superseded by app `OUTSTANDING.md` plus parent roadmap/gap docs.
- Older CRM7 smoke-test and archived QA reports that are reference material, not current product backlog.
- Color-token audit follow-ups tied to pre-`@bsuite/theme@0.3.3` package state; consumer migration remains current, but old package-source restoration notes may be stale.
- Universal-canvas plan sections that report completion but conflict with the newer full-7 ledger; use the full-7 ledger for page-builder extraction status.
- CRM7 Xero app-registration tasks in older runbooks; newest handoff says app and secrets are present, but activation/smoke still needs verification.

## Recommended Execution Order

1. Resolve operator/security handoff items that require dashboard or portal access.
2. Keep branch reconciliation blocked until active integration work finishes, then reconcile `crm7` and parent carefully.
3. Complete preview OAuth runtime smoke across CRM7, Conduit, R80.3, Throughput, and Braden.
4. Restore or extract shared package source for `@bsuite/schema-registry` and `@bsuite/page-builder`.
5. Migrate consumers to `@bsuite/theme@0.3.3` platform-logo helpers.
6. Replace the known legacy cross-app write exceptions now that dry-lint error-level enforcement is active.
7. Execute CRM7 GTO WS-2 through WS-9 work in dependency order.
8. Close CRM7 AI/cost/session/quota and modernization items.
9. Finish BSU platform admin, WCAG, and Supabase domain/runbook work.
10. Close R80.3, Braden, Throughput, and Conduit parent-tracked app gaps.
11. Re-run docs hygiene after code gates close and archive superseded docs with index updates.
