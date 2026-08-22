# Portals & Surface-Class Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: use `plan-executing` to implement this plan task-by-task.
> REQUIRED DOCTRINE SKILLS, load before Phase 0: `bsuite-fix-the-class-not-the-page`,
> `bsuite-gto-portals`, `bsuite-rls-authz-red-team`, `bsuite-page-grid-layout`, `agent-mem-comms`.

**Document:** `docs/plans/20260814-portals-and-surface-class-remediation-v1.00D.md`
**Date:** 2026-08-14 · **Status:** D — Draft, ready to execute
**Lane handle:** `claude-code-bsuite-portals` (register presence before Phase 0)

**Goal:** close the two defect classes the operator has raised most often and never seen fixed
as classes — **scope enforced in the UI instead of the database**, and **cards/theme fixed one
page at a time** — then build the portals to the rulings, matching Code House AnyTime where the
operator has said to match it.

**Architecture:** 7 phases. Phase 0 closes two live cross-tenant reads and designs row-scoping
once for four call sites that are the same defect. Phase 1 retires the card class in the shared
package rather than per page. Phase 2 retires the theme class the same way, including the audit
rule that currently cannot see the violations. Phase 3 does the cheap portal work that is correct
regardless of anything unruled, and builds the supervisor concept that D-94 and D-95 both depend
on. Phase 4 builds AnyTime parity — WHS questions, chasing, approval audit, payslip viewer.
Phase 5 is gated: the host money view cannot ship before R8 award coverage closes, and staffing
orders cannot ship before the supervisor concept exists. Phase 6 corrects three documents that
actively mislead agents, and adds the CI that stops all of it recurring.

**Tech Stack:** React 19 (Vite) · Next.js 16 App Router (conduit) · Supabase (RLS, PostgREST,
migrations) · `@bsuite/page-builder` (react-grid-layout v2) · `@bsuite/theme` · `@bsuite/auth` ·
shadcn/ui · Playwright · pnpm 10.30.3 / Node 24

**Source:** `docs/20260814-notes-backlog-verification-register-v1.00D.md` (the measured state),
`docs/20260814-portals-operator-rulings-v1.00A.md` (D-93–D-98),
`docs/20260813-operator-directive-notes-backlog-remediation-v1.00D.md` (D-59–D-92),
`docs/20260813-portals-redesign-brainstorm-v1.00D.md`,
`docs/20260723-anytime-workforceone-admin-guide-v1.00W.md`.

---

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: both. §9.1 output-equivalence for every RLS and package change (baseline
  the PostgREST response / the resolved package version, diff after); §9.2 visual-equivalence for
  every card, theme and portal change (screenshot at 375 / 768 / 1440, light and dark).
- **Equivalence target**: for Phase 0, a low-privilege PostgREST call returning 0 rows where it
  previously returned N. For Phases 1–2, a before/after screenshot pair plus the surface count.
  For Phases 3–5, the live preview deploy.
- **Cross red-team**: `agent-red-implement` verifies evidence rows before flip-to-done at every
  gate. Phase 0 additionally requires `bsuite-rls-authz-red-team` RC5–RC7.
- **Skills to load**: see §Skills matrix.
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps).

**Every PR in this plan additionally carries the class-sweep block** from
`bsuite-fix-the-class-not-the-page`:

```markdown
## Class sweep
- **Class:** <one sentence>
- **Reference implementation:** <files>
- **Surfaces enumerated:** <N> total — <A> correct, <B> fixed here, <C> ledgered with reason
- **Unaudited:** <D>, because <search limitation> — tracked as <issue>
- **What stops recurrence:** <lint rule / contract test / shared component / DB policy>
```

A PR without a stated surface count is not reviewable. D-62.

---

## Coordination — read before touching anything

**A second lane is live in this estate right now**, executing
`docs/plans/20260814-nav-route-remediation-v1.00D.md` (routes, nav surfaces, nav shell parity,
public-route security, the Developer Portal Route Inspector). Four boundaries, three of which are
real collisions:

