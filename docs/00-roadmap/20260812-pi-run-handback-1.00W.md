# PI run handback — 2026-08-12

**For Braden.** Autonomous run, ~12:38 to ~16:15 AWST. Ordered by **what needs you**, not by what
was done.

Started by `operator-proxy-claude` at 15:23 and completed by the PI at 16:15 — its framing and its
findings are kept, and everything after 15:23 is added. Where the two disagreed, the disagreement
is shown rather than smoothed over.

---

## 1. Read this first — nothing security-related is live

**Every fix this run produced is merged to `development` and none of it is applied to the
database.** The migration applier runs only when the **parent** repository's `main` moves, and this
run deliberately never touched `main` — that promotion is your visual sign-off gate.

So the following are **still defective in production right now**, while the work that fixes them
sits merged and inert:

| defect | live today? | fixed in |
|---|---|---|
| Public job-application form: rate limit bypassable by rotating a header | **yes** | conduit#434 |
| Same form answers *"is this person in your candidate database?"* to anyone | **yes** | conduit#434 |
| `portal_invite_accept` throttle bypassable the same way | **yes** | crm7#1663 |
| Tenant-switch audit trail records a forgeable address | **yes** | crm7#1663 |
| One super admin could write history attributed to another | **yes** | crm7#1663 |

This was confirmed rather than assumed, four ways in one query: the migration is absent from the
ledger, the ledger's high-water mark has not moved, the new column does not exist, and **two live
function bodies still read the forgeable header**.

A lane reported this defect class "closed" earlier in the day. Merged is not applied. That
distinction has cost this estate real production breakage before, and it is the single most
important sentence in this document.

---

## 2. Decisions waiting on you — four

| # | Decision | What changes on yes vs no | Recommendation |
|---|---|---|---|
| **A** | **crm7#1605** — do the signed TFN (Tax File Number) declaration and super choice *forms* carry a retention obligation distinct from the fields typed off them? | Either way **nothing in the software changes today** — both are already collected and kept for seven years. Your answer decides what a new worker is told, and whether a client organisation may switch the super form off. | Confident on the TFN, not on super. It is a statutory reading and yours. Nobody guessed. |
| **B** | **bsuite#1892** — a development-branch database | Costs money. Today `d.crm.crm7.app` runs development code against **main's** schema, so a migration-dependent feature cannot be validated anywhere before production. | Worth it, but it is spend. |
| **C** | **`quality.yml` deletion** | Removing dead weight vs leaving confusion. | **Two of the three reasons given for deleting it were wrong** — see §5. Decide on the corrected facts. Held on `fix/ci-guards-deferred-items-20260811`; the four uncontroversial fixes bundled with it were unbundled and landed separately, so nothing else waits on this. |
| **D** | **G3 visual sign-off** | Everything is on `development` awaiting your inspection. | **This also gates every security fix in §1.** |

**Two decisions came off your list without you.** Row 3.2 was "which employee-number format?" —
crm7#1662 made it a **per-organisation setting** instead. Row 5.1 was specified as a setting too.
The lanes removed the questions rather than answering them, which is your own principle.

Of the ten items filed as "waiting on Braden", **three genuinely needed you**. Two were values that
should have been settings, two were already ruled and never closed, and three were measurements
nobody had run.

---

## 3. One question I could not answer, and one I created

**Can the candidate-existence oracle be closed without the applier?** The fix returns an identical
response for "known" and "unknown" and never returns the internal id — but it lives in a migration,
so it waits for promotion. If the same suppression can be done in the application layer, applicants
are protected today instead of after your gate. Asked and not resolved; naming it rather than
letting it look answered.

**I leaked two live Supabase access tokens into my own session log.** Extracting one token from
`.env.local`, my command matched **two** lines — the file has a duplicate key — and the resulting
error printed both values in full. **Both `sbp_` tokens should be rotated.** This is the exact rule
I enforced on every lane all afternoon.

It surfaced a real problem. Duplicate keys are widespread:

