# Competitor Parity Matrix — R80.3/CRM7/Timesheets/conduit vs RatesCalc/Code House/Humanforce/LiveHire

> **Naming:** `20260730-competitor-parity-matrix-v1.00W.md` · Status **W** (Working) · Workstream E.
> **Scope:** Evidence-linked capability comparison for four BSuite↔competitor pairs, commissioned to give the operator (a WA lawyer with GTO/BOOT/award domain expertise) a factual, source-cited view of where BSuite is ahead or behind. Every capability cell carries a source URL or an explicit "no public source found." No claim is drawn from training-data recall of a vendor's product.
> **Relationship to prior work:** This document is net-new for **RatesCalc**, **Humanforce**, and **LiveHire**. For **Code House Workforce One (WfO) + AnyTime**, it reuses and re-verifies the primary-source evidence already captured in `docs/20260723-bsuite-capability-matrix-v1.00W.md`, `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` (the AnyTime Administrator's Guide PDF, sourced from Code House's own S3-hosted manuals — see §1.2), and `docs/references/codehouse-knowledgebase-crawl.md`. Where this doc repeats a Code House claim, the source is that local evidence file, not a fresh fetch.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Scope + method

### 1.1 Comparison pairs (as commissioned)

| BSuite product | Purpose | Compared against |
|---|---|---|
| **R80.3** | Charge-rate / wage calculator | **RatesCalc** — `https://api-demo.ratescalc.com/docs` |
| **CRM7** | GTO CRM / apprentice management | **Code House Workforce One** |
| Payroll/timesheet portal (crm7) | Timesheets, approvals | **Code House AnyTime Timesheets** |
| **conduit** | Recruitment ATS | **Humanforce** (Talent module), **LiveHire** |

### 1.2 Sources and what rendered

| Source | Method | Result |
|---|---|---|
| `https://api-demo.ratescalc.com/docs/index.html` | Direct WebFetch | **Failed** (403 / JS shell) |
| `https://api-demo.ratescalc.com/docs/index.html` | via `r.jina.ai` proxy | **Rendered** — single-page API reference, no further sub-pages discovered |
| `https://www.ratescalc.com/`, `/features` | Direct WebFetch | Rendered (marketing copy only — lower-confidence source, flagged per-cell) |
| Code House AnyTime Administrator's Guide | Local file, originally sourced from `https://workforceonemanuals.s3.ap-southeast-2.amazonaws.com/AnyTime%20Administrators%20Guide%20_WF1_Pay_027.pdf` (captured 2026-07-23; see `docs/references/codehouse-knowledgebase-crawl.md` row 23) | Full 2,390-line manual available locally |
| Code House knowledgebase (205 articles, S3-hosted PDFs) | Prior crawl, `docs/references/codehouse-knowledgebase-crawl.md` | 25 of 205 articles catalogued with direct PDF URLs |
| `https://www.humanforce.com/product/talent`, `/product/workforce-management`, `/product/hr`, `/product/payroll`, `/humanforce-connect`, `/resources/compare` | Direct WebFetch | Rendered |
| `https://www.humanforce.com/integrations` | Direct WebFetch | **404 — does not exist** |
| `https://www.livehire.com/*` | Direct WebFetch | **302-redirects** to `humanforce.com/livehire/…` — see finding L0 below |
| `https://www.humanforce.com/livehire/`, `/products/talent/{recruitment-crm,applicant-tracking,talent-analytics,talent-attraction}`, `/products/workforce/onboarding` | Direct WebFetch | Rendered |
| `https://www.humanforce.com/livehire/platform`, `/platform/integrations`, `/livehire/us/integrations-marketplace/*` | Direct WebFetch | **404** |
| `research.com/software/reviews/livehire`, `app.getamsverified.com` (comparison page) | WebSearch snippet, not full page fetch | Secondary source — flagged lower confidence |

