# Estate remaining work — the consolidated register

> ## ⚠ SUPERSEDED FOR STATUS — 2026-08-17
>
> **Every verdict and count below is superseded by
> [`docs/20260817-estate-completion-ledger-v1.00W.md`](20260817-estate-completion-ledger-v1.00W.md).**
> All 87 items were re-measured against the live database, live advisors, live deployed edge
> functions, live production probes and resolved lockfiles on 2026-08-17: ~~**16 DONE, 3 never
> defects, 1 already settled by an operator ruling, 13 partial, 54 open.**~~ **Corrected the same
> day, hours later: 19 DONE, 3 never defects, 1 already settled, 14 partial, 50 open** — the four
> `A-`series items (ratified ADRs never implemented) moved once bsuite#2053 fixed the underlying
> ADRs; see the ledger's own §1 and §2 for the row-level evidence.
>
> **This document's item numbering and evidence remain the reference** — the ledger keeps the same
> 87 identifiers, so nothing has to be re-mapped. What is *not* reliable here is any status or
> count. Several were measured wrong, including some in the flattering direction: award partials
> 37 → **39**, hook suppressions 90 → **97**, docs scoping the archived version 40 → **42**, and
> `grid-cols-2` 473 → **237** (this document counted the correct responsive pattern as the defect).
> Four items are not defects at all — see the ledger's §4.
>
> **The Method line below does not hold, and it is corrected in place below rather than silently
> edited.** "All 264 non-archive documents were read and classified" — there were **266** that day
> (re-measured 2026-08-17 at this document's own commit `b8a9941e`; see the corrected Method line
> for the exact enumeration rule). A coverage pass also found **11 clusters of outstanding work
> absent from all 87 items**, including the entire D-59…D-92 operator-notes backlog. See the
> ledger's §5.
>
> **`V-n` in this document means verification integrity (§5), and nothing else.** The 2026-08-15
> Vercel platform audit originally numbered its findings `V-1`…`V-8` for an unrelated set; on
> 2026-08-17 those were renumbered **`VP-1`…`VP-8`** so the two registers no longer share an
> identifier namespace. This document's `V-1`…`V-11` are unchanged and every existing citation to
> them remains valid. See `docs/20260815-vercel-platform-audit-and-res-regression-v1.00W.md`.
>
> Read this document for *evidence and item definitions*. Read the ledger for *status*.

**Document:** `docs/20260814-estate-remaining-work-register-v2.00W.md`
**Date:** 2026-08-14 · **Version:** 2.00W · **Status:** W — Working
**Superseded for status by:** `docs/20260817-estate-completion-ledger-v1.00W.md` (2026-08-17)
**Supersedes:** `docs/00-roadmap/20260812-estate-remaining-work-register-v1.00W.md` (v1) and, for their remaining-work content, every register listed in §9.

**Method.** ~~All **264 non-archive documents** under `docs/` were read and classified.~~
**Corrected 2026-08-17 — the count was 266, and "read and classified" overstates the coverage.**

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

There were **266** non-archive documents under `docs/` on 2026-08-14, not 264. Enumeration rule,
stated because a bare count with no rule is what let this drift: *tracked `*.md` files under
`docs/`, excluding `docs/archive/**`*, measured at this document's own commit `b8a9941e`
(`git ls-tree -r --name-only b8a9941e -- docs/ | grep '\.md$' | grep -v '^docs/archive/' | wc -l`
→ 266). Of those, 221 carry a `YYYYMMDD-` basename. A coverage pass on 2026-08-17 found 11
clusters of outstanding work absent from all 87 items, so the correct claim is **~93% coverage of
the dated set, not 100%** — see the ledger's §5.

*On the "dated window" figure:* the ledger reports **210** basename-dated documents in the
2026-02-27 → 2026-08-15 window. Re-running the enumeration independently at the ledger's own
commit yields **213** under the rule *non-archive `*.md` whose basename matches `^\d{8}-` with
`20260227 ≤ date ≤ 20260815`*; the ledger's own §5 subcount for `recovered/` (25) likewise counts
five documents dated before the window start. **The two figures differ because the enumeration
rule differs, not because either pass miscounted** — which is the actual lesson: quote the rule
with the number or the number will be restated wrongly. The figure sometimes attributed to this
register, **202, appears nowhere in it or in any other document** (verified by grep across
`docs/`); it is the ledger's inference of an assumed working figure, not a claim this register
made.

