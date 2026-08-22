# Security signals — what we detect, and what nobody reads

**Date:** 2026-08-11 · **Status:** 1.00W · **W5 of the data-platform completion program**
**Operator ask:** *"security logs need similar analysis so we don't have long standing zero day
vulnerabilities that never get actioned."*

## The finding, in one line

**BSuite's security detection is good. Its routing is absent.** Nothing here failed to *find*
problems — three separate mechanisms found them, wrote them down, and were not read.

This was investigated before being designed, deliberately. The obvious answer — point the new
recurring-error mechanism at a security source — turns out to be **wrong for two of the three
cases**, and that only became clear by measuring first.

---

## What was measured, 2026-08-11

### 1. Dependency alerts — 159 open, oldest 3½ months

| repo | open alerts |
|---|---:|
| **bsuite (parent)** | **159** |
| business-suite-unified | 3 |
| crm7 | 1 |

The parent's 159, by severity:

| severity | count |
|---|---:|
| **critical** | **1** |
| high | 81 |
| medium | 60 |
| low | 17 |

The critical is `shell-quote` — `quote()` fails to escape newlines. Oldest open alert is
`postcss`, **25 April 2026**. Several `brace-expansion`, `js-yaml` and `image-size` denial-of-service
advisories sit in the high band.

**Nothing is wrong with the detector.** GitHub found all 159 and has been showing them the
whole time.

### 2. Code scanning — not enabled anywhere

```
bsuite                   403 — code scanning is not enabled
crm7                     403 — code scanning is not enabled
business-suite-unified   403 — code scanning is not enabled
```

CodeQL is free on these repos. The class of defect it catches — injection, unsafe
deserialisation, path traversal — is currently caught by nothing.

### 3. A scheduled audit that has been red for five consecutive runs

`prod-migration-history-audit` is **scheduled**, **runs daily**, and its last five runs —
including today's — **all failed**. Its output:

- **Drift class A: 238 migrations** recorded in `schema_migrations` whose source file is
  non-empty. The ledger says applied; the file says there was SQL to run. This is the
  *"a recorded migration is not an applied one"* class.
- **Drift class B: 2 migrations** at/above the floor with **no ledger row at all** —
  `20260630120000` and `20260702090000`, both `throughput`.

The workflow's own message is unambiguous: *"Verify these objects live before assuming this is
safe."* Nobody has.

By contrast `prod-rls-policy-drift-audit` — same schedule, same estate — has passed its last
five runs. So the machinery works. One audit is green and one is red, and both are equally
unread.

### 4. Two more from earlier today, same shape

- **Three protections existed only in production** — RLS enabled, a SELECT policy, and an
  `anon` schema revoke on `catalog.qualifications` — present in no committed file. A rebuild
  would have dropped all three.
- **Three cleanup functions scheduled on zero cron jobs.**

---

## Why the obvious answer is wrong

The recurring-error mechanism shipped today files a GitHub issue when the same error persists
past seven days. Pointing it at security findings is the tempting move. It is right for
**one** of the three cases and wrong for the other two.

| source | file an issue per finding? | why |
|---|---|---|
| **Failing scheduled audit** | **Yes** | One finding, actionable, currently invisible because nobody watches scheduled runs |
| Dependency alerts | **No** | 159 issues would bury the tracker on day one, and GitHub already has a purpose-built queue with its own UI. The problem is not routing — it is that **nobody is accountable for the queue** |
| Code scanning | **No** — enable it first | There is nothing to route yet |

**A mechanism that files 159 issues trains the operator to ignore issues.** That is worse than
the current state, and it is the failure mode this whole exercise is trying to avoid.

---

## Recommendations, in order of value

**1. Treat a red scheduled audit as a build break.** `prod-migration-history-audit` has been
failing for five runs and the estate did not notice, because nobody watches scheduled workflow
runs the way they watch PR checks. Route a *failing scheduled security/integrity workflow* into
the recurring-error filer — one issue per workflow, not per finding, reopened if it recurs.
This is the single change that would have surfaced all of items 1–4 above.

**2. Enable code scanning on all three repos.** It is free, it is off, and it covers a defect
class nothing else here covers. One settings change per repo.

**3. Triage the 159, and make ageing visible.** Not 159 issues — a **weekly digest** naming
counts by severity and the **age of the oldest unactioned alert**. Age is the number that
matters: "1 critical, 81 high, oldest 108 days" is a sentence someone acts on. "159 open" is
wallpaper. The `shell-quote` critical and the oldest `postcss` alert should be actioned
regardless of what mechanism lands.

**4. Investigate drift class A before assuming it is benign.** 238 migrations recorded as
applied with non-empty source files is either a reporting artefact of the shared ledger or a
real integrity problem, and **which one is unknown**. The audit itself says to verify the
objects live first. This needs its own piece of work — it is too large to fold into a
recommendation and too serious to leave unexamined.

**5. Assign an owner.** Every finding above was *detected*. The gap is that no lane owns the
queue, so a red audit and a critical CVE both sit until someone happens to look. A mechanism
without an owner becomes another unread signal.

---

## What this does not cover

Runtime security events — failed authentication bursts, RLS denials, privilege-escalation
attempts — were **not** examined here. `audit_events` (116 rows) and `audit_logs` (2,215) exist
and now have retention, but whether anything *reads* them for attack patterns is a separate
question from the CI/dependency signals above. Flagged rather than answered: it is a different
investigation, and guessing at it would repeat the mistake this document exists to avoid.
