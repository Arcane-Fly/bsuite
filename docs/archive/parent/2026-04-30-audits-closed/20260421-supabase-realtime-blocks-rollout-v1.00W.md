# Supabase Realtime Blocks — rollout

**Status:** W (Working — scope + contracts defined, implementation per-app)
**Scope:** crm7, conduit (cross-repo)
**Date:** 2026-04-21
**Plan reference:** [Part G.3 of the world-class audit](/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md)

## Why

Supabase UI ships three production-grade realtime blocks in 2026. They
replace the ad-hoc WebSocket code each team would otherwise hand-roll,
and they compose cleanly with TanStack Query + shadcn primitives that
CRM7 and Conduit already use. All three backed by the same Supabase
Realtime channel — no extra infrastructure.

## Block map

| Block | Target app | Purpose | Install file |
|-------|-----------|---------|--------------|
| `realtime-chat` | CRM7 | Internal messaging thread in the right sidebar | `src/components/realtime/chat.tsx` |
| `realtime-cursor` | Conduit | Peer cursor trails on the pipeline view | `src/components/realtime/cursor.tsx` |
| `realtime-monaco` | CRM7 | Collaborative editor in the document manager | `src/components/realtime/monaco.tsx` |

Conduit (Next.js 16 App Router) uses the server-components-friendly
variant; CRM7 (Vite + React) uses the SPA variant. The block source
differs but the contracts (channel naming, presence tracking,
broadcast payload shape) are identical.

## Install commands (per target app)

Supabase UI blocks ship through the shadcn/ui registry. Each target app
needs:

1. A `components.json` at its root (shadcn/ui config). CRM7 already has
   this; Conduit needs one.
2. The realtime block fetched from the Supabase UI registry.

```bash
# CRM7 (Vite + React)
cd crm7
npx shadcn@latest add https://supabase.com/ui/r/realtime-chat-react
npx shadcn@latest add https://supabase.com/ui/r/realtime-monaco-react

# Conduit (Next.js 16)
cd conduit
# Bootstrap shadcn if not present
npx shadcn@latest init
npx shadcn@latest add https://supabase.com/ui/r/realtime-cursor-nextjs
```

Registry URLs are pinned to the `r/` path per Supabase UI convention —
these auto-resolve to the correct Vite/Next variant based on the target's
`components.json`.

Commit the generated files 1:1. The blocks are treated as owned source,
not vendored dependencies — same model as shadcn primitives.

## Feature flags

Each block ships behind its own flag so we can stage rollout and kill
quickly if a channel is noisy:

| Flag | Default | Scope |
|------|---------|-------|
| `VITE_REALTIME_CHAT_ENABLED` | `false` | CRM7 |
| `VITE_REALTIME_CURSORS_ENABLED` | `false` | Conduit |
| `VITE_REALTIME_MONACO_ENABLED` | `false` | CRM7 |

Read once at boot; do not re-evaluate per-render. Remove the flag + the
fallback branch after 14 days of green telemetry in prod.

## Database contract

No schema changes for `realtime-chat` or `realtime-cursor` — both use
broadcast-only channels (payload never persists). `realtime-monaco`
needs a persistence table for the document content:

```sql
-- supabase/migrations/YYYYMMDD_realtime_monaco_docs.sql
create table if not exists realtime_monaco_docs (
  id text primary key,
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table realtime_monaco_docs enable row level security;
create policy rm_docs_select on realtime_monaco_docs
  for select using (auth.role() = 'authenticated');
create policy rm_docs_update on realtime_monaco_docs
  for update using (auth.uid() = updated_by)
  with check (auth.uid() = updated_by);
create policy rm_docs_insert on realtime_monaco_docs
  for insert with check (auth.uid() = updated_by);
```

Ship via `supabase migration new realtime_monaco_docs` per the BSU
migration discipline — don't hand-craft the filename.

## Channel naming conventions

Consistent naming lets us observe traffic patterns across apps:

- Chat: `chat:tenant_<uuid>` — scoped to tenant, all tenant members
  have presence
- Cursors: `cursor:pipeline_<pipeline_id>` — scoped to a Conduit
  pipeline; presence = viewing users
- Monaco: `doc:<doc_id>` — scoped to a single document

