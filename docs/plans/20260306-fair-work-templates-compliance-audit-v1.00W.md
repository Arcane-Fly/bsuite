# Fair Work Templates & Record-Keeping Compliance Audit — CRM7

**Document:** `20260306-fair-work-templates-compliance-audit-v1.00W.md`
**Status:** Working (W) | **Date:** 2026-03-06
**Scope:** FWO templates + Fair Work Act 2009 §535 + Regulations 2009 (regs 3.31–3.44) vs CRM7

---

## 1. FWO Templates Inventory

### Record-Keeping & Timesheets

- **Timesheet template** (.doc)
- **Weekly time and wages record** (.pdf)
- **Record of employee details** (.doc)
- **Pay slip template** (.docx/.pdf)
- **Piecework record template** (.pdf)

### Disciplinary & Performance

- **Warning letter (first warning)** (.pdf)
- **Final warning letter template and checklist** (.pdf)
- **Managing underperformance best practice guide** (.pdf) — 5-step process

### Termination & Ending Employment

- **Termination of employment letter** (.docx/.pdf)
- **Termination letter — serious misconduct** (.docx/.pdf)
- **Termination letter — redundancy** (.docx/.pdf)
- **Successful probation letter** (.pdf)
- **Unsuccessful probation letter** (.pdf)
- **Letter of resignation** (interactive web tool)

### Leave

- **Notice of requirement to take annual leave (temporary shutdown)** (.docx/.pdf)
- **Agreement to take annual leave in advance** (.pdf, FWC resource)
- **Leave application form** (.doc)

### Other

- **Staff meeting record** (.pdf)
- **Request for records** (interactive web tool)
- **End of probation** (interactive web tool)

---

## 2. Statutory Record-Keeping (Regs 3.31–3.44)

**Retention:** 7 years. English. Legible. Accessible to Fair Work Inspector.

| Reg | Category | Required Fields |
|-----|----------|-----------------|
| 3.31 | Employee details | Employer name+ABN, employee name, FT/PT/casual, date began |
| 3.32 | Pay | Rate, gross/net, deductions (itemised), bonuses/loadings/penalties |
| 3.33 | Incentives | Itemised incentive payments, bonuses, loadings, penalty rates |
| 3.34 | Overtime | Hours per day OR start/finish times of overtime |
| 3.35 | Averaging | Start date, agreement, averaging period |
| 3.36 | Leave | Leave taken, balance; if cashed out: agreement copy + rate + date |
| 3.37 | Super | Amount, period, date paid, fund name, fund ABN |
| 3.40 | Termination | Manner, name of terminator, date |

### Pay Slip (§536, Regs 3.45–3.48)

Within 1 working day. Must include: employer name+ABN, employee name, payment date, period, gross/net, itemised loadings/allowances/penalties, itemised deductions, super contributions, hourly rate+hours (if hourly).

### FWO 5-Step Underperformance Process

1. Identify the problem
2. Assess and analyse
3. Meet with employee
4. Agree on solution (PIP)
5. Monitor and review

---

## 3. CRM7 Cross-Reference Audit

### Legend: ✅ Compliant | ⚠️ Partial | ❌ Gap

### 3.1 Timesheets

**Files:** `pages/timesheets/`, `schemas/timesheet.ts`, `types/entities.ts`

| Field | Required | Status |
|-------|----------|--------|
| Employee ID | Yes | ✅ |
| Date/period | Yes | ✅ |
| Start/finish times | Yes (reg 3.34) | ⚠️ Optional in schema |
| Break duration | Best practice | ✅ |
| Ordinary/overtime/training hours | Yes | ✅ |
| Host employer | GTO-specific | ✅ |
| Triple sign-off | Best practice | ✅ |
| 7-year retention | Mandatory | ⚠️ No enforcement |

### 3.2 Pay Slips

**Files:** `lib/payroll/xeroAdapter.ts`, `myobAdapter.ts`, `quickbooksAdapter.ts`
**Status: ✅ Compliant** — Handled via payroll adapter integrations (Xero/MYOB/QB).

### 3.3 Disciplinary Process

**File:** `pages/hr/disciplinary.tsx`