| Boundary | Nav lane owns | This lane owns | Rule |
|---|---|---|---|
| **`/portal/field-officer`** ⚠️ | Nav Task 1.2 "resolve `/portal/field-officer` duplication (conduit + crm7)" | **D-93: the field officer is staff; the walled portal is retired, not de-duplicated** | **Do not let Task 1.2 pick a winner between two portals.** Both go. The page becomes a staff landing dashboard inside the main app and the caseload becomes an RLS rule. Message the nav lane before it starts that task. |
| **Theme tokens** | Nav Task 4.5 — theme-token compliance *inside nav shell components* | Phase 2 — the five app-local `oklch(0.994)` surface tokens, `--border-shell`, `--shadow-shell`, the audit rule, the baseline | Nav lane must not re-declare a surface token locally to fix a nav component. Raise it here instead. |
| **Public-route security** | Nav Phase 2 — 55 public *routes*: guards, token validation, rate limiting | Phase 0 — RLS *policies* on tables | Routes vs policies. If the nav lane finds a policy defect, hand it here; if this lane finds a route guard defect, hand it there. |
| **Developer Portal** | Nav Phase 6 — the Route & Nav Inspector | Phase 2 — the raw-`<button>` codemod and the `no-raw-button` lint rule | The Inspector must be written with shadcn `Button` from the first commit, or it lands after the codemod and immediately violates the new rule. |

Register presence and send the boundary message **before Phase 0**, per `agent-mem-comms`:
`memory_put qig_presence_claude-code-bsuite-portals`, then `inbox_send` namespace `bsuite`.

---

## Phase 0 — Scope is a database rule (P0, blocks everything)

**Why first:** two of these are live cross-tenant reads on real data, and all four are the same
defect. Designing them once is the whole point.

**Gate skills:** `bsuite-rls-authz-red-team`, `db-supabase-migration`, `agent-red-implement`
**MCPs:** `Supabase` (read + `apply_migration`), `github`

### Task 0.1 — `report_templates_select` has no developer predicate (crm7#1728)

Live policy is `USING (scope = 'platform')` with no role predicate; `select scope, count(*) from
report_templates` returns **23 platform-scope rows readable by every authenticated user in every
tenant**. The write policies were correctly hardened to `scope='platform' AND
is_platform_developer()`; the read path was left behind (RC6).

1. Baseline: as a FutureBuild-tenant user, `GET /rest/v1/report_templates?scope=eq.platform` —
   record the row count.
2. Migration adds the developer predicate to the SELECT policy. Enumerate **all four commands**
   and state the verdict for each in the PR.
3. Re-run the baseline: 0 rows as a tenant user, 23 as a developer.
4. Commit: `fix(crm7): scope platform report templates to developers in RLS`

### Task 0.2 — `contacts` has no host-employer limb (crm7#1729, D-65)

crm7#1675 was fixed at query scope only — `hostContacts.ts` says so itself. `contacts_select` is
`tenant_id IN (auth_tenant_id()) OR has_parent_admin_access(...) OR is_platform_developer()`, so
`GET /rest/v1/contacts?select=*` still enumerates every host's staff (RC5). Note
`data_grant_table_row_permit(...)` is a **no-op** — `data_is_grant_restricted()` is `false` for
all 7 tenants.

1. Baseline the raw PostgREST read as a tenant user.
2. Add the host-employer limb to the policy. **Keep** the client narrowing — it is an
   optimisation, never the control.
3. **Sibling sweep, mandatory:** `HostSiteSelector.tsx` takes `employerId` as an *optional* prop
   (omit it and every site in the tenant lists); `HostAgreementSelector.tsx` has no scoping prop
   at all and embeds `host_employer.business_name`. Fix both; state the selector count.
4. Close crm7#1675 as superseded.
5. Commit: `fix(crm7): scope contacts to host employer in RLS, not only in the query`

### Task 0.3 — Two latent tables with no tenant predicate

`apprentice_handoff_tokens` is `USING (expires_at > now() AND redeemed_at IS NULL)` on a table
holding `candidate_snapshot`, `conduit_tenant_id`, `host_tenant_id`. `apprentice_profiles` is
`USING (auth.uid() IS NOT NULL)` on a table holding `base_pay_rate` and `cost_config`. Both are
0-row today — which is exactly when they are cheapest to fix. The handoff table becomes a
token-redemption path the moment the conduit→crm7 handoff ships.

### Task 0.4 — `canUsePlatformKit()` admits `is_super_admin` (BSU#723)

