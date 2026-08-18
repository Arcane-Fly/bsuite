<!-- G5-VERDICT-BANNER -->
> **VERDICT (STILL-WANTED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # 📋 VERDICT: STILL-WANTED (small; already covered by `crm7#1476` + `crm7#1595`)
>
> The inventory of GTO document types below is **genuine outstanding requirement** and is the most
> reusable content in this directory. It is not covered by any of the completion ledger's 87 items.
>
> Measured 2026-08-17 (live project `tuybltdrdefjblnplpqo`): `document_templates` holds **1 row**
> against the ~20 GTO document types this guide inventories. Effectively unseeded.
>
> **One structural defect in this document's assumptions.** It relies on a 4-tier `source` column
> (`system|cloned|uploaded_docx|custom_google_doc`). The migration that adds it,
> `crm7/supabase/migrations/20260304000006_template_self_service.sql`, **does exist** — but it is
> numbered `20260304…`, **below this estate's migration floor of `20260611000000`, so it can never
> apply.** Confirmed live: `document_templates` has `google_doc_id`, `tenant_id` and `version`, and
> **no `source` column**. Any plan built on `source` will fail silently.
>
> *(This also corrects `crm7#1476`, which states the migration was "never created". It was created;
> it is unappliable, which is a different and more misleading failure.)*
>
> The legacy-template warning in the body still stands — verify content against the Fair Work Act
> 2009, the NES and applicable Modern Awards before use.

---

# GTO Document Templates — Comprehensive Guide

**Date:** 2026-03-04
**Status:** v2.00W (Working)
**Context:** Inventory of all GTO document templates needed for CRM7's document lifecycle system. Informed by legacy templates from previous GTO operations and current Fair Work Ombudsman requirements (verified March 2026).

> **⚠️ WARNING:** The legacy templates in `/home/braden/Downloads/Business Improvement-20260303T075644Z-3-001/` are from previous employment and **may not be current**. They are used for **structural inspiration only** — all content must be independently verified against current Fair Work Act 2009, NES, and applicable Modern Awards before use.

---

## 0. Multi-Tenant Template Architecture

### Core Principle: All Templates Are Anonymised

**No template contains any company-specific content.** Every template is white-label — tenant branding (company name, ABN, logo, address, etc.) is injected at generation time via merge variables. This means:

- The same `Employment Contract` template works for any GTO, labour hire company, or employer
- Tenants see their own branding on generated documents without maintaining separate templates
- System defaults are maintained centrally and updated for Fair Work compliance changes
- Templates are a **SaaS product feature**, not bespoke per-customer work

### Template Sources (4 tiers)

| Source | `source` column | Who Creates | Who Edits | Visible To |
|--------|-----------------|-------------|-----------|------------|
| **System defaults** | `system` | BSuite platform team | Platform team only | All tenants (read-only) |
| **Cloned from system** | `cloned` | Tenant admin (one-click clone) | Tenant admin | That tenant only |
| **Uploaded DOCX** | `uploaded_docx` | Tenant admin (file upload) | Tenant admin | That tenant only |
| **Custom Google Doc** | `custom_google_doc` | Tenant admin (paste Doc ID) | Tenant admin | That tenant only |

### Tenant Self-Service Workflow

```
┌─────────────────────────────────────────────────────────┐
│  Template Library (CRM7 → Documents → Templates)        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ System       │  │ My Custom    │  │ + Upload     │  │
│  │ Templates    │  │ Templates    │  │   New        │  │
│  │ (read-only)  │  │ (editable)   │  │   Template   │  │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘  │
│         │                                    │          │
│    [Clone & Customise]              [Upload DOCX] or    │
│         │                           [Paste Google Doc ID]│
│         ▼                                    │          │
│  ┌──────────────────────────────────────────┐│          │
│  │ Template Editor                          ││          │
│  │ • Edit name, description                 ││          │
│  │ • Map merge variables (drag-drop)        │◄──────────┘
│  │ • Configure signatories                  │           │
│  │ • Preview with sample data               │           │
│  │ • Set compliance review status           │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Branding Merge Variables (Available in ALL Templates)

Every template automatically has access to these tenant-level branding variables — no need to define them per template:

```
{{TENANT_NAME}}           — Business/trading name
{{TENANT_LEGAL_NAME}}     — Registered legal entity name
{{TENANT_ABN}}            — Australian Business Number
{{TENANT_ACN}}            — Australian Company Number (if applicable)
{{TENANT_ADDRESS}}        — Registered business address
{{TENANT_PHONE}}          — Main phone number
{{TENANT_EMAIL}}          — Main contact email
{{TENANT_WEBSITE}}        — Website URL
{{TENANT_LOGO_URL}}       — Logo image URL (for header insertion)
{{TENANT_INDUSTRY}}       — e.g. "Group Training", "Labour Hire", "Electrical Contracting"
{{TENANT_STATE}}          — Operating state (affects LSL, workers comp rules)
```

These are resolved from the `tenants` table at merge time. The Google Docs template simply includes `{{TENANT_NAME}}` and every GTO/labour hire company sees their own name.

### Who Can Use This System

| Customer Type | Use Case | Example Templates |
|---------------|----------|-------------------|
| **Group Training Organisations (GTOs)** | Apprentice/trainee employment docs, host agreements, training correspondence | T1–T17, competency assessments |
| **Labour Hire Companies** | Worker contracts, host client agreements, WHS assessments, timesheets | T1, T3, T4, T5, T7, T14 |
| **Trade Contractors** | Subcontractor agreements, safety docs, competency records | T3, T4, T5, G1–G11 |
| **Any Australian Employer** | Standard employment docs, Fair Work compliance templates | T1, T2, T5–T10, T18–T21 |

### Database Schema Changes

Migration `20260304000006_template_self_service.sql` adds:

| Column | Type | Purpose |
|--------|------|---------|
| `source` | `text` | `'system'` / `'cloned'` / `'uploaded_docx'` / `'custom_google_doc'` |
| `source_template_id` | `uuid` | Links cloned template back to its system default parent |
| `uploaded_file_path` | `text` | Supabase Storage path for uploaded DOCX files |
| `compliance_reviewed` | `boolean` | Has this template been reviewed for Fair Work compliance? |
| `compliance_reviewed_at` | `timestamptz` | When was compliance review done |
| `compliance_reviewed_by` | `uuid` | Who reviewed it |
| `tags` | `text[]` | Filterable tags: `['apprentice', 'host_employer', 'whs']` |

**RLS Changes:**

- System defaults (`is_system_default = true`) are **readable by all tenants**
- Only tenant's own templates are writable
- `clone_system_template()` function handles one-click cloning

---

## 1. Fair Work Compliance Framework (March 2026)

Every GTO document must comply with the following hierarchy:

```
Fair Work Act 2009 (Cth)
  └── National Employment Standards (NES) — 12 minimum entitlements
       └── Modern Award (e.g. Miscellaneous Award 2020, Manufacturing Award)
            └── Enterprise Agreement (if applicable)
                 └── Employment Contract (cannot be below Award/NES)
```

### 12 NES Entitlements (must be referenced in employment docs)

| # | Entitlement | Key Detail |
|---|-------------|------------|
| 1 | **Maximum weekly hours** | 38 hours/week for full-time; reasonable additional hours |
| 2 | **Flexible working arrangements** | Eligible employees can request; employer must respond in 21 days |
| 3 | **Casual employment** | Casual loading in lieu of leave; pathway to permanent after 12 months |
| 4 | **Parental leave** | 12 months unpaid + right to request 12 more; includes adoption |
| 5 | **Annual leave** | 4 weeks/year (5 for shift workers); accrues from day 1 |
| 6 | **Personal/carer's leave** | 10 days/year paid sick/carer's; 2 days unpaid carer's; 2 days compassionate |
| 7 | **Family & domestic violence leave** | 10 days paid per year (all employees including casuals, since Feb 2023) |
| 8 | **Community service leave** | Unpaid (except jury service — up to 10 days paid for non-casuals) |
| 9 | **Long service leave** | State/territory legislation applies; typically 8.67 weeks after 10 years |
| 10 | **Public holidays** | Entitled to be absent; penalty rates if working; reasonable refusal rights |
| 11 | **Superannuation** | Employer must contribute to nominated fund (currently 11.5% from 1 July 2025) |
| 12 | **Notice of termination & redundancy** | 1–5 weeks notice based on service; redundancy pay 4–16 weeks |

### Mandatory Information Statements (must be provided to new employees)

| Statement | When | Who |
|-----------|------|-----|
| **Fair Work Information Statement (FWIS)** | Before or as soon as possible after start date | All employees |
| **Casual Employment Information Statement (CEIS)** | At start of employment + at 6 and 12 months | Casual employees only |
| **Fixed Term Contract Information Statement** | Before or as soon as possible after start date | Fixed-term employees |

### GTO-Specific Obligations

| Obligation | Detail |
|------------|--------|
| **Training contract** | Must be registered with state/territory training authority |
| **Employer of record** | GTO is the legal employer — all Fair Work obligations fall on the GTO, not the host |
| **Host employer placement** | GTO places apprentice/trainee with host but remains responsible for pay, leave, WHS |
| **Probation** | Typically 3–6 months; NES entitlements apply during probation |
| **Workers compensation** | GTO carries the policy, not the host employer |
| **WHS duty of care** | Shared between GTO and host; GTO must assess host workplaces |
| **Award compliance** | Pay rates, allowances, overtime per applicable Modern Award |

---

## 2. Legacy Template Inventory

### Category A: Onboarding & Employment (P1 — Build First)

| # | Legacy Template | Source File | Status | Notes |
|---|----------------|-------------|--------|-------|
| A1 | **Employment Contract (Apprentice)** | `GT Apprentice Contract and Rate Schedule.docx` | ⚠️ Review | Must reference correct Modern Award, NES, training contract |
| A2 | **Apprentice/Trainee Induction Handbook** | `20230403 Apprentice and Trainee Induction Handbook.docx`, `Apprentice and Trainee Induction Handbook.docx` | ⚠️ Review | Multiple versions exist; must include FWIS, CEIS references |
| A3 | **New Starter Information Form** | `GT - New Starter Employee Information Form.docx` | ⚠️ Review | Tax, super, bank details, emergency contacts |
| A4 | **Induction Checklist** | `Induction Checklist.docx` | ⚠️ Review | Must include FWIS/CEIS handover, WHS induction, PPE |
| A5 | **Payroll Deduction Form** | `Payroll Deduction Form.docx` | ⚠️ Review | Deductions require written consent per Fair Work Act s324 |
| A6 | **Employee Confidentiality Agreement** | `Employee Confidentiality Agreement.docx` | ⚠️ Review | Must not restrict whistleblower protections |
| A7 | **Pre-Employment Medical Acknowledgement** | `Pre-Employment Medical Acknowledgement Form.docx` | ⚠️ Review | Must comply with disability discrimination laws |
| A8 | **Work Experience Consent Form** | `Work Experience Placement Consent form.docx` | ⚠️ Review | Different rules for work experience vs employment |
| A9 | **Authorisation to Discuss Consent Form** | `Authorisation to Discuss Consent Form.docx` | ⚠️ Review | Privacy Act compliance |
| A10 | **Authorisation to Act (All Matters)** | `Authorisation to Act in Conjunction Letter All Matters.docx` | ⚠️ Review | Power of attorney / representative authority |

### Category B: Host Employer Documents (P1)

| # | Legacy Template | Source File | Status | Notes |
|---|----------------|-------------|--------|-------|
| B1 | **Host Employer Handbook** | `GTO Host Employer Handbook.docx`, `GTO Host Employer Handbook LV.docx` | ⚠️ Review | Multiple versions (branded variants) |
| B2 | **Host Employer Agreement (T&Cs)** | `Contract - Terms and Conditions (+Direct Debit) SME.docx` | ⚠️ Review | Charge rates, payment terms, placement conditions |
| B3 | **Host Safety Assessment** | `Host Safety Assessment.docx`, `Host Employer OHS Acknowledgement Form.docx` | ⚠️ Review | WHS Act compliance; shared duty of care |
| B4 | **Rate Quote (Full Disclosure)** | `2023 GT Rates Only Quote Full Disclosure.docx` | ⚠️ Review | Award rates, on-costs, GTO margin breakdown |
| B5 | **Rate Quote Request** | `Gt Rate Quote Request.docx` | ⚠️ Review | Host employer details for quoting |
| B6 | **Host Thank You Letter** | `Host Thank you Letter.docx` | ✅ Cosmetic | Low compliance risk — update branding only |
| B7 | **General Visit Form** | `General Visit Form.docx` | ⚠️ Review | Workplace visit / monitoring record |

### Category C: Performance & Discipline (P2)

| # | Legacy Template | Source File | Status | Notes |
|---|----------------|-------------|--------|-------|
| C1 | **Warning Letter — Failure to Notify Sick Leave** | `Warning Letter 1 - Failure to Notify Sick Leave.docx` | ⚠️ Review | Must follow Fair Work procedural fairness requirements |
| C2 | **Warning Letter — Late Timesheets** | `Warning Letter 2 - Late Timesheets.docx` | ⚠️ Review | Performance management, not misconduct |
| C3 | **Warning Letter — Unacceptable Language** | `Warning Letter 3 - Unacceptable Language.docx` | ⚠️ Review | May overlap with bullying/harassment policy |
| C4 | **Warning Letter — Failure to Comply with RTWP** | `Warning Letter 4 - Failure to Comply with RTWP.docx` | ⚠️ Review | Return to work program; workers comp implications |
| C5 | **Warning Letter — Failure to Complete Take 5** | `Warning Letter 5 - Failure to Complete Take 5.docx` | ⚠️ Review | WHS compliance; site-specific safety procedure |
| C6 | **Performance Improvement Plan** | `HR Docs/performance-improvement-plan.docx` | ⚠️ Review | Must include support, reasonable timeframes |
| C7 | **Performance Appraisal (Apprentice/Trainee)** | `Performance Appraisal_Apprentice Trainee.docx` | ⚠️ Review | Training progress, competency development |
| C8 | **Record of Discussion Form** | `Record of Discussion Form.docx` | ⚠️ Review | Informal performance conversation record |
| C9 | **Probation Assessment** | `Probation Assessment.pdf` | ⚠️ Review | Fair Work: employees on probation still have NES entitlements |
| C10 | **Random Drug & Alcohol Test Letter** | `Random Drug and Alcohol Test Letter.docx` | ⚠️ Review | Must have policy basis; workplace safety justification |

### Category D: Lifecycle Events (P2)

| # | Legacy Template | Source File | Status | Notes |
|---|----------------|-------------|--------|-------|
| D1 | **End of Probation — Successful** | `End of Probation Letter - Successful.docx` | ⚠️ Review | Confirm ongoing employment terms |
| D2 | **End of Probation — Unsuccessful** | `End of Probation letter - Unsuccessful.docx` | ⚠️ Review | Must provide notice per NES; unfair dismissal protection after min employment period |
| D3 | **Apprentice Change of Year Letter** | `Apprentice Change of Year Letter.docx` | ⚠️ Review | Pay rate progression notification |
| D4 | **Change of Year Agreement** | `Change of Year Agreement.docx` | ⚠️ Review | Wage increase acknowledgement for training contract progression |
| D5 | **Apprentice Congratulations Letter** | `Apprentice Congratulations Letter.docx` | ✅ Cosmetic | Completion celebration — low compliance risk |
| D6 | **Off the Job Training Call-up (Apprentice)** | `Off the Job Training (TAFE) Call up Letter - Apprentice.docx` | ⚠️ Review | Training attendance is part of employment |
| D7 | **Off the Job Training Call-up (Host)** | `Off the Job Training (TAFE) Call up Letter - Host.docx` | ⚠️ Review | Host must release apprentice for training |
| D8 | **Suspension of Apprenticeship Letter** | `Suspension of Apprenticeship Letter - Electrical.docx` | ⚠️ Review | State training authority requirements |
| D9 | **Lifting of Suspension Letter** | `Lifting of Suspension of Apprenticeship Letter - Electrical.docx` | ⚠️ Review | Reinstatement conditions |
| D10 | **Extending Apprenticeship Letter** | `Extending of Apprenticeship Letter - Electrical.docx` | ⚠️ Review | Extension reasons, new completion date |
| D11 | **Cancellation of Apprenticeship Letter** | `Cancellation of Apprenticeship Letter - Electrical.docx` | ⚠️ Review | State authority notification required |

### Category E: Termination & Exit (P2)

| # | Legacy Template | Source File | Status | Notes |
|---|----------------|-------------|--------|-------|
| E1 | **Termination Process** | `M13 TERMINATION PROCESS.docx` | ⚠️ Review | Must comply with unfair dismissal protections |
| E2 | **Notice of Completion/Suspension/Termination Form** | `Notice of Completion Suspension Termination Form.docx` | ⚠️ Review | State training authority notification |

### Category F: Policies & Procedures (P1)

| # | Legacy Template | Source File | Status | Notes |
|---|----------------|-------------|--------|-------|
| F1 | **Workplace Harassment & Bullying Policy** | `Workplace Harassment and Bullying Policy and Procedure Group Training.docx` | ⚠️ Review | Updated sexual harassment laws (Respect@Work amendments); positive duty since Dec 2023 |
| F2 | **Grievance & Dispute Resolution Procedure** | `Grievance and Dispute Resolution Procedure.docx` | ⚠️ Review | Internal resolution before external complaint |
| F3 | **Injury Management Guidelines** | `Injury Management Guidelines.pdf` | ⚠️ Review | Workers comp return-to-work obligations |
| F4 | **Managing Downtime & Inclement Weather** | `Managing Downtime and Inclement weather Procedure.pdf` | ⚠️ Review | Stand-down provisions per Fair Work Act s524 |
| F5 | **Progress Monitoring & Performance Management** | `Progress Monitoring and Performance Management Procedure.pdf` | ⚠️ Review | Aligns with C6, C7, C8 |
| F6 | **Award Management Procedure** | `Award Management Procedure.pdf` | ⚠️ Review | How to identify and apply correct Modern Award |
| F7 | **Referral Policy** | `Referral Policy.pdf` | ⚠️ Review | Employee/apprentice referral program |
| F8 | **Safety LLN Questionnaire** | `Safety LLN Questionnaire.pdf` | ⚠️ Review | Language, Literacy & Numeracy assessment |

### Category G: Competency Assessments (P3)

| # | Legacy Template | Source File | Notes |
|---|----------------|-------------|-------|
| G1 | **On the Job — Bricklaying** | `On the Job Competency Assessment-Bricklaying.docx` | Trade-specific |
| G2 | **On the Job — Carpentry (Fixing)** | `On the Job Competency Assessment-Carpentry Fixing.docx` | Trade-specific |
| G3 | **On the Job — Carpentry (Formwork)** | `On the Job Competency Assessment-Carpentry Formwork.docx` | Trade-specific |
| G4 | **On the Job — Carpentry (Roofing)** | `On the Job Competency Assessment-Carpentry Roofing.docx` | Trade-specific |
| G5 | **On the Job — Carpentry (Transportable)** | `On the Job Competency Assessment-Carpentry Transportable.docx` | Trade-specific |
| G6 | **On the Job — Electrical** | `On the Job Competency Assessment-Electrical.docx` | Trade-specific |
| G7 | **On the Job — Engineering Fabrication** | `On the Job Competency Assessment-Engineering Fabrication.docx` | Trade-specific |
| G8 | **On the Job — Plumbing & Gas** | `On the Job Competency Assessment-Plumbing and Gas.docx` | Trade-specific |
| G9 | **On the Job — General** | `On the Job Competency Assessment-General.docx` | Multi-trade |
| G10 | **On the Job — Civmec Construction** | `On the Job Competency Assessment-Civmec Construction Engineering.docx` | Host-specific |
| G11 | **On the Job — Civmec Surface Treatment** | `On the Job Competency Assessment - CIVMEC Surface Treatment.docx` | Host-specific |

### Category H: Business Operations (P3)

| # | Legacy Template | Source File | Notes |
|---|----------------|-------------|-------|
| H1 | **GTO Business Plan** | `GTO Business Plan.docx`, `20230527 GTO Business Plan FY2324v3.docx` | Internal planning |
| H2 | **GTO Incentive Claims Planner** | `GTO Incentive Claims Planner 2023-24.docx` | Subsidy tracking |
| H3 | **Meeting Agenda & Minutes** | `GTO - Meeting Agenda and Minute.docx` | Internal ops |
| H4 | **Placement Report** | `Placement Report.docx` | Apprentice placement tracking |
| H5 | **Staff Commencement Request** | `Staff Commencement Request 070823.docx` | Internal staff onboarding |

### Category I: Subsidy & Claims (P3)

| # | Legacy Template | Source File | Notes |
|---|----------------|-------------|-------|
| I1 | **ADMS BAC & CAC Wage Subsidy** | `ADMS BAC & CAC Wage Subsidy Claims Process.docx` | State subsidy process |
| I2 | **ADMS PWS Wage Subsidy** | `ADMS PWS Wage Subsidy Claims Process.docx` | State subsidy process |
| I3 | **ABBTF Claims Process** | `Australian Brick and Blocklaying (ABBTF) Claims Process.docx` | Industry fund claims |
| I4 | **CTF MAWG Claims** | `CTF Mature Age Wage Gap (MAWG) Claims Process.docx` | WA Construction Training Fund |
| I5 | **CTF Employer Grants** | `Construction Training Fund (CTF) Employer Grant Claims Process.docx` | WA CTF grants |
| I6 | **CIBT Claims** | `Construction Industry Training Board (CIBT) Claims Process.docx` | SA training board |

---

## 3. Priority Google Docs Templates to Build

### Phase 1 — Core Employment (Critical Path)

These templates are **legally required** for onboarding new apprentices, trainees, and labour hire workers. They must be built first.

#### T1: Employment Contract (Apprentice/Trainee)

**Purpose:** Formal employment agreement between GTO and apprentice/trainee.
**Signatories:** Apprentice/Trainee, GTO Officer, Guardian (if under 18)
**Fair Work Requirements:**

- Cannot be below NES or applicable Modern Award
- Must specify employment type (full-time/part-time)
- Must reference training contract registration
- Must include probationary period terms
- Must specify applicable Modern Award
- Must reference right to Fair Work Information Statement

**Merge Variables:**

```
{{TENANT_NAME}}           — GTO business name
{{TENANT_ABN}}            — GTO ABN
{{TENANT_ADDRESS}}        — GTO registered address
{{PERSON_FULL_NAME}}      — Apprentice/trainee full name
{{PERSON_ADDRESS}}        — Apprentice/trainee address
{{PERSON_DOB}}            — Date of birth
{{PERSON_EMAIL}}          — Email address
{{PERSON_PHONE}}          — Phone number
{{QUALIFICATION_NAME}}    — e.g. "Certificate III in Electrotechnology Electrician"
{{QUALIFICATION_CODE}}    — e.g. "UEE30820"
{{HOST_EMPLOYER_NAME}}    — Initial host employer
{{HOST_EMPLOYER_ADDRESS}} — Host employer address
{{EMPLOYMENT_TYPE}}       — "Full-time" | "Part-time" | "School-based"
{{AWARD_NAME}}            — Applicable Modern Award name
{{AWARD_CLASSIFICATION}}  — Award classification level
{{BASE_RATE_HOURLY}}      — Hourly rate per award
{{BASE_RATE_WEEKLY}}      — Weekly rate per award
{{PROBATION_PERIOD}}      — e.g. "3 months"
{{START_DATE}}            — Employment commencement date
{{EXPECTED_COMPLETION}}   — Expected training completion date
{{SUPER_FUND_NAME}}       — Nominated superannuation fund
{{TODAY}}                 — Document generation date
```

#### T2: Fair Work Information Statement Cover Letter

**Purpose:** Cover letter confirming provision of FWIS (legally required at employment start).
**Signatories:** GTO Officer
**Fair Work Requirements:**

- Must be provided before or as soon as possible after start date
- FWIS itself is provided by Fair Work Ombudsman (not generated by GTO)
- Cover letter records that it was provided

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{START_DATE}}
{{TODAY}}
```

#### T3: Host Employer Agreement

**Purpose:** Terms and conditions for host employer placement of apprentice/trainee.
**Signatories:** Host Employer Representative, GTO Officer
**Requirements:**

- Charge rates (base wage + on-costs + GTO margin)
- Payment terms and direct debit authority
- WHS obligations and shared duty of care
- Supervision requirements
- Training release obligations
- Insurance arrangements
- Termination and cancellation terms

**Merge Variables:**

```
{{TENANT_NAME}}
{{TENANT_ABN}}
{{HOST_EMPLOYER_NAME}}
{{HOST_EMPLOYER_ABN}}
{{HOST_EMPLOYER_ADDRESS}}
{{HOST_CONTACT_NAME}}
{{HOST_CONTACT_EMAIL}}
{{HOST_CONTACT_PHONE}}
{{PERSON_FULL_NAME}}
{{QUALIFICATION_NAME}}
{{CHARGE_RATE_HOURLY}}
{{CHARGE_RATE_WEEKLY}}
{{BASE_RATE_HOURLY}}
{{SUPER_RATE_PERCENT}}
{{WORKERS_COMP_RATE}}
{{GTO_MARGIN_PERCENT}}
{{PAYMENT_TERMS}}        — e.g. "14 days from invoice"
{{PLACEMENT_START_DATE}}
{{TODAY}}
```

#### T4: Host Employer Safety Assessment

**Purpose:** WHS assessment of host workplace before apprentice placement.
**Signatories:** GTO WHS Officer, Host Employer Representative
**Requirements:**

- Workplace hazard identification
- Risk controls in place
- PPE requirements
- Supervision arrangements
- Emergency procedures
- First aid facilities
- Young worker considerations (under 18)

**Merge Variables:**

```
{{HOST_EMPLOYER_NAME}}
{{HOST_EMPLOYER_ADDRESS}}
{{HOST_CONTACT_NAME}}
{{INDUSTRY_TYPE}}
{{PERSON_FULL_NAME}}
{{QUALIFICATION_NAME}}
{{ASSESSMENT_DATE}}
{{GTO_ASSESSOR_NAME}}
{{TODAY}}
```

#### T5: Workplace Harassment & Bullying Policy

**Purpose:** Required workplace policy covering bullying, sexual harassment, and discrimination.
**Signatories:** Employee (acknowledgement)
**Fair Work Requirements (Updated Dec 2023):**

- **Positive duty** under Respect@Work amendments — employers must proactively prevent harassment
- Covers bullying, sexual harassment, sex-based harassment, discrimination
- Must include reporting process, investigation procedure, support contacts
- Must reference Fair Work Commission anti-bullying order provisions
- Must reference Australian Human Rights Commission complaint pathway
- Must cover all protected attributes (age, race, sex, disability, etc.)

**Merge Variables:**

```
{{TENANT_NAME}}
{{POLICY_VERSION}}
{{EFFECTIVE_DATE}}
{{PERSON_FULL_NAME}}    — For acknowledgement copy
{{TODAY}}
```

#### T6: Induction Checklist

**Purpose:** Confirm all onboarding steps are completed for new employees.
**Signatories:** Apprentice/Trainee, GTO Induction Officer
**Must Include:**

- FWIS provided ☐
- CEIS provided (casuals) ☐
- Employment contract signed ☐
- Tax file declaration completed ☐
- Super choice form completed ☐
- Bank details provided ☐
- Emergency contact details ☐
- Harassment & bullying policy read ☐
- WHS induction completed ☐
- PPE issued ☐
- Timesheet process explained ☐
- Leave entitlements explained ☐
- Grievance procedure explained ☐
- Training plan reviewed ☐
- Probation period explained ☐

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{START_DATE}}
{{HOST_EMPLOYER_NAME}}
{{QUALIFICATION_NAME}}
{{INDUCTION_OFFICER_NAME}}
{{TODAY}}
```

### Phase 2 — Ongoing Management

#### T7: Warning Letter (Generic — Configurable)

**Purpose:** Formal written warning for performance or conduct issues.
**Signatories:** GTO Manager, Employee (acknowledgement)
**Fair Work Requirements:**

- Must specify the issue clearly
- Must reference previous discussions/warnings
- Must give employee opportunity to respond
- Must specify expected improvement and timeframe
- Must warn of consequences of continued behaviour
- Must comply with procedural fairness (not harsh, unjust, or unreasonable)

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{PERSON_ADDRESS}}
{{WARNING_LEVEL}}        — "First" | "Second" | "Final"
{{ISSUE_DESCRIPTION}}    — Override: specific issue details
{{PREVIOUS_DISCUSSIONS}} — Override: dates of prior conversations
{{EXPECTED_IMPROVEMENT}} — Override: what must change
{{IMPROVEMENT_DEADLINE}} — Override: date by which
{{CONSEQUENCE}}          — Override: what happens if not improved
{{MANAGER_NAME}}
{{TODAY}}
```

