# [D-78] Theme: five near-white app-local surface tokens shadow the fixed shared token; plus invisible card border, missing nav gradient, uneven gradient headers

https://github.com/GaryOcean428/bsuite/issues/1996

Snapshot updatedAt: 2026-08-26T12:21:31Z. Open at capture; re-read live.

Operator defect **D-78**. Four related theme findings. The headline is that **the shared token layer is already correct — every surviving violation is an app-local override that shadows the fixed token, and the CI gate is structurally unable to see any of them.**

## 1. The shared layer is CORRECT (do not "fix" it again)

Verified in `packages/theme/src/css/vars.css`:

- Nothing emits pure white or pure black.
- `--light-bg-accent` was already fixed from `0.994` → `oklch(0.98 0.006 260)`.
- Dark-mode text is capped at `oklch(0.94)`.
- `text-white` / `bg-white` / `text-black` / `bg-black`: **zero occurrences in `src/` across all six repos.**

Any PR that edits `vars.css` to chase this defect is working the wrong layer.

## 2. Five app-local near-white overrides (the actual defect)

| File | Token | Value | Reach |
|---|---|---|---|
| `crm7/src/styles/theme.css` | `--bg-shell-elevated` | `oklch(0.994 0.002 260 / 0.96)` | **84 consumer files** |
| `crm7/src/styles/theme.css` | `--bg-shell-hero` | `oklch(0.994 0.003 247.9 / 0.9)` | |
| `crm7/src/index.css` | `--color-document-surface` | `oklch(0.994 0.002 260)` | |
| `conduit/src/app/globals.css` | `--bg-shell-hero` | `oklch(0.994 …)` | |
| `throughput/src/index.css` | `--bg-shell-hero` | `oklch(0.994 …)` | |

`--bg-shell-elevated` at `oklch(0.994 0.002 260 / 0.96)` is **exactly the operator's DevTools reading of `lab(100 0 0 / 0.96)`**. That is the smoking gun — the operator inspected a card, saw effectively pure white, and this is the declaration producing it.

**Three of the five carry the comment "pure white banned"** while declaring a value 0.6 lightness points off pure white. `vars.css` already documents this exact failure mode:

> "0.6 points is below any perceptual threshold, so the panel still READ as white even though it no longer WAS white. A colour rule enforced by string match will keep accepting values like that."

## 3. The CI gate cannot see any of them

`theme-conformance.yml`'s C1 scanner is a **string matcher**. `oklch(0.994 …)` is not pure white *by string match*, so all five pass. **The baseline currently reads 7/7 green while five near-white card surfaces ship to production.**

Required, and required **in the same PR**:

1. Add a **lightness-threshold rule** — flag `oklch(0.99x …)` on a surface token as a real C1 violation, not a string comparison.
2. **Re-bank the baseline in the same PR.** The gate asserts *equality*, not a ceiling — adding detections without re-banking turns the gate red and the next agent will "fix" it by reverting the rule.

## 4. Blurry card border — confirmed root cause

`crm7/src/components/common/StatCard/StatCard.tsx` sets `borderColor: var(--border-shell)` = `oklch(0.3 0.03 260 / 0.09)` — **9% alpha, effectively invisible.**

What the operator actually perceives as "the border" is not that border at all: it is the ring inside `--shadow-shell`, `0 0 0 1px oklch(0.546 0.215 262.9 / 0.05)` — **5% alpha, composited under `backdrop-blur-sm`**. That is precisely why it reads as blurry rather than as a line.

Fix: raise `--border-shell` toward the **WCAG 1.4.11 non-text contrast floor of 3:1**, and **drop the `0 0 0 1px` ring out of `--shadow-shell`** so the border is a border and the shadow is a shadow.

## 5. Nav gradient is unimplementable in five of six apps

`.bsuite-gradient-underline-span` exists in exactly **3 files, all crm7**: `TenantSwitcher.tsx`, `CRM7Navigation.tsx`, `index.css`.

It is **not in `@bsuite/theme`**. The operator's request for the nav gradient therefore cannot be satisfied in the other five apps until the class is **promoted into the package**. That promotion is a prerequisite, not an optional refactor.

## 6. Gradient headers are unevenly adopted

`.text-gradient-accent` has **13 call sites estate-wide**: conduit 9, crm7 1, braden 1, **BSU 0**.

## Acceptance criteria

- [ ] All five app-local near-white overrides removed or corrected; the shared token is no longer shadowed. Confirmed by DevTools: `--bg-shell-elevated` no longer computes to `lab(100 0 0 / 0.96)`.
- [ ] `theme-conformance.yml` C1 gains a **lightness-threshold rule** that catches `oklch(0.99x)` on surface tokens, **and the baseline is re-banked in the same PR** (gate asserts equality).
- [ ] Proof the new rule works: it flags the five current values when run against the pre-fix tree.
- [ ] `--border-shell` meets **WCAG 1.4.11 3:1**; the `0 0 0 1px` ring is removed from `--shadow-shell`; card borders read as crisp lines in both light and dark mode.
- [ ] `.bsuite-gradient-underline-span` is **promoted into `@bsuite/theme`** and consumed by more than crm7.
- [ ] `.text-gradient-accent` adoption is levelled — in particular BSU moves off 0 call sites.
- [ ] **Surface count** (D-62): the PR states how many app-local token overrides were audited across all six repos and **how they were enumerated** (the enumeration method must catch near-white by lightness, not by string). Fixing only the five listed here without stating how the full override population was swept is a failed PR.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: both
- **Equivalence target**: §9.2 — DevTools computed-value capture of `--bg-shell-elevated` before/after plus card screenshots in light and dark at 375 / 768 / 1440 showing a crisp border; §9.1 — `theme-conformance` C1 scanner output before vs after, demonstrating the five values flagged pre-fix and zero post-fix with the baseline re-banked
- **Cross red-team**: perplexity-computer verifies the lightness-threshold rule genuinely catches the five values (run it against the pre-fix tree) before flip-to-done
- **Skills to load**: `bsuite-brand-system`, `theme-factory`, `tailwind`, `shadcn-ui`, `design:accessibility-review`, `playwright-skill`, `qa-and-verification`, `verification-before-completion`
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)

