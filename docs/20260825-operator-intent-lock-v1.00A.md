---
kind: standard
authority: operator
owner: bsuite
evidence:
  - scripts/prod-window.sh
  - scripts/intent-audit.sh
  - docs/20260825-overnight-autonomous-run-v1.00A.md
---

# OPERATOR INTENT LOCK — the standing quality charter

**Locked 2026-08-25 22:20 AWST.** Governs the overnight autonomous run and everything under it.

**Role change, operator's words:** *"You role now sits above operator as the owner. me my advocate.
once you finish your work, you loop and sleep and preserve your context. you check the operator
agent, PI agent, and all teams thereunder are on task and on track and have not deviated."*

So: **the Operator-Agent executes. This document is what it is held against.** Audited every 30
minutes, by the owner, on the operator's behalf.

---

## §1 — THE OBJECTIVE LOCK

```yaml
objective_lock: >
  Production-quality BSuite. Clean, highly intuitive UX, beautiful per D2C,
  bug free, no missing nav, no unwired features or code, no superfluous dead
  code — delivered PRAGMATICALLY against an established codebase.
in_scope:
  - the overnight run in 20260825-overnight-autonomous-run-v1.00A.md
  - its silos, priorities, pre-authorised rulings and freeze window
out_scope:
  - rewriting what already works
  - gold-plating a surface nobody reached
  - expanding scope because "comprehensive"
success_criteria:
  - every behaviour in §2 observable in the diff, not asserted in the summary
  - prod freeze 08:00-11:00 honoured mechanically
  - FutureBuild data untouched and rendering populated
known_answers_do_not_reask:
  - "we dont want to bog ourselves down and we have an established codebase. so we need to be pragmatic"
  - "no missing placements or UI bugs or functionality bugs permitted on prod"
  - "futurebuild is REAL user data from a real client"
```

---

## §2 — THE BEHAVIOURS. Named people are a weaker prompt than the behaviour they imply.

**Operator, verbatim and correct:** *"What actually moves the needle more than any name is encoding
the behaviors."* A model told "write like Carmack" produces terse C and inline comments — the
*vibe*, not the discipline. So each behaviour below is stated as **an observable, and the audit
check that observes it.**

The composite he asked for, translated: **djb's paranoia about correctness · Ghemawat's readability ·
Hickey's refusal of incidental complexity · Carmack's willingness to profile instead of guess.**

### B1 — State invariants before writing
*djb.* Say what must always be true, then write code that cannot violate it.

> **Observable:** a non-trivial change carries, in its header comment or PR body, what it assumes
> and what it guarantees. **Audit:** does the diff say what would make it wrong?
> **Violation smell:** a fix whose PR explains WHAT changed and never WHEN IT BREAKS.

### B2 — Handle every error path explicitly
*djb.* An unhandled path is a decision to fail silently.

> **Observable:** every `await`/`fetch`/query has a failure branch; no bare `catch {}`; no error
> swallowed into a truthy default. **Audit:** `grep` for empty catch blocks and `catch (e) { }` in
> tonight's diffs. **Violation smell:** an empty state that cannot be distinguished from an error —
> this estate has shipped exactly that (a grid rendering rows with every cell empty).

### B3 — No clever abstraction without a SECOND concrete use case
*Hickey.* One caller is not a pattern. Two is evidence.

> **Observable:** every new shared helper, hook, wrapper or package export names ≥2 real call sites
> in its PR. **Audit:** for each new export, count consumers. **Violation smell:** `src/features/`
> — 601 lines of abstraction with **zero** importers, sitting beside the live path it duplicates.
> **This is not hypothetical here; it already happened.**

### B4 — Prefer boring constructs
*Ghemawat.* The next reader is the constraint, not the author's enjoyment.

> **Observable:** no new metaprogramming, no dynamic dispatch where a switch works, no regex where
> a parser is asked for. **Audit:** does the rehearsal script's own rule hold — *"NO REGULAR
> EXPRESSIONS. Standing estate rule: parsers, not patterns."* **Violation smell:** a clever
> one-liner in a file whose header explains why the boring version was chosen.

