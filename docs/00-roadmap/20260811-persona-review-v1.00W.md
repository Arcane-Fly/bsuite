# Persona review — GTO manager, tenant admin, developer advocate

**Tier:** Heavy · **Written:** 2026-08-11 · **Status:** Working (W) · **Lane:** Persona review
(read-only across repos — this document is the only file this lane touched)

## How to read this

Three walkthroughs, each written for you, not for an engineer. Every code term is explained the
first time it appears. Every finding ends in a recommendation. Findings are ranked:

- **BLOCKS** — the job cannot be finished through the UI at all
- **SLOWS** — it can be finished, but with unnecessary clicks, confusion, or risk
- **ANNOYS** — cosmetic or minor friction

**What I actually checked, and how.** The two browser-automation tools (Playwright and
Chrome DevTools) were disconnected for this session, and I judged it unsafe to sign in and click
"Save" on live forms myself — this task is read-only, and clicking through your shared
development database to "prove" a save button works would create real rows I'd then have to explain
away. So every finding below is sourced from **reading the actual application code that is
currently checked out** (the exact files that render each screen and the exact database calls each
button makes), cross-checked against **live, read-only queries against your production Supabase
database** (table structure, row counts, security-policy counts — never a write), and one
direct fetch of the live calculator's homepage. I did **not** click through any live screen myself.
Where that distinction matters, I say so explicitly.

---

## Headline finding — the MA000020 fix is not live yet

Before the three journeys: the most important single fact in this document.

You asked me to verify that the calculator no longer shows the Clerks Award's (MA000020's) penalty
rates and allowances for every award, regardless of which award is actually selected. I checked the
code, not a screenshot, and here is what it shows:

- **What's live right now** (the code your production calculator at `r8.crm7.app` is built from):
  still has the bug. The penalty table is set once, when the page loads, to a fixed default, and
  **nothing in the code updates it when you change the award dropdown.** The calculator even admits
  this to the user — there's a warning on screen that says *"these rows and their clause references
  are MA000020's, shown as a starting point because [the award you picked] has no penalty table
  wired here yet."* That warning is real and still there.
- **The fix exists** — it was written and merged into the project's working branch (called
  `development`) at 15:10 today, in a pull request titled *"the casual penalty conversion is per
  award, not MA000020's rule borrowed."* It adds the missing wiring: selecting an award now correctly
  reloads that award's own penalty table.
- **The fix has not been promoted to the production branch yet.** Production (`main`) is still on
  yesterday's code. Promoting a fix from the working branch to production is a separate, deliberate
  step that has not happened for this one.

**In plain terms: if you open the calculator right now, you will very likely still see the bug you
reported.** The fix is written, tested, and sitting one step away — it needs to be promoted to
production. I did not load the live page in a browser to double-check pixel-for-pixel (the tool for
that was unavailable), so treat this as "verified in the code, not yet verified on screen" — but the
code evidence is unambiguous.

**Recommendation:** promote R80.4's `development` branch to `main` today, then have someone open
`r8.crm7.app`, pick an award that is not MA000020 (e.g. the plumbing award, MA000036), and confirm
the penalty table changes. This is a five-minute check that should happen before anyone relies on a
quote from the calculator.

---

## Persona (a) — the GTO manager pricing a placement

**Who this is:** you, pricing a real labour-hire placement — pick an award, set the trade and
qualification, get an hourly rate, see what's driving it, add penalties/overtime/allowances/funding,
save it, get it into crm7 (the CRM app) as a quote.

**App:** R80.4 (`charge-calculator-v9-2.tsx`, ~6,200 lines — one very large file).

### The journey, click by click

