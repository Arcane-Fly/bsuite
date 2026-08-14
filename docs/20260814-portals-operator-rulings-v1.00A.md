# Portals — operator rulings

**Document:** `docs/20260814-portals-operator-rulings-v1.00A.md`
**Date:** 2026-08-14
**From:** Operator (Braden)
**Status:** A — Approved. These are rulings, not proposals.
**Answers:** `docs/20260813-portals-redesign-brainstorm-v1.00D.md` §1, Decisions 1–3.
**D-series continues from D-92.**

---

## D-93. A field officer is staff. Merge the portal. Build the mobile view separately.

**Ruling:** Option A + C from brainstorm §5.

Retire the walled-portal framing. `/portal/field-employee` — currently `/portal/field-officer` —
becomes the field officer's **work-day landing page inside the main app**, the same as any staff
role's dashboard. Navigation stays the standard permission-filtered one. Do **not** build
portal-shaped duplicates of case notes, site visits, WHS logging, competency or LLN capture; the
surfaces under `/field-officers/*` are the ones.

**The mandatory half of this ruling:** the caseload limit becomes a **database rule**, not a page
filter. A field officer reads case notes, incidents and language/literacy/numeracy assessments
about named people. A page filter is not a privacy control. This is the same fault class as
crm7#1729 (`contacts` RLS has no host-employer limb) and crm7#1728
(`report_templates_select` has no developer predicate) — **all three are the same defect wearing
different clothes, and they should be designed once.**

**Mobile is in scope, as its own piece of work.** A field officer's job is done standing in a
workshop holding a phone. Build a mobile task view — and offline entry where signal fails — over
**the same data and the same RLS**, sequenced after the merge. It is not a justification for a
walled portal and it must not become one.

**Consequence for scope:** three external portals, not four. Worker/apprentice/trainee, host, and
(later) any guardian persona. Field officer is staff.

---

## D-94. A host sees the full charge-rate build-up.

**Ruling:** option (c) from brainstorm §1 — invoice, hours per line, charge rate per hour, **and**
the build-up: wage, on-costs, overhead, margin.

This is the maximum-transparency position and it was taken deliberately. Three things follow from
it and none is optional.

**1. The build-up becomes a customer-facing artefact, so its accuracy becomes a customer-facing
liability.** Today R8 ships honest but incomplete data: the allowance catalogue covers **8 of 21
awards**, and allowance percentages per apprenticeship year are read from the award clause for
**2 of 21** — the other 19 render a flat 100% labelled *"⚠ 100% is an UNVERIFIED DEFAULT, not read
from {award}'s clause"*. That label is the right behaviour for an internal tool. **It is not
something to show a host inside a number they are being billed on.** Award coverage must be closed
for any award a host is actually charged under, before the host money view ships. R80.4#41 is
closed on the labelling; the coverage work is not.

**2. One source, never recalculated in the interface.** Same rule as payslips (§10): the portal
**displays** the build-up that R8 produced and the invoice recorded. It does not recompute it. If
two numbers can disagree, one of them is wrong and we own the difference. The transport for this is
R80.4#13 (the paste box has to go), which is now on the critical path rather than a nicety.

