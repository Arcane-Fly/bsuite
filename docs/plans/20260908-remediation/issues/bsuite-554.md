# feat(page-builder): add breakpoint switcher + per-breakpoint style cascade

https://github.com/GaryOcean428/bsuite/issues/554

Snapshot updatedAt: 2026-08-24T03:25:58Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · derived from Q1 research synthesis**
> Source: `/home/user/workspace/research/q1-builder-gaps.md` (gap analysis vs Webflow, Framer, Builder.io, Plasmic, Penpot).

## Mandatory before merge

This issue requires the following skills loaded by the implementing agent:
- `bsuite-brand-system`
- `zustand` (page-builder global state)
- `tailwind` (Tailwind v4 responsive variants)
- `tanstack-query` (Supabase persistence)
- `verification-before-completion`

## Red-team requirements (rulebook §6)

1. **UX-DX agent** — switching breakpoint must not lose unsaved overrides; "reset to base" works at every level.
2. **Performance agent** — switching breakpoint <100 ms.
3. **Reliability agent** — cascade resolves correctly when override is partially set.
4. **Quality agent** — no `any` types in cascade resolver.

## Problem

`@bsuite/page-builder` has no breakpoint switcher and no per-breakpoint style cascade. Every 2026 competitor ships breakpoint inheritance:
- [Framer breakpoint overrides](https://www.framer.com/dictionary/breakpoint-overrides) — overrides cascade desktop → tablet → mobile, with visual diff.
- [Webflow class-based breakpoints](https://webflow.com/feature/visual-designer) — base class + breakpoint variants.
- [Builder.io responsive editing](https://www.builder.io/c/docs/responsive-editing)

Without this, BSuite designers can't customize a card differently on mobile without forking the component.

## Required implementation

1. Add `currentBreakpoint: 'desktop' | 'tablet' | 'mobile'` to the page-builder Zustand store (`packages/page-builder/src/state/store.ts`).
2. `<BreakpointSwitcher />` component in the editor toolbar (3-segmented control). On switch, resize the editor iframe to `1280 / 768 / 375`.
3. Schema change: `page_layouts.styles` becomes `{ desktop: StyleObj, tablet?: Partial<StyleObj>, mobile?: Partial<StyleObj> }` (Supabase JSONB). Migration adds the new shape with the existing flat object as `desktop`.
4. Cascade resolver `resolveStyles(layout, breakpoint)` in `packages/page-builder/src/utils/cascade.ts`:
   - mobile = `{ ...desktop, ...tablet, ...mobile }`
   - Overridden properties tracked separately so the UI can show them as blue with a "Reset" button.
5. Reset button on each style row: removes the override at the current breakpoint, falling back to the parent.

## Acceptance criteria

- [ ] BreakpointSwitcher renders 3 segments (Desktop/Tablet/Mobile) with Tailwind v4 responsive icons
- [ ] iframe resizes on switch
- [ ] Style edits at non-desktop breakpoint create override (does not mutate desktop)
- [ ] Overridden values render blue with Reset button
- [ ] Reset button removes the override
- [ ] Cascade resolver has unit tests for every fallthrough case
- [ ] Migration is reversible (down() included)
- [ ] No regression to existing single-breakpoint layouts (auto-migrated to `{ desktop: <existing> }`)
- [ ] WCAG-compliant in light + dark

## Suggested team

Heavy scope (schema migration + state + UI). Route to `bsuite_heavy_work_queue`. Label `needs-team`.

## Citations

- [Framer breakpoint overrides (2026)](https://www.framer.com/dictionary/breakpoint-overrides)
- [Builder.io responsive editing (2026)](https://www.builder.io/c/docs/responsive-editing)
- [Webflow breakpoints (2026)](https://help.webflow.com/hc/en-us/articles/33961326241043-Breakpoints)
- [Tailwind v4 responsive design](https://tailwindcss.com/docs/responsive-design)
- Internal: `/home/user/workspace/research/q1-builder-gaps.md` § "Layout system / breakpoint cascade"

