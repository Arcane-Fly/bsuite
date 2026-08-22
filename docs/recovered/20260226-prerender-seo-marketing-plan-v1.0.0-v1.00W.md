<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED
>
> Build-time pre-rendering shipped.
>
> **Evidence:** `crm7/scripts/prerender.mjs`, `braden/scripts/prerender.mjs`, and a `prerender`
> entry in the `package.json` of `crm7`, `business-suite-unified` and `braden`. The estate's
> `build:noprerender` convention exists precisely because pre-rendering is the default path.
>
> **Marker defect:** versioned `v1.0.0` with **no status letter**, breaking the estate convention
> (`YYYYMMDD-name-vN.NNS.md`). Delivered work should read `A`.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

# Pre-rendering, SEO & Marketing Landing Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Version:** 1.0.0
**Date:** 2026-02-26
**Status:** Final
**Author:** Development Team
**Supersedes:** N/A

**Goal:** Achieve Google Search Console "Valid" indexing status for all public-facing pages across braden, crm7, business-suite-unified, and R80.3 by adding build-time pre-rendering, per-page SEO metadata, and new marketing landing pages.

**Architecture:** Each project stays as a Vite SPA. We add `react-helmet-async` for per-page `<head>` management and a postbuild prerender script using Puppeteer to generate static HTML for public routes. Auth-gated routes remain client-rendered. Two new marketing landing pages follow the crm7 MarketingHome pattern using the D2C Neon Electric theme.

**Tech Stack:** React 18/19, Vite 6, react-helmet-async, Puppeteer (build-time prerendering), Tailwind CSS, D2C Neon Electric theme system

**Design Doc:** `docs/plans/20260226-prerender-seo-marketing-design-v1.0.0.md`

---

## Task 1: Add react-helmet-async to braden

**Files:**
- Modify: `braden/package.json`
- Modify: `braden/src/main.tsx`
- Modify: `braden/src/App.tsx`

**Step 1: Install dependency**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/braden && pnpm add react-helmet-async
```

**Step 2: Wrap app with HelmetProvider in main.tsx**

In `braden/src/main.tsx`, add the `HelmetProvider` import and wrap the `<App />`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'

// ... existing root element finding logic ...

root.render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
)
```

**Step 3: Verify build succeeds**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/braden && pnpm run build
```
Expected: Build completes without errors.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/main.tsx
git commit -m "feat(braden): add react-helmet-async with HelmetProvider"
```

---

## Task 2: Add per-page SEO metadata to braden pages

**Files:**
- Create: `braden/src/components/SEOHead.tsx`
- Modify: `braden/src/pages/Index.tsx`
- Modify: `braden/src/pages/apprenticeships.tsx`
- Modify: `braden/src/pages/traineeships.tsx`
- Modify: `braden/src/pages/recruitment.tsx`
- Modify: `braden/src/pages/Service.tsx`

**Step 1: Create reusable SEOHead component**

Create `braden/src/components/SEOHead.tsx`:

```tsx
import { Helmet } from 'react-helmet-async'

interface SEOHeadProps {
  title: string
  description: string
  path: string
  ogImage?: string
}

const BASE_URL = 'https://braden.com.au'

export function SEOHead({ title, description, path, ogImage = '/noBgGold.png' }: SEOHeadProps) {
  const url = `${BASE_URL}${path}`
  const fullTitle = path === '/' ? 'Braden Group | People. Employment. Progress.' : `${title} | Braden Group`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${BASE_URL}${ogImage}`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${BASE_URL}${ogImage}`} />
    </Helmet>
  )
}
```

**Step 2: Add SEOHead to Index page**

In `braden/src/pages/Index.tsx`, add at the top of the component return (inside the first element):

```tsx
import { SEOHead } from '@/components/SEOHead'

// Inside the Index component, add as first child:
<SEOHead
  title="Home"
  description="Braden Group provides workforce solutions including apprenticeships, traineeships, recruitment, and compliance management across Australia."
  path="/"
/>
```

**Step 3: Add SEOHead to apprenticeships page**

In `braden/src/pages/apprenticeships.tsx`:

```tsx
import { SEOHead } from '@/components/SEOHead'

// Add inside the component, before <Layout>:
<>
  <SEOHead
    title="Apprenticeship Programs"
    description="Launch your career with Braden Group's comprehensive apprenticeship programs. Industry-recognised qualifications with hands-on workplace training across Australia."
    path="/apprenticeships"
  />
  <Layout>
    {/* existing content */}
  </Layout>
</>
```

**Step 4: Add SEOHead to traineeships page**

Same pattern — add to `braden/src/pages/traineeships.tsx`:

```tsx
<SEOHead
  title="Traineeship Programs"
  description="Braden Group traineeship programs combine structured training with workplace experience. Nationally recognised qualifications for career advancement."
  path="/traineeships"
/>
```

**Step 5: Add SEOHead to recruitment page**

