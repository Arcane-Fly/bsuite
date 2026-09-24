---
kind: record
authority: none
owner: bsuite
---

# Visual-gate instrumentation: a missed theme toggle reads as PASS, clippedHeading false-positives on overflow:visible, and width labels ignore devicePixelRatio

https://github.com/GaryOcean428/bsuite/issues/3139

Snapshot updatedAt: 2026-09-07T06:08:14Z. Open at capture; re-read live.

Three defects in the visual-gate instrumentation, all found while running the matrix on
`crm.crm7.app/dashboard` for bsuite#3119. Two of them produce **wrong verdicts that look clean**,
which is the dangerous kind.

## 1. The default theme-toggle selector is stale, and a miss reads as a PASS

`build-matrix-runner.mjs` defaults to:

```
--toggle 'button[aria-label="Switch to dark mode"]'
```

The app's control is `aria-label="Switch to dark **theme**"`. The selector matched nothing, the
toggle never fired, and the run returned:

```
toggled: false
dark 1440 measuredTheme=light verdict=PASS
dark 1024 measuredTheme=light verdict=PASS
dark  768 measuredTheme=light verdict=PASS
dark  390 measuredTheme=light verdict=PASS
```

**8/8 PASS, with four of the eight being duplicate light-mode measurements labelled dark.** Dark
mode was never inspected. Anyone pasting that summary into a PR ships a false-complete.

The only thing that caught it was the probe recording `measuredTheme` **beside** the requested
theme — that field is doing real work and should never be dropped.

**Fix:** when `toggled` is false, or any cell's `measuredTheme !== theme`, the run must return
**INCOMPLETE** for those cells, never PASS. A theme that could not be reached is UNKNOWN under
V-3. Optionally try a small set of known aria-labels and report which matched.

## 2. `clippedHeading` (V-C3) fires on a flex box narrower than its content, even when nothing is clipped

Reported **FAIL at 768 in both themes**:

> *"heading text is CLIPPED — overflows its box by 13x0px and the overflow is horizontal (truncation)"*

Measured on the element:

| measurement | value |
|---|---|
| `<h3>` "Communication Centre" | `scrollWidth 143` vs `clientWidth 130` → 13px over |
| the text's own `<span>` | **`scrollWidth 135 == clientWidth 135`** — not truncated |
| `overflow` on both | `visible` |
| painted text right edge | **673** |
| `<h3>` box right edge | 660 |
| card content-box right edge | **684** |

The words finish **11px inside the card** and are fully legible. The `<h3>` is
`flex items-center gap-2`; its box is narrower than its content, but with `overflow: visible`
that spills harmlessly into the parent's slack rather than clipping.

**`scrollWidth > clientWidth` is not truncation when `overflow` is `visible`.** The discriminating
measurement is the **painted extent of the text range against the nearest clipping ancestor** —
`document.createRange().selectNodeContents(el).getBoundingClientRect().right` compared against the
first ancestor with `overflow` other than `visible`.

This one **blocks a promotion on a defect that does not exist**, so it is worth fixing before the
next gate run.

## 3. Width labels are not CSS widths when devicePixelRatio ≠ 1

`devicePixelRatio` was **0.8** on the run host, so `setViewportSize({width: 768})` produced
`innerWidth: 960`. Every cell labelled 768/1024/1440/390 was measured at 1.25× that width.

Cells remain comparable **to each other**, but any claim of the form "fails at the `md`
breakpoint" is unsupported, and a defect that only appears at a true 768 would be missed
entirely.

**Fix:** record `innerWidth` and `devicePixelRatio` per cell and label the cell with the
**measured** `innerWidth`, not the requested one — the same discipline that makes
`measuredTheme` valuable in defect 1. Both defects are the same shape: *the runner reports what
it asked for instead of what it got.*

## Acceptance

- A missed toggle yields INCOMPLETE, never PASS. **Positive control:** run with a deliberately
  wrong selector and confirm the dark cells come back INCOMPLETE.
- `clippedHeading` does not fire on this `<h3>`. **Positive control:** a heading with
  `overflow: hidden; text-overflow: ellipsis` and text genuinely cut off still FAILs.
- Cells carry measured `innerWidth` and `devicePixelRatio`.

Found on bsuite#3119; full cell table and measurements in that PR's Visual DoD comment.
