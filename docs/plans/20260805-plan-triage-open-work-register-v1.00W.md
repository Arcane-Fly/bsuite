# BSuite Open-Work Register — 2026-08-05

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Machine-readable companion: `/tmp/bsuite-open-register.json`

Method: every `docs/plans/*.md` file across the parent + 6 submodules (63 real plan files +
15 index/STATUS meta files) was read and verified against live repo state — grep for the
named artefact AND its importer/router, `git log` for merge evidence, `gh issue view` for
tracked issues, and read-only SQL against Supabase project `tuybltdrdefjblnplpqo` — rather
than trusted at face value. Cross-referenced against the operator's live UX register
(`/tmp/notes2.txt`). Work was split three ways: two parallel sonnet research agents (GTO/
billing/comms cluster; UX/theme/authoring/platform cluster) plus the orchestrator (region
migration, UX-implementation rounds 1-2, theme conformance, submodule adoption plans).

## Counts

| Classification | Count |
|---|---|
| DONE | 26 |
| SUPERSEDED | 8 |
| OPEN | 30 |
| UNKNOWN | 6 (listed, not guessed) |
| Meta (STATUS/README/INDEX, not individually scored) | 15 |

**63 plan files classified, 55 discrete OPEN items extracted, 6 operator-register gaps with
no covering plan, 3 built-but-unwired findings.**

## Top 20 OPEN items (ranked: in operator register first, then size)