Same pattern — add to `braden/src/pages/recruitment.tsx`:

```tsx
<SEOHead
  title="Recruitment Services"
  description="Braden Group recruitment services connect businesses with skilled workers. Specialising in apprentice and trainee placement across Australian industries."
  path="/recruitment"
/>
```

**Step 6: Add SEOHead to Service page (dynamic)**

In `braden/src/pages/Service.tsx`, add metadata per service using the existing `serviceData` object:

```tsx
import { SEOHead } from '@/components/SEOHead'

// Add SEO metadata to serviceData entries:
const seoData: Record<string, { title: string; description: string }> = {
  compliance: {
    title: 'Regulatory Compliance Management',
    description: 'Ensure all placements adhere to industry regulations. Braden Group manages compliance with training requirements, workplace safety, and government standards.',
  },
  mentoring: {
    title: 'Mentoring & Career Coaching',
    description: 'One-on-one mentoring and career coaching for apprentices and trainees. Regular progress reviews and professional development support.',
  },
  technology: {
    title: 'Technology Solutions',
    description: 'Tailored IT solutions including software licensing, managed services, and cloud-based training management for businesses in the employment sector.',
  },
  'future-services': {
    title: 'Future Services',
    description: 'Customised training programs, digital skills-matching, online learning, and expanded IT services coming soon from Braden Group.',
  },
}

// Inside the component, before any JSX return:
const seo = seoData[serviceId as string]

// Add to the return:
{seo && (
  <SEOHead
    title={seo.title}
    description={seo.description}
    path={`/services/${serviceId}`}
  />
)}
```

**Step 7: Verify build succeeds**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/braden && pnpm run build
```
Expected: Build completes without errors.

**Step 8: Commit**

```bash
git add src/components/SEOHead.tsx src/pages/Index.tsx src/pages/apprenticeships.tsx src/pages/traineeships.tsx src/pages/recruitment.tsx src/pages/Service.tsx
git commit -m "feat(braden): add per-page SEO metadata with react-helmet-async"
```

---

## Task 3: Fix braden robots.txt and sitemap.xml

**Files:**
- Modify: `braden/public/robots.txt`
- Modify: `braden/public/sitemap.xml`

**Step 1: Fix robots.txt**

No changes needed — current robots.txt is correct (allows all, references sitemap).

**Step 2: Fix sitemap.xml — remove /contact, update dates**

Replace `braden/public/sitemap.xml` with corrected version:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://braden.com.au/</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://braden.com.au/apprenticeships</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://braden.com.au/traineeships</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://braden.com.au/recruitment</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://braden.com.au/services/compliance</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://braden.com.au/services/mentoring</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://braden.com.au/services/technology</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://braden.com.au/services/future-services</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

**Step 3: Commit**

```bash
git add public/sitemap.xml
git commit -m "fix(braden): remove nonexistent /contact from sitemap, update lastmod dates"
```

---

## Task 4: Add react-helmet-async to crm7

**Files:**
- Modify: `crm7/package.json`
- Modify: `crm7/src/main.tsx`

**Step 1: Install dependency**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7 && pnpm add react-helmet-async
```

**Step 2: Wrap app with HelmetProvider**

In `crm7/src/main.tsx`, the root render is wrapped in `ErrorBoundary > AuthErrorBoundary > AuthProvider > App`. Add `HelmetProvider` as the outermost wrapper:

```tsx
import { HelmetProvider } from 'react-helmet-async'

// Wrap the existing render tree:
root.render(
  <HelmetProvider>
    <ErrorBoundary>
      <AuthErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AuthErrorBoundary>
    </ErrorBoundary>
  </HelmetProvider>
)
```

**Step 3: Add SEOHead to MarketingHome**

In `crm7/src/components/marketing/MarketingHome.tsx`, add Helmet at the top of the component:

```tsx
import { Helmet } from 'react-helmet-async'

// Inside MarketingHomeInner, add as first JSX child:
<Helmet>
  <title>CRM7 | Advanced Customer Relationship Management</title>
  <meta name="description" content="CRM7 is an enterprise CRM platform for Australian GTOs with apprentice management, compliance tracking, financial reporting, and AI-powered insights." />
  <link rel="canonical" href="https://crm7.vercel.app/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://crm7.vercel.app/" />
  <meta property="og:title" content="CRM7 | Advanced Customer Relationship Management" />
  <meta property="og:description" content="Enterprise CRM platform for Australian GTOs with apprentice management, compliance tracking, and AI insights." />
  <meta property="og:image" content="https://crm7.vercel.app/logos/crm7-logo.svg" />
  <meta name="twitter:card" content="summary_large_image" />
</Helmet>
```

**Step 4: Verify build succeeds**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7 && pnpm run build
```

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/main.tsx src/components/marketing/MarketingHome.tsx
git commit -m "feat(crm7): add react-helmet-async with per-page SEO metadata"
```

---