#### T8: End of Probation Letter (Successful)

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{START_DATE}}
{{PROBATION_END_DATE}}
{{MANAGER_NAME}}
{{TODAY}}
```

#### T9: End of Probation Letter (Unsuccessful)

**Fair Work Requirements:**

- Must provide NES notice period (1 week if <1 year service)
- Must pay out accrued annual leave
- Must not be unfair dismissal (if employed ≥6 months or ≥12 months for small business)

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{START_DATE}}
{{NOTICE_PERIOD}}
{{LAST_DAY}}
{{REASON_SUMMARY}}       — Override
{{MANAGER_NAME}}
{{TODAY}}
```

#### T10: Apprentice Change of Year Letter

**Purpose:** Notify apprentice of year-level progression and pay rate increase.
**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{QUALIFICATION_NAME}}
{{PREVIOUS_YEAR_LEVEL}}
{{NEW_YEAR_LEVEL}}
{{PREVIOUS_RATE_HOURLY}}
{{NEW_RATE_HOURLY}}
{{EFFECTIVE_DATE}}
{{AWARD_NAME}}
{{TODAY}}
```

#### T11: Off-the-Job Training Call-up (Apprentice)

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{RTO_NAME}}             — Registered Training Organisation (TAFE etc.)
{{COURSE_NAME}}
{{BLOCK_START_DATE}}
{{BLOCK_END_DATE}}
{{TRAINING_ADDRESS}}
{{MANAGER_NAME}}
{{TODAY}}
```

