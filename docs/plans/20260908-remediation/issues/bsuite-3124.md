# [P0][storybook] Wire suite+crm /storybook to real Manager (limb B after #3123)

https://github.com/GaryOcean428/bsuite/issues/3124

Snapshot updatedAt: 2026-09-06T09:50:07Z. Open at capture; re-read live.

## P0 follow-up — Storybook limb B (Ship DoD 2026-09-06)

**Depends on:** #3123 (shared harness A — PARTIAL merge milestone).

### Problem
`suite.crm7.app/storybook` and `crm.crm7.app/storybook` are SPA marketing/onboarding fallbacks (0 Storybook Manager markers). Braden bar: looks **installed + visually editable**.

### DoD
1. After #3123 merges, wire/host so suite+crm (at least) `/storybook` serves real Storybook Manager against the honest `@bsuite/ui` harness theme
2. Acceptable shapes: static `build-storybook` hosted + rewrite/redirect, or per-app thin Storybook that imports the shared config — pick cheapest that stays on Neon and doesn’t drift
3. Evidence: live URL shows Manager + Controls editable; screenshot light+dark; ping Ship for bounce
4. PR → `development`

### Constraints
Neon only; no Corporate on SaaS; soft-market claims RED; login only development|production builds.

Owner: coding makers (Claude Code / Hermes / Devin). Visual bounce: Ship + Maker.
