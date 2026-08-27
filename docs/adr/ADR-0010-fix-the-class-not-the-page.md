---
kind: decision
authority: operator
owner: bsuite
---

# ADR-0010 — Fix the class, not the page: platform-wide defects are closed platform-wide or not at all

**Status:** Accepted
**Ratified:** 2026-08-26 (operator ruling, Braden Lang)
**Built?** ⚠️ policy — enforcement is now MECHANICAL: `estate-align.mjs` check `E-sibling-class`
refuses an `approved` row whose sibling class still holds a `not-evaluated` row, run by
`.github/workflows/estate-alignment.yml`. The nine open classes below are unclosed.

> **Correction, 2026-08-27.** This line previously read *"enforcement mechanism exists (D8.1 +
> `bsuite_feature_index.sibling_class`)"*. That was not true. `sibling_class` was present on all
> 659 rows across 111 classes and **nothing under `scripts/` or `.github/workflows/` read the
> field** — it was carried, indexed and inert. An ADR against shipping unwired surfaces was
> itself claiming an unwired surface as its enforcement. The check named above was added the
> same day this was found, which is what makes the claim true now.
**Related:** `~/.agents/skills/agent-definition-of-done/references/ux-gate-d8.md` (D8.1); `~/.agents/agents/completion-enforcer.md`; `docs/20260826-bsuite-feature-index-v1.00W.md`

## Context

On 2026-08-26 the operator supplied 135 findings from hands-on testing of the running
platform. **26 of them are explicitly repeat offences** — defects raised before, in some cases
many times. His own words on the pattern:

> *"These issues are persistent across the app and have been flagged to be fixed across the full
> app many times. Typically the fixing agent fixes that page i've pointed to but I have always
> said it is a platform wide consideration that needs addressing."*

> *"This is a repeated issue and has been raised innumerable times. Usually one page gets fixed
> but not all."*

> *"Bottom border still double for cards which we have raised 100s of times now."*

This is not a backlog-management problem. It is a **completion-criteria** problem: a fix that
closes the reported instance and leaves the class open was accepted as done. Every acceptance of
that kind converts one report into an indefinite series of identical reports, and burns the
operator's attention re-reporting what he already reported.

D8.1 already exists to catch exactly this — *"If this defect or pattern exists on one page, it
almost certainly exists on the twelve that were built from the same component — fix the class,
not the page"* — and it was not being applied, in part because nothing told an agent how many
siblings there were.

## Decision

**A defect that belongs to a class is not done until the class is done.**

1. **Every feature carries a `sibling_class` and a `sibling_count`.** These are fields on
   `bsuite_feature_index.json`, computed across all 659 rows. An agent does not have to derive
   the denominator; it is handed one.

2. **A fix must state the denominator and the numerator.** `sibling_surfaces.count` and
   `sibling_surfaces.checked` in `evidence.json`. `gate_report.py` already refuses a
   non-numeric `count`; the operator ruling extends this: a `checked` materially below `count`,
   without a stated reason, is a SEND_BACK.

3. **A per-page fix to a class defect is a SEND_BACK, not a partial APPROVE.** The correct
   response to "this is broken on page X" where X has 11 siblings is either to fix all 12, or to
   fix the shared component they are built from. Fixing X alone and reporting done is the
   false-complete this ADR exists to stop.

4. **Where a class defect traces to a shared component, the fix belongs in the component.** Not
   copied into each consumer. A fix applied 12 times by hand is 12 future divergences.

5. **`repeat_offence` is a severity multiplier.** A finding the operator has raised before is
   evidence that the class was previously left open. It is escalated, not queued alongside a
   first report.

## The nine open classes (2026-08-26)

Named here so no agent has to rediscover them. Each accounts for multiple findings across
multiple apps.

| # | Class | Findings | Scope | What "done" means |
|---|---|---|---|---|
| 1 | Every card set shares one backing card, so cards can't be dragged or resized individually | 7 | crm7, BSU, platform | Each card owns its backing element, everywhere |
| 2 | Row-listing screens are not the specced Airtable-style spreadsheet view | 9 | crm7, BSU | One filterable spreadsheet view, reused wherever rows are listed |
| 3 | R80.4 calculator shows fixed demo numbers instead of recomputing from the selected award | 8 | R80.4 | Every figure derives from the award; no leftover hardcoded values |
| 4 | Platform-level admin surfaces leak into tenant accounts; permission checkboxes never reflect real state | 6 | BSU, crm7 | Platform surfaces gated to developer accounts; checkboxes load from and persist to actual grants |
| 5 | D2C theme applied inconsistently — pure white/black surfaces, missing gradients and glows | 5 | all apps | Theme applied to every card, header and button, in every app |
| 6 | Card borders are a `box-shadow` ring, not a real border — renders doubled, blurry, cut off | 5 | crm7, BSU | Real CSS border; no shadow-as-border anywhere |
| 7 | No working export-to-PDF / save-template / push-to-record / send-for-eSigning flow | 5 | R80.4, crm7 | One flow, reused wherever a document leaves the app |
| 8 | Clients cannot connect their own SMTP / Google / Azure mailbox | 2 | crm7 | Working, correctly-scoped OAuth; popup closes properly |
| 9 | One-shot policy violations — the same data entered or selected twice | 3 | crm7, R80.4 | Entered once, propagates everywhere it is needed |

Class 9 is the operator's standing one-shot directive, restated: *"This is always and has been a
long standing directive."*

## Rationale

The alternative — triaging 135 findings individually — reproduces the failure. Roughly 55 of the
135 collapse into these nine classes; closing a class closes its members and prevents the next
report of the same thing. Working the list linearly would fix the reported page again.

There is precedent in the estate's own measurement: the 2026-08-26 feature index found **100
unwired features**, concentrated by class rather than scattered — 11 of 28 in Platform
administration, 13 of 24 in GTO compliance, 4 of 4 in HR workflows. Defects here cluster the same
way because the surfaces are built from the same components.

## Consequences

- The DOD dispatch order runs one representative per `sibling_class` where `sibling_count >= 10`
  **before** the general queue, because doing so collapses most of the general queue.
- `completion-enforcer` refuses APPROVE on a user-facing change where `sibling_surfaces.count` is
  absent or non-numeric. That is existing behaviour; this ADR is the reason it exists.
- A finding tagged `repeat_offence` that is closed with a single-page fix should be reopened, not
  argued about.
- **Cost of not doing this, stated plainly:** the operator has re-reported card borders "100s of
  times". Every one of those reports was a completion gate that let a page-level fix through.
