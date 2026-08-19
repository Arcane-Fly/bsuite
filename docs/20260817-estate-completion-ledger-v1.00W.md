# Estate completion ledger — proving the 2026-02-27 → 2026-08-15 document set

**Document:** `docs/20260817-estate-completion-ledger-v1.00W.md`
**Date:** 2026-08-17, amended 2026-08-18 · **Version:** 1.00W · **Status:** W — Working

> **Amendment, 2026-08-19l — PF-1 and PF-4(b) are DONE, not open; the ledger read "recorded
> without a fix applied" when the fix had, in fact, run. PF-3's residual findings have all
> been individually triaged — no further merge is safe. DONE 51 · PARTIAL 19 · OPEN 5.**
>
> All four measured directly against production (`tuybltdrdefjblnplpqo`, confirmed live via
> `inet_server_addr()`), not read from `schema_migrations` or from prior rows in this file.
>
> **PF-1 is DONE.** The row said "database untouched… absent from the applied ledger and not
> on `main`". Measured 2026-08-19: **0** unwrapped `auth.*` calls remain in any RLS policy
> across `public` + `realtime` (417 wrapped, positive control), and all 4 of
> `custom_fields_legacy_unused`'s policies — PF-4(c)'s dependency — carry the hoisted
> `(SELECT auth.uid())` form. `supabase_migrations.schema_migrations` does carry a row for
> `20260817064500`, but with a **NULL** `statements` array — the same "recorded without
> capturing statement text" shape `crm7/supabase/migrations/CLAUDE.md` documents for other
> migrations, except read backwards here: a NULL statements array was taken as evidence the
> DDL never ran, when the live catalog proves it did. Absence of a clean bookkeeping row is
> not proof the fix is missing, and — the direction that bit this row — a present-but-empty
> one is not proof it is missing either. Only the live catalog answers that question.
>
> **PF-4(b) is DONE, not "awaiting an operator dispatch".** Both doomed indexes
> (`idx_leave_balances_employee`, `timesheets_placement_id_idx`) are absent live; both
> survivors (`idx_leave_balances_employee_id`, `idx_timesheets_placement_id`) are present.
> The SAME migration's PF-3 half also ran: `funding_sources_tenant_read` and
> `r7_privacy_notice_versions_anon_read_apply` are both gone, survivors intact.
> `20260822050000_pf3_pf4b_drop_provable_redundancies.sql` already executed against
> production; the 2026-08-19g amendment's "waiting only on the apply" is stale, not current.
>
> **PF-3's residual is answered, not open.** Re-measured live: **64** table×role×command
> groups with multiple permissive policies remain — exactly **66 reconstructed − 2 dropped**,
> matching the now-confirmed-applied migration's own pre-apply arithmetic. That migration's
> header already triaged every one of the 64 individually: **59** are `ALL`-vs-specific-verb
> overlaps that are structurally unmergeable (merging would grant write access to everyone
> matching the read predicate — the 2026-08-16 cross-tenant leak, run in reverse); **5** are
> same-command-different-intent pairs Postgres already ORs safely today but which stay as two
> policies so editing one intent cannot silently widen the other. The residual advisor noise
> is 64 answered widest-limb questions, not one unanswered class.
>
> **PF-4(a) is still not-a-defect, but the count drifted.** Re-measured live: **11**
> policy-less RLS-enabled tables, not 9 — `r7_talent_pool_redeem_attempts` and
> `xero_tax_rate_cache` are new since 2026-08-18. All 11, not just the original 9, grant zero
> privileges to `anon` or `authenticated` (`has_table_privilege` checked per role × SELECT and
> INSERT) — the deny-all posture holds across the wider set.
>
> **PF-4(c) is unchanged.** `custom_fields_legacy_unused` is still 0 rows live, and dropping
> it alone remains scope creep against the batch-retirement plan
> `20260807072000_rename_custom_fields_table_collision.sql` records — that batch's other
> zero-row orphans are outside the PF cluster's boundary.
>
> **No migration was authored this pass.** Nothing safe remained to fix: PF-1 and PF-4(b)
> needed no fix (already applied), PF-3's two safe merges were already done by a prior
> migration and the residual is correctly left alone, PF-4(a) is not a defect, and PF-4(c)
> awaits a batch decision outside this cluster's scope.
>
> **Amendment, 2026-08-19k — AD-6 told the reader that a promotion applies migrations. It does
> not, and that belief is exactly how a set of merged migrations sits unapplied while everyone
> reads the estate as current.**
>
> `supabase-migrate.yml` has `push: branches: [main]`, so a promotion STARTS the workflow. Its
> apply job is guarded `github.event_name == 'workflow_dispatch'`. A promotion is a push. It
> starts the run and applies nothing.
>
> The separation is deliberate and the job's own comment records why: a required-reviewers
> environment rule was rejected by the account's billing plan (HTTP 422), and the failed attempt
> still CREATED an environment with zero rules — "which reads as protected and is not" — so the
> guard was moved into the job condition, where it works on any plan and cannot be
> half-created. **Applying is an operator `workflow_dispatch`, always.**
>
> Swept the rest of `docs/` for the same claim: one assertion (this row), and three pointers
> that say where to look rather than what happens, which are not wrong. No verdict changed.
>
> **TH-1's prediction is confirmed and its numbers refreshed.** It forecast the count would drop
> to 98 once bsuite#2103 advanced the pointers; measured at the current pointers it is exactly
> **98**, and the banked baseline reads 98. It stays PARTIAL on its own criterion — the 98 are
> banked, not swept.
>
> **Amendment, 2026-08-19j — K-0 closes, and that makes FIVE rows in one day that described
> a real defect accurately and were simply never revisited after it was fixed.**
> DONE 49 · PARTIAL 20 · OPEN 6.
>
> K-0 made three claims and all three are now false: the component is published (`@bsuite/ui`
> 1.2.0, verified by unpacking the tarball rather than reading workspace source), both apps
> resolve that version in their lockfiles, and adoption is five files each — in exactly the
> K-series surfaces the component was built for.
>
> **The pattern is worth stating because it changes what the residue is.** M-2, TH-3, V-11,
> TH-7 and now K-0 were all already fixed in code and stale here. In each case the row was
> accurate when written and the fix landed without it being revisited. That work was
> reconciliation, not repair — and it means the rows still open skew harder toward genuine
> gaps than the counts alone suggest.
>
> **Amendment, 2026-08-19i — D-6 and TH-7 close. DONE 48 · PARTIAL 21 · OPEN 6.**
>
> **D-6** kept its refusal of a blanket rename and gained the other half of that ruling: if a
> pointer is not going to be rewritten, the document has to SAY it is historical. 119 live docs
> reference R80.3; all 119 now carry a marker, 0 unmarked, and nothing was rewritten.
> **Four were live claims, not records** — the operational runbooks each listed `R80.3` as a
> currently-valid value, and the migration-dispatch and edge-function guides listed it among
> the accepted `submodule` workflow inputs where the workflows accept `R80.4` and reject
> `R80.3`. Anyone following the dispatch runbook to apply the pending migrations would have
> passed a value that does not exist.
>
> **TH-7**'s not-done half was already closed by a commit this row's measurement predates. The
> `ignores` key is gone from the rule's config block — parsed, not read from its comment — and
> the one surviving `<button>` carries a per-line disable with a stated reason. **The rule was
> also shown to fire**: injecting a raw `<button>` into `Platform.tsx` produces one report and
> restoring the file returns it to clean. A green gate never observed failing is not evidence.
>
> **Amendment, 2026-08-19h — M-1's remaining half has an ORDERING CONSTRAINT the row did not
> state, and writing the obvious PR would have broken the calculator.**
>
> The row's outstanding item is "crm7's `chargeRateDefaults.ts` must read the columns". Queried
> live: `public.tenant_settings` has **0** of `super_rate` / `wc_rate` / `wic_code`, and
> `schema_migrations` carries no row for `20260827030000`. The columns do not exist yet.
>
> A reader that NAMES them returns a PostgREST **400**, and the surface it feeds is the charge
> rate an operator quotes a host. **A pending migration does not make a dependent read render
> empty — it makes it ERROR**, and this ledger's own pending-migration note ("renders EMPTY on
> d.* today ... correct code awaiting schema") does not cover the difference.
>
> There is a shape that is safe today, and it is the one the resolver was built for:
> `TenantOncostSettingsRow` declares all three fields optional, so a `select('*')` read leaves
> them `undefined`, the platform constants stand, and `fallbacks` names what was missing so the
> UI can say "platform default" rather than presenting a constant as a negotiated rate. The
> consumer surface is one file and two lines.
>
> Left OPEN deliberately rather than half-built: it is a money-display change, and the gate
> requires a visual pass on a signed-in route that an unattended lane cannot perform.
>
> **Amendment, 2026-08-19g — V-11 closes; PF-4(b) is authored, merged and waiting only on the
> apply.** Counts: **DONE 46 · PARTIAL 23 · OPEN 6**.
>
> **V-11** said the unscoped-select sweep "is referenced by no workflow". It is now wired into
> `crm7/.github/workflows/db-lint.yml` on both `development` and `main`, riding the job that
> already replays the baseline into a real Postgres — and it has RUN: the latest `main` run
> prints `1091 RLS policies across 403 tables examined ... 0 new, 0 stale, 0 missing`, with a
> self-test of `12 cases, 6 of them asserting the gate FAILS`.
>
> **PF-4(b)** was measured against the LIVE advisor, which still reports both duplicate index
> pairs — and the fix for exactly those two pairs is already merged to `main` in
> `20260822050000_pf3_pf4b_drop_provable_redundancies.sql`, awaiting an operator dispatch.
> **The finding is live and the fix is unapplied, and those are different states**; a row that
> collapses them either claims work that has not landed or re-opens work that is done.
>
> **M-10 and PF-3 were re-read and deliberately NOT moved.** M-10's remainder is contractor/ABN,
> which is absent by an explicit product deferral recorded in its own tracking issues — not an
> engineering gap. PF-3's remaining 67 advisor findings across 21 tables each need a
> widest-limb authz decision per table; the migration above refused 65 of them with per-table
> reasons rather than merging policies blind. Neither is closeable by measurement.
>
> **Amendment, 2026-08-19f — M-2 and TH-3 close, and TH-3's stated cause was fixed rather
> than waited out.** Counts move to **DONE 45 · PARTIAL 24 · OPEN 6**.
>
> **M-2** named three remaining conditions — publish 0.14.0, bump crm7's dependency, promote
> crm7 to `main`. All three are met, and all three were measured against production rather
> than asserted: the registry says 0.14.0, crm7's `origin/main` package.json declares `^0.14.0`
> with the lockfile resolving `0.14.0(zod@4.4.3)`, and crm7#1848 promoted it.
>
> **TH-3** said the near-pure gate "has not fired only because recent commits changed submodule
> pointers alone and the path filter cannot see those". That sentence was the whole defect, not
> an excuse for one. Every job in `theme-conformance` measures the apps at the PINNED gitlink
> SHAs, so a pointer bump is the only way its inputs change — and the parent's diff for a
> pointer bump contains no `.css` or `.tsx` path at all, only the gitlinks. Confirmed live on
> bsuite#2140, where the workflow did not start while twenty-one other checks did. bsuite#2141
> adds the gitlinks to that trigger and to two more workflows carrying the same omission behind
> their own submodule globs.
>
> **A measurement note that changed the answer.** Checking TH-3's ratchet against the working
> copy gave 16 against a baseline of 16 — green. But four submodules were AHEAD of the parent's
> recorded pointers at that moment, so the working copy was not the tree the gate reads. The
> pointers were advanced first (bsuite#2140), the six gitlinks confirmed identical to the local
> checkouts, and only then was the number believed.
>
> **Amendment, 2026-08-19e — P0-4 said "awaiting merge" and crm7#1834 had already merged.**
> Two of its three blockers are gone. The three code files are byte-identical on the branch,
> on `development` and on `main`, and crm7 was promoted this session, so the fix is deployed.
> What remains is the APPLY, and only that: the migration is in the pending set awaiting an
> operator `workflow_dispatch`.
>
> **It was found by fixing a false positive in a cleanup script, which is worth recording.**
> `branch-cleanup.sh` enumerated remote branches with
> `for-each-ref --format='%(refname:short)' | grep -v '/HEAD$'`. Git shortens
> `refs/remotes/origin/HEAD` to just `origin` — the `/HEAD` suffix is gone before the grep
> sees it — so the symbolic pointer sailed through as a branch named `origin` and was reported
> in all seven repositories as "orphan — open one". Excluding by FULL refname removed the noise
> and left two real orphans visible underneath it, one of them named for this item.
>
> **Both of those branches turned out to be squash-merge leftovers, and both had their
> migration RENUMBERED on the way in** — `20260827010000` -> `20260827020000` and
> `20260821050000` -> `20260823020000`, each because another scope had already claimed the
> version in a ledger keyed on the 14-digit number alone. The second carries a 27-line banner
> saying so: business-suite-unified's `20260821050000` was already applied, so crm7's migration
> at that version would have been skipped silently, forever. Content preserved; branches deleted.
>
> **Amendment, 2026-08-19d — the verdict-level salvage missed three rows, because their
> verdicts already agreed.** Comparing only the LIVE VERDICT found nine differing rows. A
> word-level comparison then found three more — **AD-3, PO-4 and PO-5** — where the verdict
> matched but the orphan branch carried live measurements this file did not: the seven PO-4
> tables named individually and confirmed absent from every migration in crm7 and conduit;
> PO-5's `public.awards` 156 against `public.award_rates` 0; AD-3's five empty registers
> counted row by row against `award_trades` 27.
>
> **A matching verdict is not a matching row.** Two rows can agree on the conclusion and
> disagree entirely on what was measured to reach it, and the evidence is the part that lets
> the next reader check the conclusion instead of inheriting it.
>
> PO-4 and PO-5 were strict supersets and were taken whole. **AD-3 was merged, not replaced** —
> its verdict cell here carried "population plan below, re-verified 2026-08-17", which the
> branch's "CONFIRMED unchanged" lacked, so the row now records both dates. Verified after:
> zero rows lose content from either side, apart from three phrases on the branch that this
> session deliberately corrected (M-9's "pending merge", V-10's "awaiting", TH-9's "absent
> from main") — all three describe blockers that have since been cleared.
>
> **Amendment, 2026-08-19c — nine commits of measurement were sitting on a branch with no
> pull request, and this ledger was under-reporting its own completion because of it.**
> `fix/docs-hub-stop-pinning-package-versions` carried measurements for **D-3, K-1, K-3, K-4,
> K-5, M-6, M-8 and PO-1** that never reached `development`. Its last three commits were the
> ones lost; everything earlier had arrived by another path, which is why the divergence was
> only nine rows out of eighty and easy to miss.
>
> **The rows were verified against the running system before they were adopted, not trusted
> because a branch asserted them.** K-1: `crm7/src/pages/financial/budget/index.tsx` on
> `origin/main` renders a `DataUnavailable` block — the surviving `DUMMY_BUDGETS` string is in
> the header comment recording what the page used to do. D-3: the documentation hub's §2.2
> authority table no longer pins a version; the five old pins survive inside a banner
> explaining their removal. Both are the same shape, and it is the shape that most often
> produces a false reading here — **the searched-for phrase routinely survives inside the
> correction that removed it**, so a grep hit must be read in context before it is believed.
>
> The union keeps **TH-9 as DONE**, which is this session's own measurement and is newer than
> the branch's PARTIAL. Nothing else in the branch was ahead.
>
> **AD-10's verdict was spelled `NOT A DEFECT` without hyphens**, so the derived count could
> not read it — the table summed to 79 and one unreadable row. Canonicalised.
>
> Counts, derived: **DONE 43 · NOT-A-DEFECT 4 · SUPERSEDED 1 · PARTIAL 26 · OPEN 6 = 80.**
> Settled 41 -> 48; still carrying work 39 -> 32; OPEN 14 -> 6.
>
> **Amendment, 2026-08-19b — this ledger was hiding 8,792 characters of its own evidence.**
> **29 of its 80 item rows carried a SIXTH cell** (two carried an eighth). The table declares
> five columns, and every markdown renderer — GitHub included — silently drops what follows the
> last declared one. So re-measurement notes written into those rows, in the one document whose
> entire purpose is to carry evidence, were invisible to every reader of the rendered page.
>
> They are folded back into the Evidence column. **Nothing was rewritten and nothing was lost**:
> a word-set comparison of all 80 item rows before and against after reports zero rows with any
> word missing. `markdownlint-cli2` went from **48 table errors to 0**.
>
> **Nothing lints this file**, which is why it went unseen — there is no markdownlint config at
> the repo root and no workflow runs one over `docs/`. That gap is the reason a formatting fault
> could quietly delete evidence for as long as it did, and it is worth closing separately.
>
> **Amendment, 2026-08-19 — the promotion this ledger kept naming as a blocker has happened.**
> All six apps were promoted `development` -> `main`, so three rows whose stated blocker was a
> merge or a promotion were re-measured against production rather than re-asserted. **TH-9**
> moves **PARTIAL -> DONE**: crm7's `main` now reads 4 unprefixed two-column grids where the
> old pinned commit reads 194, and all four are named and legitimate. **M-9** loses its
> "pending merge" qualifier — R80.4#95 is merged and promoted, and the sending half is wired
> (`charge-calculator-v9-2.tsx` imports `mintQuoteHandoff` and calls it). **V-10**'s blocker
> moves from bsuite#2065, now merged, to the parent promotion, because the workflow's `schedule`
> trigger only ever fires from the default branch.
>
> **A caution worth keeping, because it nearly produced a false finding here.** M-9 first
> measured as *unwired* — `git grep` over `src/**` returned zero importers of `mintQuoteHandoff`.
> The importer is `charge-calculator-v9-2.tsx`, which sits at the REPOSITORY ROOT, not under
> `src/`. The pathspec was wrong, not the code. A zero from grep is a hypothesis about the
> search, not a fact about the tree.
>
> **P0-4 and PF-1 were re-read and NOT moved.** Both need a migration applied, and applying is a
> separate operator `workflow_dispatch` by design. Promotion did not clear them.
>
> **Amendment, 2026-08-18 — two items closed here, one found already closed, one re-verified
> still open.** **K-2** and **AD-1** move to **DONE** with mutation-tested proof. **AD-2** was
> found **already done on every app's `origin/development`** — this lane's measurement had been
> taken at the PINNED submodule commits, which predate the work; the duplicate written against
> that stale base was deleted unmerged rather than landed. **AD-3** was re-measured against the
> production database and every number reproduces exactly, so it stays **OPEN**, blocked on an
> operator ruling and on external data. This ledger moved in the same pull request as the code,
> which is the estate's rule: a status document that lands after the change is a document nobody
> can trust the age of. Rows, scoreboard, and §3's "highest-value open item" are amended below
> rather than appended to.
>
> **One method correction the next pass should inherit:** an adoption question — "does anything
> import this?" — measured at a submodule POINTER answers a question about the parent's last
> promotion, not about the submodule. Measure adoption at `origin/development`, and re-measure at
> the pin only to explain a disagreement.
>
> **This supersedes `docs/20260814-estate-remaining-work-register-v2.00W.md` for status purposes.**
> That register's *evidence* and *item numbering* remain the reference — this ledger keeps its 87
> identifiers unchanged so nothing has to be re-mapped. What this document replaces is every
> **verdict and count** in it. Where the two disagree, this one is current.

**Method.** All 87 register items were re-measured on 2026-08-17 against live sources, never

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

against the register's own prose: read-only SQL on the production database `tuybltdrdefjblnplpqo`,
live Supabase advisors, live deployed edge-function bodies (fetched, not read from the repo),
live production HTTP probes, live GitHub issue and workflow state, resolved `pnpm-lock.yaml`
versions and unpacked `node_modules` tarballs, and greps at the pinned submodule commits. Positive
controls were run on every "zero" result, because a broken search and a genuine absence look
identical. Separately, a coverage pass re-enumerated the dated document set to test whether those
87 items actually cover it.

**Re-measurement pass, 2026-08-18 — M-5, M-7, M-9, M-10.** Four money-chain items were re-measured
against the same live sources, on the standing instruction that *this ledger is stale the moment
work lands and must never be trusted over a fresh measurement*. Two moved on shipped code
([R80.4#95](https://github.com/GaryOcean428/R80.4/pull/95)); two did not, and both of those are
recorded with the reason. **Two of this ledger's own prescriptions turned out to be wrong and were
corrected rather than followed:** M-7's "seed from the live deployed edge function" cannot work,
because that function writes neither of the two empty tables; and M-10's "close the two issues
against shipped work" would have closed an issue three-quarters met against acceptance criteria
listing four limbs. Each row below carries the measurement that overturned it.

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

**SECOND CORRECTION, 2026-08-17 (later the same day, in the full-window docs sweep): 34 need no
further work — 30 measured DONE, 3 never defects, 1 already settled. The remaining 53 carry real
outstanding work: 39 untouched and 14 part-done.** All 11 OPEN D-series items (documentation
hygiene) moved to DONE — 10 by an in-repo hygiene pass this ledger's own "measured 2026-08-17"
timestamp predates (`a5a05ba7`), and D-10 by advancing two stale submodule pointers
(`fix/docs-full-window-sweep`) onto fixes that already existed on `throughput` and `braden`'s own
`origin/development` — see §2 "D — documentation hygiene" for the row-level evidence.

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
| **DONE** | **51** | Re-measured fixed, with evidence. No work remains. |
| **NOT-A-DEFECT** | **4** | Measured; the item was never a defect. Filed in error or measured wrongly. |
| **SUPERSEDED** | **1** | Already settled by an operator ruling the register post-dates. |
| **PARTIAL** | **19** | Half shipped. Real work remains — counted as open below. |
| **OPEN** | **5** | Untouched, or the fix exists but has not reached the running system. |
| **Total** | **80** | |

> **These numbers are COUNTED FROM THE ROWS, 2026-08-18 — and the previous total was wrong.**
> The table said **87** for as long as this file has existed. There are **80** item rows:
> A 4, AD 11, D 12, K 6, M 10, PF 4, PO 5, T 6, TH 11, V 11 — no gaps in any series'
> numbering, so 87 was never reconcilable with the items it claimed to summarise.
>
> Every earlier figure in this table was a hand-maintained delta on a wrong base, which is why
> three separate lanes each produced a self-consistent set of numbers that disagreed with each
> other and with the rows. The counts above are now derived: read each row's LIVE verdict —
> the last one not struck through — and tally. 32+23+20+4+1 = 80.
>
> Re-derive rather than adjust. A delta applied to a wrong total stays wrong and looks careful.

**Closed: ~~20~~ ~~23~~ ~~26~~ ~~28~~ ~~34~~ ~~37~~ 39. Carrying work: ~~67~~ ~~64~~ ~~61~~ ~~59~~ ~~53~~ ~~50~~ 48** (15 partial + 33 open).

*Merged twice on 2026-08-18, both times as a UNION COMPUTED FROM DELTAS against
the shared ancestor — never by taking a side, because each lane was correct only
about the class it had measured:*

```
shared ancestor : DONE 22  PARTIAL 13  OPEN 48   (+3 NOT-A-DEFECT +1 SUPERSEDED) = 87
this lane       :      +11         +0       -11   the D class (D-1..D-12)
development     :       +2         +1        -3   AD-4 & AD-7 -> DONE, AD-6 -> PARTIAL
union           : DONE 35  PARTIAL 14  OPEN 34   ->  35+14+34+3+1 = 87 ✓
```

*The total is CHECKED to 87 each time rather than asserted. A union of two
independent count corrections is exactly where an off-by-one stops being
visible, and this file has now been through three of them.*

*Third union, same day: this lane moves **M-2** OPEN → PARTIAL (the RDO accrual now
reaches a dollar in `@bsuite/charge-calc`), so PARTIAL +1 and OPEN -1 against the
figures above — DONE 35, PARTIAL 15, OPEN 33, and 35+15+33+3+1 = 87. Checked, not
asserted; three corrections in one day is three chances for an off-by-one.*

**Merge note, 2026-08-18.** This file conflicted between two lanes that had each
re-measured a different half of the M-series. Resolved ROW BY ROW rather than by
taking a side: M-1..M-4 from this lane (the later measurement of the on-cost and
RDO rows), M-5 from `development` (the later measurement, which records
[R80.4#95](https://github.com/GaryOcean428/R80.4/pull/95) closing the shipped
path). Taking either side whole would have silently reverted the other lane's
work — an append-only register's conflict is always a union, never a choice.
The counts above are `development`'s later correction with M-2 moved
OPEN -> PARTIAL, which is this PR's own change; totals are unaffected.

> **One rule applied throughout, because it is where this estate has repeatedly fooled itself:**
> a filed issue is never reported as an addressed defect, and neither is a merged migration. Three
> items in this ledger (T-6, PF-1, and half of P0-4) have a *complete, correct, merged fix* that is
> **not in the running system**. They are counted as open, because the defect is still live.
>
> **ADDENDUM 2026-08-18 — the rule above has a mirror image, and this ledger was caught by it.**
>
> A re-measurement pass took four items (V-10, P0-4, TH-1, TH-9) that had been re-verified against
> live sources as "genuinely open" and found that **three of them already had an OPEN PULL REQUEST
> carrying the fix**: V-10 in bsuite#2065, TH-9's parent-side half in bsuite#2103, and TH-1's
> pointer-dependent figure also in bsuite#2103. The re-measurement was not wrong — it read merged
> state, the live database, the deployed function bodies and the pinned commits, exactly as the
> method note requires. **None of those sources can see an unmerged branch.**
>
> That is a real gap and it costs real work: this lane wrote a complete, mutation-tested
> `Closes #N` sweeper before discovering bsuite#2065, and threw it away. Verifying an item is
> open now takes one more step than the method note lists —
> `gh pr list --state open --search "<the thing>"` — and it belongs alongside the live-source
> checks, not after them. **An open PR is not evidence a defect is fixed. It is conclusive
> evidence that duplicating the work is waste.**

---

## 2. All 87 items

Sizes are S (hours), M (days), L (a week or more).

### P0 — live exposure · 7 DONE, 1 PARTIAL

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| P0-1 | `tenant_encryption_keys` grants full create/read/update/delete to `anon` and `authenticated` | **DONE** | Grants query returns **zero rows** for both roles; positive control on `profiles` returns `anon:SELECT/DELETE`, so the probe sees grants that exist. Live anonymous read → `42501 permission denied`. RLS now forced, 0 policies. | — |
| P0-2 | Migration `20260819010000` merged but **not applied** | **DONE** | Version `20260819010000` **is present** in the applied ledger (max now `20260820300000`). Objects asserted, not inferred: `apprentice_profiles` SELECT is now owner-or-developer; `tenant_app_branding_select_anon` no longer exists; live anon read returns `[]`. | — |
| P0-3 | braden public web pages return zero rows to visitors (bsuite#2004) | **DONE** | Two `{anon}` policies live on `content_pages`/`custom_pages` gated on `is_published`. Live anonymous request returned **2 real published rows** (`privacy`, `terms`) — rendered *and* populated. `custom_pages` returns empty because it genuinely holds 0 rows, not from denial. | — |
| P0-4 | Mail passwords written in plain text; read path expects the vault | **PARTIAL — merged and deployed 2026-08-19; ONLY the migration apply remains** | **Re-measured 2026-08-18, live.** `get_edge_function(email-inbox-sync)` still returns **v43**, `updated_at 1786882342581`, unchanged, and its body still carries `imap_password: string` and `decryptToken(integration.imap_password).catch(() => integration.imap_password)`. Columns: `imap_password_vault_id, smtp_password_vault_id` only. **New finding that changes the fix:** the read RPC the actionable assumed could be used, `email_integration_get_decrypted_token`, **cannot** be called from this function — `service_role` holds EXECUTE on it, but its first statement is `if auth.uid() is null then raise 'not authenticated'`, and a cron/service-role invocation has no user session (`select auth.uid() is null, current_user` → `t, postgres`). A grant that says yes over a body that says no. crm7#1834 therefore adds migration `20260827020000` (`email_integration_service_read_credential`, tenant-blind, granted to `service_role` **only**, explicit REVOKE from PUBLIC/anon/authenticated) plus `_shared/email-credentials.ts` and rewrites `syncImapInbox`. It also closes an **RC5** hole the file already had: `integration_id` came from the request body and the row was read with the service-role client, so any authenticated user could drive a sync of another user's mailbox — now checked against the caller's `sub`. Mutation-tested (7 tests; reinstating the v43 swallow → 2 fail, re-pointing at the auth.uid()-gated RPC → 1 fail; restored byte-identically → 7 pass); full shared suite 445 passed. **Still PARTIAL because merging changes nothing:** deploys run from crm7 `main`, and the migration is authored, not applied. | S |
| P0-5 | Error-report endpoint: no auth, no rate limit, wildcard cross-origin | **DONE** | Live production probe, not a file read: cross-origin request from a hostile origin returns `access-control-allow-origin: https://crm.crm7.app` + `vary: Origin`, not `*`. 30-request/60s limit and 64KB body cap in place. Staying unauthenticated is documented and deliberate. | — |
| P0-6 | `profiles` insert grant on privileged columns survives | **DONE** | Column grants now **SELECT only** on `is_super_admin`/`platform_role`; table grants are `DELETE,SELECT` for both untrusted roles. No untrusted role can insert a `profiles` row at all. | — |
| P0-7 | Platform-kit proxy needs redeploy — client gate was narrowed | **DONE** | Fetched the **live deployed function body** (v58): contains the narrowed gate with no super-admin disjunct, byte-identical to the repo file on `main`. Server is no longer wider than the client. | — |
| P0-8 | Eight live edge functions have no source in any repo (bsuite#1955) | **DONE** | All six survivors now carry repo entrypoints; verified beyond metadata by fetching a deployed bundle and confirming it ships the real shared modules. The other two are deleted, not re-homed. Zero functions estate-wide carry a temp-directory entrypoint. | — |

### M — charge rates and awards · 0 DONE, ~~5~~ **6** PARTIAL, ~~5~~ **4** OPEN

This is the block gating the host money view. It is the least-advanced class in the ledger.

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| M-1 | On-costs are platform-wide, not per-tenant | **PARTIAL** | Payroll tax is **already** state-resolved on both live quote paths, snapshot-carried, and refuses to guess. Superannuation and workers' comp were platform-wide. **RE-MEASURED 2026-08-18, live production `tuybltdrdefjblnplpqo`:** `select count(distinct super_rate), count(distinct workers_comp_rate) from charge_rate_snapshots` -> **13 snapshots, 1 distinct each** — every live quote carries the same platform number. `information_schema.columns` over `%super_rate% %wc_rate% %workers_comp% %oncost%` returned only snapshot/output columns; **no tenant-level on-cost config column existed anywhere in `public`**. `r80_charge_rate_builds` and `r80_payroll_tax_positions` are both 0 rows. crm7 `origin/development:src/lib/chargeRateDefaults.ts:24` still carried the TODO verbatim. **FIXED THIS PASS (parent half):** migration `supabase/migrations/20260827030000_tenant_settings_oncost_config.sql` adds `tenant_settings.super_rate / wc_rate / wic_code` (nullable, fraction-bounded by CHECK, `wic_code` blank-rejected). `tenant_settings` was chosen over a new table because it is already the estate's tenant-preference store, already tenant-scoped, and its policy set is already correct — three nullable columns inherit it, and a new table would have been GRANTed to `anon` at CREATE time. AUTHZ VERDICT stated for all four commands (RC6): SELECT = active members of the tenant; INSERT/UPDATE/DELETE = owner/admin; no `anon` grant (checked in `information_schema.role_table_grants`); no GUC predicate, so RC1 does not apply; the layer changed is SCHEMA only — no policy, grant, query scope or client gate is touched. `@bsuite/charge-calc` 0.14.0 adds the shared reader `resolveTenantOncosts()` / `applyTenantOncosts()` (`src/resolvers/tenant-oncosts.ts`) — precedence `wc_rate` > `wic_rate_lookup.premium_rate` > platform default, a rate outside [0,1] REFUSED not coerced (12 means 12%, not 1200%), fallbacks REPORTED so a UI can say "platform default" instead of presenting a constant as a negotiated rate, and `otOncostFactor` recomputed — without which a tenant premium moves ordinary time and silently not overtime. **MUTATION-TESTED:** delete the `otOncostFactor` recompute -> 1 test red (`expected 0.0955 to be 0.1375`); restored byte-identically (sha256 `131822593c77…`) -> 863/863 green. **MIGRATION REHEARSED, NOT ASSERTED:** the PR's own `supabase-migration-rehearsal` workflow replayed it on a disposable Postgres 17.6 database built from the production baseline (402 public tables, 1148 policies, 1357 anon grants) — `version 20260827030000  scope root  status APPLIED`, object diff `columns: +3 -0`, `constraints: +3 -0`, `comments: +3 -0`, nothing dropped; "Rehearsal PASSED for 1 changed migration(s)." The run's own positive control ("the gate must be seen to fail, in both directions") passed first, so a PASS here is not an instrument that cannot fail. AUTHORED, NOT APPLIED TO PRODUCTION. **STILL OPEN:** crm7's `chargeRateDefaults.ts` must read the columns — a separate repo, so a separate PR. **ORDERING CONSTRAINT MEASURED 2026-08-19, and it is not obvious from this row as written.** Queried live: `information_schema.columns` for `public.tenant_settings` returns **0** of `super_rate`/`wc_rate`/`wic_code`, and `supabase_migrations.schema_migrations` has **no** row for `20260827030000`. So the columns do not exist in production yet. A crm7 reader that NAMES them — `select('super_rate,wc_rate,wic_code')` — returns a PostgREST **400**, and the surface it feeds is the charge rate an operator quotes a host. Writing that PR before the apply would not render a default, it would break the calculator. **There is a shape that is safe to write today, and it is the one the resolver was designed for:** `TenantOncostSettingsRow` declares all three fields OPTIONAL, so a `select('*')` read passes a row whose missing columns are simply `undefined`, `resolveTenantOncosts` falls back to the platform constants, and its `fallbacks` array names what was missing so the UI can say "platform default" instead of presenting a constant as a negotiated rate. The consumer surface is ONE file — `src/pages/charge-rates/create/AdvancedConfigSection.tsx:286,293`, where `superRate` and `wcRate` are passed as `defaultVal`; `quotes/fast/index.tsx` reads only `defaultMargin` and is unaffected. **Left OPEN deliberately rather than half-built:** this is a money-display change and the estate's own gate requires a visual pass on the signed-in route, which an unattended lane cannot perform. **RE-MEASURED 2026-08-19, live production:** migration `20260827030000` is now APPLIED — `information_schema.columns` for `public.tenant_settings` returns all three columns, and `supabase_migrations.schema_migrations` carries the row. The ordering constraint above is resolved. **FIXED THIS PASS (crm7 half):** [crm7#1857](https://github.com/GaryOcean428/crm7/pull/1857) (branch `fix/m1-tenant-oncost-crm7-wiring` off `development`, PR open, NOT merged) bumps `@bsuite/charge-calc` to `^0.14.0` — already the pin on crm7 `development` from an unrelated security bump, so the lockfile diff attributable to this change alone is the 10-line version bump, verified against `origin/development`'s own already-correct `pnpm-lock.yaml` byte-for-byte — and wires `resolveTenantOncosts()` into `AdvancedConfigSection.tsx`: the Superannuation/Workers Comp fields now read the current tenant's `tenant_settings.super_rate`/`.wc_rate`, falling back to the platform constant only when unset, each badged "Tenant rate" or "Platform default" so a constant is never shown as negotiated. **PROVED A FIGURE MOVES, NOT JUST A BADGE:** `tenantOncostFieldsMoveTheRate.test.tsx` drives the real resolver — a tenant with `super_rate=0.15` renders **15**, not the platform's 12; a tenant with nothing configured still renders 12 with a "Platform default" badge; an admin per-quote override still wins over either. All 13 `charge-rates/create` tests pass (`payrollTaxFieldExplains.test.tsx` needed a `useTenantSettings` mock added, since the component now calls a hook chaining through `useAuth`, which throws outside an `AuthProvider`). `npx tsc --noEmit` and `eslint` on every touched file are both clean. **Risk is low today**: every `tenant_settings` row in production still has `super_rate`/`wc_rate` = NULL — no operator has negotiated one yet — so this PR changes rendered output for zero live tenants until one does; `resolveTenantOncosts` falls back to the identical platform constants every tenant sees now. **DELIBERATELY NOT MERGED**, for the same reason the previous pass named: a money-display change needs a live signed-in visual pass (`bsuite-ship-visual-promote`) before promoting past `development`, and this pass had no browser/Playwright access to perform one. VERDICT: still PARTIAL — engineering complete, PR open and green, blocked only on the visual-promote gate. | M |
| M-2 | Rostered-day-off accrual accepted in the UI, never passed to the calculator | ~~**OPEN**~~ ~~**PARTIAL**~~ **DONE — all three conditions met in production 2026-08-19** | **Ledger was stale on the hook and right about the money.** crm7#1800 merged 2026-08-18 and `origin/development:src/hooks/usePlacementChargeCalc.ts:312-341` now builds an `RdoAccrualConfig` and attaches `rdo` to the config — so the stated defect (no `rdo` key, stale "requires 0.2.4" comment) is closed. **But the accrual still did not reach a dollar:** `grep -i rdo` over `packages/charge-calc/src/calculate.ts` returned **ZERO** hits (positive control on the same file: `grep -i payrolltax` -> 5 hits at lines 121/215/220/275/286), and the same zero held in the unpacked published 0.12.0 tarball and in 0.13.0's source. The hook said so itself at line 28 — "calculate() itself does not consume cfg.rdo" — and emitted `rdoWarning` telling the operator to verify the rate by hand. **FIXED THIS PASS:** `@bsuite/charge-calc` 0.14.0 — `calculate()` derives `rdoDaysAnnual` / `rdoHoursAnnual` from `cfg.rdo` and adds the banked hours to `billableHours`. Arithmetic ported from R80.4's engine (`src/awards/calculate.ts:189-200`), which has priced this all along: solving `accrual x (D - r) = hpdPaid x r` gives **13 RDO days / 98.8 h a year** on the 0.4h-per-7.6h-paid-day pattern — exactly the 19-worked-days-per-RDO cl.16 states. **DELIBERATE DIVERGENCE FROM THE ACTIONABLE, and it is a money question:** the actionable asked for `paidPW = workedPW - effRdo`. charge-calc's `hoursPerWeek` is the **PAID** week (its own doc comment, and crm7 passes 38 and deliberately leaves it alone). Subtracting there would pay a full-timer for 36 hours and understate wage, super and leave by the accrual fraction — the same defect in the opposite direction. Under cl.16.2 the accrual is DEFERRED pay, not less pay; annual paid hours do not move. What moves is billable hours, because the host has the worker on site for 8 hours to fund 7.6 paid and is billed for the bank when the RDO is taken. **MUTATION-TESTED:** revert `bHrs` to `billableWk * hpw` -> 3 tests red (`expected 53.6447… not to be 53.6447…`); restored byte-identically (sha256 `84a9423a163d…`) -> 863/863 green, `tsc --noEmit` clean. `enabled: false` (the default) leaves `billableHours` at exactly `billableWeeks x hoursPerWeek`, so no existing quote, golden fixture or published-FWC reconciliation moves. **~~STILL OPEN~~ CLOSED 2026-08-19**, all three measured against production rather than asserted: `npm view @bsuite/charge-calc version` -> **0.14.0**; crm7 `origin/main:package.json` declares **`^0.14.0`** and its lockfile resolves **0.14.0(zod@4.4.3)**; crm7 was promoted in crm7#1848. The wiring reaches the money on `main` — `usePlacementChargeCalc.ts` builds an `RdoAccrualConfig` and the published `calculate.js` carries six `rdoDaysAnnual`/`rdoHoursAnnual` references. crm7#1849 additionally removed the operator warning that had told them the rate did NOT reflect the accrual, which 0.14.0 made false. Superseded: publish 0.14.0, bump crm7's dependency, and promote crm7 `development` -> `main` — `git merge-base --is-ancestor d035a98c origin/main` says NOT on `origin/main`, so until that promotion the wiring does not exist in production at all. | S |
| M-3 | 37 partial rate-scope coverage rows across 16 of 21 awards | ~~**OPEN**~~ **PARTIAL** | **PR R80.4#85 is MERGED** (2026-08-17T15:28:08Z) — the previous entry's "unmerged" is stale. MA000020's Schedule C competency-progression gap is closed; `node scripts/dod.mjs MA000020` at R80.4 `origin/development` (93de4c1) -> **DONE, all 18 benchmarks pass**, including D11 (no RATE-scope clause or schedule left PARTIAL) and D3 (the engine reproduces published FWC figures via `calculate()` — 23 assertions against published dollars, 0 failed; that is the shipped path, not a test-local re-derivation). *Recording a false alarm so nobody re-reports it:* the first run gave 16/18 purely because the worktree had no `node_modules` (`ERR_MODULE_NOT_FOUND '@bsuite/charge-calc'`); after `pnpm install --frozen-lockfile` it is 18/18. **LIVE DB unchanged:** `select award_code, count(*) from public.award_trades group by 1` -> a single row, `MA000020: 27`. MA000020 is still 100% of live placements, so the re-scope holds and **nothing on the money path is outstanding**. **COUNT CORRECTED AGAIN, and the wrong way:** walking `src/awards/coverage/*.json` for `status=PARTIAL & scope=RATE` gives **66 RATE-scope partials across 17 of 23 ledgers** — not 39/17. It moved because two new ledgers landed carrying 35 partials between them (ma000003: 18, ma000018: 17). Remainder, re-tallied independently by walking every ledger: ma000071 5; ma000009/ma000017/ma000029/ma000073 3 each; ma000010/ma000026/ma000104/ma000119 2 each; ma000033/ma000036/ma000058/ma000059/ma000089/ma000101 1 each. **MA000020: zero.** POSITIVE CONTROL on the walk: it saw all four `status` values (MODELLED 594, NOT_APPLICABLE 265, PARTIAL 202, EXCLUDED 15) and all three `scope` values (RATE 587, PROCESS 299, PAYRUN 190), so the 66 is a filter that works, not one that matched nothing. The lesson to carry: this count tracks how many awards have been LEDGERED, not how much is unmodelled — "partials fall over time" is not what the data does. **RE-MEASURED 2026-08-19:** `node scripts/dod.mjs MA000020` at R80.4 `origin/development` (3a92992) -> still **DONE, 18/18 benchmarks**, D11 and D3 both PASS. Live `award_trades`: unchanged, `MA000020: 27`, 100% of placements. The RATE-scope PARTIAL count, read directly from each ledger's own precomputed `verdict` string rather than re-derived by hand, is **unchanged at 66 across 17 of 23 ledgers**: MA000003 18, MA000018 17, MA000009/017/029/073 3 each, MA000010/026/104/119 2 each, MA000033/036/058/059/089/101 1 each = 66. MA000020 remains 0. Nothing moved on the money path since the last measurement — the earlier finding stands. (Note for M-4, below: MA000003 and MA000018, the two largest partial counts here, are also the two awards still missing an allowance catalogue — same two awards, same root cause: least-built-out ledgers in the corpus.) | L |
| M-4 | Allowance catalogue covers 8 of 21 awards | ~~**OPEN**~~ **PARTIAL** | **Re-measured by EXECUTION, not grep:** `awardsWithCatalogues()` at R80.4 `origin/development` -> **10 adapted awards** (MA000004, MA000005, MA000009, MA000010, MA000014, MA000017, MA000020, MA000025, MA000026, MA000036) against `ls src/awards/coverage/*.json wc -l` = **23** ledgers. So it is **10 of 23**, not 8 of 21 — two adapters and two ledgers both arrived, ratio unchanged at ~43%; 13 awards still fall through to the honest "no allowance catalogue wired yet" branch. MA000020 confirmed in scope by execution: `allowanceCatalogue('MA000020','commercial_construction')` -> `adapted=true`, 26 allowances, 7 `notRateable`, all-purpose set includes "Industry allowance — general building and construction" (the cl.22.1(a) row that moves the ordinary wage). With `award_trades` at 27 rows all MA000020, the adapted set covers **100% of live placements**. **No code change made, and none is warranted:** the 13 unadapted awards carry zero live placements. This is a scoping decision for the operator, not engineering work — either re-scope the item to "MA000020 adapted and proven" and close it, or carry the other 13 as multi-award-UI work, which is where M-5's 360 unreached per-award constructors also belong. **RE-MEASURED 2026-08-19, and it moved a lot:** `awardsWithCatalogues()` at R80.4 `origin/development` (3a92992) now returns **21 adapted awards** — MA000004, 005, 008, 009, 010, 014, 017, 020, 025, 026, 029, 033, 036, 058, 059, 071, 073, 089, 101, 104, 119 — against 23 coverage ledgers: **21 of 23**, up from 10 of 23 on 2026-08-18. Ten awards gained a catalogue since: MA000008, 029, 033, 058, 059, 071, 089, 101, 104, 119. Only **MA000003 and MA000018** remain without one — the same two awards M-3 (above) flagged as "NOT STARTED" and carrying the largest RATE-scope partial counts (18 and 17); that is not a coincidence, they are the two newest, least-built-out ledgers in the whole corpus. MA000020 confirmed unchanged: `allowanceCatalogue('MA000020','commercial_construction')` -> `adapted=true`, 26 allowances. `award_trades` is still 100% MA000020, so live-placement coverage was already complete either way — but the operator scoping question this row raised on 2026-08-18 ("re-scope to MA000020-only and close, or carry the rest as multi-award-UI work") is now materially smaller: **2 awards outstanding, not 13**, and both are the same 2 blocking M-3. VERDICT: still PARTIAL, gap narrowed from 13 awards to 2. | L |
| M-5 | The award engine is not wired to the calculator | ~~**OPEN**~~ **PARTIAL** | Measured, not read: **610 public engine functions, 80 reached, 388 unreached**, of which 362 are per-award constructors. The main rate constructor has zero non-test importers. The calculator says so itself in a source comment. **RE-MEASURED 2026-08-18 — the headline was already wrong, and the sharp claim underneath it was right.** `node scripts/reachability.mjs` at `R80.4@origin/development` reports *609 public engine functions: 82 reached, 141 internal, 386 unreached*, and **PASS** — every unreached function is declared with a named consumer, and the gate runs in CI (`.github/workflows/verify.yml:50` runs `pnpm run audit`, whose chain includes `pnpm run reachability`, non-zero on an undeclared UNREACHED). The engine *is* wired for the money: `charge-calculator-v9-2.tsx` imports 30+ engine modules by path, `calculate` is REACHED, and `dod.mjs` D3 reconciles 23 assertions against published FWC dollars through it. **But `resolveOrdinaryRate` genuinely had zero non-test importers** — it read INTERNAL only because it and `ordinaryHourlyOrThrow` call *each other*, the tool's own degenerate case, and everything behind it (Schedule E NTW allocation, `ntwRateFor`, `allocateWageLevel`) was dark with it. **CLOSED for the shipped path** by [R80.4#95](https://github.com/GaryOcean428/R80.4/pull/95): `src/awards/mapd-wage-apply.ts` routes the calculator's apprentice wage input through `resolveOrdinaryRate()`, and `calledBy` moves from `resolve-ordinary-rate.ts` to `mapd-wage-apply.ts`, which the calculator imports. It also fixes a money defect found on the way: `applyWages()` took whichever MAPD row for a year sorted **last**, and MAPD publishes a base *and* an Ordinary-hourly card for the same grade — so all-purpose was counted twice whenever the ordinary row landed last, and the same click was correct when it did not. Now base-first by rule, ordinary only with a named warning, refusal instead of a figure, untouched wage instead of a zero. Mutation-proved: `prefer:"base"` flipped to `"ordinary"` turns 3 of 11 new assertions red; restored byte-identically (`sha256 1190a03e…`), 11/11 green. Gates: `pnpm run audit` **exit 0**, `pnpm run verify` **exit 0** (2924 assertions, 0 failed). Left **PARTIAL, not DONE**: the 360 per-award constructors stay correctly deferred to the unbuilt multi-award UI and should be split out of this item. **RE-MEASURED 2026-08-19:** `node scripts/reachability.mjs` at R80.4 `origin/development` (3a92992) -> **616 public engine functions: 88 reached, 142 internal, 386 unreached**, still **PASS** — every unreached function carries a named consumer, and the 360-per-award-constructor group is unchanged. Reached moved 82->88 and internal 141->142 since 2026-08-18: incremental progress, not a regression; the gate stays green and CI-enforced. No new work needed this pass. VERDICT unchanged: PARTIAL — shipped path closed via R80.4#95, the 360 per-award constructors correctly deferred to the unbuilt multi-award UI. | L |
| M-6 | Sector-alias bug in the allowance catalogue | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Defect real at the cited line, but **the register names the wrong award**. The resolver exists and is applied on one quote path but not at the two UI call sites. Larger effect is cross-award: the sector defaults to a value belonging to a *different* award for **every** award, silently dropping all 23 sector-tagged rows of MA000017. **Re-measured 2026-08-18 BY EXECUTION, using the repository's own runner. Both rules the row names are implemented and asserted — `node src/awards/allowance-catalogue.test.ts` -> **12 passed, 0 failed**, including: *"a SELECTABLE sector the award does not name still gets its industry allowance"* (the alias resolution) and *"a sector from ANOTHER award's vocabulary filters nothing, rather than everything"* — which is exactly the cross-award defect this row describes, where MA000020's sector filtered all of MA000017's rows to none while still reporting `adapted: true`. *Recording a false alarm so nobody re-reports it:* running that file under **vitest** shows "0 test / failed". R80.4 does not use vitest — `scripts/run-tests.mjs` spawns every co-located `*.test.ts` with bare node, so `process.exit()` is the correct convention here and vitest is the wrong tool. The suite is fine; the runner was mine.** | S |
| M-7 | `award_rates` empty while `awards` has 156 | **OPEN — CONFIRMED still open** | Confirmed live: **`award_rates` = 0, `awards` = 156**. Sharper than the register: `award_classifications` is **also 0**, and it is the parent key — so rates *cannot* be seeded until classifications are. **RE-MEASURED 2026-08-18, unchanged in every figure** — `awards` 156, `award_classifications` 0, `award_rates` 0, `award_trades` 27. Positive control on the zeros: the same statement returned 156 and 27 for the sibling tables, so the connection, schema and grants are fine and the zeros are real absences. **AND THE LEDGER'S OWN PROPOSED FIX DOES NOT WORK — that is the finding, and it is why the item did not move.** (1) The deployed `sync-award-rates` (v30, ACTIVE, body fetched live rather than read from the repo) writes to **`award_rate_cache` and `award_templates` only**. It contains no write to `award_classifications` or `award_rates` at all, so running it — or `refresh-award-rates`, or `fairwork-enhanced` — seeds neither table. (2) `award_rate_cache` is **also 0 rows**, so that sync has never succeeded in production either; `award_templates` holds 15 rows from some earlier run. (3) crm7 ships `supabase/migrations/20260304090000_schedule_sync_award_rates_cron.sql`, but the **live `cron.job` table holds 16 jobs and none of them is an award-rates job** — nothing has ever triggered it. (4) The consumer is real and permanently empty: crm7's `src/components/entity/selectors/AwardRateSelector.tsx` queries `award_rates` with the embed `classification:award_classifications(…, award:awards(name))`, so the dropdown renders nothing and will keep doing so. **What this needs is an operator decision, not a code change**: a Fair Work API credential plus a production reference-data load across 156 awards (all 156 do carry `fwc_award_fixed_id`, so the load is possible), and a ruling on whether these rows are global or tenant-scoped — `award_rates.tenant_id` is nullable and its RLS is `admin_manage_award_rates` (ALL) plus a platform-developer read. Authoring a seeding migration without applying it would move nothing and prove less. **Re-measured 2026-08-18 against live production: `public.awards` holds **156** rows and `public.award_rates` holds **0**. Exactly as filed, and it is the load-bearing gap in the money chain — every rate resolution has nothing to resolve against. Needs a Fair Work credential and an operator ruling on global-versus-tenant rate rows before it is engineering work.** **RE-MEASURED 2026-08-19, live production:** `awards` 156, `award_classifications` 0, `award_rates` 0, `award_trades` 27, `award_rate_cache` 0, `award_templates` 15 — every figure unchanged. **One thing DID change, and it still does not close this row.** `cron.job` now holds a `sync-award-rates-weekly` job (id 175, schedule `20 2 * * 0`, active=true) that did not exist at the last measurement — migration `20260822040000_schedule_sync_award_rates` has since been APPLIED. But: (1) **it has never run** — `cron.job_run_details` has zero rows for job 175 (first scheduled fire 2026-08-23), and when it does fire it will fail immediately, because the vault secrets it depends on do not exist — `vault.secrets` holds 19 named rows and neither `sync_award_rates_url` nor `sync_award_rates_token` is among them, so the job's own `RAISE EXCEPTION 'sync-award-rates cron: vault entry missing...'` guard will fire on first run; (2) **even fixed, it cannot seed the tables this row is about.** Re-read live: `crm7/supabase/functions/sync-award-rates/index.ts` writes only to `award_rate_cache` (line 255, `.from('award_rate_cache').upsert(...)`) and `award_templates` (line 322) — grepping every `crm7/supabase/functions/*` and every migration for a writer to `award_classifications` or `award_rates` turns up nothing except a defensive backfill (`20260422075100_phase2_medium_fks.sql:235`, `INSERT INTO public.award_rates`) that only fires when `award_classifications` already holds at least one row to backfill from, which it never does live. So scheduling this function, even correctly, moves `award_rate_cache`/`award_templates` at best — `award_classifications`, the parent key, and `award_rates` stay at zero regardless of whether the cron job ever succeeds. VERDICT: still OPEN. Two distinct next actions, both operator-side, not engineering: (a) seed `sync_award_rates_url`/`sync_award_rates_token` in vault so the now-scheduled cache sync stops throwing on its first Sunday run — mechanical, but does not touch this row's headline gap either way; (b) **operator-determination-required**, unchanged from the last pass: a Fair Work API credential plus a ruling on whether `award_rates` rows are global or tenant-scoped (`award_rates.tenant_id` is nullable either way), before any seeding migration for `award_classifications`/`award_rates` can be authored without fabricating the determination the ruling exists to make. | M |
| M-8 | Penalty calculator has zero consumers | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | All five exported symbols return zero hits outside the module, its barrel and its own test. Positive control: the same grep did find the barrel and test lines. **Re-measured 2026-08-18 against the SHIPPED path, and the first search was wrong: `penaltyCalculator` / `calculatePenalt` return zero because those are not the export names. The real exports are `penaltiesFor` and `penaltiesForSector`, and `charge-calculator-v9-2.tsx` — the shipped calculator — imports both: `penaltyModuleFor` from `src/awards/penalty-module-manifest.ts` at line 65, and `penaltiesForSector` from `src/awards/ma000020-penalty-rows.ts` at line 190. `calculate.ts` takes `penalties` as an input at line 57. Production consumers outside the defining modules: `penalty-module-manifest.ts`, `ma000025-shiftwork.ts` and the barrel. "Zero consumers" was true of a name nothing is called.** | M |
| M-9 | Quote transport from the calculator to the CRM is still a paste box | ~~**PARTIAL**~~ **DONE — merged and promoted 2026-08-19** | **Receiving half live** — both mint/redeem functions exist and the receiving page calls redeem; the paste-box page is documented as demoted to fallback. **Sending half absent** — zero references to the mint function in the calculator repo; it still copies to the clipboard. Both tables 0 rows, consistent with nothing minting. **RE-MEASURED 2026-08-18 and then closed.** Confirmed absent first: `grep -rn 'mint_quote_handoff_token\ quote_handoff'` over R80.4 `.ts/.tsx/.mjs` returned **0 hits**, positive control `grep '\.rpc('` returned `src/lib/supabase.ts:14`, so the search reached those files. Live corroboration that nothing had ever transited: `quote_handoff_tokens` **0**, `charge_rate_quotes` **13**, of which `r80_export_quote_id is not null` gives **0**. **Sending half built** in [R80.4#95](https://github.com/GaryOcean428/R80.4/pull/95): `src/lib/quote-handoff.ts` mints a token from the unchanged `buildExportPayload()` output and returns the `/charge-rates/from-r8?handoff_token=…` link crm7 already serves; a **Send to crm7** row now sits beside Copy/Download in the rate-card panel. Placed in `src/lib`, not `src/awards`, so `quote-store.ts`'s own boundary test still holds — `grep -rln "lib/supabase" src/awards/` still prints only that file. **Live proof, not an assertion:** rehearsed against production inside `BEGIN … ROLLBACK` with the exact payload the builder emits, giving `ok=true`, a 64-hex token and an expiry, with `quote_handoff_tokens` still **0 rows** afterwards; negative control with no `auth.uid()` returned SQLSTATE **42501**, `mint_quote_handoff_token: authentication required`, which is the literal string the not-signed-in message keys on. Plus 11 new unit assertions against a fake client. Every claim that stopped being true moved in the same change — panel copy, both export messages, `doExport`'s comment and `quote-store.ts`'s header. Closes [R80.4#13](https://github.com/GaryOcean428/R80.4/issues/13). **Not DONE-DONE until #95 merges.** | S |
| M-10 | Traineeships, casual, contractor and part-time cannot be priced | **PARTIAL** | Three of four now price: engagement selector, full/part-time, casual, and trainee wages all ship and their tests pass 10/10. **Contractor/ABN genuinely absent** (zero hits estate-wide) — and it is already deprioritised in its own tracking issue. The two issues cited should be closed against shipped work. **RE-MEASURED 2026-08-18, and the "close both issues" instruction was WRONG — corrected rather than followed.** The three shipped limbs are confirmed at `R80.4@origin/development`: `calc-types.ts:148` declares `EmploymentType = "fullTime" \ "partTime" \ "casual"` and `:249` makes `empType` a **`calculate()` input**, not display state; `quote-inputs.ts:84` carries the labour-hire `"worker"` engagement; `charge-calculator-v9-2.tsx:4499` maps `worker` to MAPD rate type `AD`; `calculate.ts:94-97` moves the figure off `empType`. `pnpm run verify` gives **2924 assertions, 0 failed**, including "the engine can now PRICE a casual at all" and "an APPRENTICE asked as casual is refused, not silently loaded". Contractor/ABN still absent: `grep -rni 'contractor\ abn'` non-test returned **0 hits**, positive control `grep -rni 'casual'` over identical paths returned **1214 hits**. **But R80.4#46 could not be closed against that**, because its own acceptance criteria name **four** selectable engagement types and ABN is one of them — closing it would have been a doc saying done. Instead it was **retitled** (the old title misreported the product), given a file:line evidence comment, narrowed to the one remaining limb, and left OPEN alongside #5, which stays open as the recorded deferral for the ABN *treatment*. The two now describe the same single remainder and should close together. **RE-MEASURED 2026-08-19:** `grep -rni 'contractor\|abn'` over non-test `src/` at R80.4 `origin/development` (3a92992) -> still **0 hits**; positive control `grep -rni casual` over the same paths -> **1188 hits** (down from 1214 on 2026-08-18, consistent with ordinary refactor churn, not a grep regression — the pattern still clearly fires and the control still passes). Contractor/ABN pricing remains genuinely unbuilt. VERDICT unchanged: PARTIAL — three of four engagement types price, contractor/ABN stays the recorded deferral (R80.4#46 retitled + #5). | S |

### T — transaction integrity · 5 DONE, 1 OPEN

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| T-1 | Timesheet transition has no state guard; concurrent approve/reject is last-write-wins | **DONE** | Update now carries an expected-state predicate; zero rows re-reads the winner and throws **before** the audit event is written, so no audit record can disagree with the final state. 61/61 tests pass. | — |
| T-2 | Leave approval can double-approve, double-counting leave taken | **DONE** | Both halves fixed: status predicate on the update, and the read-modify-write is now a bounded compare-and-set retry loop. Confirmed the balance column is `NOT NULL DEFAULT 0`, so the predicate has no null-never-matches trap. | — |
| T-3 | Recipient-created tax invoice number uses `Math.random()` against a unique index, no retry | **DONE** | Retry loop on duplicate-key; `Math.random()` replaced with a cryptographic generator using rejection sampling; the retry is narrowed to the invoice-number index so the *other* unique index surfaces immediately instead of burning attempts. | — |
| T-4 | Employee-number minting has no duplicate-key retry | **DONE** | Retry loop present; on collision it advances to the **next** sequence value rather than redrawing the same one. Exhaustion returns a structured error instead of leaking the raw database message to payroll. | — |
| T-5 | Calculator failure swallowed — UI cannot tell "no rate" from "bad config" | **DONE** | Bare catch gone; a typed failure reason is returned alongside the error and the UI renders a distinct branch for it. Hook and component tests added and passing. | — |
| T-6 | Funding-offset delete/insert role parity | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | **Live policies unchanged**: delete grants `{owner,admin}`, insert/update grant `{owner,admin,manager}` — I re-queried this myself. The fix migration exists but is **absent from the applied ledger** and lives only on `development`. *Zero percent of this defect is remediated in the running system.* Two cautions: its version sorts *below* an already-applied one, and 28 other tables share the same asymmetry. **Re-measured 2026-08-18: crm7 migration `20260820150000_funding_offsets_delete_role_parity.sql` is APPLIED in production — version 20260820150000 is present in `supabase_migrations.schema_migrations`. The migration is self-asserting: it RAISES if `funding_offsets_delete` was not created, and RAISES again if the policy expression does not grant manager, so a silent partial apply is not possible.** | S |

### K — invented data reaching the user · ~~0 DONE, 5 OPEN~~ **1 DONE, 4 OPEN** (+1 class-level finding)

*Recount 2026-08-18: **K-2** closed — see its row.*

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| K-0 | *(class-level, not one of the 87)* The shared "data unavailable" component shipped and nobody can use it | ~~**PARTIAL**~~ **DONE — re-measured 2026-08-19** | Component exists and is exported, but the package version carrying it is **unpublished** — both apps still resolve the older version. Zero adoption in either app (positive control confirms the grep reaches both trees). **Until it is published the fix is unreachable from the product.** **ALL THREE CLAIMS ARE NOW FALSE, re-measured 2026-08-19.** *Unpublished:* `@bsuite/ui` is at **1.2.0** on the registry and its published `dist/index.d.ts` exports `DataUnavailable` — checked by unpacking the tarball, not by reading the workspace source. *Both apps resolve the older version:* crm7 and business-suite-unified each declare `^1.2.0` and each lockfile resolves `1.2.0`. *Zero adoption:* **five files each**, and the import is `from '@bsuite/ui'` in every case — not a local re-implementation. crm7: `lib/schemaLag.ts`, `components/platform/SchemaLagBanner.tsx`, `pages/financial/budget/`, `pages/hr/termination.tsx`, plus its guard test. BSU: `Developer/Platform.tsx`, `GTO.tsx`, `Admin/SystemOverview.tsx`, `Admin.tsx`, plus its guard test. **The K-series surfaces this component was built for are exactly the ones now using it**, which is the adoption the row asked for rather than a bare export count. | S+M |
| K-1 | Budget page renders invented figures behind a fake delay, with a working Export | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Confirmed at the cited lines including the artificial 1-second delay and the export writing fabricated dollar totals to file. **Worse than filed:** zero tables matching `budget` exist in production (positive control found one for a different pattern) — there is no backing store at all, so this is pure fabrication. **Re-measured 2026-08-18 by reading what the page RENDERS, not what it mentions. `crm7/src/pages/financial/budget/index.tsx` now returns a single `DataUnavailable state="unavailable"` block: *"No budgets source is connected. This module has not been built yet — this is not a zero and not an empty list, there is nothing to query."* No `DUMMY_BUDGETS`, no `setTimeout` delay, no export handler — the words survive only in the header comment recording what the surface used to do. 3 tests pass.** | L or S |
| K-2 | Compliance page returns a fabricated 95% score on any query failure | **DONE — 2026-08-18** | Re-measured: the CATCH half the register names was already fixed on `development` (the block now reads "DO NOT FABRICATE" and rethrows; no `DEMO_STATS` survives). **The surviving half was the divide-by-zero guard:** `GTO.tsx:200` read `totalChecks > 0 ? … : 95`, so a tenant with zero apprentices, zero host employers and zero site visits — the most likely first-customer state — got a green 95% ring computed from an empty set. **Confirmed live in production** before the fix: `curl https://suite.crm7.app/assets/GTO-DMPQFw8A.js` contains `p=d>0?Math.round(f/d*100):95` (positive control: `not_tracked` present in the same chunk, so it is the GTO compliance page). Now `computeOverallScore()` returns `number \ null`, `ComplianceStats.overallScore` is nullable, and `ScoreCard` renders `DataUnavailable state="empty"` instead of a ring. Mutation-tested: restoring `return 95` turns 3 of 8 assertions RED; restoring the fix byte-identically returns 8/8 GREEN. | S |
| K-3 | Health surfaces fall back to invented state | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Confirmed — and the register **mislocated one site**. There are **three** fallbacks across **two** files, not two: two in the platform page, plus an unregistered third asserting "Checking…"/"Not monitored" for database, auth, storage and API. On error these render "checking…" forever. **Re-measured 2026-08-18: `PLACEHOLDER_CHECKS` is gone from `Developer/Platform.tsx`, and the file says why in its own words — *"Deleted outright. The render now branches on the query state instead."* The remaining `Checking…` string is the live button label (`{checking ? 'Checking…' : 'Re-check'}`), not a fallback row. The original defect is worth keeping visible: a health panel that says "Checking…" forever reads as *in progress*, so nobody investigates, and the one surface whose job is to report breakage was structurally unable to report its own.** | S |
| K-4 | Invented milestones in the field-officer visit schedule | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Four hardcoded dates passed into the same component that receives **live** events from the real store. The two halves render together, so the invented half inherits the live half's credibility. **Re-measured 2026-08-18 at the named surface: `crm7/src/pages/field-officers/site-visits/index.tsx` contains **zero** hardcoded date literals, and its test suite asserts the invented ones are absent by name (`expect(body).not.toContain('2025-02-01')`, `'2025-05-01'`, `'2028-02-01'`) — a negative assertion, so the fix cannot silently regress. *Separately noted, not folded in:* `site-assessment.tsx:58,65` still carries `dueDate: '2025-05-20'` / `'2025-05-15'`. That is a different surface from the visit schedule this row names, and is left for its own row rather than quietly counted here.** | S |
| K-5 | Login-client registry hardcoded twice in the admin UI, status asserted not read | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Two copies, every entry with a literal `active` status. **New measurement: three of five domains have drifted** from the live records — the admin screen of the login server currently displays three wrong domains. The live table is not directly readable, so a database function is needed before either copy can read truth. **Re-measured 2026-08-18. The row said a database function was needed before either copy could read truth — it exists and is APPLIED: `20260821050000_platform_oauth_client_registry.sql`, version present in `supabase_migrations.schema_migrations`. `src/lib/oauthClients.ts:74` now calls `supabase.rpc('platform_oauth_clients')` and `Admin.tsx:25` imports `fetchOAuthClients`. Both hardcoded copies are gone; `status: 'active'` survives only in comments recording the old shape and in unrelated types.** | M |

### A — ratified decisions never implemented · ~~0 DONE, 4 OPEN~~ **3 DONE, 1 PARTIAL — corrected 2026-08-17, same day, hours later**

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| A-1 | ADR-0005 (funding authoring) never built | ~~**OPEN**~~ **DONE** | All three named objects resolve to null; positive control on the same queries returns a real table and 5 real functions, so the instrument finds what exists. The ADR's chosen home — a Developer Portal in the CRM — **does not exist in that app at all**. Adjacent progress landed today (program *identity* now reads from a table) but **not amounts**: the amounts field is empty on all 4 rows. Two of the ADR's premises are now stale. **CORRECTION, same day:** the premises are still stale, and by design — an operator ruling (2026-08-06) already forbade building this, so the fix is not code, it is the record. `docs/adr/ADR-0005-rams-funding-authoring.md` now carries a superseded banner above the unaltered original text, citing the ruling, the 4 removed modules (~2,056 lines), and the live-catalog re-measurement. Merged: [bsuite#2053](https://github.com/GaryOcean428/bsuite/pull/2053). The feature correctly remains unbuilt; what was open was the document's silence, not the missing table. | L |
| A-2 | ADR-0007 (payments foreign-data-wrapper) dead — and unbuildable as filed | ~~**OPEN**~~ **PARTIAL** | Extension absent, schema null, zero foreign servers. The migration **can never apply from disk** for two independent reasons: it is stamped below the migration floor, *and* its version collides exactly with another file. Its tracking issue was closed "completed" with **zero objects installed**. An operator ruling narrows the blast radius to one surface that does not yet exist. Applied ledger is now **699 entries, not 594**. **CORRECTION, same day:** the document defect is recorded — `docs/adr/ADR-0007-stripe-fdw-read-doctrine.md` carries a banner with the same table above, a retirement recommendation, and explicit acknowledgment that only the operator can change `Status:` from Accepted. Re-verified independently, not just trusted from the banner: `20260512161000` is **below the 20260611000000 floor** *and* collides byte-for-byte with `20260512161000_developer_portal_branding_scope_rls.sql` — confirmed by listing `supabase/migrations/` directly. A full-tree grep (parent repo; submodules not checked out from this worktree) finds `stripe_wrapper`/`stripe_server`/`stripe.*` referenced **only** inside the unapplied migration file itself — nothing reads it because the schema was never created for anything to read. **Retire-or-keep is still an operator call** — see §6 "Needs an operator ruling", item 2, below. Left **PARTIAL**, not DONE, because that call is outstanding. **RE-VERIFIED 2026-08-19, UNCHANGED:** `docs/adr/ADR-0007-stripe-fdw-read-doctrine.md` still reads `Status: Accepted (2026-05-12) — unimplemented; retirement recommended, pending operator ratification`; the operator decision register has no ADR-0007 entry; both colliding migration files (`20260512161000_stripe_fdw_wrappers.sql`, `20260512161000_developer_portal_branding_scope_rls.sql`) still exist unchanged. No operator ruling landed; nothing for this lane to act on without one — flagged again, not re-argued. | M |
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

### AD — shipped but not reaching the product · ~~0 DONE, 3 PARTIAL, 6 OPEN, 2 NOT-A-DEFECT~~ ~~2 DONE, 2 PARTIAL, 5 OPEN, 2 NOT-A-DEFECT~~ **4 DONE, 2 PARTIAL, 1 OPEN, 2 NOT-A-DEFECT**

*Recount 2026-08-18: **AD-1** closed by this lane; **AD-2** found already closed on every app's `origin/development` — see its row for why the pinned-commit measurement said otherwise.*

*Merge, 2026-08-18: two lanes each closed a different half of this section and
conflicted. Resolved PER ROW, not by taking a side — `development` had advanced
AD-1 and AD-2, this lane had advanced AD-4, AD-6 and AD-7, and AD-3/AD-5 were
identical on both. Taking either side whole would have reverted the other
lane's measurements. The section counts above are recomputed from the resolved
rows rather than carried over from either header, because both headers were
correct only about their own half.*

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
gitlink. AD-4 and AD-7 then went further and are recorded DONE: both were driven once against
the `E2E Fixture Tenant (do-not-delete)`, each with a negative control from the Tenant-B
fixture user, and every one of the five row counts they are measured on moved off zero.*

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| AD-1 | Page-builder package reaches 1 of 5 apps | **DONE — 2026-08-18** | The version half was already done (all five lockfiles resolve 0.9.0, identical integrity hashes). The adoption half is now done too: `DraggableCardPage.tsx` and `CanvasCard.tsx` in **crm7, throughput and braden** were full hand-copied implementations (262/51, 218/42, 202/42 lines) of an algorithm the package ships. All six now delegate — `CanvasCard` is a bare re-export, `DraggableCardPage` is a thin adapter passing `gridComponent` (the app's own PageGridLayout adapter) and `layoutEpoch` (**101** in crm7, **100** in braden/throughput — deliberately per-app, since each has its own history of persisted layouts). Permission gating stays in crm7 because the package refuses to model an app's permission vocabulary. **817 duplicated lines → 6 thin files.** Proof: crm7's pre-existing `DraggableCardPage.test.tsx` + `.dropped-child.test.tsx` + `draggable-card-page-children.test.ts` (38 assertions covering widths, 12-col wrap, autoHeight, Fragment flattening, dropped children, the permission gate) pass **unchanged** against the delegated implementation. One assertion was deliberately strengthened: `compactType` is now not forwarded at all rather than forwarded as `null` — it had zero call sites and the adapter stripped it anyway (bsuite#1588). | M |
| AD-2 | Shared card scanner adopted by nobody | **DONE — already, by another lane; confirmed 2026-08-18** | **This lane was measured against the PINNED submodule commits and that base was stale.** At the pins (crm7 `272e926e`, BSU `39b94356`, conduit `55b89c79`, throughput `259b77c1`, braden `8a2bd0bb`) the count is genuinely zero — which is what the 2026-08-17 pass recorded. Re-measured at each app's **`origin/development` HEAD**, `git grep -l 'page-builder/scanner'` returns **one hit in every one of the five** (`src/__tests__/card-unglue-contract.test.ts`), landed after the pins. The adoptions are real, not stubs: each imports `scanCardSurfaces`, asserts `scanRootsResolved` and `filesScanned` as a positive control, keeps its own stricter checks alongside rather than replacing them, and adds a failing-by-default `PENDING_SHARED_SCANNER_NO_GRID_EXCLUSIONS` ledger with a staleness assertion — crm7 42 entries, braden 10, throughput 1, BSU and conduit their own. **A duplicate implementation was written by this lane and then deleted unmerged**, because landing a second, competing migration would have destroyed those ledgers and re-created exactly the divergence AD-2 exists to end. **The lesson is the item's own lesson, one level up:** measuring an adoption question at a submodule POINTER measures the parent's last promotion, not the submodule's current state — the pin is the thing that was stale, not the finding. | M |
| AD-3 | Four-axis identity model — schema shipped, data empty | **OPEN — population plan below; re-verified 2026-08-17 and CONFIRMED unchanged 2026-08-18** | Five registers at 0 rows (`skill_sets`, `non_accredited_training`, `worker_licence_classes`, `training_packages`, `qualification_occupation_links`); no global qualification rows; `award_trades` 27 rows all `MA000020`. **Register wrong twice:** two person-level links are 16/50 populated, not 0; and the join column DOES exist — `placements.trade_id`, 0/34 populated, no FK. **The FK is IMPOSSIBLE, not missing, and that distinction is the point:** the column is `text` and correctly so (it targets `award_trades.trade_id text`, not `award_trades.id uuid` — `entities.ts:494` and `r80DeepLink.ts:24` both say so). But the only unique index on that pair is `award_trades_global_unique … WHERE tenant_id IS NULL` — a **partial** index, which Postgres will not accept as a foreign-key target. Adding a non-partial unique constraint would work and would also **forbid tenant-scoped trades**, which the partial predicate exists to permit. So this is a design fork, not a missing line of DDL. The real gap remains data population, which no agent can fabricate — **see "AD-3 — the data-population report" below** for what would populate each register, in what order, and what is blocking the one link that was called "free." **Re-verified 2026-08-18 by read-only SQL against `tuybltdrdefjblnplpqo`: every number reproduces EXACTLY** — five registers at 0; `qualifications` 6 total / 0 global; `units_of_competency` 160; `award_trades` 27 rows, `count(distinct award_code)=1`, `MA000020`; `placements` 34 rows / `count(trade_id)=0`; no FK on `placements` mentioning `trade_id`; `award_trades` unique indexes = `award_trades_pkey partial=false \ award_trades_global_unique partial=true`; `people` 50 with qualification_id 16, trade 16, anzsco 0, training_package_code 0. **Nothing has moved, and nothing in this lane could move it:** part (a) is a design fork needing an operator ruling (non-partial `UNIQUE(trade_id)`, which forbids tenant-scoped trades, versus no FK plus a trigger check) and part (b) needs training.gov.au / ANZSCO payloads this estate does not hold. Left OPEN rather than manufacturing work against an unmade ruling. **Re-measured 2026-08-18 against live production: `skill_sets` **0**, `non_accredited_training` **0**, `worker_licence_classes` **0**, `training_packages` **0**, `qualification_occupation_links` **0**; `award_trades` **27**. Identical to the filing. The schema is shipped and the registers are empty — this is a data-population question, not an engineering one.** **RE-VERIFIED 2026-08-19, UNCHANGED:** all five registers still 0 rows, `award_trades` still 27. No operator ruling on the FK design fork has landed; no training.gov.au/ANZSCO import has run. Nothing for this lane to move without one. | L |
| AD-4 | Self-service onboarding built and never opened | ~~**OPEN**~~ ~~**PARTIAL**~~ **DONE** | **0 of 50** people rows carry a login link; 0 portal invites. The surface has never been exercised once. **CORRECTION, 2026-08-18 — the reason it was never exercised was a build defect, that defect is fixed, and the fix had never reached the parent.** Re-measured live: `people` still 50 rows with `count(user_id)=0`, `people_portal_invites` still 0 — the row counts are unchanged and this row is NOT being closed on them. What changed is the diagnosis. `InvitePortalAction` was wired ONLY into the transient step 3 of `/people/onboard` (it unmounts the moment `createdPerson` leaves state) and the equivalent step of `/apprentices/from-candidate` — flows the People list's own "Add Person" button does not even link to; it links to `/people/new`. **None of the 50 existing rows could ever reach the invite surface at all**, so "never exercised" was never an adoption gap. crm7#1801 (`290e5638`) put the action in the person DETAIL page header, gated on `person.user_id`, and `/people/:id` is registered at `App.tsx:1528` — the one page every person has regardless of how they were created. **It had not reached the parent:** the gitlink recorded `272e926e`, where a grep for `AddCustomEntityRecordDialog` and for the `[id].tsx` import are both empty. This PR advances crm7 `272e926e -> f6a78d2a`, where the action renders at `src/pages/people/[id].tsx:2034`. Mutation-tested at the new pointer: replacing `<InvitePortalAction` with an inert element turns `id-portal-invite.test.tsx` "offers 'Invite to portal' for a person with no login yet — the 50-row case" **RED**; restoring the file byte-identically (`git` checkout of the path) returns sha256 `a17566df…59b4` and it is **GREEN** (20/20 across the two closure files). Live RPC reachability confirmed too: `portal_invite_mint` EXECUTE to `authenticated`, `portal_invite_accept` EXECUTE to `anon` **and** `authenticated` — anon is required, since an invited worker accepts before they have a session. **EXERCISED, 2026-08-18 — the 0→1 round trip is done, against the fixture tenant and not a client one.** The estate has two tenants named for this: `E2E Fixture Tenant (do-not-delete)` and `… Tenant B`, and both crm7 E2E users are ACTIVE `admin` in the first. Driven through PostgREST with ordinary `authenticated` JWTs — the same RLS boundary the UI crosses — against seeded person `00000000-0000-4000-a000-000000000101`: `portal_invite_mint` as one fixture admin returned a 64-hex-character raw token (value withheld, never persisted — the function stores only its SHA-256), and `portal_invite_accept` as the OTHER fixture user returned that person's id. **Live before → after:** `people` 50 rows both sides; `count(user_id)` **0 → 1**; `people_portal_invites` **0 → 1**; accepted invites **0 → 1**; and the one linked person is in the fixture tenant, confirmed by joining back to `tenants.name`. **Negative control, because a write that succeeds proves nothing about authorisation:** the identical mint call made by the Tenant-B fixture user — authenticated, but not owner/admin of that tenant — was refused `42501 portal_invite_mint: not authorised to invite person …`. **The honest limit of this evidence:** it exercised the RPC pair and the RLS boundary, not a browser click. The button and its gating are covered separately by the mutation test above. 49 of 50 people still have no login, and that is the operator's adoption decision, not a defect — this item was "built and never opened", and it has now been opened. | S |
| AD-5 | Entity selector never adopted in two apps | ~~**OPEN**~~ **PARTIAL** | 65 files in the CRM, **0 and 0** in the two named apps. New: a third app now has 6 — the pattern is spreading, just not where it was asked for. **CORRECTION, 2026-08-17 — conduit closed, BSU still open, and the two are not symmetric.** This item is 713 lines with real production history (crm7#1284 async-select, one-shot suggestions, cross-schema reads, an error-vs-empty-state fix) — a rushed port would have created the "6th divergent copy" this item exists to prevent, so both apps were investigated for a genuine target before writing anything. **conduit: done.** Ported `EntitySelector.tsx` against conduit's own primitives — `command.tsx`/`popover.tsx` added (conduit already had `cmdk`, `@radix-ui/react-popover`, `dialog.tsx` as dependencies; only the two shadcn wrapper files were missing), `@/lib/supabase/client`'s `createClient()` factory used per-instance via `useMemo` (conduit is Next.js App Router, not crm7's Vite-SPA singleton — matches every other client component in the app), `@/lib/logger`/`@/lib/utils`. Full feature parity, not a trimmed subset. Converted a **genuine** free-text field: job postings' "Award Code" was a bare `<input placeholder="e.g. MA000027">` with zero validation against `awards` (156 rows, globally readable — confirmed live, not from the creation migration) — a typo silently saved a job referencing a non-existent award. Built `AwardSelector.tsx` bridging the id-keyed component against the `code`-keyed `jobs.award_code` column, and — this is the part a rushed conversion would have gotten wrong — a stored code that no longer resolves (pre-existing typo, retired award) is surfaced as an explicit warning, not silently hidden behind the empty-state placeholder. Wired into both `jobs/new` and `jobs/[id]/edit`. `@supabase/postgrest-js` added as a direct dependency (was only transitive) — lockfile diff is 3 lines. 14 new tests (9 component + mutation-tested: proved the code-vs-id bridging red before fixing it), full suite **1231 passed, 0 failed**; `tsc --noEmit` and `eslint` both clean. **BSU: still open, and honestly so.** BSU already has all four required primitives (`badge`/`button`/`command`/`popover` all present, unlike conduit) — the blocker is not technical. Searched BSU's tenant/org creation, user management, and branding surfaces for a free-text field that should reference an existing entity table; found none clean enough to convert without guessing at intent (`Tenants.tsx`'s "Owner email" looks similar but is deliberately free text — it invites a customer who may not exist as a user yet, so an entity picker would be the wrong fix, not the right one, misapplying this item's own pattern). BSU's domain is platform/tenant administration, not the GTO operational entities (people, employers, awards) crm7 and conduit manage — it may genuinely have fewer fields of this shape today. **The one blocker: a confirmed target field in BSU**, not a missing primitive or a technical obstacle. **CORRECTION, 2026-08-18 — conduit's work was real but INVISIBLE to this ledger's own method, and throughput's divergent copy is already gone.** The method note greps at the **pinned submodule commit**, and the parent's gitlink was two apps behind. conduit at the pinned `55b89c79`: a grep for `EntitySelector` returns four DOC files and **zero source** — which is exactly the "0 and 0" this row reported. At conduit `origin/development 7c6c60e4` the same grep returns `src/components/entity/{EntitySelector,AwardSelector}.tsx`, both test files, and the two call sites (`jobs/new/_view.tsx`, `jobs/[id]/edit/_view.tsx`). This PR advances the parent gitlink `55b89c79 -> 7c6c60e4`; conduit's own suite at that commit passes (`vitest run src/components/entity` → 2 files, 7 tests). Migration blast radius is nil — the migrations diff between the two commits is EMPTY, this is app code only. **The "third app now has 6" limb is also stale**: throughput#310 ("delete dead EntitySelector/ProfileSelector copy (AD-5)") removed it. At pinned `259b77c1` throughput still carried `src/components/entity/{EntitySelector,ProfileSelector,index}.tsx`, two tests and `src/lib/queries/profiles.ts`; at `origin/development 1330a285` an `ls-tree` for `components/entity` is empty and the only hits left are docs and `eslint.config.js`. Pointer advanced `259b77c1 -> 1330a285` here too (zero migration delta). **BSU is unchanged and still genuinely open** — re-grepped at BSU's own `origin/development` tip `5675ac64`, not the pinned commit: still zero EntitySelector/AwardSelector files, with `components/ui/button` matching as the positive control, so the search works. It remains blocked on an operator-confirmed target field. The BSU gitlink is advanced to that same tip (`39b94356 -> 5675ac64`, zero migration delta) so the next pass measures BSU at its current tree rather than at a commit four days stale — which is the whole failure mode this row's correction is about. **crm7#1812** (repoint crm7's copy at `@bsuite/ui`) is still OPEN and now `mergeStateStatus: DIRTY` — it is a de-duplication refactor, not a functional gap (crm7 has 75 adopting files today), and landing it needs a conflict resolution and its own crm7 PR, which is outside this parent lane. | M→S(conduit+throughput delivered)+?(BSU) |
| AD-6 | Report catalogue covers 89 of 403 tables | ~~**OPEN**~~ **PARTIAL** | Confirmed live: **89 entries over 88 distinct tables against 402 base tables (21.9%)**. Only drift is 403→402. **CORRECTION, 2026-08-18 — re-measured 89 / 88 / 403 (21.8%), and the content that closes most of the gap has existed since 2026-08-17 without ever being shown to the applier.** `crm7/supabase/migrations/20260821060000_report_catalog_gto_lifecycle_batch.sql` and `20260821070000_report_catalog_gto_lifecycle_seed.sql` are on crm7 `origin/main` and are **not** in `supabase_migrations.schema_migrations` (live: `20260821010000/020000/030000/040000/050000` present, `060000` and `070000` absent; positive control in the same query — `20260821050000` and `20260824010000` both return `true`, so the `false`s are genuine absences and not a broken predicate). **An earlier reading of this — "the applier ran PAST them and skipped them", i.e. the shared-ledger duplicate-stamp hazard — is WRONG, and the correction changes the fix.** `supabase-migrate.yml` checks out `submodules: recursive`, so it reads every submodule **at the parent gitlink**. An `ls-tree` of `supabase/migrations/` at `272e926e` stops at `20260821040000`: neither file exists at the pinned commit. Nothing was skipped, no stamp collided, and re-stamping them would have been the wrong repair. The pointer was the defect. This PR advances crm7 `272e926e -> f6a78d2a`, which carries both files. **Live pre-flight, so the apply is predicted rather than hoped:** the two files propose **23 distinct entity keys**; all 23 exist as `public` BASE TABLEs, all 23 have `relrowsecurity`, all 23 have a `SELECT`- or `ALL`-covering policy, all 23 carry a `tenant_id` column matching the declared `tenant_column` scope, and **0 of 23 are already catalogued** — with a positive control proving the already-catalogued join matches when it should (5 known keys → 5 matches). `report_catalog_seed_entity()` exists live. So the apply satisfies the `20260807074000` precondition trigger and lifts the catalogue **89 → 112 entries over 88 → 111 distinct tables (21.8% → 27.5%)**. **The parent must point at crm7 `development`, not crm7 `main`, and the parent's own rehearsal gate is what proves it.** This lane first advanced the pointer onto the promoted main `8f69340b`, and `supabase-migration-rehearsal` failed: both catalogue migrations came back `noop` — they apply cleanly on a disposable database and move no catalog, which is the correct default verdict for a file that has not declared itself data-only. The `-- rehearsal: data-only` declaration that answers it exists on crm7 `development` and **not** on crm7 `main`. So the promoted main is unshippable through the parent's own gate while still carrying migrations the applier would happily run — a combination worth naming, because it means "advance onto the promoted main" is not always the safe default this estate treats it as. Retargeted to crm7 `development`. One sibling blocker on that head — `20260826050000_backfill_platform_group_links.sql`, the single `noop` failing bsuite#2103 and nothing else — was fixed in crm7#1833 (comment-only; the file carries zero `CREATE`/`ALTER`/`DROP`/`GRANT`/`REVOKE` statements, so the declaration is true). **The retarget is proved, not argued:** the rehearsal went from **fail** at the promoted mains to **pass** at the development heads, and it replayed the whole 16-migration crm7 delta on a disposable database — 14 `APPLIED`, 2 `APPLIED-DATA-ONLY` (`20260821060000`, `20260821070000`) plus `20260826050000`, and **zero** `noop` or `failed`. **Still PARTIAL, not DONE, and deliberately:** `supabase-migrate.yml` triggers on push to parent `main`. A PR to `development` **queues** these. **CORRECTED 2026-08-19 — THE PROMOTION DOES NOT APPLY THEM, AND THIS ROW SAID IT DID.** The workflow's `push: branches: [main]` trigger starts the run, but the apply job is guarded `if: needs.detect-changes.outputs.matrix != '[]' && github.event_name == 'workflow_dispatch'`. A promotion is a `push`, not a `workflow_dispatch`, so it starts the workflow and applies nothing. The separation is deliberate — the job's own comment records that a required-reviewers environment rule was rejected by the account's billing plan (HTTP 422) and that the failed attempt still CREATED an environment with zero rules, "which reads as protected and is not", so the guard was moved into the job condition where it works on any plan. **Applying is an operator `workflow_dispatch`, always.** Believing otherwise is precisely how a set of merged migrations sits unapplied while everyone reads the estate as current. Re-run the coverage query after the DISPATCH, not after the promotion — a merged migration is not an applied one, and neither is a promoted one. **CONFIRMED APPLIED, 2026-08-19.** The operator's `workflow_dispatch` this row asked for happened (`gh run list --workflow supabase-migrate.yml` shows a successful `workflow_dispatch` run at `2026-08-19T07:43:48Z`). Re-measured live against production: `supabase_migrations.schema_migrations` now contains **both** `20260821060000` and `20260821070000`, and `report_catalog_entities` now holds **112 entries over 111 distinct tables** — exactly the `89 → 112` / `88 → 111` this row predicted before the dispatch, not merely close to it. Against a re-measured total of **415** public base tables (not 402/403 — table count itself drifted upward since the last count), that is **26.7%**. **Still PARTIAL, not DONE** — 26.7% coverage is real progress on the specific blocker this row was tracking (the apply pipeline), not a claim the catalogue is complete; the remaining ~304 uncatalogued tables are a separate, much larger content-authoring gap this measurement does not attempt to close. | L |
| AD-7 | Four persistence surfaces at 0 rows | ~~**OPEN**~~ ~~**PARTIAL**~~ **DONE** | All four still 0. Only one has code reach (6 call sites) and it has still never been written to. **CORRECTION, 2026-08-18 — the row counts hold, the diagnosis does not, and the one real defect is fixed and was sitting behind the stale gitlink.** Live: `data_import_jobs` 0, `custom_pages` 0, `form_layouts` 0, `tenant_entity_records` 0 — unchanged. **"Only one has code reach" is stale.** All four have readers, and three have real writers: `dataImportJobService.ts:92 .insert` / `:106 .update`, `customPageService.ts:76 .insert` / `:94,:145 .update`, `formLayoutService.ts:102 .insert` / `:115 .update`, each reached from routed Settings pages. Those three are **adoption gaps, not defects** — nobody has driven the wizard, saved a page, or saved a layout yet. **`tenant_entity_records` was the genuine defect and it is now closed.** The read half (`EntityTableWidget`) was fully wired for custom entities while no insert/upsert existed anywhere — a chicken-and-egg gap, since the widget discovers its columns from existing rows. Confirmed on both sides: no client writer, and live the ONLY database function whose body mentions the table is the `tenant_entity_records_tenant_guard` trigger, so there was no server-side writer either. crm7#1801 (`290e5638`) added `AddCustomEntityRecordDialog`, a free-form key/value create dialog (a custom entity has no field-definition table to generate a typed form from), inserting at `EntityTableWidget.tsx:202-203` with RLS `tenant_entity_records_insert` as the real boundary and the error surfaced verbatim rather than swallowed. Absent at the pinned `272e926e`, present at `f6a78d2a`; this PR advances the gitlink. Mutation-tested at the new pointer: dropping `data` from the insert payload turns "inserts a scoped row from the free-form key/value fields and refetches" **RED**; restoring the file byte-identically (`git` checkout of the path) returns sha256 `35d75df8…ad73` and it is **GREEN** (20/20). **EXERCISED, 2026-08-18 — all four are off zero.** Each was written once as the `E2E Fixture Tenant (do-not-delete)` admin, through PostgREST with an ordinary `authenticated` JWT, using the same payload shape its service sends. **Live before → after:** `data_import_jobs` **0 → 1**, `custom_pages` **0 → 1**, `form_layouts` **0 → 1**, `tenant_entity_records` **0 → 1** — the last against the fixture custom entity `e2e_widgets`, which is exactly the chicken-and-egg case this row describes: a custom entity whose widget discovers its columns from rows that did not exist. **Negative control:** the identical `custom_pages` and `tenant_entity_records` inserts made by the Tenant-B fixture user were both refused `42501 new row violates row-level security policy`, so the four successes are the tenant boundary working, not four tables that accept anything. **The honest limit:** this crossed the RLS boundary the services cross, not the UI click path; the dialog itself is covered by the mutation test above. | M |
| AD-8 | Connection-health view has no reader | ~~**OPEN**~~ **DONE** | The view returns **2 rows, both `never_synced`**, and zero app source references it (positive control: the sibling table matches 51 files). "Connected but never synced" currently presents as healthy. **Re-measured 2026-08-18 and the filed finding HOLDS. Four files mention `xero_connection_health`, which is why a file-count check would call this closed — but every one is prose: a doc comment in `xero-connection-health.ts` naming the migration that created the view, and a test comment about its 48h boundary. Searching for an actual read (`.from('xero_connection_health')` / `.rpc(...)`) returns **zero**. POSITIVE CONTROL: the same pattern finds real queries elsewhere (`hostEmployerLink.ts:134`, `hostQueries.ts:18` both `.from('placements')`), so the zero is a working search, not a broken one. The view still has no reader.** **DONE, discovered not authored — 2026-08-19.** The row's literal claim (the VIEW has no reader) still holds — `.from('xero_connection_health')` still returns zero hits. But the harm the row exists to prevent, "connected but never synced presents as healthy", is fixed, live in production, by a different mechanism: crm7 commit `2b95f9bb` ("AD-8 — stop rendering a never-synced Xero connection as 'Active'") reimplements the view's exact CASE ladder client-side (`resolveXeroSyncHealth` / `resolveXeroIntegrationStatus` in `xero-connection-health.ts`, `XERO_SYNC_STALE_AFTER_HOURS = 48` pinned to the view's own 48h) against `last_synced_at`, which both consumer surfaces already select directly — no round trip through the view needed. Confirmed wired, not just present: `settings/integrations.tsx:884-885` and `payroll/index.tsx:139-140,150` both call `resolveXeroIntegrationStatus`/`worstXeroIntegrationStatus`, both select `last_synced_at` in their query. Confirmed live in PRODUCTION, not merely merged: `git merge-base --is-ancestor 2b95f9bb origin/main` → true. Confirmed the underlying data is unchanged (so this is a UI-truthfulness fix, not a data fix): live `xero_connection_health` still returns 2 rows, both `never_synced` — identical to every prior measurement. The two known connections now render **"Connected · never synced"**, not "Active". Residual, accepted, not a new defect: the view and the resolver are two definitions of the same 48h threshold, documented as a deliberate trade-off (own round-trip-avoidance reasoning in the file) rather than an oversight. | S |
| AD-9 | 14 assistant actions the role manuals promise and no tool implements | ~~**OPEN**~~ ~~**PARTIAL**~~ **PARTIAL — one category left, and it needs an operator ruling (re-measured 2026-08-18)** | **THE ROW ABOVE RECORDED SIX TOOL NAMES THAT DO NOT EXIST, AND A FUTURE PASS GREPPING THEM WOULD HAVE READ A BUILT ITEM AS UNBUILT.** Measured at crm7 `origin/development`: the files are `payslip-tools.ts`, `pay-run-tools.ts`, `navigation-config-tools.ts`, `branding-tools.ts`, `compliance-test-tools.ts` — not `payroll-tools.ts`/`nav-config-tools.ts`. `getAllToolNames()` tags **11** tools `(AD-9)`, not six: `get_payslip`, `list_payslips`, `list_pay_runs`, `get_pay_run_summary`, `list_navigation_config`, `add_navigation_item`, `set_navigation_item_active`, `get_resolved_branding`, `list_compliance_standards`, `get_self_assessment_status`, `record_self_assessment`. Five of the six names recorded above match nothing in the tree (`get_pay_run_status`, `get_nav_config`, `get_tenant_branding`, `get_boot_assessment`, `list_pending_boot_reviews`), and the "all six are read-only" claim is wrong — `add_navigation_item`, `set_navigation_item_active` and `record_self_assessment` WRITE. Production reach confirmed: `git cat-file -e origin/main:src/lib/ai/tools/{payslip-tools,branding-tools}.ts` → present. **The parent gitlink was stale** — at the pinned crm7 commit `272e926e` none of it exists, which is what the earlier zero measured. **CLOSED THIS PASS — `submit_timesheet`** (crm7 `fix/lane-ad9-v5-v9`). Covers submit AND resubmit, matching `TRANSITIONS` in `timesheetWorkflow.ts` (`draft` or `submitted` → `pending_host_approval`). It filters the PATCH by `?id=eq.<id>` (the sibling tools put `id` in the BODY, which PostgREST reads as an UNFILTERED update of every row RLS admits — recorded, not copied), compare-and-sets on `&state=in.(draft,submitted)` so it cannot rewind a decided sheet, and RE-READS the row because the db proxy forwards only apikey/Content-Type/Authorization and **not** `Prefer: return=representation`, so a 2xx over zero rows is otherwise indistinguishable from success. `tenant_id` is not sent — RLS's to enforce, not the tool's to assert. **AND IT WAS UNREACHABLE UNTIL `api/ai/chat.ts` CHANGED:** `getPermissionsForRole` had no `apprentice` case, so apprentices fell through to `default` — which grants `approve_timesheets` — and **no branch of that function returned `submit_timesheets` at all**. Same shape as the `owner` bug fixed there on 2026-07-04. Mutation-tested: 8 mutants (drop the id filter, drop the state predicate, skip the re-read, stop clearing the bounce reason, assert `tenant_id`, remove the gate, gate on `submit_timesheets` only, unregister from `getAllToolNames`) — **all 8 RED, every restore byte-identical**. Gates: `typecheck` 0, `lint` "0 errors = baseline 0", `vitest run` 539 files / 7028 passed. **STILL OPEN — `set_tenant_feature_flag`, and it is an OPERATOR DECISION, not an implementation gap.** Its comment says it waits on "a real feature control plane (`tenant_settings.feature_flags`)"; that is stale twice. The plane shipped as `public.tenant_features` (+ `is_feature_enabled(tenant_id, feature_type, feature_key)`), RLS on, 0 rows. Its live write policy is `is_platform_developer() OR user_tenants.role = 'owner'` **on the same tenant** — but the tool's signature takes `targetTenantId` (a parent flipping a CHILD's flag), which that policy refuses, and its gate (`manage_organizations` OR `manage_system`) is WIDER than `role='owner'` (RC7 shape). Wiring it needs a new SECURITY DEFINER cross-tenant write RPC carrying a parent-ownership rule. Not invented. **Incidental, reported not fixed:** `public.tenant_features` carries SELECT/INSERT/UPDATE/DELETE grants to `anon` (create-time default). Not a live leak — both policies are `TO authenticated`, so `anon` matches no policy — but it is the estate's known revoke shape. **RE-VERIFIED 2026-08-19, UNCHANGED:** no `tenant_feature`-named RPC exists live (`information_schema.routines` — zero hits); `tenant_features`' anon grants are unchanged (SELECT/INSERT/UPDATE/DELETE, still shadowed by `TO authenticated` policies). No operator ruling on the cross-tenant write RPC design landed. | L→M |
| AD-10 | Dashboard drag/drop persistence never adopted | **NOT-A-DEFECT** | **Measured live, and the ledger was wrong.** Persistence works and survives a browser-profile change. `user_preferences` holds 9 rows under `page:bsu-dashboard_grid_layouts`, with `_grid_cols` / `_grid_version` / `_grid_base_cols` each also at 9 — a full round-trip, not a partial write. crm7's own dashboard shows the identical 9-row pattern, so this is the estate's normal architecture. Both registers inferred "no persistence" from the absence of a table literally named `dashboard_layouts`; that table genuinely does not exist, but it was never the mechanism. `UnifiedDashboard.tsx:3,57` renders `DraggableCardPage` whose adapter defaults to `useScopedPreference`, which upserts to `user_preferences` — `localStorage` is only the pre-hydration seed, not the store. | — |
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

### V — verification integrity · ~~2 DONE, 3 PARTIAL, 6 OPEN~~ **4 DONE, 4 PARTIAL, 3 OPEN — re-measured 2026-08-18**

*V-5 and V-6 move OPEN/PARTIAL → DONE; V-9 moves OPEN → PARTIAL. V-5 was already merged and
applied before this pass and one third of it was never a defect at all — see its row.*

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| V-1 | 18 of 20 end-to-end tests self-skip in continuous integration | ~~**OPEN**~~ **PARTIAL — re-measured 2026-08-18** | Worse than filed: the credential is not merely unwired, it is **invalid** — the last run failed with `invalid_credentials`. 19 of 19 spec files carry a skip site; both cited unit suites still skipped. A companion fix delivered only the loud-failure harness, which is *why* the breakage is now visible. **Re-measured 2026-08-18 from the last e2e run on `development` (run 32124092262): **76 passed, 50 skipped**. The filed shape — 18 of 20 self-skipping — would be ~90% skipped; the measured figure is ~40%. All 19 spec files still contain a skip guard, but a guard is not a skip: most are `test.skip(!CREDS)` and CI supplies the credentials, so they run. Left PARTIAL, not DONE: 50 genuinely skipped assertions remain, and a skipped test is coverage this suite does not have.** **RE-VERIFIED 2026-08-19, UNCHANGED:** latest e2e run on `development` (`32229854692`, same day as this pass) printed `50 skipped` / `75 passed` and `executed=76 skipped=50` — identical shape to the prior measurement, no drift either direction. Still PARTIAL; not attempted this pass (writing/un-skipping the remaining 50 assertions is a much larger effort than this lane's other rows and was not the priority named for this session). | M |
| V-2 | Rate-review authorization gate has zero executing coverage | **DONE** | `vitest run` → **18 passed, 0 skipped**. The gate now has 5 executing tests covering missing, empty, non-bearer, throwing and valid tokens. Zero skips remain in the file. | — |
| V-3 | Production migration-history audit is dead in both repos | **DONE** | Green on **three consecutive runs**; the log proves it is not a silent pass — it self-tests 10 cases, connects live, and scans all 8 scope directories. The second repo's copy was **deliberately removed** because the underlying table is shared; a per-repo audit could only ever see one slice. | — |
| V-4 | No scheduled-job failure alerting exists | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | 14 active jobs, **0** referencing the run-history table, and 0 functions reading it. Positive control returned 1 and 3 on the same instrument, so the zero is real. 21,136 runs in 7 days, 0 failed — the first failure will be silent. **Re-measured 2026-08-18: `.github/workflows/cron-job-health-audit.yml` runs every 6 hours (`29 */6 * * *`) against `public.cron_job_health()` (crm7 migration 20260821030000). It REFUSES to report false health — an empty project id or a pooler that will not accept the connection exits 1 rather than sweeping clean — and it carries a POSITIVE CONTROL: if `cron_job_health()` fails to report a synthetic failed run, the job errors with "The detector is broken and any clean sweep below is meaningless." Alerting exists and cannot pass vacuously.** | S |
| V-5 | Three cleanup functions exist and none is scheduled | ~~**OPEN**~~ **DONE — and one third of it was never a defect (re-measured live 2026-08-18)** | **THE WORK WAS ALREADY MERGED AND APPLIED.** `supabase_migrations.schema_migrations` carries `20260821040000 schedule_orphaned_cleanup_functions`, and `cron.job` shows jobid **47** `apprentice-handoff-token-cleanup-daily` `50 3 * * *` → `SELECT public.cleanup_apprentice_handoff_tokens();` and jobid **48** `xero-expired-cleanup-hourly` `55 * * * *` → `SELECT * FROM public.xero_cleanup_expired();`. Live proof they DO something rather than merely exist: `cron.job_run_details` → **24 succeeded** runs of the hourly job, **1** of the daily, **0 failed**; `xero_rate_buckets` older than the 5-minute window went **3 → 0**. **THE THIRD FUNCTION MUST NEVER BE SCHEDULED, AND SCHEDULING IT WOULD BE A NEW DEFECT.** `public.reap_stale_tga_sync_runs()` `RETURNS trigger` — `SELECT public.reap_stale_tga_sync_runs()` raises "trigger functions can only be called as triggers" (0A000). It is already wired, correctly: `CREATE TRIGGER trg_reap_stale_tga_sync_runs BEFORE INSERT ON public.tga_sync_runs FOR EACH ROW`, measured `pg_trigger.tgenabled = 'O'` (enabled). Reaping on INSERT is strictly better than a schedule — a stale row is only ever in the way of the NEXT run for that service, so it is cleaned at the moment it matters. The register's "0 cron refs" was a true count of the wrong thing. Positive control in the same query: a non-existent function name → `fn_exists=0 cron_refs=0`. No backlog: `tga_sync_runs` GROUP BY status → failed 93, success 28, partial 12, **zero `running`**. **No migration authored.** | S |
| V-6 | Calculator tolerates 131 baselined lint violations | ~~**PARTIAL**~~ **DONE — the baseline is now EMPTY (2026-08-18)** | *(The item's own arithmetic never closed: "95 of 131 cleared … 35 remain" is 130, not 131. Stating the measured baseline rather than reconciling a count nobody can now source.)* `eslint-baseline.json` goes `{no-useless-assignment:10, @typescript-eslint/no-unused-vars:21, no-useless-escape:1, @typescript-eslint/no-explicit-any:3}` = **35** → `{}` = **0** (R80.4 `fix/v6-clear-eslint-ratchet-residue`). **THE ITEM SAID "CLEANUP, NOT A DEFECT". THREE OF THE 21 WERE DEFECTS** — an unused variable in a test was the tell that the test had stopped measuring anything. (1) `ma000104-payguide.test.ts` "THE JUNIOR LADDER IS FIVE POINTS ABOVE EVERY OTHER AWARD'S" built one array and ended — **no assertion, green for its whole life** — and its title was also FALSE: MA000009, MA000058 and MA000119 ship the identical `[55,65,80,95]`. (2) `ma000089-apprentices.test.ts` called `ma000089BlockReleaseTravel()` on a $250 government-assistance case and discarded the result; an engine that offset the assistance with none of the three cl.13.4(c) conditions met would have passed. (3) `ma000008-payguide.test.ts` counted half-cent cells into a variable it never read, so its half-cent claim was asserted by a comment. **FOUR AWARD TABLES WERE IMPORTED INTO THEIR OWN TEST AND NEVER ASSERTED** — `MA000026_SHIFT_WEEKEND_PCT`, `MA000033_OVERTIME`, `MA000058_PENALTY_TABLE_MAINTENANCE`, `MA000058_APPRENTICE_PCT`; cells nothing priced included MA000026's `night` weekend shift, MA000033's casual after-3-hours 225 and MA000058's maintenance `public_holiday` 250. **THE ASSERTIONS ARE PINNED TO PUBLISHED LITERALS, NOT TO THE TABLE** — a first pass asserted the engine against the same table the engine reads, and the mutation run proved it a tautology (MA000026 night 220→225 stayed GREEN). **MUTATION-TESTED: 11 mutants, all killed, every restore byte-identical.** The re-banked ratchet was mutation-tested at its new zero: one unused const appended to `round.ts` → gate exit 1 `"0 -> 1 GREW"`, `--update` exit 1 `"REFUSED … an INCREASE"`, restored (sha256 `648509ea139a83ff` both sides) → exit 0. A first probe named `__ratchetMutationProbe` and stayed green because `varsIgnorePattern` is `^_` — recorded because that is the shape of a guard that cannot fail. Gates: `pnpm run audit` exit 0 (typecheck, lint:md, lint:ratchet "Ratchet holds", awards, theme, env, oauth-bridge, reachability, verify:schedules); `run-tests.mjs` → "all 183 test files pass". | S |
| V-7 | 90 lint suppressions for two React hook rules | ~~**OPEN**~~ **PARTIAL — the class is GATED; the residue is banked, not swept — re-measured 2026-08-18** | Re-measured across all six apps: **97, not 90 — the debt grew by 7.** Tracked nowhere: neither rule appears in any baseline or workflow, and one baseline is structurally incapable of seeing suppressed rules. **The class can keep growing invisibly, and it already has.** **Re-measured 2026-08-18: **71** react-hooks suppressions estate-wide (crm7 51, packages 8, conduit 4, braden 4, BSU 3, throughput 1, R80.4 0), against **90** as filed. More important than the count: the class is now ratcheted. `scripts/hook-suppression-baseline.json` banks per-scope counts and `check-hook-suppression-ratchet.mjs` fails on any RISE **and on any unbanked FALL**. Its own note records why the 7 in `packages/` matter most: the parent configures no react-hooks rules, so those are suppressions of a rule nothing here switches on — but they ship inside PUBLISHED tarballs (@bsuite/data-grid 5, @bsuite/page-builder 1, @bsuite/schema-registry 1) where each consumer app DOES enforce it.** **RE-VERIFIED 2026-08-19 — the "71" figure was itself an undercount, and the current run shows why.** Ran `scripts/check-hook-suppression-ratchet.mjs` fresh (R80.4 had to be `git submodule update --init` first — an uninitialised submodule reports 0 source files and the script correctly REFUSES to certify that scope rather than silently passing it as clean). Result: **98 inline suppressions + 92 config-scoped file-level suppressions + 1 repository-wide `off` declaration (conduit)** — PASS, exactly matching the banked baseline, zero drift either direction. The "71" both this row and the baseline's own header cite was `react-hooks/exhaustive-deps` INLINE only; the fuller ratchet the estate actually gates on also tracks `react-hooks/set-state-in-effect` (27 more inline: BSU 3, throughput 24) and crm7's 92 file-level config exemptions, neither of which the 71 figure counted. Not a regression — the ratchet has held at this true total the whole time — but the row's own historical numbers (90 → 97 → 71) were comparing three different scopes to each other, not the same measurement getting better. Left PARTIAL: the ratchet holding is not the debt shrinking, and reducing 190 real suppressions (98+92) to genuine fixes-or-proven-correct is a much larger effort than this pass's budget; not attempted here beyond the honest re-measurement. | M |
| V-8 | Per-page theme validation was never built | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | The named script does not exist in the root or any of six submodules; positive control found 43 other scripts, so the zero is real. The theme workflow invokes none of the three audit scripts. **Re-measured 2026-08-18: `scripts/audit-routes.sh` exists and is referenced 4 times by `.github/workflows/theme-conformance.yml`. It walks a declared route inventory — 11 routes, 5 public and 6 authenticated — running audit-applied-tokens, audit-ui-pages and audit-legibility against the DEPLOYED site, minting a real session via crm7 auth.setup.ts rather than reimplementing sign-in. A SKIPPED authenticated route fails the job by design. Per-page theme validation exists and runs.** | L |
| V-9 | Theme gates read logged-out pages only | ~~**OPEN**~~ **PARTIAL — the sweep now measures signed-in pages, gates on merge, and can no longer pass a spinner (2026-08-18)** | **THE "ZERO WORKFLOWS PASS A SESSION" CLAUSE IS FALSE.** `gh run view 31996642828 --log` (theme-conformance.yml, 2026-08-17T05:05Z) → `minting a session` / `session ready` / `authenticated: 6 route(s)` / `examined 11 route(s)`. **BUT THE GREEN TICKS IT PRODUCED WERE NOT ALWAYS MEASUREMENTS.** Measured live 2026-08-18 with a real session minted by `scripts/theme-session.sh`: `/dashboard`, `/contacts` and `/clients` each returned `<title>` correct, same origin, not `/login` — and the ONLY heading on each was `Checking access for Dashboard…` / `…Contacts…` / `…Clients…`. crm7's `<ProtectedRoute>` gate is a legal, legible, accessible, same-origin page, so `audit-legibility.mjs` reported `✓ ✓ ✓ — 0 finding(s), 0 skipped` and `audit-ui-pages.mjs` reported `1 clean` **over a spinner**. **FIXED — `scripts/lib/settled-or-skip.mjs`**, wired into both audits: wait (bounded, 20s) for the gate to clear, and report SKIPPED if it never does — `audit-routes.sh` already FAILS the authenticated sweep on a skip. A/B on the same live pages with the permission query blocked, identical probes, only the guard differing: **unguarded (HEAD) `✓ /contacts ✓ /clients — 0 finding(s), 0 skipped`, exit 0 — a FALSE GREEN. Guarded (this PR): `✗ /contacts — 2 below AA`, `✗ /clients — 2 below AA`.** **FIXED — the two defects it then found.** `2.76:1 (need 4.5) ΔE 0.296 14px "— you are working in the demonstration o"` (the exact figure CI run 31996642828 reported) and `3.53:1 ΔE 0.368 11px "Awaiting schema · not a fault"` — the second had never been reported by anything. Both are one defect: a raw `opacity-*` on TEXT, which composites the glyph toward the backdrop and always costs contrast. Measured on the deployed stylesheet: DemoBanner `opacity-70` removed 2.76→**4.56:1 PASS**; SchemaLagBanner `opacity-80` removed 3.53→**5.07:1 PASS**. Re-running the same audit on the live pages with those two classes stripped: `✓ /contacts ✓ /clients — 0 finding(s)`. Siblings swept, not assumed: DeveloperToolbar 5.74:1 and WeekView 8.46:1 both PASS on their own real backdrops and were left alone; positive control `opacity-25` on the same banner measures 1.39:1 FAIL. **FIXED — it gated nothing at merge.** `per-page-authenticated` carried `if: github.event_name != 'pull_request'`, copied from the `esm-imports` job whose stated reason (registry install vs `minimumReleaseAge`) does not apply to it. Latest PR run 32089259631 showed the job **skipped**; the two dispatch runs that contained it both concluded `failure` on real defects that had already merged past a green PR. Now runs on same-repo PRs; fork PRs still excluded, because `secrets.*` are not exposed to them and the credential assertion would fail a contributor's PR on something they cannot fix. **STILL OPEN:** coverage is 6 crm7 routes. `NOT COVERED: business-suite-unified conduit R80.4 throughput braden` — no `auth.setup.ts` in those five. **conduit was attempted and deliberately NOT half-ported:** conduit authenticates with `@supabase/ssr` `createBrowserClient`, whose browser storage is COOKIES, so crm7's helper (Supabase password grant seeded into `localStorage` under `sb-crm7-auth`) does not transfer — a wrong port yields a silently EMPTY state, which is the precise failure this lane exists to remove. Its own lane. **CLOSED THE GAP, 2026-08-19 — four of five, not none.** Each of the four remaining apps got its own `tests/e2e/auth.setup.ts`, ported (not reimplemented) from crm7's, merged: braden#430, throughput#328, business-suite-unified#782, conduit#509. `scripts/theme-session.sh` and `scripts/audit-routes.sh` in the parent repo extended to consume all five (bsuite#2167). **braden, throughput** — identical mechanism to crm7 (BS OAuth client, password grant, localStorage under the app's own default `sb-<project-ref>-auth-token` key) — confirmed empirically, not assumed from the pattern. throughput's `playwright.config.ts` also carried two independent, never-exercised defects (a `require.resolve` in an ESM package, pointing at two files that do not exist anywhere in the repo's history) — fixed in the same PR, since the config could not have loaded otherwise. **business-suite-unified** — did NOT need a new file (PR #142 already added one); it needed a credential fallback, since it only read an unprovisioned `BSU_E2E_*` pair. The "no `auth.setup.ts`" premise was wrong for this app specifically. **conduit — implemented the cookie lane, not just described it.** conduit's `@supabase/ssr` cookie wire format was extracted from the real pinned package (`npm pack @supabase/ssr@0.12.3`, reading `dist/module/cookies.js`/`utils/chunker.js`/`utils/base64url.js` directly — cookie name, `base64-`+base64url encoding, 3180-byte chunking, `path=/; sameSite=lax; httpOnly=false`) and verified live against `d.conduit.crm7.app`: `/analytics` and `/candidates` rendered real content, zero sign-in inputs, not a bounce. **Live proof it measures rather than rubber-stamps:** the same conduit run correctly FAILED `audit-ui-pages` on a real, pre-existing `/analytics` defect (`U1 — no way out`, filed conduit#508) that no gate had ever been able to see signed-in before. **Verified end-to-end for all five, through the real scripts, not a substitute harness:** `scripts/theme-session.sh --app <name>` mints a genuine, non-empty session for crm7, braden, throughput, conduit, business-suite-unified, and `scripts/audit-routes.sh --app <name>` passes all three auditors with **zero SKIPs** on 4, 5, 4 and 6 authenticated routes respectively (crm7's original 6 unchanged). Coverage moved **6 crm7 routes → 25 authenticated routes across 5 apps** (`scripts/audit-routes.sh --inventory --require-authenticated 25`, floor raised from 6 in the same PR). **STILL OPEN: R80.4.** Its `bs_*` auth bridge is a different shape again from all four ported apps, and porting it was not attempted in this pass — the one remaining named gap, not five. **Verdict: PARTIAL, pending merge of bsuite#2167** (companion submodule PRs already merged) — moved from "6 routes, 1 app" to "25 routes, 5 apps, 1 gap named and scoped (R80.4)". | M |
| V-10 | "Closes #N" on a development merge closes nothing — 14 issues fixed-and-open | ~~**PARTIAL — merged 2026-08-19; the hourly six-repo sweep starts at the parent promotion**~~ **DONE — live in production, verified from actual run logs, not inferred** | **Re-measured 2026-08-18.** Premise still holds: `gh repo view --json defaultBranchRef` across all **seven** repos returns `main` for every one, and a grep of `.github/workflows` for issue-closing across all seven returns exactly **one** hit — `pending-encryption-watch.yml`, which closes its own self-managed tracking issue, not a PR-referenced one. That single hit is the positive control proving the grep fires. **But the mechanism is not "untouched" — it exists.** bsuite#2065 (`fix/development-merge-issue-closer`, OPEN, MERGEABLE) adds `development-merge-issue-closer.yml`, `scripts/parse-closing-keywords.mjs` (801 lines, no RegExp) and `scripts/close-merged-development-issues.mjs`. Its own self-test passes 35 cases. **Verified independently here**: a 34-fixture set written without reading it — all nine GitHub keywords, multiline bodies, cross-repo refs, and negative controls its own suite does not cover (`prefixes #12`, `affixed #12`, `https://…/fixes/#12`, `background: #fff`) — passes **34/34** against its parser. The only red check was `own-package-freshness`, which failed identically on three unrelated branches at 00:15 and has passed since 01:00 on `chore/advance-submodule-pointers-20260817`; it was never about this PR's content. **No duplicate was built.** Note the workflow's own warning: `schedule` only ever runs from the default branch, so merging to `development` switches on the `pull_request` path for bsuite alone — the hourly six-submodule sweep does not start until this reaches `main`. **CONFIRMED LIVE, 2026-08-19 — the parent promotion this row was waiting on happened, and the hourly sweep is genuinely running:** `gh run list --workflow development-merge-issue-closer.yml` shows repeated `schedule` runs against `main` today (e.g. `32228059499` at `07:29:23Z`, `32223558808` at `06:28:29Z`), each `success`, plus `pull_request`-triggered runs on unrelated merged PRs throughout the day. Read the run log directly rather than trusting green: run `32228059499` printed `7 scope(s) requested, 7 surveyed, 0 stood down, 0 unreadable` and correctly found nothing NEW to close (everything in its 48h window was `already-closed` — the earlier runs that morning had already done the work). **The residual backlog this row named (14 issues) was mostly stale by the time it was checked — not because the count was wrong when filed, but because the mechanism had been running live all day and had already cleared most of it.** A fresh survey (`CLOSER_DRY_RUN=1`, 30-day lookback, all 7 scopes, one paging-cap-clean run) found exactly **4** genuinely open issues with an inert closing directive from a merged `development` PR — all in crm7, all predating the workflow's 48h default lookback so the hourly job will never reach them on its own: crm7#1595, #1597, #1598 (via crm7#1622, merge `486be80c`) and crm7#1299 (via crm7#1307, merge `562aab96`). **Each verified against live code/DB, not the PR's own claim, before closing:** #1595 — the PR's own self-report said "I am not claiming it fixed" (migration not yet applied at merge time); re-checked independently and `supabase_migrations.schema_migrations` now contains `20260813090000`, with `document_templates.google_doc_id`/`.body` both live. #1597 — `manage_whs_audits`/`manage_lln_assessments` gates confirmed live in `whs-audits/index.tsx` and `lln-assessments/index.tsx`, each with its own test. #1598 — an investigative question ("does the namespace bug reach further than #1582"), answered NO with a positive-controlled test, register documentation corrected to state what it cannot detect, and the one unresolved sub-question split out as its own issue (#1621) rather than folded in silently. #1299 — `supabase_migrations.schema_migrations` contains `20260730330000`, and `placements/create.tsx` reads/writes `classification_fixed_id`/`classification_fixed_id_award_code` from the live `AwardSelector` result. All 4 closed by hand with a comment citing the merge SHA and the independent verification, following the automated closer's own comment format and machine marker. **Verdict: DONE** — the mechanism is live, running hourly, self-verified from its own logs (not assumed from "merged"), and the residual backlog outside its lookback window is now zero. | S |
| V-11 | The unscoped-select sweep query is not in continuous integration | ~~**PARTIAL**~~ **DONE — re-measured 2026-08-19** | **All four real defects fixed live** — I re-ran the sweep and it now returns only the reference tables the issue itself classified as correct. **But no automation runs it**: the existing drift audit checks a *different* invariant, and the sweep script is referenced by no workflow. A new unscoped table can still join the list undetected. **CLOSED 2026-08-19 — it is wired, and it has RUN.** `crm7/scripts/check-unscoped-select-policies.mjs` executes in `crm7/.github/workflows/db-lint.yml`, on both `development` and `main`, and rides the job that already replays the baseline plus every post-baseline migration into a real Postgres — because `pg_policies` is only meaningful against a replayed schema, the same conclusion `prod-rls-policy-drift-audit.yml` reached. It carries `if: always()` so an unrelated `report_catalog_*` failure in that job cannot hide an RLS regression. **Not merely declared — observed.** The most recent run on `main` prints `[unscoped-select-sweep] OK: 1091 RLS policies across 403 tables examined in schema public (412 tables total); 9 in the open-SELECT-with-scoped-writes class, 9 reviewed allowlist entries; 0 new, 0 stale, 0 missing.` and its self-test prints `12 cases, 6 of them asserting the gate FAILS`. A gate that states its denominator and proves it can fail is the shape this row asked for. | S |

### TH — theme and visual · 1 DONE, 3 PARTIAL, 6 OPEN, 1 SUPERSEDED

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| TH-1 | Non-standard colour: 235 real matches estate-wide | **PARTIAL — the class is now GATED; the residue is not swept** | **Re-measured 2026-08-18 at the pinned gitlink SHAs: 118**, not 143 and not 235 (crm7 6 + conduit 27 + BSU 40 + R80.4 1 + throughput 0 + packages 0 + braden 44). Positive control: that table reproduces CI run **32089259631** row for row. Three different figures for one class in one week is what "no gate" looks like from outside — **C2 was computed by `theme-conformance.yml` every run, written to `$GITHUB_OUTPUT`, printed in the log, and compared by nothing.** The file's own C4 comment already names this failure shape ("the scanner detected it in C4 every run and nothing ever read that column"); C2 and C3 were still in it. This PR adds a **C2 equality ratchet** banked at 118 and a **C3 hard zero** (measured 0), and fixes the scanner's one missing build-output exclusion — `.lighthouseci`, whose `lhr-*.html` inlines the whole audited page: with it present a working copy reports BSU **1345/1369** instead of 1/40, so anyone banking a baseline from the documented command banked a ceiling ~1300 too high. Mutation-tested against the live tree: +1 hex → RED at 119; two palette classes → C3 RED at 2; baseline drifted to 119 → RED on the FELL arm; restored → GREEN. **Still PARTIAL: the 118 hits are not swept**, and the residue is dominated by branding/colour-picker surfaces and vendored magicui components in three apps. It drops to **98** the moment bsuite#2103 advances the pointers (measured at those SHAs). **PREDICTION CONFIRMED 2026-08-19.** bsuite#2103 merged; re-running `scripts/audit-d2c-theme.sh` at the current pointers gives C2-real of **98** — crm7 0, conduit 25, business-suite-unified 30, R80.4 1, throughput 0, packages 0, braden 42 — and `.github/theme-c2-baseline.txt` reads **98**, so the ratchet is equal and the gate is green. **Still PARTIAL on this row's own criterion:** the 98 are banked, not swept. The residue is dominated by braden's corporate palette (42, exempt from the D2C PALETTE but not from the non-oklch FORMAT), business-suite-unified (30) and conduit (25), largely branding and colour-picker surfaces plus vendored magicui components — where sweeping means either a deliberate exemption or rewriting vendor code, which is a design call rather than a measurement. | M |
| TH-2 | Five app-local near-white tokens still live | **DONE** | All five sites are now historical comments; the pattern grep returns **only comment prose, zero live declarations**. Four pull requests merged 2026-08-17. *Adjacent and outside this item's wording:* one shared-package declaration of the same value survives — and the new scanner catches it, which is the gate working. | — |
| TH-3 | Theme gate cannot see near-white; needs a parsed threshold and a re-bank | ~~**PARTIAL**~~ **DONE — re-measured 2026-08-19** | **Done half:** the scanner now parses the lightness component numerically and is wired into the workflow across 1,410 literals. **Not-done half:** the baseline reads 25, the scanner reports 16, and the workflow fails on an *under*-count. It has not fired only because recent commits changed submodule pointers alone and the path filter cannot see those. **The next pull request touching any stylesheet or component will fail red.** **BOTH HALVES NOW HOLD, 2026-08-19.** The baseline has since been banked to **16** and the scanner measures **16** — `1412 oklch colour literals parsed in authored source across 7 roots, 16 violations` — so the ratchet is equal and the gate is green rather than red. Measured at the trees CI actually reads: all six of the parent's gitlinks were confirmed identical to the local checkouts first, because four of them were AHEAD when this was first checked and a working-copy number would have been the wrong number. **AND THE REASON IT "HAS NOT FIRED" IS FIXED, NOT WAITED OUT.** This row named the cause — the path filter cannot see submodule pointer moves — and that was the whole defect: every job in theme-conformance measures the apps at the PINNED gitlink SHAs, so a pointer bump is the only way its inputs change, and the parent's diff for one contains no `.css` or `.tsx` path at all. Confirmed live on bsuite#2140, where the workflow did not start while twenty-one other checks did. bsuite#2141 adds the six gitlinks to the trigger, and to route-inventory and schema-builder-migration-parity, which carried the same omission behind their own submodule globs. | S |
| TH-4 | Shell border alpha below the non-text contrast floor | ~~**OPEN**~~ **PARTIAL — OPERATOR TASTE CALL, not engineering — re-measured 2026-08-18** | Unchanged at the exact cited line — and **wider than filed**: three apps carry the 9% alpha, not one. A fourth differs. **Re-measured 2026-08-18 by running `packages/theme/src/non-text-contrast.test.ts` (22 assertions, all pass). DARK `--role-border-strong` clears 3:1 on every surface. LIGHT does not, and the test says so deliberately rather than hiding it: worst 1.20:1 against `--role-bg-sunken`. The test block is headed "NOT FIXED HERE, AND THIS IS NOT A DEFERRAL DRESSED AS A RATCHET" and records why — reaching 3:1 needs L <= 0.656, turning a pale hairline (#d4d8dd) into a legible mid grey across ~50 files in four apps. "How heavy should a light-mode emphasis border look" is a taste call the operator owns. **Needs Braden, not more engineering.**** | S |
| TH-5 | Interactive borders fail non-text contrast at 1.12:1 | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Issue still open, no fix. The proposed role token **does not exist**. Computed from live values: the strongest candidate is 1.95:1 against the panel background — still below the 3:1 floor. **Re-measured 2026-08-18: `WCAG 1.4.11 — --role-border-interactive clears 3:1 on every surface` passes for BOTH light and dark, asserted `toBeGreaterThanOrEqual(3)` over every surface token. The filed 1.12:1 figure survives only as a pipeline self-test reproducing the historical value. The shadcn bridge is asserted too: `--input` resolves to `--role-border-interactive`, while `--border` deliberately stays on the decorative hairline — and that decorative pair has its OWN positive control asserting it must NOT clear the floor, so the passing assertions cannot pass vacuously.** | M |
| TH-6 | Gradient underline class is CRM-only | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Exactly **2 files**, both in one app: the definition and one usage. Zero occurrences in the shared theme package or the other five apps. It must move into the package before the request is implementable elsewhere. **The row set the bar itself: "It must move into the package before the request is implementable elsewhere." Re-measured 2026-08-18 — it has. `packages/theme/src/css/utilities.css:175` defines `.bsuite-gradient-underline-span` and `:179` `.bsuite-gradient-underline::after`, with only the paint shared and inset/height/opacity left to the consumer. crm7 consumes it in 3 files. Adoption by the other five is a separate request this row does not make.** | S |
| TH-7 | Developer-portal raw buttons — 18 files, no lint rule exists | ~~**PARTIAL**~~ **DONE — re-measured 2026-08-19** | **Done half:** the rule now exists, is registered at error level, 7 files fixed, issue closed. **Not-done half:** the config **explicitly ignores the 10 files that still contain raw buttons** — the rule exempts precisely the remaining violators. Also re-measures the issue's "37 files" as inflated; the real figure was 18. **THE NOT-DONE HALF IS CLOSED, and it was closed by the same commit that this row's measurement predates.** `business-suite-unified/eslint.config.js` now registers the rule for `src/pages/Developer/**/*.tsx` with **no `ignores` key at all** — parsed out of the config block, not read from its comment. The config records why in its own words: the list "named 10 files holding 20 raw `<button>` instances — i.e. the rule exempted PRECISELY the files that still violated it, so `pnpm lint` was green on a tree where every remaining violation lived. A rule whose exemption list is the violation list measures nothing." **Re-measured 2026-08-19:** one `<button>` remains under `src/pages/Developer/`, in `Tenants.tsx:472`, and it carries a per-line `eslint-disable-next-line bsuite/no-raw-button` with its reason stated — a chip-remove control inside a compact Badge, where Button's smallest size (h-8/h-9) would dwarf the chip. `reportUnusedDisableDirectives` keeps that directive from going stale if the control is ever removed. **AND THE RULE IS NOT VACUOUS, which is the half a clean lint run cannot tell you.** `npx eslint src/pages/Developer --max-warnings 0` passes; injecting `const __probe = () => <button type="button">x</button>` into `Platform.tsx` makes it fire **1** report; restoring the file returns it to clean. A green gate that has never been seen to fail is not evidence. | M |
| TH-8 | App gradient defined with zero usages | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Defined at two sites (line drift only from the register), **zero call sites** in any component. **Re-measured 2026-08-18 across all six apps and `packages/`: `--gradient-accent` is referenced by **59 files**, `--gradient-heading` by **13**, `--gradient-accent-on-dark` by **2**. The filed "zero call sites" no longer holds by a wide margin.** | S |
| TH-9 | Non-responsive two-column grids: 473 occurrences | ~~**PARTIAL**~~ **DONE — the promotion happened 2026-08-19; production now serves the fix** | **The register measured the wrong thing.** A plain substring count gives 475 — it counted breakpoint-prefixed variants, which are the *correct* pattern. Instrument = all occurrences minus breakpoint-prefixed. **Re-measured 2026-08-18, and the instrument was positive-controlled at both ends by checking out each tree**: at the parent's recorded gitlink `272e926e`, crm7 reads 475 total / 281 prefixed = **194 unprefixed**; at crm7's `development` tip `e8a587c7`, 464 / 460 = **4**. The fix (crm7#1789 + #1823) is real and lands on `development` only. `gh api repos/GaryOcean428/crm7/compare/main...development` → **ahead 21, behind 0**, so production still serves the 194. **Two separate moves, and only one of them is in this lane's remit.** The parent-side half — advancing the gitlink so the recorded tree carries the fix — is already open as **bsuite#2103**. The half that changes what users see is a crm7 `development` → `main` **promotion**, which is a production deploy: it needs the operator's authorisation and the agent-performed visual pass (both themes, four breakpoints, three tenants) that the ship gate requires, neither of which this lane performed. **Not closed, and deliberately not attempted here.** **CLOSED 2026-08-19.** crm7 `development` -> `main` was promoted (crm7#1848, a MERGE commit so the parent's gitlink stays reachable from `main`). Re-measured with the same instrument, and positive-controlled at the old pinned commit first so the instrument is known to still discriminate: `272e926e` reads 475 total / 281 prefixed = **194 unprefixed**, reproducing this row's original figure exactly. `origin/main` now reads 464 / 460 = **4**, identical to `origin/development`, and the parent's recorded gitlink `08bfa7f1` reads the same 4 — so the parent-side half is in step too. **The residual 4 are all legitimate and named**, not a remainder to chase: two are test artefacts (`card-unglue-contract.test.ts` — one a PROSE string describing the pattern, one a deliberate `<div className="grid grid-cols-2">` fixture), and two are entries in `FormLayoutBuilder.tsx`'s user-driven column map (`2: 'grid-cols-2'`), where the operator picks the column count — a data map, not a hardcoded non-responsive layout. | M |
| TH-10 | Card grid absent from two apps | **PARTIAL** | One app is **no longer plumbing-only** — 11 render sites across 9 dashboard views. The other is unchanged at zero and does not even carry the dependency. | L |
| TH-11 | Corporate error hue — operator taste call | **SUPERSEDED** | See §4. The ruling was made 2026-08-10 and is **recorded inline in the stylesheet**; the register carried it as pending seven days later. | — |

### PF — performance · ~~0~~ **2** DONE, ~~1~~ **1** PARTIAL, ~~2~~ **0** OPEN, 1 NOT-A-DEFECT — re-measured live 2026-08-19

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| PF-1 | 70 policies re-evaluate the session function per row | ~~**PARTIAL**~~ **DONE — re-measured live 2026-08-19** | **Code done, database untouched.** I re-measured independently: **69 unwrapped against 357 wrapped** (the 357 is the positive control proving the detector sees the fixed form), 67 in the main schema plus 2 in a Supabase-managed one. The migration with 69 matching statements is merged to `development` but **absent from the applied ledger** and not on `main`. Register said 70; live is 69. **Watch the 2 managed-schema statements — they may fail on ownership and abort the whole migration.** **CORRECTED 2026-08-19: "database untouched" was wrong.** Measured directly against production (`tuybltdrdefjblnplpqo`): **0** unwrapped `auth.*` calls remain across `public`+`realtime` (417 wrapped, positive control), and all 4 of `custom_fields_legacy_unused`'s policies carry the hoisted `(SELECT auth.uid())` form. `schema_migrations` carries a row for `20260817064500` with a NULL `statements` array — bookkeeping drift, not evidence the DDL never ran; the live catalog says it did. **DONE, no further action.** | S |
| PF-2 | 983 unused indexes | **NOT-A-DEFECT** | See §4. **690 of 974 sit on tables with zero rows.** | — |
| PF-3 | 68 tables run multiple overlapping permissive policies | ~~**OPEN**~~ ~~**PARTIAL — re-measured 2026-08-18**~~ **DONE — closed to the safe limit, re-measured live 2026-08-19** | Live advisor: **67**, across 63 tables. Long tail is 61 tables with one finding each. Mechanical, but **unlike PF-1 each merge is an authz change** and needs the red-team checklist — it is not a behaviour-preserving rewrite. **Re-measured 2026-08-18 against live production: **21** tables carry more than one PERMISSIVE policy for the same command, against **68** as filed. Two thirds of the class is gone. Left PARTIAL, not DONE: overlapping permissive policies OR together, so each remaining table still has a widest-limb question nobody has answered.** **CLOSED 2026-08-19.** `20260822050000` (described 2026-08-19g as "awaiting an operator dispatch") was already live. Re-measured: **64** table×role×command groups remain — exactly **66 reconstructed − 2 dropped**, matching that migration's own pre-apply arithmetic. Every one of the 64 was already individually triaged, not left open: **59** are `ALL`-vs-specific-verb overlaps that are structurally unmergeable (collapsing them would grant write access to everyone matching the read predicate — the 2026-08-16 cross-tenant leak, run in reverse); **5** are same-command-different-intent pairs (candidate-self/tenant-member, field-officer/reviewer, owner/platform-admin, self-upload/staff-upload, tenant-member/platform-admin) Postgres already ORs safely today but which stay as two policies so editing one intent cannot silently widen the other. No further consolidation is safe without re-accepting a risk already refused once. The residual advisor noise is 64 answered widest-limb questions, not an open one. | M |
| PF-4 | 9 policy-less tables; 2 duplicate indexes; one legacy table | ~~**OPEN — CONFIRMED still open**~~ **PARTIAL — (b) DONE, (a) not-a-defect (count drifted), (c) open by design — re-measured live 2026-08-19** | Composite. **(a) NOT a defect** — all nine policy-less tables grant to the service role **only**, with zero untrusted grants; that is the intended deny-all posture and adding policies would *loosen* them. **(b) OPEN** — 2 duplicate index pairs confirmed. **(c) OPEN** — the legacy table is live with 4 policies, all 4 among PF-1's 69. **Decide (c) before PF-1 reaches `main`, or 4 of its statements are wasted.** **Re-measured 2026-08-18 against live production: **9** tables have RLS ENABLED and **zero policies** — exactly the figure filed. RLS on with no policy denies every row to every non-superuser, so these are unreachable rather than exposed; the defect is that nobody can say which of the two states was intended. Unchanged since filing.** **(b) NARROWED 2026-08-19 — authored, merged and deployed; only the APPLY remains.** `crm7/supabase/migrations/20260822050000_pf3_pf4b_drop_provable_redundancies.sql` is on `origin/development` AND `origin/main`, and it drops exactly the two pairs the live advisor still reports: `public.leave_balances {idx_leave_balances_employee, idx_leave_balances_employee_id}` keeping the column-named one, and `public.timesheets {idx_timesheets_placement_id, timesheets_placement_id_idx}` keeping the estate's dominant `idx_<table>_<column>` form. It sits in the pending set awaiting an operator `workflow_dispatch`, so the advisor will keep reporting both pairs until that runs — the finding is live, the fix is not applied, and those are different states. **That file also carries its own near-miss, worth reading:** it was renumbered `20260822010000` -> `20260822050000` because three crm7 files claimed the first version and one had already applied. The ledger is shared across eight scopes and keyed on the version alone, so this migration would have been SKIPPED FOREVER, silently, on a green run. **(c) unchanged.** **(b) CLOSED 2026-08-19, confirmed live — was not "awaiting dispatch".** Both doomed indexes (`idx_leave_balances_employee`, `timesheets_placement_id_idx`) are absent live; both survivors are present. The migration already ran. **(a) count DRIFTED, still not-a-defect.** Re-measured: **11** policy-less RLS-enabled tables, not 9 — new: `r7_talent_pool_redeem_attempts`, `xero_tax_rate_cache`. All 11 grant zero privileges to `anon`/`authenticated` (checked per role × SELECT/INSERT) — deny-all posture holds across the wider set. **(c) unchanged, re-confirmed** — `custom_fields_legacy_unused` still 0 rows live; dropping it alone remains scope creep against the batch-retirement plan; that batch's other zero-row orphans are outside the PF cluster's boundary. | S |

### PO — portals · 1 DONE, 1 PARTIAL, 3 OPEN

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| PO-1 | Walled field-officer portal not retired | ~~**OPEN**~~ **PARTIAL — re-measured 2026-08-18** | Both walled pages exist and are routed/linked at HEAD; a rename **re-landed** the duplicate, so the de-duplicate-not-retire outcome the ruling forbids is the *shipped* state in both repos. The mandatory half is untouched: a policy scan for any caseload predicate returns **0 rows**. **Re-measured 2026-08-18 and the two halves have diverged. **The mandatory half is now authored:** crm7 migration `20260823010000_field_officer_caseload_rls.sql` exists and carries the caseload predicate the row said a policy scan could not find — it is on `main` and applies on the next operator dispatch. **The retirement half is untouched:** `crm7/src/pages/field-officers/` still holds site-assessment, site-visits, case-notes, actions, incidents and competency, and `App.tsx` still lazy-routes them (lines 265, 268, 271, 274). De-duplicate-not-retire remains the shipped state.** | L |
| PO-2 | The supervisor concept does not exist in the data | **PARTIAL** | **The register's premise is measurably wrong** — the role exists with real rows, and the supervisor→worker relation exists as two foreign keys, both predating the register. What is genuinely absent is the **scoping** half: a policy scan for the supervisor column returns **0 rows**, so a supervisor is scoped to the whole employer, never to their own workers. Data also sparse (2 of 34 placements). | M |
| PO-3 | Host-role limb on contacts | **DONE** | Live policy carries the full host limb with correct negation on the ordinary-staff limb. Helpers are security-definer with a pinned search path, and execute is granted to the service and logged-in roles only — **anon has none**. A cross-tenant first draft was corrected and the live body reflects the fix. | — |
| PO-4 | Staffing orders, safety questions, payslip viewer, chasing | **OPEN — CONFIRMED, nothing shipped** | **Every one of seven expected tables resolves to null.** Nothing shipped. **Re-measured 2026-08-18: all seven expected tables — `staffing_orders`, `safety_questions`, `payslips`, `payslip_views`, `chasing_log`, `order_chasing`, `safety_question_responses` — appear in **zero** migration files across crm7 and conduit. Unchanged since filing.** | L |
| PO-5 | Host money view gated on M-3, M-4 and M-7 | **OPEN — CONFIRMED, and correctly blocked** | Both gates confirmed unchanged (rates 0 of 156; catalogue 8 of 21). **Accuracy risk is real but narrower than filed:** 1 of 19 ladders carries a clause-read allowance scale, not 2 of 21 — the other 18 render a shipped "unverified default" warning. The view itself is not started. **UPDATE, same day:** M-3 and M-4 are now closed for MA000020 (see their rows above) — the whole live-placement population, per `award_trades` — but that does not move this row. **M-7 alone still fully blocks PO-5**: `award_classifications` is 0 rows for *every* award including MA000020, and it is the parent key rates are seeded from, so the host money view has nothing to render regardless of clause coverage. **Re-measured 2026-08-18. This row is gated on M-3, M-4 and M-7, and **M-7 is still the hard gate**: live `public.awards` 156 rows, `public.award_rates` **0**. A host money view cannot be built on a rate table with nothing in it. Blocked by data and an operator ruling, not by engineering capacity — see M-7.** **RE-MEASURED 2026-08-19:** M-7 is unchanged and remains the hard gate — live `award_classifications` 0, `award_rates` 0, for every award including MA000020 (M-7's own re-measurement this pass also found a `sync-award-rates-weekly` cron job now scheduled, but confirmed it cannot seed either table even once it runs — see M-7). M-3 and M-4 both moved this pass (M-4 especially: 21 of 23 awards now carry an allowance catalogue, up from 10), but neither changes this row: M-7 alone fully blocks it regardless of clause/allowance coverage, because a host money view has nothing to render against an empty rate table. VERDICT unchanged: OPEN, blocked by data and the same operator decision named in M-7 (Fair Work credential + global-vs-tenant ruling), not by engineering capacity. | L |

### D — documentation hygiene · ~~0 DONE, 11 OPEN, 1 NOT-A-DEFECT~~ ~~11 DONE, 0 OPEN, 1 NOT-A-DEFECT~~ **9 DONE, 1 PARTIAL, 1 OPEN, 1 NOT-A-DEFECT — re-measured row by row 2026-08-18**

> **The header and its own rows disagreed, and both were wrong.** The header claimed
> 11 DONE / 0 OPEN from the 2026-08-17 sweep; every row beneath it still read **OPEN**.
> Re-measured each against the files rather than trusting either.
>
> **Nine are genuinely done** (D-1, D-2, D-4, D-7, D-8, D-9, D-10, D-11, D-12) — each row now
> carries the measurement that says so. **D-6 is PARTIAL** and **D-3 is OPEN**; they are left
> that way rather than swept up with the rest.
>
> D-10 needed a POSITIVE CONTROL to close honestly: the placeholder pattern was first checked
> against the template itself, so that finding zero elsewhere meant "no unfilled templates"
> rather than "my pattern is broken". Both halves closed — 0 unfilled docs estate-wide, and
> every Tailwind mention in the theme package says v4 against a resolved 4.3.3.
>
> **A grep hit is a hypothesis, exactly like a grep zero.** Four of these eight looked open
> to a naive search and were not: the phrase being searched for survives *inside the
> correction banner that records why it was wrong*. D-2 still contains "purple", D-7 still
> contains "229 tables", D-12 still contains "nothing is promoted" — each within a blockquote
> headed NO LONGER TRUE or POPULATION SUPERSEDED. Reading the surrounding context is what
> separates a live claim from its own retraction, and it changed the verdict on half of
> this section.
>
> **CORRECTION, 2026-08-17 (later the same day).** Every OPEN row below was fixed within hours of
> this ledger's own "measured 2026-08-17" timestamp — most by a dedicated hygiene pass
> (`a5a05ba7`, "repair the indexes agents read first"), landed the same morning this ledger was
> written but not reflected back into these rows. Verified live at `origin/development`, not
> re-derived from commit messages: D-1 (`docs/README.md` + `plans/README.md`/`STATUS.md`
> cross-links repointed, 0 dangling); D-2 (destructive-colour rows now read red, matching the live
> token); D-3/D-6 (page-builder version + R80.3→R80.4 corrected in every *living* reference doc,
> commit `1078255f`); D-4 (retired model identifiers removed from the AI contributing guide without
> reproducing them); D-7 (security-inventory counts bannered to the live 402 tables / 222
> functions); D-8 (references folder indexed, dangling links repointed); D-9 (STATUS.md bannered
> historical); D-11 (16 named plans bannered superseded, `afb091e3`); D-12 (handback document
> bannered — promotions are no longer described as absent).
>
> **D-10 is the one genuinely closed *after* this ledger, not merely uncredited by it**, and it
> is the sharpest instance of "merged is not applied" this sweep found: both fixes existed on
> their submodules' own `origin/development` — `throughput#308` (fills all five component-doc
> templates) and `braden#409` (corrects the Tailwind v3 claim) — but this repo's pinned submodule
> commits predated both merges, so nothing in this repo's evidence chain could see them. The
> docs-sweep branch (`fix/docs-full-window-sweep`) advances both pointers; re-grepped afterward for
> `[Describe what`/`[Category:`/`[Team/Person`, zero live hits remain (one self-referential banner
> line in each file quotes the old marker, which is not the same as containing it unfilled).
>
> D-5 stands as originally recorded: **NOT-A-DEFECT**.

Cheap, and the reason agents keep re-deriving the same wrong things — this class is now fully
closed as of the pointer-bump above; the original OPEN verdicts are left visible below rather than
rewritten, per this estate's docs-hygiene convention.

| # | Item | Verdict | Evidence measured 2026-08-17 | Size |
|---|---|---|---|---|
| D-1 | Docs index dangling references | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Script over 104 references: **18 genuine dangling** (register said 21), including 9 documents it calls canonical. An entire archive subtree it references **does not exist**. **Re-measured 2026-08-18: the docs index carries 22 markdown links and **0 dangle**.** | S |
| D-2 | Standards guide says the destructive colour is purple | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Three lines still wrong against the live token, which is red. The rulebook still routes agents to this document — every agent that reads it burns a CI round. **Re-measured 2026-08-18: the semantic table names `--role-error` / `--role-destructive` as `oklch(0.580 0.230 25)` **RED**. The word "purple" survives only inside the "Corrected 2026-08-17" blockquote that explains why the old value was wrong.** | S |
| D-3 | Shared-package table names a four-minor-stale version | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | **Misattributed by the register** — the rulebook carries no package table at all (zero hits). The stale rows are in **three other files**. Lockfile truth is 0.9.0 in all five apps. **Re-measured 2026-08-18 across every top-level doc: **21 stale `@bsuite/<pkg>@<version>` pins in 13 files**. Only ONE was a live authority claim — the documentation hub's §2.2 "the package is the source of truth" table, whose five pins had drifted by up to whole majors. Those are removed (see the hub's own note). **The other 20 are deliberately left alone**, and that is the finding rather than an omission: they are DATED RECORDS, where the version IS the fact. `dependency-bump-checklist:177` names `@bsuite/auth@0.2.0` as the version that regressed in a specific incident; `platform-operations-reference:163` records that `@bsuite/ui@1.0.3` was running while 1.1.0 was published. Rewriting either would falsify the measurement it exists to preserve. Same discipline as D-6: the tempting sweep is the wrong fix.** | S |
| D-4 | AI contributing guide documents two retired models | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Both lines still present, plus the surrounding sample that teaches a retired identifier as the good example. *Identifiers deliberately not reproduced — a drift scanner hard-fails any live document naming them, and this ledger complies.* **Re-measured 2026-08-18: **0 hits** for the xAI fast-reasoning id (canonical literal in `scripts/drift-scan.mjs`), `claude-3` prefix or the retired GPT-4 turbo id in `docs/ai/CONTRIBUTING.md`.** *(The retired literals are deliberately NOT reproduced in this row: STALE-GROK is a hard-fail drift signal that scans NEW lines in ANY file, this one included, and it does not honour the `theme-audit-ok` marker — only the hex signal does. Writing the id in order to record its absence fails the very gate that keeps it absent, which is what happened on the first attempt.)* | S |
| D-5 | Root README calls the old file the single outstanding-work index | **NOT-A-DEFECT** | See §4. The phrase matches **only the register itself**. | — |
| D-6 | 40 docs still scope the archived calculator version | ~~**OPEN**~~ ~~**PARTIAL**~~ **DONE — re-measured 2026-08-19** | **42** top-level, 117 across the tree — **marginally worse than filed, not better**. The submodule has moved on and the root README already names the new one. **Re-measured 2026-08-18: **47** top-level docs mention R80.3 (filed as 42) and **10** carry an `R80.3/<path>` pointer, 31 references. A blanket rename is REFUSED and the reason is recorded: R80.4 is a RESTRUCTURE, not a rename — **18 of the 20 distinct paths do not exist under R80.4 either**, so rewriting would swap a visibly stale pointer for one that looks current and is still broken. `docs/README.md` now carries the authority saying these are historical and where the originals went. Left PARTIAL, not DONE: the references themselves remain.** **CLOSED 2026-08-19, and the two halves were treated differently because they ARE different.** The blanket rename stays refused for the reason already recorded. What was missing is the other half of that ruling: if a pointer is not going to be rewritten, the document has to SAY it is historical, or a reader has no way to know. **119 live docs reference R80.3; all 119 now carry a marker, 0 unmarked** — 106 gained a one-paragraph banner naming the 2026-08-06 restructure, the archive location, and why the paths are deliberately left alone. Purely additive: +729 / -4 across 106 files, the four deletions being banners removed again where they turned out to mark nothing. **FOUR WERE LIVE CLAIMS, NOT RECORDS, AND THOSE WERE FIXED RATHER THAN BANNERED.** The operational runbooks under `docs/runbooks/` are instructions to follow NOW, and each named `R80.3` as a currently-valid value: the migration-dispatch guide and the edge-function deploy guide both listed it among the accepted `submodule` workflow inputs — where the workflows accept `R80.4` and would reject `R80.3` outright — the parent-pointer guide listed it among the six submodules in `.gitmodules`, and the tenant-switching guide listed it among the D2C apps. Anyone following the dispatch runbook to apply the pending migrations would have passed a value the workflow does not offer. Each was verified against its own ground truth before editing: `git config --file .gitmodules`, and the `type: choice` option lists in `supabase-migrate.yml` and `supabase-functions-deploy.yml`. | M |
| D-7 | Two stale security inventories | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Live: **402 tables and 222 security-definer functions**. Documents claim 229 and 59, and one asserts "all 59 are accounted for" — **now false by 163 functions**. **Re-measured 2026-08-18: the audit opens with "⚠ POPULATION SUPERSEDED — re-measured 2026-08-17", stating 229 -> 402 explicitly. Live today: **403 tables, 226 SECURITY DEFINER functions**. The stale figure survives only inside that banner.** | M |
| D-8 | Operator-verification index dangling links; references folder has no index | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | **5 of 9** links dangle (positive control: the other 4 resolve). The references folder holds 10 files and no index. Both targets point into the archive subtree that D-1 shows is gone. **Re-measured 2026-08-18: the operator-verification index has 4 links, **0 dangling**, and `docs/references/README.md` exists.** | S |
| D-9 | Consumed prompts in the plans index; status file stale; false claims | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | The status file is **6.5 weeks stale** and still cites a superseded index — and it is the first file an agent opens. **3 of 5** cross-links dangle, which is the "three false claims", measured. **Re-measured 2026-08-18: `docs/plans/STATUS.md` was last touched **2026-08-17**, not 6.5 weeks stale.** | M |
| D-10 | Five component docs are unfilled templates; a theme doc claims the wrong framework version | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | Exactly **5** files still carry the placeholder text; the theme doc claims v3 against a resolved v4.3.3. **Re-measured 2026-08-18 with a POSITIVE CONTROL (the pattern matches the template itself, so a zero elsewhere means something): **zero** unfilled template docs anywhere in the estate — all nine throughput component docs carry 0 placeholder lines. The framework half is also closed: every Tailwind mention in `packages/theme/docs/` and `packages/theme/README.md` says **v4**, and crm7 resolves **4.3.3**.** | M |
| D-11 | Mark 16 named plans as superseded | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | **15 of 16 return zero** supersession hits. The one non-zero is about something else entirely and still carries a not-yet-executed status despite the capability having shipped. **Re-measured 2026-08-18: **26** files under `docs/plans/` carry a supersession marker.** | S |
| D-12 | Handback document rests on "nothing is promoted" | ~~**OPEN**~~ **DONE — re-measured 2026-08-18** | No banner; §1 still reads "nothing security-related is live". Last touched **before** the promotions *and* before today's applies — **falsified twice over now, not once**. **Re-measured 2026-08-18: §1 carries "⚠ NO LONGER TRUE — corrected 2026-08-17" directly under its heading, and names the promotions that expired its premise.** | S |

---

## 3. What is genuinely still open

### ~~The single highest-value open item: **K-2**~~ — CLOSED 2026-08-18

~~**A permission failure renders a green 95% compliance score.**~~ Both halves of K-2 are now fixed.
The catch-path fabrication (`DEMO_STATS`, `overallScore: 95`) had already been removed on
`development` before this pass. What survived, and what shipped to production, was the
divide-by-zero guard one line away from it:

```
const score = totalChecks > 0 ? Math.round((compliantChecks / totalChecks) * 100) : 95
```

`totalChecks` is `apprentices.length + hosts.length + visits.length`, so a **brand-new tenant with
nothing on file at all** — the most likely state of a first customer on their first day — was shown
a green 95% compliance ring derived from an empty set. The fabrication had moved from the failure
path to the empty path, and only the failure path had been looked at.

That is the shape worth naming for the rest of the K class: **a fallback removed from one branch
tends to survive in the guard clause beside it**, because the guard reads as arithmetic hygiene
rather than as a claim. It is a claim. `computeOverallScore` now returns `null` when nothing was
checked, and the score widget renders the honest empty state instead of a ring.

The reasoning that made K-2 highest-value still applies to K-1 and K-3…K-5, which remain open:
**severity** (the system asserting a falsehood about regulatory compliance to a compliance officer),
**cheapness**, and **breadth**.

Two runners-up, for different reasons:

- **PF-1 — the cheapest win in the ledger.** The fix is written, correct, and merged; it clears 69
  findings at once. The remaining work is a promotion to `main`, not engineering. Guard the two
  managed-schema statements, and settle PF-4(c) first or 4 statements are wasted.
- **M-7 — the chain-gate.** Nothing in the money chain moves until rates exist, and the newly
  measured fact is that **classifications must be seeded first** because they are the parent key.
  That ordering was not previously stated. **Sharpened 2026-08-18, and it is worse than an
  ordering problem: there is no seeder.** The live `sync-award-rates` function writes
  `award_rate_cache` and `award_templates` only — never `award_classifications` or `award_rates` —
  and `award_rate_cache` is itself 0 rows, because the cron job crm7's migration schedules does not
  exist in the live `cron.job` table at all. So the item is not waiting on a run; it is waiting on
  a decision and a credential. See its row for the four measurements.

### Grouped by what unblocks what

**Merged but not live — 3 items, all S, zero engineering left.** T-6, PF-1, and P0-4's functional
half. These are the ledger's most dangerous category: they look done in the repository and are
defective in production. *Do these first — they are the cheapest true closures available.*

**Invented data reaching users — ~~5~~ 4 items + the blocked component.** ~~K-1…K-5~~ K-1 and
K-3…K-5, gated on K-0. **K-2 closed 2026-08-18** — and closing it showed the component was already
reachable: `@bsuite/ui`'s `DataUnavailable` resolves in BSU today and the fix imports it directly,
so "the shared component is unpublished" is not a blocker for every remaining item in this class.
Re-check K-0 per app before treating it as the gate.

**The money chain — 10 items, mostly L.** M-1…M-10 feeding PO-5. Sequence: M-7 (seed
classifications, then rates) → M-3/M-4 (coverage and allowances) → M-5 (wire the engine) → PO-5.
M-2, M-6 and M-9 are S items that can land immediately and independently. **Updated 2026-08-18:**
M-2 and M-9 have landed, and M-5's shipped-path half has (R80.4#95) — the resolver now has a real
consumer and the wage no longer depends on MAPD row order. M-7 is now the **only** thing gating
PO-5 from this chain, and it is gated in turn on an operator decision, not on engineering.

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

**Documentation — 11 items, nearly all S.** ~~The whole class is a day's work and it is why agents
keep re-deriving wrong answers. D-2, D-3 and D-4 actively teach falsehoods to every agent that
reads them.~~ **CORRECTION, 2026-08-17 (later the same day): closed.** All 11 now DONE — see §2
"D — documentation hygiene".

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
| M-3 award partials | 37 / 16 awards | ~~39 / 17 awards~~ **66 / 17 of 23 awards** (2026-08-18) | **worse again** |
| M-4 allowance catalogues | 8 / 21 awards | **10 / 23 awards** (2026-08-18, executed not grepped) | ratio unchanged |
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
- **M-10 carries two issues as gaps that shipped — but only partly, and the correction was itself
  wrong.** Three of four engagement types now price and their tests pass. R80.4#46 still could not
  be closed: its acceptance criteria name **four** selectable types and ABN is one of them, so
  closing it would have been a doc saying done. It was retitled and narrowed instead, with file:line
  evidence, on 2026-08-18. #5 stays open for the ABN treatment. *A stale title is fixed by fixing
  the title, not by closing the issue underneath it.*

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
5. ~~**The D class**, nearly all S — it is a day, and it stops agents learning falsehoods.~~
   **DONE, 2026-08-17 (later the same day)** — see §2 "D — documentation hygiene".
6. **M-7 → M-3/M-4 → M-5 → PO-5**, the money chain, in that order. *M-5's shipped-path half closed
   2026-08-18 (R80.4#95); M-7 is now the chain's only remaining hard gate, and it needs an operator
   decision — a Fair Work credential and a ruling on global-vs-tenant rate rows — before any of it
   is engineering.*
7. **G1 triage** — the D-59…D-92 backlog needs to enter a register before it can be worked.
