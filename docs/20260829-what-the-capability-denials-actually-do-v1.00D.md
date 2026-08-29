---
kind: plan
authority: engineering
owner: permissions-authz-lane
evidence:
  - scripts/check-table-reach.mjs
  - scripts/check-zero-consumers.mjs
---

# What the capability denials actually do

**Status:** DRAFT — a measurement and one open architectural question. Measured
2026-08-29 against production `tuybltdrdefjblnplpqo`. Every number is live.

Closes a question left open when
`20260824-role-capabilities-zero-consumer-finding-v1.00F.md` was frozen. That
document proved the table had **zero consumers**; it now has nine. Marking it
complete deliberately did **not** claim the edits behave as their authors
intended, because nobody had checked. This checks.

---

## 1. The denials are mechanically honoured

`user_has_capability()` is a thin wrapper over `effective_user_capabilities()`,
which resolves a user override over a role default and carries `granted`
through unchanged, defaulting to `false`:

```sql
SELECT coalesce((SELECT e.granted
                 FROM public.effective_user_capabilities(p_user_id, p_tenant_id) e
                 WHERE e.capability = p_capability), false);
```

A `granted = false` row surfaces as `false`. **There is no bug in the denial
logic**, and this document is not reporting one.

## 2. But 87% of them can never fire

| | count |
|---|---:|
| denials in `role_capabilities` (`granted = false`) | **665** |
| reachable by an active member of that tenant | **86** |
| distinct roles carrying a denial | 11 |
| of those, roles any active member actually holds | **1** |

The join is `rc.role = ut.portal_role AND rc.tenant_id = ut.tenant_id`. A denial
written against a role nobody in that tenant holds selects nothing — it is
configuration for a role that does not exist there.

## 3. Two vocabularies, overlapping in one value

```
role_capabilities.role      field_manager field_officer gto_admin gto_staff
                            guest member owner platform_admin recruiter
                            tenant_admin viewer                     (11)

user_tenants.portal_role    apprentice host_contact owner staff      (4)
```

Overlap: **`owner`, and nothing else.**

## 4. What that does and does not mean — the part worth reading carefully

Per active member, by held role:

| `portal_role` | active members | with capability rows |
|---|---:|---:|
| `owner` | 9 | 4 |
| `staff` | 2 | **0** |
| `apprentice` | 1 | 0 |
| `host_contact` | 1 | 0 |

**`apprentice` and `host_contact` having no rows is BY DESIGN, not a defect.**
`RoleCapabilityDefaults.ts` states it plainly: they are "portal personas whose
access is governed by the portal surfaces, not by this internal staff matrix.
Giving them a starting grant here would quietly widen what an external party can
reach inside the tenant." Counting them as a gap would be reading a deliberate
exclusion as a bug — which is what my first pass at these numbers did.

That leaves two real observations:

- **`staff` vs `gto_staff` is a spelling gap.** `DEFAULT_PROFILE_BY_ROLE` maps
  `staff -> gto_staff` as a *profile*, but the resolver joins on the literal
  role value. Two active members hold `portal_role = 'staff'` and no
  `role_capabilities` row carries `role = 'staff'`, so they resolve to nothing.
- **Five owners are in tenants with no capability configuration at all** — 3
  tenants have `role_capabilities` rows, 7 have active members.

## 5. Nothing is denied today, and that is the whole reason this is a DRAFT

| | count |
|---|---:|
| RLS policies calling `user_has_capability` | **0** |
| functions calling it | 1 |

**No policy gates on the result.** So the seven affected members are not locked
out of anything — the resolver would return `false` for them, and nothing asks.

That is what makes this latent rather than live, and it is also what makes it
dangerous to leave: the moment a policy is wired to `user_has_capability`, two
staff members and five owners get `false` for every capability, and the failure
will look like an RLS bug rather than a vocabulary gap.

## 6. The open question — not decided here

Which spelling is canonical for the resolver join: `portal_role` values, or the
`role_capabilities` vocabulary?

Both are defensible and the choice is architectural, not editorial:

- **Write rows in `portal_role` spelling** — the resolver works with no code
  change, but the matrix UI's vocabulary drifts from the stored one.
- **Map at the join** (`rc.role = canonical_role(ut.portal_role)`) — one place
  to maintain, but it changes an authorization predicate, which is the kind of
  edit that wants a deliberate decision rather than a passing fix.

This is deliberately **not** resolved here. Changing an authorization predicate
to make 665 dormant denials start firing is a decision with a blast radius, and
the safest state right now is the accurate description above rather than a
unilateral repair. What must **not** happen is wiring a policy to
`user_has_capability` before this is settled.

## What was verified, and how

Every figure from live SQL against `tuybltdrdefjblnplpqo` on 2026-08-29:
`pg_get_functiondef` for both resolvers, `pg_policy` scans for callers, and
per-role member counts joined against `role_capabilities`. `check-table-reach`
and `check-zero-consumers` both exit 0.
