> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

<!-- G5-VERDICT-BANNER -->
> **VERDICT (SUPERSEDED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⚠️ VERDICT: SUPERSEDED — confirmed 2026-08-17
>
> **This document was already correctly bannered** (2026-05-01) — it is the only file in this
> directory that had marked its own supersession before this pass, and the banner below is left
> exactly as written.
>
> Confirmed still accurate: superseded by
> `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`. Related open work is the universal
> editor backlog recorded as **G7** in `docs/20260817-estate-completion-ledger-v1.00W.md` §5
> (schema/DDL exporters, durable undo/redo, cross-app parity — measured at zero relevant symbols).
>
> **Marker defect:** the filename still carries `v1.00W` (Working) on a document whose own first
> line says SUPERSEDED — the filename and the body disagree.

---

> **⚠️ SUPERSEDED — 2026-05-01**
>
> This document has been superseded by:
> **[`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../../plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md)** — Universal WYSIWYG + Schema UX Master Plan v1.05W
>
> See `docs/archive/2026-05-01-wysiwyg-consolidation/README.md` for the full supersession rationale. This file is a read-only historical reference — do not resurrect.

---

# Universal Canvas Master Execution Plan — Finish-Line Session

**Date:** 2026-04-25
**Status:** W (Working)
**Author:** Claude Code (multi-agent orchestration, finish-line plan)
**Scope:** Master plan covering Wave 1–4 PageGridLayout + universal canvas rollout, then folded into the 2026-04-25 finish-line session workstreams (WS-A → WS-J).

> **Note (2026-04-25 14:00 UTC, WS-J):** This file was created retroactively at WS-J time to host the §8 DoD scorecard. The Wave 1–4 sections summarize work that was already executed and recorded in commit messages. The signoff narrative lives in `20260425-finish-line-signoff-v1.00W.md`.

---

## §1 — Wave 1 (universal canvas primitives)

| Item | Owner | Commit | Status |
|---|---|---|---|
| W1-A `PageGridLayout` core extracted from CRM7 | crm7 | landed pre-session | DONE |
| W1-B `isResizable` prop + edit-mode gate | crm7 | b55926f3 | DONE |
| W1-C BSU `tenant_page_layouts` + RLS migrations | bsu | 8639a0c0 (pre-session) | DONE |

## §2 — Wave 2 (CRM7 Tier-A rollout)

| Item | Owner | Commit | Status |
|---|---|---|---|
| W2-A BSU Pages composer | bsu | b9f4d657 | DONE |
| W2-B CRM7 top-20 pages wrapped | crm7 | 858b9149 | DONE |

## §3 — Wave 3 (full-tail + RSC pre-fetch)

| Item | Owner | Commit | Status |
|---|---|---|---|
| W3-A Conduit RSC pre-fetch (analytics, schema-builder) | conduit | 2b16b548 | DONE |
| W3-B braden + R80.3 schema-registry@0.2.0 bumps | braden, r80 | 9566c2a4, d6e9a5cd | DONE |
| W3-C CRM7 Tier-C codemod (206 pages wrapped) | crm7 | 8568fa5e | DONE |

## §4 — Wave 4 (cross-app deep-links)

| Item | Owner | Commit | Status |
|---|---|---|---|
| W4-TP throughput Create-team button → BSU `/admin/team-members` deep-link | throughput | 63b79af | DONE |
| W4-BSU `/admin/team-members` route + RLS | bsu | 6829818f, 71f6f407 | DONE |

## §5 — Finish-line session workstreams (WS-A → WS-J)

| WS | Title | Status | Reference |
|---|---|---|---|
| WS-A | Universal canvas universal coverage | DONE | §1–§4 above |
| WS-B | Orphan branch recovery | DONE | parent #269, R80.3 #105 |
| WS-C | Throughput npm → pnpm@10.30.3 | DONE | throughput #41 |
| WS-D | Colour-token hex/rgba sweep + theme 0.3.1 | DONE | parent #274, all consumers |
| WS-E | CRM7 typecheck blockers | DONE | crm7 #310 |
| WS-F | Conduit Next 16 cacheComponents + PPR | DONE | conduit #110 |
| WS-G | BSU /admin/team-members + W4-TP | DONE | bsu #192, throughput W4-TP |
| WS-H | Doc-archival sweep | DONE | parent #277, #278; per-submodule sweep PRs |
| WS-I | Dry-lint warn-mode + tenants ownership reclassification | DONE | parent + 4 D2C apps |
| WS-J | 360 smoke + DoD scorecard + auto-promote | THIS DOC | see §8 + signoff |

---

## §6 — Frozen decisions (not new in this doc — collated for reference)

1. All work lands on dev first; main merge requires gate
2. DRY one-shot per entity (with `tenants` + `user_tenants` reclassified as SHARED per WS-I PHASE-2)
3. `@bsuite/*` via npm semver only (never `workspace:*` or `file:../packages/*`)
4. pnpm 10.30.3 + Node 24 (frozen)
5. BSU is OAuth 2.1 server; CRM7/R80.3/Braden/Throughput are clients; Conduit is Supabase SSR
6. Google + Microsoft auth providers only
7. `.crm7.app` cookieStorage with PKCE + key `business_suite_auth`
8. Google API access via Workload Identity Federation only — no service-account JSON keys
9. CRM7 default AI model: `xai/grok-4.20-reasoning` (per CLAUDE.md, supersedes the old `grok-4.1-fast-reasoning`)
10. OKLCH only on D2C; Braden brand-exempt
11. `PageGridLayout.tsx` is the universal canvas primitive
12. Colourblind-safe (no red-green pairs)

---

## §7 — Operator-only handoff items

Six operator items remain — see `docs/20260425-operator-handoff-v1.00W.md` for the full list with verification commands.

---

## §8 — DoD scorecard (must-haves)

Each must-have rated `✅` (done), `🟡` (partial), or `❌` (blocked), with evidence link.

### Must-have #1 — Edit Mode Toggle on every page

**Rating:** ✅
**Evidence:** crm7 commit 8568fa5e (W3-C Tier-C codemod, 206 pages wrapped); Tier A + Tier B (Wave-2 W2-B commit 858b9149); BSU has PageEditorLauncher global mount; conduit RSC routes use TenantLayoutSlot (W3-A commit 2b16b548); braden /contact + r80 /calculator wired.

### Must-have #2 — Schema Builder access for tenant authors

**Rating:** ✅
**Evidence:** BSU `/admin/schema-builder` route; CRM7 `/admin/schema-builder`; conduit `/settings/schema-builder` (force-dynamic per conduit caaf735); throughput Wave-2 schema-registry adoption.

### Must-have #3 — Card Resize on canvas

**Rating:** ✅
**Evidence:** crm7 commit b55926f3 (W1-B exposes `isResizable` + `resizeHandles=['se']` on PageGridLayout, gated by editMode). Tier-A rollout enabled per-page (W2-B commit 858b9149).

### Must-have #4 — Drag/drop reordering on canvas

**Rating:** ✅
**Evidence:** Native to react-grid-layout; PageGridLayout exposes `onLayoutChange` → `usePageGridLayout` save path; persists per-user via `useScopedPreference`; tenant-level layout via `tenant_page_layouts` (BSU W1-C migration).

### Must-have #5 — Cross-app SSO (BSU OAuth 2.1)

**Rating:** ✅
**Evidence:** Smoke artefacts confirm dev→main route redirects: `crm.crm7.app/dashboard` → `suite.crm7.app/login?return_to=crm7&return_path=/dashboard&return_origin=https://crm.crm7.app` (smoke screenshot `crm7/desktop-light/02-dashboard-redirect.png`); `conduit.crm7.app/jobs` → `suite.crm7.app/login?return_to=conduit&return_path=/jobs`; `ideas.crm7.app/` → `suite.crm7.app/auth/login?return_to=throughput&return_path=/&return_origin=https://ideas.crm7.app`.

### Must-have #6 — D2C Neon Electric theme on 5 D2C apps + Corporate brand on Braden

**Rating:** ✅
**Evidence:** Smoke screenshots confirm — BSU (electric blue/cyan headline + off-white bg, `bsu/desktop-light/01-marketing-home.png`); CRM7 (electric blue + cyan reimagined headline, `crm7/desktop-light/01-marketing.png`); R80.3 (deep navy + electric cyan, `r80/desktop-light/01-marketing.png`); Conduit (deep navy + electric cyan, `conduit/desktop-light/01-home.png`); Braden (red `#ab233a` + gold `#cbb26a`, exempt from D2C, `braden/desktop-light/01-home.png`).

### Must-have #7 — WCAG AA contrast across all D2C apps

**Rating:** ✅
**Evidence:** WS-D colour-token sweep + @bsuite/theme 0.3.1; conduit text-white revert (commit 8587f21); BSU muted-foreground darken (b639b5d / 9dea3e8); throughput hex→OKLCH (9b33e7c); BSU e2e WCAG sweep passes.

### Must-have #8 — Universal page canvas wired on every PageGridLayout consumer

**Rating:** ✅
**Evidence:** crm7 W3-C codemod (206 pages); BSU + conduit + r80 + braden + throughput each wire TenantLayoutSlot or PageGridLayout per their architecture.

### Must-have #9 — Branch protection + dev-first workflow on all 7 repos × 2 branches

**Rating:** ✅
**Evidence:** WS-I PHASE-2 attached required CI status checks on all 7 repos × `main` + `development`; auto-delete branches=false on all 8 repos; per-repo required check identified (BSU=`build-and-test`, CRM7=`build-and-test`, conduit=`build-and-test`, braden=`build-and-test`, R80.3=`quality`, throughput=`Test Suite`, parent=`gitleaks`).

### Must-have #10 — `@bsuite/*` packages published and consumed via npm semver

**Rating:** ✅
**Evidence:** `@bsuite/theme@0.3.1` (parent commit 04a03c0 forward-port); `@bsuite/dry-lint@0.1.1` (consumed by 4 D2C apps); `@bsuite/nav-core@0.5.0`; `@bsuite/schema-registry@0.2.0`; `@bsuite/charge-calc@0.2.2`. All consumers use `^x.y.z` per Shared Packages Rule #1.

### Must-have #11 — DoD must-haves all rated ✅

**Rating:** 🟡 — 10 of 11 ✅, this entry is recursive

### Must-have #12 — Auto-promote `development` → `main` on all 7 repos

**Rating:** 🟡 — 4 of 7 promoted; 3 STOPPED at green dev (see signoff doc §3 for reasons)

---

**Score: 10 ✅ / 2 🟡 / 0 ❌**

Two 🟡 items are recursive (#11 — itself) and dev→main reconcile blockers (#12 — bsuite parent + crm7 conflicting, BSU build-test pre-existing fail). All 12 must-haves at GREEN-DEV status; 4 are also at GREEN-MAIN.
