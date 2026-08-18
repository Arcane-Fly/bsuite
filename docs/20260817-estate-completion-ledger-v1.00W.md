# Estate completion ledger — proving the 2026-02-27 → 2026-08-15 document set

**Document:** `docs/20260817-estate-completion-ledger-v1.00W.md`
**Date:** 2026-08-17 · **Version:** 1.00W · **Status:** W — Working

> **This supersedes `docs/20260814-estate-remaining-work-register-v2.00W.md` for status purposes.**
> That register's *evidence* and *item numbering* remain the reference — this ledger keeps its 87
> identifiers unchanged so nothing has to be re-mapped. What this document replaces is every
> **verdict and count** in it. Where the two disagree, this one is current.

**Method.** All 87 register items were re-measured on 2026-08-17 against live sources, never
against the register's own prose: read-only SQL on the production database `tuybltdrdefjblnplpqo`,
live Supabase advisors, live deployed edge-function bodies (fetched, not read from the repo),
live production HTTP probes, live GitHub issue and workflow state, resolved `pnpm-lock.yaml`
versions and unpacked `node_modules` tarballs, and greps at the pinned submodule commits. Positive
controls were run on every "zero" result, because a broken search and a genuine absence look
identical. Separately, a coverage pass re-enumerated the dated document set to test whether those
87 items actually cover it.

**A word on the vocabulary**, since this document is meant to be read rather than decoded:

- **P0** — highest severity; live exposure or one step from it.
- **RLS (row-level security)** — the database's own per-row permission rules. It is what stops one
  client's data being visible to another.
- **`anon` / `authenticated`** — the two database roles the public internet can reach. `anon` is a
  visitor who has not logged in; `authenticated` is any logged-in user of any tenant.
- **ADR (architecture decision record)** — a ratified design decision kept under `docs/adr/`.
- **Migration** — a numbered SQL file that changes the database. Merging one changes nothing; a
  separate applier must run it. That gap is the single most common false "done" in this estate.

---

## 1. The answer

~~**Of the 87 items, 20 need no further work — 16 measured DONE, 3 were never defects, 1 was already
settled by an operator ruling. The remaining 67 carry real outstanding work: 54 untouched and 13
part-done.**~~ **CORRECTION, 2026-08-17 (same day, hours later): 23 need no further work — 19
measured DONE, 3 were never defects, 1 was already settled. The remaining 64 carry real outstanding
work: 50 untouched and 14 part-done.** All four A-series items (A-1…A-4, ratified ADRs never
implemented) moved: three from OPEN to DONE, one from OPEN to PARTIAL, once their documents were
corrected in bsuite#2053 — see §2 "A — ratified decisions never implemented" for the row-level
evidence. The whole P0 security class is closed but one, and the transaction-integrity class is
closed but one.

**No — the 87 items do not cover the dated document set, and this is the more important finding.**
A coverage pass found **11 clusters of genuinely outstanding work that appear nowhere in the 87**,
including two documents written the day before and the day of the register itself. The register is
best described as **~93% complete over the dated set, not 100%**.

**What is left, in one line:** the money chain (charge rates and awards) is barely started and gates
the host-facing money view; five surfaces still show invented data to users, one of which reports a
fabricated 95% compliance score when a permission check fails; and the largest single omission is
the entire **D-59…D-92 operator-notes backlog**, which the register never references.

Three counts in the answer above deserve their correction stated immediately, because they were
wrong in the register in the direction that flatters: the coverage pass counts **210** dated
documents in the window, not 202; **266** non-archive documents existed on 2026-08-14, not the
register's 264; and the register's own headline "all 264 were read and classified" does not hold.

### Scoreboard

| Verdict | Count | Meaning |
|---|---:|---|
| **DONE** | ~~16~~ **19** | Re-measured fixed, with evidence. No work remains. |
| **NOT-A-DEFECT** | **3** | Measured; the item was never a defect. Filed in error or measured wrongly. |
| **SUPERSEDED** | **1** | Already settled by an operator ruling the register post-dates. |
| **PARTIAL** | ~~13~~ ~~14~~ **17** | Half shipped. Real work remains — counted as open below. |
| **OPEN** | ~~54~~ ~~50~~ **47** | Untouched, or the fix exists but has not reached the running system. |
| **Total** | **87** | |

**Closed: ~~20~~ 23. Carrying work: ~~67~~ 64** (~~14 partial + 50 open~~ **17 partial + 47
open**) — roughly **31 small, 23 medium, 13 large** (sizes unchanged; neither recount shifts the
size buckets). Corrected 2026-08-17 for the four A-series items — see §2 and §6 item 2 — and again
2026-08-18 for AD-4, AD-6 and AD-7, which moved OPEN → PARTIAL when the parent's submodule
pointers were advanced onto the promoted mains that already carried their fixes. The total
carrying-work count is unchanged at 64: nothing here reached DONE, because in every case the last
step is an operator one (a promotion to parent `main`, or one live exercise of the surface).

> **One rule applied throughout, because it is where this estate has repeatedly fooled itself:**
> a filed issue is never reported as an addressed defect, and neither is a merged migration. Three
> items in this ledger (T-6, PF-1, and half of P0-4) have a *complete, correct, merged fix* that is
> **not in the running system**. They are counted as open, because the defect is still live.

---

## 2. All 87 items

Sizes are S (hours), M (days), L (a week or more).