#### T12: Off-the-Job Training Call-up (Host Employer)

**Merge Variables:**

```
{{TENANT_NAME}}
{{HOST_EMPLOYER_NAME}}
{{HOST_CONTACT_NAME}}
{{PERSON_FULL_NAME}}
{{RTO_NAME}}
{{BLOCK_START_DATE}}
{{BLOCK_END_DATE}}
{{MANAGER_NAME}}
{{TODAY}}
```

#### T13: Performance Improvement Plan

**Fair Work Requirements:**

- Clear performance standards
- Support and resources offered
- Reasonable timeframe
- Regular check-in dates
- Consequences clearly stated

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{MANAGER_NAME}}
{{PERFORMANCE_AREAS}}    — Override: specific areas
{{IMPROVEMENT_ACTIONS}}  — Override: specific steps
{{SUPPORT_PROVIDED}}     — Override: training, mentoring, etc.
{{REVIEW_DATE_1}}
{{REVIEW_DATE_2}}
{{FINAL_REVIEW_DATE}}
{{TODAY}}
```

### Phase 3 — Termination & Completion

#### T14: Termination Letter (Employer-Initiated)

**Fair Work Requirements:**

- Written notice required (delivered in person, post, or agreed electronic)
- Notice period per NES: 1 week (<1yr), 2 weeks (1–3yr), 3 weeks (3–5yr), 4 weeks (5+yr), +1 week if over 45 and 2+ years service
- Payment in lieu of notice is permitted
- Must pay out accrued annual leave
- Redundancy pay if applicable (4–16 weeks based on service)
- Apprentices: may not be entitled to notice if employed for specified period (training contract duration)

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{PERSON_ADDRESS}}
{{START_DATE}}
{{TERMINATION_REASON}}   — Override
{{NOTICE_PERIOD}}
{{LAST_DAY}}
{{LEAVE_BALANCE_HOURS}}
{{LEAVE_PAYOUT_AMOUNT}}
{{FINAL_PAY_DATE}}
{{MANAGER_NAME}}
{{TODAY}}
```

