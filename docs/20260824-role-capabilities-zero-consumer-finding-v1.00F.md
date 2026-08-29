---
kind: plan
authority: engineering
owner: permissions-authz-lane
evidence:
  - scripts/check-table-reach.mjs
  - scripts/check-zero-consumers.mjs
---

# role_capabilities — 1,296 rows, 918 human edits, zero consumers

**Status:** F (Frozen — superseded, and the defect it records is fixed). Measured
2026-08-24 against production `tuybltdrdefjblnplpqo`. Every number here is live,
not inferred, and every one of them reproduced on re-measurement.

> ## CLOSED 2026-08-29 — re-measured against the same production project
>
> | | 2026-08-24 | 2026-08-29 |
> |---|---:|---:|
> | functions reading `role_capabilities` | **0** | **5** |
> | policies reading it | **0** | **4** |
> | rows | 1,296 | 1,404 |
>
> The table is no longer a zero-consumer artifact. Nine live readers exist where
> there were none, so the 918 human edits this document was written about now
> reach something.
>
> **This document was already superseded on its CAUSE** by
> `20260824-role-capabilities-merged-not-applied-root-cause`, which says so
> itself: the measurements here "reproduce exactly and are not disputed" — it
> was the conclusion drawn from them that was incomplete. The reader was not
> missing; it had been authored and never applied.
>
> Both limbs of the operator bar are therefore met: superseded (limb a, stated
> by the superseding document rather than inferred), and the cited gates run
> clean (limb b) — `check-table-reach` exit 0, `check-zero-consumers` exit 0
> with "no new zero-consumer artifacts".
>
> **What this marker does NOT claim:** that every capability edit now behaves as
> its author intended. It claims the table is read. Whether the 556 explicit
> denials produce the effect those three tenants expected is a separate
> question this document never answered and this marker does not answer either.

---

## The finding in one line

The permissions manager at `suite.crm7.app/admin/permissions` writes a table
that **nothing anywhere reads**, and three tenants have already recorded 918
deliberate edits into it — including 556 explicit denials — believing they were
changing who can do what.

---

## What is actually in the table

| Measure | Value |
|---|---:|
| Rows | **1,296** |
| Tenants | 3 |
| Roles | 9 |
| Capabilities | 54 |
| `granted = true` | 740 |
| `granted = false` | **556** |
| Rows edited after creation | **918** |
| Rows using `rule_expression` | **0** |
| Capabilities not in `capability_catalogue` | 0 |
| First row / last row | 2026-07-21 / **2026-08-24** |

The last edit is **today**. Someone is still using this screen.

## Who reads it

| Reader | What it does |
|---|---|
| `business-suite-unified/src/lib/admin/saveRoleCapabilities.ts` | reads and writes it — the editor itself |
| `business-suite-unified/src/pages/Admin/PermissionsEditor.tsx` | renders the matrix |
| 4 RLS policies **on the table itself** | govern who may edit it |
| `can_write_role_capability()` | the helper those policies call |

That is the complete list. Searched every policy `USING`/`WITH CHECK`, every
function body via `pg_proc.prosrc`, and all six apps' source. **No access
decision anywhere in the estate consults this table.**

## What the estate uses instead

**599 permission-check call sites**, every one of them resolving against a
hardcoded TypeScript map:

| App | Call sites | Map |
|---|---:|---|
| crm7 | 565 | `src/hooks/usePermissions.ts`, `src/config/navigation.ts`, `src/pages/admin/data.tsx` |
| conduit | 21 | `src/lib/permissionUtils.ts`, `src/hooks/usePermissions.ts` |
| business-suite-unified | 9 | `src/lib/permissionsService.ts` |
| R80.4 | 2 | `src/lib/permissions.ts` |
| throughput | 2 | `src/lib/teamPermissions.ts` |
| braden | 0 | — |

Six maps, five apps, one screen that governs none of them.

---

## The live hazard, which is the reason this cannot just sit

Wiring this table up naively would **lock a tenant's own owner out of their
tenant**. FutureBuild Academy's matrix as it stands today:

| Role | granted | denied |
|---|---:|---:|
| `owner` | **0** | **54** |
| `platform_admin` | 0 | 54 |
| `gto_admin` | 0 | 54 |
| `member` | 0 | 54 |
| `viewer` | 0 | 54 |
| `guest` | 0 | 54 |
| `gto_staff` | 21 | 33 |
| `recruiter` | 8 | 46 |
| `tenant_admin` | 54 | 0 |

324 explicit denials, including every capability for `owner`. That is a
perfectly reasonable thing for an admin to have clicked in a screen that does
nothing. **It becomes an outage the day enforcement is switched on**, and it
will look like the enforcement change broke the tenant rather than like data
that was already wrong.

Braden Group and Lookn are not in that state, but the same class applies:
whatever those matrices say has never been tested against reality.

---

## Why this is a design job, not a wiring job

The two vocabularies **do not intersect at all**.

| | Style | Count | Example |
|---|---|---:|---|
| `capability_catalogue` | dotted, resource-scoped | 54 | `crm.contacts.read` |
| crm7 `ALL_PERMISSIONS` | snake_case, verb-first | 105 | `view_contacts` |

