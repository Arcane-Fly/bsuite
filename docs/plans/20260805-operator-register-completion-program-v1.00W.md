# Operator Register — Completion Program

**Date:** 2026-08-05 · **Status:** W (Working) · **Owner:** PI (claude-code-bsuite-pi)
**Source:** operator register `Downloads/bsuite notes (2).docx` (263 paragraphs, 47 screenshots)
**Mandate:** *"everything in the bsuite notes (2).docx, and every plan file completed in full …

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

noone stops until everything is completed in full. PROVEN and promoted to production via
development branch."*

---

> ## ⚠ CORRECTION — 2026-08-05, same day
>
> **The "2.9% wired / 331 hand-rolled" figure below is WRONG and is retained only
> so the error is visible rather than quietly deleted.**
>
> I grepped for the string `PageGrid` and missed `DraggableCardPage` and
> `CanvasCard` — the primitives that carry almost all of this codebase's card
> pages. Re-measured with the same page definition:
>
> | search | reported wired | of | % |
> |---|---|---|---|
> | `PageGrid` only (what I did) | 6 | 319 | **1.9%** |
> | `PageGrid` OR `DraggableCardPage` OR `CanvasCard` | **286** | 319 | **89.7%** |
>
> So the canvas was **not** 97% unwired — it was ~90% wired, and a previous
> session had already found and solved the "one backing card" defect.
> `DraggableCardPage`'s own doc comment describes that exact anti-pattern.
> `PageGridPage` was real but had **3 consumers**, not 331.
>
> **The genuine remaining defect was ~19 pages with no grid primitive at all,
> plus the `PageGridPage` holdout.** That is a real fix and it is being landed —
> but it is not an explanation for three failed sessions, and I presented it as
> one to the operator and to every co-agent.
>
> This is the third time in one session I manufactured a phantom gap by
> searching the wrong noun (the others: four wrong table names for email, which
> is really `email_integrations`; and the triage agent's
> `handover_to_employment` vs `handover-to-employment`). **A grep that returns
> nothing is not evidence of absence — it is evidence about the grep.** Before
> any number becomes a headline, enumerate the alternative names for the thing
> being counted.
>
> What actually explains the operator's experience is recorded below under
> "What the register really shows".

## Why the previous three attempts failed

The operator's own words are the diagnosis:

> *"These issues are persistent across the app and have been flagged to be fixed across the full
> app many times. Typically the fixing agent fixes that page i've pointed to but i have always
> said it is a platform wide consideration that needs addressing."*

**Measured 2026-08-05.** A "card page" = a `.tsx` under `src/pages` containing 2+ `<Card`,
excluding tests.

| app | wired to the grid | hand-rolled | % wired |
|---|---|---|---|
| crm7 | 6 | 313 | 1.9% |
| business-suite-unified | 2 | 8 | 20.0% |
| conduit | 0 | 2 | 0% |
| throughput | 1 | 2 | 33.3% |
| braden | 1 | 6 | 14.3% |
| R80.3 | 0 | 0 | — |
| **TOTAL** | **10** | **331** | **2.9%** |

Fixing one page out of 331 is invisible. That is the whole grievance, quantified.

### And the "fix" was itself the bug

`crm7/src/components/platform/PageGridPage.tsx` hardcodes **one** grid item and puts every child
inside it:

```ts
lg: [{ i: 'content', x: 0, y: 0, w: 12, h: rows, minW: 4, minH: minRows }]
widgets={{ content: children }}
```

That IS the "common backing card". `src/pages/Dashboard.tsx` — the operator's stated reference
(*"Dashboard shows how cards should be setup"*) — does **not** use it; it calls `PageGridLayout`
directly with **7 independent grid items**, each with its own `i/w/h/minW/minH/autoHeight`.

So `PageGridPage` is an anti-pattern that *looks* like the fix. Any agent told "wire this page to
the grid" reaches for it and reproduces the exact defect. This is almost certainly what happened
repeatedly.

