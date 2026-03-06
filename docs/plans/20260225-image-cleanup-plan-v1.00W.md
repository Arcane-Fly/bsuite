# Image Cleanup — Remove Non-Brand & AI-Generated Assets

Delete non-brand image files across bsuite apps, update all code references, and prepare placeholders for brand assets the user will provide for CRM7, R8, and Business Suite.

## Files to Delete (12 files)

### Braden App
| File | Reason |
|------|--------|
| `braden/public/images/about-image.png` | Stock/AI photo, no code refs found |
| `braden/public/images/hero-default.png` | Stock AI skyline — referenced in `HeroImage.tsx` as default `src` prop |
| `braden/public/images/hero-fallback.png` | AI abstract blob — referenced in `HeroImage.tsx` as `handleImageError` fallback |
| `braden/public/images/recruitment-services.png` | Broken placeholder — referenced in `Projects.tsx` |
| `braden/public/images/training-solutions.png` | Stock AI photo — referenced in `Projects.tsx` |
| `braden/public/noise.webp` | Broken/empty — no code refs found |
| `braden/public/placeholder-user.jpg` | Generic placeholder — no code refs found |
| `braden/public/placeholder.jpg` | Empty dark image — no code refs found |
| `braden/public/placeholder.svg` | SVG placeholder — referenced in `HeroImage.tsx`, `Projects.tsx`, `Navigation.tsx` as fallback |

### CRM7
| File | Reason |
|------|--------|
| `crm7/public/logos/crm7-logo.svg` | AI-generated logo — referenced in `crm7/index.html` (favicon + apple-touch-icon) |
| `crm7/public/logos/crm7-logo-glow.svg` | AI-generated logo — referenced in `crm7/index.html` (og:image, twitter:image) |

### Business Suite
| File | Reason |
|------|--------|
| `business-suite-unified/public/favicon.ico` | AI-generated, wrong favicon |

## Files to Keep (no changes)
- `braden/public/images/apprenticeship-program.png` — ok for now, replace later
- `braden/public/images/placeholder-project.png` — keep but stop displaying (update `Projects.tsx` error handler)
- `braden/public/images/logo-gold.png` — brand asset ✅
- `braden/public/noBgGold.png` — brand asset (duplicate but keeping) ✅
- `braden/public/favicon.ico` — correct brand favicon ✅
- All `braden/docs/` brand assets ✅

## Code Changes Required

### 1. `braden/src/components/hero/HeroImage.tsx`
- Change default `src` prop from `/images/hero-default.png` → remove or use brand image
- Change fallback from `/images/hero-fallback.png` → use a CSS gradient or brand-colored fallback
- Change ultimate fallback from `/placeholder.svg` → inline empty state or brand logo

### 2. `braden/src/components/Projects.tsx`
- Remove `recruitment-services.png` and `training-solutions.png` entries from projects array (or comment out until real images available)
- Keep `apprenticeship-program.png` entry
- Change error fallback from `/images/placeholder-project.png` → keep file but stop actively displaying it (currently only used on error, which is fine)
- Change fallback from `/placeholder.svg` → inline empty state

### 3. `braden/src/components/Navigation.tsx`
- Change fallback from `/placeholder.svg` → use brand logo `/images/logo-gold.png` or inline empty

### 4. `crm7/index.html`
- Remove/comment out favicon, apple-touch-icon, og:image, twitter:image references to `crm7-logo*.svg`
- Add TODO comments for user-provided brand assets

### 5. `crm7/src/components/ui/CRM7Logo.tsx`
- This inline SVG is the same AI-generated design — needs replacing when user provides CRM7 brand logo

### 6. `business-suite-unified/index.html`
- Favicon ref already points to `favicon.ico` — will be a dead link after deletion until user provides replacement

## Execution Order
1. Update code references first (so nothing breaks pointing at deleted files)
2. Delete the 12 image files
3. Leave TODO markers where user will provide replacement brand assets

## Waiting On User
- CRM7 logo + favicon
- R8 logo + favicon  
- Business Suite logo + favicon
