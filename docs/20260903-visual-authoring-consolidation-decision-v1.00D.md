---
kind: decision
authority: proposed
owner: bsuite
---

# Visual authoring — one winner, everything else consolidated into it

**Date:** 2026-09-03 · **Status:** D (Decision, proposed) · **Decides:** which of the estate's
competing visual/no-code authoring specifications wins, what folds into it, and what is deleted.

**Operator direction this answers, verbatim:**

> "design studio seems like something that should be built out rather than killed."
>
> "we should end up with consolidated best in class features not half duplicates of the same
> intended capability."
>
> "What of the specs gives us the most unified, powerful, capable, visually stunning, highest ux,
> that wins and the rest consolidated into that, and bloat removed."

**Method.** Five independent readers were run in parallel — four over the competing
specifications, one over the code alone with the specifications withheld. Every "is it built"
claim below comes from the code census or from a reader who verified it in source, never from a
specification's own checkboxes. This matters: the estate has repeatedly been misled by ticked
boxes, and one of the findings below is a capability its own plan still marks ✅ that was built,
broke silently for three and a half months, and was then stripped.

*Acronyms on first use: **ADR** = Architecture Decision Record, a short binding record of a
technical decision. **RLS** = Row-Level Security, the database's per-tenant data wall.
**WYSIWYG** = "what you see is what you get", editing content in the form it will actually
appear in. **RPC** = Remote Procedure Call, a database function called from the app.*

---

## 1. The finding that decides it

**Nothing in the estate can write a page's layout after the page is created.**

`custom_pages` is the canonical store (ADR-0001). It has a `layout` column. Every new page is
created with `layout: { sections: [] }` — permanently empty. The only function capable of
writing a layout afterwards, `savePageRevision` in `crm7/src/services/customPageService.ts`, has
**zero callers in any `.tsx` file in the estate**. crm7's own page at
`custom-page-detail.tsx:261-292` says so in a comment dated today:

> "This page's layout cannot be edited here yet… the editor for it is still to come."

So the position is not that the estate has too many page builders. It is that it has **six
partial ones and no writer**. Everything downstream follows from that single hole — including
why two of the four renderers paint raw JSON, and why the AI assistant can add a form field but
cannot touch a page layout.

---

## 2. What actually exists

### Six half-implementations of "author a page visually"

| # | surface | state |
|---|---|---|
| 1 | crm7 `/settings/custom-pages` create/edit | Plain forms for title, slug, type. **No canvas.** Layout stays empty forever |
| 2 | crm7 `CustomPageRenderer` → `FormLayoutRenderer` | The **only** renderer that draws real interactive content |
| 3 | conduit `CustomPageRenderer` | Best plumbing — real shared grid, working edit toggle — but every cell renders a literal `"Widget placeholder"` div, and saves go to browser storage only |
| 4 | BSU **and** braden `CustomPageRenderer` | Both render `JSON.stringify(layout)` into a `<pre>` tag. **Two of four renderers are raw JSON dumps** |
| 5 | braden Site Editor | **54 files** — component library, drag layout editor, media library, theme editor — **mounted nowhere**, and it writes to `site_settings`, a table that does not exist in production |
| 6 | BSU `/developer/website` CMS tab | 1,605 lines, genuine in-context WYSIWYG with drag-to-reorder and live styled preview — but only for a **fixed set of section types**, not a free canvas |

### The infrastructure that is real and load-bearing

- **`@bsuite/page-builder@2.6.0`** — **329 actual render sites in crm7 alone**, 18 test files,
  five of six apps consuming it. Grid, drag, resize, undo/redo, layout-version invalidation
  proven against two real production incidents. This is not shelfware.
- **crm7's `FormLayoutRenderer`** — the only code in the estate that turns a stored layout into
  interactive content.
- **conduit's edit-mode wiring** — proof the grid-plus-edit-mode shell works without a rewrite.
- **Jodie AI** — 14 tools, wired end-to-end to the live chat endpoint (`api/ai/chat.ts:584`).
  It can already create entities, add form sections and fields, bind data and edit navigation.
  It cannot write a page layout **for the same reason a human cannot** — no writer exists.
- **`@bsuite/schema-builder@1.9.0`** — **9 of its 11 blocking defects have been fixed** since
  2026-08-22, with contract tests. Materially further along than its paperwork suggests.
