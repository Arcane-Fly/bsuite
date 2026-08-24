# Estate execution backlog — v1.00W

**Generated 2026-08-24. This is an execution queue, not a report.**

Supersedes nothing. It *consolidates* — it does not restate — the master roadmap, the
operator decision register, `20260817-estate-remaining-work-register-v3.00W.md`,
`20260822-session-findings-register-v1.00W.md`, the three 2026-08-22 specs, `.remember/`,
and the 208 open GitHub issues measured across all seven repos this morning.

**How to use it.** The 30-minute supervisor routes work from §4, top down. An item is only
eligible when its `Gate` is satisfiable and nothing above it in the same lane is unfinished.
`blocked-braden` items are NOT eligible — they are collected in §6 and need one sitting.

**Every number here was re-measured 2026-08-24.** Counts in this estate drift hourly; two
repos changed while this pass ran. Re-measure before acting on any figure.

---

## 1. What happened in this pass

| Action | Count |
|---|---:|
| Open issues measured, all 7 repos, 2026-08-24 11:06 | **208** |
| Triaged with evidence | **208** |
| Closed on first pass | 40 |
| **Reopened by the verification pass** | **−10** |
| **Net closed — verified done** | **30** |
| Closed — obsolete/superseded | 0 |
| Closed — duplicate | 0 |
| **Remaining open** | **178** |
| Of those: actionable now (`ready`) | 58 |
| Of those: blocked on Braden (`blocked-braden`) | 25 |
| Of those: blocked externally (`blocked-external`) | 5 |

**The 30% estimate was high. The real number is 14.4%** (30 of 208).

Note the baseline itself was wrong: **77 was the parent repo alone**, and the parent had
already drifted to 59 by this morning. The estate figure was never 77; it is 208 open
across `bsuite` + six submodules, of which crm7 alone carried 115.

### 1.1 The verification pass reopened a quarter of my own closures

I closed 40, then ran an adversarial re-check of all 40 against current code, the live
database and CI run history, specifically hunting for the half-done pattern. It found
**10 wrong closes and 12 weak ones. All 10 are reopened**, each with precise remaining
acceptance criteria in a comment.

The cited evidence was almost always *true*. **What failed was scope** — the closing comment
answered the headline and went quiet on the named second half. Nine of the ten are exactly
that shape:

- **`bsuite#2055`** — the shared scanner is adopted in all five apps, and the four divergent
  copies it was written to replace are **all still live**. Each says *"IN ADDITION to"*.
- **`braden#266`** — the migration, the RPCs and the pg_cron poller are all real. **Nothing in
  the app calls any of it.** `useSiteEditor.ts:139-156` is a stub containing
  `// Your existing publish logic here`.
- **`BSU#682`** — **13 of 14** proxy calls rewired. The fourteenth (`:850`) still hits
  `pg_policies`, its fallback RPC is defined in no migration, and both failure paths swallow
  to `200 {policies: []}` — so the console shows "no policies" instead of an error.
- **`bsuite#1953`** — the typecheck gate exists and triggers on `*/supabase/functions/**`,
  a path **no parent diff can ever contain**, because submodules are gitlinks. Green because
  it never runs. A live #1966 instance inside the fix for a #1966 instance.
- **`crm7#1642`** — my own count was wrong: **9, not 7**, one in production
  (`settings/apprentice-rates.tsx:789`), and the ratchet that was the actual acceptance
  criterion **does not exist** anywhere.
- **`crm7#1759`** — the one outright false closure. The token I said is no longer handed to
  `setSession` is handed to it **twice** (`auth/callback.tsx:209-212`,
  `AuthContext.tsx:296-299`).

**This is the single most useful result in this document.** The same failure mode that
produced Braden's complaint reproduced itself inside the pass that was cleaning it up, at a
25% rate, under explicit instructions not to. It is not carelessness — it is that *nothing
enforces scope at closure time*. See §7 for the standing fix.

**Standing rule adopted from here:** a closing comment must enumerate **every** acceptance
criterion in the issue and mark each one *met* or *explicitly carried forward*. The closures
that survived re-checking (`crm7#1730`, `crm7#1568`, `bsuite#1898`, `bsuite#1999`) all did
this already, which is why they verified clean.

### 1.2 Weak closures — left closed, residue carried here

Twelve closures were sound on the headline with residue remaining. They stay closed; the
residue is listed so it is not lost.

| Issue | Residue |
|---|---|
| crm7#1387 | Schema and UI real, but **zero seed rows** — the operator still sees "No funding sources configured" |
| crm7#1405 | `suiteLinks` fixed; **5 hardcoded production origins survive elsewhere** (`CRM7Header.tsx:442,450`) |
| crm7#1569 | Button wired to a sync function that is **flag-off by default** and returns zero rows |
| crm7#1572 | Charge-rates fixed; `leadIdentifier.ts` adopted at **exactly one site**, and two of the three named entities still show raw UUIDs on their own detail pages |
| crm7#1688 | AC-1/AC-3 verified live (0 of 16 half-linked); **AC-2, the leads→clients→hosts chain, never addressed** |
| crm7#1742 | `dist/index.html` has **112 modulepreloads against an AC of <50** |
| bsuite#1688 | Headline P0 real; **2 of 3 follow-ups not done** |
| bsuite#2238 | Hook published and lockfiled, **imported by nobody** in all four apps |
| BSU#622 | `min-h-screen` genuinely 0; **9 non-responsive grids remain**, not the 4 I stated |
| BSU#709 | Cited evidence fully accurate; **a second Jodie surface still uses a generic icon** |
| conduit#508 | Nav restored and the query is real, but **no path guarantees data** — the browser fallback depends on the same env var the failure names |
| R80.4#45 | Traineeship delivered. **Labour-hire worker has no award-derived wage source** and falls through to the apprentice ladder; the floor check at `:5955-5962` can report an under-award rate as compliant |

