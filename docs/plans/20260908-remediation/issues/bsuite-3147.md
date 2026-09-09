# The rehearsal's in-baseline rule is magnitude, not membership — a refreshed BASELINE_MAX silently selects ZERO migrations for two months

https://github.com/GaryOcean428/bsuite/issues/3147

Snapshot updatedAt: 2026-09-07T09:42:52Z. Open at capture; re-read live.

## The rehearsal classifies "in-baseline" by MAGNITUDE, and production holds 64 future-dated applied versions

`scripts/supabase/rehearse-migrations.mjs:862`:

```js
if (baselineMax !== null && migration.version <= baselineMax) {
  results.push({ ...migration, status: 'in-baseline' });
```

`version <= baselineMax` is equivalent to *"already applied"* **only while the ledger holds no
version dated after today.** Production's ledger does not satisfy that.

## Measured

**823 applied versions, of which 64 are FUTURE-DATED** — running daily from `20260908000000`
through **`20261121000000`**, which is the maximum.

So the moment anyone regenerates the baseline and sets `BASELINE_MAX` to the new maximum, the
rule reclassifies **every migration written before 2026-11-21** as "in-baseline":

| selection | files that replay |
|---|---|
| `BASELINE_MAX = 20260807110000` (today) | **25** in crm7's top level, **178** including `archive/` |
| `BASELINE_MAX = 20261121000000` (a refreshed max) | **0** |

**The rehearsal would go green with no subject at all**, and stay that way for two months.

## Why this is a landmine specifically now

bsuite#3143 has just made the rehearsal replay `archive/` — good, and it took crm7's set from
25 to 178. The obvious next step for anyone looking at the remaining substrate staleness
(bsuite#3136) is to refresh the baseline dump and raise `BASELINE_MAX` to match. **That is the
exact action that trips this.** The two changes look complementary and are not.

I hit it in crm7#2533 and only caught it because the accountability lane measured the replay
count. My own acceptance test could not see it: `replay-schema-diff.sh` selects by **membership**
— it asks the replay database whether the version is in `schema_migrations` — so it stayed green
while the magnitude-based gates would have gone blind. One instrument was structurally incapable
of seeing the defect the change introduced in the other.

## The fix

Classify **in-baseline by membership**, not magnitude: a version is in-baseline **iff it appears
in the applied-versions artefact** the baseline already ships. Keep `BASELINE_MAX` as a sanity
bound at most, never as the discriminator.

`replay-schema-diff.sh` already does exactly this and is the reference implementation.

## Acceptance

- A migration versioned **after** the newest applied version still replays.
- **Planted control, and it is the whole point:** a file versioned `20260908999999` — which is
  *below* a refreshed `BASELINE_MAX` but **absent from the applied list** — must be **applied**,
  not skipped. Under the current rule it is skipped. A selection rule nobody has watched
  discriminate is not a selection rule.
- The run prints how many files it selected, so "0 selected" can never again read as "all green".

## One caution learned the hard way

Membership alone is **not** sufficient if it is paired with a refreshed public-only baseline —
see bsuite#3136. Skipping migrations whose effects live outside `public` loses those effects:
**97 of the 178** build objects in `storage` / `auth` / `cron` / `vault`, and 18 pgTAP suites
fail. Membership fixes the selection rule; it does not license refreshing the dump.

Evidence: crm7#2533 (drafted, with the full measurements).

