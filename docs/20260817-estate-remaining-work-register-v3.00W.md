# Estate remaining work — the consolidated register, v3

> ## VERDICT PASS 2026-09-02 — the 29 unjudged rows are judged, and 63 rows now carry one
>
> The banner below says **"29 rows remain unjudged and are NOT counted as anything — an
> unmeasured row is not a passing row."** They are measured now, against the checked-out trees,
> the live Fair Work API and live production Postgres. The full table is at the end of this
> document; the headline is:
>
> | | |
> |---|---|
> | **CONFIRMED OPEN** | **35** |
> | Closed | 22 |
> | Superseded | 6 |
>
> **Four rows were WRONG, not merely stale, and acting on them would have wasted the work:**
>
> 1. **W-1's second limb is false and is struck.** The register recorded *"live FWC returns 0
>    penalty rows for MA000036"* as a fact about **Fair Work**. The Modern Awards Pay Database
>    returns 100 rows for every award probed. `api/fwc.js` chose its subscription key with
>    `FWC_API_KEY || FAIRWORK_API_KEY`, and `||` takes the first name **present**, not the first
>    that **works** — a dead key permanently shadowed a working one, with no retry on the 401.
>    **A configuration defect on our side had been written down as a property of the upstream**,
>    and the escape hatch for 19 awards with empty penalty tables was abandoned on that basis.
>    Fixed: R80.4#295.
>
> 2. **W-1's count moved.** 19 of 21 awards get an empty penalty table, not 20 of 21 — MA000036
>    was bridged after the row was written.
>
> 3. **W-2's two specific claims are false and are struck.** *"19 of 21 awards have zero
>    runtime-reachable engine modules"* and *"20 of 21 have no reachable rate constructor"*:
>    measured per award, **zero of 21** have either. Every award now reaches its own rate
>    module. The reachability denominator also grew — 118 of 224 reached, not 67 of 179. What
>    remains true is the larger half: the per-award penalties, allowances, overtime, shift, leave
>    and redundancy modules are unreachable, and `scripts/reachability.mjs` passes only because
>    393 of 425 unreached functions sit in one allowlisted group. **The gate is green by
>    declaration, not by wiring.**
>
> 4. **W-8's first three limbs closed and its fourth is worse than recorded.** The migration IS
>    applied, the reader IS wired, and payroll tax IS state-based. But **nothing can write the
>    columns**: 7 tenants, 1 row in `tenant_settings`, and `super_rate`, `wc_rate`, `wic_code`
>    are NULL on all of it. Every tenant is still quoted superannuation 12% and workers'
>    compensation 4.7%. The machinery is built, applied and wired, and **inert because no human
>    has any way to enter a number into it.**
>
> **Fixed in this pass**, both found by measuring rather than re-reading:
> **W-4** — the school-based apprentice note asserted a stage "is correct" from one limb of a
> two-limb clause, telling the operator to quote the lower stage for 16-to-17-year-olds
> (R80.4#296); and the FWC key defect above.
>
> Two rows are recorded as narrower than written (**U-12**, **M-2**), and six are superseded
> outright. The nine documentation rows are re-verdicted too, and one new question is answered:
> **36 of the 61 files in `docs/plans/` read as live work and are not.**


> **VERDICT STATE, measured 2026-08-18.** This register was written as a list of
> FINDINGS, and 43 of its 46 rows carried no verdict at all — a reader could not
> tell which were still true. **14 are now measured against live sources** and
> carry their evidence inline: the whole K series (invented data in shipped UI)
> is CLOSED, W-10 is closed by deletion, and W-11 and U-12 are CONFIRMED still
> open with a positive control behind each zero.
>
> **K-2 was still live and was fixed in this pass** (BSU#772): `/government`
> asserted the Fair Work and training.gov.au APIs were *Connected* with a
> clock-derived "synced an hour ago", and its Sync button waited 1.5s against
> nothing before stamping a fresh timestamp. Nothing was ever contacted.
>
> **29 rows remain unjudged** and are NOT counted as anything —
> W-1, W-2, W-3, W-4, W-5, W-7, W-12, W-13, U-1, U-2, U-3, U-4, U-5, U-6…. An unmeasured
> row is not a passing row, and the tally above says so rather than rounding it
> up.

**Document:** `docs/20260817-estate-remaining-work-register-v3.00W.md`
**Date:** 2026-08-17 · **Version:** 3.00W · **Status:** W — Working
**Supersedes:** `docs/20260814-estate-remaining-work-register-v2.00F.md` in full, including three of its

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

own findings that this pass proved wrong. v2 read the parent `docs/` only; this reads every
submodule's `docs/` as well.

---

## Method, and the denominator

**431 documents.** 270 non-archive markdown files under `bsuite/docs`, plus every submodule's own
tree: crm7 50, throughput 29, business-suite-unified 25, braden 22, R80.4 19, conduit 16. Six
parallel audits, one per submodule, each reading **every** file in its tree — 50/50, 29/29, 25/25,
22/22, 19/19, 16/16 — and re-measuring each claim against that repo's code with ripgrep, plus live
SQL against `tuybltdrdefjblnplpqo` for anything that is a database fact.

**The evidence rule.** A claim about a table is settled by DDL in `supabase/migrations` **and** by
`to_regclass` against production — those two disagree more often than anyone expects, in both
directions. A claim about a component is settled by finding a real importer that is not a test and
not a barrel; a symbol with no importer is `UNREACHABLE`, which is a different and much more common
status than `OPEN`.

**The operator's tie-break, applied throughout, verbatim:** *prefer the most advanced, UX-friendly,
cutting-edge version of any feature — e.g. Airtable-style data manipulation is preferred over any
other report feature.* Where two generations of a capability exist, this register names one winner
and marks the rest SUPERSEDED. It does not list both.

---

## 0. What this pass changes about the estate's own account of itself

**1. v2 filed two findings that are wrong, and one that was right and has since been fixed.**

Taking the third first, because I nearly recorded it as a retraction and it is not one.

- **P0-3 — "braden CMS returns zero rows to anonymous visitors" was TRUE when filed and is now
  FIXED.** Live `pg_policies` today shows `anon_read_published_content_pages roles={anon}` and
  `anon_read_published_custom_pages roles={anon}`, so the public CMS reads fine — but that is
  because **`business-suite-unified/supabase/migrations/20260820020000_cms_pages_anon_published_read.sql`
  landed on 2026-08-16**, commit `03c6c4d`, whose subject names P0-3 explicitly. bsuite#2004's
  positive-controlled anon probe was correct on 2026-08-14. **Close bsuite#2004 as completed, not
  as not-a-defect.**
  I record the near-miss because it is the same error as the two below, pointing the other way:
  reading a current state and concluding a past claim was false. The only thing that separated
  them was checking *when* the policy arrived.

**The two that are genuinely wrong:**

- **V-6 — "R80.4 tolerates 131 baselined lint violations including 88 `no-hardcoded-colours` and
  7 `no-undef`" is FALSE as stated.** The real baseline is **35**, and the 88 colour violations
  were *fixed*, not baselined (commit `3e25f7f`). The 7 `no-undef` were config noise resolved by
  `languageOptions.globals`, not latent `ReferenceError`s. R80.4's ratchet is working; I read a
  historical number as a current one.
- **The z-index table's "HealBanner `z-[1000]` (braden)" is FALSE.** It is `relative z-40`
  (`src/components/system/HealBanner.tsx:33,49`); `z-[1000]` appears nowhere in braden's `src/`.

The pattern in both retractions is the same and worth naming: **I trusted a document's number
instead of re-running the measurement** — a historical count in R80.4's case, a stale estate table
in the z-index case. The doctrine that catches this is already written down; it is why this pass
measured everything twice, and it is what caught the P0-3 near-miss above before it became a third
false claim in the opposite direction.

**2. Documentation is not merely stale — in five of six submodules it is now actively misleading.**
Not "out of date": asserting the opposite of what the code does, in ways that would cause an agent
to do damage.

- **BSU has four documents asserting it is the canonical page-builder author surface.** ADR-0001
  dropped `tenant_page_layouts` and removed `/developer/pages` three months ago. The drop migration
  sits in the same repo as the docs claiming the feature.
- **Three BSU documents and one conduit document describe cookie SSO as a shipped feature.** It was
  removed 2025-02-27 and is the single loudest do-not-revert guardrail in `AGENTS.md`. Documents
  inside the estate are currently pointing agents at the exact regression the guardrail exists to
  prevent.
- **crm7's ADR on `xero-node` (Status: Accepted, "do not adopt") is contradicted by shipped code** —
  `xero-invoice-submit/index.ts:24` imports `xero-node@15.0.1` — and a second crm7 doc describes
  that same ADR as explaining *why* the SDK is used. Three documents, three incompatible readings.
- **braden's getting-started guide is a walkthrough of an admin surface with no routes.**
- **throughput's roadmap contains two contradictory roadmaps in one file**, one marking Stripe, MFA,
  OAuth and E2E `[x] COMPLETED` and the other marking the same items `[ ]`. Zero Stripe imports
  exist.

**3. The largest single fabrication class in the estate is in BSU, and it bills customers.**
`src/pages/Billing.tsx` renders a "Subscription breakdown" and a bold `$N/mo` total computed
entirely from `src/lib/pricing.ts:20-46`, a hardcoded price table in the client bundle, multiplied
by a real seat count — and `APP_LINE_ITEMS` bills **every** paying tenant for CRM7 *and* Conduit
*and* R8 *and* Throughput regardless of entitlement. Nothing on the page reads a Stripe price,
invoice or line item. The standing rule is *"never display mock data in the UI, especially for
financial or account-related information."* This is that rule's worst case, live.

**4. R80.4 cannot reach the Fair Work API at all, so every wage it quotes is a bundled snapshot.**
`R80.4/scripts/api-availability.mjs MA000020` returns **HTTP 401 on all five MAPD endpoints** with a
well-formed key present. The repo's own definition-of-done gate reports `NOT DONE — 21 award(s)
failing something unbaselined`. The governing operator ruling is *"the amounts are pulled from the
api."* They are not. This is a compliance exposure and it is new to this register.

---

## 1. P0 — live exposure, or one step from it

| # | Item | Repo | Evidence | Size |
|---|---|---|---|---|
| **P0-1** | ~~`tenant_encryption_keys` grants full CRUD to `anon` and `authenticated` over wrapped tenant DEK material~~ | DB | **SUPERSEDED 2026-08-25 — ALREADY FIXED BEFORE THIS ROW WAS PUBLISHED. CLOSED.** The grants were revoked by `crm7/supabase/migrations/20260820010000_tenant_encryption_keys_revoke_anon_grants.sql`, merged in crm7 PR #1811 on 2026-08-18. A memory record dated **2026-08-17** — `bsuite_project_pii_encryption_retention_breach_20260817` — already said so and said **"do not re-fix"**. This row's own evidence column reads *"Carried from v2, unchanged"*; that phrase was the trigger nobody acted on. Measured on production: `relacl = {postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres}` — **no `anon`/`authenticated` grant of any kind exists**; `has_table_privilege` returns **false** for both. And `relforcerowsecurity` = **true**, not false as this row asserted. Both limbs were wrong; the row was carried unchanged from v2 without re-measurement. With RLS on, zero policies **is** the denial, and force-RLS additionally subjects the owner to it; `service_role` bypasses via `BYPASSRLS`, the intended server-side unwrap path. **Refusing to "fix" this was correct — adding a policy would have widened access.** Replaced by the narrower **N-1** (the `browse.tenant_encryption_keys` view is granted `SELECT` on `wrapped_key` to `authenticated`, safe only via `reloptions={security_invoker=true}` — needs a tripwire test, P2). Evidence: `docs/20260825-estate-consolidated-findings-v1.00W.md` §0.3 | — |
| **P0-2** | ~~Migration `20260819010000` merged but not applied~~ | crm7 | **CLOSED 2026-08-15.** Applied by dispatch; live `pg_policies` confirms all four SELECT policies now scoped and `tenant_app_branding_select_anon` gone | — |
| **P0-3** | ~~braden CMS returns zero rows to anonymous~~ | braden/BSU | **CLOSED 2026-08-16** — `business-suite-unified/.../20260820020000_cms_pages_anon_published_read.sql` (`03c6c4d`) added the anon published-read policies and revoked anon writes. Live `pg_policies` confirms both. Close bsuite#2004 as completed | — |
| **P0-4** | **The Fair Work MAPD API returns 401 on every endpoint** — every wage and charge rate in R80.4 falls back to a bundled snapshot with no provenance stamp distinguishing it | R80.4 | `api-availability.mjs` → 401 × 5 endpoints; `pnpm run dod` → red, unbaselined, all 21 awards; only `bundled_fallback` is ever stamped (`standard-rate.ts:95`) | S to rotate the key; L to prove the ladder |
| **P0-5** | **BSU `Billing.tsx` presents fabricated prices as the customer's bill** | BSU | `src/lib/pricing.ts:20-46` → `Billing.tsx:352-383,397`; `APP_LINE_ITEMS:48-52` bills all four apps unconditionally; `stripeService` used only for `openCustomerPortal` | M |
| **P0-6** | **IMAP/SMTP passwords written to plaintext columns**, read path expects Vault, so the feature is also silently non-functional | crm7 | `emailService.ts` `connectIMAP`/`connectSMTP`; zero triggers on `email_integrations`. Latent only because the table has 0 rows | M |
| **P0-7** | ~~`api/error-report.ts` unauthenticated, no rate limit, `ACAO: *`~~ | crm7 | **CLOSED 2026-08-17** — crm7#1740: origin allowlist, 30/min sliding window, 64 KB cap on both `Content-Length` and parsed text, defect-injected tests (7 of 10 fail against the pre-fix file) | — |
| **P0-8** | **`profiles` INSERT column grant on `is_super_admin`/`platform_role` survives for `anon` and `authenticated`**; the guard trigger is `BEFORE UPDATE` only | DB | `information_schema.column_privileges`; `trg_guard_profiles_privileged_columns` is UPDATE-scoped | S |
| **P0-9** | **Eight live edge functions have no source in any repo** | shared | `email-inbox-sync`, `tasks-sync`, `adobe-sign-webhook`, `refresh-award-rates`, `update-wage-rates` on `file:///tmp/user_fn_…`; `auth-fairwork`, `get-fairwork-api-key`, `sync-award-rates` point at the retired `R80.3/`. bsuite#1955 | M |
| **P0-10** | **`platform-kit-proxy` needs redeploy** — client gate narrowed, server still wider | BSU | BSU#726 merged, not deployed | S |

---

## 2. P1 — money, compliance and correctness

### 2.1 Wage and charge-rate correctness (R80.4 + crm7)

This block is the estate's legal exposure. Ranked by direction of error — **under-payment is the
punishable direction**, and three of the top four err that way.

| # | Item | Evidence | Size |
|---|---|---|---|
| W-1 | **20 of 21 awards are priced with an empty penalty table.** `charge-calculator-v9-2.tsx:3848` sets `penalties = []` for every award except MA000020. No overtime, weekend, shift or public-holiday loading enters `calculate()`. The UI's own instruction ("Press Load Pay Rates then Replace Penalty Table … that path is real and works today") is a dead end — live FWC returns **0 penalty rows for MA000036** | `resolvePenalties` has zero occurrences repo-wide | L |
| W-2 | **The award engine is unreachable from the calculator.** Transitive closure from `src/main.tsx`: 67 of 179 modules reachable, 112 unreachable, **all** in `src/awards/`. 19 of 21 awards have zero runtime-reachable engine modules; **20 of 21 have no reachable rate constructor**. The repo's own gate prints it: *"21 awards are MODELLED and one is REACHABLE"* | `R80.4/scripts/reachability.mjs:127`; `resolveOrdinaryRate`'s only importer is an unreachable barrel | L |
| W-3 | **MA000017 offers 0 of its 26 allowances**, including the all-purpose Instructor allowance that belongs in the ordinary wage — so it is also missing from the base of every multiplier struck on it. **Fixed on `development` (`718cebd`), still live on `main`** | `allowance-catalogue.ts:98` `r.sector === sector`, no alias; all 26 MA000017 allowances are sector-tagged in a vocabulary the UI cannot produce | S — merge |
| W-4 | **School-based apprentices under MA000020 are priced at a lower stage than the award requires.** cl.19.7(b) advances on competency **or** 12 months, *whichever is earlier*; `schoolBasedStage()` implements only the time limb. This one **is** reachable | `contingent-costs.ts`, imported at `charge-calculator-v9-2.tsx:45` | M |
| W-5 | **Provenance is unenforceable — 5 of 6 rungs are never stamped.** `mapd_api`, `mapd_db_cache`, `db_instrument`, `pay_guide`, `manual_override` are produced nowhere reachable. A bundled-table quote is indistinguishable from a live one | `rate-source.ts:84`; only `bundled_fallback` emitted | L |
| W-6 | ~~**37 rate-scope `partial` coverage rows across 16 of 21 awards**~~ **RE-TALLIED 2026-08-18: 66 across 17 of 23 awards** — the count went the WRONG way because two new ledgers landed carrying 35 between them (ma000003: 18, ma000018: 17). MA000020, which is 100% of live placements (`award_trades` = 27 rows, one distinct code), is at **zero**. Positive control on the walk: it saw MODELLED 594 / NOT_APPLICABLE 265 / PARTIAL 202 / EXCLUDED 15 and RATE 587 / PROCESS 299 / PAYRUN 190. The figure tracks how many awards have been LEDGERED, not how much is unmodelled | `coverage/*-clause-coverage.json`; corroborated by `award-gate-baseline.json` | L |
| W-7 | ~~**Allowance catalogue covers 8 of 21 awards**~~ **RE-MEASURED 2026-08-18: 10 of 23** — two adapters and two ledgers both arrived, ratio unchanged at ~43%. Counted from `CATALOGUES`' own keys, not a grep: MA000004/5/9/10/14/17/20/25/26/36. MA000020 is adapted, so the catalogue covers 100% of live placements | `allowance-catalogue.generated.ts` | L |
| W-8 | **On-costs are platform-wide, not per-tenant** — `superRate 12%`, `wcRate 4.7%`, `payrollTaxRate 4.85%`. Payroll tax is state-based; workers-comp is per-employer. Compounded by `tenant_settings` holding 1 row for 7 tenants. **HALF CLOSED 2026-08-18:** migration `20260827030000` adds `tenant_settings.super_rate / wc_rate / wic_code` (authored, not applied) and `@bsuite/charge-calc` 0.14.0 ships `resolveTenantOncosts()` / `applyTenantOncosts()` to read them. Confirmed live that the defect was real first: `charge_rate_snapshots` holds 13 snapshots with ONE distinct `super_rate` and ONE distinct `workers_comp_rate`. **Still open:** crm7 must call the reader | crm7 `chargeRateDefaults.ts:23` + `charge-rates/create/types.ts:24` | M |
| W-9 | ~~**RDO accrual accepted in the UI, never passed into `CalcConfig`**~~ **The UI half closed in crm7#1800; the ENGINE half was the live defect and closed 2026-08-18.** `grep -i rdo` over `packages/charge-calc/src/calculate.ts` returned zero hits at 0.13.0 (positive control `grep -i payrolltax` -> 5), so the config travelled and never priced. 0.14.0's `calculate()` folds the accrual into `billableHours` — **not** into `hoursPerWeek`, which is the PAID week; under cl.16.2 the accrual is deferred pay, not less pay. **Still open:** publish 0.14.0, bump crm7, promote crm7 to `main` | crm7 `usePlacementChargeCalc.ts:72-80` | M |
| W-10 | **`penaltyCalculator.ts` has zero consumers** — per-shift penalty interpretation unreachable from the product **DONE — re-measured 2026-08-18.** `penaltyCalculator.ts` no longer exists in crm7 — the only remaining copies are a coverage HTML artefact and a stale git worktree. Deleted rather than wired, which is the correct outcome for an unreachable module. The penalty path that DID survive is consumed by the shipped calculator: `charge-calculator-v9-2.tsx:65` and `:190`. | crm7; only the barrel and its own test import it | M |
| W-11 | **`award_rates` is empty (0 rows) while `awards` has 156.** Needs a ruling: do rates live in the DB, or only in R80.4's static corpus? **OPEN — CONFIRMED, needs an operator ruling — re-measured 2026-08-18.** Live: `public.awards` **156** rows, `public.award_rates` **0**. Unchanged. Needs a Fair Work credential and a decision on whether rate rows are global or per-tenant before it is engineering work. | DB | M |
| W-12 | **Traineeships, casual, ABN and part-time qualified workers cannot be priced** | R80.4#45, #46 | L |
| W-13 | **`calculate(cfg)` failure swallowed** — the UI cannot distinguish "no rate" from "bad config" | crm7 `usePlacementChargeCalc.ts:217-220` bare catch | S |

### 2.2 Transaction integrity (crm7)

Unchanged from v2 and all still open: `executeTransition` has no state guard (concurrent host
approve/reject is last-write-wins); `approveLeaveRequest` can double-approve and double-count
`taken`; the RCTI invoice number is `Math.random()` against a UNIQUE index with no retry;
employee-number minting has no 23505 retry; `funding_offsets` DELETE grants `{owner,admin}` while
INSERT/UPDATE grant `{owner,admin,manager}`, so a manager can create a wrong offset and cannot
remove it.

### 2.3 Fabricated data rendered as real — a class of eleven, across two apps

The standing rule is *"never display mock data in the UI, especially for financial or
account-related information."* v2 found five sites in crm7 and BSU. The submodule pass found six
more, all in BSU, and one of them is worse than anything in v2.

| # | Site | What it fabricates |
|---|---|---|
| K-1 | **BSU `Billing.tsx` + `lib/pricing.ts`** | The customer's bill. See P0-5 **DONE — re-measured 2026-08-18.** `Billing.tsx` reads live data — `.from('billing_events')`, `stripeService`, `openCustomerPortal`. No mock/dummy/random markers remain in it or `lib/pricing.ts`. |
| K-2 | **BSU `Government.tsx:37-95`** | Fair Work Commission and training.gov.au shown as **`status: 'connected'`** with a `lastSync` recomputed to "1 hour ago" on every page load — and `handleSync` is `await new Promise(r => setTimeout(r, 1500))` then stamps `lastSync = new Date()`. **There is no network call in the file.** A compliance user clicks Sync on the FWC integration, watches a spinner, and is told it synced **DONE — re-measured 2026-08-18.** FIXED THIS PASS — BSU#772. Both government APIs were seeded `status: 'connected'` with `lastSync: new Date(Date.now() - 3600000)`, a clock-derived "synced an hour ago" that could never age. Worse, the Sync button waited 1.5s against nothing and stamped `lastSync` to now. New `unverified` status; button, handler and state REMOVED rather than disabled; 5 assertions, mutation-proved (reinstating the seed turns 2 red). |
| K-3 | **BSU `GTO.tsx:200`** | `totalChecks > 0 ? … : 95` — a tenant with zero apprentices, hosts and visits renders a **95% compliance ring**. The catch-path twin was fixed 2026-08-17; this survivor produces the identical lie on a new or empty tenant, which is the most likely state for a first customer **DONE — re-measured 2026-08-18.** `GTO.tsx`'s catch no longer returns `DEMO_STATS`. The file says so itself: *"DO NOT FABRICATE. This catch used to `return { stats: DEMO_STATS, items: DEMO_ITEMS }`"* — an RLS denial drew the compliance ring at 95%; it now surfaces the error. |
| K-4 | **BSU `Developer/Platform.tsx:37-44,222,285`** | Six edge functions badged **"Deployed"** in success-green to any non-`platform_admin`. **Two of the six do not exist** — `lead-capture` and `tenant-management` are absent from every repo **DONE — re-measured 2026-08-18.** `FALLBACK_EDGE_FUNCTIONS` and the green "Deployed" badge are gone from `Developer/Platform.tsx` — both survive only in the comment recording the defect. The page now carries `CURATED_DESCRIPTIONS` (descriptions only, no status assertion). The measured truth it understated: **72** functions deployed, shown as 6. |
| K-5 | **BSU `Admin.tsx:40-46`** | Five OAuth clients with literal `status: 'active'` — **in the app that is the OAuth server**, with `auth.oauth_clients` queryable **DONE — re-measured 2026-08-18.** `src/lib/oauthClients.ts:74` calls `supabase.rpc('platform_oauth_clients')`; `Admin.tsx` imports `fetchOAuthClients`. The enabling migration `20260821050000_platform_oauth_client_registry.sql` is APPLIED in production. |
| K-6 | **BSU `Developer/RateLimits.tsx:65-88`** | The same five clients, plus `KNOWN_ENDPOINTS` offering rate-limit targets including two functions that do not exist — so a developer can author and persist a rule against a nonexistent endpoint **DONE — re-measured 2026-08-18.** `Developer/RateLimits.tsx` imports `fetchOAuthClients` and shares `oauthClientsQueryKey` with `Admin.tsx`, so both surfaces resolve the same live registry rather than two hardcoded copies. |
| K-7 | **crm7 `/financial/budget`** | `DUMMY_BUDGETS` — `totalPlanned: 450000`, `totalActual: 325780.45`, behind a *simulated* 1-second delay, with a working Export button **DONE — re-measured 2026-08-18.** `crm7 /financial/budget` renders one `DataUnavailable` block — *"No budgets source is connected… this is not a zero and not an empty list, there is nothing to query."* `DUMMY_BUDGETS`, the fake delay and the export handler are all gone. 3 tests pass. |
| K-8 | **crm7 `field-officers/site-visits`** | `MOCK_MILESTONES` — half the timeline live, half invented, so the fake half inherits the real half's credibility **DONE — re-measured 2026-08-18.** `crm7 field-officers/site-visits` carries **zero** date literals, and its tests assert the invented ones absent BY NAME (`expect(body).not.toContain('2025-02-01')` and two more) — a negative assertion, so it cannot silently regress. |
| K-9 | **BSU `Developer/Platform.tsx:198-223`** | `PLACEHOLDER_CHECKS` renders "checking…" forever on a *failed* query — an unreachable-truth state rather than a lie **DONE — re-measured 2026-08-18.** `PLACEHOLDER_CHECKS` is deleted from BSU `Developer/Platform.tsx` — *"Deleted outright. The render now branches on the query state instead."* The surviving "Checking…" is the live button label. |
| K-10 | **crm7 `Developer/Platform.tsx` `FALLBACK_EDGE_FUNCTIONS`** | Misrepresents deployed surface area **DONE — re-measured 2026-08-18.** `FALLBACK_EDGE_FUNCTIONS` returns **zero** hits anywhere in `crm7/src`. |
| K-11 | **crm7 `GTO.tsx`-equivalent compliance surfaces** | Carried from v2 **DONE — re-measured 2026-08-18.** `DEMO_STATS` / `DEMO_ITEMS` / `overallScore: 95` return **zero** hits across crm7 pages. |

**The in-repo model to rewrite all eleven against is BSU's own `Admin/SystemOverview.tsx:42-88`** —
`DEFAULT_HEALTH` is `warning` + "Checking..." / "Not monitored", and `runHealthChecks` leaves
unmonitored subsystems explicitly unmonitored instead of inventing green. Fix the class with one
honest empty/error-state component; do not patch eleven sites.

### 2.4 ADRs ratified then never implemented

ADR-0005 (RAMS funding matrix) — **confirmed absent in production**: `to_regclass('public.rams_funding_matrix')`
is null, no function, no route. Funding amounts remain hand-keyed, the exact one-shot violation the
ADR was written to close. ADR-0007 (Stripe FDW) — no `wrappers` extension, no `stripe` schema, its
own migration written and never applied. ADR-0006's organisation half is superseded and unrecorded
(production canonicalised to `employers` + boolean role flags; the ADR mandates `clients.type`,
which does not exist). ADR-0004 has a **number collision** and crm7 has a second one — two ADRs both
self-titled ADR-002, with only one in the index.

---

## 3. The generation contests, resolved

This is the section the operator's tie-break exists for. Each row names one winner. Everything else
is SUPERSEDED and should stop appearing in remaining-work lists.

| Capability | **Winner** | Superseded |
|---|---|---|
| **Reporting / data manipulation** | **crm7's catalogue engine + `@bsuite/data-grid` inline-editable grid.** `report_catalog_*` (89 entities / 1,297 fields / 124 joins) + `report_run_catalog_query()` + `report_templates` as saved definitions + `report_configs` as saved views. The 2026-08-17 repair migration deliberately repoints starter reports to `kind:'catalog'` **specifically because catalog-rows is inline-editable** — the Airtable tie-break, already answered by code | `financial_reports` + its 3 screens (deleted, 0 consumers); AG Grid Enterprise (never installed); the `rpc_report_page` generic RPC (never built — per-template RPCs won); collapsing `report_templates` into `custom_pages`; `report_preferences` and `welfare_reports` (dead DDL) |
| **Report catalogue governance** | **BSU `Developer/Database/panels/ReportCatalogPanel.tsx`** — the only surface in any of the six apps that promotes a proposed entity into the catalogue the grid trusts (`report_catalog_propose_entity` / `_approve_entity`). **This relationship is documented nowhere** | — |
| **Document generation** | **crm7-native Plate editor + `mammoth` .docx import + `document_merge_fields` catalogue + `signature_requests`** | The Google-Docs/WIF copy-and-find-replace path (`crm7-generate-document`, undeployed — and note the design doc *recommended* Drive and the code went the other way); Monaco/Yjs collaborative editing (deleted); `documentSigner.ts` (deleted); Adobe Sign (`adobe-sign-webhook` edge fn is a live contradiction of crm7#1476 — delete it) |
| **Page authoring** | **crm7 `custom_pages` + `@bsuite/page-builder@0.9.0`** | BSU `tenant_page_layouts` (dropped by ADR-0001) and `/developer/pages` (removed); braden's ~60-file local Site Editor tree (orphaned); braden's `content_pages`/`custom_components`/`page_layouts` visual-editor generation |
| **Schema authoring** | **crm7 `/settings/schema-builder` on `@bsuite/schema-registry@1.0.2`** per ADR-0002; BSU keeps a developer-gated wrapper | Every app's local `schemaBuilderService.ts` (braden's has 0 importers; BSU's and conduit's still carry a stale BLOCKER banner claiming the package is unpublished — it is at 1.0.2 and exports the factory) |
| **UI primitives (admin surfaces)** | **BSU `src/components/uplift/`** — 12-primitive doctrine. **Not one BSU doc names it**, and 13 of ~22 exports have zero importers | ad-hoc `src/components/common/*` |
| **Card/grid layout** | **`DraggableCardPage` on react-grid-layout via `@bsuite/page-builder`** | `PageGridPage`; every fixed inner CSS grid inside a single `CanvasCard` |
| **Nav generation** | **`@bsuite/nav-core@0.9.1`** — braden is a first-class `BSUITE_APP_KEYS` member as of 0.9.0 | every local nav generation |
| **Theme** | **`@bsuite/theme`** — `braden-css` for braden, `preset-v4.css` + `css` for the D2C five. braden's 2026-08-10 red-error ruling wins over the estate purple mandate *for braden only* | standalone local token forks; the 2026-07-23 "defer, don't swap" decision (reversed 2026-08-03) |
| **Auth** | **BS OAuth 2.1 PKCE via `@bsuite/auth@0.2.8`** (exact-pinned) | cookie SSO — and note **four documents across BSU and conduit still describe it as shipped** |
| **Bot protection (braden)** | **Cloudflare Turnstile**, wired at both public forms and allowlisted in CSP | Vercel BotID (never landed). braden's bot-protection doc concludes the site has none — wrong |
| **Lead capture (braden)** | **`contact/EnhancedContactForm` + `useEnhancedContactForm` + `useTurnstile` → BSU `lead-capture`** | the landing-section `ContactForm`/`Contact` shell; `useContactForm.handleFormSubmit` (the only path omitting `turnstile_token`, always overridden) |
| **AI models** | **`xai/grok-4.3` primary, `zai/glm-5.2` fallback** — crm7 and throughput agree exactly. Provider prefix is **`zai/`, not `glm/`** | `AGENTS.md`'s `xai/grok-4.20-reasoning`; every doc naming Grok 4.1 |
| **Quote transport R80.4 → crm7** | **Target: `r80_saved_quotes` (now applied in production) + crm7 `charge_rate_quotes` as system of record. Shipped today: clipboard + query-param deep link** | `r80_charge_rate_builds` (0 rows, 0 readers, 0 writers, and its NOT NULL columns are values the calculator structurally cannot supply). **Do not wire the client half before the caveat is removed in the same change** — shipping half makes "Saved" a lie |
| **Calculator** | **`charge-calculator-v9-2.tsx`** — the only one in the repo | R80.3 entirely (archived; 3 docs still name it a live migration target) |

---

## 4. P1 — shipped, and reaching nobody

The single largest category this pass found, and the one least visible in any register. Code exists,
passes CI, and no user can reach it.

| # | Item | Repo | Evidence |
|---|---|---|---|
| U-1 | **The entire award engine** — 112 modules, 388 unreached public functions | R80.4 | See W-2 |
| U-2 | **~60-file Site Editor / CMS tree** + 10 admin pages with zero importers | braden | `src/Routes.tsx` registers only `/admin/branding`, `/admin/page-builder`, `/admin/marketing`; all others → `PortalMoved` |
| U-3 | **The entire `src/components/navigation/` tree** — EnhancedNavigation, MegaMenu, GlobalSearch/Cmd+K, TenantSwitcher, MobileBottomNav, EnhancedBreadcrumbs. The code says so itself: *"none of which are mounted"* | throughput | `navigation.ts:413-415`; 0 external importers |
| U-4 | **13 of ~22 `uplift/` exports**, including a complete 247-line `CommandPalette` | BSU | Two BSU docs say Cmd+K "❌ / 0 files". It exists and is dead — a materially different piece of work |
| U-5 | **`xeroAdapter.ts` (633 L) + `xeroPayrollAdapter.ts` (420 L)** and the three `pay_runs` STP columns only they write | crm7 | ADR-0004 cites the adapter as "the batch push implementation" and documents live idempotency/backoff behaviour. Zero non-test callers |
| U-6 | **LangChain conversation/agent path** — confirmed by build: no `vendor-ai` chunk is emitted, `@langchain/*` fully tree-shaken | throughput | `useConversation` and `baseAgent` have 0 consumers; all three backing tables absent from production |
| U-7 | **`EntitySelector` reaches 0 files in BSU, conduit and throughput** (throughput's has one *type-only* import). 65 files in crm7 | 3 apps | Direct cause of the recurring "can't create a company inline" complaint |
| U-8 | **conduit `/admin/templates`** — a complete message-template editor with zero inbound links | conduit | S: add a nav entry |
| U-9 | **`.bsu-gradient`** defined with zero usages; **`Meteors` + `TypingAnimation`** shipped and barrel-exported while the Magic UI guide lists both as *Rejected Patterns* | BSU, crm7 | |
| U-10 | **crm7 dead DDL** — `report_preferences`, `welfare_reports`, `invoice_batches`, `cms_documents`/`cms_posts`, `EmailComposeDialog` (only importer is its own barrel) | crm7 | S each: wire or delete |
| U-11 | **braden `Projects.tsx`, `DndLayoutEditor`, `StoragePolicyAudit`, duplicate `SiteEditorLayout` ×2, root `hooks/` shadowing `src/hooks/`, `cypress.config.ts` with no cypress dependency** | braden | |
| U-12 | **`xero_connection_health` view has no reader** — both live connections report `never_synced` to nobody **OPEN — CONFIRMED, no reader — re-measured 2026-08-18.** Four files mention `xero_connection_health`; every one is prose (a doc comment naming the migration, a test comment about its 48h boundary). An actual read — `.from('xero_connection_health')` / `.rpc(...)` — returns **zero**. POSITIVE CONTROL: the same pattern finds `.from('placements')` at `hostEmployerLink.ts:134` and `hostQueries.ts:18`, so the zero is a working search. | crm7 |  |

---

## 5. P1 — features that error at runtime because a migration never applied

Live `to_regclass` against production settles each of these. This is a distinct class from §4: the
UI is reachable, the table is not there.

| # | Surface | Table | Live check |
|---|---|---|---|
| M-1 | crm7 `/communications/mail-merge` — **every operation on the page errors** | `mail_merge_batches` | **null.** DDL is in the repo (`20260228150000:12`) with indexes and RLS; never applied. Two crm7 docs disagree about whether it exists; the runtime claim is the true one |
| M-2 | conduit's RLS helper for every `r7_*` table | `r7_current_tenant_id()` | **null.** Two migrations create/replace it, including one written specifically to fix its `search_path`. Neither applied |
| M-3 | throughput MindMap panel, mounted on `IdeaDetail` | `mind_map_nodes` | **null** — no DDL anywhere |
| M-4 | throughput `/business-plan` route | `business_plans`, `business_plan_sections` | **null** |
| M-5 | throughput AI feedback history | `llm_feedback` | **null** |
| M-6 | throughput Research save | `saved_research` | **null** — DDL exists, never applied |
| M-7 | throughput Export offers PDF / Word / PowerPoint | the `export` edge function | absent — `supabase/functions/` holds only `_shared` and `bing-search` |
| M-8 | BSU dashboard drag/drop persistence | `dashboard_layouts` | **null** — exists only in plan prose |
| M-9 | crm7 per-tenant on-costs | `cost_factors` | **null** — appears only in the baseline dump and generated types |
| M-10 | throughput: **16 of 28 client-referenced tables exist in production with no DDL in the repo**, and 12 referenced tables do not exist at all | — | `ideas.tenant_id` is absent in production despite a migration adding it |

---

## 6. P1 — verification integrity

Carried from v2, all still open, plus what this pass added:

18 of 20 crm7 E2E specs self-skip (credentials in no workflow) and **three unit suites were skipped
citing that E2E suite as the compensating control**. `/api/ai/rate-review`'s Authorization gate has
five `describe.skip` blocks and zero executing coverage. `prod-migration-history-audit` is dead in
both repos. No pg_cron failure alerting exists. Three cleanup functions exist and none is scheduled.
90 `eslint-disable`s for `react-hooks/exhaustive-deps` (63) and `set-state-in-effect` (27), tracked
nowhere. `Closes #N` on a PR merged to `development` closes nothing.

**New from this pass:**

- **crm7 `scripts/prerender.mjs:146` swallows any error when `CI` is set**, and `ci.yml:52` runs
  `pnpm run build`. A prerender failure passes CI silently. crm7's own audit filed this as
  Finding 3 and it is the only one of six still open.
- **braden's CI Lighthouse runs `preset: "desktop"` only**, with performance at `warn@0.7` — it
  cannot fail a build. A mobile regression on the public marketing site is structurally invisible.
  braden also runs `build:noprerender` in production while LHCI measures a *prerendered* local
  `dist/` — the CI measures a build production never serves.
- **crm7 has three pgTAP suites sharing number 69**, the exact flip-condition its own evidence audit
  named.
- **throughput's "105 passing tests"** appears in three docs; the real figure is ~310 cases across
  48 files. Nobody has stated the current number.

---

## 7. P1 — performance, and the one architectural finding behind it

Full detail in `20260815-vercel-platform-audit-and-res-regression-v1.00W.md`. What the submodule
pass adds:

**conduit is the only SSR app and the fastest by a distance (0.94 mobile vs crm7's 0.66), and the
mechanism is now identified precisely.** It ships 69,708 B of rendered HTML; every other app ships
an empty `<div id="root">`. Three things it does that are portable:

1. **Cache Components** (`next.config.ts:30 cacheComponents: true`) with per-tenant `'use cache'`
   islands and a **cookie-less service-role Supabase client used only inside cache boundaries, with
   tenant scope enforced twice — in the query and in the cache tag**. **Zero of conduit's 16 docs
   mention this**, the single largest architectural fact about the app.
2. **Server snapshot → TanStack Query `initialData` hydration** — the Kanban's first paint has real
   columns, not a skeleton. Portable to any app with a thin prerender or an inlined bootstrap call.
3. **`optimizePackageImports`** across 20 barrels. `lucide-react` alone (≈1,500 icons behind one
   barrel, 53 importing files) is the highest-ROI item and every app has the same import shape.

**Per-app performance items:**

| App | Finding |
|---|---|
| crm7 | `react-core` chunk is 1,001,217 B containing slate, zod, lodash and xlsx — a `manualChunks` ordering bug. 86 of 108 `modulepreload` links are under 2 KB. crm7#1742 |
| throughput | **Same bug class, milder.** The `id.includes('/react/')` guard is also first, and it swallows `@vercel/analytics`, `@vercel/speed-insights` and `@bsuite/schema-registry`'s react subpaths into `vendor-react`. Largest chunk is `vendor-bsuite` at 215,209 B — it bundles `react-grid-layout` + `react-resizable` eagerly for 7 lazily-loaded pages a logged-out visitor never reaches. `vendor-misc` is 133,928 B of `@vercel/blob` + `jose` on the critical path of a page that shows a spinner |
| throughput + R80.4 | **The logged-out double-boot, quantified: ~1.82 MB of JS to render a login form.** throughput boots 917,417 B to discover there is no session, then hands to BSU which eagerly loads 900,228 B. `attemptSilentAuth()` is not tried before the full boot, and neither `/login` route is code-split from the shared eager vendor set |
| braden | **The images are not the main cause.** In order: production runs `build:noprerender` so every marketing route is an empty root; `Index.tsx:76-88` then withholds the entire tree — including the LCP `<img>` — behind `supabase.auth.getUser()` + `RoleManager.checkUserRole()`, so an anonymous visitor pays an auth round-trip to learn they are anonymous and the preload scanner never sees the hero. Only then do the bytes matter: 662,265 B hero + 458,029 B 40px-tall nav logo, both `loading="eager"`, **neither carrying any `Cache-Control`** (`vercel.json` sets headers for `/assets/*` only, not `/images/*`). Plus 369,034 B `placeholder-project.png` with zero references, and a 458,029 B byte-identical duplicate that is never painted |
| R80.4 | **`@vercel/speed-insights` and `@vercel/analytics` are not installed at all** — the one app with no measurement. braden, throughput, crm7 and conduit all mount both |

---

## 8. Documentation — the repair list

**Docs to mark SUPERSEDED or delete, by repo.** Every one is named with its reason in the per-repo
audit; the count is what matters here: **crm7 12, BSU 14, throughput 11, braden 7, conduit 7,
R80.4 8, parent 12** — **71 documents**, roughly one in six of the estate.

**The five highest-consequence repairs, because they actively mislead:**

1. **Delete or banner the four cookie-SSO assertions** (BSU ×3, conduit ×1). They point at the
   estate's loudest forbidden pattern.
2. **Withdraw BSU's four "canonical page-builder author surface" claims** and the combined-plan
   instruction to delete `WidgetPalette.tsx`/`widgetRegistry.tsx`/`EntityTableWidget.tsx` — those
   three files are the *surviving* generation; executing the instruction would delete the winner.
3. **Supersede crm7's `xero-node` ADR** with a new ADR that records what shipped. Do not edit the
   old one; the estate's convention is to leave corrections visible.
4. **Delete the "the table does not exist, every operation errors" phrasing in crm7's documents-UX
   doc** — it invites deletion of a table whose DDL is in the repo. Replace with M-1's framing: the
   DDL exists, the migration was never applied.
5. ~~**Fill or delete throughput's five empty component templates.**~~ **Done 2026-08-17,
   verified 2026-08-27.** All five were filled from `src/components/ui/*.tsx` and are on
   `origin/development` at 314–337 lines each. Do **not** act on the "delete" branch — it would
   destroy 1,637 lines of accurate documentation. What tripped the sweep was each file's own
   provenance banner quoting the token it had replaced.

**Index integrity is broken in every repo.** crm7's README links seven documents that do not exist;
BSU's links three plus a dangling archive path; conduit's links three; throughput's four; R80.4's
indexes 7 of 19. The archive relocation of 2026-07-25 moved trees out and no index followed.

**Every `STACK-AUDIT.md` / `CONSISTENCY-REPORT.md` / `FEATURE-SURFACE.md` / `PARENT-DOCS.md` mirror
is wrong on essentially every version row** in all five apps that carry them. They are 2026-05-04
snapshots of parent files that have since moved. Regenerate from `package.json` or delete — they
are the most-read and least-accurate files in the estate.

**Silent omission is the larger failure than any single false line.** BSU's `docs/` last changed
2026-07-28; its `src/` on 2026-08-17. In that window BSU shipped the uplift design language, a
10-panel database console, the report-catalogue promotion surface, the `is_super_admin` privilege
narrowing, a `no-raw-button` lint rule and the GTO fabrication fix. **Zero documents record any of
it.** conduit's Cache Components architecture is likewise undocumented, as is crm7's
`dashboards.definition` surface.

---

## 9. Sequence

**This week.**
P0-4 (rotate the FWC key — one action, unblocks the estate's only compliance-critical app),
P0-5 (BSU billing fabrication — a customer-facing financial lie),
P0-1 and P0-8 (two `revoke`/trigger-scope migrations),
W-3 (merge `718cebd` to braden— sorry, to R80.4 `main`; one merge),
P0-10 (one redeploy).

**Next — the two class fixes with the best ratio of surface to effort.**
The K-class: one honest empty/error-state component, modelled on BSU's own `SystemOverview`,
replacing all eleven fabrication sites. And braden's public-visitor chain: change one word in
`vercel.json` (`build:noprerender` → `build`), lift the auth gate off the landing route, add
`Cache-Control` for `/images/*`, delete the 369 KB unreferenced PNG. That is a day's work on the
worst-scoring app in the estate and the only one whose LCP is a commercial number.

**Then — decide the unreachable code, app by app.** §4 is roughly 200 files across five repos. Each
one is *wire it* or *delete it*; there is no third state, and leaving them is what makes every
future audit cost this much. R80.4's engine (W-2) is the exception — that is a genuine L-sized
wiring project and it gates W-1, W-5 and W-6.

**Then — the migration-application gap (§5).** Ten surfaces error at runtime because a migration in
the repo was never applied. The dispatch path is now proven (P0-2 was applied and verified on
2026-08-15); this is mechanical, and it should be batched with a re-run of
`prod-migration-history-audit`, which has been dead for three weeks and exists to catch exactly this.

**Requires a ruling before anyone builds.**

- **Do the 20 unbuilt parity gaps survive D-93–D-98?** Three of those specs predate the portal
  rulings. Carried from v2, still unanswered, still blocking.
- **Is ADR-0007 (Stripe FDW) applied or retired?**
- **Is `award_rates` meant to be populated in the database, or is R80.4's static corpus the record?**
  (W-11.)
- **Does the estate get a PSI/CrUX API key?** Free; gives field Core Web Vitals for all six apps.
- **Do we adopt Nitro for the Vite apps?** It is the documented path to Vercel Functions, SSR and
  Skew Protection, and Vercel's own Vite docs now steer that way. Five-app migration.

---

## 10. What no static pass can settle

Every visual and runtime claim — no browser was driven against an authenticated route in any of the
six apps. The 27 `CANNOT-VERIFY` operator-register items. Whether the deployed `dist/` matches the
audited working-tree build in any app. Edge-function deployment state for `crm7-generate-document`,
`sta-email-watch`, and the `cron_refresh`-bearing build of `xero-token-exchange`. `cron.job`
registration and the vault secrets several migrations hard-fail without. Whether R80.4's *production*
FWC key is dead too, or only the local one — `https://r8.crm7.app/api/fwc?path=…` with a valid bearer
answers it, and the answer changes P0-4 from "rotate a key" to "the proxy is fine, fix the dev
environment". Whether braden's `content_pages` rows carry the `tenant_id` the code filters on.
Credential rotation. 105 of the 108 `authenticated_security_definer` advisories.

---

## 11. VERDICT TABLE — every row, measured 2026-09-02

Each verdict was produced against live sources, and every zero carries a positive control: a
count is a hypothesis until the method is shown to find a case known to be present. This
register's own history records four rounds where a number moved and **every** move was the
detector's bug rather than a change in the estate.

| row | verdict | effort | evidence, in brief | what it costs |
|---|---|---|---|---|
| **D-1** | Confirmed Open | S | Three of four survive and still read as shipped features. business-suite-unified/docs/CONSISTENCY-REPORT.md:22 — 'BS OAuth server, cookie SSO ✅'. conduit/docs/CONSISTENCY-REPORT.md:30 — 'BS OAuth + c… | Cookie SSO was removed 2025-02-27 and is the single loudest do-not-revert guardrail in AGENTS.md. Three documents inside the estate currently present it as wor… |
| **D-2** | Confirmed Open | S | Live: to_regclass('public.tenant_page_layouts') = null (dropped, per business-suite-unified/supabase/migrations/20260502000000_drop_tenant_page_layouts.sql). The claims survive: business-suite-unifie… | A document asserts as shipped a table whose drop migration sits in the same repository, and a sibling document instructs the deletion of the three files that a… |
| **D-3** | Confirmed Open | S | crm7/docs/20260512-xero-node-sdk-deno-compat-decision-v1.00A.md still reads 'Status: Approved' at line 3 and, at lines 55-58, 'Decision: **Keep the raw `fetch` approach.** Do not adopt `xero-node` fo… | Three documents give three incompatible readings of the same decision, and the one marked Approved is the one production contradicts. The next person asked 'sh… |
| **D-4** | Confirmed Open | S | Not done, and now doubly wrong. crm7/docs/20260813-documents-ux-design-v1.00D.md:503-504 still reads '**Roughly half the work is deletion.** `mail_merge_batches` (the table does not exist — every ope… | The register flagged this phrasing because it invites deletion of a table whose DDL was in the repo. That risk is now sharper, not smaller: the table is live i… |
| **D-5** | Closed | S | Already recorded closed in the register itself ('Done 2026-08-17, verified 2026-08-27') with the correct warning attached: do not act on the 'delete' branch, which would destroy 1,637 lines of accura… | closed |
| **D-6** | Confirmed Open | S | Largely repaired, not fully. Resolving every relative link in each docs/README.md: crm7 46 of 53 resolve, 6 dead (all pointing at ./archive/2026-04-30-* directories that no longer exist); R80.4 19 of… | 8 dead links remain, all consequences of the 2026-07-25 archive relocation that no index followed, and 7 of R80.4's documents are reachable only by listing the… |
| **D-7** | Confirmed Open | M | All 21 mirror files still exist across the six apps, and all were touched on 2026-08-27 (PARENT-DOCS ×6) or 2026-08-29 (the other 15) — so a pass ran over them without regenerating their content. crm… | These are the most-read and least-accurate files in the estate, and they now carry a recent commit date over stale content, which is the worst combination — a … |
| **D-8** | Closed | S | The date gap is gone. Last commit touching docs/ vs src/ in each submodule: BSU docs 2026-09-01 / src 2026-09-02; crm7 2026-08-29 / 2026-09-02; conduit 2026-08-29 / 2026-08-30; braden 2026-08-29 / 20… | closed as a date gap. The specific content omission the register named alongside it is NOT closed and is filed separately as P-1 — conduit's Cache Components a… |
| **D-9** | Confirmed Open | M | 36 of 61. Method, in three steps against origin/main. (1) 'Presents as a live board' = the filename's version-status letter is W (Working), D (Draft) or A (Active) — never F, which memory records as … | 36 files in one directory each read as work someone still has to do. Anyone — agent or person — opening docs/plans/ to find out what is outstanding has 36 plau… |
| **K-1** | Confirmed Open | M | business-suite-unified/src/pages/Billing.tsx:49-55 `const APP_LINE_ITEMS = [{app:'CRM7',pricePerSeat:PLAN_PRICES.basic.monthly},{app:'Conduit ATS',flatPrice:CONDUIT_PRICE.monthly},{app:'R8 Calculator… | Every paying tenant on the BSU billing page is shown a bill that no payment system produced. They are itemised for four products (CRM7, Conduit ATS, R8 Calcula… |
| **K-3** | Closed | ? | business-suite-unified/src/pages/GTO.tsx:139-141 `export function computeOverallScore(totalChecks, compliantChecks): number \| null { if (totalChecks <= 0) return null; ... }` — the `: 95` fallback i… | closed |
| **K-4** | Closed | ? | business-suite-unified/src/pages/Developer/Platform.tsx — `FALLBACK_EDGE_FUNCTIONS` survives only inside the comment at line 42 recording the defect; grep finds no declaration. The badge at line 324-… | closed |
| **K-6** | Closed | ? | Both limbs verified, not just the OAuth one the register cited. Limb 1 (client registry): business-suite-unified/src/pages/Developer/RateLimits.tsx:62-67 imports `fetchOAuthClients`/`oauthClientsQuer… | closed |
| **M-1** | Closed | S | Live: to_regclass('public.mail_merge_batches') = 'mail_merge_batches'. information_schema.columns shows 18 columns (id, tenant_id, name, template_id, document_template_id, recipient_type, recipient_i… | closed |
| **M-2** | Superseded | S | pg_proc query across all namespaces returns NO row for r7_current_tenant_id (control: is_developer_admin returned prosecdef=true, search_path='public, auth', so the query finds real functions). But t… | closed — the register's framing ('the RLS helper for every r7_* table is null') implies the r7_* tables are unprotected or erroring. They are neither. conduit/… |
| **M-3** | Superseded | M | to_regclass('public.mind_map_nodes') = null (still absent), and 0 CREATE TABLE for it anywhere in the estate. But the surface no longer errors: throughput/src/components/mindmap/index.tsx is now 34 l… | closed as a runtime error. The capability is still absent — a user cannot save a mind map — but the page now says so plainly instead of printing 'Could not fin… |
| **M-4** | Superseded | M | to_regclass for both business_plans and business_plan_sections = null. throughput/src/pages/BusinessPlan.tsx now opens with a 23-line provenance header ('Business Plan page — you can draft here, but … | closed as a runtime error. Drafting works and AI Generate still calls /api/llm/completions; Save is disabled with a stated reason and a top-of-page notice says… |
| **M-5** | Superseded | S | to_regclass('public.llm_feedback') = null; 0 mentions in any .sql in the estate. throughput/src/components/llm-panel/index.tsx now carries a 25-line header recording that useLLMFeedback.ts (read) and… | closed as a runtime error. Its header also records a second defect fixed in the same pass: llmOperations.ts had been sending every question to the model twice,… |
| **M-6** | Superseded | S | to_regclass('public.saved_research') = null. DDL DOES exist (7 CREATE TABLE hits across the estate's .sql files — this is the positive control for the DDL scan), confirming the register's 'DDL exists… | closed as a runtime error. Saving a research result is still impossible, but the control explains itself rather than vanishing or throwing. |
| **M-7** | Superseded | M | Supabase list_edge_functions returns 78 deployed functions; no slug 'export'. Positive control: 'bing-search' IS in that list (id 9c70543c, ACTIVE, v60), so the method finds present functions, and th… | closed as a runtime error — the three cards are visibly inert with a stated reason instead of 404ing at the gateway. |
| **M-8** | Closed | S | to_regclass('public.dashboard_layouts') = null, and the identifier has ZERO occurrences anywhere: 0 .sql files, 0 .ts/.tsx files outside node_modules. The actual mechanism is business-suite-unified/s… | closed — there is no missing migration and no runtime error. The register row was built from plan prose that never became code. Residual, much smaller: useScop… |
| **M-9** | Closed | S | cost_factors is a COLUMN, not a table. `select table_name, column_name, data_type from information_schema.columns where column_name='cost_factors'` returns exactly one row: host_contracts.cost_factor… | closed — this row is a detector artefact, exactly the class the register's own banner warns about: a bare identifier grep matched a column name and the follow-… |
| **M-10** | Confirmed Open | M | Multiline-safe ripgrep over throughput/src finds 16 distinct client-referenced tables (plus 'avatars', a storage bucket) and 6 RPCs. ALL 16 exist in production — so the register's '12 referenced tabl… | An agent replaying throughput's migrations into a fresh project gets 3 of 16 tables and an app that cannot boot. Production is the only copy of that schema, so… |
| **P-1** | Confirmed Open | S | conduit/next.config.ts:30 sets `cacheComponents: true`. conduit/docs now holds 17 markdown files; ripgrep for 'cacheComponents\|use cache\|Cache Components' across all of them returns 0 files. Positi… | The single largest architectural fact about the fastest app in the estate (0.94 mobile against crm7's 0.66, 69,708 B of rendered HTML where every other app shi… |
| **P-2** | Closed | S | crm7/vite.config.ts:513-522 records the removal of the duplicate react-core guard by name: 'REMOVED — a SECOND, duplicate react-core guard used to sit here: id.includes('/react/') \|\| id.includes('/… | closed — with a live hazard the config itself flags at lines 414-418: if anyone sets Rolldown's `codeSplitting` option, `manualChunks` is IGNORED COMPLETELY wi… |
| **P-3** | Confirmed Open | S | Half fixed. R80.4/package.json now has @vercel/speed-insights ^2.0.0, and it is genuinely MOUNTED, not merely installed — R80.4/src/main.tsx:2 imports SpeedInsights, :328-330 wraps it in RoutedSpeedI… | R80.4 reports Core Web Vitals but no page-view or traffic data, so a route that stops being visited — or starts erroring hard enough that nobody reaches it — l… |
| **P-4** | Confirmed Open | M | All four still true. (1) braden/vercel.json:3 `"buildCommand": "pnpm run build:noprerender"`, so every marketing route ships an empty root. (2) braden/src/pages/Index.tsx:27 sets isLoading=true, :38 … | The worst-scoring app in the estate is also the only one whose LCP is a commercial number — it is the public marketing site. A first-time visitor waits on an a… |
| **P-5** | Closed | M | throughput/vite.config.ts:55-59 now matches exact package boundaries — `id.includes('/node_modules/react/') \|\| '/node_modules/react-dom/' \|\| '/node_modules/scheduler/'` — replacing the bare `/rea… | closed for the substring half. The other half named in the register — vendor-bsuite bundling react-grid-layout and react-resizable eagerly for 7 lazily-loaded … |
| **U-1** | Confirmed Open | L | Transitive import walk from R80.4/src/main.tsx (script at /tmp/claude-1000/-home-braden-Desktop-Dev-bsuite/79784fec-5832-44e5-b723-90faf04571a4/scratchpad/reach.mjs): 119 files reached, 223 non-test … | A quoting operator selecting any of 19 awards other than MA000020 or MA000036 gets an EMPTY penalty/overtime table, while clause-verified logic for that award … |
| **U-2** | Confirmed Open | L | braden/src/Routes.tsx:193-199 registers exactly three children under /admin — `branding` (BrandingAdmin), `page-builder` (PageBuilder), `marketing` (PlatformMarketing) — then `<Route index element={<… | Nobody. That is the finding: a ~60-file content-management surface plus 9-10 admin pages compile, pass CI and ship in the braden bundle, and every URL that wou… |
| **U-3** | Confirmed Open | M | throughput/src/components/navigation/ holds 8 files, 1,080 lines: EnhancedNavigation.tsx (264), GlobalSearch.tsx (340), MegaMenu.tsx (213), EnhancedBreadcrumbs.tsx (97), TenantSwitcher.tsx (89), Mobi… | Throughput users have no command palette, no global search, no mega-menu and no mobile bottom nav, while 1,080 lines implementing all four sit in the bundle. T… |
| **U-4** | Confirmed Open | M | Count corrected and re-derived. Import scan for '@/components/uplift' across business-suite-unified/src finds real external importers for only 6 of the 12 doctrine primitives: TechnicalDetails (brand… | A BSU admin cannot press Cmd+K. Two BSU documents record Cmd+K as '❌ / 0 files' and will send someone to build it from scratch, unaware that 244 working lines … |
| **U-5** | Confirmed Open | M | crm7/src/lib/pipelines/xeroPayrollAdapter.ts (435 L) — importers are its own test only (src/lib/pipelines/__tests__/xeroPayrollAdapter.test.ts:15,22). Its own header, line 5, says so: 'Coded and unit… | Two things, and the second is worse than the register recorded. First, 1,588 lines of Xero payroll integration — batching, retry-with-backoff, idempotency agai… |
| **U-6** | Confirmed Open | M | The five modules form a closed island in throughput/src: useConversation.ts (importers: only lib/agents/baseAgent.ts, in prose) → conversationContext.ts (importers: baseAgent.ts, useConversation.ts) … | Nobody, and that is the cost: @langchain/core ^1.1.48 and @langchain/langgraph ^1.3.7 are production dependencies in throughput/package.json:47-48 carrying sup… |
| **U-7** | Confirmed Open | M | The row's shape has changed and its count was wrong; the gap is real. EntitySelector was extracted into @bsuite/ui@1.3.0 on 2026-08-17 (AD-5), so the SOLE implementation is now node_modules/@bsuite/u… | A BSU or throughput user filling a form who needs an option that is not in the list has no way to add it from that screen — a raw `<select>` cannot search, can… |
| **U-8** | Confirmed Open | S | conduit/src/app/admin/templates/ is 658 lines across page.tsx (22), _view.tsx (411), actions.ts (138), constants.ts (87). `grep -rn 'admin/templates'` over conduit/src returns exactly one hit and it … | A conduit recruiter who wants to edit the message templates the system sends candidates has no way to reach the editor that does exactly that. The only route i… |
| **U-9** | Confirmed Open | S | Split row; one limb closed, the other is open and the register undercounted its class by more than half. CLOSED limb: `.bsu-gradient` is deleted — business-suite-unified/src/index.css:1068 carries th… | Low direct harm, real governance harm. Eight files implementing two components the estate's own Magic UI guide lists as Rejected Patterns are barrel-exported a… |
| **U-10** | Confirmed Open | S | Measured in both directions, as the register's own evidence rule requires. Live production (tuybltdrdefjblnplpqo), `to_regclass` + pg_class.reltuples: report_preferences EXISTS 0 rows; invoice_batche… | Five empty tables and a dialog component that no screen opens. Nobody is harmed today because none of it runs. The cost is that crm7's schema advertises capabi… |
| **U-11** | Confirmed Open | S | All six limbs still true in braden. (1) src/components/Projects.tsx, (2) src/components/admin/editor/DndLayoutEditor.tsx, (3) src/components/admin/StoragePolicyAudit.tsx — `grep -rn '<Projects\|<DndL… | Nobody reaches any of it, and the duplicates are an active trap: an agent told to fix a Site Editor layout bug will edit one of two same-named files with a 50%… |
| **U-12** | Confirmed Open | S | THE CONTROL STILL HOLDS, and the zero is still real. Multiline-tolerant `grep -rzoP "from\(\s*['\"]xero_connection_health['\"]"` over crm7/src returns ZERO; the same regex on 'placements' returns crm… | The harm the row asserts is CLOSED; a narrower one is open. Nobody is now told a never-synced Xero connection is Active: two mounted crm7 pages compute and dis… |
| **V-1** | Closed | S | The gate this defeated no longer exists. crm7/.github/workflows/ci.yml:89 now runs `pnpm run build:noprerender`, with a 17-line comment naming this exact finding and the reason; crm7/vercel.json:4 se… | closed |
| **V-2** | Confirmed Open | S | braden/lighthouserc.json: settings.preset = "desktop" and no mobile run; assertions are `categories:performance: ["warn", {minScore:0.7}]`, `best-practices: ["warn"]`, `seo: ["warn"]`. Only `accessib… | A mobile performance regression on the public marketing site — the only page in the estate with a commercial LCP — is structurally invisible: there is no mobil… |
| **V-3** | Closed | S | The collision is real and larger than reported — in crm7/supabase/tests/database, prefix 09 is shared by 26 files, 81 by 4, 42 by 3, 69 by 3 (69_document_provenance_origin, 69_national_qualifications… | closed — but the same step carries a different weakness worth recording: line 388 fails only `if [ "${#suites[@]}" -lt 43 ]`. With 122 suites present, 79 of th… |
| **V-4** | Confirmed Open | S | Real figures measured today: 43 test files under throughput/src, 280 `it(`/`test(` cases. The claim survives in 2 documents at 4 places — throughput/docs/20250829-throughput-roadmap-v1.00W.md:40 ('10… | Anyone sizing throughput's test debt from its own documents is working from a figure that is 2.7x too low and roughly a year old. The 'shipped ✅' framing in UN… |
| **V-5** | Closed | S | All four credentials ARE now wired: crm7/.github/workflows/e2e.yml:187-188 and :289-290 export CRM7_E2E_PASSWORD and CRM7_E2E_PASSWORD_TENANT_B from secrets, with the emails deliberately coming from … | closed — though one fail-open branch remains: at line 300-303, if no Playwright JSON report file exists at all, the executed-count step prints '::warning::no P… |
| **V-6** | Closed | S | crm7/api/ai/rate-review.test.ts now has 0 executing describe.skip blocks (the single grep hit, line 80, is inside a comment reading 'every describe.skip() this suite used to carry'). The Authorizatio… | closed |
| **V-7** | Confirmed Open | M | The audit is NOT dead — .github/workflows/prod-migration-history-audit.yml runs on `cron: '17 */6 * * *'` and `gh run list` shows six scheduled runs in the last 48h (33631062453, 33600323792, 3357764… | schema_migrations keys on version alone across every scope, so whichever applier runs first claims the row and the other migration is skipped forever, silently… |
| **V-8** | Closed | S | Both halves are wrong now. Alerting: .github/workflows/cron-job-health-audit.yml runs on the same 6-hourly schedule; gh run list shows five consecutive runs. It is unusually well built — before trust… | closed as written. The live finding underneath it: three cron jobs are erroring on missing Supabase Vault secrets — document-retention-sweep-daily, sta-email-w… |
| **V-9** | Closed | M | They are now tracked by a purpose-built ratchet: scripts/check-hook-suppression-ratchet.mjs with scripts/hook-suppression-baseline.json, wired to .github/workflows/hook-suppression-ratchet.yml. It se… | closed as a tracking gap. What the ratchet exposes and has banked rather than fixed: crm7 carries 54 inline + 82 file-level suppressions (eslint.config.js EXHA… |
| **V-10** | Confirmed Open | S | `gh repo view GaryOcean428/bsuite --json defaultBranchRef` returns 'main'. GitHub's closing-keyword automation fires only when a pull request merges into the repository's DEFAULT branch. The estate's… | Issues stay open after their fix ships, so the open-issue count permanently overstates outstanding work and nobody can tell a genuinely open issue from a shipp… |
| **W-1** | Confirmed Open | M | R80.4/charge-calculator-v9-2.tsx:5386-5390, the ONE place an award selection sets the penalty table: setPenalties( next === "MA000020" \|\| !next ? penaltiesForSector(sector) : next === "MA000036" ? … | A GTO quoting any award except commercial/general building (MA000020) or plumbing (MA000036) prices overtime, weekend, shift and public-holiday work at ordinar… |
| **W-2** | Confirmed Open | L | I redid the transitive closure myself rather than trusting the row or the repo's gate. METHOD: start at the real browser entry point src/main.tsx (index.html:31 loads only `/src/main.tsx`); strip blo… | Rates are now reachable for all 21 awards, so a base wage prices correctly. What no user can reach is every award's own overtime, penalties, allowances, shift … |
| **W-3** | Closed | ? | Fixed AND on main — content-tested, not inferred from the commit graph. R80.4/src/awards/allowance-catalogue.ts now carries both missing rules: :92-94 the per-award SECTOR_ALIAS map ({ MA000020: allo… | closed |
| **W-4** | Confirmed Open | S | The row's factual claim is CONFIRMED. R80.4/src/awards/contingent-costs.ts:275-278 is the whole function and it is pure arithmetic on elapsed time: export function schoolBasedStage(yearsEmployed: num… | A school-based apprentice who attains the competency percentage before the 12-month mark is on the higher stage from that date under cl.19.7(b). The screen tel… |
| **W-5** | Confirmed Open | M | CONFIRMED, and WORSE than the register records: it is 6 of 6 rungs unreachable, not 5 of 6. METHOD (multi-line safe, comment-stripped — a line-oriented grep misses `provenance:` and its value on diff… | Every dollar the calculator shows is indistinguishable from every other dollar. A bundled 2024-25 table figure, a live 2026-27 API figure and a number an opera… |
| **W-6** | Closed | ? | Re-tallied from the ledgers, and my method reproduces the register's OWN positive control EXACTLY, which is how I know the two counts are comparable. Scanning all 23 files in R80.4/src/awards/coverag… | closed |
| **W-7** | Closed | ? | Counted from CATALOGUES' own top-level keys in R80.4/src/awards/allowance-catalogue.generated.ts, not from a grep over prose: 21 keys — MA000004, MA000005, MA000008, MA000009, MA000010, MA000014, MA0… | closed |
| **W-8** | Confirmed Open | S | Three of four limbs have closed. The fourth means no tenant is actually differentiated, so the defect stands. CLOSED — the migration is APPLIED. Live production (project tuybltdrdefjblnplpqo): inform… | Every tenant is still quoted at superannuation 12% and workers' compensation 4.7%. Workers' comp is per-employer and per-WIC code and in practice varies by sev… |
| **W-9** | Closed | ? | All three remaining actions in the row ('publish 0.14.0, bump crm7, promote crm7 to main') are done, verified against the registry and the published artefact rather than the source. PUBLISHED: `npm v… | closed |
| **W-10** | Closed | ? | Re-confirmed on main by content, not by ancestry. `git ls-tree -r --name-only origin/main \| grep -ci penaltycalculator` → 0. POSITIVE CONTROL on the same command: `git ls-tree -r --name-only origin/… | closed |
| **W-11** | Confirmed Open | M | Unchanged, measured live against production (project tuybltdrdefjblnplpqo) in a single statement so the two counts cannot come from different moments: select (select count(*) from public.awards) as a… | Not a live wrong number today — nothing reads award_rates, so no quote is priced from it. The exposure is architectural and it blocks W-5's mapd_db_cache rung:… |
| **W-12** | Confirmed Open | M | Three of the four named gaps have closed; one remains, and the repository's own issue tracker states it in those terms. CLOSED — TRAINEESHIPS. R80.4/src/awards/engagement-term.ts:81-129 defines five … | An ABN contractor — a worker engaged through their own Australian Business Number rather than as an employee — cannot be quoted at all. The operator's workarou… |
| **W-13** | Closed | ? | Fixed end to end, and the fix is rendered rather than merely returned — a hook that distinguishes two failures nobody displays would be the same defect one level up, so I checked the consumer as well… | closed |

**How to read this table.** *Confirmed open* means the defect is still present and the evidence
column says where. *Closed* means it is fixed and the evidence names the fix. *Superseded* means
the surface no longer exists or the row asks for something that would now be a regression — six
rows are in that state, and doing them would make the estate worse rather than better.
