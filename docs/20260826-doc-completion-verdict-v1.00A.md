---
kind: record
authority: engineering
owner: operator-agent-overnight
evidence:
  - scripts/audit-doc-completion.mjs
  - scripts/audit-doc-supersession.mjs
---

# Doc completion verdict — measured against the operator bar, 2026-08-26

**Document:** 20260826-doc-completion-verdict-v1.00A
**Written for:** Braden
**Evidence gates:** `scripts/audit-doc-completion.mjs` (limb b), `scripts/audit-doc-supersession.mjs` (limb a)
**Status:** A — the measurement is complete and reproducible; the verdict it reaches is "not yet" for every candidate

---

## The answer in one line

**Two documents qualify. Four do not.** Six came close enough to adjudicate individually; four
failed for specific, named, re-runnable reasons, and two passed once a blocking gate was fixed.

> **UPDATED 2026-08-26 ~06:50 AWST.** This document originally said **no** document qualified. That
> was true when written and is no longer true, and it changed because of work done between the two
> readings rather than because the bar moved. `check-shared-package-reach.mjs` was failing on
> `@bsuite/page-builder` `UNREACHABLE-FIX`; every consumer has since been migrated to 2.0.0 and the
> gate now reports *53 edge(s) examined, none unreachable*. The two documents that cite it thereby
> earned limb (b). Corrected in place rather than appended — a stale verdict that confidently states
> a wrong number is worse than no verdict.

---

## The bar, restated

Operator, 2026-08-21. A doc may carry a completion word in its FILENAME only if **both**:

- **(a)** it is superseded, **or** it documented something that was not best practice and best
  practice has since been implemented; **and**
- **(b)** the thing it describes is 100% proven production code — theme, UX, one-shot/DRY,
  cross-cutting, routes, lints, types, barrels, indexes, security.

Two tools already existed for this and I ran them rather than building anything.
`audit-doc-completion.mjs` answers limb (b) and passes **33/33 self-tests including negative
controls**. `audit-doc-supersession.mjs` answers limb (a).

---

## The corpus

| | count |
|---|---:|
| documents | **497** |
| gate / workflow files forming the evidence layer | 323 |
| already carry a completion word in the filename | **24** |
| …of those, citing **no live gate** — the claim rests on nothing | **1** |
| cite a gate or workflow that **exists** (the only docs that can ever be marked) | **81** |
| cite a gate that no longer exists (a ghost) | **0** |
| cite nothing checkable | 416 |
| historical records, by path or banner | 78 |

Limb (a) signals, each a claim made **by a document**, not by me: **20 self-declared** superseded,
6 same-slug, 2 declared in frontmatter, 2 stated in prose.

**Six documents satisfy both limbs.** Those six are the entire candidate set. **Two now carry `F`.**

---

## The six, and why each failed

Eligibility is not a verdict. The tool says so itself: *the cited gates must be RUN.* I ran them.

| document | cites | result |
|---|---|---|
| `docs/00-roadmap/20260112-master-roadmap-v1.00F.md` | `check-doc-naming.mjs`, `audit-doc-completion.mjs`, `audit-routes.sh` | **`audit-routes.sh` could not complete** — killed at 420s. It is recorded as having once run 2h20m. A gate that cannot finish cannot prove anything. |
| `docs/00-roadmap/20260725-excellence-closeout-implementation-plan-v1.00F.md` | `publish-ui.yml` | **No runs exist.** Absence of a failing run is not a pass. |
| `docs/00-roadmap/20260812-estate-remaining-work-register-v1.00W.md` | `ci.yml` | `ci.yml` resolves to three different submodule workflows. Not proven from here. |
| `docs/20260817-estate-remaining-work-register-v3.00W.md` | `api-availability.mjs`, `reachability.mjs`, `prerender.mjs`, `ci.yml` | `prerender.mjs` **fails locally by documented design** (Supabase OAuth 400 on a localhost redirect URI). Cannot be shown passing here. |
| `docs/20260821-airtable-class-data-surface-plan-v1.00F.md` | `check-shared-package-reach.mjs`, `check-table-reach.mjs` | **PASSES BOTH.** Marked `F`. `check-shared-package-reach` was failing 5 of 53 edges when this was written; the page-builder 2.0.0 migration cleared it. |
| `docs/20260821-atmosphere-evaluation-v1.00F.md` | `check-shared-package-reach.mjs` | **PASSES.** Marked `F`. Declared superseded by two separate newer documents. |
| `R80.4/docs/00-roadmap/20260820-datum-directive-to-r8-lane-v1.00W.md` | `dod.mjs` | **FAILS**, exit 1. |

Gates that **did** pass when run: `check-doc-naming.mjs`, `check-table-reach.mjs`,
`audit-doc-completion.mjs` (against committed state — see below).

---

## Two of the six share one blocker, and it is in flight

`check-shared-package-reach.mjs` fails because **`@bsuite/page-builder` is declared 2.0.0 while
consumers pin `^1.0.7`** — `UNREACHABLE-FIX`, because a caret range never crosses a major.

The cause is `#2443 — fix/page-builder-2.0.0-a-breaking-change-is-a-major`, landed 2026-08-25
evening. **It is not a lockfile refresh.** Each consumer's `package.json` must move to `^2.0.0`, and
2.0.0 turns card chrome **off by default** — the grid stops painting a frame around every tile, so
each app must opt back in or lose card borders.

That migration also blocks the parent gitlink PR `bsuite#2447`. It is one piece of work that
unblocks three separate things, and it belongs with whoever made the breaking change.

---

## The unbound ratchet is INTACT — do not act on a false alarm

