# Core Web Vitals Baseline — Measurement Plan

**Date:** 2026-04-07
**Status:** Approved
**Version:** 1.00

## Purpose

Establish Core Web Vitals (CWV) baselines for all 5 BSuite apps to track performance regressions and guide optimization.

## Metrics to Measure

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Time for largest visible element to render |
| **INP** (Interaction to Next Paint) | < 200ms | Responsiveness to user interactions |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability during load |
| **TTFB** (Time to First Byte) | < 800ms | Server response time |
| **FCP** (First Contentful Paint) | < 1.8s | Time for first content to appear |

## Apps to Measure

| App | Production URL | Expected LCP Element |
|-----|---------------|---------------------|
| business-suite-unified | `suite.crm7.app` | Dashboard cards / portal grid |
| crm7 | `crm.crm7.app` | Pipeline view / contact list |
| conduit | `conduit.crm7.app` | Job listings / candidate table |
| braden | `www.braden.com.au` | Hero section / heading |
| R80.3 | `r8.crm7.app` | Rate calculator form |

## Measurement Method

### Option A: Vercel Speed Insights (Recommended)

All apps deploy on Vercel. Enable Speed Insights in each project dashboard for real-user monitoring (RUM).

```bash
# Per-app: install the analytics package
pnpm add @vercel/speed-insights
```

Then add to the app root:
```tsx
import { SpeedInsights } from '@vercel/speed-insights/react';
// Add <SpeedInsights /> to root layout
```

### Option B: Lighthouse CI (One-time Audit)

```bash
# Install globally
npm i -g @lhci/cli

# Run against each production URL
lhci collect --url=https://suite.crm7.app --numberOfRuns=3
lhci collect --url=https://crm.crm7.app --numberOfRuns=3
lhci collect --url=https://conduit.crm7.app --numberOfRuns=3
lhci collect --url=https://www.braden.com.au --numberOfRuns=3
lhci collect --url=https://r8.crm7.app --numberOfRuns=3
```

### Option C: PageSpeed Insights API

```bash
# Quick CLI check per URL
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://suite.crm7.app&strategy=mobile&category=performance"
```

## Baseline Template

Fill in after measurement:

| App | LCP | INP | CLS | TTFB | FCP | Score | Date |
|-----|-----|-----|-----|------|-----|-------|------|
| BSU | — | — | — | — | — | — | — |
| CRM7 | — | — | — | — | — | — | — |
| Conduit | — | — | — | — | — | — | — |
| Braden | — | — | — | — | — | — | — |
| R80.3 | — | — | — | — | — | — | — |

## Optimization Priorities

Based on app characteristics:

1. **CRM7** — Largest app, AI SDK lazy-loading critical, AG Grid can bloat bundle
2. **Conduit** — Next.js 16, server components should give good LCP, watch for client bundle size
3. **R80.3** — Calculation-heavy, ensure calc engine is lazy-loaded
4. **BSU** — Portal with Stripe, verify Stripe.js doesn't block LCP
5. **Braden** — Corporate site, should be fastest — target 90+ Lighthouse score

## Related

- [Performance Report](20260316-performance-report-v1.00A.md) — existing optimization work
- [D2C Theme Spec](20260228-d2c-theme-specification-v1.00A.md) — CSS variable approach avoids render-blocking
