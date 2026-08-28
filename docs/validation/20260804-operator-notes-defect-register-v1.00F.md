# Operator notes defect register — `bsuite notes.docx`, 2026-08-04

> ## ⚠ SUPERSEDED — 2026-08-05
>
> **Status: Superseded.** `docs/validation/20260805-operator-notes-defect-register-v1.00W.md`
> names this file *"Previous register"* in its own header. That is a DECLARED supersession
> from the successor, not an inference from the filename slug or the date — the distinction
> matters, because this estate has twice acted on a same-slug date inference that pointed the
> wrong way.
>
> The two registers read DIFFERENT sources: this one is `bsuite notes.docx` (20.4 MB, 270
> paragraphs, 38 embedded screenshots); the 08-05 register is `bsuite notes (2).docx` (312
> lines, 49 screenshots). So the successor is not a rewrite of this file — it is the next
> operator dump, and it claims this one's ground.
>
> **Frozen, not archived, and not deleted.** `F` states this document's MUTABILITY, not that
> the work it describes is current truth (operator ruling 2026-08-26). The origin-URL table
> below — which decides whether a screenshot shows a real defect or a production lag — is
> still the clearest statement of that rule in the estate, and the defect history is what
> stops the same ground being re-litigated.


**Source:** `~/Downloads/bsuite notes.docx` (20.4 MB, modified 2026-08-04 11:18) — 270 text
paragraphs + **38 embedded screenshots**, all read. `image2.png` (70 B) is a layout spacer and
`image30.jpg` is a stock photo; the other 36 are app screenshots.

**Read this first — the origin URL decides whether a defect is real:**

| Origin in the screenshot | Means |
|---|---|
| `crm.crm7.app` / `suite.crm7.app` / `r8.crm7.app` / `conduit.crm7.app` | **production** — lags `development`; a defect here may already be fixed and unpromoted |
| `d.crm.crm7.app` | **dev** — current `development` build; a defect here is live in the branch |

A "fixed" claim against a production screenshot **must** name the commit and state whether it has
been promoted. `merged ≠ shipped` — see `feedback_verify_delivery_surfaces_not_just_merge`.

---

---

## ⚠️ READ THIS BEFORE TRIAGING ANYTHING BELOW

**`main` is 52 commits behind `development`, and production pins `@bsuite/theme ^0.6.0` while
development pins `^0.10.3`.** Measured 2026-08-04 from `git show origin/main:package.json` vs
`origin/development:package.json`.

On a `0.x` version **a caret pins the MINOR** — so `^0.6.0` can never resolve 0.7.0 or later, no
matter what is published. Production is running theme **0.6.0**.

Everything landed on development between 0.7.0 and 0.10.3 is therefore **absent from
production**: the heading ramp being applied at all, the Geist font binding, the removal of
91 app-redeclared tokens, `[data-app]` accents, `--role-info-text`, the root-element colour fix
(html computed to pure black in both modes), and the pure-white/black endpoint sweep.

**Most of the screenshots in this register are `crm.crm7.app` — production.** So a substantial
share of the theme and layout complaints in section D, and the docx's "pure white text on dark
doesn't match D2C / header gradient / glow / nav underline / no pure-white light cards" items,
are very likely **already fixed on `development` and simply not shipped**.

That does not make them false reports. It makes them a **promotion** problem rather than a code
problem — and promotion is the operator's call. Until `development` → `main` lands, re-testing
these on production measures the old build.

**Corollary for this register:** do not open new work on any production-origin theme/layout item
until it has been re-checked on `d.crm.crm7.app`. `merged ≠ shipped`, and here the gap is 52
commits wide.

*(A subagent reported this divergence as `@bsuite/page-builder ^0.5.2` vs `^0.6.3`. Checked
directly: it is `^0.6.2` vs `^0.6.3` — a patch, not the issue. The theme pin is the real gap.)*

---

## Verification status — 2026-08-04

Only items I verified against the live catalog or the code are listed. Everything else in the
tables below is **unverified** and must not be reported as fixed.

