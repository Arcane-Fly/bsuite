---
kind: record
authority: none
owner: bsuite
---

# The visual gate's V-C7 and the elevation spec's §5.3 directly contradict each other, and nothing written down connected them

https://github.com/GaryOcean428/bsuite/issues/3127

Snapshot updatedAt: 2026-09-06T14:54:42Z. Open at capture; re-read live.

Nothing in this estate connected the visual gate's V-C7 to the elevation spec's §5.3. A search
of bsuite issues for `V-C7` returns one unrelated epic; `elevation accent spec` returns
nothing; an owner-wide search for `accent MUST NOT dark-mode elevation` returns nothing. That
silence is why the same wrong fix was about to be shipped to a third app.

**Writing it down is the point of this issue.**

## The contradiction, in three parties

| party | says | source |
|---|---|---|
| **the spec** | accent **MUST NOT** appear in dark-mode elevation shadows; the glow is **relocated to hover/focus**; the resting accent presence lives in `--surface-*` chroma **0.020–0.025 at hue 260–265** | `docs/20260822-border-elevation-token-system-spec-v1.00F.md` §5.3, §5.4, §5.5 — status `F` |
| **the gate** | a dark card whose shadow has no layer at chroma **≥ 0.05** is a **FAIL** | `visual-probe.js` V-C7, threshold anchored in its own comment to `--card-glow-source` = the token §5.4 retired |
| **the apps** | crm7 0.1316 · braden 0.0941 · conduit 0.0189 · throughput 0.0189 · BSU 0.0189 | measured on production, 2026-09-06 |

The gate was **failing the compliant apps and passing the violating one**, and an estate
population poll reads the violation as the convention — which is exactly the mistake that
produced throughput#482 (withdrawn).

## The false record that stopped anyone re-checking

The spec's own **"Implementation record — closed 2026-08-29"**, lines 13–38, asserts as a
*verified closed defect*:

> "resting `var(--glow-card)` sites: crm7 **0** · BSU 0 · conduit 0 · throughput 0"
> … "no resting inset-shadow rule survives, and the hover rule is present in both"
> … "**Verified on deployed builds, not just in source.**"

Live rendering of crm7 at `ce4ff81` contradicts it: the shadcn `Card` carries
`oklch(0.769 0.132 191.7 / 0.3) 0 0 0 1px, … / 0.35 0 0 14px -4px` at rest, and
page-builder's grid chrome carries the same at 0.1324. **A frozen document asserting a
measurement that live rendering contradicts is worse than one that says nothing**, because it
converts "nobody has checked" into "somebody checked and it was fine".

## Measurement of record

Production, dark **emulated and reloaded** (never a forced `.dark`), transitions killed,
one instrument, controls in every cell — a known accent must round-trip C 0.132 / H 191.7, a
value inside the §5.4 band must round-trip C 0.020 / H 262, a grey must read C 0, a `lab()`
string must parse, and a junk string must return **UNPARSEABLE, never 0**. All bit on all five
hosts.

| app | card SURFACE C @ H | §5.4 band | card SHADOW maxC @ H | §5.3 |
|---|---|---|---|---|
| crm7 shadcn `Card` ×4 | 0.0192 @ 359.4 | hue out | **0.1316 @ 191.9** | ❌ violates |
| crm7 page-builder chrome ×7 | 0.0200 @ 262.0 | ✅ | **0.1324 @ 191.2** | ❌ violates |
| business-suite-unified `/docs` ×7 | 0.0200 @ 262.0 | ✅ | 0.0189 @ 233.5 | ✅ |
| conduit ×2 | 0.0200 @ 262.0 | ✅ | 0.0189 @ 233.5 | ✅ |
| throughput ×3 | 0.0306 @ 263.7 (comp. 0.0297 @ 264.8) | ✅ | 0.0189 @ 233.5 | ✅ |
| braden ×6 | 0.0175 @ 248.7 | Corporate | 0.0941 @ 90.4 | §0 out of scope |

The `0.0189` ink is `oklch(0.08 0.02 268)` — §5.4's own proposed ramp ink, verbatim.

## Actions taken

| # | action | where |
|---|---|---|
| 1 | V-C7 rewritten to the spec: FAIL on accent in a resting dark elevation shadow (§5.3); WARN when the surface leaves 0.020–0.025 @ 260–265 (§5.4); never demands a glow; Corporate exempt by accent hue and **reported**, never silently skipped; an unparseable colour is UNKNOWN, never zero | Arcane-Fly/.github-private#20 |
| 2 | the real violation filed | crm7#2506 — both `crm7/src/index.css:353` and **`@bsuite/page-builder` `PageGridLayout.tsx:505`**, which ships it to every consumer |
| 3 | issues filed against compliant apps closed as gate defects | throughput#481, conduit#694 |
| 4 | the half of a BSU issue that was a gate defect withdrawn; the `box-shadow: none` half retitled and kept | business-suite-unified#1179 |
| 5 | the CSS "fix" that would have made a compliant app non-compliant withdrawn | throughput#482 |
| 6 | the spec's false closure record corrected in place, with the date and the new measurement rather than a silent edit | see below |

## Still open, and deliberately not done by this lane

**`bsuite-ship-visual-promote/SKILL.md`'s V-C7 row still reads** *"dark-mode accent glow /
uniform light-mode shadow — achromatic dark shadow = no glow"*. That is the sentence that
produced three wrong issues and one wrong PR, and it will keep producing them. It is not
touched in #20 because another lane has uncommitted changes to that file. Required replacement:

> `V-C7 | accent in a resting dark elevation shadow (§5.3 forbids it) / uniform light-mode shadow | elevation | the faint accent belongs to the SURFACE at chroma 0.020–0.025 hue 260–265 (§5.4); the glow is RELOCATED to hover/focus (§5.5), not deleted`

## The general lesson, for the register

**A population is not an authority.** When a gate and a spec disagree, polling the estate tells
you what is common, not what is correct — and if the violation is in the reference app, the
poll returns the violation as the convention. Read the spec, quote it *without an ellipsis
through its mechanism*, and check whether the gate's own threshold is derived from a token the
spec retired.
