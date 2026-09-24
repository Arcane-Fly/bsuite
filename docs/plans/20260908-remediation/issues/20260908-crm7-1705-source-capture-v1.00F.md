---
kind: record
authority: none
owner: bsuite
---

# No way for a client to connect SMTP, Google or Azure email and send from their own account — raised 20+ times

https://github.com/GaryOcean428/crm7/issues/1705

Snapshot updatedAt: 2026-09-06T09:16:12Z. Open at capture; re-read live.

Operator observed: There is still no clear way for a client to connect SMTP, Google or Azure email and send from their own account. The operator notes this has been raised more than twenty times.

**Route/surface:** client email-account settings (crm7)

Directive: D-80 (2026-08-13)

## Why filed in crm7 (cross-app reasoning, as required)
Connecting a client's own email account (SMTP / Google / Azure) is a client-facing settings capability, most naturally surfaced in crm7's settings area where the client already manages their profile/org settings and where outbound communications (see item 29, `/communications/compose`) are sent from.

## Acceptance criteria
- A client can connect their own SMTP credentials, or OAuth-connect a Google or Azure email account, from crm7 settings.
- Once connected, outbound communications sent through crm7 (e.g. via `/communications/compose`) can be sent FROM the client's own connected account, not only from a shared platform sender.
- The connection flow is durable (reconnect/refresh handled) rather than a one-time token that silently breaks.

## Mandatory before merge
- **Validation loop:** both — §9.1 (an email actually sends via the connected account, verified end-to-end) and §9.2 (the connection UI is clear and discoverable, given this has been raised 20+ times without resolution).
- **Equivalence target:** An email sent via a connected client account arrives with that account as the sender (verified against the client's actual mailbox/sent folder), not just recorded as "connected" in the database.
- **Cross red-team:** bsuite-auth-guardian
- **Skills to load:** auth-supabase, auth-oauth-native-app-flows

---
*Filed under operator directive D-80 (2026-08-13). Filing is not addressing (D-59) — no fix is implied or claimed by this issue.*
