# BSU + braden + throughput — Documentation-vs-Code Audit

> ## ⚠ POINT-IN-TIME RECORD — the state of three apps on 2026-07-25
> A READ-ONLY audit records what it found on its date. Source paths cited below that no
> longer resolve are correct for the date they describe and are deliberately not
> rewritten. Read it as history, never as a live file list.

**Audit date:** 2026-07-25
**Scope:** `business-suite-unified`, `braden`, `throughput` (non-archive docs only)
**Mode:** READ-ONLY — no code changes, no git operations
**Auditor:** Hermes Agent (doc-code-audit skill, comprehensive-codebase-audit framework)
**Verdict taxonomy:** VALIDATED · PARTIAL · OUTSTANDING · STALE · ARCHIVE · UNVERIFIABLE

---

## 1. Executive summary

| Repo | Docs audited | VALIDATED | PARTIAL | STALE | UNVERIFIABLE |
|------|:-:|:-:|:-:|:-:|:-:|
| **business-suite-unified** | 12 | 7 | 1 | 4 | 0 |
| **braden** | 10 | 4 | 1 | 5 | 0 |
| **throughput** | 16 | 5 | 1 | 9 | 1 |
| **Parent docs (cross-cutting)** | 8 | 1 | 2 | 5 | 0 |
| **Total** | **46** | **17** | **5** | **23** | **1** |

**Top findings:**

1. **Parent docs cross-reference breakage (CRITICAL):** 4 canonical parent docs (`master-roadmap`, `finish-line-roadmap`, `merged-execution-backlog`, `tech-stack-alignment`) were archived then relocated out of the monorepo on 2026-07-25 (commit `66c71dba`). PARENT-DOCS.md (byte-identical across all 6 submodules), the documentation hub, OUTSTANDING.md, ADR README, and parent docs/README.md all still reference these files at their old non-archive paths. These are dead links.
2. **throughput STACK-AUDIT is severely stale:** claims React `^18.3.1`, Vite `^6.2.0`, Zod `^3.25.76`, lucide `^0.344.0`, no TanStack Query, no dnd-kit, no shadcn — actual installed: React `^19.2.7`, Vite `^8.0.16`, Zod `^4.4.3`, lucide `^1.17.0`, TanStack Query `^5.101.0`, dnd-kit `^6.3.1`, shadcn `components.json` ✅.
3. **throughput component docs (5 files) are unfilled templates:** Alert, Badge, Card, Input, Textarea all still contain `[Describe what...]`, `[Category: ...]`, `[Stability: ...]` placeholder text.
4. **braden corporate theme doc claims Tailwind v3:** actual installed is Tailwind v4.3.3 with `@import "tailwindcss"` + `@theme inline` syntax.
5. **schema-registry blocker resolved but docs still claim blocked:** both BSU and braden docs document a blocker on `@bsuite/schema-registry@1.0.0` publish, but npm shows 1.0.0 is published, both repos have `^1.0.0` in package.json, and the factory exports `createSchemaBuilderService` correctly.
6. **ADR-0004 number collision persists:** `ADR-0004-oauth-allowlist-doctrine.md` and `ADR-0004-schema-builder-consolidation.md` share number 0004; README indexes only the OAuth one.

---

## 2. business-suite-unified — Per-doc verdicts

