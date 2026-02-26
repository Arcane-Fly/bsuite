# Pre-rendering, SEO & Marketing Landing Pages — Design

**Version:** 1.0.0
**Date:** 2026-02-26
**Status:** Final
**Author:** Development Team
**Supersedes:** N/A

---

**Scope:** All 4 bsuite projects (braden, crm7, business-suite-unified, R80.3)
**Goal:** Achieve Google Search Console "Valid" indexing status for all public-facing pages

---

## Problem

All 4 projects are Vite SPAs that serve an empty `<div id="root"></div>` to crawlers. Google's two-phase rendering (crawl → deferred JS render) means pages often land in "Discovered - not indexed" or "Crawled - currently not indexed" status. Additionally, all pages share a single static `<title>` and `<meta description>` from index.html.

## Approach

**Vite pre-render plugin** — Generate static HTML at build time for public routes only. Auth-gated pages remain client-rendered. Per-page SEO metadata via `react-helmet-async`.

## Projects & Public Routes

### braden (braden.com.au)
- Framework: React 19 + Vite 6 + React Router v7
- Theme: Corporate (navy #2c3e50, red #ab233a, gold #cbb26a)
- Pre-render routes (8):
  - `/`
  - `/apprenticeships`
  - `/traineeships`
  - `/recruitment`
  - `/services/compliance`
  - `/services/mentoring`
  - `/services/technology`
  - `/services/future-services`

### crm7 (crm7.vercel.app)
- Framework: React 18 + Vite 6 + Wouter v3.7
- Theme: D2C Neon Electric (Deep Blue Neon, accent #00BFFF)
- Pre-render routes (1):
  - `/` (existing MarketingHome)

### business-suite-unified (suite.crm7.app)
- Framework: React 18 + Vite 6 + React Router v6
- Theme: D2C Neon Electric (accent Electric Blue #2563eb)
- Pre-render routes (1):
  - `/` (NEW marketing landing page)

### R80.3 (R8 Calculator — TBD domain)
- Framework: React 18 + Vite 6 (path-based routing, no router lib)
- Theme: D2C Neon Electric (accent Electric Cyan #00cec9)
- Pre-render routes (1):
  - `/` (NEW marketing landing page)

## New Marketing Landing Pages

Both follow the crm7 MarketingHome pattern and D2C Neon Electric theme system.

### business-suite-unified Landing Page
- **Hero:** "One Dashboard. Every Business Tool." — subtitle about unified access
- **Stats row:** Products integrated | Uptime | Organizations served
- **Features (6 cards):** Single Sign-On, Subscription Management, Service Hub, Admin Panel, Analytics, White-Label
- **Pricing section:** Basic $29 / Professional $79 / Enterprise $199
- **CTA:** Sign up / Login buttons
- **Footer:** Links to braden.com.au, product pages

### R80.3 Landing Page
- **Hero:** "Professional Charge Rate Calculator for Australian GTOs"
- **Stats row:** Calculations processed | Enterprise agreements | Compliance rate
- **Features (6 cards):** Multi-Apprentice Calculations, Enterprise Agreements, Fair Work Compliance, PDF/Spreadsheet Export, Comparative Analysis, Real-time Rate Updates
- **CTA:** Login / Contact Braden Group
- **Footer:** Links to braden.com.au, suite.crm7.app

## SEO Implementation

### Per-page metadata (react-helmet-async)
Each public page component gets:
- `<title>` — unique per page (e.g., "Apprenticeships | Braden Group")
- `<meta name="description">` — page-specific description
- `<link rel="canonical" href="...">` — self-referencing canonical
- Open Graph tags: og:title, og:description, og:image, og:url, og:type
- Twitter Card tags: twitter:card, twitter:title, twitter:description, twitter:image

### Static SEO files

**braden:**
- robots.txt: Fix — remove `/contact` reference
- sitemap.xml: Fix — remove `/contact`, update lastmod dates

**crm7:**
- robots.txt: Create — Allow `/`, Disallow `/dashboard`, `/contacts`, etc.
- sitemap.xml: Create — 1 URL (marketing home)

**business-suite-unified:**
- robots.txt: Create — Allow `/`, Disallow `/billing`, `/settings`, `/admin`
- sitemap.xml: Create — 1 URL (landing page)

**R80.3:**
- robots.txt: Create — Allow `/`, Disallow `/auth/callback`
- sitemap.xml: Create — 1 URL (landing page)

## Technical Implementation

### Dependencies to add (all projects)
- `react-helmet-async` — per-page head management
- `vite-plugin-prerender` — build-time pre-rendering

### vite.config.ts changes
```ts
import { prerenderPlugin } from 'vite-plugin-prerender'

export default defineConfig({
  plugins: [
    react(),
    prerenderPlugin({
      routes: ['/', '/apprenticeships', ...],
      renderer: 'puppeteer',
    }),
  ],
})
```

### vercel.json changes
Update rewrites so pre-rendered HTML files are served directly. Non-pre-rendered routes still fall through to index.html.

### index.html changes
Wrap root App with `<HelmetProvider>` in main.tsx.

## Design System Alignment

- braden.com.au: Corporate theme (Montserrat/Inter, navy/red/gold)
- CRM7, Business Suite, R8: D2C Neon Electric theme (Inter, deep navy bg, neon accents)
- All marketing pages share: same layout structure (Hero → Stats → Features → CTA → Footer)
- All footers link back to braden.com.au as the corporate parent
- Product accent colors: CRM7 (#00BFFF), Business Suite (#2563eb), R8 (#00cec9)
