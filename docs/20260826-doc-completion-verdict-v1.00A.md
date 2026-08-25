# Doc completion verdict — measured against the operator bar, 2026-08-26

**Document:** 20260826-doc-completion-verdict-v1.00A
**Written for:** Braden
**Evidence gates:** `scripts/audit-doc-completion.mjs` (limb b), `scripts/audit-doc-supersession.mjs` (limb a)
**Status:** A — the measurement is complete and reproducible; the verdict it reaches is "not yet" for every candidate

---

## The answer in one line

**No document in the estate currently qualifies for a completion marker.** Six came close enough to
adjudicate individually. All six failed, each for a specific, named, re-runnable reason.

That is not a failure of the audit. It is the audit working.

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

**Six documents satisfy both limbs.** Those six are the entire candidate set.

---

## The six, and why each failed

Eligibility is not a verdict. The tool says so itself: *the cited gates must be RUN.* I ran them.

| document | cites | result |
|---|---|---|
| `docs/00-roadmap/20260112-master-roadmap-v1.00W.md` | `check-doc-naming.mjs`, `audit-doc-completion.mjs`, `audit-routes.sh` | **`audit-routes.sh` could not complete** — killed at 420s. It is recorded as having once run 2h20m. A gate that cannot finish cannot prove anything. |
| `docs/00-roadmap/20260725-excellence-closeout-implementation-plan-v1.00W.md` | `publish-ui.yml` | **No runs exist.** Absence of a failing run is not a pass. |
| `docs/00-roadmap/20260812-estate-remaining-work-register-v1.00W.md` | `ci.yml` | `ci.yml` resolves to three different submodule workflows. Not proven from here. |
| `docs/20260817-estate-remaining-work-register-v3.00W.md` | `api-availability.mjs`, `reachability.mjs`, `prerender.mjs`, `ci.yml` | `prerender.mjs` **fails locally by documented design** (Supabase OAuth 400 on a localhost redirect URI). Cannot be shown passing here. |
| `docs/20260821-airtable-class-data-surface-plan-v1.00D.md` | `check-shared-package-reach.mjs`, `check-table-reach.mjs` | `check-table-reach` **passes**; `check-shared-package-reach` **FAILS** — 5 of 53 consumer edges `UNREACHABLE-FIX`. |
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

1. **Migrate the `@bsuite/page-builder` consumers to 2.0.0** — unblocks two of the six candidates
   and the parent gitlink PR.
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

**Nothing was renamed.** Under-claiming costs a re-review; a false completion costs the truth of the
whole corpus, permanently, in a filename every future reader trusts at a glance.