#### T15: Apprentice Completion Congratulations

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{QUALIFICATION_NAME}}
{{QUALIFICATION_CODE}}
{{COMPLETION_DATE}}
{{HOST_EMPLOYER_NAME}}
{{MANAGER_NAME}}
{{TODAY}}
```

#### T16: Apprenticeship Suspension Letter

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{QUALIFICATION_NAME}}
{{SUSPENSION_REASON}}    — Override
{{SUSPENSION_START_DATE}}
{{EXPECTED_RESUME_DATE}}
{{TRAINING_AUTHORITY}}   — e.g. "DTWD" (WA), "DESBT" (QLD)
{{MANAGER_NAME}}
{{TODAY}}
```

#### T17: Apprenticeship Cancellation Letter

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{QUALIFICATION_NAME}}
{{CANCELLATION_REASON}}  — Override
{{EFFECTIVE_DATE}}
{{TRAINING_AUTHORITY}}
{{NOTICE_PERIOD}}
{{FINAL_PAY_DATE}}
{{MANAGER_NAME}}
{{TODAY}}
```

---

## 4. Merge Variable Sources

The `generate-document` Edge Function resolves variables from these database tables:

| Prefix | Source Table | Notes |
|--------|-------------|-------|
| `TENANT_*` | `tenants` | GTO business details |
| `PERSON_*` | `people` | Apprentice/trainee/worker details |
| `HOST_*` | `clients` (where client_type = 'host_employer') | Host employer details |
| `QUALIFICATION_*` | `qualifications` | From TGA integration |
| `AWARD_*` | Manual / external | Modern Award lookup (future: Fair Work API) |
| `TODAY` | System | `new Date().toLocaleDateString('en-AU', ...)` |

**Override variables** (marked with `— Override` above) are provided by the user at document generation time via the `overrides` parameter in the Edge Function request body. These cover free-text fields like warning descriptions, termination reasons, etc.

---

## 5. Official Fair Work Templates & Best Practice Guides

### Official Templates (fairwork.gov.au/tools-and-resources/templates)

These are **government-provided templates** that our Google Docs templates should align with structurally. Use them as the baseline — then extend with GTO-specific fields.

| # | Fair Work Template | URL | Download | Maps To Our Template |
|---|-------------------|-----|----------|---------------------|
| FW1 | **End of probation letter** (successful) | [Fair Work — End of probation](https://www.fairwork.gov.au/tools-and-resources/templates/end-of-probation) | DOC 60KB / PDF 126.2KB | T8: End of Probation (Successful) |
| FW2 | **Warning letter** (first warning) | [Fair Work — Warning letter](https://www.fairwork.gov.au/tools-and-resources/templates/warning-letter) | Interactive form | T7: Warning Letter (Generic) |
| FW3 | **Final warning letter** + checklist | [Fair Work — Final warning](https://www.fairwork.gov.au/tools-and-resources/templates/warning-letter) | DOCX 50.7KB / PDF 47.7KB | T7: Warning Letter (`WARNING_LEVEL=Final`) |
| FW4 | **Staff meeting records template** | [Fair Work — Meeting records](https://www.fairwork.gov.au/tools-and-resources/templates/warning-letter) | DOC 59KB / PDF 118KB | C8: Record of Discussion Form |
| FW5 | **Letter of resignation** | [Fair Work — Resignation](https://www.fairwork.gov.au/tools-and-resources/templates/letter-of-resignation) | Interactive form | _New: T18 (employee-initiated)_ |
| FW6 | **Request for records** | [Fair Work — Records request](https://www.fairwork.gov.au/tools-and-resources/templates/request-for-records) | Interactive form | _New: T19 (employee request)_ |
| FW7 | **Notice of requirement to take annual leave** | [Fair Work — Annual leave notice](https://www.fairwork.gov.au/tools-and-resources/templates/notice-of-requirement-to-take-annual-leave) | Interactive form | _New: T20_ |
| FW8 | **Agreement to take annual leave in advance** | [Fair Work — Leave in advance](https://www.fairwork.gov.au/tools-and-resources/templates/agreement-to-take-annual-leave-in-advance) | Interactive form | _New: T21_ |
| FW9 | **Timesheet template** | [Fair Work — Templates](https://www.fairwork.gov.au/tools-and-resources/templates) | Download | _Reference only (CRM7 has digital timesheets)_ |

> **Action:** Download FW1–FW4 (the DOC/PDF versions) and use as structural references when authoring T7, T8, and C8 Google Docs templates. The interactive form templates (FW5–FW8) should be replicated as Google Docs with our merge variables.

### Best Practice Guides (fairwork.gov.au/tools-and-resources/best-practice-guides)

These guides inform the **content and procedures** in our policy templates (Category F). Each one is available as a downloadable PDF from Fair Work.

| # | Guide | URL | Relevant Templates |
|---|-------|-----|--------------------|
| BP1 | **Managing underperformance** | [Fair Work — Underperformance](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/managing-underperformance) | T7 (Warning), T13 (PIP), C6–C10 |
| BP2 | **Effective dispute resolution** | [Fair Work — Dispute resolution](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/effective-dispute-resolution) | F2 (Grievance Procedure) |
| BP3 | **Employing young workers** | [Fair Work — Young workers](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/an-employers-guide-to-employing-young-workers) | T1 (Employment Contract), T6 (Induction), A7 (Pre-employment medical) |
| BP4 | **Flexible working arrangements** | [Fair Work — Flexible work](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/flexible-working-arrangements) | F1 policies, employment contracts |
| BP5 | **Consultation and cooperation** | [Fair Work — Consultation](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/consultation-and-cooperation-in-the-workplace) | Host employer communications |
| BP6 | **Individual flexibility arrangements** | [Fair Work — IFAs](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/use-of-individual-flexibility-arrangements) | Employment contracts, IFA clauses |
| BP7 | **Gender pay equity** | [Fair Work — Pay equity](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/gender-pay-equity) | Rate quotes, pay structures |
| BP8 | **Small business and Fair Work Act** | [Fair Work — Small business](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/small-business-and-the-fair-work-act) | All templates (GTO is typically small business) |
| BP9 | **Workplace privacy** | [Fair Work — Privacy](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/workplace-privacy) | A9 (Consent form), new starter forms, drug testing |
| BP10 | **Parental leave** | [Fair Work — Parental leave](https://www.fairwork.gov.au/tools-and-resources/best-practice-guides/parental-leave) | Employment contracts, leave policies |

> **Action:** Download BP1 (managing underperformance), BP2 (dispute resolution), and BP3 (young workers) as priority references. These directly inform the most frequently used GTO document types.

### Additional Templates Identified (T18–T21)

Based on the Fair Work official templates, add these to Phase 2:

#### T18: Letter of Resignation (Employee-Initiated)

**Purpose:** Template for apprentice/trainee to formally resign. GTO provides the template to ensure proper notice is given.

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{PERSON_ADDRESS}}
{{START_DATE}}
{{NOTICE_PERIOD}}
{{LAST_DAY}}
{{TODAY}}
```

