> **SOURCE:** Ported from `/home/braden/.windsurf/plans/crm7-broad-ui-refresh-ec965f.md` on 2026-03-16. Original Windsurf plan file retained at source location.

---

# CRM7 Broad UI Refresh

This plan introduces a broad, consistent CRM7 UI refresh anchored in a Balanced Hybrid design language, with a premium optional Neon dark mode and a future-ready tenant branding system for Business Suite customers.

docs/20260228-d2c-theme-specification-v1.00W.md

## Goals

- Refresh the shared CRM7 shell so navigation, headers, cards, tabs, and page scaffolds feel modern, polished, and consistent.
- Preserve the D2C Neon Electric identity while using a calmer default presentation that stays functional for day-to-day CRM work.
- Add an optional Neon Premium dark theme for power users who prefer a more expressive workspace.
- Prepare the design system for tenant-level corporate colour overrides across Business Suite apps without hardcoding one-off brand variants.

## Current Progress Snapshot

### Completed

- CRM7 reference surfaces refreshed:
  - `src/components/layout/MobileBottomNav.tsx`
  - `src/pages/reports/index.tsx`
  - `src/pages/hosts/index.tsx`
- CRM7 shared shell completion landed and typechecked:
  - `src/components/layout/CRM7Header.tsx`
  - `src/components/layout/DashboardShell.tsx`
- CRM7 HR and people refresh batch landed and typechecked:
  - `src/pages/hr/index.tsx`
  - `src/pages/hr/disciplinary.tsx`
  - `src/pages/hr/disciplinary/[id].tsx`
  - `src/pages/hr/probation-completion.tsx`
  - `src/pages/hr/probation-completion-record.tsx`
  - `src/pages/hr/termination.tsx`
  - `src/pages/people/new.tsx`
  - `src/pages/people/[id]/edit.tsx`
  - `src/pages/people/[id].tsx`
  - `src/pages/people/onboarding.tsx`
  - `src/pages/people/progress.tsx`
  - `src/pages/people/completion.tsx`
  - `src/pages/people/recruitment.tsx`
  - `src/pages/people/compliance.tsx`
- CRM7 admin/workflow refresh batch landed and typechecked:
  - `src/pages/settings/index.tsx`
  - `src/pages/workflows/index.tsx`
  - `src/components/workflows/WorkflowList.tsx`
  - `src/pages/vet/assessments/index.tsx`
- CRM7 VET/admin hub refresh batch landed and typechecked:
  - `src/pages/vet/index.tsx`
  - `src/pages/vet/qualifications/index.tsx`
  - `src/pages/admin/award-updates.tsx`
- CRM7 VET detail-surface refresh batch landed and typechecked:
  - `src/pages/vet/qualifications/[id]/index.tsx`
  - `src/pages/vet/qualifications/[id]/edit.tsx`
  - `src/pages/vet/qualifications/[id]/structure.tsx`
  - `src/pages/vet/units/[id]/index.tsx`
- CRM7 settings/admin legacy refresh batch landed and typechecked:
  - `src/pages/settings/configuration.tsx`
  - `src/pages/settings/permissions.tsx`
  - `src/pages/settings/bulk-operations.tsx`
- CRM7 annual admin surface refresh batch landed and typechecked:
  - `src/pages/admin/change-of-year.tsx`
- CRM7 award detail refresh batch landed and typechecked:
  - `src/pages/awards/[id]/index.tsx`
- CRM7 legacy duplicate qualification-detail refresh batch landed and typechecked:
  - `src/pages/vet/qualifications/[id].tsx`
- CRM7 training-package flow refresh batch landed and typechecked:
  - `src/pages/vet/training-packages/create.tsx`
  - `src/pages/vet/training-packages/[id]/index.tsx`
  - `src/pages/vet/training-packages/[id]/edit.tsx`
- CRM7 assessment flow refresh batch landed and typechecked:
  - `src/pages/vet/assessments/create.tsx`
  - `src/pages/vet/assessments/[id]/index.tsx`
  - `src/pages/vet/assessments/[id]/edit.tsx`
- CRM7 units list/create refresh batch landed and typechecked:
  - `src/pages/vet/units/index.tsx`
  - `src/pages/vet/units/create.tsx`
- CRM7 qualifications create/import refresh batch landed and typechecked:
  - `src/pages/vet/qualifications/create.tsx`
  - `src/pages/vet/qualifications/import.tsx`
