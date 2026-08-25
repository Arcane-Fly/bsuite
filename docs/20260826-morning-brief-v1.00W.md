---
kind: report
authority: agent
owner: bsuite
evidence:
  - scripts/check-route-surface-map.mjs
  - scripts/prod-window.sh
  - docs/nav/route-surface-map.json
  - docs/20260826-route-surface-map-v1.00W.md
  - docs/20260826-four-decisions-for-braden-v1.00D.md
---

# MORNING BRIEF — overnight run, 2026-08-25 22:00 → 2026-08-26

**Written for you, not for an engineer.** Every technical term is glossed the first time.

**Read this section and you have the night.** Everything below it is evidence.

---

## THE THIRTY-SECOND VERSION — final, 06:00

**Your demo data is safe and your demo fixes are live.** FutureBuild Academy is exactly as it was at
22:00: 13 contacts, 8 placements, 8 people, 8 training contracts, 3 timesheets, 0 incidents.
Placements and people **never moved at any point tonight.**

**Everything that needed to reach production before the freeze did, and I checked the behaviour
rather than the merge:**

- switching to a client now shows **that client's** logo and name, both light and dark — verified live
- **"0 apprentices placed" now reads 8** over your 8 real apprentices
- **"Total Contracts"** agrees with the list underneath it instead of counting the whole estate
- **two admin screens that returned an error for everyone** — team invitations and tester licences —
  now work
- six tables anyone signed in could read across clients are **scoped**, verified policy by policy

**One thing nearly went into production that should not have**, and it was caught: a shared layout
package with a breaking change was adopted by five apps at 01:10. It would have discarded every
saved layout across 1,729 cards. **Production never took it** — every app still runs the old version.

**Two things still want you** (§1), and neither is urgent enough to have woken you.

---
## §1 — THE TWO THINGS THAT NEED YOU

### 1.1 — Did you delete the 12 fake rows? *(now answered as far as the data can answer it)*

The tenant's own audit trail reads, in order:

```
14:40:14  INSERT  training_contracts  user = the shared test account (super admin / developer)
14:45:33  INSERT  training_contracts  user = the shared test account
15:23:51  DELETE  training_contracts  user = NULL
15:23:51  DELETE  training_contracts  user = NULL
```

**The deletions carry no user at all.** That means they ran on a direct database connection — the
Supabase console or a `psql` session — **not through the application**. Three lanes have each said it
was not them, and it was not me. If it was you at the console, this is closed and it was the right
call.

**A finding in its own right:** `contacts` has **no audit trigger**, so the 10 contact deletions left
no trace whatsoever. Only the 2 training contracts were recorded. **Deletions from your contacts
table are currently unauditable** — worth fixing, and not tonight's job.

**A second unattributed write**, same shape: a lane reports `profiles.current_tenant_id` was moved by
a direct `UPDATE` at 23:48 — **eight minutes after another lane had explicitly withdrawn that exact
statement as unsafe.** Also nobody's. Two service-role writes tonight that no lane claims.

### 1.2 — Your test suite writes to the live database. *(a decision)*

This is the real finding of the night and it is not a one-off.

**What happens:** crm7's automated browser tests run against your **production** Supabase project.
They sign in as one shared account and create contacts and training contracts through the real
screens. Which client those records land in is decided by that account's **server-side "acting as"
setting** — which any other session can change at any moment.

**How the 12 rows happened:** a lane switched that shared account to FutureBuild at 22:24 to do
*read-only* checks. Two of my own pull requests had test runs in flight. Their fixtures were created
inside FutureBuild. The lane never wrote anything — its one tenant switch redirected somebody else's
writes.

**The proof is exact, not circumstantial.** The 10 fake contacts were, verbatim, `Phase1 Tester`,
`Phase1Lead Linkable` ×4 and `Phase2 Primary` — **twice over**, once per concurrent test run. Those
are the literal strings inside `phase1-golden-path-fks.spec.ts` and `phase2-medium-fks.spec.ts`.

**How long this has been going on:** the demo organisation now holds **1,295 contacts**. It is a
demo org, so nobody noticed. That is months of accumulated test debris, and it is the same mechanism.

**The decision:** the tests need their own database. That costs money and a day of work, and it is
not a call to make unattended at 2am. Two cheaper steps have already been taken tonight: the suite
now refuses to write into a tenant it does not own, and a second change makes it **choose** its
tenant rather than inherit one.

---

## §2 — WHAT IS IN PRODUCTION NOW, AND PROVEN

Everything here was checked on the live site or the live database **after** it shipped — not merely
merged.