#### T19: Request for Employment Records

**Purpose:** Employee request for copies of their employment records (pay slips, leave records, etc.).

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{RECORDS_REQUESTED}}    — Override: specific records requested
{{TODAY}}
```

#### T20: Notice to Take Annual Leave (Employer Direction)

**Purpose:** Direct an employee to take annual leave during a shutdown period or when excessive leave has accrued.
**Fair Work Requirements:**

- Must comply with award/agreement shutdown provisions
- Must give reasonable notice (typically 4 weeks for shutdowns)
- Employee must have enough leave accrued (or take unpaid if not)

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{LEAVE_START_DATE}}
{{LEAVE_END_DATE}}
{{LEAVE_BALANCE_HOURS}}
{{AWARD_NAME}}
{{SHUTDOWN_REASON}}      — Override: reason for direction
{{MANAGER_NAME}}
{{TODAY}}
```

#### T21: Agreement to Take Annual Leave in Advance

**Purpose:** Written agreement for employee to take annual leave before it has accrued.
**Fair Work Requirements:**

- Must be a genuine agreement (not a direction)
- Must be in writing
- If employment ends before leave is accrued, employer can deduct from final pay

**Merge Variables:**

```
{{TENANT_NAME}}
{{PERSON_FULL_NAME}}
{{LEAVE_START_DATE}}
{{LEAVE_END_DATE}}
{{LEAVE_HOURS_IN_ADVANCE}}
{{MANAGER_NAME}}
{{TODAY}}
```

