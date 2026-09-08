---
kind: record
authority: none
owner: bsuite
evidence:
  - docs/20260817-estate-remaining-work-register-v3.00W.md
---

# Estate remaining-work register

> **SUPERSEDED — FROZEN 2026-08-26. Do not work from this file.**
>
> The consolidated register is now
> [`docs/20260817-estate-remaining-work-register-v3.00W.md`](../20260817-estate-remaining-work-register-v3.00W.md),
> which carries a VERDICT per row against live sources. This one was written as a
> list of FINDINGS with no verdicts, so a reader cannot tell which rows are still
> true — and on 2026-08-26 an audit of the two most recent registers found that
> **eight of ten "outstanding" claims had already been fixed in code**, several of
> them months earlier. A stale register does not merely go quiet; it actively
> points lanes at problems that no longer exist while the real ones go unread.
>
> Kept rather than deleted because the rows record what was true on its date, and
> several later documents cite it. Frozen means exactly that: accurate as history,
> not as a work list.

**Created** 2026-08-12 · **Status** Working · **Owner** unassigned (all lanes handed over)

Every outstanding item across the six submodules and the parent, collected from seven lane
handovers and this session's own findings. **Ordered by dependency, not by effort.** The
rationale for the order is stated at each tier — the point is that doing these out of order
wastes the work.

Each row links to its GitHub issue. **This register is the ordering; the issues are the detail.**
It lives in the parent because the work spans submodules and no submodule can see its siblings.

---

## Where to track this — recommendation

**Keep using GitHub issues per repo, and keep exactly one ordering document — this file.**

Three things were considered and rejected:

- **The memory MCP alone.** Braden cannot read it. Anything operator-facing that lives only in
  memory reads as delivered and is not.
- **A GitHub Project board.** It cannot express "do A before B *because* B's verification depends
  on A", which is the whole value here, and it drifts silently when nobody grooms it.
- **Per-submodule registers.** Five of the top ten items are cross-submodule. A register that
  cannot see siblings is how the 16 migration-version collisions accumulated unseen.

**Maintenance rule:** an item leaves this file only when its issue is closed with evidence. If a
row's claim cannot be verified, it stays and the row records what could not be checked.

---

## Tier 0 — Restores the ability to verify anything

Nothing below this tier can be trusted until this is done. Two independent lanes hit the same
wall and both said so plainly rather than inventing a check.

| # | Item | Why first |
|---|---|---|
| 0.1 | **Prove live login on R80.4 — the reported blocker is half false** | Three lanes reported *"R80.4 has NO dev bypass and NO test credentials"*. **Verified 2026-08-12: the credentials exist.** `CRM7_E2E_EMAIL` / `CRM7_E2E_PASSWORD` are in the parent `.env.local`, and R80.4 authenticates through **BSU SSO** (`business-suite-oauth`, `suite.crm7.app`) on the same Supabase identity as crm7 — so the estate credential *is* the R80.4 credential. What is genuinely absent is an in-app role bypass, which does not matter once you can log in. `d.r8.crm7.app` returns 200. **Nobody had opened the file.** Until this is proven with a screenshot, every UI change in the estate is verified by tests and code-reading and by nobody actually using it — the least-verified layer is the one a human touches. |
| 0.2 | **Rotate `braden@braden.com.au`** | Credential hygiene. Do it *after* 0.1 so the live proof is not invalidated mid-run, then re-prove. |
| 0.3 | ~~**bsuite#1892 — no environment can validate a migration before production**~~ **CLOSED 2026-08-13.** | `d.crm.crm7.app` runs development code against **main's** schema, one shared Supabase project. A migration-dependent feature could not be validated anywhere before prod, so every migration shipped on reasoning alone. **"Costs money — operator's call" was wrong**, and the ruling `precedent__bsuite__20260812__spend_is_not_a_blocker_build_it_locally` said so: Supabase is installed locally. Closed in two halves — the CI rehearsal (`supabase-migration-rehearsal.yml`, already merged) and the **local** path, `pnpm supabase:rehearse` (bsuite#1977). Both replay every scope onto a copy of the **production baseline** and fail any migration that reports success while changing nothing. Proven by planting the estate's exact historical defect — `CREATE TABLE IF NOT EXISTS` on the existing `public.user_tenants` — and watching it be rejected (exit 1), alongside a good migration that passed. Runbook: [`docs/runbooks/20260813-local-migration-rehearsal-guide-v1.00W.md`](../runbooks/20260813-local-migration-rehearsal-guide-v1.00W.md). |