| what | why it matters | proof |
|---|---|---|
| **Anyone on the internet could ask whether a given account was an administrator** | An unauthenticated request could confirm which of your accounts hold admin rights — useful only to somebody targeting them | An unauthenticated request now returns **401 permission denied**. The security advisor reports **clean**. |
| **A broken export button in throughput** | Three download formats called a program that was never written | The shipped file now contains **zero** calls to it |
| **An American date on your admin screen** | `10/14/2025` where an Australian reads `14/10/2025` | Verified in the deployed build: **1** Australian format, **zero** unformatted dates |
| **The 555-route surface map** | Every screen in every app joined to the data behind it — and a gate that keeps it true | Live, and it caught real drift **within an hour** of being written |
| **The route inventory could not name 12 of its own routes** | Nine of them were the **unauthenticated** ones — the contract-signing and invitation links nobody had examined | Now 0 unnamed. Both signing links were tested live against invalid tokens: they return one identical message, so they cannot be used to discover which tokens exist |

**Also proven:** all 423 database tables have row-level security switched on — the rule deciding which
records a signed-in person may see. Not one table is left open.

---

## §3 — WHAT IS FIXED AND WAITING TO SHIP

These are finished and tested but **not yet in production**, because production is closed from 08:00
to 11:00 so you can spot-check a system nothing is changing underneath you.

| what | what you would have seen |
|---|---|
| **"0 apprentices placed"** over 8 real apprentices | The tile counted a field none of FutureBuild's placements use. Now reads **8**. |
| **"Total Contracts 401"** on a client with 8 | Summary tiles were counting the whole estate. Now **8**. Also affected dashboards, reports and analytics — one showed **$1,555,000 of another tenant's pipeline**. |
| **Cards totalling 7 while the same screen said 8** | The status list had drifted from what the database actually allows |
| **The white-label logo** | Switching to a client showed **your** logo, not theirs — it resolved the tenant you joined first rather than the one you are in |
| **Two admin screens that were completely dead** | Team invitations and tester licences returned an error for **everyone** — owner, super admin, all of it |
| **Six tables anyone signed in could read across clients** | All six are empty, so nothing leaked. Latent, not live. |

---

## §4 — THE ONE THING I WOULD NOT SHIP TONIGHT

A shared component package was rebuilt so cards stop drawing a box inside a box — a defect affecting
**1,729 cards across six apps**, and something you have asked about repeatedly.

**It is finished, and no app is using it.** That is deliberate. It changes how every card on every
page is laid out, and it discards saved layouts. Verifying that across six apps needs daylight and
your eyes, not four hours and mine.

**There is a live trap, and you should know about it before anyone runs a routine command.** The new
version was published with a version number that says "safe minor upgrade" when it is in fact a
breaking change. Every app's dependency rule *already accepts it*. **So any routine dependency
refresh, in any of the five apps, for any unrelated reason, silently ships the whole thing.**

A correction is in flight. Two proposed remedies were checked and **neither actually works** — the
version rule accepts the breaking version regardless. The only thing holding it is a standing
instruction that nobody run that command. **Please do not run a dependency install or lockfile
refresh in crm7, business-suite-unified, conduit, braden or throughput until this is closed.**

---

## §4b — TWO DEMO-VISIBLE THINGS I DELIBERATELY DID NOT CHANGE

Both are cosmetic, both were reported, and in both cases changing them at 00:00 would have been the
wrong call for a reason worth stating.

**The footer says "A Braden Group Company" on a white-labelled client's screen.**
`crm7/src/components/layout/CRM7Footer.tsx:79` — hardcoded, linked to braden.com.au, with no
awareness of tenant branding at all. On FutureBuild's own view, your company name appears on their
system.

**That is a commercial decision, not a technical one.** Plenty of software shows vendor attribution
deliberately, and whether yours should disappear when a client white-labels is your call about your
brand and your contract — not something to settle unattended. The fix is one condition (*suppress it
when the tenant has its own company name set*) and it takes minutes once you have decided. **Say the
word and it is done.**

**The install prompt was reported as covering the first row of a list.** I looked, and it is
anchored to the **bottom** — `bottom-20` on mobile, `lg:bottom-6 lg:left-[17rem]` on desktop — and
that placement already carries four tests, written deliberately to keep it off the bottom-right
submit corner and off the sidebar. Somebody has already thought about this carefully.

So either the report was from a narrow viewport where a bottom overlay still covers content, or it
was something else on screen. **Changing a tested, deliberate placement on the strength of a report I
could not reproduce would be the wrong trade** — I would be replacing a considered design with a
guess, hours before you demo on it.

---

## §4c — THE ONE THAT NEARLY WENT WRONG, AND HOW IT WAS CAUGHT

**Nothing here reached production. This is a near-miss, written up because the near-miss is the
useful part.**

