/**
 * Funding / incentives — milestone attribution and the per-hour discount.
 *
 * PORTED VERBATIM from R80.4 src/awards/funding.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy.
 *
 * OPERATOR RULING 2026-08-02: this model is PREFERRED over what crm7 and R80.3
 * carry, and it persists through the port. Extracted out of
 * charge-calculator-v9-2.jsx for exactly that reason — logic that lives only
 * inside a component is logic a UI rewrite silently drops, and this is the part
 * of the rate a GTO is least able to re-derive from memory.
 *
 * WHY THIS BEATS A SCHEME DROPDOWN (precedent: funding_is_milestones_not_schemes)
 * Incentive programmes change wording, amounts and timing every few years, and
 * a GTO commonly holds several at once across jurisdictions and cohorts. A fixed
 * scheme list is stale the day it ships and cannot represent a payment the
 * operator actually has. Editable milestones represent any programme, including
 * ones that do not exist yet.
 *
 * NOT PORTED (operator directive, 2026-08-05): funding-programs.ts, the seeded
 * catalogue of named schemes. "dont try to pre populate funding or the schemes
 * becasue they update frequently allow for the user to enter and save." This
 * file is the milestone MODEL only — no scheme list, no defaults. `CalcConfig`
 * consumes `CombinedFunding` purely as an INPUT SHAPE; the caller supplies it.
 *
 * THE FOUR THINGS THIS MODEL GETS RIGHT
 * 1. YEAR-BOUNDARY SPLITTING. A milestone paid at "end of year 2" (month 24)
 *    sits exactly on a boundary. Attributing it wholly to either year distorts
 *    both. It is splittable, with the split percentage under operator control.
 * 2. PASS-THROUGH IS A CHOICE, NOT AN ASSUMPTION. The GTO receives the
 *    incentive; how much of it reaches the host is a commercial decision. All,
 *    a stated percentage, or none.
 * 3. PER-YEAR DIVISORS, NOT ONE AVERAGE. Billable hours vary year to year
 *    because training weeks vary. A term average silently cross-subsidises the
 *    heavy-training years from the light ones.
 * 4. THE TERM DIVISOR IS THE SUM OF ACTUAL YEARLY HOURS, never
 *    billableHours x years. That shortcut is wrong whenever training is not
 *    evenly spread, which is almost always.
 *
 * CONSERVATION: every dollar of milestone money is attributed to exactly one
 * year, or split between two. auditFundingSchedule() proves it — money in must
 * equal money out, and a milestone falling outside the term is REPORTED rather
 * than silently absorbed.
 */

import { round2, round4, isNum } from "./round.js";

/** One funding milestone. Every field is operator-controlled — see the module note. */
export interface Milestone {
  /** Required: React keys and per-row edits both address a milestone by id. */
  id: string | number;
  name: string;
  amount: number;
  month: number;
  split?: boolean;
  splitPct?: number;
  programId?: string;
  programName?: string;
}

/** One funding scheme, with its OWN particulars. */
export interface FundingScheme {
  id: string;
  label?: string;
  enabled?: boolean;
  milestones?: Milestone[];
  method?: string;
  percent?: number;
  mode?: string;
}

export interface FundingAuditNote {
  milestone?: string;
  kind: "clamped_past_term" | "split_ignored_not_on_boundary" | "split_ignored_final_year";
  month: number;
  rawYear?: number;
  appliedToYear?: number;
  note: string;
}

/** Combined result across every enabled scheme. */
export interface CombinedFunding {
  perScheme: Array<{ id: string; label?: string; mode: string; result: FundingRateResult }>;
  perHourAvg: number;
  perHourByYear: number[];
  termPerHour: number;
  yearlyPerHour: number[];
  schedule: number[];
  totalFunding: number;
  retainedByGto: number;
  warnings: string[];
  activeCount: number;
}

export interface FundingRateResult {
  perHour: number;
  basis: string;
  schedule: number[];
  yearlyPerHour: number[];
  termPerHour: number;
  totalFunding: number;
  totalHours: number;
  passThroughFactor: number;
  retainedByGto: number;
  warnings: string[];
  conserved: boolean;
  reason: string;
}

