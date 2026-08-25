---
kind: standard
authority: engineering
owner: docs-lane
evidence:
  - scripts/audit-doc-supersession.mjs
  - scripts/audit-doc-completion.mjs
---

# Supersession is detectable; "proven production code" is not

**Date:** 2026-08-25 · **Status:** A (Active — the method, and its measured result)

The operator's bar for marking a document complete has two limbs:

> **(a)** it is superseded, **or** it documented something that was not best practice and
> best practice has since been implemented; **and**
> **(b)** the thing it describes is 100% proven production code.

`audit-doc-completion.mjs` answers **(b)** and says outright that it cannot answer (a),
because (a) is a judgement about content. This document adds the other half —
`audit-doc-supersession.mjs` — and records what the two together actually yield.

---

## 1. The method

Four signals, each a claim made **by a document**, never by the tool:

| signal | meaning |
|---|---|
| `declared` | a newer doc's frontmatter `supersedes:` names this path |
| `stated` | a newer doc's prose says it supersedes this one |
| `same-slug` | a newer doc **in the same repo** shares this slug |
| `self` | this doc's own **ALL-CAPS banner in a heading** says SUPERSEDED / DEMOTED / RETIRED / WITHDRAWN / OBSOLETE |

## 2. Three constraints, each bought with a false positive

The first three runs of this detector produced findings that were **the detector's own
bugs**. Each constraint below exists because of one, and each is the estate's recurring
shape rather than a one-off.

**`same-slug` is scoped to ONE REPO.** Across repos it means the opposite:
`csp-policy-reference` exists in five submodules and `elements-of-rate-calculation` in two.
Those are per-repo **copies** of one reference, not successive versions — retiring the older
date would kill a live file in another repo on the strength of a filename. The first run did
exactly that for nine documents. Cross-repo duplication is reported separately, because it
is a real and different hazard: a correction to one copy leaves the others stale and nothing
says so.

**`CORRECTED` is not supersession.** `20260227-dry-one-shot-architecture-v1.04A.md` opens
*"Filename corrected 2026-08-17: v1.02A → v1.04A"* — a document correcting its own **name**
while remaining Active and authoritative. A document correcting itself is the opposite of a
document being replaced.

**The banner must SHOUT, and sit in a heading.** The same document contains the line
`> retired directory as if it still existed` — the word *retired* describing a **directory**,
wrapped so it happens to start a line inside a blockquote. A case-insensitive match read
that as the document retiring itself. This is the estate's signature failure — *a gate
matching the token in prose ABOUT the token* — and this detector committed it twice before
the constraint was tight enough.

## 3. The measured result, and it is not what the exercise wanted

| | count |
|---|---:|
| documents examined | 437 |
| superseded by at least one signal — **limb (a) satisfied** | 24 |
| of those, also citing a gate that exists — **limb (b) checkable** | 3 |
| of those three, actually markable | **0** |

The three were adjudicated individually rather than in a batch:

- **`OUTSTANDING.md`** — already banners itself *"HISTORICAL SNAPSHOT — not a source of
  truth"*. It is a **record**, and marking a record complete is a category error, not a
  promotion.
- **`20260821-atmosphere-evaluation-v1.00D.md`** — superseded, but it answered the wrong
  question entirely (see `20260825-atmosphere-is-nocodb-and-the-licence-already-ruled`).
  A document that was never right is corrected, not completed.
- **`20260812-estate-remaining-work-register-v1.00W.md`** — superseded by v3, but limb (b)
  fails on evidence: of its three cited workflows only one runs on this branch, and the
  carry-forward test was **vacuous** — v1 contains zero `X-N` item identifiers, so "0 of v1's
  ids missing from v3" proves nothing at all. A zero from a pattern that matches nothing is
  not a pass.

## 4. What that means

**Supersession alone does not earn the marker, and the corpus proves it.** Twenty-four
documents are superseded and none of them can currently be marked, because limb (b) — that
the thing described is proven production code — is established for none.

That is the bar working. The four documents marked `F` this week were marked because their
**own acceptance criteria** were individually measurable against live code and a live
deploy, not because something newer existed. The distinction is the whole point: a corpus
where being replaced was sufficient would fill with completion markers that mean only
"someone wrote a successor".

## 5. What this does NOT do

It does not decide anything. Supersession is limb (a) only. It reads what documents say
about each other and reports it, so 24 cases can be adjudicated instead of 437 read one at a
time — and so the next reader starts from a list rather than from scratch.