- CRM7 qualification-structure and unit-edit refresh batch landed and typechecked:
  - `src/pages/vet/qualifications/[id]/structure.tsx`
  - `src/pages/vet/units/[id]/edit.tsx`
- CRM7 deals list/create refresh batch landed and typechecked:
  - `src/pages/deals/index.tsx`
  - `src/pages/deals/new.tsx`
- CRM7 auth surface refresh batch landed and typechecked:
  - `src/pages/auth/business-suite-sso.tsx`
  - `src/pages/auth/callback.tsx`
  - `src/pages/auth/confirm.tsx`
  - `src/pages/auth/reset-password.tsx`
- CRM7 finish-strong shell polish pass landed and typechecked:
  - `src/styles/theme.css`
  - `src/components/page-header.tsx`
  - `src/components/layout/CRM7Header.tsx`
  - `src/components/layout/AppSidebar.tsx`
  - `src/components/layout/DashboardShell.tsx`
  - `src/components/ui/sidebar.tsx`
- CRM7 theme architecture correction + token reconciliation landed and verified:
  - `src/styles/theme.css`
  - `src/index.css`
  - `src/components/ui/card.tsx`
  - `tailwind.config.js`
  - `pnpm typecheck`
  - `pnpm build`
- CRM7 off-spec feature color-map cleanup landed:
  - `src/config/tagColors.ts`
  - `src/pages/contacts/index.tsx`
  - `src/lib/fundingWorkflow.ts`
- CRM7 dashboard finish pass is now actively underway in `src/pages/Dashboard.tsx`:
  - stronger hero hierarchy
  - restrained command-center summary chips
  - richer quick-action cards
  - upgraded communication/pipeline/recent-activity card treatment
  - more intentional panel chrome and metadata
- CRM7 dashboard editing surface was previously normalized around the new layout builder and primary editor entry point.
- Cross-app shell rollout completed and verified with `pnpm typecheck` for:
  - `business-suite-unified`
  - `conduit`
  - `R80.3`
- Business Suite apps now share the same semantic shell surface direction:
  - elevated shell backgrounds
  - accent shell surfaces
  - semantic shell borders
  - shell shadow and shell glow tokens
  - rounded hero/panel treatment for high-visibility surfaces

### In Progress

- Remaining CRM7 broad refresh across the last older dashboard-adjacent and admin/workflow surfaces.
- Current implementation lane: finish the dashboard/dashboard-adjacent polish against the corrected D2C token foundation, then validate.
- Converting more CRM7 pages to shared page scaffolding, empty states, and card patterns where manual header or legacy panel treatments remain.
- Tightening consistency between CRM7 shell primitives and the now-completed BSuite app rollouts.
- Preparing the final CRM7 visual QA and consistency punch list once the last legacy surfaces are refreshed.
- Sync schema/query mismatches remain open and are still producing the next material runtime blocker after the theme/dashboard lane.

### Immediate Next Priority

- Finish the active CRM7 dashboard polish pass now that the token foundation has been corrected and verified through `pnpm typecheck` + `pnpm build`.
- Then run CRM7 theme validation and browser QA so CRM7 remains the canonical reference implementation for the rest of the suite.
- Do not stop at structural cleanup alone; finish with a strong polish pass aligned to `docs/20260228-d2c-theme-specification-v1.00W.md`, including WCAG-safe light mode, restrained semantic glows, and more premium shell/chrome depth.

## Claude Code Parallel Task Split

### Claude Code Task 1 — CRM7 shared shell completion

**Goal**

- Finish the remaining shared CRM7 shell alignment so header, sidebar, dashboard shell wrappers, and shared page scaffolding consistently use the Balanced Hybrid token system.

**Primary targets**

- `src/layouts/MainLayout.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/CRM7Header.tsx`
- `src/components/layout/DashboardShell.tsx`
- `src/components/ui/sidebar.tsx`
- `src/styles/theme.css`

**Expected outcome**

- Shared chrome feels consistent with the refreshed reports, hosts, and mobile bottom nav surfaces.
- No hardcoded one-off surface styles where semantic shell tokens should be used.
- `pnpm typecheck` passes.

### Claude Code Task 2 — CRM7 workflow hub refresh

**Goal**

- Refresh remaining high-visibility CRM7 workflow hub pages using the new reference patterns from reports and hosts.

**Work pattern**

