# BSuite Gap Report v2.00W

**Date:** 2026-03-17  
**Auditor:** Cascade  
**Scope:** All 5 projects — BSU, CRM7, Conduit, braden, R80.3  
**Plans cross-referenced:**
- `docs/20260227-bsuite-master-roadmap-v5.00W.md`
- `docs/20260316-bsuite-gap-report-v1.00W.md`
- `~/.windsurf/plans/pageGridLayout-master-2f6071.md`
- `~/.windsurf/plans/pageGridLayout-phase2-bsu-r80-conduit-2f6071.md`
- `~/.windsurf/plans/p0-p1-sweep-07fa37.md`
- `~/.windsurf/plans/crm7-ui-fix-c6b71e.md`
- `~/.windsurf/plans/crm7-dashboard-inp-fix-5628bb.md`
- `~/.windsurf/plans/crm7-broad-ui-refresh-ec965f.md`
- `~/.windsurf/plans/bsuite-upgrades-audit-07fa37.md`
- `~/.windsurf/plans/theme-compliance-audit-368b75.md`
- `~/.windsurf/plans/bsuite-incomplete-plans-triage-368b75.md`

---

## Section 1 — Stale Data Corrections (gap report v1 was wrong)

The previous gap report `20260316-bsuite-gap-report-v1.00W.md` contained stale P0/P1 entries that are **already fully implemented**:

| Stale Claim | Actual Reality |
|---|---|
| P0-2 Dead route `/contacts/:id` | EXISTS — `crm7/src/pages/contacts/[id]/index.tsx` + wired in App.tsx |
| P0-3 Dead route `/contacts/:id/edit` | EXISTS — `crm7/src/pages/contacts/[id]/edit.tsx` + wired |
| P0-4 Dead route `/placements/:id` | EXISTS — `crm7/src/pages/placements/[id].tsx` + wired |
| P0-5 Dead route `/placements/create` | EXISTS — `crm7/src/pages/placements/create.tsx` + wired |
| P1-1 EntitySelector missing | EXISTS — 6 selectors in `crm7/src/components/entity/selectors/` |
| P1-2 DataContextSimple in active pages | Only in demo components, not production pages |
| P1-3/4 Training sign-off / host agreement | `hostAgreementStore.ts` + `hosts/agreements/index.tsx` exist |

---

## Section 2 — Verified Complete (audited against codebase)

All items below were previously listed as open or in-progress and have been **confirmed complete** via direct codebase inspection.

### CRM7
| Item | Status |
|---|---|
| `framer-motion` removed (kept `motion` alias) — ~300KB bundle save | ✅ Done |
| `@types/react-grid-layout` upgraded `^1.3.5` → `^2.1.0` | ✅ Done |
| `formatters.compact` — B and T tiers (≥1B, ≥1T) | ✅ Done |
| `NumberTicker` uses `text-inherit` (no more `text-black dark:text-white` override) | ✅ Done |
| Sidebar D2C token mapping (`--sidebar-accent`, `--sidebar-background`, etc.) | ✅ Done |
| `ai_sessions` + `ai_messages` Supabase tables + RLS (migration `20260312000000`) | ✅ Done |
| DotPattern SVG `<pattern>` rewrite (removed ~1,800 `motion.circle` elements) | ✅ Done |
| Dashboard panels wrapped in `React.memo` (all 7 panels) | ✅ Done |
| `startTransition` on `toggleTheme` / `setTheme` in `ThemeContext` | ✅ Done |
| B1 bento grid + accent glow on dashboard | ✅ Done |
| `awardStore.ts` uses `award_name` column (not `title`) | ✅ Done |
| `useDocumentTitle` hook wired into `ProtectedRoute` (275/276 routes covered) | ✅ Done |
| SEO: `robots.txt` + `sitemap.xml` domain updated to `crm.crm7.app` | ✅ Done |
| Security headers: CSP, HSTS, X-Frame-Options, Permissions-Policy in `vercel.json` | ✅ Done |
| Conduit `canEditPage` — NOT hardcoded; `isEditing` starts `false`, enabled via event only | ✅ Done |

### BSU
| Item | Status |
|---|---|
| PageGridLayout wired on all 8 pages (UnifiedDashboard, SystemOverview, TenantManagement, UserManagement, AuditLog, Analytics, Billing, Settings) | ✅ Done |
| `AdminBranding` page created at `/admin/branding` (Platform Defaults + Tenant Override tabs) | ✅ Done |
| Idea Hub at `/ideas`, `/ideas/new`, `/ideas/:id` — wired in AppContent.tsx | ✅ Done |
| Modal components (`UserDetailModal`, `InviteUserModal`, `TenantDetailModal`, `CreateTenantModal`) use `fixed inset-0 z-50` — correct overlay pattern | ✅ Done |

### R80.3
| Item | Status |
|---|---|
| PageGridLayout wired in `R8Calculator.tsx` (inputPanel + results widgets) | ✅ Done |
| PageGridLayout wired in `SettingsPage.tsx` | ✅ Done |
| Neon Electric CSS var pattern in `tailwind.config.js` — correct `rgb(var(--neon-electric-X) / <alpha-value>)` | ✅ Done |

### Conduit
| Item | Status |
|---|---|
| PageGridLayout wired on all 8 list `_view.tsx` files (candidates, jobs, pipeline, talent-pools, analytics, interviews, offers, onboarding) | ✅ Done |
| Candidate documents tab at `/candidates/[id]/documents` (queries `r7_documents`) | ✅ Done |

