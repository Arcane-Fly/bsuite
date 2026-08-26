# R8-as-Rates-Engine: Target Architecture (R80.3 ↔ RatesCalc ↔ crm7)

**Status:** D (Draft) — target-architecture spec, not yet red-teamed or converted to issues
**Applies to:** R80.3, crm7 (consumer), business-suite-unified (reporting reader)
**Author context:** Synthesis of existing material per operator directive. No new architecture invented — this document extracts, cross-references, and fills gaps in what has already been decided or built.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: N/A at spec level — this document is read-only synthesis, no code changed. Each derived issue in §5 carries its own validation-loop line.
- **Equivalence target**: N/A (spec)
- **Cross red-team**: required before this draft is promoted to Approved — recommend `multi-agent-red-team-planning` skill, one pass, before any issue in §5 is filed against the tracker.
- **Skills to load** (for implementers of any §5 item): `dry-one-shot-audit`, `award-interpretation-boot`, `supabase-postgres-best-practices`, `api-design-validation`, `bsuite-reliability-red-team`.
- **Self-report on divergence**: yes — see the numbered OPEN QUESTIONS at the end.

---

## Changelog

- 2026-07-28 (v1.00D): Initial draft. Synthesizes RatesCalc's captured API surface (`.superpowers/sdd/20260728-gap-remediation-plan-v1.00F/rc_api_data.json`), four WorkforceOne analysis documents, an archived RatesCalc-style calculator (`crm7r/lib/services/rates-calc.ts`), the operator's preferred UI reference (`charge-calculator-mapd.jsx`), and a fresh capability audit of R80.3 `development` + crm7 `development`.

---

## 0. Ownership anchor (do not re-litigate)

Per `docs/20260227-dry-one-shot-architecture-v1.04A.md` §1 (the authoritative on-disk version — see **discrepancy note** below), the following is already settled and this document builds strictly on top of it, never against it:

| Entity | Owner | Read by | Table |
|---|---|---|---|
| Award Rates | **R8** | CRM7 (payroll ref) | `award_rates` |
| Charge Calculations | **R8** | CRM7 (invoicing) | `charge_calculations` |
| Funding Offsets | **R8** | CRM7 (placement ref), BSU (reporting) | `funding_offsets` |
| Placements | CRM7 | R8 (context) | `placements` |
| Apprentices | CRM7 | R8 (rates) | `apprentices` |
| Host Employers | CRM7 | R8 (charge-to) | `employers` |

**Document discrepancy — flagged, not resolved by this spec:** the file on disk is named and self-identifies in its final-reconciliation section (§11) as `v1.02A`, but its own changelog header (line 5) reads "Last updated: 2026-07-24 (**v1.04A** — Leads/Funding Offsets/Org Documents added to §1...)". No `v1.03A` or `v1.04A` file exists anywhere in `docs/`. Content-wise, the `v1.02A` file on disk already contains the Funding Offsets row and the Phase-11 lifecycle-handover exception that the changelog line describes as "v1.04A" work — i.e., the *content* is current, only the *filename/version-stamp* is stale by two point-releases. This spec treats the on-disk `v1.02A` content as authoritative (it is self-consistent and dated 2026-07-24) and flags the filename rename (`v1.02A` → `v1.04A`) as a one-line housekeeping fix for whoever next touches that document — not a blocker for this spec.

**Direction restated (operator, verbatim intent, not reinterpreted):**
- RatesCalc = the industry rate-calculation product BSuite targets for parity/exceedance.
- R8 should work **like RatesCalc** — i.e., R8 is BSuite's rates-engine-of-record, structurally and functionally analogous to what RatesCalc is to its own ecosystem.
- crm7 should act **like an integration would** for RatesCalc — i.e., crm7's relationship to R8 should mirror how a RatesCalc integration partner (a CRM/ATS/payroll system) consumes RatesCalc: read computed rates/documents, never recompute or duplicate the calculation.
- RatesCalc integrates with WorkforceOne — already analysed; treated in this spec as background evidence, with an honesty note on how much that analysis actually substantiates (§3.1).

This section is the fixed floor for everything below. Nothing in §§1–7 proposes new ownership — every gap identified is a gap in R8/crm7 *implementation* against the ownership map that is already law.

---

## 1. Capability map — RatesCalc endpoint → R8 equivalent → status today

Source: `rc_api_data.json` (53 doc entries / 23 unique endpoints, apiDoc capture of `api.ratescalc.com`). Full endpoint-by-endpoint detail is in the extraction; this table is the operator-facing summary with exact status classification and evidence.

### 1.1 Authorization (OAuth2 — vendor-partner model)

