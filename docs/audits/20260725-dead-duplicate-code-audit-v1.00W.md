# Dead & Duplicate Code Audit — BSuite Monorepo (Read-Only Inventory)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

| Field | Value |
|---|---|
| **Audit date** | 2026-07-25 |
| **Version** | v1.00W (WIP draft) |
| **Scope** | BSuite monorepo: `crm7`, `R80.3`, `braden`, `business-suite-unified`, `conduit`, `throughput`, `packages/*` |
| **Mode** | READ-ONLY inventory — no files were deleted or modified |
| **Tools** | `rg` (ripgrep 15.1.0), Python analysis scripts |
| **Classification scheme** | `SAFE_DELETE` · `DUPLICATE_CONSOLIDATE` · `NOT_DEAD_IMPLEMENT` |

---

## Executive Summary

| Category | Count | Est. removable LOC |
|---|---|---|
| Duplicate components across apps | **39 groups** (123 file copies) | ~6,000+ |
| Duplicate hooks/libs across apps | **48 groups** | ~4,000+ |
| Files with zero production importers | **102 files** | ~45,000 |
| TODO/FIXME stubs blocking features | **51 TODOs · 6 STA parser stubs** | — |
| Orphaned standalone file (`charge-calculator-mapd.jsx`) | **1 file** (94 KB) | ~2,400 |

**Key findings:**

1. **LocalisedDateInput** is copy-pasted across **6 apps** (crm7, R80.3, braden, business-suite-unified, conduit, throughput) with its companion hook `useDateFormatPreference` duplicated across **5 apps** — the single most visible duplication pattern.
2. **`throughput` app** has **23 dead files** (130 KB) — the entire app is excluded from `lint:all` / `test:all` / `build:all` / `typecheck:all` in root `package.json`. Many files within it have zero intra-app importers, suggesting speculative scaffolding that was never wired in.
3. **`tenantRoutes.ts`** is duplicated across **5 apps** (crm7, R80.3, braden, business-suite-unified, conduit) with zero code importers — only referenced in `docs/dashboard/` data and one test file.
4. **AVETMISS NAT format files** (10 files in `crm7/src/lib/avetmiss/`) have zero production importers — only imported by their test file. The feature is documented in parity specs but not wired into any production page or service.
5. **WHS component stubs** contain 9 `TODO: Create table` / `TODO: Implement Edge Function` markers — these are NOT_DEAD_IMPLEMENT (code exists but features are blocked by missing DB tables).

---

## 1. Duplicate Components Across Apps

### 1.1 LocalisedDateInput — 6 copies (DUPLICATE_CONSOLIDATE)

| App | Path |
|---|---|
| crm7 | `src/components/ui/localised-date-input.tsx` |
| R80.3 | `src/components/ui/localised-date-input.tsx` |
| braden | `src/components/ui/localised-date-input.tsx` |
| business-suite-unified | `src/components/ui/localised-date-input.tsx` |
| conduit | `src/components/ui/localised-date-input.tsx` |
| throughput | `src/components/ui/localised-date-input.tsx` |

**RE-MEASURED 2026-08-27 — the copies are NOT equivalent, and `@bsuite/dates` does not
cover them. Both facts change what "consolidate" means here.**

R80.3 has since been archived out of the submodules, so five copies remain live. They export
an identical API — `LocalisedDateInputProps` and `LocalisedDateInput` — and are otherwise a
**quality gradient**, not five copies of one thing:

| | throughput | conduit | braden | BSU | crm7 |
|---|---|---|---|---|---|
| bytes | 4,558 | 4,773 | 5,861 | 6,751 | **16,597** |
| `aria-` attributes | 2 | 2 | 4 | 4 | **6** |
| `onBlur` handling | 4 | 4 | 4 | **1** | **7** |
| `dd/mm` handling | 1 | 2 | 1 | 2 | **5** |

So a user entering a date on throughput or conduit gets **a third of the accessibility
attributes** a crm7 user gets, on the same control, for the same task. BSU's blur handling is
the thinnest of all five. That is not a DRY problem with a cosmetic fix — it is five different
levels of correctness shipped under one component name.

**`@bsuite/dates` exists but does not export this.** Its `./react` entrypoint exports
`LocaleProvider` and `useLocale` only — no `LocalisedDateInput`, no `useDateFormatPreference`.
So the apps are not ignoring an available shared component; there isn't one. Any earlier
reading of this row as "just import the package" is wrong.

**What consolidating actually requires**, in order:
1. Promote **crm7's** implementation into `@bsuite/dates/react` — it is the superset on every
   axis measured above, so four apps GAIN accessibility and none regresses.
2. Publish, then migrate the five apps one at a time behind the visual gate. A date field is a
   form control on data-entry paths; swapping it is a UX change, not a refactor.
3. Delete the local copies only after each app is measured on a preview.

Doing step 1 alone would add an export nothing imports — the built-and-unwired shape this
estate already carries too much of. The steps go together or not at all.

**Not measured:** no browser probe of any of the five. The divergence is byte-level and
attribute-level, read from source, not observed as a rendering difference.

**Companion hook** — `useDateFormatPreference.ts` duplicated across **5 apps**:

| App | Path |
|---|---|
| crm7 | `src/hooks/useDateFormatPreference.ts` |
| R80.3 | `src/hooks/useDateFormatPreference.ts` |
| braden | `src/hooks/useDateFormatPreference.ts` |
| business-suite-unified | `src/hooks/useDateFormatPreference.ts` |
| conduit | `src/hooks/useDateFormatPreference.ts` |

**Classification:** `DUPLICATE_CONSOLIDATE` — candidate for extraction to `@bsuite/ui` or `@bsuite/dates` package.

**Evidence:** Each copy defines a `LocalisedDateInput` component consuming `useDateFormatPreference`. Consumer pages import via `@/components/ui/localised-date-input` (e.g., 60+ pages in crm7 alone). The `packages/dates` package already exists but does not export this component.