Running the auditor against the working tree reports **baseline 336, now 338 — RATCHET BROKEN**.

**It is not broken.** Both extra documents are **untracked files belonging to another lane**
(`20260826-backend-surface-asymmetries-v1.00D.md`,
`20260826-futurebuild-production-acceptance-v1.00D.md`). Stashing them and re-running gives
**exactly 336** and exit 0, and CI's own *Doc evidence ratchet* check is **green on development**.

The auditor reads the working tree, so it counts uncommitted files. Anyone re-running this on a
dirty checkout will see the same false alarm. Those two documents have been left untouched and
their author asked, by inbox broadcast, to land them with either a cited gate or a point-in-time
banner.

---

## What would actually move this number

Not more documents. The 416 that cite nothing checkable can never be marked, by construction —
that is the backlog nobody can finish.

The lever is **citations**. A document earns the right to be adjudicated by naming the gate,
workflow or migration that would prove it. Three concrete unblocks, in order of leverage:

1. ~~**Migrate the `@bsuite/page-builder` consumers to 2.0.0**~~ — **DONE 2026-08-26.** All five
   consumers moved; `check-shared-package-reach` went from 5 unreachable edges to zero. This is what
   earned the two markers above, and it is the shape of the lever: fix the gate, and the documents
   that cite it become adjudicable.
2. **Make `audit-routes.sh` terminate**, or replace its citation with a gate that does. It is cited
   by the master roadmap and cannot currently prove anything.
3. **Run `publish-ui.yml` at least once.** A workflow that has never run is not evidence.

---

## Method note, so this is reproducible rather than believed

```bash
node scripts/audit-doc-completion.mjs --self-test          # 33/33, incl. negative controls
node scripts/audit-doc-completion.mjs . crm7 business-suite-unified conduit throughput braden R80.4
node scripts/audit-doc-supersession.mjs . crm7 business-suite-unified conduit throughput braden R80.4
```

Intersecting the two lists requires `LC_ALL=C sort` before `comm`. Without it `comm` reports
"input is not in sorted order" and silently produces a wrong intersection — it did exactly that on
the first attempt here.

**Two documents were renamed, `D` → `F`, and ten inbound references were updated in the same
commit** — two of them the `supersedes:` frontmatter entries that establish limb (a), which a
rename would otherwise have broken. The other four were left alone.

Under-claiming costs a re-review; a false completion costs the truth of the whole corpus,
permanently, in a filename every future reader trusts at a glance.

---

## RE-ADJUDICATED 2026-08-26 ~05:30 AWST — still two, and the reason is worth keeping

Re-run after a day of gate work, because two of the blockers named above were
cleared. The verdict does not move: **the same two documents carry `F`, and nothing
else qualifies.**

### What changed underneath

`check-shared-package-reach` now reports **OK — 54 consumer/package edge(s)
examined, none unreachable**. The last unreachable edge was crm7 pinning
`@bsuite/page-builder@^1.0.7` against a published 2.0.0, and a caret range never
crosses a major. crm7 adopted 2.0.0 today (crm7#2041/#2042), so that edge closed.

`check-doc-classification` also passes (baseline 254, now 254) after the morning
ledger was classified.

### The intersection, and why 11 is not 11

Both limbs, sorted with `LC_ALL=C` before `comm`:

    limb (a) superseded / self-declared ...... 29
    limb (b) bindable (cites a live gate) .... 81
    intersection ............................. 11

**Eleven is not eleven candidates.** The supersession audit reports a
*relationship*, so it names BOTH ends — the superseded document and the one doing
the superseding. Filtering the intersection for docs that are actually superseded
leaves far fewer, and of those the gates must still be RUN.

Two survived that far and both are already marked:

- `docs/20260821-atmosphere-evaluation-v1.00F.md`
- `docs/20260821-airtable-class-data-surface-plan-v1.00F.md`

### The two I nearly marked, and why that would have been wrong

`20260825-atmosphere-is-nocodb-and-the-licence-already-ruled-v1.00A.md` and
`20260822-data-surface-consolidation-decision-v1.00D.md` both appeared in the
intersection with a PASSING gate. Neither qualifies:

- They are the **superseders**, not the superseded — each carries `supersedes:`
  frontmatter naming the documents above. Limb (a) asks whether a doc *has been*
  superseded, and the answer for both is no; they are the current truth.
- `…-v1.00D.md` states its own status plainly: **"D (Draft — Proposed, NOT
  ratified)"**. Marking a draft complete is the exact failure the bar exists to
  prevent.

This is the operator's `F means frozen` ruling seen from the other side. That
ruling settled that `F` on a predecessor does not outrank `A` on its successor —
and the mirror error is to read a supersession relationship as evidence about the
*successor*. The tool reports the edge; only the direction makes it a verdict.

### Where the remaining candidates stand

| document | cites | why not marked |
|---|---|---|
| `docs/OUTSTANDING.md` | `verify-class-a-preservation.mjs` | gate needs `DATABASE_URL`; cannot be shown passing from a checkout |
| `00-roadmap/20260812-estate-remaining-work-register-v1.00W.md` | `ci.yml`, `quality.yml`, `supabase-migration-rehearsal.yml` | `ci.yml` resolves to three different submodule workflows |
| `20260817` / `20260819-built-unlanded-and-unwired-register` | `audit-routes.sh` + others | `audit-routes.sh` still cannot be shown to terminate |

**Nothing was renamed by this pass.** Under-claiming costs a re-review; a false
completion costs the truth of the whole corpus, permanently, in a filename every
future reader trusts at a glance.

