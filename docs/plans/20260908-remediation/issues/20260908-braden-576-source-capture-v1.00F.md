---
kind: record
authority: none
owner: bsuite
---

# Tablet nav overflows at 768px (logo collapses to 0px, body scrolls sideways); light-mode hero tagline illegible — production visual gate, 2 Sep 2026

https://github.com/GaryOcean428/braden/issues/576

Snapshot updatedAt: 2026-09-02T10:27:19Z. Open at capture; re-read live.

Found by the agent-performed visual gate (bsuite-ship-visual-promote) while verifying the Corporate radius bridge (bsuite PR #2844 → @bsuite/theme 1.5.1) on **production** braden.com.au, live SHA c0b71e43 = main tip. The radius change itself passes: `--role-radius-sm/md/lg` resolve to 4/6/10px and buttons/cards render on-token. Everything below is pre-existing and was measured, not eyeballed. Evidence page with all 9 screenshots: link in the first comment.

## FAIL 1 — desktop nav shown from `md` (768px) does not fit
`src/components/Navigation.tsx`. At 768px the viewport's usable width is 753px (vertical scrollbar). Measured:
- inner row `div.flex.items-center.gap-4` reaches x=768 → **15px past the viewport, body scrolls horizontally**
- logo `img[alt="Braden Group Logo"]` → **width 0px** (flex shrinks it away; the wordmark disappears)
- "Our Services" and "About Us" wrap to two lines (height 53px vs 31px)
- theme toggle right edge = 768 → clipped by the scrollbar
- hamburger ("Open menu") is `display:none` at this width
Both themes. 1024px fits with nothing to spare.
**Fix:** keep the hamburger until `lg` (1024px) — or, if the desktop nav must stay at `md`, `shrink-0` on the logo, `whitespace-nowrap` on links, and a tighter gap; measure at 768 after.

## FAIL 2 — light-mode hero tagline unreadable
"Ideas. Innovation. Impact." in gold over the red-tinted hero photo is illegible in light mode at every width (the probe marks the backdrop unsampleable; the eye fails it). Dark mode reads fine. Give it a solid or blurred backing, or move it below the hero.

## WARN — Neon Electric cyan on the Corporate header
The light-mode theme toggle renders in D2C cyan (`bg-accent`) on the Braden red header; the dark-mode toggle is on-palette. Corporate light `--accent` leaks the D2C hue — bsuite-brand-system question.

## WARN — radius off the role scale
One card is `rounded-2xl` (16px; scale is 4/6/10). One `rounded-[inherit]` card renders **0px** because its parent has no radius.

## NOTE — two Supabase clients, branding fetched twice
`src/integrations/supabase/client.ts:41` and `src/integrations/supabase/legacyTables.ts:108` both `createClient` → console "Multiple GoTrueClient instances detected". `tenant_branding` is requested twice per page load (app `useTenantBranding` + theme `BrandingProvider`). One client; one branding source.

## NOTE — deprecated meta
`index.html:11` `apple-mobile-web-app-capable` → Chrome wants `mobile-web-app-capable`.

## Run facts
Console errors 0 · HTTP ≥400: 0 · cells: light+dark × 1440/1024/768/390 · consent dismissed via "Reject Non-Essential" · probe WARN ×4 per wide cell = benign heading-metrics class, no action.
