# BSuite Estate Completion Proof

**Document:** `docs/20260817-completion-proof-v1.00W.md`
**Date:** 2026-08-17
**Scope:** the 213 dated documents in `docs/20260227` … `docs/20260815`, reduced to 80 tracked work items
**Status:** W (working)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## The answer

**No. It is not complete. Of the 64 items re-measured today, 15 are genuinely finished — 23%.** Twenty-eight have not started or are stalled, seventeen are half-built, three wait on a decision only you can make, and one was never a real defect.

The remaining 16 of the 80 tracked items were not re-measured in this pass; 12 of those had already been recorded as closed before it.

---

## How much to trust this document

Every verdict was measured twice: once by an engineer running live commands, then again by a second agent whose only job was to try to prove the first one wrong.

**One "finished" verdict was overturned.** Sixteen items were claimed finished; fifteen survived. The one that did not:

- **M-6 — the allowance picker.** A fix was written and merged that stopped the picker dropping an award's all-purpose industry allowance when you switch between awards. The reviewer ran the code live and found a second, separate path that the fix never touched: the Building & Construction award (MA000020) loads its own default allowances through a different function, and switching to it from the Textile award still silently drops every sector-tagged allowance — including the $67.15/week industry allowance the fix was named after. Same bug, same award, still live. **Not done.**

That is a 6% failure rate on claimed completions. It is low, but it is not zero, and the one that failed was in the money chain.

Three further corrections were made that did not change a verdict but did change what the work actually is:

| What was said | What is true |
|---|---|
| Four fabricated-data fixes (K-0, K-2, K-3, K-5) are "merged, just need a redeploy" | They are **not merged**. They sit on the `development` branch of Business Suite Unified with no pull request open to `main` at all. Redeploying would change nothing. |
| TH-9 (mobile two-column layouts) — "no commit addresses this anywhere in history" | Six commits fix it; five are already merged. The measuring agent was reading a stale copy of the sub-repositories. Verdict corrected **OPEN → PARTIAL**. |
| TH-4 — the same faint-border value appears in three apps | It appears in two. CRM7's is a different colour that happens to share the same transparency. |

---

## Scoreboard

| Outcome | Count | Share of 64 |
|---|---:|---:|
| **Genuinely finished** — proof named, survived review | **15** | 23% |
| **Not a defect** — the filed premise was false | **1** | 2% |
| **Waiting on your decision** — no engineer can resolve it | **3** | 5% |
| **Half-built** — real progress, real remainder | **17** | 27% |
| **Open** — not started, or written but unreachable | **28** | 44% |

These five rows are deliberately **not** added into a single "closed" figure. Lumping "finished", "was never broken", and "waiting on Braden" together is exactly what made the previous register untrustworthy.

### What changed since the stale ledger

The ledger recorded **50 open / 14 half-built / 12 closed**. It was written at 11:51 on 2026-08-17 and roughly 100 pull requests merged after it. **Twenty-six of the 64 items were recorded wrongly** — and in 24 of those 26 cases the ledger was too pessimistic: the work had actually landed.

Specifically, thirteen items the ledger carried as open are finished: the two cron-job items (V-4, V-5), the row-level-security performance fix (PF-1), the funding-offsets permission gap (T-6), the unscoped-policy sweep (V-11), and eight documentation items (D-2, D-4, D-7, D-8, D-9, D-11, D-12, plus the theme gates TH-3, TH-7, TH-8).

It was too *optimistic* in two places: M-6 (above), and its own record of the award coverage count.

---

## (a) Genuinely finished — 15 items, each with its proof

Nothing appears here without an artefact that was run, read, or queried today.

