---
kind: record
authority: none
owner: bsuite
---

# Operator notes register — D-1 … D-103

**v1.00W · 2026-08-25 · Source: `~/Downloads/bsuite notes.docx`** (31,893,806 B, mtime 2026-08-24 14:15;
445 paragraphs, 368 non-empty, 66,541 chars of extracted text)

**This register replaces every partial extract of that document.** In particular
`docs/20260824-estate-execution-backlog-v1.00W.md` §4 Lane 3 carried a **20-item subset** as
though it were the whole document. It was not. **The document contains 103 distinct asks.**

## How this was derived

At *one distinct ask = one item* the document yields ~130 asks. It was reduced to 103 by merging
adjacent sentences addressing the same card or feature — those items carry multi-clause quotes.

**Excluded as not his words** (context only, never register items): the 30/06 404 explainer, the
Gemini micro-frontend answer, the Chrome-DevTools statcard analysis, the Supabase OAuth dashboard
text, the `enterprise_licence_events` schema-cache paste, and the 31-Jul `charge_rate` CHECK-constraint
post-mortem (an agent's report in the agent's voice).

**Category values:** `security` · `zero-consumer` · `ux` · `data-reporting` · `compliance-calc` ·
`theme-branding` · `portals` · `integration` · `regression` · `architecture`.

**`REGRESSION`** marks items where he explicitly says it previously worked — *"This WAS working"*,
*"was available"*, *"before beeing R8.4"*, *"now missing again"*. He is unusually emphatic about
these and they must not be lost among the gaps.

---

## Register