## Task 5: Create crm7 robots.txt and sitemap.xml

**Files:**
- Create: `crm7/public/robots.txt`
- Create: `crm7/public/sitemap.xml`

**Step 1: Create robots.txt**

Create `crm7/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /contacts
Disallow: /clients
Disallow: /apprentices
Disallow: /leads
Disallow: /settings
Disallow: /analytics
Disallow: /financial
Disallow: /auth/
Disallow: /admin
Disallow: /portal

Sitemap: https://crm7.vercel.app/sitemap.xml
```

**Step 2: Create sitemap.xml**

Create `crm7/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://crm7.vercel.app/</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

**Step 3: Commit**

```bash
git add public/robots.txt public/sitemap.xml
git commit -m "feat(crm7): add robots.txt and sitemap.xml for SEO"
```

---

## Task 6: Add react-helmet-async to business-suite-unified

**Files:**
- Modify: `business-suite-unified/package.json`
- Modify: `business-suite-unified/src/main.tsx`

**Step 1: Install dependency**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && pnpm add react-helmet-async
```

**Step 2: Wrap app with HelmetProvider**

In `business-suite-unified/src/main.tsx` (currently 10 lines), update:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)
```

**Step 3: Fix incorrect og:url in index.html**

In `business-suite-unified/index.html`, fix the wrong domain references:

- Line 13: Change `https://business-suite-unified.com/` to `https://suite.crm7.app/`
- Line 20: Change `https://business-suite-unified.com/` to `https://suite.crm7.app/`

**Step 4: Verify build succeeds**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && pnpm run build
```

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/main.tsx index.html
git commit -m "feat(business-suite-unified): add react-helmet-async, fix og:url domain"
```

---

## Task 7: Create business-suite-unified marketing landing page

**Files:**
- Create: `business-suite-unified/src/components/marketing/MarketingHome.tsx`
- Modify: `business-suite-unified/src/components/AppContent.tsx`

**Step 1: Create MarketingHome component**

Create `business-suite-unified/src/components/marketing/MarketingHome.tsx`:

