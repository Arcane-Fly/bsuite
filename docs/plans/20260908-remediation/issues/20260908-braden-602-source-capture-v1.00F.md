---
kind: record
authority: none
owner: bsuite
---

# Landing: /gto-software-australia (Corporate Braden · Growth Content handoff)

https://github.com/GaryOcean428/braden/issues/602

Snapshot updatedAt: 2026-09-07T00:39:06Z. Open at capture; re-read live.

## Goal
Ship the **GTO software Australia** public landing on `braden.com.au` at `/gto-software-australia`.

Wayne lifted publish hold for **Maker handoff only** (Growth Content). Mon cold-email fire stays the 9 + one-pager pack — **do not** attach this draft to cold email.

## Source of truth (voice GREEN)
- SoTDoc: https://docs.google.com/document/d/14HrxhnvPDT-rZ3uT0Ch7NLxYo0GvjvzXbMOczFsTvI4/edit
- Box draft (Copy Humanizer second-pass applied): `/workspace/search-content/page-drafts/2026-09-06-gto-software-australia-draft.md`

## Voice / claims constraints
- Corporate Braden · AU English · soft-market · **stack-pain only** (no brand-bash)
- Neon-in-product claims stay **soft**
- Soft Sign-in CTA → `https://suite.crm7.app` (not hard sell)
- Canonical host: `braden.com.au` (Corporate Braden)

## Implementation (match existing landings)
Pattern peers: `src/pages/apprenticeships.tsx`, `src/pages/traineeships.tsx`, `src/pages/recruitment.tsx`.

1. Add `src/pages/gto-software-australia.tsx` (or equivalent slug) rendering the SoTDoc/draft structure as a branded landing:
   - `SEOHead` with title/meta from draft frontmatter, `path="/gto-software-australia"`, breadcrumbs Home → GTO software
   - Hero + sections from draft headings (What GTO software has to do · The week that breaks spreadsheets · Employ → place → timesheet → host charge · What to do next)
   - Soft Sign-in link to `suite.crm7.app`; secondary ask Wayne / one-pager on request (no cold-email attach)
   - Cite Mapien / FWO / Humanz links as in draft Sources
2. Wire lazy route in `src/Routes.tsx` **above** the `:slug` CMS catch-all:
   - `const GtoSoftwareAustralia = lazy(() => import('@/pages/gto-software-australia'));`
   - `<Route path="gto-software-australia" element={<GtoSoftwareAustralia />} />`
3. Theme tokens only (no pure white/black painted; use Braden role/tokens like other public folds).
4. Optional: sitemap / internal nav link from Products if that page already links peer landings — keep minimal.

## DoD (Maker / Ship)
- [ ] PR open against default branch
- [ ] Route live on preview URL: `/gto-software-australia`
- [ ] SEOHead title/meta/canonical match draft
- [ ] Soft Sign-in only; no hard Neon product claims; **no unproven scale**
- [ ] Visual: screenshot of hero + mid-fold + footer on light (and dark if site supports)
- [ ] Pass D8 + skill checklist before Ship bounce
- [ ] Ship bounce when preview green — not before

## Ship trust hygiene LOCKED (SEO relay 2026-09-07 PT)
1. Soft-market claims still RED until cash path greens (Stripe/Xero/OT) — Voice SoT soft claims / stack-pain only; no unproven scale.
2. Landings must pass D8 + skill checklist. MarketingHome heroes still old on suite/crm live (Option A / GTO OS not shipped) — this page is Corporate Braden landing, not product MarketingHome.
3. Visual RED elsewhere (do not claim Loom green): Storybook #3124 Manager + density + elevation. Ring-offset CLEARED. Loom held.
4. Brand: Neon Electric SaaS only in product; Corporate Braden never in product chrome; no pure `#fff` / `#000` painted.

Maker owns ship. Ship = research/bounce only.

## Out of scope
- Cold-email attach of this landing copy
- QIG experiment code
- Changing Mon 9 + one-pager GTM pack
- Claiming suite/crm MarketingHome / Option A GTO OS shipped