---

### 1.2 AI Assistant Component Suite — 11 files duplicated crm7 ↔ conduit (DUPLICATE_CONSOLIDATE)

| Component | crm7 path | conduit path | Similarity |
|---|---|---|---|
| `AIAssistant.tsx` | `crm7/src/components/ai/AIAssistant.tsx` | `conduit/src/components/ai/AIAssistant.tsx` | Similar |
| `AICommandPalette.tsx` | `crm7/src/components/ai/AICommandPalette.tsx` | `conduit/src/components/ai/AICommandPalette.tsx` | Similar |
| `AIFloatingButton.tsx` | `crm7/src/components/ai/AIFloatingButton.tsx` | `conduit/src/components/ai/AIFloatingButton.tsx` | Similar |
| `AIHeader.tsx` | `crm7/src/components/ai/AIHeader.tsx` | `conduit/src/components/ai/AIHeader.tsx` | SIMILAR |
| `AIInputArea.tsx` | `crm7/src/components/ai/AIInputArea.tsx` | `conduit/src/components/ai/AIInputArea.tsx` | Similar |
| `AIMessage.tsx` | `crm7/src/components/ai/AIMessage.tsx` | `conduit/src/components/ai/AIMessage.tsx` | Similar |
| `AIMessageList.tsx` | `crm7/src/components/ai/AIMessageList.tsx` | `conduit/src/components/ai/AIMessageList.tsx` | Similar |
| `AIQuickActions.tsx` | `crm7/src/components/ai/AIQuickActions.tsx` | `conduit/src/components/ai/AIQuickActions.tsx` | SIMILAR |
| `AISheet.tsx` | `crm7/src/components/ai/AISheet.tsx` | `conduit/src/components/ai/AISheet.tsx` | Similar |
| `AIToolCard.tsx` | `crm7/src/components/ai/AIToolCard.tsx` | `conduit/src/components/ai/AIToolCard.tsx` | SIMILAR |
| `AITypingIndicator.tsx` | `crm7/src/components/ai/AITypingIndicator.tsx` | `conduit/src/components/ai/AITypingIndicator.tsx` | Similar |
| `AIUpsellCard.tsx` | `crm7/src/components/ai/AIUpsellCard.tsx` | `conduit/src/components/ai/AIUpsellCard.tsx` | SIMILAR |
| `ScoutIcon.tsx` | `crm7/src/components/ai/ScoutIcon.tsx` | `conduit/src/components/ai/ScoutIcon.tsx` | SIMILAR |

**Companion lib duplicates:**

| Lib file | crm7 path | conduit path |
|---|---|---|
| `jodie-persona.ts` | `src/lib/ai/jodie-persona.ts` | `src/lib/ai/jodie-persona.ts` |
| `model-router.ts` | `src/lib/ai/model-router.ts` | `src/lib/ai/model-router.ts` |
| `config.ts` | `src/lib/ai/config.ts` | `src/lib/ai/config.ts` |
| `useAIChat.ts` | `src/hooks/useAIChat.ts` | `src/hooks/useAIChat.ts` |

**Classification:** `DUPLICATE_CONSOLIDATE` — the entire AI assistant component suite + supporting libs/hooks are duplicated. Candidate for `@bsuite/ai` package.

---

### 1.3 UI Primitives — shadcn/ui copies across braden ↔ crm7 (DUPLICATE_CONSOLIDATE)

The following shadcn/ui primitive components are duplicated between `braden` and `crm7` (and sometimes `business-suite-unified`):

| Component | Copies | Apps |
|---|---|---|
| `accordion.tsx` | 2 | braden, crm7 |
| `alert.tsx` | 2 | braden, crm7 |
| `alert-dialog.tsx` | 3 | braden, business-suite-unified, crm7 |
| `aspect-ratio.tsx` | 2 (IDENTICAL) | braden, crm7 |
| `avatar.tsx` | 2 | braden, crm7 |
| `breadcrumb.tsx` | 2 | braden, crm7 |
| `carousel.tsx` | 2 | braden, crm7 |
| `chart.tsx` | 2 | braden, crm7 |
| `collapsible.tsx` | 2 | braden, crm7 |
| `context-menu.tsx` | 2 | braden, crm7 |
| `drawer.tsx` | 2 | braden, crm7 |
| `hover-card.tsx` | 2 | braden, crm7 |
| `input-otp.tsx` | 2 | braden, crm7 |
| `menubar.tsx` | 2 | braden, crm7 |
| `navigation-menu.tsx` | 2 | braden, crm7 |
| `progress.tsx` | 2 | braden, crm7 |
| `sidebar.tsx` | 2 | braden, crm7 |
| `switch.tsx` | 3 | braden, business-suite-unified, crm7 |
| `table.tsx` | 2 | braden, crm7 |
| `toast.tsx` | 2 | braden, crm7 |
| `toaster.tsx` | 2 | braden, crm7 |
| `toggle-group.tsx` | 2 | braden, crm7 |
| `toggle.tsx` | 2 | braden, crm7 |

**Classification:** `DUPLICATE_CONSOLIDATE` — these are shadcn/ui primitives that should live in `@bsuite/ui`. The `packages/ui` package exists and already hosts `BrandingCard.tsx`, `ColorEditorSheet.tsx`, `OklchColorPicker.tsx`, `Logo.tsx`, and `StatusBadge.tsx`.

---

### 1.4 Platform / Layout Components (DUPLICATE_CONSOLIDATE)