| RatesCalc endpoint | Purpose | R8 equivalent | Status |
|---|---|---|---|
| `GET /oauth/authorize` | Browser redirect, vendor→user consent | BS OAuth 2.1 PKCE `/oauth/authorize` (BSU is the OAuth server; R8 is a *client*, not a server) | **Inverted, not absent** — R8 has no analog because R8 has never needed to be an OAuth *server* for a third party. If R8 is to expose rates to an external "integration partner" the way RatesCalc does, R8 (or BSU on R8's behalf) would need to become an OAuth server for that specific grant — this is new surface, not a gap-fill. |
| `POST /oauth/token` | Code→token exchange, vendor Basic auth | N/A (client-only today) | **ABSENT** — no R8/BSuite equivalent of "external vendor obtains a bearer token scoped to one connected account." |
| `POST /oauth/resource` | Fetch authenticated account/company identity | N/A | **ABSENT** |

**Verdict:** This whole group only matters if R8 needs to serve *external, non-BSuite* consumers (a true "RatesCalc for other GTOs" business model). For the crm7-as-integration-consumer relationship described in the operator's direction, this group is **not the model to copy** — crm7 is not an external vendor; it is a first-party sibling app with direct Supabase access. It becomes relevant only if BSuite ever sells R8 as a standalone API product to non-BSuite CRMs (see Open Question 3).

### 1.2 Company / Companies (RatesCalc's client-org model)

| RatesCalc endpoint | Purpose | R8/BSuite equivalent | Status |
|---|---|---|---|
| `GET /listCompanies`, `POST /findCompany` | Search/list charge-to companies | crm7-owned `employers` table (host employer), read by R8 for charge-to context | **EXISTS** — but via direct Supabase read (`AwardRateSelector.tsx`), not an API call, which is architecturally *correct* per the ownership map (CRM7 owns Host Employers; R8 reads the table directly — no API indirection needed for a first-party sibling). |
| `GET /getCompany/:id`, `GET /getDivision/:id` | Fetch one company/division | Same — `employers` (+ any site/division sub-structure) | **EXISTS** (as a table read) |
| `GET /listContacts/:type/:id`, `GET /listDivisions/:type/:id` | List sub-resources of a company | crm7-owned `client_contacts` / employer site structure | **EXISTS** (as a table read) |
| `POST /setCompany`, `POST /setContact` | Create/update a company/contact | crm7's own Employer/Contact create forms | **EXISTS** — correctly owned by crm7, not R8, matching the ownership map |
| `GET /listRates/:id` | List a company's rate schedules (**undocumented response — RatesCalc's own biggest doc gap**, per the extraction) | No R8 equivalent surface: R8 has no "list all charge calculations for this host employer" view/query surfaced anywhere in the UI | **ABSENT** — closest DB analog is `charge_calculations` filtered by employer, but there is no service/UI that lists it (see §2, `charge_rate_schedules`/`host_charge_rates` orphaned-schema finding) |

### 1.3 Rates group — the core calculation + document surface

| RatesCalc endpoint | Purpose | R8 equivalent | Status | Evidence |
|---|---|---|---|---|
| `GET /getRate/:id` | Fetch one rate schedule: line-items (pay rate → charge rate per pay-code, award linkage, on-cost rates baked in) | `calcBridge.ts` → shared `@bsuite/charge-calc` engine (`calculateChargeRate`, `resolveAndCalculate`) | **EXISTS, functionally equal or richer** — R8's `resolveAndCalculate()` (`R80.3/src/utils/calcBridge.ts:484-520`) resolves award package → applies IR overrides → runs the shared engine, which is a superset of RatesCalc's flat on-cost model (RatesCalc: wic/payroll-tax/super/financing/admin/other flat rates; R8: same categories plus funding-offset reconciliation, labour-hire/casual/SBAT branching, tenant/host overrides). RatesCalc's `pay_super: YES/NO` per-line-item flag has no explicit per-allowance-line equivalent surfaced in R8's UI today — worth a small parity check, not a rebuild. |
| `GET /getPDF/:id` | Legacy single-PDF-per-rate fetch | `pdfExportService.ts` (jsPDF, client-side) | **PARTIAL** — R8 can export a PDF from a *locally-saved calculation* (Zustand store), but there is no server-generated, retrievable-by-ID PDF the way `getPDF` implies. Client-only export is strictly weaker than RatesCalc's own *legacy* mechanism, let alone its current one. |
| `GET /listDocuments/:id` | List documents for a company, filtered by status/type/charge_id, paginated | **No R8 equivalent at all** | **ABSENT** — see §2 for the full gap analysis; the closest schema (`charge_rate_schedules`, `host_charge_rates`) exists in R80.3's own migrations but has zero UI/service wiring (confirmed: `chargeRateScheduleService.ts` has no importers anywhere in `src/`). |
| `GET /getDocument/:id` (JSON+base64 PDF) | Fetch one document's metadata + base64 PDF | **No R8 equivalent** | **ABSENT** |
| `GET /downloadDocument/:id` (raw PDF stream) | Fetch one document as raw bytes | **No R8 equivalent from R8.** The closest thing in all of BSuite is crm7's `charge-rate-quote-dispatch` edge function + `charge_rate_quotes`/`signature_requests` tables — but that is a **crm7-owned quote/e-sign feature**, not an R8 document API. | **ABSENT in R8; PARTIAL equivalent exists, but in the wrong app relative to the RatesCalc model** (see §2). |

### 1.4 Widget group — embeddable rate-creation

| RatesCalc endpoint | Purpose | R8 equivalent | Status |
|---|---|---|---|
| `GET /widgetInlineRates` | Mint a single-use widget URL for one external job/quote, to embed in a host page | None | **ABSENT** |
| `GET /widgetListRates/:id` | Widget-context company rate list | None | **ABSENT** |
| `POST /widgetFindRates` | Widget-context rate lookup by company/division/job (internal or external ID) | None | **ABSENT** |
| `POST /widgetSetCompany`, `POST /widgetSetDivision` | Widget-context create company/division | None (crm7 owns company/division creation directly, correctly, per ownership map) | **N/A by design** — crm7 already owns this; R8 should never gain a parallel "create company" surface even in widget form. |

### 1.5 Account

