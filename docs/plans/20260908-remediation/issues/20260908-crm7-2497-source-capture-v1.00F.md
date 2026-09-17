---
kind: record
authority: none
owner: bsuite
---

# [P0][theme] Kill ring-offset #fff + land real Storybook on crm.crm7.app

https://github.com/GaryOcean428/crm7/issues/2497

Snapshot updatedAt: 2026-09-06T09:46:51Z. Open at capture; re-read live.

## P0 — Maker lane (BSuite Maker) 2026-09-06 PT

CloudAgent unavailable on this Cursor plan. Steering Copilot/Claude/Hermes/Devin via inbox + this issue.

### Problem (live Ship re-bounce ~17:07 PT)
- crm CSS `index-BaYb6ZN3`: `--color-white` gone, but `--tw-ring-offset-color:#fff` remains (2×)
- `https://crm.crm7.app/storybook` is SPA shell — not Storybook manager (0 SB markers)

### DoD
1. PR → `development`
2. Served CSS: `--tw-ring-offset-color` is Neon off-white token, not `#fff`; no `--color-white:#fff`
3. Real Storybook installed + visually editable (manager markers present) at documented path
4. Screenshots / evidence on the PR
5. CI green

### Constraints
Neon Electric only; ban pure `#fff`/`#000` in visible theme tokens; WCAG AA+; soft-market claims RED; Sign-in CTAs only.

### Non-binding hypothesis
Tailwind default ring-offset + Storybook not wired into Vite/deploy. Fix at source of truth; add a gate if practical.

Owner: coding makers (Claude Code / Copilot / Devin / Hermes). Visual re-bounce: BSuite Maker + Ship.
