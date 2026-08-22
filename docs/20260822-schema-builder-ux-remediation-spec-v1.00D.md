---
kind: plan
authority: operator
owner: bsuite-lane
evidence:
  - packages/schema-builder/src/__tests__/relationCreate.contract.test.ts
  - crm7/tests/e2e/schema-builder-field-dialogs.spec.ts
  - crm7/tests/e2e/wcag-aa.spec.ts
  - scripts/visual-probe.js
---

# Schema Builder — UX remediation spec

**Date:** 2026-08-22
**Status:** D (design — not implemented, not authorised for implementation)
**Route:** `/settings/schema-builder`
**Surface:** `packages/schema-builder` (shared package) via `crm7/src/pages/settings/schema-builder/index.tsx` (61-line wrapper)
**Preview inspected:** `https://d.crm.crm7.app` — never localhost, never bare production

---

## 0. The headline, before anything else

The operator's report was *"super unclear how to use it."* The inspection found something
worse than unclear.

**The Schema Builder cannot create a relationship. Not "it is hard to discover" — it is
broken end-to-end, and it has never worked in this deployment.**

Three independently verified facts:

| # | Fact | How verified |
|---|---|---|
| 1 | `tenant_entity_relations` holds **0 rows across all 7 tenants** | live SQL, project `tuybltdrdefjblnplpqo` |
| 2 | The canvas renders **44 nodes and 0 edges** in every one of 15 inspected cells | live DOM count, `.react-flow__edge` = 0 |
| 3 | The insert sends **four columns that do not exist** on the live table, so PostgREST rejects the whole row (`PGRST204`) | migration `20260503000001_revert_field_level_relations.sql:23-27` dropped `source_field_id`, `target_field_id`, `on_delete`, `on_update`; `types.ts:47-56` and `schemas.ts:107-119` still declare and emit them; `SchemaCanvas.tsx:353-370` still sends them |

So every relationship-related complaint in the original report is downstream of a dead
write path. A "hairball" of `tenant_id` spokes is a **future** problem — today the diagram
has no lines at all. **This spec must therefore fix the write path FIRST; the display
controls in §6 are specified for the post-fix world and are worthless before it.**

This also means the canvas has been shipping a diagram with no relationships in it since
2026-05-03, and no gate caught it — an instance of open issue **#1966** ("checked nothing
vs found nothing").

---

## 1. Source map

| Concern | File |
|---|---|
| Route wrapper | `crm7/src/pages/settings/schema-builder/index.tsx` |
| Canvas, edges, connect flow | `packages/schema-builder/src/components/SchemaCanvas.tsx` (1031 lines) |
| Entity card | `packages/schema-builder/src/components/EntityNode.tsx` |
| Field row + connect handles | `packages/schema-builder/src/components/FieldRow.tsx` |
| Relationship dialog | `packages/schema-builder/src/components/RelationshipConfigDialog.tsx` |
| Toolbar | `packages/schema-builder/src/components/SchemaToolbar.tsx` |
| Edge rendering | `packages/schema-builder/src/components/edges/SmartEdge.tsx` |
| Entity side panel | `packages/schema-builder/src/components/EntityPropertiesPanel.tsx` |
| Command palette | `packages/schema-builder/src/components/CommandPalette.tsx` |
| Controller / mutations | `packages/schema-builder/src/hooks/useSchemaController.ts` (771 lines) |
| Data access | `packages/schema-builder/src/service.ts` |
| Types / Zod | `packages/schema-builder/src/types.ts`, `schemas.ts` |
| Layout maths | `packages/schema-builder/src/utils/gridLayout.ts`, `autoLayout.ts` |
| FK reflection (**built, deployed, dead**) | `packages/schema-builder/src/hooks/useSchemaReflection.ts` + RPC `reflect_entity_schema` |
| Page chrome | `crm7/src/layouts/MainLayout.tsx`, `crm7/src/components/layout/CRM7Footer.tsx`, `crm7/src/components/ai/AIFloatingButton.tsx` |

---

## 2. Visual gate — evidence

Run per `bsuite-ship-visual-promote/references/visual-inspection-protocol.md`. That skill's
~~`scripts/visual-probe.js`~~ — it lives in `~/.agents/skills/bsuite-ship-visual-promote/`, NOT this repo, and a bare `scripts/` prefix
reads as in-repo and resolves nowhere) executed
**verbatim, once per cell**, via Playwright 1.62 against `d.crm.crm7.app`. Screenshots and
raw JSON in `/tmp/sb-gate/out/` (ephemeral — re-run before relying on them).

Unit of inspection is the **page**, not the diff. Pre-existing defects are in scope and
blocking.

### 2.1 Matrix

| Cell (route × theme × width × account × state) | Probe | FAIL | WARN | Console | 4xx/5xx | Nodes | Edges |
|---|---|---|---|---|---|---|---|
| schema-builder · light · 1440 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · light · 1024 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · light · 768 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · light · 390 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · dark · 1440 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · dark · 1024 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · dark · 768 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · dark · 390 · primary · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · dark · 1440 · **tenantB** · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · light · 1440 · **tenantB** · loaded | **BLOCK** | 27 | 0 | 0 | 0 | 44 | **0** |
| schema-builder · dark · 1440 · primary · **empty** | PASS | 0 | 0 | 0 | 0 | 0 | 0 |
| schema-builder · light · 1440 · primary · **empty** | PASS | 0 | 0 | 0 | 0 | 0 | 0 |
| schema-builder · dark · 1440 · primary · **loading** | PASS | 0 | 0 | 0 | 0 | 0 | 0 |
| schema-builder · dark · 1440 · primary · **error** | **BLOCK** | 2 | 0 | 0 | 0 | 0 | 0 |
| schema-builder · light · 1440 · primary · **error** | **BLOCK** | 2 | 0 | 0 | 0 | 0 | 0 |

Empty / loading / error were induced by intercepting `tenant_entities`,
`tenant_entity_relations` and `tenant_field_definitions`. **Interception initially had no
effect because crm7 is a PWA and its service worker served the requests** — the cells only
became valid with `serviceWorkers: 'block'`. Any future gate run that skips that flag is
measuring the cached happy path and will report green over anything.

### 2.2 Probe findings by class

| Class | Sev | Count | What |
|---|---|---|---|
| `pureEndpoints` (V-C1) | FAIL | 1 × every loaded cell | `.react-flow__minimap` composites to `rgb(255,255,255)`, `L = 1.000` — **pure white, banned in every role, and it is white in DARK theme too** |
| `contrast` (V-C10) | FAIL | 1–2 × every cell | React Flow attribution link `1.33:1` dark / `2.76:1` light against its composited ground, 10px |
| `elevation` (V-C7) | FAIL | 25 (probe cap) | entity cards carry `box-shadow: none`; where a shadow exists, max chroma `0.0166` vs the `0.05` accent-glow floor — dark-mode cards have no accent glow at all |
| `gradient` (V-C2) | INFO | 1 | flat `h2` — "Jodie", the assistant widget, not a schema surface. Judged **not a defect** |
| `gluedCards` (V-C4) | **UNKNOWN** | — | 135 cards, no `.react-grid-layout` root. This route mounts a React Flow canvas, not the page-builder grid, so V-C4/V-C6 are **not applicable** rather than passing. Recorded UNKNOWN per Ruling V-3 |
| `canvasColumns` (V-C6) | **UNKNOWN** | — | as above |

### 2.3 Measured geometry (dark · 1440 × 900 · primary · loaded)

| Thing | Measurement | Consequence |
|---|---|---|
| React Flow viewport transform | `scale(0.5)` | **exactly** React Flow's default `minZoom`; `minZoom` is never set — see §5.1 |
| Field connect handles | **6 × 6 device px** (12 CSS px × 0.5) | below the 24×24 floor of WCAG 2.5.8 by 4× |
| Entity connect handles | **10 × 10 device px** (20 CSS px × 0.5) | ditto |
| Canvas bottom edge | `989px` | window is `900px` |
| `document.scrollHeight` | `900px` | **equal to window height — the page does not scroll**, so the overflow is unreachable, not merely below the fold |
| React Flow `<Controls>` rect | `y 896 → 974` | zoom in/out/fit are **entirely below the fold and unreachable** |
| Quick-start note rect | `y 863 → 977`, `z-index 10` | sits **on top of** `<Controls>` (`z-index 5`) and both are off-screen |
| Minimap rect | `x 1173 → 1373`, `y 824 → 974` | overlaps the footer; bottom half unreachable |
| Footer rect | `y 827 → 900`, full width | marketing footer inside a canvas tool |
| Jodie floating button | `x 1368 → 1424`, `y 822 → 878` | overlaps canvas and minimap |
| Canvas bottom at 1024 / 768 | `1001px` | worse |
| Canvas bottom at 390 | `1037px` | worst; toolbar reflows to `198 × 107` |
| `.react-flow` has `dark` class | **`false`** in dark theme | root cause of the white minimap — see §9.2 |