RLS on broadcast tables is enforced in the `CREATE PUBLICATION`
statement — Supabase defaults to `realtime.messages` which respects
`auth.uid()`.

## Presence payload shape

All three blocks converge on a shared presence payload:

```typescript
type PresencePayload = {
  user_id: string          // auth.uid()
  email: string            // for avatar fallback
  display_name: string     // tenant's profile_row.display_name
  avatar_url?: string      // may be undefined
  cursor?: { x: number; y: number }   // realtime-cursor only
  selection?: { from: number; to: number }  // realtime-monaco only
}
```

Consistency means the avatar strip in one block looks identical to the
avatar strip in another — they all read from the same tenant profile
source of truth.

## Red-team gates

Per-block, before flipping the flag in prod:

1. **RLS bypass** — attempt to subscribe to another tenant's channel.
   Must reject at the RLS layer (Supabase Realtime enforces via JWT).
2. **Payload injection** — broadcast a malformed payload. Receiver must
   skip (schema-validated client-side via zod).
3. **Reconnect flood** — kill WiFi, reconnect. Presence cleanup within
   60s (Supabase Realtime's default presence_interval).
4. **Tab-close cleanup** — close tab, peer must see user leave within
   one heartbeat interval.
5. **PII leak** — presence payload never includes password, token, or
   internal IDs beyond auth.uid().
6. **CSP delta** — each app's `vercel.json` CSP `connect-src` must
   include `wss://<ref>.supabase.co/realtime/*`. Currently allowed via
   the blanket `https://*.supabase.co` rule; confirm `wss:*.supabase.co`
   also allowed.

## Smoke tests (Playwright multi-tab)

Covered in `tests/e2e/realtime.spec.ts` per app (new file):

- **Chat** — open 2 tabs in same tenant; type in tab 1; message appears
  in tab 2 within 1s. Reconnect tab 2; latest-N messages restored.
- **Cursors** — open 2 tabs on same pipeline; move mouse in tab 1;
  cursor trail visible in tab 2. Close tab 1; trail fades within 60s.
- **Monaco** — open 2 tabs on same document; type in tab 1; text
  appears in tab 2 within 100ms. Concurrent edits don't corrupt.

Multi-tab is `context.newPage()` within a single Playwright context.

## Rollback plan

Each block has an isolated rollback:

- Flag OFF → component renders null / fallback, no Realtime connection
  established. Users don't notice.
- Network-level kill: in Supabase dashboard, pause the specific channel
  via `realtime.disable_channel('chat:tenant_<uuid>')`. Two-minute
  revert.
- Schema revert: `realtime_monaco_docs` is additive; a rollback
  migration `drop table if exists realtime_monaco_docs cascade;` ships
  in the same PR.

## Observability

Wire to existing BSuite dashboards (per plan H.10):

| Signal | Source | Alert threshold |
|--------|--------|-----------------|
| Realtime connect 4xx | Supabase logs | any spike |
| Channel subscribe errors | Sentry | >5 / min |
| Presence desync (local ≠ server count) | client-emitted metric | >2 / hr per tenant |
| Monaco conflict-resolution failures | client log → Vercel runtime logs | >1 / min |

## What's NOT in this commit

- Install commands not yet run. Each target app gets its own PR per
  block so the blast radius is contained.
- No UI placement decisions. Chat lives in "the right sidebar" but
  which sidebar, and how does it compose with the tenant switcher?
  Answered per-app via a short UX pass with the user before install.

## Implementation order (recommended)

1. `realtime-chat` in CRM7 — smallest blast radius, highest iteration
   value. One tenant, one channel, one unread-badge.
2. `realtime-cursor` in Conduit — pipeline page is a single route so
   toggling the flag is isolated to that URL.
3. `realtime-monaco` in CRM7 — biggest UX complexity, do last when the
   chat integration has stabilized channel naming + presence patterns.

Expected: 1 chat-block PR + 1 cursor PR + 1 monaco PR + 1 schema PR,
one per week, across both repos. All flagged OFF on merge.

## References

- [Supabase UI realtime blocks](https://supabase.com/ui/docs/blocks/realtime-chat)
- [Realtime channel scoping](https://supabase.com/docs/guides/realtime/concepts#channels)
- [Presence intervals](https://supabase.com/docs/guides/realtime/presence)
- Audit plan: [Part G.3](/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md)