- Replace ad hoc headings with shared page header patterns.
- Replace bespoke empty/error/loading states with shared empty state patterns where appropriate.
- Normalize card, table container, tab, and action-bar surfaces to semantic shell tokens.

**Priority areas**

- dashboard-adjacent hubs
- workflow list pages
- admin or platform hub surfaces that still look visually older than reports/hosts
- pages with manual header blocks or inconsistent panel styling

**Expected outcome**

- CRM7's main hub pages read as part of one coherent system.
- `pnpm typecheck` passes.

### Claude Code Task 3 — CRM7 visual QA and consistency pass

**Goal**

- Audit touched CRM7 surfaces for consistency and regressions after Tasks 1 and 2 land.

**Checklist**

- desktop and mobile shell states
- keyboard focus visibility
- contrast on nav, menus, tabs, buttons, badges, and cards
- spacing consistency between hero, content, and footer regions
- check for lingering legacy backgrounds, borders, or shadows

**Expected outcome**

- A punch list of concrete follow-up fixes or a clean QA signoff.

### Claude Code Task 4 — cross-app polish follow-up

**Goal**

- Perform a short polish pass on `business-suite-unified`, `conduit`, and `R80.3` after manual review screenshots or browser checks.

**Scope guardrails**

- No redesigns.
- Fix only inconsistencies, regressions, spacing issues, or accessibility issues introduced by the rollout.
- Preserve the new semantic shell token model.

**Expected outcome**

- Small polish-only diffs plus verification.

## Phase 1 Scope

- `src/layouts/MainLayout.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/CRM7Header.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/DashboardShell.tsx`
- `src/components/ui/sidebar.tsx`
- `src/styles/theme.css`
- High-visibility entry surfaces such as `src/pages/Dashboard.tsx`, `src/pages/reports/index.tsx`, and key workflow hub pages.

## Design Direction

### Recommended approach

- Use a **Balanced Hybrid** default theme:
  - cleaner layout density
  - stronger hierarchy
  - modern cards, nav states, and filters
  - selective Magic UI-inspired flourishes only on hero zones, nav emphasis, and key CTAs
- Offer a **Neon Premium dark mode** variant:
  - richer glow, gradients, and elevated panels
  - expressive but still readable and performant
- Keep all colours mapped through tokens so the default CRM7 neon palette and future company branding both flow through the same system.

### Avoid

- Overusing animated effects on transactional pages
- Mixing random component styles across modules
- Breaking accessibility or contrast to chase visual flair

## Implementation Strategy

1. Normalize the token layer in `theme.css`
   - separate semantic tokens from brand tokens
   - support default CRM7 brand, Neon Premium dark mode, and tenant overrides
2. Modernize shared shell components
   - sidebar structure, active states, collapsible groups, section affordances
   - header controls, user menu, layout spacing, backdrop treatments
   - mobile navigation consistency
3. Upgrade shared page scaffolding
   - `DashboardShell`, section headers, tabs, action bars, breadcrumb styling
4. Refresh high-traffic pages first
   - dashboard
   - reports
   - workflow hub surfaces
5. Create a reusable visual language for cards and metrics
   - hero summary rows
   - stat cards
   - feature/workflow cards
   - empty states and call-to-action blocks
6. Introduce tenant branding hooks
   - config-driven CSS variables
   - safe fallback to CRM7 Neon Electric tokens
   - no brand-specific component forks

## Component / Styling Principles

- Prefer existing shadcn-style primitives and current sidebar system over one-off custom widgets.
- Use modern surfaces: layered cards, subtle borders, soft shadows, controlled blur, strong hover/focus states.
- Treat Magic UI as inspiration, not literal copy-paste; use effects sparingly where they improve orientation or delight.
- Keep interaction states keyboard-visible and WCAG-safe.
- Preserve performance by limiting heavy animation to small, high-value areas.

## Theme Architecture

### Theme modes

- Default Light: polished enterprise with CRM7 neon accents
- Default Dark: restrained dark operating mode
- Neon Premium Dark: stronger glow/gradient variant for users who want an immersive workspace

### Future brand override model

- Base semantic tokens stay stable (`--bg-panel`, `--text-primary`, `--accent-primary`, etc.)
- Brand tokens become swappable inputs (`--brand-primary`, `--brand-secondary`, `--brand-accent`, etc.)
- Tenant/company settings can populate these values later for cross-app branding consistency

## Verification

