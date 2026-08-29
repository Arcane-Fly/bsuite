---
kind: record
authority: engineering
owner: bsuite-lane
evidence:
  - scripts/check-added-security-definer.mjs
---

# The seven `anon`-executable SECURITY DEFINER functions are token-guarded, and correct

**Date:** 2026-08-26 · **Status:** A (Active — the measurement, and what it licenses)

The Supabase advisor exports 144 `*_security_definer_function_executable` warnings.
This document is about the seven that `anon` can reach, because those are the ones
worth looking at first and the ones a reader will assume are the problem.

**They are not a problem. They are the design, and this records the evidence so the
next person does not re-derive it.**

---

> ## AMENDED 2026-08-29 — production has EIGHT, not seven
>
> Re-measured directly against production (`tuybltdrdefjblnplpqo`):
>
> ```sql
> select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
> where n.nspname='public' and p.prosecdef
>   and has_function_privilege('anon', p.oid, 'EXECUTE');
> -- 8
> ```
>
> The seven named below are all present and the verdict on them is unchanged —
> each is token-guarded or a deliberately public form, and they remain correct.
>
> **The eighth is `is_developer_admin()`**, which takes no arguments and no token.
> It was missed because every function this document reasoned about takes a
> `p_token text` (or is the public application form), and the survey that produced
> the list was framed around that shape. A function with no token did not look
> like a member of the set.
>
> **Anon-executability is NOT the defect here.** `is_developer_admin()` is a
> legitimate RLS helper called by 4 policies; being SECURITY DEFINER and checking
> the caller is exactly what such a helper must do, and for `anon` both
> `auth.email()` and `auth.uid()` are NULL so it can only fail closed.
>
> **The actual defect, found while checking it:** the function queries
> `public.admin_users`, and **that table does not exist in this database**.
>
> ```
> select public.is_developer_admin();
> ERROR: 42P01: relation "public.admin_users" does not exist
> ```
>
> It fails for every role. PL/pgSQL plans the whole RETURN expression, so the
> `OR EXISTS (...)` never short-circuits past the missing relation. braden's
> 2025-era migrations were never applied here — the ledger has no
> `20250101_create_admin_users_table` but does have
> `20260828120000_restrict_cms_writes_to_admins`, because the project was created
> 2025-10-09, months after those files were authored. The policy landed without
> its table. Fixed by braden#545.
>
> **The filename still says "seven" deliberately.** Renaming would break the
> estate's citation graph and trip `check-doc-naming`; the count is corrected
> here, where a reader who opened the file will actually see it. What the title
> names is the SET this document analysed, and that set is still seven.
>
> **The transferable lesson:** a survey framed by a SHAPE — "functions taking a
> token" — silently defines its own denominator. The count was right for the
> question asked and wrong for the question the title implies. State the
> selection predicate, not just the total.

---

## 1. What the 144 actually says

| | count |
|---|---:|
| SECURITY DEFINER executable by `authenticated` | 137 |
| …carrying `@SD-JUSTIFICATION` | 62 |
| …never justified | **75** |
| executable by `anon` | **7** |

The 75 were added after Phase 2.1A/2.1B annotated the estate, when nothing asked a
new function to justify itself. `security-definer-must-justify-itself` now stops a
76th; it does not touch the 75.

## 2. The seven, and why `anon` is correct for each

These are token-redemption and public-intake flows. The person holds a **token**,
not an account — an e-signer opening a link, an applicant submitting a form, an
apprentice accepting a portal invite. `authenticated` is exactly the thing they are
not. SECURITY DEFINER is what lets a tokened stranger touch one row and nothing else.

- `get_charge_rate_quote_signing_context(p_token)`
- `get_host_agreement_signing_context(p_token)`
- `redeem_charge_rate_quote_signature(p_token, …)`
- `redeem_host_agreement_signature(p_token, …)`
- `r7_redeem_talent_pool_consent(p_token)`
- `r7_submit_public_application(…)`
- `portal_invite_accept(p_token)`

## 3. The guard, measured rather than assumed

Every one of the seven, checked against the live definition:

| property | 7 of 7 |
|---|---|
| **hashes the token** — never compares the raw value | ✅ |
| **checks `expires_at`** | ✅ |
| **rate-limited** | ✅ |
| single-use (`used_at` / `redeemed_at` / consumed) | 5 of 7 |

The two without single-use are `portal_invite_accept` and
`r7_submit_public_application`, and neither should have it: a public application
form is not a redemption, and an invite is consumed by acceptance rather than by
first read.

**Hashing is the load-bearing one.** A stored raw token is readable by anyone who
reaches the row; a stored hash is not, and a timing-safe comparison against it is
what makes an `anon` grant survivable.

## 4. What this does NOT license

- It is **not** a general exemption for SECURITY DEFINER. It is a statement about
  seven named functions with a shared, verified shape.
- It does **not** annotate them. The `@SD-JUSTIFICATION` overlay is a
  `CREATE OR REPLACE` carrying each body **verbatim** (Phase 2.1B's own words:
  *"ZERO behavioural change, search_path values preserved EXACTLY"*). That is ~40 KB
  of security-critical code across seven functions, and it is mechanical work that
  should be rehearsed, not improvised. **This document exists so that work needs no
  re-investigation — only care.**
- It says nothing about the other 68.

## 5. The trap this sits on

Two of the scariest-sounding functions in the advisor output —
`admin_revoke_user_sessions(p_user_id)` and `xero_lock_and_get_refresh_token` — are
**not executable by `authenticated` or `anon` at all**. A name is not a finding.

And my own first probe reported 28 functions as unguarded because its keyword list
omitted `auth_tenant_id()`, so `gto_assessment_summary` and
`import_qualification_from_catalog` read as open while they raise `42501` correctly;
it also could not see `data_grant_create` delegating its check to
`_data_grant_insert`. **A guard one call away is invisible to a keyword scan.**
Read the definition.