| # | Item | The proof |
|---|---|---|
| 1 | **T-6** — deleting a funding offset was open to more people than editing one | Live production database: the delete rule on `funding_offsets` now carries the identical owner/admin/manager list as insert and edit. Migration `20260820150000` confirmed applied. |
| 2 | **PF-1** — every security rule re-evaluated the logged-in user once per row | Live production database: 414 security rules now use the fast form, **zero** use the slow one. |
| 3 | **V-4** — nothing alerted when a scheduled job stopped running | Live database: the health function exists and reports on all 16 active scheduled jobs. Positive control — a fake failure was inserted inside a transaction that was then rolled back; exactly one job flipped to "failing", the other 15 stayed healthy. |
| 4 | **V-5** — two cleanup routines were written but never scheduled | Live database: both now scheduled (token cleanup daily at 03:50, Xero cleanup hourly at :55). The third routine correctly runs as a trigger, not a scheduled job. |
| 5 | **V-11** — a check for over-permissive read rules that nothing ran | Run live against production: 1,084 rules across 393 tables examined, 9 reviewed exceptions, 0 new. Deliberately removing one exception made it fail correctly. Now wired into the database-lint pipeline. |
| 6 | **TH-3** — near-white colours banned but the counter disagreed with the banked figure | The audit script returns exactly 16; the banked baseline reads 16. Adding a near-white colour by hand pushed it to 17 and the gate went red, then reverted cleanly. |
| 7 | **TH-7** — a rule that exempted precisely the files still breaking it | Business Suite Unified's lint config: the exemption list is deleted. Exactly one raw button remains in the Developer pages, carrying a written justification. |
| 8 | **TH-8** — a gradient style that fails contrast | The style is deleted, with an in-place note explaining why. Zero references anywhere in the estate. |
| 9 | **D-2** — the standards guide told agents the error colour was purple | Line 205 now reads red (Electric Red), cross-checked against the actually-shipped colour token, with a dated correction banner above the old wrong values. |
| 10 | **D-4** — contributor docs named retired AI models | The estate's own drift-scanning tool reports 0 hits across 9 signals on that file. |
| 11 | **D-7** — two inventory audits quoting long-dead counts | Both bannered with live figures, re-verified today: 402 tables (doc said 229), 225 elevated-privilege functions (doc said 59), and **zero** of them missing the security setting the banner claims they all carry. |
| 12 | **D-8** — an operator-verification index whose evidence links went nowhere | Banner explains which 5 of 8 items were archived out of the repository and where they now live; the 3 that still resolve were confirmed present. A missing index for `docs/references/` was created and lists all 10 files. |
| 13 | **D-9** — a six-week-stale plan board agents were planning from | Now opens with a "HISTORICAL BOARD — do not plan from this file" banner naming its two specific traps, and the companion README correctly classifies 15 documents as one-shot prompts, not plans. |
| 14 | **D-11** — 15 superseded plans with nothing marking them superseded | All 15 individually confirmed to carry a dated SUPERSEDED banner, with the original text left visible beneath it per convention. The merge commit was confirmed an ancestor of the current branch. |
| 15 | **D-12** — a handback document asserting defects that were already closed | Both affected sections bannered, and independently re-verified against the live database: the migration is applied, the column's provenance note matches the banner word for word, and the row count is 96 as corrected (the document body said 76). |

---

## (b) Not a defect — the filed premise was false

**AD-10 — "dashboard drag-and-drop never persisted."** It persists. The register searched for a table called `dashboard_layouts`, which does not exist and never did — layouts are stored in `user_preferences`. Live count: 9 saved layouts each for the Business Suite dashboard and the CRM7 dashboard, backed by 9 distinct users. A full round trip, working, for months.

One sub-finding belongs here too: **PF-4(a)** — nine tables were flagged as having security switched on but no rules defined. Confirmed deliberate: none of them grant any access to logged-in or anonymous users at all, so they deny everything by construction. Correct as built.

---

## (c) Waiting on a decision only you can make — 3 items

No engineer should resolve these. Each is a genuine fork with costs on both sides.

### A-2 — the Stripe read-only database bridge

Nothing was ever built: the extension, the schema, and the server connection are all absent from production. The migration file that would create it has a filename that collides byte-for-byte with a different migration, and sits below the applied-migrations floor, so it can never run. Nothing anywhere in the estate reads it.

