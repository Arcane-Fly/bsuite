---
kind: record
authority: none
owner: bsuite
evidence:
  - scripts/check-supabase-advisors.mjs
  - scripts/audit-security-definer-guards.mjs
  - docs/security/supabase-advisor-allowlist.json
---

# Supabase advisor posture, measured — 2026-08-26

**Status:** A (approved). Measurement, not a plan. Supersedes nothing.

Project `tuybltdrdefjblnplpqo`, read live via the Supabase advisor API on 2026-08-26.
**159 security findings, zero at ERROR level.** Every finding falls into one of three
classes, and all three are correct-by-design. This document records *why*, so the next
sweep does not re-derive it and does not "fix" a warning into a weakening.

## The three classes

| Count | Level | Rule | Verdict |
|---|---|---|---|
| 139 | WARN | `authenticated_security_definer_function_executable` | covered by our own guard audit |
| 7 | WARN | `anon_security_definer_function_executable` | anon by design, all hardened |
| 13 | INFO | `rls_enabled_no_policy` | deny-all is the intent; nothing reads them |

### 139 authenticated-executable SECDEF functions

The advisor flags every `SECURITY DEFINER` function `authenticated` may execute. That is
the entire estate's RPC surface, so the count is not itself a finding. The question the
advisor cannot answer — *does the function check the caller?* — is answered by
[`scripts/audit-security-definer-guards.mjs`](../scripts/audit-security-definer-guards.mjs),
which resolves guards transitively to a fixed point rather than by keyword. Its live run
classified 139 reachable functions as 64 ANNOTATED, 56 GUARDED, 11 GUARDED-VIA,
1 RLS-HELPER, 3 TOKEN-GATED and **4 UNGUARDED**. Two of the four were closed by crm7#2048;
the remaining two are write policies on tables holding zero rows, closed by crm7#2052.

**The advisor is not a substitute for that script, and the script is not a substitute for
the advisor.** The advisor enumerates the surface; the script judges it.

### 7 anon-executable SECDEF functions

These are reachable without signing in, so they get named individually:

| Function | Why anon is correct |
|---|---|
| `get_charge_rate_quote_signing_context(p_token)` | emailed signing link |
| `redeem_charge_rate_quote_signature(p_token, …)` | emailed signing link |
| `get_host_agreement_signing_context(p_token)` | emailed signing link |
| `redeem_host_agreement_signature(p_token, …)` | emailed signing link |
| `portal_invite_accept(p_token)` | emailed invite |
| `r7_redeem_talent_pool_consent(p_token)` | emailed consent link |
| `r7_submit_public_application(p_job_id, …)` | **public careers form — no token** |

Six take a single opaque `p_token` and are gated on redeeming it. The seventh takes
caller-supplied ids and no token, which is the shape that produced our own IDOR precedent
— so it was read in full rather than assumed. It is hardened on every axis that shape
demands:

- the job id is bounded to a row that is `status='open' AND published_at IS NOT NULL`
  *before* anything else runs, so the rate-limit table cannot be seeded with invented uuids;
- the throttle is a single atomic upsert where the increment **is** the check, so
  concurrent submissions cannot all read the same pre-increment count;
- the payload INSERT runs unconditionally, including on the duplicate path where the row is
  then deleted — that asymmetry, not the insert, was the enumeration oracle;
- success and failure responses are both constant and carry no ids, so neither branch
  reveals what the server found;
- the exception handler logs `SQLERRM` server-side and returns fixed text, because SQLERRM
  carries table, column, constraint and sometimes the offending value;
- `p_source` is whitelist-validated to a channel vocabulary, `p_resume_url` must be
  `https://`, and sensitive EIS demographics are stored only on explicit consent.

No action. The WARN is the advisor observing that the function is anon-callable, which is
the requirement, not the defect.

### 13 RLS-enabled, no-policy tables

RLS on with no policy is **deny-all**, which fails closed. The risk is not exposure; it is
the opposite — a table the application reads through PostgREST would return 200 with zero
rows, silently, and read as a broken sync rather than a permissions bug.

Measured: of the 13 tables, **0 are read through PostgREST by any app**. The probe grepped
`.from('<table>')` across all six app `src/` trees. A negative result from a grep is worth
nothing without a control, so the same pattern was run against tables known to be read
directly: `profiles` → 51 call sites, `placements` → 27, `r7_jobs` → 25. The pattern works;
the zero is real.

