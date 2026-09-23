---
kind: record
authority: none
owner: bsuite
---

# The page editor is an unmeasured state: dark cards lose their glow in edit mode, and a free-text field names a canonical entity

https://github.com/GaryOcean428/crm7/issues/2445

Snapshot updatedAt: 2026-09-05T11:22:47Z. Open at capture; re-read live.

Found by running the visual probe **inside the page-grid editor** on `/settings`, which the ordinary probe never enters. Both are **pre-existing**: the identical probe against production (`crm.crm7.app`, `2dfd75a`) produces the same two failures, so they are not introduced by any pending promotion.

**1. In edit mode, dark-mode cards lose their accent glow.** The probe measures max shadow chroma `0.0166` against a required `0.05` — every layer is at or below the ambient ink's own chroma. This is the V-C7 class the estate has fixed twice before. Note the contrast with the same page **outside** the editor, where the glow is present and measurably chromatic (`lab(74.67 -44.21 -10.26 / .28)` and `oklch(0.769 0.132 191.7 / .3)`). So the tokens are right and something in the editor's card rendering drops them — a canvas-card wrapper or an override that applies only while editing.

**2. A free-text input where a canonical entity exists** (`freeTextEntity`), in both themes. The gate's rule is that a field naming a canonical entity must be an FK-backed selector, and this is the one-shot-non-conformance class the DRY doctrine exists to stop.

Also recorded, not a defect: `canvasColumns` stays UNKNOWN even with the column control open and reading 2, because the probe cannot confirm a column count from a uniform grid — "geometry is CONSISTENT with 2 columns but cannot confirm it, a uniform grid is ambiguous by construction". Closing that needs the columns *interaction* (set a preset, observe the layout change), not a static read. Worth saying plainly because it means the class is not closable by probing alone, and a future run should not report it as passed.

Why this matters beyond the two findings: **the editor is a state the visual gate has never measured.** Outside it, `/settings` reads 0 FAIL across both themes and four widths; inside it, the same page is a BLOCK. Any surface with a mode the probe does not enter has an unmeasured half.