---

## 3. Confirmed defect register

`BUG` = it does not do what the code intends. `DESIGN` = it does what the code intends and
the intent is wrong. They need different fixes and different review.

| # | Defect | Verdict | Class | Sev | Root cause · file:line |
|---|---|---|---|---|---|
| R0 | **Relationship creation is dead** — insert sends 4 dropped columns | CONFIRMED | BUG | **P0** | `types.ts:47-56` + `schemas.ts:107-119` + `SchemaCanvas.tsx:353-370` still emit `source_field_id`/`target_field_id`/`on_delete`/`on_update`; dropped by `20260503000001_revert_field_level_relations.sql:23-27` |
| R1 | Canvas draws **0 edges**; `tenant_entity_relations` = 0 rows | CONFIRMED | BUG | **P0** | consequence of R0. `SchemaCanvas.tsx:236-269` maps only `controller.relations` |
| R2 | Real Postgres FKs are **never drawn** — 498 domain FKs invisible | CONFIRMED | DESIGN | **P0** | `useSchemaReflection.ts` + RPC `reflect_entity_schema` exist and are exported; **no component consumes them** |
| 1 | **Dialog renders flush to viewport top-left**, over the settings nav | CONFIRMED | BUG | **P0** | Tailwind v4 Preflight `*{margin:0}` overrides the UA `dialog{margin:auto}`; UA `dialog:modal` supplies `position:fixed; inset:0`, so with `margin:0` the box resolves to `0,0`. **Not** a portal or React Flow transform problem — see §3.1 |
| 2 | Relationship Type `<select>` truncates its own option text | CONFIRMED | DESIGN | P1 | `RelationshipConfigDialog.tsx:144` concatenates `label — description` into one `<option>`; native option text cannot wrap. Measured: select is 430px, longest option 62 chars |
| 3 | Source/Target Label helper text inverts the mental model | CONFIRMED (copy, **not** wiring) | DESIGN | P1 | `RelationshipConfigDialog.tsx:167-173`, `:193-199`. Persistence traced field-for-field — `sourceLabel` → `source_label`, **no swap**. The field *name* and the helper *sentence* point opposite ways |
| 3b | `source_label` carries two incompatible meanings | CONFIRMED | BUG | P1 | dialog treats it as a directional accessor label; `SchemaCanvas.tsx:377` and `schemas.ts:110,143-144,157` treat it as the edge's whole display name, and hardcode `target_label: null` |
| 4 | No visual binding between dialog and canvas | CONFIRMED | DESIGN | P1 | `SchemaCanvas.tsx:325-336` sets only a ref + a boolean; no selection, highlight or pan. Dialog receives display **strings**, not entity ids (`:902-903`) |
| 5 | 44 entities illegible at default zoom | CONFIRMED | BUG + DESIGN | **P0** | `minZoom` never set → React Flow default `0.5`; measured `scale(0.5)`. Field text renders at **4.5–7 device px**. No level-of-detail behaviour anywhere |
| 6 | No discoverable primary action | **PARTIALLY — drag-to-relate DOES exist** | DESIGN | **P0** | Per-field `<Handle>`s (`FieldRow.tsx:150-165,207-222`) + `onConnect` (`SchemaCanvas.tsx:778`) are correctly wired. It is undiscoverable because the targets are **6px**, and there is **no non-pointer path at all** |
| 7a | "Add to Page" button is **completely inert** | CONFIRMED | BUG | P1 | `EntityNode.tsx:202-217` dispatches `bsuite-add-entity-widget`; **no listener exists anywhere** in `bsuite` or `crm7`. Its unit test asserts only that dispatch was called |
| 7b | "Drag back to canvas / connected entities" hint | **NOT CONFIRMED — string does not exist** | — | — | Actual string is `Drag blue dots to connect entities.` (`EntityNode.tsx:199`). The reported wording is a mis-read *of 5px text* — itself evidence for #5 |
| 8 | Bottom row of cards clipped, no affordance | CONFIRMED | BUG | **P0** | `index.tsx:27` uses `h-[calc(100vh-64px)]` but ignores `MainLayout`'s `py-6 pb-20 / lg:pb-8`, the inner card's `py-4/py-5`, `CRM7Footer`, the demo banner, and the 56px fixed `MobileBottomNav`. Measured overshoot **89px @1440, 101px @1024/768, 137px @390**, with `scrollHeight == innerHeight` so it cannot be scrolled to |
| 9 | Low contrast on canvas | CONFIRMED (2 real failures, fewer than feared) | BUG | P1 | see §9.1 — measured, not eyeballed |
| 10 | Unstyled grey/white rectangle bottom-right | CONFIRMED — **it is the React Flow MiniMap** | BUG | P1 | `<ReactFlow>` never sets `colorMode`, which defaults to `'light'`, so `.react-flow` never gets the `dark` class; the minimap keeps its library default `#fff`. Measured `rgb(255,255,255)` with `rfHasDarkClass: false` |
| 11 | Marketing footer inside a dense tool surface | CONFIRMED | DESIGN | P1 | `MainLayout.tsx:128` mounts `<CRM7Footer />` unconditionally; `MainLayoutProps` has **no** `hideFooter`/`chromeless` option and `App.tsx:3842` wraps every authenticated route |
| 12 | Floating mascot overlaps canvas | CONFIRMED | DESIGN | P2 | `AIFloatingButton.tsx:28` — `fixed bottom-4 right-4 z-50`, portaled to `body`; same no-opt-out problem as #11 |
| 13 | Toolbar occluded by the misplaced modal | **NOT CONFIRMED** | — | — | With no modal open the toolbar is clean at `x 316, y 161, 402 × 69`. It was only ever occluded *because of* #1. Its own defects are separate: all controls are 32px tall (WCAG 2.5.5 wants 44), and below `sm` they collapse to icon-only 32×32 |
| 14 | **Empty state is a dead end** (new) | CONFIRMED | BUG | **P0** | Measured live: on a zero-entity tenant `role="toolbar"` is **absent** (`showToolbar` requires `localNodes.length > 0`, `SchemaCanvas.tsx:728-729`) and crm7 never attaches the `SchemaBuilderHandle` ref that exposes `openCreateEntity()`. The empty state says "Create your first entity" and **provides no control to do so** |
| 15 | Zoom controls unreachable (new) | CONFIRMED | BUG | **P0** | `<Controls>` at `y 896-974` with `scrollHeight == 900`. The one control that would remedy #5 cannot be reached, and the quick-start note is painted over it |
| 16 | Error state leaks raw backend text (new) | CONFIRMED | DESIGN | P1 | `SchemaCanvas.tsx:756` renders `controller.loadError.message` verbatim. Live: `"Failed to load schema / simulated upstream failure"` |
| 17 | Relationship **edit** is impossible (new) | CONFIRMED | BUG | P1 | `updateRelation` is implemented (`useSchemaController.ts:467-488,667-671,763`) and has **zero callers**. Cardinality and labels are immutable once created |
| 18 | Relationship **delete** is Backspace-only, unconfirmed (new) | CONFIRMED | DESIGN | P1 | `deleteKeyCode` never set → React Flow default `'Backspace'`; `Delete` does nothing. `SmartEdge` never reads `selected`, so there is no visible selected state. Contrast entity delete, which has a full confirm dialog (`EntityPropertiesPanel.tsx:320-357`) |
| 19 | Tidy re-creates the overlap bug it was written to fix (new) | CONFIRMED | BUG | P1 | `computeGridLayout` called with no options → `gapX 320 < CARD_MAX_WIDTH 340`, `gapY 220 < estimateCardHeight(3) = 224` (`gridLayout.ts:28`, `SchemaCanvas.tsx:524-528`). The no-overlap test guards only the sibling function |
| 20 | Search does not filter (new) | CONFIRMED | DESIGN | P2 | `searchResults` (`SchemaCanvas.tsx:730-739`) feeds only the count string; all 44 nodes stay rendered. `"2 of 35 entities matched"` describes a filter that does not visually exist |
| 21 | Double tab stop per card (new) | CONFIRMED | BUG | P2 | `EntityNode.tsx:90` adds `tabIndex={0}` inside React Flow's already-focusable node wrapper → 88 stops for 44 cards, plus one per field row, no skip link |

### 3.1 Defect #1 — root cause proven, not deduced

The React-Flow-transform and missing-portal theories are both **wrong**. The dialog is a
**sibling** of the canvas wrapper (`SchemaCanvas.tsx:795` vs `:819` vs `:898`), and it is a
native `<dialog>` opened with `showModal()` (`:65`, `:96`), which renders in the browser
**top layer** and therefore ignores ancestor transforms entirely.