```tsx
import { Helmet } from 'react-helmet-async'
import {
  KeyRound,
  CreditCard,
  LayoutGrid,
  Shield,
  BarChart3,
  Palette,
  Check,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const BASE_URL = 'https://suite.crm7.app'

const stats = [
  { value: '5+', label: 'Integrated Products' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
]

const features = [
  {
    icon: KeyRound,
    title: 'Single Sign-On',
    description: 'One login for CRM7, R8 Calculator, Throughput Analytics, and all suite products.',
  },
  {
    icon: CreditCard,
    title: 'Subscription Management',
    description: 'Manage your plan, billing, and payment methods from a single unified dashboard.',
  },
  {
    icon: LayoutGrid,
    title: 'Service Hub',
    description: 'Access every product in the Business Suite from one central location.',
  },
  {
    icon: Shield,
    title: 'Admin Panel',
    description: 'Enterprise-grade user management, roles, permissions, and audit logging.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Cross-product reporting and business intelligence across your entire suite.',
  },
  {
    icon: Palette,
    title: 'White-Label',
    description: 'Custom branding and domain configuration for enterprise deployments.',
  },
]

const plans = [
  {
    name: 'Basic',
    price: '$29',
    period: '/month',
    features: ['CRM7 Dashboard', 'R8 Calculator', 'Email Support', '5 Users'],
    accent: 'from-neon-electric-cyan to-neon-electric-blue',
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/month',
    features: [
      'Everything in Basic',
      'GTO Compliance',
      'Government APIs',
      'Analytics',
      'Throughput',
      '25 Users',
    ],
    accent: 'from-neon-electric-blue to-neon-electric-indigo',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    features: [
      'Everything in Professional',
      'Admin Panel',
      'Document Management',
      'White-Label',
      'Priority Support',
      'Unlimited Users',
    ],
    accent: 'from-neon-electric-indigo to-neon-electric-purple',
  },
]

export default function MarketingHome() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
      <Helmet>
        <title>Business Suite | One Dashboard. Every Business Tool.</title>
        <meta
          name="description"
          content="Business Suite Unified is the central dashboard for Braden Group's SaaS products. Single sign-on access to CRM7, R8 Calculator, Throughput Analytics, and more."
        />
        <link rel="canonical" href={BASE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={BASE_URL} />
        <meta property="og:title" content="Business Suite | One Dashboard. Every Business Tool." />
        <meta
          property="og:description"
          content="Unified dashboard for CRM7, R8 Calculator, Throughput Analytics, and all Braden Group products."
        />
        <meta property="og:image" content={`${BASE_URL}/logos/crm7-logo.svg`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Header */}
      <header className="border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-electric-blue to-neon-electric-cyan flex items-center justify-center">
              <span className="text-white font-bold text-lg">BS</span>
            </div>
            <span className="text-xl font-semibold">Business Suite</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-neon-electric-blue text-white font-medium hover:opacity-90 transition-opacity"
              >
                Dashboard
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="px-4 py-2 rounded-lg border border-dark-border text-dark-text-secondary hover:text-dark-text-primary transition-colors"
                >
                  Log in
                </a>
                <a
                  href="/login"
                  className="px-4 py-2 rounded-lg bg-neon-electric-blue text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-neon-electric-blue/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            One Dashboard.{' '}
            <span className="bg-gradient-to-r from-neon-electric-blue to-neon-electric-cyan bg-clip-text text-transparent">
              Every Business Tool.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-dark-text-secondary max-w-2xl mx-auto mb-10">
            Unified access to CRM7, R8 Calculator, Throughput Analytics, and all Braden Group
            products from a single sign-on dashboard.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/login"
              className="px-6 py-3 rounded-lg bg-neon-electric-blue text-white font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://www.braden.com.au"
              className="px-6 py-3 rounded-lg border border-dark-border text-dark-text-secondary hover:text-dark-text-primary transition-colors inline-flex items-center gap-2"
            >
              Learn More <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-bold text-neon-electric-blue">{stat.value}</div>
                <div className="text-sm text-dark-text-secondary mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">Everything You Need</h2>
          <p className="text-dark-text-secondary text-center max-w-xl mx-auto mb-12">
            A unified platform that brings together all your business tools under one roof.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-dark-bg-secondary border border-dark-border hover:border-neon-electric-blue/30 transition-colors"
              >
                <feature.icon className="w-8 h-8 text-neon-electric-blue mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-text-secondary text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-dark-bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-dark-text-secondary text-center max-w-xl mx-auto mb-12">
            Choose the plan that fits your organisation. All plans include SSO and the unified dashboard.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border ${
                  plan.popular
                    ? 'border-neon-electric-blue bg-dark-bg-accent'
                    : 'border-dark-border bg-dark-bg-primary'
                } relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neon-electric-blue text-white text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-dark-text-secondary">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-dark-text-secondary">
                      <Check className="w-4 h-4 text-neon-electric-green flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`block text-center px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90 ${
                    plan.popular
                      ? 'bg-neon-electric-blue text-white'
                      : 'border border-dark-border text-dark-text-primary hover:bg-dark-bg-tertiary'
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-electric-blue to-neon-electric-cyan flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BS</span>
                </div>
                <span className="font-semibold">Business Suite</span>
              </div>
              <p className="text-sm text-dark-text-secondary">
                A product of{' '}
                <a href="https://www.braden.com.au" className="text-neon-electric-blue hover:underline">
                  Braden Group
                </a>
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Products</h4>
              <ul className="space-y-2 text-sm text-dark-text-secondary">
                <li><a href="https://crm7.vercel.app" className="hover:text-dark-text-primary transition-colors">CRM7</a></li>
                <li><a href="https://r8.crm7.app" className="hover:text-dark-text-primary transition-colors">R8 Calculator</a></li>
                <li><a href="https://throughflow.vercel.app" className="hover:text-dark-text-primary transition-colors">Throughput Analytics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-dark-text-secondary">
                <li><a href="https://www.braden.com.au" className="hover:text-dark-text-primary transition-colors">Braden Group</a></li>
                <li><a href="https://www.braden.com.au/apprenticeships" className="hover:text-dark-text-primary transition-colors">Apprenticeships</a></li>
                <li><a href="https://www.braden.com.au/recruitment" className="hover:text-dark-text-primary transition-colors">Recruitment</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-dark-border text-center text-sm text-dark-text-secondary">
            &copy; {new Date().getFullYear()} Braden Group. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
```

**Step 2: Update AppContent.tsx to show MarketingHome for unauthenticated users at /**

In `business-suite-unified/src/components/AppContent.tsx`, the current `MainApp` renders `UnifiedDashboard` at `/`. Update to show `MarketingHome` when not authenticated:

```tsx
import MarketingHome from './marketing/MarketingHome'

// In the AppContent component, add a public route for '/' when not authenticated.
// The existing AuthScreen handles '/login'. Add MarketingHome as the default
// unauthenticated view, replacing the redirect to login:

export function AppContent() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Public routes — no auth required
  if (location.pathname === '/auth/callback') return <AuthCallback />
  if (location.pathname === '/oauth/consent') return <OAuthConsent />

  if (loading) return <LoadingScreen />

  // Unauthenticated: show marketing home at '/', login form at '/login'
  if (!user) {
    if (location.pathname === '/login') return <AuthScreen />
    return <MarketingHome />
  }

  // Authenticated: show the app
  return <MainApp />
}
```

**Step 3: Create marketing directory**

Run:
```bash
mkdir -p /home/braden/Desktop/Dev/bsuite/business-suite-unified/src/components/marketing
```

**Step 4: Verify build succeeds**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && pnpm run build
```

**Step 5: Commit**