Every material claim was re-measured against: the six repos at `development` HEAD 2026-08-14 (crm7 `4514b7be`,
business-suite-unified `55e107f`, conduit `9020047`, throughput `97bf2ec`, braden `071baeb`,
bsuite `dc6e1825`), R80.4 `6852105`, live read-only SQL on `tuybltdrdefjblnplpqo`, live GitHub
issue and workflow state, and a live re-run of `scripts/audit-d2c-theme.sh`. Plus one deliberately
doc-blind sweep of the code itself, to catch what the docs never recorded.

**Operator rules applied throughout.** Newer wins on conflict. Cutting-edge and highest-UX wins
over a legacy approach an older doc happened to name first. A filed issue is never reported as an
addressed defect.

---

## 0. The four things that matter most

**1. Documentation status is not correlated with reality, in both directions.** Nine parity-spec
tracking issues (bsuite#567, #568, #571, #573–#578) are closed as `completed` — every one closed
*on the day its spec document merged*. Measured today, **26 of the 36 tables those specs define do
not exist**, and neither do the features. Closure was on documentation delivery. In the other
direction, dozens of items still carried as open in the registers are demonstrably fixed — the
1,856-error `useBranding` crash, the R80.4 blank screen, junior rates, 256 `@ts-expect-error`
(actually 7), 9 `window.confirm` (actually 0).

**2. The biggest security exposure in the estate is not in any document.**
`public.tenant_encryption_keys` holds tenant data-encryption-key material and grants
`SELECT, INSERT, UPDATE, DELETE` to **both `anon` and `authenticated`**. It is safe today only
because RLS is on with zero policies, which denies everything — so it is exactly one permissive
policy, or one `disable row level security`, from anon-readable key material. The other eight
zero-policy tables all correctly carry no anon/authenticated grants. **A class of nine, one
defective.**

**3. Two ADRs were ratified and then silently never implemented.** ADR-0005 (RAMS funding matrix)
has no table, no function, no route — funding amounts are still hand-keyed into placement costing,
invoicing and forecasts, which is the exact one-shot violation it was written to close. ADR-0007
(Stripe FDW) has no `wrappers` extension, no `stripe` schema, and its own migration was written
but **never applied**. Neither appears as outstanding work anywhere.

**4. The verification apparatus has a hole the operator has been paying for.** 18 of crm7's 20 E2E
specs self-skip because `CRM7_E2E_EMAIL`/`CRM7_E2E_PASSWORD` appear nowhere in any workflow — and
three unit suites were skipped *citing that E2E suite as the compensating control*. crm7's own
`tests/e2e/FIXTURES.md` names the failure mode: *"a skip and a pass look identical — that is how
this sat dead for months."* This is its third recurrence. Meanwhile
`prod-migration-history-audit` has failed on **every** bsuite run for 18 days and has not run in
crm7 since 2026-07-27.

---

## 1. P0 — live exposure, or one step from live

| # | Item | Repo | Evidence measured today | Size |
|---|---|---|---|---|
| **P0-1** | **`tenant_encryption_keys` grants full CRUD to `anon` and `authenticated`** on wrapped tenant DEK material | DB | `relrowsecurity=true`, **0 policies**, `relforcerowsecurity=false`; grants confirmed for both roles. Fix: `revoke all … from anon, authenticated` + `force row level security` | S |
| **P0-2** | **Migration `20260819010000_unscoped_select_policy_class.sql` is merged but NOT APPLIED** | crm7 | Live `schema_migrations` max = `20260818010000`. So `apprentice_profiles` SELECT is still `auth.uid() IS NOT NULL` over `base_pay_rate`/`cost_config`; `apprentice_handoff_tokens` still has no tenant predicate over `candidate_snapshot`; `tenant_app_branding_select_anon` still grants `{anon}` | S |
| **P0-3** | **braden CMS pages return zero rows to anonymous visitors** (bsuite#2004) | braden/DB | `content_pages` and `custom_pages` SELECT policies are `{authenticated}` only. Every public braden CMS route is broken for the public | S |
| **P0-4** | **IMAP/SMTP passwords written to plaintext columns**, and the read path expects Vault — so the feature is also silently non-functional | crm7 | `emailService.ts` `connectIMAP`/`connectSMTP` insert `imap_password`/`smtp_password` directly; **zero triggers on `email_integrations`**; read path uses `email_integration_get_decrypted_token` against `*_vault_id`. Latent only because the table has 0 rows | M |
| **P0-5** | **`api/error-report.ts` — no auth, no rate limit, `Access-Control-Allow-Origin: *`** | crm7 | `api/error-report.ts:31-34`; zero `Authorization`/`getClaims`/rate-limit references. crm7#1625 OPEN | S |
| **P0-6** | **`profiles` INSERT column grant on `is_super_admin`/`platform_role` survives for `anon` and `authenticated`**; the guard trigger is `BEFORE UPDATE` only | DB | `information_schema.column_privileges`; `trg_guard_profiles_privileged_columns` is UPDATE-scoped. Profile-creating triggers on `auth.users` are `tgenabled='O'` — the replication/restore case | S |
| **P0-7** | **`platform-kit-proxy` needs redeploy** — BSU#726 narrowed the client gate; until deploy the server is wider than the client | BSU | Merged, not deployed | S |
| **P0-8** | **Eight live edge functions have no source in any repo** | shared | `email-inbox-sync`, `tasks-sync`, `adobe-sign-webhook`, `refresh-award-rates`, `update-wage-rates` carry `file:///tmp/user_fn_…` entrypoints; `auth-fairwork`, `get-fairwork-api-key`, `sync-award-rates` point at the retired `R80.3/`. bsuite#1955 OPEN | M |

---

## 2. P1 — money, compliance and correctness

### 2.1 Charge rates and awards — the block gating the host money view (D-94)

| # | Item | Repo | Evidence | Size |
|---|---|---|---|---|
| M-1 | **On-costs are platform-wide, not per-tenant.** `superRate 12%`, `wcRate 4.7%` ("GTO average"), `payrollTaxRate 4.85%` — **payroll tax is state-based** (4.85% is NSW) and workers-comp is per-employer | crm7 | `chargeRateDefaults.ts:23` + `charge-rates/create/types.ts:24`, identical TODOs. Compounded: **`tenant_settings` has 1 row for 7 tenants** | M |
| M-2 | **RDO accrual accepted in the UI, never passed into `CalcConfig`** → billable weeks overstated | crm7 | `usePlacementChargeCalc.ts:72-80` TODO. **The version blocker it cites is gone** — charge-calc is 0.12.0 and DB columns landed in `20260730340000` | M |
| M-3 | **37 rate-scope `partial` coverage rows across 16 of 21 awards** | R80.4 | Counted from `src/awards/coverage/*-clause-coverage.json`: ma000071 5, ma000010 5, ma000009 4, ma000029 4, ma000017 3, ma000073 3, ma000026 2, ma000104 2, ma000119 2, +7 awards at 1 | L |
| M-4 | **Allowance catalogue covers 8 of 21 awards** | R80.4 | `allowance-catalogue.generated.ts` has MA000004/005/009/014/017/020/026/036 only | L |
| M-5 | **The award engine is not wired to the calculator UI** — 20 of 21 awards' constructors are unreachable from the product | R80.4 | `charge-calculator-v9-2.tsx:5376-5385` says so itself; `resolveOrdinaryRate` has no non-test importer outside the barrel | L |
| M-6 | **MA000017 sector-alias bug** — `r.sector === sector` with no alias resolution, so `commercial_construction → general_building` never matches | R80.4 | `allowance-catalogue.ts:98` | S |
| M-7 | **`award_rates` is empty (0 rows) while `awards` has 156** | DB | Wage-compliance backbone for crm7 `/payroll/award-rates` and the R80.4 calculator. Needs a ruling on whether rates are meant to live in the DB or only in R80.4's static corpus | M |
| M-8 | **`penaltyCalculator.ts` has zero consumers** — per-shift penalty interpretation is unreachable from the product | crm7 | Only the barrel and its own test import it | M |
| M-9 | **R8→crm7 quote transport is still a paste box**; `r80_saved_quotes` and `quote_handoff_tokens` both exist at 0 rows with no readers or writers | R80.4/crm7 | R80.4#13 OPEN; `QUOTE_STORAGE_KEY` is still localStorage | M |
| M-10 | **Traineeships, casual, ABN and part-time qualified workers cannot be priced** | R80.4 | R80.4#45, #46 OPEN | L |

### 2.2 Transaction integrity

| # | Item | Repo | Evidence | Size |
|---|---|---|---|---|
| T-1 | **`executeTransition` has no state guard** — concurrent host approve/reject is last-write-wins, and audit events can disagree with the final state | crm7 | `timesheetWorkflow.ts:481-508` — fetch then `.update().eq('id')` with no `.eq('state', current)` | M |
| T-2 | **`approveLeaveRequest` can double-approve**, running `annotateLeaveBalance` twice and double-counting `taken` | crm7 | `leaveRequestService.ts:279-296`; `updateLeaveRequestRow:252-267` has no status predicate; `annotateLeaveBalance:174-194` is read-modify-write | M |
| T-3 | **RCTI invoice number is `Math.random()` against a UNIQUE index with no retry** | crm7 | `rctiGenerator.ts:57`. `billingEngine` has 3 retries for the same shape | S |
| T-4 | **Employee-number minting has no 23505 retry** although the unique index now exists | crm7 | `employeeNumber.ts` docblock states it outright; surfaces a raw Postgres error string on an identifier that "reaches payroll" | S |
| T-5 | **`calculate(cfg)` failure swallowed** — UI cannot distinguish "no rate" from "bad config" | crm7 | `usePlacementChargeCalc.ts:217-220` bare `catch { result = null }` | S |
| T-6 | **`funding_offsets` DELETE grants `{owner,admin}` while INSERT/UPDATE grant `{owner,admin,manager}`** — a manager can create a wrong offset and cannot remove it | DB | Live `pg_policies` | S |

### 2.3 Mock data reaching the UI — a class of five

The standing rule is *"never display mock data in the UI, especially for financial or
account-related information."* Root cause is one idiom: `query.data ?? HARDCODED_FALLBACK`.
**Fix the class with an honest error/empty state component, not five patches.**

| # | Item | Repo | Evidence |
|---|---|---|---|
| K-1 | **`/financial/budget` renders `DUMMY_BUDGETS`** — `totalPlanned: 450000`, `totalActual: 325780.45`, behind a *simulated* 1-second API delay, with a working Export button | crm7 | `financial/budget/index.tsx:67,243` |
| K-2 | **`GTO.tsx` returns a fabricated 95% compliance score on any query failure** — bare catch, so an RLS denial renders a green compliance dashboard incl. "Fair Work Compliance — Award rates verified" | BSU | `GTO.tsx:303-305`, `DEMO_STATS.overallScore = 95`. The success path in the same function correctly emits `not_tracked` — the failure path contradicts it |
| K-3 | **Health surfaces fall back to fabricated state** — `PLACEHOLDER_CHECKS` renders "checking…" forever on error; `FALLBACK_EDGE_FUNCTIONS` misrepresents deployed surface area | BSU | `Developer/Platform.tsx:219-220`, `Admin/SystemOverview.tsx:121` |
| K-4 | **`MOCK_MILESTONES` in the field-officer site-visit schedule** — half the timeline is live, half is invented, so the fake half inherits the real half's credibility | crm7 | `field-officers/site-visits/index.tsx:124,262` |
| K-5 | **OAuth client registry hardcoded twice in the admin UI**, with `status: 'active'` asserted rather than read — in the app that *is* the OAuth server | BSU | `Admin.tsx:40,203,368` and `Developer/RateLimits.tsx:81,496,625` |

### 2.4 ADRs ratified and never implemented

| # | Item | Repo | Evidence | Size |
|---|---|---|---|---|
| A-1 | **ADR-0005 (RAMS funding authoring) never built.** No `rams_funding_matrix`, no `rams_funding_for()`, no `/developer/funding-rules`. Funding amounts remain hand-keyed — the exact one-shot violation the ADR was ratified to close | crm7+DB | `pg_proc` and `information_schema` both negative; route absent | L |
| A-2 | **ADR-0007 (Stripe FDW) dead.** `wrappers` extension absent, `stripe` schema absent, `pg_foreign_server` empty; its own migration `20260512161000` exists on disk and is **not** in the 594-entry applied ledger | bsuite+DB | Direct catalog queries | M — or retire the ADR |
| A-3 | **ADR-0006's organisation half is superseded and unrecorded.** The ADR mandates `clients.type`; production canonicalised the other way to `employers` + four boolean role flags. The newer model is better; the ADR text is what is stale | docs | `clients` has no `type`; crm7 uses `from('employers')` 30× vs `from('clients')` 4× | S |
| A-4 | **ADR-0004 number collision** — two ADRs numbered 0004; the README indexes only one, so the schema-builder consolidation ADR is unreachable | docs | `docs/adr/` listing vs `README.md:12` | S |

---

## 3. P1 — the parity program: 20 gaps, 0 built, 9 issues wrongly closed

Every one of these nine tracking issues is closed as `completed`, on the day its spec merged.

| Spec | Built | Evidence |
|---|---|---|
| Timesheet entry | **0%** | 0/4 tables; zero hits for `copyLastTimesheet`, `fillDown`, `did_not_work`, `whs_questions` across crm7+BSU+conduit incl. edge functions. bsuite#567 |
| Timesheet approval | **0%** | 0/3 tables; `bulkApprove` exists only in `portal/host-employer.tsx`. bsuite#568 |
| File-export adapters | **0%** | `payroll_exports`, `super_funds` absent; zero ABA/BECS or PayWay. bsuite#576 |
| Integrations | **0%** | `vendor_integrations`, `vendor_webhook_events` absent; zero Idibu/Onboarded/Secured Signing/Calendly outside prose. bsuite#577 |
| Comms | **~15%** | 0/7 tables; only `smsAdapter.ts` (Twilio) exists. bsuite#571 |
| Leave | **persistence only** | `leave_requests` + `leave_balances` live, `leave_types` never built; **no calendar view, no cash-out**. `OUTSTANDING.md`'s "5 tables — DONE" overstates it |
| Admin | **6/12, renamed** | Delivered under different names; the spec's table names are the stale part, not the capability |
| Pay periods | **DELIVERED** | `pay_periods` with close/lock columns + `pay_period_streams`, 7 consumers |
| Reports | **DELIVERED** | All four reports exist as DB functions; `report_deliveries` live with 25 rows |

**Every parity table that exists reports `reltuples = 0` except `report_deliveries`.** Schema
landed; the surfaces feeding it did not.

**Before building any of it:** three of these specs predate the portal rulings D-93–D-98, which
relocate the field-officer surface and change who sees the charge-rate build-up. Some gaps may be
moot rather than outstanding. **Re-scope against the rulings first, then reopen what survives.**

---

## 4. P1 — adoption gaps: shipped, not reaching the product

| # | Item | Evidence | Size |
|---|---|---|---|
| AD-1 | **`@bsuite/page-builder@0.9.0` reaches 1 of 5 apps.** crm7, conduit, throughput and braden pin `^0.8.0`; a caret on `0.x` is minor-locked. crm7, throughput and braden therefore still ship **local copies** of `DraggableCardPage`/`CanvasCard`, and conduit has **zero** usage | 4 lockfile regens outside the bsuite tree | S |
| AD-2 | **The shared card scanner is adopted by nobody.** All five apps still hand-roll `card-unglue-contract.test.ts`; only crm7's contains `findUngriddedMultiCard`. `src/scanner/cardSurfaceScanner.ts` ships and has no importer | Depends on AD-1 | M |
| AD-3 | **Four-axis identity model — schema shipped, data empty.** `qualification_occupation_links` 0 rows; `skill_sets`/`worker_licence_classes`/`non_accredited_training`/`skill_records` all 0; `qualifications` 0 global of 6; `award_trades` 27 rows, MA000020 only; `placements.award_trade_id` does not exist; people FKs 0 of 50 | The registers exist, nothing populates or reads them | L |
| AD-4 | **Self-service onboarding built and never opened.** `people.user_id` 0/50; `people_portal_invites` 0 rows. All seven migrations applied, all UI landed | S to exercise | S |
| AD-5 | **`EntitySelector` never adopted in BSU or conduit** — 65 files in crm7, **0** in each. Direct cause of the recurring "can't create a company inline" complaint | M |
| AD-6 | **Report catalogue covers 89 of 403 tables (22%)** | Live count | L |
| AD-7 | **Four persistence surfaces at 0 rows** — `data_import_jobs`, `custom_pages`, `form_layouts`, `tenant_entity_records` | M |
| AD-8 | **`xero_connection_health` view has no reader** — both live connections report `never_synced` to nobody | S |
| AD-9 | **14 Jodie actions the role manuals promise and no tool implements** — timesheet submit, payslip, pay-run, nav-config, branding, permission-grant, BOOT test | L |
| AD-10 | **BSU dashboard drag/drop persistence never adopted** — no `dashboard_layouts` table, no references | M |
| AD-11 | **crm7 Schema Builder "Tidy" and "Fit" do nothing** — no `dagre`, no `fitView` anywhere except an unrelated pipeline page | S |

---

## 5. P1 — verification integrity: controls that cannot fail

*These are the estate's `V-n` items. The 2026-08-15 Vercel platform audit's findings are `VP-n`
and are a different set — see the banner at the top of this document.*

| # | Item | Evidence | Size |
|---|---|---|---|
| V-1 | **18 of 20 crm7 E2E specs self-skip in CI** — `CRM7_E2E_EMAIL`/`CRM7_E2E_PASSWORD` appear nowhere in `.github/workflows/`; 31 skip sites. **And three unit suites are skipped citing that suite as the compensating control** (`fair-work-inspector.test.tsx:323`, `xero-oidc.test.ts:133`). Third recurrence of a documented failure mode | S to fix, L in what it then reveals |
| V-2 | **`/api/ai/rate-review` Authorization gate has zero executing coverage** — 5 `describe.skip` blocks incl. the auth gate, no reason recorded; only the 405 method-gate runs | S |
| V-3 | **`prod-migration-history-audit` is dead in both repos** — bsuite fails on every 6-hourly run through 2026-08-14T06:47Z; crm7 has not run since 2026-07-27 (3/3 failed). The control that catches out-of-band migrations. 18 days | S |
| V-4 | **No pg_cron failure alerting exists** — no job among the 14 active polls `cron.job_run_details`. Symptom currently clear; the control was never built | S |
| V-5 | **Three cleanup functions exist and none is scheduled** — `cleanup_apprentice_handoff_tokens`, `xero_cleanup_expired`, `reap_stale_tga_sync_runs` | S |
| V-6 | **R80.4 tolerates 131 baselined lint violations** — including **88 `no-hardcoded-colours`** in the app the operator most cares about visually, and **7 `no-undef`** which are candidate runtime `ReferenceError`s. The only rule-level ratchet in the estate, and it reports green | M |
| V-7 | **90 `eslint-disable`s for `react-hooks/exhaustive-deps` (63) and `set-state-in-effect` (27)** — the largest homogeneous debt class in the estate, tracked nowhere | M |
| V-8 | **Per-page theme validation was never built** — `scripts/audit-routes.sh` does not exist, so the entire P1–P9 checklist in the theme conformance DoD is unimplemented | L |
| V-9 | **Theme gates read logged-out pages only** — the gate list is `/ /login /404 /unauthorized /privacy /terms`; `--storage` is accepted by three scripts and **nothing produces a storageState**. Every authenticated surface is unmeasured | M |
| V-10 | **`Closes #N` on a PR merged to `development` never closes anything** (default branch is `main`) — 14 issues fixed-and-open. crm7#1728/#1729 are a live instance: both formally retracted in writing and both still OPEN | S |
| V-11 | **crm7#1730's sweep query is not in CI** — a new unscoped-SELECT table can join the list silently | S |

---

## 6. P2 — theme, UX and performance

**Theme.** The class was driven hard and is nearly closed: C1 pure white/black **629 → 7**, C3
token bypass **1,682 → 0**, C4 destructive **19 → 0**. What remains:

| # | Item | Evidence | Size |
|---|---|---|---|
| TH-1 | **C2 non-OKLCH colour: 235 real matches** — R80.4 93, braden 53, BSU 47, conduit 34, crm7 6, packages 2. The only D2C class not driven to ~0 | M |
| TH-2 | **Five app-local `oklch(0.994)` surface tokens still live** — `crm7/src/styles/theme.css:163,164`, `crm7/src/index.css:189`, `conduit/globals.css:143`, `throughput/index.css:44`. `--bg-shell-elevated` alone reaches ~200 crm7 sites | S |
| TH-3 | **`theme-conformance.yml` C1 cannot see them** — string matcher plus equality-to-baseline. Needs a parsed-lightness threshold **and** a re-bank in the same PR, or TH-2 regresses silently | S |
| TH-4 | **`--border-shell: oklch(0.3 0.03 260 / 0.09)`** — 9% alpha, below the WCAG 1.4.11 3:1 non-text floor. What reads as a border is a 5%-alpha ring in `--shadow-shell` | S |
| TH-5 | **Interactive borders fail non-text contrast at 1.12:1** — bsuite#1958, the operator's "unstyled button" | M |
| TH-6 | **`.bsuite-gradient-underline-span` is crm7-only** — absent from `packages/theme`, so the nav-gradient request is unimplementable in the other five apps | S |
| TH-7 | **BSU Developer Portal raw `<button>`** — 18 files; the 7 raw-only files confirmed; no `no-raw-button` rule exists. BSU#722 | M |
| TH-8 | **BSU app-tile gradient** — BSU#721. `.bsu-gradient` is defined at `index.css:992` with **zero** usages | S |
| TH-9 | **`grid-cols-2` without breakpoints: 473 occurrences** (109 at filing) — crm7#1271 | M |
| TH-10 | **Card grid still absent from conduit and R80.4** — conduit has plumbing only, R80.4 zero. bsuite#479 | L |
| TH-11 | **braden corporate error hue** — braden's primary *is* red, so it needs a colour-blind-separable error colour. Operator taste call | S |

**Performance — one mechanical migration closes 70 findings.**

| # | Item | Evidence | Size |
|---|---|---|---|
| PF-1 | **70 `auth_rls_initplan` violations** — policies calling `auth.uid()`/`auth.jwt()` unwrapped re-evaluate **per row**. Concentrated 4-per-table on `tenant_schema_layout`, `invoice_runs`, four `r80_*` tables, `tenant_entity_records`, `custom_fields_legacy_unused`. Fix is `(select auth.uid())` — **textbook fix-the-class** | S |
| PF-2 | **983 `unused_index`** — `funding_claims` 12, `payroll_runs` 12, `training_contracts` 12, `labour_requirements` 11. Caveat: `people` has 50 rows and `placements` 34, so "unused" partly reflects a pre-production dataset. Needs a stat-window audit, not a bulk drop | M |
| PF-3 | **68 `multiple_permissive_policies`** — every permissive policy runs on every query | M |
| PF-4 | **9 tables with RLS enabled and no policy**; 2 duplicate indexes; `custom_fields_legacy_unused` carries 4 initplan-violating policies and its name says drop me | S |

**UX gaps carried from the operator's own notes:** `/portal/worker` has no shareable application
link (crm7#1681); `/pipeline/kanban` is still isolated from conduit (crm7#1687); crm7 portals sit
behind the `portal_pages` flag; `/portal/employer` in conduit is a shipped "coming soon" stub on a
production domain.

---

## 7. P2 — portals (D-93 to D-98)

| # | Item | Evidence | Size |
|---|---|---|---|
| PO-1 | **Walled field-officer portal not retired (D-93).** `crm7/src/pages/portal/field-officer.tsx` still exists; conduit#461 was closed by **renaming** to `/portal/field-officer-assignments` — de-duplicated rather than retired, which is the one outcome the ruling forbids | M |
| PO-2 | **The supervisor concept does not exist in the data.** Hard prerequisite for both D-94 and D-95 | M |
| PO-3 | **Host-role RLS limb on `contacts`** — correctly carried out of Phase 0 as a portal prerequisite: the query-scope fix was right for GTO staff, but a host-portal session is a different subject | M |
| PO-4 | **Staffing orders, WHS questions, payslip viewer, chasing** — no `staffing_orders` or `whs_questions` tables exist | L |
| PO-5 | **The host money view is gated on M-3, M-4 and M-7** — the build-up becomes customer-facing, so 19 of 21 awards showing "UNVERIFIED DEFAULT" is not shippable | L |

---

## 8. P3 — documentation hygiene

These are cheap and they are the reason agents keep re-deriving the same wrong things.

| # | Item | Evidence |
|---|---|---|
| D-1 | **`docs/README.md` has 21 dangling references**, including four documents it names as *canonical* and the entire relocated `archive/parent/**` tree | Script-verified |
| D-2 | **The contributing standards guide says `--role-destructive` is purple.** Contract 0.7.0 made it red and CI enforces it. `AGENTS.md:67` cites this doc — every agent that reads it burns a CI round | §185/§205/§211 vs `vars.css:163` |
| D-3 | **`AGENTS.md` shared-package table says `@bsuite/page-builder ^0.2.0`** — the real version is 0.9.0, four minors stale, and that table is what an agent reads before a bump | — |
| D-4 | **`docs/ai/CONTRIBUTING.md` documents two retired models at `:240,243`** — a retired xAI fast-reasoning model and a retired Anthropic Sonnet. Live config is grok-4.3 / glm-5.2 / claude-opus-5. *The retired identifiers are deliberately not reproduced here: `drift-scan.mjs`'s STALE-GROK signal hard-fails any live doc that names them, and its own self-test asserts that behaviour — the guard is right and this register complies with it* | `:240,243` vs `config.ts:63-118` |
| D-5 | **`README.md` still calls `OUTSTANDING.md` "the single outstanding-work index"** after that file demoted itself on 2026-08-14 | One line |
| D-6 | **40 docs still scope R80.3**, which is archived; the scanner already moved, the docs did not | — |
| D-7 | **Two stale security inventories** — table-usage audit says 229 tables (live: 403); security-definer audit says 59 functions (live: 219) | — |
| D-8 | **`20260428-operator-verification/README.md` links to five files that do not exist**; `docs/references/` has no README index, contrary to the standards guide | — |
| D-9 | **Nine consumed one-shot prompts sit in the plans index as though they were plans**; `plans/STATUS.md` is six weeks stale and is the first file an agent opens; `plans/README.md` carries three false claims | — |
| D-10 | **Five throughput component docs are unfilled templates** (`[Describe what…]`); braden's theme reference claims Tailwind v3 against an installed v4.3 | — |
| D-11 | **Mark as SUPERSEDED:** `00-roadmap/20260112-master-roadmap-v1.00F.md`, both `20260725-*` excellence plans (they target the archived R80.3), the nine `20260506-codehouse-parity/` portal sub-plans (superseded by D-93–D-98), `20260510-universal-canvas` (shipped as page-builder 0.9.0), `20260507-feature-builder-ux-red-team`, `20260519-rpc-report-page-security-review` (the `report_catalog_*` family won) | — |
| D-12 | **`00-roadmap/20260812-pi-run-handback-v1.00W.md` §1 and §13 are actively misleading** — they rest on "nothing is promoted", which stopped being true on 2026-08-14. Banner it; the estate's convention is to leave corrections visible | — |

---

## 9. Registers this supersedes

For remaining-work purposes, this document replaces: `00-roadmap/20260812-estate-remaining-work-register-v1.00W.md`,
`00-roadmap/20260811-crm7-full-spectrum-review-register-v1.00W.md`,
`00-roadmap/20260810-theme-ui-ux-outstanding-register-v1.00W.md`,
`00-roadmap/20260810-r804-carryover-register-v1.00W.md`, `docs/OUTSTANDING.md` (already self-demoted),
`20260728-weekly-gap-register-v1.00W.md`, `20260728-operator-ux-bug-register-v1.00W.md`, and
`validation/20260805-operator-notes-defect-register-v1.00W.md`.

Their *evidence* remains valuable; their *counts* are stale. Several were measurably wrong:
`@ts-expect-error` 256 → **7**; `window.confirm` 9 → **0**; unlabelled SVGs 4 → **0**; award
partials 40 → **37**; `grid-cols-2` 109 → **473** (grew).

**One block is deliberately not restated here:** the 27 `CANNOT-VERIFY` items in the 2026-08-05
operator defect register. Each needs a live authenticated session on a named route. They are real
outstanding work and no static pass can settle them — see §11.

---

## 10. Already done — stop carrying these

Verified fixed today, with evidence, against registers that still list them as open: the 1,856-error
`useBranding` anonymous-view crash (production `error_log` confirms the drop from ~40/day to 1–2);
the R80.4 blank screen (kill switch on `main`); junior rates; `payRate: 0` hardcoding; the
trade-selector visibility complaint; Supported Wage System modelling (0 → **20 of 20**); the
`@react-pdf/renderer` colour-rule bypass; gitleaks tip-only scanning; the coverage threshold (now
ratcheted and wired); `trainingFeesAnnual` silently dropped from charge-calc; `confirmStaEmail`
non-atomicity; BSU `custom_css` raw injection; BSU per-app plan cards and the 400ing Upgrade
button; `fairwork-proxy-test` (deleted); crm7 document generation (deployed); the `xero_audit_log`
forgeable IP; self-promotion to platform developer via UPDATE; the orphan-invoice and zero-rate
line-item bugs; the `recordPayment` race (now an atomic RPC); funding `remaining_budget`; all nine
WHS TODO tables; AVETMISS export; the email-vault RPC; and every entry in `NEW_ISSUES_FOUND.md`.

**Close these issues, which are fixed in code and open only because `Closes #N` was inert:**
bsuite#1892, crm7#1603, crm7#1623, crm7#1639, crm7#1728, crm7#1729.

---

## 11. What no static pass can settle

1. **Every visual and runtime claim.** No browser was driven. The whole of §6 is verified at token
   and source level, never on a rendered page. The operator's original complaints were visual.
2. **The 27 `CANNOT-VERIFY` operator-register items** — each needs an authenticated session.
3. **ADR-0004-a (the Supabase redirect-URI allow-list)** — no tool exposes Auth URL configuration.
4. **Credential rotation** — the Fair Work subscription key and proxy token (exposed in the UI until
   2026-08-13), two leaked `sbp_` tokens, `braden@braden.com.au`.
5. **105 of the 108 `authenticated_security_definer` advisories.** The three most sensitive were
   spot-checked and all three gate correctly internally; the advisory cannot distinguish
   "SECURITY DEFINER with an authz gate" from "without one".
6. **Whether the 983 unused indexes are unused in production traffic** — counters reset on restart
   and the dataset is tiny.
7. **Whether the 20 unbuilt parity gaps are still wanted** after D-93–D-98.

---

## 12. Sequence

**This week.** P0-1 through P0-8 — they are live or one step from it, and six of the eight are S.
Then V-1 and V-3, because until the E2E credentials exist and the migration-history audit runs,
every other verdict in this document rests on reading rather than running.

**Next.** PF-1 (one migration, 70 findings). TH-2 with TH-3 in the same PR. AD-1 (four one-line
bumps) then AD-2. M-2 (its blocker is gone). The K-class mock-data fix as one shared component.

**Then, in order:** M-1 and M-7 → the award block M-3/M-4/M-5 → PO-2 and PO-3 → the host money
view PO-5. That chain is the operator's stated priority and each link genuinely gates the next.

**Requires a ruling before any build:** whether the 20 parity gaps survive D-93–D-98; whether
ADR-0007 is applied or retired; whether `award_rates` is meant to be populated in the database.