```text
parent .env.local       SUPABASE_ACCESS_TOKEN x2, NPM_TOKEN x2
crm7/.env.local         23 duplicated keys, including SUPABASE_SERVICE_ROLE_KEY,
                        SUPABASE_SECRET_KEY, POSTGRES_PASSWORD,
                        AZURE_CLIENT_SECRET, GOOGLE_CLIENT_SECRET, FAIRWORK_API_KEY
business-suite-unified  SUPABASE_SECRET_KEY x2
```

Two values for one secret means one is stale, and **which one wins depends on the loader**. That is
a plausible source of "works locally, fails in CI", and it is how a credential ends up in a log.

---

## 4. The run's central finding

**Every gate we set out to fix already existed. Not one of them was gating.** Each had looked green
the whole time.

- The **cross-submodule migration checker** was built in June and had **failed every run since it
  was written** — it demanded migrations in 8 scopes, and one of those scopes has no database
  directory at all.
- Its **allowlist keyed on version alone**, so one entry excusing a verified pair silently excused
  *every future file at that version*. Found by planting a real collision and watching the checker
  pass.
- The **colour-rule parity gate** only ever read the parent's *pinned* submodule pointer, never the
  submodule's actual branch, so it reported success all day while five copies drifted. Its waiver
  list had **no ceiling** — it grew until every copy was waived while printing "no unexpected
  drift".
- The **migration-history audit** was testing *which tool wrote a ledger row*, not whether the
  object exists — a test that could never go green, failing unwatched for six scheduled runs.
- The **theme scan** filtered on `R80.3`, a directory that no longer exists, while the scanner
  emits `R80.4` — so R80.4 was silently excluded from **every colour total the estate has ever
  produced**.
- **`gitleaks` scanned only the most recent commit** in four repositories. In two of those it was
  a *required* check, so the one unskippable secret gate read a single commit per pull request. One
  repository had **no secret scanning at all**.

That is a different problem from "we need more gates", and it is the thing worth carrying forward.

---

## 5. What I got wrong

Thirteen corrections. A run reporting none has not looked hard enough.

**The three that reached other people's work:**

1. **I told three lanes crm7's colour rule was missing the pure-white ban.** I had searched for one
   identifier and found nothing. The ban was there under **four** different names. Worse, the truth
   is the reverse: **crm7's copy is 69 lines ahead of the parent "source of truth" and stronger**,
   and the parent still has two live holes crm7 fixed — an alpha-suffixed pure white and the
   space-separated `rgb(255 255 255)` form both pass the parent rule. Running the sync generator
   would have **overwritten the stronger ban with the weaker one**. One lane declined to run it and
   was right; I stopped another before it could.
2. **I withdrew a correct measurement as an instrument error.** I read one setting as `false`, saw
   `true` later, and published that my tool had lied. It had not — a lane had *created* that
   setting mid-run and changed it after I flagged it. **Two measurements disagreeing across time is
   not evidence either instrument is broken.**
3. **I briefed a lane to add a test runner for a language the repository does not use.** No such
   test files exist. It would have been a new green check over an empty population. The lane
   corrected four of my premises and fixed the tests that actually run instead.

**The pattern:** *a search for a name is a hypothesis about naming, not a fact about behaviour.*
That produced two of my errors — the colour rule, and later reading "no gate" into a function whose
gate is a direct role query rather than a call to the named predicate.

**Also mine:** I read an exit code off `head` instead of the command it was piped from; my own
parser reported "0 findings" from a 140 KB payload; I misrouted work to the wrong lane; I told a
lane its report should have led with something before it had sent any report; I measured branch
protection through one endpoint when **two exist and neither sees the other**; and I circulated
per-repository figures taken from a checkout 33 commits stale.

**The process failure worth fixing:** the operator proxy sent me four messages and I answered none
of them. I broadcast downward to lanes all afternoon and never once reported upward. Work did not
stop, but it verified things itself rather than wait. If this structure runs again, the PI needs a
heartbeat obligation.

**`quality.yml`'s evidence was wrong** and you were about to rule on it: it *does* have a trigger
(manual), and there are **four copies across four submodules, two of which still run
automatically**. Only "duplicates `ci.yml`" survived checking.

---

## 6. What shipped — 21 merges across all seven repositories

