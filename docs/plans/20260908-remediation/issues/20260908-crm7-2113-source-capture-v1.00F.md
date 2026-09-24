---
kind: record
authority: none
owner: bsuite
---

# 58% of card slots draw a box inside a box — 171 of 292 measured on production, and it is not the doubled-bottom-border defect

https://github.com/GaryOcean428/crm7/issues/2113

Snapshot updatedAt: 2026-08-27T02:26:18Z. Open at capture; re-read live.

## Measured, not estimated

**71 routes, 292 card slots, on production**, signed in, one page reused serially to avoid the concurrent-navigation contamination that voided two earlier datasets.

| | |
|---|---:|
| slots measured | **292** |
| `itemChrome` on | 292 of 292 |
| slots painting **2+ card surfaces** (box in a box) | **171 (58%)** |
| slots painting exactly 1 | 121 |
| slots painting 0 | 0 |
| routes with at least one doubled slot | **62 of 71** |
| routes clean | 7 |
| routes with no card slots at all | 2 |

## This is not the doubled-bottom-border defect

`@bsuite/page-builder` 2.3.1 fixes `Math.ceil` row over-allocation — a grid item a few px taller than its card, so the item's edge shows below the card's. That is **one doubled edge**. What is measured here is **two complete painted card surfaces nested in one slot** — an outer frame at one radius around an inner card at another. Row arithmetic cannot remove a second painted surface. The two should be confirmed separately rather than closed together.

## How it happened — both changes were correct

1. `@bsuite/page-builder` ≤ 1.0.7 painted grid chrome unconditionally.
2. **2.0.0 turned it off by default**, and the reason is recorded in [analytics/index.tsx](src/pages/analytics/index.tsx): *"~90% of the estate nests its own `<Card>` inside the slot and was drawing a box inside a box."*
3. crm7 then set `itemChrome` page-wide — [pageGridLayoutAdapter.tsx:101](src/components/platform/pageGridLayoutAdapter.tsx#L101), `restProps.itemChrome ?? true` — to restore the ~45 slots 2.0.0 had left bare.

Each step was right. **Their composition re-created the exact defect step 2 existed to remove.**

## What the data rules out

The obvious fix would be to flip the adapter default back to `false`. **The measurement says that is not safe.**

I expected the split to fall along the two authoring patterns, which would have made this a one-line change. It does not: **all 271 resolvable slots are `DraggableCardPage`, and 161 double while 110 do not.** The split is per-page, not per-pattern. Flipping the default would correctly un-frame 161 slots and **strip 110 slots that have no card of their own**.

6 of 69 routes could not be resolved to a source file and are excluded from that 271 rather than folded in silently.

## The direction is already ruled

From the same file: *"Giving the widget its own `<Card>` is durable, is what the other ~988 crm7 slots already do, and carries the 12px card radius ruling for free."*

So the endgame is: **adapter default `false`, and ~110 slots gain their own `<Card>`.** That is a programme, not a patch — which is why this is an issue with the full route list rather than a PR.

## Routes, worst first

| doubled | of slots | route |
|---:|---:|---|
| 9 | 12 | `/settings/govt-integrations` |
| 9 | 11 | `/settings/feature-flags` |
| 8 | 9 | `/settings/module-visibility` |
| 8 | 8 | `/settings` |
| 7 | 9 | `/hr/termination` |
| 6 | 8 | `/field-officers/site-assessment` |
| 5 | 7 | `/hr/probation-completion` |
| 5 | 7 | `/documents/management` |
| 5 | 7 | `/contracts/training` |
| 5 | 6 | `/documents/signatures` |
| 5 | 6 | `/documents/compliance` |
| 5 | 5 | `/contracts` |
| 4 | 7 | `/field-officers` |
| 4 | 6 | `/timesheets/create` |
| 4 | 6 | `/hr/disciplinary` |
| 4 | 5 | `/settings/organization` |
| 4 | 5 | `/field-officers/admin-link` |
| 4 | 5 | `/contacts/groups` |
| 4 | 4 | `/hr` |
| 4 | 4 | `/engagements` |
| 3 | 7 | `/settings/email-accounts` |
| 3 | 5 | `/placements/create` |
| 3 | 5 | `/field-officers/incidents/create` |
| 3 | 5 | `/field-officers/case-notes/create` |
| 3 | 5 | `/field-officers/actions/create` |
| 3 | 4 | `/settings/audit-log` |
| 2 | 6 | `/settings/users` |
| 2 | 4 | `/field-officers/competency/create` |
| 2 | 4 | `/documents/upload` |
| 2 | 4 | `/documents/create` |
| 2 | 4 | `/contracts/training/new` |
| 2 | 3 | `/settings/data` |
| 2 | 3 | `/settings/custom-pages/create` |
| 2 | 3 | `/contacts/tags` |
| 1 | 6 | `/settings/apprentice-rates` |
| 1 | 4 | `/settings/permissions` |
| 1 | 4 | `/settings/integrations` |
| 1 | 4 | `/field-officers/incidents` |
| 1 | 4 | `/field-officers/case-notes` |
| 1 | 3 | `/settings/timesheet-groups` |
| 1 | 3 | `/settings/role-overrides` |
| 1 | 3 | `/settings/penalty-groups` |
| 1 | 3 | `/settings/custom-fields-admin` |
| 1 | 3 | `/settings/custom-fields` |
| 1 | 3 | `/settings/allowance-groups` |
| 1 | 3 | `/field-officers/site-visits` |
| 1 | 3 | `/field-officers/competency` |
| 1 | 3 | `/field-officers/actions` |
| 1 | 3 | `/engagements/create` |
| 1 | 3 | `/contracts/training/e-signatures` |
| 1 | 2 | `/settings/tenant-switch-audit` |
| 1 | 2 | `/settings/picklists/create` |
| 1 | 2 | `/settings/picklists` |
| 1 | 2 | `/settings/permissions-demo` |
| 1 | 2 | `/settings/pay-item-rules` |
| 1 | 2 | `/settings/form-layouts/create` |
| 1 | 2 | `/settings/form-layouts` |
| 1 | 2 | `/settings/data-management` |
| 1 | 2 | `/settings/configuration` |
| 1 | 1 | `/settings/data-sharing` |
| 1 | 1 | `/field-officers/competency/assess` |
| 1 | 1 | `/documents` |

**Clean:** `/documents/hub`, `/documents/templates`, `/enrichment`, `/enrichment/programs`, `/field-officers/caseload`, `/settings/custom-pages`, `/settings/payroll-remittance`
**No card slots:** `/settings/branding`, `/settings/tester-licenses`

## Coverage, stated

71 routes of ~350. This sample is not random — it was the batch of a four-way split — so 58% should not be extrapolated to the whole app without measuring the rest. The raw records are one JSON object per route with per-slot `paintedCardMatches`.