- **`@bsuite/data-grid@3.0.1`** — 41 render sites, but **crm7 only**; zero in the other five apps.

---

## 3. The decision

### Winner — `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`

It wins on three grounds, not on ambition:

1. **It is the only candidate whose missing piece is exactly the hole in §1.** Its unbuilt
   Phase 3 — an edit-mode provider plus a docked widget inspector — *is* the layout writer.
2. **It is ADR-aligned in outcome, not merely in assertion.** It keeps `custom_pages` canonical
   and never resurrects the dropped table. Verified.
3. **It is the most self-critical document in the estate.** Its own 2026-09-02 pass converted
   most of its checkboxes into honest verdicts, and nearly everything it claims as shipped was
   independently confirmed.

**Condition of the win — one correction first.** It still marks column-level (field-to-field)
relationship handles as ✅ Completed. The live code says otherwise:
`packages/schema-builder/src/types.ts:36-58` states *"Field-level relations are therefore
UNAVAILABLE."* That capability was built, silently failed to write for three and a half months,
and was then deliberately stripped. The plan must stop describing it as delivered before anyone
treats it as authority.

### Absorbed into the winner

- **Design Studio** — **built out, not killed**, but only its one genuinely unique idea. It was
  the sole candidate that solved *author here, run there, link to a third place*, and it was
  **orphaned by a storage decision, never rejected on merit**: the runbook is dated 2026-04-25
  and the table it used was dropped four days later by ADR-0001, which never once mentions
  cross-app linkage in its reasoning. Rebuild the entity-reference widget on `custom_pages`
  after adding the `app_scope` / `route_path` columns **that ADR-0001 itself admitted were
  missing and never added**. Do not un-delete the old surface or resurrect the old table.
- **Universal Canvas** — already shipped as `@bsuite/page-builder`. It is the winner's
  substrate, not its rival. Retire the planning documents; keep the package.
- **Schema-builder remediation** — a corrective patch to the winner's own package, not a rival.
  Two accessibility and clarity items remain (no keyboard path to create a relationship; the
  498 real foreign keys in the database are still invisible on the canvas).

### Stays separate — deliberately

**The Airtable-class data surface is a different capability** and must not be folded in.
Authoring *what a page looks like* and browsing *the rows inside a table* are different
problems; merging them is how the estate got six overlapping surfaces in the first place. It
should win its own lane on its own terms.

### Bloat removed

| what | why |
|---|---|
| **braden Site Editor — 54 files** | Mounted nowhere; writes to a table that does not exist in production; duplicates page-builder, worse |
| **BSU + braden `CustomPageRenderer`** | Raw JSON dumps on live screens. Replaced wholesale by the crm7 pattern, not maintained in parallel |
| **`TenantLayoutSlot`** | A no-op shim, three major versions past its own promised deletion date |
| **Design Studio palette / BSU authoring UI / second table** | Already lost, on the record, to `custom_pages` |

### ADR-0003 is superseded

ADR-0003 mandated *"each consumer app ships its own renderer — no shared package."* Measured
outcome: **four renderers, two of which paint raw JSON at users.** Its rationale #3 — that a new
package adds release friction — no longer applies, because `@bsuite/page-builder` already exists
and all five consumer apps already depend on it. The renderer belongs in that package, with an
injected per-app widget catalogue, which honours ADR-0003's one genuinely sound point (apps have
different widget sets) without paying for it four times.

---

## 4. Sequence

1. **Supersede ADR-0003.** Record the measured outcome as the reason.
2. **One renderer** into `@bsuite/page-builder`, cored on crm7's `FormLayoutRenderer` pattern
   with a per-app widget registry. The two JSON dumps die here.
3. **Build the writer** — edit mode plus widget inspector, writing `custom_pages.layout` through
   `savePageRevision`. *This is the hole in §1 and the highest-value single step in this plan.*
4. **Point Jodie at it.** The AI tools already exist and are already wired; step 3 gives them
   something to call.
5. **`/design-studio` becomes real** — the authoring surface, on the canonical store.
6. **Add `app_scope` / `route_path`**, then rebuild the cross-app entity-reference widget.
7. **Delete the bloat** in §3, each deletion in the same change that lands its replacement.

**Ordering rule:** every deletion ships with its replacement, never ahead of it. The estate's own
history is that a surface removed before its successor exists leaves a dead route, and a dead
route is unbuilt work nobody can find again.
