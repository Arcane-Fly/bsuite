# Coverage gap closure — the seven clusters the completion ledger found outside its 87 items

**Document:** `docs/20260817-coverage-gap-closure-v1.00W.md`
**Date:** 2026-08-17 · **Version:** 1.00W · **Status:** W — Working
**Companion to:** `docs/20260817-estate-completion-ledger-v1.00W.md` §5 (clusters G3, G4, G5, G6, G8, G10, G11)

---

## Before anything else — the words

I have written this for you, not for an engineer. Every code and abbreviation is explained the
first time it appears.

- **The colour rule** — an automatic check that stops anyone typing a raw colour (like the code
  `#ffffff`, meaning pure white) into the apps instead of using a named colour from the theme.
- **A gate** — a check that runs automatically when code is submitted and blocks it if a rule is
  broken.
- **A guard** — the script that a gate runs. I have written two new ones today.
- **A ratchet** — a gate with a number attached, where the number is only ever allowed to go down.
  It lets you introduce a strict rule without going red on day one over a backlog nobody has
  cleared yet.
- **PDF (portable document format)** — the file format your invoices, quotes and compliance packs
  are produced in and sent to clients.
- **A migration** — a numbered file that changes the database. Merging one changes nothing; a
  separate process has to run it.
- **`docs/recovered/`** — a directory of documents rescued from an earlier working environment.
  Your RULING 1.2 makes it authoritative; your RULING 1.3 makes it untrusted until each document
  is checked against the actual code. Both are true at once, which is the whole problem.

---

## 1. The answer in one page

Seven clusters. **Two contained work I could finish, and I finished it.** One turned out to be
**already done** four days before the ledger claimed it was outstanding — I measured that rather
than believing either side. **Four are decisions or supplies that only you can provide**, and this
document ends with them, framed as choices with a recommendation each.

| Cluster | What it is | Verdict today |
|---|---|---|
| **G4a** | The pure-white ban could not see a colour passed through a converter | **NOT A DEFECT — already fixed 2026-08-13.** Measured, not read. But **nothing stopped it coming back**, so I built the check that does. |
| **G4b** | The rule prescribes two colours the audit rejects | **Your ruling needed.** Decision 1. |
| **G5** | 25 rescued documents still need a verdict against code; one is a live trap | **Trap bannered and three more with it.** A ratchet now stops the next one arriving unmarked. 29 still need verdicts. |
| **G3** | Database move to Sydney | **Your approval needed**, plus one rehearsal. Decision 2. |
| **G6** | A database connection setting | **Your click needed** — and the ledger's urgency is overstated. Decision 3. |
| **G8** | Unified design-language rollout | **Half-shipped, and the tracker points at a machine that no longer exists.** Decision 4. |
| **G10** | Training-authority email samples | **Blocked on you.** Exactly what to send is listed. |
| **G11** | Retiring a financial reports page | **Mostly already done without you.** One small thing left. Decision 5. |

**One honest correction to the ledger, in the direction that does not flatter me:** the ledger says
G4's fixable half "is fixable now — fix it". It was already fixed. The ledger's coverage pass read
the write-up describing the problem and did not read the code that had since solved it. That is the
same failure class the ledger itself is about, so I am recording it plainly rather than quietly
claiming credit for someone else's fix.

---

## 2. What I fixed

### 2.1 G4a — the pure-white ban and the converter

**The original problem, in your words rather than mine.** Seventeen instances of pure white were
sitting inside the PDF documents your clients actually receive — five in the NSGTO Standard 2
compliance pack, four in the invoice, **four in the charge-rate quote, which is the document the
signing page produces for a client to sign** — and they had been there for the whole life of those
files. Two separate automatic checks were running the entire time and neither reported one of them.

The reason is worth understanding because it is not carelessness. A PDF engine cannot read the
modern colour notation the apps use, so the PDF code passes every colour through a small translator
function first. That is the **correct** way to write it. It is also the one position the check never
looked at:

```
{ backgroundColor: 'oklch(1 0 0)' }             ← reported
{ backgroundColor: pdfOklch('oklch(1 0 0)') }   ← NOT reported
```

Same colour, same line, same file. The wrapper was the entire difference. The app's right habit and
the check's blind spot were the same line of code.