| # | Step | What you click | Where it lands |
|---|------|-----------------|-----------------|
| 1 | Open the calculator | — (page load) | Award selector at the top |
| 2 | Pick or search the award | 1 click (dropdown or search) | Sets the award code |
| 3 | Fetch that award's live rates from the Fair Work API | 1 click ("Load") | Pulls pay rates/penalties/allowances |
| 4 | Pick the occupation/trade | 1 click (dropdown) | Also drives which qualification applies |
| 5 | View the ordinary hourly rate | 0 clicks — it renders automatically | In the "Penalty / OT Rates" panel |
| 6 | View/adjust penalty rates (weekends, public holidays) | 1+ clicks, in a **different card** | "Penalty / OT Rates" panel |
| 7 | Toggle overtime settings (super-on-overtime, workers'-comp-on-overtime) | 2 clicks, in **yet another** part of the panel | Same broad area, separate controls |
| 8 | Apply allowances | 1+ clicks, in a **separate "Allowances" card** | Different card entirely |
| 9 | Set up funding (subsidies/incentives) | 1+ clicks, in a **separate "Funding" card** | Different card entirely |
| 10 | Save the priced result | 1 click ("Save as…") | Saved — see caveat below |
| 11 | Get it ready to hand to crm7 | 1 click ("Export") | Copies JSON to your clipboard — see next section |

**Running total to a saved, priced placement: roughly 10 clicks**, minimum, assuming you don't need
to correct or re-check anything — and every award-law professional double-checks penalty rates.

### "Everything that affects the calculation should be in ONE card" — checked, and you're right

You told me the UI is unclear about what actually affects the calculation, and that everything
should be surfaced in one place. I read the code with that specific complaint in mind. It's
accurate: the ordinary rate, the penalty table, the overtime toggles, and the allowances each live
in their **own separate card**, not one unified view. A GTO manager pricing a placement has to look
in at least four different places to know everything that is feeding the final number.
**Recommendation:** this is exactly the kind of thing `bsuite-page-grid-layout`'s "one card, one
concern" system is built for — but here it needs the opposite: pulling four concerns that are
currently four cards into **one** summary card that shows base rate → penalties → allowances →
final rate as a single running total, with each line item still individually editable. This is a
real, scoped piece of design work, not a quick fix.

### Where your saved rate card actually lives — a real risk

The "Save as…" button (step 10) does not save to your shared database. It saves to **your own
browser's local storage** (a technical term: "IndexedDB" — think of it as a private notebook that
only exists on the computer you're using, in the browser you're using). **If you switch computers,
clear your browser data, or a colleague wants to see the rate card you saved, it is not there for
them.** Nobody else can see a rate card you've saved unless you personally export and hand it to
them.

**Rank: SLOWS today, but this is a real trap waiting to happen** — a GTO manager could reasonably
assume "Save" means "saved for the team," and it does not. **Recommendation:** either move saved
rate cards into the shared database (so anyone with permission can see them), or — at minimum — add
a visible warning next to the Save button explaining it's local-only.

### Getting the rate to crm7 — the "JSON paste box" was not deleted, it was improved

The project plan you're tracking says W5 ("Rate-card transfer") should have **deleted the JSON paste
box and shipped a real 'Send to crm7' button**. I checked both ends of this:

- **R80.4's "Export" button** (step 11) still does exactly what a paste box does: it copies a block
  of JSON text to your clipboard. There is no button that sends anything anywhere — R80.4's own code
  comments confirm this was a deliberate choice ("R80.4 has no transport... there could not be").
- **crm7's receiving side** (`/charge-rates/import-r8`) has genuinely improved: instead of a bare
  text box, you now paste the JSON into a proper page that reads it, shows you what it found (award,
  number of lines, dollar values), and then makes you pick **which host employer this is for**
  before it will let you save. That's real progress — it stops a raw, unvalidated paste from silently
  becoming a live quote.
- **But it still lands as a draft, not a finished quote.** The result is a `draft` charge-rate quote
  that still needs to be reviewed and approved inside crm7 afterwards — a step I did not trace
  further (it's a separate screen I didn't have budget to walk).

**In plain terms: the manual copy-paste was not removed. It was made safer and better-labelled, but
a human still has to copy text out of one app and paste it into another, by hand, every time.**
**Rank: SLOWS** — it works, but it is not what was promised, and it is not what "one click to crm7"
should mean. **Recommendation:** either update the plan to reflect that W5 shipped a "guided import,"
not a "send," or do the further work to make R80.4 write the rate card directly into the shared
database so crm7 can read it without a human in the middle.

