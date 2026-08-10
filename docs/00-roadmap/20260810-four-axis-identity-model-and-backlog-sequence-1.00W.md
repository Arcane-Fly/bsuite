# The four-axis identity model, and how we work through the backlog

**Date:** 2026-08-10 · **Status:** 1.00W (working — needs your ruling on §2 before anyone builds)
**Companion to:** [20260810-r804-carryover-register-1.00W.md](./20260810-r804-carryover-register-1.00W.md)

Every number in §1 was measured against the live database today, not read off a plan.

Glossary: **TGA** = training.gov.au, the national training register. **STA** = State Training
Authority (in WA, the Department of Training and Workforce Development). **ANZSCO** = the Australian
Bureau of Statistics occupation code list. **FWC** = Fair Work Commission. **FK** = foreign key, a
column that points at a row in another table instead of repeating its text. **Free text** = a typed-in
string with nothing checking it.

---

## 1. What is actually there right now

| Thing | Rows | Verdict |
|---|---:|---|
| `anzsco_occupations` (ABS register) | **1,023** | Healthy, and better than expected: all 1,023 are 6-digit occupations (the finest level), all flagged as official-register rather than user-added, all carrying their OSCA successor code. |
| `apprenticeship_titles` (STA register) | **369** | Loaded. All 369 carry a qualification code; 295 distinct codes. **WA only** — measured, one state, `WA`. |
| `qualifications` (TGA) | **6** | Effectively empty, and **tenant-scoped** — see the defect below. |
| `qualification_occupation_links` (the 3-way link table) | **0** | Built 29 July. Never populated. |
| `priority_occupation_listings` | **0** | Built. Never populated. |
| Award trade / occupation register | **table does not exist** | 27 trades live as hardcoded TypeScript in R80.4, MA000020 only. |
| `people.anzsco_occupation_id` | **0 of 50** | FK added 29 July. Nothing writes it. |
| `people.apprenticeship_title_id` | **0 of 50** | FK added 29 July. Nothing writes it. |
| `people.trade` (free text) | **16 of 50** | The only thing anyone is actually filling in. |
| `placements` | 34 | Carries `award_code`, `classification`, `award_rate_id`. **No trade.** |
| `r80_charge_rate_builds` | **0** | Saved rate builds. Carries no award, no trade, no person, no placement. |

**Two defects fall out of that table before we design anything:**

1. **`qualifications` is tenant-scoped.** CPC30220 Certificate III in Carpentry is a national
   qualification published by one national register. Making it per-tenant means every client re-types
   it, every client can spell it differently, and no two tenants' data can ever be compared.
   **Ruled 2026-08-10 — see §2A.**
2. **The July FK work is built and unwired.** Three tables and four foreign keys were shipped on
   29 July and not one row uses them, while the free-text `people.trade` column is the one people
   actually fill. That is the recurring pattern: the entity exists, the form still writes a string.

---

## 2A. RULED 2026-08-10 — global vs tenant, by origin

> *"Global where they are pulled from TGA directly, and tenant scoped where they are added manually.
> Same as units of competency, skill sets, non-accredited training, licences, and similar."*
>
> *"If applicable to all — pulled from an external source, isn't a privacy concern, i.e. something
> that will apply nationally and isn't sensitive and it's pulled from something like TGA — then it's
> global. The national qualifications doesn't change per tenant. It's nationally set. So that's
> global."* — Braden, 2026-08-10

### The test — three conditions, all must hold

A row is **global** when:

1. **It came from an external source** we ingest, not from someone typing here; **and**
2. **It is not personal or sensitive**; **and**
3. **Its content is the same for every tenant** — it is set externally, not by us.

Fail any one and it is **tenant-scoped**. This is broader and better than "is it TGA" — TGA is an
example of condition 1, not the rule.

**Two consequences that will otherwise get built wrong:**

**Per-state is not per-tenant.** `apprenticeship_titles` carries a `state` column and is global —
correctly. The WA title is the WA title for every tenant, so the variation belongs in the data, not in
the tenant boundary. Nobody should later "fix" this by tenant-scoping it.

**The class is global; the holding is personal.** Condition 2 splits every credential in two:

| Global register (the class) | Tenant + personal (the holding) |
|---|---|
| "HR — Heavy Rigid", "White Card (CPCWHS1001)" | *This person's* licence number, expiry, scan, issuing office |
| CPC30220 Certificate III in Carpentry | *This apprentice's* enrolment and progress |

This is the trap in building a "licences" table: put licence *numbers* in it and a national register
becomes a pile of personal data. The register holds classes. `skill_records` and the person record
hold holdings — which is why `skill_records` stays tenant-scoped and is not a defect.

---

