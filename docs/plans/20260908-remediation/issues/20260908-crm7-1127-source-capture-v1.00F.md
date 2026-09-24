---
kind: record
authority: none
owner: bsuite
---

# [P2 batch] Onboarding-pilot UX polish checklist (F5, F10, F11, F12, F17, F21)

https://github.com/GaryOcean428/crm7/issues/1127

Snapshot updatedAt: 2026-07-28T08:52:16Z. Open at capture; re-read live.

## Onboarding-360 pilot UX polish checklist (2026-07-14)

One tracking issue for 6 P2 findings from the live onboarding-360 pilot (Paul Boyle / Builden Construction, Braden Group tenant). Each is minor/polish-level individually; batched here rather than as 6 separate issues.

- [ ] **F5** — Host Employer ABN field has misleading static "auto-filled" helper text. `/people/new` — `#employer_abn`'s static help text implies the ABN auto-populates once a Host Employer is selected; in practice it's a plain manual text input with no such wiring. Fix: wire the auto-fill from the selected employer's stored ABN, or remove/correct the helper copy. (Related: #660 covers ABN auto-populate on the host-employer side.)
- [ ] **F10** — Inconsistent post-create navigation: Person creation lands on the new record's detail page (`/people/{id}`); Placement creation lands on the list page (`/placements`) instead of the new record's detail. Fix: standardise on "land on detail" for all create flows.
- [ ] **F11** — Possible tenant-branding flash-of-generic-content (FOUC) on `/people/{id}` first paint: header briefly rendered generic "CRM7"-branded content with a "Loading..." state before the correct "Braden Group" branding resolved (~7s). Not fully confirmed under normal (non-scripted) load timing — needs real-browser profiling. Fix if reproducible: gate the tenant-branded header render behind tenant-context resolution instead of painting a generic default first.
- [ ] **F12** — Supervisor/Contact `EntitySelector` (used on `/people/new` and `/placements/create`) requires surname-only matching; searching a full name ("Steve Nguyen") returned 0 options, surname alone ("Nguyen") worked — confirmed consistently across both forms. Fix: widen the search predicate to match a concatenated `first_name || ' ' || last_name` (or `to_tsvector`-style multi-field match).
- [ ] **F17** — Two separate, disagreeing document-list widgets stacked on the same `/people/{id}` Documents tab: the "Secure documents" table correctly shows 2 real uploaded documents, immediately followed by a second "Documents" section reading "No documents found for this person." Fix: consolidate to a single document list component per entity, or clearly delineate the two sections' purposes (e.g. one is a "quick upload by required category" panel and should say so rather than falsely claiming zero documents).
- [ ] **F21** — Results panel on the Charge Rate Calculation page (post-"Calculate Charge Rate") renders with the page-builder's dotted canvas grid bleeding through around/behind the Cost Breakdown/Cost Details cards; columns appear clipped at the viewport edge at 1440px desktop (screenshot `shots/72-after-calculate.png`). Fix: contain the results grid within a proper responsive card/section boundary.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.2 visual-equivalence per checkbox (screenshot before/after at the relevant breakpoint)
- **Equivalence target**: per-item — each checkbox closes independently once its own visual/behavioral divergence is resolved and screenshotted
- **Cross red-team**: claude-code verifies each checked item with a screenshot pair before the box is ticked
- **Skills to load**: `ux`, `ui-styling`, `playwright`
- **Self-report on divergence**: yes — F11 is flagged "not fully confirmed"; if real-browser profiling shows it's an automation artifact, close that sub-item as not-a-bug with the profiling evidence linked

---
Filed by the issue-filer agent from the 2026-07-14 onboarding-360 pilot. Source: `ux-findings.md` F5, F10, F11, F12, F17, F21.