`platform_role ∈ {platform_admin, developer} OR is_super_admin === true` gates 22 Developer
Portal surfaces. In this estate's own vocabulary — recorded in crm7's `reportScopeAccess.ts` — a
super admin is *an enterprise tenant admin with sub-organisations, not a platform account* (RC7).
Blast radius today is nil; it is one profile row from live.

1. Narrow the predicate to the DB definition: `is_platform_developer()` = `platform_role =
   'developer'`. Every client gate must be provably narrower than or equal to it.
2. Audit `isPrivileged = isDeveloper || isTester || isPlatformAdmin` for the same widening.
3. Raise with the operator (do not change unilaterally): a user whose home tenant is FutureBuild
   Academy holds `platform_role = 'tester'`. No DB authority, but contrary to D-66's letter.
4. Relocate `/admin/branding` to `/developer/branding` — the `<h1>` still reads "Platform
   Branding" and `/admin/index.tsx` links it for every `isAdmin`. `/admin/platform-kit` is already
   correctly `<Navigate>`d; copy that pattern.

### Task 0.5 — Design the field-officer caseload rule (D-93)

The fourth instance of the same class. A field officer reads case notes, incidents and LLN
assessments about named people. **Design it now, alongside 0.1–0.4, even though the portal merge
lands in Phase 3** — that is the entire point of treating these as one class.

### ⛨ Gate 0

- [ ] Four policies changed; for each, all four commands enumerated with a stated verdict
- [ ] Low-privilege PostgREST baseline recorded before and after for 0.1 and 0.2
- [ ] Selector sibling sweep count stated
- [ ] Every PR names its layer — query scope, RLS policy, or client gate — and proves the two it
      did not change are safe
- [ ] `mcp__Supabase__get_advisors` re-run; no new findings
- [ ] `agent-red-implement` + `bsuite-rls-authz-red-team` RC5–RC7 pass
- **Escalation:** any policy change that would widen access → stop, `high` tier, operator ruling

---

## Phase 1 — Retire the card class in the package (bsuite#1995)

**Read `bsuite-page-grid-layout` first.** The grid is `react-grid-layout` v2 wrapped by
`@bsuite/page-builder`. It is **not** `@dnd-kit`. Searching `useSortable`/`SortableContext`/
`DndContext` finds none of these surfaces and is the mechanical reason previous fixes only ever
touched the page named in the ticket.

Measured state: **≈36 confirmed defective surfaces, ≈91+ unaudited.**

### Task 1.1 — conduit `@bsuite/page-builder` `^0.6.3` → `^0.8.0` (conduit#460)

One line, and the highest value-per-edit in the plan. A caret on `0.x` is minor-locked, so conduit
cannot resolve 0.8.0 and still carries all three resize causes, the columns bug, no
`DEFAULT_ITEM_AUTO_HEIGHT`, and no `PACKAGE_LAYOUT_EPOCH = 1000` stored-layout reset. Regenerate
the lockfile **outside the bsuite tree** per the isolated-directory rule. Verify: resize a card,
move the columns slider below a 1200px container, open a long page — on a conduit preview deploy.

### Task 1.2 — throughput peers (throughput#284)

Declare `react-grid-layout` and `react-resizable`; they are non-optional peers imported
transitively today.

### Task 1.3 — Promote `DraggableCardPage` + `CanvasCard` into `@bsuite/page-builder` (crm7#412)

The keystone. They exist in **three copied forms** (crm7, braden, throughput — the latter two
byte-identical) and are **absent from BSU and conduit**, which is why BSU's ledger claims its four
glued widgets need "a dynamic-widget registration mechanism". **That claim is false:**
`crm7/src/pages/settings/module-visibility.tsx` maps a runtime-variable list into individually
draggable cards, because `DraggableCardPage` builds the widgets dict from its children at render
time. Re-verify every "cannot" inherited from a ledger.

### Task 1.4 — Delete `business-suite-unified/src/components/platform/PageGridPage.tsx`

It builds **one grid item for the whole page** (`layouts.lg = [{ i: 'content', … h: 24 }]`) with no
autoHeight. crm7 and braden have both already retired this exact file and guard it with a
regression test. Copy the pattern, including the test.

### Task 1.5 — BSU glued widgets (BSU#720)