- **Retire it** — delete the colliding file, mark the architecture note superseded. Costs nothing; nothing was built and nothing reads it.
- **Build it** — re-timestamp the migration, provision a live Stripe key in the vault, stand up the extension and server for a feature with zero consumers, while there is still no live billing.

Retiring is the cheaper default. It is your call.

### AD-5 — the entity selector

CRM7 has a 712-line component that lets a user create a company inline while filling a form. Business Suite and Conduit do not. Throughput has already written its own independent 160-line version rather than reuse it.

- **(a)** Extract CRM7's into a shared package — real engineering, matches the original ask.
- **(b)** Accept light per-app copies like Throughput's — faster, but perpetuates the duplication that is this estate's default failure.
- **(c)** Leave Business Suite and Conduit without it and accept "can't create a company inline" as a known gap.

### TH-4 — the faint panel border in Business Suite

The border colour is at 2.07:1 contrast against its background. The accessibility floor for a control boundary is 3:1. It cannot reach 3:1 at *any* transparency — the ceiling is 2.18:1 — so this is a colour change, not a tuning change.

- **(a)** Darken it to lightness 0.656 or below. That turns a barely-visible hairline into a clearly visible mid-grey line across every panel in the app. A visible design change.
- **(b)** Document it as an accepted exception. There is precedent — an analogous case was already left this way as "an operator taste call."

Also parked here: **PF-4(c)** — a legacy table with 0 rows, 4 security rules, and no readers anywhere in application code. Drop it or keep it; nothing breaks either way.

---

## (d) Half-built — 17 items, one blocker each

| Item | What it is | The one thing blocking it |
|---|---|---|
| **M-1** | Superannuation (12%) and workers' compensation (4.7%) are one platform-wide number, overridable only per quote and never saved | No per-tenant on-cost table exists in the database. Payroll tax is already fully state-resolved and is not part of what remains. |
| **M-9** | Sending a rate from the calculator to CRM7 | The receiving half is live and working. The calculator still copies to clipboard instead of calling the handoff function. |
| **M-10** | Engagement-type pricing | Casual, full/part-time and trainee paths ship and pass tests. Contractor/ABN pricing has **zero** implementation anywhere in the estate. |
| **K-0** | The shared "data unavailable" component that replaces invented numbers | It is published (v1.1.0) and Business Suite's source now uses it in 4 files — but only on `development`. No pull request to `main` exists. |
| **AD-1** | Five apps share the page-builder package | CRM7 runs a 262-line local reimplementation with no reference to the shared package at all. |
| **AD-2** | Five apps use the shared card-layout scanner | Four merged today. CRM7's pull request #1795 is open and unmerged. |
| **AD-8** | A view that flags a Xero connection that has never actually synced | The view still has zero readers. CRM7 fixed the visible symptom a different way and is safe; the other four apps were never checked. |
| **V-1** | The end-to-end test walk of CRM7 | Sign-in now works — the ledger's "invalid credentials" claim is dead. The session bridge inside the test harness does not fire, so 50 of 126 checks skip. |
| **V-6** | Lint debt in the calculator | 35 low-severity items are banked and held. None are the crash-class problems the item was filed about; those are cleared. |
| **V-7** | 97 suppressed lint warnings | The new guard stops the number growing and catches silent shrinkage. Nothing pays the 97 down. |
| **V-8** | Per-page visual audits across all apps | Built and running for CRM7 (11 routes, real findings). The other five apps have no route inventory at all. |
| **V-9** | Auditing pages while signed in | Working for CRM7's 6 signed-in routes. The other five apps have no way to produce a test session. |
| **V-10** | Issues staying open after the fix ships | Confirmed live on all 7 repositories: GitHub only auto-closes on merges to `main`, and work merges to `development` first. Backlog was cleared by hand; the mechanism that re-forms it is untouched. |
| **TH-9** | Two-column layouts that don't collapse on a phone | Fixed and merged in 5 of 6 apps today. CRM7 — which holds 174 of the ~176 remaining cases — is pull request #1789, open. |
| **TH-10** | Draggable cards adopted beyond CRM7 | Conduit is done: 11 render sites across 9 dashboard views. The calculator (R80.4) does not even list the dependency. |
| **PO-2** | Host supervisors seeing only their own apprentices | The database grants a host supervisor every row belonging to their employer. Proven live: a contact with no supervisor link at all became visible. No rule anywhere checks who the supervisee is. |
| **D-1** | Index documents agents read first | `docs/README.md` is repaired — all 25 links resolve. The documentation-hub file has 12 dead links of 33, including three pointing at an archive folder that does not exist. |

