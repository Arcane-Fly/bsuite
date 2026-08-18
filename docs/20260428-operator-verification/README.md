# Operator Verification Sweep — 2026-04-28

WS-β verification of 8 operator-reported-or-pending items from `docs/20260425-operator-handoff-v1.00W.md`. Run end-to-end via Supabase MCP + Management API + JWKS-endpoint introspection.

> **Evidence-link correction, 2026-08-17.** Five of the eight links below pointed at files that are
> not in this repository, so an agent following them concluded the evidence was never written. It
> was. Items **1, 2, 6, 7 and 8** were archived on 2026-04-30 (`b931ddc2`, a 100%-similarity rename,
> nothing rewritten) into `docs/archive/parent/2026-04-30-operator-verification-closed/`, and that
> whole archive tree was then moved **out of the repo** by the 2026-07-25 cleanup. The files are
> intact on disk at:
>
> ```text
> ~/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/parent/2026-04-30-operator-verification-closed/
> ```
>
> Only items 3, 4 and 5 — the three that verified **incomplete** — were kept in-repo, which is why
> exactly those three still resolve. The links below now say where each file actually is.

## Outcomes

`(archived)` = evidence is out-of-repo at the path in the banner above, under the same filename.

| # | Item | Outcome | Evidence | Memory key |
|---|---|---|---|---|
| 1 | Azure `xms_edov` optional claim | UNVERIFIABLE — operator-only Microsoft Graph call needed | `01-azure-xms-edov.md` (archived) | (none — operator confirms next session) |
| 2 | `*.vercel.app` wildcard redirect URI removal | ✅ VERIFIED COMPLETE | `02-vercel-wildcard-redirect.md` (archived) | `bsuite_vercel_wildcard_redirects_removed_verified` |
| 3 | `OAUTH_STATE_SECRET` set + edge fns redeployed | ❌ VERIFIED INCOMPLETE — both secret missing AND deployed code missing HMAC pattern | [03](./03-oauth-state-secret.md) | `bsuite_oauth_state_secret_verified_incomplete` |
| 4 | TGA GUCs (`app.tga_sync_url` + `app.tga_sync_secret`) | ❌ VERIFIED INCOMPLETE — both NULL | [04](./04-tga-gucs.md) | `bsuite_tga_gucs_verified_incomplete` |
| 5 | `TGA_SYNC_ENABLED=true` flip + active sync | ❌ VERIFIED INCOMPLETE — depends on Item 4 | [05](./05-tga-sync-enabled.md) | `bsuite_tga_sync_enabled_verified_incomplete` |
| 6 | HS256 Previous JWK revoked | ✅ VERIFIED COMPLETE — JWKS shows ES256-only | `06-hs256-jwk-revoked.md` (archived) | `bsuite_hs256_jwk_revoked_verified` |
| 7 | `pg_cron` + `pg_net` extensions | ✅ VERIFIED COMPLETE | `07-pg-cron-pg-net.md` (archived) | `bsuite_pg_cron_pg_net_verified` |
| 8 | W1-C migrations applied (3) | ✅ VERIFIED COMPLETE | `08-w1c-migrations.md` (archived) | `bsuite_w1c_migrations_verified` |

**Summary:** 4 verified complete (2, 6, 7, 8), 3 verified incomplete (3, 4, 5), 1 unverifiable from agent (1).

## Bonus findings (surfaced during sweep, NOT in original 8 items)

- **Item 7 from v1.00W (Xero OAuth):** ✅ ALREADY DONE — `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` all present in Supabase secrets. Operator must have completed Part O.2 between v1.00W publish and 2026-04-28.
- **Edge-fn secret-name mismatch:** Deployed `oauth-microsoft-email` v26 reads `MICROSOFT_CLIENT_ID` (absent) while `AZURE_CLIENT_ID` is set. Same for `oauth-google-email` reading `GOOGLE_EMAIL_CLIENT_ID` (absent) while `GOOGLE_CLIENT_ID` is set. See [03](./03-oauth-state-secret.md) §"Bonus secret-name discrepancy".

## Pointers

- v1.00W handoff: `docs/20260425-operator-handoff-v1.00W.md` (kept for git history)
- v3.00W handoff (post-verification, accurate): `docs/20260428-operator-handoff-v3.00W.md`
- Memory key listing reality: `bsuite_pending_actions` (rewritten 2026-04-28)
