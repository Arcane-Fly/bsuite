---
kind: record
authority: none
owner: bsuite
---

# GTO enquiry-to-billing walk — results

**Date:** 2026-07-31 · **Status:** Frozen
**Plan:** `~/.claude/plans/lazy-hopping-nest.md` (Amendment B — the end-to-end walk)
**Method:** driven **through the UI in a real signed-in browser** on `d.crm.crm7.app`
(operator's dev account, BS OAuth flow), with every UI observation paired with a
verifying SQL query against the live catalog. SQL was used to **verify** what the UI
did, never to substitute for it.

---

## Summary

**The chain does not conduct.** Four links are blocked by product defects, three by
entities that do not exist, and one by an unconnected integration. Two of the four
product defects were **P0 blockers on the primary path** and are fixed; the rest are
recorded below with evidence.

**Cleanup ledger: empty — the walk created no records.** Every blocker was reachable
without seeding, so nothing needed to be created and nothing needs removing. This is
stated explicitly because an empty ledger is otherwise indistinguishable from a
ledger nobody wrote.

| # | Link | Verdict | Evidence |
|---|---|---|---|
| 1 | Sign in (BS OAuth) | **PASS** | `sb-crm7-auth` present, `platformRole: developer`, tenant `bsuite Platform`; dashboard renders |
| 2 | Apprentice has wage-determining facts | **NOT REACHED** | blocked behind link 4 |
| 2b | Training contract anchors year level | **NOT REACHED** | — |
| 3a | Probe `auth-fairwork` | **NOT REACHED** | — |
| 3b | Rate resolves with provenance | **BLOCKED** | pay-rate source defaults to *Manual entry*; award path not exercised because link 4 blocked the form |
| 4 | Charge derived + persisted | **WAS P0-BLOCKED → FIXED** | crm7#1343 |
| 5 | Placement carries the rate | **FAIL (data)** | 21 placements carry a `charge_rate`; **0** have a positive resolution status |
| 5b | Placement agreement signed | **BLOCKED (no route)** | 12 `charge_rate_quotes` rows exist; **no `/quotes` index route** |
| 5c | Engagement exists | **BLOCKED (unbuilt)** | `engagements` 0 rows, no route, no service — crm7#1345 |
| 6 | Timesheet entered against the placement | **FAIL (structural)** | `timesheets` has **no `placement_id`** — see below |
| 7 | Interpreted ordinary/OT/penalty split | **FAIL** | 0 of 7 timesheets carry any overtime, training or RDO hours |
| 8 | Invoice line traceable to a signed agreement | **BLOCKED** | `host_agreements` = **0 rows** across all 11 hosts |
| 9 | Xero — a non-OAuth audit row | **BLOCKED** | *"No Xero organisations connected yet."* — integration not connected |
| 10 | Payment | **NOT REACHED** | `payments` = 0 |
| P1 | Pay run | **WAS P0-BLOCKED → FIXED** | crm7#1344 |
| P2 | `payroll_records` + super | **NOT REACHED** | 2 rows exist, not reachable through the chain |
| P3 | Payslip | **NOT REACHED** | — |

---

## The two P0s — both found only by driving the UI

### Link 4 — no charge rate could be saved at all (crm7#1343)

On a **clean load** of `/charge-rates/create` → Rate Information, nothing touched:

```
switch  data-state = "checked"
banner  "Showing rates effective 1 July 2027 (in 335 days).
         Save is disabled until the rate is published."
```

A precise mouse click at the switch's centre (44×24px, visible, enabled) left it
`checked`. Root cause: a `useEffect` fired on `asOfDate === undefined` — which **is**
the off state — and refilled the date the instant the toggle was switched off. Six
existing tests stayed green because all of them pass `onChange={vi.fn()}`, which never
feeds the prop back, so the component's fight with itself was invisible.

### Link P1 — every payroll read and write hit an empty twin table (crm7#1344)

```
public.pay_runs      29 cols  2 rows   <- canonical (STP, Xero-sync, EOFY columns)
public.payroll_runs  28 cols  0 rows   <- empty twin; what crm7 addressed
```

`/payroll` rendered **516 characters** with no pay-run content in a tenant that has
two, because "Recent Pay Runs" is gated behind `recentRuns.length > 0`. Worse, both
EOFY finalisation writes ran `UPDATE … WHERE id = …` against the empty table: **0 rows
matched and both reported success.** Invisible to typecheck — `payroll_runs` is a real
table with a real generated type.

---

## Structural findings (no code change proposed without operator input)

### Link 6 — a timesheet cannot be attributed to a placement

`public.timesheets` has **no `placement_id` column**. It carries `person_id` and
`host_employer_id` only. Where a person holds two concurrent placements the timesheet
is unattributable — and crm7's own pgTAP fixture
(`31_charge_rate_snapshots_and_propagation_rls.sql`) explicitly models that case as
"person Y … TWO active placements -> ambiguous".

The plan's link 6 is *"timesheet entered against that placement"*. That cannot be
expressed in the current schema.

### Links 6/7 — measured across all 7 live timesheets

```sql
select count(*) as timesheets,
       count(*) filter (where state::text='approved' and approved_at is null) as approved_state_but_no_timestamp,
       count(*) filter (where total_hours > 0 and coalesce(billable_hours,0)=0)  as hours_but_zero_billable,
       count(*) filter (where pay_period_id is null)                            as not_in_any_pay_period,
       count(*) filter (where jsonb_array_length(coalesce(entries,'[]'::jsonb))=0) as no_daily_entries,
       count(*) filter (where coalesce(overtime_hours,0) > 0)                   as any_overtime,
       count(*) filter (where coalesce(training_hours,0) > 0)                   as any_training_hours
from public.timesheets;
```

| metric | value |
|---|---|
| timesheets | 7 |
| **`state='approved'` but `approved_at IS NULL`** | **5** |
| **`total_hours > 0` but `billable_hours = 0`** | **3** |
| **not attached to any pay period** | **7 of 7** |
| no daily `entries` breakdown | 6 of 7 |
| any overtime hours | **0** |
| any training hours | **0** |

Three consequences:

1. **The approval state is not backed by its own timestamp.** Five timesheets read
   `approved` with a null `approved_at`. Either the state machine writes the enum
   without the timestamp, or the rows were seeded past it. Any audit that reports "when
   was this approved" has nothing to read.
2. **An invoice line from those three timesheets would be $0** — 38 total hours,
   0 billable. Link 8 cannot produce a correct amount from them.
3. **No timesheet is attached to a pay period**, so none can flow into a pay run. Link
   P1 has no input even now that the table repoint is fixed.

Link 7 is unexercised in the strict sense: every row is 38 ordinary / 0 everything
else, so no ordinary-vs-OT-vs-penalty split has ever been computed. This is consistent
with the plan's note that `penaltyCalculator.ts` has zero importers.

### Link 5 — the placement rate substrate

21 placements carry a `charge_rate`; **none** has a positive
`award_rate_resolution_status` (12 `'unresolved'`, 9 `NULL`). The tripwire added this
session (`20260731110000`) now blocks the 22nd; the existing 21 are tolerated via
`NOT VALID`.

### Links 5b / 5c / 8 — entities and routes that do not exist

| gap | measured |
|---|---|
| `/quotes` index route | **absent** — only `/quotes/fast` and `/quotes/sign/:token` are declared, while `charge_rate_quotes` holds **12 rows** |
| `/engagements` | **no route, no service, no store** — `engagements` = 0 rows (crm7#1345) |
| `host_agreements` | **0 rows** across all 11 hosts — link 8 requires an invoice line traceable to a *signed agreement* |

### Payroll hub — 4 of 6 cards are dead links

Card targets compared against routes declared in `App.tsx`:

| card | target | exists |
|---|---|---|
| Awards & Rates | `/payroll/award-rates` | yes |
| Timesheets | `/payroll/timesheets` | yes |
| Payroll Items | `/payroll/payroll-items` | **no — 404** |
| Pay Runs | `/payroll/pay-runs` | **no — 404** |
| Export | `/payroll/export` | **no — 404** |
| Payroll Reports | `/payroll/reports` | **no — 404** |

Meanwhile four **real** routes are not surfaced at all: `/payroll/dashboard`,
`/payroll/missing-timesheets`, `/payroll/pay-periods`, `/payroll/rcti`.

---

## What the walk proves about the plan's own premise

The plan's governing constraint was *"crm7's quote/charge/requote path cannot resolve a
rate at all"*. That was true but **understated**: the path could not be **saved from**
either, for a reason unrelated to the rate substrate. A plan that had been executed
rather than read would have found the toggle on day one.

Every defect in this document was found by execution. None was visible to typecheck,
and the two P0s were sitting behind green test suites.

---

## Verification method note

Per the plan, each link needed *"a browser screenshot AND the verifying query"*. Where a
link is marked BLOCKED by a missing route or absent entity, the browser observation is
the 404 or empty state and the query is the row count — both are recorded above. Where a
link is marked NOT REACHED, no claim is made in either direction; those links remain
genuinely unexercised and must not be read as passing.