---

## (e) Open — 28 items, one blocker each

### The money chain (7)

| Item | The one thing blocking it |
|---|---|
| **M-2** | One line. The rostered-day-off accrual is captured on the form and never passed into the calculator. The code comment says it "requires charge-calc 0.2.4"; the app runs 0.12.0. |
| **M-3** | 37 rate clauses across 16 of 21 awards are only partially covered. That is clause-by-clause award work with no shortcut. Separately, MA000036's coverage record disagrees with its own data and needs regenerating — mechanical, five minutes. |
| **M-4** | 13 of 21 awards have no allowance adapter and fall through to an honest "not wired yet." |
| **M-5** | The calculator (R80.4) is published nowhere and no app depends on it. CRM7 and Conduit depend only on the much smaller shared calculation package. They are two unconnected codebases. |
| **M-6** | The allowance fix does not cover MA000020's own default-allowance path. Reproduced live: 0 allowances returned where 30 were expected. |
| **M-7** | **CORRECTED 2026-08-17 — the "chain gate" framing is wrong and sends the reader to seed a table nothing reads.** `award_rates`: 0 rows and **0 readers** — vestigial, it gates nothing. The live consequences are two narrower things: `award_classifications` (0 rows) has exactly one reader, `crm7/src/pages/hosts/vacancies/new.tsx:168`, so the vacancy classification dropdown is empty; and `award_rate_cache` (0 rows) has one real reader, `requoteOnRiseService.ts:301`, so the annual rate-rise requote path reads nothing. **Root cause: `crm7/supabase/functions/sync-award-rates` was built, exists as source, and is NEVER SCHEDULED** — no cron job references awards at all. It also writes `award_rate_cache`/`award_templates`, not the FK pair the register names. `FAIRWORK_API_KEY` is present, so the credential is not the blocker. Positive-controlled: the same reader-grep returns 19 files for `placements`. |
| **M-8** | The penalty calculator is fully written and tested and has **no call site**. No page, hook or service imports it. |

### Invented data on screen (6)

| Item | The one thing blocking it |
|---|---|
| **K-1** | The budget page returns hard-coded figures ($450,000 planned, $325,780.45 actual) after a fake one-second delay. No budget table exists in the database at all. Nothing has been started. |
| **K-2** | The Group Training compliance tile still serves a fabricated 95% score when its query fails. Fixed on `development`; **no pull request to `main` exists**. Confirmed still being served to users right now. |
| **K-3** | System health placeholders. Same situation — fixed on `development`, not merged, live bundle is pre-fix. |
| **K-4** | Hard-coded schedule milestones sit alongside the real data in the same component. Not one commit touches it. |
| **K-5** | A hard-coded OAuth client list. The database half is done and live (the function exists, refuses non-admins properly). The screen half is on `development`, unmerged. |
| **PF-3** | 66 cases across 62 tables where two permissive security rules overlap and both get evaluated. Merging them changes who can see what, so each needs the security red-team checklist first. |
| **PF-4(b)** | Two duplicate database indexes to drop. Purely mechanical. |

### Shared-capability adoption (5)

| Item | The one thing blocking it |
|---|---|
| **AD-3** | A design fork, not a missing line. The uniqueness rule on the trades register is conditional, which makes the intended link impossible — proven live, the database refuses it. And 0 of 34 placements carry a trade anyway, which no migration fixes. |
| **AD-4** | Zero portal invites have ever been issued against any of the 50 real people. The surface has never been opened. |
| **AD-6** | 314 of 402 tables have no catalogue entry — 22% coverage. |
| **AD-7** | Four persistence surfaces (data imports, custom pages, form layouts, tenant records) all hold 0 rows. Never used. |
| **AD-9** | Five AI tool categories do not exist: payslip, pay run, navigation config, branding, compliance test. Fourteen others do. |

