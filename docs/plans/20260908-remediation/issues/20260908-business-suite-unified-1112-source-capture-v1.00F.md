---
kind: record
authority: none
owner: bsuite
---

# email_integrations: tenant_delete_email_integrations lets any staff member disconnect a colleague's mailbox

https://github.com/GaryOcean428/business-suite-unified/issues/1112

Snapshot updatedAt: 2026-09-03T07:03:08Z. Open at capture; re-read live.

## Finding

`tenant_delete_email_integrations` (and the INSERT/UPDATE siblings) on `public.email_integrations` are **tenant-role scoped**: any `owner`, `admin`, `manager` or `staff` member of a tenant may DELETE any mailbox row in that tenant, including a colleague's connected Gmail or Microsoft mailbox and, through the FK, orphan its Vault secrets.

Live policy after BSU 20261111000000 (owner clause added 2026-09-03):

```sql
USING (
  user_id = auth.uid()
  OR tenant_id IN (SELECT auth_tenant_id_with_role(ARRAY['owner','admin','manager','staff']))
)
```

The owner clause fixed the operator's own case (a member could not remove their own mailbox unless their role matched). The remaining question is the second limb: a `staff` member disconnecting a colleague's mailbox is not an ordinary staff action.

## Suggested shape

- DELETE: `user_id = auth.uid()` OR tenant role in `('owner','admin')` only.
- The same narrowing for `tenant_update_email_integrations` (a staff member may edit a colleague's signature today; only `signature_html` is column-granted for UPDATE, so the blast radius is one column).
- `email_integration_disconnect(uuid)` already applies owner-or-tenant-owner/admin; align the row policy with it so the two paths agree.

## Register

Raised on the PI lane's request (2026-09-03 04:14Z directive to the email lane) so the finding has a row. Not a live-client defect; no hand-apply.
