---
kind: record
authority: none
owner: bsuite
---

# [P0][billing] Host bill loop: R8 rate → placement pay+charge → timesheet portals → tenant Xero (not platform Xero)

https://github.com/GaryOcean428/crm7/issues/2566

Snapshot updatedAt: 2026-09-08T01:35:17Z. Open at capture; re-read live.

## Why
Operator: create a rate, assign pay to worker/apprentice/trainee and charge to host, bill on timesheet submission, round-trip worker+host portals, invoice in THEIR Xero.

Pay items workbook is Xero payroll chart not award rates. crm7#2564 seeds the chart. This issue is the rest of the loop.

## Live FutureBuild
8 placements, 8 quotes, 0 pay_items before #2564, 3 timesheets stuck pending_gto_review, 1 invoice, 0 invoice_runs. Tenant Xero connected.

State: draft → pending_host_approval → pending_gto_review → approved → CRM7 invoice → xero-invoice-submit on futurebuild-academy (not platform/braden-group).

## DoD
One FutureBuild-shaped walk on d.crm: R8 quote both sides on placement edit; worker portal submit; host portal approve; GTO approve; host invoice in their Xero; worker portal shows the timesheet.
