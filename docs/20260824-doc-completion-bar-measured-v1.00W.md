# Why no document can be marked complete yet — measured, 2026-08-24

**Status:** W (Working) · **Author:** bsuite-lane

The operator's bar has two limbs, and a document may only be marked complete if
it clears **both**:

- **(a)** it is **superseded**, or it described something that was not best
  practice and best practice has since been implemented;
- **(b)** the thing it describes is **100% proven production code** — which this
  estate expresses as *the gates it cites are green*.

Every one of the 477 documents was measured against both. **Zero clear both.**
This records what stands in the way, per limb, so the number can be moved rather
than argued about.

## The corpus

| | count |
|---|---:|
| documents | 477 |
| historical records (archived, or carrying a point-in-time banner) | 46 |
| **cite a gate or workflow that exists** — the only ones that can EVER be marked | **70** |
| cite nothing checkable | 407 |
| cite a gate that no longer exists | 0 |

407 of 477 can never clear limb (b) as written, because they name nothing a
machine can run. That is not a backlog of unfinished work; it is a backlog of
unfalsifiable claims, and the ratchet in `docs/.unbound-baseline` holds it at
407 so it cannot grow.

## Limb (b), measured

All 85 distinct gates cited by those 70 documents were **run**, not read.

| gate result | gates | docs affected |
|---|---:|---:|
| pass | 40 | — |
| **fail** | **8** | **16 docs blocked** |
| harness error (missing input, needs a paired capture) | 9 | 6 docs, no verdict |
| timeout over 120s | 6 | — |
| workflow — not runnable outside CI | 22 | 12 docs, no local verdict |

**36 of the 70** cite at least one passing gate and no failing one. Those clear
limb (b).

### The eight red gates

`audit-tables.sh` · `audit-token-ownership.sh` · `check-doc-classification.mjs` ·
`check-shared-package-reach.mjs` · `replay-schema-diff.sh`

The other three — `prerender.mjs`, `run-tests.mjs`,
`reencrypt-sensitive-documents.mjs` — are tools a document happened to name, not
checks, and a non-zero exit from them means nothing. They are cited as evidence
anyway, which is its own small finding.

`check-shared-package-reach.mjs` was red because **crm7 shipped a prerelease of
`@bsuite/data-grid`** (`1.0.1-next.0` pinned exactly, so the published 1.0.1
could never resolve). Fixed in crm7#1943.

## Limb (a) is the harder one, and it is barely expressible

Limb (a) is a judgement about content. The estate has almost no machine-readable
way to state it:

> **Exactly ONE document in 477 declares `supersedes:` in its frontmatter.**

Its target is `docs/20260821-atmosphere-evaluation-v1.00D.md`, and the document
that supersedes it — `20260822-data-surface-consolidation-decision-v1.00D.md` —
is itself **status D, explicitly not ratified**, and is not committed. So even
the single expressible supersession in the estate does not currently carry
authority.

A grep for supersession *language* matches 50 of the 70. That is a hypothesis,
not a verdict: most are live working registers that mention superseded things
without being superseded. Marking documents on that basis is precisely the
false-complete the auditor exists to prevent — the estate already carries
**133 filenames containing "final", "complete" or "done"** with no evidence any
of them met a bar.

## What actually moves the number

1. **Land crm7#1943** so `check-shared-package-reach` goes green. That alone
   unblocks limb (b) for the one document with an explicit supersession.
2. **Ratify or withdraw** `20260822-data-surface-consolidation-decision`. While
   it sits unratified and uncommitted, its `supersedes:` claim is inert.
3. **Fix or retire the other seven red gates.** Each one blocks every document
   citing it, and three of them are not gates at all.
4. **Give limb (a) a machine-readable form.** One frontmatter key in 477
   documents means the bar's first limb is, today, almost entirely a matter of
   someone remembering. `supersedes:` already exists and already parses — it is
   simply unused.

Until at least 1, 2 and 4 are done, "mark the docs complete" cannot be executed
honestly for any document, and marking one anyway would add a 134th unfounded
completion claim to the 133 already here.