**Literal overlap: zero.** So "point `usePermissions` at the table" is not a
possible instruction. Someone has to decide the mapping between 105 app
permissions and 54 catalogue capabilities, and the counts alone say the
catalogue does not cover crm7's surface — 51 app permissions have no obvious
capability, and the catalogue's `conduit.*` and `funding.*` families have no
crm7 call sites at all.

The scopes also disagree: the catalogue splits `platform` (14) from `tenant`
(40), and `can_write_role_capability()` already fails closed on an uncatalogued
capability. The app maps have no such distinction.

---

## CORRECTION, same day: the "retire it" option is largely foreclosed

Written before checking for an active lane, which was a gap in the original
draft. There is one, and it changes the answer.

`crm7/supabase/migrations/20260904000000_tenant_roles_clone_and_user_overrides.sql`
on branch `feat/tenant-roles-and-user-overrides` builds **clone-then-customise
roles and per-user capability overrides on top of `role_capabilities`**, citing
operator rulings given on 2026-08-24:

> "ability to clon then customiz a role as desired"
> "a field officer may be working in higher duties ... how do we keep the user
> type default permissions but assign permissions for individual users"
> "generally roles will be unique to the organisation ... customizable in the UI
> for each tenant owner"

That is the operator commissioning work **on this table**, so phase 0 below is
effectively answered: it is the intended store, not scenery to remove. The
sizing keeps the retire column only because the *enforcement* half is still
unwired — a role you can clone and customise still gates nothing until
something reads it.

That lane also independently measured 1,296 rows across 3 tenants, matching
this document exactly, and identified a different root cause for the same
symptom: `loadTenantRoles()` was told by the W4 spec to read a `user_roles`
table **that was never created**, so tenant-defined roles could never appear.
Their `tenant_roles` registry is the real fix. The change this lane shipped on
2026-08-24 — reading `portal_role` as well as `role` — makes the canonical
roles visible and is a **stopgap that their registry supersedes**, not a
competing design. Whoever lands `tenant_roles` should repoint `loadTenantRoles`
at it.

**Neither lane knew about the other while both were measuring the same table.**

## Proposed shape of the work

Not a recommendation to build — a sizing, so the ruling has numbers under it.

| Phase | Work | Size |
|---|---|---|
| 0 | **Ruling: is this table the intended source of truth, or should it be retired?** Everything below depends on the answer | operator |
| 1 | Decide the vocabulary. One list, or an explicit 105→54 mapping with the gaps named | design, ~1 session |
| 2 | Reconcile existing data against it, including FutureBuild's 324 denials — those are a data decision, not a migration | ~1 session |
| 3 | One reader — a single resolver both the DB (RLS helper) and the apps call, so a capability cannot mean two things | ~1 session |
| 4 | Migrate 599 call sites, app by app, behind a flag, crm7 (565) last | several sessions |
| 5 | A gate asserting the table has a consumer, so it cannot silently become scenery again | small |

**If the ruling is "retire it":** phases 1–4 vanish. The work becomes removing
the editor, dropping the table, and recording why — perhaps half a session. The
1,296 rows would then be deleted rather than migrated, which is a smaller and
much safer outcome than wiring them.

**A cheap interim, valid under either ruling and worth doing regardless:** make
the editor state on screen that it records intent and does not yet gate
anything. One paragraph. It stops the count of well-intentioned wrong edits
growing while the ruling is pending — 918 already exist.

## Proposed owner — now identifiable by name

The lane building `feat/tenant-roles-and-user-overrides`. They are already
inside this table, already acting on operator rulings about it, and already
creating the registry it has always been missing. This finding is the
enforcement half of the work they are doing, and it should be handed to them
rather than opened as a parallel effort.

Failing that, the T4 permission-product lane (crm7#1481 → #1508), whose
`data_access_grants` is the estate's one *working* example of a grant that
actually narrows access.

Explicitly **not** the lane that found this. Finding it does not qualify anyone
to rule on it.

## How to re-measure this

Every number above is reproducible. Counts in this estate drift hourly, so
re-run rather than quoting this document back.

- `check-table-reach.mjs` is the gate for this exact class — it was written
  after `rate_adjustments` and `billing_cycles` shipped correct and unreachable.
  **It does not currently flag `role_capabilities`**, and that is worth knowing
  rather than treating as a clean bill: the table *is* referenced, by its own
  editor, so a reference-counting scan sees reach. The reach is circular. A
  table whose only reader is the screen that writes it passes a static
  reachability check and still governs nothing.
- `check-zero-consumers.mjs` is the sibling gate for the package form of the
  same defect.
- The row counts, the 918 edits and FutureBuild's 324 denials come from
  `public.role_capabilities` and `public.capability_catalogue` directly — group
  by `tenant_id, role` and compare `updated_at` against `created_at`.
- The 599 call sites and six hardcoded maps come from grepping each app's
  source for permission checks; they are listed by file in the table above.

**The blind spot is the finding's own strongest evidence.** If the gate that
exists for "built and unreachable" cannot see the largest instance of it, that
gate needs a notion of reach that excludes a surface reading its own writes.

## Precedent

Binding: zero-consumer-is-not-done. This is the largest instance found so far —
1,296 rows and 918 human edits against zero readers.

Related: `@bsuite/jodie`, `@bsuite/eslint-config` and `@bsuite/tsconfig` are
published and reached by zero apps (finding R-4); `rate_adjustments` and
`billing_cycles` have zero application reach (W-1). Same shape, smaller.