| Component | Copies | Apps |
|---|---|---|
| `AppSidebar.tsx` | 3 | crm7, R80.3, business-suite-unified |
| `AuthShell.tsx` | 3 | crm7, business-suite-unified, conduit |
| `DashboardShell.tsx` | 2 | crm7, conduit |
| `ErrorBoundary.tsx` | 5 | crm7, R80.3, braden, business-suite-unified, packages/schema-registry |
| `SystemNoticeBanner.tsx` | 5 | crm7, R80.3, braden, business-suite-unified, conduit |
| `ThemeToggle.tsx` | 5 | crm7, R80.3, braden, business-suite-unified, conduit |
| `MarketingHome.tsx` | 3 | crm7, R80.3, business-suite-unified |
| `PageGridPage.tsx` | 4 | crm7, R80.3, braden, business-suite-unified |
| `CustomPageRenderer.tsx` | 6 | crm7 (×2), R80.3, braden, business-suite-unified, conduit |
| `EmptyState.tsx` | 6 | crm7 (×2), R80.3, business-suite-unified (×2), conduit |
| `CommandPalette.tsx` | 4 | crm7 (×2), business-suite-unified, packages/schema-builder |
| `DataTable.tsx` | 4 | crm7 (×2), business-suite-unified, packages/schema-registry |
| `DeveloperToolbar.tsx` | 2 | crm7, business-suite-unified |
| `PageEditorLauncher.tsx` | 2 | crm7, business-suite-unified |
| `PermissionGate.tsx` | 2 | crm7, conduit |
| `SortableItem.tsx` | 2 | crm7, R80.3 |
| `SortableList.tsx` | 2 | crm7, business-suite-unified |
| `InstallPrompt.tsx` | 2 | crm7, R80.3 |
| `PWAUpdatePrompt.tsx` | 2 | crm7, R80.3 |
| `KanbanColumn.tsx` | 2 | braden, conduit |
| `CardSkeleton.tsx` | 2 | business-suite-unified, conduit |
| `TableSkeleton.tsx` | 2 | business-suite-unified, conduit |
| `FieldError.tsx` | 2 | business-suite-unified, conduit |
| `StatusBadge.tsx` | 3 | crm7, conduit, packages/theme |
| `PdfViewer.tsx` | 2 | crm7, conduit |
| `SignDocumentFlow.tsx` | 2 | crm7, conduit |

**Classification:** `DUPLICATE_CONSOLIDATE` — highest-priority consolidation targets: `ErrorBoundary` (5 copies), `SystemNoticeBanner` (5 copies), `ThemeToggle` (5 copies), `CustomPageRenderer` (6 copies), `EmptyState` (6 copies).

---

### 1.5 Uplift Component Suite — crm7 ↔ business-suite-unified (DUPLICATE_CONSOLIDATE)

| Component | crm7 path | BSU path | Status |
|---|---|---|---|
| `FilterBar.tsx` | `src/components/uplift/FilterBar.tsx` | `src/components/uplift/FilterBar.tsx` | Similar |
| `LivePreview.tsx` | `src/components/uplift/LivePreview.tsx` | `src/components/uplift/LivePreview.tsx` | Similar |
| `PermissionMatrix.tsx` | `src/components/uplift/PermissionMatrix.tsx` | `src/components/uplift/PermissionMatrix.tsx` | SIMILAR |
| `Picker.tsx` | `src/components/uplift/Picker.tsx` | `src/components/uplift/Picker.tsx` | Similar |
| `ScopeSelect.tsx` | `src/components/uplift/ScopeSelect.tsx` | `src/components/uplift/ScopeSelect.tsx` | Similar |
| `StepperShell.tsx` | `src/components/uplift/StepperShell.tsx` | `src/components/uplift/StepperShell.tsx` | SIMILAR |
| `TechnicalDetails.tsx` | `src/components/uplift/TechnicalDetails.tsx` | `src/components/uplift/TechnicalDetails.tsx` | **IDENTICAL** |
| `TrackChanges.tsx` | `src/components/uplift/TrackChanges.tsx` | `src/components/uplift/TrackChanges.tsx` | **IDENTICAL** |
| `_pending.tsx` | `src/components/uplift/_pending.tsx` | `src/components/uplift/_pending.tsx` | SIMILAR |

---

### 1.6 R80.3 ↔ crm7 Component Duplicates (DUPLICATE_CONSOLIDATE)

| Component | crm7 path | R80.3 path |
|---|---|---|
| `AwardRateSelector.tsx` | `src/components/entity/selectors/AwardRateSelector.tsx` | `crm7/src/components/entity/selectors/AwardRateSelector.tsx` |
| `FairWorkUpdateNotification.tsx` | `src/components/fair-work/FairWorkUpdateNotification.tsx` | `crm7/src/components/fair-work/FairWorkUpdateNotification.tsx` |
| `SourcePicker.tsx` | `src/components/chargeCalc/SourcePicker.tsx` | `src/components/chargeCalc/SourcePicker.tsx` |

---

### 1.7 Duplicate Hooks Summary (DUPLICATE_CONSOLIDATE)

| Hook | Copies | Apps |
|---|---|---|
| `useDateFormatPreference.ts` | 5 | crm7, R80.3, braden, business-suite-unified, conduit |
| `usePermissions.ts` | 4 | crm7, R80.3, business-suite-unified, conduit |
| `useTenantBranding.ts` | 4 | crm7, R80.3, braden, business-suite-unified |
| `useSystemNotices.ts` | 4 | crm7, R80.3, braden, business-suite-unified |
| `usePlatformRole.ts` | 3 | crm7, R80.3, conduit |
| `useTenantSettings.ts` | 3 | crm7, R80.3, business-suite-unified |
| `useToast.ts` | 2 | crm7, braden |
| `useMobile.tsx` | 2 | braden, business-suite-unified |
| `useBranding.ts` | 2 | crm7, business-suite-unified |
| `useChargeCalcResolvers.ts` | 2 | crm7, R80.3 |
| `useScopedPreference.ts` | 2 | R80.3, business-suite-unified |
| `useSubscription.ts` | 2 | R80.3, business-suite-unified |
| `useTenantId.ts` | 2 | crm7, conduit |
| `useAIChat.ts` | 2 | crm7, conduit |

---

### 1.8 Duplicate Lib/Service Files (DUPLICATE_CONSOLIDATE)

