# Jodie Parity Matrix — v1.00W

> **Status:** Frozen (F) — READ-ONLY audit. No code modified.
> **Date:** 2026-07-25
> **Scope:** STRICTLY BSuite. Enumerates every Jodie tool factory in `crm7/src/lib/ai/tools/index.ts` (the `createToolRegistry` aggregator) and the R80.3 funding tool factory (`R80.3/src/lib/ai/fundingOffsetTool.ts` → `createFundingTools`), then maps each user-visible "Ask Jodie" UI action — as authored in the role manuals under `business-suite-unified/src/lib/manuals/` — to the tool that implements it.
> **Method:** Every `askJodie:` string in the manuals is treated as one user-visible UI action. Each is mapped to the closest named Jodie tool. Status is `FULL` (a tool directly performs the action end-to-end), `PARTIAL` (a tool overlaps but does not cover the whole action, or only an adjacent step exists), or `MISSING` (no Jodie tool covers the action at all).

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Tool factory enumeration

### 1.1 crm7 `createToolRegistry` — `crm7/src/lib/ai/tools/index.ts`

The registry composes 14 factories. The static tool-name list (`getAllToolNames`) and the factory source files give the authoritative enumeration below.

| # | Factory (`create*Tools`) | Source file | Tools exported |
|---|---|---|---|
| 1 | `createCrudTools` | `crud-tools.ts` | `create_apprentice`, `update_apprentice`, `delete_apprentice`, `search_apprentices`, `create_employer`, `update_employer`, `search_employers`, `create_contact`, `update_contact`, `create_training_record`, `update_training_progress`, `create_compliance_record`, `update_compliance_status` |
| 2 | `createReportTools` | `report-tools.ts` | `generate_compliance_summary`, `generate_expiry_report`, `generate_training_progress_report`, `generate_completion_stats`, `generate_revenue_report`, `generate_incident_report`, `generate_safety_compliance_report` |
| 3 | `createTimesheetTools` | `timesheet-tools.ts` | `approve_timesheet`, `reject_timesheet`, `bulk_approve_timesheets`, `get_pending_timesheets`, `get_timesheet_summary`, `get_charge_rates`, `update_charge_rate`, `calculate_timesheet_billing` |
| 4 | `createSearchTools` | `search-tools.ts` | `search_entities`, `advanced_filter`, `aggregate_metrics`, `trend_analysis`, `bulk_data_export` |
| 5 | `createVacancyTools` | `vacancy-tools.ts` | `create_vacancy`, `publish_vacancy`, `close_vacancy`, `list_vacancies` |
| 6 | `createScreeningTools` | `screening-tools.ts` | `screen_candidates`, `score_candidate`, `shortlist_candidates`, `get_candidate_profile` |
| 7 | `createSchedulingTools` | `scheduling-tools.ts` | `schedule_interview`, `check_availability`, `set_reminder`, `cancel_interview` |
| 8 | `createEmailTools` | `email-tools.ts` | `send_email`, `triage_inbox`, `draft_reply`, `create_email_follow_up` |
| 9 | `createEmailLinkTools` | `email-link-tools.ts` | `link_email` |
| 10 | `createUIBuilderTools` | `ui-builder-tools.ts` | `list_picklists`, `create_picklist_option`, `list_form_layouts`, `add_layout_section`, `add_layout_field`, `list_custom_pages`, `deploy_config`, `authoring_list_catalog`, `authoring_find_or_create_entity`, `authoring_bind_entity`, `authoring_add_page_widget` |
| 11 | `createDocsTools` | `docs-tools.ts` | `docs_flag_gap` |
| 12 | `createLeaveTools` | `leave-tools.ts` | `submit_leave_request`, `list_pending_leave_requests` |
| 13 | `createFieldOfficerTools` | `field-officer-tools.ts` | `create_case_note`, `check_host_capacity` |
| 14 | `createEnterpriseAdminTools` | `enterprise-admin-tools.ts` | `list_enterprise_sub_orgs`, `create_enterprise_sub_org`, `set_tenant_feature_flag` |

**crm7 total:** 14 factories (leave/FO/enterprise added 2026-07-25), 57+ named tools.

### 1.2 R80.3 funding tools — `R80.3/src/lib/ai/fundingOffsetTool.ts`

| # | Factory | Source file | Tools exported |
|---|---|---|---|
| 12 | `createFundingTools` | `fundingOffsetTool.ts` | `apply_funding_offset` |

R80.3 exposes a single Jodie tool. It mirrors the crm7 tool pattern (zod `inputSchema` + async `execute`) but is framework-agnostic (no `ai` SDK dependency). It enforces an in-tool AI-licence gate (`context.aiLicensed`) because R80.3 has no upstream chat-endpoint licence gate, unlike crm7.

