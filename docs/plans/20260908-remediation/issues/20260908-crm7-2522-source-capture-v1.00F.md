---
kind: record
authority: none
owner: bsuite
---

# Two pages show a raw auth.users UUID as the approver, on an RLS claim that is false

https://github.com/GaryOcean428/crm7/issues/2522

Snapshot updatedAt: 2026-09-07T02:40:32Z. Open at capture; re-read live.

Two pages show a user a raw `auth.users` UUID where a person's name is available. Both were justified by an RLS claim that is **false against the live database**.

## What renders today

```
src/pages/leave/[id].tsx:333    <dd className="font-mono text-xs">{request.approved_by.slice(0, 8)}</dd>
src/pages/claims/[id].tsx:802   label={`Approved by ${claim.approved_by}`}          // the FULL uuid
```

So a leave request approved by a colleague reads `Approved by 3f2a91c4`, and a claim reads `Approved by 3f2a91c4-8b1e-4d77-a2f5-9c0e6b4d1a83`.

## The reason recorded for it was wrong

`leave/[id].tsx` said, and cited `claims/[id].tsx` as precedent:

> RLS on `profiles` only permits a user to read their own row (`auth.uid() = id`) — so ... the approver is shown as a short id rather than a joined display name.

Measured against the live database on 2026-09-07 (`pg_policies`, project `tuybltdrdefjblnplpqo`), `profiles` has **three** permissive SELECT policies, and permissive policies **OR**:

| policy | `USING` |
|---|---|
| `Users can view own profile` | `(SELECT auth.uid()) = id` |
| `profiles_select_platform_developer` | `is_platform_developer()` |
| `profiles_select_same_tenant` | `EXISTS (user_tenants me JOIN user_tenants them ON them.tenant_id = me.tenant_id WHERE me.user_id = auth.uid() AND me.status='active' AND them.user_id = profiles.id AND them.status='active')` |

An approver is an active member of the same tenant, so **their name is readable** — either directly, or through the `list-members` SECURITY DEFINER function already used by `field-officers/admin-link.tsx` and `field-officers/case-notes/index.tsx`.

The id is not a platform constraint. It is unfinished work, and the note explaining it is what stopped anyone measuring it.

## Where the false claim came from

`supabase/migrations/baseline/20260807_prod_baseline_schema_dump.sql` carries **only** the own-row policy. The other two were added later, by `20260918000000_settings_users_could_never_show_a_name.sql` — a migration whose stated purpose was to make exactly this kind of name lookup work. Anyone reading the dump as "live" gets the pre-fix answer.

**Generalisable:** `bsuite-rls-authz-red-team` names the baseline dump as the source of truth for live table shapes. It is a dated snapshot and it has drifted by at least one migration on `profiles`. When a policy decides behaviour, query `pg_policies`; use the dump for column shapes, not policy sets.

## Suggested fix

Resolve `approved_by` to a display name through `listMembers(tenantId)` — the established pattern, and it fails closed (403s a non-member) — falling back to the id only when the approver is genuinely not resolvable. Two pages, plus a case each asserting a name renders where the roster has one.

## Already done (crm7#2520)

The false comment is corrected in `leave/[id].tsx`, `field-officers/admin-link.tsx` and `field-officers/case-notes/index.tsx`. Only the **rendering** is left, which is why it is filed rather than bundled.

Left alone deliberately: `src/hooks/useSubscription.ts:89` says "the RLS policy **that lets a user read their own row** is `auth.uid() = id`" — precisely scoped and true. `src/services/userTenantService.ts:150` names that policy while reading the caller's own row, where it is the one that applies.