| File | Copies | Apps |
|---|---|---|
| `schemaBuilderService.ts` | 5 | crm7, R80.3, braden, business-suite-unified, conduit |
| `logger.ts` | 5 | crm7, R80.3, braden, business-suite-unified, conduit |
| `business-suite-oauth.ts` | 4 | crm7, R80.3, braden, conduit |
| `supabase.ts` | 2 | crm7, business-suite-unified |
| `sentry.ts` | 3 | crm7, R80.3, business-suite-unified |
| `queryClient.ts` | 3 | crm7, R80.3, braden |
| `utils.ts` | 6 | crm7 (×2), R80.3, braden, business-suite-unified, conduit |
| `nav-utils.ts` | 3 | crm7, business-suite-unified, conduit |
| `branding-sanitize.ts` | 2 | crm7, business-suite-unified |
| `offline-db.ts` | 2 | crm7, R80.3 |
| `permissionConstants.ts` | 2 | crm7, conduit |
| `roleMappingService.ts` | 2 | crm7, conduit |
| `documentService.ts` | 2 | crm7, business-suite-unified |
| `documentSigner.ts` | 2 | crm7, conduit |
| `emailService.ts` | 2 | crm7, braden |
| `analyticsService.ts` | 2 | business-suite-unified, conduit |
| `chargeCalcSourceAdapters.ts` | 2 | crm7, R80.3 |
| `permissionsService.ts` | 2 | R80.3, business-suite-unified |
| `publicHolidays.ts` | 2 | crm7, R80.3 |
| `navigation.ts` | 2 | crm7, braden |
| `notificationService.ts` | 2 | braden, business-suite-unified |
| `EntityTableWidget.tsx` | 2 | crm7, business-suite-unified |
| `WidgetPalette.tsx` | 2 | crm7, business-suite-unified |
| `widgetRegistry.tsx` | 2 | crm7, business-suite-unified |
| `jodie-persona.ts` | 2 | crm7, conduit |
| `model-router.ts` | 2 | crm7, conduit |
| `charge-calculator-mapd.jsx` | 1 (orphan) | root — 94 KB standalone file, zero references |

---

## 2. Dead Files — Zero Production Importers

### 2.1 SAFE_DELETE — Verified Zero Importers

These files have zero import statements referencing them anywhere in the codebase (excluding their own test files, if any).

#### 2.1.1 throughput app — 23 dead files (SAFE_DELETE)

The `throughput` app is **excluded** from all root-level CI scripts (`lint:all`, `test:all`, `build:all`, `typecheck:all`). The following files have zero importers even within the `throughput` app itself:

| File | Size (bytes) |
|---|---|
| `throughput/src/TestComponent.tsx` | 1,188 |
| `throughput/src/components/BlobDemo.tsx` | 11,176 |
| `throughput/src/components/SupabaseSetup.tsx` | 5,533 |
| `throughput/src/hooks/useDataFetching.ts` | 8,382 |
| `throughput/src/hooks/useErrorHandling.ts` | 1,704 |
| `throughput/src/hooks/useMemoizedCallback.ts` | 1,596 |
| `throughput/src/hooks/useProjects.ts` | 1,882 |
| `throughput/src/hooks/useRealtimeUpdates.ts` | 1,338 |
| `throughput/src/lib/agents/businessPlanAgent.ts` | 8,487 |
| `throughput/src/lib/agents/researchAgent.ts` | 4,916 |
| `throughput/src/lib/auth-mfa.ts` | 7,656 |
| `throughput/src/lib/batchRequests.ts` | 1,550 |
| `throughput/src/lib/imageOptimization.ts` | 4,976 |
| `throughput/src/lib/performanceMonitor.ts` | 6,688 |
| `throughput/src/lib/rateLimiting.ts` | 10,199 |
| `throughput/src/pages/IdeaRefinement.tsx` | 6,892 |
| `throughput/src/pages/TodoExample.tsx` | 4,362 |
| `throughput/src/pages/TodosHookExample.tsx` | 5,694 |
| `throughput/src/utils/projectUtils.ts` | 0 (empty file) |

**Evidence:** `rg` search for each filename within `throughput/src` returned zero results excluding self-references. Root `package.json` `lint:all` script: `for dir in crm7 R80.3 braden business-suite-unified conduit` — throughput is not listed.

---

#### 2.1.2 tenantRoutes.ts — 5 copies, zero code importers (SAFE_DELETE)

| File | Size (bytes) |
|---|---|
| `crm7/src/config/tenantRoutes.ts` | 160 |
| `R80.3/src/config/tenantRoutes.ts` | 72 |
| `braden/src/config/tenantRoutes.ts` | 60 |
| `business-suite-unified/src/config/tenantRoutes.ts` | 1,085 |
| `conduit/src/config/tenantRoutes.ts` | 94 |

**Evidence:** `rg "tenantRoutes"` across repo (excluding `node_modules`, `*.md`, `*.json`) returned only:
- `business-suite-unified/src/config/__tests__/tenantRoutes.test.ts` (test file)
- `docs/dashboard/index.html` and `docs/dashboard/data/dashboard-data.json` (dashboard data, not code)

No production code imports `TENANT_LAYOUT_ROUTES` from any of these files.

---

#### 2.1.3 braden admin/CMS components — 14 dead files (SAFE_DELETE)

These braden admin components have zero importers outside their own files:

| File | Size (bytes) |
|---|---|
| `braden/src/components/ShareModal.tsx` | 2,546 |
| `braden/src/components/admin/AdminLayout.tsx` | 4,997 |
| `braden/src/components/admin/ContentTabs.tsx` | 1,628 |
| `braden/src/components/admin/DeveloperAdminDashboard.tsx` | 14,796 |
| `braden/src/components/admin/SiteEditor/ClientsCard.tsx` | 1,904 |
| `braden/src/components/admin/SiteEditor/EmailsCard.tsx` | 1,860 |
| `braden/src/components/admin/SiteEditor/LeadsCard.tsx` | 1,819 |
| `braden/src/components/admin/SiteEditor/StaffCard.tsx` | 1,863 |
| `braden/src/components/admin/SiteEditor/TasksCard.tsx` | 1,837 |
| `braden/src/components/admin/SiteSettingsManager.tsx` | 20,597 |
| `braden/src/components/admin/editor/DndLayoutEditor.tsx` | 29,161 |
| `braden/src/components/admin/images/ImageGallery.tsx` | 2,180 |
| `braden/src/pages/admin/CMSManager.tsx` | 15,443 |
| `braden/src/pages/admin/ContentEditor.tsx` | 4,128 |

**Evidence:** braden's `Routes.tsx` only lazy-imports `BrandingAdmin` and `PageBuilder` from `@/pages/admin/`. All other `/admin/*` paths redirect to the BSuite Developer Portal. These CMS/SiteEditor components are remnants of the old braden admin portal.

---

#### 2.1.4 braden demo/misc components (SAFE_DELETE)

| File | Size (bytes) |
|---|---|
| `braden/src/components/demo/BlobStorageDemo.tsx` | 8,831 |
| `braden/src/components/demo/NotesDemo.tsx` | 6,779 |
| `braden/src/components/media/MediaManagerCard.tsx` | 1,489 |
| `braden/src/components/navigation/ServicesDropdown.tsx` | 1,588 |
| `braden/src/hooks/useBannerOffset.ts` | 1,647 |
| `braden/src/lib/theme-utils.ts` | 200 |

---

#### 2.1.5 crm7 dead components (SAFE_DELETE)

| File | Size (bytes) | Notes |
|---|---|---|
| `crm7/src/components/EnvironmentValidator.tsx` | 7,457 | Zero importers |
| `crm7/src/components/UsiInput.tsx` | 4,539 | Zero importers |
| `crm7/src/components/accessibility/AccessibilityControls.tsx` | 7,364 | Zero importers |
| `crm7/src/components/compliance/StandardDetail.tsx` | 7,014 | Zero importers |
| `crm7/src/components/demos/OneShotEntryDemo.tsx` | 15,693 | Zero importers |
| `crm7/src/components/funding/ClaimStatusBadge.tsx` | 2,225 | Zero importers |
| `crm7/src/components/route-parameter-validator.tsx` | 3,715 | Zero importers |
| `crm7/src/components/route-validator.tsx` | 3,858 | Zero importers |
| `crm7/src/components/timesheets/WorkTypeSelect.tsx` | 1,701 | Zero importers |
| `crm7/src/components/ui/data-grid.tsx` | 6,512 | Zero importers |
| `crm7/src/components/ui/form-fields.tsx` | 11,852 | Zero importers |
| `crm7/src/components/ui/theme-toggle.tsx` | 3,018 | Zero importers — superseded by `ThemeToggle.tsx` |

---

#### 2.1.6 crm7 dead lib/service files (SAFE_DELETE)

| File | Size (bytes) | Notes |
|---|---|---|
| `crm7/src/lib/au-funding-constants.ts` | 3,804 | Zero importers |
| `crm7/src/lib/claim-amount-calculator.ts` | 4,566 | Zero importers |
| `crm7/src/lib/communicationSender.ts` | 4,409 | Zero importers |
| `crm7/src/lib/eligibility-checker.ts` | 11,676 | Zero importers |
| `crm7/src/lib/fairwork/configSchema.ts` | 3,848 | Zero importers |
| `crm7/src/lib/integrations/stateAuthorities/dtwdValidation.ts` | 21,547 | Zero importers |
| `crm7/src/lib/milestone-scheduler.ts` | 5,306 | Zero importers |
| `crm7/src/lib/ownership-map-helper.ts` | 8,149 | Zero importers |
| `crm7/src/lib/payroll/providerCredentials.ts` | 4,168 | Zero importers |
| `crm7/src/lib/pipelines/xeroPayrollAdapter.ts` | 13,685 | Zero importers |
| `crm7/src/lib/wageScheduleService.ts` | 3,358 | Zero importers |
| `crm7/src/services/wageSnapshotService.ts` | 9,272 | Zero importers |
| `crm7/src/pages/hosts/hostSurfaceUtils.ts` | 2,813 | Zero importers |
| `crm7/src/pages/timesheets/listFilters.ts` | 1,286 | Zero importers |
| `crm7/src/pages/fair-work-api-test.tsx` | 3,044 | Zero importers — dev test page |

---

#### 2.1.7 crm7 AVETMISS NAT formatters — test-only (SAFE_DELETE candidate, verify intent)

| File | Size (bytes) |
|---|---|
| `crm7/src/lib/avetmiss/formatNat00010.ts` | 2,151 |
| `crm7/src/lib/avetmiss/formatNat00020.ts` | 1,570 |
| `crm7/src/lib/avetmiss/formatNat00030.ts` | 2,290 |
| `crm7/src/lib/avetmiss/formatNat00060.ts` | 1,791 |
| `crm7/src/lib/avetmiss/formatNat00080.ts` | 1,597 |
| `crm7/src/lib/avetmiss/formatNat00085.ts` | 1,474 |
| `crm7/src/lib/avetmiss/formatNat00090.ts` | 2,042 |
| `crm7/src/lib/avetmiss/formatNat00120.ts` | 1,138 |
| `crm7/src/lib/avetmiss/formatNat00130.ts` | 1,298 |
| `crm7/src/lib/avetmiss/nat00100.ts` | 2,808 |

**Evidence:** These files are only imported by `crm7/src/lib/avetmiss/__tests__/formatters.test.ts`. No production code imports them. No `index.ts` barrel exists in the `avetmiss/` directory. The AVETMISS feature is documented in `docs/20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00W.md` but the export pipeline is not wired into any page or service.