| # | Verdict | Evidence |
|---|---|---|
| **B1** | **FIXED** — code + test | `0.0485 * 100` is `4.8500000000000005`; measured, and it is the two payroll-tax rates (0.0485, 0.0685) that carry the artefact while 0.115/0.12/0.055 are clean. Added `fractionToPercent()` to `crm7/src/lib/formatters.ts` and applied it at **five** sites, not one — `AdvancedConfigSection.tsx:97` (all percent fields) and `:300` (payroll tax), `RateInfoTab.tsx:226`, `ReviewTab.tsx:322`, `RateScheduleSidebar.tsx:73`. Also fixed the `stored === defaultVal` float-equality test that pins a spurious override one ulp off the statutory default. 35 tests pass. |
| **C1** | **ROOT CAUSE FOUND + FIXED** — not the defect it looked like | The seed host belongs to **`bsuite Platform`**, not FutureBuild (live catalog). Re-reading the screenshot myself: the switcher and sidebar read "FutureBuild Academy" while the body reads **"You're with bsuite Platform"**. `usePortalContext` ran its own `.eq('user_id').eq('status','active').limit(1).maybeSingle()` — **no tenant filter, no ORDER BY** — so it returned an arbitrary membership. It bypassed `useTenantId()`, the canonical resolver that honours the switcher and gates localStorage against real memberships. **12 call sites** read this hook including `usePermissions`. Rewired; regression test **proven to fail** against the old shape. |
| **A3** | **RESOLVED IN THE DB; UI needs a live re-check** | `public.enterprise_licence_events` **exists**, RLS enabled, **3 policies**, full grants to `anon`/`authenticated`, 0 rows. Created by `20260728120000_enterprise_licence_events.sql`, which exists in three submodules **byte-identical** (same md5) so the timestamp collision is benign here. The screenshot's PGRST205 was a stale PostgREST schema cache or predates the migration reaching prod. |
| **A1** | **ALREADY FIXED IN CODE; production serving state UNCONFIRMED** | React #185 on `/communications/compose` is "maximum update depth exceeded". The cause was `useEmailStore(selectActiveIntegrations)` — `selectActiveIntegrations` is `state.integrations.filter(…)`, a fresh array every call, which is the classic Zustand trigger under React 19's `useSyncExternalStore`. Fixed by `cfa85c88` (2026-07-27) with `useShallow`, and guarded by `src/__tests__/react-185-selector-shallow.test.ts`, which asserts no raw `useEmailStore(select…)` exists anywhere in `src/`. `cfa85c88` **is** an ancestor of `origin/main`. **But** the 20 most recent Vercel deployments all have `target: null` — none is a production deploy — so I could not confirm which build `crm.crm7.app` serves. Needs a live check against the served commit before closing. |
| **A5** | **CONFIRMED LIVE, not yet fixed** | "No classifications found for this award" on MA000020 is the `award_classifications` = 0 rows hole documented since 2026-04-22. Fix is Amendment A.1 in `~/.claude/plans/lazy-hopping-nest.md` — repoint `fromFairWork()` at `fairwork-enhanced`. |
| **C2** | **NOT A CONTAMINATION DEFECT — reclassified** | Measured grouped by tenant, which is the only way this question can be answered honestly: synthetic/seed placements are **Braden Group 8, bsuite Platform 1, FutureBuild Academy 0**. Both carriers are operator-owned dev tenants; the real client has none. So this is dev data in dev tenants, behaving correctly. **The reason it looked like contamination is C1** — the portal was rendering bsuite Platform's records while the chrome said FutureBuild Academy. Fixing C1 removes the symptom. No cleanup migration is warranted, and the seed rows stay: `20260704170000_gto_e2e_w6_portal_test_seed.sql` is load-bearing for the portal e2e path. |

---

## A. Hard failures (error text captured verbatim)

| # | Route | Origin | Evidence | Verbatim error |
|---|---|---|---|---|
| A1 | `/communications/compose` | prod | image7 | `Minified React error #185` — full Application Error card. Error ID `error_1785123750080_67dtpa1xm`. #185 = *maximum update depth exceeded* (setState loop). |
| A2 | `/training/plans/{id}/edit` | prod | image33 | "Unable to load training plan / Something went wrong while loading this record." (tenant: FutureBuild Academy) |
| A3 | `/developer/licences` | prod (suite) | image4 | "Failed to load events: Could not find the table `'public.enterprise_licence_events'` in the schema cache" |
| A4 | `/developer/licences?edit=1` | prod (suite) | image20 | "No subscription found for tenant" — seat-count save fails for FutureBuild Academy |
| A5 | `/charge-rates/{id}/edit` → award modal | prod | image18 | "No classifications found for this award. The FWC data may still be syncing — try again shortly." on **MA000020**. This is `award_classifications` = 0 rows, confirmed in the UI. |

## B. Wrong or untrustworthy numbers

| # | Route | Origin | Evidence | Defect |
|---|---|---|---|---|
| B1 | `/charge-rates/{id}/edit` Advanced Config | prod | image29 | Payroll Tax Rate renders **`4.8500000000000005%`** — raw float, no rounding |
| B2 | `/communications` | prod | image23 | Total 5 / Sent 1 / **Delivered 0 / Failed 4**. The failed row is "Charge rate quote ready for your signature — Braden Group" — the quote e-sign delivery path |
| B3 | r8 Training Hours | prod | image17 | "Last synced: **Never**"; total training hours 0, avg 0, training % 0 — against **114 worked hours / 2 apprentices with timesheets** |
| B4 | `/financial` | dev | image28 | Invoice Value $2,395 and Outstanding $2,395, but Total Expenses $0, Cash Position $0, Margin 0% |
| B5 | `/financial/reports/new` | dev | image22 | Revenue ($) blank with no placeholder while title/period are pre-filled |

## C. Test / seed data reaching real tenants — **highest severity, client-facing**

| # | Route | Origin | Evidence | Defect |
|---|---|---|---|---|
| C1 | `/portal/worker` | prod | image35 | Current Placement literally reads **"GTO E2E W6 Test Host (seed — do not use for real bookings)"** — under tenant **FutureBuild Academy**, the real paying client. Seeded by `crm7/supabase/migrations/20260704170000_gto_e2e_w6_portal_test_seed.sql` |
| C2 | `/placements/{id}/edit` | prod | image10 | Notes read "PILOT synthetic placement created for onboarding-360 Phase 1 validation (2026-07-15). **Not a real placement.**" — and the Hourly rate field is blank |

