> **SOURCE:** Ported from `/home/braden/.windsurf/plans/dashboard-grid-fix-07fa37.md` on 2026-03-16. Original Windsurf plan file retained at source location.

---

# Dashboard Layout System — Free Canvas + Responsive Reflow + Configurable Columns

Replaces the broken `verticalCompactor`-only dashboard with a dual-mode layout engine: free canvas in edit mode, responsive reflow in view mode, on-demand compact with user-configurable column count.

---

## Behaviour Summary

| Mode | Compactor | Columns | Drag |
|------|-----------|---------|------|
| **View** | `verticalCompactor` (auto-reflow on resize/breakpoint) | Responsive breakpoints (12→10→6→4→2) | Off |
| **Edit — free canvas** | `noCompactor` + `preventCollision: true` | User-set `layoutCols` (default 12, range 1–24) | On — any direction, bounded to canvas |
| **Edit — compact action** | `verticalCompactor` run once on button click, result saved | Same `layoutCols` | Stays on |

---

## Phase 1 — Core Grid Fix (Dashboard.tsx only)

### 1a. Compactor switching
```tsx
// noCompactor import already available in react-grid-layout
compactor={isEditing ? { ...noCompactor, preventCollision: true } : verticalCompactor}
```
- Edit mode: free 2D placement, no auto-snap, no overlap
- View mode: vertical compaction fires on every resize/breakpoint change (existing responsive reflow)

### 1b. Drag config — bounded + cancel
```tsx
dragConfig={{
  enabled: isEditing,
  handle: '.drag-handle',
  bounded: true,                          // can't drag outside canvas → can't reach nav
  cancel: '.react-resizable-handle',      // mousedown on resize corner ≠ drag start
}}
```

### 1c. User-configurable columns
Add `layoutCols` to dashboard state (stored in user preference alongside layout):
```tsx
const [layoutCols, setLayoutCols] = useState<number>(savedLayoutCols ?? 12);

// In view mode: use standard responsive breakpoints
// In edit mode: lock all breakpoints to layoutCols so dragging reflects what user set
const activeCols = isEditing
  ? { lg: layoutCols, md: layoutCols, sm: layoutCols, xs: layoutCols, xxs: layoutCols }
  : { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
```

### 1d. On-demand compact
Add to edit toolbar — runs `verticalCompactor` over the current layout and calls `setDashboardLayout`:
```tsx
function handleCompact() {
  const compacted = verticalCompactor.compact(currentLayouts.lg, layoutCols);
  const newLayouts = { ...currentLayouts, lg: compacted };
  setDashboardLayout(newLayouts);
}
```

---

## Phase 2 — Edit Mode Toolbar Controls (Dashboard.tsx)

Add to the existing edit toolbar (alongside existing Save/Cancel buttons):

| Control | Type | Range | Default |
|---------|------|-------|---------|
| Column count | `<input type="range">` + numeric label | 1 – 24 | 12 |
| Column presets | Button row | 1 · 2 · 3 · 4 · 6 · 12 · "Custom" | — |
| Compact Layout | Button | — | — |

**Column preset chips** — clicking one sets `layoutCols` and immediately compact-runs (so the layout snaps cleanly):
- `1` — single column stacked list
- `2`, `3`, `4`, `6` — common split layouts
- `12` — full grid (current default)
- Slider for custom (1–24)

**Compact button** — runs `verticalCompactor` on the current free-canvas layout without changing column count. Respects current `layoutCols` so it packs to top within whatever column structure is set.

---

## Phase 3 — Persist layoutCols

`layoutCols` should be saved alongside the layout in `useScopedPreference` (same key, same mechanism already used for `dashboardLayout`). No new infrastructure needed — just add it to the saved preference payload.

---

## Phase 4 — React 19 Best Practices Guide Update

**File:** `crm7/docs/guides/20260226-best-practices-guide-v1.00A.md`

Update to React 19 patterns:
- Remove: `React 18 Best Practices` heading → `React 19 Best Practices`
- Add: `use()` hook for promises and context (replaces some `useEffect` data fetching)
- Add: `useActionState` / `useFormStatus` / `useOptimistic` — ships with React 19, no extra library
- Add: ref-as-prop — no longer need `forwardRef`
- Add: `<Context>` instead of `<Context.Provider>`
- Update: `useCallback` guidance — many cases no longer needed (compiler handles)
- Update: Server Components note — now production-ready in Next.js (relevant for conduit)
- Note: React 19 is already in `package.json` (`react@^19.0.0`) — this is a doc catch-up

---

## Phase 5 — Mermaid UI Builder Alignment (design note, no code today)

The dashboard canvas in edit mode IS the first surface of the mermaid-ui-builder Template Library (Phase 3). Decisions made here carry forward:

- `layoutCols` + free canvas → the page builder canvas must match this model
- Widget definitions (`widgetDefinitions` in Dashboard.tsx) → will become the Template Library component registry
- Layout persistence via `useScopedPreference` → will be replaced by `pages` + `page_revisions` Supabase tables when the builder expands to org/platform editing scope
- Access control pattern (edit button gated to `isDeveloper` or role) → carries forward to the full builder

No code changes in this phase — this is an alignment note so the dashboard work doesn't contradict the broader builder direction.

---

## Files Changed

| File | Changes |
|------|---------|
| `crm7/src/pages/Dashboard.tsx` | compactor switch, drag config, layoutCols state, activeCols, compact handler, toolbar controls |
| `crm7/docs/guides/20260226-best-practices-guide-v1.00A.md` | React 18 → React 19 section rewrite |

---

## What This Does NOT Change

- `DEFAULT_LAYOUTS` — unchanged (will render correctly with new compactor on first load)
- `react-grid-layout-overrides.css` — unchanged
- Widget drag handle div (`absolute inset-0 z-20`) — already correct, no change
- Saved layouts in user preferences — existing saved layouts continue to work; `noCompactor` just doesn't re-compact them
- Nav sidebar — bounded canvas prevents cards ever reaching it