- Visual regression pass on desktop and mobile shell states
- Keyboard/focus and contrast checks on nav, menus, tabs, buttons, and cards
- Validate light and dark shell readability against `docs/20260228-d2c-theme-specification-v1.00W.md`, especially surface contrast, icon clarity, and controlled glow treatment
- `pnpm typecheck`
- Targeted page tests for touched surfaces where coverage exists

## Rollout Recommendation

- Shared shell and token-system rollout is complete across the non-CRM7 BSuite apps.
- CRM7 reports, hosts, mobile bottom nav, shared shell, HR/people surfaces, the admin/workflow batch, the VET/admin hub batch, the VET detail-surface batch, the settings/admin legacy batch, the annual admin surface batch, the award detail batch, the legacy duplicate qualification-detail batch, the training-package flow batch, the assessment flow batch, the units list/create batch, the qualifications create/import batch, the qualification-structure/unit-edit batch, the deals list/create batch, and the auth surface batch should be treated as the current page-level reference pattern.
- Next, finish the remaining CRM7 dashboard and dashboard-adjacent/workflow-admin surfaces; they should not yet be treated as complete.
- Then run the CRM7 visual QA/consistency pass and a short cross-app polish pass after visual review.
- The final CRM7 pass should explicitly upgrade chrome/icon feel, eliminate flat archaic-looking panels, and add restrained semantic glow/depth without compromising WCAG readability in light mode.
- A live dashboard visit at `http://127.0.0.1:40227/dashboard` returned HTTP 502 after the QA server was shut down; after restarting CRM7 on `http://localhost:5175` (preview proxy `http://127.0.0.1:41765`), `/dashboard` redirected to `https://suite.crm7.app/login?return_to=crm7&return_path=%2Fdashboard`, so dashboard QA is blocked for anonymous preview sessions by protected-route authentication rather than by server availability.
- User-provided authenticated IDE preview screenshots confirm that the dashboard does render once session context is present, but the surface still reads as materially unfinished: the information hierarchy is weak, cards remain too flat/border-led, the hero/metric treatment lacks premium emphasis, and the overall shell/dashboard composition still needs a focused finish pass before CRM7 can exit the dashboard lane.
- The theme-system correction identified by the CRM7 audit has now landed: the D2C Neon Electric spec tokens are again the effective source layer, the shadcn bridge is aligned to those tokens, missing status/glow/shadow semantics were restored, and dead card/shadow utility usage was removed.
- Build and typecheck verification passed after the theme correction (`pnpm typecheck`, `pnpm build` in `crm7`), so the remaining CRM7 work is now primarily dashboard finish quality, sync remediation, and authenticated browser QA rather than unresolved theme architecture drift.

## UI Component Inspiration

### Approved inspiration categories

- Hero/background treatment:
  - `Animated Grid Pattern`
  - `Grid Pattern`
  - `Dot Pattern`
  - `Retro Grid`
  - `Light Rays`
  - `Warp Background`
- Card emphasis:
  - `Magic Card`
  - `Neon Gradient Card`
  - `Border Beam`
  - `Shine Border`
- CTA emphasis:
  - `Shimmer Button`
  - `Interactive Hover Button`
  - `Pulsating Button`
  - `Ripple Button`
- Light motion/text emphasis:
  - `Blur Fade`
  - `Number Ticker`
  - `Animated Shiny Text`
  - `Animated Gradient Text`
  - `Aurora Text`

### Use only in these zones

- dashboard hero panels
- page header accent regions
- primary CTA clusters
- premium upgrade or marketing-style summary cards
- empty-state illustration zones where subtle delight improves orientation

### Avoid using inspiration patterns in these zones

- dense tables
- forms with many inputs
- transactional workflows
- modals with critical actions
- compliance-heavy or calculator-heavy data entry surfaces

### CRM7-specific component translation

- `Magic Card` or `Neon Gradient Card`
  - use for dashboard hero summaries, premium upgrade prompts, or featured workflow tiles
- `Border Beam` or `Shine Border`
  - use only on high-priority CTA cards or featured active states
- `Animated Grid Pattern` / `Grid Pattern` / `Dot Pattern`
  - use as low-opacity hero background layers only
- `Number Ticker`
  - use for top-level stat summaries where motion remains readable
- `Blur Fade`
  - use for staged hero content reveal, not for bulk data regions

### Implementation guardrails