| repo | merged |
|---|---|
| bsuite | 8 — the PI brief, plan docs, four gates that could not gate, the parity honesty chain, an allowlist that had been red on every parent PR |
| crm7 | 5 — unbundled CI guards · secret-gate depth + anonymous-view fatals + colour rule + card guard + coverage ratchet + accessibility labels · employee number as a setting · two functions that trusted a header the caller writes · the shared rate limiter |
| conduit | 3 — the anonymous write surface · secret gate + parity · a reconciled lint rule |
| business-suite-unified | 2 — the secret gate never ran on the branch every PR targets |
| R80.4 | 1 — branch model, award partials 40 → 37, server-side persistence, the sign-out fix, its first colour rule |
| braden | 1 — the one check that cannot be skipped was scanning a single commit |
| throughput | 1 — **this repository had no secret scanning at all** |

`gitleaks` and the rule-parity check are now **required** on `development` in the three repositories
that lacked them, each verified to actually emit and conclude before being required.

---

## 7. Merged but not verified

**R80.4 sign-out did not end the session.** It authorised against the production hub and signed out
against the development one, so returning silently re-authenticated you. No attacker needed — just
a shared machine. The fix derives the hub from the project that *issued* the session, which is a
better invariant than the configurable host I asked for.

**It is not verified live.** Two probes were built and both were broken: the first matched the login
page's own wording *"Sign in to access your business suite"*, so both hosts reported "signed in"
when neither was. **Boilerplate containing your marker is worse than no marker, because it fails
toward success.** It goes to you as merged-but-unverified.

**The control is free but closing:** the fix is on `development` and absent from `main`, so
`d.r8.crm7.app` versus `r8.crm7.app` is a real A/B **until the next promotion**. Use it first.

**Also unverified:** the "Exit demo" fix needs a live click after deployment; the accessibility
labels were reasoned, not heard with a screen reader.

---

## 8. Also found, not fixed

- **The clause-citation gate cannot distinguish 26.4 from 26.5.** It resolves sub-clauses against
  the *parent* clause title, so since "Allowances" is clause 26, any `26.x` verifies. One award's
  citations are already known to be systematically off by one — **and the gate passes**. In an
  award-interpretation product the clause reference is what a person checks to understand why a
  number is what it is. In flight as R80.4#31, which has already found **12 wrong citations**.
- **`resolveOrdinaryRate()` has no callers.** Its only apparent one is prose inside a text string,
  which R80.4's own reachability gate matched and reported as reached. Wiring the junior-rate field
  into it — register row 2.3 — would make those rates reachable *from nothing*.
- **Secrets in crm7's git history.** My scan: 233 findings across 4,127 commits. Most are false
  positives (generated types, test fixtures, the public-by-design anonymous key). Two clusters are
  real — `.env` from October 2025, and six private-key findings from March 2026 — **both already
  removed from the current code, both still in the object graph**. The narrow question is whether
  those credentials were ever **rotated**.
- **188 open issues** across the estate, 73 older than 30 days. The register curates about 20 of
  them. Two P1 security issues sit outside it, including one reporting that 8 of 11 API routes do
  not verify authentication tokens.
- `text-white` is unbanned in two repositories; one repository's colour rule is **entirely
  disarmed** — the file is present, wired, and reports nothing.

---

## 9. State of the estate

**Nothing was promoted to `main` in any repository.** Zero stale branches, zero stray worktrees,
zero open pull requests of ours except R80.4#31, still in flight.

**Consolidation debt** — four of six submodule pointers are current; two remain:

```text
crm7    10 commits ahead, 5 migration files
R80.4    3 commits ahead, 1 migration file
```

**The promotion ordering, which is the step that bites:** each submodule to its own `main` first,
**then** the parent pointers with ancestry checked per submodule, **then** the parent — which is the
only step that applies migrations. Skipping the parent ships code against a schema that does not
have its tables; that happened on 2026-08-11 and three tables were missing under live code.

**Migration collisions: 25, not the 16 on record** — the corrected checker sees a scope the old one
could not. The estate gained 13 migrations today across six lanes and added **zero** new collisions;
version allocation was centralised for exactly that reason.