**3. Point-in-time, per D-68.** The build-up shown against an invoice is the build-up as at that
pay period. It is a record, not a live recalculation, and it must not re-derive when Fair Work
publishes a new wage. The change-of-year and wage-anniversary records live in crm7 against the
person and host (crm7#1702), not in the displayed history.

**Sequencing:** this is the single largest driver of host-portal size, and brainstorm §11 lists it
under "not cheap — each needs its own piece of work". It does not start before D-93's RLS work,
because it is a per-host row-visibility surface before it is a screen.

---

## D-95. A host places staffing orders. A host does not browse workers. The GTO recommends.

**Ruling — a refinement of option 1, not option 1 as written.** The operator's words:

> *"yes, they should put orders in for new staff needs. but not be able to see all available. gto
> see's order and recommends."*

Three parts, all binding:

**1. A host can raise a staffing order** from the portal — "I need another second-year" — with the
detail that makes it actionable: trade/occupation, apprenticeship year or worker type, site, start
date, expected duration, supervisor. This is a new entity with a state machine, not a contact form.
Suggested states: `submitted → acknowledged → triaged → recommended → accepted | declined |
withdrawn`, each transition attributable and timestamped.

**2. A host must NOT be able to see the available worker pool.** No talent-pool browse, no "who's
free", no candidate list, no availability calendar across workers. The host sees **their own
orders** and **what we recommend against them** — nothing else.

**This is a negative requirement, and negative requirements decay.** Write it as a test, not a
comment. A future agent adding a "browse available apprentices" tile to the host portal will
believe it is helping. The RLS must make the pool unreadable to a host role, so that the UI
decision is not the control.

**3. The GTO reviews the order and recommends.** A person triages the order and puts forward
candidates. Nothing a host submits becomes a vacancy, a pipeline record or a placement without that
review. This keeps the demand signal captured in the system — which is the whole point, since it
currently leaks to phone and email — without ceding recruitment control.

**Relationship to conduit:** the recommendation step is a pipeline action, and crm7#1687 already
says `/pipeline/kanban` should pull from conduit rather than hold its own. A staffing order should
land where the pipeline actually lives, not in a third place.

---

## What this unblocks, and what is still blocked

**Unblocked — brainstorm §11 "cheap, worth doing regardless" can start now:**

- Make "invite this person to the portal" available from any person and host-contact record, not
  just two workflow pages. The mechanism exists (crm7#1680 shipped `SharePortalCard` and the
  `accept-invite` route).
- Re-scope crm7#1680 to what is actually missing; correct crm7#1681's target from `/portal/worker`
  to conduit's careers board.
- Rename the misleading menu labels — "My Training Plan" must not point at the staff directory.
- Move `/host/reports` under `/portal`.
- Stop describing "trainee" as a separate portal.

**Unblocked, and now the core of the work:** the portal shell and the "what needs me" strip; the
worker's four destinations (submit hours, hours history, leave, my details); the host approval
queue as a portal page; **the supervisor concept** — a host contact scoped to the workers they
supervise, which is a database change before it is a screen and is a prerequisite for both D-94 and
D-95.

## D-96 to D-98 — ruled the same day: match AnyTime

Operator, 2026-08-14: **"decisions = match anytime."** All three of brainstorm §1's "week not a
month" questions resolve against the Code House AnyTime / Workforce One admin guide, which D-82
had already made the reference.

**D-96. Payslips: the portal is a VIEWER. Payroll is the system of record.**
AnyTime carries **no payslip surface at all** — it is a timesheet front end and Workforce One owns
pay. Matching it resolves to the weaker, safer position, which is also what the brainstorm
recommended: display what payroll issued, never recalculate in the interface. If two numbers can
disagree, one of them is wrong and we own the difference.

**D-97. WHS questions: build them, configurable, in AnyTime's exact shape.**
A question set shown before an employee submits a timesheet and/or before a supervisor approves
one:

| Setting | Behaviour |
|---|---|
| Q&A label | The heading the questions appear under on the timesheet |
| `Display WHS Timesheets` | Master toggle — the whole feature can be off, and ships off |
| `Email Consultant` | Answers go to consultants as well as the nominated WHS contact |
| Question type | Text · Yes/No · Yes/No and Text |
| `Supervisor Only` | This question is shown only to the approver |

Plus a **History Log** — a full audit of every user action affecting the submission and approval of
a timesheet, filterable by date range, username and log type.

**The line that must not be crossed.** The platform asks the questions, routes the answers to a
nominated person and keeps the record. It **must not** block a timesheet, close an incident, or
state that an obligation has been met. A host has WHS duties for a worker on their site; a GTO has
duties it cannot delegate. A screen that says "WHS compliant" is a determination and we never draw
one. This is a process change for hosts, not just a feature.

**D-98. Bank, tax file number and superannuation: OUT OF SCOPE for the portal.**
AnyTime captures none of it — it imports users and placements from the payroll system. Matching it
means payroll owns this data and the portal does not touch it. That is also the brainstorm's own
recommendation, which asked for it to be carved out entirely. If it is ever built it is its own
piece of work with its own review: capture-once, write straight through, never display back in
full, never log, never cache in the browser.

**Two more things to take from AnyTime while building the above.** Approval is a payment trigger,
so it must be attributable to a named person with a timestamp, sit in an audit log the approver
cannot alter, and be reversible only with a typed reason and a notification to both sides — AnyTime
does exactly this. And **chasing** is the capability we most lack: AnyTime gives administrators a
missing-timesheet list and an awaiting-approval-by-supervisor list, each with email and SMS
templates to chase from. That is the GTO's actual weekly workload and we have none of it.

---

**Still open, not yet asked:** whether a guardian of an under-18 apprentice ever gets portal
access. If yes, it is a fifth external persona with its own privacy questions.

---

## The named risk, restated

Brainstorm §11: *"The largest [risk] is doing option 1 again — trimming menus, calling it a
redesign, and leaving the 14 destinations pointing into staff pages."* D-62 applies to this work in
full: a PR that improves one portal page and leaves the destinations pointing into staff surfaces
is a failed PR.
