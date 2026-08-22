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