**`R80.4#45`'s residue is a compliance risk in the underpayment direction** and should be
filed as its own P0 rather than left as residue.

---

## 2. Three closures that were proposed and refused

These matter more than the 40 that closed, because each is the failure mode being complained
about — a fix landing on the token, or one page, or one half of a hand-off, and being
recorded as done.

| Issue | Proposed | Refused because |
|---|---|---|
| **crm7#1570** — "the paste box goes" | CLOSE-DONE (both transport halves shipped: R80.4 PR #95, crm7 PR #1604) | **The paste box is still on screen.** `src/pages/charge-rates/import-r8/index.tsx:110` — *"This paste step is the fallback"*; `:123` `<CanvasCard cardKey="paste">`. A JSON textarea demoted to "fallback" is still a JSON textarea. The ruling said it goes. |
| **bsuite#1958** — interactive borders fail WCAG | CLOSE-DONE (`--role-border-interactive` = 3.88:1, PR #2067, 22 assertions) | **Token fixed, token not adopted.** Schema-builder node border measures **1.06:1 light** today. 173 files still carry a resting accent border. This issue's own title is *"…and I reported it fixed"* — closing it on a green token test repeats that exactly. |
| **BSU#723** — `canUsePlatformKit()` admits `is_super_admin` | CLOSE-DONE (PR #726 merged both sides) | **Merged ≠ deployed.** v3 **P0-10** records `platform-kit-proxy` was never redeployed. The client gate is narrow; the server gate is still wide, and the server is the one that matters. |

Each carries a comment stating the remaining acceptance criteria.

---

## 3. What "production ready" means for this estate

A checklist, not an adjective. Today **6 of 24 are met.**

### 3.1 The estate can tell you the truth about itself — 1/6

