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

## THE THIRTY-SECOND VERSION

**Your demo data is safe.** FutureBuild Academy is back to exactly what it was at 22:00: 13 contacts,
8 placements, 8 people, 8 training contracts, 3 timesheets. Placements and people **never moved at
any point.** All eight placements were confirmed rendering **with their fields populated**, in light
and dark, at two screen widths.

**Two things need you.** One is a question I could not answer, one is a decision I would not make
alone. Both are in §1.

**The biggest thing found tonight was not on any list:** your continuous-integration test suite
writes to the **live production database**, and which client's records it writes into depends on what
somebody else did seconds earlier. That is how 12 fake rows got into FutureBuild. They have been
removed. The underlying cause has not.

---

## §1 — THE TWO THINGS THAT NEED YOU

### 1.1 — Did you delete the 12 fake rows? *(a question, not a decision)*

Between 23:14 and 23:33 the 10 fake contacts and 2 fake training contracts vanished from FutureBuild.
The tenant is now back to its exact original counts, and **nothing real was touched** — every
surviving contact was created in May–August, none tonight.

**Three lanes have each stated it was not them.** I did not do it. So either you did, or a lane did
it without saying so. If it was you, this is closed and it was the right call. If it was not, then
something deleted from a real client's tenant unattended, and that is worth knowing about.

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
| 35 deployed programs with no caller | **counted, not classified** | Several are legitimately run on a schedule. Saying which is real work nobody has done. |
| 82 tables that are empty and unread | recorded | About a fifth of the schema is scaffolding. Several are money-shaped. |

---

## §8 — HOW TO CHECK ME

```bash
scripts/prod-window.sh                       # is production open right now
node scripts/check-route-surface-map.mjs     # every screen still mapped to its data
```

`docs/nav/route-surface-map.csv` opens in a spreadsheet — 555 rows, one per screen, sortable by verdict.

**A short honest list beats a long false one.** Nothing above is described as done unless it was
checked on the live system, and everything I could not prove is named as unproven.
