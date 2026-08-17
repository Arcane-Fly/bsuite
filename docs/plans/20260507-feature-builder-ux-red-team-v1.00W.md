# Visual Feature Builder — UX Red-Team & Phase 0.5 Plan (v1.00W)

> ## ⚠ SUPERSEDED — 2026-08-17
>
> **Superseded as a plan.** The Feature Builder UX work has moved on twice since this red-team:
> `@bsuite/schema-builder` is at **1.3.0** (this plan predates 1.0), and the operator re-scoped the
> surface in the 2026-08-11 *"make it genuinely no-code"* direction.
>
> **Current authority:** [`../20260814-estate-remaining-work-register-v2.00W.md`](../20260814-estate-remaining-work-register-v2.00W.md);
> the newer framing is in `20260811-feature-builder-world-class-refined.md` (a **one-shot prompt**,
> not a plan — see `README.md`).
>
> Retained for the FF-FB-UX-REDTEAM-20260507 findings, which are still the best record of the UX
> failure modes this surface has.


**Frozen Fact:** `FF-FB-UX-REDTEAM-20260507`
**Status:** W (Working — under review by operator + cross-agent red team)
**Authors:** claude-code-local (consolidated from 4 sub-agents) + perplexity-computer (codehouse parity research, addendum forthcoming)
**Trigger:** Operator live review of `https://suite.crm7.app/developer/feature-builder` declared the UX "not good enough not even close" — manual `tenant_id` entry, no drag-and-drop components, no pre-built parts, unintuitive 8-tab structure.

---

## 1. Sub-agent red-team summary

Four parallel sub-agents dispatched 2026-05-07T06:10Z:

| Stream | Agent | Scope | Key finding |
|--------|-------|-------|-------------|
| **A** | code-explorer | DnD root cause across PageGridLayout pages | Probe-race in `PageEditorLauncher` was real but not the primary cause — Playwright live-test revealed page-key mismatch (`'dashboard'` vs `'bsu-dashboard'`) was the actual root, then drag-handle-as-sibling vs ancestor was the second-stage bug |
| **B** | code-reviewer (Dev User Advocate persona) | Brutal UX critique of FB Phase 0 | 5 P1 frictions, 5 P2 polish, 3 strategic Q's — dev would expect column templates, dnd reorder, FK autocomplete, dimmed stub tabs, inline Zod feedback |
| **C** | general-purpose (web research) | SOTA benchmark — Supabase Studio, Hasura, Retool, Plasmic, Vercel v0, dbdiagram | Bar to clear is **Supabase Studio 3.0-tier polish**. **Codehouse has NO feature builder equivalent** → BSU FB is a net-new differentiator, not a parity catch-up |
| **D** | Explore | Cross-app applicability + throughput gap | Throughput missing from `targetApp` enum across 3 files (15-line fix). Recommendation: BSU primary + per-app deep-links (Option B) |

---

## 2. Root-cause: DnD silently broken (NOT a Phase-0 limitation — a real bug, now fixed)

Two compounding bugs, both shipped today as fixes:

### Bug 1 — page-key mismatch (BSU#355, merged)

`PageEditorLauncher.tsx` dispatched `bsu-open-page-editor` with `detail.page = 'dashboard'`. Every PageGridLayout in BSU uses a `bsu-` prefixed pageKey (e.g. `bsu-dashboard`). The listener in `usePageGridLayout.ts` checked `detail.page === pageKey` with strict equality — never matched. `setIsEditing(true)` never fired. Drag-handle div was never rendered.

**Fix:** Drop `detail.page` from the dispatched event. The listener has a fallback `if (!detail?.page || ...)` short-circuit that accepts on any route.

**Live evidence (Playwright):** pre-fix `document.querySelectorAll('.drag-handle').length === 0` after FAB click. Post-fix `handleCount: 2`.

### Bug 2 — drag-handle as sibling, not ancestor (bsuite#625 → @bsuite/page-builder@0.2.6 → BSU#356 consumer bump)

Even with `isEditing=true` and drag-handles mounted, `react-draggable@4`'s `matchesSelectorAndParentsTo(target, '.drag-handle', baseNode)` walks **up** the ancestor chain. The drag-handle div was rendered as a z-20 absolute sibling of card content — clicks on visible content (chips, buttons) had no `.drag-handle` ancestor → drag rejected.