/** How much of the incentive is passed through to the host. */
export const PASS_THROUGH = {
  /** All of it — the host sees the full discount. */
  FULL: "reduce",
  /** A stated percentage; the GTO retains the rest. */
  PERCENT: "passPercent",
  /** None — the GTO retains it; rates are unaffected. */
  NONE: "none",
};

/** How the discount is spread across the apprenticeship. */
export const FUNDING_MODE = {
  /** Total funding over the sum of every year's billable hours. */
  TERM_AVERAGED: "term",
  /** Each year's funding over THAT year's billable hours. */
  PER_YEAR: "perYear",
};

/** Illustrative only. NOT defaults to quote from — see the no-default-wages rule. */
export const EXAMPLE_MILESTONES: Milestone[] = [
  { id: 1, name: "6 Month Commencement", amount: 3500, month: 6, split: false },
  { id: 2, name: "End of Year 2", amount: 3000, month: 24, split: true, splitPct: 50 },
  { id: 3, name: "Completion", amount: 3500, month: 48, split: false },
];

/**
 * Attribute milestones to apprenticeship years.
 *
 * A milestone landing exactly on a year boundary (month divisible by 12) may be
 * split, with splitPct going to the EARLIER year. A milestone falling past the
 * end of the term is clamped into the final year — the money is real and is not
 * discarded — and the clamp is reported by auditFundingSchedule().
 */
export function buildFundingSchedule(milestones: Milestone[] = [], appYears = 4): number[] {
  const years = Math.max(Math.trunc(appYears) || 1, 1);
  const yearFunding = Array.from({ length: years }, () => 0);

  for (const m of milestones) {
    if (!m || !isNum(m.amount) || m.amount === 0) continue;
    const month = Math.max(Math.trunc(m.month) || 1, 1);
    const year = Math.min(Math.ceil(month / 12), years);
    const onBoundary = month % 12 === 0;

    if (m.split && onBoundary && year < years) {
      const p = clamp(m.splitPct ?? 50, 0, 100) / 100;
      yearFunding[year - 1] += m.amount * p;
      yearFunding[year] += m.amount * (1 - p);
    } else {
      yearFunding[year - 1] += m.amount;
    }
  }

  return yearFunding.map((v) => round2(v));
}

/**
 * Prove the schedule conserves money, and surface what was silently moved.
 *
 * Three things this catches that a spot-check will not:
 *   - a milestone dated past the end of the term (clamped into the final year)
 *   - a split requested on a date that is NOT a year boundary (ignored)
 *   - a split requested in the final year (nowhere to split to; ignored)
 * All three are legitimate behaviours. None of them should be invisible.
 */
export function auditFundingSchedule(milestones: Milestone[] = [], appYears = 4): {
  schedule: number[]; declared: number; attributed: number; conserved: boolean;
  notes: FundingAuditNote[]; ok: boolean;
} {
  const years = Math.max(Math.trunc(appYears) || 1, 1);
  const schedule = buildFundingSchedule(milestones, years);
  const declared = round2(milestones.reduce((sum, m) => sum + (isNum(m?.amount) ? m.amount : 0), 0));
  const attributed = round2(schedule.reduce((sum, a) => sum + a, 0));

  const notes: FundingAuditNote[] = [];
  for (const m of milestones) {
    if (!m || !isNum(m.amount) || m.amount === 0) continue;
    const month = Math.max(Math.trunc(m.month) || 1, 1);
    const rawYear = Math.ceil(month / 12);
    if (rawYear > years) {
      notes.push({ milestone: m.name, kind: "clamped_past_term", month, rawYear, appliedToYear: years,
        note: `"${m.name}" is dated month ${month} (year ${rawYear}) but the term is ${years} years. The money is attributed to year ${years} rather than discarded. Check the term length or the milestone date — one of them is wrong.` });
    }
    if (m.split && month % 12 !== 0) {
      notes.push({ milestone: m.name, kind: "split_ignored_not_on_boundary", month,
        note: `"${m.name}" requests a split but month ${month} is not a year boundary, so it is attributed wholly to year ${Math.min(rawYear, years)}. A split only means something on a boundary.` });
    }
    if (m.split && month % 12 === 0 && Math.min(rawYear, years) >= years) {
      notes.push({ milestone: m.name, kind: "split_ignored_final_year", month,
        note: `"${m.name}" requests a split on the final year boundary. There is no later year to split into, so it is attributed wholly to year ${years}.` });
    }
  }

  return {
    schedule, declared, attributed,
    conserved: Math.abs(declared - attributed) < 0.005,
    notes,
    ok: Math.abs(declared - attributed) < 0.005,
  };
}

