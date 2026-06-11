# UI/UX Overhaul + 2026 Best-Practice Audit — Session Log

> **Status:** W (Working) — session in progress 2026-05-25
> **Owner:** braden.lang77 + automation fleet (copilot-swe-agent + anthropic-code-agent + openai-code-agent)
> **Trigger:** User feedback on `d.suite.crm7.app/developer/branding` being "abysmal" — 8 fully-expanded OklchColorPicker controls in a 3-col grid with no progressive disclosure.

## Executive summary

What the user asked for in one turn:
1. Full redesign of /developer/branding with design tokens
2. Cross-app UI/UX audit (CRM7 / conduit / BSU / R80.3)
3. Code + deps + docs + memory audit for 2026-latest (React 19, Next 16, Tailwind v4, shadcn latest)
4. Apply the host-employer one-shot policy to ALL entity types
5. All work lands on `development` only — no main promotion
6. Balanced delegation: high-judgement work by Claude, mechanical/big-surface work by Copilot models
7. No deferrals

## Phase plan

| Phase | Status | Owner | Detail |
|---|---|---|---|
| 0. Orphan branch sweep | ✅ done | Claude | 47 → 0 noise; 37 deleted, 10 PRs opened (4 merged: bsuite#1296/1298/1299/1300) |
| 1. Branding redesign | 🔵 PR open | Claude | BSU#506 — new `<BrandingCard>` + `<ColorEditorSheet>`; /developer/branding refactored |
| 2. Cross-app brand sweep | 🔵 4 packets in flight | anthropic-code-agent | BSU#502, crm7#881, conduit#285, R80.3#280 |
| 3. Entity one-shot policy | 🔵 8 packets in flight | copilot-swe-agent | crm7 #885 #886 #887 #889 #891 #893 #895 #897 (apprentice/host/contact/placement/qualification/training-plan/timesheet/incident) |
| 4. 2026 deps audit | 🔵 4 packets in flight | openai-code-agent | BSU#504, crm7#883, conduit#287, R80.3#282 |
| 5. Docs + roadmap sync | 🟡 in progress | Claude (parent) + Copilot (submodules) | This document |
| 6. Memory API sweep | 🟡 in progress | Claude | bsuite_session_20260525_uiux_audit written |
| 7. Close verified issues | ⏳ pending | Claude + automation | Cross-reference open issues vs codebase |
| 8. Final dev-branch verification | ⏳ pending | Claude | All 6 repos green, no orphans |

## Brand-system violation baseline (2026-05-25)

Cross-app grep audit:

| Repo | Hex literals | Raw palette classes |
|---|---|---|
| business-suite-unified | 93 | 365 |
| crm7 | 266 | 408 |
| conduit | 37 | 119 |
| R80.3 | 14 | 27 |
| **Total** | **410** | **919** |

Target: zero. Resolution via Phase 2 packets.

## Package version drift

| Package | Latest in registry | Pinned in BSU | Pinned in crm7 | Pinned in conduit | Pinned in R80.3 |
|---|---|---|---|---|---|
| @bsuite/theme | `0.3.3` (npm) / `0.4.1` (unreleased in parent) | `^0.3.3` | `^0.3.3` | `^0.3.3` | `^0.3.3` |
| @bsuite/ui | `0.2.0` | `^0.2.0` | — | — | `^0.1.0` |
| @bsuite/nav-core | `0.5.2` | `^0.5.1` | `^0.5.1` | — | — |

Action items:
- [ ] Publish `@bsuite/theme@0.4.1` (StatusBadge + usePlatformLogo additions). Tracked in bsuite#1301.
- [ ] Bump consumers after publish.

## Coding-bot routing policy (adopted 2026-05-25)

| Bot | Best for | Used in this session |
|---|---|---|
| `copilot-swe-agent` (GPT-based) | Mechanical refactors, version bumps, doc edits, entity scaffold | Phase 3 entity packets (8 crm7 issues) |
| `anthropic-code-agent` (Claude Opus 4.7) | Complex multi-file refactors, design-system work, judgement | Phase 2 brand sweep (4 packets), branding cascade (2 BSU, 1 parent) |
| `openai-code-agent` (GPT-5.5) | Type-heavy, deps migration | Phase 4 deps audit (4 packets) |

Assignment via GraphQL `replaceActorsForAssignable`:
- copilot-swe-agent → `BOT_kgDOC9w8XQ`
- anthropic-code-agent → `BOT_kgDODnPHJg`
- openai-code-agent → `BOT_kgDODnSAjQ`

## Phase-0 PRs from orphan sweep (status as of session start)

| PR | Status | Action |
|---|---|---|
| bsuite#1296 pnpm 10.33.3 | ✅ merged | — |
| bsuite#1298 pnpm doc drift | ✅ merged | — |
| bsuite#1299 supabase migrate pipefail | ✅ merged | — |
| bsuite#1300 node 24.x pin | ✅ merged | — |
| bsuite#1289 host-employer one-shot doc | 🟡 BLOCKED | needs reviewer |
| bsuite#1297 AGENTS.md pattern 3 | 🔴 CONFLICTING | rebase needed |
| business-suite-unified#501 CSP qig-memory | 🔴 CONFLICTING | rebase needed |
| crm7#880 portal OAuth PKCE | 🟡 UNSTABLE | CI partial fail |
| R80.3#278 Payday Super OTE | 🔴 CONFLICTING | rebase needed |
| R80.3#279 PaydaySuper UI | 🔴 CONFLICTING | rebase needed |

Resolution: file follow-up packet to anthropic-code-agent for rebase of the conflicting set.

## Branding redesign — Phase 1 details (BSU#506)

### New components (live in BSU's local src/components/branding/)

| File | Role |
|---|---|
| `BrandingCard.tsx` | Compact card: app label + logo previews + color swatches + Saved indicator. Progressive disclosure — click swatch to edit. |
| `ColorEditorSheet.tsx` | shadcn Sheet wrapping existing OklchColorPicker. Right-side desktop, bottom-sheet mobile. |

### Refactor

| File | Before | After |
|---|---|---|
| `src/pages/Developer/Branding.tsx` | 349 lines, 8 expanded pickers in 3-col grid | 276 lines, 8 BrandingCards in `sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` |

### Brand-system compliance

✅ All zero violations on touched files:
- semantic Tailwind tokens only (`bg-card`, `text-muted-foreground`, `border-border`, `bg-(--bg-body)`, `bg-(--bg-shell)`, `bg-(--bg-panel)`, `text-(--color-success)`)
- no raw palette utilities (`text-(red|blue|...)-NNN`)
- no hex literals in className or static style
- only inline style: `style={{ backgroundColor: userColor }}` (user-data display, not a theme decision)

### Test coverage

- `src/components/branding/__tests__/BrandingCard.test.tsx` (7 cases)
- `src/components/branding/__tests__/ColorEditorSheet.test.tsx` (5 cases)

### Out of scope (filed as follow-up issues)

- BSU#507 — tenant `/branding` (893 lines) progressive-disclosure refactor (cascade)
- BSU#508 — admin `/admin/branding` (558 lines) progressive-disclosure refactor (cascade)
- bsuite#1301 — extract BrandingCard + ColorEditorSheet to `@bsuite/ui` for cross-app reuse

## Branch policy (PINNED)

- Universal AI Agent Rulebook §8 — all PRs target `development`, never `main`
- User personally promotes `development → main` after they're satisfied
- This session does NOT promote anything to `main`

## Next loop cycles

1. Monitor BSU#506 CI re-run (lint fix in commit `61d9487`)
2. Monitor 20+ bot PRs (anthropic-code-agent + openai-code-agent + copilot-swe-agent) — merge as each goes green
3. Address rebase-conflicting Phase-0 PRs (delegate to anthropic-code-agent or do manually)
4. Phase 7: close verified-fixed issues
5. Phase 8: final dev-branch verification report

## References

- User instruction (verbatim): "all to development only until complete. we merge to main when i'm satisfied."
- Refined prompt (Heavy tier): saved to workspace as `refined-prompt-2026-05-25.md`
- Memory digest: `bsuite_session_20260525_uiux_audit` at qig-memory-api.vercel.app

---

*This document will be updated as the session progresses. Marked W (Working) — bump to A (Approved) after final verification at end of session.*
