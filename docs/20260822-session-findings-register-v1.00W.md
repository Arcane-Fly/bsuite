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

| # | Finding | Measured |
|---|---|---|
| **W-1** | `rate_adjustments` and `billing_cycles` have **zero application reach** | Both created and applied 2026-08-22. Each appears in exactly **two files, both SQL**. No store, service, hook, type, page or edge function in any app. The 8 RLS policies and `has_tenant_role()` gate a surface that does not exist. Raised by the Datum lane as **W5**. |
| **W-2** | `gto_complaints.external_referral` is unread | Column now exists. `external_referral` appears only in migrations, and in `src/schemas/welfareReport.ts` — which is a **different table** (`welfare_reports`). `gtoComplaintStore.ts` and `ComplaintSelector.tsx`: **0** references. |
| **W-3** | 22 docs cite a gate that no longer exists | `ci.yml`, `quality.yml`, `db-lint.yml`, `e2e.yml`, `verify.yml`, `check-unscoped-select-policies.mjs`, `check-migration-parity.sh`, `check-lockfiles.mjs` and others. A doc naming a deleted gate **reads as evidence**. Only `audit-applied-tokens.sh → .mjs` had an unambiguous replacement; that one is fixed. |
| **W-4** | R80.4 deployed without `--frozen-lockfile` | `vercel.json` declared no `installCommand`, so Vercel ran a plain `pnpm install` — free to resolve past the lockfile pins. **Fixed** on branch `fix/vercel-frozen-lockfile` in R80.4; that is R8's repo so the branch is left for their lane. |
| **W-5** | No gate detects a table with no application reach | The phantom-migration gate catches *recorded but not created*. Nothing catches *created but unreached* — W-1 is the current example and it is this session's own work. A first probe found 16 of 28 sampled tables "zero reach" and **at least 2 of those were the probe being wrong**, so this needs building properly, not quickly. |

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