/** Fraction of the incentive reaching the host. */
export function passThroughFactor(method?: string, percent = 100): number {
  if (method === PASS_THROUGH.FULL) return 1;
  if (method === PASS_THROUGH.PERCENT) return clamp(percent, 0, 100) / 100;
  return 0;
}

/**
 * The per-hour funding discount.
 *
 * `yearHours` is each year's billable hours. Supply it — omitting it falls back
 * to billableHoursPerYear for every year, which is the term-average shortcut
 * this model exists to avoid, so the fallback is REPORTED.
 */
export function resolveFundingRate({
  milestones = [],
  appYears = 4,
  billableHoursPerYear,
  yearHours,
  termHoursOverride,
  method = PASS_THROUGH.FULL,
  percent = 100,
  mode = FUNDING_MODE.TERM_AVERAGED,
  selectedYear = "avg",
  enabled = true,
}: {
  milestones?: Milestone[];
  appYears?: number;
  billableHoursPerYear?: number;
  yearHours?: number[];
  termHoursOverride?: number;
  method?: string;
  percent?: number;
  mode?: string;
  selectedYear?: number | "avg";
  enabled?: boolean;
}): FundingRateResult {
  const years = Math.max(Math.trunc(appYears) || 1, 1);
  const schedule = buildFundingSchedule(milestones, years);
  const factor = enabled ? passThroughFactor(method, percent) : 0;
  const warnings: string[] = [];

  const perYearHours: number[] = Array.from({ length: years }, (_, i) => {
    const h = yearHours?.[i];
    return isNum(h) ? h : (billableHoursPerYear ?? 0);
  });

  if (!yearHours && isNum(billableHoursPerYear)) {
    warnings.push("yearHours not supplied — every year assumed identical. Billable hours vary with training weeks, so a term average cross-subsidises heavy-training years from light ones.");
  }

  // The term divisor is the SUM of actual yearly hours, never hours x years.
  const totalHours: number = isNum(termHoursOverride)
    ? termHoursOverride
    : perYearHours.reduce((sum, h) => sum + (isNum(h) ? h : 0), 0);

  const totalFunding = round2(schedule.reduce((sum, a) => sum + a, 0));
  const termPerHour = totalHours > 0 ? (totalFunding * factor) / totalHours : 0;

  const yearlyPerHour = schedule.map((amt, i) => {
    const h = perYearHours[i];
    return h > 0 ? (amt * factor) / h : 0;
  });

  let perHour = 0;
  let basis = "none";
  if (factor > 0) {
    if (mode === FUNDING_MODE.PER_YEAR && selectedYear !== "avg") {
      const idx = Math.trunc(selectedYear) - 1;
      perHour = yearlyPerHour[idx] ?? 0;
      basis = `year ${selectedYear}`;
      if (!(idx >= 0 && idx < years)) {
        warnings.push(`Year ${selectedYear} is outside a ${years}-year term — no funding applied.`);
        perHour = 0;
        basis = "none";
      }
    } else {
      perHour = termPerHour;
      basis = "term average";
    }
  }

  const audit = auditFundingSchedule(milestones, years);
  if (!audit.conserved) {
    warnings.push(`Funding does not reconcile: $${audit.declared} declared, $${audit.attributed} attributed.`);
  }
  for (const n of audit.notes) warnings.push(n.note);

  return {
    perHour: round4(perHour ?? 0),
    basis,
    schedule,
    yearlyPerHour: yearlyPerHour.map((v) => round4(v)),
    termPerHour: round4(termPerHour),
    totalFunding,
    totalHours,
    passThroughFactor: factor,
    retainedByGto: round2(totalFunding * (1 - factor)),
    warnings,
    conserved: audit.conserved,
    reason: factor === 0
      ? (enabled ? "Funding is retained by the GTO — charge rates are unaffected." : "Funding is switched off.")
      : `$${totalFunding} attributed across ${years} year(s); ${(factor * 100).toFixed(0)}% passed to the host, giving $${round4(perHour).toFixed(4)}/hr off the charge rate on a ${basis} basis.`,
  };
}