```bash
git add src/components/marketing/MarketingHome.tsx src/components/AppContent.tsx
git commit -m "feat(business-suite-unified): add marketing landing page with pricing"
```

---

## Task 8: Create business-suite-unified robots.txt and sitemap.xml

**Files:**
- Create: `business-suite-unified/public/robots.txt`
- Create: `business-suite-unified/public/sitemap.xml`

**Step 1: Create robots.txt**

Create `business-suite-unified/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /billing
Disallow: /settings
Disallow: /admin
Disallow: /login
Disallow: /auth/
Disallow: /oauth/

Sitemap: https://suite.crm7.app/sitemap.xml
```

**Step 2: Create sitemap.xml**

Create `business-suite-unified/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://suite.crm7.app/</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

**Step 3: Commit**

```bash
git add public/robots.txt public/sitemap.xml
git commit -m "feat(business-suite-unified): add robots.txt and sitemap.xml"
```

---

## Task 9: Add react-helmet-async to R80.3

**Files:**
- Modify: `R80.3/package.json`
- Modify: `R80.3/src/main.tsx`

**Step 1: Install dependency**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm add react-helmet-async
```

**Step 2: Wrap app with HelmetProvider in main.tsx**

In `R80.3/src/main.tsx`, update to wrap with HelmetProvider:

```tsx
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import { useAuthStore } from './stores'
import './index.css'
import AuthCallback from './pages/AuthCallback.tsx'

const isAuthCallback = window.location.pathname === '/auth/callback'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = useAuthStore.getState().initialize()
    return cleanup
  }, [])

  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <AuthInitializer>
        {isAuthCallback ? <AuthCallback /> : <App />}
      </AuthInitializer>
    </HelmetProvider>
  </StrictMode>
)
```

**Step 3: Verify build succeeds**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm run build
```

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/main.tsx
git commit -m "feat(r8): add react-helmet-async with HelmetProvider"
```

---

## Task 10: Create R80.3 marketing landing page

**Files:**
- Create: `R80.3/src/components/marketing/MarketingHome.tsx`
- Modify: `R80.3/src/main.tsx`
- Modify: `R80.3/src/App.tsx`

**Step 1: Create MarketingHome component**

Create `R80.3/src/components/marketing/MarketingHome.tsx`:

