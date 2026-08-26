# Weekly Gap Register — work of 2026-07-21 → 2026-07-28

> ## ⚠ SUPERSEDED — 2026-08-14 · AND ITS `P0-n` ARE NOT THE ESTATE'S `P0-n`
>
> **Superseded for remaining-work purposes by
> [`docs/20260814-estate-remaining-work-register-v2.00F.md`](20260814-estate-remaining-work-register-v2.00F.md)**
> (see its §9), whose status is in turn carried by
> [`docs/20260817-estate-completion-ledger-v1.00W.md`](20260817-estate-completion-ledger-v1.00W.md).
> That supersession was declared on 2026-08-14; this banner was added 2026-08-17 because the
> declaration lived only in the *other* document, so a reader landing here directly had no signal.
>
> **Identifier warning.** This register's **`P0-1`…`P0-8`** name a completely different set of
> defects than the estate register's **`P0-1`…`P0-8`** — exactly overlapping ranges, two live
> documents, one namespace. A bare "P0-4" means *grace-invite audit write is fire-and-forget* here
> and *`profiles` INSERT column grant survives for `anon`* there. **Always cite `P0-n` with its
> source document.** Two other live documents
> (`20260728-migration-idempotency-audit-v1.00F.md`, `plans/20260728-gap-remediation-plan-v1.00F.md`)
> cite this register's `P0-2` and `P0-4`, and those citations mean *this* document's items.
>
> Read this for its evidence trail and its 2026-07-28 measurements. Do not read its counts or
> statuses as current.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Method: 8 scoped read-only assessors (subagent-driven-development) + controller live verification
against the production Supabase project (`tuybltdrdefjblnplpqo`), Vercel, and GitHub Actions.
Workspace: `.superpowers/sdd/20260728-weekly-gap-assessment-plan-v1.00F/`.

**Coverage: 5 of 8 assessment areas COMPLETE. 3 areas INCOMPLETE** — the session hit its usage
limit and killed the shared-packages, security-verification, and frontend/backend-mapping
assessors mid-run. Those three areas are NOT assessed; see §6. Do not read this register as a
clean bill of health for them.

Window volume: ~1,160 commits, 27 migrations, 85 open issues, 1 open PR.

---

## 1. The through-line

The week produced a large amount of correct, well-tested code. Almost every confirmed defect is a
**wiring or delivery gap, not a logic gap** — code that is right, merged, and not actually running.

Three delivery mechanisms failed silently and simultaneously:

| Mechanism | State | Consequence |
|---|---|---|
| DB migration applier | **Zero runs since 2026-07-16** | 27 migrations landed out-of-band or not at all |
| Edge-function deployment | Two functions never deployed | Two whole features dead in prod |
| Detection controls | Migration audit dead 5/5 days; no cron alerting at all | None of the above surfaced to a human |

That third row is the actual root cause. Every P0 below was individually invisible.

---

## 2. Confirmed P0 — production-affecting, all verified against live systems

| # | Defect | Evidence | Failure class |
|---|---|---|---|
| P0-1 | **Migration applier has not run since 2026-07-16** — zero runs in the entire window. Push-trigger path filters cannot match a submodule-pointer-bump commit, which is how nearly all changes land. | `gh run list --workflow supabase-migrate.yml` — last 8 runs all 2026-07-16 | LIVE |
| P0-2 | **19 of 27 in-window migrations absent from `supabase_migrations.schema_migrations`** though most objects exist live — systematic out-of-band application bypassing the ledger. | live ledger query vs. repo migration list | LIVE |
| P0-3 | **`enterprise_licence_events` does not exist in production.** BSU migration `20260728120000` committed, on `main`, deployed — never applied. | `to_regclass('public.enterprise_licence_events')` → NULL | LIVE |
| P0-4 | **Grace-invite audit write is fire-and-forget** — invite succeeds and admin sees a success toast even when the audit insert fails. Combined with P0-3, every grace event is silently lost. | Task 3, BSU invite path | WIRED |
| P0-5 | **Seat-cap enforcement is 100% client-side.** `evaluateSeatCap` is a pure no-I/O function; `inviteTeamMember` does raw Supabase table writes with no RPC/trigger/constraint. Any direct API call bypasses the cap. | Task 3 | WIRED — revenue control with no server-side teeth |
| P0-6 | **STA email ingestion has never run.** `sta-email-watch` cron failed **288/288 times** since creation (vault secrets never seeded) AND the edge function is not deployed at all. Two stacked blockers — seeding secrets alone only converts the vault error into a 404. | `cron.job_run_details`: 288 failed, 0 succeeded; `list_edge_functions` — slug absent | LIVE |
| P0-7 | **`handover-to-employment` is dead.** Invoked by live user code at `crm7/src/pages/apprentices/from-candidate.tsx:223`, but never deployed; conduit's copy was deleted the same day the crm7 port landed. Swallowed by try/catch + `logger.warn`, so apprentice creation still succeeds and nobody sees a failure. | `list_edge_functions` — slug absent; commits `144b3378` → `cbf7631` | LIVE |
| P0-8 | **Funding offsets never reach the real charge calculation.** `calculateChargeRate` (`src/utils/calcBridge.ts:542-557`) has no `fundingOffset` parameter; none of its 10 call sites pass one. The Funding Offsets screen shows a subsidy-reduced preview and lets an operator mark it "applied" while the actual quote, calculator and CSV export emit the **full un-offset rate**. | Task 5 T5-01 | WIRED — **silently wrong money reaching host-facing documents** |