### P0 — live exposure · 7 DONE, 1 PARTIAL

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| P0-1 | `tenant_encryption_keys` grants full create/read/update/delete to `anon` and `authenticated` | **DONE** | Grants query returns **zero rows** for both roles; positive control on `profiles` returns `anon:SELECT/DELETE`, so the probe sees grants that exist. Live anonymous read → `42501 permission denied`. RLS now forced, 0 policies. | — |
| P0-2 | Migration `20260819010000` merged but **not applied** | **DONE** | Version `20260819010000` **is present** in the applied ledger (max now `20260820300000`). Objects asserted, not inferred: `apprentice_profiles` SELECT is now owner-or-developer; `tenant_app_branding_select_anon` no longer exists; live anon read returns `[]`. | — |
| P0-3 | braden public web pages return zero rows to visitors (bsuite#2004) | **DONE** | Two `{anon}` policies live on `content_pages`/`custom_pages` gated on `is_published`. Live anonymous request returned **2 real published rows** (`privacy`, `terms`) — rendered *and* populated. `custom_pages` returns empty because it genuinely holds 0 rows, not from denial. | — |
| P0-4 | Mail passwords written in plain text; read path expects the vault | **PARTIAL** | **Security half done:** the plaintext columns no longer exist; only `*_vault_id` survive; storage RPC live with rollback. **Functional half broken:** the *live deployed* `email-inbox-sync` (v43) still reads `integration.imap_password` — a column that no longer exists — so generic mail sync would pass `undefined`. Latent only because the table has 0 rows. | S |
| P0-5 | Error-report endpoint: no auth, no rate limit, wildcard cross-origin | **DONE** | Live production probe, not a file read: cross-origin request from a hostile origin returns `access-control-allow-origin: https://crm.crm7.app` + `vary: Origin`, not `*`. 30-request/60s limit and 64KB body cap in place. Staying unauthenticated is documented and deliberate. | — |
| P0-6 | `profiles` insert grant on privileged columns survives | **DONE** | Column grants now **SELECT only** on `is_super_admin`/`platform_role`; table grants are `DELETE,SELECT` for both untrusted roles. No untrusted role can insert a `profiles` row at all. | — |
| P0-7 | Platform-kit proxy needs redeploy — client gate was narrowed | **DONE** | Fetched the **live deployed function body** (v58): contains the narrowed gate with no super-admin disjunct, byte-identical to the repo file on `main`. Server is no longer wider than the client. | — |
| P0-8 | Eight live edge functions have no source in any repo (bsuite#1955) | **DONE** | All six survivors now carry repo entrypoints; verified beyond metadata by fetching a deployed bundle and confirming it ships the real shared modules. The other two are deleted, not re-homed. Zero functions estate-wide carry a temp-directory entrypoint. | — |

### M — charge rates and awards · 0 DONE, 5 PARTIAL, 5 OPEN

This is the block gating the host money view. It is the least-advanced class in the ledger.

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| M-1 | On-costs are platform-wide, not per-tenant | **PARTIAL** | Payroll tax is **already** state-resolved on both live quote paths, snapshot-carried, and refuses to guess rather than substituting a default. Superannuation and workers' comp remain platform-wide. | M |
| M-2 | Rostered-day-off accrual accepted in the UI, never passed to the calculator | **OPEN** | Blocker gone *and* defect present: the calculator package resolves to 0.12.0 which **does** expose the accrual config, and the database column exists, but the config object in the hook has no `rdo` key. Stale "requires 0.2.4" comment still sits above it. | S |
| M-3 | 37 partial rate-scope coverage rows across 16 of 21 awards | ~~**OPEN**~~ **PARTIAL** | Re-counted from the ledgers: **39 partials across 17 of 21 awards**, not 37/16 — it moved the *wrong way*. Worst: MA000071 (6), MA000010 (5), MA000009 and MA000029 (4 each). **CORRECTION, same day, hours later:** re-scoped honestly rather than thinned estate-wide. Live DB measured (`award_trades`, 2026-08-17): **27/27 rows are MA000020** — no other award carries a single live GTO placement, so MA000020 is the *entire* in-scope population, not a sample of it. MA000020's own rate-scope gap — Schedule C (School-based Apprentices), reopened 2026-08-10 for missing the cl.19.7(b)/cl.14.9 competency-progression limb — is now closed: `schoolBasedStage()` takes an optional caller-supplied `competencyStage` and applies the award's own "whichever is the earlier" rule (`Math.max(timeBasedStage, competencyStage)`), consistent with operator ruling D-68 and the standing "user determines eligibility, never an engine" rule. `node scripts/dod.mjs MA000020` → **DONE, 18/18**, including D11 (no RATE-scope clause or schedule left PARTIAL). Mutation-tested: reverting the `Math.max` turns 4 tests red. PR (unmerged): [R80.4#85](https://github.com/GaryOcean428/R80.4/pull/85). Left **PARTIAL, not DONE**: the other 39 partials across the remaining 16 awards are untouched and carry zero live placements — closing them was explicitly out of scope, not silently dropped. | L |
| M-4 | Allowance catalogue covers 8 of 21 awards | ~~**OPEN**~~ **PARTIAL** | Unchanged: exactly **8** catalogue keys against **21** coverage ledgers. 13 awards fall through to the honest "no allowance catalogue wired yet" branch. **CORRECTION, same day, hours later:** the "OPEN" verdict understated MA000020's own state even before today — it was already one of the 8 adapted awards, and `award-catalogue-wiring.test.ts` already proved the adapter reaches the calculator end to end (not merely present): the industry allowance is enabled by default, every all-purpose row carries its clause, and the catalogue rows measurably move the ordinary wage. No code change was needed for M-4. Same live-DB fact as M-3: MA000020 is 100% of live placements, so the allowance catalogue is genuinely complete for the whole in-scope population. Left **PARTIAL, not DONE**: 13 of 21 awards (all with zero live placements) still have no adapter. | L |
| M-5 | The award engine is not wired to the calculator | **OPEN** | Measured, not read: **610 public engine functions, 80 reached, 388 unreached**, of which 362 are per-award constructors. The main rate constructor has zero non-test importers. The calculator says so itself in a source comment. | L |
| M-6 | Sector-alias bug in the allowance catalogue | **OPEN** | Defect real at the cited line, but **the register names the wrong award**. The resolver exists and is applied on one quote path but not at the two UI call sites. Larger effect is cross-award: the sector defaults to a value belonging to a *different* award for **every** award, silently dropping all 23 sector-tagged rows of MA000017. | S |
| M-7 | `award_rates` empty while `awards` has 156 | **OPEN** | Confirmed live: **`award_rates` = 0, `awards` = 156**. Sharper than the register: `award_classifications` is **also 0**, and it is the parent key — so rates *cannot* be seeded until classifications are. | M |
| M-8 | Penalty calculator has zero consumers | **OPEN** | All five exported symbols return zero hits outside the module, its barrel and its own test. Positive control: the same grep did find the barrel and test lines. | M |
| M-9 | Quote transport from the calculator to the CRM is still a paste box | **PARTIAL** | **Receiving half live** — both mint/redeem functions exist and the receiving page calls redeem; the paste-box page is documented as demoted to fallback. **Sending half absent** — zero references to the mint function in the calculator repo; it still copies to the clipboard. Both tables 0 rows, consistent with nothing minting. | S |
| M-10 | Traineeships, casual, contractor and part-time cannot be priced | **PARTIAL** | Three of four now price: engagement selector, full/part-time, casual, and trainee wages all ship and their tests pass 10/10. **Contractor/ABN genuinely absent** (zero hits estate-wide) — and it is already deprioritised in its own tracking issue. The two issues cited should be closed against shipped work. | S |

### T — transaction integrity · 5 DONE, 1 OPEN

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| T-1 | Timesheet transition has no state guard; concurrent approve/reject is last-write-wins | **DONE** | Update now carries an expected-state predicate; zero rows re-reads the winner and throws **before** the audit event is written, so no audit record can disagree with the final state. 61/61 tests pass. | — |
| T-2 | Leave approval can double-approve, double-counting leave taken | **DONE** | Both halves fixed: status predicate on the update, and the read-modify-write is now a bounded compare-and-set retry loop. Confirmed the balance column is `NOT NULL DEFAULT 0`, so the predicate has no null-never-matches trap. | — |
| T-3 | Recipient-created tax invoice number uses `Math.random()` against a unique index, no retry | **DONE** | Retry loop on duplicate-key; `Math.random()` replaced with a cryptographic generator using rejection sampling; the retry is narrowed to the invoice-number index so the *other* unique index surfaces immediately instead of burning attempts. | — |
| T-4 | Employee-number minting has no duplicate-key retry | **DONE** | Retry loop present; on collision it advances to the **next** sequence value rather than redrawing the same one. Exhaustion returns a structured error instead of leaking the raw database message to payroll. | — |
| T-5 | Calculator failure swallowed — UI cannot tell "no rate" from "bad config" | **DONE** | Bare catch gone; a typed failure reason is returned alongside the error and the UI renders a distinct branch for it. Hook and component tests added and passing. | — |
| T-6 | Funding-offset delete/insert role parity | **OPEN** | **Live policies unchanged**: delete grants `{owner,admin}`, insert/update grant `{owner,admin,manager}` — I re-queried this myself. The fix migration exists but is **absent from the applied ledger** and lives only on `development`. *Zero percent of this defect is remediated in the running system.* Two cautions: its version sorts *below* an already-applied one, and 28 other tables share the same asymmetry. | S |

### K — invented data reaching the user · 0 DONE, 5 OPEN (+1 class-level finding)

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| K-0 | *(class-level, not one of the 87)* The shared "data unavailable" component shipped and nobody can use it | **PARTIAL** | Component exists and is exported, but the package version carrying it is **unpublished** — both apps still resolve the older version. Zero adoption in either app (positive control confirms the grep reaches both trees). **Until it is published the fix is unreachable from the product.** | S+M |
| K-1 | Budget page renders invented figures behind a fake delay, with a working Export | **OPEN** | Confirmed at the cited lines including the artificial 1-second delay and the export writing fabricated dollar totals to file. **Worse than filed:** zero tables matching `budget` exist in production (positive control found one for a different pattern) — there is no backing store at all, so this is pure fabrication. | L or S |
| K-2 | Compliance page returns a fabricated 95% score on any query failure | **OPEN** | Confirmed live at lines 142/144/305/309/363: the failure path returns demo stats and the score ring renders `overallScore: 95`. The success path still computes a real score, so the contradiction is intact. **A permission denial renders a green compliance assurance.** | S |
| K-3 | Health surfaces fall back to invented state | **OPEN** | Confirmed — and the register **mislocated one site**. There are **three** fallbacks across **two** files, not two: two in the platform page, plus an unregistered third asserting "Checking…"/"Not monitored" for database, auth, storage and API. On error these render "checking…" forever. | S |
| K-4 | Invented milestones in the field-officer visit schedule | **OPEN** | Four hardcoded dates passed into the same component that receives **live** events from the real store. The two halves render together, so the invented half inherits the live half's credibility. | S |
| K-5 | Login-client registry hardcoded twice in the admin UI, status asserted not read | **OPEN** | Two copies, every entry with a literal `active` status. **New measurement: three of five domains have drifted** from the live records — the admin screen of the login server currently displays three wrong domains. The live table is not directly readable, so a database function is needed before either copy can read truth. | M |

### A — ratified decisions never implemented · ~~0 DONE, 4 OPEN~~ **3 DONE, 1 PARTIAL — corrected 2026-08-17, same day, hours later**

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| A-1 | ADR-0005 (funding authoring) never built | ~~**OPEN**~~ **DONE** | All three named objects resolve to null; positive control on the same queries returns a real table and 5 real functions, so the instrument finds what exists. The ADR's chosen home — a Developer Portal in the CRM — **does not exist in that app at all**. Adjacent progress landed today (program *identity* now reads from a table) but **not amounts**: the amounts field is empty on all 4 rows. Two of the ADR's premises are now stale. **CORRECTION, same day:** the premises are still stale, and by design — an operator ruling (2026-08-06) already forbade building this, so the fix is not code, it is the record. `docs/adr/ADR-0005-rams-funding-authoring.md` now carries a superseded banner above the unaltered original text, citing the ruling, the 4 removed modules (~2,056 lines), and the live-catalog re-measurement. Merged: [bsuite#2053](https://github.com/GaryOcean428/bsuite/pull/2053). The feature correctly remains unbuilt; what was open was the document's silence, not the missing table. | L |
| A-2 | ADR-0007 (payments foreign-data-wrapper) dead — and unbuildable as filed | ~~**OPEN**~~ **PARTIAL** | Extension absent, schema null, zero foreign servers. The migration **can never apply from disk** for two independent reasons: it is stamped below the migration floor, *and* its version collides exactly with another file. Its tracking issue was closed "completed" with **zero objects installed**. An operator ruling narrows the blast radius to one surface that does not yet exist. Applied ledger is now **699 entries, not 594**. **CORRECTION, same day:** the document defect is recorded — `docs/adr/ADR-0007-stripe-fdw-read-doctrine.md` carries a banner with the same table above, a retirement recommendation, and explicit acknowledgment that only the operator can change `Status:` from Accepted. Re-verified independently, not just trusted from the banner: `20260512161000` is **below the 20260611000000 floor** *and* collides byte-for-byte with `20260512161000_developer_portal_branding_scope_rls.sql` — confirmed by listing `supabase/migrations/` directly. A full-tree grep (parent repo; submodules not checked out from this worktree) finds `stripe_wrapper`/`stripe_server`/`stripe.*` referenced **only** inside the unapplied migration file itself — nothing reads it because the schema was never created for anything to read. **Retire-or-keep is still an operator call** — see §6 "Needs an operator ruling", item 2, below. Left **PARTIAL**, not DONE, because that call is outstanding. | M |
| A-3 | ADR-0006's organisation half is superseded and unrecorded | ~~**OPEN**~~ **DONE** | The ADR still reads "Accepted" and forbids the model production actually adopted: the discriminator column it mandates **does not exist**, and the table it forbids **exists with 17 rows** and four role flags. Code favours the newer model 30 references to 4. **The code needs no change — the document does.** **CORRECTION, same day:** it is now recorded. `docs/adr/ADR-0006-contact-propagation-doctrine.md` carries a "PARTIALLY SUPERSEDED" banner naming the live `employers` table and its 4 role-flag columns, citing the superseding decision (`crm7/docs/adr/20260525-host-employer-table-canonicalization.md`, crm7#866) and explaining why 4 orthogonal booleans model the domain better than the one-column enum. Merged: bsuite#2053. **New finding surfaced while re-verifying this item, not yet fixed:** the crm7 file the banner cites is itself unreachable from crm7's own ADR index, and its self-declared title collides on the number "ADR-002" with a second, different crm7 ADR (`20260525-contacts-clients-leads-canonical-source.md`) dated the same day — confirmed live via `gh api repos/GaryOcean428/crm7/contents/docs/adr` and reading both files' headers. Same defect class as A-4, one repo over. Needs its own crm7 PR — out of scope for this (bsuite) lane; flagged here as a follow-up, not tracked under any existing item ID. | S |
| A-4 | ADR-0004 number collision | ~~**OPEN**~~ **DONE** | Two different ADRs share number 0004; the index lists only one. Unchanged since at least the 2026-07-25 audit. **One correction:** the register calls the orphan "unreachable" — it is not, a package README links it by path. The defect is the duplicate number plus the index omission. **CORRECTION, same day:** fixed. The orphan is renumbered `docs/adr/ADR-0008-schema-builder-consolidation.md` (was the second 0004), the surviving `ADR-0004-oauth-allowlist-doctrine.md` keeps its number unchanged, and `docs/adr/README.md` now lists all eight ADRs with a mandatory `Built?` column plus the renumbering note ("renumbered from ADR-0004 on 2026-08-17; duplicate-number collision"). Verified live: `git ls-tree origin/development -- docs/adr/` shows both files with distinct numbers, no `0004` duplicate remains. Merged: bsuite#2053. | S |

**A-series correction summary.** All four items were re-verified 2026-08-17, hours after this ledger
was written, against `origin/development` HEAD (`d1d49592`), confirming [bsuite#2053](https://github.com/GaryOcean428/bsuite/pull/2053)
("docs(adr): record measured build state for five ratified-but-unimplemented decisions (A-1…A-4 + G2)")
is merged and its content live. Left visible rather than rewritten, per estate convention: the
original framing was correct when this ledger was written that morning — these ADRs genuinely were
unbuilt-and-unmarked at the time. A-2 is deliberately left **PARTIAL**: gathering the evidence and
recommending retirement is a lane's job; retiring a ratified ADR is the operator's. See §6 "What no
static pass can settle" → "Needs an operator ruling", item 2.

### AD — shipped but not reaching the product · 0 DONE, 6 PARTIAL, 3 OPEN, 2 NOT-A-DEFECT

*Count corrected 2026-08-17 alongside the AD-3/AD-5/AD-9 updates below — the original header
already undercounted NOT-A-DEFECT by one (AD-10 and AD-11 are both non-defect verdicts).*

*Count corrected again 2026-08-18: AD-4, AD-6 and AD-7 move OPEN → PARTIAL (3 PARTIAL → 6,
6 OPEN → 3). **They share one cause, and it is worth stating on its own because it is not the
cause this ledger looked for.** All three were closed in code by crm7#1801 on 2026-08-17 — the
same day this ledger was written — and none of it had reached the parent, because the parent's
crm7 gitlink still pointed at `272e926e`. That is not merely a bookkeeping lag: **this ledger's
own method reads submodules at the pinned commit**, so a stale pointer makes finished work
indistinguishable from work that was never done, and it leaves the migration applier
(`supabase-migrate.yml` checks out `submodules: recursive`) unable to see a merged migration at
all. The same staleness hid conduit's and throughput's AD-5 work. The fix in this lane is three
pointer advances, not three builds — see each row for the before/after grep at the recorded
gitlink.*

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| AD-1 | Page-builder package reaches 1 of 5 apps | **PARTIAL** | **Version half done** — all five lockfiles resolve 0.9.0 with identical integrity hashes. **Adoption half not** — local copies still exist and are the ones consumed: 294 local imports in the CRM against 9 files touching the package; one app has zero card usage. | M |
| AD-2 | Shared card scanner adopted by nobody | **OPEN** | The package exports it as a subpath; **zero** apps import it. All five hand-roll the test; the CRM declares its own copy of the function. Positive control confirms the scanner exists in the package. | M |
| AD-3 | Four-axis identity model — schema shipped, data empty | **OPEN — population plan below, re-verified 2026-08-17** | Five registers at 0 rows (`skill_sets`, `non_accredited_training`, `worker_licence_classes`, `training_packages`, `qualification_occupation_links`); no global qualification rows; `award_trades` 27 rows all `MA000020`. **Register wrong twice:** two person-level links are 16/50 populated, not 0; and the join column DOES exist — `placements.trade_id`, 0/34 populated, no FK. **The FK is IMPOSSIBLE, not missing, and that distinction is the point:** the column is `text` and correctly so (it targets `award_trades.trade_id text`, not `award_trades.id uuid` — `entities.ts:494` and `r80DeepLink.ts:24` both say so). But the only unique index on that pair is `award_trades_global_unique … WHERE tenant_id IS NULL` — a **partial** index, which Postgres will not accept as a foreign-key target. Adding a non-partial unique constraint would work and would also **forbid tenant-scoped trades**, which the partial predicate exists to permit. So this is a design fork, not a missing line of DDL. The real gap remains data population, which no agent can fabricate — **see "AD-3 — the data-population report" below** for what would populate each register, in what order, and what is blocking the one link that was called "free." | L |
| AD-4 | Self-service onboarding built and never opened | ~~**OPEN**~~ **PARTIAL** | **0 of 50** people rows carry a login link; 0 portal invites. The surface has never been exercised once. **CORRECTION, 2026-08-18 — the reason it was never exercised was a build defect, that defect is fixed, and the fix had never reached the parent.** Re-measured live: `people` still 50 rows with `count(user_id)=0`, `people_portal_invites` still 0 — the row counts are unchanged and this row is NOT being closed on them. What changed is the diagnosis. `InvitePortalAction` was wired ONLY into the transient step 3 of `/people/onboard` (it unmounts the moment `createdPerson` leaves state) and the equivalent step of `/apprentices/from-candidate` — flows the People list's own "Add Person" button does not even link to; it links to `/people/new`. **None of the 50 existing rows could ever reach the invite surface at all**, so "never exercised" was never an adoption gap. crm7#1801 (`290e5638`) put the action in the person DETAIL page header, gated on `person.user_id`, and `/people/:id` is registered at `App.tsx:1528` — the one page every person has regardless of how they were created. **It had not reached the parent:** the gitlink recorded `272e926e`, where a grep for `AddCustomEntityRecordDialog` and for the `[id].tsx` import are both empty. This PR advances crm7 `272e926e -> f6a78d2a`, where the action renders at `src/pages/people/[id].tsx:2034`. Mutation-tested at the new pointer: replacing `<InvitePortalAction` with an inert element turns `id-portal-invite.test.tsx` "offers 'Invite to portal' for a person with no login yet — the 50-row case" **RED**; restoring the file byte-identically (`git` checkout of the path) returns sha256 `a17566df…59b4` and it is **GREEN** (20/20 across the two closure files). Live RPC reachability confirmed too: `portal_invite_mint` EXECUTE to `authenticated`, `portal_invite_accept` EXECUTE to `anon` **and** `authenticated` — anon is required, since an invited worker accepts before they have a session. **What is still open, and it is one thing:** the 0→1 round trip. It needs a signed-in owner/admin on a real tenant, and this lane declined to mint a live invite against production `people` rows — that mutates real records and can send a real person an email. Operator or a seeded local stack, not an agent. | S |
| AD-5 | Entity selector never adopted in two apps | ~~**OPEN**~~ **PARTIAL** | 65 files in the CRM, **0 and 0** in the two named apps. New: a third app now has 6 — the pattern is spreading, just not where it was asked for. **CORRECTION, 2026-08-17 — conduit closed, BSU still open, and the two are not symmetric.** This item is 713 lines with real production history (crm7#1284 async-select, one-shot suggestions, cross-schema reads, an error-vs-empty-state fix) — a rushed port would have created the "6th divergent copy" this item exists to prevent, so both apps were investigated for a genuine target before writing anything. **conduit: done.** Ported `EntitySelector.tsx` against conduit's own primitives — `command.tsx`/`popover.tsx` added (conduit already had `cmdk`, `@radix-ui/react-popover`, `dialog.tsx` as dependencies; only the two shadcn wrapper files were missing), `@/lib/supabase/client`'s `createClient()` factory used per-instance via `useMemo` (conduit is Next.js App Router, not crm7's Vite-SPA singleton — matches every other client component in the app), `@/lib/logger`/`@/lib/utils`. Full feature parity, not a trimmed subset. Converted a **genuine** free-text field: job postings' "Award Code" was a bare `<input placeholder="e.g. MA000027">` with zero validation against `awards` (156 rows, globally readable — confirmed live, not from the creation migration) — a typo silently saved a job referencing a non-existent award. Built `AwardSelector.tsx` bridging the id-keyed component against the `code`-keyed `jobs.award_code` column, and — this is the part a rushed conversion would have gotten wrong — a stored code that no longer resolves (pre-existing typo, retired award) is surfaced as an explicit warning, not silently hidden behind the empty-state placeholder. Wired into both `jobs/new` and `jobs/[id]/edit`. `@supabase/postgrest-js` added as a direct dependency (was only transitive) — lockfile diff is 3 lines. 14 new tests (9 component + mutation-tested: proved the code-vs-id bridging red before fixing it), full suite **1231 passed, 0 failed**; `tsc --noEmit` and `eslint` both clean. **BSU: still open, and honestly so.** BSU already has all four required primitives (`badge`/`button`/`command`/`popover` all present, unlike conduit) — the blocker is not technical. Searched BSU's tenant/org creation, user management, and branding surfaces for a free-text field that should reference an existing entity table; found none clean enough to convert without guessing at intent (`Tenants.tsx`'s "Owner email" looks similar but is deliberately free text — it invites a customer who may not exist as a user yet, so an entity picker would be the wrong fix, not the right one, misapplying this item's own pattern). BSU's domain is platform/tenant administration, not the GTO operational entities (people, employers, awards) crm7 and conduit manage — it may genuinely have fewer fields of this shape today. **The one blocker: a confirmed target field in BSU**, not a missing primitive or a technical obstacle. **CORRECTION, 2026-08-18 — conduit's work was real but INVISIBLE to this ledger's own method, and throughput's divergent copy is already gone.** The method note greps at the **pinned submodule commit**, and the parent's gitlink was two apps behind. conduit at the pinned `55b89c79`: a grep for `EntitySelector` returns four DOC files and **zero source** — which is exactly the "0 and 0" this row reported. At conduit `origin/development 7c6c60e4` the same grep returns `src/components/entity/{EntitySelector,AwardSelector}.tsx`, both test files, and the two call sites (`jobs/new/_view.tsx`, `jobs/[id]/edit/_view.tsx`). This PR advances the parent gitlink `55b89c79 -> 7c6c60e4`; conduit's own suite at that commit passes (`vitest run src/components/entity` → 2 files, 7 tests). Migration blast radius is nil — the migrations diff between the two commits is EMPTY, this is app code only. **The "third app now has 6" limb is also stale**: throughput#310 ("delete dead EntitySelector/ProfileSelector copy (AD-5)") removed it. At pinned `259b77c1` throughput still carried `src/components/entity/{EntitySelector,ProfileSelector,index}.tsx`, two tests and `src/lib/queries/profiles.ts`; at `origin/development 1330a285` an `ls-tree` for `components/entity` is empty and the only hits left are docs and `eslint.config.js`. Pointer advanced `259b77c1 -> 1330a285` here too (zero migration delta). **BSU is unchanged and still genuinely open** — re-grepped at BSU's own `origin/development` tip `5675ac64`, not the pinned commit: still zero EntitySelector/AwardSelector files, with `components/ui/button` matching as the positive control, so the search works. It remains blocked on an operator-confirmed target field. The BSU gitlink is advanced to that same tip (`39b94356 -> 5675ac64`, zero migration delta) so the next pass measures BSU at its current tree rather than at a commit four days stale — which is the whole failure mode this row's correction is about. **crm7#1812** (repoint crm7's copy at `@bsuite/ui`) is still OPEN and now `mergeStateStatus: DIRTY` — it is a de-duplication refactor, not a functional gap (crm7 has 75 adopting files today), and landing it needs a conflict resolution and its own crm7 PR, which is outside this parent lane. | M→S(conduit+throughput delivered)+?(BSU) |
| AD-6 | Report catalogue covers 89 of 403 tables | ~~**OPEN**~~ **PARTIAL** | Confirmed live: **89 entries over 88 distinct tables against 402 base tables (21.9%)**. Only drift is 403→402. **CORRECTION, 2026-08-18 — re-measured 89 / 88 / 403 (21.8%), and the content that closes most of the gap has existed since 2026-08-17 without ever being shown to the applier.** `crm7/supabase/migrations/20260821060000_report_catalog_gto_lifecycle_batch.sql` and `20260821070000_report_catalog_gto_lifecycle_seed.sql` are on crm7 `origin/main` and are **not** in `supabase_migrations.schema_migrations` (live: `20260821010000/020000/030000/040000/050000` present, `060000` and `070000` absent; positive control in the same query — `20260821050000` and `20260824010000` both return `true`, so the `false`s are genuine absences and not a broken predicate). **An earlier reading of this — "the applier ran PAST them and skipped them", i.e. the shared-ledger duplicate-stamp hazard — is WRONG, and the correction changes the fix.** `supabase-migrate.yml` checks out `submodules: recursive`, so it reads every submodule **at the parent gitlink**. An `ls-tree` of `supabase/migrations/` at `272e926e` stops at `20260821040000`: neither file exists at the pinned commit. Nothing was skipped, no stamp collided, and re-stamping them would have been the wrong repair. The pointer was the defect. This PR advances crm7 `272e926e -> f6a78d2a`, which carries both files. **Live pre-flight, so the apply is predicted rather than hoped:** the two files propose **23 distinct entity keys**; all 23 exist as `public` BASE TABLEs, all 23 have `relrowsecurity`, all 23 have a `SELECT`- or `ALL`-covering policy, all 23 carry a `tenant_id` column matching the declared `tenant_column` scope, and **0 of 23 are already catalogued** — with a positive control proving the already-catalogued join matches when it should (5 known keys → 5 matches). `report_catalog_seed_entity()` exists live. So the apply satisfies the `20260807074000` precondition trigger and lifts the catalogue **89 → 112 entries over 88 → 111 distinct tables (21.8% → 27.5%)**. **The parent must point at crm7 `development`, not crm7 `main`, and the parent's own rehearsal gate is what proves it.** This lane first advanced the pointer onto the promoted main `8f69340b`, and `supabase-migration-rehearsal` failed: both catalogue migrations came back `noop` — they apply cleanly on a disposable database and move no catalog, which is the correct default verdict for a file that has not declared itself data-only. The `-- rehearsal: data-only` declaration that answers it exists on crm7 `development` and **not** on crm7 `main`. So the promoted main is unshippable through the parent's own gate while still carrying migrations the applier would happily run — a combination worth naming, because it means "advance onto the promoted main" is not always the safe default this estate treats it as. Retargeted to crm7 `development`. One sibling blocker on that head — `20260826050000_backfill_platform_group_links.sql`, the single `noop` failing bsuite#2103 and nothing else — was fixed in crm7#1833 (comment-only; the file carries zero `CREATE`/`ALTER`/`DROP`/`GRANT`/`REVOKE` statements, so the declaration is true). **The retarget is proved, not argued:** the rehearsal went from **fail** at the promoted mains to **pass** at the development heads, and it replayed the whole 16-migration crm7 delta on a disposable database — 14 `APPLIED`, 2 `APPLIED-DATA-ONLY` (`20260821060000`, `20260821070000`) plus `20260826050000`, and **zero** `noop` or `failed`. **Still PARTIAL, not DONE, and deliberately:** `supabase-migrate.yml` triggers on push to parent `main`. A PR to `development` **queues** these; the operator promotion applies them. Re-run the coverage query after that promotion before marking this DONE — a merged migration is not an applied one. | L |
| AD-7 | Four persistence surfaces at 0 rows | ~~**OPEN**~~ **PARTIAL** | All four still 0. Only one has code reach (6 call sites) and it has still never been written to. **CORRECTION, 2026-08-18 — the row counts hold, the diagnosis does not, and the one real defect is fixed and was sitting behind the stale gitlink.** Live: `data_import_jobs` 0, `custom_pages` 0, `form_layouts` 0, `tenant_entity_records` 0 — unchanged. **"Only one has code reach" is stale.** All four have readers, and three have real writers: `dataImportJobService.ts:92 .insert` / `:106 .update`, `customPageService.ts:76 .insert` / `:94,:145 .update`, `formLayoutService.ts:102 .insert` / `:115 .update`, each reached from routed Settings pages. Those three are **adoption gaps, not defects** — nobody has driven the wizard, saved a page, or saved a layout yet. **`tenant_entity_records` was the genuine defect and it is now closed.** The read half (`EntityTableWidget`) was fully wired for custom entities while no insert/upsert existed anywhere — a chicken-and-egg gap, since the widget discovers its columns from existing rows. Confirmed on both sides: no client writer, and live the ONLY database function whose body mentions the table is the `tenant_entity_records_tenant_guard` trigger, so there was no server-side writer either. crm7#1801 (`290e5638`) added `AddCustomEntityRecordDialog`, a free-form key/value create dialog (a custom entity has no field-definition table to generate a typed form from), inserting at `EntityTableWidget.tsx:202-203` with RLS `tenant_entity_records_insert` as the real boundary and the error surfaced verbatim rather than swallowed. Absent at the pinned `272e926e`, present at `f6a78d2a`; this PR advances the gitlink. Mutation-tested at the new pointer: dropping `data` from the insert payload turns "inserts a scoped row from the free-form key/value fields and refetches" **RED**; restoring the file byte-identically (`git` checkout of the path) returns sha256 `35d75df8…ad73` and it is **GREEN** (20/20). **PARTIAL, not DONE:** every surface now has a writer that is reachable from a routed page, but all four are still at 0 rows. Closing this needs one exercise of each on a real tenant — the same operator step AD-4 needs, not another build. | M |
| AD-8 | Connection-health view has no reader | **OPEN** | The view returns **2 rows, both `never_synced`**, and zero app source references it (positive control: the sibling table matches 51 files). "Connected but never synced" currently presents as healthy. | S |
| AD-9 | 14 assistant actions the role manuals promise and no tool implements | ~~**OPEN**~~ **PARTIAL** | 71 tools across 14 factories; **none** of the seven named categories existed — no submit tool, and zero files for payslip, pay-run, nav-config, branding or the compliance test. **CORRECTION, 2026-08-17:** the five categories this pass was scoped to (payslip, pay-run, nav-config, branding, compliance test) are now built — `payroll-tools.ts`, `nav-config-tools.ts`, `branding-tools.ts`, `compliance-test-tools.ts`, 5 new tools (`get_payslip`, `get_pay_run_status`, `get_nav_config`, `get_tenant_branding`, `get_boot_assessment`, `list_pending_boot_reviews` — 6, one category yielded two tools), wired into `createToolRegistry`/`getAllToolNames`, and read against the **live** table shapes (`payroll_records`, `pay_runs`, `tenant_navigation`, `tenant_branding`, `platform_branding_public`, `boot_assessments` — confirmed by `\d` against project `tuybltdrdefjblnplpqo`, not the creation migrations). All six are **read-only**: `payroll_records`/`pay_runs` because R80.4 owns rate calculation; `tenant_navigation`/`tenant_branding` because BSU is DRY's sole authoring surface for both (crm7's own `settings/branding.tsx` says so in its header, and a source grep found zero writers of `tenant_navigation` in crm7); `boot_assessments` because the rate engine, not Jodie, produces a BOOT verdict. Each refuses cleanly (`found:false`, no invented figure) when the row does not exist yet. Db-proxy allowlist updated (`api/db/[...path].ts`) and the existing allowlist contract test extended and **mutation-tested live** (removed one entry → red; restored → green). 20 new unit tests + 1 extended contract test, all green; full suite 6980 passed / 63 pre-existing skips / 0 failed; `tsc --noEmit` clean; `eslint` clean. **Left PARTIAL, not DONE — verified, not assumed:** the original v2 register named seven categories (`timesheet submit, payslip, pay-run, nav-config, branding, permission-grant, BOOT test`); this pass's scope was the five the operator named. Re-checked the other two directly rather than assuming: **`timesheet submit` is still genuinely absent** — grepped every tool factory, zero matches for `submit_timesheet`. **`permission-grant` exists only as a stub** — `set_tenant_feature_flag` is registered but its own test asserts it returns `NOT_IMPLEMENTED` (`enterprise-admin-tools.test.ts:130`). Both remain open; a future pass closes them, not this one. | L→M |
| AD-10 | Dashboard drag/drop persistence never adopted | **NOT A DEFECT** | **Measured live, and the ledger was wrong.** Persistence works and survives a browser-profile change. `user_preferences` holds 9 rows under `page:bsu-dashboard_grid_layouts`, with `_grid_cols` / `_grid_version` / `_grid_base_cols` each also at 9 — a full round-trip, not a partial write. crm7's own dashboard shows the identical 9-row pattern, so this is the estate's normal architecture. Both registers inferred "no persistence" from the absence of a table literally named `dashboard_layouts`; that table genuinely does not exist, but it was never the mechanism. `UnifiedDashboard.tsx:3,57` renders `DraggableCardPage` whose adapter defaults to `useScopedPreference`, which upserts to `user_preferences` — `localStorage` is only the pre-hydration seed, not the store. | — |
| AD-11 | Schema-builder Tidy and Fit do nothing | **NOT-A-DEFECT** | See §4. The register grepped a 61-line wrapper; the **installed package** ships the layout engine and wires both buttons with position persistence. | — |

#### AD-3 — the data-population report

This is what the brief asked for in place of code: no agent can fabricate the rows below, so this
is the population *path*, re-verified live against `tuybltdrdefjblnplpqo` on 2026-08-17, not
re-derived from the 2026-08-10 ruling doc's prose. That doc —
[`20260810-four-axis-identity-model-and-backlog-sequence-1.00W.md`](./00-roadmap/20260810-four-axis-identity-model-and-backlog-sequence-1.00W.md)
§3 and §4 (Wave 2) — already contains the full design and sequencing; what follows is today's
measurement against it, including what has moved since it was written and one blocker it did not
know about yet.

**What has actually shipped since the 8/10 ruling, that the ledger table above does not show.**
Re-measuring rather than trusting the doc's own age paid off: two of the doc's "wrong by
construction" tables (`competencies`, `vet_training_packages`) no longer exist — collapsed into
`units_of_competency` (160 rows) and `training_packages` per §4 item 2.1, exactly as specified.
Four new registers now exist on the correct pattern (nullable `tenant_id` + `origin` +
`reference_row_origin` CHECK, confirmed by reading `pg_constraint` directly): `skill_sets`,
`non_accredited_training`, `worker_licence_classes`, `training_packages`. All four are the §4 item
2.2 registers (skill sets, non-accredited training, licences) plus the qualification/training-package
split. **The schema half of Wave 2.1–2.2 is done. The data half — every one of the four — is 0
rows.** `qualifications.tenant_id` is likewise now nullable with the CHECK constraint live
(`qualifications_origin_tenant_check`), so the 8/10 finding that the column was "wrong by
construction" is itself now stale — the column is right; nothing has used the global path yet.

**What would populate each register, in order, with the blocker named where one exists:**

| Register | Rows now | What populates it | Blocker |
|---|---:|---|---|
| `skill_sets`, `non_accredited_training`, `worker_licence_classes` | 0 each | Operator/GTO-staff curation, or ingest from a named regulator source per class (WorkSafe HRW licences, WHS modules, etc.) — §2A's generalised test already rules these global once sourced | **No agent can source these; needs either an external register to ingest or a curation screen to enter them by hand.** Neither exists yet. |
| `training_packages` | 0 | Same TGA ingestion pipeline that would populate `qualifications` (below) — training packages are the parent of qualifications in the TGA data model | Blocked on the same TGA ingestion gap as `qualifications` |
| `qualification_occupation_links` | 0 | §3's "free, no guessing" link: `apprenticeship_titles.qualification_code` → `qualifications.code`. All 369 title rows already carry a code (295 distinct) | **Re-verified live and this is the one new finding: it is not actually free right now.** `qualifications` holds only 6 rows, and a live join (`apprenticeship_titles.qualification_code = qualifications.code`) resolves only **2 of 369** title rows. The "free" population is real but nearly empty until `qualifications` itself is ingested from TGA at scale — the 8/10 doc named this dependency in principle (item 2.1 before 2.4) but did not show how few rows currently satisfy it. |
| `qualifications` (global rows) | 0 of 6 (all 6 remain tenant-scoped) | Bulk ingestion from the TGA register (training.gov.au), written with `origin='official_register'`, `tenant_id=NULL` | **No TGA qualifications ingestion pipeline exists yet.** This is the root blocker for three of the five empty registers above, not just `qualifications` itself. |
| `qualifications` (existing 6 rows, deduplication) | 6 tenant-scoped rows across 3 codes | Once global rows exist, migrate the 3 duplicate-content rows onto them and retire the tenant-scoped copies | **Live proof the 8/10 ruling's concern was not theoretical:** `CPC30220` exists **three times**, once per tenant, with independently-typed content. This is the exact "every client re-types it, every client can spell it differently" failure the ruling was written to prevent, caught live in the data, not hypothesised. |
| `award_trades` (other 20 awards) | 27 (all `MA000020`) | R80.4 publishes the trade catalogue as a generated artefact (§4 "Where axis 4 lives"), the same pattern already proven for `allowance-catalogue.generated.ts` (`R80.4/scripts/build-allowance-catalogue.mjs` — confirmed to exist, so the pattern is not hypothetical) | **Out of this lane's scope by standing ruling** — R80.4 owns ALL rate calculation, so this is R80.4 lane work, sequenced after Wave 2 per the 8/10 doc's own execution plan (§4 "Serialised"). Not attempted here. |
| `placements.trade_id`, `people.anzsco_occupation_id`, `people.apprenticeship_title_id` | 0/34, 0/50, 0/50 | Forms move from the free-text `people.trade` (16/50 populated — the only thing anyone fills in today) onto the foreign keys, per §4 items 2.6–2.7 | Waits on `award_trades` (above) and the curation screen for qualification→award-trade correspondences — both upstream |

**Net: the population plan was already fully specified in the 8/10 document; what this pass adds
is live re-verification (the schema for 4 of 5 empty registers has since been built correctly,
none populated) plus one blocker the original plan didn't surface — that the "free" title→
qualification link is currently 2-of-369 free, not 369-of-369, because `qualifications` itself
is 6 rows deep against a TGA register that should hold thousands. Ingesting `qualifications` at
scale is the single highest-leverage next step: it unblocks `qualification_occupation_links`,
`training_packages`, and the deduplication of the 3 duplicate-content rows in one move.**

### V — verification integrity · 2 DONE, 3 PARTIAL, 6 OPEN

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| V-1 | 18 of 20 end-to-end tests self-skip in continuous integration | **OPEN** | Worse than filed: the credential is not merely unwired, it is **invalid** — the last run failed with `invalid_credentials`. 19 of 19 spec files carry a skip site; both cited unit suites still skipped. A companion fix delivered only the loud-failure harness, which is *why* the breakage is now visible. | M |
| V-2 | Rate-review authorization gate has zero executing coverage | **DONE** | `vitest run` → **18 passed, 0 skipped**. The gate now has 5 executing tests covering missing, empty, non-bearer, throwing and valid tokens. Zero skips remain in the file. | — |
| V-3 | Production migration-history audit is dead in both repos | **DONE** | Green on **three consecutive runs**; the log proves it is not a silent pass — it self-tests 10 cases, connects live, and scans all 8 scope directories. The second repo's copy was **deliberately removed** because the underlying table is shared; a per-repo audit could only ever see one slice. | — |
| V-4 | No scheduled-job failure alerting exists | **OPEN** | 14 active jobs, **0** referencing the run-history table, and 0 functions reading it. Positive control returned 1 and 3 on the same instrument, so the zero is real. 21,136 runs in 7 days, 0 failed — the first failure will be silent. | S |
| V-5 | Three cleanup functions exist and none is scheduled | **OPEN** | All three resolve; **0 of 14** scheduled jobs reference any of them. Nothing moved. | S |
| V-6 | Calculator tolerates 131 baselined lint violations | **PARTIAL** | **95 of 131 cleared** — all 88 hardcoded-colour and 7 undefined-name violations, the two classes the item was actually about. **35 remain**, all low-severity authoring classes with no runtime-error candidate. Ratchet holds live. | S |
| V-7 | 90 lint suppressions for two React hook rules | **OPEN** | Re-measured across all six apps: **97, not 90 — the debt grew by 7.** Tracked nowhere: neither rule appears in any baseline or workflow, and one baseline is structurally incapable of seeing suppressed rules. **The class can keep growing invisibly, and it already has.** | M |
| V-8 | Per-page theme validation was never built | **OPEN** | The named script does not exist in the root or any of six submodules; positive control found 43 other scripts, so the zero is real. The theme workflow invokes none of the three audit scripts. | L |
| V-9 | Theme gates read logged-out pages only | **OPEN** | Route list unchanged and the file header still states authenticated routes are deliberately absent. Three scripts accept a session flag and **zero** workflows pass one. **One register clause is now false** — session producers *do* exist — but they are wired to nothing in this lane, so every authenticated surface remains unmeasured. | M |
| V-10 | "Closes #N" on a development merge closes nothing — 14 issues fixed-and-open | **PARTIAL** | **Backlog cleared by hand**: 15 issues closed estate-wide on 2026-08-17, including both instances cited. **Mechanism untouched**: all five repos still default to `main` and no workflow closes on a development merge. The backlog will rebuild at the same rate. | S |
| V-11 | The unscoped-select sweep query is not in continuous integration | **PARTIAL** | **All four real defects fixed live** — I re-ran the sweep and it now returns only the reference tables the issue itself classified as correct. **But no automation runs it**: the existing drift audit checks a *different* invariant, and the sweep script is referenced by no workflow. A new unscoped table can still join the list undetected. | S |

### TH — theme and visual · 1 DONE, 3 PARTIAL, 6 OPEN, 1 SUPERSEDED

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| TH-1 | Non-standard colour: 235 real matches estate-wide | **OPEN** | Re-run at the pinned commits: **143, not 235.** One app fell 93→1 via a merged cleanup. Instrument positive-controlled: of that app's 25 raw hits, 24 are inside the lint rule that must *name* the literals and 1 is a comment — its true count is **0**. Concentrated in three apps (134 of 143). | M |
| TH-2 | Five app-local near-white tokens still live | **DONE** | All five sites are now historical comments; the pattern grep returns **only comment prose, zero live declarations**. Four pull requests merged 2026-08-17. *Adjacent and outside this item's wording:* one shared-package declaration of the same value survives — and the new scanner catches it, which is the gate working. | — |
| TH-3 | Theme gate cannot see near-white; needs a parsed threshold and a re-bank | **PARTIAL** | **Done half:** the scanner now parses the lightness component numerically and is wired into the workflow across 1,410 literals. **Not-done half:** the baseline reads 25, the scanner reports 16, and the workflow fails on an *under*-count. It has not fired only because recent commits changed submodule pointers alone and the path filter cannot see those. **The next pull request touching any stylesheet or component will fail red.** | S |
| TH-4 | Shell border alpha below the non-text contrast floor | **OPEN** | Unchanged at the exact cited line — and **wider than filed**: three apps carry the 9% alpha, not one. A fourth differs. | S |
| TH-5 | Interactive borders fail non-text contrast at 1.12:1 | **OPEN** | Issue still open, no fix. The proposed role token **does not exist**. Computed from live values: the strongest candidate is 1.95:1 against the panel background — still below the 3:1 floor. | M |
| TH-6 | Gradient underline class is CRM-only | **OPEN** | Exactly **2 files**, both in one app: the definition and one usage. Zero occurrences in the shared theme package or the other five apps. It must move into the package before the request is implementable elsewhere. | S |
| TH-7 | Developer-portal raw buttons — 18 files, no lint rule exists | **PARTIAL** | **Done half:** the rule now exists, is registered at error level, 7 files fixed, issue closed. **Not-done half:** the config **explicitly ignores the 10 files that still contain raw buttons** — the rule exempts precisely the remaining violators. Also re-measures the issue's "37 files" as inflated; the real figure was 18. | M |
| TH-8 | App gradient defined with zero usages | **OPEN** | Defined at two sites (line drift only from the register), **zero call sites** in any component. | S |
| TH-9 | Non-responsive two-column grids: 473 occurrences | **OPEN** | **The register measured the wrong thing.** A plain substring count gives 475 — it counted breakpoint-prefixed variants, which are exactly the *correct* pattern. Measuring the actual defect gives **237 estate-wide, 172 in the CRM**. That 172 is a floor: it reads literal strings and cannot resolve composed class names. | M |
| TH-10 | Card grid absent from two apps | **PARTIAL** | One app is **no longer plumbing-only** — 11 render sites across 9 dashboard views. The other is unchanged at zero and does not even carry the dependency. | L |
| TH-11 | Corporate error hue — operator taste call | **SUPERSEDED** | See §4. The ruling was made 2026-08-10 and is **recorded inline in the stylesheet**; the register carried it as pending seven days later. | — |

### PF — performance · 0 DONE, 1 PARTIAL, 2 OPEN, 1 NOT-A-DEFECT

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| PF-1 | 70 policies re-evaluate the session function per row | **PARTIAL** | **Code done, database untouched.** I re-measured independently: **69 unwrapped against 357 wrapped** (the 357 is the positive control proving the detector sees the fixed form), 67 in the main schema plus 2 in a Supabase-managed one. The migration with 69 matching statements is merged to `development` but **absent from the applied ledger** and not on `main`. Register said 70; live is 69. **Watch the 2 managed-schema statements — they may fail on ownership and abort the whole migration.** | S |
| PF-2 | 983 unused indexes | **NOT-A-DEFECT** | See §4. **690 of 974 sit on tables with zero rows.** | — |
| PF-3 | 68 tables run multiple overlapping permissive policies | **OPEN** | Live advisor: **67**, across 63 tables. Long tail is 61 tables with one finding each. Mechanical, but **unlike PF-1 each merge is an authz change** and needs the red-team checklist — it is not a behaviour-preserving rewrite. | M |
| PF-4 | 9 policy-less tables; 2 duplicate indexes; one legacy table | **OPEN** | Composite. **(a) NOT a defect** — all nine policy-less tables grant to the service role **only**, with zero untrusted grants; that is the intended deny-all posture and adding policies would *loosen* them. **(b) OPEN** — 2 duplicate index pairs confirmed. **(c) OPEN** — the legacy table is live with 4 policies, all 4 among PF-1's 69. **Decide (c) before PF-1 reaches `main`, or 4 of its statements are wasted.** | S |

### PO — portals · 1 DONE, 1 PARTIAL, 3 OPEN

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| PO-1 | Walled field-officer portal not retired | **OPEN** | Both walled pages exist and are routed/linked at HEAD; a rename **re-landed** the duplicate, so the de-duplicate-not-retire outcome the ruling forbids is the *shipped* state in both repos. The mandatory half is untouched: a policy scan for any caseload predicate returns **0 rows**. | L |
| PO-2 | The supervisor concept does not exist in the data | **PARTIAL** | **The register's premise is measurably wrong** — the role exists with real rows, and the supervisor→worker relation exists as two foreign keys, both predating the register. What is genuinely absent is the **scoping** half: a policy scan for the supervisor column returns **0 rows**, so a supervisor is scoped to the whole employer, never to their own workers. Data also sparse (2 of 34 placements). | M |
| PO-3 | Host-role limb on contacts | **DONE** | Live policy carries the full host limb with correct negation on the ordinary-staff limb. Helpers are security-definer with a pinned search path, and execute is granted to the service and logged-in roles only — **anon has none**. A cross-tenant first draft was corrected and the live body reflects the fix. | — |
| PO-4 | Staffing orders, safety questions, payslip viewer, chasing | **OPEN** | **Every one of seven expected tables resolves to null.** Nothing shipped. | L |
| PO-5 | Host money view gated on M-3, M-4 and M-7 | **OPEN** | Both gates confirmed unchanged (rates 0 of 156; catalogue 8 of 21). **Accuracy risk is real but narrower than filed:** 1 of 19 ladders carries a clause-read allowance scale, not 2 of 21 — the other 18 render a shipped "unverified default" warning. The view itself is not started. **UPDATE, same day:** M-3 and M-4 are now closed for MA000020 (see their rows above) — the whole live-placement population, per `award_trades` — but that does not move this row. **M-7 alone still fully blocks PO-5**: `award_classifications` is 0 rows for *every* award including MA000020, and it is the parent key rates are seeded from, so the host money view has nothing to render regardless of clause coverage. | L |

### D — documentation hygiene · 0 DONE, 11 OPEN, 1 NOT-A-DEFECT

Cheap, and the reason agents keep re-deriving the same wrong things.

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| D-1 | Docs index dangling references | **OPEN** | Script over 104 references: **18 genuine dangling** (register said 21), including 9 documents it calls canonical. An entire archive subtree it references **does not exist**. | S |
| D-2 | Standards guide says the destructive colour is purple | **OPEN** | Three lines still wrong against the live token, which is red. The rulebook still routes agents to this document — every agent that reads it burns a CI round. | S |
| D-3 | Shared-package table names a four-minor-stale version | **OPEN** | **Misattributed by the register** — the rulebook carries no package table at all (zero hits). The stale rows are in **three other files**. Lockfile truth is 0.9.0 in all five apps. | S |
| D-4 | AI contributing guide documents two retired models | **OPEN** | Both lines still present, plus the surrounding sample that teaches a retired identifier as the good example. *Identifiers deliberately not reproduced — a drift scanner hard-fails any live document naming them, and this ledger complies.* | S |
| D-5 | Root README calls the old file the single outstanding-work index | **NOT-A-DEFECT** | See §4. The phrase matches **only the register itself**. | — |
| D-6 | 40 docs still scope the archived calculator version | **OPEN** | **42** top-level, 117 across the tree — **marginally worse than filed, not better**. The submodule has moved on and the root README already names the new one. | M |
| D-7 | Two stale security inventories | **OPEN** | Live: **402 tables and 222 security-definer functions**. Documents claim 229 and 59, and one asserts "all 59 are accounted for" — **now false by 163 functions**. | M |
| D-8 | Operator-verification index dangling links; references folder has no index | **OPEN** | **5 of 9** links dangle (positive control: the other 4 resolve). The references folder holds 10 files and no index. Both targets point into the archive subtree that D-1 shows is gone. | S |
| D-9 | Consumed prompts in the plans index; status file stale; false claims | **OPEN** | The status file is **6.5 weeks stale** and still cites a superseded index — and it is the first file an agent opens. **3 of 5** cross-links dangle, which is the "three false claims", measured. | M |
| D-10 | Five component docs are unfilled templates; a theme doc claims the wrong framework version | **OPEN** | Exactly **5** files still carry the placeholder text; the theme doc claims v3 against a resolved v4.3.3. | M |
| D-11 | Mark 16 named plans as superseded | **OPEN** | **15 of 16 return zero** supersession hits. The one non-zero is about something else entirely and still carries a not-yet-executed status despite the capability having shipped. | S |
| D-12 | Handback document rests on "nothing is promoted" | **OPEN** | No banner; §1 still reads "nothing security-related is live". Last touched **before** the promotions *and* before today's applies — **falsified twice over now, not once**. | S |

---

## 3. What is genuinely still open

### The single highest-value open item: **K-2**

**A permission failure renders a green 95% compliance score.** When the compliance query fails —
including an RLS denial, which is a *routine* outcome for a user who should not see a tenant's data
— the page does not show an error. It returns invented statistics and draws the score ring at 95%.
The success path computes a real score, so the same component is trustworthy on Tuesday and lying
on Wednesday, with no visible difference.

It is named highest-value on the product of three things: **severity** (the system asserts a
falsehood about regulatory compliance to a compliance officer, which is the one category of lie this
business cannot absorb), **cheapness** (size S — delete the fallback and render the failure), and
**breadth** (it is the flagship instance of a five-item class that all resolves the same way).

Two runners-up, for different reasons:

- **PF-1 — the cheapest win in the ledger.** The fix is written, correct, and merged; it clears 69
  findings at once. The remaining work is a promotion to `main`, not engineering. Guard the two
  managed-schema statements, and settle PF-4(c) first or 4 statements are wasted.
- **M-7 — the chain-gate.** Nothing in the money chain moves until rates exist, and the newly
  measured fact is that **classifications must be seeded first** because they are the parent key.
  That ordering was not previously stated.

### Grouped by what unblocks what

**Merged but not live — 3 items, all S, zero engineering left.** T-6, PF-1, and P0-4's functional
half. These are the ledger's most dangerous category: they look done in the repository and are
defective in production. *Do these first — they are the cheapest true closures available.*

**Invented data reaching users — 5 items + the blocked component.** K-1…K-5, gated on K-0. The
shared component that fixes them all is **unpublished**, so no app can import it. Publish it, bump
two lockfiles, then five S/M migrations. K-2 first.

**The money chain — 10 items, mostly L.** M-1…M-10 feeding PO-5. Sequence: M-7 (seed
classifications, then rates) → M-3/M-4 (coverage and allowances) → M-5 (wire the engine) → PO-5.
M-2, M-6 and M-9 are S items that can land immediately and independently.

**Portals — 5 items.** PO-1 and PO-4 are large builds. PO-2's remaining half is narrower than
filed: identity and the foreign keys exist; only the scoping policy is missing.

**Adoption — 11 items.** Things built and never reached the product. AD-4 is the sharpest: a
self-service onboarding flow that **has never been exercised once**.

*Corrected 2026-08-18.* AD-4 is still the sharpest, but not for the reason given here, and the
difference decides what to do about it. It was never an adoption gap: the invite action rendered
only inside a transient wizard step that none of the 50 existing people rows could ever reach, so
"never exercised" was a **build defect**. It is fixed (crm7#1801), and it — along with AD-6 and
AD-7 — sat unseen behind a stale parent gitlink, which is the failure mode this whole class should
be read for. "Things built and never reached the product" has a second, quieter member:
**things built, merged, and never pointed at**.

**Verification integrity — 9 items.** V-1 is the keystone: until end-to-end credentials work, every
visual and runtime verdict in this ledger rests on reading rather than running. Note V-1 is *worse*
than filed — the credential is invalid, not merely unwired.

**Theme — 10 items.** TH-3 is urgent for a non-obvious reason: the baseline is stale in the
direction that **fails the build**, and the next pull request touching any stylesheet trips it.

**Documentation — 11 items, nearly all S.** The whole class is a day's work and it is why agents
keep re-deriving wrong answers. D-2, D-3 and D-4 actively teach falsehoods to every agent that
reads them.

---

## 4. What the register got wrong

This section matters as much as the open list: it is where re-litigating gets prevented. Each entry
is a measurement, not an opinion.

### Four items that are not outstanding work

**AD-11 — Schema-builder Tidy and Fit "do nothing". NOT A DEFECT.**
The register grepped the app's own source, which is a **61-line wrapper** that delegates to a
package. The **installed package tarball** declares the graph-layout dependency, ships the layout
module, and wires both buttons with position persistence and three view-fit call sites. The wrapper
also passes error/success handlers, added specifically so a denied write stops looking like "tidy
does nothing". The published version predates the register's own measurement by eight days.
*Only unproven part is a click-through in the deployed app.*

**PF-2 — 983 unused indexes. NOT A DEFECT.**
The "unused" label is an artefact of having no production data. Of 974 non-unique, non-primary
indexes, **690 sit on tables with zero rows** (254 distinct empty tables) and another 267 on tables
under 100 rows — **only 17 are on tables with more than 100 rows**. An index on an empty table
cannot record a scan, so a zero scan count carries no information there. Statistics have never been
reset, so these are lifetime cumulative counts — as favourable as they will ever get, and still
uninformative. **A bulk drop would delete the indexes built for the data that has not landed yet.**
Only genuine candidates: the 17.

**D-5 — README calls the old file the single outstanding-work index. NOT A DEFECT.**
The phrase matches **only the register itself**. The root README contains zero occurrences of the
old filename (positive control confirms the file is being read), and the docs index **already**
carries the correct superseded banner. One residual instance sits in a dated July snapshot, which
is a historical record, not an index.

**TH-11 — corporate error hue "pending operator taste call". SUPERSEDED.**
The call was made on **2026-08-10** and is recorded *inline in the stylesheet*: use standard error
red, not the corporate red. The register carried it as pending **seven days after** the ruling that
settled it. Live values are deliberately distinct from the primary, with the ruling additionally
mandating an icon or explicit verb because the two separate on lightness rather than hue.

**Also not a defect, inside a composite item — PF-4(a).** The 9 tables with RLS on and no policy
were filed as a gap. All nine grant to the service role **only**, with zero untrusted grants.
RLS-on plus no-policy plus no client grants is the *intended* deny-all posture, and three recent
hardening migrations created them that way deliberately. **Adding policies would loosen them.**

### Counts the register got wrong

Both numbers shown; the right-hand column is current.

| Item | Register | Measured 2026-08-17 | Direction |
|---|---:|---:|---|
| M-3 award partials | 37 / 16 awards | **39 / 17 awards** | **worse** |
| TH-1 non-standard colour | 235 | **143** | better |
| TH-9 non-responsive grids | 473 | **237** (172 in the CRM) | register measured the wrong thing |
| V-7 hook suppressions | 90 | **97** | **worse** |
| D-6 docs scoping the old version | 40 | **42** | **worse** |
| D-1 dangling references | 21 | **18** | better |
| TH-7 raw-button files | 37 | **18** | register's source inflated |
| A-2 applied migration ledger | 594 | **699** | drift |
| PF-1 policy findings | 70 | **69** | drift |
| PF-2 unused indexes | 983 | **977** | drift |
| PF-3 overlapping policies | 68 | **67** | drift |
| PO-5 clause-read allowance scales | 2 of 21 | **1 of 19** | worse, but narrower risk |
| D-7 tables / security-definer functions | 229 / 59 | **402 / 222** | both stale |

**TH-9 deserves the emphasis.** The register counted *every* occurrence of the grid class,
including breakpoint-prefixed variants — which are exactly the **correct** responsive pattern the
item asks for. It was counting the fix as the defect. The real figure is 237 estate-wide, and even
that is a floor because the measurement cannot resolve composed class names.

### Items the register misattributed or mislocated

- **M-6 names the wrong award.** The aliasing defect is real at the cited line, but the sectors
  involved belong to a **different award**. The larger effect is cross-award: the sector state
  initialises to one award's value for **every** award, silently dropping all 23 sector-tagged rows
  of the award actually named.
- **D-3 blames the rulebook.** The rulebook carries **no package table** (zero hits). The stale
  version rows live in three other documents.
- **K-3 mislocates one site and undercounts.** There are **three** fallbacks across **two** files,
  not two — including one the register never registered at all.
- **AD-3 overstates the emptiness.** Two of the person-level links are **16 of 50** populated, not 0.
- **AD-10 is not a defect at all** — dashboard drag/drop persistence is live and durable, measured
  against the production database. Both registers reasoned from the absence of a table named
  `dashboard_layouts` to the absence of persistence. The table genuinely does not exist; it was
  never the mechanism. **An expected NAME not resolving is not evidence a CAPABILITY is missing** —
  ask what the working path actually is before recording a gap.
- **AD-3's "missing join column" is present, and its missing FK cannot be added.** `placements.trade_id`
  exists as `text`, correctly targeting `award_trades.trade_id text` rather than the uuid primary
  key. No foreign key is possible: the only unique index over `(award_code, trade_id)` is **partial**
  (`WHERE tenant_id IS NULL`), and Postgres will not use a partial index as an FK target. A
  non-partial constraint would enable the FK *and* forbid tenant-scoped trades, which that predicate
  exists to allow. Recording it as "missing FK" implies a one-line fix; it is a design fork.
- **PO-2's premise is wrong.** The supervisor concept **does exist** — role rows and two foreign
  keys, both predating the register. Only the scoping policy is missing.
- **A-4 calls the orphan ADR "unreachable".** A package README links it directly by path. The
  defect is the duplicate number and the index omission — and any renumber must fix those links.
- **V-3 double-counts a deliberate removal.** "Dead in both repos" treats an intentional
  consolidation as a failure. The underlying table is **shared**, so a per-repo audit could only
  ever see one slice; the second copy was removed on purpose and the surviving workflow records why.
- **P0-8 says eight functions; its own tracking issue says nine.**
- **M-10 carries two issues as gaps that shipped.** Three of four engagement types now price and
  their tests pass; those issues should be closed against a merge commit, not carried.

---

## 5. Coverage gaps — dated work absent from all 87 items

**The register's claim that "all 264 non-archive documents were read and classified" does not hold.**
On the day it was written there were **266**; in the 2026-02-27 → 2026-08-15 window there are **210**
basename-dated documents, not the 202 assumed. Six plausible enumerations were tested and none
yields 202.

> **Enumeration rule, added 2026-08-17 — quote it with the number.** The **266** is exact and
> independently reproduced: *tracked `*.md` under `docs/`, excluding `docs/archive/**`*, at the
> register's own commit `b8a9941e` → 266. The **210** is enumeration-sensitive and does **not**
> reproduce from that rule: counting non-archive `*.md` whose basename matches `^\d{8}-` with
> `20260227 ≤ date ≤ 20260815` yields **213** at this ledger's commit, and the `recovered/`
> subcount below (25) includes five documents dated before the window start. Neither pass
> miscounted — the window boundary and the basename filter are applied differently. Treat 210 as
> "the coverage pass's set", not as a reproducible constant, and state the rule whenever
> restating the figure. **The 202 is not a claim the register ever made** — that string appears
> nowhere in it or in any other document under `docs/`.

**Nine directories are never named once by the register** — `audits/`, `runbooks/`, `recovered/`,
`testing/`, `research/`, and four `plans/` subdirectories — **49 of the 210 documents**. That is
where most of the following was found.

The coverage pass opened **55 documents** in depth and scanned all 210 programmatically. **155 were
not opened**, so this list is a floor, not a ceiling.

| # | Cluster absent from the 87 | Why it matters |
|---|---|---|
| **G1** | **The entire D-59…D-92 operator-notes backlog** — two documents, one written the *same day* as the register | **The largest omission.** The register references only D-93…D-98. Its own verification register measured **27 open-filed-untouched, 11 not filed anywhere, 9 partial, 8 new defects**. Its headline: the platform-wide surface defects — *"the exact class you have raised most often"* — are **the one section with essentially no issue coverage at all**. Five of six items have no issue in any repo. |
| **G2** | **Payroll/Single-Touch-Payroll integration V1 — an Approved decision, entirely unbuilt** | Every artifact it specifies is absent: no function directory, no mapping module, no submissions table. **Its tracking issue is closed.** Identical failure class to A-1/A-2, missed because the register only scanned the `adr/` folder and this one lives elsewhere. |
| **G3** | **Database region migration to Sydney — issue still open** | Three documents; two unticked boxes, both operator-gated: cutover approval and a restore dry-run. Register mentions: **zero**, including the section where operator-gated work belongs. |
| **G4** | **Colour-gate operator decisions**, dated the day before the register | Includes a genuine contradiction: **the audit rejects the two colours the rule prescribes**, so a developer obeying one gate's error message fails another. Needs a ruling. Also an open issue where the ban cannot see a colour passed through a converter — **17 pure whites sat in client-facing PDFs** (invoice, quote, compliance pack) and two separate checks missed them. |
| **G5** | **The `recovered/` verdict backlog — issue open** | **25 of the 210 dated documents** live there, each still needing a verdict against code. Contains a documented live trap: a 2,342-line implementation plan for a vendor **rejected the same day it was written** — and it is the longest, most actionable document in the directory, so it is the one an agent reads first and trusts most. |
| **G6** | **A database connection-limit setting — live today, 103 days after write-up** | Explicitly *"a checkbox for the operator to action"*. **Confirmed still present in today's live advisors.** Its sibling phase is covered as PF-2; this one is not. |
| **G7** | **Universal editor backlog — converted from optional to *required* by your own directive** | Schema/DDL exporters, durable undo/redo, cross-app parity. Measured: **zero** relevant symbols in either package. Register hits: zero. |
| **G8** | **Unified design-language rollout — issue open, 9 waves** | Two named components absent estate-wide. The register marks a *neighbouring* document superseded but records neither this plan nor its open tracker. |
| **G9** | **Year-level progression and the quote-save compliance gates** | The source calls it *"the higher-frequency event and has no trigger at all."* An apprentice crossing a year boundary changes the charge rate, the wage and the host's cost — **no scheduler, no notification lanes, no draft amendment**. Also three unbuilt gates: casual prohibition, protected-rate floor, insurance-currency warning. **This is money-path work in the same chain as M-1…M-7 and it is not in it.** |
| **G10** | **State training-authority sample expansion — blocked on operator-supplied samples** | Only two states proven; six need approval, rejection and needs-info samples. Register hits: **zero** — and it is exactly the kind of thing that belongs in "what no static pass can settle". |
| **G11** | **A route-retirement decision** | *"Needs an operator decision (deletion needs your approval)."* Different surface from K-1. Register hits: zero. |

### Two structural document problems the register does not record

**A numbering collision between two live registers — RESOLVED 2026-08-17.** The 2026-08-15 platform
audit used identifiers **V-1…V-8** for a completely different set than the register's **V-1…V-11**.
Two live registers, one namespace. **The platform audit's items were renumbered `V-n` → `VP-n`**
(1:1, order-preserving), so `V-n` now unambiguously means the register's verification-integrity
items and every citation in this ledger stands unchanged. The platform audit moved because its
identifiers had **zero citations outside its own file**, measured across the parent repo, all six
submodules and both Vercel agent skills with a positive control on each probe, against **22**
citations of the register's `V-n` in this ledger alone. A distinct prefix was chosen over
renumbering into `V-12…V-19` so the two namespaces are structurally disjoint rather than merely
non-overlapping today.

**A second collision of the same shape, also resolved.** `20260728-weekly-gap-register-v1.00W.md`
defines **P0-1…P0-8** for an entirely different set than the register's **P0-1…P0-8** — exactly
overlapping ranges, and two other live documents cite its `P0-2` and `P0-4`. That register was
already superseded by §9 of the 2026-08-14 register but carried no marker on its own face, so a
reader landing on it directly had no signal. It now carries a supersession banner.

**Status markers that contradict their own contents.** All 210 were scanned and every flag
hand-verified: **69 flagged, 9 real**. Six documents carry a filename status letter their body
contradicts — including an *Approved* marker on unapproved, unbuilt work, a *Draft* marker hiding an
authorised build, and a *Working* document that **shipped two months ago** with both follow-ups
closed. Three carry version numbers their own text contradicts, one of them three different ways.

**That last one has already broken things outside `docs/`.** Four agent skills point at a version of
the architecture document **that no longer exists** — including one skill's *description* field, the
text an agent reads to decide whether to load it at all. Filename, body and skills disagree three
ways. This is the same defect class the register records as D-2, and it is unrecorded.

Also: **26 of 210 dated documents carry no version or status marker at all**, against the estate's
own naming convention.

### What is correctly absent

To keep this honest in both directions: **roughly 50 of the 210 carry no outstanding work** and
correctly need no register entry — delivered work with cited evidence, pure reference material
(including a competitor's manual and vendor API documentation), and standing doctrine or operator
procedure. One audit's outstanding half is **genuinely and completely drained** into T-1…T-5 and
M-1/M-2, and its routing cluster was verified fixed — all seven routes now resolve.

---

## 6. What no static pass can settle

These are **decisions**, not work. None can be closed by measurement, and several have been waiting
long enough that the waiting is itself the risk.

### Needs an operator ruling

1. **Whether award rates live in the database or only in the calculator's static corpus** (M-7).
   Nothing in the money chain can be sequenced until this is answered, and it has no recorded ruling
   anywhere in the estate's memory.
2. **Whether the payments foreign-data-wrapper decision is applied or retired** (A-2). Its issue was
   closed "completed" with zero objects installed, and a later ruling shrank its scope to a single
   surface that does not yet exist. **The retirement is unrecorded, so the document still reads
   "Accepted".** If retained, the migration must be re-stamped and de-collided before it can ever apply.

   > **CORRECTION, 2026-08-17 (same day, hours later): the retirement is now recorded, the decision
   > is not.** `docs/adr/ADR-0007-stripe-fdw-read-doctrine.md` (merged in bsuite#2053) carries a
   > banner stating the measured state, a numbered case for retirement, and an explicit refusal to
   > flip `Status:` itself — that line is reserved for the operator. Re-verified independently
   > 2026-08-17, not re-derived from the banner's own claim: `supabase/migrations/` on disk shows
   > `20260512161000_stripe_fdw_wrappers.sql` sharing its exact 14-digit stamp with
   > `20260512161000_developer_portal_branding_scope_rls.sql` — a real filename collision, not a
   > paraphrase — and that stamp sits below the `20260611000000` floor, so the file **cannot apply
   > even if retained.** A parent-repo-wide grep (submodules not checked out) finds `stripe_wrapper`
   > / `stripe_server` / `stripe.*` nowhere except inside that one unapplied file — nothing reads it,
   > because there is nothing live to read. **Deciding factors for the operator:** (a) no live Stripe
   > billing exists today and none is scheduled, so retiring costs nothing running; (b) keeping it
   > Accepted means provisioning a live `stripe_api_key` Vault secret to serve zero readers just to
   > satisfy its own compliance gate; (c) it is cited as governing `BL-013` in the merged execution
   > backlog, so every day it stays "Accepted" is another day that backlog item reads as
   > architecturally settled when its substrate does not exist; (d) retirement is cheap to reverse —
   > a fresh ADR against 2026-08 requirements, not 2026-05 ones, if live billing ever arrives. On
   > ratification: set `Status:` to `Rejected (retired unbuilt)`, delete the migration file, and
   > drop the `BL-013` row from the backlog.

3. **The two colours the rule prescribes but the audit rejects** (G4). Adding a colour to the
   contract is a contract change. A developer obeying one gate currently fails another.
4. **Whether the legacy custom-fields table is dead** (PF-4c). Dropping it removes 4 of PF-1's 69
   findings outright.

   > **CORRECTION, 2026-08-17 (same day, hours later): the window this framed closed.** PF-1 was
   > promoted to `main` in bsuite#2046 and **applied** by the floor-gated applier; the live catalog
   > confirms the hoisted form on the sampled table. So the 4 statements covering the legacy table
   > have already run. The decision is now the plainer one — drop the table or keep it — and
   > dropping it means dropping 4 live policies with it rather than skipping 4 unapplied statements.
   > Left visible rather than rewritten: the original framing was correct when written.
5. **Whether the 20 unbuilt parity gaps survive the portal redesign** — carried from the register,
   still unanswered.
6. **Retirement of a financial reports route** (G11) — deletion needs approval.
7. **Cutover approval for the Sydney region migration**, plus a restore dry-run (G3).

### Needs the operator to supply something

8. **Training-authority email samples for six states** (G10) — approval, rejection and needs-info
   for each. No amount of code reading produces these.
9. ~~**Working end-to-end test credentials** (V-1).~~ **CLOSED 2026-08-17, hours after this ledger
   was written.** The ledger was right that the credential was *invalid* rather than merely
   unwired — and the cause was that the stored GitHub secrets did not match `.env.local`. Both
   pairs were verified against Supabase's token endpoint directly (HTTP 200, tokens minted) and
   re-set with `printf` rather than `echo`, because a trailing newline in a password secret is
   invisible in every UI and fails identically to a wrong password.

   **The suite then ran for the first time: `executed=74 skipped=52`, 51 passed, 23 failed** — up
   from `executed=1 skipped=125`. Three nested defects had to be cleared first: the secrets were
   never referenced by any workflow; the auth helper drove a login form that does not exist (crm7's
   `/auth/login` is a redirect shim to the OAuth hub, and a CI origin can never be a registered
   redirect URI); and underneath both, the helper's `catch` wrote an EMPTY storage state, which
   makes every authenticated spec skip itself while Playwright counts a skip as a pass.

   **This does not retroactively validate this ledger's theme claims** — see item 10, which still
   stands. It means the instrument now exists.

### Cannot be verified without a live authenticated session

10. **Every visual and runtime claim in the theme class.** No browser was driven for this ledger.
    All of §2's TH rows are verified at token and source level, never on a rendered page — and the
    original complaints were visual. This is the same limitation the register declared, and it is
    unchanged.
11. **The 27 cannot-verify operator-register items**, each needing an authenticated session on a
    named route.
12. **The one unproven part of AD-11** — a click-through in the deployed schema builder. The code
    path is proven present in the resolved dependency.
13. **Login redirect-URI allow-list configuration** — no tool exposes it.
14. **Credential rotation** — carried from the register, unverifiable here.
15. **105 of the 108 security-definer advisories.** Three most sensitive were spot-checked and all
    three gate correctly; the advisory cannot distinguish a definer function *with* an authorization
    gate from one without.

### The standing mechanism nobody owns

16. **"Closes #N" on a development merge closes nothing** (V-10). The named backlog was cleared by
    hand on 2026-08-17, but **the mechanism is untouched** — all five repos default to `main`. This
    needs either an on-merge action or a standing manual sweep, or the fixed-and-open backlog
    rebuilds at exactly the rate it did before.

---

## 7. Suggested sequence

1. **Merged-but-not-live (S×3).** T-6, PF-1, P0-4's edge function. Settle PF-4(c) before PF-1.
2. **TH-3's re-bank**, before it fails an unrelated pull request red.
3. **K-0 publish**, then **K-2** — the fabricated compliance score — then the rest of the K class.
4. **V-1 credentials.** Everything visual stays unproven until this works.
5. **The D class**, nearly all S — it is a day, and it stops agents learning falsehoods.
6. **M-7 → M-3/M-4 → M-5 → PO-5**, the money chain, in that order.
7. **G1 triage** — the D-59…D-92 backlog needs to enter a register before it can be worked.