`UnifiedDashboard.tsx#servicesPanel` (the operator's named surface — CRM7 Professional, Conduit
ATS), `Billing.tsx#plans`, `Admin/TenantManagement.tsx#main`, `Government.tsx#apis`. All four
dissolve once 1.3 lands.

### Task 1.6 — One scanner, shipped from the package

Four apps hand-rolled their contract test and each dropped something. BSU, conduit, braden and
throughput all lack `findUngriddedMultiCard` — the check crm7's own comment calls *"the actual
root cause of the operator's platform-wide complaint"*. conduit's version documents three card
idioms and detects two, which is how its five known-glued pages pass as an empty ledger. Replace
all four with one parameterised scanner (card idiom per app, shared detection). **This is what
makes "we fixed the page you named" structurally impossible to repeat.**

### Task 1.7 — Edit-in-place on the current page (crm7#1727, D-77)

The dashboard edit action opens the page builder on a new screen and offers only new-page
creation. On-page element addition existed recently and was lost. Prior work: bsuite#545 and
bsuite#1588 (closed), crm7#1281 (open, undo/redo only).

### ⛨ Gate 1

- [ ] Resolved `@bsuite/page-builder` version printed **per consumer** — all six
- [ ] Surface count restated after the sweep: confirmed defective → 0 or ledgered with a reason
- [ ] Unaudited count restated and tracked
- [ ] One scanner in the package; four hand-rolled tests deleted; scanner run on all six apps
- [ ] Screenshot pairs at 375 / 768 / 1440 for the operator's four named surfaces
- **Escalation:** a ledger "cannot" that survives re-verification → `high` tier

---

## Phase 2 — Retire the theme class (bsuite#1996)

**Two doctrine corrections to carry:** `--role-error`/`--role-destructive` is **RED**
`oklch(0.580 0.230 25)`, not purple — contract 0.7.0, 2026-08-02, because purple measured **ΔE
0.006 against primary blue under protanopia**; `theme-conformance.yml` enforces red as a hard zero
(C4). And the shared token layer is already correct — nothing in `packages/theme/src/css/vars.css`
emits pure white or black. **Every surviving violation is an app-local override shadowing a fixed
token.**

### Task 2.1 — Retype the five `0.994` literals

| Repo | File | Token |
|---|---|---|
| crm7 | `src/styles/theme.css` | `--bg-shell-elevated: oklch(0.994 0.002 260 / 0.96)` — **the operator's DevTools `lab(100 0 0 / 0.96)`**, reaching **84 consumer files** |
| crm7 | `src/styles/theme.css` | `--bg-shell-hero: oklch(0.994 0.003 247.9 / 0.9)` |
| crm7 | `src/index.css` | `--color-document-surface: oklch(0.994 0.002 260)` |
| conduit | `src/app/globals.css` | `--bg-shell-hero` |
| throughput | `src/index.css` | `--bg-shell-hero` |

Point them at `var(--role-bg-panel)`. Precedent in the same file: `--bg-panel` was migrated to
`color-mix(in oklch, var(--role-bg-panel) 96%, transparent)`.

### Task 2.2 — Make the audit able to see them, and re-bank in the same PR

`theme-conformance.yml`'s C1 scanner is a string matcher; `oklch(0.994 …)` is not pure white by
string match, so the gate reads **7/7 green while five near-white card surfaces ship**. Add a
lightness threshold on the parsed value for surface tokens. **The gate demands equality, not a
ceiling** — so re-bank the baseline in the same PR or it fails both directions. Note 4 of the
surviving 7 are mask stops inside the source-of-truth HTML documents, where the channel is opacity
rather than paint. Without this task, 2.1 regresses silently — the file's own history says a value
like that will be re-typed.

### Task 2.3 — The blurry border

`StatCard.tsx` sets `borderColor: var(--border-shell)` = `oklch(0.3 0.03 260 / 0.09)` — 9% alpha,
effectively invisible. What reads as the border is the ring inside `--shadow-shell`:
`0 0 0 1px oklch(0.546 0.215 262.9 / 0.05)`, 5% alpha composited under `backdrop-blur-sm`. Raise
`--border-shell` toward the WCAG 1.4.11 3:1 non-text floor and drop the ring out of the shadow.
Two token edits fix it everywhere.

### Task 2.4 — Promote `.bsuite-gradient-underline-span` into `@bsuite/theme`