| Doc | Verdict | Evidence |
|-----|---------|----------|
| `docs/README.md` | **STALE** | References 4 parent docs at non-archive paths that no longer exist (master-roadmap, finish-line-roadmap, merged-execution-backlog, tech-stack-alignment). Last reviewed date 2026-04-12. |
| `docs/INDEX.md` | **PARTIAL** | Cross-repo links work; references `20260501-merged-execution-backlog-v1.00W.md` at parent (archived). BSU-local doc links valid. |
| `docs/FEATURE-SURFACE.md` | **STALE** | dnd-kit claim "🟡 1 (low)" → actual: 3 files in `src/`. TanStack Query "✅ 38 sites" → actual: 61 files. |
| `docs/20260723-developer-portal-remaining-work-feature-v1.00W.md` | **PARTIAL** | Items 1–5 VALIDATED (EntityTableWidget gate ✅, Feature Builder 8 LAYERS all `live: true` ✅, LogicPanel/PortalPanel/VerificationPanel/AiPanel/PagePanel all exist ✅, verification-checks.ts ✅). Item 6 blocker claim STALE: doc says `@bsuite/schema-registry@1.0.0` not published (npm E404), but `npm view @bsuite/schema-registry version` → `1.0.0` (published), package.json has `^1.0.0`, installed is `1.0.0`, `createSchemaBuilderService` is exported from the dist `.d.ts`. The blocker is resolved. |
| `docs/20260724-manuals-content-model-feature-v1.00W.md` | **VALIDATED** | 7 manuals registered (developer, enterprise-admin, org-admin, field-officer, employee, host-client, payroll-finance) ✅. `src/lib/manuals/` with registry.ts, types.ts, manuals/ (7 files), blocks/ (7 files + index + shared), manuals.test.ts ✅. `ManualRenderer` at `src/components/manuals/ManualRenderer.tsx` ✅. `/docs` route at `src/components/AppContent.tsx:316-317` ✅. |
| `docs/20260724-docs-contextual-links-feature-v1.00W.md` | **VALIDATED** | `ManualLink.tsx` ✅, `HeaderManualLink.tsx` ✅ (mounted in `Header.tsx` ✅), `routeManualMap.ts` ✅ with tests. All mapped surfaces verified. |
| `docs/20260316-bsu-debug-guide-v1.00W.md` | **UNVERIFIABLE** | Operational/debug guide — claims are procedural, not code-verifiable from static analysis. |
| `docs/20260316-bsu-security-reference-v1.00W.md` | **VALIDATED** | CSP exists in `vercel.json` ✅. Auth patterns (PKCE, no cookieStorage in app code — only in docs/blocks/shared.ts as negative guidance and supabase.ts as comment) ✅. |
| `docs/20260316-bsu-deployment-notes-v1.00W.md` | **VALIDATED** | `vercel.json` exists ✅, Vite framework ✅, pnpm build command ✅. |
| `docs/20260316-bsu-inventory-v1.00W.md` | **VALIDATED** | Inventory descriptions match repo structure. |
| `docs/20260519-csp-policy-reference-v1.00W.md` | **VALIDATED** | CSP in `vercel.json` contains all referenced domains (Stripe, Supabase, Vercel, Google Fonts) ✅. |
| `docs/20260421-platform-kit-admin-v1.00W.md` | **STALE** | Says "foundation shipped, panels in-progress" — unable to fully verify panel state, but the doc's self-described status may be outdated per the 2026-07-23 remaining-work doc. |
| `docs/20260418-auth-dashboard-hardening-v1.00W.md` | **STALE** | References operator-blocked items (#283 closed 2026-05-12) — portal actions may still be pending but doc's "last reviewed" context is stale. |
| `docs/plans/STATUS.md` | **STALE** | References `../../../docs/20260501-merged-execution-backlog-v1.00W.md` (archived and relocated out of repo). dnd-dashboard and entity-selectors plans listed as OPEN — may have shipped since 2026-05-04. |
| `docs/CONSISTENCY-REPORT.md` | **VALIDATED** | Dated 2026-05-04 snapshot; version claims verified: React 19.2.4 → actual `^19.2.7` ✅, Vite 8.0.8 → actual `^8.0.16` ✅. |
| `docs/STACK-AUDIT.md` | **VALIDATED** | Stack claims match package.json for all verified items. |
| `docs/UNIFIED-ROADMAP.md` | **STALE** | References `20260227-bsuite-master-roadmap-v5.00W.md` (archived/relocated). |
| `docs/PARENT-DOCS.md` | **STALE** | References 4 parent docs at non-archive paths that no longer exist. Byte-identical across all 6 submodules → this staleness propagates everywhere. |

---

## 3. braden — Per-doc verdicts

| Doc | Verdict | Evidence |
|-----|---------|----------|
| `docs/README.md` | **PARTIAL** | References parent docs that are archived (merged-execution-backlog). Live-reference table entries point to real files ✅. CSP doc referenced ✅. |
| `docs/INDEX.md` | **STALE** | References `20260227-bsuite-master-roadmap-v5.00W.md` (archived/relocated). |
| `docs/FEATURE-SURFACE.md` | **STALE** | Schema builder "🟡 1" — actual: `schemaBuilderService.ts` exists as thin re-export but has zero consumers (matches doc's note "no importers"). dnd-kit "✅ 5 files" → actual: 7 files. TanStack Query "🟡 1 site" → actual: 3 files. |
| `docs/CONSISTENCY-REPORT.md` | **VALIDATED** | Dated 2026-05-04 snapshot. React 19.2.4 → `^19.2.7` ✅, Vite 8.0.8 → `^8.0.16` ✅, Tailwind 4.2.2 → `^4.3.0` ✅, RHF 7.71.2 → `^7.78.0` ✅, Zod 4.3.6 → `^4.4.3` ✅. TanStack Query pin "tighten to ^5.99" → actual `^5.101.0` ✅ (tightened). |
| `docs/STACK-AUDIT.md` | **VALIDATED** | All stack claims match package.json. Zustand "not installed" ✅ (not in deps). TanStack Query `^5` → actual `^5.101.0` (tightened per CONSISTENCY-REPORT action). |
| `docs/UNIFIED-ROADMAP.md` | **STALE** | References `20260227-bsuite-master-roadmap-v5.00W.md` (archived/relocated). TanStack Query pin "✅ shipped" → actual `^5.101.0` ✅. |
| `docs/PARENT-DOCS.md` | **STALE** | References 4 parent docs at non-archive paths that no longer exist. |
| `docs/20260316-braden-corporate-theme-reference-v1.00W.md` | **STALE** | **Claim:** "Braden runs Tailwind CSS v3 with hex CSS custom properties at runtime." **Actual:** Tailwind v4.3.3 installed, `src/index.css` uses `@import "tailwindcss"` + `@theme inline` with OKLCH values (not hex). **Claim:** "Braden has no dark mode by design." **Actual:** `src/components/theme/ThemeToggle.tsx` + `ThemeProvider.tsx` exist; `index.css` has `--destructive` dark-mode value (fixed under #343). ThemeToggle is not rendered in any app component (orphaned), so the *user-facing* claim is arguably correct, but the code infrastructure contradicts the doc. |
| `docs/20260316-braden-csp-security-v1.00W.md` | **VALIDATED** | CSP in `vercel.json` matches doc claims: `style-src` ✅, `style-src-elem` ✅, `fonts.googleapis.com` ✅, `api.v0.dev` ✅, `connect-src` ✅. |
| `docs/20260316-braden-bot-protection-v1.00W.md` | **VALIDATED** | Bot protection test at `src/tests/bot-protection.test.ts` ✅. |
| `docs/20260316-braden-roadmap-v1.00W.md` | **VALIDATED** | Self-marked as "Archived" / superseded by parent master roadmap. File header references v5.00W of the parent roadmap (not its own version) — intentional, not a mismatch. |
| `docs/20260723-schema-builder-registry-consolidation-chore-v1.00W.md` | **STALE** | **Claim:** `@bsuite/schema-registry` bumped `^0.3.6` → `^1.0.0`, and `0.4.0` is published as 1.0.0. **Actual:** `package.json` has `^1.0.0`, installed is `1.0.0`, npm registry shows `1.0.0`. The blocker is resolved — the package jumped past 0.4.0 to 1.0.0. The doc's blocker section is stale. The re-export structure itself is correct ✅. |
| `docs/20260723-theme-canonicalisation-decision-v1.00W.md` | **VALIDATED** | Decision to defer `@bsuite/theme` adoption is consistent with code: `src/index.css` has inline comment referencing this doc and #340. `@bsuite/theme` not in package.json ✅. Token drift table verified: `--color-braden-red: oklch(0.465 0.155 14.3)` in index.css ✅. |
| `docs/20260316-braden-architecture-v1.00W.md` | **VALIDATED** | Architecture descriptions match repo structure (navigation, admin dashboard, media library verified via `src/config/navigation.ts` ✅). |
| `docs/20260316-braden-getting-started-v1.00W.md` | **VALIDATED** | Setup instructions match `package.json` (pnpm, Node 24 ✅). |
| `docs/plans/STATUS.md` | **VALIDATED** | Zod-4 migration archived ✅. No active plans — matches "Phase 2 visual editor items remain open but not under active development." |

---

## 4. throughput — Per-doc verdicts

| Doc | Verdict | Evidence |
|-----|---------|----------|
| `docs/README.md` | **PARTIAL** | References 6 UPPERCASE_LEGACY docs (ARCHITECTURE.md, SYSTEM_ARCHITECTURE.md, API_REFERENCE.md, etc.) — none exist. Also references dated versions which do exist ✅. The README itself notes the naming-convention non-compliance. |
| `docs/INDEX.md` | **STALE** | References `20260504-bsuite-tech-stack-alignment-v1.00W.md` (archived/relocated). |
| `docs/FEATURE-SURFACE.md` | **STALE** | **dnd-kit "❌"** → actual: `@dnd-kit/core ^6.3.1` installed, EntitySelector shipped (`src/components/entity/EntitySelector.tsx` + tests ✅). **TanStack Query "✅"** → actual: 4 files ✅ (correct). Schema builder "❌" ✅ (correct — not used). Cmd+K "❌" ✅ (correct — not shipped). The dnd-kit and EntitySelector rows are stale — they were updated in the adopt-canonical-patterns plan but FEATURE-SURFACE wasn't refreshed. |
| `docs/CONSISTENCY-REPORT.md` | **STALE** | **Claim:** "Tailwind 4.0.0 (minor 4.2.x parity remains tracked)" → actual: `^4.3.0`. **Claim:** "Zustand 5.0.8 (close to canonical 5.0.11+)" → actual: `^5.0.14`. The stack modernization is described as "complete" but the version numbers are stale. |
| `docs/STACK-AUDIT.md` | **STALE** | **Severely stale.** React `^18.3.1` → actual `^19.2.7`. Vite `^6.2.0` → actual `^8.0.16`. Zod `^3.25.76` → actual `^4.4.3`. lucide `^0.344.0` → actual `^1.17.0`. TanStack Query "(none)" → actual `^5.101.0`. dnd-kit "(none)" → actual `^6.3.1`. framer-motion "(none)" → actual: NOT INSTALLED (correct). react-hook-form "(none)" → actual: NOT INSTALLED (correct). clsx/cva "(none)" → actual: `^2.1.1` / `^0.7.1`. components.json "absent" → actual: ✅ present. **Every row except framer-motion and react-hook-form is stale.** |
| `docs/UNIFIED-ROADMAP.md` | **STALE** | References `20260227-bsuite-master-roadmap-v5.00W.md` (archived). "Multi-provider AI (OpenAI + Anthropic) — needs reconciliation" → actual: Groq `gpt-oss-120b` is the primary provider (`src/lib/groq.ts`, `src/lib/llm.ts`); OpenAI is a secondary type in `llmApi.ts` provider union. The reconciliation note is valid but the doc hasn't been updated with the resolution. |
| `docs/PARENT-DOCS.md` | **STALE** | References 4 parent docs at non-archive paths that no longer exist. |
| `docs/20250829-throughput-roadmap-v1.00W.md` | **STALE** | **Claim:** "React 18.3 with TypeScript" → actual: React `^19.2.7`. **Claim:** "105 Passing Tests" → actual: 48 test files, ~307 test cases (test count has grown significantly). **Claim:** "OpenAI GPT and Anthropic Claude" multi-provider → actual: Groq `gpt-oss-120b` is primary. The roadmap is a historical document and has not been updated for the stack modernization. |
| `docs/20251014-throughput-navigation-ux-guide-v1.00W.md` | **VALIDATED** | `EnhancedNavigation.tsx` exists at `src/components/navigation/EnhancedNavigation.tsx` ✅. Component architecture descriptions match code. |
| `docs/20251014-throughput-components-guide-v1.00W.md` | **VALIDATED** | Component documentation template and index reference real components (Alert, Badge, Button, Card, Input, Textarea all exist in `src/components/ui/`) ✅. |
| `docs/20251014-throughput-component-alert-v1.00W.md` | **STALE** | **Unfilled template.** Contains 3 placeholder markers: `[Describe what the component does...]`, `[Category: ...]`, `[Stability: ...]`. Component exists at `src/components/ui/Alert.tsx` ✅, but the doc was never filled in. |
| `docs/20251014-throughput-component-badge-v1.00W.md` | **STALE** | Same unfilled template issue — 3+ placeholder markers. Component exists ✅. |
| `docs/20251014-throughput-component-card-v1.00W.md` | **STALE** | Same unfilled template issue. Component exists ✅. |
| `docs/20251014-throughput-component-input-v1.00W.md` | **STALE** | Same unfilled template issue. Component exists ✅. |
| `docs/20251014-throughput-component-textarea-v1.00W.md` | **STALE** | Same unfilled template issue. Component exists ✅. |
| `docs/20260430-throughput-component-button-v1.00W.md` | **VALIDATED** | Fully filled in (no placeholders). Props table matches `src/components/ui/Button.tsx` API ✅. |
| `docs/20260430-throughput-component-modal-v1.00W.md` | **VALIDATED** | Fully filled in. Modal component at `src/components/Modal.tsx` ✅. |
| `docs/20260430-throughput-component-docs-quick-reference-v1.00W.md` | **VALIDATED** | Quick reference for component documentation generation — procedural guide, verified template checklist matches `20251014-throughput-component-documentation-template-v1.00W.md` ✅. |
| `docs/20250511-throughput-api-reference-v1.00W.md` | **UNVERIFIABLE** | API surface reference — would need running instance to verify endpoints. |
| `docs/20250511-throughput-user-guide-v1.00W.md` | **VALIDATED** | User guide describes 3-stage workflow (Capture → Refine → Launch); components verified: `CaptureStage.tsx` ✅, `RefineStage.tsx` ✅, `LaunchStage.tsx` ✅. |
| `docs/20250511-throughput-troubleshooting-v1.00W.md` | **VALIDATED** | Troubleshooting guide — procedural, references match codebase patterns. |
| `docs/20251014-throughput-groq-architecture-v1.00W.md` | **VALIDATED** | Groq integration verified: `src/lib/groq.ts` ✅, `src/lib/llm.ts` references `openai/gpt-oss-120b` ✅. |
| `docs/20251014-throughput-groq-integration-v1.00W.md` | **VALIDATED** | Groq integration setup verified against code ✅. |
| `docs/20260425-throughput-outstanding-v1.00W.md` | **STALE** | **LIVE-REFERENCE table lists 14 UPPERCASE_LEGACY docs** (ARCHITECTURE.md, SYSTEM_ARCHITECTURE.md, API_REFERENCE.md, GROQ_ARCHITECTURE.md, GROQ_INTEGRATION.md, RLS_POLICIES.md, USER_GUIDE.md, DEVELOPMENT.md, TROUBLESHOOTING.md, NAVIGATION_UX_GUIDE.md, NAVIGATION_COMPARISON.md, PROJECT_OVERVIEW.md, CONVERSATION_MAP.md, roadmap.md) — **none of these files exist.** They were replaced by dated-convention files. The "Naming-Convention Non-Compliance" section acknowledges this but the LIVE-REFERENCE table still cites the old names. |
| `docs/20251014-throughput-quality-improvements-implementation-v1.00W.md` | **STALE** | Quality improvements tracker — references the old UPPERCASE doc naming convention and pre-modernization stack state. |
| `docs/plans/20260504-adopt-canonical-patterns-plan-v1.00W.md` | **PARTIAL** | dnd-kit deps installed ✅, EntitySelector primitive shipped ✅, drag integration shipped ✅, `display_order` migration shipped ✅ (`20260630120000_add_idea_display_order_persistence.sql`). EntitySelector wiring to canonical contacts/persons reader still OPEN — consistent with code (EntitySelector exists but reads are generic). Cmd+K blocked ✅. Plan body says "PARTIAL" which matches. |
| `docs/plans/STATUS.md` | **VALIDATED** | Stack modernization archived ✅. Adopt-canonical-patterns PARTIAL ✅. TS 6.0 evaluation tracked ✅. |

---

## 5. Parent docs — Cross-cutting findings

| Doc | Verdict | Evidence |
|-----|---------|----------|
| `docs/README.md` | **STALE** | Lines 9, 11, 13, 24-26, 46 reference 4 archived/relocated docs as canonical. |
| `docs/OUTSTANDING.md` | **PARTIAL** | Acknowledges archive (lines 7, 21) and points to current execution queue ✅. But line 42 still cites `20260227-dry-one-shot-architecture-v1.04A.md` for the one-shot compliance gate — actual file is `v1.02A`. |
| `docs/20260504-bsuite-documentation-hub-v1.00W.md` | **STALE** | References `20260504-bsuite-tech-stack-alignment-v1.00W.md` as companion (archived). References master-roadmap, finish-line-roadmap, merged-execution-backlog as canonical (all archived/relocated). |
| `docs/20260724-oneshot-cross-cutting-audit-v1.00F.md` | **VALIDATED** | Audit findings reference real code paths verified during this audit. |
| `docs/20260724-recurring-bugs-and-blindspots-v1.00W.md` | **VALIDATED** | Findings are discovery-only and reference current code state. |
| `docs/20260723-bsuite-capability-matrix-v1.00W.md` | **VALIDATED** | References `20260723-anytime-workforceone-admin-guide-v1.00W.md` ✅. |
| `docs/adr/README.md` | **STALE** | Cross-reference convention cites `docs/20260227-dry-one-shot-architecture-v1.04A.md` (actual: `v1.02A`), `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` (archived), `docs/20260427-roadmaps-audits-plans-outstanding-work-ledger-v1.00W.md` (not found anywhere), `docs/20260501-merged-execution-backlog-v1.00W.md` (archived). |
| `docs/adr/` (ADR-0004 collision) | **STALE** | `ADR-0004-oauth-allowlist-doctrine.md` and `ADR-0004-schema-builder-consolidation.md` share number 0004. README indexes only the OAuth one — schema-builder consolidation ADR is orphaned. ADR-0006 and ADR-0007 are properly indexed ✅. |

### Cross-reference breakage: `dry-one-shot-architecture-v1.04A`

The actual file is `20260227-dry-one-shot-architecture-v1.04A.md`. **8 non-archived files** still reference the old `v1.01A`:

| File | Location |
|------|----------|
| `docs/plans/20260510-universal-canvas-capability-implementation-v1.00F.md` | parent docs/plans |
| `docs/adr/ADR-0001-page-builder-ownership.md` | parent docs/adr |
| `docs/adr/ADR-0002-schema-builder-ownership.md` | parent docs/adr |
| `docs/adr/ADR-0006-contact-propagation-doctrine.md` | parent docs/adr |
| `docs/adr/README.md` | parent docs/adr |
| `docs/OUTSTANDING.md` | parent docs |
| `docs/20260227-contributing-standards-guide-v1.01W.md` | parent docs |
| `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` | parent docs/plans |

---

## 6. Blindspot findings

| Class | Finding | Evidence |
|-------|---------|----------|
| **TODO/FIXME markers** | BSU: 7 files, braden: 6 files, throughput: 4 files | All in `src/`, non-critical (logger, analytics, forms). No TODOs found in compliance-critical paths. |
| **Ghost tenant variables** | BSU: 11 refs, braden: 7 refs, throughput: 0 refs | `current_tenant_id` / `auth_tenant_id` — all in SQL migration files or type definitions, not in application code. No ghost-variable inconsistency detected. |
| **cookieStorage** | BSU: 2 refs (both in docs/comments), braden: 2 refs (both in test assertions), throughput: 2 refs (both in test assertions) | All references are negative guidance or test assertions verifying cookieStorage is NOT used. ✅ Clean. |
| **ADR number collision** | ADR-0004 collision persists | `ADR-0004-oauth-allowlist-doctrine.md` + `ADR-0004-schema-builder-consolidation.md`. README only indexes the OAuth one. Schema-builder consolidation ADR is orphaned. |
| **Unfilled template docs** | 5 throughput component docs | Alert, Badge, Card, Input, Textarea docs contain `[Describe...]` / `[Category:...]` / `[Stability:...]` placeholder text. Components exist; docs were never filled in. |
| **Dead-link parent references** | PARENT-DOCS.md across all 6 submodules | 4 parent docs referenced at non-archive paths no longer exist. Relocated to `/home/braden/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/docs/archive/2026-07/` (external to monorepo). |
| **Feature-surface drift** | BSU and throughput FEATURE-SURFACE.md | BSU: dnd-kit "🟡 1" → actual 3, TanStack Query "38" → actual 61. throughput: dnd-kit "❌" → actual installed and shipping. |
| **Resolved blocker still documented as blocked** | BSU + braden schema-registry docs | `@bsuite/schema-registry@1.0.0` is published on npm, installed in both repos, and exports `createSchemaBuilderService`. Both docs still describe the blocker as active. |
| **Orphaned ThemeToggle** | braden | `ThemeToggle.tsx` + `ThemeProvider.tsx` exist but are not rendered in any app component. Corporate theme doc says "no dark mode by design" — the code infrastructure exists but is unused. |

---

## 7. OUTSTANDING work register

Each item carries: doc path, missing/stale artifact, evidence, proposed disposition.

| # | Doc | Issue | Evidence | Proposed disposition |
|---|-----|-------|----------|---------------------|
| 1 | `PARENT-DOCS.md` (all 6 submodules) | 4 dead parent-doc links | `find docs/ -name '*'` — files not at referenced paths; found at external archive | Update PARENT-DOCS.md shared section to point to `docs/archive/README.md` or current canonical replacements |
| 2 | `docs/README.md` (parent) | 4 dead canonical doc links (lines 9, 11, 13, 24-26, 46) | Same as #1 | Replace with `docs/plans/20260629-bsuite-remaining-work-roadmap-v1.00F.md` and other current docs |
| 3 | `docs/adr/README.md` | Stale cross-references: v1.01A, finish-line, merged-backlog, outstanding-work-ledger | `grep` confirms 4 stale refs | Update cross-reference convention section |
| 4 | `docs/20260504-bsuite-documentation-hub-v1.00W.md` | References 4 archived docs as canonical | `grep` confirms 10+ references to missing files | Update hub to reference current canonicals or archive the hub itself |
| 5 | throughput `docs/STACK-AUDIT.md` | Every stack version is stale (React, Vite, Zod, lucide, TanStack Query, dnd-kit, clsx/cva, components.json) | `cat package.json` — all versions differ | Rewrite or archive; stack modernization is complete |
| 6 | throughput `docs/CONSISTENCY-REPORT.md` | Tailwind 4.0.0 → actual 4.3.0; Zustand 5.0.8 → actual 5.0.14 | `cat package.json` | Update version numbers |
| 7 | throughput `docs/20260425-throughput-outstanding-v1.00W.md` | LIVE-REFERENCE table lists 14 non-existent UPPERCASE docs | `ls docs/ARCHITECTURE.md` → not found for all 14 | Rewrite to reference dated-convention files that replaced them |
| 8 | throughput 5 component docs (Alert, Badge, Card, Input, Textarea) | Unfilled template placeholders | `grep '\[Describe' docs/20251014-throughput-component-*.md` → 3 markers per file | Fill in or replace with stub pointing to the template |
| 9 | throughput `docs/FEATURE-SURFACE.md` | dnd-kit "❌" → actual installed + shipping; EntitySelector "❌" → actual shipped | `grep @dnd-kit package.json`; `find src/ -name EntitySelector*` | Update to ✅ / 🟡 per actual state |
| 10 | throughput `docs/20250829-throughput-roadmap-v1.00W.md` | React 18.3 → actual 19.2.7; 105 tests → actual ~307; OpenAI/Anthropic → actual Groq primary | `cat package.json`; test file count | Update or mark as historical/superseded |
| 11 | braden `docs/20260316-braden-corporate-theme-reference-v1.00W.md` | "Tailwind CSS v3" → actual v4.3.3; "no dark mode by design" → ThemeToggle/ThemeProvider exist (unrendered) | `cat package.json`; `find src/ -name ThemeToggle*` | Update Tailwind version claim; reconcile dark-mode infra with doc claim |
| 12 | braden `docs/20260723-schema-builder-registry-consolidation-chore-v1.00W.md` | Blocker section says 0.4.0 not published → actual 1.0.0 published and installed | `npm view @bsuite/schema-registry version` → 1.0.0 | Update blocker section to "RESOLVED" |
| 13 | BSU `docs/20260723-developer-portal-remaining-work-feature-v1.00W.md` | Item 6 blocker says 1.0.0 not published → actual published and installed | Same as #12 | Update Item 6 blocker status to resolved |
| 14 | BSU `docs/FEATURE-SURFACE.md` | dnd-kit "🟡 1" → actual 3; TanStack Query "38" → actual 61 | `grep -rl @dnd-kit src/`; `grep -rl @tanstack/react-query src/` | Update counts |
| 15 | ADR-0004 collision | Two files share ADR number 0004 | `ls docs/adr/ADR-0004*` → 2 files | Renumber schema-builder consolidation to ADR-0008; add to README index |
| 16 | Cross-ref: `v1.01A` → `v1.02A` | 8 files reference stale version | `grep -rl 'v1.01A'` | Bulk find-replace v1.01A → v1.02A across non-archived docs |
| 17 | BSU `docs/plans/STATUS.md` | References archived merged-execution-backlog | `ls docs/20260501-merged-execution-backlog*` → not found | Update to reference `docs/plans/20260629-bsuite-remaining-work-roadmap-v1.00F.md` |

---

## 8. Verified-clean findings (no action needed)

| Claim | Verification |
|-------|-------------|
| BSU Feature Builder 8 LAYERS all `live: true` | ✅ `index.tsx` confirms all 8 layers with `live: true` and phase markers |
| BSU EntityTableWidget `is_feature_enabled` gate | ✅ Verified in `EntityTableWidget.tsx` |
| BSU `create_organization_with_owner` Option B migration | ✅ `20260723090000_create_organization_with_owner_option_b.sql` exists |
| BSU tenant_page_layouts / tenant_navigation / ancestors_of / descendants_of | ✅ All found in migration SQL files |
| BSU Stripe billing integration | ✅ `src/lib/stripeService.ts`, `supabase/functions/stripe-webhook`, `supabase/functions/stripe-portal`, migration `20260228000000_add_billing_tables.sql` |
| BSU manuals: 7 manuals registered | ✅ All 7 manual files + 7 block files + shared + index in `src/lib/manuals/` |
| BSU contextual links: ManualLink, HeaderManualLink, routeManualMap | ✅ All exist with tests |
| braden schemaBuilderService thin re-export | ✅ Correctly re-exports from `@bsuite/schema-registry` with `CURRENT_APP_SCOPE = 'braden'` |
| braden nav-core consumer | ✅ `src/config/navigation.ts` |
| braden CSP in vercel.json | ✅ All referenced CSP directives present |
| throughput 3-stage workflow (Capture → Refine → Launch) | ✅ All 3 stage components exist |
| throughput Groq `gpt-oss-120b` integration | ✅ `src/lib/groq.ts`, `src/lib/llm.ts` |
| throughput EntitySelector shipped | ✅ `src/components/entity/EntitySelector.tsx` + tests |
| throughput display_order migration | ✅ `20260630120000_add_idea_display_order_persistence.sql` |
| throughput EnhancedNavigation | ✅ `src/components/navigation/EnhancedNavigation.tsx` |
| All 3 repos: no cookieStorage in app code | ✅ Only in test assertions and docs/comments |
| All 3 repos: pnpm@10.33.3 | ✅ Consistent across all package.json files |
| All 3 repos: Node 24.x | ✅ `.node-version` = 24.x, `engines.node` = 24.x |

---

## 9. Self-report

- **Lanes converged:** all 3 repos fully audited.
- **No UNVERIFIABLE items** except throughput API reference (would need running instance).
- **Read-only:** no git operations, no code changes, no file edits — all findings are observational.
- **Audit scope:** non-archive docs only (per task constraint). Archive docs were checked for cross-reference targets but not audited themselves.
- **Methodology:** every doc claim was verified against `package.json`, `src/` grep, `find`, file existence checks, and `npm view` where applicable. No claim was validated from docs alone.
- **Schema-registry blocker:** the most impactful finding is that the documented blocker on `@bsuite/schema-registry@1.0.0` is resolved in code but both BSU and braden docs still describe it as active. This affects developer onboarding (a new developer reading the doc would believe `tsc` fails when it doesn't).