**Finding L0 (structural, not a capability gap):** LiveHire has been acquired and absorbed into Humanforce's product suite. `livehire.com` no longer resolves as an independent product; every URL redirects into `humanforce.com/livehire/…`, which serves the same "Talent" module pages as the native Humanforce product. **There is no longer an independent LiveHire to compare against separately from Humanforce.** This section therefore treats "Humanforce/LiveHire" as one evidence base (§4), noting where a claim traces to legacy LiveHire branding (`/livehire/` URL paths) versus native Humanforce pages.

### 1.3 BSuite-side method

Every BSuite capability claim below was verified by reading the actual source in this working tree, not by consulting docs or memory (which drift). Anchor files read:

- `packages/charge-calc/src/{types.ts,boot/types.ts,boot/compare.ts,boot/failure-detector.ts,boot/recommender.ts,awards/schema.ts,awards/mapd-types.ts}` and `README.md`
- `R80.3/src/services/awardRulesEngine.ts` (1,042 lines) — payroll-tax exemption table, WIC rates
- `crm7/src/lib/awards/{penaltyCalculator.ts,allowanceCalculator.ts,awardInterpreter.ts,progressionTracker.ts,index.ts}`
- `crm7/src/lib/timesheetWorkflow.ts`, `crm7/src/components/timesheets/TimesheetEntryGrid.tsx`, `crm7/src/lib/timesheetValidation.ts`
- `crm7/src/types/entities.ts` (qualification/ANZSCO/apprenticeship-title identity model, migration `20260729140600_occupation_qualification_identity_model.sql`)
- `crm7/src/config/navigation.ts`, `conduit/src/app/**` route tree

---

## 2. R80.3 vs RatesCalc