```tsx
import { Helmet } from 'react-helmet-async'
import {
  Calculator,
  FileText,
  Scale,
  Download,
  BarChart3,
  RefreshCw,
  Check,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

const BASE_URL = 'https://r8.crm7.app'

const stats = [
  { value: '10K+', label: 'Calculations Processed' },
  { value: '50+', label: 'Enterprise Agreements' },
  { value: '100%', label: 'Fair Work Compliant' },
]

const features = [
  {
    icon: Calculator,
    title: 'Multi-Apprentice Calculations',
    description: 'Calculate and compare charge rates for multiple apprentices simultaneously across different years and classifications.',
  },
  {
    icon: FileText,
    title: 'Enterprise Agreements',
    description: 'Built-in support for enterprise agreements with customisable pay rates, allowances, and on-cost calculations.',
  },
  {
    icon: Scale,
    title: 'Fair Work Compliance',
    description: 'Calculations based on Australian Fair Work standards ensuring your charge rates meet all regulatory requirements.',
  },
  {
    icon: Download,
    title: 'PDF & Spreadsheet Export',
    description: 'Export detailed calculation breakdowns to PDF or spreadsheet format for reporting and record keeping.',
  },
  {
    icon: BarChart3,
    title: 'Comparative Analysis',
    description: 'Side-by-side comparison of charge rates across apprentices, years, and agreements to optimise pricing.',
  },
  {
    icon: RefreshCw,
    title: 'Real-time Rate Updates',
    description: 'Instantly recalculate rates as you adjust pay rates, on-costs, margins, and working patterns.',
  },
]

export default function MarketingHome({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-dark-bg-primary text-dark-text-primary">
      <Helmet>
        <title>R8 Calculator | Professional Charge Rate Calculator for Australian GTOs</title>
        <meta
          name="description"
          content="R8 Calculator is a professional charge rate calculator for Australian Group Training Organisations. Calculate precise apprentice charge rates with Fair Work compliance."
        />
        <link rel="canonical" href={BASE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={BASE_URL} />
        <meta property="og:title" content="R8 Calculator | Professional Charge Rate Calculator" />
        <meta
          property="og:description"
          content="Calculate precise apprentice charge rates for Australian GTOs with Fair Work compliance, multi-apprentice support, and PDF export."
        />
        <meta property="og:image" content={`${BASE_URL}/logos/crm7-logo.svg`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Header */}
      <header className="border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8 text-neon-electric-cyan" />
            <span className="text-xl font-semibold">R8 Calculator</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-lg border border-dark-border text-dark-text-secondary hover:text-dark-text-primary transition-colors"
            >
              Log in
            </button>
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-lg bg-neon-electric-cyan text-dark-bg-primary font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-neon-electric-cyan/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Professional Charge Rate Calculator{' '}
            <span className="bg-gradient-to-r from-neon-electric-cyan to-neon-electric-blue bg-clip-text text-transparent">
              for Australian GTOs
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-dark-text-secondary max-w-2xl mx-auto mb-10">
            Calculate precise apprentice charge rates with Fair Work compliance, multi-apprentice
            support, enterprise agreements, and detailed export capabilities.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="px-6 py-3 rounded-lg bg-neon-electric-cyan text-dark-bg-primary font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              Start Calculating <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="https://www.braden.com.au"
              className="px-6 py-3 rounded-lg border border-dark-border text-dark-text-secondary hover:text-dark-text-primary transition-colors inline-flex items-center gap-2"
            >
              About Braden Group <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-bold text-neon-electric-cyan">{stat.value}</div>
                <div className="text-sm text-dark-text-secondary mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">Built for Australian GTOs</h2>
          <p className="text-dark-text-secondary text-center max-w-xl mx-auto mb-12">
            Purpose-built tools for Group Training Organisations to calculate accurate, compliant charge rates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-dark-bg-secondary border border-dark-border hover:border-neon-electric-cyan/30 transition-colors"
              >
                <feature.icon className="w-8 h-8 text-neon-electric-cyan mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-text-secondary text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-dark-bg-secondary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Calculate?</h2>
          <p className="text-dark-text-secondary mb-8">
            Join Australian GTOs using R8 Calculator for accurate, Fair Work compliant charge rate calculations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="px-6 py-3 rounded-lg bg-neon-electric-cyan text-dark-bg-primary font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="mailto:info@braden.com.au"
              className="px-6 py-3 rounded-lg border border-dark-border text-dark-text-secondary hover:text-dark-text-primary transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-6 h-6 text-neon-electric-cyan" />
                <span className="font-semibold">R8 Calculator</span>
              </div>
              <p className="text-sm text-dark-text-secondary">
                Professional charge rate calculations based on Australian industry standards. A product of{' '}
                <a href="https://www.braden.com.au" className="text-neon-electric-cyan hover:underline">
                  Braden Group
                </a>
                .
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-dark-text-secondary">
                <li><a href="https://suite.crm7.app" className="hover:text-dark-text-primary transition-colors">Business Suite</a></li>
                <li><a href="https://crm7.vercel.app" className="hover:text-dark-text-primary transition-colors">CRM7</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-dark-text-secondary">
                <li><a href="https://www.braden.com.au" className="hover:text-dark-text-primary transition-colors">Braden Group</a></li>
                <li><a href="https://www.braden.com.au/apprenticeships" className="hover:text-dark-text-primary transition-colors">Apprenticeships</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-dark-border text-center text-sm text-dark-text-secondary">
            &copy; {new Date().getFullYear()} Braden Group. All rights reserved. All calculations are estimates.
          </div>
        </div>
      </footer>
    </div>
  )
}
```

**Step 2: Update R80.3 main.tsx to route unauthenticated users to MarketingHome**

In `R80.3/src/main.tsx`, update the routing logic:

```tsx
import MarketingHome from './components/marketing/MarketingHome.tsx'

// Replace the existing ternary:
// {isAuthCallback ? <AuthCallback /> : <App />}
// With:
{isAuthCallback ? <AuthCallback /> : <AppOrMarketing />}

// Add new component:
function AppOrMarketing() {
  const user = useAuthStore(state => state.user)
  const initialized = useAuthStore(state => state.initialized)

  if (!initialized) {
    return <div className="min-h-screen bg-dark-bg-primary flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-electric-cyan" />
    </div>
  }

  if (!user) {
    return <MarketingHome onLogin={() => {
      // Trigger auth flow — redirect to Business Suite SSO
      window.location.href = 'https://suite.crm7.app/login'
    }} />
  }

  return <App />
}
```

Note: Check if `useAuthStore` has an `initialized` field. If not, use a loading state pattern. The auth store initialization happens in `AuthInitializer`.

**Step 3: Create marketing directory**

Run:
```bash
mkdir -p /home/braden/Desktop/Dev/bsuite/R80.3/src/components/marketing
```

**Step 4: Add meta tags to R80.3 index.html**

Update `R80.3/index.html` to include basic meta description (fallback for pre-render):

```html
<meta name="description" content="R8 Calculator - Professional charge rate calculator for Australian Group Training Organisations. Fair Work compliant." />
```

**Step 5: Verify build succeeds**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm run build
```

**Step 6: Commit**

```bash
git add src/components/marketing/MarketingHome.tsx src/main.tsx index.html
git commit -m "feat(r8): add marketing landing page for unauthenticated users"
```

---

## Task 11: Create R80.3 robots.txt and sitemap.xml

**Files:**
- Create: `R80.3/public/robots.txt`
- Create: `R80.3/public/sitemap.xml`

**Step 1: Create robots.txt**

Create `R80.3/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /auth/

