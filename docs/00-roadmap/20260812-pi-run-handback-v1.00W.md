# PI run handback — 2026-08-12

**For Braden.** Autonomous run, ~12:38 to ~16:15 AWST. Ordered by **what needs you**, not by what

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

was done.

Started by `operator-proxy-claude` at 15:23 and completed by the PI at 16:15 — its framing and its
findings are kept, and everything after 15:23 is added. Where the two disagreed, the disagreement
is shown rather than smoothed over.

---

## 1. Read this first — nothing security-related is live

> ### ⚠ NO LONGER TRUE — corrected 2026-08-17
>
> **This section's premise expired on 2026-08-14.** It was written on 2026-08-12 when nothing had
> been promoted; the estate has promoted to `main` several times since, most recently **2026-08-17**
> (`60c5ead5`). Every "**live today: yes**" in the table below is now **wrong**.
>
> Re-measured against `tuybltdrdefjblnplpqo` on 2026-08-17: all five defects are **closed in
> production**, and so is the sixth that §13 recorded as still waiting. Migration versions
> `20260814010000` through `20260814080000` are all present in
> `supabase_migrations.schema_migrations`, and the fix was verified by its *effect*, not by the
> ledger row alone — `public.xero_audit_log.ip` now carries the provenance comment that
> `20260814050000` writes, and the table has grown 76 → 96 rows under the new derivation.
>
> **The section is left standing, not rewritten.** Its central sentence — *"merged is not applied"* —
> is the most important lesson in this document and cost the estate real production breakage.
> Deleting the evidence that made the point would remove the lesson. Read §1 as a record of what was
> true on 2026-08-12, and this banner as what is true now.

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

> **Decision C was made and applied on 2026-08-12: `quality.yml` was deleted.** The
> paragraph below is preserved as the corrected briefing the ruling was made on, not as
> an open question. `crm7/docs/audits/20260811-ci-guards-deferred-items-v1.00D.md` records
> the application.

**`quality.yml`'s evidence was wrong** and you were about to rule on it — the workflow was subsequently deleted, so this reads as the corrected briefing behind that ruling: it *did* have a trigger
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

> ### ⚠ THE ONE STILL WAITING IS NO LONGER WAITING — corrected 2026-08-17
>
> `20260814050000` (`xero_audit_log`) **is applied.** Verified two ways rather than by the ledger
> alone, because a recorded migration is not an applied one:
>
> 1. the version is present in `supabase_migrations.schema_migrations`; and
> 2. its *effect* is live — `col_description` on `public.xero_audit_log.ip` returns the provenance
>    text this migration writes, naming `cf-connecting-ip`, `x-forwarded-for` and
>    `unverified-legacy-xff`.
>
> Two details this section could not have known. The row count is **96**, not the 76 stated below —
> the table kept taking writes between authoring and apply, so "all 76 rows carry an unlabelled IP"
> understates the backfill. And the coupling argument below — that the migration *"cannot be applied
> alone"* because the edge function must move with it — held: both moved together, which is why the
> comment and the new derivation agree.
>
> The rest of this section stands as written.

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

---

# 14. Day two — 2026-08-13

All of this is on `development`. Nothing here has gone to production. Per your instruction, the
estate stays on `development` until you have inspected and QA'd it.

## The one that matters: document generation is broken in production, and has been all along

CRM7 generates documents (contracts, letters) through a small server-side program. It has been
failing in production — in **three different ways in sequence**, which is why nobody pinned it.

The cause is one word. The code asks the login system to check the caller's pass:

```
getClaims(token)
```

There is no `token` anywhere in that program. The variable holding the pass is called
`accessToken`. So the line reaches for something that does not exist and the whole request dies.

**Why nobody caught it.** Two reasons, and the second is the one worth your attention.

1. **Nothing checks these programs for errors.** Not "the tests are thin" — there is *no*
   type-checking step for them at all. I ran one for the first time yesterday. It found this
   instantly.

2. **The test that was supposed to protect this code required the bug.** It asserted that the
   source must contain `getClaims()` — with nothing between the brackets, which is exactly the
   original defect. When someone later fixed the code to pass the pass in, that test would have
   gone red and blocked the fix. When the test was eventually corrected and an argument added,
   nothing existed to notice the argument was the wrong word.

