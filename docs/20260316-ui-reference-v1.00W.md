# BSuite UI Architecture Summary

This document replaces the older generic UI requirements page and acts as the current cross-suite summary for UI direction.

## Canonical Source Chain

Use these documents together, in this order:

1. `docs/20260228-d2c-theme-specification-v1.00W.md`
   - Canonical D2C Neon Electric palette, semantic tokens, Balanced Hybrid shell guidance, and light/dark guidance for business-suite-unified, CRM7, Conduit, and R80.3.

2. `crm7/docs/plans/2026-03-04-admin-ui-customization-design.md`
   - Canonical builder/customization architecture for drag-drop layouts, custom pages, field linking, picklists, saved views, and dashboard/widget composition.

3. `docs/20260227-contributing-standards-guide-v1.00W.md`
   - Canonical cross-project standards for accessibility, responsiveness, performance expectations, and documentation compliance.

4. `braden/CONTRIBUTING.md` and `braden/docs/UI_UX_BEST_PRACTICES.md`
   - Canonical corporate-brand guidance for the Braden refresh. Braden is explicitly outside the D2C Neon system even while its UI is being modernized.

## Shared UI Direction

### Brand and Surface System

- BSuite D2C web apps use the Neon Electric palette with semantic tokens, not ad hoc hardcoded colors.
- The D2C surface language is the Balanced Hybrid model:
  - elevated shell backgrounds
  - shell accent surfaces
  - semantic shell borders
  - soft shadows with restrained glow
  - premium hero and panel treatment on high-visibility surfaces
- Braden remains the only corporate-branded exception.
- Braden is also receiving a UI refresh, but it must keep its corporate palette and should not visually drift into the Neon Electric system.
- High-visibility CRM7 surfaces use a balanced hybrid treatment:
  - premium shell backgrounds
  - restrained glow
  - elevated cards and chrome
  - strong hierarchy without noisy neon overload

### Layout and Reflow

- Layouts must use the available screen width before introducing extra scroll or empty dead zones.
- Dashboards, builders, and settings surfaces must support meaningful reflow across breakpoints.
- Dense desktop layouts should still preserve touch-safe controls and keyboard accessibility.

### Builder and Customization Model

- One primary edit surface per page type.
- Drag-drop is the default interaction for reorderable UI surfaces.
- Customization should follow shared primitives across BSuite:
  - fields
  - views
  - layouts
  - pages
  - widgets or dashboard blocks
- Builders must expose a clear path to add custom elements tied to features, entities, and custom pages.

### UX Requirements

- Clear visual hierarchy
- Minimal clicks for common tasks
- Progressive disclosure for advanced configuration
- Consistent action placement and interaction patterns
- Accessible focus states, contrast, and keyboard flows

### Performance and Accessibility

- Responsive layouts across desktop, tablet, and mobile
- WCAG 2.1 AA baseline
- Fast initial loading, progressive data hydration, and resilient empty/error states
- Avoid duplicate surfaces, placeholder controls, and dead-end editors

## Current Implementation Direction

### CRM7

- Shared shell and dashboard surfaces should reflect the balanced hybrid CRM7 shell.
- Dashboard editing should use a real builder model:
  - drag-sort canvas
  - per-block width control
  - custom block insertion
  - one primary builder entry point
- Form layout, custom field, saved view, and custom page tooling should converge toward the architecture in the CRM7 admin UI customization design doc.

### Wider BSuite

- CRM7 is the proving ground for the shared builder model.
- Once stabilized, the same primitives should be portable to other D2C apps where relevant.
- Do not fork competing UI systems when the existing builder/customization architecture can be extended.

### Braden

- Braden is refreshed as a corporate site, not as a D2C product shell.
- Preserve Braden Red, Gold, Navy, corporate typography, and restrained professional shadows.
- Modernize layout density, cards, spacing, and interactions without introducing D2C neon accents or glow-heavy chrome.

## Legacy Status

- The previous generic 2024 contents of this file are retired.
- Imported donor docs under `docs/crm13-docs/` remain reference-only.
- Any reference to `Theme-best-practice.md` should be treated as stale and replaced with `docs/20260228-d2c-theme-specification-v1.00W.md`.