It exists in exactly 3 files, **all crm7** — `TenantSwitcher.tsx` (the instance the operator
points at), `CRM7Navigation.tsx` (nav already reuses it), `index.css`. Until it is in the package
the operator's nav-gradient request is unimplementable in the other five apps. **Coordinate with
the nav lane — they own nav shell components.**

### Task 2.5 — BSU app-tile gradient (BSU#721)

"CRM7 Professional" / "Conduit ATS" originate as plain data in `src/lib/pricing.ts`,
`src/lib/supabase.ts`, `SubscriptionUpgrade.tsx` and render with no gradient class. BSU has the
machinery (a local `.gradient-text` on 20 page titles plus a contract test) and **zero**
`.text-gradient-accent` call sites. Prefer the shared utility.

### Task 2.6 — Developer Portal buttons (BSU#722)

48 files; 30 import shadcn `Button`; **37 contain raw `<button>`; all 30 that import `Button` also
use raw `<button>`.** 7 are raw-only: `TenantSettings.tsx`, `Logs.tsx`, `Notices.tsx`, `Embed.tsx`,
`Database/index.tsx`, `Database/panels/FunctionsPanel.tsx`, `access-control/Users.tsx`.
**"Unstyled" is not off-palette** — `TenantSettings.tsx` uses correct role tokens. What is missing
is the `Button` contract: focus-visible ring, size scale, variants, consistent radius,
`disabled:opacity-50` hand-rolled per site. Codemod the 7, then add a path-scoped `no-raw-button`
ESLint rule rather than hand-editing the 30 mixed files. **Tell the nav lane before they build the
Route Inspector.**

### ⛨ Gate 2

- [ ] Zero `oklch(0.99x)` surface tokens across all six apps; count stated
- [ ] Audit script catches a deliberately reintroduced `oklch(0.994)`; baseline re-banked
- [ ] Border contrast measured ≥3:1, light and dark
- [ ] Screenshot pairs: statcard before/after, both modes, 375 / 768 / 1440
- [ ] `no-raw-button` rule green on the portal path

---

## Phase 3 — Portal foundations (D-93, and the cheap set)

**Load `bsuite-gto-portals`.** The named failure mode is trimming menus and calling it a redesign.

### Task 3.1 — Retire the walled field-officer portal (D-93)

`/portal/field-officer` becomes a staff landing dashboard inside the main app. Do **not** build
portal-shaped duplicates of case notes, site visits, WHS logging, competency or LLN capture —
`/field-officers/*` are the surfaces. Enforce the caseload with the Phase 0.5 rule. **Do not trim
the staff nav by guessing** — trim it by observing what field officers actually open, or ask two of
them.

### Task 3.2 — The cheap set, correct regardless of anything unruled

- Portal invite from **any** person and host-contact record, not just two workflow pages. The
  mechanism exists — crm7#1680 shipped `SharePortalCard` and `portal/accept-invite/[token].tsx`.
- Re-scope crm7#1680; correct crm7#1681's target from `/portal/worker` to conduit's careers board.
- Rename the misleading menu labels — "My Training Plan" must not point at the staff directory.
- Move `/host/reports` under `/portal`.
- Stop describing "trainee" as a separate portal. **Coordinate route moves with the nav lane.**

### Task 3.3 — The supervisor concept

A host contact scoped to the workers they supervise. **It does not exist in the data.** A database
change before it is a screen, and a hard prerequisite for both D-94 and D-95. Model it on AnyTime:
a Line Manager sees everyone at their company; a Supervisor sees only the employees named against
them in the hiring record. Same screens, different rows.

### Task 3.4 — The portal shell and the "what needs me" strip

Plus the worker's four destinations: submit hours, hours history, leave, my details. And the host
approval queue as a portal page rather than the payroll module.

### ⛨ Gate 3

- [ ] Zero portal destinations pointing into an internal staff page; count stated
- [ ] Supervisor scoping proved by a low-privilege PostgREST call, not a component read
- [ ] Field-officer caseload proved the same way
- [ ] Screenshots of every portal landing at 375 / 768 / 1440

---

## Phase 4 — AnyTime parity (D-96, D-97)

### Task 4.1 — WHS questions (D-97 — match AnyTime)