---

## Tier 1 — Live and silently wrong

These are wrong in production right now and produce no visible symptom. They rank above
feature work because time does not improve them and nobody will notice them.

| # | Item | Note |
|---|---|---|
| 1.1 | **crm7#1639 — gitleaks scans only the tip commit** | `--log-opts="-1"`. A secret in any earlier commit of a multi-commit PR is never scanned. **`gitleaks` is the only required status check on `development`.** Verified with the real v8.16.1 binary and a planted key. Fix lives in `ci.yml`. |
| 1.2 | **bsuite#1914 — cross-submodule migration-version collisions** | The ledger is keyed on version alone and shared; the lint scans one submodule. 16 collisions today. One already cost a security control (bsuite#1913, now closed by conduit#430). A second was caught mid-flight this session. **This will recur until the parent-level check exists.** |
| 1.3 | **crm7#1603 — 1,856 fatal errors over 80 days** | 87% of `error_log`. `useBranding` hard-throws for logged-out users, so every anonymous page view throws. Known-good fix pattern exists in R80.4's `AppShell`: always mount a context, never a try/catch. |
| 1.4 | **crm7#1623 — a comment disables the colour rule for a whole file** | `fullText.includes('@react-pdf/renderer')` — any mention, including a comment saying the file does *not* use it. Six crm7 files, four live product, including the quote signing page and the invoice email. |
| 1.5 | **bsuite#1908 — `Publish` red on every promotion** | `@bsuite/eslint-config` has never existed on npm and the token cannot create it. Nothing consumes it. Harmless, but a permanently-red job trains everyone to ignore the publish step. |

---

## Tier 2 — The operator's own gate, unmet

Braden's stated gate. Ranked here because Tier 0/1 change how it is verified, not whether it matters.

| # | Item |
|---|---|
| 2.1 | **40 award partials remain** — MA000009 Sch I; MA000104 Sch A+E; MA000036 Sch B/C/D/E |
| 2.2 | **Visual sign-off on `development`** before anything promotes to main. *Note: the estate was promoted to production this session under a later explicit instruction; this gate applies to the next cycle.* |
| 2.3 | **`ma000004JuniorRate` / `ma000005JuniorRate` unreachable** — `resolve-ordinary-rate.ts` has no junior query field, so the values exist and nothing can ask for them |
| 2.4 | **R80.4 save is device-local** — the caveat shipped, the persistence did not |

---

## Tier 3 — Decisions only Braden can make

Cheap to implement, blocked purely on a ruling. Grouped so they can be answered in one sitting.

| # | Question |
|---|---|
| 3.1 | **crm7#1605** — do the signed TFN declaration and super choice forms carry a retention obligation distinct from the captured fields? (I am confident on the TFN, less so on super.) |
| 3.2 | **crm7#1573** — employee number format `EMP-YYYYMM-NNNN`. It will appear on payslips. |
| 3.3 | **crm7#1569** — competencies attainment model: `/vet/units` is the register, `/competencies` is per-apprentice progress. Confirm the split is right. |
| 3.4 | **crm7#1607** — email colour policy. Blocked behind 1.4: adopting the exemption marker today would hide the banned pure white permanently. |
| 3.5 | ~~**`quality.yml` deletion**~~ **CLOSED 2026-08-13 — not a question.** The operator's standing rule ("get rid of bloat and dead code … not a ruling needed") is the answer; `precedent__bsuite__20260812__dead_code_is_deleted_without_a_ruling`. crm7's copy went in **crm7#1665** (merged 2026-08-12); conduit's — the **last** one on any `development` branch — in **conduit#452**. Two of the three stated reasons were re-checked and **one was false**: it *does* have a trigger (`workflow_dispatch`). The true version is stronger — it ran exactly twice ever, both 2026-03-06, under triggers since removed, and has never been dispatched in the five months since. Duplication confirmed as a strict subset of `ci.yml`; no branch protection references it on **either** endpoint (classic protection *and* rulesets). Branch `fix/ci-guards-deferred-items-20260811` was **not** used — it was ~130 files stale and its other changes had already shipped; the deletion was re-derived fresh. *A branch parked pending a decision is a depreciating asset.* |
| 3.6 | **`host_contracts`** — retire or wire |
| 3.7 | **`TGA_UNITS_SYNC_ENABLED`** — still `false`, pending the production Deno CPU-time check its own header asks for |