| RatesCalc endpoint | Purpose | R8/BSuite equivalent | Status |
|---|---|---|---|
| `GET /getSubscription` | Seat/license count for the connected account | BSU's own subscription-tier system (`user_tenants`, feature gates) | **EXISTS, different shape** — BSuite's subscription model is tenant-tier-based (Basic/Professional/Enterprise), not seat-count-based like RatesCalc's `licenses.total/available`. Not a gap; a deliberate different (and arguably better-fitted) model for BSuite's per-tenant-not-per-seat billing. No action needed. |

### 1.6 Summary count

| Classification | Count | Endpoints |
|---|---|---|
| **EXISTS** (equal or richer) | 8 | listCompanies, findCompany, getCompany, getDivision, listContacts, listDivisions, setCompany, setContact, getRate, getSubscription (10, all via table-read or superset calc engine — see note below) |
| **PARTIAL** | 2 | getPDF (client-only, no server document), listRates (data exists, no listing UI/service) |
| **ABSENT** | 11 | oauth/authorize, oauth/token, oauth/resource, listDocuments, getDocument, downloadDocument, widgetInlineRates, widgetListRates, widgetFindRates (widgetSetCompany/widgetSetDivision are N/A-by-design, not counted as gaps) |

Net: of RatesCalc's 23 unique endpoints, roughly **10 have a working BSuite equivalent** (mostly because CRM7 already owns the underlying entities and R8 already reads them — the correct architecture, just not API-shaped), **2 are partially built**, **9 are genuine absences** (the OAuth-as-server group + the document trio + the widget trio), and **2 are intentionally not-applicable** because crm7, not R8, correctly owns company/division creation under the DRY map.

**The single biggest architectural gap:** R8 has a strong, compliance-careful *calculation engine* (rate resolution, charge calc, funding offsets are all real, live-data-driven, never fabricate a rate) but **zero document/artifact lifecycle of its own** and **zero external consumption surface**. Every RatesCalc capability that involves "a rate becomes a retrievable, versioned, shareable artifact" is either absent from R8 or has drifted into crm7 as a *quote*, which is a different (though related) concept — see §2.

---

## 2. The document/artifact model

### 2.1 What RatesCalc actually does (grounded in the extraction, not invented)

RatesCalc's own intended reading order (`rc_api_project.json` order array: `getRate → listDocuments → getDocument → downloadDocument → getPDF`) tells its own story: **`getRate` is the structured calculation; the document trio is the newer, better-specified artifact layer; `getPDF` is explicitly the legacy, single-PDF-per-rate mechanism the trio supersedes.**

Confirmed model:
- A **rate schedule** (`getRate`, keyed by `rates_id`) is line-item calculation data: per pay-code `pay_rate` → `charge_rate`, with on-cost rates (WIC/payroll tax/super/financing/admin/other) baked in per line, linked to exactly one `client` (company + division).
- A **document** (`documents.document_id`, discovered via `listDocuments?charge_id=...`) is a generated PDF artifact — `type: "Quote"|"Contract"`, `status: "Approved"|"Signed"` — tied back to a rate/charge via `charge_id`. Multiple documents can share one `charge_id` (draft Quote → signed Contract), but **there is no explicit version/revision field** — ordering is inferred from `status` + `created_date`, not a first-class version number.
- **No effective-dating (validity date ranges) is documented anywhere in RatesCalc's own API.** The only dates are workflow-state dates (`date_submitted`, `date_accepted` on the rate; `created_date` on documents). If BSuite wants true effective-dated rate versioning, that is **not something to port from RatesCalc** — it would be a genuinely new (and arguably superior) BSuite capability, not parity work.

### 2.2 What BSuite has today — split across two apps, and that split is *architecturally correct* but *incompletely executed*

Per the R80.3 capability audit:

- **R8 owns two real migrated tables that model exactly RatesCalc's document concept** — `charge_rate_schedules` (`R80.3/supabase/migrations/20260320100003_charge_rate_schedules.sql`, status enum `draft/quoted/accepted/superseded`) and `host_charge_rates` (`.../20260320100004_host_charge_rates.sql`, status `current/superseded/archived`, `effective_from`/`effective_to` dates, full IR-resolution audit JSONB). **This is a better-specified model than RatesCalc's own** (explicit effective-dating, explicit superseding status, structured audit trail) — but `chargeRateScheduleService.ts` has **zero importers anywhere in `src/`**. The schema is real; the feature built on it does not exist. This is not a gap to build from scratch — it is dead code to *wire up*.
- **crm7 owns the actual live quote/document/e-sign pipeline** — `charge_rate_quotes` table, `charge-rate-quote-dispatch` edge function (writes `signature_requests`, issues signing tokens, logs to `communications`), the public `/quotes/sign/[token]` landing page. This is a real, live, working document lifecycle — closely matching RatesCalc's `type: "Quote"` → `"Contract"`/`Signed` progression. **It works.** It is simply owned by crm7, not R8.
- **crm7 also owns `ChargeRateSnapshot`** (`crm7/src/types/entities.ts:1358-1396`, migration `20260704130000_charge_rate_snapshots_and_propagation.sql`) — an immutable-by-convention audit record capturing full calc-input + computed output per quote/requote, with `previous_snapshot_id` chaining and `effective_from` — i.e. crm7 has **already built** a genuine append-only versioned-snapshot model for charge rates, independently of R8's orphaned `charge_rate_schedules`/`host_charge_rates` tables. **Two versioning schemas for the same concept exist in two different apps, and neither app is aware the other has one.**

### 2.3 Assessment against the ownership map