**Standing rule for this program: no item is closed by fixing one page. Every item is closed by a
platform-wide change plus a gate that fails when the defect returns, and the gate must be proven
to fire by planting a violation.**

---

## Ground truth established before dispatch

Verified against production, not assumed:

| Operator claim | Verified reality |
|---|---|
| `fairwork-enhanced` 503 | **Already fixed** — OPTIONS 204, POST 401 (gating, not BOOT_ERROR) |
| `enterprise_licence_events` missing from schema cache | **Table exists** — was schema-cache staleness |
| `/payroll/award-rates` shows no wages | **Confirmed** — `award_classifications`=0, `award_rates`=0, `award_rate_cache`=0 rows, and no writer |
| No way to connect SMTP/Google/Azure email | **Confirmed** — no `tenant_email_settings` / `email_accounts` / `smtp_settings` table exists at all. Never built. |
| FutureBuild sees platform-wide reporting | **Confirmed** — `ScopeSelect` hides only `'public'`; nothing gates `platform`, and the component never reads `platformRole` |

---

## Lanes

Each lane closes with: platform-wide fix → gate → **proof the gate fires** → merged to
`development` → promoted to `main` → verified live.

| Lane | Scope | Owner | State |
|---|---|---|---|
| **A** | Card canvas: per-card grid items, migrate named pages, CI gate against new hand-rolled card pages, "cards half cut off" | subagent (worktree) | running |
| **B** | Email connection — SMTP first, Google/Azure scaffolded. Table + RLS/secret model + edge fn + settings UI + test send | subagent (worktree) | running |
| **C** | Cross-app SSO — session lost switching BSU → crm7/R8 | subagent (worktree) | running |
| **D** | Award rates — empty substrate, no writer | unassigned | queued |
| **E** | Report scope tenant gating (security) | subagent (worktree) | running |
| **F** | Portals — `/portal` redirects to dashboard; no shareable portal links; persona-driven UX for worker/host/field-officer | unassigned | queued |
| **T** | All theme/hue/gradient/pure-white items | **theme lane** (handed off, envelope `fd872127`) | handed off |
| **P** | Triage of all 80 plan files into a verified open-item register | subagent | running |

---

## Full item register (from the operator document)

Every item below is tracked to completion. `→` marks the owning lane.

### Platform-wide (the recurring class)

1. Cards attached to a common backing card — cannot be dragged individually → **A**
2. Card resize regression — individual cards no longer resizable → **A**
3. Columns to move cards into do not respect the columns slider → **A**
4. Cards half cut off when the page opens → **A**
5. Dashboard: 4 cards sit outside the draggable grid (see `Dashboard.tsx` ~L586) → **A**

### Communications

6. `/communications` — emails cannot be opened and read → **B**
7. No way to connect SMTP / Google / Azure email (*"in excess of 20 times"*) → **B**
8. `/communications/compose` — stat cards share one backing card; half cut off → **A**

### Auth / navigation

9. Selecting another app from inside BSuite lands logged out → **C**
10. `/portal` just redirects to dashboard → **F**
11. No way to send clients / hosts / workers their personal portal link → **F**

### Data / integration

12. `/payroll/award-rates` — no wages, period shows "percent", no description → **D**
13. TGA: cannot import units on a qualification; RTO qualification scope missing; training providers not populated from TGA; import on user action; training/resource/equipment costs; last entry per qualification authoritative into R8 → **D**
14. ADMS / funding: how client orgs claim via our RAMS connection; funding validation over time; "create a claim" when the claim lives on CTF's portal; funding amount, timeframes, application (passthrough / offset / top-up); custom priority categories → **D**
15. AVETMISS funding on `/engagements/create` makes no sense — a GTO records funding available to **employers**, not for training → **D**

### Reporting

