> **SOURCE:** Ported from `/home/braden/.windsurf/plans/crm7-ui-fix-c6b71e.md` on 2026-03-16. Original Windsurf plan file retained at source location.

---

# CRM7 Dashboard & Sidebar UI Fix — Full Scope

Fix six confirmed display/interaction bugs in CRM7's dashboard and sidebar, implement the B1 bento grid, create the `ai_sessions`/`ai_messages` Supabase tables, and fix inaccessible `DialogContent` titles.

---

## Pre-flight Discovery

| Item | Status | Notes |
|------|--------|-------|
| B2 — Jodie Meteors + TypingAnimation | ✅ **Already done** | `AIMessageList.tsx` already imports and uses both |
| B3 — Auth ShineBorder | ✅ **Already done** | `AuthShell.tsx` `AuthCard` already uses `ShineBorder` |
| `formatters.compact` B/T tiers | ❌ Missing | Only `M` tier exists — `$200T` displays as `$200000001.4M` |
| Hero signal cards clickable | ❌ Missing | `MagicCard` with `cursor-default`, no `Link` |
| NumberTicker tone colour | ❌ Missing | Hardcoded `text-black dark:text-white` overrides parent tone |
| Sidebar D2C token mapping | ❌ Missing | `--sidebar-accent` unmapped, falls back to shadcn grey |
| DND-kit `KeyboardSensor` | ❌ Missing | Only `PointerSensor` — keyboard drag inaccessible |
| Hero value layout shift | ❌ Missing | No min-height on value container |
| B1 Bento grid + glow | ❌ Missing | Equal 4-col panels, no accent glow per spec |
| `ai_sessions`/`ai_messages` tables | ❌ Missing | Sync service references Supabase tables that don't exist → 400 |
| `DialogContent` missing title | ❌ Missing | Several dialogs lack `aria-labelledby` / visually hidden title |
| Bad DB data (opp values) | ⚠️ Display only | Formatter B/T fix renders this correctly; no DB migration needed |

---

## Steps

### Step 1 — `formatters.compact` — B and T tiers
**File:** `crm7/src/lib/formatters.ts`

Add tiers above M:
```
≥ 1_000_000_000_000 → T   ($1.2T)
≥ 1_000_000_000     → B   ($4.5B)
≥ 1_000_000         → M   ($695M)
≥ 1_000             → K   ($695K)
```

### Step 2 — Hero stat signals → clickable Links
**File:** `crm7/src/pages/Dashboard.tsx`

- Wrap each hero signal `MagicCard` in a `<Link>`:
  - Pipeline → `/pipeline`
  - Follow-ups → `/tasks`
  - Conversion → `/analytics`
- Remove `cursor-default`; add `hover:-translate-y-0.5 transition-transform`.

### Step 3 — NumberTicker colour inheritance
**File:** `crm7/src/components/magicui/number-ticker.tsx`

- Remove `text-black dark:text-white` from the base className.
- Replace with `text-inherit` so parent `style={{ color: item.tone }}` propagates.

### Step 4 — Sidebar D2C token mapping
**Files:** `crm7/src/styles/theme.css`

Add in `:root` and `.dark` blocks:
```css
--sidebar-background: var(--bg-shell-sidebar);
--sidebar-foreground: var(--text-primary);
--sidebar-accent: var(--bg-shell-accent);
--sidebar-accent-foreground: var(--accent-primary);
--sidebar-border: var(--border-shell);
--sidebar-muted-foreground: var(--text-muted);
```

### Step 5 — DND-kit keyboard accessibility
**File:** `crm7/src/components/platform/DashboardPageEditorDrawer.tsx`

- Import `KeyboardSensor` from `@dnd-kit/core` and `sortableKeyboardCoordinates` from `@dnd-kit/sortable`.
- Add `useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })` to `useSensors`.
- Add `aria-label="Drag to reorder"` to each `GripVertical` button.
- Add `announcements` prop to each `DndContext` for screen-reader live regions.

### Step 6 — Hero value layout shift
**File:** `crm7/src/pages/Dashboard.tsx`

- Add `min-h-[2.25rem]` to the signal value container `<p>` so height is stable during spring animation.

### Step 7 — B1 Bento grid + accent glow
**File:** `crm7/src/pages/Dashboard.tsx`

Per spec §2:
- First row: Quick Actions (span-4) · Comm Center (span-4) · Pipeline Overview (span-4)
- Second row: Recent Activity (span-7, tall) · stacked panels: Financial + Field (span-5)
- Panel border shadow: `0 0 0 1px var(--app-accent-glow), 0 4px 24px var(--app-primary-glow)` (dark) / `0 1px 3px rgba(37,99,235,0.08), 0 4px 16px rgba(37,99,235,0.05)` (light)
- Remove the existing equal-column `gap-5` grid; use the `bento-grid.tsx` component that's already installed.

### Step 8 — `ai_sessions` + `ai_messages` Supabase migration
**File:** new `crm7/supabase/migrations/20260312000000_create_ai_sessions_messages.sql`

Create the two tables that `sync-service.ts` tries to sync to. Columns match the SQLite schema in `sqlite-db.ts`:
- `ai_sessions`: id, tenant_id, user_id, name, is_active, message_count, last_message_at, metadata, sync_status, last_synced_at, created_at, updated_at + RLS
- `ai_messages`: id, session_id, tenant_id, user_id, role, content, tool_invocations, token_count, sequence_num, sync_status, created_at, updated_at + RLS + FK → ai_sessions

Apply via `mcp8_apply_migration`.

### Step 9 — `DialogContent` accessible titles
**Grep target:** all `<DialogContent>` usages missing a `<DialogTitle>` (or `VisuallyHidden` wrapper).

Fix pattern:
```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>...</DialogTitle>        {/* or VisuallyHidden if title is decorative */}
  </DialogHeader>
```

Priority: `DashboardPageEditorDrawer.tsx` drawer + any dialogs in `Dashboard.tsx`.

---

## Files Changed

| File | Change |
|------|--------|
| `crm7/src/lib/formatters.ts` | Add B + T tiers |
| `crm7/src/components/magicui/number-ticker.tsx` | `text-inherit` |
| `crm7/src/pages/Dashboard.tsx` | Hero links, layout shift, bento grid |
| `crm7/src/styles/theme.css` | `--sidebar-accent/*` D2C mappings |
| `crm7/src/components/platform/DashboardPageEditorDrawer.tsx` | KeyboardSensor + aria labels + dialog titles |
| `crm7/supabase/migrations/20260312000000_create_ai_sessions_messages.sql` | New — ai_sessions + ai_messages tables |

---

## Verification

- `pnpm typecheck` — 0 errors
- `formatters.compact(200_000_000_000_000)` → `$200T`
- Pipeline signal card navigates to `/pipeline`
- Tone colours render correctly on hero signals
- Sidebar item hover uses blue tint, not grey
- DND tiles keyboard-accessible (Tab → Space to drag)
- No `ai_sessions`/`ai_messages` 400 errors on sync
- All `DialogContent` have accessible titles