All 13, named — because a summary that groups them is where one goes missing, and one did:

| Table | Why deny-all is correct |
|---|---|
| `anon_signing_attempts` | brute-force counter |
| `people_portal_invite_accept_attempts` | brute-force counter |
| `quote_handoff_redeem_attempts` | brute-force counter |
| `r7_talent_pool_redeem_attempts` | brute-force counter |
| `r8_quote_return_redeem_attempts` | brute-force counter |
| `people_portal_invites` | one-time token store |
| `quote_handoff_tokens` | one-time token store |
| `r8_quote_return_tickets` | one-time token store |
| `contact_merge_snapshots` | merge-undo snapshot |
| `person_merge_snapshots` | merge-undo snapshot |
| `edge_rate_limit_buckets` | rate-limit state |
| `tenant_encryption_keys` | encryption keys — the one that must never be readable |
| `xero_tax_rate_cache` | service-role cache |

An earlier version of this paragraph said "four one-time token/invite/ticket stores". There
are **three**. The fourth slot silently absorbed `xero_tax_rate_cache`, which is not a token
store at all — it is a cache written by `crm7/supabase/functions/_shared/xero-tax-rates.ts`
through the service-role connection, which bypasses RLS entirely. The class verdict still
covered it, so nothing was wrong with the conclusion; what was wrong is that a reader
checking the list against the database would have found a name that appears nowhere in the
prose. **A grouped count is where a row goes missing. Name them.**

All 13 are written and read exclusively by `SECURITY DEFINER` functions or the service-role
connection, both of which bypass RLS by definition. **Adding a policy to any of them would be
a weakening, not a fix** — most of all `tenant_encryption_keys`.

## What would change this verdict

- A new anon-executable SECDEF function that takes caller-supplied ids: re-read it in full
  against the checklist above.
- Any app gaining a direct `.from()` read of one of the 13 deny-all tables: that is the
  silent-empty defect, and it will not raise an error anywhere.
- An ERROR-level advisor appearing at all — there are currently none.

## What was actually red, and what closed it

The **Advisor sweep** gate compares live findings against
[`docs/security/supabase-advisor-allowlist.json`](security/supabase-advisor-allowlist.json)
and fails on any SECURITY WARN/ERROR that is not matched. Of the 146 WARN findings,
**exactly two** were unmatched — both minted the same day by another lane:

- `mint_r8_quote_return_ticket(p_placement_id uuid)`
- `redeem_r8_quote_return_ticket(p_token text)`

They were read in full rather than accepted on their own `@SD-JUSTIFICATION` annotations,
because `mint` takes a caller-supplied id and that is the IDOR shape. It closes it: the
tenant is read off the placement **row** after proving membership through
`auth_tenant_id_with_role`, with `IN (SELECT …)` rather than a scalar assignment — the
helper `RETURNS SETOF uuid`, and a user may hold several memberships, so a scalar would
compare whichever came back first. `redeem` takes only an opaque token, rate-limits with an
atomic upsert where the increment **is** the check, refuses by `RETURN` rather than `RAISE`
so the counter survives the refusal, locks the ticket `FOR UPDATE` against a concurrent
double-redeem, and treats the tenant as a property of the **ticket** — a wrong-tenant holder
gets the identical `invalid_or_expired` reply, so trying is not a tenant oracle.

Both are correct. Allowlisted `accepted`, with that reasoning recorded in the rule.

**After: security 159 total → 0 unallowlisted (146 accepted, 13 info); performance 1172 → 0
unallowlisted (157 tracked, 1015 info). The gate is green.**

## A latent hole in the allowlist itself

`categorize()` routes on `mode === 'tracked'` and sends **everything else** to `accepted`.
That default is the permissive branch — it suppresses the CI failure *and* the tracking
issue. So a rule written `mode: "track"`, or `"Tracked"`, or with the field omitted, stops
being tracked by anyone while still reading in the file as though it is, and nothing
downstream can distinguish that from a deliberate acceptance.

One rule in the file was already written `mode: "accept"`. It was harmless — `"accept"` and
`"accepted"` both fall to the same branch — but it is the same slip one keystroke away from
mattering.

`loadAllowlist()` now refuses any unrecognised mode at load and exits 2, naming the rule
index, its lint and the offending value. Verified with a control that must come back
positive: setting a rule to `mode: "track"` exits **2**; restoring it exits **0**. The
typo was normalised to `"accepted"`.