16. FutureBuild sees platform-wide reporting; only a developer account should have it → **E**
17. Airtable-style report builder is nowhere visible despite being planned and directed many times → **CLOSED 2026-08-05** (qwen, operator directive overruling PI's defer): crm7#1426 merged `--merge` to development (baabd148), live-verified signed-in on d.crm.crm7.app via headless CDP — wizard retired; grid-first single screen (typed column headers with sort/remove menus, add-field ⌘K palette, add-column control, row-number gutter, zebra rows over the live RLS preview, inline title + one Save, open Visibility & details settings section). Functional pass on the deployed bundle: two fields added via palette rendered as grid columns with 5 live preview rows. Evidence comment + screenshot on the PR. **Phase 2 (2026-08-06, PI green-light 94226dc6/e5da46de): crm7#1432 (74e9cd09)** — column drag-reorder (@dnd-kit grips), working per-column filter row, server-side saved views (report_configs `builder_view`: save/apply/delete + export/import JSON), linked-record cells (/people/:id, /training-providers/:id; no fake links). Live-verified: filters 5→no-match→5; 5/5 linked cells; page overflow 0 @1440+375; nav/back present at both widths. The pre-existing ReportBuilder asset was surfaced, not duplicated (per operator: "double check before duplicating").
18. Financial reports / Analytics do not present as the required Airtable-style reporting → **MIGRATED 2026-08-06** (qwen, N43 lane, operator OVERNIGHT GOAL): crm7#1428 + #1430 merged `--merge`, live-verified signed-in on d.crm.crm7.app. Mock currency stats replaced with live invoice summary (cards explain Loading/No-access/Live, never a silent dash); dead controls wired or removed (Schedule gone, Share=clipboard, Delete=AlertDialog+service); placeholder chart tabs replaced with real recharts or honest EmptyState (Balance Sheet has no source data in CRM7); "Custom report builder" links the Airtable grid (#1426) from the financial surface. OPEN for rulings: (a) invoices-select RLS denies some roles → cards show "No access to invoices (RLS)" (DB-lane); (b) Balance Sheet needs a ledger source to ever chart (DB-lane); (c) `/analytics` surface still to be reviewed against the same bar.

### R8 / rates

19. UI squeezes too much into a small card when page space is available → **D**
20. "Standard" pay-rate option is unclear; hierarchy should be Adult / Junior (completed yr12, not completed yr12) / School-based (yr11, yr12) → **D**
21. Funding Offsets should live inside the calculation, not a separate page → **D**
22. Training Hours should live in the calculation screen → **D**
23. No option for workers who are **not** apprentices/trainees — casual, ABN, full/part-time skilled (labour hire) → **D**
24. `/charge-rates/…/edit` — where do advanced config values come from; why not editable; should pull from the worker's R8 calculation; cannot confirm selection → **D**
25. Reference: `Downloads/charge-calculator-mapd.jsx` has a far better visual arrangement (calculation is solid aside from hard-coded values) → **D**

### Training / VET

26. `/training/plans/create` — Progress should be computed from units of competency completed vs remaining → **D**
27. `/vet/qualifications/…/edit` — cannot import units; should pull from the TGA API like the qualification → **D**
28. `/training/plans/…` — units associated to the apprentice; needs cross-cutting + one-shot policy applied → **D**
29. Training plans card shows `/u` and clicking does not navigate to training plans → **A**

### Placements / documents

30. `/placements/…/edit` — hourly rate ambiguous (pay vs charge); should optionally pull from R8 → **D**
31. `/placements/…?tab=documents` — requires document upload capability → **F**

### Leads / pipeline

32. `/leads/create` — cannot create a new company, only select an existing one; wrecks the flow → **A/F**
33. `/pipeline/kanban` — should be pulled from conduit → **F**
34. Client-update-to-host bug; leads→clients→host employer one-shot policy compliance → **F**

### Admin / settings / licensing

35. `/settings/schema-builder` — unusable; "tidy" just stacks into a column; "fit" does nothing → **F**
36. `/settings/module-visibility` — says 2 hidden modules but none are selectable → **F**
37. Dashboard edit should add elements/widgets/entities **in place**; currently redirects to page-builder and only creates a whole new page. This capability existed recently and regressed → **A**
38. Enterprise grace invites: email + in-app notice, grace-end date, auto invoice from Xero, price per additional seat per subscription type, subscription selection at grace signup → **F**
39. `/branding` — only saves after "Show preview" → **F**
40. Docs (`/docs/enterprise-admin` and all docs) should include screenshots → **F**

### Portals (persona-driven)

41. Host / worker / apprentice / trainee portals: *"Navigation f-cking sucks, UX sucks, the portals basically suck."* Take on each persona and design for what they must achieve — upload employment documentation, financial details, timesheets, apply for and browse roles → **F**
42. Unclear what the field-officer portal achieves → **F**
43. `/portal/worker` should produce a link for job ads, or post to SEEK with profile scraping and application import → **F**

### Theme — handed to the theme lane (envelope `fd872127`)

44. Pure white text on dark screens; header gradient + accent glow; nav gradient matching the tenant-switcher underline; card/page headers per D2C; no pure-white light-theme cards → **T**
45. `/financial` statcards render pure white (`lab(100 0 0 / 0.96)`); border is a 1px box-shadow ring, blurry → **T**
46. `suite.crm7.app` Jodie AI logo missing → **T**

### Architecture question raised by the operator

47. Multi-repo presenting as one app (Vite Module Federation vs multi-zone routing), entitlement-gated navigation, conforming to Supabase OAuth 2.1 — **needs a PI ruling, not code.** Recorded here so it is not lost.

---

## What the register really shows

With the false headline removed, the evidence from this session points somewhere
narrower and more useful. **Work repeatedly reached "merged" without ever
reaching the operator.** Measured today, five independent instances:

| Feature | State | Why he never saw it |
|---|---|---|
| Schema Builder Tidy/Fit | fix published as `@bsuite/schema-builder@1.0.3` | every consumer app pinned `1.0.2` |
| Email connection | built, merged, **deployed** | dispatcher read `smtp_user`/`smtp_pass`; real columns are `smtp_username`/`smtp_password`, so every send failed the "not configured" guard |
| Cross-app SSO | `getCrossAppLoginUrl()` built and used by every other launcher | the three tiles he actually clicks never adopted it |
| EntitySelector | built and used in crm7 | never adopted in BSU or conduit, despite 3-month-old adoption plans in both |
| Report-scope hardening (this session) | committed by an agent | committed into a worktree's own object store — unreachable from all three repos, nearly lost |

None of these are laziness, and none are "the agent fixed only the page I pointed
at". They are all the same failure: **completion was declared at merge, and the
last link — reaching a running app the operator opens — was never checked.**

Two consequences follow, and they are the actual programme:

1. **Definition of done must end at the user, not the merge.** Named artefact,
   named caller, consumed version, and a check on the deployed surface.
2. **The operator has no reliable way to see what is live.** Several items in his
   register are already fixed and shipped — `/branding` save, `fairwork-enhanced`,
   `enterprise_licence_events`, cards-half-cut-off. He is partly reporting stale
   state because nothing tells him what changed. That is a feedback-loop defect
   and it is why the same items recur across sessions.

## Rules binding every lane

1. **Platform-wide or it does not count.** One page is not a fix.
2. **Every fix ships with a gate, and the gate must be proven to fire** by planting a violation and watching it fail. A gate that has never failed is decoration.
3. **Verify the premise before building.** Several register items are already fixed (see ground truth). Check before working.
4. **Built-but-unwired counts as not done.** The canvas was "complete" and 97% unwired.
5. **Migrations:** timestamp above `20260611000000`, unique across every submodule, file only — never applied by an agent.
6. **Never `git add -A`.** Explicit pathspecs, re-checked immediately before commit. GPG-signed.
7. **Never touch the FutureBuild Academy tenant** (`b550d66c`) — real paying client.
8. **Under-claim.** The operator's chief grievance is claimed fixes he cannot see.

## Definition of done for the program

Every register item is `DONE` (with the artefact, its caller, and the gate named), `SUPERSEDED`
(with the successor), or `OPERATOR DECISION` (escalated with options). Merged to `development`,
promoted to `main`, and verified on the live URL.
