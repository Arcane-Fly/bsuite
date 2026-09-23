---
kind: record
authority: none
owner: bsuite
---

# LIVE: the "viewer" role can approve timesheets and write charge rates in 3 tenants — viewer and member are identical in all 162 cells

https://github.com/GaryOcean428/business-suite-unified/issues/829

Snapshot updatedAt: 2026-08-31T02:52:36Z. Open at capture; re-read live.

Found while implementing role-appropriate permission defaults (Braden's *"permissions check boxes
should be pre-selected"*, raised many times). **This is not the defaults gap — it is a live
authorization defect in configured tenants**, and it reaches the money path.

## Measured on production

```sql
-- viewer vs member, cell for cell
viewer vs member cells that DIFFER    →  0        (of 162)
viewer granted a WRITE capability?    →  31
owner DENIED caps that gto_staff has  →  21
```

**`viewer` and `member` are byte-identical across all 162 capability cells.** A read-only role and
a contributing role have exactly the same grants.

### What `viewer` can currently do

```
payroll.timesheets.approve      ← a VIEWER can approve timesheets
payroll.charge_rates.write      ← and write charge rates
payroll.pay_items.write
payroll.pay_periods.write
funding.claims.write
admin.licenses.write
reports.delete
crm.clients.write, crm.contacts.write, crm.placements.write
conduit.candidates.write, conduit.jobs.write, conduit.onboarding.write, conduit.pipeline.write
training.assessments.write, training.qualifications.write, training.training_plans.write
```

`payroll.timesheets.approve` and `payroll.charge_rates.write` are the money path.

### And the hierarchy is inverted

`owner` is **denied 21 capabilities that `gto_staff` is granted** — the top of a tenant has less
authority than its staff.

## Root cause — the presets are not role-aware, and this is their signature

`src/components/admin/permissions/RoleCapabilityPresets.ts` builds every preset with:

```ts
function buildAllCells(rowIds: string[], grant: (capId: string) => boolean): CellRef[] {
  return rowIds.flatMap((rowId) =>
    ALL_CAPABILITIES.map((c) => ({ rowId, capabilityId: c.id, granted: grant(c.id) })),
  )
}
```

`grant()` takes **only the capability id — never the role**. So every preset applies the *same*
profile to *every* row. Clicking "Operator" grants operator writes to `viewer`, `guest` and
`owner` alike.

That is exactly the fingerprint in the data: `viewer` ≡ `member`, and several roles clustered at
56–57% granted. These tenants were almost certainly configured with one preset click.

This is **D-62** — the defect is the class (`buildAllCells` ignoring the role), not the individual
tenants' rows.

## Scope

| | |
|---|---|
| Tenants total | 7 |
| Tenants **with** `role_capabilities` rows | **3** ← affected |
| Tenants with **zero** rows (all boxes unchecked) | 4 |
| Rows total / granted | 1296 / 740 |

The 4 unconfigured tenants are the *other* defect (no defaults — the thing I was actually sent to
fix). These 3 are worse: they are configured **wrongly**.

## What I have NOT done, and why

**I have not changed any tenant's permission rows.** Rewriting live authorization data across 3
tenants is a product decision with real consequences for who can approve money, and it should be
an explicit call rather than a side effect of a defaults feature. Reporting it instead.

## Acceptance criteria

- [ ] `buildAllCells` takes the **role** into account, or presets are replaced by a role-aware map
- [ ] `viewer` grants no `.write` / `.approve` / `.delete` capability in any tenant
- [ ] `owner` is a superset of `gto_staff` (the inversion is gone)
- [ ] The 3 configured tenants are re-derived and the diff reviewed **before** it is applied
- [ ] A test asserts `viewer !== member` and that `viewer` holds no write capability — it would
      fail against today's data
- [ ] Closure enumerates every criterion here, each met or explicitly carried forward

## Related

- The missing role-appropriate defaults for the 4 unconfigured tenants (Braden, raised 3× in one
  document) — same root cause, different symptom.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
