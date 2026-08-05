/**
 * MA000020 cl.30.2, cl.24.5, cl.17 and cl.12 — MINIMUM ENGAGEMENTS.
 *
 * PORTED VERBATIM from R80.4 src/awards/ma000020-minimum-engagement.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy —
 * do not "fix" anything here without going back to R80.4 first.
 *
 * This is a hard runtime dependency of calculate.ts (the reference engine),
 * not deferred "award-specific data" — calculate() imports minimumEngagementFor
 * directly to build the RATE_MINIMUMS floor on every rate row.
 *
 * The award repeatedly guarantees a floor of PAID hours regardless of hours
 * worked. A one-hour Sunday call-in is a four-hour bill at 200%; quoting the one
 * hour under-recovers by 300%.
 *
 * This was entirely absent until 2026-08-03. It is the kind of gap that never
 * shows up in a rate reconciliation — every RATE was right, but the HOURS the
 * rate is applied to were wrong.
 *
 * VERIFIED against awards/MA000020.md. RE-VERIFY EVERY 1 JULY.
 */

import { money, round2 } from "./round.js";

export interface MinimumEngagement {
  key: string;
  label: string;
  minimumHours: number;
  /** Multiplier on the ordinary hourly rate for the guaranteed hours. */
  multiplier?: number;
  clause: string;
  note?: string;
}

export const MINIMUM_ENGAGEMENTS: MinimumEngagement[] = [
  { key: "sat_overtime", label: "Overtime on a Saturday", minimumHours: 3,
    clause: "30.2(a)", note: "\"afforded at least 3 hours' work or be paid for 3 hours at the appropriate rate\"." },
  { key: "sat_good_friday", label: "Saturday following Good Friday", minimumHours: 4, multiplier: 2.5,
    clause: "30.2(b)" },
  { key: "sun_overtime", label: "Overtime on a Sunday", minimumHours: 4, multiplier: 2.0,
    clause: "30.2(c)" },
  { key: "public_holiday", label: "Work on a public holiday or substituted day", minimumHours: 4, multiplier: 2.5,
    clause: "30.2(d)",
    note: "cl.30.2(e): hours immediately before or after a PART-DAY public holiday that form one continuous shift COUNT TOWARD this minimum — they do not trigger a second one." },
  { key: "recall_overtime", label: "Recalled to work overtime after leaving the premises", minimumHours: 3,
    /* cl.29 Overtime. Was tagged 24.5, which is INCLEMENT WEATHER — a clause
       reference that resolves to the wrong subject reads as authority and cites
       the wrong rule. Caught by scripts/validate-clause-refs.mjs, 2026-08-03. */
    clause: "29",
    note: "Applies EACH TIME the employee is recalled, so two recalls in a day are two minimums." },
  { key: "shift_callout", label: "Shiftworker called out after finishing, or on a rostered-off day", minimumHours: 3, multiplier: 2.0,
    clause: "17.1", note: "Paid at 200% of the ordinary hourly rate for each occasion called out." },
  { key: "casual_engagement", label: "Casual engagement", minimumHours: 4,
    /* cl.12.3, not 12.2 — 12.2 is the written-notice obligation. Corrected
       2026-08-03: a wrong citation is zero dollars and a poisoned audit trail. */
    clause: "12.3",
    note: "Plus the fares and travel allowance on each occasion. NOTE: apprentices and trainees cannot be engaged as casuals." },
  { key: "travel_return_journey", label: "Travel outside ordinary hours — per return journey", minimumHours: 0.5,
    clause: "26.3",
    note: "Paid at the ORDINARY time hourly rate, calculated to the next quarter hour. Not a penalty." },
  { key: "waiting_for_wages", label: "Kept waiting for wages past 15 minutes", minimumHours: 0.25,
    /* cl.20 Payment of wages. Was tagged 28.3, which is SUPERANNUATION. */
    clause: "20",
    note: "At overtime rates, for reasons not beyond the employer's control." },
];

export function minimumEngagementFor(key: string): MinimumEngagement | undefined {
  return MINIMUM_ENGAGEMENTS.find((m) => m.key === key);
}

export interface EngagementResult {
  hoursWorked: number;
  hoursPaid: number;
  upliftHours: number;
  multiplier: number;
  cost: number;
  applied: boolean;
  reason: string;
}

/**
 * Hours actually PAYABLE for an engagement, and the cost at the ordinary rate.
 *
 * `hoursWorked` may be less than the minimum — that is the whole point. Where it
 * exceeds the minimum, the minimum does nothing and `applied` is false.
 */
export function applyMinimumEngagement({
  key,
  hoursWorked,
  ordinaryHourlyRate,
  multiplierOverride,
}: {
  key: string;
  hoursWorked: number;
  ordinaryHourlyRate: number;
  multiplierOverride?: number;
}): EngagementResult {
  const m = minimumEngagementFor(key);
  if (!m) {
    return { hoursWorked, hoursPaid: hoursWorked, upliftHours: 0, multiplier: 1,
      cost: round2(hoursWorked * ordinaryHourlyRate), applied: false,
      reason: `No minimum engagement recorded for "${key}".` };
  }

  const multiplier = multiplierOverride ?? m.multiplier ?? 1;
  const hoursPaid = Math.max(hoursWorked, m.minimumHours);
  const upliftHours = round2(hoursPaid - hoursWorked);
  const cost = round2(hoursPaid * ordinaryHourlyRate * multiplier);

  return {
    hoursWorked, hoursPaid, upliftHours, multiplier, cost,
    applied: upliftHours > 0,
    reason: upliftHours > 0
      ? `cl.${m.clause}: ${m.label} carries a minimum of ${m.minimumHours} hours. ` +
        `${hoursWorked} hour(s) worked, ${hoursPaid} payable — ${upliftHours} hour(s) paid but not worked, ` +
        `at ${multiplier}x the ordinary hourly rate. Charging only the hours worked under-recovers ${money(upliftHours * ordinaryHourlyRate * multiplier)}.` +
        (m.note ? ` ${m.note}` : "")
      : `cl.${m.clause}: ${hoursWorked} hours worked meets or exceeds the ${m.minimumHours} hour minimum, so it does not bite.` +
        (m.note ? ` ${m.note}` : ""),
  };
}

/**
 * cl.30.2(e) — hours immediately before or after a PART-DAY public holiday that
 * form one continuous shift count TOWARD the minimum rather than triggering a
 * second one. Modelled explicitly because the intuitive reading (two separate
 * engagements) over-charges the host.
 */
export function partDayPublicHolidayHours(
  hoursBefore: number, holidayHours: number, hoursAfter: number,
): { countedTowardMinimum: number; separateEngagements: number; note: string } {
  return {
    countedTowardMinimum: round2(hoursBefore + holidayHours + hoursAfter),
    separateEngagements: 1,
    note: "cl.30.2(e): one continuous shift spanning a part-day public holiday is ONE engagement. The hours either side count toward the 4 hour minimum — they do not create a second minimum.",
  };
}
