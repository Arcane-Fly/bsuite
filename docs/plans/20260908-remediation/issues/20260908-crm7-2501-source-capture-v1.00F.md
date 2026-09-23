---
kind: record
authority: none
owner: bsuite
---

# [P1] C10's scope comes from a data table, so its green is silently partial — empty locally, incomplete in CI

https://github.com/GaryOcean428/crm7/issues/2501

Snapshot updatedAt: 2026-09-06T10:38:26Z. Open at capture; re-read live.

## What

`Anon-context RLS tests (Constraint C10)` derives its scope from a **data table**
(`report_catalog_entities`), so its green is only ever as wide as that table happens to be —
and nothing in the result distinguishes "checked everything and found nothing" from "had
almost nothing to check".

Two measurements today, at opposite extremes, both reporting green.

## 1. Locally the catalogue is EMPTY, so A4 passes trivially

Found while fixing crm7#2496: `report_catalog_entities` is empty in a local rebuild, so
`50_t1b_developer_reads_all.sql` A4 — *"every RESTRICTIVE SELECT policy on a catalogued
entity names `is_platform_developer()`"* — has **nothing in scope** and passes.

The lane had to **seed two catalogue rows** to put A4 in scope before it could reproduce the
failure it was fixing. Without that seeding, a local run of the RLS suite would have
confirmed the fix was unnecessary.

## 2. In CI the catalogue is PARTIAL, and here is the proof

`payments_select` carries **no `is_platform_developer()` limb** — not before crm7#2496 and
not after. Verified in `supabase/migrations/20260101000000_prod_schema_baseline.sql:58375`:

```sql
CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT TO "authenticated"
USING (
  tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM invoices i
              WHERE i.id = payments.invoice_id
                AND i.host_employer_id = get_user_host_employer_id())
);
```

`payments` has exactly one authenticated SELECT policy and no developer limb.
`t1b_grant_developer_read()` ran 2026-08-08; `payments` was catalogued on 2026-08-21 by
`20260821060000_report_catalog_gto_lifecycle_batch.sql`; **nothing re-ran the grant
afterwards.**

So if `payments` is an active catalogue row on production, **A5b should already be red** —
and C10 is green in CI. The only way both hold is that **CI's catalogue is narrower than
production's**.

## Why this matters beyond one table

C10 is the gate that caught the real defect in crm7#2496 — two `AS RESTRICTIVE` policies
that would have AND-ed away the developer read-all grant. It works. That is exactly why its
scope needs to be trustworthy: a green from it is currently being read as "RLS invariants
hold", when it means "RLS invariants hold **for whatever rows the catalogue had at run
time**", and the run never says how many that was.

A gate that cannot tell *checked nothing* from *found nothing* is not a gate.

## Compounding with #2499

#2499 records that C10 is **not a required check** on `development`. Together:

- the RLS invariant suite is **advisory** on the branch where RLS changes land, **and**
- when it does run, its scope is **silently partial**.

Neither alone would be alarming. Together they mean nobody currently knows how much of the
RLS surface is gated.

## Fix

1. **Make C10 report its denominator.** Print the catalogue row count it evaluated, and
   **fail** when that count is zero or below a floor — the estate already uses exactly this
   pattern elsewhere (`pathspec control: reaches N root-level docs/*.md files`, which fails
   at 0 with the comment *"do not 'fix' this by deleting the control"*).
2. **Reconcile CI's catalogue with production's**, or state deliberately why they differ and
   make that difference itself asserted.
3. **Re-run `t1b_grant_developer_read()`** for entities catalogued after 2026-08-08, or
   assert that no catalogued entity lacks the grant.
4. **Seed the catalogue in local test setup** so a developer running the suite locally gets
   the same scope CI does.

## Acceptance

- C10 prints the number of catalogued entities it evaluated, every run.
- C10 fails, loudly and by name, when that number is zero.
- A catalogued entity with no developer limb is red — demonstrated by making `payments` red,
  then fixing it and watching it go green. A gate added but never proven to bite is the same
  defect one level up.

Found while gating crm7#2496 (the live cross-host RLS leak). Related: #2499.
