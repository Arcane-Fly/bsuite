---
kind: record
authority: none
owner: bsuite
---

# feat(rates): forward-year charge schedule + annual-review-only re-approval gate (FWC/EBA/on-cost)

https://github.com/GaryOcean428/crm7/issues/678

Snapshot updatedAt: 2026-05-12T03:30:46Z. Open at capture; re-read live.

## Scope

Once a charge rate is approved, it must be **LOCKED** until one of three regulatory triggers fires. The current model treats apprentice year progression (Year 1 → 2 → 3 → 4) as a new-quote event, forcing manual re-approval that should never happen. The forward-year schedule should be approved **once** when the original quote is signed off, then resolved automatically by the engine as the apprentice ages into each year band.

## Operational anchor (operator-stated, 2026-05-12)

> "Once the charges are approved they are usually set until they change again — usually annually when the EBA or award says so, July 1st for award. If an apprentice progresses during that time, the rate for the next year is already set."

This is the canonical policy. The current code violates it.

## The three legitimate re-rate triggers

1. **Fair Work Annual Wage Review** — handed down by FWC, effective **1 July** each year. Affects modern-award-covered workers.
2. **EBA / Enterprise Agreement scheduled increases** — per the EA's wage schedule clause, on the date that EA specifies.
3. **On-cost rate changes** — super guarantee step-ups (e.g. 11.5% → 12% on 1 July 2025, Payday Super on 1 July 2026), workers' comp policy renewal, payroll tax threshold changes, CTF levy changes.

**Apprentice year progression is NOT a re-rate event.** Year 2/3/4 rates should be pre-baked into the original approval.

## Current state (verified in code, 2026-05-12)

- `charge_rate_quotes` (`supabase/migrations/20260301100800_create_charge_rate_quotes.sql`) carries **one** `charge_rate_hourly` NUMERIC + `effective_date` per row. No forward schedule, no `next_review_date`, no `review_trigger`.
- `R80.3/src/services/awardRulesEngine.ts:resolveCurrentYear()` correctly resolves the apprentice's current year from commencement + RPL + CBP, but the quote it produces only stores ONE year's rate.
- `src/lib/billingEngine.ts:138-155` picks the latest approved quote by `effective_date DESC LIMIT 1` — so when an apprentice ticks over to Year 2, the system keeps billing at the Year 1 rate until someone manually re-approves a new quote.
- No annual-review cron exists to auto-draft new quotes on 1 July.

## Acceptance criteria

### Schema change

1. **Migration** `forward_year_charge_schedule.sql`:
   ```sql
   ALTER TABLE charge_rate_quotes
     ADD COLUMN IF NOT EXISTS forward_schedule JSONB,
     ADD COLUMN IF NOT EXISTS approved_until_review_trigger TEXT
       CHECK (approved_until_review_trigger IN (
         'fwc_annual_review','eba_scheduled_increase','on_cost_change',
         'super_guarantee_step_up','manual_override'
       )),
     ADD COLUMN IF NOT EXISTS next_scheduled_review_date DATE,
     ADD COLUMN IF NOT EXISTS quote_kind TEXT
       CHECK (quote_kind IN ('single_year','multi_year_forward','mid_period_adjustment'))
       DEFAULT 'multi_year_forward';
   ```

   `forward_schedule` shape:
   ```json
   {
     "year_1": { "hourly": 38.50, "weekly_billed": 1463.00, "effective_from": "2026-01-15", "effective_to": "2027-01-14" },
     "year_2": { "hourly": 44.20, "weekly_billed": 1679.60, "effective_from": "2027-01-15", "effective_to": "2028-01-14" },
     "year_3": { "hourly": 49.80, "weekly_billed": 1892.40, "effective_from": "2028-01-15", "effective_to": "2029-01-14" },
     "year_4": { "hourly": 55.10, "weekly_billed": 2093.80, "effective_from": "2029-01-15", "effective_to": "2030-01-14" }
   }
   ```

2. **Backfill migration**: for every existing approved quote, derive a single-year `forward_schedule` from the current `charge_rate_hourly`, set `quote_kind='single_year'` (preserves legacy semantics until operator re-approves).

### Engine changes

3. **R80.3 `calcBridge.ts` / `awardRulesEngine.ts`**: when calculating a quote, produce the full forward schedule (Year 1..4 for apprenticeships, Year 1..N for traineeships) at the SAME approval time, using:
   - Current FWC/EBA rate table for each year band
   - Same on-cost stack across all years (super, WC, payroll tax, leave loading, training, admin, margin)
   - Junior/adult split at apprentice's 21st birthday if it falls inside the schedule
   - Year-12-completion modifier if applicable
   - CBP certified year (overrides time-based progression)

