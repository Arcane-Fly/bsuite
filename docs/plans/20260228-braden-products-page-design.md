# BSuite Products Page & Homepage Rework — Design Document

**Date:** 2026-02-28
**Status:** Working (W)
**Scope:** braden.com.au — new `/products` page, homepage Apps rework, Privacy/Terms pages, dynamic content routing

---

## Problem

braden.com.au currently has a homepage "Apps" section showing Biped, Monkey-Coder, and R80.3 as equal peers with hardcoded content and broken links to unimplemented `/apps/*` and `/case-studies/*` routes. There is no dedicated products page, no BSuite ecosystem overview, and no CMS editability for product listings.

## Solution

Leverage the existing `applications` Supabase table and CMS admin to create a CMS-driven products experience with BSuite apps front-and-centre.

---

## Database Change

### Add `category` column to `applications` table

```sql
ALTER TABLE applications
  ADD COLUMN category TEXT NOT NULL DEFAULT 'standalone';

COMMENT ON COLUMN applications.category IS
  'Product grouping: bsuite, marketplace, developer-tools';
```

**Seed data (upsert existing records):**

| name | category | demo_url |
|------|----------|----------|
| Business Suite | bsuite | https://suite.crm7.app |
| CRM7 | bsuite | https://crm.crm7.app |
| R80.3 Charge Calculator | bsuite | https://r8.crm7.app |
| Conduit ATS | bsuite | (internal / coming soon) |
| Biped | marketplace | https://home.biped.app |
| Monkey-Coder | developer-tools | (app URL) |

---

## Homepage: Rework `Apps.tsx`

**Current:** 3-card hardcoded grid (Biped, Monkey-Coder, R80.3).

**New:** CMS-driven BSuite teaser:
- Section title: "The BSuite Ecosystem"
- Subtitle: "Unified business tools for GTOs and enterprises"
- 4-card grid fetched from `applications` WHERE `category = 'bsuite'` AND `is_active = true`
- Each card: name, description (truncated), icon/image, "Learn More" anchor link
- Bottom CTA: "View All Products" linking to `/products`
- Braden corporate branding (red/gold/navy palette, Montserrat headings)

---

## Products Page: `/products`

### Structure

Three sections, all CMS-driven from `applications` table grouped by `category`:

#### Section 1 — BSuite Ecosystem (`category: 'bsuite'`)

- Hero banner with ecosystem overview copy
- Grid of detailed app cards (responsive: 1-col mobile, 2-col tablet, 4-col desktop)
- Each card:
  - App name + icon/image
  - Full description
  - Feature bullets (from `features` JSONB array)
  - "Launch App" button (links to `demo_url`)
- Ordered by `display_order`

#### Section 2 — Biped (`category: 'marketplace'`)

- Own section with heading "Marketplace Platform"
- App card with full description
- Roadmap badge: "Future BSuite integration planned"
- "Visit Biped" button linking to https://home.biped.app

#### Section 3 — Monkey-Coder (`category: 'developer-tools'`)

- Own section with heading "Developer Tools"
- App card with full description
- Action buttons as configured in CMS

### Data Fetching

```typescript
// Extend existing useApplications() hook or add:
const { data: apps } = useApplications();
const bsuiteApps = apps?.filter(a => a.category === 'bsuite');
const marketplaceApps = apps?.filter(a => a.category === 'marketplace');
const devToolApps = apps?.filter(a => a.category === 'developer-tools');
```

### SEO

- `<SEOHead>` component with title: "Products | Braden Group"
- Meta description: "Explore the BSuite ecosystem..."
- Prerender route added to build script

---

## Navigation

Add "Products" to the main navigation, positioned after "Services":

```
Services | Products | Apprenticeships | Traineeships | Recruitment
```

Update `src/config/navigation.ts` and any hardcoded nav arrays in `DesktopMenu.tsx` / `MobileMenu.tsx`.

---

## Admin CMS

The existing admin CRUD on `applications` table handles product management. Extend the admin UI to include:

- **Category dropdown** — select from: BSuite, Marketplace, Developer Tools
- All other fields (name, description, features, URLs, display_order, is_active) already supported