**R80.3 total:** 1 factory, 1 tool.
**Suite total:** 15 factories, 58 named tools.

---

## 2. Parity matrix — UI action → Jodie tool

Columns: **UI action** (the user-visible workflow, phrased as the manual's "Ask Jodie" line) · **Jodie tool** (the named tool that implements it, or the closest partial) · **status** (`FULL` / `PARTIAL` / `MISSING`) · **persona** (role manual the action is authored against).

### Host / Client manual

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| Approve this week's timesheets for my apprentices | `approve_timesheet`, `bulk_approve_timesheets` | FULL | host-client |
| File this email on Sam Lee's record | `link_email` | FULL | host-client |

### Enterprise Admin manual

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| Show me every sub-org in this enterprise | `list_enterprise_sub_orgs` | FULL | enterprise-admin |
| Create a sub-organisation for the Pilbara region | `create_enterprise_sub_org` | FULL | enterprise-admin |
| Provision a new tenant under the Pilbara sub-org | — (nested provisioning not a capability; Jodie create is under current enterprise tenant only) | MISSING | enterprise-admin |
| Give every tenant in this enterprise the placements feature | — (deferred — `set_tenant_feature_flag` NOT_IMPLEMENTED by design; feature-assignment via chat not wired; use BSU feature UI) | MISSING | enterprise-admin |
| Roll up this quarter's placements across all sub-orgs | `aggregate_metrics`, `trend_analysis` | PARTIAL | enterprise-admin |

### Employee manual

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| Enter my hours for this week and submit them | — (no timesheet entry/submission tool; tools are approve/reject/pending/summary) | MISSING | employee |
| Apply for annual leave next Friday | `submit_leave_request` | FULL | employee |
| Show me my most recent payslip | — (no payslip tool) | MISSING | employee |
| File this email on Sam Lee's record | `link_email` | FULL | employee |
| Put the timesheet card at the top of this page | `add_layout_field`, `authoring_add_page_widget` | PARTIAL | employee |

### Developer manual

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| Who has developer access on this platform? | `search_entities` | PARTIAL | developer |
| Create a feature for tracking site inductions | — (`authoring_find_or_create_entity` is for data entities, not feature/surface registry) | MISSING | developer |
| Build a page that shows the inductions list and entry form | `list_custom_pages`, `authoring_add_page_widget` | PARTIAL | developer |
| Add the inductions page to the tenant navigation | — (no nav-config tool) | MISSING | developer |
| Assign the inductions feature to the WA Group tenant | `deploy_config` (mode=`tenant`) | PARTIAL | developer |
| Publish the inductions surface to its assigned tenants | `deploy_config` | PARTIAL | developer |
| Put the timesheet card at the top of this page | `add_layout_field`, `authoring_add_page_widget` | PARTIAL | developer |

### Payroll / Finance manual

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| Apply WA GWS to this placement and re-quote | `apply_funding_offset` (R80.3) + `calculate_timesheet_billing` | PARTIAL | payroll-finance |
| Show me training contracts waiting on a DTWD approval | — (STA/training-contract status is a conduit email-link flow, not a Jodie tool) | MISSING | payroll-finance |
| Has everything moved across for the new starter? | — (handover runs in `handover-to-employment` edge function, not exposed as a Jodie tool) | MISSING | payroll-finance |
| Start the pay run for this pay period | — (no pay-run tool) | MISSING | payroll-finance |
| BOOT-test this custom rate against the award | — (BOOT engine in `@bsuite/charge-calc`, not exposed as a Jodie tool) | MISSING | payroll-finance |

### Field Officer manual

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| Log today's site visit to Acme Builders | `create_case_note` | FULL | field-officer |
| Add a case note for Sam Lee about their induction | `create_case_note` | FULL | field-officer |
| Raise a safety incident for the Acme site | `generate_incident_report` (generates a report, does not raise/record an incident) | PARTIAL | field-officer |

### Org Admin manual

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| Approve all outstanding timesheets for this pay period | `bulk_approve_timesheets` | FULL | org-admin |
| Place apprentice Sam Lee with Acme Builders | `update_apprentice`, `create_training_record` | PARTIAL | org-admin |
| Show me training contracts waiting on a DTWD approval | — (same as payroll-finance) | MISSING | org-admin |
| Has everything moved across for the new starter? | — (same as payroll-finance) | MISSING | org-admin |
| Apply WA GWS to this placement and re-quote | `apply_funding_offset` (R80.3) | PARTIAL | org-admin |
| Send the updated site-safety policy to every field officer and tell me who hasn't acknowledged it | `send_email` (send half covered; acknowledgement-tracking half not) | PARTIAL | org-admin |
| File this email on Sam Lee's record | `link_email` | FULL | org-admin |
| Set our organisation's primary colour to navy | — (no brand / theme tool) | MISSING | org-admin |
| Grant field officers permission to create charge rates | — (no role / permission assignment tool) | MISSING | org-admin |
| Put the timesheet card at the top of this page | `add_layout_field`, `authoring_add_page_widget` | PARTIAL | org-admin |

### Cross-cutting (shared block)

| UI action | Jodie tool | Status | Persona |
|---|---|---|---|
| This page doesn't explain how to do X — flag it for the docs team | `docs_flag_gap` | FULL | all (shared `jodieDoItForYou` block) |

---

## 3. Summary counts

| Status | Count | Share |
|---|---|---|
| FULL | 10 | 27% |
| PARTIAL | 13 | 35% |
| MISSING | 14 | 38% |
| **Total UI actions audited** | **37** | 100% |

### By persona

| Persona | FULL | PARTIAL | MISSING | Total |
|---|---|---|---|---|
| host-client | 2 | 0 | 0 | 2 |
| enterprise-admin | 2 | 1 | 2 | 5 |
| employee | 2 | 1 | 2 | 5 |
| developer | 0 | 5 | 2 | 7 |
| payroll-finance | 0 | 1 | 4 | 5 |
| field-officer | 2 | 1 | 0 | 3 |
| org-admin | 2 | 4 | 4 | 10 |

---

## 4. Notable gaps (candidates for follow-up)

These MISSING actions have no Jodie tool at all, yet the manuals promise a natural-language equivalent — the widest parity gaps:

1. **Employee self-service remaining** (employee): timesheet entry/submission + payslip view still MISSING; **annual leave now FULL** via `submit_leave_request` (2026-07-25).
2. **Payroll run & BOOT** (payroll-finance): "start the pay run" and "BOOT-test this custom rate" — both backed by real engines (`@bsuite/charge-calc`, pay-run service) but neither is exposed as a Jodie tool.
3. **STA training-contract status** (payroll-finance, org-admin): the conduit `sta-email-watch` / `handover-to-employment` edge functions automate this, but no Jodie tool surfaces the pending matches the manuals describe.
4. **Enterprise / tenant administration** (enterprise-admin): `list_enterprise_sub_orgs` and `create_enterprise_sub_org` are **FULL** (crm7#1211/#1212); `set_tenant_feature_flag` deferred (`NOT_IMPLEMENTED` by design — feature migration via chat banned; BSU feature UI is the path); nested tenant provisioning still MISSING (not a product capability — Jodie create is under current enterprise tenant only).
5. **Roles & permissions assignment** (org-admin, referenced by shared `rolesPermissionsAssignment` block): no role/permission tool exists, despite the manual's worked example ("let field officers create charge rates").
6. **Branding / theme** (org-admin): no theme tool, despite the manual's "set our primary colour to navy" example.
7. **Field-officer case notes & site visits** (field-officer): no case-note or site-visit tool — the field-officer lane is entirely unbacked by Jodie tools.
8. **Developer feature/page authoring** (developer): no feature-registry or nav-config tool; `authoring_*` covers data-entity binding and widget-add only.

### PARTIAL patterns worth flagging

- **Card rearrange → `add_layout_field` / `authoring_add_page_widget`**: the manuals say "put the timesheet card at the top of this page", which is a card reorder. The UI-builder tools add fields/widgets, not reorder cards — the closest fit, not a true match.
- **"Apply WA GWS and re-quote"**: the R80.3 `apply_funding_offset` covers the funding-offset half; no crm7 tool composes the re-quote step in the same action, so it stays PARTIAL pending a cross-app composition.

---

## 5. Sources read (READ-ONLY)

- `bsuite/crm7/src/lib/ai/tools/index.ts` — `createToolRegistry`, `getAllToolNames`
- `bsuite/crm7/src/lib/ai/tools/{crud,report,timesheet,search,vacancy,screening,scheduling,email,email-link,ui-builder,docs}-tools.ts` — tool names per factory
- `bsuite/R80.3/src/lib/ai/fundingOffsetTool.ts` — `createFundingTools` → `apply_funding_offset`
- `bsuite/R80.3/src/lib/ai/index.ts` — R80.3 ai barrel (confirms single factory)
- `bsuite/business-suite-unified/src/lib/manuals/manuals/{host-client,enterprise-admin,employee,developer,payroll-finance,field-officer,org-admin}.ts` — per-persona `askJodie:` lines
- `bsuite/business-suite-unified/src/lib/manuals/blocks/shared.ts` — shared `jodieParity` / `jodieDoItForYou` / `fundingOffsetsChargeRates` / `pageEditingCards` blocks
- `bsuite/crm7/src/lib/ai/jodie-persona.ts`, `jodie-skills.ts` — persona/skill registry (context only)

No files were modified. This audit is strictly read-only.