**P0-8 is the one to fix first.** It is the only defect that produces a wrong number in a
customer-facing document, in the compliance-critical product, while the UI asserts the opposite.

---

## 3. Systemic findings — why none of this was caught

| # | Finding | Evidence |
|---|---|---|
| S-1 | **crm7 "Production Migration History Audit" failed 5/5 days on `main`** — `SUPABASE_DB_URL` secret is empty. This is precisely the control designed to detect P0-2. | runs 30299956686, 30217376191, 30172084041, 30121608984, 30039342217 |
| S-2 | **No pg_cron failure alerting exists anywhere in the stack.** Nothing polls `cron.job_run_details`. 288 consecutive failures produced zero signal. | Task 4 T4-03 |
| S-3 | **None of the 8 P0s is tracked as an issue.** `gh search issues` for `sta-email-watch`, `handover-to-employment`, `enterprise_licence_events`, `seat cap`, `SUPABASE_DB_URL` returns nothing open. | controller |
| S-4 | ✅ **CLOSED 2026-08-10 — the dashboard is retired, not repaired.** Braden's call once the finding was re-measured: Pages disabled, the three publishing workflows deleted, the page archived. See [`docs/20260810-plan-dashboard-retirement-v1.00F.md`](20260810-plan-dashboard-retirement-v1.00F.md). Original finding: **Dashboard — the doctrinal "source of truth" — is structurally unable to be true.** `open_issues_total` = 158 vs **actual 85**; `last_refreshed` = 2026-06-24. Neither value appears in `refresh-data.py`; they are static fields the hourly cron never recomputes. | `docs/dashboard/data/dashboard-data.json`; script grep empty |
| S-5 | **The hourly dashboard cron is a no-op loop.** Its only diff is `"main_sha": "806181d" → "42529d2"` — it records the SHA of its own previous commit. 12 such commits on `main` this week, zero information. | `git show 44137099` |
| S-6 | Those bot commits are **unsigned (`%G? = N`) and pushed direct to `main`**, contradicting both the signing rule and CLAUDE.md §10.2 (dashboard changes must go via PR). They are the sole cause of the parent `main`/`development` divergence. | `git log --format='%G?'` |
| S-7 | **Documented truth-drift.** `20260728-overnight-worldclass-closeout-v1.00W.md:256` says grace invites "write durable rows" (the table does not exist and the write is fire-and-forget). `docs/00-roadmap/20260112-master-roadmap-v1.00F.md:38` marks seat caps `[x]` complete (the control is bypassable). Open-issue count given as "~65" there, 158 on the dashboard, 85 in reality. | file:line as cited |

**In fairness:** doc honesty is inconsistent, not uniformly poor. Conduit's STA feature doc
self-reported its own gap accurately ("deployed-domain evidence pending operator deployment").
The failures cluster in roadmap/closeout *summaries*, not in implementer-written feature docs.

---

## 4. P1 — feature incomplete or unreachable

- **Manual % entry (R80.3)** computes derived rates with no handler to apply them — `manualRates` render as plain `<span>`s with no `onClick`. Dead end. *Silver lining: this is why there is no live compliance exposure from unaudited manual overrides.* (T5-02)
- **Jodie funding-offset AI tool + its money-integrity gate protect a path no user can invoke** — no assistant UI exists in R80.3 at all. (T5-03)
- **Two of four N-CRIT attribute selectors (occupation, employment arrangement) are cosmetic** — state set, never read, while junior/adult and year-12 beside them do work. (T5-04)
- **STA edge-function parser mirror drifted stale** after `a1ac1aa` enriched app-side parsers; the "parity" test is too shallow to catch it — the known inline-copy-drift failure mode recurred. (T4-04/05)
- **Card-unglue: `bsuite#479` never updated across ~120 relevant commits**; `crm7#744` (grid resize snap-back) and `crm7#619` (scroll regression) ignored despite dozens of commits touching the same mechanism. (T2-08/09)
- **Host-employer portal decompose deferral exists only as a code comment** — no issue filed, violating the repo's own rule that blocked work is registered. (T2-01)
- **Xero half of the licence epic is unbuilt**, and grace expiry (30 days) is computed but never enforced. Roughly **1 of 5 epic bullets** is genuinely functional.

