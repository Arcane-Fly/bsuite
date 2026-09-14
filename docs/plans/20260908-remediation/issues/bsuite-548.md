# feat(page-builder): multi-select on canvas (Shift/Cmd-click + marquee + multi-drag)

https://github.com/GaryOcean428/bsuite/issues/548

Snapshot updatedAt: 2026-05-06T09:26:31Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · derived from Q1 research synthesis**
> Source: `/home/user/workspace/research/q1-builder-gaps.md`

## Mandatory before merge

Skills:
- `dnd-kit` (multi-drag, marquee selection)
- `framer-motion` (selection rect animation)
- `bsuite-brand-system`
- `verification-before-completion`

## Red-team requirements

1. **UX-DX agent** — keyboard `Shift+Click` and `Cmd/Ctrl+Click` work like every native OS file manager.
2. **Reliability agent** — multi-drag from one container to another preserves order.
3. **Performance agent** — marquee selection of 100 cards stays smooth.

## Problem

BSuite page-builder supports single-select only. Every 2026 builder supports multi-select on the canvas:
- [Webflow multi-select with Shift/Cmd](https://webflow.com/feature/visual-designer)
- [Framer multi-select + group](https://www.framer.com/learn/layers/)
- [Penpot marquee select](https://help.penpot.app/user-guide/)

## Required implementation

1. Selection state in Zustand: `selectedIds: string[]`.
2. `Shift+Click` adds to selection; `Cmd/Ctrl+Click` toggles.
3. Marquee tool: pointer-down on empty canvas → drag draws an SVG `<rect>` styled with `oklch(var(--ne-cyan) / 0.2)` fill; on release, all cards intersecting are selected.
4. Multi-drag: dnd-kit's `useDraggable` with a custom drag overlay rendering all selected cards offset by their original positions.
5. Bulk actions toolbar: Delete, Duplicate, Group, Save as Symbol — appears when `selectedIds.length > 1`.

## Acceptance criteria

- [ ] Shift/Cmd-click selection works as on macOS Finder
- [ ] Marquee selection works
- [ ] Multi-drag preserves relative positions
- [ ] Bulk delete is undoable
- [ ] Performance: marquee with 100 cards <16 ms/frame
- [ ] WCAG-compliant: keyboard-only multi-select via Shift+arrow keys

## Suggested team

Medium-heavy. Route to `@claude`:

> IMPORTANT @claude: please open a PR for review that addresses this issue. **Scope:** multi-select on `@bsuite/page-builder` canvas. **Files likely affected:** packages/page-builder/src/canvas/*, packages/page-builder/src/state/store.ts, packages/page-builder/src/components/Marquee.tsx (new), BulkActionsToolbar.tsx (new), tests. **Branch:** feat/page-builder-multi-select. **Base:** development. **Acceptance criteria:** above bullets + CI green + no downgrades + conventional commit format. **When done:** post the PR URL as a comment so this issue can be linked.

## Citations

- [Webflow visual designer (2026)](https://webflow.com/feature/visual-designer)
- [Framer layers panel (2026)](https://www.framer.com/learn/layers/)
- [Penpot user guide (2026)](https://help.penpot.app/user-guide/)
- [dnd-kit multiple drag](https://docs.dndkit.com/api-documentation/draggable)
- Internal: `/home/user/workspace/research/q1-builder-gaps.md` § "Drag/drop interaction primitives"