Configurable question set shown before an employee submits a timesheet and/or before a supervisor
approves one. Settings: Q&A label · `Display WHS Timesheets` master toggle · `Email Consultant` ·
question type Text / Yes-No / Yes-No+Text · `Supervisor Only` per question. Answers route to a
nominated WHS contact. Plus a **History Log** — a full audit of every action affecting submission
and approval, filterable by date range, username and log type.

> **The line that must not be crossed.** The platform asks, routes and records. It **must not**
> block a timesheet, close an incident, or state that an obligation has been met. A screen that
> says "WHS compliant" is a determination and we never draw one.

This is a process change for hosts, not just a feature. Ship it off by default.

### Task 4.2 — Approval as a payment trigger

Attributable to a named person with a timestamp; in an audit log the approver cannot alter;
reversible only with a typed reason and a notification to both sides. And **genuinely hard to do
accidentally** — "approve all" on a phone with no confirmation is a real risk if this screen is
optimised purely for speed.

### Task 4.3 — Chasing

Missing-timesheet list and awaiting-approval-by-supervisor list, each with email and SMS
templates. This is the GTO's actual weekly workload and we have none of it.

### Task 4.4 — Payslip viewer (D-96 — match AnyTime)

AnyTime carries no payslip surface at all; Workforce One owns pay. **The portal displays what
payroll issued and recalculates nothing.** If two numbers can disagree, one is wrong and we own the
difference. **D-98: bank / TFN / superannuation capture is out of scope** — do not build it here.

### ⛨ Gate 4

- [ ] WHS feature ships disabled; enabling it is an explicit tenant action
- [ ] No screen draws a compliance determination — reviewed line by line
- [ ] Approval audit rows immutable to the approver; proved by an UPDATE attempt that fails
- [ ] Payslip surface performs zero arithmetic; grep the component for operators

---

## Phase 5 — Gated: host money (D-94) and staffing orders (D-95)

**Neither starts until its gate opens.**

### Task 5.1 — R8 award coverage (gates 5.2)

The build-up becomes a **customer-facing artefact**. Today the allowance catalogue covers **8 of
21 awards** and allowance percentages are read from the award clause for **2 of 21** — the other 19
render a flat 100% labelled *"⚠ 100% is an UNVERIFIED DEFAULT"*. Right for an internal tool;
**not something to show a host inside a number they are billed on.** Close coverage for every award
a host is actually charged under. Also close R80.4#13 — the paste box is the transport this
depends on. Two known residuals to fix at the same time: MA000017's 26 allowance rows are
unreachable because `allowance-catalogue.ts:96` compares `r.sector === sector` with no alias
resolution; and the add-from-award picker does not resolve `commercial_construction →
general_building`, so a removed cl.22.1(a) industry allowance cannot be re-added.

### Task 5.2 — The host money view (D-94)