---

## 6. Fair Work Resources — Reference Links

| Resource | URL |
|----------|-----|
| **Fair Work Ombudsman** | <https://www.fairwork.gov.au/> |
| **National Employment Standards** | <https://www.fairwork.gov.au/employment-conditions/national-employment-standards> |
| **Awards** | <https://www.fairwork.gov.au/employment-conditions/awards> |
| **Information Statements** | <https://www.fairwork.gov.au/employment-conditions/information-statements> |
| **Employment Contracts** | <https://www.fairwork.gov.au/employment-conditions/employment-contracts> |
| **Public Holidays** | <https://www.fairwork.gov.au/employment-conditions/public-holidays> |
| **Hours, Breaks & Rosters** | <https://www.fairwork.gov.au/employment-conditions/hours-of-work-breaks-and-rosters> |
| **Flexibility** | <https://www.fairwork.gov.au/employment-conditions/flexibility-in-the-workplace> |
| **Representational Rights** | <https://www.fairwork.gov.au/employment-conditions/representational-rights-and-responsibilities-in-the-workplace> |
| **Protections at Work** | <https://www.fairwork.gov.au/employment-conditions/protections-at-work> |
| **Transfer of Business** | <https://www.fairwork.gov.au/employment-conditions/when-businesses-change-owners> |
| **Bullying & Harassment** | <https://www.fairwork.gov.au/employment-conditions/bullying-sexual-harassment-and-discrimination-at-work> |
| **Workers Compensation** | <https://www.fairwork.gov.au/employment-conditions/workers-compensation> |
| **Apprentices & Trainees** | <https://www.fairwork.gov.au/starting-employment/types-of-employees/apprentices-and-trainees> |
| **Probation** | <https://www.fairwork.gov.au/starting-employment/probation> |
| **Dismissal** | <https://www.fairwork.gov.au/ending-employment/dismissal> |
| **Redundancy** | <https://www.fairwork.gov.au/ending-employment/redundancy> |
| **Fair Work Templates** | <https://www.fairwork.gov.au/tools-and-resources/templates> |
| **Fair Work Calculators** | <https://www.fairwork.gov.au/tools-and-resources/calculators> |
| **Employment Contract Tool** | <https://employ.business.gov.au/> |
| **Fair Work Act 2009** | <https://www.legislation.gov.au/C2009A00028/latest/text> |
| **Respect@Work** | <https://www.respectatwork.gov.au/> |
| **Safe Work Australia** | <https://www.safeworkaustralia.gov.au/> |
| **Young Workers Best Practice** | Local: `Fairwork/employing-young-workers-best-practice-guide.pdf` |

---

## 6. Implementation Notes

### Google Docs Template Authoring