## 5. Verified clean — checked and genuinely fine

- **RLS on every in-window table.** All 7 have RLS on, policies present, and a real tenant predicate (`auth_tenant_id()`, `auth_tenant_id_with_role([...])`, `user_tenants`, `ancestors_of()`). No deny-all traps, no `USING (true)`. Out-of-band application did **not** degrade security state — P0-2 is a traceability defect, not a security one.
- **FWC fallback removal (`ca47b14`) is safe** — typed, user-visible blocking error state; `percentagesToRates` returns `null`, never a fabricated number; "Use This Rate" is gated on a truthy rate. No silent zero or NaN. (T5-07)
- **`resolveSchemeAmount` KAP boundary logic** — correct inclusive/exclusive windows, genuine AU/Sydney civil-day conversion, strict ISO validation, with boundary tests asserting the NYE UTC-vs-AEDT edge. The standard the rest of the week's date logic should have matched.
- **Card-unglue is functional, not cosmetic, where it was done** — traced `/vet/qualifications/:id` end-to-end: real Supabase-persisted, individually draggable/resizable widgets. 12 sampled "legit" justifications all map to real architectural constraints.
- **en-AU date rendering is comprehensive** — zero bare `toLocaleDateString()` calls remain.
- **Deploy pipeline healthy** — all 6 apps have `main == development`; BSU production READY at `2caa484` == HEAD, commit signature verified. No cancelled-unsigned-deploy problem.
- **`funding_offsets` RLS** is a real server-side gate (owner/admin/manager) on the one funding surface users can reach.

## 6. NOT ASSESSED — three areas killed by the session limit

These were dispatched and terminated mid-run. **Treat as unknown, not clean.**