| Capability | BSuite (R80.3 / `@bsuite/charge-calc`) | RatesCalc | Source | Verdict |
|---|---|---|---|---|
| Award/classification as structured data | **Full.** `AwardScheduleZ`, `EAClassificationZ`, `AwardRegistry`, `fetchAward` — award code, classification, clause refs, operative date ranges (`packages/charge-calc/src/boot/types.ts:119-129`, `README.md`) | **Yes.** Rate-schedule `award` object (`id`,`name`,`code`,`url`) + `award_data`/`job_data` nested objects with `ma_level` | `https://api-demo.ratescalc.com/docs/index.html` (via r.jina.ai) | Parity |
| Apprentice/trainee as distinct rate type, with apprenticeship year | **Full.** `EmployeeRateTypeCode` enum (AP/AA/TN/etc.), `DEFAULT_APPRENTICE_PERCENTAGES`/`DEFAULT_ADULT_APPRENTICE_PERCENTAGES` by year 1-4 (`crm7/src/lib/awards/awardInterpreter.ts:24-40`) | **Partial.** Single `calculation_type: "normal"\|"Apprentice"` toggle — no apprenticeship-year or adult-apprentice sub-field found | `https://api-demo.ratescalc.com/docs/index.html` | **BSuite ahead** |
| **Payroll tax, state-dependent, apprentice-exemption granularity** (the scored dimension per domain brief) | **Full.** `PAYROLL_TAX_EXEMPT_STATES` table: WA/VIC/NSW exempt AP+AA+TN; QLD/SA/TAS/ACT/NT exempt AP+AA only (`R80.3/src/services/awardRulesEngine.ts:400-417`), wired into `resolvePayrollTaxRate()` and covered by dedicated tests (`R80.3/src/tests/awardRulesEngine.test.ts:914`) | **No.** `payroll_tax_state` drives a rate lookup and there is a company-level `payroll_tax_exempt: "NO"\|"YES"` flag, but no state×rate-type matrix was found — the exemption is a binary toggle, not a per-category rule | `https://api-demo.ratescalc.com/docs/index.html` | **BSuite ahead — materially** |
| Three distinct identifiers: qualification code / STA apprenticeship title / ANZSCO occupation | **Full, and modeled as separate catalog entities.** `anzsco_code`/`anzsco_title` vs `apprenticeship_title_id` vs `qualification_id`/`qualification_code` are explicitly separate fields with a catalog-level default-mapping table and a documented independence rule ("A qualification's catalog-level DEFAULT title/occupation… assigned to a specific apprentice… is expected, not a bug" — `crm7/src/types/entities.ts:353-408`; migration `20260729140600_occupation_qualification_identity_model.sql`) | **No — collapsed.** Only `job_title`, `position_name`, `reference`, and the award's own `ma_level`/`level` were found; no TGA code, STA-title, or ANZSCO field anywhere in the schema | `https://api-demo.ratescalc.com/docs/index.html` | **BSuite ahead — materially** |
| BOOT / EBA / custom-rate comparison | **Full and is the core differentiator.** `compareBOOT`, `compareGTOBOOT`, `BOOTVerdictZ` (pass/fail/marginal/indeterminate), `detectFailurePatterns`, `generateRecommendations`, `generateF17Data`, `GTOPlacementScheduleZ` (`packages/charge-calc/src/boot/*`, `README.md:16`) | **No evidence found.** No BOOT/EBA/custom-rate-comparison endpoint or field in the rendered API docs or the marketing feature page | `https://api-demo.ratescalc.com/docs/index.html`, `https://www.ratescalc.com/features` | **BSuite ahead — materially** |
| On-cost model (super, workers' comp, admin, financing, margin) | **Full.** `calculateChargeRate`/`calculateBilling`/`calculateRecovery` with itemised breakdown: super, workers' comp (WIC-code-keyed rates in `R80.3/src/services/awardRulesEngine.ts:425-439`), casual loading, margin | **Yes, comparable breadth.** `super_rate`, `wic_rate_used` (keyed off `wic_code`), `payroll_tax_rate_used`, `administration_cost_rate`, `other_cost_rate`, `financing_cost_rate`; `pay_rate` vs `charge_rate` pair per pay item | `https://api-demo.ratescalc.com/docs/index.html` | Parity |
| API surface (auth, versioning, rate limits, SDKs) | R80.3 is a calculator, not itself exposed as a third-party API product — not directly comparable | OAuth2 (`vendor_id`/`vendor_secret`, auth-code + password grants, Bearer). **No versioning scheme, no documented rate limits, no SDKs found** | `https://api-demo.ratescalc.com/docs/index.html` | N/A (different product shape) |

**Read on RatesCalc overall:** it is a real, working charge-rate API with genuine award/classification/on-cost modelling — not a toy. But on every dimension that matters specifically to a **GTO** (state-by-state apprentice payroll-tax exemption, the three-identifier qualification/STA-title/ANZSCO model, and BOOT/EBA testing), the public API surface shows either a flattened single-toggle model or no feature at all. This reads as a **general labour-hire/staffing rate engine**, not a GTO-specific one — R80.3 + charge-calc's GTO-specific depth is a genuine, verifiable structural advantage, not a marketing claim.

---

## 3. CRM7 vs Code House Workforce One (WfO)

Reusing verified evidence from `docs/20260723-bsuite-capability-matrix-v1.00W.md` §2 (GTO / apprentice management, Platform / modern surface) plus a fresh code-level re-verification of the CRM7 side.

| Capability | CRM7 | Code House WfO | Source | Verdict |
|---|---|---|---|---|
| Purpose-built GTO platform (recruitment→placement→compliance in one system) | **Yes.** 16-section nav spans Contacts/Clients, People (placements, compliance, training, timesheets, recruitment, onboarding), Sales Pipeline, Analytics, Financial (`crm7/src/config/navigation.ts:58-156`) | **Partial.** WfO is recruitment/payroll/debtor-first (consultant CRM, client pipeline, timesheets, RCTI/STP) — general labour-hire, not GTO-specific concepts (no apprentice-year, no training-contract, no STA field found in the knowledgebase corpus) | `docs/references/codehouse-knowledgebase-crawl.md` (25/205 articles) | **BSuite ahead on domain fit** |
| Host employer management, placements | Yes — `crm7` hosts/placements pages | Yes — "Workforce One Hirings" (placements), Client Pipeline, Summary Client hierarchy | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` §PLACEMENTS; `codehouse-knowledgebase-crawl.md` rows 20-21 | Parity |
| STP Phase 2 / Payday Super integrations (OZEDI, QuickSuper) | **Unverified this pass** — not re-checked in this session; flagged open in the 2026-07-23 matrix as an integration-surface gap | **Yes**, explicit dedicated manuals: "Payroll - OZEDI Payday Super Integration", "Payroll - QuickSuper Payday Super Integration", "Payroll - Payday Super User Guide" | `codehouse-knowledgebase-crawl.md` rows 1-4 | **Code House ahead (unless closed since 2026-07-23 — verify)** |
| RCTI (recipient-created tax invoice) | **Unverified this pass** | **Yes** — dedicated manual "Debtors - Recipient Created Tax Invoice (RCTI)" | `codehouse-knowledgebase-crawl.md` row 7 | **Code House ahead (unless closed since 2026-07-23 — verify)** |
| Microsoft SSO | Yes — BS OAuth 2.1 PKCE + Azure AD via Supabase GoTrue | Yes — "Sign in with Microsoft" | `codehouse-knowledgebase-crawl.md` row 11 | Parity |
| No-code page/feature builder, AI assistant, realtime collaboration | **Yes** — Feature Builder, Jodie (AI, all apps), RealtimeCursors | **No evidence found** across the 25-article sample or the AnyTime manual | `docs/20260723-bsuite-capability-matrix-v1.00W.md` §2 "Platform/modern surface" | **BSuite ahead — materially** |
| Open API surface for the product itself | Supabase + edge functions, documented client apps | **No** — knowledgebase explicitly frames Workforce One→AnyTime as a "Synchronisation" (batch sync script) plus "Manual Export of Timesheets", not a live API | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` table of contents ("IMPORT DATA — Sychronisation Workforce One to AnyTime"; "EXPORT DATA — Manual Export") | **BSuite ahead** |

---

## 4. Payroll/timesheet portal (crm7) vs Code House AnyTime Timesheets

This is the pair with the most important finding of the whole document, because it required reading the actual timesheet code, not just comparing feature lists.

| Capability | crm7 timesheet portal | Code House AnyTime | Source | Verdict |
|---|---|---|---|---|
| Two/three-tier approval workflow | **Yes — 7-state machine**: draft → pending_host_approval → pending_gto_review → approved → exported → archived, with audit events + notifications on every transition (`crm7/src/lib/timesheetWorkflow.ts:14-52`) | Yes — Administrator approval, "Approving Multiple Timesheets", reject/unsubmit | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` §TIMESHEETS | Parity (CRM7's is arguably deeper — an explicit host-then-GTO two-party review, not just admin-vs-employee) |
| Bulk approve / bulk ready-to-upload | Not re-verified this pass (flagged unverified in prior matrix) | Yes — "Approving Multiple Timesheets", "Mark Timesheets as Ready to Upload" | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` §TIMESHEETS | Unverified on BSuite side |
| Missing-timesheet list + notify | **Yes** — crm7 payroll/missing-timesheets page exists (`crm7/src/pages/payroll/missing-timesheets`) | Yes — "Missing Timesheets", "Email and/or SMS Employees with Missing Timesheets" | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` §ANYTIME ACCESS | Parity, email/SMS notification depth unverified on BSuite side |
| Shift-level time capture (start/end/break, not just a daily hours total) | **Yes.** `TimesheetEntryGrid.tsx` renders a 7-day grid with `start_time`, `end_time`, `break_minutes` per day and auto-computes worked hours (`crm7/src/components/timesheets/TimesheetEntryGrid.tsx:1-136`) | Yes — timesheet entry captures shift data | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` §TIMESHEETS | Parity on data capture |
| **Per-shift interpretation engine: auto-deriving penalties/overtime/allowances from start/end time + day-of-week, rather than the user manually flagging the bucket** (the specifically flagged test in this brief) | **NO — confirmed absent from the live flow, but the primitives exist unwired.** `TimesheetEntryGrid.tsx` requires the user to manually pick a `work_type` dropdown (`ordinary`/`overtime_1_5`/`overtime_2_0`) per day; the grid does not call any award-rules function to derive that classification from the captured start/end time and day-of-week. Separately, `crm7/src/lib/awards/penaltyCalculator.ts` **does contain** a genuine shift-pattern interpreter — `ShiftPattern` (`startTime`, `day: DayOfWeek`, hours), `calculatePenalties()`, and `filterPenaltiesByShiftPatterns()` with explicit Saturday/Sunday and night-shift (after 18:00 / before 06:00) matching logic (`penaltyCalculator.ts:25-283`). But a repo-wide search for its only consumers found exactly one: the sibling barrel file `crm7/src/lib/awards/index.ts` — which itself has **zero importers anywhere in the app** (`grep -rl "from '@/lib/awards'" src` returns nothing outside its own directory and tests). **This is a "built but not wired" gap, not a "doesn't exist" gap** — the per-shift penalty-matching logic was written and unit-tested but never connected to `TimesheetEntryGrid`, `timesheetWorkflow`, or the payroll export path. | AnyTime has "Pay Item Rules" driven by Daily/Weekly/Fortnightly award rules, penalty rules with multiplication factors, and "Auto-coding on submit + admin override" per the prior matrix's P1 #7 finding, which is a live, wired feature in the shipped product | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` §SYSTEM ("Pay Item Rules", "Penalty Groups", "Allowance Groups"); crm7 code cited above (read this session) | **Code House ahead — this is a real, verified gap** |
| Timesheet attachments | Component exists: `crm7/src/components/timesheets/TimesheetAttachments.tsx` | Yes — "Timesheet Attachments" (up to 3) | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` | Parity (exact attachment-count limit not re-verified on BSuite side) |
| Pay period streams | DB tables exist (`pay_period_streams`, migration `20260707000021`) but per the 2026-07-23 matrix, **zero frontend usage** — confirmed still true, not re-checked this session but no new UI found under `crm7/src/pages/payroll` beyond the existing `timesheets/index.tsx` | Yes — "Pay Periods" isolate by week-ending day, a live feature | `docs/20260723-bsuite-capability-matrix-v1.00W.md` §2 | Code House ahead |
| Leave application workflow | Not verified this session | Yes — full apply/approve/reject/unsubmit leave cycle | `docs/20260723-anytime-workforceone-admin-guide-v1.00W.md` §APPLY LEAVE | Unverified on BSuite side |

---

## 5. conduit vs Humanforce / LiveHire

### 5.1 Product-shape note

LiveHire no longer exists as an independent product (§1.2, finding L0) — it is now Humanforce's "Talent" module, retaining LiveHire's original talent-community/CRM DNA. This section compares conduit against that combined Humanforce Talent surface, distinguishing where a feature traces to the legacy-LiveHire CRM core versus native Humanforce ATS/onboarding.

| Capability | conduit | Humanforce (incl. ex-LiveHire Talent) | Source | Verdict |
|---|---|---|---|---|
| Req-to-hire ATS (job postings, structured pipeline, offer management) | **Yes** — `conduit/src/app/(dashboard)/{jobs,pipeline,offers,candidates,interviews}` route tree, public careers site at `portal/careers` | **Yes** — "Configurable stages — design hiring pipelines aligned to each role", Applied→Screening→Interview→Offer | `https://www.humanforce.com/products/talent/applicant-tracking` | Parity |
| Talent community / direct-sourcing CRM (segmentation, nurture campaigns, silver-medalist re-engagement) | **Partial** — `conduit/src/app/(dashboard)/talent-pools` exists but nurture-campaign/segmentation depth not verified this session | **Yes, and this is the deepest module found** — "Custom Talent Communities and pools," "Smart segmentation by skills, role and location," "2-way SMS and email campaigns," silver-medalist re-engagement, internal mobility | `https://www.humanforce.com/products/talent/recruitment-crm` | **Humanforce ahead — this is inherited LiveHire depth, and it is real** |
| GTO / apprenticeship / group-training / host-employer domain model | **Yes — this is conduit's entire reason for existing.** Field-officer portal (`portal/field-officer`), employer portal (`portal/employer`), candidate portal, talent-community join flow, cross-reads into crm7's placement/training-contract data | **No.** Confirmed absent by direct page inspection (recruitment-crm, applicant-tracking, talent-analytics, onboarding, homepage) and by a zero-result site-restricted search for apprentice/"group training"/"labour hire" terms. Humanforce's only labour-hire-adjacent product is the separate Ento acquisition (rostering, not ATS/talent) | `https://www.humanforce.com/resources/news/humanforce-acquires-ento`; negative-result search logged in agent evidence | **BSuite ahead — materially, and structurally (no competitor in this set covers it)** |
| Onboarding (pre-boarding, contracts, document collection) | `conduit/src/app/(dashboard)/onboarding` route exists | **Yes, and detailed** — "Pre-boarding automation — contracts, tax forms, and ID before day one," e-signing, role-based cross-department checklists, "100% Day-1 compliance" metric | `https://www.humanforce.com/products/workforce/onboarding` | Depth on Humanforce side unverified against conduit — flagged for follow-up, not scored |
| Career site / employer branding | conduit has a public careers portal (`portal/careers/[jobId]`) | **Yes, moderately deep** — multi-brand career pages (main/graduate/retail), multi-board posting to Seek/Indeed/LinkedIn, SEO/Google for Jobs | `https://www.humanforce.com/products/talent/talent-attraction` | Depth comparison not verified — conduit's multi-board posting/SEO depth not checked this session |
| Video interviewing | `conduit/src/app/(dashboard)/interviews` exists but native video-interview capability not verified this session | **Unclear on native depth** — one secondary source claims integration with third-party video-interview platforms (e.g. myInterview); the direct integrations-marketplace page 404'd | Secondary source only (`app.getamsverified.com` comparison page, `research.com/software/reviews/livehire`) — **low confidence** | Unverified both sides |
| Pipeline/hiring analytics | Not verified this session on conduit side | **Yes, concrete metrics shown**: live funnel counts, "7 Days to hire," source-of-hire comparison, Net Hiring Score, automated anomaly detection | `https://www.humanforce.com/products/talent/talent-analytics` | Depth on conduit side unverified — flagged for follow-up |
| Payroll tax / state-based compliance | N/A to conduit directly (that's R80.3/crm7's job) but conduit reads placement data that feeds it | **Not found anywhere in Humanforce's public Talent/Payroll pages** for apprentice-specific exemptions | `https://www.humanforce.com/product/payroll` | N/A — cross-reference only |

---

## 6. Ranked gap ledger

**P0 = a GTO buyer would reject BSuite over this. P1 = competitive parity gap, matters but not disqualifying. P2 = modern-surface/incremental, low urgency.**

### P0 (2 items)

1. **Per-shift penalty/overtime auto-interpretation is unwired in the live timesheet flow (crm7).** `TimesheetEntryGrid.tsx` makes the user manually select a work-type bucket instead of deriving it from the captured start/end time + day-of-week, even though `penaltyCalculator.ts` already contains the correct `ShiftPattern`/Saturday-Sunday-night-shift matching logic with zero consumers. Code House AnyTime has this live today ("Pay Item Rules," "Auto-coding on submit"). *Rationale: this is the single feature a payroll officer evaluating BSuite against AnyTime would test first, and it would currently fail — a GTO cannot safely rely on manually-selected overtime buckets for award compliance at scale.*
2. **STP Phase 2 / Payday Super (OZEDI/QuickSuper) and RCTI are unverified-to-absent on the CRM7 side** while Code House ships dedicated, named integrations for both. *Rationale: these are hard payroll-compliance/invoicing requirements for any Australian GTO at scale — without them CRM7 cannot fully replace WfO+AnyTime as a payroll system of record.* (Carried forward from `docs/20260723-bsuite-capability-matrix-v1.00W.md` P1 #46/#47 — re-ranked to P0 here because the operator specifically asked this document to flag GTO-rejection-grade gaps, and unresolved payroll-lodgement compliance is exactly that class.)

### P1 (4 items)

3. **Pay period streams have zero frontend usage** despite the DB schema existing (migration `20260707000021`) — Code House's AnyTime isolates pay periods by week-ending-day stream as a live, used feature.
4. **Talent-community nurture depth (segmentation, silver-medalist re-engagement, 2-way SMS/email campaigns) is unverified/likely thinner in conduit** than in Humanforce's inherited LiveHire Talent module — this is a real, evidenced capability gap on the sourcing side, not a domain-fit gap (conduit still wins on GTO-specific structure).
5. **Hiring-pipeline analytics depth is unverified on the conduit side** against Humanforce's concretely-demonstrated funnel/time-to-hire/source-of-hire/Net-Hiring-Score dashboards.
6. **Bulk timesheet operations and leave-application workflow parity are unverified on the crm7 side** against AnyTime's documented bulk-approve and full leave apply/approve/reject/unsubmit cycle.

### P2 (3 items)

7. **RatesCalc's API is a real product surface (OAuth2, structured award/on-cost schema) but R80.3/charge-calc is not itself exposed as a third-party-consumable API** — not a defect (different product shape) but worth noting if BSuite ever wants to sell charge-calc as a standalone API product.
8. **No native video-interviewing feature confirmed in conduit** — low confidence on both sides of this comparison; worth a dedicated follow-up rather than acting on it now.
9. **Career-site multi-board posting/SEO depth (Seek/Indeed/LinkedIn auto-post, Google for Jobs)** not verified against conduit's current careers portal implementation.

---

## 7. Where BSuite is ahead (this matters as much as the gaps)

1. **State-by-state apprentice payroll-tax exemption modelling is a genuine structural advantage over RatesCalc.** R80.3's `PAYROLL_TAX_EXEMPT_STATES` table correctly encodes the WA/VIC/NSW-full-exemption vs QLD/SA/TAS/ACT/NT-apprentice-and-adult-apprentice-only split, with dedicated regression tests. RatesCalc's public API exposes only a company-level binary exemption flag — it cannot express this matrix at all. This is not a marketing claim on either side; it is read directly from both the R80.3 source and the RatesCalc API schema.
2. **The three-identifier data model (qualification / STA apprenticeship title / ANZSCO occupation) is explicitly and deliberately separated in crm7's schema**, down to a documented catalog-level default-mapping table and an explicit code comment anticipating and pre-empting the "apprentice's assigned title differs from the qualification's default title — expected, not a bug" confusion. RatesCalc collapses this into a single free-text `job_title` field. No evidence either way for Code House WfO (not found in the 25-article knowledgebase sample), so this is scored as a RatesCalc-specific advantage, not claimed universally.
3. **BOOT/EBA/custom-rate comparison (`compareBOOT`, `compareGTOBOOT`, failure-pattern detection, F17 export data) is a fully-built, tested engine in `@bsuite/charge-calc/boot` with no equivalent found in RatesCalc's public API or marketing pages, and no equivalent found anywhere in Code House's knowledgebase sample.** This is BSuite's single deepest and most defensible differentiator against every competitor examined in this document.
4. **No-code Feature Builder, AI assistant (Jodie) across every app, and realtime collaboration (RealtimeCursors)** have no equivalent claimed or found on any competitor site examined (RatesCalc, Code House, Humanforce) — carried forward from the 2026-07-23 matrix and not contradicted by anything found this session.
5. **conduit's GTO-specific triangular data model (candidate → GTO placement → host employer → ongoing training-contract compliance) has literally no equivalent among the ATS products examined.** Humanforce/ex-LiveHire is a strong horizontal ATS+CRM but is confirmed, by direct page inspection and a negative site-search, to have zero apprenticeship/group-training concept anywhere in its product line except the unrelated, non-integrated Ento rostering acquisition.
6. **Code House's own product architecture is batch-sync + manual-export, not a live API** ("Synchronisation Workforce One to AnyTime," "Manual Export of Timesheets" — these are the actual section headers in Code House's own admin manual). BSuite's Supabase + edge-function API surface, MFA, and Microsoft SSO are all parity-or-ahead against a product whose own documentation describes a batch-sync architecture.

---

## 8. Explicit "could not verify" section

- **RatesCalc:** anything behind an authenticated session (actual request/response payload bytes beyond the schema shown, error-response bodies beyond the four HTTP codes documented, rate-limit headers). Whether the single-page doc at `/docs/index.html` has undiscovered sub-pages — no internal links were found in the rendered content, but this may be a proxy-rendering artifact rather than confirmation the docs are genuinely single-page. All `ratescalc.com`/`ratescalc.com/features` marketing claims ("120+ modern awards," "real-time Fair Work sync") are unverified against the API schema and are flagged lower-confidence throughout.
- **Code House Workforce One:** only 25 of 205 knowledgebase articles have been crawled (the "featured"/most-recent set) — STP2/allowances, RCTI, and Payday Super integration manuals exist as PDF links but their **content** (beyond the article summary) was not opened; several inline articles were read in full, PDF-linked articles were not. The AnyTime Administrator's Guide is complete (2,390 lines) and was the primary evidentiary source for §4.
- **Humanforce:** `/integrations` returned 404 — the actual partner/integration list could not be found on any public page; the "governed marketplace" language on `/humanforce-connect` describes a staffing-fulfilment marketplace, not a software-integration one, and this ambiguity is unresolved. No pricing information was sought or found (out of scope).
- **LiveHire / ex-LiveHire Talent:** video-interviewing integration depth relies on secondary sources (`research.com`, `app.getamsverified.com`) because the direct `myinterview` integration-marketplace page 404'd after the LiveHire→Humanforce redirect resolved. Treat this specific claim as low-confidence.
- **BSuite side, unverified this session (carried as open items, not closed gaps):** STP2/Payday Super and RCTI status in CRM7 (flagged P0 #2 above pending a direct re-check); bulk timesheet operations; leave-application workflow; conduit's video-interviewing, multi-board job posting, and hiring-analytics depth; timesheet-attachment count limit.

---

## 9. Method notes for future updates

- The per-shift interpretation finding (§4, P0 #1) was only discoverable by reading `crm7/src/lib/awards/penaltyCalculator.ts` directly and then grepping for its consumers — the file's own doc-comment ("Handle shift pattern matching for relevant penalties") would have led a docs-only reviewer to wrongly conclude the gap was closed. Any future parity pass on this feature must re-run the consumer-search (`grep -rl "from '@/lib/awards'" crm7/src`), not just check for the file's existence.
- RatesCalc's docs site is JS-rendered and blocked plain fetches (403) — the `r.jina.ai` proxy pattern from the research-competitor-products skill was required and worked on the first retry.
- LiveHire's acquisition by Humanforce (finding L0) means any future BSuite competitive research should treat "LiveHire" and "Humanforce" as one vendor, not two, going forward.