**One table per concept, not two.** A national register is not copied per client.

- `tenant_id` becomes **nullable**. NULL means global.
- `origin` uses the **existing** `reference_row_origin` type — `official_register | user_added`.
- The invariant is a database CHECK, not a convention:
  `(tenant_id IS NULL AND origin = 'official_register') OR (tenant_id IS NOT NULL AND origin = 'user_added')`
- Row security: everyone reads global rows plus their own tenant's; a tenant writes only its own.
  Global rows are platform-managed.

### The rule applied to every external register — measured today

**Already correct, nothing to do (8 tables).** No `tenant_id` at all, so they are global by
construction: `anzsco_occupations` (1,023), `apprenticeship_titles` (369), `awards` (7),
`award_templates` (15), `award_classifications` (0), `qualification_units` (119),
`state_training_authorities` (8), `priority_occupation_listings` (0).

**Already correct in practice, and the strongest precedent for your rule: `training_providers` —
8,119 rows, every single one global.** The national register of training organisations was already
built exactly the way you just ruled. It only lacks the `origin` marker for consistency. Worth saying
plainly: the biggest external register we hold already does this, so the ruling is confirming an
existing good pattern rather than imposing a new one.

**Wrong by construction — `tenant_id` is NOT NULL, so these tables *cannot* hold a global row
(5 tables):** `qualifications` (6), `competencies` (0), `vet_training_packages` (0),
`whs_training_modules` (0), `training_provider_organisations` (0). Four of the five are empty, so this
is cheap now and expensive later.

**Wrong in the data — `units_of_competency`.** 160 rows, and it is the only table that already thought
to add an `origin` column. But the column is plain text holding **`'national_tga'`** — a second
vocabulary for the same idea — and **all 160 rows are tenant-scoped despite being national TGA data**.
The national unit register is already being duplicated per client. Fails condition 3 today.

**Needs a decision — `funding_programs` (4 rows, tenant nullable).** Federal schemes are externally
set and national, so they are global under the rule; but funding is date-effective and grandfathered,
and a tenant may hold its own arrangements. Likely a genuine split rather than a defect. Flagging, not
assuming.

**Two rival pairs must collapse before the pattern is applied** — `competencies` vs
`units_of_competency`, and `vet_training_packages` vs `training_packages`. Applying the pattern to both
halves of a duplicated concept makes the duplication permanent.

**Three of the five things you named have no register at all.**

| Category | Register today |
|---|---|
| Qualifications | Exists, wrong shape |
| Units of competency | Exists, divergent shape |
| **Skill sets** | **Nothing** |
| **Non-accredited training** | **Nothing** (`whs_training_modules` is nearest, and empty) |
| **Licences** | **Nothing.** `tester_licenses` and `enterprise_licence_events` are software/testing, not White Card / HR licence / EWP. |

Those three currently live as **free text on `skill_records`** — `skill_name`, `certification_name`,
`certification_number`, `expiry_date` are typed strings on a per-person row with nothing behind them.
So today a worker's High Risk Work Licence is a string somebody typed, spelled however they spelled
it, and nothing can report on it or warn before it expires reliably.

### Settled: licences are covered

The generalised test resolves this without a special case. A licence **class** — "HR — Heavy Rigid",
"White Card" — is externally set by a regulator, is not personal, and is the same for every tenant, so
it is **global**. It does not matter that the publisher is WorkSafe or the Department of Transport
rather than TGA; condition 1 says *an external source*, not *TGA*.

Still unruled and not blocking: what happens when a tenant types something that later shows up in the
official register — merge the rows, or keep both and link them. Worth deciding before the first
tenant-added row exists, which is currently never, since the tenant half of the pattern has not been
exercised anywhere yet.

---

## 2. The model — four axes, not three

You said three classes, related but independent. There are **four**, and the fourth is the one with no
home: the award trade. Naming it is what makes the other three tractable.

| # | Axis | Example | Published by | Answers |
|---|---|---|---|---|
| 1 | **Qualification** | CPC30220 Cert III in Carpentry | TGA (national) | What are they being trained in? |
| 2 | **Apprenticeship / traineeship title** | WA "Carpentry and Joinery", nominal term 48 months | STA (**per state**) | What does the training contract say? |
| 3 | **ANZSCO occupation** | 331212 Carpenter | ABS (national) | What do we call this for reporting and funding? |
| 4 | **Award trade** | MA000020 cl.21.1(a) "Carpenter and/or joiner", tool $41.22/wk | FWC (**per award**) | What do we pay and charge? |

### The rule that makes them independent

**Three of these describe the person's training. The fourth describes this job.**