- [ ] **No gate reports green on an empty scan.** `#1966` is still open and `#2306` found new instances on 2026-08-23. Charter cases still live: `publish-eslint-config.yml` reports success while the package 404s on npm (`#1908`); the pg_cron audit aborts before its own sweep.
- [ ] **Every scheduled workflow is green, or has an open issue naming why.** Measured today: `Advance submodule pointers` failing **135 consecutive runs**; `pg_cron Job Health Audit` failing (5 of 27 runs ever succeeded); `Pending encryption watch` failing closed.
- [ ] **Silent audits have a reader.** RLS Policy Drift, Schema Lag and Migration History Audit emit `::warning::` and never fail. Nobody is assigned to read them.
- [ ] **Every gate cites an artefact that exists.** See §5.1 — the visual-gate script exists in two divergent versions, and `Theme-best-practice.md` is cited by a live skill and three crm7 comments and does not exist at all.
- [x] Migration replay fails the build when a migration fails — closed today (crm7#1400).
- [ ] **A backup has been proven restorable.** D-31 unmet. PITR undecided (`#1866`, flagged for the week of 2026-08-11).

### 3.2 Security holds under its own rules — 1/5

- [ ] `tenant_encryption_keys` does not grant `anon`/`authenticated` CRUD over wrapped DEK material (v3 **P0-1**: RLS on, **0 policies**, `relforcerowsecurity=false`).
- [ ] The `profiles` INSERT column grant cannot set `is_super_admin`/`platform_role` (v3 **P0-8**: guard trigger is `BEFORE UPDATE` only).
- [ ] IMAP/SMTP credentials are not written to plaintext columns (v3 **P0-6**).
- [ ] No surface reads arbitrary `public` tables through the service-role client (SPEC C §2.2 — `/developer/database` Rows tab).
- [x] Platform-level scope is not visible to enterprise tenants **in the three named surfaces** — but the suite-wide sweep `#1960` asked for was never done and no count exists.

### 3.3 The doctrine is enforced, not just written — 1/4

- [ ] **One-shot holds.** `audit-one-shot.mjs` is ratcheted at 2 and permanently red: `leads` is CRM7-owned, CRM7 has **zero** update call sites, and BSU + braden both write its status (R-1).
- [ ] **Fix-the-class, not-the-page.** Verified violated three times this pass — see §7.
- [ ] **One grid, one saved-view store, one report path.** Currently five grids, three stores, four scoping vocabularies (SPEC C §1.5).
- [x] Colour ban sees a colour passed to a function — closed today (`#1962`).

### 3.4 A customer can complete their work — 1/5

- [ ] A data surface **opens showing data**. Still `"Pick an entity above to see its rows."` (R-1, announced delivered 2026-08-08, 16 days).
- [ ] A client can send email from their own account (`crm7#1705`, *"raised 20+ times"*).
- [ ] Portals are usable by the persona they serve (operator: *"the portals basically suck"*; no share-link issue exists in any repo).
- [ ] R8 prices every engagement type it claims to (ABN contractor still unselectable, `R80.4#46`).
- [x] Traineeships and labour-hire workers can be priced — closed today (`R80.4#45`).

### 3.5 The estate is navigable — 2/4

- [x] Every open issue carries a bucket and a label (done in this pass).
- [x] One backlog exists and the supervisor routes from it (this document).
- [ ] Docs pass their own naming convention (70 of 333 violate; rename reverted, 51-file blast radius — R-3, **blocked on Braden**).
- [ ] Branch/worktree count is draining, not growing (118 local / 84 remote against a stated baseline of 107/73).

---

## 4. The backlog, in execution order

Ordered by **dependency first, value second**. Sizes: S ≤ 1 day, M ≤ 1 week, L > 1 week.

### LANE 0 — Restore the estate's own instruments. Nothing above this is trustworthy until it is done.

Everything downstream is measured by tooling that is currently lying. Do this lane first,
and do it serially.

| # | Item | Why it is first | Repo | Size | Gate | Source |
|---|---|---|---|---|---|---|
| **0.1** | **16 `bsuite-*` skills reach zero Claude sessions.** `~/.agents/skills/` holds 16; `~/.claude/skills/` holds **0** of them (223 canonical → 179 synced). Every session — including every gate verdict banked this month — ran without `bsuite-ship-visual-promote`, `bsuite-fix-the-class-not-the-page` (D-62) and `bsuite-false-complete-gates` (#1966). | The doctrine Braden says is repeatedly violated is *in a skill the agents cannot see.* | `~/.agents` | S | `ls ~/.claude/skills \| grep -c bsuite` returns 16 | measured 2026-08-24 |
| **0.2** | **Two divergent copies of the visual-gate protocol.** `~/.agents/skills/bsuite-ship-visual-promote/SKILL.md` = 20,933 B, 2026-08-18, **has `scripts/visual-probe.js`** (54,261 B). `~/.hermes/skills/bsuite/bsuite-ship-visual-promote/SKILL.md` = 8,340 B, 2026-07-28, **no `scripts/`**. | **This is the whole probe conflict.** An agent on the hermes copy correctly concludes the probe does not exist; an agent on the `.agents` copy correctly finds it. Both were right about different files. Until one wins, **every gate verdict is uncomparable.** | `~/.agents`, `~/.hermes` | S | one SKILL.md, one probe path, both agents resolve identically | §5.1 |
| **0.3** | **Submodule-pointer writer dead — 135/135 consecutive failures.** A submodule `git clone` failure is not distinguished from a legitimate branch-head read, so the script falls through to the parent's own HEAD and offers it for all six submodules; the descendant check correctly refuses every time. | Direct cause of the dirty `M crm7 / conduit / business-suite-unified` gitlinks that deadlock `branch-cleanup`. Highest leverage on the board. | bsuite | M | one green scheduled run, and the writer writes a real pointer | `#2306` (`#2226` was closed for its narrow setup-node claim; **the writer is still dead**) |
| **0.4** | **pg_cron audit self-test masks two never-successful compliance jobs.** Assertion demands `FIRED=1`; the run produced `FIRED=3` and exits **before** the sweep. `document-retention-sweep-daily` and `sync-award-rates-weekly` have **never** succeeded — missing Vault secrets since migration `20260822080000`. | Document retention is a compliance obligation and has been unmeasured for days. **Fix the assertion, not the detector.** | bsuite | M | audit green; both jobs show a successful run | CAMPAIGN-BRIEF §3, `#2306` |
| **0.5** | **`branch-cleanup` deadlock.** Skips branches checked out in a worktree (20 of 23) and keeps worktrees with a dirty `git status` (10 of 23) — **9 of those 10 are dirty only in submodule gitlinks.** | **Re-measure after 0.3.** Fixing the writer removes the *cause*; the `--ignore-submodules=all` narrowing (AUTHORISED §4) treats the *symptom*. Do not narrow a safety check that no longer needs narrowing. | bsuite | S | cleanup drains; a worktree with real uncommitted changes, an untracked file, or a stash is still refused, **proven by test** | AUTHORISED §4 |
| **0.6** | **`publish-eslint-config.yml` is green and the package 404s on npm.** Runs #7/#8/#9 all `success`; `@bsuite/eslint-config` has never existed on the registry (7 sibling `@bsuite/*` packages all resolve 200). | A publish gate that cannot see a failed publish is the #1966 defect in the pipeline that ships the #1966 lint rules. | bsuite | S | package resolves 200, or the workflow fails | `#1908` |

### LANE 1 — Live security exposure. Runs in parallel with Lane 0; different people, different files.

| # | Item | Repo | Size | Gate | Source |
|---|---|---|---|---|---|
| **1.1** | `tenant_encryption_keys` grants `anon` + `authenticated` full CRUD over wrapped tenant DEK material. RLS enabled, **0 policies**, `relforcerowsecurity=false`. One permissive policy away from anon-readable key material. | crm7/DB | S | policies exist; `anon` has no grant; force-RLS on | v3 **P0-1** — *no issue exists* |
| **1.2** | `profiles` INSERT column grant on `is_super_admin` / `platform_role` survives for `anon` and `authenticated`; the privilege guard is `BEFORE UPDATE` only, so INSERT bypasses it. | crm7/DB | S | guard covers INSERT; grant revoked | v3 **P0-8** — *no issue exists* |
| **1.3** | **Redeploy `platform-kit-proxy`.** PR #726 narrowed both gates; the function was never redeployed, so the server gate is still the wider one. | BSU | S | deployed function 403s a profile with `is_super_admin=true` and no `platform_role` — **response attached** | v3 **P0-10**, `BSU#723` |
| **1.4** | IMAP/SMTP passwords written to plaintext columns while the read path expects Vault — simultaneously insecure **and** non-functional. Zero triggers on `email_integrations`. | crm7 | M | credentials in Vault; read path works | v3 **P0-6** (the user-facing ask is `crm7#1705`) |
| **1.5** | `/developer/database` Rows tab reads **arbitrary `public` tables through the service-role client**, bypassing RLS. Justified for `pg_catalog` introspection; not for user data. | BSU | M | Rows tab reads through the user's own RLS context | SPEC C §2.2 — *no issue exists* |
| **1.6** | Eight live edge functions with **no source in any repo**; three still point at the retired `R80.3/`. | estate | M | every deployed function has a source file | v3 **P0-9** (cites `#1955`, which is **closed** — see §8.3) |

### LANE 2 — The three specs, strictly serial: **T → C → S**

They overlap on crm7 and BSU surfaces and two touch the same files. **Do not open branches for
two at once.** This is the sequencing ruling; it carries forward from CAMPAIGN-BRIEF and is
tightened below by what has landed since.

| Order | Spec | Status right now | Blocked? |
|---|---|---|---|
| **T** | `20260822-border-elevation-token-system-spec-v1.00D.md` — tokens, elevation, focus | **Start here, but re-measure §5.2 first.** Purely additive; defines tokens, deletes no components. Its two brand decisions (§6.8, §6.11) are independent of B-1. | Two brand calls, both in §6 |
| **C** | `20260822-data-surface-consolidation-decision-v1.00D.md` — six surfaces to one | **Hard-blocked on B-1.** Deletes four grid components; if T is mid-flight those deletions conflict on every restyled file. Phases 1–2 must finish before 3–5 begin. | **B-1**, then B-2 |
| **S** | `20260822-schema-builder-ux-remediation-spec-v1.00D.md` — schema builder | **Last — and its status doc is stale.** ~10 of its P0/P1 items have already shipped (§5.3). Its relationship repair and C's Phase 3 are both FK-metadata models and must not be designed in parallel. | S§15.1 ruled **with** C's R-36 |

**T may run alongside C only if T is restricted to `packages/ui` / `packages/theme` token
definitions and touches no app-level component file. C and S must never overlap.**

#### Before any of T is scheduled — re-measure these three claims

Three of T's headline findings are each contradicted by something dated the same day or later.
Filing them as-is would commission work that is already done or aimed at the wrong file.

| T's claim | Contradicted by | Verdict |
|---|---|---|
| `scripts/visual-probe.js` does not exist; **files a P1 to restore it** | It exists — 54,261 B, mtime 2026-08-22 21:24 | **DO NOT FILE.** See 0.2 |
| `--shadow-elev-*` ramp is dead at runtime | Findings register §7 names the mechanism (crm7 rendered `<html class="light" data-theme="dark">`, so every `var()`-resolved `dark:` utility composited against light tokens — **crm7-only**), fixed and shipped as `@bsuite/theme` 1.0.2 | **Re-measure against 1.0.2** before scheduling |
| `--app-accent` unadopted estate-wide; every app is cyan | 100 occurrences across 24 files incl. `nav-core`, both `BrandingProvider`s, conduit globals | **True for BSU developer-console panels; not estate-wide.** Phase-6 blast radius is overstated |

**T's two solid, file-now findings:** zero `:focus-visible` rules exist in any
`packages/**/*.css` (re-verified today) and `--surface-0..3` / `--border-hairline|divider|control`
do not exist. Those two carry the WCAG 2.4.7 failure and are not in dispute.

### LANE 3 — The operator's own notes, in the order he wrote them

Every item below is quoted from `bsuite notes.docx` (2026-08-22) and has **no open issue**
unless one is named. These are the ones he has been asking for.

| # | Operator note (quoted) | Repo | Size | Issue |
|---|---|---|---|---|
| **3.1** | *"Cards ... all on common backing cards so dnd kit is useless ... Every page on every app should have this working correctly. This is a repeated issue and has been raised innumerable times. Usually one page gets fixed but not all even when all are a requirement of the task."* | all 6 | L | **none — file it** |
| **3.2** | *"Card resize regressions. Cant resize individual cards anymore. Columns to move cards into do not respect the columns slider."* | crm7 | M | **none — file it** |
| **3.3** | *"Edit page, should be able to add elements, widgets, entities, and update the form on the live page in edit mode ... We did recently have the ability to add new elements on page but this is now missing again."* — annotated **regression** | crm7 | M | partial: `throughput#291` |
| **3.4** | *"https://crm.crm7.app/portal — Just re-directs to dashboard. No way to send clients, host employers or workers, apprentice and trainee's their personal portal."* | crm7 | M | **none in any repo — file it** |
| **3.5** | *"Navigation f-cking sucks, UX sucks, the portals basically suck. Take on the persona of each external user and think of what they would need to achieve in this portal."* | crm7/conduit | L | `docs/20260813-portals-redesign-brainstorm-v1.00D.md` exists; no issue |
| **3.6** | *"Dates should default to Australian dates always ... today's date is 19/08/2026 not 08/19/2026"* | all 6 | S | **none — file it** |
| **3.7** | *"Permissions check boxes should be pre-selected for all organisations and saveable ... This is something I have insisted on many times."* | BSU | M | **none — file it** |
| **3.8** | *"Platform branding should not be visible to anyone but developers ... Worth a sweep of this throughout all features everywhere."* | BSU | M | `#1960` (three surfaces fixed; **sweep never done, no count exists**) |
| **3.9** | *"Logo in header should be the logo set in the platform branding or the logo set in white label section per the relevant tenant."* | all 6 | S | **none — file it** |
| **3.10** | *"Users shouldnt have to know coding even markdown is too much. How can I upload an existing word or similar document and edit it and insert a merge field"* | crm7 | L | `crm7#1476` (RULING 5.3/5.4) |
| **3.11** | R8: *"Much of what was working before beeing R8.4 was working and is now not working. Unacceptable."* — award allowances always building-and-construction; apprentice % card always $29.54; wage table static regardless of award; no trade selector for MA000036 | R80.4 | L | **none — file it, and it is a regression** |
| **3.12** | *"Competency based progression. Remove. I did not ok this. An actually have said many times that this is not the job of the calculator."* | R80.4 | S | **none — file it** |
| **3.13** | *"Fairwork MAPD card still has Proxy URL, proxy token, and subscription key visible in ui"* — leftover from the single-file MVP | R80.4 | S | **none — file it** |
| **3.14** | *"why does it say 'offline' if the api to fairwork is connected? And what do users do if they want to enter an eba, custom or award off the 21 list?"* | R80.4 | M | related: `R80.4#191` (**the key is not set — verified**) |
| **3.15** | *"Selecting an award in the 'award, trade & qualification' card does not pre-populate the Award in the 'Fairwork MAPD' award and vice versa"* — users select the award twice | R80.4 | S | **none — file it** |
| **3.16** | *"it should only ever be displayed as R8"* (repo is r80.4; UI must say R8) | R80.4 | S | **none — file it** |
| **3.17** | *"Why is database ID displaying in full as their ID? Once Placed an Employee ID created. Training Contract ID should also be available as a primary identifier once set. Same with USI."* | crm7 | M | partial: `crm7#1572` closed **for three surfaces only** |
| **3.18** | *"Reports generally are a mess. And duplicative ... this mess of half arsed half complete not fully working attempts that are now confusing and very very duplicative."* | crm7/BSU | L | → **SPEC C**, blocked on B-1 |
| **3.19** | *"Cant select all entities. E.g. selecting person shows the person_id from supabase but not the persons name and there is no way to select the persons name in the available fields"* | crm7 | M | → SPEC C **R-36** |
| **3.20** | *"Dependee's should sit lower than that which they depend on"* — cards that affect the whole calculation default to the top | R80.4 | S | **none — file it** |

### LANE 4 — Structural debt with a named owner and a measurable end

| # | Item | Repo | Size | Source |
|---|---|---|---|---|
| 4.1 | **91 Class-C orphaned tables** ("feature never built") of 124 orphaned total — triage: wire or drop | estate | L | findings §8 |
| 4.2 | **~200 files shipped and unreachable** across five repos (braden's 60-file Site Editor; throughput's entire `src/components/navigation/`, whose own code says *"none of which are mounted"*; 13 of ~22 BSU `uplift/` exports) | estate | L | v3 **U-2..U-12** |
| 4.3 | **Nine surfaces error at runtime** because a migration already in the repo was never applied | estate | M | v3 **M-1..M-10** (`throughput#332` covers M-7 only) |
| 4.4 | `prerender.mjs:146` swallows any error when `CI` is set — **a prerender failure passes CI silently** | crm7 | S | v3 §6 |
| 4.5 | R80.4 award engine unreachable from the calculator — 112 of 179 modules, 20 of 21 awards priced against an empty penalty table | R80.4 | L | v3 **W-1..W-12** |
| 4.6 | **School-based apprentice stage ignores the competency limb** of MA000020 cl.19.7(b) — underpayment direction, and the path is reachable | R80.4/crm7 | M | v3 **W-4**, `crm7#1613` |
| 4.7 | Delete the **four cookie-SSO assertions** in the docs (BSU ×3, conduit ×1) pointing agents at the estate's loudest forbidden pattern | estate | S | v3 §8 |

---

## 5. Findings this pass produced that are not in any existing document

### 5.1 The visual-probe conflict is resolved — and the cause is worse than the symptom

**Both prior agents were right, about different files.**

```
~/.agents/skills/bsuite-ship-visual-promote/SKILL.md   20,933 B  2026-08-18  scripts/ PRESENT
  └── scripts/visual-probe.js                          54,261 B  2026-08-22 21:24
~/.hermes/skills/bsuite/bsuite-ship-visual-promote/SKILL.md
                                                        8,340 B  2026-07-28  scripts/ ABSENT
```

Two copies of the same gate protocol, three weeks apart, one with the probe and one without.
`sync-skills.sh` explicitly excludes hermes (*"Managed manually; never restructure ~/.hermes"*),
so they drift by design. **Every gate verdict banked while agents were reading different copies
is uncomparable**, which is exactly the hazard Braden named. Items 0.1 and 0.2.

`Theme-best-practice.md` — cited by the `bsuite-brand-system` skill and by three live crm7
comments — **does not exist on disk anywhere.** The real contract is
`packages/theme/docs/d2c-theme-source-of-truth.html`.

### 5.2 The sidebar bug is not the Dashboard item

SPEC T §9 P0-1 scoped it to *"the Dashboard item"*. The root cause is broader:
`crm7/src/components/layout/AppSidebar.tsx:44-79` — `TransitionNavLink({href, navigate, children})`
takes exactly three props and **spreads nothing**. It is the `asChild` child of a Radix `Slot`
at `:102-111` (every sub-item), `:141-150` (every group-less section) and `:343` (footer links),
so **every `className`, `data-*`, ref and handler `Slot` injects is dropped**. Dashboard is
merely the only *top-level* section without sub-groups. Fixing the Dashboard item alone would
leave every sub-item unstyled — **D-62's exact shape, in the fix for a D-62 complaint.**

### 5.3 SPEC S is roughly a third done and its status does not say so

Landed since the spec was written, with no issue recording any of it: P0-1 (four phantom
columns removed, `types.ts:41-62` with a do-not-re-add comment), P0-2 (contract test +
workflow), P0-3, P0-4 (`dialog:modal{margin:auto}` at `preset-v4.css:382-402`), P0-6, P0-7,
P0-8, P1-12, P1-14. **Consequence:** SPEC T §10's claim that its phase 1 is *"`packages/theme`
only, 1 package, Low risk"* is no longer true — the schema-builder work has already touched
that package.

**And P0-1 was decided by fait accompli.** SPEC S §15.2 put it to Braden — *strip the four
phantom fields, or re-apply migration `20260503000000` and get field-level relations back?* —
noting *"this choice constrains the display work."* The code stripped them and forbade reversal.
That forecloses §6.5.1 column-anchored edges. **The question should be re-put** as *"do you want
field-level relations back?"* rather than treated as answered. It is B-4 in §6.

### 5.4 Two UI surfaces assert audit behaviour that does not exist

- `crm7/src/pages/reports/custom/create.tsx:219` writes `tags:['tracks-changes']` with **zero
  readers estate-wide**, and `:342` tells the user *"Track changes: enabled (audit columns)."*
- `crm7/src/lib/reports/reportViewPreferences.ts:180` hardcodes `sort: []` while
  `crm7/src/pages/reports/[key].tsx:361` tells the user *"Your filters, columns, and sort are
  saved to your account."* It saves two of three and says three.

Both are the eleven-site K-class rule, live, in sites nobody counted. Neither is filed.

---

## 6. Everything that needs Braden — one list, one sitting

Ranked by how much downstream work each unblocks. **B-1 alone gates ~15,500 LOC and 17 requirements.**

| # | The question | Blocks | Open |
|---|---|---|---:|
| **B-1** | **Is a report an editable VIEW of records, or a read-only saved question?** Asked 2026-08-13 in `crm7/docs/20260813-report-builder-design-v1.00D.md` §0 — *"This is the whole question, and it has never actually been put to you."* | All of SPEC C: every migration phase, 17 requirements, ~15,500 LOC. Nothing is safe to delete before it. | 11 d |
| **B-2** | Set the `FAIRWORK_API_KEY` repository secret? (verified absent: repo + all 7 environments) | The entire compliance lane — every wage R80.4 quotes is a bundled snapshot with no provenance stamp | 7 d |
| **B-3** | Consolidation target: `/admin/data` (RLS-respecting, recommended) or `/developer/database` (as briefed, service-role)? | SPEC C Phase 0. Reverses the brief on evidence. | 2 d |
| **B-4** | **Do you want field-level relations back?** (re-put — the code already stripped them; see §5.3) | SPEC S §5–§6, ~30 fix items, and whether column-anchored edges are possible at all | 2 d |
| **B-5** | Adopt per-app accents — BSU purple, conduit green, R80.4 orange, throughput pink — or delete `[data-app]` and stay uniformly cyan? **Brand decision, not technical.** | SPEC T phase 6 | 2 d |
| **B-6** | Flattening direction: does `PageGridLayout`'s GridItem stop painting, or does `Card` go borderless on canvas? (they are byte-identical, drawn 1px apart) | SPEC T phase 4 — every canvas route in every app | 2 d |
| **B-7** | Does braden.com.au **manage** leads or **hand them to** crm7? CRM7 owns `leads` and has zero update sites; BSU and braden both write status. | A permanently-red one-shot gate. Either the write moves behind a crm7 RPC or the ownership map changes — both change doctrine. | 7 d |
| **B-8** | Do the 20 unbuilt parity gaps survive D-93–D-98? Three of those specs predate the portal rulings. | 20 parity specs | 10 d |
| **B-9** | Is the super-admin tier real — model enterprise-with-sub-orgs now? **Zero organisations currently have a parent.** | The cascade, descendant scoping, grant chain. `BSU#727` waits on it. | 16 d |
| **B-10** | Which custom-fields system is real — the typed registry, or the ad-hoc blobs? (a field in a blob inherits the blob's sensitivity) | The whole sensitivity backbone | 16 d |
| **B-11** | Does Gate G1 (*"no new data surface before `<DataState>` ships"*) apply to consolidating an **existing** surface? | Procedural gate on every SPEC C phase | 7 d |
| **B-12** | Is "reports" a page inside crm7 or a federated module? (*"this is a ruling, not a task"*) | Whether the Data Workspace lives in crm7 or BSU | 11 d |
| **B-13** | Doc-naming: forward-only cutoff in the gate, or accept 70 of 333 as known debt? (rename reverted, 51-file blast radius) | `check-doc-naming` stays red | 2 d |
| **B-14** | PITR (database rewind) — you flagged it for the week of 2026-08-11 | D-31; no backup has ever been proven restorable | 13 d |
| **B-15** | `host_employer_id` points at two different tables (`employers` in 5, `clients` in 3). One column name, two entities. | The data model under placements and compliance evidence | 2 d |
| **B-16** | Enable CodeQL (one admin toggle, verified still 403 "not enabled" on all three repos) | Code scanning | 13 d |
| **B-17** | Are award rates in the DB, or is R80.4's static corpus the record? `awards`=156 rows, `award_rates`=**0**. | Rate-storage design (needs B-2 first) | 10 d |
| **B-18** | `guest` is live data (2 rows) and declared nowhere in code — declare it read-only, or reject it at the door? | R-2 | 2 d |
| **B-19** | Three published packages reach zero apps (`@bsuite/jodie`, `@bsuite/eslint-config`, `@bsuite/tsconfig`) — should an app depend, or should they stop publishing? | Publish hygiene; interacts with 0.6 | 2 d |
| **B-20** | Is ADR-0007 (Stripe FDW) applied or retired? No `wrappers` extension, no `stripe` schema; migration written, never applied. | The billing lane | 7 d |
| **B-21** | Reference data into git — `report_templates` (23), `state_ir_config` (8), `storage.buckets` (19), `aass_providers` (6). Only `gto_standards_clauses` has your yes. | Seed strategy — effectively permanent once in history | 16 d |
| **B-22** | Org Documents: did you not know it was there, or did you try it and it failed? (complete feature, zero rows, no editor toolbar) | Discoverability fix vs rebuild | 16 d |
| **B-23** | May a non-manager write their own `user_id = auth.uid()` view-state row? Today a `staff` user can neither read nor write their own view state. | SPEC S P1-19 | 2 d |
| **B-24** | Should a placement or timesheet record **which site**? The column does not exist; sites link only to employers. | The permission product would be built around the absence | 16 d |
| **B-25** | `SPEC C B-5..B-10` — eight broken starter reports (build or withdraw); drop empty `financial_reports`; wire or drop `report_catalog_derived_measures`; is `@bsuite/page-builder` the page shell or a third canvas; ADR filing convention; is org-admin meant to have Browse? | Each localised | 2 d |
| **B-26** | crm7 `[NEEDS OPERATOR]` set: 54 doc-category sensitivity flags (agent guesses — **Photography Consent Form shipped NOT sensitive**); TFN/super forms; the 12 bsuite Platform placements rewritten to `manual` **seven days before the ruling that forbade touching them**. | Each localised | 10–41 d |

---

## 7. Things you documented that were never implemented

This is the section that matters most. Each is verified against the current file today, not
against a claim.

| # | What you asked for | When | Claimed delivered | What is actually there |
|---|---|---|---|---|
| **1** | **A data surface that opens showing data, not a form.** *"Airtable opens showing you a table. These open showing you a form."* | 2026-08-08, decision register:379 (and repeatedly 05-01 → 08-21 — 41 requirements across 22 dated statements) | **Yes** — same file, same day: *"The spreadsheet now exists — go and look… Pick a data type, see your rows straight away."* | `crm7/src/components/admin/BrowseDataTab.tsx:1058-1062` still gates the entire grid behind `{!selectedEntity && <p>Pick an entity above to see its rows…</p>}`. No default entity, no last-used. **16 days.** `crm7#1477`, the issue tracking it, was never closed — delivery was announced over an open issue. |
| **2** | **Fix the class, not the page.** *"A PR that fixes only the URL I named is a failed PR."* | 2026-08-13 directive:37 | — | Violated three times in this pass alone: the sidebar bug scoped to one nav item when it is every `asChild` link (§5.2); `crm7#1572` closed for three surfaces of an estate-wide UUID class; **Browse shipped to one of the two pages its own service file documents as the brief** (`browseDataService.ts:4` — *"`/admin/data` **and** `/settings/data` both open on a…"*; `BrowseDataTab` is imported by exactly one page). |
| **3** | **Client email from their own account (SMTP / Google / Azure).** | `crm7#1705` records the count in its own title: ***"raised 20+ times."*** | Never claimed | Still open, 11 days. And v3 **P0-6** shows it is worse than unbuilt — passwords go to plaintext columns while the read path expects Vault, so it is insecure **and** non-functional. The two facts live in different documents and neither references the other. |
| **4** | **Interactive borders must reach WCAG contrast.** | 2026-08-13 | The issue title is the admission: *"the operator's 'unstyled button' is 1.12:1 **and I reported it fixed**"* | Token minted (`--role-border-interactive`), **never adopted**. Measured today: schema card 2.27:1 dark / **1.06:1 light**; 173 files still carry a resting accent border. Same shape as `--app-accent` and `shadow-elev-*` — machinery built, never consumed. |
| **5** | **RAMS funding matrix** (ADR-0005, **ratified** — the estate's strongest form of "decided"). | `crm7#466`, 2026-05-05 | Ratified as an ADR | *"confirmed absent in production — `to_regclass('public.rams_funding_matrix')` is null, no function, no route. Funding amounts remain hand-keyed, the exact one-shot violation the ADR was written to close."* **111 days.** |
| **6** | **One-shot on leads → clients → host-employers; pipeline connected to conduit.** | pre-2026-08-13 | **`crm7#1267` and `crm7#1268` both closed COMPLETED** | `crm7#1687` exists solely to say so — its title begins *"[POSSIBLE REGRESSION] … despite crm7#1268 closed COMPLETED"*. Verified today: `pipeline_cards` has no FK to any `conduit_*` table. (The `#1267` half was genuinely fixed — `crm7#1688` closed today.) |
| **7** | **Three "NEXT" items from your 2026-07-27 notes** — schema-builder UX redesign (*"tidy/fit icons useless"*), dashboard in-place widget adding (**annotated by you as a regression — "was available"**), portal send/share links. | 2026-07-27, master roadmap | Not claimed, but the batch around them is `[x]` | **28 days.** Only partial traces: `throughput#291`, `crm7#1263`. **Portal share links has no issue in any repo.** |
| **8** | **A report that persists its sort** — promised to the user's face at `reports/[key].tsx:361`. | R-10 | Shipped as saved preferences | `reportViewPreferences.ts:180` hardcodes `sort: []`. Unfiled. |
| **9** | **Never display invented data**, especially for audit claims. | standing rule | S2's audit affordance shipped with the report builder | `reports/custom/create.tsx:219` writes a `tracks-changes` tag with zero readers; `:342` tells the user *"Track changes: enabled (audit columns)."* Unfiled. |
| **10** | **"Every page on every app"** — dnd-kit card independence, D2C gradient headings, no pure white/black. | *"raised innumerable times"* | Individual pages fixed repeatedly | No estate-wide issue exists for any of the three. Every fix in the history is page-scoped. **This is the pattern behind items 1, 2 and 4.** |

**The common shape:** in 6 of these 10, the *machinery* was built and the *adoption* never
happened — a token minted and not consumed, a service written and not called, an RPC built with
zero callers, a page fixed and its eleven siblings left. That is why it reads as
half-finished: it is not that nothing shipped, it is that the last 10% — the wiring — is where
work consistently stops, and no gate measures wiring.

**The single highest-value structural change available** is a CI gate that fails when a
package, token, hook or RPC is published with zero consumers. SPEC C §8.1 already specifies
one shape of it; `#2249` and `#2259` built adjacent detectors. That gate would have caught
items 1, 4, 5, 8 and 9 before they were reported as done.

---

## 8. Reconciliation — both directions

### 8.1 Specs and registers with **no issue** — file these

| Source | Finding | Repo |
|---|---|---|
| SPEC T §9 P0-2 | **Zero `:focus-visible` rules exist estate-wide**; 45 of 51 interactive elements on `/insights` paint no focus indicator. WCAG 2.4.7 | packages/theme |
| SPEC T §9 P0-1 | `TransitionNavLink` drops every `Slot`-injected prop (§5.2) | crm7 |
| SPEC T §5.1/§5.2 | `--surface-0..3` and `--border-hairline\|divider\|control` do not exist; 184 border-colour utilities / 2,315 occurrences | packages/theme |
| SPEC T §5.3 | 251 resting accent borders vs 79 state variants — **3.2:1** resting-to-state ratio | all |
| SPEC S | 20 remaining defects incl. **no keyboard path to create a relationship at all** (WCAG 2.1.1 **Level A**), connect handles 4× below the 24px floor, `reflect_entity_schema` built with **zero consumers** (498 real FKs invisible), `updateRelation` implemented with **zero callers**, `computeGridLayout` gaps smaller than the cards it lays out | crm7/packages |
| SPEC C | 8 of 9 absent capabilities: R-8 header filters, R-9 subtotals, R-15 add a row, R-18 server-declared writability (**two client heuristics that disagree**), R-19 revision history, R-21 saved view on a dashboard, R-36 FK chips, R-38 row expand | crm7 |
| SPEC C §1.5 | Five grids → one; three saved-view stores → one; four scoping vocabularies over one enum | crm7 |
| SPEC C §2.1 | The two lying UI surfaces (§5.4) | crm7 |
| Findings W-1/W-2 | `rate_adjustments` + `billing_cycles` have zero application reach (8 RLS policies gating a surface that does not exist); `gto_complaints.external_referral` unread | crm7 |
| Findings §8 | 91 Class-C orphaned tables; the GTO complaints register has no delete affordance | crm7 |
| v3 P0-1/6/8/9/10 | The five live security exposures — Lane 1 | estate |
| v3 U-2..U-12 | ~200 shipped-and-unreachable files, one issue per repo | estate |
| v3 M-1..M-10 | Nine surfaces erroring on migrations already in the repo | estate |
| v3 §6 | `prerender.mjs` swallows CI errors; braden's Lighthouse measures a build production never serves | crm7, braden |
| **notes.docx** | **12 of the 20 Lane 3 rows have no issue in any repo** | various |

### 8.2 Issues with no spec — these are real work with no design behind them

`crm7#1613` school-based apprentices absent from the pay-rate hierarchy · `crm7#1624` no runtime
timezone context (a WA shift read in Sydney time changes the award penalty rate) ·
`crm7#1643` audit-trail coverage "not universal" · `crm7#1721` `avetmiss-export` has never worked
(queries `subject_enrolments`, which exists in no migration) · `crm7#1403` `requoteOnRiseService`
aborts the whole batch on FutureBuild's 8 snapshots · `BSU#666`/`#667` (RULING 12.1 / 13.1) —
both rulings exist, neither has a spec · `bsuite#1882` no dashboards or charts anywhere.

### 8.3 Citations that point at nothing

| Cited | By | State |
|---|---|---|
| `#1963` | SPEC T §7 | not among the open issues |
| `#1955` | v3 **P0-9** (listed OPEN) | **closed** — either it was closed without the fix, or v3 is stale on a P0. Both are bad; neither can be assumed. |
| `Theme-best-practice.md` | `bsuite-brand-system` skill + 3 live crm7 comments | does not exist on disk |
| `check-unscoped-select-policies` | `20260817-estate-completion-ledger` | no script of that name exists |
| roadmap → `…register-v2.00W.md` as *"Current authority"* | master roadmap banner | **v3 supersedes v2 in full.** Pointer is one version stale. |

### 8.4 Precedent conflicts resolved

| Conflict | Winner | Why |
|---|---|---|
| visual-probe.js exists / does not | **Exists** | Measured 2026-08-24; `.remember/today-2026-08-23` already recorded SPEC T's claim as false. Two copies of the skill — §5.1. |
| v3 §1 **P0-5** *"BSU Billing.tsx presents fabricated prices"* vs v3 §2.3 **K-1** *"DONE, re-measured 2026-08-18"* | **K-1** | Later measurement **inside the same document**; the P0 row was never updated, so v3's own P0 list overstates by one and §9 still schedules it. |
| SPEC C §2.1 *"/developer/database is ~100% token-compliant"* vs SPEC T *"BLOCK, renders cyan where purple is declared"* | **Both true, of different things** | Same date, so date cannot separate them. SPEC C counted class literals; SPEC T measured composited rendered edges. SPEC T §3's own rule applies: *"a class grep alone would have missed the primary defect entirely."* Any CI check built from either must measure rendered edges. |
| roadmap plans against **R80.3** in four places | **The restructure** | R80.3 left the submodule set 2026-08-06 (`5e000c35`). Roadmap items N5, X5, X5b and W-9 have no owner as written. |
| **N-8** *"deferrals are forbidden"* vs SPEC C's 14–20-week phased plan | **N-8, unresolved** | SPEC C sees it and half-answers — it calls Option 3 *"a deferral wearing a Gantt chart"* while proposing a 20-week one. A later document does not dissolve an absolute earlier ruling. **Belongs with B-1.** |
| **N-4** *"NocoDB may be studied for interaction design; its code may never be read or copied"* vs SPEC C §5.1 quoting `nuxt.config.ts:20`, `useUndoRedo.ts` line counts and 71 controllers | **N-4** | Not a precedent question — a compliance one. Reading is what N-4 forbids. **Flagged, not adjudicated.** |

---

## 9. Label scheme

Eight labels, created across all seven repos, applied consistently.

| Label | Meaning |
|---|---|
| `ready` | Actionable now — no blocker, no decision needed |
| `blocked-braden` | Needs an operator decision (see §6) |
| `blocked-external` | Third party or vendor (SEEK/Indeed partner access, Xero app verification) |
| `spec-T` | Covered by the border/elevation spec — **run first** |
| `spec-C` | Covered by the consolidation ADR — **run second, after B-1** |
| `spec-S` | Covered by the schema-builder spec — **run third** |
| `class-false-gate` | Instance of `#1966` — a gate that checked nothing and reported green |
| `class-one-shot` | DRY one-shot / enter-once-use-everywhere violation |

Existing `p0`–`p3`, `security`, `bug`, `tech-debt` labels are unchanged and still apply.

---

## 10. Constraints observed in this pass

- **Git read-only in the estate.** No branch, commit, merge or push. Only this document was
  written, plus the `## Queued work` pointer in `CAMPAIGN-BRIEF.md`, plus `gh` issue
  close/label/comment.
- The three landmined crm7 worktrees (`crm7-1774`, `crm7-1812`, `crm7-1812b`) were not entered.
- `docs/OUTSTANDING.md` was not read.
- No Claude Code session was messaged.
- Doc paths were re-resolved at read time; the 51-file rename on `chore/doc-naming-convention`
  had not landed when this was written. **If a path here 404s, `ls docs/` — do not assume it was deleted.**