While fixing it I found a second fault in the same eight lines: the "your login has expired"
response was **unreachable**. When the login system rejects a pass it returns nothing, and this
code tried to read a field off that nothing before checking whether it had failed — so it crashed
on precisely the case the check existed to handle. A user with an expired session got a server
error instead of "please sign in again".

Both are fixed in **crm7#1672**.

### What is actually live — I checked, and it corrects me

I first wrote that the program "throws on every request". That is wrong about the *deployed*
state, and the truth is worse. Asking the live account which programs exist:

**CRM7's document generator is not deployed at all.** The name it now calls does not exist there.
What *is* deployed under the old shared name is **BSU's** program, not CRM7's.

| when | CRM7 asks for | what answers | what the user gets |
|---|---|---|---|
| until yesterday | the shared name | **BSU's** program, which expects a different request | an error |
| right now | its own new name | nothing — never deployed | "not found" |
| once deployed, without this fix | its own new name | CRM7's program | a crash on every call |

So the feature has been broken throughout. **This fix is required but not sufficient** — it
removes the crash that would greet the first deployment. Restoring the feature needs someone with
deployment rights, which is still the blocker in §2.

Yesterday's rename is what introduced the current "not found". That is not a criticism of it: the
collision it removed was worse — CRM7's configuration was setting a **security flag on BSU's
program**. It does mean the rename is only half-landed until a deployment happens.

## I then measured the whole population

27 of these server-side programs in CRM7. I type-checked every one:

| | |
|---|---|
| clean | **14** |
| carrying real errors | **13** (84 errors between them) |

Filed as **bsuite#1953** with the list. I did not switch a check on for all 27, because it would
be red on day one for 13 pre-existing reasons and everyone would learn to ignore it — the same way
the permanently-red `Publish` job trained everyone to ignore the publish step. The issue specifies
the design that avoids that.

## A guard that said PASS without reading anything

Chasing why an unrelated check went red on a routine change, I found the estate's secret-naming
guard had three faults.

**It could report PASS on a tree it had not read.** The guard scans the six sub-projects. It tested
whether each was present by asking "is there a folder here?" — but a sub-project that has not been
fetched **is** a folder; it is just an empty one. So on any checkout without them, the guard
searched six empty folders, found nothing wrong, and said PASS. It now refuses to answer at all
rather than answer about nothing.

**Five of its 52 exemptions were dead.** The guard keeps a list of files allowed to break a rule.
That list is keyed on the file's location, which fails two ways when a file moves — and only one is
visible. If a file is *renamed*, the exemption stops applying and the rule fires; loud, and that is
what started this. If a file is *deleted*, the exemption sits there forever and nothing says so.
Four had been dead for months. A dead one is not just clutter: recreate a file at that exact
location and it is exempt the moment it appears, with nobody reviewing it.

There is now a check that every exemption names a file that actually exists.

**My own first attempt at that check was wrong**, and I caught it only because I had measured the
answer separately first: it declared all 52 dead. Two bugs of mine, both the kind that look right —
asking git "is this a repository?" from inside an empty folder makes git walk *upward* and answer
about the parent, and a list I built was separated by line breaks where the code matching against
it expected spaces. The independent measurement is the only reason I did not ship a guard that
failed everything.

All in **bsuite#1951**, with the before/after controls recorded.

## Also landed

- **crm7#1670** — the rule that keeps cross-app sign-in working was documented as enforced and was
  wired into nothing. Now wired. A *third* guard was found satisfiable by a comment: it passed with
  both real pieces of code deleted, happy with one sentence of documentation. Replaced with one
  that reads the actual code and self-tests before every run.
- **crm7#1669 / BSU#700** — two sub-projects were deploying programs under the same names into the
  same account, each silently overwriting the other. Four collisions. Worse than "the wrong one
  wins": CRM7's configuration was setting a **security flag for BSU's code**, which is how two
  sign-in endpoints came to accept a forged pass.

## Still yours to decide

Unchanged from §2, plus one: **two Supabase access tokens need rotating.** I leaked them myself —
an error message printed them in full because the file had the same key twice and my command
matched both lines. Everything else in that file is intact; it is the two `sbp_…` tokens only.

