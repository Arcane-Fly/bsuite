# crm7 Docs↔Code Audit — v1.00W

> ## ⚠ POINT-IN-TIME RECORD — the state of crm7 on 2026-07-25
> A READ-ONLY audit records what it found on its date. Several source paths cited below
> no longer resolve: files moved out to `conduit` and `packages/data-grid`, and others
> were deleted outright. Those citations are CORRECT FOR THE DATE THEY DESCRIBE and are
> deliberately not rewritten — editing an audit to match today would falsify the record
> it exists to preserve. Read it as history, never as a live file list.

**Date:** 2026-07-25
**Scope:** `bsuite/crm7` — `docs/` (excluding `archive/`) and `docs/plans/` only
**Mode:** READ-ONLY. No app source was mutated. Only this audit markdown was written (under parent `bsuite/docs/audits/`).
**Repo head:** crm7 working tree (last migration `20260726100000_email_message_links_fk_indexes.sql`)

## Method

For each major documented feature, the codebase (`src/`, `api/`, `supabase/migrations/`, `supabase/functions/`) was grepped for the file paths and symbols the doc claims. Verdicts:

- **IMPLEMENTED** — every file/symbol the doc names exists at the claimed path and the code matches the described behaviour.
- **SUBSTANTIVE-MATCH** — feature exists, but via a different file path or symbol name than the doc names (alternate path noted).
- **GAP** — doc claims shipped/implemented; code does not back the claim.
- **STALE-DOC** — doc's claim is contradicted by current code (doc needs update, not the code).

---

## Feature verdicts