Invoice, hours per line, charge rate per hour, wage, on-costs, overhead, margin. **One source,
never recalculated in the interface. Point-in-time per D-68** — a record as at that pay period,
which must not re-derive when Fair Work publishes a new wage. Change-of-year and wage-anniversary
records live in crm7 (crm7#1702).

### Task 5.3 — Staffing orders (D-95)

Entity with a state machine: `submitted → acknowledged → triaged → recommended → accepted |
declined | withdrawn`, every transition attributable and timestamped, carrying trade/occupation,
year or worker type, site, start date, duration, supervisor.

> **A host must NOT see the available worker pool.** No talent-pool browse, no "who's free", no
> candidate list, no cross-worker availability. **This is a negative requirement and negative
> requirements decay.** Make the pool unreadable to the host role in RLS, and write the constraint
> as a test — a future agent will add a "browse available apprentices" tile believing it helps.

A person triages every order. Nothing a host submits becomes a vacancy, pipeline record or
placement without review. Orders land where the pipeline lives — crm7#1687.

### ⛨ Gate 5

- [ ] Every award reachable by a live host has real clause-read allowance percentages; count stated
- [ ] Money surface performs zero arithmetic; every displayed figure traced to a stored value
- [ ] Host-role PostgREST call against the worker pool returns 0 rows, asserted in a test
- [ ] Order state machine: every transition has an actor and a timestamp

---

## Phase 6 — Documentation, CI, close-out

### Task 6.1 — Correct three misleading documents

1. **`AGENTS.md` says `--role-destructive` is purple.** Contract 0.7.0 made it red on 2026-08-02
   and CI enforces red as a hard zero. Any agent following AGENTS.md burns a CI round
   reintroducing a colour that measures ΔE 0.006 from primary under protanopia.
2. **`AGENTS.md` says `@bsuite/page-builder ^0.2.0 (latest 0.2.2)`.** It is **0.8.0** — four minors
   stale, and that table is what an agent consults before a bump.
3. **`docs/OUTSTANDING.md` calls itself "single source of truth"** while its own header repoints
   twice. `docs/20260810-plan-dashboard-retirement-v1.00W.md` retired the last thing claiming that
   title, for exactly this reason. Regenerate or demote it.

### Task 6.2 — Close the inert-`Closes` class

`Closes #N` in a PR merged to `development` is inert; the default branch is `main`. Fourteen issues
were fixed in code and left open by this. Add a CI step or a promotion-time sweep that closes
issues referenced by merged `development` PRs, or change the convention. **This is why "filed" and
"addressed" drifted apart in the first place.**

### Task 6.3 — Sweep every CI gate against D-92

*A gate that cannot distinguish "checked nothing" from "found nothing" is not a gate.* Three
instances live in two files (bsuite#1961, #1963, #1964, #1965, #1966). Report the count of gates
that do not assert their inputs were present.

### Task 6.4 — Record and close out

`memory_put bsuite_session_<date>` + `bsuite_sleep_packet_<date>`; update
`bsuite_session_latest`; `inbox_send` a STATUS to the coordinator lane; close every issue this plan
resolved **by hand, with evidence rows**.

---

## Evidence

Every phase gate produces, and the PR body carries:

- Output-equivalence: the PostgREST baseline/after pair, or the resolved-version table
- Visual-equivalence: screenshot pairs at 375 / 768 / 1440, light and dark
- The class-sweep block with its surface counts
- Commands run and their output — CI is not a substitute for local verification on a visual or
  behavioural change

---

## Skills matrix

| Phase | Skills |
|---|---|
| All | `bsuite-fix-the-class-not-the-page`, `agent-mem-comms`, `agent-definition-of-done`, `agent-red-implement`, `test-verify-before-completion`, `git-github-pr-workflow` |
| 0 | `bsuite-rls-authz-red-team`, `db-supabase`, `db-supabase-migration`, `machine-db-postgres-best-practices`, `check-security` |
| 1 | `bsuite-page-grid-layout`, `bsuite-shared-ui-rollouts`, `bsuite-pnpm-monorepo`, `qig-dependency-management`, `bsuite-react-testing` |
| 2 | `bsuite-brand-system`, `design-token-system`, `machine-web-tailwind-v4`, `web-shadcn`, `bsuite-wordmark-gradient`, `bsuite-branding-inheritance` |
| 3 | `bsuite-gto-portals`, `biz-au-apprenticeship`, `web-ui-ux-patterns`, `general-dry-one-shot-architecture`, `check-dry-one-shot` |
| 4 | `bsuite-gto-portals`, `web-forms-validation`, `test-playwright`, `general-iso27001-docs` |
| 5 | `bsuite-gto-portals`, `biz-au-award-modelling`, `biz-au-award-boot`, `biz-xero-integration` |
| 6 | `check-docs-vs-code`, `qig-documentation-sync`, `git-github-issue-closeout`, `ops-ship-all-apps` |

## MCP matrix

| MCP | Used for |
|---|---|
| `Supabase` | policy reads, `execute_sql` baselines, `apply_migration`, `get_advisors` |
| `github` | issues, PRs, cross-repo file reads |
| `qig-memory` | presence, inbox, precedent, session records |
| `playwright` / `claude-in-chrome` | live visual verification |
| `Context7` | react-grid-layout, Next 16, shadcn API surfaces |
| `Vercel` | preview deploy status, runtime logs |

## Execution model

One branch per phase off `development`; PRs target `development`; never direct-push to `main`;
promotion to `main` only on operator review. Phases 0–2 may run concurrently with the nav lane.
Phase 3 must not start until the nav lane has been told about D-93 and has confirmed it will not
resolve `/portal/field-officer` by picking a winner. Phase 5 is gated on its own Task 5.1 and on
Task 3.3.
