# BSuite — what "world class" actually requires

**Date:** 2026-08-13
**Mode:** strategy exploration + assumption testing
**Basis:** live branch and issue state across bsuite (54 open), crm7 (118), conduit (6), business-suite-unified (8) — 186 total. All four repos have clean branch state.

---

## 0. The framing I'd push back on

"Complete this project to a world class standard" treats completion as the goal and quality as the measure. Neither is the binding constraint right now.

The binding constraint is: **two enterprise clients are live on a database whose restore has never been verified, and a board pitch has a contractual dependency that has been open since 27 May.** Everything else is downstream of those two facts.

World class is not 186 closed issues. It is: a client can be onboarded, paid correctly, and audited, and if something breaks you find out from a monitor rather than from the client. Measured against that bar, the estate currently fails on the third clause in a way the issue list makes vivid.

---

## 1. The systemic finding — detection is excellent, signal is absent

This is the pattern that connects the most severe open issues, and it is worth more attention than any individual item on the list:

| Failure | Duration undetected | Issue |
|---|---|---|
| pg_cron jobs failing | 288 consecutive failures, zero operational signal | crm7#1617 |
| Every logged-out page view throwing | 1,856 fatal errors over 80 days | crm7#1603 |
| Production migration-history audit failing | 5 consecutive scheduled runs, 238 unexamined mismatches | bsuite#1898 |
| pgTAP suites passing against a partially-migrated database | Every green result to date | crm7#1506 |
| gitleaks scanning only the tip commit — and it is the *only* required check | Unknown | crm7#1639 |
| Publish step failing on every promotion | Every promotion | bsuite#1908 |

Six independent instances of the same shape: **a control that runs, fails, and tells nobody.** The estate is very good at building detectors and very bad at wiring them to a human. That is a single architectural gap, not six bugs, and it is the highest-leverage thing to fix because it is what makes every other number on the issue list untrustworthy.

Corollary worth sitting with: you do not currently know how many *more* of these exist. Six were found by audit. The seventh is undetected by definition.

**How might we** guarantee that no control can fail silently — such that a broken monitor is itself an alert?

The cheap version: one scheduled job whose only purpose is to assert every other scheduled job ran and succeeded in its expected window, and which pages a human on failure. It is a few hours of work and it retires the entire class.

---

## 2. The second systemic finding — the backlog has become the risk

crm7 issue numbers moved from 1531 to 1667 in four days. That is roughly 130 issues filed in a working week, against one operator and a set of lanes that mostly file rather than fix.