Axes 1–3 travel with the apprentice. Axis 4 travels with the **placement** — because the award is
determined by the host's industry and the work performed, not by the qualification. The same carpenter
placed at a civil contractor and at a joinery shop sits under different awards, with different tool
allowances, on the same qualification. R80.4's own code already states this: *"Award coverage binds:
another award's trades are that award's work, not a relabelling of this one."*

MA000020 makes it concrete inside a single award — it lists "Tradesperson, metals and engineering
construction sector" at a $21.59 tool allowance. Same physical trade, different sector, different money.

**Consequence: axis 4 must never be derived from axes 1–3.** Any code that infers the award trade from
the qualification or from ANZSCO will silently misprice, and silently is the dangerous word — it
produces a confident number with a clause reference attached.

### The three layers

**Layer 1 — Registers.** One row per real-world thing, published by whoever owns it. Global, read-only
to tenants. Two of four are loaded; `qualifications` needs promoting and ingesting; `award_trades`
needs creating.

**Layer 2 — Correspondences.** Many-to-many suggestion tables. Each link carries its **source** and
whether it is a default. **A correspondence is a suggestion, never an authority.** Two of them:

- `qualification_occupation_links` — already exists (qualification ↔ title ↔ ANZSCO). Empty.
- `award_trade_links` — new. Maps a qualification or ANZSCO occupation to a candidate award trade,
  per award. Seeded empty; see §3 on why.

**Layer 3 — Assertions.** What is actually true of this person, this contract, this placement. Allowed
to disagree with every suggestion in Layer 2, and the disagreement must be **visible, not silent** —
that is your 29 July ruling applied one axis further.

- Training contract asserts axes 1–3. Columns already exist.
- **The rate card asserts axis 4** — and the placement inherits it. R80.4 can price a job that has no
  placement yet (it is a calculator before it is a system of record), so the saved rate card is the
  primary carrier and `placements` gains `award_trade_id` for the case where a real placement exists.
  Getting this the wrong way round would mean you cannot quote for work you have not won yet, which is
  most quoting.

### Where axis 4 lives, and who owns it

R80.4 owns rate calculation, so R80.4 owns the trade list. But crm7 needs to show a picker and store a
reference without importing the rate engine.

**Recommend: R80.4 publishes the trade catalogue as a generated data artefact** (it already does this
for the allowance catalogue and the apprentice ladder), a migration seeds `award_trades` from that
artefact, and a continuous-integration check fails the build if the database and the engine disagree.
One source of truth, two readers, drift caught automatically.

This also makes an invisible gap visible: **27 trades exist for MA000020 and zero for the other 20
awards.** As hardcoded TypeScript that gap is unknowable. As a table with a row count per award, it is
obvious on sight.

---

## 3. The honest part: what can be populated, and what cannot

Memory carries an explicit instruction from July — *do not seed a plausible-looking subset later, get
the real list first.* Applying it:

| Link | Real source? | Status |
|---|---|---|
| Title → Qualification | **Yes.** All 369 title rows already carry `qualification_code`. | **Free. Populate now, no guessing.** |
| Qualification → ANZSCO | Partly. TGA does not publish an ANZSCO code on the qualification record, and our `qualifications` table has no such column. | Needs a real correspondence source or operator curation. **Do not infer from title text.** |
| Qualification / ANZSCO → Award trade | **No authoritative mapping can exist**, because award coverage runs off the employer's industry and the work performed, not off the qualification. I am confident in the principle; I have *not* exhaustively searched for a commercial dataset that offers one as a convenience. If you know of one, it changes the seeding, not the model. | **Operator-curated.** Build the curation screen; seed it empty; offer a name-match *suggestion* a human confirms. Never auto-apply. |
| ANZSCO → OSCA | **Yes**, already loaded on all 1,023 rows. | Done. |

So roughly one of the four correspondences is free, one needs a source we have to find, and two are
curation. That is not a reason to delay the model — it is the reason the model must distinguish
*suggestion* from *assertion* in the schema rather than in a comment.

**One more gap to name:** the title register is **WA only** (1 state, 369 rows). Every other state's
titles are absent. That is fine while WA is the operating footprint, but the schema is already
per-state, so nothing needs redesigning when the second state arrives — it needs ingesting.

---

## 4. How I propose we work through everything

**Ordering principle: restore verification, then correct money, then connect, then polish.** Anything
you cannot see, you cannot review; anything that prices wrong is a legal exposure; everything else is
improvement.

To be clear about the first two: **Wave 0 does not delay Wave 1.** Wave 0 is a couple of hours in the
app shell, Wave 1 is days in the award engine, and they touch different files — they run side by side.
Wave 0 is listed first because it is what makes Wave 1's output reviewable, not because the money
errors are less urgent. They are the most urgent thing here.

