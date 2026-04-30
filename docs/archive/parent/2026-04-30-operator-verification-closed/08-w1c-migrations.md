# Item 8 — W1-C migrations applied

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** ✅ **VERIFIED COMPLETE**

## Operator claim history

Resolved in v1.00W "Already Resolved" §Original#2 (WS-G, 2026-04-25). Re-verifying as part of WS-β sweep.

## Verification command

`mcp__claude_ai_Supabase__list_migrations(project_id="tuybltdrdefjblnplpqo")`.

## Evidence (captured 2026-04-28)

The `migrations` array returned by list_migrations contains, in order:

| Version | Name | Required by W1-C? |
|---|---|---|
| `20260425100032` | `phase12_tenant_hierarchy_hardening` | yes |
| `20260425100051` | `phase12_hierarchy_rls` | yes |
| `20260425100056` | `phase6_11_seed_enterprise_subscriptions` | yes |

All three migrations are present and applied (timestamps 2026-04-25 ~10:00 UTC). The `team_members_admin_rls` migration (`20260425103122`) was applied immediately after, depending on the hierarchy RLS being in place.

Most recent migration on record: `20260427010341_security_definer_hardening` (the SECURITY DEFINER NULL search_path fix from the 2026-04-27 review session).

## Outcome

✅ **VERIFIED COMPLETE.** All three W1-C migrations applied. Removed from v3.00W handoff.

## Memory key written

`bsuite_w1c_migrations_verified` (PUT 2026-04-28).
