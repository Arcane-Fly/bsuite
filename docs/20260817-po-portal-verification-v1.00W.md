# PO-1, PO-4, PO-5 — verification and the one open decision

**Document:** `docs/20260817-po-portal-verification-v1.00W.md`
**Status:** W (Working) · **Version:** 1.00 · **Date:** 2026-08-17
**Closes (partially):** PO-1, PO-4, PO-5 in `docs/20260817-estate-completion-ledger-v1.00W.md` §"PO — portals"
**Reads against:** crm7#1804 (open), conduit#485 (open), crm7#1791 (open), `docs/20260814-portals-operator-rulings-v1.00A.md`

> **Glossary for this document:** **RLS** = row-level security, the database rule deciding which
> rows a signed-in user may read. **ADR** = architecture decision record. **WS-5** = a mandatory
> GTO (Group Training Organisation) regulator report. **on-cost** = an employer expense on top of
> wages (workers' comp, payroll tax) that a charge rate must recover. **BOOT** = Better Off Overall
> Test, the legal check that a custom pay arrangement beats the award.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. What this document is

This lane (`sw-po-portal-finish`) was asked to close PO-1, PO-4 and PO-5 from the 2026-08-17
completion ledger. Two other lanes (crm7#1804, conduit#485) had already opened PRs against the
same three items before this lane started. **Per instruction, this document does not duplicate
their fixes.** It does three things instead:

1. Verifies, from source and from the PRs' live Vercel preview deployments, that those fixes are
   real and do not re-land the walled behaviour the operator ruling forbids.
2. Classifies PO-4's four capabilities precisely — the ledger's "every one of seven tables
   resolves to null" verdict was true at measurement time but conflates four different situations
   that need different responses.
3. Answers PO-5's specific, unassigned question — what should populate `host_charge_rates` — which
   neither open PR addresses, because it's an architecture decision, not a code fix.

No commits in this document touch crm7 or conduit source. Two review comments were left on the
open PRs (crm7#1804, crm7#1791) flagging a stale ruling citation and a stale ADR row found while
verifying — both are informational, neither blocks either PR.

---

## 2. PO-1 — walled field-officer portal: verified genuine, not a re-wall

**Ledger verdict at measurement:** OPEN — "a rename re-landed the duplicate."

**What changed since:** crm7#1804 and conduit#485 (both open, unmerged) do the actual fix. Verified
independently, not taken on the PR's word:

| Claim | Verification method | Result |
|---|---|---|
| `PortalScopeGate` (OAuth-scope wall) removed from crm7's field-officer page | Read `src/pages/portal/field-officer.tsx` at the PR branch tip | Confirmed removed; route now carries `permission="view_field_officers"` — the same permission model as every other Field Officers page |
| The fix reached the served bundle, not just source | Fetched the PR's live preview (`crm7-git-fix-po1-po4-po5-portal-braden-pty-ltd.vercel.app`) and grepped the minified JS | `routeName:"Field Officer Dashboard"`, `permission:"view_field_officers"` present in the deployed bundle |
| "Choose Your Portal" picker no longer offers Field Officer as an external-style choice | Read `src/pages/portal/index.tsx` | Confirmed — field officer auto-lands on the dashboard the same way a GTO tenant type auto-lands on `/dashboard`; never shown as a picker option |
| Two latent bugs that silently emptied the caseload dashboard | Read the diff against the live schema | Both real: `people.field_officer_id` (doesn't exist) → `assigned_field_officer_id` (does); `contact_id` comparison → `user_id` comparison. Both independent of the walling — the page would have rendered empty even after de-walling without these |
| Mandatory database half (D-93: caseload limit as a DB rule, not a page filter) | Read the authored-not-applied migration `20260821050000_field_officer_caseload_rls.sql` | Present, RESTRICTIVE SELECT scoped to `people.assigned_field_officer_id`, passes the anon-revoke and search-path lints. **Not applied — correctly, per the standing migration rule** |
| conduit's route actually left the public-candidate `/portal/*` shell | Cloned conduit at the PR branch, `find` for the page file | `src/app/(dashboard)/field-officer-assignments/page.tsx` exists; `src/app/(portal)/field-officer-assignments` does not |

**One nit, checked and dismissed as non-defect:** crm7's route path is unchanged —
`/portal/field-officer` stays `/portal/field-officer`, only the label and gate changed, unlike
conduit which moved the URL. Checked whether this preserves walled behaviour: it doesn't. crm7 has
no `PortalLayout`-equivalent; every route including `/dashboard` renders through the same
`AppShell`/`ProtectedRoute`. The `/portal/` string in the URL is legacy naming with no functional
effect. Left as a comment on crm7#1804 in case a future pass wants URL parity with conduit, not as
a blocker.

**A live-test limitation, stated per the evidence standard:** the Next.js middleware on both
preview deployments intercepts every path — including a deliberately nonexistent control path —
with the same 307 to `/auth/login` before route resolution runs. Unauthenticated `curl` against a
Vercel preview cannot distinguish "route exists, needs auth" from "route doesn't exist" on this
stack (confirmed with a positive-control nonexistent path returning the identical redirect). This
matches the standing finding that a Vercel preview cannot be signed into. The route-existence claim
above is therefore verified from source and the served JS bundle, not from an authenticated
click-through — stated explicitly rather than implied.

**Verdict: fix verified correct. Not yet mergeable by this lane** — hygiene forbids merging, and
per the evidence standard a merged-but-unapplied migration and an unmerged PR are both short of
"shipped." **The one blocker: merge crm7#1804 and conduit#485 to `development`, then apply the
caseload RLS migration.** Both are mechanical, not engineering — the content is verified.

---

## 3. PO-4 — four capabilities, four different states

The ledger's "every one of seven expected tables resolves to null — nothing shipped" was accurate
at measurement but is a single verdict standing in for four situations the operator's own ruling
document (`docs/20260814-portals-operator-rulings-v1.00A.md`) treats as separate work items with
separate shapes. Restated per-capability, traced to a rendered route or its absence, not to a
component file:

| Capability | Ruling | State before crm7#1804 | State after (verified) |
|---|---|---|---|
| **Staffing orders** | D-95: a host places orders; a host does not browse workers; the GTO recommends | **Absent** — no table, no component, no route in crm7 or conduit | **Still absent.** Confirmed independently at `origin/development` for both repos. Correctly not attempted in crm7#1804 — this is a new-entity build (schema + a recommend-then-place workflow), not a routing fix |
| **Safety questions in the timesheet flow** | D-97: configurable Q&A shown pre-submit/pre-approve, plus a full History Log; must never assert "WHS compliant" | **Absent** — no table, no component, no route | **Still absent.** Same confirmation. Same reason not attempted — genuinely new schema (question sets, per-tenant config, audit log), not a wiring fix |
| **Payslip viewer** | D-96: the portal is a viewer; payroll is system of record; never recalculate | **Present-but-broken** — button routed every worker into a staff-only `/payroll` route gated on `manage_payroll`, a guaranteed 403. No payslip document exists anywhere (the Xero adapter returns the same summary numbers, not a document, and nothing calls it) | **Correctly re-classified as absent, honestly.** Button disabled with "not yet available" text. This is the right compliance shape per the standing rule — unknown renders unavailable, never a broken promise dressed as a feature |
| **"Chasing" (missing-timesheet detection + reminders)** | Unlabelled paragraph following D-98 in the ruling doc (not D-98 itself — D-98 is bank/TFN/super, out of scope; see the correction left on crm7#1804) | **Two halves, one state each.** Detection half (`/payroll/missing-timesheets` — a real placement-vs-timesheet diff, "OTS Parity Phase 4") was **present-but-unreachable**: built and routed, zero nav links. Reminder half (one-click email/SMS) was and is **absent** | Detection half: **fixed to reachable** — nav link added under Payroll. Reminder half: **still absent**, correctly not attempted (needs an email/SMS send integration, a new build) |

**Verdict: 2 of 4 capabilities have real progress (payslip honestly downgraded to absent; chasing's
detection half made reachable), pending the same merge blocker as PO-1. 2 of 4 (staffing orders,
safety questions) remain genuinely absent and were correctly not attempted — both are L-sized
new-entity builds with their own schema, not something this kind of PR should absorb. Naming them
precisely, per capability, is the deliverable here — the prior "nothing shipped" verdict was true
but too coarse to act on.**

---

## 4. PO-5 — what should populate `host_charge_rates`

**Ledger verdict at measurement:** OPEN — gated on M-3/M-4/M-7, view not started. crm7#1791 already
fixes the specific defect the register filed (the WS-5 regulator report reading `COALESCE(hcr.wc_rate,
0)` off a zero-row table and rendering a confident **$0.00** workers'-comp on-cost on a compliance
artefact). That fix is correct and out of scope for this document — see the review comment left on
crm7#1791.

**The question this document answers, which neither PR does:** `host_charge_rates` has zero write
paths anywhere in the six-submodule estate. What should populate it — and is a customer-facing host
rate view possible before that's resolved?

### 4.1 The table has a designed writer that was never built

`docs/adr/20260423-calc-engine-single-source.md` names the intended data flow explicitly:

> Host charge rates | Written by R80.3 `crm7SyncService.ts` → `host_charge_rates` | CRM7 reads for
> invoicing

Checked: `crm7SyncService.ts` does not exist in crm7, does not exist in the R80.4 submodule
(`grep -rln crm7SyncService` across both trees returns only the ADR's own sentence and one dangling
reference to the same name in crm7's `operationalAnalyticsService.ts`), and nothing on either
roadmap proposes building it now. This is not a partially-built feature — it is a five-month-old
architecture decision that was written down and never implemented, and nothing currently plans to.

### 4.2 A working equivalent already exists, using the correct engine

Crm7 already calls `@bsuite/charge-calc` — the canonical R80.4 rate engine, per the standing "R80.4
owns all rate calculation" rule — directly in-process. `chargeRateSnapshotService.ts` does this
today and writes `charge_rate_snapshots` (confirmed ~19 files read or write its columns across
crm7). crm7#1791 just proved this is the live, correct read source: it repoints the WS-5 report at
`charge_rate_snapshots` + `boot_assessments` instead of the dead table, and mutation-tested the
fix (reintroducing the `COALESCE(...,0)` flips a resolved on-cost from a correct `NULL` back to a
plausible wrong dollar figure — confirmed red, confirmed green).

`charge_rate_snapshots` is also the *shape* D-94 (the host-money-view ruling) actually asks for:
"the portal displays the build-up R8 produced... does not recompute it" and "point-in-time... a
record, not a live recalculation." That is a description of a snapshot table with an
`effective_from`/`effective_to` grain — which is what `charge_rate_snapshots` already is, and what
`host_charge_rates`'s own column set (`effective_from`, `effective_to`, `resolved_rate_package`,
`applied_rules`, `total_annual_cost`...) shows it was *also* designed to be. The two tables are, in
effect, two implementations of the same idea — one built and written to, one designed and never
connected.

### 4.3 The operator decision this document surfaces (not decided here)

Two live options, evidenced above, genuinely different in consequence:

- **(a) Retire `host_charge_rates`.** It duplicates `charge_rate_snapshots`/`boot_assessments`,
  which are live, R80.4-sourced, and already proven as the correct read path by crm7#1791. Drop or
  formally deprecate the table; correct the ADR's authority row to name the real writer.
- **(b) Keep `host_charge_rates` as a distinct host-billing-shaped table** (its columns —
  `quoted_charge_rate`, `funded_charge_rate`, `wic_code` — are host-invoice-specific in a way
  `charge_rate_snapshots` isn't) **and reassign its writer role** from the never-built
  `crm7SyncService.ts` to the already-existing `chargeRateSnapshotService.ts`, extending it to
  write both tables at the same snapshot point. This keeps a single R80.4-derived compute with two
  materialised shapes, rather than reviving a five-month-dead cross-repo sync design.

This document does not choose between them — it is an architecture/product call, not an
engineering one, and the standing rule is that the user determines this kind of fork, not an agent.
**Recorded as an open operator decision, not a deferral: both options are fully scoped above, cost
is small either way (a migration, either a `DROP`/deprecation comment or an extension to one
existing service), and nothing else in the estate is blocked on it being decided this week.**

### 4.4 Is a customer-facing host rate view possible before this is resolved? No — and not only because of this table

Even choosing option (b) today would not unblock a host-facing view, because D-94 gates the view on
three things independent of which table backs it:

1. **Award coverage**, restated at 2026-08-17 measurement: the allowance catalogue covers 8 of 21
   awards (M-3); clause-read allowance scales cover 1 of 19 ladders, not the register's 2 of 21
   (M-4) — the other 18 render a shipped "⚠ unverified default" label, which D-94 explicitly says
   is acceptable for an internal tool and **not acceptable to show a host inside a number they are
   billed on**. Must close for any award a host is actually charged under before the view ships.
2. **R80.4#13 ("the paste box has to go"), open.** R8→crm7 rate transport today is a manual
   copy-paste of JSON into a textarea, not an automated write. D-94 names this explicitly as "now
   on the critical path" for the host view, independent of the operator's document — it is the
   same category of gap as §4.1's missing writer, on the *inbound* side.
3. **M-7** (seed classifications, then rates) is the chain's parent-key gate per the ledger; nothing
   downstream moves until it lands.

None of these three are specific to `host_charge_rates` — they gate a host money view under either
option in §4.3. **The one new thing this document adds to the money chain is the operator decision
in §4.3; the sequencing already in the ledger (M-7 → M-3/M-4 → M-5 → PO-5) stands unchanged and is
not this document's to re-decide.**

---

## 5. Summary

| Item | Status | What's left |
|---|---|---|
| PO-1 | Fix verified correct (source + served bundle), unmerged | Merge crm7#1804 + conduit#485; apply the authored caseload RLS migration |
| PO-4 — payslip viewer | Verified correct, honestly downgraded to absent, unmerged | Same merge |
| PO-4 — chasing (detection half) | Verified correct, made reachable, unmerged | Same merge |
| PO-4 — staffing orders | Confirmed absent | New-entity build, D-95 shape, not started |
| PO-4 — safety questions | Confirmed absent | New-entity build, D-97 shape, not started |
| PO-5 (WS-5 report defect) | Fix verified correct (crm7#1791), unmerged | Same merge |
| PO-5 (`host_charge_rates` population) | Analysed, not decided | **Operator decision, §4.3** — retire vs. reassign writer |
| PO-5 (host money view) | Not started | Gated on M-3, M-4, M-7, and R80.4#13 — unchanged from the ledger, independent of the table decision |