- Magic UI is inspiration only, not a directive to clone effects literally.
- Any borrowed effect must still render through CRM7 semantic tokens.
- Prefer static polish over motion if motion risks distraction.
- Respect reduced motion settings.
- Never introduce a second competing card or button system.

## Additional Claude Code Task Split

### Claude Code Task 5 — Magic UI pattern shortlist and CRM7 mapping

**Goal**

- Build a small approved shortlist of inspiration patterns that can be safely adapted for CRM7 without making the product feel like a landing page.

**Deliverables**

- one short list of approved patterns
- one short list of rejected patterns
- suggested mapping from pattern to CRM7 surface
- implementation notes for reduced motion and accessibility

**Expected outcome**

- A practical reference note that keeps future UI work visually consistent and prevents effect sprawl.

### Claude Code Task 6 — Reference surface pack

**Goal**

- Identify 3 to 5 canonical CRM7 surfaces that should be treated as the gold-standard examples for future rollout work.

**Suggested pack**

- one dashboard hero surface
- one report or analytics surface
- one workflow list surface
- one detail page surface
- one empty/loading/error state surface

**Expected outcome**

- Future agents can compare new work against a stable reference pack instead of guessing from scattered pages.



- D2C Theme Remediation (Phase A & B) complete:
  - Magic UI components installed (dot-pattern, animated-gradient-text, shine-border, meteors, typing-animation, bento-grid, magic-card, etc)
  - --app-primary / --app-accent and glow tokens ready in all four apps
  - ShineBorder applied to login as B3 reference
  - financial_reports table live with RLS
  - Dashboard DEMO_METRICS removed — dashboard shows live data or empty state
  - Demo tenant created — impersonate from DeveloperToolbar footer
  - Bento grid + glow system (B1) applied to Dashboard
  - Jodie meteors + typing animation (B2) applied to AI chat interface

## Claude Code Handoff Notes

- Keep all work on the project `development` branch.
- Treat CRM7 as the canonical implementation first; other apps follow CRM7 patterns, not the other way around.
- Use semantic shell tokens instead of hardcoded colors wherever possible.
- Run `pnpm typecheck` before handing work back.
- Summarize changed files and note any pages that still look legacy.

## Next Review Gate

- Confirm Claude Code Task 1 and the majority of Claude Code Task 2 have landed cleanly.
- Run a visual sweep on:
  - shared shell
  - dashboard
  - reports
  - hosts
  - next workflow hub candidates
- Decide whether Task 2 is fully complete after the remaining legacy surfaces are refreshed.
- Decide whether Task 4 stays polish-only or expands into a second cross-app refinement pass.

## Appendix — From User / Magic UI Reference Links

### Notes

- Cleaned for readability, but the links are intentionally preserved for future reference and component discovery.
- Use these links as inspiration sources only, not as a directive to import effects indiscriminately into CRM7 or other BSuite apps.

### Getting Started

