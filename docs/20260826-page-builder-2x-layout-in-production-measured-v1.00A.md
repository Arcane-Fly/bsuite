---
kind: record
authority: none
owner: operator-agent-overnight
evidence:
  - scripts/audit-routes.sh
  - packages/page-builder/src/canvasCardLayout.tsx
supersedes: []
---

# The page-builder 2.x grid inversion, measured in production

**Document:** 20260826-page-builder-2x-layout-in-production-measured-v1.00A
**Written for:** Braden
**Status:** A — measured, reproducible, and it retires a BLOCKER rather than restating it

---

## The answer in one line

**The feared regression did not materialise.** Twenty production pages were measured
signed-in on 2026-08-26; the worst Cumulative Layout Shift on any of them is **0.0155**,
against a "good" threshold of 0.1 and against the **0.3164** that was measured on a
development build the night before.

---

## What was feared, and why it was reasonable

`@bsuite/page-builder` 2.0.0 changed three things at once, and one of them moves every
page in the estate:

| change | effect |
|---|---|
| `DEFAULT_CANVAS_CARD_WIDTH` **12 → 6** | every card that does not state `w` becomes half width |
| grid-item chrome **on → off** by default | the frame around each tile stops being painted |
| `PACKAGE_LAYOUT_EPOCH` **1000 → 2000** | every saved layout is discarded |

**1,068 of 1,729 card usages across the estate omit `w`**, so the first row is not a
default that rarely fires — it is the majority case. An overnight lane measured the
consequence on a development build of throughput `/pricing`:

    1.0.7 baseline ............... CLS 0.0000, performance 1.00
    2.0.0 as published ........... CLS 0.3164, performance 0.84
    2.0.0, width reverted 6 -> 12  CLS 0.0000, performance 1.00

Four competing explanations were tested and eliminated — the layout epoch, `autoHeight`,
the seed height, and card chrome. The width constant accounted for the whole of it. On
that evidence the lane blocked promotion, and it was right to.

## Why production is nonetheless clean

Two reasons, and only the first was planned.

**The one page that was measured has been fixed.** throughput#379 states the widths
`/pricing` was authored for. It is merged and live, and the page now measures **CLS 0,
five cards, all full width**.

**The rest of the pages were never in the failure mode.** The regression needs cards that
*omit* `w` on a page authored expecting full width. Across nineteen crm7 pages the
layouts are deliberate mixes — four-column tiles above a twelve-column table — not a
column of full-width cards silently halved.

## The measurement

Signed in through the SSO hub, viewport 1440x900, `PerformanceObserver` armed **before
navigation** (a buffered read afterwards is a different measurement), 9–12s settle per
page because crm7 card grids mount late.

| page | CLS | cards | widths, in grid columns |
|---|---:|---:|---|
| `/dashboard` | **0.0000** | 7 | 4x3, 5x2, 7, 12 |
| `/leads` | 0.0048 | 6 | 4x4, 12x2 |
| `/opportunities` | 0.0048 | 3 | 12x3 |
| `/deals` | 0.0048 | 5 | 3x4, 12 |
| `/clients` | 0.0052 | 6 | 4x4, 12x2 |
| `/hosts` | 0.0052 | 6 | 3x4, 12x2 |
| `/pipeline` | 0.0053 | 6 | 3x4, 12x2 |
| `/reports` | 0.0052 | 5 | 12x5 |
| `/dashboards` | 0.0052 | 3 | 12x3 |
| `/analytics` | 0.0052 | 6 | 3x4, 6x2 |
| `/placements` | 0.0060 | 6 | 3x4, 12x2 |
| `/engagements` | 0.0060 | 4 | 3x3, 12 |
| `/people` | 0.0063 | 6 | 3x4, 12x2 |
| `/timesheets` | 0.0067 | 2 | 12x2 |
| `/training` | 0.0069 | 5 | 3x4, 12 |
| `/insights` | **0.0155** | 6 | 4x3, 6x2, 12 |
| throughput `/pricing` | **0.0000** | 5 | 12x5 |

Worst case **0.0155**, an order of magnitude inside the 0.1 threshold and twenty times
better than the 0.3164 measured on development.

## Every app is on 2.x in production

| app | declares | locks |
|---|---|---|
| crm7 | `2.1.0-next.0` — **a prerelease, pinned exactly** | 2.1.0-next.0 |
| business-suite-unified | `^2.0.0` | 2.0.0 |
| conduit | `^2.0.0` | 2.0.0 |
| throughput | `^2.0.0` | 2.0.0 |
| braden | `^2.0.0` | 2.0.0 |

crm7's exact pin on a `-next` build is corrected to `^2.1.0` by crm7#2047. It is the same
fault as the `^1.0.7` pin that preceded it, only quieter: a caret range fails a freshness
gate loudly, an exact pin on a prerelease looks deliberate and simply stops moving.

## What this does NOT say

- **Twenty pages, not the estate.** crm7 alone has 963 cards omitting `w` across 201
  files. These twenty are clean; the other ~180 files are unmeasured, not proven.
- **A layout that shifts little can still be wrong.** CLS answers "does it jump", not
  "is two columns what the author wanted". A card that omits `w` on a page that wants
  two columns is the redesign working; only pages authored for full width are defects.
  That is a per-page design judgement and no measurement settles it.
- **Signed in as a role without `manage_users`.** Pages needing higher privilege
  rendered their access-denied state and were not measured.

## Two things found while measuring, neither of them layout

**`crm.crm7.app` is crm7; `suite.crm7.app` is Business Suite Unified.** The first probe
signed in at crm7, was bounced to the SSO hub, and measured BSU's home page three times
while reporting crm7 route names. Identical numbers across three different paths were
what exposed it. Every probe now asserts the origin it landed on.

**An onboarding modal covers every page** for a tenant that has not completed setup —
"Welcome to CRM7", step 1 of 4. It sits above the route's own content, including above
an access-denied card, so a page can look like a marketing splash while the real state
is underneath it. Worth knowing before reading any screenshot of this tenant.

## Reproducing

The probe is ~40 lines: launch chromium, `addInitScript` a `layout-shift` observer,
sign in at `suite.crm7.app/auth/login`, navigate per route, settle, then read the summed
shift and each `.react-grid-item`'s width as a fraction of `.react-grid-layout`. Assert
`new URL(page.url()).origin` every time — that assertion is the difference between this
document and the wrong one it nearly was.
