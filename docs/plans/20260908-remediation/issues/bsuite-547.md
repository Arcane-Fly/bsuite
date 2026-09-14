# feat(page-builder): add Snap modifier + alignment-guide overlay (dnd-kit)

https://github.com/GaryOcean428/bsuite/issues/547

Snapshot updatedAt: 2026-05-06T09:26:27Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · derived from Q1 research synthesis**
> Source: `/home/user/workspace/research/q1-builder-gaps.md` (gap analysis vs Webflow, Framer, Builder.io, Plasmic, Penpot).
> Live dashboard: https://garyocean428.github.io/bsuite/dashboard/

## Mandatory before merge

This issue requires the following skills loaded by the implementing agent:
- `dnd-kit` (modifiers, sensors, activation constraints)
- `bsuite-brand-system` (D2C Neon Electric · OKLCH discipline)
- `framer-motion` (alignment-guide line animation)
- `verification-before-completion` + `qa-and-verification`

## Red-team requirements (rulebook §6)

1. **UX-DX agent** — keyboard-only users get the same snap behaviour (arrow keys move 8px on the same grid).
2. **Performance agent** — alignment-guide rendering must stay below 16 ms/frame at 60 FPS on a 50-card canvas.
3. **Reliability agent** — works under fast drag, multi-touch, trackpad inertial scroll.
4. **Quality agent** — conventional commits, no downgrades, no `TODO later`.

Do NOT close until: live deploy verified + frame-time profiling attached.

## Problem

`@bsuite/page-builder` has no snap modifier and no alignment-guide overlay. Every 2026 competitor ships both:
- [Webflow Designer ships smart-guides on element drag](https://webflow.com/feature/visual-designer)
- [Framer canvas shows pink alignment lines on layer drag/resize](https://www.framer.com/learn/layout/)
- [Builder.io Visual Editor shows blue alignment guides](https://www.builder.io/c/docs/visual-editor)

Without snap and alignment, BSuite cards drift off the 8px grid set by `--space-2` in `@bsuite/design-tokens`.

## Required implementation

1. Install `@dnd-kit/dom` + `@dnd-kit/abstract` (latest 2026 release) — these unlock the first-class [`Snap` modifier](https://dndkit.com/extend/modifiers).
2. Configure `Snap.configure({ size: { x: 8, y: 8 } })` and apply via `<DndContext modifiers={[Snap]}>` in the page-builder canvas (`packages/page-builder/src/canvas/Canvas.tsx`).
3. Build `<AlignmentGuides />` SVG overlay sibling. On drag/resize, compute proximity to siblings using `inRange()` (within 4px). Render edge-to-edge guide lines in `oklch(var(--ne-cyan) / 0.6)` using a 1px stroke.
4. `PointerSensor` activation constraint: `{ distance: 8 }` so we don't fight the resize handle work in #539.
5. Persist last snap state to Supabase `page_layouts.snap_enabled` (default true).

## Acceptance criteria

- [ ] `pnpm --filter @bsuite/page-builder typecheck` passes
- [ ] `pnpm --filter @bsuite/page-builder test` passes (new vitest for `inRange()` proximity logic)
- [ ] Card snaps to 8px grid on drag end
- [ ] Alignment guides appear when card edge within 4px of any sibling
- [ ] Guides hidden on drag end
- [ ] Keyboard arrow-key drag still snaps to 8px
- [ ] Frame time <16 ms with 50 cards on canvas (profiled)
- [ ] WCAG-compliant in light + dark — guide lines visible against both `--background` values
- [ ] No regression to existing dnd-kit handlers in any consumer (BSU, crm7, conduit, R80.3, throughput)

## Suggested team

Medium scope, single-package. Route to `@claude` per the routing matrix:

> IMPORTANT @claude: please open a PR for review that addresses this issue. **Scope:** add Snap modifier + AlignmentGuides overlay to `@bsuite/page-builder`. **Files likely affected:** packages/page-builder/src/canvas/*, packages/page-builder/src/modifiers/snap.ts (new), packages/page-builder/src/components/AlignmentGuides.tsx (new), packages/page-builder/src/__tests__/. **Branch:** fix/page-builder-snap-alignment-guides. **Base:** development. **Acceptance criteria:** above bullets + CI green + no downgrades + conventional commit format. **When done:** post the PR URL as a comment so this issue can be linked.

## Citations

- [dnd-kit modifiers (2026)](https://dndkit.com/extend/modifiers) — `Snap.configure` API
- [Webflow visual designer feature page](https://webflow.com/feature/visual-designer)
- [Framer layout / canvas docs (2026)](https://www.framer.com/learn/layout/)
- [Builder.io Visual Editor (2026)](https://www.builder.io/c/docs/visual-editor)
- Internal: `/home/user/workspace/research/q1-builder-gaps.md` § "Drag/drop interaction primitives"
