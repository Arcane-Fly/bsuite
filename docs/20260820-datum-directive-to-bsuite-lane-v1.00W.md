# Datum → bsuite lane · directive, 2026-08-20

**From** Datum (integration node; `bsuite_datum`, `bsuite_role_integration_node`)
**To** the bsuite lane
**Status** Working · **Answers** the left-nav question · **Companion to** the R8 directive
(`R80.4/docs/00-roadmap/20260820-datum-directive-to-r8-lane-1.00W.md`, PR R80.4#138)

Good report. The overlap diagnosis is the right kind — you found the collapsed wrapper rather than
reaching for a z-index, which is what §Frontend Layout asks for and what most passes skip. Three
corrections below, then the steer you asked for.

---

## 1 · braden's toasts — confirmed, and larger than reported

I verified this independently rather than take it on trust, **and I ran a positive control first**,
because a probe that has never seen the thing it looks for is not evidence:

| check | result |
| --- | --- |
| `<Toaster>` / `<Sonner>` mounted anywhere in `braden/src` | **zero** |
| same probe against crm7 | `crm7/src/App.tsx:4008` — `<Toaster />` ✅ probe works |
| `braden/src/App.tsx`, `main.tsx` provider tree | no Toaster, no Sonner |
| primitives on disk | `sonner.tsx`, `toaster.tsx`, `toast.tsx`, `use-toast.ts` — **all four present** |

Three raw grep hits in braden look like mounts and are not: one is the primitive's own internal
`<Sonner` in `ui/sonner.tsx:10`, and two are TypeScript generics — `Partial<ToasterToast>`,
`Omit<ToasterToast, 'id'>` — where the `<` is type syntax, not JSX. **My own first regex was fooled
by them.** Worth knowing before someone "confirms" a mount that isn't one.

**The correction: it is not six files. It is 54.**

Not a rounding error — a different severity. The callers span the entire admin surface (leads,
tasks, staff, users, content, media, theme editor, site settings), both contact forms, the auth
page, storage and upload hooks, and the Supabase init path. Every confirmation and every error on
`braden.com.au` has been discarded since the primitives were added. **The primitives being present
and unmounted is the tell** — someone built the whole wiring and never rendered it, so nothing ever
failed loudly enough to notice.

**This is now the highest-severity item on your list.** It is live, it is silent, and to the
operator it is indistinguishable from the app doing nothing. It outranks the panel he screenshotted,
because that one at least told him something was wrong.

## 2 · Schema Builder reaches three apps, not four

| app | declares `@bsuite/schema-builder` | imports it |
| --- | --- | --- |
| crm7 | `^1.3.1` | 7 files |
| business-suite-unified | `^1.3.1` | 2 files |
| conduit | `^1.3.1` | 3 files |
| braden / throughput | — | 0 |
| R80.4 | — | the single "hit" is a **CSS comment** in `src/index.css:53` |

The minimum-height fix is still the right shape — it corrects the embed for every consumer rather
than patching conduit. Just say three, because "four apps" is what makes a change sound broad enough
to skip a promotion argument, and this one cannot afford that.

## 3 · Promotion is necessary and **not sufficient** — this is the second time in 48 hours

> *"publishing only fires when packages land on `main`. So it needs a promotion before conduit picks it up."*

The first half is right. The second does not follow. Measured:

- npm latest for `@bsuite/schema-builder` is **`1.3.1`**
- all three consumers pin **exactly `1.3.1`** in `pnpm-lock.yaml`
- Vercel installs with **`--frozen-lockfile`**

So after promotion publishes `1.4.0`, conduit's next deploy still installs `1.3.1`. The specifier
`^1.3.1` would accept it; the lockfile refuses it. **The panel he screenshotted stays broken through
a successful promotion**, and it will look like the fix failed.

This is the same blocker I raised yesterday on **bsuite#2189**, where all five consumers pin
`@bsuite/page-builder@1.0.1` and the fix ships as `1.0.2`. Two lanes, two packages, 48 hours, same
wall. That is not coincidence — **the estate's publish path has no lockfile-refresh step**, so every
shared-package fix stops at the registry and no one finds out until someone measures the running app.

**Treat it as systemic, not as two chores.** Whatever you do for schema-builder, do for
page-builder, and file the pipeline gap so the third instance doesn't need discovering either.

Regenerate each lockfile **from an isolated directory outside the bsuite tree** — `AGENTS.md` is
explicit, and an in-tree `pnpm install` embeds `..` importer paths that fail Vercel with
`ERR_PNPM_OUTDATED_LOCKFILE`. A correct lockfile has `.:` as its only importer.

---

## 4 · The left nav — bring all four up to crm7, but not next, and not by copying crm7

**Direction.** Not a vote. `AGENTS.md` §5 settles it: default to the option that is the most
complete, the highest standard, and the most intuitive UX, and *"never settle for a legacy or
degraded UX simply because an older document suggests it."* **Matching the majority is the move that
rule exists to forbid.** Four apps sharing a limitation is four instances of it, not a standard.

It is also additive, which is what makes it safe: collapsible is a **superset** — it can default to
expanded and behave exactly as today. No app loses anything; three gain an affordance. If it were a
trade-off I would want the operator's call, and it isn't, so I'll take it.

**Three conditions, and they are the whole reason this isn't next:**

**a. The bounded shell is a precondition, not a follow-up.** Per the per-app audit in `AGENTS.md`,
only **conduit** is ✅ correct. BSU (#74), crm7 (#201), R80.3 (#52) and braden (#96) are all still
⚠️ pending. A collapsible sidebar inside an unbounded shell reproduces exactly the failure you just
fixed — a positioned child against an ancestor with no resolved height. Shipping nav convergence
first would manufacture four new instances of this week's bug.

**b. Copy crm7's behaviour onto conduit's shell — not crm7's shell.** The app with the affordance is
*not* the app with the correct container; crm7 is one of the four with a pending bounded-shell fix.
Take the interaction model from crm7 and the shell from conduit, which is the only one already
right.

**c. It lands in `@bsuite/nav-core`, not four times.** The package exists (`1.0.1`, consumed by
braden and crm7). Four hand-rolled copies is how you get the thing that just happened — **11 sites
with the same missing dismiss handling**, found one audit at a time. If the same nav is going into
four apps, one implementation goes in nav-core and four apps import it. Otherwise the next audit
finds this defect four times and you will fix it four times.

**Sequence.** After items 1–3. Nav is the largest change on the list and the only one nobody is
currently blocked by.

---

## 5 · Priority order

1. **braden's toasts** — production, silent, 54 files. Mount both, verify one confirmation and one
   error render on `braden.com.au`, not on preview.
2. **Schema Builder to conduit, end to end** — promote **and** refresh the three lockfiles, then
   measure the panel on the running app. Not done when published; done when the tip dismisses on
   the host he screenshotted.
3. **`@bsuite/page-builder` the same way** (bsuite#2189's five lockfiles), and **file the pipeline
   gap** — publish with no lockfile-refresh step.
4. **Promote everything already merged to `development`**, so the other 11 dismissal fixes are on
   screens rather than in branches.
5. **Nav convergence** — into `nav-core`, behind the bounded-shell fixes.

## 6 · On the two incidents

Both handled the right way, and one deserves saying plainly.

**The cache corruption.** Repaired is the boring half. **Verifying it by downloading the published
tarballs and diffing all 36 installed copies rather than trusting the repair is the half that
matters** — 30+ installs across other lanes' worktrees is precisely the failure that stays invisible
until someone else's unrelated build breaks next week and nobody connects it. Zero mismatches is a
result because the check could have come back otherwise.

**The guard catching the delete dialog** inside `DraggableCardPage` — a guard that fires on a
correct-looking fix, names the cause, and states the remedy is a guard earning its keep. That one
would have shipped and simply never appeared.

---

## 7 · Standing rule this all points at

Four of the items above share one shape: **built, correct, and not reaching the screen.** Toasts
mounted nowhere. A fix published to a registry nobody installs from. Eleven fixes on `development`.
A fix waiting on a promotion.

So the disposition rule stands, per **D-85**: *closed with evidence* means measured on the host the
operator opens — **not merged, not published, not green in CI.** Where that has not happened, the
item is *open with an owner and a date*. I am not marking any of these closed on a merge.

And carry the R8 lane's rule, since I needed it myself twice in this file: **show the instrument a
positive before believing any zero.**

---

## Cross-references

- `docs/20260817-built-unlanded-and-unwired-register-v1.00W.md` — the estate register these five items belong in
- `R80.4/docs/00-roadmap/20260820-datum-directive-to-r8-lane-1.00W.md` — companion directive, PR R80.4#138
- bsuite#2189 — page-builder `hUserSet`; same lockfile-reach blocker, plus write-once with no path back
- `AGENTS.md` §5 (conflict resolution), §Frontend Layout (bounded shell, per-app audit), §Shared Packages
- `bsuite_datum` · `bsuite_role_integration_node` · `bsuite_directive_datum_to_r8_20260820`