Sitemap: https://r8.crm7.app/sitemap.xml
```

**Step 2: Create sitemap.xml**

Create `R80.3/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://r8.crm7.app/</loc>
    <lastmod>2026-02-26</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

**Step 3: Commit**

```bash
git add public/robots.txt public/sitemap.xml
git commit -m "feat(r8): add robots.txt and sitemap.xml"
```

---

## Task 12: Add prerender build script to all 4 projects

**Files:**
- Create: `scripts/prerender.mjs` (at bsuite root — shared by all projects)
- Modify: `braden/package.json`
- Modify: `crm7/package.json`
- Modify: `business-suite-unified/package.json`
- Modify: `R80.3/package.json`

**Step 1: Install puppeteer as a dev dependency in each project**

Run all four in parallel:
```bash
cd /home/braden/Desktop/Dev/bsuite/braden && pnpm add -D puppeteer
cd /home/braden/Desktop/Dev/bsuite/crm7 && pnpm add -D puppeteer
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && pnpm add -D puppeteer
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm add -D puppeteer
```

**Step 2: Create shared prerender script**

Create `scripts/prerender.mjs` at the bsuite root:

```javascript
#!/usr/bin/env node
/**
 * Build-time prerender script for Vite SPAs.
 *
 * Usage: node scripts/prerender.mjs --dist=dist --routes=/,/about,/contact
 *
 * Launches a local static server from the dist directory, visits each route
 * with headless Chromium, and saves the rendered HTML as static files.
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, val] = arg.replace(/^--/, '').split('=')
    return [key, val]
  })
)

const distDir = join(process.cwd(), args.dist || 'dist')
const routes = (args.routes || '/').split(',').map(r => r.trim())

if (!existsSync(distDir)) {
  console.error(`dist directory not found: ${distDir}`)
  process.exit(1)
}

console.log(`\nPrerendering ${routes.length} route(s) from ${distDir}...\n`)

// Simple static file server
function createStaticServer(dir) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm',
  }

  return createServer((req, res) => {
    let filePath = join(dir, req.url === '/' ? 'index.html' : req.url)

    // SPA fallback: if file doesn't exist, serve index.html
    if (!existsSync(filePath)) {
      filePath = join(dir, 'index.html')
    }

    try {
      const content = readFileSync(filePath)
      const ext = '.' + filePath.split('.').pop()
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
      res.end(content)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })
}

async function prerender() {
  const puppeteer = await import('puppeteer')
  const server = createStaticServer(distDir)

  await new Promise(resolve => server.listen(0, resolve))
  const port = server.address().port
  console.log(`Static server running on port ${port}`)

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  for (const route of routes) {
    const page = await browser.newPage()
    const url = `http://localhost:${port}${route}`

    console.log(`  Rendering: ${route}`)
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

    // Wait for React to render content
    await page.waitForSelector('#root', { timeout: 10000 })

    // Small delay to let Helmet update <head>
    await new Promise(r => setTimeout(r, 500))

    const html = await page.content()

    // Write to dist as a static HTML file
    const outPath = route === '/'
      ? join(distDir, 'index.html')
      : join(distDir, route, 'index.html')

    const outDir = dirname(outPath)
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }

    writeFileSync(outPath, html)
    console.log(`  Wrote: ${outPath}`)

    await page.close()
  }

  await browser.close()
  server.close()
  console.log(`\nPrerendered ${routes.length} route(s) successfully.\n`)
}