### Other things I noticed while tracing the code

- Several awards other than MA000020 still show the "no penalty table wired here yet" warning —
  meaning even after today's promotion fix, some awards will still fall back to MA000020's numbers
  until their own penalty tables are imported. This is separate, ongoing work already tracked
  elsewhere in your project plan (the "47 rate-scope partials" work) — I'm flagging it here only
  because a GTO manager pricing one of those awards will still see the warning banner.
- Funding is correctly **not** pre-filled with anything when you open the Funding card — matching
  your ruling that funding must be entered per-placement, not defaulted from a template.

---

## Persona (b) — the tenant admin configuring their organisation

**Who this is:** a customer's own admin user — not your engineer, not a BSuite developer — trying
to set up their organisation: logo/colours, staff accounts, which features are switched on, their
funding programs, and reference data (awards, qualifications).

### The real finding: the job is not blocked — it's split across two apps with no signposting

My first pass (reading only the BSU app — the "portal" app most tenant admins land in first) turned
up what looked like three serious gaps: no way to toggle feature flags, no way to manage funding
programs, no way to browse reference registers, all apparently requiring an engineer. **That first
pass was wrong**, and I want to show you why, because the corrected finding is more useful than the
alarming one.

When I checked the **crm7** app (the CRM, a separate BSuite app most tenant admins also have access
to), I found that feature flags and funding *do* have full, working, self-serve screens — they're
just not in BSU. Below is the corrected picture.

### Area-by-area