The shared layout package was rebuilt so cards stop drawing a box inside a box — the thing you have
asked about repeatedly. It is a **breaking** change: it turns card frames off by default, halves the
default card width, and **discards every saved layout**, across 1,729 cards in six apps.

It was deliberately held back, by the lane that built it and by me, so it could be looked at in
daylight.

**At 01:10 an app adopted it anyway** — not carelessly. It was clearing a red gate, and the gate's
own advice says the fix is *"zero risk"*. **The gate says that because the version number told it
so.** A checker that reads version numbers cannot see that a major release is a redesign. **Three
separate lanes were pointed at that same advice tonight.**

Within the hour four more apps had followed. All five had it on their working branches.

**What caught it:** crm7 has a contract test that fails when the *definition of a card* changes. It
flagged two files — neither of which had been edited since March. *The files did not change; the
definition of a card did.* **The other four apps went green**, because nothing in them can see that
kind of change. Their green meant nothing.

**What I did:** reverted crm7, blocked the two pull requests that would have carried the rest into
production, and re-checked every app's production branch by hand. **All five still run the old
version.** Production never took it.

**The real fix is not a stricter instruction.** A standing "do not do this" was already written, and
three lanes walked past it — because the tool told each of them it was safe. The gate needs to know
that a major version bump on a package with 1,729 consumers is never routine. **That is a daylight
job and it is the most useful thing to come out of tonight.**

**Still binding until then:** please do not run a dependency install or lockfile refresh in crm7,
business-suite-unified, conduit, braden or throughput.

---

## §4d — WHAT IS IN PRODUCTION AND PROVEN BY BEHAVIOUR, NOT BY MERGE

Re-checked at 06:00, on the live database and the live site.

| what | how it was proved |
|---|---|
| **The client's logo and name** now follow the client you are viewing | resolver queried live as a developer acting as FutureBuild: returns **FutureBuild Academy**, with **both** light and dark logos |
| **"0 apprentices placed" → 8** | all 8 of their placements carry the identifier the tile now reads |
| **"Total Contracts"** matches its list | measured as a real tenant user, not as an operator whose reach hides the bug |
| **Team invitations + tester licences** work | the read that used to fail for *every* role now returns rows |
| **Six cross-client-readable tables** scoped | every SELECT rule re-read from the live database, one by one |
| **Migrations actually applied** | the ledger, not the green run — a merged-but-unapplied migration left two screens dead for hours tonight |
| **Data intact** | 13 · 8 · 8 · 8 · 3 · 0, identical to 22:00 |
| **Site up** | production returning 200, no runtime errors |

---

## §5 — WHAT I GOT WRONG

Recorded because it is the part worth reading.

| I said | actually | how |
|---|---|---|
| "The export button fails for every user, every time" | The branch is unreachable — those buttons were already disabled, live | I read the code and the deployed function list and inferred what a user would see. I never opened the page. **The guard was one component away.** |
| "Zero tables have security on with no rules" | **Eleven** — and all eleven are correctly locked to the server | I ran a query counting a *different* category, then wrote a sentence about this one |
| "The route inventory is schema 3" | It is **1.1** | I printed the field's type and never its value |
| `created_by` being empty proves a script wrote those rows | It proves nothing — that column has no default, so the ordinary screens leave it empty too | Another lane caught it. I spent an hour on the wrong suspect. |
| A guard requiring tenant membership before showing branding | Would have **broken the exact case it was meant to fix** — a platform developer supporting a client is *supposed* to act as a tenant they do not belong to | My negative test asserted the wrong behaviour and passed convincingly while doing it |
| My branding fix was needed | **It duplicated another lane's**, used the wrong tenant resolver of three, shipped no tests, and had a higher version number so it would have silently overwritten the better one | I never checked for an in-flight change to the same function. Closed. |

| a guard requiring tenant membership before showing branding | would have **broken the exact case it was meant to fix** | a platform developer supporting a client is *supposed* to act as a tenant they do not belong to. My negative test asserted the wrong behaviour and passed convincingly while doing it. |
| my branding fix was needed | it **duplicated another lane's**, used the wrong tenant resolver of three, shipped no tests, and had a **higher version number** so it would have silently overwritten the better one | I never ran `gh pr list` before writing a migration against the same function |
| "35 edge functions have no caller" | **6** | I counted callers only in code a *screen* can reach — the wrong denominator for a question about background programs |
| 26 rows in the route map needed review | **15**, and I nearly dismissed all 26 | I listed every rule appearing on those rows and saw benign ones. None of them were the rules that actually drove the verdict. Filtering the way the check itself filters left three tables, one of them a genuine defect. |
| the wordmark's low contrast was a defect | **it is exempt** | brand names have no contrast requirement, and you set that colour deliberately in July. I had the fix written and did not ship it. |