prerender().catch(err => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
```

**Step 3: Add prerender script to each project's package.json**

In each project's `package.json`, add to `"scripts"`:

**braden/package.json:**
```json
"build": "vite build && node ../scripts/prerender.mjs --dist=dist --routes=/,/apprenticeships,/traineeships,/recruitment,/services/compliance,/services/mentoring,/services/technology,/services/future-services"
```

**crm7/package.json:**
```json
"build": "NODE_OPTIONS='--max-old-space-size=6144' vite build && node ../scripts/prerender.mjs --dist=dist --routes=/"
```

**business-suite-unified/package.json:**
```json
"build": "vite build && node ../scripts/prerender.mjs --dist=dist --routes=/"
```

**R80.3/package.json:**
```json
"build": "vite build && node ../scripts/prerender.mjs --dist=dist --routes=/"
```

**Step 4: Test build with prerender on braden**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/braden && pnpm run build
```

Expected: Build succeeds, prerender outputs 8 HTML files with rendered content.

**Step 5: Verify prerendered HTML has SEO content**

Run:
```bash
head -20 /home/braden/Desktop/Dev/bsuite/braden/dist/index.html | grep -i '<title>'
```

Expected: Shows `<title>Braden Group | People. Employment. Progress.</title>` (not just `<title>Braden</title>`).

**Step 6: Test build on remaining projects**

Run each:
```bash
cd /home/braden/Desktop/Dev/bsuite/crm7 && pnpm run build
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && pnpm run build
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm run build
```

**Step 7: Commit**

```bash
cd /home/braden/Desktop/Dev/bsuite
git add scripts/prerender.mjs braden/package.json crm7/package.json business-suite-unified/package.json R80.3/package.json
git commit -m "feat: add build-time prerendering with Puppeteer for all projects"
```

---

## Task 13: Update vercel.json for prerendered routes

**Files:**
- Modify: `braden/vercel.json`
- Modify: `crm7/vercel.json`
- Modify: `business-suite-unified/vercel.json`
- Modify: `R80.3/vercel.json`

**Step 1: Update braden vercel.json**

The existing rewrite `"source": "/(.*)", "destination": "/index.html"` needs to be updated so pre-rendered routes serve their own HTML. With Vercel's `cleanUrls: true` already set and `trailingSlash: false`, the pre-rendered `apprenticeships/index.html` will be served automatically at `/apprenticeships`. The catch-all rewrite should only apply to non-existent files.

No change needed — Vercel already serves static files from `dist/` before falling through to rewrites. Since we write `dist/apprenticeships/index.html`, Vercel will serve it at `/apprenticeships` automatically, and the rewrite only fires for routes without a matching file.

**Step 2: Verify vercel.json configurations are correct**

For all 4 projects, verify the rewrite pattern is `"source": "/(.*)", "destination": "/index.html"` — this acts as a SPA fallback that only triggers when no static file matches. No changes needed.

**Step 3: Commit (if any changes were made)**

No commit needed — existing configs are compatible with prerendering.

---

## Task 14: Add JSON-LD structured data to braden

**Files:**
- Modify: `braden/src/components/SEOHead.tsx`

**Step 1: Add Organization schema to SEOHead for the home page**

Update `braden/src/components/SEOHead.tsx` to accept an optional `jsonLd` prop:

```tsx
interface SEOHeadProps {
  title: string
  description: string
  path: string
  ogImage?: string
  jsonLd?: Record<string, unknown>
}

// In the Helmet component, add:
{jsonLd && (
  <script type="application/ld+json">
    {JSON.stringify(jsonLd)}
  </script>
)}
```

**Step 2: Add Organization schema to Index page**

In `braden/src/pages/Index.tsx`, pass JSON-LD:

```tsx
<SEOHead
  title="Home"
  description="Braden Group provides workforce solutions..."
  path="/"
  jsonLd={{
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Braden Group',
    url: 'https://braden.com.au',
    logo: 'https://braden.com.au/noBgGold.png',
    description: 'Braden Group provides workforce solutions including apprenticeships, traineeships, recruitment, and compliance management across Australia.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
    },
    sameAs: [],
  }}
/>
```

**Step 3: Verify build**

Run:
```bash
cd /home/braden/Desktop/Dev/bsuite/braden && pnpm run build
```

**Step 4: Commit**

```bash
git add src/components/SEOHead.tsx src/pages/Index.tsx
git commit -m "feat(braden): add JSON-LD Organization structured data"
```

---

## Summary

| Task | Project | What | Commit Message |
|------|---------|------|---------------|
| 1 | braden | Add react-helmet-async + HelmetProvider | `feat(braden): add react-helmet-async with HelmetProvider` |
| 2 | braden | Per-page SEO metadata (8 pages) | `feat(braden): add per-page SEO metadata with react-helmet-async` |
| 3 | braden | Fix sitemap.xml | `fix(braden): remove nonexistent /contact from sitemap, update lastmod dates` |
| 4 | crm7 | Add react-helmet-async + SEO to MarketingHome | `feat(crm7): add react-helmet-async with per-page SEO metadata` |
| 5 | crm7 | Create robots.txt + sitemap.xml | `feat(crm7): add robots.txt and sitemap.xml for SEO` |
| 6 | bsu | Add react-helmet-async + fix og:url | `feat(business-suite-unified): add react-helmet-async, fix og:url domain` |
| 7 | bsu | Create marketing landing page | `feat(business-suite-unified): add marketing landing page with pricing` |
| 8 | bsu | Create robots.txt + sitemap.xml | `feat(business-suite-unified): add robots.txt and sitemap.xml` |
| 9 | R80.3 | Add react-helmet-async + HelmetProvider | `feat(r8): add react-helmet-async with HelmetProvider` |
| 10 | R80.3 | Create marketing landing page | `feat(r8): add marketing landing page for unauthenticated users` |
| 11 | R80.3 | Create robots.txt + sitemap.xml | `feat(r8): add robots.txt and sitemap.xml` |
| 12 | all | Prerender build script + puppeteer | `feat: add build-time prerendering with Puppeteer for all projects` |
| 13 | all | Verify vercel.json compatibility | No changes needed |
| 14 | braden | JSON-LD structured data | `feat(braden): add JSON-LD Organization structured data` |
