---
kind: record
authority: none
owner: bsuite
---

# Production visual gate 2026-09-06: clipped plan heading, 1.86:1 tile heading, 3.31:1 settings nav text, 3.43:1 branding helper text — four measured FAILs across /, /settings, /branding

https://github.com/GaryOcean428/business-suite-unified/issues/1165

Snapshot updatedAt: 2026-09-07T06:35:47Z. Open at capture; re-read live.

Measured on `suite.crm7.app` serving `bb748fa` (read-only Playwright, seeded e2e identity, `bsuite-ship-visual-promote/scripts/visual-probe.js`, light and dark × 1440/1024/768/390, 2026-09-06 00:5xZ). Evidence: `~/.claude/projects/-home-braden-Desktop-Dev-bsuite/evidence/2026-09-06/visual-gate-3102/report.md`, `matrix.json`, `shots/bsu_*.png`. All four are present on the build bsuite#3102 promoted; none was introduced by it.

| # | class | route | finding | selector | cells |
|---|---|---|---|---|---|
| 1 | V-C3 clipped heading | `/` (dashboard) | "Choose Your Business Suite Plan" overflows its box by 3px and is cut by `div.min-h-0.flex-1.overflow-auto` (36px Geist on a 40px line-height) | `h2.mb-4.text-4xl.font-bold` | 8 of 8 |
| 2 | V-C10 contrast | `/` (dashboard) | "Conduit ATS" heading at **1.86:1** against its composited tile background | `h3.mb-2.text-lg.font-semibold` | 8 of 8 |
| 3 | V-C10 contrast | `/settings` | "Profile Information" nav button text at **4.13:1** (light) / **3.31:1** (dark) | `button.w-full.flex.items-center` | 8 of 8 |
| 4 | V-C10 contrast | `/branding` (also reached from crm7 `/settings/branding`, which redirects here) | helper text "using theme default" at **3.43:1** / **4.07:1** | `span.ml-2.text-xs.text-text-subtle` | 8 of 8 |

Two further probe FAILs on `/branding` need a ruling rather than a fix: the contrast **sample chips** ("Aa on white", "5.17 · AA", `div.rounded-md.border` declared `oklch(1 0 0)` / `oklch(0 0 0)`) are the tool showing what a colour looks like on white and black, so V-C1 and V-C10 fire on them by construction. Either mark them with a data attribute the probe recognises as a sample, or accept them as permanent noise that hides the next real one — the register's lesson is that a note explaining an absence stops anyone measuring it, so prefer the attribute and a probe exclusion that names it.

Not measurable with this account: `/developer/branding` redirects the e2e identity to `/` (not a developer); that page is UNKNOWN until inspected as the developer account.

**Done means:** each row's ratio re-measured ≥ 4.5:1 (or the heading unclipped) on `d.suite.crm7.app` in both themes with the probe's output on the PR; D8 stated (these are user-facing on three routes). Filed by the accountability lane; PI names the owner.