| Area | Where it actually works | Click count | Verdict |
|---|---|---|---|
| **Branding** (logo, colours) | BSU, `/branding` | ~4 clicks: open → edit → Save → confirmation | Works. A bug that used to silently drop your logo on save is fixed — verified in the code. |
| **Staff / users** | BSU, `/admin/team-members` | ~5 clicks per person invited: open → pick team → Invite → enter email + role → Send | Works, but one person at a time — no "invite 10 people at once." |
| **Feature flags** (which modules are switched on — ~37 of them) | **crm7**, `/settings/feature-flags` — NOT in BSU (BSU's version of this page is locked to your own developers only) | 2–3 clicks per flag once you're on the page — search, flip a switch, Save | **The screen is fully built and works** — grouped, searchable, has a plain-English description next to every flag. The problem is entirely findability: **there is no menu link to this page anywhere in crm7.** You would have to already know the exact web address to reach it. |
| **Funding** | **crm7**, `/funding-sources` — NOT in BSU | A handful of clicks: open → New → fill a real form → Save | Works — a proper form with a picker for the contact, not free-text. This one **is** in the crm7 menu ("Funding Sources"), so it's the one area of the four that a tenant admin could actually stumble onto by browsing. |
| **Registers** (awards, qualifications, occupations) | Not found as a standalone browsable page in either app | n/a | These appear to be consumed as pick-lists inside other forms (e.g. choosing a qualification while adding a person) rather than offered as a page you browse on their own. That may be intentional — you generally don't need a whole page just to look at a list of awards — so I'm not flagging it as a gap, only noting I did not find one and did not exhaustively search every app for it. |

### The real, ranked findings for this persona

1. **SLOWS — feature flags exist and work, but are invisible.** The page at
   `/settings/feature-flags` in crm7 is genuinely well-built: it lists every flag with a plain
   description, groups them (Integrations, Core modules, Compliance, Finance, Reports, Platform,
   Admin, AI), and saves instantly. But I checked crm7's entire navigation menu, and this page is
   linked from **nowhere**. It's registered in the app (the web address works if you type it) but
   there is no button, no menu item, no link that leads a person to it. A tenant admin who wants to
   turn on, say, the WHS (workplace health & safety) module has no way to discover that this screen
   exists. **Recommendation:** add "Feature Flags" to crm7's Settings menu — this is a one-line fix
   for a page that's already fully built.
2. **SLOWS — the same problem, worse, for building custom pages.** While tracing this I found that
   crm7 also has a complete, working screen for creating a brand-new page (`/settings/custom-pages`
   and `/settings/custom-pages/create`) — but it, too, has no menu link anywhere. Relevant to
   persona (c) below as well.
3. **ANNOYS — tenant configuration is split across two apps with no cross-links.** Branding and
   staff live in BSU; flags and funding live in crm7. Neither app links to the other's settings
   area. A tenant admin who starts in BSU (the natural "portal" entry point) will reasonably assume
   that's where all admin tasks live, and will not think to look in crm7 for the rest.
   **Recommendation:** either put a "More settings" link in BSU's admin area pointing at crm7's
   settings, or — better — pick one app as the single home for all tenant-admin configuration and
   move the rest there, per your own "enter once, use everywhere" rule for where things belong.
4. **ANNOYS — no bulk invite.** Onboarding a new tenant with a team of 10 means the Invite dialog
   10 times.

None of these four **block** the job — every task can be completed by someone who is willing to
guess or be told the exact web address. But "someone has to tell you the URL" is functionally the
same as needing an engineer, for a tenant admin who has never been given that URL. That is the gap
worth closing first, and it is cheap to close (add menu links, no new screens needed).

---

## Persona (c) — the developer advocate

**Who this is:** you asked this one specifically — *"can a developer visually do everything needed
in the UI to build a new feature, connect existing entities, create entities and the like?"*

**Note on freshness:** there is existing research on this exact question from three weeks ago
(2026-07-22/23) that found four serious gaps. I re-verified all four against today's code rather
than trusting the old notes, because a lot has shipped in three weeks. Two of the four have changed.

### A — "Define a new entity through the UI"

**Yes, and it writes to the real database, not just a draft.** The screen is BSU's Feature Builder
(`/developer/feature-builder`). You: name the new table, choose who can see it (everyone in your
organisation / just the owner / platform-only / public), add columns one at a time with a type
picker (text, number, date, yes/no, etc.), then click "Apply to database." I checked the button —
it calls a real database function (`apply_feature_migration`) that I confirmed exists and is live
in your production database. **This is a genuine change from three weeks ago**, when this same
button only opened a draft code-review request on GitHub and did nothing to the live database. That
older, weaker behaviour is still offered as an option (for teams who want a human to review the SQL
first), but the direct-apply path now exists and works. **Roughly 5–7 clicks** from a blank page to
a new, live table.

### B — "Connect it to existing entities"

**Yes.** When adding a column, there's a picker for "this column points at another table" — you
choose the target table, the target column, and what happens if the linked row is deleted. This
produces a real database-level link (a "foreign key" — the database itself will refuse to save data
that breaks the link, not just a note in a spreadsheet). No SQL required.

### C — "Expose it on a page and wire a form to it"

**This is where it stops being pure clicking — but not for the reason the three-week-old research
said.**

The old research said BSU has zero page-building capability and pointed entirely at a broken,
unused placeholder component. That's still true of BSU specifically. But I checked crm7 — which,
per an internal architecture decision from May, is deliberately the one app responsible for building
custom pages — and found a **real, working page-creation screen** there
(`/settings/custom-pages/create`): you name the page, choose its type (a data-entry form, a list, a
dashboard, a detail view, or a multi-step wizard), and it can be tied to a specific entity.

What I could **not** verify in the time available: whether choosing "form" and picking your new
entity automatically generates the actual input fields (name, email, whatever columns you added in
Feature Builder), or whether a developer still has to hand-write the field layout afterwards. That
is the one open question in this whole report I'm flagging as **genuinely unverified** rather than
guessing — it needs a follow-up pass with more time, ideally combined with an actual click-through
once browser tools are available again.

Either way, there is a second, separate, and definite problem: **just like the feature-flags screen
in persona (b), this page-creation screen has no menu link anywhere in crm7.** A developer has to
already know the exact web address.

### The nav editor — does adding a page to the menu need code?

**No.** BSU's navigation editor (`/developer/nav`) lets a developer type or pick a page from a
searchable list and add it to the menu, purely by clicking. This part works. It just isn't being
used yet for the two screens above (feature flags, custom pages) — which is a five-minute fix, not
a missing capability.

### Ranked findings for this persona

1. **SLOWS, not BLOCKS, contrary to the three-week-old notes — entity creation is live-database,
   not draft-only.** This was the biggest of the four old gaps and it has been fixed. Worth telling
   whoever is tracking that plan, so the old finding doesn't keep getting re-reported as open.
2. **SLOWS — page creation exists in crm7, but a developer would not find it without being told the
   URL**, same root cause as the feature-flags finding in persona (b). Cheapest possible fix: add it
   to the menu.
3. **UNVERIFIED, flag for follow-up — does the page-creation screen actually generate a working
   input form from an entity's columns, or does a human still have to hand-place every field?** I
   ran out of time to trace this to the bottom and would rather tell you it's unverified than guess.
   If the answer turns out to be "a human still has to hand-place every field," that is the one
   remaining real gap in the developer's UI-only path from "new idea" to "working feature."
4. **ANNOYS — no way to preview a new page while still on a development branch.** Testing a newly
   built page currently requires merging to the main branch and waiting for a real deployment; there
   is no local or draft preview.

---

## Summary table

| Persona | Can the job be done through the UI alone? | Blocking findings | Click count (core task) |
|---|---|---|---|
| (a) GTO manager | Yes, but the number you'd see today is still wrong (MA000020 bug not yet promoted to production) | 1 (MA000020 fix not live) | ~10 clicks in R80.4 + a manual copy/paste into crm7 |
| (b) Tenant admin | Yes — every screen exists and works | 0 — but 2 SLOWS findings (flags and funding live in a different app than branding/users, with no cross-links) | 4–5 per area; feature-flag page is unreachable by menu |
| (c) Developer advocate | Mostly — entity creation and relations are fully click-only and live; page creation exists but is undiscoverable; form auto-generation is unverified | 0 confirmed — 1 open question (form auto-generation) | ~5–7 clicks to a live entity; page-creation exists but is an orphan route |

## What I recommend doing first, in order

1. **Promote R80.4's `development` branch to `main`** and do a two-minute manual check that
   switching the award actually switches the penalty table. This is the one finding that could
   cause an actual pricing mistake today.
2. **Add menu links for the three orphan screens I found** (`/settings/feature-flags`,
   `/settings/custom-pages`, and crm7's funding pages already have one) — all three already work,
   they're just unreachable by clicking. This is the cheapest, highest-value fix in this whole
   report.
3. **Decide where tenant-admin configuration lives** — one app, not split across BSU and crm7 with
   no link between them — and either move the screens or add cross-links.
4. **Build the "one card, everything that affects the rate" view** for the GTO manager persona —
   this is real design and engineering work, not a quick fix, but it's the single complaint you
   raised by name.
5. Follow up on the one unverified item: does crm7's page builder actually generate working form
   fields from an entity's schema, or is that still a hand-coding step.

---

## What I verified visually, and what I did not

- **Did not** sign into any live app or click through any screen — the two browser-automation tools
  were disconnected this session, and I judged clicking "Save" on live shared-database screens to be
  incompatible with this task's read-only mandate.
- **Did** read the actual source code currently checked out for R80.4, crm7, and business-suite-unified
  (all three freshly cloned and installed for this review).
- **Did** run read-only queries against the live production Supabase database to confirm table
  structure, row counts, and that specific database functions referenced by the UI actually exist —
  no query in this review wrote, updated, or deleted anything.
- **Did** fetch the live calculator's homepage once, to check for a visible build/version marker —
  it showed only the app's title, nothing that identified which commit was deployed, so this did not
  change any finding.
- Every finding above is traceable to a specific file, and in several cases a specific line number,
  in the code as it stood at the time of this review (2026-08-11).
