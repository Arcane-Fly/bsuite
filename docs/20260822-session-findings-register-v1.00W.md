---
kind: record
authority: none
owner: bsuite-lane
---

# Session findings register — 2026-08-21/22

**Date:** 2026-08-22
**Status:** W
**Scope:** Every finding raised or measured in the 2026-08-21 estate session that is NOT closed.
**Why this exists:** the session produced measurements faster than it produced dispositions. A
finding with no owner and no next action is indistinguishable from a finding nobody had.

---

## 1. Needs an operator ruling — blocked, not forgotten

| # | Finding | Measured | Why it is a ruling, not a fix |
|---|---|---|---|
| **R-1** | `leads` status is written by two apps that do not own it | `business-suite-unified/src/pages/Developer/Website.tsx:367` and `braden/src/components/admin/kanban/LeadsKanban.tsx:106` both `.update({status})`. The one-shot map says **Leads · owner CRM7 · braden captures via crm7 lead-capture path**. **crm7 itself has ZERO `leads` update call sites.** | The owner never writes the table. Either the status transition moves behind a crm7-owned RPC, or the ownership map is amended to name a lead-**pipeline** consumer. Both change doctrine. Annotating `one-shot-ok` would record a fork as permitted. |
| **R-2** | `guest` is live data and undeclared in code | `user_tenants`: owner 8, admin 3, **guest 2**. `guest` appears **0** times in BSU's `Role` union and **0** times in `ROLE_PERMISSIONS`. Denied everything — correctly, and until 2026-08-22 **by accident** via optional chaining. | Two defensible answers with different behaviour: declare `guest` read-only, or reject it at the door as an invalid membership state. Runtime is unchanged and now pinned by tests either way. |
| **R-3** | Doc-naming enforces a convention retroactively | **70 of 333** dated docs violate `YYYYMMDD-kebab-vMAJOR.MINOR[STATUS].md`. 38 differ by a single character (missing `v`). | A rename was attempted and **reverted**: the blast radius is **51 files across all six submodules**, including applied migrations and pgTAP tests that cite doc names in comments. Those are historical records. Options: forward-only cutoff in the gate, or accept as known debt. |
| **R-4** | Three published packages reach no app | `@bsuite/jodie` (3 versions on npm, own publish workflow), `@bsuite/eslint-config`, `@bsuite/tsconfig` — each **declared by 0 apps, absent from all 6 lockfiles**. Consumers vendor the eslint rules inline instead. | Either an app should depend on it, or it should stop publishing. A product decision, which is why the guard reports rather than fails. |
| **R-5** | `host_employer_id` points at two different tables | `employers` in `host_agreements`, `boot_assessments`, `disciplinary_cases`, `incentive_claims`, `induction_records`. `clients` in `apprentice_placements`, `gto_compliance_evidence`, `incidents`. | One column name, two entities. A data-model question. Recorded in `20260831000000`'s comment, deliberately not settled there. |

---

## 2. Real work, unowned — no ruling needed, just not done

| # | Finding | Status | Measured |
|---|---|---|---|
| **W-1** | `rate_adjustments` and `billing_cycles` have **zero application reach** | **OPEN** | Both created and applied 2026-08-22. Each appears in exactly **two files, both SQL**. No store, service, hook, type, page or edge function in any app. The 8 RLS policies and `has_tenant_role()` gate a surface that does not exist. Raised by the Datum lane as **W5**. |
| **W-2** | `gto_complaints.external_referral` is unread | **OPEN** | Column now exists. `external_referral` appears only in migrations, and in `src/schemas/welfareReport.ts` — which is a **different table** (`welfare_reports`). `gtoComplaintStore.ts` and `ComplaintSelector.tsx`: **0** references. |
| **W-3** | 22 docs cite a gate that no longer exists | **CLOSED** #2246 | `ci.yml`, `quality.yml`, `db-lint.yml`, `e2e.yml`, `verify.yml`, `check-unscoped-select-policies.mjs`, `check-migration-parity.sh`, `check-lockfiles.mjs` and others. A doc naming a deleted gate **reads as evidence**. Only `audit-applied-tokens.sh → .mjs` had an unambiguous replacement; that one is fixed. |
| **W-4** | R80.4 deployed without `--frozen-lockfile` | **PR OPEN** R80.4#169 | `vercel.json` declared no `installCommand`, so Vercel ran a plain `pnpm install` — free to resolve past the lockfile pins. **Fixed** on branch `fix/vercel-frozen-lockfile` in R80.4; that is R8's repo so the branch is left for their lane. |
| **W-5** | No gate detects a table with no application reach | **CLOSED** #2243 | The phantom-migration gate catches *recorded but not created*. Nothing catches *created but unreached* — W-1 is the current example and it is this session's own work. A first probe found 16 of 28 sampled tables "zero reach" and **at least 2 of those were the probe being wrong**, so this needs building properly, not quickly. |