Measured live on `d.crm.crm7.app`, dark, 1440×900, with the real dialog open:

```
rect     { x: 0, y: 0, w: 480, h: 442 }
margin   0px 0px 0px 0px
position fixed
inset    0px 0px 0px 0px
```

A synthetic `<dialog>` injected with the **identical class string** and nothing else
measured `x:0, y:0, margin: 0px` too — which isolates the cause to the CSS cascade rather
than to anything about this component:

> UA: `dialog { margin: auto }` + `dialog:modal { position: fixed; inset: 0 }` → centred.
> Tailwind v4 Preflight: `*, ::before, ::after, ::backdrop { margin: 0 }` — author origin,
> beats UA — → **top-left**.

**This affects all five native `<dialog>`s in the package**, which share the class string
with no margin utility: `EntityPropertiesPanel.tsx:324`, `FieldCreateDialog.tsx:208`,
`FieldEditDialog.tsx:381` and `:608`, `RelationshipConfigDialog.tsx:99`. Fix it once at the
theme layer, not five times at the call sites.

---

## 4. ⚑ FLAG FOR BRADEN — what "Create Relationship" actually writes

**Not resolved here. This needs an operator ruling before any of §5–§6 is built.**

Three different things could be meant by "relationship". All three exist in this estate.

| | Thing | Live state | Reversible? |
|---|---|---|---|
| (i) | `entity_relationships` — record-to-record metadata (`source_type`/`source_id`/`target_type`/`target_id`) | exists, **0 rows**, tenant-scoped RLS | yes, delete a row |
| (ii) | `tenant_entity_relations` — tenant-defined **schema** relations, `is_system` flag | exists, **0 rows** across 7 tenants | yes, delete a row |
| (iii) | Real Postgres foreign key constraints | **890** in `public` (498 domain, 392 boilerplate) | **no** — a migration |

**The dialog writes (ii), `tenant_entity_relations`.** Verified at
`packages/schema-builder/src/service.ts:151-152`:

```ts
const res = await client
  .from('tenant_entity_relations')   // service.ts:151
  .insert(relation)                   // service.ts:152
```

Call chain: `SchemaCanvas.tsx:352` → `useSchemaController.ts:442` → `service.ts:145`.
(i) `entity_relationships` is **never referenced** anywhere in the package — it is a red
herring for this surface. (iii) is never written, and never read either.

### 4.1 Why this is a P0 labelling defect

The dialog says **"Create Relationship"** and the button says **"Create Relationship"**. A
user reasonably reads that as *"I am adding a foreign key to my database."* What actually
happens is that a **decorative metadata row** is written to a table that nothing else in
the estate reads. The diagram will show a line; the database will be unchanged; no
referential integrity is created; no column is added; no query is affected.

That gap between what the label promises and what the system does is the single most
serious *design* defect on this surface, and it is worse than the layout problems because
it produces **confident false belief** rather than visible confusion.

**Required, whatever the ruling:** the UI must name what it is creating. Proposed copy in
§8. At minimum the dialog gains a scope line the user cannot miss:

> **Diagram link only.** This records how these entities relate for documentation and
> for the Schema Builder canvas. It does not alter the database or enforce anything.

### 4.2 Recommendation on whether real FKs should be creatable here

**No — not from this surface, and not in this iteration.** Reasons, in order of weight:

1. **Irreversibility asymmetry.** Every other action on this canvas is a row write behind
   a tenant-scoped RLS policy. A real FK is a DDL migration against a shared 417-table
   production schema. Putting a reversible and an irreversible action behind the same
   drag gesture, in the same dialog, with the same button label, is the precondition for
   an accident that cannot be undone.
2. **It cannot be tenant-scoped.** `tenant_entity_relations` is per-tenant by design
   (nullable `tenant_id`, `is_system` flag). A Postgres FK is global. One tenant's
   modelling decision would alter every tenant's database. There is no coherent
   permission model for that on a multi-tenant surface.
3. **The 44 canvas entities do not map cleanly to tables.** The metadata layer is singular
   (`contact`, `person`, `worksite`); the physical layer is plural and sometimes renamed
   (`contacts`, `people`, `sites`). **Not one of the 44 `name` values matches a public
   table name exactly**; 2 (`appeal`, `deal`) have no table at all. An FK-creating UI built
   on that mapping would be generating DDL from a name resolution that is wrong 44 times
   out of 44.
4. **The read direction is the valuable half and is already built.** `reflect_entity_schema`
   is deployed and returns `is_foreign_key / fk_table / fk_column`. **Showing** the 498 real
   domain FKs is high value and zero risk. **Creating** them is low value and unbounded risk.

**Proposed model — three clearly distinguished edge kinds on one canvas:**

| Kind | Source | Editable here | Rendered as |
|---|---|---|---|
| **Enforced** | real Postgres FK, via `reflect_entity_schema` | **read-only** | solid line, filled crow's foot, lock affordance on hover |
| **Documented** | `tenant_entity_relations` | create / edit / delete | dashed line, open crow's foot |
| **Proposed** | a Documented row that has no matching FK but names one | create / edit / delete | dotted line, amber, "not enforced" chip |

If a Documented link should become Enforced, that is an explicit, separately-permissioned
"Request migration" action that emits a reviewable migration file — **never** an inline
write. Out of scope for this spec; flagged as the natural follow-on.

**Braden's decision needed on:** (a) does "Documented-only" match your intent for this
tool; (b) should Enforced edges be shown at all in v1 (recommendation: yes, read-only —
it is what makes the canvas truthful); (c) is "Request migration" wanted later.

---

## 5. Corrected interaction model — create, edit, delete a relationship

### 5.1 Create

Drag-to-relate stays as the **primary** gesture — it is the correct pattern and it already
works. It must be made hittable, and it must stop being the *only* path.

**5.1.1 Make the target hittable.**

| Rule | Value |
|---|---|
| Handle hit area | **≥ 24 × 24 device px at all times** (WCAG 2.5.8 AA), achieved by a transparent hit box larger than the painted dot |
| Painted dot | 10 px at zoom 1; **scales inversely with zoom** so it never shrinks below 8 device px |
| Hover state | dot grows to 1.6× and gains a 2px halo; the whole field row highlights |
| Drag-in-progress | **every valid target handle on every other card grows to 1.6× and gains a halo**; invalid targets dim to 30%. This is the single highest-value change for discoverability — it converts a search problem into a pointing problem |
| Invalid drop | edge snaps back **and** a toast states why (self-relation, duplicate, incompatible type) |

**5.1.2 Add a keyboard/AT path.** Currently there is none, and the source says so
(`FieldRow.tsx:44-49`). Required, and this is a WCAG 2.1.1 (Level A) failure, not a
nice-to-have:

