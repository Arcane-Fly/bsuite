---
kind: plan
authority: engineering
owner: bsuite
---

# Unearned completion markers — what the remaining 18 need

**Date:** 2026-08-28 · **Status:** 1.00W

`scripts/audit-doc-completion.mjs` reports documents that carry a completion marker in
their filename while citing no runnable gate. It counted **27** at the start of
2026-08-28; nine were resolved that day and **18 remain**. This document records what
each remaining one actually needs, so the next pass is judgement applied to a measured
list rather than a fresh survey.

## What was resolved, and why it was not a rename

Nine documents were **misclassified, not incomplete**.

| count | class | resolution |
|---|---|---|
| 3 | `kind: decision` — two operator rulings, one engineering | Exempted. A decision record cannot be re-earned by a gate: the ruling *is* the evidence. |
| 6 | spent prompts — the brief handed to a thread on a date | Declared `kind: record` / `authority: none`, plus an in-document banner. |

Both follow the operator ruling of **2026-08-26 that `F` means frozen** — it governs the
document's *mutability*, and is "not a claim that the work it describes is the current
truth".

Four ratchets moved and all four were banked: unearned-marker 27 → 18, unbound 306 → 297,
classification 203 → 197, prompt-marker 6 → 0.

## The operator's bar, and why most of these will not meet it

A completion marker goes in the filename **only if** the document is superseded, or
described a practice that was not best practice and has since been corrected — *and* the
work is proven production code. That is limb (a), a judgement about **content**. Limb (b)
is eligibility: the cited gates must pass.

**Most of the 18 fail limb (a)** — they are not superseded and did not describe a
non-best-practice. They need *classification*, not renaming.

## The 18, and what each needs

Measured 2026-08-28 by checklist state and by whether the described implementation exists.

### Frozen with an entirely open checklist — 2

Both carry unchecked items and zero checked ones, which is worth a look before anything
else: a frozen document cannot be updated as its work progresses.

| doc | open items |
|---|---|
| `crm7/docs/20260316-crm7-document-storage-implementation-v1.00F.md` | 15 |
| `crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00F.md` | 10 |

**`crm7-document-storage` was checked in full.** The implementation shipped —
`documentService.ts`, `documentUploadRoutes.ts`, `documentCategoryService.ts` — with **41
tests** across two files covering size, MIME, category, encryption and metadata. The one
checklist item those files do not cover, *RLS policy enforcement*, is gated elsewhere: two
required checks on crm7's `main` (`rls-jwt-lint`, `SECURITY DEFINER public function
guardrails`) plus pgTAP database tests. So the checklist is materially satisfied and the
document is a historical implementation plan — but it is **not superseded**, so it earns no
completion marker. It needs `kind: record`, or `kind: standard` with those gates cited as
`evidence:`.

### No checklist at all — 16

The checkbox test does not classify these; each needs reading. Grouped by apparent type:

- **Reference / policy / runbook (5)** — `bsu-security-reference` (a SECURITY.md),
  `bsu-crm7-rbac-rls-reference` (marked "Proposed"), `bsu-supabase-apply-runbook`,
  `auth-dashboard-hardening`, `crm7-document-storage-implementation`. If live, these are
  `kind: standard` and **must cite `evidence:`** — which is limb (b) done properly.
- **Executed implementation plans (4)** — `ux-implementation-plan`,
  `ux-implementation-round2-plan`, `qa-backlog-execution`, `ws3-to-ws9-implementation-plan`.
- **Specs / research (2)** — `apprentice-placement-avetmiss-nat00120-mapping`,
  `apprentice-placement-form-schema-spec`.
- **Chores, duplicated across two repos (2)** — `schema-builder-registry-consolidation`
  in both `braden/docs/` and `conduit/docs/`.
- **Other (3)** — `developer-portal-remaining-work`, `shadcn-init`,
  `schema-package-pin-plan`, `recruitment-comms-rams-loop-contract`.

## How to work this list

1. **Read the document.** No script may make limb (a); the audit says so in its own output.
2. **Classify it.** Allowed kinds are `law`, `obligation`, `decision`, `standard`, `plan`,
   `record`. `standard` requires an `evidence:` list naming the gate that enforces it.
3. **Only then consider a marker**, and only if limb (a) is genuinely met.
4. **Bank every ratchet the change moves — there are four**, and they do not all move
   together. On 2026-08-28 two were banked and two were missed, because the audit output
   was grepped for the expected line instead of read.

## Do not

- Bulk-apply a marker to a list. A marker asserts the work is proven production code.
- Treat `F` as a completion claim. It is a statement about the document, not the work.