/**
 * Combine several independent funding schemes into one per-hour discount.
 *
 * EACH SCHEME KEEPS ITS OWN PARTICULARS. A GTO commonly holds more than one
 * incentive at once and they do not share terms: one may be passed to the host
 * in full while another is retained, one may be spread across the term while
 * another is attributed to the year it lands in. Forcing them onto a single set
 * of controls means the second scheme is entered wrongly or not at all.
 *
 * So every scheme is resolved on its OWN method and mode, and only the
 * resulting dollars-per-hour are added together.
 *
 * The year selector interacts with per-scheme modes exactly as you would want:
 *   "avg"      every scheme contributes its term-averaged rate
 *   year N     a PER_YEAR scheme contributes year N's rate; a TERM scheme still
 *              contributes its term average, because that is what term-averaged
 *              means and switching the view must not silently re-spread it
 */
export function combineFundingSchemes(
  schemes: FundingScheme[] = [],
  shared: { appYears?: number; yearHours?: number[]; termHoursOverride?: number; billableHoursPerYear?: number } = {},
): CombinedFunding {
  const years = Math.max(Math.trunc(shared.appYears ?? 4) || 1, 1);
  const active = schemes.filter((s) => s && s.enabled !== false);

  const perScheme = active.map((s) => ({
    id: s.id,
    label: s.label,
    mode: s.mode ?? FUNDING_MODE.TERM_AVERAGED,
    result: resolveFundingRate({
      ...shared,
      milestones: s.milestones || [],
      method: s.method ?? PASS_THROUGH.FULL,
      percent: s.percent ?? 100,
      mode: s.mode ?? FUNDING_MODE.TERM_AVERAGED,
      enabled: true,
      selectedYear: "avg",
    }),
  }));

  const perHourAvg = round4(perScheme.reduce((sum, p) => sum + p.result.termPerHour, 0));

  const perHourByYear = Array.from({ length: years }, (_, i) =>
    round4(perScheme.reduce((sum, p) =>
      sum + (p.mode === FUNDING_MODE.PER_YEAR
        ? (p.result.yearlyPerHour[i] ?? 0)
        : p.result.termPerHour), 0)));

  const schedule = Array.from({ length: years }, (_, i) =>
    round2(perScheme.reduce((sum, p) => sum + (p.result.schedule[i] ?? 0), 0)));

  const yearlyPerHour = Array.from({ length: years }, (_, i) =>
    round4(perScheme.reduce((sum, p) => sum + (p.result.yearlyPerHour[i] ?? 0), 0)));

  return {
    perScheme,
    perHourAvg,
    perHourByYear,
    termPerHour: perHourAvg,
    yearlyPerHour,
    schedule,
    totalFunding: round2(perScheme.reduce((s, p) => s + p.result.totalFunding, 0)),
    retainedByGto: round2(perScheme.reduce((s, p) => s + p.result.retainedByGto, 0)),
    warnings: perScheme.flatMap((p) => p.result.warnings.map((w) => `${p.label}: ${w}`)),
    activeCount: active.length,
  };
}

/**
 * Whether a rate line carries the funding discount.
 *
 * Penalty rates are multiples of the FULL ordinary cost, so the funded hour is
 * still an ordinary hour underneath and carries the discount. Overtime rates
 * are built from the received rate plus on-costs rather than the full ordinary
 * cost, so applying the discount there would credit funding against hours it
 * was never calculated over. Carried across from the calculator deliberately —
 * it reads like an inconsistency and is not.
 */
export function fundingAppliesToRateCategory(category: string): boolean {
  return category === "penalty";
}

const clamp = (x: number | undefined, lo: number, hi: number): number => Math.min(Math.max(isNum(x) ? x : lo, lo), hi);
