---
kind: standard
authority: operator
owner: bsuite-lane
evidence:
  - scripts/check-doc-classification.mjs
---

# Knowledge classification standard

**Date:** 2026-08-22
**Status:** A
**Applies to:** every `.md` under `docs/` in the parent and all six submodules.

---

## The problem this solves

463 docs. 158 gates. **34 docs cite a gate.** Docs assert things; gates measure reality;
almost nothing binds the two. That is why "what is actually finished?" is unanswerable
without a full-session audit, and why the answer came back **zero**.

Worse, one directory holds four kinds of knowledge with **different authorities**:

| kind | example | who may change it | how it expires |
|---|---|---|---|
| `law` | MA000104 rates, Fair Work instruments | **nobody** — we mirror | when the instrument changes |
| `obligation` | GTO National Standards, privacy duties | **nobody** — we comply | on the review cycle |
| `decision` | D2C theme, `--role-*` tokens, entity ownership | operator ruling | when superseded |
| `standard` | eslint rules, DRY one-shot, naming | a PR | continuously |
| `plan` | implementation plans, registers | the author | when its evidence goes green |
| `record` | audits, evidence, session findings | **nobody** — dated fact | never; it is history |

38 docs touch awards, 74 touch the theme, and they share a directory and a filename
shape. **An agent cannot tell which it is permitted to edit.** Editing an award to make
a test pass is a compliance event, not a tidy-up.

---

## The rule

Every doc declares what it is and what proves it, in YAML frontmatter. **The truth lives
in the file, not the path** — so folder structure becomes derived, renames become
mechanical, and archival becomes a query rather than a judgement.

```yaml
---
kind: law | obligation | decision | standard | plan | record
authority: external | operator | engineering | none
owner: <lane or person accountable>          # who answers questions about it
evidence:                                     # what would prove or disprove it
  - scripts/check-required-field-markers.mjs
  - phantom-migrations.yml
supersedes: <path>                             # optional
superseded_by: <path>                          # set = archivable
review_by: YYYY-MM-DD                          # required for kind: law | obligation
---
```

### What each field is for

**`kind`** decides the change rule. `law` and `record` are never edited to suit us — a
`law` doc that disagrees with reality means reality changed and the mirror is stale; a
`record` that looks wrong is history, and history is not a bug.

**`authority`** answers *"may I change this in a PR?"* — `engineering` yes, `operator`
needs a ruling, `external` never, `none` means it is a dated fact.

**`evidence`** is the binding that does not exist today. It names the gate, workflow or
migration that would prove the claim. **A `plan` or `standard` with no `evidence` cannot
ever be marked complete** — not as a policy, as a mechanical consequence.

**`review_by`** applies only to received knowledge. An award mirror with no expiry is a
liability: it looks current forever.

### Completion is derived, never asserted

A doc is archivable when **both** hold:

- `superseded_by` is set, **or** `kind: plan` with every `evidence` entry green; **and**
- nothing links to it that is not itself archived.

That is checkable. "Someone thinks it is done" is not, and produced 2,122 docs marked
`W` and three marked complete on no evidence at all.

---

## The ratchet — how this lands without a 463-doc migration

A big-bang move was attempted for doc naming and **reverted**: 51 files across six
submodules, including applied migrations and pgTAP tests that cite doc paths in
comments. Those are historical records. The blast radius exceeded the benefit.

So:

1. **Today's docs are legacy.** No mass rename, no mass frontmatter backfill.
2. **New docs always classify; existing docs classify on a substantive edit.** A doc
   that is *added* must carry frontmatter — it is cheap at creation and it is the only
   thing the ratchet needs in order to hold. A doc that is *modified* is enforced only
   past 20 changed lines.

   That threshold exists because the first version of this gate blocked a PR whose
   entire content was fixing three dead citations. Demanding full classification for a
   few characters makes small maintenance edits expensive, and the rational response is
   to stop making them — or to paste in frontmatter nobody thought about. Both are
   worse than the debt. Rewriting a doc is the moment its kind and authority are
   actually in your head; fixing a link is not.

   Enforced by `scripts/check-doc-classification.mjs`.
3. **The count may never rise.** A committed baseline holds the unclassified count; the
   gate fails if it grows. Debt shrinks or holds — it cannot expand.
4. **Backfill is opportunistic.** A doc gets frontmatter when someone is already editing
   it, not in a sweep.

This is deliberately the slower-looking option. It fixes the thing that broke — **you
cannot archive what you cannot classify** — instead of rearranging 463 files that would
still be unclassified afterwards.

---

## What this does NOT do

It does not rename anything, move anything, or mark anything complete. It makes those
operations *decidable*. Renaming without classification is what produced a folder tree
organised by when a doc was written rather than what it is.
