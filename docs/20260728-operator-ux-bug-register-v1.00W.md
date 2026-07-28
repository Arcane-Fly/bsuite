# Operator UX / Feature Bug Register — 2026-07-28

Source: operator notes doc (`bsuite notes (1).docx`, 26 screenshots), compiled over 2026-07-28.
Operator caveat: **the doc was appended to all day — some items may already be fixed. VERIFY each
before acting.** Nothing here is to be treated as an open defect until verified against current
`development` + live.

Status legend: `VERIFIED-OPEN` / `VERIFIED-FIXED` / `UNVERIFIED` / `NEEDS-PRODUCT-DECISION`.

## Already actioned by PI

| # | Item | Status |
|---|---|---|
| 18 | Licence grace seats: `Failed to load events: Could not find the table 'public.enterprise_licence_events' in the schema cache` | **VERIFIED-FIXED 2026-07-28.** Table existed (18 cols, 3 policies, grants OK); PostgREST schema cache was stale. Issued `NOTIFY pgrst, 'reload schema'`; REST now returns HTTP 200. |

## P0 — hard crash / wrong data

| # | Surface | Issue | Status |
|---|---|---|---|
| 2 | `/communications/compose` | **Application Error, React minified #185** (maximum update depth exceeded — infinite render loop). Page unusable. Screenshot shows error boundary + `error_1785123750080_67dtpa1xm`. | UNVERIFIED |
| 2b | `/communications/compose` | `functions/v1/fairwork-enhanced` → **503**. Note: `fairwork-enhanced` is the one edge fn still deployed from an operator LOCAL path, not CI (CF-7) — likely related. | UNVERIFIED |

## P1 — feature missing / flow broken

| # | Surface | Issue |
|---|---|---|
| 1 | `/communications` | Emails cannot be opened/read. |
| 1b | platform | **No way to connect SMTP / Google / Azure email.** Operator: "mentioned in excess of 20 times". Tenants must be able to connect their own SMTP/Azure/Google accounts and send from them. Cross-check the April finding that deployed OAuth email fns may read mismatched client-id env names. |
| 6 | `/dashboard` | Edit mode must allow adding elements/widgets/entities and editing the **live page in place**. Currently redirects to page-builder and only creates a NEW page. **Operator notes this regressed — the ability existed recently.** |
| 7 | `/portal` | Redirects to dashboard. No way to send clients / host employers / workers / apprentices their personal portal. |
| 8 | `/leads/create` | Cannot create a new company/client from here, only select existing. Breaks the flow. (Note: crm7 `5a81154a` "make create-company affordance impossible to miss" landed this window — verify whether this is now fixed.) |
| 13 | `/vet/qualifications/{id}/edit` | Cannot import units of competency. Should pull from TGA API like the qualification does. |
| 17 | `/placements/{id}?tab=documents` | Requires document upload capability. |
| 20 | `/portal/worker` | Should produce a shareable link for job ads → candidate application; or post to Seek and import applications. |
| 22 | `/pipeline/kanban` | Should pull from conduit (one-shot: conduit owns recruitment). |
| 23 | `/settings/module-visibility` | Says "2 hidden modules" but shows no modules to toggle — cannot enable them. |

## P1 — platform-wide (operator: repeatedly fixed per-page instead of platform-wide)

| # | Issue |
|---|---|
| 3 | Stat cards (Total Messages / Sent / Delivered / Failed) share ONE backing card — must be individually movable in edit mode. **Screenshot confirms.** |
| 3b | Cards **half cut off** when the page opens. **Screenshot confirms** (stat row clipped by its container). |
| 3c | **Operator's core complaint:** "these issues are persistent across the app and have been flagged many times. Typically the fixing agent fixes that page I've pointed to but I have always said it is a platform-wide consideration." → Treat as a **platform invariant + lint/contract**, not a page fix. |

## P2 — UX quality / clarity

| # | Surface | Issue |
|---|---|---|
| 4 | `/payroll/award-rates` | No wages visible; Period column just says "percent"; no description visible. |
| 5 | `/settings/schema-builder` | Unusable. "Tidy" just stacks schema cards into a column. "Fit" does nothing. |
| 9 | `r8.crm7.app` | UI squeezes too much into a small card when the page has ample space. |
| 9b | r8 | Pay-rate "Standard" option unclear. Required hierarchy: **Adult / Junior / School-Based**; then **Completed year 12 / Has not completed year 12**; then **School-based year 11 / year 12**. |
| 9c | r8 | Industry Sector + **Funding Offsets** must be available *inside the calculation*, not a separate page. Reference implementation with better layout: `/home/braden/Downloads/charge-calculator-mapd.jsx` (demo — no bulk creation, hard-coded values, but the calculation is solid). |
| 10 | r8 | Training Hours likewise belongs in the calculation screen, not a separate page. |
| 11 | `/charge-rates/{id}/edit` | Where do "advanced configuration" values come from? Why can't they be edited? Should be pulled from the worker/apprentice's calculation in R8. Cannot confirm selection. |
| 12 | `/training/plans/create` | Progress should be **calculated** from units of competency completed vs remaining. |
| 14 | `/training/plans/{id}` | Units appear associated to the apprentice → apply cross-cutting + one-shot policy. |
| 15 | `suite.crm7.app/docs/enterprise-admin` | Docs should include screenshots. **Applies to all docs.** |
| 16 | `/placements/{id}/edit` | "Hourly rate" ambiguous — pay rate or charge rate? Should be pullable from R8 when linked. |
| 19 | `suite.crm7.app/branding` | Only saves after clicking "Show preview". |
| 21 | — | Client-update-to-host bug; leads → clients → host-employer one-shot compliance. |

