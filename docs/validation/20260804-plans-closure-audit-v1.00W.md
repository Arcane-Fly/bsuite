# Plans closure audit — 2026-08-04

**Scope requested:** every plan in `docs/plans/202607*` and `docs/plans/202608*` (27 files) plus
the global plan `~/.claude/plans/lazy-hopping-nest.md` (1 file). All 28 were read in full.

---

## The headline finding is about the instrument, not the plans

**23 of 27 in-repo plans carry no completion evidence of any kind.** No ticked boxes, no
`SHIPPED`/`MERGED`/`CLOSED` annotations, no dated completion notes. Their status is
**UNKNOWN-FROM-DOC** or **NOT-STARTED-per-doc**.

That is *not* the same as "the work was not done". Much of it demonstrably was — this session
alone merged 12 crm7 PRs, applied and live-verified 7 migrations, and shipped the comms parity,
storage and signing work that several of these plans specify. **The plans were simply never
written back to.**

**So "has every plan been addressed?" cannot be answered by reading the plans.** The docs are a
statement of intent, not a record of delivery. Answering it truthfully requires checking each
deliverable against the code, the live catalog, or the issue tracker — which is the *next* pass,
not this one.

The four plans that *do* carry real markers show what the others should look like:

| Plan | Status | The marker that makes it auditable |
|---|---|---|
| `20260701-docs-plans-closure-audit` | PARTIAL | explicit `CLOSED` per item, plus a named unresolved-blocker list |
| `20260716-bsuite-completion-program` | PARTIAL | `✅ DOM AUTOPSY COMPLETE … 2026-07-17`, `~~Run Prompt 1~~ → DONE 2026-07-17` |
| `20260728-gap-remediation-plan` | PARTIAL | issue-filing marked done with the issue numbers inline |
| `20260728-r8-as-rates-engine-architecture` | NOT-STARTED | says so in its own header: *"target-architecture spec, not yet red-teamed or converted to issues"* |

**Recommendation:** a plan that cannot be closed from its own text is a plan that will be
re-litigated. Either the status convention gets enforced, or these stop being the tracking
surface and the dashboard/issues become authoritative. Right now both are claimed and neither
holds.

---

## Corroboration: the plans independently name defects the operator screenshotted

This is the useful cross-check. `20260803-theme-conformance-dod-v1.00W.md` §5 "Out of scope for
this lane" lists real, reported, unfixed items — and several are the **same defects** in the
2026-08-04 docx register, reported independently:

| Plan §5 item | Docx register |
|---|---|
| "Columns slider ignored, cards full-width" (crm7) | **D5** — Canvas Editor / columns slider |
| "KPI cards excluded from the drag canvas" (crm7) | **D5** |
| "Nav absent on some pages" (conduit) | **D3** — `docs/enterprise-admin` has no header at all |
| "No dnd-kit editor" (conduit) | docx: funding-sources dnd-kit cards on one backing card |
| "Jodie AI icon missing; logo not the uploaded platform logo" (BSU) | docx: Jodie AI logo missing on suite |
| "Permissions blank instead of preset defaults" (BSU) | docx: licence/seat + permissions family |
| "Only a default team can be created" / "No edit page; nowhere to add roles" (BSU) | docx: licence grace seats |

Two independent instruments agreeing raises confidence these are live. **A defect named in a
plan's own out-of-scope list and then screenshotted by the operator a day later is not
speculative — it is unowned.**

---

## Genuinely open, named across multiple plans

Ranked by how many plans reference them.

1. **`award_classifications` has zero rows and no writer.** The charge path's `fromFairWork()`
   reads it directly and throws on a miss. Named in `lazy-hopping-nest.md` (Amendment A.1),
   `20260703-gto-e2e-gap-map` (item 4), `20260728-r8-as-rates-engine-architecture` (A2).
   **Confirmed live in the UI** by docx item A5: *"No classifications found for this award"* on
   MA000020. This is the single most-referenced open item in the corpus.
2. **The BOOT gate has no path that can fail.** `lazy-hopping-nest.md` A.3 / RT-2 — `create/index.tsx`
   sets `createPendingResult()` unconditionally; the batch path never populates
   `bootComparisonInputs`. A gate that has never returned `fail` is decoration.
3. **STA email ingestion** — `conduit#338`. Nothing flips `r7_offers.lodgement_outcome` from
   `pending`; the inbound signal is unhandled. Blocks convert-to-apprentice. Draft only, pending a
   per-state portal map.
4. **Email connect (SMTP / Google / Azure)** — required by conduit#338, by
   `20260724-email-funding-expansion-scope` W1/W2, and raised by the operator "in excess of 20
   times". Corroborated by docx **B2**: 4 of 5 messages `failed`, including the quote-for-signature
   email.
5. **Supabase region migration to ap-southeast-2** — `bsuite#1322`. Runbook complete, explicitly
   **awaiting operator go/no-go**. Not blocked on engineering.
6. **Unified authoring surface** — 5 BLOCKING red-team findings unresolved
   (`20260703-unified-authoring-surface-plan` §11), including missing row storage for new
   entities and a raw-table-name exposure. Corroborated by docx **E1** (schema builder shows 44
   entities, zero relationships) and **D6**.
7. **Documentation program** — `20260723-bsuite-documentation-program-design`; described in the
   plan itself as *"greenfield — none exist."* Corroborated by the docx ask for screenshots in
   `docs/enterprise-admin`.

---

## Operator-gated, not engineering-gated

These are waiting on a decision, not on work. Listing them so they are not miscounted as
in-progress:

- `bsuite#1322` region migration — go/no-go
- `lazy-hopping-nest.md` A.4 — which table is the persisted mirror of the live FWC API
  (`award_rates`/`award_classifications` vs `award_rate_cache` vs `award_templates`)
- Spec decision #1 — `clients` vs `employers`: decides **which entity gets invoiced**
- Spec decision #7 — inclusions/exclusions tenant policy, must be set **before** quote lines expose
  them or the first quote after the change reads as a price rise
- `20260723-completion-program-refined` W1 — held on `npm login`
- `crm7#1142` — host safety-rating domain ruling

---

## What this audit did NOT do

Stated plainly so it is not over-read:

- **No deliverable was verified against code, the live catalog, or the issue tracker.** Status
  here reflects each document's own text only.
- The four plans marked PARTIAL may be further along than their markers show.
- Plans marked NOT-STARTED on the strength of a `Draft` header may have been superseded by later
  work that never updated the header.