**Classification:** `NOT_DEAD_IMPLEMENT` — code is written and tested but the feature is incomplete (no production consumer). Do NOT delete without confirming the AVETMISS export feature is abandoned.

---

#### 2.1.8 crm7 superseded components (SAFE_DELETE)

| File | Size (bytes) | Superseded by |
|---|---|---|
| `crm7/src/components/reports/ReportFilterForm.tsx` | 15,128 | `SchemaDrivenFilterForm.tsx` (imported by `pages/reports/[key].tsx`) |
| `crm7/src/components/apprentices/ApprenticePlacementForm.tsx` | 16,553 | Only imported by its own test file — no page uses it |
| `crm7/src/components/apprentices/ApprenticePlacementTransitionDialog.tsx` | 10,238 | Zero importers |
| `crm7/src/components/filter-bar.tsx` | 2,131 | Referenced only in comments |
| `crm7/src/components/financial/report-form-dialog.tsx` | 14,432 | Referenced only in eslint.config.js override |
| `crm7/src/components/invoices/InvoiceLineItemBuilder.tsx` | 12,666 | Referenced only in eslint.config.js override |
| `crm7/src/components/navigation/CRM7Navigation.tsx` | 3,430 | Referenced only in `config/navigation.ts` comment |
| `crm7/src/lib/invoicing/renderInvoicePdf.ts` | 18,234 | Referenced only in eslint.config.js override |

**Classification:** `SAFE_DELETE` for `ReportFilterForm.tsx` (superseded). For eslint-referenced files, verify the eslint overrides can be removed alongside the files.

---

#### 2.1.9 R80.3 dead files (SAFE_DELETE)

| File | Size (bytes) | Notes |
|---|---|---|
| `R80.3/src/components/ImportCalculations.tsx` | 5,469 | Zero importers |
| `R80.3/src/context/CalculatorContext.tsx` | 14,054 | Zero importers |
| `R80.3/src/lib/ai/fundingOffsetTool.ts` | 5,152 | Zero importers — referenced only in docs |
| `R80.3/src/services/chargeRateScheduleService.ts` | 9,934 | Zero importers — referenced only in SQL migration comments |
| `R80.3/src/services/invoicingService.ts` | 61,784 | Zero importers — referenced only in SQL migration + docs |

---

#### 2.1.10 Other dead files (SAFE_DELETE)

| File | Size (bytes) | Notes |
|---|---|---|
| `business-suite-unified/src/lib/dbSchemaToZod.ts` | 4,427 | Zero importers |
| `conduit/src/lib/whs/safety-alert.ts` | 12,974 | Zero importers |
| `packages/schema-registry/src/react/WidgetRenderer.tsx` | 4,404 | Zero importers |
| `packages/ui/src/primitives.stories.tsx` | 3,460 | Storybook story — zero importers |
| `packages/nav-core/src/cookieStorage.ts` | 11 | 11-byte file — likely empty stub |
| `charge-calculator-mapd.jsx` (root) | 94,443 | Standalone 94 KB JSX file at repo root — zero references anywhere |

---

#### 2.1.11 Type declaration files (.d.ts) — ambient (SAFE_DELETE if unused)

| File | Size (bytes) | Notes |
|---|---|---|
| `crm7/src/types/sql.js.d.ts` | 982 | Ambient type declaration for sql.js — zero code importers |
| `crm7/src/vitest.d.ts` | 84 | Vitest ambient types |
| `packages/page-builder/src/globals.d.ts` | 582 | Global type declarations |
| `packages/schema-builder/src/css.d.ts` | 47 | CSS module type declaration |
| `packages/schema-builder/src/globals.d.ts` | 23 | Global type declarations |

**Classification:** `SAFE_DELETE` only if the ambient types they provide are not picked up by `tsconfig.json` includes. Verify via `tsc --noEmit` before deleting.

---

#### 2.1.12 Test fixture files (review for SAFE_DELETE)

| File | Size (bytes) | Notes |
|---|---|---|
| `crm7/src/lib/awards/test-fixtures.ts` | 10,418 | Zero importers outside test files |
| `packages/charge-calc/src/__tests__/boot/fixtures/building-award.ts` | 2,992 | Test fixture |
| `packages/charge-calc/src/__tests__/boot/fixtures/sample-ea-fail.ts` | 2,801 | Test fixture |
| `packages/charge-calc/src/__tests__/boot/fixtures/sample-ea-marginal.ts` | 2,964 | Test fixture |
| `packages/charge-calc/src/__tests__/boot/fixtures/sample-ea-pass.ts` | 3,202 | Test fixture |

**Classification:** Verify these fixtures aren't imported by any test file via a barrel. If truly orphaned, `SAFE_DELETE`.

---

## 3. TODO/FIXME Stubs — Feature-Blocking

### 3.1 NOT_DEAD_IMPLEMENT — WHS Table/Edge Function Stubs

These components exist but are blocked by missing database tables. The code is NOT dead — it's incomplete:

| File | Line | TODO | Blocks |
|---|---|---|---|
| `crm7/src/components/whs/workflow-automation-manager.tsx` | 138 | `TODO: Create whs_workflow_triggers table` | WHS workflow automation |
| `crm7/src/components/whs/workflow-automation-manager.tsx` | 159 | `TODO: Implement WHS workflow execution via Edge Function` | WHS workflow execution |
| `crm7/src/components/whs/workflow-automation-manager.tsx` | 181 | `TODO: Create whs_workflow_tasks table` | WHS workflow tasks |
| `crm7/src/components/whs/new-risk-assessment-form.tsx` | 138 | `TODO: Create whs_risk_assessments table` | Risk assessment CRUD |
| `crm7/src/components/whs/inspection-schedule-manager.tsx` | 116 | `TODO: Create whs_inspection_schedule table` | Inspection scheduling |
| `crm7/src/components/whs/inspection-schedule-manager.tsx` | 137 | `TODO: Implement inspection reminders via Edge Function` | Inspection reminders |
| `crm7/src/components/whs/training-module-manager.tsx` | 89 | `TODO: Create whs_training_modules table` | Training module CRUD |
| `crm7/src/components/whs/enhanced-reporting-manager.tsx` | 126 | `TODO: Implement WHS report execution via Edge Function` | WHS report execution |
| `crm7/src/components/whs/enhanced-reporting-manager.tsx` | 165 | `TODO: Implement scheduled report execution via Edge Function` | Scheduled reports |