**And a collision I caused:** two migrations were written with the same version number. This estate
keys them on the number alone, so the second would have looked applied and silently never run — a
ledger row saying there is no problem. Caught before either shipped; mine renumbered.

**My instruments were wrong three times before they were right**, including once where the bug was
*hiding* a real finding. Details in `docs/20260826-route-surface-map-v1.00W.md` §7.

---

## §6 — WHAT WAS DECIDED WITHOUT YOU

All four under the pre-authorised rulings, all reversible on your word. Detail in
`docs/20260826-four-decisions-for-braden-v1.00D.md`.

**Two were smaller than the register said:**

- **Permissions.** The register said *"4 of 7 tenants have no permissions configured"*, which reads
  as a live gap in a customer's system. It is not. **Every organisation with real people in it has a
  full matrix** — Braden Group 540 rows, FutureBuild 486, Lookn 378. The four empty ones are a demo
  org, your own platform org, and two automated-test fixtures. The real question — what a *new*
  client starts with — remains, and the safe answer shipped: read-only, pre-filled but unsaved,
  nothing granted until a human presses Save.
- **601 lines of dead code.** Confirmed with three separate probes, the second of which was **wrong
  in the direction that gets working code deleted**. Deleted; the recovery command is in the commit.

**Two were parked, deliberately:**

- **R8's charge-rate push** — built, deployed, and nothing calls it because R8 has no server side.
  Three options written up with a recommendation. Architecture with money implications is not an
  unattended call.
- **What "trade" means for MA000036 (Joinery)** — only you know this. The question is recorded
  precisely so it is not asked again in a vaguer form.

---

## §7 — STILL OPEN, AND EXACTLY WHERE EACH STOPS

| item | state | the unblock |
|---|---|---|
| Demo fixes (tiles, logo, statuses) | **fixed, tested, in review** | The test suite is red on every branch for a reason unrelated to any of them — being fixed now |
| Card layout inversion | **finished, deliberately unadopted** | Your eyes, in daylight, across six apps |
| Package version correction | in review | Publishes on the next promotion |
| Tests writing to production | mitigated twice, not solved | §1.2 — your decision |
| Deployed programs nothing calls | **CLOSED — it is 6, not 35** | The 35 counted only what a *screen* reaches. A wider sweep found 16 called from services or other functions, 9 on a schedule, 3 by outside systems, 1 an OAuth redirect. **Six are reached by nothing** — four built and never wired, and two still *running in production whose source has been deleted from the repository* (`mapd-sync`, `timesheet-reminders`). |
| 82 tables that are empty and unread | recorded | About a fifth of the schema is scaffolding. Several are money-shaped. |

---

## §7b — MEASURED, AND DELIBERATELY NOT CHANGED

Four things were found, verified, and left alone. Each is a sentence away from being done if you
disagree.

- **The footer says "A Braden Group Company" on a white-labelled client's screen.** That is a
  commercial decision about your brand and your contract, not a technical one. One condition fixes it.
- **The wordmark's gradient measures below the accessibility threshold in light mode.** Brand names
  are **exempt** from that rule, and you chose that colour in an explicit directive in July.
- **American spellings in the interface** — "organization-wide settings" sits directly under a card
  correctly titled "Organisation Settings". Real, but **11+ instances**, and my search only reads
  visible text, not button labels — so 11 is a floor. Fixing two of eleven is the failure your own
  D-62 ruling names.
- **An install prompt reported as covering a list.** It is anchored to the *bottom* and its placement
  already carries four tests written to keep it clear of things. I could not reproduce the report, and
  replacing a considered design with a guess before a demo is the wrong trade.

## §7c — THE RESIDUE, STATED HONESTLY

- **~36 further screens** with the same "counts the whole estate" shape as the tiles that were fixed,
  plus **~50 files** where a count comes from the length of a list rather than a count query —
  invisible to the search that found the others, and explicitly **unaudited**.
- **6 background programs nothing calls.** Four were built and never wired up. **Two are still
  running in production and their source has been deleted from the repository** — nothing would show
  up in a code review if they broke.
- **82 tables that are empty and unread.** About a fifth of the schema is scaffolding; several are
  money-shaped.
- **A live "acting as" setting** pins your super-admin account to **bsuite Platform until 11:00** —
  through the demo. Switching tenants in the app clears it. Worth doing before 09:30 rather than
  discovering at 09:29.

## §8 — HOW TO CHECK ME

```bash
scripts/prod-window.sh                       # is production open right now
node scripts/check-route-surface-map.mjs     # every screen still mapped to its data
```

`docs/nav/route-surface-map.csv` opens in a spreadsheet — 555 rows, one per screen, sortable by verdict.

**A short honest list beats a long false one.** Nothing above is described as done unless it was
checked on the live system, and everything I could not prove is named as unproven.
