---
kind: record
authority: none
owner: bsuite
---

# tenant_delete_email_integrations lets a colleague disconnect your mailbox

https://github.com/GaryOcean428/business-suite-unified/issues/1107

Snapshot updatedAt: 2026-09-03T05:02:05Z. Open at capture; re-read live.

Register line requested by the PI (inbox fd4a4897, 2026-09-03) so this is not lost in the email-p0 thread.

**Policy:** `tenant_delete_email_integrations` on `public.email_integrations`.

**What it does today** (live, 2026-09-03):

```sql
USING (
  user_id = auth.uid()
  OR tenant_id IN (
    SELECT public.auth_tenant_id_with_role(
      ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'staff'::text]
    )
  )
)
```

The first limb is correct: you may always remove your own mailbox. The second limb is tenant-ROLE scoped, so any active `staff` / `manager` / `admin` / `owner` in the same tenant can DELETE a colleague's `email_integrations` row through the ordinary PostgREST path. The SECURITY DEFINER RPC `email_integration_disconnect(uuid)` (BSU migration `20261111000000`) is tighter — owner of the row, or tenant owner/admin, or service_role — but the table policy is still the wider one.

**Why it is not in this lane's hotfix:** the operator's P0 was "disconnect does not disconnect" (a DELETE that matched zero rows still toasted success). Adding `user_id = auth.uid()` unblocked that. Narrowing the colleague limb is a separate product call (should a tenant admin be allowed to disconnect someone else's mailbox? staff?).

**Ask:** drop `manager` and `staff` from the role array, keep owner/admin, and make the RPC the only path the UI uses. Do not do it in the 18:00 window without a line from the PI — live clients are in production.

Related: crm7 `emailService.disconnect()` now calls the RPC, not the table DELETE.