| Area | Status | Fragments recovered (unverified) |
|---|---|---|
| **Shared package pin train** (`@bsuite/ui` 1.0.1, `schema-registry` 1.0.0, `schema-builder` 1.0.1; §12.2 consumer chain; version skew; `.node-version`) | No report | Agent had confirmed *"all 6 apps have `.:` as the sole importer — lockfile doctrine clean across the board"* before dying. The schema-registry **revert-then-reapply** cycle in conduit and braden was never investigated. |
| **Security verification + advisor triage** (CORS allowlist, conduit RLS re-scope, X1 money RPC allowlist, RT-3..RT-6, `error_log_anon_insert`; the two linter false-green issues crm7#1158/#1175) | No report | Agent had parsed **67 live security advisor findings, 4 anon-related**, before dying. Attribution to in-window vs pre-existing was never done. My own live RLS check (§5) covers only the new tables, not the altered policies. |
| **Frontend↔backend mapping + UI/UX** (orphan routes, backend-with-no-frontend, theme-token compliance, dead code from removals) | No report | Agent had confirmed the BSU pricing gate is a deliberate, correctly-implemented design decision. Orphan-route audit never completed. |

The one crm7 P0 candidate I *did* independently check in this space: I refuted a claim that
`money_integrity_batch.sql:195` casts against a missing `rcti_invoices` — **that table exists in
production**. `rcti_batches`/`rcti_lines` genuinely do not (their pre-floor migration never
applied), so any reference to those two remains suspect and is unverified.

## 7. Recommended order

1. **P0-8** — thread `fundingOffset` through `calculateChargeRate`, or disable the Funding Offsets "applied" affordance until it is. Wrong money in a host document is the only defect here with external consequences.
2. **P0-6 / P0-7** — deploy `sta-email-watch` and `handover-to-employment`; seed the two vault secrets. Both are single-step fixes that revive whole features.
3. **S-1 / S-2** — set `SUPABASE_DB_URL`; add any cron-failure alarm. Without these the next silent failure is equally invisible.
4. **P0-1 / P0-2** — fix the applier trigger, then reconcile the ledger. Note the 19 unrecorded-but-applied migrations must be idempotent before the applier is re-enabled.
5. **P0-5** — put a server-side check behind the seat cap.
6. **S-3** — file the eight P0s. **S-7** — correct the two false completion claims.
7. **Re-run the three unassessed areas** after the limit resets.

---

## 8. Verified status as of 2026-07-28 (append-only; findings above are unmodified)

Re-checked live against the production Supabase project (`tuybltdrdefjblnplpqo`) and
`gh`/`git log` across the parent + submodules. This section records what has moved since §1–§7
were written; it does not change any finding above.

| # | Item | Status | Evidence |
|---|---|---|---|
| P0-1 | Migration applier never ran | **FIXED** | `86750146` added bare gitlink paths to the `supabase-migrate` + `functions-deploy` workflow triggers. |
| P0-2 | Ledger drift (19 of 27 unrecorded) | **RESOLVED** | Re-queried live: 16 of 16 in-window versions now have ledger rows. **Caveat:** 5 rows carry `statements[] = 0` — conduit `training_contract_email_ingestion`, `sta_email_watch_cron`, `align_rls_authenticated_scope`, `confirm_sta_email_atomic`; R80.3 `funding_offsets_placement_scheme_unique`. This is a ledger-fidelity gap, not a live-application gap — the revived migration audit's Class-A check covers it going forward. |
| P0-3 | `enterprise_licence_events` missing | **FIXED** | `to_regclass('public.enterprise_licence_events')` resolves non-null (re-verified live this session). |
| P0-4 | Grace-invite audit write fire-and-forget | **FIX READY, NOT MERGED** | business-suite-unified branch `fix/gap-bsu-grace-audit-warning`, commit `2f491f6` (confirmed present, unmerged — not on `origin`). Adds migration `20260728170000` to isolate the audit INSERT and surface failures as a non-blocking warning. Until merged and applied, the write is still fire-and-forget — see the correction applied to `docs/20260728-overnight-worldclass-closeout-v1.00W.md:254-262` in this same batch. |
| P0-5 | Client-side seat cap | **STILL OPEN** | Now tracked as **business-suite-unified#620 (P0, open)**. Re-verified live: `team_members_admin_insert` and `team_invitations_admin_insert` INSERT policies gate only on `auth.role()='authenticated' AND is_team_admin(...)` — no seat-cap predicate. The `invite_team_member_guarded` RPC enforces the cap, but it is not the only write path; direct PostgREST writes bypass it. Corrected in `docs/00-roadmap/20260112-master-roadmap-v1.00F.md:38` in this same batch (was ticked `[x]`, now `[ ]` with the caveat). |
| P0-6 | STA email ingestion dark | **FIXED** | Vault secrets seeded; cron succeeding; `sta-email-watch` deployed; `net._http_response` shows 200 with real scan output. |
| P0-7 | `handover-to-employment` dead | **FIXED** | Deployed v1 from the CI path; `list_edge_functions` now shows the slug present. |
| P0-8 | Funding offset not reaching charge calc | **FIXED in code**; residual P2 | Threaded at all 6 apprentice call sites. Residual: `calculateAllApprentices` bulk path still drops it — tests-only callers today — tracked as R80.3#367. |
| S-1 | crm7 migration audit dead | **FIX READY, NOT MERGED** | Parent commit `b442a8cb` + crm7 commit `1d2b876b` (both confirmed present on their respective repos, not yet on `main`/`development`). |
| S-3 | None of the 8 P0s tracked as an issue | **CLOSED** | Filed: bsuite#1680, bsuite#1682, business-suite-unified#620, crm7#1260, conduit#391, R80.3#367, R80.3#368. |
| S-4/S-5/S-6 | Dashboard lies, no-op cron, unsigned direct-to-main | **FIXED** | `86750146`. |
| S-7 | Documented truth-drift (this row) | **CORRECTED** | See the three edits landed alongside this appendix: `docs/20260728-overnight-worldclass-closeout-v1.00W.md` (durable-rows claim + open-issue count) and `docs/00-roadmap/20260112-master-roadmap-v1.00F.md` (seat-cap tick). |
| — | Cross-submodule migration version collisions (4) | **Reproducibility risk only** | Both sides verified applied live; tracked as bsuite#1682 (P1). |

**Open-issue count, measured (not copied forward):** 97 open across the 7 repos as of 2026-07-28,
via `gh issue list --repo GaryOcean428/<repo> --state open --json number --jq 'length'` for each of
`bsuite` (38), `crm7` (48), `conduit` (3), `business-suite-unified` (3), `R80.3` (4), `braden` (1),
`throughput` (0). This register's own §"Window volume" line above ("85 open issues") and the
overnight closeout doc's "~65 open across repos" are both now stale — both are corrected to the
measured 97 here and in the closeout doc respectively; neither figure is being copied forward
without re-measurement.

**Not re-verified in this pass:** S-2 (no pg_cron failure alerting), the P1 list in §4, and the
three NOT ASSESSED areas in §6 (shared-package pin train, security-advisor triage, frontend↔backend
mapping) — those remain exactly as characterized above: unknown, not clean, and still owed a
re-run.