1. Create each template in Google Docs under the GTO's Google Workspace
2. Use `{{VARIABLE_NAME}}` syntax for all merge fields (matching the Edge Function's `replaceAllText` pattern)
3. Share each template with the service account email: `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (key-less — authenticated via Workload Identity Federation)
4. Copy the Google Doc ID from the URL and store in `document_templates.google_doc_id`
5. Define merge variables in `document_templates.merge_variables` as JSON array

### Template Record Structure

```json
{
  "name": "Employment Contract (Apprentice/Trainee)",
  "category": "employment",
  "google_doc_id": "1abc...",
  "merge_variables": [
    { "key": "TENANT_NAME", "source": "tenant", "field": "name", "required": true },
    { "key": "PERSON_FULL_NAME", "source": "person", "field": "full_name", "required": true },
    { "key": "HOST_EMPLOYER_NAME", "source": "host_employer", "field": "name", "required": true },
    { "key": "QUALIFICATION_NAME", "source": "person", "field": "qualification_name", "required": true },
    { "key": "WARNING_LEVEL", "source": "override", "field": "warning_level", "required": false },
    { "key": "TODAY", "source": "system", "field": "today", "required": true }
  ],
  "signing_config": {
    "requires_signature": true,
    "signatories": [
      { "role": "Apprentice/Trainee", "entity_type": "person", "required": true },
      { "role": "GTO Officer", "entity_type": "system", "required": true },
      { "role": "Parent/Guardian", "entity_type": "override", "required": false }
    ]
  }
}
```

### Content Warnings

> **⚠️ IMPORTANT:** All template content must be drafted or reviewed by a qualified employment lawyer or HR professional before production use. This guide defines **structure and merge variables** only — it does not provide legal advice on template wording.
>
> The legacy templates are from previous employment and may contain:
>
> - Outdated award references (award names/codes change periodically)
> - Pre-Respect@Work harassment policy wording (positive duty commenced Dec 2023)
> - Pre-2023 casual employment changes (casual conversion pathways changed)
> - State-specific terminology (legacy was WA-focused; new GTO may operate nationally)
> - Company-specific branding and procedures from previous employer

---

## 7. WAAMS/DTWD Field Mapping & Data Sources

### Template Originality Statement

**No template in this guide contains word-for-word content from legacy templates.** The legacy files in `/home/braden/Downloads/Business Improvement-20260303T075644Z-3-001/` were used for **structural inspiration only** — to identify which document types a GTO needs and what fields they contain. All template specifications define only merge variable placeholders (`{{VARIABLE}}`), structural outlines, and compliance notes. Actual document prose must be drafted by a qualified employment lawyer.

### Regulatory Jurisdiction Map

Australian apprenticeship regulation operates at **two levels simultaneously**:

| Layer | Scope | Authority | Applies To |
|-------|-------|-----------|------------|
| **Federal** | Employment conditions, pay, leave, dismissal | Fair Work Commission + Fair Work Ombudsman | All templates (NES, Modern Awards, Fair Work Act 2009) |
| **Federal** | RTO registration & quality | ASQA (Australian Skills Quality Authority) | Training provider data, qualification scoping |
| **Federal** | Apprentice support services | Apprentice Connect Australia (replaced AASN from 1 Jul 2025) | AASN/ACA field in training contracts |
| **Federal** | Qualification standards | training.gov.au (National Register) | Qualification codes, UoC, ANZSCO |
| **State/Territory** | Training contract registration | State Training Authority (see below) | TC registration number, STA reference ID |
| **State/Territory** | Workers compensation | State WorkCover/WorkSafe body | WHS templates, injury reporting |
| **State/Territory** | Long service leave | State LSL legislation | Employment contracts (LSL clauses) |
| **State/Territory** | Child employment | State child employment laws | Under-18 apprentice conditions |

#### State Training Authorities (STAs)

| State | Authority | System | Reference ID Field |
|-------|-----------|--------|--------------------|
| **WA** | DTWD (Dept of Training & Workforce Development) | WAAMS / TYIMS | `sta_reference_id` = TYIMS Application Id |
| **VIC** | VRQA (Victorian Registration & Qualifications Authority) | Epsilon | `sta_reference_id` = Epsilon record ID |
| **NSW** | Training Services NSW | Smart & Skilled | `sta_reference_id` = Contract number |
| **QLD** | DESBT (Dept of Employment, Small Business & Training) | DELTA | `sta_reference_id` = DELTA ID |
| **SA** | DfE (Dept for Education) | STELA | `sta_reference_id` = STELA ID |
| **TAS** | Skills Tasmania | — | `sta_reference_id` = TC number |
| **ACT** | Skills Canberra | — | `sta_reference_id` = Registration number |
| **NT** | Dept of Industry, Tourism & Trade | — | `sta_reference_id` = Registration number |

**Key dates for legislation currency (verified March 2026):**

- Fair Work Act 2009 — current, includes Closing Loopholes amendments (Dec 2024)
- Respect@Work positive duty — commenced 12 Dec 2023 (all harassment/discrimination templates must reflect this)
- Casual employment definition change — commenced 26 Aug 2024 (casual conversion pathway)
- Apprentice Connect Australia — replaced AASN network from 1 Jul 2025
- Priority Hiring Incentive — reduced from $5,000 to $2,500 from 1 Jan 2026
- Key Apprenticeship Program — $5,000 employer incentive introduced 1 Jan 2026

### WAAMS Extract → CRM Field Mapping (55 columns)

Source: `Apprenticeships master list WAAMS.xlsx - Plumbing.csv` (WA DTWD extract — real apprentice data used for field identification only, **no real details stored in templates**)

#### Person Fields (→ `people` table)

| # | WAAMS Column | CRM Field | DB Column | Merge Variable | Status |
|---|-------------|-----------|-----------|----------------|--------|
| 3 | Apprentice (full name) | First + Last name | `first_name`, `last_name` | `{{PERSON_FULL_NAME}}` | ✅ Exists |
| 32 | Apprentice Primary Email | Email | `email` | `{{PERSON_EMAIL}}` | ✅ Exists |
| 33 | Apprentice Home Phone | Phone | `phone` | `{{PERSON_PHONE}}` | ✅ Exists |
| 34 | Apprentice Residential Address | Address | `address` (JSONB) | `{{PERSON_ADDRESS}}` | ✅ Exists |
| 35 | Apprentice Date of Birth | Date of birth | `date_of_birth` | `{{PERSON_DOB}}` | ✅ Exists |
| 36 | Apprentice Indigenous Status | Indigenous status | `indigenous_status` | `{{PERSON_INDIGENOUS_STATUS}}` | ✅ Added (migration 007) |
| 37 | Apprentice Language Spoken | Language | `language_spoken_at_home` | `{{PERSON_LANGUAGE}}` | ✅ Added (migration 007) |
| 38 | Apprentice Current School Level | Current school level | `current_school_level` | `{{PERSON_CURRENT_SCHOOL_LEVEL}}` | ✅ Added (migration 007) |
| 39 | Apprentice Highest School Level | Highest school level | `highest_school_level` | `{{PERSON_HIGHEST_SCHOOL_LEVEL}}` | ✅ Added (migration 007) |
| 40 | Apprentice Gender | Gender | `gender` | `{{PERSON_GENDER}}` | ✅ Added (migration 007) |
| 41 | Apprentice Citizenship | Citizenship | `citizenship_status` | `{{PERSON_CITIZENSHIP}}` | ✅ Added (migration 007) |
| 42 | Apprentice Country Of Birth | Country of birth | `country_of_birth` | `{{PERSON_COUNTRY_OF_BIRTH}}` | ✅ Added (migration 007) |
| 43 | Apprentice Injury or Disability | Disability flag | `disability_or_injury` | `{{PERSON_DISABILITY}}` | ✅ Added (migration 007) |
| 10 | Parent/Guardian | Parent/guardian name | `parent_guardian_name` | `{{PARENT_GUARDIAN_NAME}}` | ✅ Added (migration 007) |
| 19 | Is Existing Worker? | Existing worker flag | `is_existing_worker` | — | ✅ Added (migration 007) |
| 22 | Is School Based? | School-based flag | `is_school_based` | — | ✅ Added (migration 007) |
| 23 | School | School name | `school_name` | `{{SCHOOL_NAME}}` | ✅ Added (migration 007) |
| 24 | Is Custodial? | Custodial flag | `is_custodial` | — | ✅ Added (migration 007) |
| 18 | Hours Per Week | Hours per week | `hours_per_week` | `{{HOURS_PER_WEEK}}` | ✅ Added (migration 007) |
| — | ANZSCO code | ANZSCO code | `anzsco_code` | `{{ANZSCO_CODE}}` | ✅ Added (migration 007) |
| — | ANZSCO title | ANZSCO title | `anzsco_title` | `{{ANZSCO_TITLE}}` | ✅ Added (migration 007) |

#### Training Contract Fields (→ `training_contracts` table)

| # | WAAMS Column | CRM Field | DB Column | Merge Variable | Status |
|---|-------------|-----------|-----------|----------------|--------|
| 1 | Training Contract ID | Registration number | `registration_number` | `{{TC_REGISTRATION_NUMBER}}` | ✅ Exists |
| 2 | TC Status | Status | `status` | `{{TC_STATUS}}` | ✅ Exists |
| 4 | Qualification | Qualification ref | `qualification_id` → qualifications | `{{QUALIFICATION_CODE}}`, `{{QUALIFICATION_TITLE}}` | ✅ Exists |
| 5 | TC Start Date | Start date | `start_date` | `{{TC_START_DATE}}` | ✅ Exists |
| 6 | TC Expiry Date | Expected end date | `expected_end_date` | `{{TC_EXPIRY_DATE}}` | ✅ Exists |
| 7 | Actual End Date | Actual end date | `actual_end_date` | `{{TC_ACTUAL_END_DATE}}` | ✅ Exists |
| 11 | AASN/AASS | AASN provider | `aasn_provider` | `{{AASN_PROVIDER}}` | ✅ Exists |
| 12 | RTO | Training provider | → `training_companies` table | `{{RTO_NAME}}`, `{{RTO_CODE}}` | ✅ Exists (via FK) |
| 13 | Traineeship/Apprenticeship | Employment type | `people.employment_type` | `{{EMPLOYMENT_TYPE}}` | ✅ Exists |
| 14 | TC Term (Months) | Term in months | `term_months` | `{{TC_TERM_MONTHS}}` | ✅ Added (migration 007) |
| 15 | Attendance Type | Attendance type | `attendance_type` | `{{ATTENDANCE_TYPE}}` | ✅ Added (migration 007) |
| 16 | Employment Arrangement Type | Employment arrangement | `employment_arrangement` | `{{EMPLOYMENT_ARRANGEMENT}}` | ✅ Added (migration 007) |
| 17 | Agreement/Award | Award reference | `award_agreement_reference` | `{{AWARD_AGREEMENT}}` | ✅ Added (migration 007) |
| 20 | Intended Occupation (WAAMS) | TC type code | `tc_type` | `{{TC_TYPE}}` | ✅ Added (migration 007) |
| 21 | TC Type | Apprenticeship type | `tc_type` | — | ✅ Added (migration 007) |
| 25 | Eligible for Funding | Funding eligibility | `eligible_for_funding` | — | ✅ Added (migration 007) |
| 26 | TC Signed Date | Signed date | `tc_signed_date` | `{{TC_SIGNED_DATE}}` | ✅ Added (migration 007) |
| 27 | Training Contract Registration Date | Registration date | `tc_registration_date` | `{{TC_REGISTRATION_DATE}}` | ✅ Added (migration 007) |
| 28 | Probation End Date | Probation end | `probation_end_date` | `{{PROBATION_END_DATE}}` | ✅ Exists |
| 29 | TYIMS Application Id | STA reference | `sta_reference_id` | — | ✅ Added (migration 007) |
| 30 | Suspension End Date | Suspension end | `suspension_end_date` | `{{SUSPENSION_END_DATE}}` | ✅ Added (migration 007) |
| 31 | Suspension Effective Date | Suspension start | `suspension_start_date` | `{{SUSPENSION_START_DATE}}` | ✅ Added (migration 007) |

#### Employer/Worksite Fields (→ `clients` table)

| # | WAAMS Column | CRM Field | DB Column | Merge Variable | Status |
|---|-------------|-----------|-----------|----------------|--------|
| 8 | Worksite | Worksite name/address | `name`, `address` (via `is_worksite`) | `{{WORKSITE_NAME}}`, `{{WORKSITE_ADDRESS}}` | ✅ Added (migration 007) |
| 9 | Employer | Employer name | `name` | `{{HOST_EMPLOYER_NAME}}` | ✅ Exists |
| 44 | Employer Email | Employer email | `email` | `{{HOST_EMPLOYER_EMAIL}}` | ✅ Added (migration 007) |
| 45 | Employer Telephone | Employer phone | `phone` | `{{HOST_EMPLOYER_PHONE}}` | ✅ Added (migration 007) |
| 46 | Employer Physical Address | Employer address | `address` | `{{HOST_EMPLOYER_ADDRESS}}` | ✅ Exists |
| 47 | Employer ANZSIC | Industry code | `anzsic_code` | `{{HOST_EMPLOYER_ANZSIC}}` | ✅ Added (migration 007) |
| 48 | Employer STARS Organisation ID | STA org ID | `stars_org_id` | — | ✅ Added (migration 007) |
| 49 | Employer ASRI ID | ASRI ID | `asri_id` | — | ✅ Added (migration 007) |
| 50 | Worksite Email | Worksite email | `email` (on worksite client) | `{{WORKSITE_EMAIL}}` | ✅ Added (migration 007) |
| 51 | Worksite Telephone | Worksite phone | `phone` (on worksite client) | `{{WORKSITE_PHONE}}` | ✅ Added (migration 007) |
| 52 | Worksite Physical Address | Worksite address | `address` (on worksite client) | `{{WORKSITE_ADDRESS}}` | ✅ Exists |
| 53 | Worksite STARS Organisation ID | Worksite STA org ID | `stars_org_id` (on worksite) | — | ✅ Added (migration 007) |
| 54 | Employer Business Name | Employer name | `name` | `{{HOST_EMPLOYER_NAME}}` | ✅ Exists |
| 55 | Employer ABN | Employer ABN | `abn` | `{{HOST_EMPLOYER_ABN}}` | ✅ Exists |

### Training.gov.au Qualification & UoC Merge Variables

From the TGA API integration (`tga-search` Edge Function), these fields are available for document templates:

#### Qualification Fields (→ `qualifications` table / TGA API)

| Merge Variable | Source | Description |
|----------------|--------|-------------|
| `{{QUALIFICATION_CODE}}` | `qualifications.code` | e.g. "CPC32420" |
| `{{QUALIFICATION_TITLE}}` | `qualifications.title` | e.g. "Certificate III in Plumbing" |
| `{{QUALIFICATION_LEVEL}}` | TGA API `qualificationLevel` | e.g. "Certificate III", "Certificate IV", "Diploma" |
| `{{TRAINING_PACKAGE_CODE}}` | `qualifications.training_package_code` | e.g. "CPC" (Construction, Plumbing and Services) |
| `{{TRAINING_PACKAGE_TITLE}}` | TGA API `trainingPackage.title` | e.g. "CPC - Construction, Plumbing and Services" |
| `{{QUALIFICATION_STATUS}}` | TGA API `status` | e.g. "Current", "Superseded" |
| `{{ANZSCO_CODE}}` | TGA API `anzsco.code` → `people.anzsco_code` | e.g. "334111" |
| `{{ANZSCO_TITLE}}` | TGA API `anzsco.name` → `people.anzsco_title` | e.g. "Plumber (General)" |
| `{{NRT_FLAG}}` | TGA API `nrtFlag` | Nationally Recognised Training flag |

#### Units of Competency Fields (for competency assessment templates G1–G11)

| Merge Variable | Source | Description |
|----------------|--------|-------------|
| `{{UOC_CODE}}` | `units_of_competency.code` | e.g. "CPCPCM2043" |
| `{{UOC_TITLE}}` | `units_of_competency.title` | e.g. "Carry out WHS requirements" |
| `{{UOC_TYPE}}` | Unit grid `type` | "Core" or "Elective" |
| `{{UOC_STATUS}}` | TGA API | "Current", "Superseded" |
| `{{COMPETENCY_RESULT}}` | Override | "Competent" / "Not Yet Competent" |
| `{{COMPETENCY_DATE}}` | Override | Date assessed |
| `{{ASSESSOR_NAME}}` | Override | Name of workplace assessor |
| `{{TOTAL_CORE_UNITS}}` | TGA packaging | Total core units in qualification |
| `{{TOTAL_ELECTIVE_UNITS}}` | TGA packaging | Total elective units required |
| `{{COMPLETED_UNITS}}` | `people.competencies_completed` | Count of completed UoCs |
| `{{TOTAL_UNITS}}` | `people.competencies_total` | Total UoCs in qualification |
| `{{PROGRESS_PERCENT}}` | `people.progress` | Overall completion percentage |

### Tenant Branding Fields (→ `tenants` table — expanded in migration 007)

| Merge Variable | DB Column | Added |
|----------------|-----------|-------|
| `{{TENANT_NAME}}` | `tenants.name` | Existing |
| `{{TENANT_LEGAL_NAME}}` | `tenants.legal_name` | Migration 007 |
| `{{TENANT_ABN}}` | `tenants.abn` | Existing |
| `{{TENANT_ACN}}` | `tenants.acn` | Migration 007 |
| `{{TENANT_ADDRESS}}` | `tenants.address` (JSONB) | Existing |
| `{{TENANT_PHONE}}` | `tenants.phone` | Migration 007 |
| `{{TENANT_EMAIL}}` | `tenants.email` | Migration 007 |
| `{{TENANT_WEBSITE}}` | `tenants.website` | Migration 007 |
| `{{TENANT_LOGO_URL}}` | `tenants.logo_url` | Migration 007 |
| `{{TENANT_INDUSTRY}}` | `tenants.industry` | Existing |
| `{{TENANT_STATE}}` | `tenants.operating_state` | Migration 007 |

### Complete Merge Variable Master List

All merge variables available to document templates, grouped by data source:

| Category | Count | Source Table(s) |
|----------|-------|-----------------|
| Tenant branding | 11 | `tenants` |
| Person identity | 8 | `people` (name, email, phone, DOB, address, employee #) |
| Person demographics | 10 | `people` (AVETMISS/WAAMS fields) |
| Person training | 8 | `people` (qualification, trade, USI, AASN, year level) |
| Person compliance | 5 | `people` (police check, WWCC, white card) |
| Training contract | 14 | `training_contracts` |
| Host employer | 8 | `clients` (where `is_host_employer = true`) |
| Worksite | 5 | `clients` (where `is_worksite = true`) |
| Qualification (TGA) | 9 | `qualifications` / TGA API |
| Unit of competency | 12 | `units_of_competency` / TGA API |
| RTO/Training provider | 3 | `training_companies` |
| System | 2 | Computed (`TODAY`, `DOCUMENT_REF`) |
| Override (user-supplied) | Variable | Per-template (e.g. `WARNING_LEVEL`, `SHUTDOWN_REASON`) |
| **Total** | **~95** | |

---

## 8. Next Steps

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Create Phase 1 Google Docs templates (T1–T6) | GTO Admin + Legal Review | P1 |
| 2 | Seed `document_templates` table with template records | Dev | P1 |
| 3 | Test document generation flow end-to-end | Dev | P1 |
| 4 | Create Phase 2 templates (T7–T13) | GTO Admin | P2 |
| 5 | Create Phase 3 templates (T14–T17) | GTO Admin | P2 |
| 6 | Build competency assessment templates (G1–G11) as needed | Trade-specific | P3 |
| 7 | Integrate Fair Work pay calculator API (if available) for auto-populating rates | Dev | P3 |
| 8 | Add `document_templates` management UI in CRM7 | Dev | P2 |
