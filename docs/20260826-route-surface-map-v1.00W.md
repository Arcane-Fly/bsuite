---
kind: measurement
authority: agent
owner: bsuite
evidence:
  - scripts/check-route-surface-map.mjs
  - .github/workflows/route-surface-map.yml
  - docs/nav/route-surface-map.json
  - docs/nav/route-surface-map.csv
  - scripts/build-surface-map.mjs
  - docs/nav/route-inventory.json
---

# THE 553-ROUTE SURFACE MAP — every screen joined to the data behind it

**Measured 2026-08-25/26, against production.** One row per route, 553 rows, no row left blank.

**Plain-English glossary, used throughout.** *Route* = one address in one of the apps, e.g.
`/placements`. *Table* = one store of records in the database, e.g. `placements`. *RLS* (row level
security) = the rule Postgres applies to decide which rows a signed-in person is allowed to see; it
is what stops one client seeing another client's records. *Edge function* = a small program that
runs on Supabase's servers rather than in the browser, used for things the browser must not be
trusted with. *Tenant* = one client organisation inside the system (FutureBuild Academy is one).

---

## §1 — WHAT WAS ACTUALLY MISSING, AND IT WAS NOT THE ROUTES

`docs/nav/route-inventory.json` already listed all 553 routes, and already carried two fields on
every one of them — `data_tables` and `owned_entities`.

**Measured 2026-08-25: both were empty on all 553.**

So the inventory could answer *"what screens exist"* and could not answer *"what does this screen
read, and who is allowed to read it"*. The schema promised the join; nothing ever filled it. The
previous sweep covered 47 routes — 8%. **Enumeration is not coverage.**

This document and `docs/nav/route-surface-map.json` fill it.

---

## §2 — THE LEDGER

| app | routes | mapped clean | redirects | no data path | needs review | live bug | unresolved |
|---|---:|---:|---:|---:|---:|---:|---:|
| crm7 | 399 | 331 | 30 | 6 | 23 | 0 | 9 |
| business-suite-unified | 76 | 56 | 13 | 5 | 1 | 0 | 1 |
| conduit | 37 | 24 | 7 | 6 | 0 | 0 | 0 |
| braden | 20 | 9 | 3 | 7 | 0 | 0 | 1 |
| throughput | 18 | 10 | 1 | 4 | 2 | **1** | 0 |
| R80.4 | 3 | 1 | 0 | 1 | 0 | 0 | 1 |
| **TOTAL** | **553** | **431** | **54** | **29** | **26** | **1** | **12** |

**Coverage: 553 of 553 — 100%, up from 47 (8%).** The 12 `unresolved` rows are *named and listed*
(§6), not blank. "Checked nothing" and "found nothing" are recorded as different answers, because a
map that cannot tell them apart is not a map.

Each row carries: route · app · authentication · component · component file · data hooks · tables ·
RLS posture per table · tables reached only through shared page furniture · database functions ·
edge functions · whether each edge function is actually deployed · tenant-scoped · verdict.

---

## §3 — THE ASYMMETRIES. Every one of these is a mismatch between two halves that should agree.

### 3.1 — An edge function with no caller: **35 of 74 deployed functions**

Seventy-four edge functions are deployed and running on production. **Forty have a caller somewhere
in the six apps. Thirty-five do not.** The known example (`r8-charge-rate-push`) is one of thirty-five.

This is not automatically waste — several are legitimately called by a schedule, a webhook from an
outside system (Xero, Adobe Sign, Fair Work), or by another edge function, and those are not
"uncalled". **That separation is the outstanding work on this finding, and it is named as
outstanding rather than reported as a result.** What is certain is the count: 35 deployed programs
have no caller in any app's front end.

### 3.2 — A caller with no function: **1, and it is a live bug**

`throughput/src/pages/Export.tsx:106` calls an edge function named `export`. **No function by that
name is deployed.** The export control on `/ideas/:id/export` therefore fails for every user, every
time. A fix is in flight tonight.

### 3.3 — A data path no screen reaches: **99 tables, narrowed to 82**