**Fix:** Move `.drag-handle` to the outer ref'd container's className (when isEditing). Extend `cancel` selector to exclude all interactive descendants (button, input, textarea, select, etc.) so users can still click controls without triggering drag.

**Live evidence (Playwright):** post-fix `elemAtStartHasDragHandleAncestor: true` (was `false`). Real-user drag verification deferred to operator (Playwright synthetic events couldn't trigger react-draggable's gesture detection — test-harness limitation, not a real bug).

---

## 3. P1 frictions — must fix before Phase 1

### P1-1 — No column template strip (✅ shipped in BSU#359)

`addField()` creates a blank `field_N` of type `text`. To add a `tenant_id` the developer must perform 5 discrete interactions. Yet `entity-generator.ts:79-80` already hardcodes auto-emit of `created_at`/`updated_at` — proof the codebase encodes the canonical patterns.

**Fix shipped:** 3 chips above the Fields list — `+ tenant_id`, `+ owner_id`, `+ deleted_at` — each stamps the canonical pattern (FK, on-delete cascade, comment) with one click. Inline note explains audit columns are auto-emitted.

### P1-2 — Fields are unordered and non-reorderable (⏳ next PR)

Fields render as an unordered list. No drag handle, no move-up/down. Field order in the UI is field order in the SQL `CREATE TABLE`. Developer with 8 fields cannot rearrange without delete-and-recreate, losing all configuration.