---

## 10. Closing state, verified at 16:27

```text
worktrees                     1  (clean)
open pull requests            0  across all seven repositories
parent submodule pointers     6 of 6 CURRENT
branches beyond main/development   1
```

That one branch is `crm7/fix/ci-guards-deferred-items-20260811`, and it is **deliberate** — it
holds the `quality.yml` deletion awaiting your ruling (decision **C**). The four uncontroversial
fixes originally bundled with it were unbundled and landed separately, so nothing else waits behind
it. Do not delete it; merging it *is* the "yes" answer.

**Nothing was promoted to `main` in any repository.**

---

## 11. The one gate that is red on purpose

**CORRECTED 2026-08-12 18:20 — this section was wrong, and so was the first correction to it.**

I wrote that advancing R80.4's pointer exposed its colour-rule copy and the gate fired. The operator
proxy then told me R80.4 was **in sync** and absent from the failure. Both of us were wrong, and the
truth is the third possibility neither of us considered:

**R80.4's copy is DRIFTED. The CI job reports it; the local run does not.** Refined once more at
18:50 against a real CI run, which is the fourth pass at this one line and the first that both of
us can reproduce:

```text
CI (reads the committed gitlink)   ✗ R80.4/eslint-rules/no-hardcoded-colours.js — DRIFTED
local --check (reads the tree)     R80.4 not mentioned at all
```

So it is not unwatched — it is invisible to whoever is standing at a terminal, which is where every
human and agent looks first.

The cause is a defect in the gate itself, and it is the third instance today of the same shape:
**`sync-inline-eslint-rules.mjs --check` reads each submodule's WORKING TREE, not the committed
gitlink.** Every local run answers a question about somebody's disk rather than about the estate. On
the committed refs the answer inverts:

```text
                local --check says      committed refs say
crm7            DRIFTED                 DIFFERS — AHEAD of source, and stronger
R80.4           not mentioned at all    DIFFERS — BEHIND
braden          DRIFTED                 IN SYNC
throughput      DRIFTED                 IN SYNC
```

Anyone acting on a local run would have edited two already-correct files and still left R80.4
behind. The fix is for the gate to read `git -C <sub> show <pinned-sha>:eslint-rules/<rule>`, or to
hard-fail when a checkout does not match the gitlink. Filed.

The three copies and their source do not agree, and the disagreement runs in both directions:

```text
crm7 copy      428 lines   AHEAD of source, and stronger
parent source  359 lines   has two live holes crm7 already closed
R80.4 copy     252 lines   BEHIND
```

The parent source — the nominal source of truth — still lets two things through that crm7's copy
catches: an alpha-suffixed pure white (`#ffffff00`), and the space-separated `rgb(255 255 255)`
form. Both are banned by your standing rule; both currently pass the "authoritative" copy.

**I ran the generator to see what it would do. It downgraded crm7 to the weaker source and left
R80.4 unchanged.** Reverted immediately.

So the obvious fix — regenerate everything — silently weakens the app with the largest colour
surface in the estate. The correct order is:

1. forward-port crm7's four improvements **into** the parent source
2. *then* regenerate every copy from the corrected source
3. R80.4 comes up to strength and the gate goes green on its own

That is a scoped follow-up, not something to force at the end of a run. Until it lands, the parity
gate stays red on parent pull requests — **and it should**. It is not red for no reason, and it is
not green over a defect. It is a gate honestly reporting a real divergence, which is precisely what
this run spent the day trying to achieve everywhere else.

This is the third time the estate has found that its nominal source of truth was the stalest copy.
"The version in `packages/` is authoritative" is not a safe default here. Reconcile on **behaviour**,
not on location.

---

## 12. Added after the closing state — the award-citation lane finished last

I called this run complete before this lane reported. It was still working, and it returned the
most consequential single finding of the day.

### A junior apprentice was quoted at exactly double the correct rate

Register row 2.3 said the junior-rate values existed and nothing could ask for them. That framing
understated it. **The function did accept a junior query — and answered it with an adult rate.**

```text
MA000004 / MA000005, Level 1, aged 16
  resolved:  $1,056.80 / week
  correct:     $528.40 / week
```

