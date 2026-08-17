# Award clause coverage — measured against real placements, not a reference catalogue

**Date:** 2026-08-17 · **Status:** W (working) · **Supersedes** the M-3/M-4 scoping in
`docs/20260817-completion-proof-v1.00W.md`

---

## What happened

A lane closed M-3 (clause coverage) and M-4 (allowance adapters) as "done for the entire
in-scope population", on this reasoning:

> `award_trades` = 27/27 rows, all MA000020 — no other of the 21 modelled awards has a
> single live GTO placement, so MA000020 IS the whole of M-3's real-world scope.

An adversarial reviewer overturned it, and re-measuring confirms the reviewer.

**`award_trades` is not a placement ledger.** It is a static trade/tool-allowance
*reference catalogue*: 27 rows, one award code, and **every row has `tenant_id` NULL** —
global reference data, seeded once, belonging to no tenant. Counting it to decide which
awards have apprentices is like counting the entries in a dictionary to decide which words
someone has spoken.

## What the real ledger says

`public.placements` — the table crm7 actually reads:

| award | placements | with a real apprentice |
|---|---:|---:|
| MA000020 | 3 | 3 |
| MA000010 | 2 | 2 |
| MA000025 | 2 | 2 |
| MA000018 | 1 | 1 |
| MA000003 | 1 | 1 |
| MA000004 | 1 | 1 |
| MA000009 | 1 | 1 |
| MA000029 | 1 | 1 |
| **(no award_code)** | **20** | 1 |

**Eight awards carry real apprentices, not one.**

## Why that matters — clause coverage of those eight

| award | modelled | **partial** | coverage ledger |
|---|---:|---:|---|
| MA000003 | — | — | **NO LEDGER FILE** |
| MA000004 | 31 | **9** | present |
| MA000009 | 35 | **9** | present |
| MA000010 | 35 | **13** | present |
| MA000018 | — | — | **NO LEDGER FILE** |
| MA000020 | 16 | **16** | present |
| MA000025 | 12 | **10** | present |
| MA000029 | 23 | **16** | present |

So an apprentice placed under MA000025 is being costed against an award with **10 partial
clauses**, and two awards carrying live apprentices — **MA000003 and MA000018** — have no
coverage ledger at all.

Closing M-3/M-4 as "done for the in-scope population" would have recorded that as complete.

## The second finding, which nobody was looking for

**20 active placements have no `award_code` at all, and 8 of them carry a charge rate.**

A placement with a charge rate and no award is a wage being billed with no stated legal
basis. That is not a coverage gap — it is a placement that cannot be checked against any
award, and it is invisible to every award-coverage measure precisely because it names no
award.

## What this changes

- **M-3 and M-4 are NOT closed.** The in-scope population is 8 awards, not 1.
- The scoping principle stands — close the awards that carry real apprentices, do not thin
  coverage across all 21. Only the *measurement* of which those are was wrong.
- MA000003 and MA000018 need coverage ledgers before they can even be assessed.
- The 20 award-less placements are a separate, higher-priority defect.

## The lesson, because it is the third instance today

**Measuring the wrong table produces a confident, precise, wrong answer.** The lane's method
was sound — measure before scoping, do not thin coverage — and its arithmetic was right. It
counted a reference catalogue instead of a ledger, and every conclusion after that inherited
the error.

The tell was available: `tenant_id` NULL on all 27 rows. Tenant-scoped work belongs to a
tenant; global reference data does not. A table where every row is global cannot be
evidence about what any particular tenant is doing.