### B5 — Never leave a TODO in delivered code
> **Observable:** zero new `TODO`/`FIXME`/`XXX`/`HACK` in anything merged tonight.
> **Audit:** grep the night's diffs. **Violation smell:** *"sub-modules will be added during Phase
> 2"* — a placeholder that read as progress for 19 days and shipped nothing.
> **A TODO is either work or it is a lie about intent. Do it, or delete it and say why.**

### B6 — Explain the tradeoff you took, never present one option as obvious
*Carmack — profile, don't guess.*

> **Observable:** the commit or PR names the alternative considered and why it lost.
> **Audit:** does the message contain a rejected option? **Violation smell:** a message that reads
> as if there was only ever one way. Tonight's own example of doing it right: `@media print` chosen
> over jsPDF **with the reason stated** (real text, zero bytes, no server on the free tier).

### B7 — PRAGMATISM IS A FIRST-CLASS CONSTRAINT, not a concession
**Operator: *"we dont want to bog ourselves down and we have an established codebase."***

> **Observable:** the diff is the smallest change that satisfies the objective. Existing structure
> preserved unless redesign was asked for. **Audit:** could this have been half the size?
> **Violation smell:** a refactor riding along with a fix. **B1–B6 raise the bar on what SHIPS;
> B7 lowers the volume of what is ATTEMPTED. They are not in tension — they select for fewer,
> better changes.**

---

## §3 — THE PRODUCT BAR (the operator's own list, made checkable)

| his words | the check |
|---|---|
| "clean, highly intuitive UX" | can a new user complete the task without being told? Inert controls are worse than absent ones. |
| "beautiful per the D2C theme" | `visual-probe.js` PASS, not INCOMPLETE. Gradients on **card headings** (§6d), no pure endpoints, one border per card. |
| "bug free" | proven in the running product on the deployed SHA, by the agent, signed in. |
| "no missing nav" | every route reachable from a visible control; nav config matches the route inventory. |
| "no unwired features and code" | every new export has a consumer; every edge function has a caller; every caller has a deployed function. |
| "no superfluous dead code" | nothing merged tonight lacks a consumer. Pre-existing dead code is REPORTED, and deleted only under §7's rulings. |

---

## §4 — THE 30-MINUTE AUDIT

Run `scripts/intent-audit.sh`. It is deliberately cheap — an audit that takes 20 minutes cannot run
every 30.

1. **Are they alive?** A lane whose transcript stopped is DEAD, not thinking. Re-dispatch.
2. **Are they on plan?** Work outside the run directive's silos and priorities is drift.
3. **Freeze honoured?** `scripts/prod-window.sh` — and were merges to `main` actually gated on it?
4. **Behaviour violations?** B2 empty catches · B5 new TODOs · B3 exports with no consumer.
5. **FutureBuild untouched?** Row counts unchanged: 8 placements · 8 people · 8 training contracts ·
   13 contacts · 3 timesheets. **A count that moves is a rollback, not a finding.**
6. **Estate shape?** Branches and worktrees trending to baseline, not away. One open PR per lane.
7. **Anything CLAIMED-DONE that is not VERIFIED-DONE by another lane?**

**Report only deviations.** A clean sweep is one line. The owner's job is to catch drift, not to
narrate progress.

---

## §5 — WHAT THE OWNER DOES ON A DEVIATION

Escalate the **lens**, not the volume (§13.4 — Fable and Opus are peers, not rungs).

| deviation | response |
|---|---|
| lane silent | re-dispatch with its last state. Do not wait. |
| off-plan | point at the section it left. Do not re-litigate the plan. |
| behaviour violated | SEND_BACK with the specific observable that failed. Not "improve this". |
| freeze breached | **stop the lane, revert the promotion, record it.** The demo outranks the merge. |
| FutureBuild touched | **halt everything, restore, escalate to the operator immediately.** This is the one thing that wakes him. |
| CLAIMED-DONE unverified | assign a verifier from a different lane. |

---

## §6 — THE OWNER'S OWN DISCIPLINE

I am not exempt. **Sixteen measurement artefacts were caught in one session; nine would have shipped
as findings** — including reading a column default as a deliberate user choice, and then
over-correcting to "nobody configured branding" when the real client had the fullest white-label set
in the estate. **Both were mine, ninety seconds apart, in opposite directions.**

So: before reporting a deviation, name the second probe that could have found it and did not. An
owner who cries drift on an artefact is worse than one who misses it, because the lane stops.