| ID | Verbatim (his words) | Asks for | Surface | App | Category |
|---|---|---|---|---|---|
| D-1 | "emails, cant be opened and read." | Messages must open and be readable | /communications | CRM7 | ux |
| D-2 | "Mentioned in excess of 20 times, there is no clear way to connect stmp, or google or azure emails." | Tenants connect + send from own SMTP/Google/Azure | /communications | CRM7 | integration |
| D-3 | "fairwork-enhanced:1 Failed to load resource: … status of 503" | Compose's fairwork-enhanced edge fn is down | /communications/compose | CRM7 | integration |
| D-4 | "Should be individual cards not linked by the same common backing card… i have always said it is a platform wide consideration" | Independently draggable, unclipped cards — everywhere | /communications | CRM7 / all | ux |
| D-5 | "No wages are visible / Period just says 'percent' / No description visible" | Award-rate rows show no data | /payroll/award-rates | CRM7 | data-reporting |
| D-6 | "Schema builder makes no sense. I have no idea how to use it… 'Fit' icon does nothing." | Make schema builder usable | /settings/schema-builder | CRM7 | ux |
| D-7 | "We did recently have the ability to add new elements on page but this is now missing again." | Live in-page add/edit of elements, widgets, entities | /dashboard | CRM7 | **REGRESSION** |
| D-8 | "Just re-directs to dashboard. No way to send clients, host employers or workers…their personal portal." | Issue personal portals to external users | /portal | CRM7 | portals |
| D-9 | "Cant create new company in leads, can only select existing. This wrecks user flow." | Inline company/client creation from lead | /leads/create | CRM7 | ux |
| D-10 | "UI is trying to squeeze too much into a small card when there is plenty of available page space" | Use the page, not a cramped card | r8 root | R8 | ux |
| D-11 | "Update Pay rate 'Standard' option is unclear?" | Explicit Adult/Junior/School-based/Yr12 hierarchy | r8 root | R8 | compliance-calc |
| D-12 | "it should be available from within the calculation itself… Training Hours Again, should be in the calculation screen not a separate page." | Sector, funding offsets, training hours inside the calc | r8 root | R8 | ux |
| D-13 | "Where are the advanced configuration values coming from? Why can't these be edited." | Source from the apprentice's R8 calc; make editable | /charge-rates/{id}/edit | CRM7 | compliance-calc |
| D-14 | "This Progress should be a calculation based of units of competency completed vs those remaining" | Compute plan progress from UoC | /training/plans/create | CRM7 | data-reporting |
| D-15 | "Why can't I import units? Should be pulled from the TGA API like the qualification" | Import units of competency from TGA | /vet/qualifications/{id}/edit | CRM7 | integration |
| D-16 | "so we need cross cuttings and one shot policy applied" | One implementation of unit↔apprentice linkage | /training/plans/{id} | CRM7 | architecture |
| D-17 | "Should include screen shots. Same for all docs." | Screenshots in all documentation | /docs/* | suite | ux |
| D-18 | "Hourly rate is unclear whether its pay rate or charge rate… Requires document upload capability" | Disambiguate rate, allow R8 link, add doc upload | /placements/{id}/edit | CRM7 | compliance-calc |
| D-19 | "Will only save after 'show preview'" | Branding saves without previewing | /branding | suite | theme-branding |
| D-20 | "This should create a link that can be placed in the job add…Or post directly to seek… Client update to host bug." | Application link / Seek posting + import; fix client→host under one-shot | /portal/worker | CRM7 | portals |
| D-21 | "Should be able to be pulled from conduit" | Kanban pipeline sourced from Conduit | /pipeline/kanban | CRM7 | integration |
| D-22 | "Says 2 hidden modules but no modules that show they are not visible" | List and toggle hidden modules | /settings/module-visibility | CRM7 | ux |
| D-23 | "I need to receive an email and in app notice via the notices system to alert me to grace invites." | Grace-invite notification + end-of-grace date | licence/grace | suite | integration |
| D-24 | "New invoice auto generated from my xero. Place to nominate price of additional seets per subscription type." | Auto Xero invoice, per-plan seat pricing, plan choice at signup | licence/grace | suite | integration |
| D-25 | "Suite.crm7.app - jodie AI logo image missing. Should be same as crm7." | Restore Jodie AI logo | suite root | suite | theme-branding |
| D-26 | "I am sent to the landing off that app and am not signed in. i should stay signed in when switching between apps." | Session persists across bsuite apps | /auth-supabase | bsuite | security |
| D-27 | "Card resize regressions. Cant resize individual cards anymore." | Restore per-card resize | /dashboard | CRM7 | **REGRESSION** |
| D-28 | "Columns to move cards into do not respect the columns slider." | Drop targets honour column slider | /dashboard | CRM7 | ux |
| D-29 | "all empty cells in the image is available on TGA but not populated. Qualification Scope is missing." | Populate RTO detail + scope; providers become Organisations | /training-providers | CRM7 | data-reporting |
| D-30 | "All TGA training companies should be available via TGA api and imported on user action" | On-demand provider import, not bulk preload | /training-providers | CRM7 | integration |
| D-31 | "TGA should also track training costs… Last entry per qualification type most authoritative" | Provider cost history feeding R8 host rate calc | /training-providers → R8 | CRM7/R8 | compliance-calc |
| D-32 | "Advice from chrome browser debug agent. Doesnt have bsuite color and brand packaging context so consider that too." | Fix statcard pure-white bg / blurry ring, in brand terms | /financial | CRM7 | theme-branding |
| D-33 | "We have rams set up for use with ADMS - how to client organisations use our connection to then claim for their apprentices?" | ADMS claim path for client orgs | /funding-sources/list | CRM7 | integration |
| D-34 | "the existing templates cant be selected/applied… How is this funding continuously validated?" | Working templates + ongoing funding validity | /funding-sources/list | CRM7 | compliance-calc |
| D-35 | "Dnd kit issue, all top level cards attached to the same backing card" | Independent cards as on dashboard | /funding-sources/new | CRM7 | ux |
| D-36 | "Financial reports and Analytics and Reports do not present as the required airtable style reporting - mapped out, planned, and directed to fix many times" | Ship the specced airtable-style builder | /reports/custom/create | CRM7 | data-reporting |
| D-37 | "Noone but a developer account should have platform level reporting." | Gate platform-wide reporting; scoped sub-org reporting | /reports/custom/create | CRM7 | security |
| D-38 | "How to have several repos that present as a single app" | Subscription-gated shell over separate repos | estate | bsuite | architecture |
| D-39 | "does your advice conform to supabase' oauth server 2.1 since that is what i am setup with." | Any such architecture conforms to Supabase OAuth 2.1 | auth | bsuite | security |
| D-40 | "Pure white text on dark screen not matching the styling per d2c theme… Navigation should match the gradient" | Dark-theme text, header gradient, accent glow, nav gradient | all apps | bsuite | theme-branding |
| D-41 | "Card and page headers should be styled per the d2c theme, not pure white or black. No light theme cards to be pure white." | Ban pure white/black surfaces | all apps | bsuite | theme-branding |
| D-42 | "No option in the UI for workers that are not apprentices or trainee… Applicable for labour hire workers." | Quote casual/ABN/full/part-time qualified workers | R8 | R8 | compliance-calc |
| D-43 | "Navigation f-cking sucks, UX sucks, the portals basically suck. Take on the persona of each external user" | Persona-driven redesign of every portal | /portal/* | conduit/CRM7 | portals |
| D-44 | "Why are supervisors from other hosts available to select?" | Scope supervisor picker to the host | /placements/{id}/edit | CRM7 | security |
| D-45 | "Why is pay rate there by itself? No charge no nothing? No allowances no, charge rates, no linked quote" | Full rate picture on the placement | /placements/{id}/edit | CRM7 | compliance-calc |
| D-46 | "Borders on people card are still all messed up… Training plans card has /u visible and clicking doesnt take me to training plans." | Borders, independent cards, fix dead link | /people/{id} | CRM7 | ux |
| D-47 | "Avetmiss funding makes no sense. GTO needs to be able to record funding available to employers not for training." | Employer-side funding model | /engagements/create | CRM7 | compliance-calc |
| D-48 | "How does the system 'create a claim' when the claim is on CTF's portal?… How do you put in the funding amount, the payment timeframes and dates. And how it should be applied?" | Claim workflow + amount/schedule/application method | /funding-sources/{id} | CRM7 | compliance-calc |
| D-49 | "Generally, I'm having to go in an out of pages and re-orient myself. The whole ux is terrible." | Consolidate flows; follow Codehouse workforce-one layout | CRM7 / R8 | CRM7 | ux |
| D-50 | "Cards still messed up. AND this look nothing like the repeatedly directed to fix airtable style reports" | Financial reports still not airtable-style | /financial/reports | CRM7 | data-reporting |
| D-51 | "Default permissions should show the marked check box. Permissions should not show platform admin." | Pre-checked defaults; hide platform-admin from tenants | /admin/permissions | suite | security |
| D-52 | "Platform branding should not be visible to anyone but developers… Worth a sweep of this throughout all features everywhere." | Developer-only platform surfaces, swept estate-wide | /admin/branding, /admin/platform-kit | suite | security |
| D-53 | "Users shouldnt have to know coding even markdown is too much… How can I upload an existing word or similar document and edit it and insert a merge field" | Word upload, WYSIWYG edit, merge fields | /documents/collaborative/{id} | CRM7 | ux |
| D-54 | "Should be like the https://r8.crm7.app/" | Developer tables follows that pattern | /developer/tables | suite | ux |
| D-55 | "Jodie AI Missing" | Jodie AI absent from R8 | r8 | R8 | integration |
| D-56 | "apprentice % of Standard Rate card always displays $29.54 no matter the award loaded… The original R80.4 had this sorted before it moved into the sub modules." | %-of-standard and per-year wages follow the loaded award | r8 | R8 | **REGRESSION** |
| D-57 | "Occupation and Qualification should be able to be set in the UI… Unacceptable and it was done before the merge into the sub modules." | One card holding everything driving the calc | r8 | R8 | **REGRESSION** |
| D-58 | "Base Rate and Ordinary Rate need to be much clearer… 'Unsuspended' isnt a word." | Rate build-up + contributors; fix status wording | r8 | R8 | compliance-calc |
| D-59 | "All award allowances are always building and construction. This WAS working!." | Allowances follow the selected award | r8 | R8 | **REGRESSION** |
| D-60 | "Funding milestones should not be pre-populated by default… Yrs overflows over button" | No default milestones; fix year control overflow | r8 | R8 | ux |
| D-61 | "It is unclear how to zero out payroll tax for exempt apprenticeships." | Payroll-tax exemption settable | r8 oncosts | R8 | compliance-calc |
| D-62 | "Unacceptable: No trade selector for MA000036… This WAS already working." | Per-award trade selector with that award's own bands | r8 | R8 | **REGRESSION** |
| D-63 | "No way to export quote for quoting. - must be." | Quote export | r8 | R8 | data-reporting |
| D-64 | "Much of what was working before beeing R8.4 was working and is not not working. Unacceptable." | Restore everything lost in the R8.4 sub-module merge | r8 | R8 | **REGRESSION** |
| D-65 | "shifts are the same as residential, but the industry allowances is the same as civil." | Commercial construction sector rule corrected | r8 | R8 | compliance-calc |
| D-66 | "This is horrible UX, its forcing the USER to code again, and r8 doesnt export like this. It should be able to pull in from R8." | Direct R8 pull, not paste-JSON; and no pure white | /charge-rates/import-r8 | CRM7 | integration |
| D-67 | "it should only ever be displayed as R8" | Display name is always R8, never r80.4 | all surfaces | R8 | theme-branding |
| D-68 | "Why is database ID displaying in full as their ID?" | Employee ID, Training Contract ID, USI as identifiers | /people, /placements | CRM7 | data-reporting |
| D-69 | "Still no option for commercial construction." | Sector with residential hours, civil allowance | d.r8 | R8 | compliance-calc |
| D-70 | "There is only an option for 3 or 4 year apprenticeships. What if we're pricing a traineeship or labour hire worker?" | Traineeship and labour-hire pricing | d.r8 | R8 | compliance-calc |
| D-71 | "Selecting an award in the 'award, trade & qualification' card does not pre-populate the Award in the 'Fairwork MAPD' award and vice versa." | One award selection drives everything | d.r8 | R8 | ux |
| D-72 | "Fairwork MAPD card still has Proxy URL, proxy token, and subscription key visible in ui." | Remove secrets from the UI | d.r8 | R8 | security |
| D-73 | "Competency based progression. Remove. I did not ok this." | Remove from calculator; year-change records in CRM7 | d.r8 / CRM7 | R8/CRM7 | compliance-calc |
| D-74 | "Allowances shouldnt all be visible… Only when added does the new allowance show on the UI" | Defaults marked, others added from a dropdown | d.r8 | R8 | ux |
| D-75 | "Each Card…should be individually draggable via DnD-kit… Every page on every app should have this working correctly. This is a repeated issue and has been raised innumerable times." | Independent DnD on every page of every app | suite root | all apps | ux |
| D-76 | "heading text of the card e.g. CRM& Professional should display the text in the gradient." | Card headings in the D2C gradient | suite root | suite | theme-branding |
| D-77 | "Every page in the developer portal has unstyled/themed buttons… Theme consistency and completeness on every app is a concern" | Theme every developer-portal page; consistency estate-wide | /developer/* | all apps | theme-branding |
| D-78 | "Still doesnt look like airtable. Should look pretty much like a spreadsheet with more power and capability and be able to be expanded to get a full screen view." | Spreadsheet-grade grid with fullscreen | reports surfaces | CRM7 | data-reporting |
| D-79 | "Cant select all entities. E.g. selecting person shows the person_id from supabase but not the persons name" | All entities + human-readable fields selectable | /settings/data, /admin/data | CRM7 | data-reporting |
| D-80 | "Dates should default to Australian dates always… Incorrect because Americans are wrong: 08/19/2026" | AU date format everywhere; size ordering small/medium/big | all apps | bsuite | ux |
| D-81 | "Award selected in 'Award, Trade & Qualification' when selected must populate the Fair Work MAPD card otherwise users are selecting the award twice." | Single award selection point, high on the page | r8 | R8 | ux |
| D-82 | "Text displaying 'qualification not captured' must go. And qualification was required to be captured since people will want to use it on quotes." | Capture qualification and use it on quotes | r8 | R8 | compliance-calc |
| D-83 | "Proxy connection settings…must go. This is left over from the demo single file R80.4 mvp now we use proper supbase edge function secrets." | Delete dead proxy UI | r8 | R8 | zero-consumer |
| D-84 | "all of this stuff should be either minimizable or shifted to a right collapsable panel and exportable as an appendix on the exportable quote and eSigning… save quat thread history…saved as templates" | Collapsible panels, saved quote threads/templates, PDF/eSign, push to CRM7 | r8 | R8 | ux |
| D-85 | "There date duplication throughout 'rates at' appears several times." | De-duplicate the effective-date display | r8 | R8 | ux |
| D-86 | "Searching for an award in Farwork MAPD card throws this 'Unexpected token '<'…is not valid JSON'" | Award search returns HTML, not JSON | r8 | R8 | integration |
| D-87 | "Payroll tax should be able to be zero'd. Crosscut every calculation and be very weary of hardcoved values." | Zeroable payroll tax; sweep all calcs for hardcoded values | r8 | R8 | compliance-calc |
| D-88 | "Oncosts card says WA on all wages (not just super base) confusing. Mixes terminology." | Fix oncosts/super terminology | r8 oncosts | R8 | compliance-calc |
| D-89 | "'Percentages and the standard rate are not auto-updated from MAPD…' must update for awards that do pre-calculate" | Auto-populate %s from the award; same for penalty/overtime | r8 | R8 | compliance-calc |
| D-90 | "No units of competency available for the qualifications. They need to be linked together, along with training providers who offer them" | Link UoC ↔ qualification ↔ provider | /vet/qualifications/* | CRM7 | data-reporting |
| D-91 | "Can this be posted to conduit as a job? Can this be linked to a host." | Vacancy → Conduit job; host-specific vs catch-all | /hosts/vacancies/new | CRM7 | integration |
| D-92 | "Heading text no gradient and almost cut off by border" | Heading gradient and clipping | /hosts/vacancies/new | CRM7 | theme-branding |
| D-93 | "Cant easily pull in a rate from R8 or manually put in charges and wages/allowances, unclear how to even do this" | R8 pull or manual entry on placement | /placements/{id} | CRM7 | compliance-calc |
| D-94 | "why does it say 'offline' if the api to fairwork is connected? And what do users do if they want to enter an eba, custom or award off the 21 list?" | Correct connection state; EBA/custom/off-list awards | r8 | R8 | integration |
| D-95 | "it should default to the top of the page since it effect the whole calculator. This principle should be applied to all cards." | Dependency-ordered card layout everywhere | r8 / all | all apps | ux |
| D-96 | "Logo in header should be the logo set in the platform branding or the logo set in white label section per the relevant tenant." | Header logo resolves from branding/white-label | all headers | all apps | theme-branding |
| D-97 | "Permissions check boxes should be pre-selected for all organisations and saveable… This is something I have insisted on many times." | Pre-checked defaults, persisted, reset-to-defaults | /admin/permissions | suite | security |
| D-98 | "Still that cards are looking shit in relation to the borders." | Card borders still wrong | all apps | bsuite | theme-branding |
| D-99 | "Reports generally are a mess. And duplicative." | Seven overlapping reporting surfaces to consolidate | /reports … /developer/database | CRM7/suite | data-reporting |
| D-100 | "this is probably the best functioning of all…except again bsuite theme and styling is incomplete. Needs to be consolidated." | Consolidate on the best surface; finish theming | /developer/database?surface=tables | suite | architecture |
| D-101 | "all o've got is tise mess of half arsed half complete not fully working attempts… It is very much a violation of the standing rule of high and intuitive UX." | Standing UX rule breached; stop half-finishing | estate | bsuite | ux |
| D-102 | "Analyse interoperability of these - /settings/role-overrides · /admin/permissions" | Role-overrides ↔ admin/permissions must interoperate | both | CRM7 + suite | architecture |
| D-103 | "Permissions in admin/permissions should be pre populated and display checked boxes for default permissions out of the gate. At present nothing is ticked by default and its confusing." | Default permissions checked out of the gate — **third raise** | /admin/permissions | suite | security |

---

## Raised more than once — his own count

| Item | His phrase |
|---|---|
| D-2 — SMTP/Google/Azure email | *"Mentioned **in excess of 20 times**"* |
| D-4 — card/DnD/clipping | *"flagged to be fixed across the full app **many times**… i have **always** said it is a platform wide consideration"* |
| D-36 / D-50 — airtable reporting | *"mapped out, planned, and **directed to fix many times**"*; then *"the **repeatedly directed to fix** airtable style reports… You have got to be kidding me."* |
| D-73 — competency-based progression | *"An actually have **said many times** that this is not the job of the calculator."* |
| D-75 — per-card DnD | *"This is a repeated issue and has been **raised innumerable times**. Usually one page gets fixed but not all."* |
| **D-51 → D-97 → D-103 — permissions default-checked** | *"I have **insisted on many times**"*, then *"**Further as stated above.**"* — **three separate raises** |
| D-100 — spreadsheet data surface | *"exactly what i have been **asking for and documented this whole time**"* |
| D-59 / D-62 / D-64 — R8 behaviour | *"This WAS working!"*, *"This WAS already working."*, *"Much of what was working before beeing R8.4… is not now working"* |

## Platform-wide by his own words — *fixing the named page is a failed fix*

| Item | His phrase |
|---|---|
| D-4 | *"These issues are persistent across the app… **it is a platform wide consideration that needs addressing**."* |
| D-52 | *"**Worth a sweep of this throughout all features everywhere.**"* |
| D-75 | *"**Every page on every app** should have this working correctly."* |
| D-77 | *"**Theme consistency and completeness on every app** is a concern."* |
| D-40 / D-41 | *"**All apps:** Pure white text on dark screen… **No light theme cards to be pure white.**"* |
| D-95 | *"**This principle should be applied to all cards.**"* |
| D-87 | *"**Crosscut every calculation** and be very weary of hardcoved values."* |
| D-17 | *"Should include screen shots. **Same for all docs.**"* |
| D-16 / D-20 | *"we need **cross cuttings and one shot policy applied**"* · *"Leads to clients and host employer **one shot policy compliance**."* |
| D-80 | *"Dates should default to Australian dates **always**."* |

## Explicit rulings — decisions, not defect reports

| ID | Ruling |
|---|---|
| D-73 | **"Competency based progression. Remove. I did not ok this."** — the calculation is point-in-time; year-change records belong in CRM7 placement records |
| D-67 | *"its R8 in the UI the repo is r80.4… but **it should only ever be displayed as R8**"* |
| D-37 | **"Noone but a developer account should have platform level reporting."** |
| D-52 | **"Platform branding should not be visible to anyone but developers."** · **"Platform kit, move to developer portal."** |
| D-51 | **"Permissions should not show platform admin."** — *"None of them should be able to edit my global and universal developer permissions."* |
| D-41 | **"No light theme cards to be pure white."** |
| D-82 | *"Text displaying 'qualification not captured' **must go**."* |
| D-83 | *"Proxy connection settings… **must go**."* |
| D-80 | *"Correct: 19/08/2026. **Incorrect because Americans are wrong:** 08/19/2026."* |
| D-60 | **"Funding milestones should not be pre-populated by default."** |
| D-63 | *"No way to export quote for quoting. **- must be.**"* |
| D-58 | *"**'Unsuspended' isnt a word.** You mean 'Active' or Suspended."* |
| D-65 | *"**This is incorrect.** …shifts are the same as residential, but the industry allowances is the same as civil."* |
| D-97 / D-103 | **"Permissions check boxes should be pre-selected for all organisations and saveable."** |

---

## Distribution

| Category | Count |
|---|---:|
| compliance-calc | 24 |
| ux | 24 |
| theme-branding | 12 |
| integration | 14 |
| data-reporting | 11 |
| security | 9 |
| **regression** | **6** |
| architecture | 5 |
| portals | 3 |
| zero-consumer | 1 |

**The six regressions (D-7, D-27, D-56, D-57, D-59, D-62, D-64) are the sharpest items in the
register** — they are not unbuilt features but capability that existed and was lost, five of the
seven in R8 during the sub-module merge. He calls two of them *"Unacceptable"*.

---

*Compiled 2026-08-25 from the operator's own document. Uncommitted, for review.*

---

## Addendum — D-104 … D-139, from `bsuite notes (6).docx`

**Added 2026-08-27.** `bsuite notes (6).docx` (37,203,139 B, mtime 2026-08-26 19:35, 378 paragraphs)
is this register's source document **plus ten paragraphs** dated 25/08 and 26/08. Nothing was
removed: a set difference against `bsuite notes.docx` returns **10 new paragraphs and 0 dropped**.

Those ten paragraphs carry **36 distinct asks**, none of which were registered anywhere before
today. They are numbered D-104 … D-139 below on the same basis as D-1 … D-103 — one distinct ask
per row, adjacent sentences about the same surface merged.

**None of these carry a status.** This register records what was asked, not what was done; a
status column here would be the false-completion surface the estate keeps rebuilding.

| ID | Verbatim (his words) | Asks for | Surface | App | Category |
|---|---|---|---|---|---|
| D-104 | ""Back to placement link should be a button… this should be a button for all."" | Back-links render as buttons, estate-wide not one page | /placements/:id | CRM7 | ux |
| D-105 | ""Margin is profit pretty much. Its not charge less, wage. Should reflect the calc done in R8."" | Margin computed as R8 computes it, not charge−wage | /engagements/create | CRM7/R8 | compliance-calc |
| D-106 | ""Hardcoded funding. Violation of requirements."" | Engagement funding sourced, not hardcoded | /engagements/create | CRM7 | compliance-calc |
| D-107 | ""Funding in the engagement should reflect how R8 does funding… during engagement we learn the person's particulars and can more closely allocate all funding that individual attracts."" | Per-individual funding allocation at engagement time | /engagements/create | CRM7/R8 | compliance-calc |
| D-108 | ""Engagements should be renamed to training engagements."" | Rename the entity and every label | engagements | CRM7 | ux |
| D-109 | ""Person record should have a list of all placements and engagements we have records for."" | Person detail lists all placements + engagements | /people/:id | CRM7 | data-reporting |
| D-110 | ""This should be presented in a filterable list/table preferably airtable style… filterable by attribute."" | Training providers as an Airtable-style filterable table | /training-providers | CRM7 | data-reporting |
| D-111 | ""they should be able to mark training providers they want visible and hidden. Search all, search Active. Active means Active for us… not Active generally."" | Per-tenant visible/hidden marking; tenant-Active distinct from registered/deregistered | /training-providers | CRM7 | data-reporting |
| D-112 | ""RTO 22613 says (no name) but it has a record… check all like concerns."" | Backfill RTO names from TGA; sweep the whole class | /training-providers | CRM7 | integration |
| D-113 | ""Why is Michael Chen from ADCO Constructions an available Signatory for the Selected 'Example Constructions Pty Ltd'"" | Signatory list scoped to the correct employer | /contracts | CRM7 | security |
| D-114 | ""they should have been reassigned to futurebuild not entered again causing confusing duplicates."" | Reassign the mis-tenanted FutureBuild imports; remove duplicates | tenancy | CRM7 | data-reporting |
| D-115 | ""the google auth screen returns me to the bsuite ui with popup still open rather than the email-accounts screen in crm7 and closing the popup."" | Gmail connect returns to /settings/email-accounts and closes the popup | /settings/email-accounts | CRM7 | integration |
| D-116 | ""Microsoft is unverified even though we have set up the manifest?"" | Microsoft app verified so Azure mail connect works | /settings/email-accounts | CRM7 | integration |
| D-117 | ""Missing known member caris@mbawa.com"" | Known member appears in the members list | /admin/permissions | suite | data-reporting |
| D-118 | ""anything available via json should be done through non-coding means. This is always and has been a long standing directive"" | Every JSON-only capability has a non-coding UI | /admin/* | suite | architecture |
| D-119 | ""Save template and save as default dont currently work… Doesnt currently save on page refresh."" | Save template + save-as-default persist across reload | quotes | R8 | regression |
| D-120 | ""The little tab 'quotes' is confusing. Just the left regular panel should be used and create threads."" | Drop the quotes tab; use the left panel with threads | quotes | R8 | ux |
| D-121 | ""Still no way to export to pdf, email for esigning, or push to an apprentice or host record."" | Quote export to PDF, send for e-sign, push to record | quotes | R8 | integration |
| D-122 | ""And corresponding import a template or quote from R8"" | Import a template/quote from R8 into CRM7 | quotes | CRM7/R8 | integration |
| D-123 | ""Must be able to actually interact with data here if permissions allows. Developer always."" | /admin/data is interactive for permitted roles | /admin/data | CRM7 | ux |
| D-124 | ""Must be able to import and export csv and xlxs and create import templates to download and use to re-upload."" | CSV/XLSX import+export and downloadable import templates | /admin/data | CRM7 | data-reporting |
| D-125 | ""R8 cant save and cant save template."" | R8 save + save-template work | R8 calculator | R8 | regression |
| D-126 | ""Adult doesnt change the wages in the wages card."" | Adult selection recalculates the wages card | R8 calculator | R8 | compliance-calc |
| D-127 | ""Needs notices for actions you take e.g. save."" | Action feedback/toasts on save and similar | R8 | R8 | ux |
| D-128 | ""Needs export and send for esigning and as email."" | R8 export, e-sign send, email send | R8 | R8 | integration |
| D-129 | ""Leads convert relevant sections to contact and client through opportunity etc chain."" | Lead→opportunity→contact/client conversion carries data | /leads | CRM7 | ux |
| D-130 | ""Any subscribed user of a tenant should be able to be afforded permissions by the admin and assigned a caseload of apprentices. Even several over the same… or a supervisor over their field staff."" | Caseload assignment, shared and supervisory | /admin/permissions | CRM7 | security |
| D-131 | ""The UI across the apps is pretty slow. Investigate if their optimization, modularization or anything else… or let me know if its good and just needs a bigger machine."" | Measure UI performance and answer the question | all apps | all apps | architecture |
| D-132 | ""training contracts are created by the State Training Authority in PDF form and scanned. This page makes no sense."" | Rethink e-signatures around scanned STA PDFs | /contracts/training/e-signatures | CRM7 | architecture |
| D-133 | ""Many things like host contracts, employment contracts, WHS risk assessment site visit attendance quotes, and placement confirmation of rates and charges… will need e-signatures."" | E-signature support across those document classes | /contracts | CRM7 | integration |
| D-134 | ""https://crm.crm7.app/hosts should lsit all placements in a table filterable all active and past and pending etc. customizable columns."" | Hosts list all placements, filterable, customisable columns | /hosts | CRM7 | data-reporting |
| D-135 | ""This should provide option to like from other areas like the existing contacts mor leads or the like violates one shot policy."" | Link existing contacts/leads instead of re-keying (one-shot) | /hosts | CRM7 | architecture |
| D-136 | ""Bottom border still double for cards which we have raised 100s of times now."" | Doubled bottom border gone, estate-wide | all card surfaces | all apps | **REGRESSION** |
| D-137 | ""Linked entities with a link looks amaturise."" | Replace the bare link treatment on client detail | /clients/:id | CRM7 | ux |
| D-138 | ""Hosts and clients each should displace in a table below all placements contacts, all records associated with them easily and filterable in tables."" | Related-records tables on host and client detail | /hosts/:id, /clients/:id | CRM7 | data-reporting |
| D-139 | ""anything that lists rows like this needs to be brought up to the airtable style design which is still itself sub par. Take inspiration from the GaryOcean428/atmosphere setup."" | Airtable-style list design everywhere rows are listed; atmosphere as the reference | all list surfaces | all apps | data-reporting |

## Addendum — D-140 … D-145, from the messaging-platform session transcript

**Added 2026-08-28.** The messaging platform (Mobile Message SMS, `message_numbers` /
`message_quotas` / `message_usage` / `message_consent` / `message_categories`, the
`sms-inbound` and `sms-numbers` edge functions, and `email-dispatcher` channel:'sms') shipped
this session with no register row of its own. These six asks, taken verbatim from that
session's transcript, are the source the design doc (`docs/20260828-messaging-platform-design-v1.00W.md`)
was built against.

**None of these carry a status.** This register records what was asked, not what was done; a
status column here would be the false-completion surface the estate keeps rebuilding.

| ID | Verbatim (his words) | Asks for | Surface | App | Category |
|---|---|---|---|---|---|
| D-140 | "Since I'm developer account you may as well enable this feature to my account on bsutie patform account under login for braden.lang77@gmail.com. also remember we should do conduit after. since candidates and interview scheduling should also be a consideration and benefit from sms." | Enable messaging on braden's own BSU developer account now; extend it to conduit next (candidates, interview scheduling) | BSU login (braden.lang77@gmail.com); conduit candidates/interviews | suite/conduit | integration |
| D-141 | "they should be given and we would need to automate the creation of, a company core business sms number... thus no stop permitted. we must respect however right to disconnect off legistration and only send during reasonable hours" | Auto-provision each tenant's core-business SMS number with no STOP option, honouring right-to-disconnect legislation and reasonable-hours-only sending | tenant SMS number provisioning | suite | architecture |
| D-142 | "each workplace will ahve varying working hours... e.g. you havent done your timesheet you're at risk of not being paid would likely be one that would be better to interupt" | Per-workplace contactable hours, with a pay-at-risk timesheet warning as a case that should interrupt those hours | tenant contact window / interrupt tiers | suite | architecture |
| D-143 | "yes and flexibility to nominate who. drop downs or add both available" | Sender/number nomination by dropdown, with an add-new option as well | number-provision / send composer | CRM7 | ux |
| D-144 | "this is a business so some customization will take time for me and provides value so for now so we have it build in a nominal proce to do this. also consider tagging of messages and merge fields." | Charge a nominal price for messaging customisation; support message tagging and merge fields | messaging setup / plan chooser; message composer | CRM7/suite | ux |
| D-145 | "ensure UI and round trips are also key focus of yours" | Keep UI polish and round-trip flows (no dead ends) a first-class focus of the messaging build | messaging platform | CRM7/suite | ux |

## Addendum — D-146 … D-159, from the 3 September export (capture `docs/intake/20260903-a7ae581fe24b/`)

**Added 2026-09-03.** The operator downloads his notes document as he updates it, so exports are
never named by number or filename here: the source is **the newest `bsuite notes*.docx` in
`~/Downloads` by modification time**, which `scripts/bsuite-notes-cycle.mjs` selects. This export
(39,054,591 B, mtime 2026-09-03 09:55, 400 paragraphs, 98 images) is the 26 August capture
(`20260826-10af2d73c44d`, 378 paragraphs, 91 images) **plus 22 paragraphs and 7 screenshots** dated
29/08, 01/09 and 03/09. The cycle script reports **+23 new, −1 removed**: the "removed" paragraph is
the 26 August closing paragraph on Airtable-style lists, which he **extended** in place with the
send-email ask and a rebuke. That is an edit, not a retraction, and it is said out loud here as the
script requires.

**Excluded as not his words** (context only): six pasted paragraphs of an agent's Gate F and D8 notes
("Universality — five locations, fetch eliminated" through "completion-enforcer and
accountability-agent — enforcer block active"). **Recorded as operator voice, not as asks** (audit
classes V1 and V2): "Why has the work ground to a halt? There is no excuse for not checking the docs
issues or consulting with peers and the owner-operator to pull new tasks" and "so why have you
stopped to report? reporting and acting are not useful in isolation".

The remaining paragraphs carry **14 distinct asks**, numbered D-146 … D-159 on the same basis as
D-1 … D-145. Screenshots are named by their position in the export's media folder.

**None of these carry a status.** This register records what was asked, not what was done; the
verdict lives in `docs/00-roadmap/operator-notes-verdicts.json`.

| ID | Verbatim (his words) | Asks for | Surface | App | Category |
|---|---|---|---|---|---|
| D-146 | "Send email button directly in any external record. I.e. client, host, worker, apprentice, trainee, contact, training provider, anything like this, takes me to email and then can go back to record once sent." | A Send-email action on every external-party record that opens the composer and returns to the record after sending (a round trip, audit D8.5) | record detail pages: client, host, worker, apprentice, trainee, contact, training provider | CRM7 | ux |
| D-147 | "https://suite.crm7.app/developer/branding - platform logo's and default branding, theme, styling etc. Master applies to all apps light and dark, and as i create more specific logo's for each app, i'd want to add light and dark versions of each to the specific apps. Note that the braden.com.au logos are my corporate brand and already different" | Platform master branding applied to every app in both themes; per-app logo variants, light and dark; braden's corporate brand kept separate | /developer/branding | BSU | theme-branding |
| D-148 | "https://suite.crm7.app/branding - white label option available to enterprise users. Overrides platform logo's and branding for their tenant and sub organisation tenants all at once or per sub tenant. Does not touch braden since that is my corporate website that isnt part of any subscription except developer account." | Enterprise white-label at tenant level cascading to every sub-organisation, or per sub-tenant; never braden | /branding | BSU | theme-branding |
| D-149 | "And check logic for theme customization and in page customization. Theme and borders and card and button colors and all like customizations dont appear to allow for full customizability and some card and button colors have dropped off since you started this task." (screenshot image26: the suite dashboard's plan cards rendering as plain surfaces) | Full customisability of theme, borders, card and button colours in the theme editor and in in-page editing; restore the card and button colours that dropped off | theme editor; in-page customisation; suite dashboard | BSU, all apps | regression |
| D-150 | "https://suite.crm7.app/gto Compliance table click through. Need to be able to click row and see more detail." (screenshot image98) | Compliance rows open a detail view | /gto | BSU | ux |
| D-151 | "Leads and any other notice needs to be able to click through and take me to the lead or whatever the notice is about." (screenshot image98: four "New Lead … No routing rule matched. Visit Developer Portal" notifications) | Every notification links to the record it is about | notifications panel | BSU, all apps | ux |
| D-152 | "Leads for braden website should also come through to my email, and provide confirmation email to the lead themselves. Same for enterprises using the embed from bsu and placing that embed on their website." | A website lead notifies the owner by email and confirms to the lead; the same for enterprise embeds | braden lead capture; BSU lead embed | braden, BSU | integration |
| D-153 | "Embed form fields customizable. Must be outside of developer portal. It may be simpler to just use the embed and use that on my website braden.com.au same as user enterprises would." | Customisable embed form fields outside the developer portal; braden.com.au may use the same embed as enterprises do | BSU lead embed | BSU, braden | ux |
| D-154 | "https://suite.crm7.app/login Font wrong," (screenshot image5: the login card in a serif fallback face). Repeats the 1 September ask; see audit §2. | The login page renders the platform font, not a fallback | /login | BSU | theme-branding |
| D-155 | "Logo not the uploaded platform logo from BSU platform level branding." (screenshot image5). Repeats D-96 and the 1 September ask. | The login page shows the platform-level uploaded logo | /login | BSU | theme-branding |
| D-156 | "https://crm.crm7.app/reports Name column in reports has double lines and no way to correct." (screenshot image88: title and slug on two cramped lines in the Templates grid) | A one-line Name cell, the slug as its own column or tooltip, and a way for the user to correct it | /reports templates grid | CRM7 | ux |
| D-157 | "https://crm.crm7.app/settings/data Should be airtable style" (screenshot image76: Data Import & Bulk Update) | Import and bulk update presented as an Airtable-style grid | /settings/data | CRM7 | ux |
| D-158 | "https://crm.crm7.app/admin/data Should be editable for developers platform wide and owners (so long as its scoped only to their tenants and sub tenants. Should be presented in ui in airtable style like an improved fully functional version of https://crm.crm7.app/reports - e2e migration applicability and safety considered, and how to do this flexibly for multi tenant changes that only touch those tenants. There should be scoping docs already in the docs." (screenshot image80: Enterprise Data Console, read-only field catalogue) | An editable data console: developers platform-wide, owners scoped to their tenant and sub-tenants; Airtable-style; migration safety and tenant-scoped change considered; the existing scoping docs applied | /admin/data | CRM7 | architecture |
| D-159 | "Bulk editor same principles as above. Currently its is unnusible. Columns are meaningless at present and all columns that can relate to an apprentice or whatever the bulk data being edited should be available. This may include hosts or placements or anything really." (screenshot image50: the Apprentices bulk editor showing only five ADMS columns, every row not_linked) | The bulk editor exposes every column related to the entity, including linked hosts and placements | /settings/data Bulk Update | CRM7 | ux |

## Addendum — D-160, from the operator's chat directive of 2026-09-03 10:48 AWST

Not a docx export: sent to the PI session (`claude-code-bsuite-pi`) mid-turn on 3 September, on the same basis as D-140 to D-145 (a transcript source). It carries **one ask** and one standing rule; the rule is recorded as tier-1 precedent `precedent__bsuite__20260903__live_clients_stage_to_development_and_notify_before_refresh`. **No status here**; the verdict lives in `docs/00-roadmap/operator-notes-verdicts.json`.

| ID | Verbatim (his words) | Asks for | Surface | App | Category |
|---|---|---|---|---|---|
| D-160 | "note there are people using the app in production i.e. actual clients so stage all work to development branch and then ensure their is a platform notice and refresh to update prompt so they dont lose work on rebuilds." | Every app shows an in-app new-version notice with a refresh-to-update prompt so a signed-in user saves before a rebuild replaces the running build (never an automatic reload); all work staged to `development`; production promotions scheduled, never incidental | every app shell (one shared implementation) | ALL six | process + ux |

## Addendum — D-161 and D-162, from the operator's chat directives of 2026-09-03 15:49 AWST

Not a docx export: two asks the operator put to the email-p0 lane in chat on 3 September, relayed to the PI over the bsuite inbox (6003495c, 0fcd55e2). The PI did not see the verbatim text; the wording below is the lane's relay and is marked as such. Same basis as D-140 to D-145 and D-160 (a transcript source). Verdicts: docs/00-roadmap/operator-notes-verdicts.json.

| ID | Wording (as relayed; not verbatim) | Asks for | Surface | App | Category |
|---|---|---|---|---|---|
| D-161 | "can't reset the page layout" / "can't reset to defaults in the page editor" | Reset to Default findable from the page editor without hunting | page-builder edit toolbar (today: three clicks deep in the layers popover) | crm7 (shared page-builder) | customisation / D8.3 clarity |
| D-162 | SMS recipients must resolve mobiles from any record that holds one and from groups: all contacts at a host, a tagged group, a client, a lead, an opportunity; one-shot, never retyped | a recipient picker that reaches every mobile the estate already holds, by record and by group | compose sheet / RecipientPicker | crm7 | one-shot DRY / communications |