The audit worked. It worked so well that it created a new failure mode: **a backlog large enough that nothing in it is reliably read.** A P0 filed on 11 August — nobody can sign in to `d.crm.crm7.app` (crm7#1601) — has not been touched in two days. That is not because it is unimportant. It is because it is item 47 in a list of 118.

This is the point at which continuing to audit is negative-value work. Every additional finding dilutes the ones already there.

**What I would do:** freeze new issue filing in crm7 for one week, except P0/P1. Spend the week closing. Then reassess whether the remaining backlog is a work queue or a graveyard.

**The counter-argument, honestly stated:** unfound bugs do not stop existing because you stopped looking. If the audit is genuinely still surfacing wrong-money and compliance defects, stopping is worse. The test: what proportion of the last 30 filed are P0/P1? If it is falling, the seam is exhausted and the lanes should switch to closing.

---

## 3. What only you can decide — four items, all blocking

These are the actual answer to "what should I be doing next." Each has lanes waiting on it.

**3.1 — PITR (bsuite#1866).** Flagged by you for the week of 11 August. That is this week. Two live clients, migrations that are not meaningfully reversible, and D-31 (verified restore) still unsatisfied. This is the single decision with the worst downside if deferred and the smallest cost to make.

**3.2 — Are `contracts` and `training_contracts` the same entity? (crm7#1577).** Four contract tables, two unused. Related: crm7#1576 — `/contracts/:id` shows a host agreement but `/contracts/:id/edit` edits a training contract. That is a live data-integrity hazard, not a modelling debate, and it cannot be fixed until the entity question is settled.

**3.3 — Employee number format (crm7#1573).** `EMP-YYYYMM-NNNN`. It will appear on payslips. Trivial to decide, expensive to change after the first payslip is issued.

**3.4 — TFN and super forms (crm7#1605).** A lane has asked whether these can be made optional on the grounds that they duplicate captured fields. The issue title already says they are not duplicates. Confirm it and close it, because the wrong answer here creates a payroll compliance problem.

---

## 4. The wrong-money cluster

Three open issues that produce incorrect financial output. For a product whose value proposition is charge-rate correctness, this cluster outranks almost everything else on the list.

- **bsuite#1689** — the charge-calc converter treats a percentage allowance rate as a dollar amount. Labelled "latent wrong money."
- **crm7#1624** — no runtime timezone context. A WA shift read in Sydney time changes which award penalty rate applies. This is both wrong money *and* a compliance exposure, and it becomes materially worse the moment the Supabase project moves to Sydney (bsuite#1322) — a regional migration that changes the ambient timezone assumption is exactly the kind of change that converts a latent bug into a live one.
- **crm7#1612** — advanced charge-rate config displays hardcoded defaults and does not persist user selections.

The timezone one is the one I would treat as most urgent, because of its interaction with the Sydney migration. **Do not do the region migration before fixing it.** Sequencing those two in the wrong order turns a dormant defect into a live incident on a batch of real timesheets.

---

## 5. The MBAWA path — what actually has to be true

Working backwards from "MBAWA signs" rather than from the issue list:

**Contractual blocker.** bsuite#1322, Supabase project to `ap-southeast-2`, open since 27 May, labelled `external-blocked`. This is the longest-running item on the board and it gates the pitch. It should either be actively worked or the blocker should be escalated to whoever can unblock it — three months in `external-blocked` is a status, not a plan.

**Demo blockers.** crm7#1601 (cannot sign in to the dev environment) is a demo-killer. crm7#1595 (document generation non-functional in production) and crm7#1602 (6 of 23 starter reports query views that do not exist) are both things a prospect will hit within ten minutes of touching the product.

**The gap they will actually ask about.** bsuite#1882 — no PowerBI-style dashboards or charts exist anywhere in the suite. A board evaluating a workforce-management platform will ask to see the reporting. "It exports to Excel" is not the answer that wins that room.

**The thing that will look worst.** crm7#1517 — the workspace silently discards your entity selection about a second after you make it, on roughly one cold load in three. Still unassigned. A working feature that appears broken in a live demo does more damage than a missing one.

---

## 6. What is absent from the issue list and should not be

This is the section I would most want you to read, because these are gaps nobody has filed — and an unfiled gap is invisible to every process you have.

**6.1 — Privacy Act and the TFN Rule.** You are storing tax file numbers. That triggers specific obligations under the Privacy (Tax File Number) Rule 2015 and the Australian Privacy Principles, plus the Notifiable Data Breaches scheme. There is no issue anywhere about a breach notification procedure, a privacy policy that reflects actual data handling, or a data retention and destruction schedule for TFNs. For a product handling employee tax data across multiple employer clients, this is a larger exposure than any code defect on the board.

**6.2 — Vault key custody.** Sensitive documents and payroll secrets are encrypted with per-tenant keys in Supabase Vault. There is no issue about key backup, key rotation, or what happens if a key is lost. If a tenant encryption key is lost, those documents are unrecoverable — including the ones you are legally required to retain. This is a single point of total data loss with no recorded control.

**6.3 — Restore rehearsal, not just backup.** D-31 remains unsatisfied. A backup nobody has restored is a belief. This is distinct from the PITR decision (3.1) — PITR is the mechanism, rehearsal is the proof.

**6.4 — Bus factor of one.** Sole owner, sole operator, sole developer, sole approver, sole holder of the domain knowledge that decides whether an award interpretation is right. Two enterprise clients depend on that. There is no continuity plan, no second person with production access, no documented runbook a competent stranger could follow. For an enterprise sales conversation this is also a procurement question you will eventually be asked directly.

**6.5 — Fair Work MAPD as a single point of failure.** The charge calculator depends on a live external API. There is caching and a fallback ladder, but no issue about what happens if the API changes shape, is deprecated, or returns subtly wrong data. A silent upstream change to award data is the highest-consequence external dependency in the product.

**6.6 — No third-party security review.** bsuite#1897 notes code scanning is off across all three repos; bsuite#1883 notes no code-review bot runs on any PR. Beyond fixing both, an enterprise client in this sector will eventually ask for evidence of an independent assessment. Nobody has scoped one.

**6.7 — Customer-facing documentation and support.** No issue anywhere covers user help, training material, onboarding guidance for a new tenant, an SLA, or an incident-response process for a client-reported fault. You have two live clients and no defined way for them to report a problem or know when it will be fixed.

**6.8 — Terms that match the posture.** RULING 0.1 through 0.6 established that the platform facilitates and does not determine, that the GTO holds the obligations, and that the host has no interpretive standing. If the customer agreement does not say that, the design posture and the contractual posture disagree — and the contract wins. Nobody has checked.

**6.9 — Load and volume.** crm7#1628 notes EnhancedDataTable has 95 importers and renders every row, with react-virtual installed and used once. Nobody has established what happens at realistic tenant volume — a GTO with 400 apprentices and three years of timesheets. That number is knowable now and expensive to discover during a pilot.

---

## 7. Reverse brainstorm — how would we make this worse?

Useful because each item inverts into something to protect against.

- Keep auditing and stop closing → **invert:** switch the lanes to closing when the P0/P1 rate falls.
- Let the operator remain the only approver → **invert:** define what an agent may merge without you, in writing.
- Fix the timezone bug after the Sydney migration → **invert:** sequence it before.
- Add more monitors → **invert:** add one monitor whose job is to watch the monitors.
- Ship more surfaces before the existing ones are wired → **invert:** freeze new surface work until the unwired inventory is zero.
- Store more sensitive data before the privacy controls exist → **invert:** the TFN and bank-detail capture UI should not ship until 6.1 and 6.2 have answers.

That last one is a real sequencing constraint, not a rhetorical device. The structured payroll tables are built and the capture UI is not. That is the correct order to be caught in, and it would be a mistake to close the gap without the privacy and key-custody work landing alongside.

---

## 8. What I would actually do, in order

**This week — decisions and signal.**
1. Make the four decisions in §3. All are minutes of your time and each unblocks a lane.
2. Fix crm7#1601. A dead dev environment blocks demos and testing.
3. Build the watcher-of-watchers from §1. One job, retires a class.
4. Answer §6.2 — where are the Vault keys backed up, and has anyone tested restoring one.

**Next two weeks — trust the numbers again.**
5. crm7#1506 — until migrations replay cleanly on CI, no test result in that repo means anything.
6. bsuite#1898 — 238 unexamined ledger mismatches on a production database with live clients.
7. bsuite#1892 — no environment can validate a migration before production. This is the root cause the other two are symptoms of.
8. The wrong-money cluster in §4, timezone first, before any region migration.

**This month — the pitch.**
9. bsuite#1322 escalated or worked. Three months in `external-blocked` needs an owner or a decision to proceed without it.
10. crm7#1595 and crm7#1602 — document generation and the six broken starter reports.
11. bsuite#1882 — a credible reporting and dashboard story.
12. crm7#1517 — the workspace selection bug, because of how it will look.

**Ongoing — the things nobody filed.**
13. File §6.1 through §6.9 as issues. An unfiled gap cannot be prioritised, assigned, or closed, and six of the nine are larger than most of what is currently on the board.

---

## 9. The question I would put back to you

Everything above assumes the goal is a product two enterprise clients depend on and a board will buy. If the real goal is different — a demonstration of what an AI-operated estate can build, or an asset to sell, or a platform to license — the priorities reorder substantially. A saleable asset needs the §6 governance items far more than it needs the reporting dashboards. A reference implementation needs neither.

The issue list cannot tell you which of those you are building. Only you can, and it changes what "world class" means by a considerable margin.