**What I found when I measured.** The fix landed on 2026-08-13 in commit `65e1ffd7`, four days
before the ledger. All six apps carry it. Evidence, all run today:

| measurement | result |
|---|---|
| Is the fix on `development`? | `git merge-base --is-ancestor 65e1ffd7 HEAD` → yes |
| Do all six apps carry it? | the marker that implements the narrowing appears **14 times in all seven copies** (source + six apps) — identical |
| Does the rule's own test suite prove it? | **12 of 12 tests pass**, including one named "bsuite#1962 — a colour handed to a function is still a colour" |
| Is that test load-bearing, or decorative? | I removed the argument walk from a scratch copy and re-ran: **the suite fails**. The test is measuring the thing it names. |
| Do pure whites remain in the estate? | the estate-wide scan reads **7 real** (crm7 1, conduit 1, business-suite-unified 1, packages 4) — none of them in PDFs |

So the seventeen are gone and the rule now sees that position. **The issue tracking it, bsuite#1962,
is still open** — not because the work is undone, but because of a mechanism defect you already
know about: writing "Closes #1962" on a submission to the `development` branch closes nothing,
because GitHub only auto-closes on the *default* branch. Every closing keyword in this estate is
inert. **Recommended action: close #1962 by hand, citing `65e1ffd7`.** I have not done it, because
closing another lane's issue is not mine to do without you seeing this first.

### 2.2 What I actually built — the check that stops it coming back

Here is the part that matters more than the seventeen. **Three checks were already running over
that rule, and not one of them would have noticed if the fix were reverted tomorrow.**

| existing check | what it proves | why it would not catch a repeat |
|---|---|---|
| byte-parity check | the six app copies are byte-for-byte identical to the master copy | six *identically broken* copies pass it perfectly |
| each app's "armed-ness" probe | the rule is switched on and fires | it fires a plain colour written in the simplest possible position. A copy that had lost the converter walk passes it **unchanged** |
| the rule's own test suite | the rule behaves correctly | it only ever loads the **master** copy, from the shared package. It never loads any app's copy |

Parity: proven. Switched-on: proven. **Reaches into the position where the money documents write
their colours: not proven by anything.** That is precisely the gap the seventeen came through — a
gate that existed, was green, and could not see them.

**New guard: `scripts/check-colour-ban-reaches-converters.mjs`.** It loads the master rule and all
six app copies and *executes* each one over a corpus of the four positions that have each, at least
once, hidden a real pure white or pure black in this estate:

- inside a call to a converter (`pdfOklch('oklch(1 0 0)')`) — where the seventeen were;
- inside a *nested* call — one extra wrapper must not re-hide it;
- in a direct assignment (`ctx.fillStyle = '#ffffff'`) — the signature canvas on the guardian-consent
  page, where the rule's own documentation had *claimed* to check for months while having no such
  check at all;
- in a call written for effect (`setFill('#fff')`) — which the argument walk alone never reaches.

It also asserts four things that must stay **silent**, because a check that shouts at ordinary code
gets switched off — and switching this rule off is exactly how it was disabled the first time.

**Output, run today:**

```
77 assertions executed — 7 colour-rule files x 11 fixtures
   (7 must-report positions, 4 must-stay-silent).
77 of 77 assertions passed.
PASS: the pure white/black ban is reachable through a converter in all 7 rule files.
```

**Proof it can fail** (required — a guard nobody has watched fail is not a guard): `--self-test`
strips the converter walk out of all six app copies in memory and re-runs. Result: **36 of 77
assertions fail, exit code 1.** It detects the exact regression it exists to detect.

**Two safety properties worth naming, because this estate has been burned by their absence:**

1. **It positive-controls itself, per copy, before grading anything.** Before it trusts any verdict
   about an app's rule, it makes that rule fire on a colour nobody disputes. If the harness is not
   actually wired to that file, it says so instead of reporting a clean pass. This is not
   theoretical: **the first draft of this guard reported 0 of 77 and accused every copy in the
   estate of a defect that was in my test harness.** The positive control is what turns that from a
   false alarm into a clear message. I have left the story in the file's comments.