The database has 423 tables. **236 are reached by at least one route.** Of the remaining 187, 192
are touched by a database function and 94 by an edge function (these overlap), leaving 99 that
nothing this scan could see reaches at all.

Fifteen of those 99 **hold rows** — reference data such as occupation lists and award titles. A
table with 1,023 rows is being read by something; **that is a statement about the blind spot in my
scan, not a finding about the estate**, and it is recorded as such.

**That leaves 82 tables that are empty AND have no reader.** Roughly a fifth of the schema is
scaffolding that was built and never wired up. Several are money-shaped — `invoice_runs`,
`payroll_runs`, `pay_periods`, `credit_notes`, `purchase_orders`, `host_charge_rates`,
`r80_margin_policies`. An empty unread table is not itself a defect; it is a promise the product
has not kept yet, and it is the honest size of the gap between the schema and the working product.

### 3.4 — RLS enabled with zero policies, and RLS off entirely: **ZERO of both**

Checked, and this one is clean. **All 423 tables have row level security switched on.** Not one
table is left open. This is a negative result and it is worth stating plainly, because it is the
category that would have been most serious.

### 3.5 — Permission granted to the anonymous (logged-out) role: **not the finding it looks like**

319 tables grant a logged-out visitor permission to read, and 303 grant permission to write. **That
sounds alarming and is not, and I nearly reported it as though it were.** Row level security is on
for all 423, and only 21 tables carry any policy that admits an anonymous visitor at all — so for
the other ~300 the grant is inert: the request arrives and the security rule refuses it.

I read all 21 of those policies. Every one is deliberate and correctly narrowed — published content
only, active services only, this-tenant-only, or a flat `false` (deny). **No finding.** The grants
should still be tidied as defence-in-depth, because they mean one mistaken policy is the only thing
between a stranger and a table, but that is housekeeping, not an exposure.

---

## §4 — THE SIX REAL EXPOSURES, AND WHY THEY ARE LATENT RATHER THAN LIVE

A security rule can be written so that it always says yes. Six tables have one, **and every one of
them carries a `tenant_id` column — meaning they are meant to hold one client's records separately
from another's.**

| table | what the rule permits | what it holds today |
|---|---|---|
| `award_rates` | any signed-in user, **read AND write**, any tenant | **0 rows** |
| `charge_calculations` | any signed-in user, read and create, any tenant | **0 rows** |
| `host_contracts` | any signed-in user, **read AND write**, any tenant | **0 rows** |
| `whs_records` | any signed-in user, **read AND write**, any tenant | **0 rows** |
| `award_rate_cache` | any signed-in user, read, any tenant | **0 rows** |
| `financial_viability_snapshots` | any user holding the `gto_admin` role **in any tenant** | **0 rows** |

**All six are empty. Nothing has leaked, because there is nothing in them to leak.** That is the
honest framing and it is the difference between a breach and a latent defect. It stops being latent
the day someone saves the first record.

The last one is worth its own sentence, because it is the subtlest. Its rule calls `is_gto_admin()`
— a check with **no tenant argument**, which asks only *"is this person a GTO administrator
anywhere?"* There are four such administrators, in four different organisations. Six other policies
in the database call the same tenant-blind check but **also** require the record to belong to your
own organisation, so they are safe. This one does not. A correctly scoped version of the same check,
`is_gto_admin(tenant_id)`, **already exists** — so the fix is one line, on an empty table, with no
migration risk.

---

## §5 — WHAT THIS SCAN STRUCTURALLY CANNOT SEE

Stated because a measurement that does not name its blind spots reads as complete.

- **A table named at run time.** `from(someVariable)` is counted as *unresolved*, never as "no data
  path". Those are different answers.
- **A table reached through a generic factory** whose argument arrives from a caller two files away.
  The estate has 364 such call sites; the factory is recorded, the concrete table is not. This is
  the most likely reason a table with 1,023 rows appears to have no reader.
- **Dynamic imports whose target is not written out literally.**
- **Whether RLS is actually correct.** This reads the rules that exist. A rule that exists is not a
  rule that is right — that is the red team's job, and it is running.
- **Anything past 4 import hops or 260 files** from a page. 13 of 553 routes hit that ceiling and
  are flagged in the data.