- [Getting Started](https://magicui.design/docs)
- [Introduction](https://magicui.design/docs/installation)
- [Installation](https://magicui.design/docs/mcp)
- [MCP](https://magicui.design/docs/story)
- [Story](https://magicui.design/docs/legacy)

### Templates

- [CodeForge](https://magicui.design/docs/templates/codeforge)
- [AI Agent](https://magicui.design/docs/templates/agent)
- [Dev Tool](https://magicui.design/docs/templates/devtool)
- [Mobile](https://magicui.design/docs/templates/mobile)
- [SaaS](https://magicui.design/docs/templates/saas)
- [Startup](https://magicui.design/docs/templates/startup)
- [Portfolio](https://magicui.design/docs/templates/portfolio)
- [Changelog](https://magicui.design/docs/templates/changelog)
- [Blog](https://magicui.design/docs/templates/blog)

### Components

- [Marquee](https://magicui.design/docs/components/marquee)
- [Terminal](https://magicui.design/docs/components/terminal)
- [Hero Video Dialog](https://magicui.design/docs/components/hero-video-dialog)
- [Bento Grid](https://magicui.design/docs/components/bento-grid)
- [Animated List](https://magicui.design/docs/components/animated-list)
- [Dock](https://magicui.design/docs/components/dock)
- [Globe](https://magicui.design/docs/components/globe)
- [Tweet Card](https://magicui.design/docs/components/tweet-card)
- [Orbiting Circles](https://magicui.design/docs/components/orbiting-circles)
- [Avatar Circles](https://magicui.design/docs/components/avatar-circles)
- [Icon Cloud](https://magicui.design/docs/components/icon-cloud)
- [Lens](https://magicui.design/docs/components/lens)
- [Pointer](https://magicui.design/docs/components/pointer)
- [Smooth Cursor](https://magicui.design/docs/components/smooth-cursor)
- [Progressive Blur](https://magicui.design/docs/components/progressive-blur)
- [Dotted Map](https://magicui.design/docs/components/dotted-map)

### Special Effects

- [Animated Beam](https://magicui.design/docs/components/animated-beam)
- [Border Beam](https://magicui.design/docs/components/border-beam)
- [Shine Border](https://magicui.design/docs/components/shine-border)
- [Magic Card](https://magicui.design/docs/components/magic-card)
- [Meteors](https://magicui.design/docs/components/meteors)
- [Confetti](https://magicui.design/docs/components/confetti)
- [Particles](https://magicui.design/docs/components/particles)
- [Animated Theme Toggler](https://magicui.design/docs/components/animated-theme-toggler)

### Animations

- [Blur Fade](https://magicui.design/docs/components/blur-fade)

### Text Animations

- [Text Animate](https://magicui.design/docs/components/text-animate)
- [Typing Animation](https://magicui.design/docs/components/typing-animation)
- [Line Shadow Text](https://magicui.design/docs/components/line-shadow-text)
- [Aurora Text](https://magicui.design/docs/components/aurora-text)
- [Video Text](https://magicui.design/docs/components/video-text)
- [Number Ticker](https://magicui.design/docs/components/number-ticker)
- [Animated Shiny Text](https://magicui.design/docs/components/animated-shiny-text)
- [Animated Gradient Text](https://magicui.design/docs/components/animated-gradient-text)
- [Text Reveal](https://magicui.design/docs/components/text-reveal)
- [Hyper Text](https://magicui.design/docs/components/hyper-text)
- [Word Rotate](https://magicui.design/docs/components/word-rotate)
- [Scroll Based Velocity](https://magicui.design/docs/components/scroll-based-velocity)
- [Sparkles Text](https://magicui.design/docs/components/sparkles-text)
- [Morphing Text](https://magicui.design/docs/components/morphing-text)
- [Spinning Text](https://magicui.design/docs/components/spinning-text)
- [Text Highlighter](https://magicui.design/docs/components/highlighter)

### Device Mocks

- [Safari](https://magicui.design/docs/components/safari)
- [iPhone](https://magicui.design/docs/components/iphone)
- [Android](https://magicui.design/docs/components/android)

### Buttons

- [Rainbow Button](https://magicui.design/docs/components/rainbow-button)
- [Shimmer Button](https://magicui.design/docs/components/shimmer-button)
- [Ripple Button](https://magicui.design/docs/components/ripple-button)

### Backgrounds

- [Flickering Grid](https://magicui.design/docs/components/flickering-grid)
- [Animated Grid Pattern](https://magicui.design/docs/components/animated-grid-pattern)
- [Retro Grid](https://magicui.design/docs/components/retro-grid)
- [Ripple](https://magicui.design/docs/components/ripple)
- [Dot Pattern](https://magicui.design/docs/components/dot-pattern)
- [Grid Pattern](https://magicui.design/docs/components/grid-pattern)
- [Striped Pattern](https://magicui.design/docs/components/striped-pattern)
- [Interactive Grid Pattern](https://magicui.design/docs/components/interactive-grid-pattern)
- [Light Rays](https://magicui.design/docs/components/light-rays)

### Community

- [Shiny Button](https://magicui.design/docs/components/shiny-button)
- [File Tree](https://magicui.design/docs/components/file-tree)
- [Code Comparison](https://magicui.design/docs/components/code-comparison)
- [Scroll Progress](https://magicui.design/docs/components/scroll-progress)
- [Neon Gradient Card](https://magicui.design/docs/components/neon-gradient-card)
- [Comic Text](https://magicui.design/docs/components/comic-text)
- [Cool Mode](https://magicui.design/docs/components/cool-mode)
- [Pixel Image](https://magicui.design/docs/components/pixel-image)
- [Pulsating Button](https://magicui.design/docs/components/pulsating-button)
- [Warp Background](https://magicui.design/docs/components/warp-background)
- [Interactive Hover Button](https://magicui.design/docs/components/interactive-hover-button)
- [Animated Circular Progress Bar](https://magicui.design/docs/components/animated-circular-progress-bar)
