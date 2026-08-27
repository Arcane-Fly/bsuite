---
kind: process
authority: operative
owner: bsuite
---

# One row, one truth — the alignment process

**v1.00W · 2026-08-27**

## Why this exists, stated plainly

On 2026-08-27 the operator asked a simple question: *prove everything has been done and will
pass the Definition of Done.* Answering it surfaced that the estate could not answer it at all.

| what was found | measured |
|---|---|
| Features indexed in `bsuite-feature-index.json` | **659** |
| …carrying a DoD verdict | **0** — every row read `not-evaluated` |
| The index, the journey-gap register, the DoD enforcement prompt | **UNTRACKED** — present on one laptop, in no repository |
| Skills referencing any of them | **0 of 221** |
| Operator asks in the notes register | 103, then **139** once `bsuite notes (6).docx` was diffed |
| …carrying a status | **0** — the register had no status column |
| Operator asks mapping to no index row | **65 of 139** |
| Index code anchors that do not resolve | **23 of 1272** |

None of that was anyone forgetting. **The artifacts existed and nothing pointed at them.** A
skill cannot cite a file that is not in the repository, a gate cannot write a verdict into a
register it was never told about, and a register with no status column cannot disagree with a
transcript. Every part behaved correctly and the whole recorded nothing.

## The two registers, and the one rule

- **`docs/00-roadmap/bsuite-feature-index.json`** — one row per feature. What exists, where it
  lives (`route`, `code_anchors`), what class it belongs to (`sibling_class`, `sibling_count`),
  and its verdict (`dod_status`).
- **`docs/20260825-operator-notes-register-*.md`** — one row per thing the operator asked for,
  in his words. D-1 … D-139 today.

**The rule: the work has a ROW before it has a diff.**

Not a ceremony. A row is how the next session knows the work happened, how a sibling sweep finds
its denominator, and how a verdict outlives the conversation that produced it.

## The loop

```
  operator ask ──▶ register row (D-n)
                        │
                        ▼
                  index row (feature id)  ◀── if none exists, ADD ONE.
                        │                     No row means unindexed, or duplicate.
                        ▼
                   do the work
                        │
                        ▼
              agent-definition-of-done
                        │  requires feature_id + dod_writeback for index_key
                        │  bsuite_feature_index — otherwise SEND_BACK(INDEX)
                        ▼
              write dod_status back to the row
                        │
                        ▼
            node scripts/estate-align.mjs --strict
```

**Sibling counts come FROM the index, not from a fresh grep.** D8.1 asks for a denominator and
a stated method; `sibling_count` and `sibling_enumeration_method` already hold both. A number
recomputed by hand each time is a number that drifts, and the operator's most repeated complaint
— *"you only fixed the page I named"* — is exactly what a drifting denominator produces.

## What each part enforces

| Part | Enforces | Fails when |
|---|---|---|
| `_shared/contract-block.md` → all 221 SKILL.md | Find your row first; take `sibling_count` from the index; write `dod_status` back | (advisory — it is the reminder that fires without being fetched) |
| `agent-definition-of-done/scripts/gate_report.py` | `feature_id` + `dod_writeback` when `index_key: bsuite_feature_index` | SEND_BACK(INDEX). Silos without a register are unaffected |
| `scripts/estate-align.mjs --strict` | anchors resolve · `dod_status` well-formed · APPROVE carries evidence · every ask maps to a row | non-zero exit |
| `.github/workflows/estate-alignment.yml` | the above, on every PR touching the registers or `docs/00-roadmap/` | the check goes red |

## Clean workspace, and the failure it prevents

**Anything that is a source of truth lives in the repository.** The four artifacts that started
this were untracked; had that laptop failed, 659 indexed features and the whole DoD template
would have gone with them, and no other lane could ever have seen them. That is the definition
of a workspace that is not clean: *state that only one machine has*.

Three standing rules, each one paid for:

1. **A register is tracked or it does not exist.** `git status --porcelain docs/00-roadmap/`
   returning untracked JSON is a finding, not housekeeping.
2. **One register per question.** Six documents partially answering "what is outstanding" is how
   `20260824-estate-execution-backlog` came to carry a 20-item subset of a 103-item document as
   though it were the whole thing. A new register must supersede its predecessors *by name*.
3. **A status column is a promise.** Do not add one unless something writes to it. The notes
   register deliberately has none — its status lives in the index, on the feature rows the asks
   map to, where the gate can actually write.

## Cadence

- **Every turn** — the contract block is already loaded; find the row.
- **Every PR touching a register or `docs/00-roadmap/`** — `estate-align.mjs --strict` in CI.
- **Nightly** — the same check on `development`, so drift from merges is caught without a PR.
- **On a new operator notes export** — diff it against the registered document (set difference on
  paragraphs, which is how the ten new paragraphs behind D-104…D-139 were found), register the
  delta, then reconcile.

## What this process does NOT claim

It does not claim anything is done. It creates the place where "done" can be recorded and
checked. As of this document, **0 of 659 features carry a verdict** — and that number is now
visible, which is the only honest starting point.