1. Focus a field row → `R` (or the row's "Relate" button, revealed on focus/hover) opens
   the relationship dialog with that field pre-filled as source.
2. Target is chosen **inside the dialog** by a combobox of entities, then of fields —
   not by pointing at the canvas.
3. `Cmd/Ctrl+K` → **"New relationship…"** command, added to `CommandPalette.tsx`
   (it currently has no such entry). Prompts source then target.

The dialog already accepts `sourceName`/`targetName` as plain props and
`handleRelationConfirm` reads ids from a ref, so a non-drag entry point needs no change to
the create path.

**5.1.3 Bulk import.** Because §4 recommends *showing* real FKs, offer a one-shot
**"Import from database"** action that reflects `reflect_entity_schema` and creates
Documented rows for FKs that have none. This is how the canvas gets edges on day one
without 498 manual drags.

### 5.2 Edit

Today: **impossible** (defect #17). Required:

- **Click an edge** → selects it, shows a visible selected state (SmartEdge must read
  `selected`), and opens the same dialog in edit mode with a "Save changes" button.
- Editable: relationship type, both labels, category override, `on_delete`/`on_update`
  **once those columns exist again**.
- Hover an edge → tooltip: `source.column → target.column`, constraint name, cardinality,
  enforced/documented. (Required by the operator's brief, §6.)
- Wire `controller.updateRelation` — it is already written and has zero callers.

### 5.3 Delete

Today: select edge, press **Backspace**, no confirm, no visible selection, `Delete` does
nothing. Required:

- Both `Delete` **and** `Backspace` (`deleteKeyCode={['Delete','Backspace']}`).
- A visible selected state before any destructive key does anything.
- Right-click an edge → context menu: Edit / Delete / Hide this edge / Isolate these two.
- **Confirm dialog** matching the entity-delete pattern that already exists at
  `EntityPropertiesPanel.tsx:320-357`, naming both entities:
  > **Delete the link between Client and Employer?** This removes the documented
  > relationship from the diagram. The database is not changed. — *Delete link* / *Keep it*
- Undo toast for 10s. A documented link is cheap to restore; make that visible.
- Remove `.catch(() => {})` at `SchemaCanvas.tsx:405` — a swallowed delete failure leaves
  the edge optimistically removed and the user believing it worked.

---

## 6. Relationship display controls

Requested: Supabase-visualiser-style options (all / some / by category / none), and an
improvement on that pattern, which the operator finds *"hard to read and see all
together"*.

### 6.1 The hairball is real — measured, with one correction

Verified live against project `tuybltdrdefjblnplpqo`:

| Measure | Value |
|---|---|
| Public base tables | **417** |
| FK constraints in `public` | **890** |
| Boilerplate FKs (`tenant_id`, `created_by`, `user_id`, …) | **392** |
| **Domain FKs** | **498** |
| Tables carrying `tenant_id` | 295 |
| …of which declare a real FK to `tenants` | **263** (32 are bare uuid + RLS only) |

Inbound FK count, top of the ranking:

| Referenced table | Inbound FKs |
|---|---:|
| **`public.tenants`** | **278** |
| **`auth.users`** | **201** |
| `public.people` | 38 |
| `public.employers` | 33 |
| `public.contacts` | 28 |
| `public.apprentices` | 26 |
| `public.profiles` | 19 |

**The operator's topology claim is correct and the magnitude was understated** — two hubs
at 278 and 201, then a 5× cliff to 38. Rendering those as edges would produce exactly the
unreadable star the brief describes.

**Two corrections that change the design:**

1. **The person hub is `auth.users`, not `profiles`.** 201 FKs point at `auth.users`;
   only 19 at `public.profiles`. `auth.users` is **not in the `public` schema**, so a
   diagram scoped to `public` cannot draw that node at all — those 201 edges would dangle.
   The scoping-edge suppression in §6.2 is therefore not merely cosmetic; it is the only
   coherent way to represent them.
2. **`tenant_id` *is* a declared FK** (263 of them), so it genuinely would draw. The
   premise holds for that half.

**Honest caveat on scale.** These 890 FKs are for all 417 tables. The canvas shows **44
entities**, which map to ~42 real tables. The edge count *for the canvas* after §5.1.3
import is therefore far smaller than 890 and is **UNKNOWN until reflection is wired** —
it should be measured before tuning defaults. The controls below are specified to degrade
gracefully at both 30 edges and 300.

### 6.2 Primary categorical axis: scoping vs domain

**The primary axis is not subject area. It is whether an edge carries meaning for the
reader.**

**Scoping / infrastructure edges — DEFAULT HIDDEN:**

`tenant_id`, `user_id`, `created_by`, `updated_by`, `deleted_by_user_id`, `approved_by`,
`invited_by`, `assigned_to`, `reviewed_by`, `submitted_by`.

Measured per-column, so the classifier is exact, not heuristic:

| Column | FKs | Column | FKs |
|---|---:|---|---:|
| `tenant_id` | 263 | `updated_by` | 4 |
| `created_by` | 69 | `invited_by` | 4 |
| `user_id` | 38 | `reviewed_by` | 3 |
| `approved_by` | 6 | `assigned_to` | 3 |
| | | `submitted_by` | 2 |
| | | `deleted_by_user_id` | **0** |

**Justification for hiding by default — this is a deliberate ruling, not a convenience:**

1. **They are uniform, therefore uninformative.** `tenant_id` appears on 295 of 417
   tables. An attribute shared by ~71% of nodes distinguishes nothing. Drawing it costs
   263 lines and conveys one sentence: *"this system is multi-tenant."*
2. **They destroy the signal-to-noise ratio for the edges that matter.** 392 of 890 FKs
   (44%) are boilerplate. In an FK-derived view of the full schema they would be nearly
   half the ink and would route across the entire canvas to two hub nodes, crossing
   essentially every domain edge on the way.
3. **One of the two hubs cannot be drawn correctly anyway** (`auth.users`, outside
   `public`).
4. **The information is not lost — it is relocated to where it costs nothing.** Per the
   brief: render as a chip on the entity card, not a line.

**Card chip, replacing the edges:**

```
┌─ Placement ──────────────────── SYS ─┐
│ placements                           │
│ ⛨ tenant · 👤 created_by, assigned_to │   ← scoping chip row, always visible
├──────────────────────────────────────┤
│ ⚷ id                    uuid         │
│   apprentice_id         uuid  → ●    │
```

The chip is one line, is present on every card, and answers "is this tenant-scoped, and
who touches it" without a single line being drawn. Hovering it lists the exact columns.
A **"Show scoping links"** toggle exists and is off by default; turning it on is a
legitimate thing to want once, briefly, and never as a working default.

### 6.3 Subject-area categories — verified and corrected

The brief's proposed families were checked table by table against the live schema.
**47 of 48 named tables exist. One is fictional:** `organisations` — the real table is
`organizations` (US spelling, 13 inbound FKs). Everything else in the brief is real.

But the named lists cover ~48 of 417 tables (~11%), so they cannot be the taxonomy on
their own.

**Do not hardcode a category list.** A real, already-curated taxonomy exists in the
database: **`report_catalog_entities.domain`**, 12 values over 112 entities, and the table
is load-bearing (6 inbound FKs).

| domain | entities | domain | entities |
|---|---:|---|---:|
| compliance | 22 | reference | 7 |
| recruitment | 21 | operations | 5 |
| finance | 19 | documents | 3 |
| safety | 12 | communications | 1 |
| workforce | 12 | payroll | 1 |
| crm | 8 | charge_rates | 1 |

**Checked and rejected as category sources:** `tenant_entities` has **no** category /
module / subject-area column — its `app_scope` is app targeting (`'all'` on all 45 rows)
and its `metadata` jsonb is `{}` on every row. `tenant_field_definitions.section` is
`'custom'` on all 565 rows. Neither is usable.

**Ruling for the spec:** categories are `report_catalog_entities.domain`, backfilled onto
the 44 canvas entities. Where a canvas entity has no catalog row, fall back to a
maintained map, and surface the gap as **"Uncategorised"** in the UI rather than hiding it
— an uncategorised entity is a data defect the operator should see.

Mapping the 44 canvas entities to the brief's families gives, for reference:
Apprentice/placement **10** · Core CRM **6** · Training/VET **6** · WHS/compliance **6** ·
Payroll & awards **5** · Finance **4** · Documents & comms **3** · Rates & quoting **2** ·
Platform **1**. **Recruitment (r7_*) and Audit/log have zero representation among the 44** —
the entire 26-table R7 surface is absent from the canvas, which is itself worth a ruling.

**Audit/log** (`*_audit_log`, `*_events`, `*_history`, `error_log` — ~40 tables) is
**default hidden** as its own suppression, separate from category selection, for the same
reason as scoping edges: they are write-only sinks, they connect to everything, and nobody
reading a domain diagram wants them. None are currently on the canvas, so this is
forward-looking.

### 6.4 The controls

Four modes. **Focus is the default at 44 entities** — "All" on a 44-node graph is a
legitimate option and a terrible default.

| Mode | Behaviour |
|---|---|
| **None** | No edges. Cards + scoping chips only. The cleanest possible read of "what entities exist" |
| **Focus** ← **default** | Select an entity → show only its neighbourhood at the chosen hop depth; everything else dims to ~25% and its edges are hidden. Depth control **1-hop / 2-hop**, default 1 |
| **Category** | Multi-select (**not radio** — "financial + core CRM, nothing else" must be expressible). Shows edges where **both** endpoints are in the selected set; edges crossing into an unselected category render as a **stub** with a count badge, so the user can see that something was cut rather than believing nothing is there |
| **All** | Everything except scoping and audit, unless those are separately toggled on |

**Persistent hidden-count, always visible, never a silent filter:**

> `168 relationships hidden — 91 scoping · 77 audit · 0 category` **[Show all]**

This is the single biggest improvement over Supabase's visualiser, which hides without
telling you and gives you no way to know what you are not seeing. **A filter that cannot
report what it removed is the same defect class as a gate that cannot tell "checked
nothing" from "found nothing"** (issue #1966). The count is a live `role="status"`.

**Additional controls (all from the brief, all specified):**

| Control | Behaviour |
|---|---|
| **Isolate entity** | Right-click → Isolate. Canvas shows only that entity + neighbours; breadcrumb chip shows the isolation and a one-click exit |
| **Hide entity** | Right-click → Hide. Adds to a "Hidden (n)" chip in the toolbar that lists and restores them |
| **Hide unconnected** | Toggle. At 44 entities with few documented links this hides most of the canvas — so it must show `"31 unconnected entities hidden"`, not silently empty the screen |
| **Search** | Must actually **filter** (defect #20), dimming non-matches rather than only panning to the first hit. Keep the pan-to-first behaviour on Enter |

### 6.5 Edge rendering — where this must beat Supabase

Supabase's visualiser is hard to read for three specific, fixable reasons. Each gets a rule.

**6.5.1 Anchor edges to the COLUMN, not the card.** A table with six FKs currently
converges six lines on one card edge and the reader cannot tell which column is which. The
handles for this already exist per field (`FieldRow.tsx:150-165`) — the renderer must use
them. Required: an edge terminates on the **field row** of its FK column, and that row
highlights when the edge is hovered or selected.

**6.5.2 Orthogonal or bundled routing, not straight overlapping lines.** Straight lines
between arbitrary node positions cross constantly. Required:

- Orthogonal (Manhattan) routing with rounded corners, or force-directed bundling for
  edges sharing an endpoint cluster.
- **Crossing count is the acceptance metric**, not "looks tidier". Measure crossings
  before and after on the same layout; the routing change must reduce it. Record the
  number in the PR.
- Edges route **around** cards, never under them. An edge disappearing behind a card is
  the specific thing that makes Supabase's view unreadable at density.
- Auto-layout must be direction-aware (dagre left-to-right for connected graphs is already
  there via `computeDagreLayout`) — and `computeGridLayout`'s overlap bug (defect #19)
  must be fixed first, or Tidy actively makes routing worse.

**6.5.3 Hover reveals the truth.** Hovering an edge shows a tooltip:

```
placements.apprentice_id  →  apprentices.id
one-to-many · ENFORCED · fk_placements_apprentice_id
ON DELETE CASCADE
```

Enforced vs Documented (§4.2) must be visually distinguishable **without** hover as well:
solid vs dashed stroke, filled vs open crow's foot. A reader must never have to guess
whether a line represents a real constraint.

**6.5.4 Cardinality markers** stay as crow's feet (`SmartEdge.tsx:37-52` already does
this), but the marker fill must stop being `fill="white"` (`SmartEdge.tsx:142`) — a raw
literal, off-token, and invisible-or-wrong in one of the two themes.

---

## 7. Canvas legibility, zoom and navigation

### 7.1 Zoom

**Root cause of illegibility, measured:** `<ReactFlow>` sets no `minZoom`, so `fitView`
clamps at the library default **0.5** — confirmed live, viewport transform is exactly
`scale(0.5)`. The default 4-column grid for 44 entities is ~1540 px wide and **≥ 2340 px
tall** even in the impossible case of zero fields per card (realistically ~5400 px). It
cannot fit a 900 px viewport at any zoom the library will allow, so `fitView` silently
gives up at 0.5 and shows roughly 30% of the diagram.

At 0.5, text renders at: card title **7px**, field name **5.5px**, field type **5px**,
`NOT NULL` badge **4.5px**. All illegible. There is **no level-of-detail behaviour
anywhere** in the package.

| Rule | Value |
|---|---|
| `minZoom` | **0.05** (one line; makes Fit capable of actually fitting) |
| `maxZoom` | 2.0 |
| Default view | **not** raw `fitView`. Open in **Focus mode** (§6.4) at a zoom where field text is legible — target ≥ 11 device px, i.e. zoom ≥ 1.0 |
| Zoom presets | Fit · 50% · 100% · Focus |

### 7.2 Level of detail — required, currently absent

The canvas must change *what* it draws, not just how small.

| Zoom | Card renders |
|---|---|
| **< 0.35** | Entity **label only**, large enough to read (~14 device px), category colour bar. No fields, no chips, no buttons |
| **0.35 – 0.7** | Label + physical table name + field **count** ("18 fields") + scoping chip. Still no field rows |
| **> 0.7** | Full detail: all field rows, types, nullability, handles |

This is what makes a 44-node diagram readable zoomed out and is the single change that
most directly answers *"all field text is illegible."* It also removes the per-card
instructional banner (`Drag blue dots to connect entities.`, `EntityNode.tsx:199`) from 44
cards at once — at 5 device px it is unreadable clutter that inflates every card's height
and therefore the diagram that will not fit. **Move it to the toolbar, once.**

### 7.3 Container height — defect #8 and #15

The canvas declares `h-[calc(100vh-64px)]` and lives inside `MainLayout`'s scroll region,
which adds `py-6 pb-20 / lg:pb-8`, an inner card's `py-4/py-5`, `CRM7Footer`, a demo
banner, and below 1024px a fixed 56px `MobileBottomNav`. Measured overshoot, with
`scrollHeight == innerHeight` in every case so **the overflow cannot be scrolled to**:

| Width | Canvas bottom | Window | Overshoot |
|---:|---:|---:|---:|
| 1440 | 989 | 900 | **89 px** |
| 1024 | 1001 | 900 | **101 px** |
| 768 | 1001 | 900 | **101 px** |
| 390 | 1037 | 900 | **137 px** |

Consequence: React Flow's `<Controls>` (`y 896–974`) and the bottom of the minimap are
permanently unreachable, and the quick-start note is painted over the controls anyway.

**Fix — do not patch the arithmetic.** Give `MainLayout` a real full-bleed mode.

```
MainLayoutProps { chromeless?: boolean }
```

When `chromeless`, the layout drops `CRM7Footer`, drops the assistant `aside`, removes the
outer padding and the rounded inner card, and gives the child a flex-`1 1 0` slot in a
`100dvh` column. The canvas then uses `h-full`, never `calc()`. `100dvh` (not `100vh`)
because mobile browser chrome changes height and `vh` does not.

This is the correct fix for **#8, #11, #12 and #15 simultaneously**, and it is reusable by
every other full-bleed tool route in the estate. Patching `calc(100vh-64px)` to a bigger
subtraction fixes one page and re-breaks the moment a banner appears — and a banner *does*
appear on `d.*` (the demo-mode notice, live in every cell inspected).

### 7.4 Breakpoints

The entire package contains **four** responsive utilities, all on the toolbar. The
properties panel is a hard `w-80 shrink-0` flex sibling with no sheet variant.

| Width | Required behaviour |
|---|---|
| **1440** | Canvas + optional right panel. Toolbar horizontal. Minimap bottom-right, themed |
| **1024** | Identical. Panel becomes an **overlay** rather than a flex sibling, so it stops stealing 320px of a 1024px canvas |
| **768** | Toolbar collapses to icons **with visible labels retained in an overflow menu** — never icon-only with no text alternative. Panel is a bottom sheet. Minimap hidden |
| **390** | **Read-first mode.** Measured today: a single tap opens a 320px panel over a 390px viewport, leaving a **70px** canvas. Required instead: canvas fills the screen, LOD forced to label-only, pinch-zoom and pan, tap a card → full-screen detail sheet. **Editing and relationship creation are explicitly out of scope at 390px** — but the surface must say so rather than offering 6px drag handles no thumb can hit. A banner: *"Viewing only on small screens. Open on a larger screen to edit."* |

Touch targets at every breakpoint: **≥ 44 × 44 CSS px** (WCAG 2.5.5). Currently every
toolbar control is 32px tall and React Flow's `<Controls>` buttons are 26 × 26.

---

## 8. The dialog — placement, focus, keyboard, dismissal

### 8.1 Placement

**Fix once at the theme layer**, because all five dialogs in the package share the defect:

```css
/* packages/theme — restores the UA centring that Preflight's `* { margin: 0 }` removes */
dialog:modal { margin: auto; }
```

Verified prediction: computed `margin` becomes `auto` and the rect centres on
`(innerWidth/2, innerHeight/2)`. The gate must assert `centredX && centredY`, not eyeball
a screenshot — the measurement is in `/tmp/sb-gate/dialog2.json` and is trivially
re-derivable.

Keep the native `<dialog>`. It is the right primitive: it supplies role, `aria-modal`,
focus containment, page inertness, Escape and a backdrop from the browser, and the
package's deliberate zero-design-system-dependency rule (it is consumed by conduit, crm7,
BSU and throughput) is sound. Migrating to Radix would not have fixed **any** of defects
1–4.

| Property | Required |
|---|---|
| Position | centred both axes; `max-height: min(85dvh, 640px)`; body scrolls, header and footer pinned |
| Width | `min(560px, 92vw)` — 480px is too narrow for §8.3's copy |
| At 390px | full-screen sheet, slide up from bottom, sticky action bar |
| Backdrop | `bg-overlay/50`, click-outside dismisses (already correct via `useLightDismissDialog`) |

### 8.2 Focus, keyboard, dismissal

Measured on the live dialog: `aria-labelledby` **present**, `aria-describedby` **null**,
no close **×**, initial focus lands on `SELECT#relation-type-select` — correct by accident
(first focusable descendant) rather than by declaration.

| Requirement | Today | Required |
|---|---|---|
| Focus trap | ✅ browser-enforced | keep |
| Page inert | ✅ browser-enforced | keep |
| Escape closes | ✅ | keep |
| Initial focus | incidental | explicit `autoFocus` on the first control |
| Focus restoration | browser-enforced, but the opener was a **pointer drag** so there may be nothing to restore to | on close, focus the **source field row** explicitly |
| `aria-describedby` | ❌ null | point at the context paragraph, so SR users hear *"Define the relationship between Client and Employer"* |
| Close **×** | ❌ absent | add, `aria-label="Close"`, ≥44×44 |
| Decorative icon | `<GitBranch>` unhidden | `aria-hidden="true"` |
| Disabled submit | `disabled` removes it from tab order | `aria-disabled` + keep focusable, with the existing inline `role="alert"` explaining why |
| Keyboard path in | **none** | §5.1.2 |

**Bug found in passing:** `isSelfRelation` (`RelationshipConfigDialog.tsx:58`) compares
`sourceName === targetName` — **display labels, not ids**. True self-relations are already
blocked upstream by an id comparison (`SchemaCanvas.tsx:328-331`), so this branch can only
fire for two *distinct* entities that share a label, wrongly blocking a legitimate
`inherits_from`. Fix by passing entity **ids** into the dialog — the same change §3/#4
needs for canvas binding.

### 8.3 Corrected UX copy

Applying `design:ux-copy`: clear, concise, consistent, useful, human. The core problem
with the current copy is that **"Source Label" reads equally well as "the label *for* the
source"** — the noun and the sentence pull in opposite directions, and users trust the
noun. The fix is to rename the fields so they describe what they produce, at which point
the helper sentences become redundant and are **deleted, not repositioned**.

| Element | Current | **Proposed** |
|---|---|---|
| Title | `Configure Relationship` | **`Link Client to Employer`** — names the actual entities in the title, which also part-answers defect #4 |
| Scope line (**new, P0**) | — | **`Diagram link only — this documents how these entities relate. It does not change the database.`** (§4.1) |
| Context | `Define the relationship between Client and Employer.` | *(absorbed into the title; delete)* |
| Type label | `Relationship Type` | **`How many?`** with the type name as the option and the explanation below |
| Option 1 | `One-to-Many — Source has many targets (e.g. Client → Contacts)` | **`One Client → many Employers`** |
| Option 2 | `One-to-One — Source maps to exactly one target` | **`One Client → one Employer`** |
| Option 3 | `Many-to-Many — Both sides can have multiple links` | **`Many Clients ↔ many Employers`** |
| Option 4 | `Inherits From — Source inherits all fields of target` | **`Client inherits Employer's fields`** |
| Type helper (**new**) | — | description of the **selected** option only, rendered as wrapping helper text below the select — this is the fix for defect #2, not a wider select |
| Source label field | `Source Label (optional)` | **`What Client calls Employer`** *(optional)* |
| Source placeholder | `e.g. "Assigned Employers"` | **`Assigned Employers`** — placeholders should show the answer, not the phrase "e.g." plus quotes |
| Source helper | `How Employer appears when viewed from Client.` | *(delete — the label now says it)* |
| Target label field | `Target Label (optional)` | **`What Employer calls Client`** *(optional)* |
| Target placeholder | `e.g. "Belongs to Client"` | **`Belongs to Client`** |
| Target helper | `How Client appears when viewed from Employer.` | *(delete)* |
| Preview (**new**) | — | a live sentence: **`On a Client you'll see "Assigned Employers". On an Employer you'll see "Belongs to Client".`** — one line that makes the direction unmistakable and removes the whole class of confusion |
| Submit | `Create Relationship` | **`Create link`** — honest about scope; matches §4 |
| Cancel | `Cancel` | keep |
| Self-inherit error | `An entity cannot inherit from itself. Please select a different relationship type.` | **`An entity can't inherit from itself. Pick a different type.`** |
| Self-relation toast | `Cannot create a relationship from an entity to itself` | **`An entity can't link to itself. Drag to a different card.`** — says what to do next |

**Other surfaces:**

| Where | Current | **Proposed** |
|---|---|---|
| Empty state body | `Create your first entity to start building the schema.` | keep, **and add the button that is currently missing** (defect #14): **`Create entity`** |
| Error state | `Failed to load schema` + raw `error.message` | **`Couldn't load the schema.`** / **`Check your connection and try again. If it keeps happening, the schema service may be down.`** + **`Try again`** button + a collapsed **`Technical details`** disclosure holding the raw message. Never surface a PostgREST string as the primary message (defect #16) |
| Loading | `Loading schema...` | **`Loading schema…`** (ellipsis char) + a skeleton canvas, not a bare centred string |
| Card hint ×44 | `Drag blue dots to connect entities.` | **delete from the card**; move to the toolbar once (§7.2) |
| `Add to Page` | inert button | **remove it** until a listener exists (defect #7a). A control wired to nothing is worse than no control |
| Toolbar count | `44 entities` | **`44 entities · 0 links`** — surfacing the zero would have caught R0 |
| Hidden count (**new**) | — | **`168 relationships hidden — 91 scoping · 77 audit`** **[Show all]** |
| Delete link confirm (**new**) | — | **`Delete the link between Client and Employer?`** / `This removes it from the diagram. The database is not changed.` / **`Delete link`** · **`Keep it`** |

---

## 9. WCAG AA — measured before / after

Standard: WCAG 2.1 AA. Ratios computed by converting oklch → linear sRGB → WCAG relative
luminance, against the **composited** background (the canvas is transparent, so the ground
is `MainLayout`'s elevated shell over `--role-bg-body`). Live probe values cross-check the
computed ones.

### 9.1 Contrast

**Good news first, because it changes the priority:** most schema-builder text **passes,
comfortably**. The package uses semantic tokens throughout, has **no** raw Tailwind palette
classes and **no** hex/pure-white/pure-black literals in production code except one. The
operator's "low text contrast throughout the canvas" reads as true because the text is
**4.5–7 device px** (defect #5), not because the colours are wrong. **Legibility here is a
zoom problem, not a contrast problem** — and fixing contrast would not have helped.

| Element | fg | bg | Dark | Light | Required | Verdict |
|---|---|---|---:|---:|---|---|
| Entity node title | `role-text-body` | `role-bg-panel` | 15.49:1 | 16.35:1 | 4.5 | PASS |
| Field name | `role-text-secondary` | `role-bg-panel` | 10.58:1 | 9.45:1 | 4.5 | PASS |
| Field type (10px) | `role-text-muted` | `role-bg-panel` | 6.41:1 | 5.20:1 | 4.5 | PASS |
| `NOT NULL` badge (9px) | `role-error-text` | `role-bg-panel` | 6.72:1 | 6.19:1 | 4.5 | PASS |
| Toolbar labels | `role-text-secondary` | `bg-card/95` | 10.58:1 | 9.45:1 | 4.5 | PASS |
| Entity count (10px) | `role-text-muted` | `bg-card/95` | 6.41:1 | 5.20:1 | 4.5 | PASS |
| Dialog label / helper | `role-text-secondary` / `-muted` | `role-bg-panel` | 10.58 / 6.41 | 9.45 / 5.20 | 4.5 | PASS |
| Primary button label | `text-on-light-fill` | `role-primary` | 4.88:1 | 4.88:1 | 4.5 | PASS |
| Destructive button label | `text-on-light-fill` | `role-error` | 4.55:1 | 4.55:1 | 4.5 | PASS (razor-thin) |
| **Node card border** | `role-border` | canvas | **2.27:1** | **1.06:1** | **3.0** (1.4.11) | **FAIL both** |
| **Edge stroke, `inherits_from`** | `role-secondary` | canvas | **1.78:1** | 9.28:1 | **3.0** (1.4.11) | **FAIL dark** |
| **React Flow attribution link** | `rgb(153,153,153)` | minimap ground | **1.33:1** | **2.76:1** | 4.5 | **FAIL both** |
| **Minimap surface** | — | — | `L = 1.000` pure white | same | V-C1: banned | **FAIL both** |

**Fixes with measured after-values:**

| # | Fix | Before | **After** |
|---|---|---|---|
| A | Node card border → `--role-border-interactive` (**token already exists**, minted for bsuite#1958; the schema card is interactive and was never switched onto it) | dark 2.27:1 · light 1.06:1 | **dark 5.97:1 · light 4.38:1** |
| B | Add a dark-mode binding for `--role-secondary`, currently **not rebound under `.dark`** so a navy tuned for white is reused on near-black: `.dark { --role-secondary: oklch(0.60 0.140 270); }` | dark 1.78:1 | **dark 4.58:1** (light unchanged at 9.28:1) |
| C | Set `colorMode` on `<ReactFlow>` from the app theme → `.react-flow.dark` applies → minimap ground becomes `#141414`, and the attribution link composites against it | 1.33:1 / 2.76:1 | ≥ 4.5:1 once the ground is themed; **must be re-measured, not assumed** |
| D | Override `--xy-minimap-*` with brand tokens so the minimap is never `#fff` in either theme | `L = 1.000` | `role-bg-panel`, `L = 0.190` dark / `0.984` light — clears V-C1's `L ≥ 0.990` fail and `0.986–0.990` warn bands |
| E | `SmartEdge.tsx:142` `fill="white"` → `var(--role-bg-panel)` | raw literal, off-token | token-bound, theme-correct |

### 9.2 The minimap — one root cause, four symptoms

`<ReactFlow>` never passes `colorMode`. React Flow 12.11.0 defaults it to `'light'`, so
`.react-flow` **never receives the `dark` class** — measured live: `rfHasDarkClass: false`
while the app is in dark theme. The library stylesheet only defines minimap colours under
`.react-flow` and `.react-flow.dark`, so the minimap keeps `--xy-minimap-background-color-default: #fff`
forever. That single omission produces: the "unstyled grey rectangle" (#10), the V-C1
pure-white FAIL, the 1.33:1 attribution contrast FAIL, and unthemed `<Controls>` buttons.

`packages/schema-builder/src/components/SchemaCanvas.tsx:21` imports
`@xyflow/react/dist/style.css` wholesale — that is where all the unthemed hex defaults
enter. The `--xy-*` namespace does not collide with `--role-*`, so there is no cascade
conflict; the problem is purely that **nothing overrides them**.

### 9.3 Other AA findings

| Criterion | Finding | Fix |
|---|---|---|
| **2.1.1 Keyboard (A)** | **No keyboard path exists to create a relationship at all** — acknowledged in-source at `FieldRow.tsx:44-49` | §5.1.2. This is a Level **A** failure and the most serious a11y defect here |
| 2.5.5 Target size | Toolbar controls 32px tall; `<Controls>` 26×26; field handles 12 CSS px (**6 device px** at default zoom) | §5.1.1, §7.4 — ≥44×44 |
| 2.5.8 Target minimum | handles 6 device px vs 24 floor | §5.1.1 |
| 2.4.3 Focus order | 88 tab stops for 44 cards (double stop per card, defect #21), no skip link | remove `tabIndex={0}` at `EntityNode.tsx:90`; add a roving tabindex and a "skip to canvas" link |
| 4.1.2 Name/role/value | Connect handles are `aria-hidden="true"` — **correct** (an `aria-label` on a role-less div is invalid and previously produced ~14,016 axe violations) but it means AT users get **no** announcement that a connection affordance exists | the §5.1.2 keyboard path is what actually resolves this |
| 1.4.10 Reflow | Dialog pinned to top-left and clipped by `max-height` at small viewports | §8.1 |
| 3.3.1 Error identification | Error state surfaces a raw PostgREST string as the primary message | §8.3 |
| 1.1.1 / 1.4.11 | Minimap, controls, edge strokes | §9.1 |

---

## 10. Empty, loading and error states

All three **exist and are designed** — the original premise that they were missing is
**not confirmed**. They were induced live and inspected. Two real defects were found
inside them.

| State | Renders today | Verdict |
|---|---|---|
| **Loading** | centred `Loading schema...`, `SchemaCanvas.tsx:742-746` | present; replace with a skeleton canvas (§8.3) |
| **Empty** | `Workflow` icon + `No entities yet` + `Create your first entity to start building the schema.`, `role="status"`, `:760-770` | **DEAD END — P0.** Measured live: `role="toolbar"` is **absent** when node count is 0, and crm7 never attaches the ref that exposes `openCreateEntity()`. The screen instructs an action it makes impossible |
| **Error** | `AlertTriangle` + `Failed to load schema` + **raw** `error.message`, `role="alert"`, `:747-759` | present; leaks backend text, has no retry (§8.3) |

Note a deliberate and **correct** existing behaviour worth preserving: a field-definitions
failure is non-fatal and degrades to `fields: {}` with a one-shot toast rather than
blanking the canvas (`useSchemaController.ts:241`).

---

## 11. Persistence of view state

`tenant_schema_layout` **exists** and the brief's description is accurate:
`tenant_id` NOT NULL, `user_id` **nullable**, with two partial unique indexes giving
tenant-default rows (`user_id IS NULL`) and per-user override rows. RLS is via
`schema_authority_tenant_ids()`, which exists. Current contents: **3 rows**, all
tenant-defaults, for 44 entities × 7 tenants — positions are effectively unused.

**But it cannot carry view state as it stands, and the reason is structural:** the table is
`(tenant, user, entity) → (pos_x, pos_y)`. It is **per-entity**. Visibility mode, active
categories, focus target + hop depth and viewport are **per-view singletons** with no
entity to hang on, and `entity_id` is `NOT NULL` with a cascading FK, so there is no
sentinel row available.

**Do not create a new table.** Minimal change:

```sql
ALTER TABLE public.tenant_schema_layout
  ADD COLUMN view_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ALTER COLUMN entity_id DROP NOT NULL;
-- and redefine the two partial unique indexes so that exactly one
-- entity_id IS NULL row per (tenant_id, user_id, app_scope) carries view state,
-- while entity_id IS NOT NULL rows keep carrying positions unchanged.
```

**1 new column + 1 nullability change + 2 index redefinitions.** No new table, no new RLS
function, and `service.ts`'s existing `resolveLayout()` tenant-default-vs-personal-override
resolution applies to view state unchanged — which is exactly the admin-sets-a-default,
user-overrides behaviour the brief asks for.

```jsonc
view_state = {
  "mode": "focus",                       // none | focus | category | all
  "categories": ["finance", "crm"],      // from report_catalog_entities.domain
  "focus": { "entityId": "…", "hops": 1 },
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "showScoping": false,
  "showAudit": false,
  "hidden": ["…"]
}
```

**⚠ RLS asymmetry that must be resolved before this ships.** SELECT is
`authority OR user_id = auth.uid()`, but INSERT/UPDATE require
`authority AND (user_id IS NULL OR user_id = auth.uid())` — where "authority" means
owner/admin/manager. **A `staff` user can therefore neither read nor write their own
personal view state.** If the Schema Builder is ever to be usable read-only by non-managers,
the INSERT/UPDATE policies need a branch permitting `user_id = auth.uid()` rows regardless
of authority. That narrows nothing and leaks nothing — but it **is** an RLS change and is
therefore **Braden's call**, not an agent's.

---

## 12. Prioritised fix list

### P0 — blocking usability. The tool does not work without these.

| # | Fix | Class | Effort | Ref |
|---|---|---|---|---|
| P0-1 | **Repair the relationship insert.** Remove `source_field_id`, `target_field_id`, `on_delete`, `on_update` from `types.ts`, `schemas.ts` and `SchemaCanvas.tsx` — **or** re-apply migration `20260503000000`. Decide which; do not leave the contract and the table disagreeing | BUG | S | R0 |
| P0-2 | **Contract test** asserting the insert payload's keys are exactly the live table's columns. This is the gate that was missing for 3.5 months | BUG | S | R0 |
| P0-3 | **`minZoom={0.05}`** on `<ReactFlow>` — one line; makes "Fit" capable of fitting | BUG | XS | #5 |
| P0-4 | **`dialog:modal { margin: auto }`** at the theme layer — fixes all five dialogs | BUG | XS | #1 |
| P0-5 | **Level-of-detail rendering** by zoom band | DESIGN | M | #5, §7.2 |
| P0-6 | **`chromeless` mode on `MainLayout`** — fixes canvas clipping, footer, mascot and unreachable zoom controls together | BUG | M | #8, #11, #12, #15 |
| P0-7 | **Empty state gets a working `Create entity` button**; toolbar no longer hidden at zero nodes | BUG | S | #14 |
| P0-8 | **Label what is being created** — scope line + `Create link` (§4.1). A user must never believe they made a foreign key when they made a metadata row | DESIGN | XS | §4 |
| P0-9 | **Enlarge connect targets to ≥24px effective**, with drag-time target highlighting | DESIGN | M | #6, §5.1.1 |
| P0-10 | **Keyboard path to create a relationship** — WCAG 2.1.1 Level A failure | BUG | M | §5.1.2 |
| P0-11 | **Draw the real FKs** via the already-deployed `reflect_entity_schema`, read-only, visually distinct from documented links | DESIGN | M | R2, §4.2 |

### P1 — the tool is usable but wrong or misleading.

| # | Fix | Class | Ref |
|---|---|---|---|
| P1-1 | Relationship **edit** — wire the existing `updateRelation`, which has zero callers | BUG | #17 |
| P1-2 | Relationship **delete** — `Delete` key, visible selection, confirm dialog, undo, stop swallowing errors | DESIGN | #18 |
| P1-3 | **Display controls**: None / Focus / Category / All, Focus as default, category **multi-select**, persistent hidden-count | DESIGN | §6.4 |
| P1-4 | **Scoping edges default hidden**, replaced by a card chip | DESIGN | §6.2 |
| P1-5 | **Column-anchored edges** + orthogonal/bundled routing; record crossing-count before/after | DESIGN | §6.5 |
| P1-6 | Edge **hover tooltip** with `source.column → target.column`, constraint, cardinality | DESIGN | §6.5.3 |
| P1-7 | Split `<option>` label from description; render the selected description as helper text | DESIGN | #2 |
| P1-8 | **Rewrite the source/target copy**; delete the inverted helper sentences; add the live preview line | DESIGN | #3, §8.3 |
| P1-9 | Settle the `source_label` double meaning — accessor label vs edge display name — **before** P1-8 lands, since the rename depends on it | BUG | #3b |
| P1-10 | Bind dialog to canvas: pass entity **ids**, highlight and pan to both endpoints (also fixes the `isSelfRelation` label-comparison bug) | DESIGN | #4, §8.2 |
| P1-11 | **Fix `computeGridLayout` gaps** (`gapX 320 < 340`, `gapY 220 < 224`) and extend the no-overlap test to it | BUG | #19 |
| P1-12 | **Remove the inert `Add to Page` button** until a listener exists | BUG | #7a |
| P1-13 | Contrast fixes **A**, **B**, **C**, **D**, **E** | BUG | §9.1 |
| P1-14 | `colorMode` on `<ReactFlow>` + `--xy-minimap-*` overrides | BUG | #10, §9.2 |
| P1-15 | Error state: friendly message, `Try again`, technical details collapsed | DESIGN | #16 |
| P1-16 | Dialog a11y: `autoFocus`, `aria-describedby`, close ×, `aria-hidden` on icon, `aria-disabled` submit | BUG | §8.2 |
| P1-17 | Toolbar and `<Controls>` targets to ≥44×44 | DESIGN | #13, §7.4 |
| P1-18 | Move the ×44 card hint to the toolbar | DESIGN | §7.2 |
| P1-19 | `view_state` column + nullable `entity_id` on `tenant_schema_layout` | — | §11 |

### P2 — polish and hygiene.

| # | Fix | Ref |
|---|---|---|
| P2-1 | Search actually filters, not just counts | #20 |
| P2-2 | Remove the double tab stop per card; roving tabindex; skip-to-canvas link | #21 |
| P2-3 | Isolate / hide entity, hide-unconnected toggle | §6.4 |
| P2-4 | Elevation: dark-mode cards get the accent glow (`--glow-card`); stop `box-shadow: none` on card roots | V-C7 |
| P2-5 | Quick-start note must not overlay `<Controls>` | #15 |
| P2-6 | Reposition the Jodie button on canvas routes, or suppress via `chromeless` | #12 |
| P2-7 | Backfill `report_catalog_entities.domain` onto the 44 entities; surface "Uncategorised" | §6.3 |
| P2-8 | 390px read-first mode with an explicit "viewing only" banner | §7.4 |
| P2-9 | Toolbar reads `44 entities · 0 links` | §8.3 |

---

## 13. Cells not inspected, and classes reported UNKNOWN

Per Ruling V-3, a class this inspection could not evaluate reports **UNKNOWN**, never PASS.

**Cells not inspected, named:**

- **Empty / loading / error at 1024, 768, 390** — induced only at 1440. The state markup
  is width-independent (a centred flex column) but this is asserted, not measured.
- **Loading at light theme, error at 768/390.**
- **tenantB at 1024 / 768 / 390** — tenantB inspected at 1440 only, both themes. It
  renders the same 44 platform entities (`tenant_id IS NULL`), which is expected and is
  **not** a tenant-isolation leak: these rows are deliberately global. No tenant-private
  entity exists to compare, so **tenant isolation on this surface is untested by this run**.
- **The third tenant** (`braden.lang@lookn.com.au`) — not in `.env.local`; not attempted.
- **Social sign-in paths** (Azure on tenant B, Google on the others) — not exercised. This
  route is not an auth surface, so the protocol's all-three-accounts rule for auth changes
  does not bite, but it is named rather than silently skipped.
- **Deploy SHA confirmation** — the protocol's `gh pr checks` / live-SHA-equals-pushed-SHA
  step was **not performed**, because this is an inspection of the current deployed state
  with no PR and no commit of my own. Every finding is against whatever `d.crm.crm7.app`
  was serving on 2026-08-22. If a deploy lands between now and implementation, re-run.

**Classes UNKNOWN:**

- **V-C4 `gluedCards`** and **V-C6 `canvasColumns`** — the probe found 135 cards and no
  `.react-grid-layout` root. This route mounts a React Flow canvas, **not** the
  `@bsuite/page-builder` grid, so these classes are **not applicable** rather than passing.
  Recorded UNKNOWN so that no future reader mistakes "did not apply" for "was checked and
  was fine."
- **Edge-related classes generally** — with 0 edges rendered, nothing about edge contrast,
  routing, crossing count, hover behaviour, or label legibility could be evaluated **on the
  live page**. §9's edge-stroke numbers are computed from tokens, not measured on rendered
  edges. **After P0-1 and P0-11 land, the whole gate must be re-run** — that run will
  exercise classes this one could not reach.

**Verdict: BLOCKED.** 10 of 15 cells returned probe `BLOCK`; two classes are UNKNOWN; the
surface's primary function does not work.

---

## 14. What the original report got wrong, or that is already fixed

Recorded because a defect list that only ever grows is not being checked.

| Item | Finding |
|---|---|
| #1 "likely a positioning/portal bug" | **Right symptom, wrong mechanism.** Not a portal or React Flow transform issue — the dialog is outside the canvas tree and is a top-layer native `<dialog>`. It is Tailwind Preflight's `margin: 0` beating the UA's `dialog { margin: auto }`. Fixing the "portal" would have changed nothing |
| #3 "helper text inverts the mental model" | **Copy problem, not a wiring bug.** `sourceLabel` persists to `source_label` with no swap at any of six hops. Had this been fixed as a wiring bug, correct data would have been broken |
| #6 "no discoverable primary action… establish whether drag-to-relate exists" | **It exists and is correctly wired.** Per-field handles + `onConnect`. The defect is that the targets are 6 device px and there is no non-pointer alternative |
| #7 "Drag back to canvas / connected entities" hint | **That string does not exist anywhere in the codebase.** The actual text is `Drag blue dots to connect entities.` — mis-read at 5px, which is itself evidence for #5 |
| #9 "low text contrast throughout the canvas" | **Mostly not true.** Almost all text passes AA with real margin; the package is disciplined about semantic tokens. Two genuine non-text failures (card border, `inherits_from` stroke) plus the minimap. The perceived problem is **size**, not contrast |
| #10 "unstyled grey rectangle" | **It is the React Flow MiniMap**, stuck on the library's `#fff` because `colorMode` is never set. Not a stuck skeleton, not a failed image |
| #13 "toolbar occluded, can't assess" | **Assessable and assessed.** Clean at `402×69` with no modal open. Its real defects are target size and icon-only collapse below `sm` |
| Empty / loading / error "states" | **All three exist and are designed.** The real defect is narrower and worse: the empty state is a **dead end** with no create control |
| The hairball premise | **Correct for the FK world** (278 + 201 hub degrees, understated if anything) — but **the canvas currently draws zero edges**, so it is a forward-looking problem, not a present one |

---

## 15. Open questions for Braden

1. **§4 — what should "Create Relationship" mean?** Documented-only, as it is today?
   Should real FKs be shown read-only (recommended: yes)? Is a later "Request migration"
   flow wanted?
2. **P0-1 — repair direction:** strip the four phantom fields from the TypeScript contract,
   or re-apply migration `20260503000000` and get field-level relations back? Field-level
   relations are what make §6.5.1's column-anchored edges possible, so this choice
   constrains the display work.
3. **§11 — the RLS asymmetry.** Permitting non-manager users to write their own
   `user_id = auth.uid()` view-state rows is an RLS change and therefore yours.
4. **§6.3 — the 44 entities exclude the entire 26-table R7 recruitment surface.** Intended?
5. **Naming drift, flagged in passing:** none of the 44 entity `name` values matches a
   public table name exactly (singular metadata vs plural physical), and 2 (`appeal`,
   `deal`) have no table at all. Anything joining the layers by name — including the
   `rename_physical_column` RPC's `public.<name>` lookup — misses 44 times out of 44.
   Related to open finding **R-5** in the findings register.
