# Retention — the operator's rulings, and what each one means for the build

**Date:** 2026-08-11 · **Status:** 1.00W · **Ruling by:** Braden
**Supersedes the open questions in** `crm7#1599` (retention shipped with defaults, pending confirmation)

Retention shipped 2026-08-10 with **default** periods and two questions flagged as needing an
operator answer. Both are now answered, and three further rulings were given that go beyond
what shipped. Recorded before they are lost.

---

## 1. The shipped periods are confirmed

> "Settings are correct."

No change to `error_log` 90 days, `audit_logs` 365 days, `audit_events` 7 years, or
`data_change_sets` 7 years, **except** as modified by rulings 3 and 5 below.

## 2. Training contracts: seven years, every state

> "training contracts are same 7 year period for all states."

**This closes the open question.** The shipped migration used the Commonwealth floor (Fair Work
Regulations 2009 reg 3.44) and flagged that Western Australia's State Training Authority rules
had not been researched and might be longer. They are not. Seven years applies uniformly and no
per-state branching is needed — which also means no per-state configuration to build, get wrong,
or keep current.

## 3. The archive design is approved

> "the retention_archive suggestions sounds good."

`public.retention_archive` — archive-then-delete, full row preserved as JSONB — stands as built.
Ruling 5 extends it from a safety net into a feature.

## 4. Recurring code errors must become GitHub issues

> "error logs as in code error logs if they are same error present after the 7 days, then Jodie
> should register them as an issue on github, there should be a function already to facilitate
> this... my git is connected via mcp for this so we probably need to ensure this mechanism by
> some form is in place and working and wired."

Correct that a function exists: **`jodie-bug-create`** (business-suite-unified edge function)
already creates GitHub issues, holds the credential, enforces a repo allowlist, labels by
severity, and records to `jodie_bug_reports`. It is **human-triggered only** — fired from the
Bug Report modal. Nothing watches `error_log`.

**Why this ruling is right, measured.** Applying the operator's own rule — same error first seen
over 7 days ago and still occurring this week — to live data returns **exactly seven** errors:

| error | occurrences | persisting | severity |
|---|---:|---:|---|
| `useBranding must be used within a <BrandingProvider>` | 1,856 | **80 days** | **fatal** |
| `[object Object]` | 84 | 104 days | error |
| `Failed to register a ServiceWorker…` | 26 | 12 days | error |
| `Missing queryFn: /api/whs/host-employers/upcoming-requirements` | 12 | 89 days | error |
| `permission denied for function reflect_entity_schema` | 9 | 39 days | error |
| `Rejected` | 8 | 13 days | error |
| `Missing queryFn: /api/field-officers/case-notes` | 2 | 14 days | error |

The first is a **fatal** error on **249 distinct URLs**, still firing today (23 hits on
2026-08-10), unnoticed for eighty days. It is the argument for the mechanism, in one row.

Note `[object Object]` is itself a logging defect — something stringified an object, so 84 real
errors are invisible. Fixing the mechanism will not reveal them; fixing the logger will.

**In build.** The seven errors are a separate remediation task, not part of the mechanism.

## 5. User activity logs: seven years, archived after two, recoverable on demand

> "user logs 7 years, archived after 2, but recoverable through inspection. e.g. if we need to
> work out who put something in the system 4 years ago so we know who to ask on some pressing
> question, the org admin or compliance officer if permissions scoped properly can run a report
> in the airtable reports and set a date range, if the date is set more than 2 years, user
> prompted to 'Recover from archive?' on 'yes' log is restored and repeat. possibly be offered
> to re-archive or leave active. if left active then archived again like other like activity
> records."

This is the substantial one, and it changes the archive from a safety net into a **tier**.

| age | where it lives | who can reach it | how |
|---|---|---|---|
| 0–2 years | live table | normal report permissions | ordinary report, no prompt |
| 2–7 years | `retention_archive` | org admin / compliance officer | report over a date range >2 years → **"Recover from archive?"** → restored, query re-runs |
| over 7 years | deleted | nobody | — |

The driving case is stated plainly: *work out who put something in four years ago, so we know
who to ask*. That is a real GTO compliance need, and it means recovery must be **self-service
for the right role**, not a support ticket.

Design points the ruling settles:

- **Recovery is a prompt, not an error.** A report reaching past two years must not fail or
  silently return nothing — it must offer the recovery.
- **"restored and repeat"** — after restoring, the original query re-runs automatically. The
  user should not have to remember what they asked for.
- **Restored rows re-enter the normal lifecycle.** Offer re-archive now, or leave active; if
  left active, they age out again on the same rules as any other activity record. No permanent
  exemption is created by having once looked at something.
- **Permission-scoped.** Org admin or compliance officer only. Note the BSuite vocabulary
  caveat: *super admin* means enterprise-plus-sub-orgs, *org admin* means one organisation.
  This is org-admin scope, not platform.
- **Reached through the Airtable-style reports**, not a separate admin screen — consistent with
  the standing ruling that all reporting and data manipulation goes through that surface.

**Not yet built.** The archive exists; the tiering, the prompt, the restore path and the
role gate do not.

## 6. Security logs need the same treatment as code errors

> "security logs need similar analysis so we dont have long standing zero day vunerabilities
> that never get actioned."

The same failure mode as ruling 4, applied to security findings rather than crashes: a finding
is recorded, nobody reads the table, and it stays open indefinitely. An eighty-day-old fatal
error proves the pattern is real here, not hypothetical.

**Open — needs its own investigation before building.** What exists today (Supabase advisor
sweeps, the RLS drift detector, `audit_events`, dependency alerts), where findings land, and
whether anything ever reads them. Deliberately not designed here: the ruling names the outcome,
and the current state has to be measured before a mechanism is proposed. The likely shape is
the ruling-4 mechanism pointed at a different source, but that should be a conclusion, not an
assumption.

---

## Where this leaves the work

| ruling | state |
|---|---|
| 1 · periods confirmed | done |
| 2 · training contracts 7y all states | **answered** — removes the WA open question |
| 3 · archive design approved | done |
| 4 · recurring errors → GitHub issues | in build |
| 5 · user logs 2y archive + recover-on-demand | **not built** — the largest remaining piece |
| 6 · security-log analysis | **not investigated** |

Nothing deletes anything today: confirm the cron schedule is registered before assuming data is
already ageing out — three cleanup functions in this database are scheduled on zero jobs
(`20260811-scheduled-job-coverage-investigation-v1.00W.md`).