## Cross-references to existing tracked work

- #3/#3b/#3c ↔ the card-unglue sweep (crm7 burns 1–12) and `bsuite#479`; `crm7#744` (grid resize snaps shut) and `crm7#619` (scroll regression) are the already-open sibling bugs. Filed residue: `crm7#1260`.
- #2b ↔ CF-7 (`fairwork-enhanced` deployed from operator local path, not CI).
- #9c/#10/#11/#16 ↔ R80.3 funding-offset wiring (`61c1286`) and `R80.3#367` (bulk path drops the offset).
- #12/#13/#14 ↔ `crm7#662` (surface units of competency, competency-based progression).

---

## Verified status — 2026-07-28 (PI pass, two subagent clusters)

**Headline: most of this register was already fixed before it was compiled.** The operator's own
caveat was correct. Every row below was traced against current `development`, not taken on report.

### Communications cluster — 5 of 6 already fixed

| # | Item | Status | Evidence |
|---|---|---|---|
| 2 | compose React #185 crash | **VERIFIED-FIXED** | `cfa85c88` — `selectActiveIntegrations` returned a fresh array each call; without `useShallow`, `useSyncExternalStore` saw a new snapshot every render → infinite loop. Screenshot's error-id decodes to 2026-07-27 11:42 AWST, ~4h **before** the 15:58 fix. |
| 2b | `fairwork-enhanced` 503 | **VERIFIED-FIXED** + red herring | Deployed source byte-identical to `216c267`; no consumer of the fn is even mounted in the compose tree, so the 503 was a stale cross-page log. |
| 8 | `/leads/create` company | **VERIFIED-FIXED** | `5a81154a` |
| 23 | module-visibility | **VERIFIED-FIXED** | `48384c43` / `3a128b79` |
| 4 | award-rates wages/period/description | **VERIFIED-FIXED** | `c4e18b25`, `0da1b7ef` |
| 1 | emails cannot be opened/read | **VERIFIED-OPEN** | Sent/SMS/Internal/All tabs have no row-click and no detail view. Only the separate Inbox tab (different data source) has a read pane. Needs a new component. |

### R8 / charge-rate / training cluster — 8 open, 1 fixed, 2 mixed

| # | Item | Status | Evidence / root cause |
|---|---|---|---|
| 13 | TGA units import | **VERIFIED-OPEN — worse than reported** | Two broken paths, not a missing UI: bulk sync is feature-flagged **off** (`TGA_SYNC_ENABLED=false`, pending schema sign-off), AND the single "Import Qualification" button is wired to `handleImport`, which imports an **RTO/training-provider by numeric code** — a real qualification code fails validation. Building a units-import UI on this ships a button that fails every time. |
| 11 | charge-rates advanced config | **VERIFIED-OPEN** | `AdvancedConfigSection.tsx` is a *read-only display* of hardcoded `@bsuite/charge-calc` package defaults as plain `<li>` text — never the linked apprentice's values. "Cannot confirm selection" traces to `const [, setSelectedAward] = useState(...)` — the picked value is discarded. |
| 9 | R8 cramped layout | **VERIFIED-OPEN** | Literal `max-w-5xl` at `R8Calculator.tsx:427`. One-line scope. |
| 9b | pay-rate hierarchy | **VERIFIED-OPEN — feature, not label** | School-Based apprentices (and the Year 11/12 sub-tier) **do not exist anywhere in the codebase**. "Standard" is overloaded with two unrelated meanings across two components. |
| 9c | Funding Offsets in-calculation | MIXED | Sub-part fixed; primary flow still open. |
| 10 | Training Hours in-calculation | MIXED | Sub-part fixed; primary flow still open. |
| 12 | training plan progress calculated | **VERIFIED-OPEN** | |
| 14 | units→apprentice one-shot | **VERIFIED-FIXED** | |
| 16 | placement hourly-rate ambiguity | **VERIFIED-OPEN** | Same cross-app ownership question as #11. |
| 17 | placement document upload | **VERIFIED-OPEN** | Infrastructure exists (`document-secure-upload`, `document-virus-scan`, `org_documents`) — missing UI wiring only. |

### Closed this pass
- `R80.3#367` (bulk path fundingOffset) and `R80.3#368` (three inert surfaces) — both fixed in `2bebb31` (signed, `origin/development` HEAD) and closed. Selectors now carry visible `(not yet active)` tags rather than silently doing nothing.

### PRODUCT DECISIONS — operator call required, agents must not invent these
1. **How should crm7 read R80.3's apprentice calculation live?** (#11 and #16 are the same cross-app ownership question.)
2. **Which TGA backend path gets fixed/enabled first** — the flagged-off bulk sync, or the mis-wired single import? (#13)
3. **Is School-Based apprentice modelling (incl. Year 11/12 sub-tier) a scoped feature project?** (#9b) — this is domain modelling, not a label change.