The ownership map says R8 owns Charge Calculations; crm7 owns Invoices/Financial and (by extension) the quote-to-signature workflow that leads to an invoice. Read strictly, **the current split is not a violation** — R8 computes, crm7 documents/sends/signs, matching "R8 = calc engine, crm7 = quote/document owner" the R80.3 auditor agent explicitly concluded. But two things are broken in the execution, independent of who "should" own what:

1. **R8's own document-model schema (`charge_rate_schedules`/`host_charge_rates`) is unused and duplicates what crm7's `ChargeRateSnapshot` already does live.** Either (a) deprecate R8's orphaned tables formally (drop or leave as historical/never-launched) and let crm7's `ChargeRateSnapshot` be the one canonical versioned-artifact model, reading its `calc_inputs`/`calc_result` straight from R8's engine output — or (b) decide R8 really should own the versioned-document record (closer to the RatesCalc model, where the rate-owning system also owns the document) and migrate `ChargeRateSnapshot`'s responsibility into R8, with crm7 reading it. **This spec does not resolve which** — it is Open Question 1, because reversing either app's already-shipped, live feature is a real migration with real cost, not a free architectural choice.
2. **Neither schema has a server-retrievable PDF.** R8's PDF export is client-only (jsPDF, no persisted document). crm7's quote-dispatch flow generates a signing token and communications record but — per the audit — the actual PDF artifact generation/storage step was not confirmed as wired to a retrievable-by-ID document object the way RatesCalc's `getDocument`/`downloadDocument` model requires. This is a genuine build gap regardless of which app should own it.

### 2.4 Target shape (recommendation, not yet decided — see Open Question 1)

Whichever app is chosen as document-owner, the artifact model should mirror RatesCalc's better-specified successor pattern, not its legacy `getPDF`:
- A **calculation** (R8-owned, live) produces a `calc_result`.
- A **document** (owner TBD) is a named, statused (`draft/quoted/accepted/superseded` — R8's existing enum is good), retrievable-by-ID artifact referencing the calculation that produced it, with `effective_from`/`effective_to` (R8's `host_charge_rates` already has this — better than RatesCalc).
- **List + get + download** endpoints (RPC or edge-function, not raw SQL from the frontend) mirroring `listDocuments`/`getDocument`/`downloadDocument`'s pagination/filter/error-shape discipline (RatesCalc's v1.3 error contract — distinguishing `403` forbidden from `404` file-missing-from-storage — is worth copying verbatim; it is better than RatesCalc's own legacy generic-404 shape).

---

## 3. The embeddable-widget model

### 3.1 Honesty check on the WorkforceOne research first

The four WorkforceOne documents mined for this spec do **not** actually substantiate "WorkforceOne consumes RatesCalc via widgets" as a verified architecture:
- File 1 (`20260306-workforce-one-parity-analysis`) treats WorkforceOne as the *whole competitor product* (HR+timesheet+payroll+ATS), and mentions RatesCalc exactly once, as a one-line entry in WF1's own integration-partner checklist (line 131) — zero technical detail.
- File 2 (`crm7r/docs/workforce-one.md`) never mentions RatesCalc at all.
- File 3 (`workforce-hub/.../workforceOne.ts`) is the only file describing an actual external-API consumption pattern (REST + OAuth2 client_credentials + webhook/poll sync) — but it is **WorkforceHub** (a third product) consuming **"Workforce One"/AnyTime**'s generic payroll/timesheet/award API, not RatesCalc, and reads as a generic scaffolded template (placeholder credentials, no BSuite references) rather than verified fact.
- File 4 is CRM7's own internal OTS/RCTI build plan — no external RatesCalc/WorkforceOne consumption content at all, though its "One-Shot Data Entry" ownership doctrine (lines 11-15) is a directly reusable pattern-shape (already reflected in §0 of this spec).

**Conclusion: there is no widget-embedding precedent to cite from the WorkforceOne material.** Where any integration pattern is documented at all (File 3), it is **data-API consumption, never UI-widget embedding.** This spec's assessment of the widget model rests entirely on RatesCalc's own API capture (§1.4), not on any verified WorkforceOne precedent — flagged here so this is not silently presented as more settled than it is.

### 3.2 Should R8 expose the same widget model?

**Recommendation: not in the near term, and only conditionally beyond that.**

RatesCalc's widget group exists because RatesCalc is sold as a **standalone third-party product** that many *different, unrelated* CRMs/ATSs integrate with — the widget lets an external host page embed rate-creation without the host system needing its own OAuth-server relationship or full API client. BSuite does not have this problem today: crm7 and R8 are first-party siblings on the same Supabase backend, in the same tenant, behind the same auth session. Building an OAuth-server + widget-URL-minting layer to let crm7 "embed" R8's rate creation would be solving a problem BSuite doesn't have — the two apps can already share tenant-scoped Supabase reads/writes directly, which is a strictly *better* integration than an iframe widget for a first-party sibling.

**The widget model becomes relevant only if/when BSuite decides to sell R8 (or a "RatesCalc equivalent") as a standalone product to non-BSuite CRMs** — i.e., the same trigger condition as §1.1's OAuth-as-server gap. If that business decision is made, the widget model (mint URL → host iframes it → widget calls back to set company/division/find rates) is a reasonable pattern to adopt, and RatesCalc's own documented gaps (undocumented response schemas on `widgetListRates`/`widgetFindRates`, a `widget` param typed `Number` when it's clearly a string identifier, the missing `NT` state in `widgetSetCompany`'s enum) should be treated as known defects to avoid replicating, not modeled faithfully.

