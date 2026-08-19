# Xero Field Map — What Rate Data Can Come From Xero vs What We Hardcode

**Status:** Draft (D) — for operator review before merge
**Author:** Research lane D0b (Claude Code, read-only research pass)
**Date:** 2026-07-29
**Source of truth for the link list:** `docs/references/20260729-Xero-API-docs.md`
**Fetch method:** `r.jina.ai` proxy (renders Xero's JS-heavy docs to markdown) via plain `curl`, verified working after `WebFetch` timed out twice per the lane brief. All 47 in-scope URLs were fetched successfully (two required a one-time retry after landing on a cookie-consent-only render; both retries succeeded — see §6). No page in scope failed to load. Raw fetched pages are cached at `/tmp/claude-1000/.../scratchpad/xero/*.md` (session-local, not committed).

**Hard rule applied:** every claim below is either (a) a direct quote/paraphrase of a specific Xero doc page, cited inline by URL, or (b) explicitly marked as inference from our own codebase, never blended silently. Where a previous pass asserted "payroll tax is categorically absent from Xero's API surface" without reading a single page, this pass opened every Payroll AU page, the Accounting TaxRates page, and grepped the full corpus of 47 fetched pages for the literal strings `payroll tax` / `payrolltax` (case-insensitive) — zero hits anywhere. That is the evidence, not a repeated assumption. See §1.2.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Answer to the operator's question

**Question:** which rate values can be pulled from Xero instead of hardcoded/hand-entered in our source?

Grepping `R80.3/src` turned up the following hardcoded/user-entered rate constants (cited with file:line so this table isn't a guess about our own code either):

- `R80.3/src/utils/calcBridge.ts:39` — `superRate: 0.12` (SG rate, comment: "12% superannuation (SG rate from 1 July 2025)")
- `R80.3/src/utils/calcBridge.ts:40` — `wcRate: 0.047` ("4.7% workers' compensation")
- `R80.3/src/utils/calcBridge.ts:41` — `payrollTaxRate: 0.0485` ("4.85% payroll tax")
- `R80.3/src/utils/calcBridge.ts:42` — `leaveLoading: 0.175` ("17.5% leave loading")
- `R80.3/src/utils/calcBridge.ts:336` — `otOncostFactor: 0.12` (comment: "Default; R80.3 doesn't have UI for this yet")
- `R80.3/src/services/paydaySuperService.ts:131` — `export const CURRENT_SG_RATE = 0.12`
- `R80.3/src/utils/calculatorValidation.ts:68` — validation warn-message hardcodes "Standard leave loading is 17.5%"

### 1.1 Table: our hardcoded rate → Xero capability

| Our hardcoded value | Xero entity + field | What Xero actually exposes | Verdict | Source URL |
|---|---|---|---|---|
| `superRate` (SG %, e.g. 0.12) | `SuperannuationLine.CalculationType` = `STATUTORY` \ | `PERCENTAGEOFEARNINGS` \ **Computed amount yes, live statutory rate as a standalone field NO.** Xero's own `SuperannuationContributionType`/`LeaveTypeContributionType` enum tables still literally say `"SGC Mandatory 9% contribution"` — stale text (actual SG rate has been 12% since 1 July 2025 per our own `calcBridge.ts` comment); this is a Xero documentation-drift finding, not evidence of a queryable current rate. `payrollau/payslip` §"Elements for a SuperannuationLine" and `payrollau/types-and-codes` §"SuperannuationContributionType" / §"SuperannuationCalculationType" — https://developer.xero.com/documentation/api/payrollau/payslip and https://developer.xero.com/documentation/api/payrollau/types-and-codes | `FIXEDAMOUNT`; `SuperannuationLine.Percentage` | When `CalculationType=STATUTORY`, Xero computes the SG contribution internally against the ATO-mandated rate — **the numeric rate itself is not returned as a queryable field**, only the resulting `Amount`/`Percentage` actually applied on a given payslip line. When `CalculationType=PERCENTAGEOFEARNINGS`, **we** (or the org admin) supply the `Percentage` — Xero doesn't source it. |
| `wcRate` (workers' comp %) | — | **No workers'-compensation rate entity anywhere in the Payroll AU API.** Not in Settings, not in Types and Codes, not in PayItems. Confirmed by full-text grep of all 47 fetched pages for `workers.?comp` (case-insensitive) — the only hit is the `WORKERSCOMPENSATION` `EarningsType` enum value (a payment-classification tag on an EarningsRate, not a rate/percentage). | **No.** Xero has no concept of a WIC-code-based WC premium rate; that's insurer/state-scheme data, entirely outside Xero's domain. | https://developer.xero.com/documentation/api/payrollau/types-and-codes (EarningsType table) |
| `payrollTaxRate` (state payroll tax %) | — | **Nothing.** See §1.2 below — this is the retracted claim, re-verified from primary sources this pass. | **No, confirmed negative.** State payroll tax is not a Xero concept anywhere in the Payroll AU or Accounting APIs. | See §1.2 citations |
| `leaveLoading` (0.175 / 17.5%) | `LeaveType.LeaveLoadingRate` (on PayItems); `Employee.EligibleToReceiveLeaveLoading` / `IncludeLeaveLoadingInSGC` / `IncludeLeaveLoadingInQualifyingEarnings` | **Yes — this one Xero genuinely has.** `LeaveLoadingRate`: *"Enter an amount here if your organisation pays an additional percentage on top of ordinary earnings when your employees take leave (typically 17.5%)."* Employee-level `EligibleToReceiveLeaveLoading`: *"...typically 17.5%..."*. Both are org-entered values (Xero doesn't derive 17.5% from an award; it's whatever the org typed in), but once entered they ARE queryable via GET PayItems / GET Employees. | **Partial win.** If a client's Xero org has correctly configured `LeaveLoadingRate` on their Annual Leave `LeaveType`, we could read it via `GET /PayItems` instead of assuming 17.5%. Still garbage-in-garbage-out — Xero doesn't validate it against any award. | `payrollau/payitems` §"Elements for LeaveTypes" and `payrollau/employees` (line ~83 `EligibleToReceiveLeaveLoading`) — https://developer.xero.com/documentation/api/payrollau/payitems and https://developer.xero.com/documentation/api/payrollau/employees |
| `otOncostFactor` (overtime multiplier, e.g. 1.5 for time-and-a-half) | `EarningsRate.Multiplier` (V1 PayItems) / `EarningsRate.multipleOfOrdinaryEarningsRate` (V2), used when `RateType = MULTIPLEOFORDINARYEARNINGSRATE` | **Yes.** *"This is the multiplier used to calculate the rate per unit, based on the employee's ordinary earnings rate. For example, for time and a half enter 1.5."* Directly queryable per earnings rate. | **Win, if configured.** Same caveat: it's whatever the org typed in when they set up the pay item in Xero, not derived from an award. | `payrollau/earningsrates` and `payrollau/payitems` §"Elements for EarningsRates" — https://developer.xero.com/documentation/api/payrollau/earningsrates |
| GST / general tax rate | Accounting API `TaxRates.DisplayTaxRate`, `TaxRates.EffectiveRate`, `TaxComponents[].Rate` | **Yes, cleanly.** `GET /TaxRates` returns e.g. `"Name": "15% GST on Expenses", "TaxType": "INPUT2", "DisplayTaxRate": "15.0000", "EffectiveRate": "15.0000"`. This is a real, queryable, org-scoped rate. Our `accounting.settings` scope (already granted per the operator's brief) covers this endpoint. | **Confirmed win — cheapest real integration.** | `accounting/taxrates` — https://developer.xero.com/documentation/api/accounting/taxrates |

### 1.2 The retracted claim, re-verified

**Claim being tested:** "payroll tax is categorically absent from Xero's API surface."

**Method:** every Payroll AU doc page was opened (not inferred from our code), plus the Accounting `TaxRates` page, plus the Settings page (which is the most likely place an employer-side levy would be surfaced as an account mapping), plus the Integration Guide (which walks through every setup step an integrator needs, including "what types of ex-tax deductions do I support"). I then grepped the full text of all 47 fetched pages for the literal strings `payroll tax` and `payrolltax` (case-insensitive, no word-boundary tricks) — **zero matches in any file.**

What Xero **does** expose that is tax-adjacent, so as not to conflate it with payroll tax:

- **PAYG withholding** (federal income-tax withholding) — `EarningsRate.IsSubjectToTax` / `IsExemptFromTax` (*"Payments of this type are subject to PAYG withholding"*), `TaxLine.TaxTypeName = "PAYG Tax"`, `ManualTaxType` enum (`PAYGMANUAL`, `ETPOMANUAL`, `ETPRMANUAL`, `SCHEDULE4MANUAL`, `SCHEDULE5MANUAL`). This is federal PAYG, not state payroll tax. — https://developer.xero.com/documentation/api/payrollau/earningsrates, https://developer.xero.com/documentation/api/payrollau/payslip, https://developer.xero.com/documentation/api/payrollau/types-and-codes
- **ETP tax rate** — the Payslip doc states *"Tax is calculated on taxable ETP earnings using a default rate of 32%. Manually adjust ETP tax to reflect the payee's scenario."* A federal rate, Xero-internal, not state payroll tax. — https://developer.xero.com/documentation/api/payrollau/payslip
- **Accounting `TaxRates`** returned a `"Name": "State Tax"` component in the example JSON — this is a **US sales-tax example** (`"Name": "Oakdale Sales Tax"`, components "State Tax" + "Local Sales Tax", i.e. US state sales tax, not Australian state payroll tax). Flagging explicitly so nobody later mistakes this string match for a positive result. — https://developer.xero.com/documentation/api/accounting/taxrates
- **Settings** (`payrollau/settings`) only returns account mappings (`SuperExpense`, `SuperLiability`, `WagesExpense`, `PAYGLiability`, `WagesPayable`), tracking categories, `DaysInPayrollYear`, `EmployeesAreSTP2`. No payroll-tax account type exists in the enum. — https://developer.xero.com/documentation/api/payrollau/settings

**Verdict: confirmed negative, now with primary-source evidence.** Australian state/territory payroll tax (the employer-side levy on total Australian wages above a state threshold, e.g. WA's `payrollTaxRate: 0.0485` in our own code) is not a Xero API concept anywhere in Payroll AU, Accounting, or the Settings/Types-and-Codes reference. This makes sense structurally — payroll tax is calculated at the legal-entity/group level across the whole business (often across multiple states and even multiple Xero orgs), not per pay item, so it doesn't fit Xero's per-organisation payroll data model. It has to stay a hand-maintained config value in R80.3, sourced from each state revenue office's published threshold/rate (as it already is).

---

## 2. Per-endpoint field map

### 2.1 Tier 1 — rate-sourcing endpoints (detail)

**Superannuation — three related endpoints, none of which expose the live SG %:**

- **`payrollau/settings`** (https://developer.xero.com/documentation/api/payrollau/settings) — `GET /Settings` returns `Accounts[]` (with `Type` values including `SUPERANNUATIONEXPENSE`, `SUPERANNUATIONLIABILITY`), `TrackingCategories[]`, `DaysInPayrollYear`, `EmployeesAreSTP2`. No rate field of any kind.
- **`payrollau/superfunds`** (https://developer.xero.com/documentation/api/payrollau/superfunds) — `SuperFundID`, `Type` (`REGULATED`|`SMSF`), `Name`, `ABN`, `USI`, `BSB`/`AccountNumber`/`AccountName` (SMSF only), `EmployerNumber`, `SPIN` (deprecated). No rate field — this endpoint is fund *identity*, not contribution rate.
- **`payrollau/superfundproducts`** (https://developer.xero.com/documentation/api/payrollau/superfundproducts) — `ABN`, `USI`, `SPIN` (deprecated), `ProductName`. Search-only lookup of regulated funds by ABN/USI. No rate field.
- **`payrollau/payslip`** (https://developer.xero.com/documentation/api/payrollau/payslip) §"Elements for a SuperannuationLine" — `SuperMembershipID`, `ContributionType` (`SGC`|`SALARYSACRIFICE`|`EMPLOYERADDITIONAL`|`EMPLOYEE`), `CalculationType` (`FIXEDAMOUNT`|`PERCENTAGEOFEARNINGS`|`STATUTORY`), `MinimumMonthlyEarnings` (deprecated, pre-1 July 2022 only), `ExpenseAccountCode`, `LiabilityAccountCode`, `PaymentDateForThisPeriod`, `Percentage`, `Amount`. **This is the only place a super percentage/amount is actually visible**, and only per-payslip-line, after the fact, and only if `CalculationType` isn't `STATUTORY` (in which case Xero applies its own internal rate and the field is the computed outcome, not an input).
- **`payrollau/employees`** (https://developer.xero.com/documentation/api/payrollau/employees) §"Elements for a SuperMembership" — `SuperFundID`, `EmployeeNumber`, `SuperMembershipID`. Again identity only. The `PayTemplate.SuperLines[]` default config carries `ContributionType`, `CalculationType`, `MinimumMonthlyEarnings`, `ExpenseAccountCode`, `LiabilityAccountCode` — still no bare percentage unless `CalculationType=PERCENTAGEOFEARNINGS`.
- **Types and Codes** (https://developer.xero.com/documentation/api/payrollau/types-and-codes) §"SuperannuationContributionType" / §"LeaveTypeContributionType" — both enum tables literally read `SGC | Mandatory 9% contribution`. **Finding:** this is stale documentation text in Xero's own docs (the SG rate has been 12% since 1 July 2025 per our own `calcBridge.ts:39` comment and ATO schedule) — it is not a live, queryable value and should not be read as Xero asserting "9%" is current. Flagging as a Xero-side doc-drift finding, distinct from anything in our code.

**Payroll tax:** see §1.2 above — confirmed absent, evidenced.

**GST / tax rates — Accounting API `TaxRates`** (https://developer.xero.com/documentation/api/accounting/taxrates):
`Name`, `TaxType` (update-only), `TaxComponents[]` (`Name`, `Rate` to 4dp, `IsCompound`, `IsNonRecoverable` — AU/NZ/Canada nuance), `Status`, `ReportTaxType` (required for AU/NZ/UK creation), `CanApplyToAssets`/`Equity`/`Expenses`/`Liabilities`/`Revenue`, `DisplayTaxRate`, `EffectiveRate`. `GET`, `PUT`, `POST` supported (no delete — status is set to `DELETED`/`ARCHIVED` via POST). System-defined tax rates (e.g. `INPUT2`/`OUTPUT2` GST rates) cannot be updated. Scope: `accounting.settings` (confirmed already granted per the operator's brief) — see §4.

**Earnings Rates / Pay Items** — two overlapping surfaces:

- **V2 `payrollau/earningsrates`** (https://developer.xero.com/documentation/api/payrollau/earningsrates) — `EarningsRateID`, `Name`, `EarningsType`, `RateType` (`FIXEDAMOUNT`|`MULTIPLEOFORDINARYEARNINGSRATE`|`RATEPERUNIT`), `TypeOfUnits`, `CurrentRecord`, `ExpenseAccountID`, `RatePerUnit`, `MultipleOfOrdinaryEarningsRate` (*"for time and a half enter 1.5"*), `FixedAmount`, `IsSubjectToTax`, `IsSubjectToSuper`, `IsQualifyingEarnings` (new — Payday Super), `IsReportableAsW1`, `AccrueLeave`, `EmploymentTerminationPaymentType`, `AllowanceType`, `AllowanceCategory`, `AllowanceContributesToAnnualLeaveRate`, `AllowanceContributesToOvertimeRate`.
- **V1 `payrollau/payitems`** (https://developer.xero.com/documentation/api/payrollau/payitems) — same EarningsRates concept with slightly different field names (`AccountCode` not `ExpenseAccountID`, `Multiplier` not `MultipleOfOrdinaryEarningsRate`, `Amount` not `FixedAmount`, `IsExemptFromTax`/`IsExemptFromSuper` — inverted boolean sense vs V2's `IsSubjectTo*`), plus **`DeductionTypes[]`** (`Name`, `DeductionCategory` = `UNIONFEES`|`WORKPLACEGIVING`|`NONE`, `AccountCode`, `ReducesTax`, `ReducesSuper`, `IsExemptFromW1`) and **`ReimbursementTypes[]`** (`Name`, `AccountCode`). `LeaveTypes[]` also lives here (see Leave below).
- **Allowance types enumerated** (https://developer.xero.com/documentation/api/payrollau/types-and-codes §AllowanceType): `CAR`, `TRANSPORT`, `TRAVEL`, `LAUNDRY`, `MEALS`, `TOOLS`, `TASKS`, `QUALIFICATIONS`, `OTHER`. **Finding:** Xero classifies allowances by *type* but does not carry any award-derived dollar/km rate schedule — the org enters `RatePerUnit`/`FixedAmount` by hand for each allowance. Xero has no concept of "the current ATO cents-per-km rate" or a GTO/award allowance schedule; it's a bare labelled bucket.

**Leave** — maps only partially onto our billable-weeks formula (`52 − annualLeave − publicHolidays − sickLeave − trainingWeeks`):

- **`LeaveCategory` enum** (https://developer.xero.com/documentation/api/payrollau/types-and-codes): `ANNUALLEAVE`, `LONGSERVICELEAVE`, `PERSONALSICKCARERSLEAVE`, `ROSTEREDDAYOFF`, `TIMEOFFINLIEU`, `COMPASSIONATEANDBEREAVEMENTLEAVE`, `FAMILYANDDOMESTICVIOLENCELEAVE`, `SPECIALPAIDLEAVE`, `COMMUNITYSERVICELEAVE` (SGC-exemptible), `JURYDUTYLEAVE` (SGC-exemptible), `DEFENCERESERVELEAVE` (SGC-exemptible). **Finding: there is no `PUBLICHOLIDAY` category and no `TRAINING`/apprenticeship-specific category.** Our billable-weeks formula's four inputs (`annualLeave`, `publicHolidays`, `sickLeave`, `trainingWeeks`) only cleanly map two of four onto native Xero categories (`ANNUALLEAVE`, `PERSONALSICKCARERSLEAVE`); public holidays and off-the-job training weeks would have to be force-fit into `SPECIALPAIDLEAVE` or a custom-named `LeaveType` carrying one of the existing category codes, since `LeaveCategoryCode` is a closed enum, not free text.
- **`payrollau/payitems`** §"Elements for LeaveTypes" — `Name`, `TypeOfUnits`, `IsPaidLeave`, `ShowOnPayslip`, `LeaveTypeID`, `NormalEntitlement`, `CurrentRecord`, `LeaveCategoryCode`, `SGCExempt`, `IsQualifyingEarnings`, plus (on the response object, not clearly in the create/update table but present in example JSON) `LeaveLoadingRate`.
- **`payrollau/leaveapplications`** (https://developer.xero.com/documentation/api/payrollau/leaveapplications) — `EmployeeID`, `LeaveTypeID`, `Title`, `StartDate`, `EndDate`, `Description`, `PayOutType` (`DEFAULT`|`CASHED_OUT`), `LeavePeriods[]` (`NumberOfUnits`, `PayPeriodStartDate`/`EndDate`, `LeavePeriodStatus`). Note the V1 endpoint only returns `SCHEDULED`/`PROCESSED` statuses; use the V2 endpoint (`/LeaveApplications/v2`) for the full status set including `REQUESTED`/`REJECTED`. Leave applications requiring approval cannot be created via the API (Xero UI / Xero Me only); cannot be cancelled/deleted via API either.
- **`payrollau/leavebalances`** (https://developer.xero.com/documentation/api/payrollau/leavebalances) — not a standalone entity; balances are returned nested under `GET /Employees/{id}`, fields `LeaveName`, `LeaveTypeID`, `NumberOfUnits`, `TypeOfUnits`. Cannot be set directly — driven by `LeaveLines` in `OpeningBalances`, by pay-run posting, or manually via `LeaveAccrualLine` on a Payslip. Can go negative (over-taken leave).
- **`payrollau/employees`** — `LeaveBalances[]` (read), `PayTemplate.LeaveLines[]` (`LeaveTypeID`, `CalculationType` = `NOCALCULATIONREQUIRED`|`FIXEDAMOUNTEACHPERIOD`|`ENTERRATEINPAYTEMPLATE`|`BASEDONORDINARYEARNINGS`, `EntitlementFinalPayPayoutType`, `EmploymentTerminationPaymentType`), `EligibleToReceiveLeaveLoading`, `IncludeLeaveLoadingInSGC`, `IncludeLeaveLoadingInQualifyingEarnings`, and on the Payslip side `SGCAppliedLeaveLoadingAmount` / `SGCExemptedLeaveLoadingAmount` (Annual Leave category only).

### 2.2 Tier 2 — remaining endpoints

| Endpoint | URL | Returns | BSuite use |
|---|---|---|---|
| Employees | https://developer.xero.com/documentation/api/payrollau/employees | Identity, `HomeAddress`, `TaxDeclaration` (TFN exemption, tax scale, residency, STP2 fields: `IncomeType`, `EmploymentType`, `TaxScaleType`, `WorkCondition`, `SeniorMaritalStatus`), `BankAccount[]`, `PayTemplate` (default earnings/deductions/super/reimbursement/leave lines), `OpeningBalances`, `LeaveBalances`, `SuperMembership`, `IsSTP2Qualified` | Identity + employment-basis sync source for people records; TFN/tax-scale fields are compliance-sensitive, not rate data |
| Pay Runs | https://developer.xero.com/documentation/api/payrollau/payruns | `PayrollCalendarID`, `PayRunID`, period dates, `PayRunStatus` (`DRAFT`\ Aggregate financial totals per run — post-hoc reconciliation source, not a rate source. Note: **"Effective November 2025, you can only create and post a single pay run per request."** | `POSTED`), `PaymentDate`, `PayslipMessage`, `Payslips[]`, and org-level totals `Wages`/`Deductions`/`Tax`/`Super`/`Reimbursement`/`NetPay` |
| Payslip | https://developer.xero.com/documentation/api/payrollau/payslip | Per-employee `EarningsLines`, `LeaveEarningsLines`, `TimesheetEarningsLines`, `DeductionLines`, `LeaveAccrualLines`, `ReimbursementLines`, `SuperannuationLines`, `TaxLines` | Line-item detail for a specific pay — richest single source of "what was actually applied," but always after Xero (or the org) has already computed it |
| Payroll Calendars | https://developer.xero.com/documentation/api/payrollau/payrollcalendars | `PayrollCalendarID`, `CalendarType` (`WEEKLY`\ `FOURWEEKLY`\ `MONTHLY`\ `TWICEMONTHLY`\ `QUARTERLY`), name, start date, payment date Cadence metadata for linking pay-run scheduling | `FORTNIGHTLY`\ |
| Timesheets | https://developer.xero.com/documentation/api/payrollau/timesheets | V2: `TimesheetID`, `PayrollCalendarID`, `EmployeeID`, `StartDate`/`EndDate`, `Status` (`Draft`\ `Approved`\ `Declined`\ `Completed`), `TotalHours`; supports approve/revert-to-draft/delete/line-level PUT/DELETE; filterable by `employeeId`, `payrollCalendarId`, `status`, date range Closest Xero surface to our own timesheet/Anytime-equivalent module — could be a sync target, not a rate source | `Requested`\ |
| Settings | https://developer.xero.com/documentation/api/payrollau/settings | Account-type mappings (`SuperExpense`/`SuperLiability`/`WagesExpense`/`PAYGLiability`/`WagesPayable`), `TrackingCategories`, `DaysInPayrollYear`, `EmployeesAreSTP2` | Confirms COA linkage only, see §1.2 |
| Types and Codes | https://developer.xero.com/documentation/api/payrollau/types-and-codes | Full enum reference for every field above (36 enums total, incl. `StateAbbreviations`, `TerminationReason`, `IncomeType`, `TaxScaleType`, `TFNExemptionType`, `ResidencyStatus`) | Canonical enum source if we ever build a Xero-facing dropdown |
| STP Changes | https://developer.xero.com/documentation/api/payrollau/stp-changes | STP Phase 2 migration log: `IncomeType`/`EmploymentType`/leave-restriction-by-employment-basis rules, `SGCExempt` semantics, leave-loading STP2 reporting change history | Background/compliance context, not fetched in full depth this pass — grepped for super/leave-loading terms only |
| STP Changes (examples) | https://developer.xero.com/documentation/api/payrollau/stp-changes-employees-examples | XML/JSON before/after examples of STP2 employee payload changes | Fetched (19KB, real content), scanned via grep for `IsExemptFromSuper`, not deep-read line by line |
| Release notes | https://developer.xero.com/documentation/api/payrollau/release-notes | Changelog incl. the new `IsQualifyingEarnings` field (Payday Super compliance) added to EarningsRates/PayItems/LeaveTypes/TaxDeclaration | Fetched and grepped for super/rate terms; confirms Payday Super rollout is recent/ongoing but does not surface a numeric SG rate anywhere |
| Integration guide | https://developer.xero.com/documentation/api/payrollau/integration-guide | End-to-end setup sequence: Payroll Accounts → Pay Items → Payroll Calendars → Super Funds → Employees → Timesheets/Leave → Pay Runs. Confirms "Award Information" is only ever a bare `EarningsRateID` reference — **Xero has no award/classification database of its own; the integrator supplies award-derived rates and Xero just stores/applies them.** | Confirms our earlier structural assumption that Xero is not an award-rates source, now cited to the actual page instead of assumed |
| Overview | https://developer.xero.com/documentation/api/payrollau/overview | Base URL `payroll.xro/1.0/`, pagination (100/page), requires org on Standard/Premium subscription + user with Payroll Admin permission | Baseline access-requirement note |

---

## 3. Operational rules (Tier 3)

| Rule | Key points | Source |
|---|---|---|
| **Rate limits** | Per-tenant: 5 concurrent, 60/min, 1,000/day (starter tier) or 5,000/day (Core+). App-wide: 10,000/min across all tenants. 429 responses carry `Retry-After` + `X-Rate-Limit-Problem` headers. | https://developer.xero.com/documentation/best-practices/api-call-efficiencies/rate-limits, https://developer.xero.com/documentation/guides/oauth2/limits |
| **Paging** | `?page=n`, default 100/call, up to 1000 via `pageSize` on some endpoints. List responses omit heavy nested detail (e.g. invoice line items) — fetch by ID or use paging to get full detail. | https://developer.xero.com/documentation/best-practices/api-call-efficiencies/paging |
| **If-Modified-Since** | UTC timestamp header, conditional GET, 304 if nothing changed. Supported on Invoices, Contacts, Items, Journals, ManualJournals, BankTransactions, CreditNotes, **Employees**, Payments, PurchaseOrders, OverPayments, PrePayments, Quotes, Users (also confirmed on Payroll AU `SuperFunds`/`LeaveApplications`/`PayRuns` per their own docs). Recommend only pulling invoices from the past two years. | https://developer.xero.com/documentation/best-practices/api-call-efficiencies/if-modified-since |
| **Filtering** | `where=` SQL-like clause (`==`,`!=`,`<`,`<=`,`>`,`>=`,`StartsWith()`,`Contains()`,`AND`/`OR`); dedicated params (`IDs=`, `ContactIDs=`, `Statuses=`) are faster than `where`; `summaryOnly=true` strips heavy nested fields (Invoices/Contacts); `order=` for sort. | https://developer.xero.com/documentation/best-practices/api-call-efficiencies/filtering |
| **Caching** | Fetch once, store with timestamp, re-poll only via `If-Modified-Since` using the stored timestamp. No certification requirement but strongly recommended for high-volume data. | https://developer.xero.com/documentation/best-practices/api-call-efficiencies/caching-data |
| **Reducing polling** | Prefer webhooks (event-driven) over scheduled polling. Where webhooks aren't available, combine `where`/If-Modified-Since/paging ("smart filtering") + local caching; if polling is unavoidable use exponential backoff and infrequent intentional schedules. | https://developer.xero.com/documentation/best-practices/api-call-efficiencies/reducing-polling |
| **Idempotent requests** | `Idempotency-Key` header on POST/PUT/PATCH only; cached response replayed on retry with same key; keys expire after 6 minutes; reusing a key with a *different* request body/URL/method returns 400; recommend 4 concatenated UUIDs. Idempotency check happens **after** rate-limit check (duplicate attempts still consume quota). | https://developer.xero.com/documentation/best-practices/data-integrity/idempotency |
| **Managing tokens/IDs** | `access_token` ~30min, `refresh_token` ~60 days (rotates on every use — old one invalidated immediately), `id_token` only with `openid` scope. Store `tenant_id`/`tenant_name`/`authEventId` from `/connections`. Encrypt tokens at rest; never store plaintext; pass `xero-tenant-id` explicitly per-request, never via thread-local/ambient state in concurrent code. | https://developer.xero.com/documentation/best-practices/data-integrity/managing-tokens |
| **Multi-tenancy** | One access token can cover many tenants; `xero-tenant-id` header selects which one per call. Offer manual and/or automatic tenant-to-entity mapping (e.g. via `Organisation.TaxNumber` as an automatic-mapping key). Not required for certification unless implemented, but reviewed against data-mixing risk if it is. | https://developer.xero.com/documentation/best-practices/managing-connections/multi-tenancy |
| **Connection cleanup / identifying inactive connections** | Token expiry does **not** auto-remove a connection — must explicitly `DELETE /connections/{connectionId}` (per-tenant) or `POST /connect/revocation` (user-level, removes all that user's tenants). Xero doesn't track "last used" — track `last_successful_api_call_utc` ourselves. Suggested thresholds: Active (<30d), At-risk (31–60d, refresh still valid), Inactive-token-alive (>60d or repeated 304s), Inactive-refresh-expired (`invalid_grant`). Recommended weekly cleanup job, ahead of the 60-day refresh-token window. | https://developer.xero.com/documentation/best-practices/managing-connections/identifying-inactive-connections, https://developer.xero.com/documentation/best-practices/managing-connections/designing-and-implementing-connection-cleanup-routine |
| **Account & payment mapping** | Never free-text account codes — dropdown from `GET /Accounts`, filtered by type/status (exclude `ARCHIVED`), default to a sensible match (e.g. "Sales"), never silently auto-create accounts. Payments need an account with `EnablePaymentsToAccount=true` and `Type=="BANK"`. Overpayments use system accounts 610 (AR) / 800 (AP) (US: 1200/2000). | https://developer.xero.com/documentation/best-practices/categorising-transactions/account-mapping |
| **Items mapping** | `Items` (Products & Services) carry default account + tax rate + description; referencing `ItemCode` alone in a line item is valid and auto-populates account/tax. | https://developer.xero.com/documentation/best-practices/categorising-transactions/items-mapping |
| **Tracking category mapping** | Max **two active + two archived** tracking categories per org — hard ceiling, not a suggestion. | https://developer.xero.com/documentation/best-practices/categorising-transactions/tracking-category-mapping |
| **Contact mapping** | Uni- or bidirectional sync; use `ContactID` (or `ContactNumber` — one per contact, check for collisions first) as the foreign key, never contact name. `If-Modified-Since` or webhooks for incremental sync. `IsCustomer`/`IsSupplier` are set automatically by Xero the first time an ACCREC/ACCPAY document references the contact — not settable directly on creation. Exclude `ARCHIVED` contacts (excluded from GET by default). | https://developer.xero.com/documentation/best-practices/data-integrity/contacts |
| **Rounding** | Xero rounds tax **per line** (2dp) then sums — can differ from a document-level total-then-tax approach by a cent. `unitdp=4` query param opts into 4dp unit prices (summary totals stay 2dp). Add an explicit rounding adjustment line against the org's `SystemAccount: "ROUNDING"` account rather than fighting the variance. `TaxAmount` can be manually overridden on invoice lines but Xero doesn't recommend it (cannot exceed `UnitAmount`). | https://developer.xero.com/documentation/best-practices/data-integrity/rounding, https://developer.xero.com/documentation/guides/how-to-guides/rounding-in-xero |
| **Taxes** | If `TaxType` isn't supplied, Xero falls back to the *account's* default tax rate — Contact/Item/Invoice defaults are all ignored. Invoices/CreditNotes/POs default Tax-Exclusive; Receipts/BankTransactions default Tax-Inclusive; ManualJournals default No-Tax. AU/NZ/UK require a `ReportTaxType` on rate creation for correct sales-tax-return categorisation; US orgs have more freedom (no reliance on defaults). Certification requires using Xero's own tax rates (map, don't invent, unless US). | https://developer.xero.com/documentation/best-practices/data-integrity/taxes, https://developer.xero.com/documentation/guides/how-to-guides/tax-in-xero |

---

## 4. OAuth scopes + connection types (Tier 4)

### 4.1 `payroll.*` scopes (exact enumeration)

Source: https://developer.xero.com/documentation/guides/oauth2/scopes §"Payroll API Australia"

| Scope | Description | Resources granted |
|---|---|---|
| `payroll.employees` | View and manage employees | `Employees`, `LeaveApplications` |
| `payroll.employees.read` | View employees (GET only) | as above |
| `payroll.payruns` | View and manage pay runs | `Payruns` |
| `payroll.payruns.read` | View pay runs (GET only) | as above |
| `payroll.payslip` | View and manage payslips | `Payslips` |
| `payroll.payslip.read` | View payslips (GET only) | as above |
| `payroll.timesheets` | View and manage timesheets | `Timesheets` |
| `payroll.timesheets.read` | View timesheets (GET only) | as above |
| `payroll.settings` | View and manage payroll settings | `Settings`, `PayrollCalendars`, `PayItems`, `SuperFunds`, `SuperFundProducts` |
| `payroll.settings.read` | View payroll settings (GET only) | as above |

**Finding:** the V2 `EarningsRates` endpoint (https://developer.xero.com/documentation/api/payrollau/earningsrates) is not explicitly listed as a "Resource" under any scope row on the scopes page — it's presumably covered by `payroll.settings` alongside V1 `PayItems` (which does list `EarningsRates` as a sub-object), but the scopes doc doesn't say so in as many words. Marking this as a minor gap, not a blocker — worth a live test (create a token with only `payroll.settings`, hit `GET /payroll.xro/2.0/earningsRates`, confirm 200 not 403) before relying on it.

**Architecture implication for the two-connection-lane question:** our app currently requests only Accounting scopes (per the brief). Any Payroll AU work needs the relevant `payroll.*` scopes added and **all currently-connected users re-consented** — per https://developer.xero.com/documentation/guides/oauth2/scopes, *"It's not possible to remove scopes from an existing access token... each subsequent time your app sends a user through the flow, any new scopes will be added to previously consented scopes"* — i.e. this is additive and non-breaking for existing Accounting-only connections; users just get a second consent screen showing the new Payroll scopes.

### 4.2 Connection types — what each can and cannot access

Source: https://developer.xero.com/documentation/guides/oauth2/overview (comparison table), https://developer.xero.com/documentation/guides/oauth2/custom-connections, https://developer.xero.com/documentation/guides/oauth2/client-credentials

| | **Authorization Code flow** | **PKCE flow** | **Custom Connection** |
|---|---|---|---|
| Grant type | `authorization_code` | `authorization_code` + PKCE `code_verifier`/`code_challenge` | `client_credentials` |
| Best for | Web server apps that can store a client secret | Mobile/desktop apps that can't (SPAs **not** supported) | Back-end, machine-to-machine, single-org bespoke integrations |
| Connection limit | 25 tenants (unlimited once certified) | 25 tenants (unlimited once certified) | **One connection, one organisation** |
| User consent required | Yes | Yes | No — org admin authorises once via email link, then it's app-to-app |
| Client secret | Yes, required | **No** — apps of this type never get one | Yes, required |
| Multi-tenant | Yes | Yes | **No — single org only, by design** |
| Cost | Free | Free | **Monthly fee on the Xero org**: $10/mo AUD/NZD, £5/mo GBP, $5/mo USD |
| Regional availability | Global | Global | **AU/NZ/UK/US only** |
| Marketplace-eligible | Yes | Yes | **No** |
| Offline access (refresh tokens) | Yes | Yes | Yes (re-request client_credentials token as needed; no user-facing refresh token) |

**Non-tenanted scopes** (`app.connections`, `marketplace.billing`, `einvoicing`) can *only* be obtained via `client_credentials` (either the plain grant on a Web/Code-flow app, using the same client_id/secret as its tenanted token but requested separately — or the Custom Connection's modified client_credentials, which per the docs *"can only access tenanted endpoints and cannot access non-tenanted endpoints"* — i.e. a Custom Connection app **cannot** use client_credentials to hit `/connections` itself; that capability belongs to a plain Code-flow app's secondary non-tenanted token). — https://developer.xero.com/documentation/guides/oauth2/client-credentials, https://developer.xero.com/documentation/guides/oauth2/custom-connections

**Two-connection-lane architecture read:** this maps cleanly onto a platform-level vs per-client model —

- **Per-client lane** → **PKCE or Code flow**, one BSuite OAuth app, each client's Xero org connects individually via the standard user-consent flow, multi-tenant-capable on our side (we'd store `tenantId` per BSuite tenant/org exactly as our existing `@bsuite/auth` pattern stores per-app tokens).
- **Platform-level lane** (e.g. a single BSuite-managed reference-data org, or bulk background jobs against a specific client's books without a live user session) → **Custom Connection**, but note the real constraints: it's single-org only (so it does NOT work as "one platform connection covering all clients" — it would need one Custom Connection purchased *per client org*, at $10/mo AUD each, which is a real cost line item worth surfacing to the operator), AU/NZ/UK/US regional restriction (fine for our AU-only client base), and it cannot double as the non-tenanted `/connections`-management token.

Connection/tenant limits independent of flow type: new apps default to **5 connections** (Starter tier); Core tier → 50; App Store listing requires Plus tier; **max 2 uncertified-app connections per Xero organisation** (this is a per-Xero-org ceiling across ALL uncertified apps, not just ours — worth knowing if a client already has other uncertified integrations connected). — https://developer.xero.com/documentation/guides/oauth2/limits, https://developer.xero.com/documentation/guides/oauth2/tenants

---

## 5. UNVERIFIED list

**None of the 47 in-scope URLs failed to load.** Two required a one-time retry (both `bp_connections` and `oauth_overview` initially rendered only the cookie-consent banner via the JS-render proxy; the retry returned full real content both times — see raw cache `bp_connections.md` / `oauth_overview.md`). `payrollau_payrollcalendars` also needed one retry for the same reason.

For full transparency about *depth* of review (not load failure — everything loaded), these pages were fetched successfully and grep-scanned for the relevant terms (`super`, `SGC`, `leave loading`, `rate`, `payroll tax`) rather than read in full line-by-line, given the volume of the corpus (47 pages, 583KB total):

- `payrollau_release-notes.md` (13.7KB) — changelog, scanned not fully read
- `payrollau_stp-changes.md` (56.5KB, the largest file) — STP2 migration doc, scanned for leave-loading/SGC sections; large sections on income-type/employment-basis restrictions not read in full
- `payrollau_stp-changes-employees-examples.md` (19.1KB) — before/after payload examples, scanned only
- `oauth_auth-flow.md` / `oauth_pkce-flow.md` — read the first ~40–60 lines (scope/redirect-URI mechanics); the deeper token-refresh/revocation mechanics were instead sourced from `oauth_token-types.md` which covers the same ground more concisely and was read in full

None of the above scanning gaps affect the Tier 1 rate-sourcing conclusions (superannuation, payroll tax, GST, earnings rates, leave) — those pages (`settings`, `payitems`, `earningsrates`, `payslip`, `employees`, `superfunds`, `superfundproducts`, `types-and-codes`, `taxrates`, `leaveapplications`, `leavebalances`, `integration-guide`, `overview`) were all read in full and are the basis for §1–§2.1.

**Out of scope per the operator's directive** (explicitly excluded, not missed): the RatesCalc, Codehouse, and Humanforce links at the bottom of the source doc — competitor research, owned by a different lane.

**One follow-up worth a live test, not a doc gap:** whether `payroll.settings` alone is sufficient to call the V2 `earningsRates` endpoint, or whether it needs to be requested alongside the legacy `PayItems`-implied grant — see §4.1 finding.