### Theme and visual (3)

| Item | The one thing blocking it |
|---|---|
| **TH-1** | Hard-coded colours across the apps. Confirmed real and estate-wide, concentrated in CRM7, Business Suite and Braden. The exact count is unsettled — two independent passes bracket it between 143 and 537 — because the authoritative count comes from the lint rule itself, which was not run. |
| **TH-5** | **Two pull requests both published the theme package as version 0.13.0.** Whichever ran second won the slot; the accessibility fix in the other one exists under no version number npm has. All six apps lock to that version. Confirmed by fetching the live stylesheets from five hosts: the old, failing border value is what browsers load. Blocker: republish as 0.13.1. |
| **TH-6** | Same version collision. The shared gradient underline is in nobody's stylesheet except CRM7's, which has its own older local copy. |

### Portal and documentation (7)

| Item | The one thing blocking it |
|---|---|
| **PO-1** | The walled field-officer portal was **renamed, not retired** — exactly what the ruling forbade — and it is still the default portal on the picker. And there is no caseload scoping anywhere in the database: zero security rules and zero columns mention it. |
| **PO-4** | Four host-portal capabilities — staffing orders, safety questions in the timesheet flow, the payslip viewer, and chasing — have **no backing tables**. Nothing shipped: no schema, no backend, no screen. |
| **PO-5** | Gated by M-7. The host charge-rate table exists, holds 0 rows, and is referenced by no page. Nothing customer-facing can sit on top of an empty rate table. |
| **D-3** | Six files still quote the page-builder package at 0.2.0 or 0.4.0. It is 0.9.0 everywhere. The rulebook itself is now correct; `knowledge.md` and five near-identical sub-repository files are not. |
| **D-6** | 44 top-level documents still name the retired R80.3 calculator. The rulebook now carries one authoritative correction and instructs agents not to mass-rewrite dated history. **If that convention stands, this is as fixed as it gets.** If you want a lower per-file count, that is a separate and much larger job. |
| **D-10** | Five Throughput component documents are still unfilled `[Describe what…]` templates, and the Braden theme document claims Tailwind v3 while the app runs v4. |

---

## The single biggest pattern

**Eight items are finished, correct code that no user can reach.** Not unwritten — unreachable.

| Blocked by | Items |
|---|---|
| Business Suite `development` → `main`: **no pull request exists** | K-0, K-2, K-3, K-5 |
| CRM7 pull request #1795, open | AD-2 |
| CRM7 pull request #1789, open | TH-9 |
| Theme package: two pull requests published the same version number, one overwrote the other | TH-5, TH-6 |

That is 13% of the whole measured estate sitting one merge or one republish away from done. It is also the cheapest 13% available: no design work, no decisions, no new code.

Three separate lanes independently verified this the same way — by fetching what the live site actually serves and reading it — rather than trusting a merge record. The fabricated 95% compliance score is being served to users at this moment, in a file whose fix was written this morning.

---

## What "complete" would require

In blunt order of what actually gates the business:

1. **Seed `award_classifications`, then `award_rates`.** Both are empty. M-7 blocks M-3, M-4, PO-5 and any host-facing money view. Nothing else in the money lane matters until this lands.
2. **Merge the eight unreachable items.** One Business Suite pull request, two CRM7 pull requests, one theme republish as 0.13.1.
3. **Answer the three decisions** — Stripe bridge, entity selector, panel border.
4. **Fix M-6 properly** — the Building & Construction default-allowance path, not just the one function already patched.
5. **Retire the field-officer portal and add caseload scoping** (PO-1), and narrow host-supervisor visibility to actual supervisees (PO-2). Both are permission defects on real client data.
6. Everything else.

---

*Every DONE in this document names an artefact that was run, read, or queried on 2026-08-17. Every OPEN and PARTIAL names exactly one blocker. Nothing was inferred from a merge record, a pull-request title, or a previous document's prose.*