| # | Item | Plan | App | Size | Evidence |
|---|---|---|---|---|---|
| 1 | Schema Builder Tidy/Fit icons do nothing | 20260501-universal-wysiwyg-schema-ux / UX round-1 Task5 | crm7 | S | No dagre/fitView code exists; notes2.txt lines 15-17 confirm live |
| 2 | Portal delivery affordance missing (`/portal` dead-ends) | UX round-2 Task8 (#7) | crm7 | M | No merge commit found; notes2.txt line 23 |
| 3 | Worker-portal shareable link | UX round-2 Task8 (#20) | crm7 | S | notes2.txt line 43 |
| 4 | Pipeline/kanban should source from conduit | UX round-2 Task8 (#22) | crm7/conduit | M | notes2.txt line 43 |
| 5 | BSU dashboard drag/drop persistence never adopted | BSU adopt-dnd-dashboard | business-suite-unified | M | Zero grep hits for `dashboard_layouts` |
| 6 | BSU EntitySelector adoption never started | BSU adopt-entity-selectors | business-suite-unified | M | Zero grep hits; mirrors "can't create company inline" complaint |
| 7 | Enterprise licence Xero half unbuilt, grace expiry unenforced | weekly-gap register | business-suite-unified | M | docs/20260728-weekly-gap-register §4 |
| 8 | Rate-field naming unification (pay/charge/hourly) | 20260728-r8-as-rates-engine-architecture | crm7 | M | notes2.txt line 36 |
| 9 | Per-page theme audit gates (P1-P9) never built | 20260803-theme-conformance-dod | platform | L | `scripts/audit-routes.sh` missing; notes2.txt statcard bug |
| 10 | PageGridLayout rollout completion (bsuite#479) | 20260510-universal-canvas | multi | L | gh issue OPEN; card resize/dnd complaints recur |
| 11 | Documentation program build (design-only) | 20260723-bsuite-documentation-program-design | platform | L | notes2.txt "docs should include screenshots" |
| 12 | Sydney region cutover execution | bsuite#1322 runbook | infra | L | Blocked on operator go/no-go |
| 13 | Round 3 UX items never executed (#21, #15 docs screenshots) | UX round-2 deferred | crm7/docs | S | No round-3 file exists |
| 14 | AI usage metering (W10) never built | 20260716-completion-program | platform | M | Zero `ai_usage_events` anywhere |
| 15 | Rate document/version ownership undecided | 20260728-r8-as-rates-engine-architecture | R80.3/crm7 | L | Architecture Open Question 1 |
| 16 | Recruiter email/calendar comms (W2) | 20260724-email-funding-expansion-scope | crm7/conduit | M | No artefact found |
| 17 | Document storage Phase 2/3 | 20260609-production-readiness | crm7 | M | crm7#1057 open |
| 18 | Self-service document portal | 20260609-production-readiness | crm7 | L | crm7#1058 open |
| 19 | R80.3 bulk multi-apprentice calc UI | 20260703-gto-e2e-gap-map | R80.3 | M | No bulk-select pattern found |
| 20 | Zod-4 app-tree sweep (436 occurrences) | 20260513-consolidated-hardening | multi | L | bsuite#1505 |

Full 55-item list with `plan_file`, `blocked_by`, and per-item evidence is in the JSON.

## Built-but-unwired (the highest-value finding class)

1. **EntitySelector family** — built and used in crm7 (canonical owner), but **not adopted in
   business-suite-unified or conduit**, despite 3-month-old adoption plans in both. Both apps
   still ship local creation forms for entities they don't own. This is the direct code-level
   cause of the operator's "leads can't create new company inline" style complaints being
   solved in one app and not the others.
2. **`uplift/INDEX.md`** calls itself the canonical wave tracker but hasn't been updated in 3
   months while `bsuite#635` remains actively worked (confirmed OPEN, last activity
   2026-07-28) — a documentation-wiring gap.
3. **`scripts/audit-applied-tokens.mjs` / `scripts/audit-routes.sh`** — named as required gates
   (G5, G6, P1-P9) in the approved `20260803-theme-conformance-dod` plan, but neither script
   exists. The gates they would enforce cannot be verified until they're written.

## One correction made during this triage

A subagent initially flagged `handover-to-employment` (recruitment→employment handover edge
function) as OPEN, "not built at all," from a grep for `handover_to_employment` (underscore).
Direct verification found the real artefact uses a hyphenated slug —
`crm7/supabase/functions/handover-to-employment/` exists, is invoked from
`crm7/src/pages/apprentices/from-candidate.tsx:223` in the main tree, and per the
2026-07-28 weekly-gap-register append is deployed live. Reclassified **DONE**. Flagging this
because it's exactly the kind of false-negative this register exists to catch — and to catch
in the other direction, not just "claimed done, actually open."

## Operator-register items with NO covering plan (planning gaps, not just execution gaps)

1. **Cross-app SSO session loss on app switch** — switching from BSuite to CRM7 (or any app)
   signs the user out and lands them on that app's public landing page. No plan names this
   specific regression; given how much OAuth-bridge doctrine already exists, this reads as a
   fresh regression that needs an issue, not a plan.
2. **Module-visibility settings opaque** — reports "2 hidden modules" with no way to see or
   enable them.
3. **Enterprise licence grace-seat lifecycle UX** — notifications, auto-Xero-invoice,
   price-per-seat nomination, subscription-type picker at grace sign-up. The underlying table/
   audit-write P0s are covered elsewhere; these specific UX asks are not.
4. **Airtable-style report builder + platform-report permission scoping** — the operator's
   live complaint directly contradicts the Reports W2 uplift plan's DONE classification for
   this specific capability. Either a real regression or the "done" claim never covered this
   scope. This is the single highest-value item to resolve first, since it's a direct
   plan-vs-reality contradiction, not just an unplanned gap — needs a signed-in browser check.
5. **ADMS federal funding claim integration depth** — how client orgs actually claim, and how
   funding validity is kept current.
6. **Training-provider TGA import depth** — missing Qualification Scope, all-vs-on-demand RTO
   import model, provider→Organisation promotion, and cost tracking.

## Coverage caveats (honest gaps in this register itself)

- 3 weekly-gap-register assessment areas (shared-package pin train, security-advisor triage,
  frontend/backend orphan-route mapping) were killed by a session limit when originally run
  and were **not** re-run here — carried forward as UNKNOWN, not silently dropped.
- `20260728-gap-remediation-plan` Tasks 2/3/5 and `20260729-qa-backlog-execution` T2-T6/T8-T13
  were not individually re-verified against commits — flagged OPEN pending evidence rather
  than guessed either way.
- The uplift wave statuses (W2-W8) are read from `INDEX.md`, which is itself confirmed stale
  (3 months old) — treat those individual wave statuses as last-known, not current, state.