### Wave 0 — make the app reviewable again (hours)

| | Item | Why first |
|---|---|---|
| 0.1 | Service-worker kill switch on R80.4 | Returning browsers see a blank page. Until this ships, no UI work can be reviewed by you or anyone else. |
| 0.2 | Trade selector announces itself when no award is chosen | Three complaints, three sessions, one line. |

### Wave 1 — money correctness (the legal exposure)

| | Item | Exposure |
|---|---|---|
| 1.1 | MA000009 Schedule B adult apprentices: engine $16.20 vs published $23.56 | **45% understatement.** Largest known error. |
| 1.2 | Rule on the D11 schedules extension (20 of 21 awards failing) | Until ruled, the pass state is not trustworthy, so nothing built on it can be trusted either. **Your call — I'll put the argument both ways.** |
| 1.3 | National Training Wage schooling table indexed without its wage level | Up to $29/wk wrong; shared defect across Schedule E. |
| 1.4 | Penalty card rates "slightly off the card" | Your 6 Aug report, never diagnosed. |
| 1.5 | Supported Wage System — modelled in 0 of 21 awards | The $113/wk floor binds above the percentage; we currently quote below it. |
| 1.6 | School-based — unmodelled in 19 of 20 awards | |
| 1.7 | Five verdict functions returning bare verdicts | Correctness debt, low dollars. |

### Wave 2 — the identity model (§2 above)

**2.1 Apply the §2A ruling across the credential registers.** In order: collapse the two duplicate
pairs (`competencies` into `units_of_competency`, `vet_training_packages` into `training_packages`)
— then convert `units_of_competency` to the typed enum and lift its 160 national rows to global —
then apply the pattern to `qualifications` and the rest. Collapsing first matters: applying the
pattern to both halves of a duplicated concept makes the duplication permanent.

**2.2 Create the three missing registers** — skill sets, non-accredited training, worker licences —
on the same pattern, and move `skill_records` off free text onto them. This is the one that stops a
High Risk Work Licence being a string somebody typed.

2.3 Publish `award_trades` from the R80.4 engine + drift check · 2.4 Populate title→qualification
links from data we already hold (free, no guessing) · 2.5 Build the curation screen for the two links
that need human judgement · 2.6 Add `award_trade_id` to the rate card and to `placements` · 2.7 Move
the forms onto the foreign keys and retire free-text `people.trade` / `people.occupation` behind a
backfill — the AVETMISS export and the document merge read those columns directly, so they migrate in
the same change or not at all.

### Wave 3 — connect R80.4 to crm7

3.1 crm7's hardcoded `payRate: 0` · 3.2 the deep-link contract, so a placement opens R80.4 with award,
trade, sector and cohort pre-filled and a saved rate card comes back to the placement · 3.3 payroll
records out of R8, per your 6 Aug directive.

### Wave 4 — the UX you asked for twice

Employment & Hours defaulting beside the Fair Work card · dragging cards into empty space · using the
full width of a large monitor · named, saveable billing presets instead of the fixed
Standard / ALEX / 52-week trio.

### Wave 5 — new surface

Seek first, then Indeed and LinkedIn, in conduit where recruitment lives · AVETMISS behind a feature
flag, defaulted off, as a paid add-on.

### Execution shape

Four lanes can run at once; two things must not.

- **Lane A (R80.4 engine)** — Waves 0 and 1. Own worktree.
- **Lane B (schema + identity model)** — Wave 2. Own worktree. **Migration version numbers assigned in
  the brief, not chosen by the lane** — parallel lanes have collided on this before. **No lane applies
  a migration; they land as files and one hand applies them.**
- **Lane C (crm7 wiring)** — Wave 3. Own worktree.
- **Lane D (R80.4 UX)** — Wave 4. Own worktree, but **starts after 0.1** or its work cannot be seen.

Serialised: 2.5 and 2.6 wait on 2.2 (nothing can reference `award_trades` before it exists), and Wave 3
waits on Wave 2 (the deep link carries the trade id).

---

## 5. What I need from you

1. **Ruling on D11** (item 1.2) — I will lay out both readings before you decide. This is the only
   thing still blocking Wave 1.
2. **Go on Wave 0**, which I can ship immediately and which nothing else depends on.
3. Non-blocking, decide when convenient: `funding_programs` global/tenant/both, and the merge path for
   a tenant-added row that later appears in an official register.

**Ruled and closed, 2026-08-10:**
- ~~Four-axis identity model~~ — **approved.** §2.
- ~~`qualifications` global vs tenant-scoped~~ — **global.** §2A.
- ~~Do licences fit the rule~~ — **yes**, the generalised test covers them. §2A.