| Requirement | Status | Notes |
|------------|--------|-------|
| 5-level escalation | ✅ | verbal→written→final→show_cause→termination |
| Issue description | ✅ | `description` field |
| Date tracking | ✅ | `date` per action |
| Issued by | ✅ | `issuedBy` field |
| Witness | ✅ | `witnessName` field |
| Employee response | ✅ | `apprenticeResponse` field |
| Evidence/documents | ✅ | `documents[]` array |
| Sign-off | ✅ | TripleSignOff component |
| **Support person offered** | ❌ | Missing — critical for unfair dismissal defence |
| **PIP / improvement plan** | ❌ | No structured PIP section (FWO Step 4) |
| **Review date** | ❌ | No follow-up monitoring date (FWO Step 5) |

### 3.4 Termination Process

**File:** `pages/hr/termination.tsx`

| Requirement | Status | Notes |
|------------|--------|-------|
| Reason + type | ✅ | Multiple termination types |
| Date | ✅ | Date picker |
| Notice period | ✅ | Field present |
| Final pay calc | ✅ | Wages + accrued leave + other |
| Exit interview | ✅ | Notes field |
| Checklist | ✅ | ConfigurableChecklist |
| Triple sign-off | ✅ | Present |
| **"Terminated by" name** | ⚠️ | Via sign-off, not explicit field (reg 3.40) |
| **Super in final pay** | ⚠️ | Not in final pay section |
| **Redundancy consultation** | ❌ | No consultation record |

### 3.5 Leave Management

**Files:** `pages/leave/`, `stores/leaveStore.ts`, `lib/leaveAccrual.ts`

| Requirement | Status | Notes |
|------------|--------|-------|
| Leave taken record | ✅ | Full request workflow |
| Balance tracking | ✅ | Accrued/taken/balance per type |
| All leave types | ✅ | Annual, personal, long service, compassionate |
| Medical cert | ✅ | `medical_cert_url` |
| Approval workflow | ✅ | pending→approved→rejected→taken |
| **Leave in advance agreement** | ❌ | No signed agreement workflow |
| **Leave cash-out** | ❌ | No cash-out feature (reg 3.36(2)) |
| **Shutdown leave notice** | ❌ | No temporary shutdown workflow |

### 3.6 Probation

**Files:** Training contracts, LifecycleSchedule, pipeline/kanban

| Requirement | Status | Notes |
|------------|--------|-------|
| Probation tracking | ✅ | In contract lifecycle |
| End date calc | ✅ | From contract dates |
| **Completion letters** | ❌ | No letter generation |
| **Unsuccessful + entitlements** | ❌ | No auto-calc of entitlements owed |

### 3.7 Employee Details — ✅ Compliant

### 3.8 Superannuation — ⚠️ Fund name/ABN not in CRM entity (handled by payroll adapter)

### 3.9 Records Management — ⚠️ No correction logging, no retention enforcement

---

## 4. Gap Summary — Action Items

### Critical (HIGH)

1. **Disciplinary: Support person offered** — Add boolean + name field
2. **Disciplinary: PIP section** — Structured improvement plan with timeline
3. **Disciplinary: Review date** — Follow-up monitoring per FWO Step 5
4. **Termination: Redundancy consultation** — Record consultation steps
5. **Records: Correction logging** — Audit trail for amended records (FW Act §535)
6. **Termination: Explicit "terminated by"** — Separate field per reg 3.40

### Medium

7. **Leave: In-advance agreement** — Signed agreement with amount/dates/signatures
8. **Leave: Cash-out workflow** — Agreement copy + rate + date per reg 3.36(2)
9. **Probation: Completion letters** — Generate successful/unsuccessful templates
10. **Timesheets: Start/finish times required** — Make non-optional for reg 3.34

### Low

11. **Leave: Shutdown notice** — Temporary shutdown leave direction
12. **Super: Fund details in CRM** — Fund name/ABN/member number on employee record
13. **Records: 7-year retention policy** — Automated enforcement/archival
14. **Timesheets: Retention flag** — Mark records approaching 7-year limit

---

## 5. Recommendation

CRM7 has **strong foundational compliance** across timesheets, pay slips, disciplinary escalation, termination, and leave management. The critical gaps are primarily in:

1. **Procedural fairness documentation** (support person, PIP, review dates) — essential for defending unfair dismissal claims
2. **Leave agreement workflows** (in-advance, cash-out) — statutory requirements under reg 3.36
3. **Audit trail / correction logging** — statutory requirement under FW Act §535

These gaps should be addressed in the next sprint to ensure full Fair Work compliance.