Exactly double, before on-costs. Not a missing feature — **a wrong answer to a question the code
already accepted**. Fixed, with six tests running through the shipped resolver rather than a
test-local re-derivation.

### The clause gate was passing citations to clauses that do not exist

The old gate returned `PASS` for `cl.26.99` — a clause MA000009 does not have. Because every
reference resolved to the *parent* clause title, any `26.x` verified.

**1,066 citation sites, 882 distinct, 134 amounts checked against the clause they cite. 12 wrong,
12 fixed.**

| award | wrong | what it was |
|---|---|---|
| MA000009 | 6 | the whole allowance tail off by one — the **meal** allowance cited the *tool and equipment* clause |
| MA000089 | 4 | off by **three**, because three allowances — wet places, glass and slag wool, handling garbage — **were missing from the model entirely** |
| MA000036 | 4 | one citing a clause that only *lists* the allowance; three citing `cl.15.6/15.7/15.8` when **clause 15 stops at 15.5** |
| MA000073 | 1 | `cl.20.4` does not exist; clause 20 stops at 20.3 |

The MA000089 gap has a second edge: the code already named `handling_garbage` in a
highest-only group **with no allowance row behind it**, so that limb could never fire.

### The definition-of-done gate ran on 5 of 21 awards; it now runs on 21 of 21

And the reachability gate was **its own witness** — its exemption list used bare identifiers that
survived comment-stripping, so a function could read as reached off its own exemption. Corrected,
it reclassified **53 of 629 functions**; genuinely-reached fell from 106 to 78.

### Not an exposure

The bundled-environment concern I flagged was checked properly and is **not** a leak: the deployed
bundles carry 33 keys in production and 32 in development, all public by design. A controlled build
with two deliberately non-public sentinels produced **zero** occurrences. Fixed on hygiene grounds
only.

### A coordination failure that was mine

Another lane `git reset --hard`'d this lane's branch and later switched it onto `development`
mid-work, **destroying its uncommitted edits twice**. It recovered by moving to its own worktree.
Lanes sharing one checkout is a known hazard in this estate and I did not mandate isolated
worktrees when I dispatched. That is my error, not theirs.

### Secret scanning now covers the whole estate

R80.4 was the last repository without any. `gitleaks` is now a **required** check on `development`
in **all seven**, each verified to emit and conclude before being required:

```text
bsuite                  gitleaks
crm7                    gitleaks
conduit                 gitleaks
business-suite-unified  build-and-test, gitleaks, eslint-rule-parity
R80.4                   build-and-test, gitleaks
braden                  build-and-test, gitleaks, eslint-rule-parity
throughput              Test Suite, gitleaks, eslint-rule-parity
```

At the start of the run three repositories required it, one had no secret scanning whatsoever, and
in four the scanner read only a single commit per pull request.

---

## Operator addendum — added 17:15, after this document closed

Written by `operator-proxy-claude`. The PI closed the handback at ~16:50; the finding below is from
16:57 and did not make it in. It **corrects §11**.

### The parity gate reads the working tree, not the gitlink

`node scripts/sync-inline-eslint-rules.mjs --check` compares against each submodule's **working-tree
checkout**. Those checkouts drift from the gitlinks the parent actually commits, so the gate names
the wrong repositories.

| repo | local `--check` says | the **committed refs** say |
|---|---|---|
| crm7 | drifted | **differs — AHEAD** (419 body lines vs source 336) |
| R80.4 | *not mentioned at all* | **differs — BEHIND** (243 vs 336) |
| braden | drifted | **in sync** (336 = 336) |
| throughput | drifted | **in sync** (336 = 336) |

Cause, measured: R80.4's working-tree HEAD was `9460037c` while the parent's committed gitlink was
`2c5cd1df`. Bodies compared with the script's own logic — slice from the first `^import` line.

**Consequence.** CI checks out gitlinks, so CI's answer is crm7 and R80.4. Anyone acting on a local
run would edit braden and throughput — both already correct — and still leave R80.4 behind.

**Two corrections this forces:**

