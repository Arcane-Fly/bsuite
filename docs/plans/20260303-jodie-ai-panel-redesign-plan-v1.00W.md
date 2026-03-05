# Jodie AI Panel Redesign — Reflow, Glass UI, File Upload, Org Fix

Redesign the CRM7 Jodie AI assistant from an overlay Sheet to a responsive side panel with glass morphism, file upload, send/stop buttons, and fix the missing organization record.

---

## Problems Identified

1. **No page reflow** — `AISheet` uses Radix `Sheet` (portal overlay + `bg-black/80` backdrop), blocking main UI entirely when open
2. **No file upload** — `AIInputArea` has textarea + send only, no attachment capability
3. **Archaic textarea** — Manual scrollHeight with `max-h-[96px]`, visible scrollbar
4. **No stop button** — Can send but can't cancel a streaming response
5. **Dated UI** — No glass morphism, no modern styling, hard-coded pixel sizes
6. **"No Organization Found"** — User has no `user_tenants` record in Supabase; `getHierarchy()` returns null

---

## Plan

### Step 1: Replace Sheet overlay with reflow side panel

**Files:** `AISheet.tsx`, `MainLayout.tsx`, `AIAssistant.tsx`

- Remove Radix `Sheet` overlay approach
- Convert `AISheet` to a CSS-driven side panel (fixed right, `w-[35%]` on desktop, full-width drawer on mobile)
- In `MainLayout`, add a `data-ai-open` attribute or CSS class that shrinks `<main>` when AI panel is open:
  ```
  main { transition: margin-right 300ms ease; }
  main[data-ai-open="true"] { margin-right: 35%; }
  ```
- On mobile (`< lg`): keep full-screen drawer behavior with slide-in animation
- Remove the dark overlay entirely — both panels interactive simultaneously
- Use `framer-motion` or CSS transitions for smooth open/close

### Step 2: Glass morphism + modern styling

**Files:** `AISheet.tsx` (now `AISidePanel.tsx`), `AIHeader.tsx`, `AIInputArea.tsx`, `AIQuickActions.tsx`

- Panel background: `bg-background/80 backdrop-blur-xl border-l border-border/50`
- Header: subtle glass header with avatar, name, usage badge
- Quick actions: pill buttons with `bg-background/50 backdrop-blur-sm` hover states
- Message area: clean, no extra chrome
- Follow D2C Neon Electric theme (Electric Blue `#2563eb` accents, deep navy dark mode)

### Step 3: Redesign input area with file upload + send/stop

**Files:** `AIInputArea.tsx`

- **Auto-resize textarea**: Use `useAutoResizeTextarea` hook (inspired by 21st Magic MCP pattern) — no visible scrollbar, `overflow: hidden`, grows from 1 line to max 6 lines
- **File upload**: Paperclip button → hidden `<input type="file">` with accepted types (images, PDFs, docs)
- **Send button**: Always visible, disabled when empty, uses `ArrowUp` icon in a rounded button
- **Stop button**: When `isLoading`, replace send with a `Square` (stop) icon that calls `chat.stop()`
- **Layout**: Glass container `bg-background/60 backdrop-blur-md`, flexbox row with attachment + textarea + send
- **Keyboard**: Enter to send, Shift+Enter for newline (existing behavior)

### Step 4: Wire stop functionality

**Files:** `useAIChat.ts`, `AIAssistant.tsx`, `AIInputArea.tsx`

- Expose `stop` from `useChat()` in `useAIChat` return value
- Pass `onStop` callback to `AIInputArea`
- When streaming (`isLoading`), show stop button instead of send

### Step 5: Fix organization — seed user_tenants record

**Approach:** SQL via Supabase MCP

- Check if user has a `user_tenants` record
- If not, create a tenant (org) and link the user as `owner`
- This is a data issue, not a code issue — the organization page code is correct

### Step 6: Verify build + commit

- `pnpm typecheck` in CRM7
- Visual test: AI panel opens alongside main content, both interactive
- File upload button renders (backend upload handler is future work)
- Send/stop buttons functional
- Commit to `development`, merge to `main`

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/ai/AISheet.tsx` | Replace Sheet overlay → CSS side panel with glass styling |
| `src/components/ai/AIInputArea.tsx` | Full redesign: auto-resize, file upload, send/stop, glass |
| `src/components/ai/AIAssistant.tsx` | Wire stop callback, update panel component ref |
| `src/components/ai/AIHeader.tsx` | Glass morphism styling |
| `src/components/ai/AIQuickActions.tsx` | Glass pill button styling |
| `src/layouts/MainLayout.tsx` | Add reflow margin when AI panel open |
| `src/hooks/useAIChat.ts` | Expose `stop` function |
| Supabase | Seed user's org + user_tenants record |

## Not in scope

- File upload backend (Supabase Storage integration) — button renders but shows "coming soon" toast
- Voice input
- Message history persistence across sessions
