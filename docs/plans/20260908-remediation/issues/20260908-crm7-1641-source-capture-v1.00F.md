---
kind: record
authority: none
owner: bsuite
---

# [P3] App.tsx is 4,019 lines — extract per-domain route manifests (unlocks per-route error boundaries)

https://github.com/GaryOcean428/crm7/issues/1641

Snapshot updatedAt: 2026-08-24T03:28:35Z. Open at capture; re-read live.

**Source:** operator full-spectrum review, 2026-08-11 (Tier 2.1). Re-verified: `src/App.tsx` is **4,019 lines** — grown from the review's 3,859 during today's route work.

## Finding

One file holds routes, auth wiring, wizard management and feature gates. 362 lazy routes are declared inline.

## Why this is worth doing, beyond tidiness

**It mechanically unlocks per-route error boundaries (#1629).** Today there are 3 boundaries for 443 pages, so one render error in a lazy route blanks a whole section. Threading a boundary through 362 inline route declarations means touching this file 362 times. Extracting per-domain route manifests first turns that into a change to one wrapper.

Sequence: **2.1 then 1.5.** Doing them the other way round is the expensive order.

## Shape

Extract route manifests per domain — people, financial, compliance, WHS, documents, portal, settings — into config modules, leaving `App.tsx` to compose them. The route objects are already uniform (`path`, `component`, `routeName`, `permission`), which is what makes this tractable.

## Two guards that must not regress

1. **`src/__tests__/inpage-link-route-coverage.test.ts`** (#1578) and **`nav-route-coverage.test.ts`** (#1098) both parse `App.tsx` **as text**, matching `path="..."`. Moving route declarations into other files will make both guards silently see fewer routes — and a coverage guard that reads an empty set passes. **Update both to walk the manifests, and confirm they still fail when a route is removed** before trusting them again. This is the single biggest risk in the change.
2. Route ORDER is load-bearing in wouter. `/leads/scoring` must precede `/leads/:id`, `/compliance/whs-audits/create` must precede `/compliance/whs-audits`. Composition must preserve order within a domain and the relative order of domains.

## Do not

Combine this with behaviour changes. It is a pure move; anything else in the same PR makes a 4,000-line diff unreviewable.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: the set of registered `(path, permission)` pairs is IDENTICAL before and after — dump both and diff, do not eyeball
- **Cross red-team**: claude-code verifies both route-coverage guards still FAIL when a route is deleted post-refactor
- **Skills to load**: bsuite-page-grid-layout, code-quality-enforcement, test-qa-and-verification
- **Self-report on divergence**: yes

**Acceptance criteria:** identical route set, both guards still demonstrated failing on a removed route, order preserved, and no behaviour change in the same PR.
