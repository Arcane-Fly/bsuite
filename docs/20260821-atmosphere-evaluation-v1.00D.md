---
kind: decision
authority: engineering
owner: datum-lane
evidence:
  - scripts/check-shared-package-reach.mjs
---

# Atmosphere evaluated against @bsuite/data-grid and the report engine

> ## ⚠ CORRECTED 2026-08-25 — THIS DOCUMENT READ THE WRONG REPOSITORY
>
> It evaluated **`Atmosphere/atmosphere`**, a JVM async/WebSocket framework. The
> repository that matters is **`GaryOcean428/atmosphere`** — the operator's own,
> TypeScript, described as *"A Free & Self-hostable Airtable Alternative"*, and pushed
> two days before this was written.
>
> That repository is a **rebranded NocoDB** (nine packages, nine matches, NocoDB's
> tagline verbatim) still carrying **`"license": "Sustainable Use License"`** in its root
> `package.json` — and the ruling that this licence bars BSuite use was recorded on
> **2026-08-08, thirteen days before this document.**
>
> The verdict below — *do not adopt* — happens to be right, and its reasoning does not
> reach the repository in question. See
> **`docs/20260825-atmosphere-is-nocodb-and-the-licence-already-ruled-v1.00A.md`**.
>
> Findings about **our own report engine** in this document were measured against our
> code and remain accurate.

**Date:** 2026-08-21 · **Status:** D (Draft) · **Author:** Datum
**Subject:** https://github.com/Atmosphere/atmosphere — can it benefit data-grid or reports?
**Verdict:** No. Wrong runtime. But the question surfaced a real gap, and the capability
that would close it is already installed and unused.

---

## 1. What Atmosphere actually is

Atmosphere/atmosphere (3.8k stars, active — last push 2026-08-20) describes itself as a
"portable AI agent runtime for the JVM". Verified from the README and the npm artifacts:

| | |
|---|---|
| Runtime | **Java 21+ on the JVM** |
| Hosts | Spring Boot 4.0.6 / 3.5, Quarkus 3.36+, or any servlet container (Tomcat, Jetty, Netty, Undertow) |
| Transports | WebSocket, SSE, long-polling, gRPC through one broadcaster pipeline; WebTransport/HTTP3 optional |
| Agent layer | 12 pluggable adapters — Spring AI, LangChain4j, Google ADK, Anthropic native, OpenAI-compatible |
| Protocols | MCP, A2A, AG-UI, plus Slack/Telegram/Discord/WhatsApp |
| Governance | policy admission, `@AgentScope`, plan-and-verify, PII redaction, cost ceilings, durable HITL approvals, admin kill switches |
| Client | `atmosphere.js` on npm (5.0.42) — `useStreaming` hooks for React/Vue/Svelte/RN |

**BSuite contains no JVM code.** Six apps: React 19 + Vite ×5, Next.js ×1, TypeScript strict,
Supabase (Postgres + Deno edge functions), Vercel. There is no Spring, no Quarkus, no servlet
container, and nowhere to put one. The server half of Atmosphere — which is all of the
governance, the agent runtime, the broadcaster, the approval gates — cannot be adopted at
any price short of standing up a JVM service the estate does not otherwise need.

### Could we take just the client?

`atmosphere.js` is npm-installable and framework-agnostic on paper. In practice:

- It is a client **for an Atmosphere endpoint**. Transport negotiation, the `responseBody`
  envelope, heartbeat/padding and tracking-id handshake are all Atmosphere-server-shaped.
  Pointed at a non-Atmosphere URL it degrades to an opinionated WebSocket wrapper.
- It carries `react-markdown` + `remark-gfm` as **hard runtime dependencies** — an unusual
  payload for a transport library, and one that would land in the app bundle.
- Everything it offers on the wire (WebSocket with fallback, auto-reconnect with exponential
  backoff, subscribe/push) is already provided by `@supabase/supabase-js`, which every app in
  the estate already ships and authenticates against.

Adopting it would add a dependency, a bundle cost and a second realtime idiom, to obtain a
capability the estate already has. No.

---

## 2. Against @bsuite/data-grid — no overlap at all

Measured state of the package (v1.0.0, `packages/data-grid`, branch `development`):

- Bespoke ~1,000-LOC grid over `@tanstack/react-virtual` + `dnd-kit`, peer `@tanstack/react-table`.
- **Has:** row+column virtualization, sort, column resize/reorder, frozen first column,
  cell-range selection, full keyboard grid nav, TSV clipboard, fill handle, undo/redo (200),
  five inline editors, optimistic writes with all-or-nothing revert.
- **Lacks:** filtering, pagination, checkbox row selection, grouping/aggregation, server-side
  data model, export hooks, column visibility, conflict detection, `aria-rowindex` / roving
  tabindex, any non-virtualised a11y mode.