4. **`src/lib/billingEngine.ts:fetchTimesheetGroups()`** rewrite: instead of `ORDER BY effective_date DESC LIMIT 1`, resolve the apprentice's current year-band for the billing period (use the same `resolveCurrentYear()` logic from R8), then pick `forward_schedule[year_N].hourly` from the **still-current** approved quote. Only treat a quote as expired when `next_scheduled_review_date <= period_start` AND a newer approved quote exists.

5. **Junior→Adult crossover within a year**: if the apprentice's 21st birthday falls mid-billing-period, split the period at the birthday and bill at junior rate before, adult rate after. Forward schedule must carry both junior and adult variants for the year that contains the crossover.

### Annual review cron

6. **New scheduled function** `annual-rate-review` running 00:00 AWST on:
   - **1 July** each year (FWC Annual Wage Review effective date)
   - EBA-specific dates (driven by `enterprise_agreements.scheduled_review_dates[]`)
   - Super guarantee step-up dates (1 July when applicable per ATO schedule)

   Behaviour:
   - Identifies approved quotes whose `approved_until_review_trigger` matches the firing trigger AND whose `next_scheduled_review_date <= today`
   - Auto-drafts replacement quotes pre-populated with the new rates × original forward schedule structure
   - Sets new drafts to `status='draft'`, links to the superseded quote via `supersedes_quote_id`
   - Notifies tenant admin + operator via `email-dispatcher` (subject: "Annual rate review — N quotes ready to review") and `send-notification` (in-app)
   - Logs to `audit_log` with full diff (old vs new rate per year band)

7. **Operator dashboard** at `src/pages/billing/annual-review.tsx`:
   - List of pending review drafts
   - Bulk approve / reject / edit
   - Diff view per quote: old forward schedule vs new
   - "Apply" pushes status to `approved`, creates rate-adjustment line items on next invoice for any partial periods straddling the effective date

### UI surface

8. **Quote approval UI** (`src/pages/billing/quotes/[id].tsx` or similar): show the full forward schedule as a table (Year 1..N rows × columns: hourly / weekly billed / effective from / effective to). Operator approves the whole schedule, not one rate.

9. **Apprentice detail page**: show "Current rate" + "Next year's rate (locked in)" + "Next regulatory review" date. The operator sees that no action is needed for the apprentice's normal progression.

### Tests

10. **Unit test scenarios**:
    - Year-1 apprentice on 2026-06-30 → tick over to Year 2 on 2027-01-15 → billing on 2027-01-20 picks Year 2 rate from the SAME approved quote. No new approval event.
    - Year-2 apprentice on 2026-06-30 → FWC Annual Review fires 2026-07-01 → cron drafts new quote → operator approves → all subsequent invoices use new schedule from 2026-07-01.
    - Apprentice 21st birthday falls 2026-09-15 in middle of a billing period → invoice splits the period: junior rate to 2026-09-14, adult rate from 2026-09-15.
    - EBA effective 2026-10-01 → cron only drafts for quotes flagged `approved_until_review_trigger='eba_scheduled_increase'`, leaves modern-award quotes alone.
    - Super guarantee step-up on 2026-07-01 → cron drafts new quotes with updated on-costs but same gross rate. (Variance reflected in margin.)

### Brand system clause (MANDATORY)

D2C Neon Electric. All UI changes MUST use oklch + semantic tokens only. No inline hex codes.

### Branch policy (MANDATORY)

Target branch for your PR MUST be `development`, not `main`. Per the `ship-all-apps` workflow, all feature work merges to `development` first.

## Deps / blockers

- Pairs with issue #219 (R8 charge engine) — that issue should consume the new forward_schedule shape.
- Pairs with issue #663 (training_day_pattern_periods) — both establish "approved-once, valid-until-trigger" semantics for apprentice-level data.
- Soft-pairs with issue #664 (billing traceability) — invoice line drill-down should show which forward_schedule year was applied.

## References

- `supabase/migrations/20260301100800_create_charge_rate_quotes.sql` (current schema)
- `R80.3/src/services/awardRulesEngine.ts:resolveCurrentYear()` (year resolution logic)
- `src/lib/billingEngine.ts:138-155` (the broken latest-quote lookup)
- `src/lib/pipelines/chargeToBilling.ts:211,328` — already names `'award_annual_review'` as a billing adjustment reason but doesn't wire it
- Audit doc §11 in the billing-flow audit notes