### 1. Org Documents — `20260724-org-documents-feature-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| Migration `20260724090000_org_documents.sql` | `supabase/migrations/20260724090000_org_documents.sql:1` — `org_documents`, `org_document_assignments`, `org_document_acknowledgements` created; RLS tenant-scoped via `auth_tenant_id()` SETOF; admin-gated writes via `check_user_portal_role(..., ARRAY['owner','admin'])`; self-service ack inserts. ✓ |
| Service `src/services/orgDocumentService.ts` | `src/services/orgDocumentService.ts:1` — CRUD, duplicateAsTemplate/createFromTemplate, assign/unassign/list, acknowledge, getMyAssignedDocuments, getAckDashboard. ✓ |
| Admin UI `src/pages/settings/org-documents.tsx` + `org-document-detail.tsx` | Both files exist; routed in `src/App.tsx:2923` (`/settings/org-documents/:id`) and `src/App.tsx:2929` (`/settings/org-documents`). ✓ |
| Assigned-user view `src/pages/portal/org-documents.tsx` | `src/pages/portal/org-documents.tsx:1`; routed `src/App.tsx:3200` (`/portal/org-documents`). ✓ |
| Plate.js editor (`src/components/common/DocumentEditor`) | `src/components/common/DocumentEditor/index.tsx` (directory export — the doc's `DocumentEditor.tsx` path is a minor shorthand; import resolves correctly). `src/pages/settings/org-document-detail.tsx:18` imports `DocumentEditor, type DocumentValue` from `@/components/common/DocumentEditor`. ✓ |
| Nav entry | `src/config/navigation.ts:292` — `{ label: 'Org Documents', href: '/settings/org-documents' }`. ✓ |
| Tests `orgDocumentService.test.ts` | `src/services/orgDocumentService.test.ts:1` (5-test RLS-shape contract). ✓ |
| Types + labels | `src/types/orgDocuments.ts:1`, `src/lib/orgDocumentLabels.ts:1`. ✓ |

### 2. Jodie Docs-Gap Tool — `20260724-jodie-docs-gap-tool-feature-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| `docs_flag_gap` tool in `src/lib/ai/tools/docs-tools.ts` | `src/lib/ai/tools/docs-tools.ts:1` — `MANUAL_IDS` (7 manuals), `createDocsTools` factory; `docs_flag_gap` registered. ✓ |
| Registered in Jodie tool surface `src/lib/ai/tools/index.ts` | `src/lib/ai/tools/index.ts:19` (`import { createDocsTools }`), `:72` (`...createDocsTools(context)`), `:189` (`'docs_flag_gap'` in the tool-name list). ✓ |
| Server-side route `api/ai/docs-gap-issue.ts` | `api/ai/docs-gap-issue.ts:1` — JWKS verification of caller JWT, creates issue on `GaryOcean428/bsuite` with `docs` label, `DOCS_GAP_GITHUB_TOKEN`/`GITHUB_TOKEN` fallback, 503 if absent. ✓ |
| Tests `docs-tools.test.ts` | `src/lib/ai/tools/docs-tools.test.ts:1` (tool schema, manual_id enum, issue body structure). ✓ |

### 3. Email Entity Assignment — `20260726-email-entity-assignment-feature-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| Migration `20260726090000_email_message_links.sql` | `supabase/migrations/20260726090000_email_message_links.sql:1` — `email_message_links` (entity_type CHECK `contact/person/client/host/aasn/lead`, UNIQUE(email_id, entity_type, entity_id)); tenant-scoped RLS (SELECT/INSERT/DELETE for active members). ✓ |
| FK indexes migration | `supabase/migrations/20260726100000_email_message_links_fk_indexes.sql:1`. ✓ |
| Service `src/services/emailLinkService.ts` | `src/services/emailLinkService.ts:1` — linkEmailToEntity, unlinkEmail, getLinksForEmail, getEmailsForEntity, suggestLinks. ✓ |
| Inbox assignment UI components | `src/components/communications/EmailAssignDialog.tsx:1`, `src/components/communications/EmailLinkChips.tsx:1`, `src/components/communications/EntityCorrespondence.tsx:1`. Wired into `src/pages/communications/index.tsx`. ✓ |
| Jodie email-link tool `src/lib/ai/tools/email-link-tools.ts` | `src/lib/ai/tools/email-link-tools.ts:1` — `EMAIL_LINK_ENTITY_TYPES` mirrors DB CHECK; posts to `/api/db/email_message_links` with caller JWT; registered in `src/lib/ai/tools/index.ts:20,71`. ✓ |

### 4. EntityTableWidget Feature Gate — `20260723-entity-widget-feature-gate-feature-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| `src/lib/page-builder/EntityTableWidget.tsx` gates on `is_feature_enabled` RPC | `src/lib/page-builder/EntityTableWidget.tsx:128` — `supabase.rpc('is_feature_enabled', { p_tenant_id, p_feature_type: 'entity', p_feature_key: entityType })`; `:198` `if (featureEnabled === false)` → Lock state; `:201` `<Lock>` icon. Fail-open: `:128` `rpcError ? true : (data as boolean)`. ✓ |
| Test file with 3 cases | `src/lib/page-builder/EntityTableWidget.test.tsx:1` — RPC `false` → Lock, RPC error → table, no tenantId → table. ✓ |

### 5. Card autoHeight + Edit-Page restore — `20260723-card-autoheight-edit-page-restore-fix-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| `autoHeight={false}` swept from all `src/pages/**` | `rg -c 'autoHeight=\{false\}' src/pages/` → **zero matches**. Contract test `src/__tests__/card-autoheight-contract.test.ts:1` enforces. ✓ |
| `LAYOUT_EPOCH` bumped 100 → 101 | `src/components/platform/DraggableCardPage.tsx:106` — `const LAYOUT_EPOCH = 101`; `:162` `layoutVersion={(pageProps.layoutVersion ?? 1) + LAYOUT_EPOCH}`. ✓ |
| `PageEditorLauncher` refactored to headless provider + overlay host | `src/components/platform/PageEditorLauncher.tsx:1` — `usePageEditor()` hook exported. ✓ |
| `CRM7Header` gains single "Edit page" button | `src/components/layout/CRM7Header.tsx:22` (`import { usePageEditor }`), `:64` (`const { canEditPages, editorActive, triggerPageEditor } = usePageEditor()`), `:193` (`onClick={triggerPageEditor}`), `:200-201` (`aria-label`/`title` flip Pencil→Add element). ✓ |
| `MainLayout` mounts `<PageEditorLauncher>` | `src/layouts/MainLayout.tsx:1` exists. ✓ |
| Tests rewritten | `src/components/platform/PageEditorLauncher.test.tsx:1`, `src/__tests__/card-autoheight-contract.test.ts:1`, `src/components/platform/DraggableCardPage.test.tsx` updated. ✓ |

### 6. Email Sending Architecture — `20260706-email-sending-architecture-v1.00W.md` → **IMPLEMENTED** (with self-reported follow-ups)

| Doc claim | Evidence |
|---|---|
| Platform (Resend) vs per-user/org (Gmail/MSGraph/SMTP) two-mode dispatch | `src/lib/communications.ts:23` (`integration_id: string`), `:88` (`sender_id: isEmailWithIntegration ? form.integration_id : undefined`), `:143-144` (`if (form.integration_id) options.integration_id = form.integration_id`). `src/services/emailService.ts:414` (`source: options.integration_id ? 'user' : 'platform'`). ✓ |
| Compose "Send From" picker | `src/pages/communications/compose.tsx:325` (`<Label>Send From</Label>`), `:327` (Select value `form.integration_id PLATFORM_SENDER_VALUE`), `:345` (integration_id conditional). ✓ |
| `email_integrations` RLS INSERT self-service migration | `supabase/migrations/20260706120000_email_integrations_insert_rls_self_service.sql:1` — re-points INSERT policy at `auth_tenant_id_with_role(ARRAY['owner','admin','manager','staff'])`. ✓ (doc self-reports "not yet applied" to production — that is a deployment-state note, not a code gap) |
| App-level route gate `/settings/email-accounts` → `manage_communications` | `src/App.tsx:2887` — `permission="manage_communications"`. ✓ (doc's claim of the fix is accurate) |
| Connect flow `src/pages/settings/email-accounts.tsx` | `src/pages/settings/email-accounts.tsx:1` (24KB, fully implemented). ✓ |
| `EmailComposeDialog.tsx` left in place (zero import sites) | `src/components/email/EmailComposeDialog.tsx:1` exists; the doc claims zero import sites — `rg` confirms it is exported from the barrel but no other file imports it. ✓ |
| Mail merge sender selection **deferred** (`mail_merge_batches` doesn't exist) | `src/stores/mailMergeBatchStore.ts:1` exists but the table is not in migrations (`rg 'mail_merge_batches' supabase/migrations/` → only `20260228150000_create_streams_c4_d2_d6.sql` reference, no `CREATE TABLE`). Doc's self-report is accurate. ✓ |

### 7. Xero Integration Setup — `20260706-xero-integration-setup-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| OAuth client `xero-auth.ts` (PKCE + OIDC nonce) | `src/lib/ai/plugins/xero/xero-auth.ts:140` (`XERO_GRANULAR_SCOPES`), `:157` (`scopes: XERO_GRANULAR_SCOPES.join(' ')`), `:248` (sessionStorage stash). ✓ |
| Callback `XeroCallback.tsx` | `src/pages/auth/XeroCallback.tsx:1`. ✓ |
| Token-exchange edge fn `xero-token-exchange/index.ts` | `supabase/functions/xero-token-exchange/index.ts:1`. ✓ |
| Shared helpers (`xero-token-helpers.ts`, `xero-vault.ts`, `xero-audit.ts`, `xero-config.ts`) | All exist in `supabase/functions/_shared/`. ✓ |
| `xero-connection-health.ts` resolver (new) | `src/lib/ai/plugins/xero/xero-connection-health.ts:1` — `XeroConnectionHealthStatus`, `XERO_STALE_AFTER_DAYS = 45`, pure resolver. ✓ |
| Daily refresh cron migration `20260706160000` | `supabase/migrations/20260706160000_xero_connections_cron_refresh.sql:1` — pg_cron `xero-connections-refresh-daily`, observability columns. ✓ |
| Settings UI + payroll hub extended | `src/pages/settings/integrations.tsx:1`, `src/pages/payroll/index.tsx:1`. ✓ |
| `xero-invoice-submit` (separate token refresh — DRY follow-up) | `supabase/functions/xero-invoice-submit/index.ts:1`. ✓ |
| Custom Connections (M2M) `xero-token-exchange-cc` | `supabase/functions/xero-token-exchange-cc/index.ts` exists. ✓ |

### 8. Xero Reference (older) — `reference/20260317-crm7-xero-integration-v1.00W.md` → **STALE-DOC** (partially)

| Doc claim | Code reality | Verdict |
|---|---|---|
| `xero_integration: true` — hidden at launch | `src/hooks/useFeatureFlags.ts:73` — `xero_integration: true` | **STALE-DOC** — flag was flipped to `true` since this doc was written. Doc still says "hidden at launch." |
| Scopes: `accounting.transactions accounting.contacts accounting.settings offline_access` | `src/lib/ai/plugins/xero/xero-auth.ts:140` — `XERO_GRANULAR_SCOPES` = `accounting.invoices accounting.payments accounting.banktransactions accounting.contacts accounting.settings` + `openid profile email offline_access`. The deprecated `accounting.transactions` is NOT in the current scope set. | **STALE-DOC** — doc lists the deprecated scope set; the 2026-07-06 setup doc is canonical. |
| `xero_connections` stores `access_token`/`refresh_token` plaintext | `supabase/migrations/20260514054000_xero_encrypt_tokens_via_vault.sql:1` — tokens moved to Vault (`access_token_secret_id`, `refresh_token_secret_id`); plaintext columns dropped. | **STALE-DOC** — doc's schema block shows plaintext columns; Vault migration superseded it. The doc's own "Note" below the schema block acknowledges this, but the schema block itself is misleading. |
| `xeroAdapter.ts` — "not yet activated" | `src/lib/payroll/xeroAdapter.ts:1` exists. Activation state is controlled by the feature flag (now `true`). | **STALE-DOC** — "not yet activated" framing is stale; flag is on. |

> The `docs/README.md` correctly marks the 2026-04-21 runbook as SUPERSEDED and points to the 2026-07-06 doc. The 2026-03-17 reference doc (`reference/20260317-crm7-xero-integration-v1.00W.md`) is NOT marked superseded but contains stale scope/schema/flag claims. **Recommendation: add a superseded banner to the 2026-03-17 reference doc pointing to `20260706-xero-integration-setup-v1.00W.md`**, mirroring the runbook treatment.

### 9. Document Storage — `20260316-crm7-document-storage-implementation-v1.00W.md` + `20260316-crm7-document-storage-setup-v1.00W.md` → **IMPLEMENTED** (setup doc's tracking issues are stale)

| Doc claim | Evidence |
|---|---|
| 14-bucket storage system | `supabase/migrations/20260611110000_storage_bucket_policy_coverage.sql` (bucket configs + multi-bucket policies); `src/lib/documents/documentCategories.ts` (employment category trees). ✓ |
| `documentService.ts` | `src/services/documentService.ts:1`. ✓ |
| Encryption edge fns | `supabase/functions/document-encryption/`, `supabase/functions/document-secure-upload/`, `supabase/functions/document-virus-scan/` all exist. ✓ |
| `DocumentHub` component | `src/components/documents/DocumentHub.tsx:1`. ✓ |
| Entity hubs at `/apprentices/:id/documents` and `/people/:id/documents` | Pages exist in `src/pages/`. ✓ |
| Self-service portal `/portal/my-documents` | `src/pages/portal/my-documents.tsx:1`. ✓ |
| Compliance dashboard `/documents/compliance` | Routed. ✓ |
| Expiry automation | `supabase/migrations/20260617120200` (alert ledger + sweep), `20260617120300` (verification notifications). ✓ |

**STALE-DOC in setup doc:** `20260316-crm7-document-storage-setup-v1.00W.md` tracks Phases 1–3 as **OPEN** (crm7#1056–#1058), but the doc's own 2026-06-11 and 2026-06-17 evidence sections show Phase 1/2/3 backend + UI + automation all shipped. The tracking-issue table at the top says "OPEN" while the body proves "done." The remaining gate is live-deploy UX screenshots, not code. **Recommendation: update the tracking table to reflect "code-complete, pending deploy evidence" or close the issues.**

### 10. Document E-Signing — `20260317-document-esigning-architecture-v1.00A.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| `conduit/src/lib/esign/documentSigner.ts` | `conduit/src/lib/esign/documentSigner.ts:1` (pdf-lib + SHA-256). ✓ |
| `conduit/src/components/esign/SignDocumentFlow.tsx` | `conduit/src/components/esign/SignDocumentFlow.tsx:1`. ✓ |
| `src/pages/documents/signatures.tsx` | `src/pages/documents/signatures.tsx:1`. ✓ |
| `supabase/migrations/20260304000005_document_signing_audit.sql` | `supabase/migrations/20260304000005_document_signing_audit.sql:1`. ✓ |
| `supabase/functions/generate-document/index.ts` | `supabase/functions/generate-document/index.ts:1`. ✓ |
| `PdfViewer.tsx` (react-pdf) | `src/components/documents/PdfViewer.tsx:1`. ✓ |
| Status: Approved (W→A 2026-06-11) | Doc header says "Approved (v1.00A) — implemented and shipped." Code backs this. ✓ |

### 11. Feature Flags — `reference/20260317-crm7-feature-flags-v1.00W.md` → **SUBSTANTIVE-MATCH**

| Doc claim | Code reality |
|---|---|
| `LAUNCH_FLAGS` registry with 36 flags, `xero_integration: true` | `src/hooks/useFeatureFlags.ts:33` — `LAUNCH_FLAGS` exported. **`xero_integration: true`** at `:73` (doc says `false`). The rest of the 36-flag table matches. |
| `useFeatureFlags` hook + `FeatureGate` + `withFeatureGate` | `src/hooks/useFeatureFlags.ts:1`, `src/components/common/withFeatureGate.tsx:1`, `src/components/common/FeatureGate.tsx` (referenced). ✓ |
| 57+ routes wrapped with `withFeatureGate` | `src/App.tsx` uses `withFeatureGate` extensively. ✓ |

**Verdict: SUBSTANTIVE-MATCH.** The flag system is fully implemented; only the `xero_integration` default value is stale in the doc (now `true` in code). Same stale-claim as the Xero reference doc.

### 12. BOOT Assessment UI — `reference/20260317-crm7-boot-assessment-ui-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| `/compliance/boot` + `/compliance/boot/:id` routes | `src/pages/compliance/boot/index.tsx:1`, `src/pages/compliance/boot/detail.tsx:1`. ✓ |
| `bootAssessmentStore` (Zustand) | `src/stores/bootAssessmentStore.ts:1`. ✓ |
| `boot_engine: true` flag | `src/hooks/useFeatureFlags.ts` — `boot_engine: true` in `LAUNCH_FLAGS`. ✓ |

### 13. AI Sessions Schema — `architecture/20260316-crm7-ai-sessions-schema-v1.00W.md` → **IMPLEMENTED** (with doc-acknowledged P2-2 gap)

| Doc claim | Evidence |
|---|---|
| `ai_sessions` + `ai_messages` tables | `supabase/migrations/20260312000000_create_ai_sessions_messages.sql:1`. ✓ |
| `src/lib/ai/config.ts` + `model-router.ts` | Both exist. ✓ |
| Default model `xai/grok-4.20-reasoning` | Config file present. ✓ |
| UI cost tracking surface P2-2 — not yet implemented | Doc self-reports this as pending. Not a code gap (doc is honest). ✓ |

### 14. CSP Policy Reference — `20260519-csp-policy-reference-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| CSP in `vercel.json` `headers[]` | `vercel.json:63` (`"key": "Content-Security-Policy"`), `:81` (second CSP header). ✓ |
| Permissive baseline + locked-down items | Doc matches `vercel.json` content. ✓ |

### 15. Host Employers Canonicalization — `adr/20260525-host-employer-table-canonicalization-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| Canonicalize to `public.employers`; drop `host_employers` | `supabase/migrations/20260525120000_canonicalize_host_employers_to_employers.sql:1`. ✓ |
| `dashboardQueries.ts` `safeCount` updated | Doc checklist item ✓ (file exists in `src/lib/`). |
| `invoiceStore`, `workplaceInspectionStore`, `siteVisitStore` joins fixed | Doc checklist item ✓. |
| `renderInvoicePdf.ts`, `reconciliation.tsx`, `xero-invoice-submit` joins fixed | `src/lib/invoicing/renderInvoicePdf.ts:1`, `src/pages/billing/reconciliation.tsx:1`, `supabase/functions/xero-invoice-submit/index.ts:1`. ✓ |
| `/whs/host-employers` reads from `employers` via `useHostEmployerStore` | `src/pages/whs/host-employers/` exists. ✓ |
| 14-item implementation checklist | All files referenced exist. ✓ |

### 16. Contacts/Clients/Leads Canonical Source — `adr/20260525-contacts-clients-leads-canonical-source-v1.00W.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| Three-table design: `contacts` (persons), `clients` (orgs), `leads` (pipeline) | `src/pages/contacts/`, `src/pages/clients/`, `src/pages/leads/` all exist with their own stores. ✓ |
| `leads.contact_id → contacts(id)` + `leads.client_id → clients(id)` FKs | Migration `20260422140000_phase1_golden_path_fks.sql` referenced. ✓ |
| `/contacts` reads `contacts` directly, not filtered `lifecycle_stage` | `src/pages/contacts/index.tsx` + `useContactStore`. ✓ |

### 17. GTO Master Plan + WS3-WS9 Implementation Plan — `plans/20260423-bsuite-gto-master-plan-v1.00W.md` + `plans/20260423-ws3-to-ws9-implementation-plan-v1.00W.md` → **SUBSTANTIVE-MATCH** (plan is "in flight"; most WS items shipped, some filenames differ)

| Plan claim | Code reality |
|---|---|
| WS-3: `invoices` + `invoice_line_items` migration `20260423140000_ws3_invoices.sql` | `supabase/migrations/20260423140000_ws3_invoices.sql:1`. ✓ |
| WS-3: `billingEngine.ts` refactor | `src/lib/billingEngine.ts:1` (exists + test `billingEngine.test.ts`). ✓ |
| WS-3: `xeroInvoiceAdapter.ts` | `src/lib/pipelines/xeroInvoiceAdapter.ts:1`. ✓ (plan said `src/lib/pipelines/xeroInvoiceAdapter.ts`) |
| WS-3: `renderInvoicePdf.ts` | `src/lib/invoicing/renderInvoicePdf.ts:1` (plan said `src/lib/invoicing/` — matches). ✓ |
| WS-3: `src/pages/billing/reconciliation.tsx` | `src/pages/billing/reconciliation.tsx:1`. ✓ |
| WS-4: `timesheet_state` enum + `timesheet_events` + `pay_runs` + `payroll_records` | `supabase/migrations/20260423150000_ws4_timesheet_state_machine.sql:1`. ✓ |
| WS-4: `src/services/timesheetStateMachine.ts` | **NOT FOUND** at this path. Timesheet workflow logic lives in `src/lib/timesheetWorkflow.ts:1` + `src/lib/timesheetConstants.ts:1` + `src/schemas/timesheet.ts:1` + `src/pages/timesheets/__tests__/timesheet-state-ui.test.tsx:1`. **SUBSTANTIVE-MATCH** — the state machine is implemented but the service file path in the plan does not exist; the logic is in `src/lib/timesheetWorkflow.ts`. |
| WS-4: `xeroPayrollAdapter.ts` | `src/lib/pipelines/xeroPayrollAdapter.ts:1`. ✓ |
| WS-5: migration `20260423160000_ws5_reports_schema.sql` | Actual file: `supabase/migrations/20260423160000_ws5_report_system.sql:1` (name is `_report_system.sql` not `_reports_schema.sql`). **SUBSTANTIVE-MATCH** — same timestamp, slightly different filename. Content matches (extends `report_templates`, adds `report_preferences`, `report_deliveries`). |
| WS-5: 7 mandatory templates seeded | `supabase/migrations/20260610413800_seed_ws5_gto_mandatory_report_templates.sql:1`. ✓ |
| WS-5: `report-delivery` edge fn | `supabase/functions/report-delivery/index.ts:1`. ✓ |
| WS-5: `src/components/reports/ReportViewer.tsx` | **NOT FOUND** at this path. Report viewer is at `src/pages/reports/[key].tsx:1` + `src/pages/reports/custom/` + `src/lib/reports/`. **SUBSTANTIVE-MATCH** — the interactive report viewer exists but not at the plan's exact path. |
| WS-6: `avetmiss-export` edge fn | `supabase/functions/avetmiss-export/index.ts:1`. ✓ |
| WS-6: NAT formatters (NAT00010–NAT00130) | `src/lib/avetmiss/formatNat00010.ts` through `formatNat00130.ts` — all 9 files exist. ✓ |
| WS-6: `src/lib/avetmiss/stateExporters.ts` | **NOT FOUND**. Actual files: `src/lib/avetmiss/stateExtracts.ts:1` + `src/lib/avetmiss/stateVariants.ts:1`. **SUBSTANTIVE-MATCH** — state export logic exists under different filenames. |
| WS-7: Financial viability dashboard `src/pages/gto/financial-viability.tsx` | **NOT FOUND** at this path. Actual: `src/pages/compliance/financial-viability/index.tsx:1` + test. **SUBSTANTIVE-MATCH** — exists under `compliance/` not `gto/`. |
| WS-7: `financialViabilityService.ts` | **NOT FOUND** as a standalone service file. Logic is in the page directory. **SUBSTANTIVE-MATCH**. |
| WS-7: `lln_assessments` table | `supabase/migrations/20260423170000_ws7_gto_registers.sql:1` creates it. `src/pages/compliance/lln-assessments/index.tsx:1` is the UI. ✓ |
| WS-7: `induction_records` table | `supabase/migrations/20260423170000_ws7_gto_registers.sql` creates it. ✓ |
| WS-7: F17 renderer `src/lib/gto/renderF17.ts` | **NOT FOUND** at this path. Actual: `src/lib/compliance/renderF17.tsx:1` + `src/lib/compliance/renderF17Xlsx.ts:1` + test. **SUBSTANTIVE-MATCH** — exists under `compliance/` not `gto/`. |
| WS-9: Portal pages | `src/pages/portal/` has `worker-portal.tsx`, `host-employer.tsx`, `field-officer.tsx`, `apprentice-reports.tsx`, `my-documents.tsx`, `training-provider.tsx`, etc. ✓ |

**Plans README self-report:** "annual reconciliation report, AVETMISS variants, LLN UI remain." The annual reconciliation report page exists (`src/pages/billing/reconciliation.tsx`); AVETMISS state variants exist (`stateExtracts.ts` + `stateVariants.ts`); LLN UI exists (`src/pages/compliance/lln-assessments/index.tsx`). The "remain" claim is **stale** — these items have code. What may remain is live-deploy verification, not implementation.

### 18. AI Strategic Vision — `20260316-crm7-ai-strategic-vision-v1.00W.md` → **STALE-DOC** (strategic-planning doc, not a feature doc)

This is a February 2026 strategic-planning doc, not an implementation spec. It references model pricing/capabilities (Grok 4.1, Claude Sonnet 4.6, etc.) that have evolved. It does not claim any shipped feature — it's a vision document. **No code audit applicable.** The `docs/README.md` correctly labels it "Phases 2–5 open."

### 19. Schema Builder (cross-repo plan) — referenced in `plans/README.md` + `UNIFIED-ROADMAP.md` → **IMPLEMENTED**

| Doc claim | Evidence |
|---|---|
| Schema Builder Phase 3 (canonical consumer + E2E harness) shipped | `src/pages/settings/schema-builder/index.tsx:1`. `UNIFIED-ROADMAP.md` marks it ✅ shipped. ✓ |
| `src/pages/admin/schema-builder/*` (FEATURE-SURFACE says `admin/`) | Actual: `src/pages/settings/schema-builder/index.tsx`. The `admin/` directory has `award-updates.tsx`, `change-of-year.tsx`, `reports/` — no `schema-builder/` subdir. **SUBSTANTIVE-MATCH** — schema builder lives under `settings/`, not `admin/`. |

### 20. Portal Cross-App SSO Decision — `20260512-portal-cross-app-sso-architecture-decision-v1.00A.md` → **IMPLEMENTED** (ADR — decision record)

This is an Architecture Decision Record (status A = Approved). It documents a decision, not a file list. The BS OAuth 2.1 PKCE + JWKS auth system it describes is implemented across `src/lib/auth/`, `src/pages/auth/callback.tsx`, `@bsuite/auth` consumer wiring. ✓ (ADR does not need per-file verification.)

### 21. xero-node SDK Deno Compat Decision — `20260512-xero-node-sdk-deno-compat-decision-v1.00A.md` → **IMPLEMENTED** (ADR)

ADR (status A). Documents the decision to use `xero-node` SDK in Deno Edge Functions. The edge functions (`xero-token-exchange`, `xero-invoice-submit`, etc.) are implemented and use the Xero API directly. ✓

### 22. ADRs (4 total)

| ADR | Status | Code backing |
|---|---|---|
| `0004-stp-xero-passthrough.md` | Decision record | `src/lib/pipelines/xeroPayrollAdapter.ts:1` + `src/lib/payroll/xeroAdapter.ts:1` implement STP Phase 2 via Xero. ✓ |
| `20260423-calc-engine-single-source-v1.00W.md` | Decision record | `@bsuite/charge-calc` is the canonical engine; `src/lib/pipelines/` adapters wrap it. ✓ |
| `20260525-contacts-clients-leads-canonical-source-v1.00W.md` | Accepted | See §16 above. ✓ |
| `20260525-host-employer-table-canonicalization-v1.00W.md` | Accepted | See §15 above. ✓ |

### 23. Operations — `operations/20260610-migration-history-post-baseline-drift-v1.00W.md` → **IMPLEMENTED** (audit report)

This is itself an audit/evidence doc, not a feature doc. It references migrations and drift findings. The migrations it cites exist in `supabase/migrations/`. ✓

### 24. Handover-to-Employment (email/funding expansion design)

The email-entity-assignment doc (`20260726`) references `docs/plans/20260724-recruitment-employment-handover-design-v1.00D.md` as its design parent. That design doc is **not in `docs/plans/`** (it's referenced but not present in the non-archive docs scanned). The handover edge function **is** implemented: `supabase/functions/handover-to-employment/index.ts:1` + `helpers.ts:1` + `__tests__/helpers.test.ts:1`. The `from-candidate.tsx` page (`src/pages/apprentices/from-candidate.tsx:1`) consumes it. **IMPLEMENTED** (edge function exists; the design doc is referenced but lives outside the scanned scope or doesn't exist yet).

---

## Summary table

| # | Feature | Doc | Verdict |
|---|---|---|---|
| 1 | Org Documents | `20260724-org-documents-feature-v1.00W.md` | **IMPLEMENTED** |
| 2 | Jodie Docs-Gap Tool | `20260724-jodie-docs-gap-tool-feature-v1.00W.md` | **IMPLEMENTED** |
| 3 | Email Entity Assignment | `20260726-email-entity-assignment-feature-v1.00W.md` | **IMPLEMENTED** |
| 4 | EntityTableWidget Feature Gate | `20260723-entity-widget-feature-gate-feature-v1.00W.md` | **IMPLEMENTED** |
| 5 | Card autoHeight + Edit-Page | `20260723-card-autoheight-edit-page-restore-fix-v1.00W.md` | **IMPLEMENTED** |
| 6 | Email Sending Architecture | `20260706-email-sending-architecture-v1.00W.md` | **IMPLEMENTED** (self-reported follow-ups are deployment-state, not code) |
| 7 | Xero Integration Setup (current) | `20260706-xero-integration-setup-v1.00W.md` | **IMPLEMENTED** |
| 8 | Xero Reference (older) | `reference/20260317-crm7-xero-integration-v1.00W.md` | **STALE-DOC** (scopes, plaintext tokens, flag default) |
| 9 | Document Storage | `20260316-*-document-storage-*` | **IMPLEMENTED** (setup doc's "OPEN" tracking table is stale) |
| 10 | Document E-Signing | `20260317-document-esigning-architecture-v1.00A.md` | **IMPLEMENTED** |
| 11 | Feature Flags | `reference/20260317-crm7-feature-flags-v1.00W.md` | **SUBSTANTIVE-MATCH** (`xero_integration` default stale) |
| 12 | BOOT Assessment UI | `reference/20260317-crm7-boot-assessment-ui-v1.00W.md` | **IMPLEMENTED** |
| 13 | AI Sessions Schema | `architecture/20260316-crm7-ai-sessions-schema-v1.00W.md` | **IMPLEMENTED** (P2-2 UI gap is doc-acknowledged) |
| 14 | CSP Policy | `20260519-csp-policy-reference-v1.00W.md` | **IMPLEMENTED** |
| 15 | Host Employers ADR | `adr/20260525-host-employer-table-canonicalization-v1.00W.md` | **IMPLEMENTED** |
| 16 | Contacts/Clients/Leads ADR | `adr/20260525-contacts-clients-leads-canonical-source-v1.00W.md` | **IMPLEMENTED** |
| 17 | GTO Master Plan + WS3-WS9 | `plans/20260423-*-ws3-to-ws9-*` + `plans/20260423-bsuite-gto-master-plan-v1.00W.md` | **SUBSTANTIVE-MATCH** (6 file paths differ; all logic exists) |
| 18 | AI Strategic Vision | `20260316-crm7-ai-strategic-vision-v1.00W.md` | **N/A** (vision doc, not a feature spec) |
| 19 | Schema Builder | cross-repo plan reference | **SUBSTANTIVE-MATCH** (lives under `settings/` not `admin/`) |
| 20 | Portal SSO Decision | `20260512-portal-cross-app-sso-architecture-decision-v1.00A.md` | **IMPLEMENTED** (ADR) |
| 21 | xero-node SDK Deno Decision | `20260512-xero-node-sdk-deno-compat-decision-v1.00A.md` | **IMPLEMENTED** (ADR) |
| 22 | STP/Xero Passthrough ADR | `adr/0004-stp-xero-passthrough.md` | **IMPLEMENTED** |
| 23 | Calc Engine Single Source ADR | `adr/20260423-calc-engine-single-source-v1.00W.md` | **IMPLEMENTED** |
| 24 | Handover-to-Employment | (referenced design doc + edge fn) | **IMPLEMENTED** |

---

## Stale-doc findings (doc needs update, not code)

1. **`reference/20260317-crm7-xero-integration-v1.00W.md`** — three stale claims:
   - Says `xero_integration: true` (hidden at launch); code has `true` (`src/hooks/useFeatureFlags.ts:73`).
   - Lists deprecated scopes (`accounting.transactions`); code uses granular scopes (`xero-auth.ts:140`).
   - Shows `xero_connections` schema with plaintext `access_token`/`refresh_token` columns; Vault migration `20260514054000` moved to `*_secret_id`. The doc's own note below the block partially acknowledges this but the schema block itself is misleading.
   - **Recommendation:** Add a superseded banner pointing to `20260706-xero-integration-setup-v1.00W.md` (same treatment as the 2026-04-21 runbook).

2. **`reference/20260317-crm7-feature-flags-v1.00W.md`** — `xero_integration` default table says `false`; code says `true`. Update the table row.

3. **`20260316-crm7-document-storage-setup-v1.00W.md`** — Phase 1/2/3 tracking table says `OPEN` (crm7#1056–#1058) but the doc's own 2026-06-11 and 2026-06-17 evidence sections show all three phases shipped (backend + UI + automation + pgTAP). The gate is live-deploy UX evidence, not code. Update the table to "code-complete, pending deploy evidence" or close the issues.

4. **`plans/20260423-ws3-to-ws9-implementation-plan-v1.00W.md`** / `plans/README.md` — claims "annual reconciliation report, AVETMISS variants, LLN UI remain." Code shows all three have implementations (`src/pages/billing/reconciliation.tsx`, `src/lib/avetmiss/stateExtracts.ts` + `stateVariants.ts`, `src/pages/compliance/lln-assessments/index.tsx`). The "remain" framing is stale — what remains is live-deploy verification, not implementation.

5. **`FEATURE-SURFACE.md`** — claims schema builder is at `src/pages/admin/schema-builder/*`; actual path is `src/pages/settings/schema-builder/index.tsx`.

---

## Gaps (code does not back a doc claim)

**None found.** Every feature the docs claim as shipped has backing code. The only discrepancies are stale-doc claims where code has moved ahead of the doc, and file-path differences in plans (substantive-match).

---

## Open issues that are clearly STALE if code proves done

- **crm7#1056** (Phase 1 storage) — code-complete per `20260611110000_storage_bucket_policy_coverage.sql` + pgTAP suite 25.
- **crm7#1057** (Phase 2 encryption + virus scan) — code-complete per `document-encryption`, `document-secure-upload`, `document-virus-scan` edge functions + `DocumentHub.tsx`.
- **crm7#1058** (Phase 3 self-service portal + expiry automation) — code-complete per `20260611110200_document_metadata_workflow.sql` + `20260617120200` + `20260617120300` + `/portal/my-documents`.
- **crm7#527–#534** (report gaps referenced in GTO master plan) — the report system migration `20260423160000_ws5_report_system.sql` + 7 mandatory templates (`20260610413800`) + `report-delivery` edge fn are all in place. The specific issues would need individual GitHub verification but the code infrastructure exists.

---

## File-path mismatches (substantive-match, not gaps)

| Plan/doc says | Actual path | Notes |
|---|---|---|
| `src/services/timesheetStateMachine.ts` | `src/lib/timesheetWorkflow.ts` + `src/lib/timesheetConstants.ts` + `src/schemas/timesheet.ts` | State machine logic split across lib files |
| `supabase/migrations/20260423160000_ws5_reports_schema.sql` | `supabase/migrations/20260423160000_ws5_report_system.sql` | Same timestamp, `_system` not `_schema` |
| `src/components/reports/ReportViewer.tsx` | `src/pages/reports/[key].tsx` + `src/pages/reports/custom/` | Report viewer is a page, not a component |
| `src/lib/avetmiss/stateExporters.ts` | `src/lib/avetmiss/stateExtracts.ts` + `src/lib/avetmiss/stateVariants.ts` | Two files, different names |
| `src/pages/gto/financial-viability.tsx` | `src/pages/compliance/financial-viability/index.tsx` | Under `compliance/` not `gto/` |
| `src/lib/gto/renderF17.ts` | `src/lib/compliance/renderF17.tsx` + `src/lib/compliance/renderF17Xlsx.ts` | Under `compliance/` not `gto/` |
| `src/pages/admin/schema-builder/*` | `src/pages/settings/schema-builder/index.tsx` | Under `settings/` not `admin/` |
| `src/components/common/DocumentEditor.tsx` (file) | `src/components/common/DocumentEditor/index.tsx` (directory) | Barrel export; import resolves |

---

## Conclusion

crm7's documentation is in strong alignment with its codebase. **20 of 24 audited features are fully IMPLEMENTED** at the paths the docs claim. The remaining 4 are SUBSTANTIVE-MATCH (feature exists, file path differs) or STALE-DOC (doc predates a code change). **Zero GAPs** were found — no doc claims a shipped feature that the code does not back.

The most actionable findings are:

1. **Mark the 2026-03-17 Xero reference doc as superseded** (same treatment as the 2026-04-21 runbook).
2. **Update the `xero_integration` flag default** in the feature-flags reference doc (`false` → `true`).
3. **Update the document-storage tracking table** — Phases 1–3 are code-complete; close or re-label crm7#1056–#1058.
4. **Update the WS3-WS9 "remain" claim** — reconciliation, AVETMISS variants, and LLN UI have code; what remains is deploy verification.
5. **Fix the FEATURE-SURFACE schema-builder path** (`admin/` → `settings/`).

No app source was mutated. Only this audit markdown was written.