2. **It fails closed on an empty scan.** If the apps are not checked out — a real condition, and the
   exact shape of an estate defect you already have recorded ("an empty directory passes the
   existence test, so the gate scanned nothing and said PASS") — it refuses to report green.

Wired into continuous integration as a new job in `.github/workflows/theme-conformance.yml`, which
runs the self-test **first** and fails the build if the self-test passes.

### 2.3 G5 — the live trap in `docs/recovered/`

**The trap.** `20260304-crm7-document-lifecycle-implementation-plan-v1.00W.md` is **2,342 lines** of
task-by-task instructions for building the document-signing system on **Adobe Acrobat Sign**. Adobe
Sign was **rejected on 2026-03-04 — the same day that plan was written** — and the replacement,
built in-house with no vendor at all, shipped on 2026-03-17. The plan was never revised.

It is the longest and most actionable document in the directory. It is therefore the one an agent
reads first and trusts most. And it is *older*, so it sorts to the top, and *more detailed*, because
all that detail was written before the reversal made it worthless.

**The structural hole, which is the real finding.** There *was* a warning — in
`00-READ-THIS-FIRST-corpus-health.md`, a **different file**. An agent that arrives by searching for
a table name, or by following a link from another document, or simply by opening the biggest file in
the directory, **lands inside the trap having never seen the warning**. The warning only works for a
reader who happened to enter through the front door.

**What I did.** Put the verdict on each document's own face, where the way you arrived cannot bypass
it. Four documents in that chain now carry a banner as their first visible content:

| document | banner |
|---|---|
| the 2,342-line Adobe implementation plan | **⛔ DEAD — DO NOT BUILD FROM THIS DOCUMENT** |
| its design specification | **⛔ DEAD — superseded design for a rejected vendor** |
| the research document containing the reversal | **✅ LIVE — this document contains the reversal** |
| the 2026-03-17 architecture | **✅ CURRENT TRUTH — shipped, build on this** |

Each banner carries measurements taken today, not assertions. Adobe Sign appears in **zero**
application files across all six apps and the database function directory (positive-controlled: the
same search for `document_records` returns three files, so the search works). `document_records`
exists in production with 1 row; `signature_requests` with 5.

**And the corpus-health note is itself now stale on one point — recorded in the banners.** It says
the shipped shape has *no* `document_signatories` table. That table **exists in production today**.
It was recreated on 2026-07-30 by a crm7 migration whose own comment says it was needed by a file
called `SignDocumentFlow.tsx` — **and that file no longer exists in crm7.** The table holds **0
rows** and no application code reads or writes it. The document that exists to stop you trusting
stale documents had gone stale. That is not an argument against the note; it is the argument for
putting verdicts on the documents themselves, where they are seen.

**New guard: `scripts/check-recovered-doc-verdicts.mjs`.** Every document in `docs/recovered/` must
carry a verdict banner in its first six lines. Deliberately a **ratchet**, not an absolute rule: 29
documents still need a verdict, verdicting one honestly means reading code rather than skimming
prose, and a gate that fails all 29 on day one would be permanently red — which is how the colour
rule got switched off the first time. So the ceiling is today's measured number, it may only go
down, and **a new document arriving without a verdict fails immediately.**

**Output, run today:**

```
33 files examined in docs/recovered — 4 carry a verdict banner, 29 do not (ceiling 29).
2 files not subject to the rule.
PASS: 29 unverdicted, at or below the ceiling of 29.
```

**Proof it can fail:** two ways, both exercised. `--self-test` blinds the banner detector and
asserts the count changes — it reports all 33 as unverdicted and exits 1, proving the number comes
from the scan and is not a constant. And run against the tree *before* today's banners it exits 1
outright (33 > 29). Wired into `.github/workflows/doc-naming.yml` as a **blocking** step — the
existing filename check there is warn-only, but this one can only go red on a genuinely new
unverdicted document.

Both guards are registered in `scripts/guard-registry.mjs` and the estate's watcher-of-watchers
classifies the colour guard as **passing with a stated non-zero denominator**, verified by running
it: `45 guard(s) enumerated, 32 executed and classified, 28 pass, 0 new failure(s)`.

---

## 3. What remains — with the measurements

### G5 — the other 29 documents

**29 documents in `docs/recovered/` still need a verdict against code**, and the ratchet keeps that
number visible instead of letting it drift. The four highest-risk ones — the whole document-signing
chain — are done. My reading of the remaining risk, so triage is not from scratch:

- **Highest risk (a detailed plan for something that may have been reversed):** the universal-canvas
  master execution plan (already carries a banner of its own kind), the AI-assistant plugin-system
  plan, the e-signature/Google-Docs and email-capability plans, the conduit AI-tools plan.
- **Probably historical and harmless, but unverified:** the four February 2026 reports and the
  phase-1 coordination/reconciliation pair.
- **Nine files with machine-generated names** (`gleaming-fluttering-coral.md`,
  `tranquil-weaving-robin.md`, and so on) — these carry no date and no subject in their filename, so
  nobody can tell what they are without opening them. **My recommendation is to verdict these
  first**, because an unidentifiable document in an authoritative directory is worse than a
  wrong one: nobody can even decide whether to read it.

### G8 — the unified design-language rollout

Measured today, not read:

| what the plan says | what is actually there |
|---|---|
| 12 shared building blocks, authored in business-suite-unified | **all 12 present** |
| mirrored into crm7 | **present** (20 files) |
| rolled out to conduit, R80.4, throughput, braden | **zero files in all four** |
| "Wave 8 — 4-app consumer bumps" | never started |

**One correction to the ledger:** it says "two named components absent estate-wide". I checked all
eighteen names the design document specifies and **every one of them is present in at least four
files**. Nothing named is missing. What is missing is the *rollout* — four of six apps never
received it.

**And a defect the ledger did not record.** The tracking issue names its two authoritative documents
by absolute file path: `/home/user/workspace/bsuite-state/...`. **That directory does not exist on
this machine.** It was the working directory of a second agent ("perplexity-computer") that ran the
other half of this rollout, on a different computer, coordinated through hourly file handoffs. Both
documents *do* exist here, at different paths (`docs/20260507-red-team-ux-doctrine-v1.00A.md` and
`docs/plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md`). So anyone picking this up
today follows the issue's own links into nothing. The rollout stalled at Wave 0 because the
partner running half the waves is gone.

### G4a — the follow-through

`bsuite#1962` needs closing by hand with the merge SHA `65e1ffd7`, per the estate's known "closing
keywords are inert on `development`" defect. Not done by me — see §2.1.

---

## 4. Operator decisions

Five decisions and one supply request. Each has options and **one recommendation**. None of them is
a guess dressed up as a question — where I could settle something by measuring, I measured it and it
is in §2 or §3 instead.

---

### Decision 1 — the two colours the rule tells people to use, which the audit rejects

**The contradiction, precisely.** One check tells a developer, in its own error message, that when
they cannot use pure white or pure black they should use the estate's near-white **`#f8f9fa`** and
near-black **`#0a0e1a`**. A *second* check says a colour may only appear in the shared packages if
it is written down in one of the two theme documents — and **neither of those two values is in
either document**.

So a developer hits the ban, reads the instruction, does exactly what it says, and their submission
fails a different check. The only way to satisfy both is to annotate an exemption, which means the
officially prescribed fix ships as a documented exception **every single time**.

**Why nobody has just fixed it.** Your standing ruling of 2026-08-03 is that the two theme documents
are the source of truth, not the code. Adding a colour to them is a change to the contract, and only
you change the contract. The other route — quietly excusing those two values inside the checker — is
precisely the papering-over that ruling exists to prevent.

**Nothing is blocked today.** It is a trap waiting for the next person who follows the instructions.

| Option | What happens | Cost / risk |
|---|---|---|
| **A. Write both values into the theme documents** as the sanctioned near-white and near-black | the contradiction disappears; the instruction and the audit agree | it is a contract change, so it needs your word. Both values are already in use in the apps' own stylesheets, so nothing changes visually |
| **B. Keep them out of the contract and change the error message** to name something that *is* in the documents | the contract stays as-is | you have to tell me what it should name instead, and every existing use of those two values becomes a violation needing a sweep |
| **C. Leave it** | costs nothing today | the next developer who obeys the instruction fails a build, and the estate's habit of annotating exemptions grows |

**Recommendation: A.** These two values are the estate's *answer* to a ban you yourself made
absolute. A rule that forbids something must be able to say what to use instead, and the thing it
says must be legal. Option B is coherent but you would have to invent a replacement, and there isn't
an obvious one. Option C leaves a documented trap in place for no saving.

---

### Decision 2 — the database move to Sydney (issue #1322, open since 2026-05-27)

The database currently sits outside Australia. The plan to move it to Sydney has a runbook, a scope
document and a readiness checklist. Every preparatory box is ticked. **Two are not, and both are
yours:**

- [ ] **Operator approval for cutover**
- [ ] **Restore rehearsal into a throwaway project**

**What a move actually involves, measured on the live database today:**

| thing that has to move | size today |
|---|---|
| database | **269 MB** |
| stored secrets (each must be re-created by hand; they do not travel in a dump) | **19** |
| scheduled jobs | **14** |
| file storage | **20 buckets, 459 objects** |

That is a small database. The risk is not volume; it is the **19 secrets and 14 scheduled jobs**,
which have to be re-established on the far side, and the fact that every app's connection settings
change at once.

**Why it matters at all:** every page load currently makes a round trip out of the country. Moving
to Sydney is a straightforward latency win for every user, and the data-residency position is
cleaner for an Australian client base — relevant if a host employer or a funding body ever asks
where the data lives.

**What was driving the original date is gone.** The issue title says "before MBAWA board pitch —
mid-June 2026". That is two months past. So this is no longer urgent; it is just unfinished.

| Option | What happens | Cost / risk |
|---|---|---|
| **A. Approve the rehearsal only** — restore a dump into a throwaway project, prove it comes back clean, then decide the cutover separately | you learn the real restore time and what breaks, at zero risk to production | a few hours of my time. Costs a throwaway project for a day |
| **B. Approve rehearsal and cutover together**, with a named window | done in one pass | you are approving a production cutover on the strength of a rehearsal you have not seen the result of |
| **C. Close #1322 and stay where you are** | nothing to do | you keep the latency and the offshore residency position permanently, and three documents' worth of preparation is written off |

**Recommendation: A.** The rehearsal is the cheap half and it is the half that makes the second
decision informed rather than nervous. It cannot affect production, it answers "how long is the
outage" with a number instead of an estimate, and it will surface the secrets-and-cron problem where
it costs nothing. **What I need from you is one word: go on the rehearsal.** I will bring you the
measured restore time and a defect list, and you can decide the cutover with that in hand.

---

### Decision 3 — the database connection setting

**What it is.** Supabase splits the database's connection budget between your applications and its
own login service. That split is currently set as a fixed number — **10 connections** — rather than
as a percentage. Supabase's own production guidance recommends the percentage form, at roughly 15%.
It is a single dropdown in the Supabase dashboard. There is no command and no interface for it; it
must be clicked. It was written up on 2026-05-06 as "a checkbox for the operator to action" and is
**103 days old**.

**A correction to the ledger, which overstates this.** The ledger says it is "confirmed still
present in today's live advisors". I pulled the live advisors today — **2,087 findings** — and
searched them: every match for "connection" is an index name (`..._pool_memberships`, `pool_id`).
**This setting is not an advisor finding at all**, and never was; it came from Supabase's written
production guidance, not from the automated linter. It also cannot be checked from here, because no
tool exposes it. So the honest status is *unverifiable and unactioned*, not *confirmed live*.

**And the actual exposure is smaller than "103 days overdue" sounds.** The database's total
connection budget is **60**. A fixed allocation of 10 is **16.7%** — already almost exactly the ~15%
that is recommended. The setting is not wrong today.

**What is wrong is that it does not follow the database.** A fixed number cannot scale. If the
database is ever resized up, the login service stays stuck at 10 and starts refusing logins under
load. If it is resized down, it takes a disproportionate share from your applications. It is a
correctness-under-change problem, not a live problem.

| Option | What happens | Cost / risk |
|---|---|---|
| **A. Switch it to percentage next time you are in the dashboard** | the split follows the database size forever | ~30 seconds, plus a ~30-second restart of the login service. Do it outside business hours |
| **B. Fold it into the Sydney cutover** (Decision 2) — the new project is configured from scratch anyway | zero additional interruption; it gets set correctly at birth | it waits on a decision that may itself wait |
| **C. Close it as not-a-defect** | one fewer open item | you keep a setting that is right by coincidence and will be wrong the moment the database is resized |

**Recommendation: B, with A as the fallback if Sydney does not proceed within the month.** The
current value is not causing harm, the fix is free during a migration you are already considering,
and doing it standalone means an unnecessary (if brief) interruption to logins. If you decline
Sydney, do A on any evening.

---

### Decision 4 — the unified design-language rollout (issue #635)

Two of six apps have the shared building blocks. Four do not. The plan's final wave — pushing them
into those four — never started, and the reason is in §3: **half the waves were owned by a second
agent on a different machine that no longer exists**, and the issue's authoritative links point into
that machine's filesystem.

This is not a stalled task. It is a task whose *owner* disappeared, which is why it has not moved
since May.

| Option | What happens | Cost / risk |
|---|---|---|
| **A. Repoint and restart** — fix the issue's dead links to the in-repo documents, reassign every wave to this lane, work them in order | the rollout completes; all six apps share one set of components | a week or more of work, and it touches admin screens across four apps, so it needs your visual sign-off at each stage |
| **B. Narrow it to the two apps that matter** — declare crm7 and business-suite-unified the scope, close the rest | the two apps carrying the actual admin surfaces are consistent | conduit, R80.4, throughput and braden keep their own components, and "one design language" stops being true |
| **C. Fix only the dead links and leave the rollout parked** | the next person who picks it up is not sent to a directory that does not exist | nothing moves |

**Recommendation: B, plus the link fix from C.** The four apps without the components are the four
with almost no administrative interface — the shared building blocks are for configuration screens,
scope selectors, permission grids and preview panes, and those live in crm7 and
business-suite-unified. Rolling twelve components into braden's corporate site or throughput to
satisfy a nine-wave plan written for a team that no longer exists is work with no user on the other
end. Narrow the scope honestly, record why, and fix the links so the decision is legible later.
**Option A is the right answer only if you intend those four apps to grow admin surfaces**, and I do
not think you do.

---

### Decision 5 — retiring `/financial/reports`

**Mostly already done, without waiting for you** — and you should know that, because the write-up
you were given says it needs your approval.

The page let someone hand-type a revenue figure, an expenses figure and a profit figure and store
them. The system already derives all three from real data — invoices, pay runs, payroll records,
funding claims and eight more. A hand-typed figure can silently disagree with the invoices it is
meant to summarise, and nothing would ever catch it.

Measured today:

| item | status |
|---|---|
| the list, detail and edit pages | **deleted 2026-08-13**, all three now redirect |
| the navigation entry | **repointed 2026-08-11** to the derived "Financial Summary" report |
| the `financial_reports` database table | **still exists — 0 rows, in every tenant, ever** |

So the only thing left is the empty table, and that is genuinely your call.

| Option | What happens | Cost / risk |
|---|---|---|
| **A. Drop the table in a migration** | the surface is gone completely | irreversible in practice. Zero rows, so nothing is lost, but the option to bring the page back cheaply goes with it |
| **B. Leave the empty table, keep the pages deleted** | you have the benefit already; the option stays open | one empty table sits in the schema forever and shows up in every audit as unexplained |
| **C. Restore the page** | nothing changes | it is the shape your own one-shot doctrine forbids — a mirror table holding free-text financial figures |

**Recommendation: B for now, A in the next scheduled schema tidy-up.** The benefit — stopping people
typing financial figures that can contradict the invoices — is **already banked**. Dropping the table
is tidiness, and tidiness does not justify its own migration. Fold it into the next batch, with a
comment naming this document so the next auditor does not re-litigate it.

**One thing worth your attention regardless of which you pick.** The original write-up raised a real
case for keeping *something*: a GTO sometimes needs to record a figure with no underlying
transaction — an accountant's adjustment, or a prior-year balance. If that need is real, it is **not**
this page. It is a single "adjustments" record type that the report builder can *include*, so the
adjustment appears inside the derived report instead of competing with it. Tell me if that need is
real and I will scope it as its own piece of work.

---

### Supply request — training-authority email samples (G10)

**Not a decision. Something only you can obtain**, and no amount of code reading substitutes for it.

The system reads incoming emails from each state's training authority and works out whether a
training contract was approved, rejected, or needs more information. **Two states are proven — WA
and NT.** The other six are switched off, deliberately, because guessing at an email format the
system has never seen is how you get a contract silently marked approved when it was not.

**Exactly what I need: 18 emails — three from each of six states.** Redacted is fine; black out
names, addresses and contract numbers. What must survive is the **subject line, the sender address,
and the body wording** — that is where the outcome is expressed.

| State | Authority / portal | Approval | Rejection | Needs more info |
|---|---|---|---|---|
| VIC | VRQA / Epsilon | ☐ | ☐ | ☐ |
| NSW | Training Services NSW / STS Online | ☐ | ☐ | ☐ |
| QLD | DTET Partner Portal | ☐ | ☐ | ☐ |
| SA | Skills SA / mySkillsSA | ☐ | ☐ | ☐ |
| TAS | Skills Tasmania / e-VET | ☐ | ☐ | ☐ |
| ACT | Skills Canberra / AVETARS | ☐ | ☐ | ☐ |

**Partial is genuinely useful.** Send one state's three and I will switch that state on. The rule is
one real email per outcome, per state, parsing above the confidence threshold in a test, before that
state is trusted — so each state stands alone and nothing waits on the slowest one.

**If a sample does not exist** — for instance if a state has never sent you a rejection — say so and
I will leave that path on manual confirmation for that state rather than inventing a format.
**Rejections and needs-more-info are the ones most likely to be missing, and they are the ones that
matter most**, because a missed approval is a delay while a missed rejection is a contract everyone
believes is in place.

---

## 5. Evidence index

Everything asserted above was measured today unless dated otherwise. Zero results were
positive-controlled — a search that is broken and a thing that is genuinely absent produce the same
empty output.

| Claim | How it was measured |
|---|---|
| the colour fix is on `development` | `git merge-base --is-ancestor 65e1ffd7 HEAD` |
| all seven rule copies carry it | count of the narrowing marker: 14 in each of 7 files |
| the rule's tests pass and are load-bearing | `node --test` → 12/12; argument walk removed from a scratch copy → suite fails |
| the new colour guard passes | 77 of 77 assertions, 7 rule files × 11 fixtures |
| the new colour guard can fail | `--self-test` → 36 failures, exit 1 |
| pure whites remaining estate-wide | `scripts/audit-d2c-theme.sh` → 7 real, none in PDFs |
| Adobe Sign is not built | zero application files across 6 apps + `supabase/`; positive control on `document_records` returns 3 |
| the shipped document tables | live SQL: `document_records` 1 row, `signature_requests` 5, `document_templates` 1, `document_signatories` **0** |
| the new recovered-doc guard | 33 files examined, 4 bannered, 29 not, ceiling 29 → PASS; `--self-test` → exit 1; pre-banner tree → exit 1 |
| both guards accepted by the watcher | `check-guard-self-reporting.mjs` → 45 guards enumerated, 28 pass, **0 new failures** |
| Sydney migration scale | live SQL: 269 MB, 19 vault secrets, 14 cron jobs, 20 buckets, 459 objects |
| the connection setting is not an advisor finding | 2,087 live advisor findings pulled; every "connection" match is an index name |
| the connection budget | live SQL: `max_connections` = 60, so the fixed 10 is 16.7% |
| `financial_reports` is empty | live SQL: 0 rows; pages deleted 2026-08-13, nav repointed 2026-08-11 |
| design-language rollout state | 12 components in business-suite-unified, 20 files in crm7, **0** in conduit / R80.4 / throughput / braden |
| the design-language tracker's links are dead | `/home/user/workspace/bsuite-state/` does not exist; both documents found in-repo at other paths |

**What I did not do, and cannot:** no browser was driven, so no visual claim here rests on a rendered
page. The estate still has no working end-to-end test credential, which is recorded in the ledger as
item V-1 and remains the single thing most limiting verification across this whole programme.