**Recommendation:** Integrate `@dnd-kit/sortable` (already a BSuite dependency at ^10.0.0). Add `GripVertical` drag-handle as the first column in `FieldRow`. ~30 LOC delta. Use the [`sadmann7/sortable`](https://github.com/sadmann7/sortable) shadcn template for the canonical pattern.

### P1-3 — FK table free-text input with zero autocomplete (✅ shipped in BSU#359)

The Foreign-key-table input was a plain `<input type="text" placeholder="(none)">`. Developer must spell the exact table name. No dropdown, no validation.

**Fix shipped:** `<input list="fb-known-tables">` + `<datalist>` of 15 canonical BSuite parent tables. Smart defaults: `tenants`/`organisations` → FK col `id`; `profiles`/`auth.users` → FK col `user_id`. On-delete default flipped to `cascade`.

**Phase 1 upgrade:** query `information_schema.tables WHERE table_schema='public'` once on EntityPanel mount and use the result for the datalist. Live tenant tables instead of a hardcoded list.

### P1-4 — 6 of 8 tabs are dead ends with no visual differentiation (✅ shipped in BSU#359)

The numbered tabs (`1. Entity`, `2. Page`, ..., `8. Verification`) implied sequential completion but progression is temporal (across shipping phases). Active and stub tabs were visually indistinguishable until clicked.

**Fix shipped:** `LAYERS` array carries `{ live, phase }`. Stub tabs render at `opacity-60` with a Lock icon prefix and tooltip `Stub — ships in Phase N`. Live tabs (Entity, Export) at full opacity. `aria-label` updated for screen readers.

**Phase 1 alternative (deferred per operator decision):** remove stub tabs from primary nav entirely; replace with a single "Roadmap" button. Discussion point Q1 below.

### P1-5 — Zod validation errors silent during editing (⏳ next PR)

`EntityFieldSchema` enforces `/^[a-z_][a-z0-9_]*$/` on field names. Typing `MyField` shows no error in the UI. Errors only appear in the SQL preview pane via the `catch` block (`EntityPanel.tsx:82-87`), which may not be visible on stacked/mobile layouts.

**Recommendation:** add `aria-invalid` + per-field error text below each input.

```tsx
const nameError = EntityFieldSchema.shape.name.safeParse(field.name).error?.issues[0]?.message
// On the input:
aria-invalid={!!nameError}
className={cn(inputClass, nameError && 'border-destructive')}
// Below:
{nameError && <p className="text-xs text-destructive mt-0.5">{nameError}</p>}
```

---

## 4. P2 polish — should fix in Phase 0.5

### P2-1 — No undo/redo

`featureBuilderStore` has no history stack. `removeField()`, `removePolicy()`, `removeIndex()` are all irreversible.

**Recommendation:** wire `Cmd+Z` to an `undo()` action backed by a `past: FeatureDraft[]` stack (cap 20). Standard editing-surface expectation.

### P2-2 — No autosave indicator

Save is manual. Per-store comment "zero client-side storage (no localStorage / sessionStorage / cookies)" means a refresh mid-edit is total loss.

**Recommendation:** debounced autosave (30s after last edit) + persistent `Saved X ago` indicator near the feature name input.

### P2-3 — AI Generate dialog has no streaming, no cost estimate

`AiGenerateDialog.tsx` shows "Generating…" with a button spinner. No streaming partial output, no token/cost estimate pre-flight despite `AiGenerationSchema.costUsd`.

**Recommendation per Stream C:** migrate from `generate-then-render` to `streamObject` + `useObject` array mode. Vercel AI SDK 3.4+ supports this with `experimental_useObject` — only complete elements stream, no mid-render layout shifts. Add cost estimate line below the textarea derived from estimated token count.

### P2-4 — Preview pane renders raw JSON

`PreviewPane` does `JSON.stringify(draft, null, 2)`. 80+ lines of nested JSON for a 6-field entity.

**Recommendation:** show the SQL output (already computed in `EntityPanel`'s `useMemo`) or a human-readable entity card. Raw object graph is not actionable insight.

### P2-5 — Export dialog target repo is hardcoded free-text

`ExportDialog.tsx` defaults `useState('GaryOcean428/business-suite-unified')`. Every developer who is not the repo owner manually corrects this.

**Recommendation:** `<select>` populated from the 6 known BSuite repos (now including throughput per BSU#358).

---

## 5. Strategic UX direction questions for the operator

### Q1 — Is the 8-tab horizontal-step metaphor the right shell?

The numbered tabs imply sequential completion. Actual interaction is non-linear. A **node-graph canvas** where Entity → SQL → PR are live nodes and "Phase N" nodes are dimmed future nodes would communicate both workflow and roadmap status without the cognitive dissonance of clicking a live-looking tab.

### Q2 — Is "developer-only" access the right model for all 8 phases?

Currently gated to `platform_role IN ('developer', 'platform_admin')`. Before Phase 2's visual page canvas, decide: will tenant admins ever use FB to define their own data structures? That decision changes the UX vocabulary (SQL + "fields" + "indexes" vs "collections" + "properties" + "views") and must be resolved before Phase 2 work begins.

### Q3 — Is the Export-as-PR + manual-migration-apply path the right deploy story?

Currently the developer exports a draft PR with the migration file, then must manually `supabase migrations up` or apply via Supabase MCP. Two-step, split-tool flow not communicated in the UI. The Verification panel (Phase 8) is where the dev-branch-apply lands, but right now there's a gap. Should the Export dialog include a `[ ] Also apply to development branch` checkbox that wires into Supabase MCP `apply_migration` directly?

---

## 6. Cross-app applicability & throughput gap

### Confirmed: throughput missing from targetApp enum (✅ shipped in BSU#358)

Throughput (`ideas.crm7.app`, OAuth client `35f0db49-...`, GitHub repo `throughput`) is a peer BSuite app per CLAUDE.md but was missing from 3 hardcoded enum sites:

- `src/lib/feature-builder/types.ts` — `PortalTargetSchema` Zod enum
- `src/pages/Developer/FeatureBuilder/ExportDialog.tsx` — TS union + UI option
- `supabase/functions/feature-builder-export/index.ts` — Zod request validation

**Fix shipped (BSU#358):** all 3 sites updated to include `throughput`. Edge function redeploy via Supabase MCP pending.

### Recommendation: Option B — BSU primary + per-app deep-links

Sub-agent D analysis:

| Aspect | Coupling | Cross-app risk |
|--------|----------|----------------|
| Supabase tables | Platform-global, not tenant-scoped | ✅ SAFE |
| Edge functions | Deployed once on shared Supabase project | ✅ SAFE |
| UI | Zustand + shadcn, no BSU-specific service deps | ⚠️ minor adapter needed |
| Layout | Generic StubPanel + shadcn | ✅ SAFE |
| Portal target list | Designed for multi-target from day 1 | ✅ SAFE |

**Verdict:** FB is architecturally platform-neutral but should remain hosted in BSU as the platform-developer tool. Each app's admin should get a "Build custom feature" card that deep-links to BSU FB with `?targetApp=<app>&returnTo=<url>` prefilled. ~20–30 story points across 5 apps. Phase 6 Portal Layer work.

---

## 7. SOTA bar to clear

Per Stream C:

| Reference | What's good | Pattern to adopt |
|-----------|-------------|------------------|
| Supabase Studio 3.0 | Dual list+ER representation; AI as peer surface; one-click "apply to dev branch" | Visual Schema Designer tab (Phase 1.5+) |
| DrawSQL / dbdiagram | Spatial memory beats vertical lists for >5 fields | Lazy-loaded ER tab via `@xyflow/react` Database Schema Node |
| Hasura Console | Permissions tab as **role × operation matrix** per table | Replace `PermissionsPanel`'s stacked `PolicyRow` list with matrix (P2 polish) |
| Vercel v0 / Lovable / Bolt.new | AI streaming via `streamObject` array mode — no 30s blank modal | P2-3 above |
| Airtable | Field-type picker as cmdk popover with categorised types | Replace `+ Add field` button with cmdk popover (Phase 1) |

**Codehouse parity finding:** Codehouse / Workforce One (the most direct AU GTO competitor) has **no public evidence of a feature builder, custom-field UI, low-code admin, or schema editor**. Customisation is sales-led. → **BSU FB is a net-new differentiator, not a parity catch-up.** Bar to clear is Supabase-Studio-tier, not Codehouse parity.

---

## 8. Remaining work — Phase 0.5 PR sequence

| # | Stream | PR | Status |
|---|--------|-----|--------|
| 1 | DnD page-key fix | BSU#355 | ✅ Merged |
| 2 | DnD package fix (drag-handle ancestor) | bsuite#625 → @bsuite/page-builder@0.2.6 | ✅ Merged + published |
| 3 | BSU consumer bump to 0.2.6 | BSU#356 | ✅ Merged |
| 4 | Throughput-gap fix (3-file enum extension) | BSU#358 | ✅ Merged |
| 5 | UX P1: column templates + FK datalist + dimmed stub tabs | BSU#359 | ✅ Merged |
| 6 | This plan doc | bsuite (pending PR) | ⏳ In flight |
| 7 | UX P1-2: DnD field reorder via @dnd-kit/sortable | BSU (TBD) | ⏳ |
| 8 | UX P1-5: Inline Zod validation feedback | BSU (TBD) | ⏳ |
| 9 | Throughput edge-fn redeploy | Supabase MCP | ⏳ |
| 10 | UX P2-1..P2-5 | BSU (Phase 0.5 batch) | ⏳ |

---

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop:** §9.1 (output-equivalence — generated SQL same before/after refactors) + §9.2 (visual-equivalence — operator confirms each P1 lands as designed)
- **Equivalence target:** the Supabase Studio table editor for inspiration; reference screenshots saved in `docs/screenshots/2026-05-07-fb-ux/` (todo)
- **Cross red-team:** perplexity-computer to verify codehouse parity finding + dashboard/roadmap update
- **Skills to load:** `best-practice-research`, `feature-dev:code-reviewer`, `shadcn-ui`, `tailwind`, `master-orchestration`
- **Self-report on divergence:** mandatory; do not rationalise gaps

## Research trail (per CLAUDE.md gates A/B.1/B.2/C/D/E)

- **Gate A** — Context7 queried `/react-grid-layout/react-draggable`, `/clauderic/dnd-kit`. node_modules `.pnpm/react-draggable@4.5.0/build/cjs/DraggableCore.js` inspected for actual handle-matching logic.
- **Gate B.1** — Playwright live-tested production + Vercel preview before/after each fix. Pre-fix `document.querySelectorAll('.drag-handle').length === 0` was the smoking gun.
- **Gate B.2** — operator-driven manual drag-verify deferred (synthetic events couldn't trigger react-draggable's gesture detection — test-harness limitation).
- **Gate C** — `feature-dev:code-reviewer`, `feature-dev:code-explorer`, general-purpose with web research, and Explore each invoked explicitly.
- **Gate D** — re-inventoried skills + MCPs at each stage transition. Memory-synapse delegate not available; manual `qig-memory-api` writes used per the protocol.
- **Gate E** — initial code-trace diagnosis was honestly disclosed as wrong primary cause once Playwright revealed the real root. No retroactive "honest answer" — documented as research trail in PR descriptions.

---

*Adopted 2026-05-07 by operator directive. Authors: claude-code-local + perplexity-computer (codehouse parity addendum forthcoming via msg_9100+ inbox). Applies to Visual Feature Builder Phase 0 → Phase 1 transition planning across all 6 BSuite app targets.*