**Classification:** `NOT_DEAD_IMPLEMENT` — the React components are written and likely rendered, but the backing DB tables and edge functions don't exist. These block WHS module completion.

---

### 3.2 NOT_DEAD_IMPLEMENT — VET Qualification Unit Structure

| File | Line | TODO |
|---|---|---|
| `crm7/src/pages/vet/qualifications/[id]/structure.tsx` | 194 | `TODO: Create qualification_unit_structure table` |
| `crm7/src/pages/vet/qualifications/[id]/structure.tsx` | 221 | `TODO: Delete from qualification_unit_structure table` |
| `crm7/src/pages/vet/qualifications/[id]/structure.tsx` | 250 | `TODO: Update order in qualification_unit_structure table` |

**Classification:** `NOT_DEAD_IMPLEMENT` — the page exists and is lazy-loaded in `App.tsx`, but the backing table doesn't exist.

---

### 3.3 NOT_DEAD_IMPLEMENT — AI Assistant Upgrade Flow

| File | Line | TODO |
|---|---|---|
| `crm7/src/components/ai/AIAssistant.tsx` | 153 | `TODO: Implement upgrade flow` |

**Classification:** `NOT_DEAD_IMPLEMENT` — the AI assistant component is used, but the upgrade flow is stubbed.

---

### 3.4 NOT_DEAD_IMPLEMENT — EnhancedDataContext Placeholder

| File | Line | TODO |
|---|---|---|
| `crm7/src/contexts/EnhancedDataContext.tsx` | 6 | `TODO: Replace with real implementation when one-shot entry features are built.` |

**Classification:** `NOT_DEAD_IMPLEMENT` — context exists but is a placeholder per its own comment.

---

### 3.5 NOT_DEAD_IMPLEMENT — Financial Summary Aggregation

| File | Line | TODO |
|---|---|---|
| `crm7/src/components/dashboard/financial-summary.tsx` | 65 | `TODO: Implement Supabase Edge Function for financial summary aggregation` |

**Classification:** `NOT_DEAD_IMPLEMENT` — dashboard component exists but aggregation backend is stubbed.

---

### 3.6 NOT_DEAD_IMPLEMENT — Conduit STA Parser Stubs

| File | Status |
|---|---|
| `conduit/src/lib/recruitment/staParsers/nsw.ts` | STUB — format unconfirmed |
| `conduit/src/lib/recruitment/staParsers/act.ts` | STUB — format unconfirmed |
| `conduit/src/lib/recruitment/staParsers/vic.ts` | STUB — format unconfirmed |
| `conduit/src/lib/recruitment/staParsers/qld.ts` | STUB — format unconfirmed |
| `conduit/src/lib/recruitment/staParsers/sa.ts` | STUB — format unconfirmed |
| `conduit/src/lib/recruitment/staParsers/tas.ts` | STUB — format unconfirmed |

**Classification:** `NOT_DEAD_IMPLEMENT` — these are 6 state/territory STA (State Training Authority) parser stubs for conduit#338. The files exist and are likely imported by a barrel, but the parser logic is not implemented (format unconfirmed).

---

### 3.7 Other Notable TODOs (Technical Debt, Not Blocking)

| File | Line | TODO | Category |
|---|---|---|---|
| `supabase/functions/charge-calc/index.ts` | 29 | `TODO: Import calculate from shared package when Deno npm support is stable` | Technical debt |
| `packages/schema-registry/src/react/widgets/SchemaFieldAdder.tsx` | 44 | `TODO(W1-C): The add_tenant_field_definition(...)` RPC not wired | Feature incomplete |
| `business-suite-unified/src/components/ui/Logo.tsx` | 1 | `TODO: move to @bsuite/ui once packages/ui is set up` | Consolidation debt |
| `business-suite-unified/src/lib/forms/zodResolverV4.ts` | 1 | `TODO: Promote to @bsuite/forms if crm7/R80.3 hit the same TS2769` | Consolidation debt |
| `crm7/src/hooks/useTenantBranding.ts` | 18 | `TODO: remove this alias after every call site has migrated` | Migration debt |
| `business-suite-unified/src/hooks/useTenantBranding.ts` | 18 | `TODO: remove this alias after every call site has migrated` | Migration debt |
| `crm7/src/components/platform/pageGridLayoutAdapter.tsx` | 38 | `TODO(crm7#526): remove this cast once @bsuite/page-builder exports compactType` | Package API debt |
| `crm7/src/services/emailService.ts` | 584 | `TODO: Create the DB function:` | Feature incomplete |
| `crm7/api/ai/chat.ts` | 149 | `TODO: Replace with actual DB lookup once permission tables are in place.` | Feature incomplete |
| `crm7/src/components/ui/chart.tsx` | 101, 247 | `TODO(bsuite#215): migrate to typed Recharts Tooltip/Legend content slot API` | Type safety debt |
| `business-suite-unified/src/lib/page-builder/EntityTableWidget.tsx` | 112 | `TODO(@bsuite/schema-registry@1.0.0): replace this inline useQuery` | Package upgrade debt |
| `crm7/src/pages/placements/create.tsx` | 88 | `TODO(crm7-placement-charge-calc-v2): once charge-calc ≥0.2.4` | Version dependency |
| `crm7/src/hooks/usePlacementChargeCalc.ts` | 61 | `TODO(crm7-placement-rdo): once charge-calc ≥0.2.4 ships` | Version dependency |

---

