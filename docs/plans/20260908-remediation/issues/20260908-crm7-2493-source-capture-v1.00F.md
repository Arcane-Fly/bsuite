---
kind: record
authority: none
owner: bsuite
---

# the null-tenant fail-open class: 6 more reads drop the tenant predicate entirely when the tenant is unknown

https://github.com/GaryOcean428/crm7/issues/2493

Snapshot updatedAt: 2026-09-06T09:18:01Z. Open at capture; re-read live.

Found while closing accountability `SEND_BACK` 8c107f60 (crm7#2492). The send-back's rule is
**a NULL meaning UNKNOWN must never be read as UNRESTRICTED**. `emailService.getIntegrations`
was one instance; it is a class, so the class gets a row rather than a quiet fix inside a
security PR.

## The shape

```ts
let query = supabase.from(T).select(...)
if (tenantId) query = query.eq('tenant_id', tenantId)   // falsy -> NO predicate at all
```

A falsy tenant does not narrow to a safe default — it **removes the scope**, and the read
returns every row RLS will hand the caller. On this estate `auth_tenant_id()` resolves to the
acting tenant if one is set and otherwise to **every active membership**, so for a
multi-tenant account the client scope is frequently the only thing that narrows a list to the
tenant they are working in. 2 accounts hold active memberships in more than one tenant today.

## Method

```
grep -rn "if *(.*[Tt]enant.*) *\(query\|q\)\? *=\?.*\.eq(['\"]tenant_id" src/
```
plus a read of every `if (tenantId)` / `if (!tenantId)` site in `src/`. Unit is the **call
site**, not the file.

## Same class — 6 PostgREST sites (crm7 `development`)

| site | table | note |
|---|---|---|
| `src/services/chargeCalcSourceAdapters.ts:136` | `placements` | `opts.tenantId` optional; falsy -> estate-wide read |
| `src/services/chargeCalcSourceAdapters.ts:170` | (same adapter) | same shape |
| `src/services/formLayoutService.ts:17` | `form_layouts` | falsy `tenantId` -> every tenant's layouts, not just the shared `tenant_id IS NULL` ones |
| `src/services/picklistService.ts:9` | `picklists` | same shape as form layouts |
| `src/services/platformService.ts:124` | `developer_impersonation_sessions` | may be an intentional "all tenants" developer view — **needs a stated verdict either way**, because today it is indistinguishable from the defect |
| `src/services/tenantSwitcherService.ts:415` | `super_admin_action_audit` | same question as above |

Different layer, same shape: `src/lib/sync-service.ts:442` (local SQLite mirror, no RLS behind it).

## NOT the class — the sweep's positive control

These take the falsy branch and **narrow to a safe default**, which is what the fix looks like:

- `src/services/uiConfigService.ts:29` -> `else query.eq('scope', 'platform')`
- `src/services/schemaBuilderService.ts:40` -> `else query.is('tenant_id', null)`

A sweep that could not separate these two from the six above would be measuring nothing.

## Also in `emailService`, different class, deliberately not fixed in the security PR

- `connectIMAP` (`:343`) and `connectSMTP` (`:402`) INSERT with a **caller-supplied**
  `tenantId: string` rather than one resolved at the service boundary.
- `updateIntegration(id, updates)` (`:710`) UPDATEs `email_integrations` **by id**, with no
  tenant and no `user_id` predicate — the D-165 by-id shape on a write path. One live caller
  (`src/pages/settings/email-accounts.tsx:502`, signature save), so it is not a no-op change
  and wants its own bite.

## Also found, user-facing

`emailStore.integrationsError` is **set** by `loadIntegrations` and read by **no component**
(`grep -rn integrationsError src/` -> stores and tests only). Every failure of the mailbox
load — including the new fail-closed refusal — renders as an empty mailbox list with no
explanation.

## Ask

A verdict per row, not a blanket fix: for each site, either the tenant is required (use
`requireTenantId()`, the guard already in `src/lib/`) or the unscoped read is deliberate and
says so in a comment that names who may see it.
