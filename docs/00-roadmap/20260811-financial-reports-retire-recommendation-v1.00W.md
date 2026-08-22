# `/financial/reports` — the answer is retire it, not restyle it

**Date:** 2026-08-11 · **Status:** 1.00W · **Needs:** an operator decision (deletion needs your approval)

## Your question

> "https://d.crm.crm7.app/financial/reports/new — why is this not airtable style too?"

Because it isn't a report. Restyling it would polish a surface that should not exist.

## What it actually is

`financial_reports` stores **hand-typed figures**:

```
id, tenant_id, title, type, period, status,
revenue, expenses, profit, notes,
created_by, created_at, updated_at
```

Someone types a revenue number, an expenses number and a profit number into a form, and the
system stores them. There is no query, no definition, nothing derived. It is a spreadsheet
cell with a database table around it.

**Row count: 0.** Nobody has ever used it, in any tenant.

## Why that matters — the system already knows these numbers

The report catalogue covers finance properly, with **nine entities** built from real data:

`invoices` · `invoice_line_items` · `pay_runs` · `payroll_records` · `funding_claims` ·
`funding_claim_items` · `funding_sources` · `charge_rate_quotes` · `award_rates`

Revenue, expenses and profit are all **derivable** from those. Typing them in by hand means
the figure can disagree with the invoices it is supposed to summarise, and nothing would ever
catch the disagreement — there is no link between the two.

## It is the exact shape the doctrine forbids

`general-dry-one-shot-architecture`, the standing rule for this estate:

> ONE owning app per entity with CRUD UI; others READ via Supabase, **never mirror tables or
> free-text fields**.

`financial_reports` is a mirror table holding free-text financial figures. It is not a
borderline case.

## Recommendation

**Retire `/financial/reports/new` and the `financial_reports` table.** Point "Financial
Reports" in the navigation at the catalogue report builder instead, where a financial report
is derived from invoices and pay runs and cannot silently disagree with them.

Cheap, because nothing is lost: zero rows, and the replacement already exists.

**Not done, because deleting existing work needs your approval.** Three things follow on your
word:

1. Remove the `/financial/reports/new` route and its form.
2. Repoint the nav entry (`src/config/navigation.ts:206`) at the catalogue builder.
3. Drop `financial_reports` in a migration — or leave the empty table and just remove the UI,
   if you would rather keep the option open. Removing the UI alone gets the benefit; dropping
   the table is tidiness.

## If you disagree

The case for keeping it is that a GTO sometimes needs to record a figure that has no
underlying transaction — an accountant's adjustment, a prior-year balance. That is a real
need, and if it is the need, then this form is the wrong shape for it anyway: it should be a
single adjustments entity that the catalogue can *include*, not a parallel reporting surface
that competes with it.

Either way, the current surface goes.