### Braden
| Item | Status |
|---|---|
| GA4 measurement ID reads `VITE_GA4_MEASUREMENT_ID` env var (falls back to `VITE_GA_ID`, then placeholder) | ✅ Done |
| Wrong hex `#B71C1C` for `brand.primary` — key not present in current `tailwind.config.ts` | ✅ Done |
| `vite-env.d.ts` — all known `VITE_*` vars declared in `ImportMetaEnv` interface | ✅ Done |

---

## Section 3 — Confirmed Open Gaps

### P1 — Claude Code Owns

| ID | Item | Project | File(s) |
|---|---|---|---|
| CC-1 | `DashboardPageEditorDrawer`: only `PointerSensor` registered — keyboard drag inaccessible. Add `KeyboardSensor` + `sortableKeyboardCoordinates` + `aria-label` on grip buttons | CRM7 | `src/components/platform/DashboardPageEditorDrawer.tsx` |
| CC-2 | `DialogContent` accessible title sweep — 81 files lack `<DialogTitle>` or `VisuallyHidden` wrapper | CRM7 | Multiple files |
| CC-3 | Remaining CRM7 broad refresh pages (dashboard-adjacent hubs, workflow lists, admin surfaces still on legacy panel styling) | CRM7 | Multiple files (in-progress) |

### P2 — Cascade Owns

| ID | Item | Project | Effort |
|---|---|---|---|
| CA-1 | Migrate `react-hot-toast` (7 files) to `sonner` — `sonner` is in `package.json` but unused; `react-hot-toast` has 7 active callers. Also add `<Toaster />` to App root. | BSU | ~1h |
| CA-2 | TypeScript upgrade: `5.5` → `5.9.3` across crm7, bsu, r80.3 (Conduit inherits from Next.js) | All | ~30min |
| CA-3 | `@supabase/supabase-js` upgrade to `2.99.2` across all 5 apps | All | ~30min each |
| CA-4 | AI SDK version sync: Conduit `ai` + `@ai-sdk/*` packages → match CRM7 versions | Conduit | ~30min |
| CA-5 | `vitest` upgrade: `v3` → `v4` for bsu, braden, r80.3 | BSU, braden, R80.3 | ~1h |
| CA-6 | Theme compliance B4: BSU missing D2C shell tokens in global CSS | BSU | ~2h |
| CA-7 | Theme compliance B3: R80.3 FOUC (no `data-theme` script on `<html>` before first paint) | R80.3 | ~1h |
| CA-8 | Theme compliance C1: landing pages hex → token sweep (BSU ~62 instances, Conduit ~55 instances) | BSU, Conduit | ~4h |

### P3 — Requires Separate Planning Session

| ID | Item | Project | Effort |
|---|---|---|---|
| SP-1 | TenantBrandingProvider (Track A) — `tenant_branding` table, `useTenantBranding` hook, CSS var injection in all 5 apps. Supabase migration is the pre-req. | All | ~3d |
| SP-2 | BSU Stripe end-to-end verification — confirm webhook processing, subscription state, upgrade/downgrade flows | BSU | ~1w |
| SP-3 | CRM7 Tier 3-4 page wiring (financial, compliance, WHS, comms, reports) into PageGridLayout | CRM7 | ~2w |
| SP-4 | BSU cross-app notifications via Supabase Realtime pub/sub | BSU + all clients | ~3d |
| SP-5 | R80.3 test coverage push to 70% (currently low) | R80.3 | ~1w |

---

## Section 4 — Task Boundary (Cascade vs Claude Code)

| Category | Owner |
|---|---|
| CRM7 surface/page refreshes, a11y sweep, feature implementation | **Claude Code** |
| Cross-project fixes, theme tokens, lockfiles | **Cascade** |
| Package version upgrades | **Cascade** |
| `pnpm typecheck` verification gates | **Cascade** |
| DialogContent a11y sweep (81 files) | **Claude Code** |
| TenantBrandingProvider rollout | **Either** (coordinate first) |

---

## Section 5 — Recommended Execution Order

```
Next session (Cascade):
  CA-1  BSU react-hot-toast → sonner migration (7 files)
  CA-2  TypeScript 5.9.3 across crm7/bsu/r80.3
  CA-3  @supabase/supabase-js 2.99.2 across all apps
  CA-4  AI SDK version sync (Conduit ↔ CRM7)
  CA-5  vitest v4 for bsu/braden/r80.3
        → pnpm typecheck gate on all 5 apps after upgrades

Next session (Claude Code):
  CC-1  DashboardPageEditorDrawer KeyboardSensor + aria
  CC-2  DialogContent title sweep (batch — can be done in one pass)
  CC-3  Continue broad CRM7 refresh

Near-term (separate plan):
  CA-6  BSU D2C token gaps
  CA-7  R80.3 FOUC fix
  CA-8  Landing pages hex→token sweep
  SP-1  TenantBrandingProvider — needs Supabase migration first
```

---

## Section 6 — Development Branch Status

| Project | Branch | Commits ahead | Deploy status |
|---|---|---|---|
| CRM7 | `development` | 14+ | Preview deployed — NOT merged to main |
| BSU | `development` | 3+ | Preview deployed — NOT merged to main |
| Conduit | `development` | Unknown | Check before work |
| R80.3 | `development` | Unknown | Check before work |
| braden | `development` | Unknown | Check before work |

> **Action required:** User to review previews and decide merge strategy before next feature batch.

---

*Supersedes `docs/20260316-bsuite-gap-report-v1.00W.md`*