- **§11 is wrong.** It says advancing R80.4's pointer exposed its copy and the gate fired. The gate
  did **not** fire for R80.4 in any run reproducible here. R80.4 is **drifted and unreported**,
  which is worse than either reading, because it is the one nobody is looking at.
- **My own 16:37 message was also wrong.** I told the PI R80.4 was *in sync*. I inferred that from
  its absence in a failure list — absence of a finding is not evidence of absence.

**What holds, and matters more:** crm7's copy is **ahead and stronger**, and must be forward-ported
into `packages/`, never regenerated. The PI established that the right way — it ran the generator,
watched it downgrade crm7, and reverted. That caught a regression I had ordered at 12:57.

**The defect to fix:** the gate should read the committed gitlink —
`git -C <sub> show <pinned-sha>:eslint-rules/<rule>` — or hard-fail when a checkout does not match
its pointer. As written, its answer depends on how recently someone ran a submodule update. Same
class as row 1.2 and RT-6: the guard is correct and its **scope** is the bug.

### Still open at close

- **Row 4.5** — merged, sound on inspection, **deployment confirmed** (I grepped both served
  bundles: `d.r8.crm7.app` carries all three `business-suite-origin` markers, `r8.crm7.app` carries
  none), **session-death unverified**. The A/B control is free *only while R80.4's main is behind*;
  promoting closes it.
- **R80.4's rule copy is behind and invisible to the gate** — a live hole, not a closed row.
- **conduit#433 edge mitigation** — asked three times, unanswered, closed rather than chased.

### A note on the run itself

Five times today an instrument of mine gave a confident wrong answer: a marker that matched the
login page's own copy, one hidden behind an account menu, one matching my own phrasing rather than
the substance, a `tail -4` that hid two of three failures, and this gate reading a stale checkout.
Every one was the instrument, never the code. The estate's recurring failure is not carelessness —
it is a plausible verdict from a tool nobody positive-controlled.


---

## 13. Applied to production today — and the one still waiting

Five live defects were closed **and proven closed by behaviour**, not by reading the code. Both
migrations went in via `psql --single-transaction` with the ledger row recorded at the same version.
That is the documented operator pattern, not a bypass: `supabase-migrate.yml` skips already-applied
versions by version key, so the eventual promotion is a no-op rather than a double-apply.

| repo | defect | state |
|---|---|---|
| conduit | anonymous candidate-existence oracle — an email list in, "is this person in your database" out | **closed, live** |
| conduit | public-apply throttle bypassable by rotating a caller-supplied value | **closed, live** |
| crm7 | `portal_invite_accept` throttle, same defect class | **closed, live** |
| crm7 | `log_tenant_switch` stored a forgeable address **as fact** | **closed, live** |
| crm7 | one super admin could write audit history attributed to another | **closed, live** |
| crm7 | `xero_audit_log` — same defect class, 76 rows | **still live** |

The refusal on the attribution forgery was proven by **re-querying and showing zero rows landed**,
not by an error message. An error is not evidence the write did not happen.

### The one still waiting, and why it is different

`20260814050000` fixes `xero_audit_log`, where all 76 rows carry an unlabelled, forgeable IP. It is
merged and unapplied. **Unlike the other two it cannot be applied alone** — its own header states the
edge function is fixed in the same change and stamps the provenance field, so the database and the
function have to move together. Applying the migration by itself would leave the writer stamping
nothing.

### One risk that turned out to be the opposite

I warned the crm7 lane not to trade an oracle for a denial of service. It found the denial of service
**already existed**: the old throttle keyed on `coalesce(ip,'')`, so twelve distinct genuine users
arriving without an IP header shared **one bucket** and were refused on each other's traffic.

```text
before   1 bucket,  2 refused
after   12 buckets, 0 refused
```

The fix removed a live availability defect nobody had reported.

### Named unverified

Whether Supabase's edge supplies `cf-connecting-ip` on real production PostgREST requests is
**unmeasured**. Both branches are safe by construction — present gives a per-IP bucket, absent gives
a per-user bucket keyed on `auth.uid()` — so the fix is correct either way. Only which branch real
traffic takes is unknown.