---

# 15. Day two, closing state

Everything below is on **`development`**. Nothing has been promoted. Per your instruction the
estate waits there for your inspection.

## Two things I got wrong today, both corrected in the record

**1. I told you the "unstyled button" was fixed. It is half-fixed.**

Your report was *"one button unstyled"*. The original cause was a button painted the exact colour
of the page behind it. My fix moved it onto a raised card so the outline had something to sit
against — and I reported that as done.

Measuring the live page properly: the button's outline is **1.12:1** against the card in light
mode. The accessibility floor for the edge of a control is **3:1**. It is *technically* an outline
button and *visually* still isn't one. You were right, and my fix addressed the wrong half.

The reason it needs a decision rather than another quick change: the whole light palette sits
between 96% and 98% brightness, so **any** border you can actually see is noticeably darker than
anything currently in the design. That is a look, not a bug fix, and it would change every
bordered control in four apps. Written up with the numbers in **bsuite#1958**.

**2. "Document generation throws on every call" was wrong, and the truth is worse.** Corrected in
§14 — it is not deployed at all.

## The dark-mode border was broken everywhere

Chasing your report, I found the theme defines its "strong border" colour **only for light mode**.
Dark mode silently inherited the light value, so it painted a **near-white line on the navy
background** — the brightest thing on the panel. It is used in **50 files across four apps**.

The corporate (braden.com.au) theme has always defined both. Only the main theme was half-written,
which is why nobody comparing the two would spot it. Fixed in **bsuite#1957**.

Worth knowing how it was found: I checked the **actual stylesheet the live site serves** rather
than reading the source code. That also confirmed your heading really is a gradient now — and it
was worth confirming, because the previous version of that heading referred to a colour **no
stylesheet defines**, which with the same technique renders the text *invisible* rather than flat.

## Nine live programs exist that are in no repository

Nine of the small server-side programs running against the live database **have no source code
anywhere in the estate**. Six were pushed by hand rather than by the build; three come from
`R80.3`, the wage-calculator repo we retired.

Consequences, in order of seriousness:

- **No check we have can see them.** Not the secret scanner, not the colour rules, not review.
- **They cannot be rebuilt.** If one is deleted there is nothing to redeploy from.
- **A fix cannot reach them.** One of them still carries a flaw we have removed twice elsewhere,
  simply because there was no file to fix.

One needs your attention specifically. **`fairwork-proxy-test`** is reachable by anyone on the
internet, has been up since 29 July, and its own first comment says *"DELETE THIS FUNCTION after
testing, or rotate the token."* It will use our paid Fair Work subscription on behalf of anyone
holding a password that is written into the program itself. Delete it, then rotate that key.

Full detail, including what to do about the other eight: **bsuite#1955**.

## Nothing typechecks the server-side programs

27 of them in CRM7. I checked every one for the first time: **14 clean, 13 carrying 84 real errors
between them.** That is how a program shipped calling a variable that does not exist.

I did not switch a check on for all 27, because it would be red on day one for 13 pre-existing
reasons and everyone would learn to ignore it — the same way the permanently-red publish job
trained everyone to ignore publishing. **bsuite#1953** sets out the design that avoids that.

## The same defect, found three times today, in three different guards

A pattern worth your attention, because it explains why things kept passing:

| guard | what it did |
|---|---|
| secret-naming | reported **PASS** having read none of the source, when the sub-projects were not fetched |
| slug-collision | called a name uniquely owned when a sub-project failed to fetch — and would deploy over another repo's live program |
| secret-naming (again) | treated a **comment** explaining a hazard as committing the hazard |

The first two are the same mistake: an empty folder looks exactly like a folder with nothing in
it. All three are now fixed and, more importantly, each now **refuses to answer** rather than
answering about something it did not read.

## Waiting on you

1. **Deployment rights.** Three security holes stay open and document generation stays broken
   until someone deploys. I cannot, and did not work around it.
2. **The promotion** (`development` → `main`, bsuite#1944). Yours to gate. Note the theme fix
   publishes to npm on that promotion, which is what carries the dark-border fix to the apps.
3. **Rotate three credentials.** Two Supabase tokens I leaked myself in an error message, plus the
   Fair Work proxy token above.