---

## 3. Docs completion — the answer is zero, and why

Operator bar: a completion word in the **filename** only if **(a)** superseded, or documented a
non-best-practice since corrected, **and (b)** the thing described is 100% proven production code.

| | |
|---|---|
| docs in the estate | **463** |
| cite a gate that exists | 34 |
| every cited gate passes | 2 |
| **meet both limbs** | **0** |
| cite nothing checkable | 429 |

**2,122 docs carry `W`** against 356 `D` and 338 `A`. The corpus is overwhelmingly *working*
documents. The two that cleared limb (b) fail limb (a) in their own words — the audit tracker
states *"The audit is not complete until confirmed gaps have a disposition."*

Measured by `scripts/audit-doc-completion.mjs` (9 self-tests). **It renames nothing**, and reports
limb (b) only; limb (a) is a judgement about content that no script here reads.

---

## 4. Closed this session, for contrast

Required-field markers (52 fields, 22 pages, gated) · page-title gradient (209 titles, two apps) ·
CORS wildcard on a token-holding endpoint · conduit's five edge functions · `rate_adjustments` and
`billing_cycles` created after a migration recorded-but-never-applied · the phantom-migration
detector · the reach guard's zero-consumer blind spot · `normalizeRole` no longer casts typos to
valid roles · 39 orphan branches triaged to zero.

---

## 5. The pattern worth carrying

Eight measurement errors in one session, every one the same shape: **a tool produced a confident
number over something it could not see.**

A truncated string. A `merge-tree` invocation that returned nothing. A grep matching prose. A local
`dist/` read as the published package. A probe running against `about:blank`. A keyword match called
a citation. An empty list vacuously passing. A gate whose `continue` made a whole class invisible.

Each was caught by a control that had to pass, or by a command that actually ran — never by
re-reading the output. **The fix is not more care; it is a control that fails when the measurement
is dead.**

---

## 4. Resolved 2026-08-22, and what the numbers turned out to be

### W-3 — the "22 dead gates" was wrong in three separate ways

**Not one gate had been deleted.** The question was measured four times and the first
three answers were each wrong:

| Answer | The bug |
|---|---|
| 19 dead | `existsSync` was tried only at the parent root, so every submodule script read as deleted |
| 6 absent | The extension alternation let `.json` be cut to `.js`, inventing `scripts/hook-suppression-baseline.js` — a file nothing had ever cited |
| 11 stuck | After the docs were **fixed**, the same 11 still failed: `\bscripts/dod.mjs` matches inside `R80.4/scripts/dod.mjs`, because a slash is a word boundary |

The truth: **11 unqualified** submodule paths, **2 external** (the `~/.agents` hub),
**4 never written**. Closed by #2246, which fixed the 11 and added
`scripts/check-doc-citations-resolve.mjs` with those three bugs as self-tests.

The four never-written scripts — `pnpm-audit-all.sh`, `check-base-stack-only.sh`,
`check-peer-deps.sh`, `check-plan-cross-links.sh` — stay reported rather than deleted
from the docs. Whether to build those gates or drop the prescriptions is a judgment
call and belongs here, visible.

### W-5 — the reach gate exists, and its own count moved four times