## 4. Orphaned Standalone File

### 4.1 charge-calculator-mapd.jsx (SAFE_DELETE)

| Property | Value |
|---|---|
| Path | `charge-calculator-mapd.jsx` (repo root) |
| Size | 94,443 bytes (~94 KB) |
| Importers | **Zero** — not referenced anywhere in the codebase |
| Classification | `SAFE_DELETE` |

**Evidence:** `rg -l "charge-calculator-mapd"` across the entire repo (excluding `node_modules`, `*.md`) returned zero results. This is a standalone 94 KB JSX file at the repo root that appears to be an early prototype of the MAPD charge calculator. The production calculator lives in `R80.3/src/` and `packages/charge-calc/`.

---

## 5. Summary by Classification

### SAFE_DELETE — 102 files (~45 KB removable)

| Category | Files | Est. Size |
|---|---|---|
| throughput dead files | 19 | ~92 KB |
| tenantRoutes.ts (5 copies) | 5 | ~1.5 KB |
| braden admin/CMS remnants | 14 | ~107 KB |
| braden demo/misc components | 6 | ~21 KB |
| crm7 dead components | 12 | ~75 KB |
| crm7 dead lib/services | 15 | ~93 KB |
| R80.3 dead files | 5 | ~96 KB |
| Other dead files | 6 | ~39 KB |
| .d.ts ambient types | 5 | ~1.7 KB |
| Test fixtures (orphaned) | 5 | ~15 KB |
| charge-calculator-mapd.jsx | 1 | ~94 KB |
| Superseded components | 8 | ~94 KB |
| AVETMISS (test-only) | 10 | ~16 KB |

### DUPLICATE_CONSOLIDATE — 39 component groups + 48 hook/lib groups

| Category | Groups | Total copies |
|---|---|---|
| LocalisedDateInput + hook | 2 groups | 11 copies |
| AI assistant suite | 15 groups | 30 copies |
| UI primitives (shadcn/ui) | 23 groups | 48 copies |
| Platform/layout components | 26 groups | 72 copies |
| Uplift components | 9 groups | 18 copies |
| Hooks | 14 groups | 42 copies |
| Lib/service files | 24 groups | 60 copies |

### NOT_DEAD_IMPLEMENT — 20 blocking stubs

| Category | Count |
|---|---|
| WHS table/edge function stubs | 9 |
| VET qualification unit structure | 3 |
| AI upgrade flow | 1 |
| EnhancedDataContext placeholder | 1 |
| Financial summary aggregation | 1 |
| Conduit STA parser stubs | 6 |

---

## 6. Methodology

### Dead file detection

1. Collected all `.ts`/`.tsx` source files across all apps and `packages/*` (excluding `node_modules`, `.next`, `dist`, test files).
2. Extracted all import specifiers from `import ... from '...'` and `export ... from '...'` statements via `rg`.
3. Built a set of importable identifiers (last path component, stripped of extensions).
4. For each source file, checked if its basename appears in any import specifier.
5. For files not found, performed a secondary verification: searched for the file's path fragment (e.g., `reports/deliveries`) in all `.ts`/`.tsx` files to catch lazy-loaded imports.
6. Excluded entry points (`App.tsx`, `main.tsx`, `index.ts`, `page.tsx`, `layout.tsx`, etc.) and config files.
7. Excluded files that are only imported by test files (these are test-only, not dead — flagged separately).

### Duplicate detection

1. Collected all `.tsx`/`.ts` files from `src/components`, `src/features`, `src/hooks`, `src/lib`, `src/utils`, `src/services` across all apps.
2. Grouped by basename. Flagged groups where the same basename exists in 2+ different apps.
3. For each group, computed a file signature (file size + first 20 non-empty, non-comment lines) to classify as `IDENTICAL`, `SIMILAR` (within 20% size difference), or `NAME_COLLISION` (different implementations).
4. Only `IDENTICAL` and `SIMILAR` pairs are reported as duplicates.

### Limitations

- **Barrel exports:** Files exported via `index.ts` barrel files may appear as "dead" if the barrel is the only importer. The secondary path-fragment search mitigates this but may miss some edge cases.
- **Dynamic imports:** `import()` calls were searched, but complex dynamic path construction (e.g., `import(\`./modules/${name}\`)`) would not be detected.
- **Storybook:** `.stories.tsx` files are only consumed by Storybook's build pipeline, not by app code. They are flagged but should not be deleted unless Storybook is removed.
- **Test-only files:** Files imported only by their own co-located test file are flagged as "test-only" rather than dead, but the distinction is heuristic.

---

## 7. Recommended Next Steps (Not for This Lane)

> **This audit is READ-ONLY.** No files were deleted or modified. The following recommendations are for a separate cleanup lane.

1. **Phase 1 — Safe deletions:** Start with `charge-calculator-mapd.jsx` (94 KB, zero refs), `throughput` dead files (19 files, 92 KB), `tenantRoutes.ts` (5 copies), and braden admin remnants (14 files, 107 KB). Run `pnpm tsc --noEmit` + `pnpm test -- --run` after each batch.
2. **Phase 2 — Package extraction:** Extract `LocalisedDateInput` + `useDateFormatPreference` to `@bsuite/dates` or `@bsuite/ui`. Extract AI assistant suite to `@bsuite/ai`. Extract shadcn/ui primitives to `@bsuite/ui`.
3. **Phase 3 — AVETMISS wiring:** Either wire the NAT format files into a production export service, or mark them as `NOT_DEAD_IMPLEMENT` and track in the feature inventory.
4. **Phase 4 — WHS stubs:** Create the missing DB tables (`whs_workflow_triggers`, `whs_workflow_tasks`, `whs_risk_assessments`, `whs_inspection_schedule`, `whs_training_modules`) and implement the edge function stubs.
5. **Phase 5 — STA parsers:** Confirm the format for each state/territory STA parser and implement the stubs in conduit.

---

*End of audit.*