---

## Tier 4 — Structural, will keep generating defects

| # | Item |
|---|---|
| 4.1 | **`DraggableCardPage` silently drops any child that is not a `CanvasCard`** Seven of nine confirm-dialogs would have rendered nothing — button opens a dialog that does not exist, destructive action never fires, and the diff looks perfect. Found by accident. Needs a dev-time warning or a type-level guard. |
| 4.2 | **Coverage threshold exists (50/40), is unmet (31/26), and never executes** Worse than having none, because it reads as enforced. |
| 4.3 | **Four unlabelled SVGs** The real accessibility gap. *Correction: the earlier claim of "8 images missing alt including CRM7Logo" did not survive verification — zero raw `<img>` lack alt.* |
| 4.4 | **R80.4 has no `development` branch** Main-only, so it cannot follow the estate's feat→dev→visual→main process. Either create one or record the exemption. |

---

## Tier 5 — Deliberately deferred, with reasons

Not oversights. Each needs a design, not a column.

| # | Item |
|---|---|
| 5.1 | **Manual financial adjustments** — an accountant's correction with no underlying transaction. Real need. Must be *visibly* an adjustment in every report, never folded into a derived total; adding a hand-typed number to a computed one unmarked would recreate the mirror-table defect just removed. |
| 5.2 | **Email templates adopting the palette** — `_shared/email-branding.ts` now exists with nine derived values. Adoption is blocked behind 1.4. |

---

## Consolidation gates — everything returns to `development` here

Work fans out; convergence must be scheduled, not remembered. **No tier starts before the
previous tier's gate closes.** Full ritual in `20260812-pi-orchestration-brief-v1.00W.md`.

| gate | when | condition |
|---|---|---|
| **G0** | before any lane starts | every repo `main`/`development` **tree-identical**, zero open PRs, zero stale local branches, zero worktrees |
| **G1** | Tier 0 done | live login proven on crm7 **and** R80.4 — screenshot + page-unique marker + bogus-path control; merged to `development` |
| **G2** | each Tier 1 item | merged to `development` **individually** — a batch that fails is a batch nobody bisects |
| **G3** | before any `main` promotion | all lanes converged · migration versions collision-checked against **every** submodule · **Braden's visual sign-off** |
| **G4** | after promotion | applier watched to completion · every new object asserted by `to_regclass` / `to_regprocedure` / a grant query — **never** a `schema_migrations` row |

**Promoting a submodule to its own main applies nothing.** The applier watches the *parent's*
gitlink. On 2026-08-11 that gap put live production code against a schema missing three of its
tables.

## Tooling that is not optional

Every lane loads `bsuite-context`, plus: `bsuite-brand-system` for anything visual (pure white
and pure black banned in **every** role) · `bsuite-page-grid-layout` for card pages
(`DraggableCardPage` silently drops non-`CanvasCard` children) · `bsuite-rls-authz-red-team` for
RLS/definer/page gates · `supabase:supabase-postgres-best-practices` for any Postgres change ·
`biz-au-award-modelling` for Tier 2 · `test-verify-before-completion` then
`agent-definition-of-done` before claiming anything · **Context7 MCP** for any library fact,
never memory · **qig-memory MCP** for comms (namespace `bsuite`, prefix `bsuite_`, never `qig_`).

**Operator-facing output goes in a repo file or a GitHub issue.** Braden cannot read the memory
MCP; "recorded in memory" reads as delivered and is not.

## Verification discipline — carried forward

Recorded because the same failure recurred all session in different costumes, in this lane and others.

**Three distinct "recorded is not applied" mechanisms surfaced in one day:**
never seen (parent gitlink behind) · seen but unparseable (`values` is a reserved word) ·
ran, recorded, and ineffective (version collision).
**A ledger row proves the ledger was written.** Assert the object, the grant, or the policy.

**Instruments were wrong more often than the code.** Between the lanes: four confident claims
resting on evidence that did not support them; two greps too narrow; a probe that invented a
route; a drift table produced by resolving gitlinks from inside the submodule. Every one was
caught by checking the thing that *adjudicates* rather than the thing that *correlates*.

**Corrections that did not survive verification** (do not re-derive):
"8 images missing alt" — false, zero raw `<img>` lack alt · "no coverage threshold" — false,
there is one, unmet and never executed · `enterprise_licence_events` sharing a version across two
trees — benign, it is the same file copied deliberately.