- **Reach:** exactly 2 runtime call sites in crm7 — `BrowseDataTab.tsx` (the only editing
  surface, `/admin/data` + `/settings/data`) and `ReportBuilder.tsx` (read-only preview).
  `crm7/docs/20260813-report-builder-design-v1.00D.md` claims "Built, 5 consumers". It is 2.
- **Scale:** `BROWSE_ROW_CAP = 1000` in `browseDataService.ts`. The grid never receives more
  than 1,000 rows, at `height={480}` ≈ 15 visible. Its virtualization is essentially unexercised.

Atmosphere is a server-side agent runtime and transport. It has no grid, no table, no
client-rendering concern, nothing to say about clipboard semantics, fill extrapolation or
`aria-rowindex`. **Zero intersection.**

The one place a transport *could* have touched data-grid is live-updating rows — and there
the grid is structurally unready regardless of transport: `data` is a plain prop, the
optimistic `overlay` Map is keyed by `rowIndex:columnId`, so any reorder or repage silently
misaligns overlaid values, and `DataGridHandle` accepts no out-of-band row patch. You would
have to build the row-patch contract first; the transport is the easy half and is already
in the stack.

### What data-grid actually needs (already specified, not by Atmosphere)

`bsuite/docs/plans/20260817-estate-completion-plan-v1.00D.md` §Phase 3 "The Airtable-class
grid (data-grid v2)" is the authoritative register, gated at **G3**. Named deficits, in the
order they hurt:

1. **No conflict detection.** Two sessions editing the same cell overwrite each other
   silently. Needs a server-rejected row version.
2. **TSV-only clipboard.** No `text/html` parse — "corrupts any cell containing a tab or
   newline, a real risk across 1,297 catalogue fields."
3. **No server-supplied `is_writable`** from `has_column_privilege()`; writability is inferred
   client-side.
4. APG two-mode keyboard + roving tabindex, validators + `aria-invalid`, `cancelQueries`
   optimistic pattern, AG-Grid fill extrapolation (`[1,2]`→`[1,2,3,4]`, Alt-increment, cyclic).

And separately — **the estate went somewhere else.** crm7 has **91 files** importing shadcn
`@/components/ui/table` and **42** importing `@tanstack/react-table` directly, against 2 using
the shared grid. Every real list page (apprentices, timesheets, contacts, placements,
invoicing, compliance) is on the non-virtualised path. `crm7#1628` (P2, open) measures the
cliff at ~500 rows across 95 importers with a 5,000-row target, and **explicitly rules to
virtualise inside `EnhancedDataTable` rather than migrate call sites to the shared grid** —
the shared package is not even named as the fix. That is the live decision to engage with,
and it is not a transport question.

Two smaller things worth an hour: the package declares `files: ["dist","README.md"]` and has
**no README**, and `src/index.ts`'s doc comment still reads *"No consumer app is wired to this
package yet"*, which has been false since BrowseDataTab shipped.

---

## 3. Against the reports — the one place the question lands

Here Atmosphere is at least aimed at a real problem. Measured state of the report engine:

- **Everything is synchronous and client-side.** `runReportTemplate()` queries Supabase from
  the browser, 200-row pages. "Export all" (`fetchAllReportRows()`) loops 1,000-row pages
  **serially in the browser**, accumulates every row in memory, then builds CSV/XLSX via
  `@bsuite/data-export` or draws PDF cell-by-cell on the main thread with `pdf-lib`.
- Caps: `MAX_REPORT_EXPORT_ROWS = 50_000`, `MAX_REPORT_PDF_ROWS = 5_000` — the PDF comment
  states 50k rows would be "~1,250 pages and a multi-minute UI freeze".
- **The "queued" path is not queued.** `queueReportExportDelivery` POSTs to the
  `report-delivery` edge function, which inserts the `report_deliveries` row and then falls
  straight through into the processing loop for that same delivery in the same HTTP request —
  paging to 250,000 rows, building the file in edge-function memory, uploading, emailing.
  **The caller blocks on it.**
- **Nothing drains the queue.** `20260423190000_ws5_cron_report_delivery.sql` says in-file:
  *"pg_net is NOT enabled, so the net.http_post() approach is unavailable."* The hourly cron
  only requeues stuck rows and inserts more `pending` ones via `report_schedules_process_due()`.
  Scheduled reports accumulate as `pending` forever unless a human clicks **"Run All Pending
  Now"** on `/reports/deliveries`.
- **There is no progress feedback of any kind.** Zero hits for `EventSource`,
  `text/event-stream`, `ReadableStream` or `postgres_changes` anywhere in the report path.
  `/reports/deliveries` has no `refetchInterval` and no subscription — it refetches only on
  mutation. A user who queues an export must reload the page to learn what happened.

