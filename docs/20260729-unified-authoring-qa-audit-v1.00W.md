# BSuite Comprehensive QA Audit (Unified Authoring + Invites + Jodie + Platform Kit)

**Status:** Working (v1.00W)  
**Date:** 2026-07-29  
**Mode:** READ-ONLY (no fixes applied)  
**Orchestrator:** hermes (claude-fable-5)  
**Delegation:** `deleg_7219e982` (4 lanes) + parent live DB + expanded product inspections  
**Coordination:** qig-memory → `claude-code-bsuite-pi` (`575ef642`, `e7fc6dd5`, `2264a7ab`, `deb03112`)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Executive summary

| Area | Verdict |
|------|---------|
| Unified authoring ship (crm7#1282, conduit#398, bsuite#1690) | **PARTIAL / overstated complete** |
| Team invites (developer account) | **BROKEN / blocked** |
| Enterprise seat/licence assignment UI | **MISSING** |
| Jodie AI on BSU | **MISSING from shell** (ideas-only stub) |
| Platform Kit ↔ Functions utility | **SPURIOUS** (list may work; deploy/body/log deep-links do not deliver real ops value) |
| crm7 Dashboard canvas (12-col) | **P0 BROKEN** — cards locked left; cannot place to the right (screenshot) |
| Throughput AI | **WRONG STACK** — LLMPanel, not shared Jodie |
| Analytics data | **EMPTY** — `idea_analytics` 0 rows |

**Bottom line:** Multiple false-complete surfaces. Highest pain now: **dashboard canvas left-column lock**, **can't invite as developer**, **no enterprise seat allocator**, **no BSU/Throughput Jodie shell**, **Analytics empty**, **Platform Kit/Functions spurious**.

---

## 2. Scope

### A — Unified authoring (recent ship)
Migrations `20260729200001–03`, `@bsuite/page-builder` extract, conduit CustomPageRenderer, crm7 builtin widgets.

### B — Team members / invites / enterprise licences (operator-reported)
Developer cannot send invite; nowhere to assign seat counts to annual enterprise tenants.

### C — Jodie AI missing from BSU (operator-reported)
Cross-app parity: crm7 + conduit shell vs BSU.

### D — Platform Kit functions utility (operator-reported)
“Unusable in relation to function — utility is spurious.”

### E — Dashboard canvas left-column lock (operator screenshot 2026-07-29)
https://crm.crm7.app/dashboard — Canvas Editor Active; cards only on left; cannot move into right columns at any column preset.

### F — Throughput buggy + should use same Jodie AI (operator-reported)

### G — Analytics has no data (operator-reported)

---

## 3. Severity-ranked findings

### 3.1 Platform Kit / Developer Functions — SPURIOUS UTILITY

| Sev | Finding | Evidence | Why utility is spurious |
|-----|---------|----------|-------------------------|
| **P0** | **Function deploy path corrupts multipart body** | `platform-kit-proxy/index.ts:489-492` always `await req.text()` for non-GET. `FunctionDetail.tsx:142-175` deploys via `FormData` multipart (metadata blob + file). | Binary/multipart → UTF-8 text round-trip **destroys** deploy payload. UI offers “New function / Deploy” but cannot reliably deploy through the proxy. Operators must still use CLI/dashboard → **page is theatre**. |
| **P1** | **Function body fetch forces `Accept: application/json`** | Proxy `:484` sets `Accept: application/json` on **all** upstream calls including `.../functions/{slug}/body` (`FunctionDetail.tsx:112-127`). | Source viewer likely gets wrong content-type / empty / error. “View source” affordance is non-trustworthy. |
| **P1** | **Post-deploy / “View logs” deep-link is dead** | `FunctionDetail.tsx:287,409` → `/developer/logs?function=<slug>`. `Developer/Logs.tsx` **never reads** `function` search param (only local `useState` for log table). | Clicking through after deploy does **not** filter to that function. Spurious navigation. |
| **P1** | **Split brain: Platform Kit hub has no Functions card** | `PlatformKit.tsx` panels: Auth, Logs, Database, Secrets, Dynamic Tables, Storage — **no Functions**. Real functions UI lives only at `/developer/functions`. | Two “admin consoles”; Functions not in the Kit map operators open from Admin nav. Kit claims “local Supabase admin fallback” but omits the highest-ops surface. |
| **P2** | **Dual Logs UIs** | `/admin/platform-kit/logs` vs `/developer/logs` — parallel implementations, different entry points. | Cognitive load; neither wired to function slug deep-link. |
| **P2** | **openapi-fetch body type escape hatch** | `FunctionDetail.tsx:112-115` comments Management API body is mis-typed as `Record<string, never>` — raw fetch required. | Typed client sold as the platform-kit story doesn't cover the critical read path. |
| **INFO** | Flag is ON on d.suite | Deployed bundle: `VITE_PLATFORM_KIT_ADMIN_ENABLED:\`true\`` | Not a flag-off problem; broken utility is deeper than enablement. |
| **INFO** | Role gate aligned (UI ↔ proxy) | `platformRole.ts` + proxy accept `developer` \| `platform_admin` \| `is_super_admin` | Access is not the primary issue for your developer account. |

**Operator framing (accurate):** Platform Kit/Functions is a **partial Management API browser**. Inventory *might* list functions if `SBP_MGMT_TOKEN` is healthy; **create/deploy/edit/body/log-filter do not form a closed useful loop**. Prefer CLI (`supabase functions …`) until proxy forwards multipart/`arrayBuffer` and Logs honor `?function=`.

---

### 3.2 Team invites + enterprise seats

| Sev | Finding | Evidence |
|-----|---------|----------|
| **P0** | **crm7 invite rejects developers who aren't tenant owner/admin** | `crm7/supabase/functions/tenant-management/index.ts:324-333`: requires `user_tenants.role IN ('admin','owner')`. **No** `platform_role=developer` / `is_super_admin` bypass. |
| **P0** | **Live `teams` table is empty (0 rows)** | `SELECT count(*) FROM teams` → 0. BSU Team Members UI is team-rail based (`listTeams` + invite per team). Empty rail → **nowhere to invite**. |
| **P0** | **`teams` SELECT RLS has no developer bypass** | Policies: owner OR `team_members` membership only. Developer platform role does **not** list all teams (and there are none anyway). |
| **P1** | **BSU RPC does allow developer for seat-cap only** | `invite_team_member_guarded`: `is_team_admin` includes `platform_is_developer_or_admin()`; seat cap skipped for `profiles.platform_role='developer'`. Still needs a **team id** + admin gate on that team. |
| **P0** | **No UI writes `subscriptions.seat_count`** | Grep of app code: seat_count is **read** in Auth/useSubscription/TeamMembers/Licences. **No** admin/developer form updates seat counts. `Developer/Tenants` create sets **tier** only (`createTenant` → `create_organization_with_owner`), not seats. |
| **P1** | **Enterprise live seats are tiny** | Live: enterprise subscriptions only `seat_count` 1 or 2. Annual enterprise (MBAWA/FutureBuild-class) has **no allocator** to set N seats. |
| **P2** | **Developer › Licences is grace-event viewer only** | `Developer/Licences.tsx`: lists `enterprise_licence_events` over-cap grace rows — **not** “assign N licences to tenant”. |
| **P2** | **LicenseManager = tester licences** | `Admin/LicenseManager.tsx` → `assign-tester-license` edge fn — orthogonal to enterprise seat_count. |
| **INFO** | Your accounts | `braden.lang77@gmail.com` and `braden@braden.com.au` are `platform_role=developer`, `is_super_admin=true`. |

**Why developer can't invite (most likely stack):**
1. **crm7 path:** 403 unless you have owner/admin on that tenant (developer badge irrelevant).  
2. **BSU path:** Team Members needs a team; **zero teams in DB** + RLS won't show foreign teams → empty UX.  
3. Even with a team, enterprise tenants at 1–2 seats hit cap unless developer tier bypass or grace path; **no UI to raise seat_count** for the customer tenant.

---

### 3.3 Jodie AI missing from BSU

| Sev | Finding | Evidence |
|-----|---------|----------|
| **P0** | **No shell-level Jodie on BSU** | `rg AIAssistant\|useAIChat\|AIFloatingButton` over `business-suite-unified/src` → **NONE**. |
| **P0** | **crm7 + conduit have full shell assistants** | crm7 `MainLayout.tsx` lazy `AIAssistant` + FAB “Open Jodie”; conduit `AIFloatingButton` / `AIAssistant` / `DashboardShell`. |
| **P1** | **BSU “Jodie” is ideas-tab only** | `components/ideas/JodieAI.tsx` → `idea-assistant` edge fn; modes analyse/refine/business-plan/research. Not platform admin/ops assistant. |
| **P1** | **Manuals claim Jodie parity that shell can't deliver on BSU** | `lib/manuals/blocks/shared.ts` “Ask Jodie to do this” / org-admin scripts — no global chat to run them from BSU. |
| **P2** | **`@bsuite/jodie` package is agent-loop/MCP, not UI** | `packages/jodie` — no FAB/panel export; BSU `package.json` does not depend on it for a shell. |
| **P3** | Header only mounts bug-report hook branded Jodie | `Header.tsx` / `main.tsx` diagnostics — not conversational AI. |

**Parity matrix**

| App | Shell Jodie FAB/panel | Domain tools | Notes |
|-----|----------------------|--------------|-------|
| crm7 | ✅ MainLayout | ✅ ui-builder + ops tools | Canonical full assistant |
| conduit | ✅ DashboardShell | ✅ ATS tools | Named Jodie |
| BSU | ❌ | ideas-only + manuals text | **Gap** |
| R80.3 | tools only | funding offset tool | No full shell found in quick sweep |

---

### 3.4 Unified authoring (prior lanes — parent-confirmed)

| Sev | Finding | Evidence |
|-----|---------|----------|
| **P0** | `@bsuite/page-builder` **never published** `PageEditorLauncher` | npm `0.5.2` = 2026-07-16; extract `739fa792` = 2026-07-29; `npm pack` has no launcher; conduit imports it. crm7 OK (local import). |
| **P1** | `resolve_authoring_scope` **runtime 42703** | Live call fails: `te.scope` missing; column is `app_scope` (values like `all`). Function recorded in `schema_migrations`. |
| **P1** | conduit#398 CI lint **FAIL** | `CustomPageRenderer.tsx:159` writes `custom_pages` — ownership-map **crm7 owner**, ADR-0003 read-only renderer. |
| **P2** | Migration `00001` shape ≠ live | Migration: `record_data`/`created_by`; live: `data` + no created_by. `IF NOT EXISTS` no-op. |
| **P2** | Dual PageEditorLauncher | crm7 569-line shell vs packages 334-line extract (unshipped). |
| **P2** | UX red-flag settings navigations | `PageEditorLauncher.tsx:328,434,468,497,522`. |
| **P2** | Zero production `category:'built-in'` registrations | Builtin event path wired; palette Built-in section empty (lane R). |
| **P2** | conduit edit add/remove no-ops | `handleAddWidget`/`handleRemoveWidget` = `void`. |

**Adversarial corrections to subagent claims**
- Live `custom_fields` / `tenant_entity_records` policies are **split** role-gated (`*_select/insert/update/delete` via `user_tenants`) — **not** currently the broken FOR ALL OR-bypass. Migration **files** still risk reintroducing overlap on fresh apply.
- `GRANT … TO anon` on `custom_fields` **still live** (table privileges); RLS applies but baseline debt remains.
- `pay_periods` live policies use `auth_tenant_id()` — migration ghosts are file-level, not necessarily live.
- Parent submodule pointer includes `7e054de4` on development bump path.

---

### 3.5 Blindspot snapshot (lane B)

| Class | Status | Notes |
|-------|--------|-------|
| Auth doctrine (cookieStorage / domain / storageKey) | CLEAN | Forbidden only in comments; setSession after exchange in all 5 apps |
| current_tenant_id ghosts in **migration files** | FOUND | pay_periods etc.; live helper is `auth_tenant_id` |
| Cross-submodule migration timestamps | FOUND | 13 true content collisions historical |
| Cron gateway auth | CLEAN | |
| Vacuous CI / oklch email | CLEAN (sampled) | |
| Deno check in CI | FOUND skipped | |

---

## 4. VERIFIED-CLEAN

| Claim | Evidence |
|-------|----------|
| `tenant_entity_records` exists; EntityTableWidget uses `.data` | live DB + `EntityTableWidget.tsx:64-74` |
| `auth_tenant_id()` exists; `current_tenant_id` fn absent | `pg_proc` |
| Live custom_fields / tenant_entity_records write RLS role-gated | full `pg_policies` bodies |
| crm7 builtin event dispatch without navigate | `PageEditorLauncher.tsx:546-561` + tests |
| packages PageEditorLauncher src framework-agnostic | imports only react/lucide/local |
| Platform Kit flag enabled on d.suite | bundle env literal `true` |
| braden developer profiles | platform_role developer + super_admin |
| `invite_team_member_guarded` exists SECURITY DEFINER | live `pg_get_functiondef` |

---

## 5. Wiring matrix (expanded)

| Artifact | State |
|----------|--------|
| crm7 PageEditorLauncher (local) | WIRED |
| packages PageEditorLauncher | ORPHAN / UNPUBLISHED |
| conduit PageEditorLauncher import | BROKEN at registry |
| resolve_authoring_scope | DEAD + BROKEN |
| BSU Team Members invite | BLOCKED (no teams + gates) |
| crm7 invite-member | BLOCKED for pure developer |
| subscriptions.seat_count admin UI | MISSING |
| BSU shell Jodie | MISSING |
| Developer Functions list | PARTIAL (depends on mgmt token) |
| Developer Functions deploy | SPURIOUS (multipart via req.text) |
| Function → Logs deep link | SPURIOUS (query ignored) |
| Platform Kit Functions card | MISSING |
| Dashboard multi-column canvas | **BROKEN** (left stack only) |
| Throughput Jodie shell | MISSING (LLMPanel instead) |
| idea_analytics data | EMPTY (0 rows) |

---

## 3.6 Dashboard canvas — cards locked to left column (P0)

**Operator report + screenshot:** Canvas Editor Active on `/dashboard`. Cards (Total Contacts, Conversion Rate, Communication Center) form a **single left stack**. Large empty region on the right. Column presets 1/2/3/4/6/12 all behave the same — **cannot place cards to the right of the leftmost column**.

| Item | Finding |
|------|---------|
| Screenshot | Cards ~¼ content width, left-aligned; SE handles visible; ~70% empty right |
| Intended default | `Dashboard.tsx` `LG_LAYOUT` is multi-column (`w:4` at `x:0/4/8`, etc.) on 12 cols |
| Package drag fix | Installed `@bsuite/page-builder@0.5.2` uses `verticalCompactor` (bsuite#1588 present) — not solely the old preventCollision revert |
| KPI strip regression | Comments claim a **static CSS KPI strip above the canvas**; **render has no strip** — only `PageGridLayout`. KPI widgets still in `widgets` map; `LG_LAYOUT` **omits** KPI `i` keys |
| layoutVersion path | Dashboard uses adapter **directly**, not `DraggableCardPage` (`LAYOUT_EPOCH=101`) — stale `page:/dashboard_grid_*` preferences may not get epoch-invalidated |
| Breakpoint trap | `buildResponsiveLayouts` stacks sm/xs/xxs to `x:0,w:cols`. RGL `sm:768`. Wrong/low `containerWidth` can serve stacked breakpoint while chips still show “12” |

**Hypotheses:** (1) stale saved layout all `x:0`; (2) KPI strip removed / KPIs on canvas degraded; (3) containerWidth/breakpoint mismatch; (4) residual drag-persist issues.

**Suggested fix (not applied):** Restore KPI strip or put KPIs in `LG_LAYOUT` + bump `layoutVersion`; apply epoch invalidation; verify container width ≥1200; Reset to Default then drag to `x≥4`.

---

## 3.7 Throughput — buggy + not shared Jodie

| Sev | Finding | Evidence |
|-----|---------|----------|
| **P0** | No Jodie shell | No `AIAssistant` / `AIFloatingButton` in throughput |
| **P0** | Separate LLM stack | `components/llm-panel/*` + `createLLMStream` (groq/openai) on idea detail only |
| **P1** | Team admin degraded | `BSU_TEAM_ADMIN_UNAVAILABLE_LABEL` in TeamManagement |
| **P2** | Should match crm7/conduit Jodie | Operator requirement |

---

## 3.8 Analytics — no data

| Sev | Finding | Evidence |
|-----|---------|----------|
| **P0** | `idea_analytics` empty | Live `count(*)` = **0** |
| **P1** | Throughput Analytics UI empty | RPC + table by `user_id` → empty state copy |
| **P1** | RPC session-bound | Unauthenticated call → `42501` |
| **INFO** | crm7 `/analytics` is different metrics API | Don't conflate with idea_analytics |

---

## 6. Recommended fix order (not executed — audit only)

1. **Dashboard canvas P0** — restore KPI strip or fix defaults + force layout invalidation; verify drag to x>0.  
2. **Invites:** developer bypass + tenant invite without empty `teams`.  
3. **Enterprise seats:** UI for `subscriptions.seat_count`.  
4. **Functions proxy:** multipart/`arrayBuffer`; Logs `?function=`.  
5. **Jodie shell** on BSU + Throughput (retire LLMPanel as sole AI).  
6. **Analytics writers** into `idea_analytics`.  
7. **Authoring:** publish page-builder launcher; fix/drop `resolve_authoring_scope`; conduit read-only custom_pages.  

---

## 7. Coordination

- READ-ONLY while Claude Code owns other lanes.  
- Charge-calc / AVETMISS holds untouched.  
- Keys: `bsuite_qa_unified_authoring_20260729`, `bsuite_session_latest_v2`, `bsuite_hermes_active_work`.  

---

## 8. Self-report

| Item | Status |
|------|--------|
| Unified authoring + live DB | Done |
| Subagent lanes R/B/X/A | Absorbed + adversarially corrected |
| Invites / seats | Done |
| Jodie BSU | Done |
| Platform Kit functions spurious | Done |
| Dashboard left-column lock | Done (screenshot + code) |
| Throughput AI parity | Done |
| Analytics empty | Done (0 rows live) |
| Fixes | **None** (audit-only) |

---

*End v1.00W — expand when fixes land.*