## D. Layout / theme

| # | Route | Origin | Evidence | Defect |
|---|---|---|---|---|
| D1 | r8 Apprentice Rates modal | prod | image9 | **Solid pure-black bands** either side of the dialog — backdrop opaque instead of a translucent scrim. Matches the known `bg-black/N` missing-token family |
| D2 | conduit `/jobs/{id}/distribute` | prod | image26 | Content behind the "Add Distribution Channel" modal renders as large unstyled grey blocks |
| D3 | `suite/docs/enterprise-admin` | prod | image25 | **No header, no nav, no logo** — content starts at the breadcrumb on blank white |
| D4 | `/reports/custom/create` | prod | image11 | Tenant name truncated to "FutureBuild A…" in the top nav |
| D5 | `/dashboard`, `/funding-sources/new` | both | image3, 16, 6 | **Canvas Editor Active** persists — on the dashboard it replaces the widgets with a raw LAYERS list; on a plain data-entry form it shows Save & Exit / Expand controls that do not belong there |
| D6 | `/dashboard` Page Tools | prod | image38 | Modal exposes Schema Builder / Custom Fields / Form Layouts / Custom Pages directly to an end-user dashboard |

## E. Empty, inert, or no-op surfaces

| # | Route | Origin | Evidence | Defect |
|---|---|---|---|---|
| E1 | `/settings/schema-builder` | prod | image15, image36 | 44 entities, **zero relationship lines drawn**; every card reads "No custom fields yet" |
| E2 | `/settings/module-visibility` | prod | image8 | "Hidden Modules 2" but none listed; **Save Changes disabled** with no reason given |
| E3 | `/training-providers/{id}` | prod | image12 | ABN, Registration expires, Operates in, Contact, Email, Phone, Website, Address all "—". Only Legal name + status populated |
| E4 | r8 Funding Offsets | prod | image13 | Placement dropdown has no options; charge rate + subsidy blank; **Apply button disabled** |
| E5 | `/vet/qualifications/{id}/edit` | prod | image19 | Status shows the "Select status" placeholder on an **existing** record — value not loaded |
| E6 | `/funding-sources/list` | dev | image31 | "0 sources total" behind the AU funding-template modal |
| E7 | `/placements/{id}?tab=documents` | prod | image39 | "Linked placement documents will appear here." — **no upload control at all** |
| E8 | `/dashboard` Communication Center | prod | image21 | "No communications scheduled today" |
| E9 | `suite/branding` | prod | image5 | Company Name empty; both light and dark logo slots show the fallback mark |

## F. Screens that rendered clean

`image14` `/leads/create` (but see the text note: **cannot create a new company from here**, only
select an existing one), `image24` `/payroll/award-rates` allowances, `image27` `/analytics`.

---

## Cross-reference: text-only items with no screenshot

These come from the docx prose and carry no image, so they are asserted by the operator rather than
evidenced here — verify each directly:

- **No way to connect SMTP / Google / Azure email** — operator notes this has been raised "in excess
  of 20 times". Pairs with B2 (4 of 5 messages failed).
- `/portal` redirects to `/dashboard`; no way to send clients / host employers / workers their portal
- `/leads/create` cannot create a new company
- `/dashboard` edit should add widgets **on the live page**, not route to the page builder
- `/pipeline/kanban` should be **pulled from conduit**
- `/training/plans/create` Progress should be **computed** from units completed vs remaining
- `/vet/qualifications/{id}/edit` should **import units from the TGA API**
- `/placements/{id}/edit` hourly rate is ambiguous (pay vs charge) and should pull from R8
- Licence grace seats need email + in-app notice, a grace end date, an auto Xero invoice, and
  per-subscription price nomination
- Training providers: **Qualification Scope missing**; all TGA orgs importable on user action;
  imported providers should also become Organisations; track training/resource/equipment costs
- `/financial` statcards use `lab(100 0 0 / 0.96)` — renders pure white; border is a box-shadow ring
- Reporting is **not the Airtable-style builder** mapped out repeatedly; FutureBuild can see
  platform-wide reporting that should be developer-gated
- Micro-frontend question: Vite Module Federation vs Multi-Zone for CRM + reports as separate repos
- Switching apps from inside BSuite **loses the session**
- Jodie AI logo missing on suite.crm7.app
- Theme: pure-white text on dark does not match D2C; header text should use the gradient; glow should
  be the accent colour; nav should match the tenant-switcher underline gradient; no pure-white cards
  in light theme
- **R8 has no option for workers who are not apprentices/trainees** — casual, ABN, full/part-time
  skilled labour hire
- R8 UI packs too much into a small card; hierarchy should be Adult / Junior / School-Based ×
  completed-year-12; Funding Offsets and Training Hours belong **inside** the calculation screen.
  `~/Downloads/charge-calculator-mapd.jsx` is the better arrangement.