**So the need Atmosphere addresses is genuine: push server-side job progress to the browser
over a negotiated transport, and gate long-running work behind approvals.**

And the estate already has both halves of it, sitting unused:

- `report_deliveries` **already persists** `status`, `row_count`, `duration_ms`,
  `error_message`, `retry_count`. Every column a progress UI needs is already written.
- Supabase Realtime is **already wired** in crm7 — `useSystemNotices.ts` and
  `CustomPageRenderer.tsx` both subscribe to `postgres_changes` today. It is authenticated,
  RLS-scoped, on the existing connection, and costs nothing new.

A `postgres_changes` subscription on `report_deliveries` filtered by tenant would give live
`pending → running → success` on the deliveries page. That is a small, in-stack change against
a table that already holds the data. A `refetchInterval` is the two-line version if realtime
is overkill. Neither needs a JVM.

**The transport was never the blocker. Nothing subscribed.**

### The bigger finding, which dwarfs the tooling question

`crm7/src/pages/reports/index.tsx` carries a measurement in its own header comment: **of the
23 platform report templates, exactly ONE has ever produced a delivery. Zero tenant,
enterprise or personal reports have ever been created. Zero schedules exist.**

Supporting that, from open issues:

| Issue | |
|---|---|
| crm7#1602 | 6 of 23 starter reports query views that do not exist |
| crm7#1711 | [P0] Financial Reports nav entry has led nowhere since 2026-08-12 — migration skipped, not queued |
| crm7#1712 | [P1] Inline cell editing on `/reports/:key` is reachable by nobody — 0 of 23 templates satisfy its two conditions |
| crm7#1568 | [P1] `/financial/reports/new` is a SECOND report builder, hardcoded, zero catalogue-engine use |
| crm7#1721 | avetmiss-export has never worked — queries columns and a table that do not exist in production |
| crm7#1617 | [S-2] No pg_cron failure alerting: 288 consecutive failures produced zero operational signal |

Also: `/gto-compliance`'s "Export Compliance Report" writes a **plain `.txt` blob** through a
hand-rolled anchor click, bypassing `@bsuite/data-export` entirely — and its `selectedGtoId`
is hardcoded `null`, so it exports all-zeros.

The GTO catalogue is built. It reaches approximately nobody. That is the same shape as this
morning's reach check, and no streaming framework addresses it — six of the templates are
querying views that were never created.

*(Correction for the record: the estate brief says R80.4 has a `pdfExportService`. It does not
— that was R80.3, which R80.4 replaced. R80.4 has no report or export service, no
`@bsuite/data-export` dependency, and no PDF library; its only export is
`src/lib/quote-pdf-name.ts`, a filename helper for the browser's own `window.print()`.)*

---

## 4. What is worth taking from Atmosphere

Not code. Two design positions, both cheap to adopt in TypeScript:

1. **Durable human-in-the-loop as a first-class persisted state, not a modal.** Atmosphere
   parks the work, persists the workflow, and resumes through a REST approval surface. The
   report-delivery path would benefit from exactly that shape — `report_deliveries` is
   already the durable row; what's missing is a resume path that isn't "a human clicks Run
   All Pending Now."
2. **Governance on the critical path rather than as an afterthought** — cost ceilings and
   admission policy enforced where the work is dispatched. crm7's AI routes have rate limits;
   the report exports have row caps but no cost or concurrency ceiling, and a 250,000-row
   edge-function export is the kind of thing that should be admitted rather than attempted.

---

## 5. Recommendation

**Do not adopt Atmosphere, and do not adopt `atmosphere.js`.** Wrong runtime for the server
half; the client half duplicates `@supabase/supabase-js` while adding bundle weight and a
second realtime idiom.

Ordered by value, the work the question actually points at:

1. **Fix the reports that are broken before improving how they stream** — crm7#1602 (6 of 23
   query missing views), #1711 (P0, nav to nowhere), #1721 (avetmiss never worked). A report
   nobody can run does not need a progress bar.
2. **Subscribe `/reports/deliveries` to `postgres_changes` on `report_deliveries`** (or add a
   `refetchInterval` as the cheap version). The data is already persisted; nothing reads it live.
3. **Make the queued path actually queued** — the edge function currently processes inline and
   blocks the caller, and with `pg_net` disabled nothing drains the queue autonomously. This is
   the real "long-running job" problem, and it is a Supabase/cron problem, not a transport one.
4. **Take the crm7#1628 ruling** — virtualise inside `EnhancedDataTable` (95 importers) rather
   than migrating to `@bsuite/data-grid`. That is where the row-count pain actually is.
5. **Then data-grid v2 per Phase 3 / G3**, conflict detection first, `text/html` clipboard
   second. Add the missing README while you're in there.

Nothing on that list needs a JVM, and nothing on it is blocked by a transport.
