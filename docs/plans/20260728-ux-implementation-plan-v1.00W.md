# UX / Feature Implementation Plan — 2026-07-28

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Implements the VERIFIED-OPEN items from `docs/20260728-operator-ux-bug-register-v1.00W.md`.
Executed as a verifier-gated loop (loop-engineering) via subagent-driven-development.

## Loop contract

- **Goal:** every task below lands on its repo's `development` branch, signed, with its acceptance
  test passing and lint/typecheck clean.
- **Success condition (binary, per task):** the task's named test command exits 0, `pnpm lint` and
  `pnpm typecheck` (or repo equivalent) exit 0, and `git log --format='%G?' -1` shows `G`.
- **Verifier ≠ maker:** a separate reviewer agent grades each task against its brief. The implementer
  never grades its own work.
- **Budget:** max 3 fix rounds per task. At the cap, park with a written ruling — do not loop forever.
- **No-progress rule:** if a round produces no diff, escalate rather than retry.

## Global Constraints

- Branch off `development` in the owning repo. **NEVER commit to `main`.**
- Commits **GPG-signed** (`%G?` = `G`) — unsigned commits get their Vercel deploy silently cancelled.
- Conventional commits: `fix(scope): …` / `feat(scope): …`, scopes `crm7|r80|bsu|conduit|braden|throughput|shared|docs`.
- **pnpm only.** Never `npm install` / `yarn`.
- TypeScript strict. No untyped `any`.
- **Verify before fixing.** The operator's register was compiled across a day; several items were
  already fixed. Report VERIFIED-FIXED and stop rather than "fixing" working code.
- **Search before escalating.** `docs/`, the `bsuite_` memory keys, and
  `/home/braden/Desktop/Dev/archived-repos-docs` hold most answers. Only escalate if all three are silent.
- **One-shot doctrine is binding** (`docs/20260227-dry-one-shot-architecture-v1.04A.md` §1):
  R8 owns Award Rates / Charge Calculations / Funding Offsets; CRM7 owns Placements / Apprentices /
  Host Employers. Read across the boundary, never duplicate or recompute.
- Do NOT touch: `.github/workflows/`, `.superpowers/`, or another task's files.
- **Compliance:** R8 calculations are compliance-critical. Never hard-code a rate. Never fabricate a
  passing verification.

## Owned by hermes (assigned via inbox — NOT in this plan's scope)

A11 `crm7#1265` (WA payroll tax), `BSU#620` (seat-cap bypass), `crm7#1262` (claim RPC bypass),
A5 (email connectivity), A6 (platform card invariant), A9 (charge-rate advanced config).

---

## Task 1 — R8 calculator layout + pay-rate hierarchy (register #9, #9b)

Repo: `R80.3`.
- **#9** — `src/components/R8Calculator.tsx:427` has a literal `max-w-5xl` squeezing the calculator
  into a narrow column while the page has ample space. Widen to use available space. Consult
  `/home/braden/Downloads/charge-calculator-mapd.jsx` for the operator's preferred density and IA
  (grouping, progressive disclosure) — but do NOT copy its hard-coded rates.
- **#9b** — "Standard" is overloaded with two unrelated meanings across two components; disambiguate.
  Implement the operator's hierarchy: **Adult / Junior**, then **Completed year 12 /
  Has not completed year 12**. His wording is domain-correct (he is a lawyer with GTO expertise) —
  implement it literally.
  **School-Based (and the Year 11/12 sub-tier) is DEFERRED to backlog by operator ruling — do NOT
  build it, and do NOT use its deferral as a reason to leave the rest of #9b undone.**

Acceptance: calculator uses the wider layout at desktop breakpoints; selector labels match the
hierarchy exactly; a test asserts the junior/adult + year-12 options resolve to the correct rate path.

## Task 2 — Funding Offsets + Training Hours inside the calculation (register #9c, #10)

Repo: `R80.3`. Both are currently separate pages; the operator wants them available *inside* the
calculation. `src/components/FundingOffsets.tsx`'s own header admits the charge engine is not re-run
there. Move/surface them into the calculation flow so the displayed charge rate reflects them live.

Acceptance: setting a funding offset inside the calculation changes the displayed charge rate in the
same view; a test asserts the offset reaches `calculateChargeRate` and the rendered rate reflects it.

## Task 3 — Training plan progress + TGA units import (register #12, #13)

Repo: `crm7`.
- **#12** `/training/plans/create` — Progress must be **calculated** from units of competency
  completed vs remaining, not entered.
- **#13** `/vet/qualifications/{id}/edit` — units cannot be imported. **Operator ruling: fix BOTH
  backend paths.** (a) the bulk TGA sync is feature-flagged off (`TGA_SYNC_ENABLED=false`); (b) the
  single "Import Qualification" button is wired to `handleImport`, which imports an
  **RTO/training-provider by numeric code**, so a real qualification code fails validation.
  Fix the backend paths **before** building any units-import UI on top — otherwise the button fails 100%.
- Link `crm7#662` (units of competency / competency-based progression); do not duplicate it.

Acceptance: a qualification code imports units (not an RTO); progress renders as a computed
completed/remaining figure; tests cover both.

## Task 4 — Placement rate clarity + document upload (register #16, #17)

Repo: `crm7`.
- **#16** — "Hourly rate" is ambiguous (pay vs charge). Make the label truthful to what the field
  actually holds, and source it from R8 when the placement is linked (**R8 owns Charge Calculations**).
- **#17** — `/placements/{id}?tab=documents` needs upload. **Infrastructure already exists and is
  deployed**: `document-secure-upload` + `document-virus-scan` edge functions, `org_documents` table
  live with RLS. This is UI wiring only — do NOT build new storage.

Acceptance: the rate field's label matches its semantics; a linked placement shows R8's value;
documents can be uploaded and listed on the tab.

## Task 5 — crm7 surface fixes (register #5, #19)

Repo: `crm7` (#5), `business-suite-unified` (#19).
- **#5** `/settings/schema-builder` — "Tidy" only stacks cards into a column; "Fit" does nothing.
  Make Tidy produce a sensible arrangement and Fit actually fit the graph to the viewport.
- **#19** `suite.crm7.app/branding` — only saves after clicking "Show preview". Saving must not
  depend on having previewed.

Acceptance: Fit visibly reframes the graph; Save persists without preview; tests cover both.