**What this implies for crm7 today:** crm7 should NOT be built as if it were embedding an R8 widget. It should be built as a genuine first-party consumer reading R8-owned tables/RPCs directly (§4) — which is a *stronger* integration than RatesCalc's own widget partners get, and is already the architecturally correct target per the DRY ownership map. The "widget" framing from the operator's brief is best read as "crm7 should behave the way a well-built RatesCalc *integration* behaves" (i.e., consume computed values, never recompute), not "crm7 should literally iframe R8."

---

## 4. The integration contract crm7 must implement

### 4.1 The rule, restated precisely

Per §0: R8 owns Award Rates, Charge Calculations, Funding Offsets. crm7 reads them. **crm7 must never independently compute a charge rate using its own copy of the calculation engine seeded with its own defaults** — it must read R8's already-computed, already-persisted values (or, for genuine live "what-if" pre-save UX, call through to the shared engine with **real per-tenant/per-award inputs**, not npm-package defaults).

### 4.2 Confirmed violation #1 — `AdvancedConfigSection.tsx` renders static package defaults as if they were the linked apprentice's real values

File: `crm7/src/pages/charge-rates/create/AdvancedConfigSection.tsx`. The component takes **zero props** (`export function AdvancedConfigSection()`, line 23) and renders every value from `DEFAULT_COST_CONFIG`/`DEFAULT_WORK_CONFIG`/`DEFAULT_BILLABLE_OPTIONS` (`./types.ts`), which are themselves the `@bsuite/charge-calc@0.5.1` package's shipped constants (`superRate: 0.12`, `wcRate: 0.047`, `payrollTaxRate: 0.0485`, etc.) — **the same numbers for every apprentice, in every state, regardless of their real award or negotiated arrangement.** `types.ts` itself admits this at lines 16-17: `// TODO: Load super/WC/payroll-tax from org's tenant_settings once per-org config lands.`

Confirmed wrong specifically: `payrollTaxRate: 0.0485` is displayed for every apprentice, but the `@bsuite/charge-calc` package's own `PAYROLL_TAX_RATES` constant varies by state (WA is 5.5%, not 4.85%) — the component is displaying the *wrong number for WA apprentices specifically*, which given the operator's primary-state-WA context is a live, user-visible defect, not a theoretical one. Every `Include Annual Leave/Public Holidays/Sick Leave/Training/Adverse Weather` billable-option checkbox is hard-coded `false` regardless of what was actually selected at quote time.

**Fix direction:** the component must take a `placementId` or `chargeRateQuoteId` prop, read the linked `charge_rate_snapshots` row (columns already exist: `super_rate`, `workers_comp_rate`, `payroll_tax_rate`, `leave_loading_percent`, `overhead_value`, `billing_model` — `crm7/src/types/entities.ts:1358-1396`), and render those persisted values — never the package defaults, except as the pre-fill for a genuinely new/unsaved quote.

### 4.3 Confirmed violation #2 — the placement "hourly rate" field is semantically ambiguous, and a related unit bug was found alongside it

`crm7/src/types/entities.ts` (`Placement` interface, lines 370-372): `hourly_rate`, `charge_rate`, `margin_rate` — three fields, no comments distinguishing pay-vs-charge on any of them (contrast with the rest of the interface, which is otherwise heavily commented). The UI (`crm7/src/pages/placements/[id].tsx:380-391`) prints them stacked as bare labels `"Hourly:" / "Charge:" / "Margin:"` with no qualifier — a staff member has no textual cue that "Hourly" means *what the apprentice is paid* as distinct from "Charge" (*what the host is billed*).

**Worse, confirmed second instance:** `UnifiedPerson` (`entities.ts`, starts line 1162) carries **two different field names for the same underlying concept depending on employment type** — `pay_rate` (apprentice/trainee, line 1213) vs `hourly_rate` (labour-hire, line 1231) — on one shared interface, with no discriminated-union enforcement. Any code that generically iterates `UnifiedPerson[]` (exports, dashboards, cross-employment-type reports) reading `person.hourly_rate` silently gets `undefined` for every apprentice, and vice versa for labour-hire workers reading `pay_rate`. A **third** naming convention exists for the same concept in `AwardClassificationItem.pay_rates[].hourly_rate` (line 586).

**Adjacent bug found in the same investigation (flagging since it is real and compliance-adjacent, not because it was explicitly asked for):** `Placement.margin_rate` and `ChargeRateSnapshot.margin_rate` persist a bare number with no accompanying `margin_type` on `Placement` (only `ChargeRateSnapshot` carries `margin_type: 'flat'|'percent'`). `chargeRateStore.ts:195` writes `marginRate: calcConfig.marginValue` with no unit tag. If a quote's margin was ever computed as a *percent* (e.g. `15` = 15%), `[id].tsx:390`'s `formatCurrency(placement.margin_rate)` renders it as `"$15.00"` — a wrong-money display bug caused by the same root cause (fields losing semantic/unit metadata once they cross the calc-engine boundary onto `Placement`).

**Fix direction:** rename or explicitly qualify every rate field with `pay_` vs `charge_` prefixes across `Placement` and `UnifiedPerson`, add a `margin_type` column to `Placement` (or stop persisting `margin_rate` on `Placement` at all and read it live from the linked `ChargeRateSnapshot`, which already carries the type), and update every label in `[id].tsx`/`create.tsx` to say "Pay Rate (hourly)" / "Charge Rate (hourly, billed to host)" explicitly.

### 4.4 Confirmed violation #3 — crm7 re-runs the shared calc engine locally instead of reading R8's computed output

`crm7/src/hooks/usePlacementChargeCalc.ts` and `crm7/src/utils/crmCalcBridge.ts` both import `calculate`/`DEFAULT_CONFIG` from `@bsuite/charge-calc` directly and spread `...DEFAULT_CONFIG` into the `CalcConfig` object, overriding only `wage`, `billableWeeks`, `apprenticeshipYears`, `overheadValue`, `marginValue`, `allowances`, `funding` from real data — **every other field (superRate, wcRate, payrollTaxRate, leaveLoadingPercent, hoursPerWeek, annualLeaveDays, etc.) is silently left at the npm package default, for every placement, regardless of tenant/state/award.** This is the same class of bug as §4.2, but in the *live quote-creation flow*, not just a static informational display.

The `@bsuite/charge-calc` package's own docstring (`dist/awards/registry.d.ts`) explicitly states: *"Calling code (R80.3, CRM7, edge functions) is responsible for fetching and caching"* — i.e. the package is deliberately designed to let **both** apps independently run the engine. That is a defensible design for the shared *library* (both apps may legitimately need a live "what-if" calculator), but it does not license crm7 to treat its own locally-run, default-seeded calculation as the canonical, persisted, later-displayed number. The bug is not "crm7 uses the shared engine" — it's "crm7 uses the shared engine with placeholder inputs and then persists/displays the result as if it were real."

**Fix direction:** crm7 may keep a local "what-if" calculator for pre-save exploratory UX, clearly labeled as provisional — but the canonical, persisted, later-displayed values a user reads back on `[id].tsx`, in reports, or in the `AdvancedConfigSection` accordion must always be R8's stored computation (via `charge_rate_snapshots`/`charge_calculations`), never a silent local re-run with default inputs.

### 4.5 The correct integration contract (target state)

1. crm7 reads `award_rates`, `charge_calculations`, `funding_offsets` (R8-owned tables) directly via Supabase — this is already correct where it happens (e.g. crm7's own `AwardRateSelector.tsx` queries `award_rates`/`award_classifications` directly).
2. crm7 never seeds a `CalcConfig` with `...DEFAULT_CONFIG` for anything that has a real, resolvable, tenant/award/state-specific value. Every on-cost rate must come from the resolved award package or tenant config, exactly as R8's own `calcBridge.ts` already does (`resolveAndCalculate()` is the pattern to copy, not `DEFAULT_CONFIG`).
3. Any UI surface that displays "this apprentice's cost configuration" (like `AdvancedConfigSection`) must be parameterized by the specific placement/quote and read the persisted snapshot, never a static informational list.
4. Rate-field naming must be unambiguous (`pay_rate_hourly` vs `charge_rate_hourly`) everywhere a rate crosses an app boundary or renders in UI.
5. If/when R8 gains a server-side document/quote RPC or edge function (§2.4), crm7's quote-creation flow should call *that*, rather than (as now) independently reimplementing quote generation on top of a locally re-run calc.

---

## 5. What R8 must gain to reach parity — prioritised, issue-sized

Each item below is written to be filed as a standalone GitHub issue. Scale honesty: items 1–4 are a few days each; items 5–7 are 1–3 weeks each; full parity (all 7 plus the crm7-side fixes in §4) is realistically a **1–2 quarter program**, not a sprint — treat this as a phased roadmap, not a backlog to clear in one session.

### Phase A — Wire up what already exists (cheapest, highest ROI)

**A1. Wire `chargeRateScheduleService.ts` into an actual UI surface.** The `charge_rate_schedules`/`host_charge_rates` schema (draft/quoted/accepted/superseded, effective-dated) already exists and is *better* than RatesCalc's own model — it has zero consumers. Either build the minimal "view/list rate schedules for this placement" screen, or formally deprecate the tables (drop or archive) if crm7's `ChargeRateSnapshot` is decided (Open Question 1) to be the canonical model instead. Do not leave it in limbo.
- Acceptance criteria: a reachable UI route lists `charge_rate_schedules` rows for a given placement with correct status badges; OR a migration formally deprecates the tables with a comment explaining why.
- Validation loop: §9.1 output-equivalence (query the table, confirm UI renders exactly what's in the row).
- Cross red-team: crm7-lead or bsuite-lead peer.
- Skills to load: `supabase-postgres-best-practices`, `dry-one-shot-audit`.

**A2. Fix the `award_rates`/`charge_calculations` schema drift.** The R80.3 audit found `src/types/database.ts` and `src/services/awardRatesService.ts`/`chargeCalculationsService.ts` reference columns (`code`, `penalty_rates`, `effective_from`, `hours_worked`, `on_costs`, `calculated_rate`) that **do not exist on the live tables** (live schema has `classification`/`base_rate`/`calendar_year` for `award_rates`; `super_amount`/`workers_comp`/`total_cost`/`charge_rate` for `charge_calculations`). These services have zero UI importers today — dead code — but they will 400 the moment anyone wires them up, silently reintroducing the exact bug class this spec is trying to close.
- Acceptance criteria: either the TS types are corrected to match the live schema, or the dead services are deleted outright (preferred if genuinely unused, per the anti-dead-code rule).
- Validation loop: §9.1 — insert via the corrected service against a real Supabase branch, confirm no column-not-found error.
- Cross red-team: bsuite-platform.
- Skills to load: `supabase-postgres-best-practices`.

**A3. Resolve the `award_rate_cache` upsert `tenant_id` mismatch.** `calcBridge.ts:692-702` upserts a `tenant_id` column into `award_rate_cache`, but the live migration (`20260301_award_rate_cache.sql`) has no such column — a fire-and-forget write that would 400 the moment it's actually exercised past the cache-hit path.
- Acceptance criteria: migration adds `tenant_id` (or the upsert is corrected to the actual unique key `(award_code, year)`), verified against live catalog per §12.1 gate.
- Validation loop: §9.1.
- Cross red-team: bsuite-lead.
- Skills to load: `supabase-postgres-best-practices`, `supabase`.

### Phase B — Genuine new capability (document/versioning parity)

**B1. Decide and implement the canonical document/version owner** (resolves Open Question 1). Either wire R8's `charge_rate_schedules`/`host_charge_rates` as the source of truth with crm7 reading it, or formally hand that responsibility to crm7's `ChargeRateSnapshot` and retire R8's parallel schema. Two versioning models for one concept, invisible to each other, is the state to end.
- Acceptance criteria: one documented owner; the other app's schema is either a thin read-through or is removed.
- Validation loop: §9.1 (compare pre/post: same placement, same computed values, single source).
- Cross red-team: fable-tier plan review (architectural, cross-app) per Gate C.
- Skills to load: `dry-one-shot-audit`, `api-design-validation`.

**B2. Server-generated, retrievable-by-ID PDF document.** Neither app has RatesCalc's `getDocument`/`downloadDocument` equivalent — R8's PDF export is client-only/non-persisted; crm7's quote-dispatch flow was not confirmed to produce a retrievable document object. Build a real `documents` table (or extend whichever schema B1 selects) with `list`/`get`(JSON+base64)/`download`(raw stream) RPC or edge-function endpoints, adopting RatesCalc's v1.3 error-shape discipline (distinguish 403-forbidden from 404-file-missing-from-storage) rather than its legacy generic-404.
- Acceptance criteria: a placement's accepted quote produces a stored PDF retrievable by ID with correct status/type filtering, matching the `listDocuments` filter/pagination shape (status, type, charge_id, limit/offset).
- Validation loop: §9.2 (visual — the retrieved PDF renders correctly) + §9.1 (metadata round-trips).
- Cross red-team: crm7-lead (this spans both apps per B1's decision).
- Skills to load: `api-design-validation`, `supabase`.

### Phase C — Only if the business model changes

**C1. External OAuth-server + widget layer** — only if BSuite decides to sell R8 as a standalone product to non-BSuite CRMs (§1.1, §3.2). Do not build speculatively.
- Acceptance criteria: N/A until the business decision is made — track as a parked item, not a current backlog entry.

**C2. Rate-field naming unification across `Placement`/`UnifiedPerson`** (crm7-side, but blocks any future R8 API from having a clean contract to expose). See §4.3.
- Acceptance criteria: `pay_rate_hourly`/`charge_rate_hourly` naming applied consistently; `margin_type` persisted alongside `margin_rate` on `Placement`.
- Validation loop: §9.1 — grep for old field names across crm7 confirms zero stragglers; existing placements' displayed values are unchanged (rename, not recompute).
- Cross red-team: crm7-lead.
- Skills to load: `dry-one-shot-audit`.

---

## 6. UI/IA lessons from `charge-calculator-mapd.jsx`

Concrete, structural — not aesthetic praise. Source: full read of the 1527-line file.

### 6.1 The core layout idea worth copying

Two-column grid: **left = all config inputs (single scrollable accordion stack), right = a persistently-visible hero result + tabbed detail views.** This is a materially better information architecture than R8's current wizard-step model (`R8Calculator.tsx`'s Pay Rate → Cost Settings → Work Setup → Billable Options linear steps) because the user never loses sight of the answer while adjusting inputs — every input change re-renders the hero figure live (`useMemo` over the full config, no submit button).

### 6.2 The specific accordion grouping and default-open state (copy this exactly)

| Panel | Default state | Why |
|---|---|---|
| Award Data, Apprentice Wage, Hours & Duration, Billing Model | always expanded | the four things every calculation needs before it means anything |
| Allowances, Oncosts & Margin, Funding/Incentives | collapsible, **open by default** | commonly relevant, but not always touched |
| **Leave Entitlements** | collapsible, **closed by default** | standard NES defaults rarely need adjustment |
| **Penalty/OT Rates** | collapsible, **closed by default** | advanced/edge-case territory |

Three distinct disclosure techniques are used deliberately, not interchangeably: (a) accordion collapse for "less commonly touched" sections, (b) mutually-exclusive segmented-button reveal for the wage-resolution *mode* (Award Rate / % of Reference / Custom — R8's `SourcePicker` `allowedSources` concept is a near-exact analog already, worth aligning the visual treatment to this segmented-button pattern rather than a dropdown), (c) tabs for the *results* area (Charge Rates / Cost Breakdown / Oncost Detail) so only one detailed view is mounted at a time while the hero card stays fixed above the tabs.

### 6.3 The provenance-tagging convention — adopt this directly, values aside

The file tags every field's source inline (`[API]`/`[USER]`/`[CONFIG]`/`[CALC]`/`[API→CALC]`) and surfaces it in the UI via `SourceBadge` components next to resolved values (e.g. the wage readout shows both the number and where it came from). This is structurally identical to R8's own `ValueSource`/`SourcePicker` concept (`allowedSources: ['manual','live-api','tenant-preference','host-agreed']`) — R8 already has the right *data model* for this; the MAPD file demonstrates a good *visual* convention (a small colored badge next to every resolved number) that R8's UI does not currently apply as consistently. Worth copying the visual pattern onto R8's existing resolver architecture.

### 6.4 Result display — three techniques, use all three

- **Hero card** — single biggest number, always visible, with a strikethrough pre-funding price when funding applies. R8/crm7 today bury the final charge rate inside a form field; a dedicated glowing hero card is a real UX upgrade.
- **Rate Summary Table** — a literal table (rate type / multiplier / category / charge / after-funding) for the "give me every line item" view.
- **Cost Breakdown / Oncost Detail via `CostRow` components** — a vertical build-up list with an inline proportional mini-bar per row (Worked Pay → Training Pay → Leave → Super → WC → Overheads → Total), which doubles as an implicit visualization without needing a full chart library.

### 6.5 Hard-coded values — explicitly must NOT be copied

The file's own comments flag several as placeholders needing real sourcing: `JUNIOR_APPRENTICE_PERCENT_DEFAULTS` (line 96-101, explicitly commented "PLACEHOLDER — must verify against the specific award clause"), `DEFAULT_PENALTIES` multipliers (lines 131-138, explicitly commented "replace via Load Penalties from Award"), and two genuinely unexplained magic constants with **no sourcing comment at all**: `otOncFactor = 0.12` (line 418) and `+ 0.15` inside the penalty-oncost formula (line 424) — these two are worse than the labeled placeholders because there is no clause/source citation anywhere to verify them against. Milestone/incentive dollar amounts (`$3500`/`$3000`/`$3500`) are stale demo figures, not the real 2026 legislated incentive amounts already on file in BSuite's own memory (Priority Hiring $2.5k, Key Apprenticeship $5k, DAAWS $216.07/wk). None of these literals should land in R8 — only the panel arrangement, disclosure defaults, provenance-tagging convention, and result-display techniques should be salvaged.

### 6.6 Bulk creation — confirmed absent, and the concrete gap to close

The file operates on exactly one apprentice per render — every piece of state is scalar (`manualWage`, `apprenticeYear`, `selectedClassificationId`), `calculate(cfg)` takes one flat config and returns one flat result, and there is no roster/multi-select/batch-apply concept anywhere in 1527 lines. Since `calculate()` is already a pure function of one config object, the calculation core needs **zero changes** for bulk support — the gap is entirely in (1) state shape (a shared org-level config plus an array of per-apprentice overrides, replacing one flat config), (2) a roster panel + multi-apply UI, (3) a batched `apprentices.map(a => calculate({...shared, ...a}))` call site, (4) a results view that scales to N rows (the file's existing "Compare Models" side-by-side table is a good template to fork for "compare N apprentices" instead of "compare N billing models" — the underlying `cmpModels` table-rendering code is already most of the way there), and (5) an actual persistence/submission action, since the reference file is a pure client-side calculator with no save/create action at all. R8 already has `calculateAllApprentices()` in `calcBridge.ts:583-607` threading per-apprentice funding-offset input — this is the correct backend primitive to build the bulk UI on top of; it should not be rebuilt.

---

## Open Questions

Numbered per the constraint that this spec does not ask the operator anything mid-document — these are the only genuinely undetermined points, each with a recommended default and its evidence.

**1. Who owns the versioned rate/quote document going forward — R8's `charge_rate_schedules`/`host_charge_rates`, or crm7's `ChargeRateSnapshot`?**
Both exist, live, unaware of each other. R8's schema is architecturally closer to the DRY ownership map (R8 owns Charge Calculations) and has better fields (explicit effective-dating, explicit `superseded` status) — but it is completely unwired (zero UI/service consumers). crm7's `ChargeRateSnapshot` is live, wired, and already accumulates a real history per placement, but places document-versioning responsibility inside the app that's supposed to be a *reader* of R8's charge calculations, not their versioning authority.
**Recommended default:** treat crm7's `ChargeRateSnapshot` as the interim canonical record (it's live and correct-enough), but have it store its `calc_result` sourced from an R8-exposed function/RPC rather than crm7's own locally-reseeded `calculate()` call (closing §4.4's violation), and formally deprecate (not silently abandon) R8's `charge_rate_schedules`/`host_charge_rates` tables with a migration comment explaining the supersession — unless a fable-tier architectural review (Phase B1) decides the reverse is worth the migration cost.

**2. Does R8's `AwardRateSelector`'s per-line `pay_super: YES/NO` parity (RatesCalc models this per pay-code item) matter enough to build now?**
RatesCalc's `getRate` response shows `pay_super` toggled per individual pay-code line (e.g. overtime often doesn't attract super). R8's engine has an "Include Super on Overtime" toggle (per the MAPD reference and R8's own oncost config) but it was not confirmed during this audit whether it is applied per-allowance-line with the same granularity RatesCalc demonstrates, or as a single global flag.
**Recommended default:** file as a small Phase-A-adjacent parity-check issue (audit R8's actual per-line super-applicability logic against Fair Work's real rules on which allowances attract super) rather than assume it's broken — this needs a quick code-read, not a redesign, and shouldn't block the Phase A/B work above.

**3. Should BSuite ever expose R8 as a standalone rates-API product to non-BSuite CRMs (which would make §1.1's OAuth-as-server gap and §3's widget gap real work items)?**
No evidence in any source material that this is a current business goal — RatesCalc's competitive position (industry leader BSuite aims to beat) is being targeted on *capability*, not necessarily on *becoming a sold API product to third parties*.
**Recommended default:** do not build Phase C speculatively. Revisit only if a concrete external-integration business case emerges (analogous to how WorkforceOne apparently integrates with RatesCalc as a paying third party today).
