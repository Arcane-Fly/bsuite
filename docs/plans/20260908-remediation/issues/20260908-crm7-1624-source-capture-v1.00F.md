---
kind: record
authority: none
owner: bsuite
---

# [P1][compliance] No runtime timezone context — a WA shift read in Sydney time changes which award penalty rate applies

https://github.com/GaryOcean428/crm7/issues/1624

Snapshot updatedAt: 2026-08-24T03:28:28Z. Open at capture; re-read live.

**Source:** operator full-spectrum review, 2026-08-11. Filed as **Tier 1** despite arriving under "UX polish" — this is a wage-compliance risk, not a nicety.

## Why this is compliance

CRM7 is a multi-state Australian GTO platform. WA is up to **3 hours** behind the eastern states, and DST rules diverge (WA has none; NSW/VIC/SA/TAS do; QLD does not).

Award penalty windows are defined in **local time**: early-morning loadings, night loadings, weekend boundaries, public-holiday boundaries. So:

- A shift recorded 05:30–13:30 **AWST** is 08:30–16:30 **AEDT**. One attracts an early-morning loading; the other does not.
- A Sunday shift starting 23:00 Saturday **AWST** is already Sunday in Sydney.
- A payroll cutoff at "midnight Friday" is three different instants across the estate.

**Getting the timezone wrong changes which penalty rate applies, and therefore what the apprentice is paid.** That is an underpayment or an overcharge, not a rendering bug — and under-payment of an apprentice is exactly the exposure a GTO carries.

## What the review found

The schema **has** timezone columns. There is **no runtime timezone context** — no provider, no per-tenant/per-placement resolution at the point where times are interpreted.

## Establish before fixing (do not assume)

1. **Where are the timezone columns, and are they populated?** Check the baseline dump (`supabase/migrations/baseline/20260807_prod_baseline_schema_dump.sql`), not just the migrations — three protections on another table existed only in production and in no committed file. Then check whether real rows carry a value or a NULL.
2. **How are timesheet times currently stored?** `timestamptz` (an instant, safe) or `time`/`timestamp` (wall-clock, ambiguous)? This determines whether the data is already wrong or merely displayed wrong. They are very different problems: one is a migration, the other is a render fix.
3. **Where does the penalty-window decision actually happen?** `@bsuite/charge-calc` owns rate calculation (R8 owns ALL rate calc — standing ruling). Trace whether it receives a timezone at all, or assumes server/browser local.
4. **What does the interpreter do today?** Find the shift-interpretation path and determine which clock it reads.

## Then decide

- Per-**tenant** timezone, per-**host-employer**, or per-**placement**? A GTO in WA can place an apprentice with a host in SA. The placement's location is what governs the award, not the GTO's head office.
- Display vs calculation: users should see local time; the engine must compute in the *placement's* zone regardless of who is looking.

## Verification this needs

A fixture-based test per state, crossing a DST boundary, asserting the **same instant** produces the correct and *different* penalty outcome per zone. Use real award windows (MA000020 etc. — see `biz-au-award-modelling`), and reconcile against the published pay guide, not a test-local re-derivation.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: a shift crossing an early-morning penalty boundary yields the correct loading in AWST, AEST and AEDT, proven against the published pay guide
- **Cross red-team**: claude-code verifies the engine actually receives the zone rather than defaulting
- **Skills to load**: biz-au-award-modelling, biz-au-award-boot, gto-rate-calculation-rules
- **Self-report on divergence**: yes

**Acceptance criteria:** the penalty-window decision is made in the placement's timezone, proven by per-state DST-crossing fixtures; and it is stated explicitly whether any historical data was interpreted in the wrong zone.