`scripts/check-table-reach.mjs` (#2243). **462 tables, 4,057 source files, 164
unreached.** It reports rather than fails, because most of the 164 are legitimate.

The W-5 row above warned this needed building properly rather than quickly, and it was
right — the count went **212 → 196 → 165 → 164** and every step was the detector's own
bug, not an estate change:

- A backreference in `grep -oE` returned **zero** across all six apps.
- Stripping `$$ … $$` cleared eleven English words scraped from SQL comments, and
  silently lost two real tables created inside `DO $$` blocks. **A `DO` block runs real
  DDL; only a FUNCTION body is inert.**
- crm7 reaches 40 tables through `createEntityStore<T>('x', …)` — 364 call sites — not
  through `.from()`.
- braden reaches tables through a union type fed to a generic CRUD service.

All four are now regression tests. What it still cannot see is stated in its output: a
table whose name is **computed at runtime**.

## 5. Found while doing the above

| # | Finding | Status |
|---|---|---|
| **X-1** | R80.4 — the wage calculator — had neither `AGENTS.md` nor `CLAUDE.md`. The other five apps have both, making the highest-stakes app the least-governed | **PR OPEN** R80.4#170 |
| **X-2** | The funding `method` values were recorded wrong. Source has **two** axes: `PASS_THROUGH` = `reduce \| passPercent \| none`, and `FUNDING_MODE` = `term \| perYear`. `passThrough` exists only inside a drift test | **CORRECTED** in R80.4#170 |
| **X-3** | 514 lines of Datum research existed **only as untracked files in a worktree** — one `rm -rf` from gone | **CLOSED** #2244 |
| **X-4** | 4.3 GB across 11 stale worktrees. Proven safe first: development's ledger is a strict superset (82 rows to their 80, none unique) and all three code fixes they claimed are already on development | **CLOSED** — removed, nothing lost |
| **X-5** | The classification gate charged full price for a typo fix — it blocked a PR whose entire content was fixing three dead citations | **CLOSED** #2245 |

### A non-finding, recorded so it is not re-raised

"Three of six submodules have no `.claude/`" is **not a defect**. The `.claude/`
directories that exist hold only auto-generated `agent-memory/` and `worktrees/`, both
git-ignored; the parent tracks **zero** files under `.claude/` because `.gitignore:49`
ignores it, and the 16 `bsuite-*` skills are **symlinks into `~/.agents/skills/`**.
Hub-canonical is the chosen architecture. Creating empty `.claude/` directories in
braden, conduit and throughput would be cargo cult.

## 6. The pattern, now measured

Across two days this session produced **eight measurement errors of one shape**: a tool
returned a confident number over something it could not see.

Every one was caught by a control that had to pass — never by re-reading the output.
That is why each gate shipped here carries a positive control that exits 3 rather than
printing a short, clean-looking list, and why the four table-reach bugs and the three
citation bugs are self-tests rather than commit-message anecdotes.

**A number is a hypothesis until a control confirms it.**

---

## 7. Second pass, 2026-08-22 — the theme defect and what it exposed

### The estate-wide defect, shipped to production

crm7 rendered `<html class="notranslate light" data-theme="dark">` — light and dark at
once. Colour tokens key on the `.dark` class; every Tailwind `dark:` utility keyed on
`[data-theme="dark"]`, because `darkMode: ['class', <selector>]` **replaces** the
default selector rather than adding to it. The boot script wrote both signals;
`ThemeProvider` wrote only the class. They agreed at boot and diverged permanently on
the first theme change.

**Every `dark:` utility in crm7 applied while the light tokens were active.**

It hid for months because a `dark:` utility with a *literal* value looks fine in light
mode — only `var()`-resolved ones expose it. The single symptom it produced was
*"the borders look hard without shadow or glow"*.

Fixed twice, deliberately: `@bsuite/theme` 1.0.2 makes the provider write both
(repair), and crm7's `darkMode` drops to `['class']` (removal, so it cannot recur).
crm7 was the **only** app with the attribute selector; that is why the bug was
crm7-only.

Shipped the whole chain: published → six lockfiles → six promotions → **all six
production branches on 1.0.2**, verified live.

### R-1 is no longer a question, it is a measured failing gate

`audit-one-shot.mjs` finds exactly two cross-app writes, both on `leads`:

| Site | Write |
|---|---|
| `business-suite-unified/src/pages/Developer/Website.tsx:367` | `update` on `leads` |
| `braden/src/components/admin/kanban/LeadsKanban.tsx:106` | `update` on `leads` |

`leads` is CRM7-owned. The ownership map grants braden exactly one role —
*"marketing capture via crm7 lead-capture path"* — and lists BSU nowhere on that
entity. Both are status transitions on existing leads.

**Not covered by the lifecycle-handover exception**, which was read rather than
assumed: that clause permits an immutable **copy of evidence artifacts** when a record
changes ownership domain. It is about copying documents, not about one app updating
another's records.

So the ruling R-1 needs is narrow and now fully evidenced: *does braden.com.au manage
leads, or hand them to crm7?* Everything needed to answer it is above.

### Four gates were reporting defects that did not exist

Each blocked promotions permanently under ruling V-3, which is how gates get routed
around.

| Gate | The bug |
|---|---|
| `canvasColumns` | Failed on container **width alone**, for a defect page-builder fixed 2026-08-17 — then two lines later said it could not evaluate because the page has no columns control |
| `gluedCards` | Failed **marketing pages** for having no canvas. Its guard checked whether react-grid-layout's *stylesheet* is loaded — an app-level fact in a SPA |
| `audit-doc-completion` | Built its evidence layer from the **parent only** while finding docs estate-wide, so submodule gates read as deleted. 164 → 264 artifacts; dead citations 23 → **13** |
| `audit-one-shot` | Correct, and **wired into no workflow at all**. Its baseline file had existed since 2026-08-17 and nothing read it |

`canvasColumns` was retired by interaction test at a **730px container** — below the
very threshold it failed on — where the slider correctly rescales the persisted layout
(`cols` 12→4→24, card `w` 12→4→24, `minW` 3→1→6).

### One finding I filed and had to withdraw

I wrote up the `gluedCards` hit as a card-resize ruling violation **before opening the
page**. `suite.crm7.app/` is the public marketing page. Retracted on the PR.

### What the remaining 13 dead citations actually are

Almost none are defects. Five cite `quality.yml`, **deliberately deleted** in crm7 —
and two of those five are the CI-guard audits that led to its deletion. Two are an
archive of the dashboard retired 2026-08-10. One is this register, citing dead gates
*because they are its subject*. About five are genuine dangling references, already
documented in #2248.

A historical record naming a gate that was later retired is correct. Under the
classification standard those are `kind: record`, and a record is never edited to suit
a later view of events.

## 8. Still open after this pass

| | |
|---|---|
| **R-1** | `leads` ownership — now a failing gate with both sites named, ratcheted at 2 |
| **R-2…R-5** | unchanged |
| **W-1** | `rate_adjustments` / `billing_cycles` still have zero application reach |
| | `check-base-stack-only.sh` — nothing gates a new runtime dependency against an allow-list |
| | 124 tables ORPHANED: no app reach and no server-side write |
| | A `[VERIFICATION]` complaint row sits in the GTO register; the page has no delete affordance |

---

## 9. The orphaned-table backlog, triaged

`scripts/check-table-reach.mjs` classifies every table declared across all six
submodules' migrations. After five blind spots in the detector were found and fixed
(see below), the measured state is:

```
451 tables declared      505 referenced
301 reached by app code
 36 written by the database — trigger, function body, or pg_cron (legitimate)
114 ORPHANED — nothing in any app, and nothing server-side
```

### Five blind spots in the detector itself

The first run of that gate reported **124** orphaned. Ten were not findings at all —
each a way of reaching a table the detector could not see:

| # | Blind spot | Hid |
|---|---|---|
| 1 | `.from()` matched only a literal string | 4 tables reached via `const T = 'x'; .from(T)` |
| 2 | No awareness of the db-proxy allowlist | a table reached by URL, guarded by `ALLOWED_TABLES` |
| 3 | Renames never applied | 3 tables reported under names that no longer exist |
| 4 | Drops never applied | 4 tables with an explicit `DROP TABLE` migration |
| 5 | TEMP counted as schema | a `CREATE TEMP TABLE` dropped in the same file |

**A detector is only as complete as the mechanisms its author knew about.** That gate
shipped with a positive control and 37 self-tests and still had all five. Only an
independent triage of its output against the code found them.

### The 114, sorted

| Class | Count | What it is |
|---|---|---|
| **A — legacy/superseded** | 9 | Named or commented as dead. Seven now auto-excluded by the rename/drop tracking |
| **B — baseline-only** | 19 | Declared only in the 2026-08-07 production dump; history predates the estate's own migration record |
| **C — feature never built** | 91 | Created by a dated feature migration, correct columns and RLS, no app ever referenced it. **The actionable class** |
| **D — false positive** | 5 | Reached by const, or by the db-proxy allowlist. All five now read REACHED |

### Class C, ranked by how completely it was built

Score = RLS×10 + policies×3 + FKs×2 + inbound references. A table with real policies
and foreign keys is more likely genuine intended work than a bare scratch table.

| Table | Created | Policies / FKs / referenced-by |
|---|---|---|
| `labour_requirements` | 20260730 | 4 / 8 / 1 |
| `apprenticeships` | 20250615 | 3 / 5 / 3 |
| `report_catalog_derived_measures` | 20260812 | 4 / 4 / 0 |
| `financial_period_annotations` | 20260812 | 5 / 2 / 0 |
| `quotes` | 20260228 | 4 / 3 / 1 |
| `qualification_occupation_links` | 20260729 | 4 / 3 / 0 |
| `employment_history` | 20250615 | 3 / 3 / 1 |
| `etp_pay_items` | 20260708 | 4 / 2 / 0 |
| `financial_reports` | 20260311 | 4 / 2 / 0 |
| `purchase_orders` | 20260708 | 4 / 2 / 0 |

`rate_adjustments` (1 policy / 5 FKs) and `billing_cycles` (1 / 3) — the two that
motivated the gate — remain in the middle tier, still orphaned.

### One pattern worth an operator ruling

`quotes` / `quote_line_items` (20260228) and `apprenticeships` / `employment_history` /
`pay_rates` / `wage_records` (20250615) look like **early data models since
superseded** — crm7's live workflows run through `charge_rate_quotes` and
`training_contracts`. That is the same displacement already proven for `contracts`,
which has a DROP migration.

They are **not** reclassified as legacy, because no migration comment says so and the
evidence bar for class A is an explicit statement. Retiring them the same way is a
decision, not a deduction.

---

## 10. The estate gate audit, and where all 85 landed

Every gate script in the parent was run: **85 total, 53 passing at the start.** The 13
failures resolved into four classes, and only five were defects.

### Real defects, fixed

| Gate | What was wrong |
|---|---|
| `check-no-cookie-sso` | **Security.** Failing on manual prose reading *"never add `cookieStorage`"* — the sentence forbidding the thing |
| `check-no-hex-in-dist` | Flagging `@xyflow/react`, `react-grid-layout` and Tailwind's `@layer properties` — third-party CSS the doctrine explicitly exempts. Fixing it then exposed a second defect: under `set -euo pipefail` a grep matching nothing exits 1, so the script died silently the moment an app came back clean |
| `verify-esm-imports` | Reported a **stale local dist** as a broken export. The published package was correct all along. Three more packages with stale builds surfaced once staleness became visible |
| `verify-submodule-scopes` | Correct — submodules were ahead of the recorded gitlinks. Fixed by advancing them |
| `audit-oklch-lightness` | 13 near-pure-white violations. Now **0** |

### Environmental — need an input this machine does not have

`check-schema-lag` (a `migration-history.json` produced from the DB), `semgrep-sast`
(semgrep binary; runs in CI as the `sast` checks), `audit-tables.sh` (live DB, several
minutes).

Each **fails loudly with instructions** rather than reporting clean, which is the
correct behaviour and worth saying plainly.

### Not gates

`prerender.mjs` — a build step documented as expected to fail locally.
`ship-all-apps.sh` — an operations script.

### Resolved by other work

`check-published-matches-source` now reports **"every published version matches the
source that claims to be it"**, exit 0. It was the gate that started the whole publish
investigation, reporting `@bsuite/dry-lint@1.0.1 — 2 differing`.

### Still open

`check-doc-naming` — pre-existing, and the subject of a reverted rename whose blast
radius was 51 files across six submodules. It is a policy question (R-3), not a bug.

## 11. Seven gates were reporting things that were not true

Not seven unlucky scripts. One shape, seven times, in a single day:

| Gate | Reported | Reality |
|---|---|---|
| `canvasColumns` | every page under 1200px fails | defect fixed 2026-08-17; page has no columns control |
| `gluedCards` | marketing page "not draggable" | a marketing page has no canvas |
| `audit-doc-completion` | 23 docs cite a deleted gate | evidence layer read the parent only |
| `audit-one-shot` | *nothing, ever* | wired into no workflow |
| `check-no-cookie-sso` | a cookie-SSO violation | the sentence forbidding cookie SSO |
| `check-no-hex-in-dist` | BSuite hex in the bundle | third-party CSS |
| `verify-esm-imports` | a broken export | a stale local dist |

**Every one blocked or hid real work.** Under ruling V-3 any FAIL blocks a promotion,
so an over-broad rule is not noise — it is a stopped pipeline. And a gate wired to
nothing is worse: it reads as coverage and provides none.

The estate's real defects were sitting behind that noise. `funding_offsets` is the
clearest case: an operator ruling made on 2026-08-20, committed the same day, reached
nothing that enforces it for two days — and the only signal was a red workflow run
nobody looked at, in a publish that had been failing since 2026-08-17.