---

## Routing

Add to `src/Routes.tsx`:

```tsx
<Route path="/products" element={<Layout><Products /></Layout>} />
```

---

## Roadmap Flag

Add to `docs/00-master-roadmap.md`:

> **Future:** Integrate Biped marketplace platform into BSuite ecosystem (shared auth, unified billing, cross-product analytics). Source: `/home/braden/Desktop/Dev/business/biped/`

---

## Files

| Action | File | Description |
|--------|------|-------------|
| New | `src/pages/Products.tsx` | Full products page component |
| New | `supabase/migrations/YYYYMMDD_add_app_category.sql` | Add category column + seed data |
| Modify | `src/components/Apps.tsx` | Rework as CMS-driven BSuite teaser |
| Modify | `src/Routes.tsx` | Add `/products` route |
| Modify | `src/config/navigation.ts` | Add "Products" nav item |
| Modify | Navigation components | If nav items are hardcoded |
| Modify | `docs/00-master-roadmap.md` | Flag Biped integration |
| Modify | Admin components | Add category dropdown (if not auto-detected) |

---

## Privacy Policy & Terms of Service

### Problem

Footer links to `/privacy` and `/terms` exist in both `Footer.tsx` and `Layout.tsx` but the routes and pages were never created — always 404.

### Solution

Use the existing `content_pages` table to store Privacy Policy and Terms of Service as CMS-editable pages. Add dynamic routing so any page created in the CMS at `/admin/content` is automatically accessible.

### Implementation

1. **Dynamic catch-all route** in `Routes.tsx`:
   ```tsx
   <Route path="/:slug" element={<Layout><DynamicPage /></Layout>} />
   ```

2. **`DynamicPage.tsx`** component:
   - Fetches from `content_pages` WHERE `slug = params.slug` AND `is_published = true`
   - Renders structured content from JSONB
   - 404 fallback if slug not found or unpublished
   - SEO via `<SEOHead>` using `meta_description` field

3. **Seed content** — Adapted from Monkey-Coder templates at `/home/braden/Desktop/Dev/monkey-projects/monkey-coder/services/frontend/src/app/privacy/page.tsx` and `terms/page.tsx`:
   - Privacy Policy: 8 sections covering data collection, usage, security, sharing, retention, rights, changes, contact
   - Terms of Service: 6 sections covering acceptance, service description, user responsibilities, privacy, liability, contact
   - Both customised for Braden Group (Australian business, recruitment/GTO services, Privacy Act compliance)

4. **CMS editability** — Admin can edit content at `/admin/content`, which already has CRUD for `content_pages`

### Gap: ContentManager `onTogglePublish`

The existing `ContentPagesTable` has an `onTogglePublish` handler that only logs to console. This needs to be wired to actually update `is_published` in Supabase.

---

## Updated Files List

| Action | File | Description |
|--------|------|-------------|
| New | `src/pages/Products.tsx` | Full products page component |
| New | `src/pages/DynamicPage.tsx` | CMS-driven dynamic page renderer |
| New | `supabase/migrations/YYYYMMDD_add_app_category.sql` | Add category column + seed data |
| New | `supabase/migrations/YYYYMMDD_seed_legal_pages.sql` | Privacy & Terms content |
| Modify | `src/components/Apps.tsx` | Rework as CMS-driven BSuite teaser |
| Modify | `src/Routes.tsx` | Add `/products`, `/:slug` routes |
| Modify | `src/config/navigation.ts` | Add "Products" nav item |
| Modify | Navigation components | If nav items are hardcoded |
| Modify | `docs/00-master-roadmap.md` | Flag Biped integration |
| Modify | Admin components | Add category dropdown, fix onTogglePublish |

---

## Branding

All new UI follows Braden corporate branding:
- Primary: `#ab233a` (Braden Red)
- Accent: `#cbb26a` (Braden Gold)
- Navy: `#2c3e50`
- Typography: Montserrat (headings), Inter/Open Sans (body)
- NOT the D2C Neon Electric theme
