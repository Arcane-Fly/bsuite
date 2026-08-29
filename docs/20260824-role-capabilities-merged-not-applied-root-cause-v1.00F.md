---
kind: finding
authority: agent
owner: lane-role-capabilities
evidence:
  - scripts/audit-role-capability-divergence.mjs
  - scripts/role-capability-divergence-baseline.json
  - .github/workflows/role-capability-divergence.yml
  - crm7/supabase/migrations/20260905000000_user_has_capability_fail_closed.sql
---

# role_capabilities gates nothing because its reader was never applied

**Status:** F (Frozen — the fix this document prescribes is applied and verified).

> ## CLOSED 2026-08-29 — verified against production `tuybltdrdefjblnplpqo`
>
> This document's diagnosis was that the reader existed as a migration and had
> never been applied. All three facts it turns on now check out live:
>
> | check | result |
> |---|---|
> | `20260905000000_user_has_capability_fail_closed` recorded in `schema_migrations` | **yes** |
> | `public.user_has_capability` exists | **yes** |
> | its body reads `role_capabilities` | **yes** |
>
> And the consequence is visible at the table: 5 functions and 4 policies now
> read `role_capabilities`, against zero when this was written.
>
> Limb (a) — it described a non-best-practice (a permission gate whose reader
> was authored but never applied) and best practice is implemented. Limb (b) —
> `check-table-reach` and `check-zero-consumers` both exit 0.
>
> Recorded here rather than in a new note: this document is the diagnosis, and
> splitting a diagnosis from its resolution is how the next reader re-derives
> both.

**Measured 2026-08-24 against production `tuybltdrdefjblnplpqo`.** Supersedes the
*cause* stated in `docs/20260824-role-capabilities-zero-consumer-finding-v1.00F.md`;
its *measurements* reproduce exactly and are not disputed.

## The correction

Three lanes independently reported `role_capabilities` as a zero-consumer table
needing a design decision — wire it, retire it, or label it. All three
measurements were right. The conclusion drawn from them was incomplete.

**The reader is not missing. It was written, reviewed, merged to `development`
and to `main`, and has never run.**

| | |
|---|---|
| `public.effective_user_capabilities()` | defined in crm7 `20260904000000` · **absent from production** |
| `public.user_has_capability()` | defined in crm7 `20260905000000` · **absent from production** |
| `public.current_user_has_capability()` | same migration · **absent from production** |
| Functions matching `%capabilit%` that DO exist live | `can_write_role_capability` (RLS helper), `role_capabilities_set_updated_at` (trigger) |

Those two survivors are exactly why every lane measured "every reference to this
table exists to control access to this table". That statement was true, and it
was true because the references that would have disproved it are sitting in
unapplied migrations.

## Why they never ran

```
crm7 max APPLIED migration      20260902000000     (748 applied, 23 since Aug 24)
crm7 migrations above that      4, all merged, none applied
  20260903000000  field_manager_gto_role_enum_value        <- field-officer-roles
  20260903010000  field_officer_manager_roles_and_caseload <- field-officer-roles
  20260904000000  tenant_roles_clone_and_user_overrides
  20260905000000  user_has_capability_fail_closed

origin/main  crm7 gitlink  2f90a829   does NOT contain them
origin/dev   crm7 gitlink  3ceb6e8c   DOES contain them
```

**The applier reads `main`'s submodule gitlink.** Main's crm7 pointer predates
all four, so the applier has never been able to see them. Nothing failed; there
was nothing to fail. This is `MERGED ≠ APPLIED` with a submodule pointer as the
mechanism.

**The unblock is `bsuite#2361`** (`development` → `main`), which carries crm7
gitlink `3ceb6e8c`. Verified: it contains `20260905000000`.

> `#2361`'s title says "the estate's three pending migrations". crm7 alone has
> **four**. Worth re-checking the scope before it closes.

## What happens on the day it applies

Today the 1,296 rows are inert, so wrong data is harmless. The moment
`user_has_capability()` exists, every row starts answering authorisation
questions. This is a **loaded gun, not a live hole** — and that makes fixing the
data *before* `#2361` lands more urgent, not less.

Measured with `scripts/audit-role-capability-divergence.mjs`:

| | |
|---|---:|
| crm7 permissions | 91 |
| catalogue capabilities | 54 |
| **literal string overlap** | **0** |
| capabilities confidently mappable | 14 |
| crm7 roles / catalogue roles / **shared** | 17 / 9 / **4** |
| comparable cells | 168 |
| agree | 96 (57%) |
| table over-grants | 46 |
| table under-grants | 26 |
| **divergence** | **72 (43%)** |
| **privilege escalations** | **28** |

An escalation is a write-shaped capability the table grants and the code denies.
Among them, in `Braden Group`: `viewer` and `member` both hold
`payroll.timesheets.approve` and `payroll.timesheets.write`.

## A second data defect

`Lookn`'s matrix is **uniform across all seven roles** — owner, tenant_admin,
viewer, member, recruiter, gto_admin, gto_staff, every one at exactly 38 granted
/ 16 denied. It encodes no role distinction at all. `Braden Group` shows the same
fingerprint on four roles at 44/10.

This is consistent with the role-blind preset generator u11-security root-caused
in BSU#829: `buildAllCells(rowIds, grant: (capId) => boolean)` never receives the
role, so one preset click writes one profile to every row. It also means the
"918 rows edited after creation" figure should **not** be read as 918 deliberate
decisions — much of it is preset output.

## Rulings taken

1. **No second resolver.** The assignment asked for a shadow reader. One exists,
   merged, and is better than what would be written here: fail-closed by
   construction, self-verifying inside the migration, SECURITY DEFINER with
   justification tags. Building a competing resolver would be the same
   zero-consumer defect in a new shape.
2. **The divergence is measured statically, not by shadow logging.** A runtime
   shadow only sees decisions actually exercised; this covers all 168 comparable
   cells, needs no deploy, changes no behaviour, and was available immediately.
3. **The ratchet is on escalations, not on total divergence.** A divergence can
   legitimately resolve in either direction; ratcheting the total would reward
   changing whichever side is easier rather than whichever side is right.

## Not done, and explicitly carried forward

- **The vocabulary decision is still open.** 14 of 54 capabilities map; 77 of 91
  crm7 permissions have no catalogue equivalent. The catalogue does not cover
  crm7's surface, and no amount of measurement decides what to do about that.
- **The 28 escalations are not reconciled.** Each is a question — table wrong, or
  code wrong — and answering them changes who can approve money.
- **Enforcement is not switched on anywhere**, and must not be until the
  escalations reach zero.