---

## §6 — THE TWELVE UNRESOLVED ROWS, NAMED

The route inventory itself records `Unknown` (or a structural placeholder) as the component for
these, so there was nothing to follow. They are being filled in tonight.

`crm7` — `/` · `/auth/accept-invite` · `/auth/callback` · `/auth/logout-sync` ·
`/auth/reset-password` · `/auth/xero/callback` · `/hosts/agreements/sign/:token` ·
`/portal/accept-invite/:token` · `/quotes/sign/:token`
`business-suite-unified` — `/settings/branding` (a redirect) · `braden` — `/admin` (a layout
wrapper) · `R80.4` — `/`

**Nine of the twelve are logged-out or link-authenticated routes** — the contract-signing and
invitation links. Those are precisely the addresses a route inventory that says "Unknown" has never
examined, which is why they are being resolved rather than closed.

---

## §7 — HOW THE INSTRUMENT WAS WRONG THREE TIMES BEFORE IT WAS RIGHT

Recorded because the estate's own rule is that the first run of a detector usually measures the
detector. All three were caught before anything was reported.

1. **369 phantom cross-tenant findings.** The classifier ignored *which role* a security rule was
   granted to, so it read `TO service_role USING (true)` — the correct, expected shape for a trusted
   server key — as "anyone can read everything". Fifteen tables were wrongly condemned.
2. **360 of 553 rows were the same measurement repeated.** crm7 declares its pages across several
   lines and sometimes wraps the import in a retry helper; a single-line pattern matched **neither**,
   so 360 routes silently fell back to the app's own root file and were each credited with every
   table in the whole app. Median files examined per route went from 260 (the ceiling) to 49 once
   fixed, and the map's reach rose from 141 tables to 236.
3. **A real finding was hidden by the third bug.** Postgres rewrites `auth.uid()` inside a rule as
   `( SELECT auth.uid() AS uid)`, so a pattern written against the *authored* form matches none of
   them. That is what concealed `award_rates` — read and write, any signed-in user, any tenant —
   until the text was normalised first.

**Two of the three inflated the findings; one suppressed a real one.** That is why an instrument has
to be red-teamed in both directions, not only for false alarms.

---

## §8 — THIS IS A GATE NOW, NOT A SNAPSHOT

A document records a state; only a gate holds one. `scripts/check-route-surface-map.mjs`
runs on every pull request via `.github/workflows/route-surface-map.yml` and enforces three things:

| | what it holds |
|---|---|
| **R1** | Every route in the inventory has a row in the map. A route added without being mapped is a screen nobody has traced to its data — and it is invisible *because* it is new. |
| **R2** | Every row carries a verdict from the closed vocabulary, and an unresolvable row says `UNRESOLVED`. **A blank verdict is a FAIL, not a pass.** |
| **R3** | Every edge-function slug invoked from app source is in the deployed list. This is the live class — the `export` bug above. |

**It self-tests before it is trusted.** Three known-bad fixtures — an unmapped route, a blank
verdict, a missing input file — and it must reject all three. A gate that has never been shown to
fail is not evidence that anything passed.

**R3 is ratcheted, not switched off.** It is red on one real bug today. A *new* un-deployed slug
fails immediately; the known one is counted and tolerated until it is fixed. And the gate **also
fails if the known bug is fixed and the ratchet is not tightened** — a ratchet nobody tightens is a
permanent exemption wearing a gate's name.

**What the gate deliberately does not check:** RLS posture and table reachability need live database
credentials, which CI does not have. Checking them there would mean committing a stale copy of
production's security state, or skipping silently — and *a gate that skips what it cannot reach
reports coverage it does not have*. Those stay in `scripts/build-surface-map.mjs`, run by hand.

### Re-running it

```bash
node scripts/build-surface-map.mjs      # walks the routes, joins to live DB metadata
node scripts/export-surface-map.mjs     # writes docs/nav/route-surface-map.{json,csv}
node scripts/check-route-surface-map.mjs --self-test
node scripts/check-route-surface-map.mjs
```

The CSV opens in a spreadsheet: 553 rows, one per route, sortable by verdict.
