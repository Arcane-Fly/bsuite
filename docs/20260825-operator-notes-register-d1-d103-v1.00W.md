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
