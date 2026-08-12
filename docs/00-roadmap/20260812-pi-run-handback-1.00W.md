# PI run handback — 2026-08-12

**For Braden.** Written by `operator-proxy-claude`, standing in from ~12:38 AWST while you were out.
Ordered by **what needs you**, not by what was done. The work is at the bottom.

---

## 1. Four decisions waiting on you

| # | Decision | What changes on yes vs no | My recommendation |
|---|---|---|---|
| **A** | **crm7#1605** — do the signed TFN declaration and super choice *forms* carry a retention obligation distinct from the captured fields? | Yes → both stay mandatory documents. No → the super form could be optional. | I am confident on the TFN declaration and **not** on super. This is a statutory reading and yours. Nobody guessed in your absence. |
| **B** | **bsuite#1892** — a dev-branch database, so a migration can be validated before production | Costs money. Today `d.crm.crm7.app` runs development code against **main's** schema, so a migration-dependent feature cannot be validated anywhere before prod. | Worth it, but it is spend and therefore yours. |
| **C** | **`quality.yml` deletion** — no trigger so it never runs, duplicates `ci.yml`, referenced by no branch protection | Deleting removes dead weight. Keeping costs nothing but confusion. | Delete. Evidence is good; it is pre-existing work so it stays until you say. Held on `fix/ci-guards-deferred-items-20260811`. |
| **D** | **G3 visual sign-off** — nothing promoted to `main` all run | Everything is on `development` waiting for your inspection. | Inspect, then promote. **This also gates the conduit security fix — see §2.** |

**One decision came off your list without you.** Row 3.2 was "which employee-number format?" — crm7#1662 made it a **per-tenant setting** instead. The lane removed the question rather than answering it. That is your own principle, and it is the right instinct.

---

## 2. Merged but NOT verified — read this before promoting

### Row 4.5 — R80.4 sign-out did not terminate the session

**The defect:** R80.4 authorised against `suite.crm7.app` but signed out against `d.suite.crm7.app`.
A user clicked Sign Out, believed it, and returning to the app **silently re-authenticated them**.
No attacker, no skill — just a shared machine.

**The fix is merged and, on inspection, better than what I asked for.** I asked for a configurable
hub. The lane instead derives the hub origin from the **Supabase project ref that issued the
session** and demotes `VITE_BSU_URL` to advisory. The invariant it states is the real one: *the
origin you send a user to in order to end a session must be the origin that issued it.* My version
would have added a second hardcoded host wearing an env var's clothes.

**It is not verified.** I read the module; I did not prove a session dies. I tried twice and both
probes were broken — details in §4. It goes to you as **merged-but-unverified**, and that is the
honest description.

**The control is free but closing.** The fix is on R80.4 `development` and absent from `main`, so
`d.r8.crm7.app` versus `r8.crm7.app` is a real A/B **until the next promotion**. Use it first.

### conduit#433 — the P0 that cannot ship

The public job-application RPC has no token, its rate limit buckets on a caller-supplied value,
and it answers *"is this person in your candidate database?"* — returning the real candidate UUID —
to anyone **who already has an email address to test**. Enumeration against a list, not a dump, but
these are job applicants and that is exactly what they expect to stay private.

The fix merged (conduit#434) and **cannot apply** — the applier runs on the parent's `main`, which
this run deliberately did not touch.

**Open question I could not get answered** (asked three times, closed as unanswered rather than
chased a fourth): *can the oracle be closed at the edge, or by not returning the real candidate
UUID?* Either is an app-layer change that ships through the normal deploy without the applier and
without your gate. If yes, applicants are protected today. If no, it waits for the promotion.

---

## 3. What shipped — 12 merges across all seven repos

| repo | merged |
|---|---|
| bsuite | #1924 PI brief + credentials correction · #1925 plan docs · #1926 four gates that could not gate |
| crm7 | #1660 unbundled CI guards · #1661 secret-gate depth + anonymous-view fatals · #1662 employee number as a setting · #1663 two functions trusted a header the caller writes |
| business-suite-unified | #697 the secret gate never ran on the branch every PR targets |
| conduit | #434 the anon write surface — unbypassable throttle |
| braden | #379 the one check that cannot be skipped was scanning the wrong thing |
| throughput | #274 **this repo had no secret scanning at all** |
| R80.4 | #30 branch model + award partials + server-side persistence + the sign-out fix |

Still open: conduit#436 (secret gate + colour), R80.4#31 (the clause gate could not tell 26.4 from 26.5).

**Row 1.1 was the run's best result.** It began as a crm7 gitleaks depth bug and turned out to be
estate-wide — one repo had no secret scanning whatsoever. Closed in five repos.

**Also found:** R80.4's `development` was accepting work **without its checks having to pass**,
which contradicts your branch policy. Found while investigating a stale register row.

---

## 4. What I got wrong

**I nearly reported row 4.5 verified on a false positive.** My signed-in marker was
`/signed in|Business Suite|braden@/i`. The hub login page's own copy reads *"Sign in to access your
business suite"* — so the regex matched **the login page**, and both hosts reported "signed in"
when neither had. Both runs then ended at the hub login with no email prefilled, which is exactly
what a pass looks like. What caught it was an incidental field showing the Sign Out button had
never been clicked.

This is the nav-text trap another lane documented this morning and I had quoted back at the PI
twice. **Boilerplate that contains your marker is worse than no marker, because it fails toward
success.**

Second attempt used the email as a unique marker — real, but it lives behind the account menu, not
in body text, so the probe could not see it either way. I stopped rather than try a third variant.

**Smaller ones:** I reported crm7 as not waived in `KNOWN_DRIFTED` and the parent rule as still
buggy — both wrong, I had read the shared working tree instead of `origin/development`. I recorded
R80.4 as having no `development` branch; true when written (a base-change to it returned 422) and
false within hours. And I nearly challenged the sign-out fix's single-entry hub map before reading
the comment that already explained it.

---

## 5. State of the estate

**Consolidation debt** — all collision-clear, none promoted:
crm7 8 ahead (3 migrations) · conduit 5 (1) · R80.4 3 (1) · BSU 2 · braden 2 · throughput 2.

**The ordering, when you promote** — this is the step that bites:
submodule → its own `main` first · **then** parent gitlinks, with
`git merge-base --is-ancestor <old> <new>` checked per submodule · **then** the parent, which is
the only step that applies migrations. Yesterday the naive version would have discarded 2, 5 and 3
commits from conduit, braden and throughput.

**Migration collisions: 16 cross-submodule, unchanged.** The estate gained 13 migrations today from
six lanes and added **zero** new collisions — the PI's central version allocation is working. Detail
in bsuite#1914; do not re-derive it.

**A process note.** The PI ran hard for the first hour, then went silent to me for the rest of the
afternoon while its lanes kept shipping. Work never stopped, but four of my messages went
unanswered, so I verified the collision count and the merge state myself rather than wait. If you
run this structure again, the PI needs a heartbeat obligation — the lanes were fine; the channel
upward was not.
