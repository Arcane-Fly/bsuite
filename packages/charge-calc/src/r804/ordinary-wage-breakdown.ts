/**
 * THE ORDINARY WAGE, ITEMISED — one derivation, three documents.
 *
 * PORTED VERBATIM from R80.4 src/awards/ordinary-wage-breakdown.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy —
 * do not "fix" anything here without going back to R80.4 first.
 *
 * OPERATOR RULING 2026-08-03: "payslip, invoice, and quote should line item what
 * contributes to the ordinary wage. then note ordinary wage used to calculate
 * OT, pens, shift, loading etc."
 *
 * WHY ONE FUNCTION AND NOT THREE: a payslip, an invoice and a quote that derive
 * the ordinary wage separately WILL diverge — a rate change, a new allowance or
 * a rounding tweak lands in one and not the others, and the first anyone knows
 * is a host querying an invoice against a payslip. They are three views of one
 * number, so they get one derivation.
 *
 * WHY IT MATTERS BEYOND TIDINESS: cl.2 makes the ordinary hourly rate the base
 * for penalties, loadings and leave. A document showing only the final figure
 * cannot be checked. A document showing the components can be reconciled against
 * the award by anyone — a host, an apprentice, an auditor, the FWO.
 */

import { round2 } from "./round.js";

export type WageLineKind = "base" | "allPurpose";

export interface OrdinaryWageLine {
  label: string;
  /** The clause that creates the entitlement. Present on every award line. */
  clause?: string;
  kind: WageLineKind;
  /** Per ORDINARY hour. Weekly amounts are divided by ordinaryHours. */
  perHour: number;
  /** Present where the award expresses the amount weekly. */
  perWeek?: number;
  /** Where an apprentice receives a proportion, the share actually applied. */
  apprenticeShare?: number;
  note?: string;
}

export interface OrdinaryWageBreakdown {
  lines: OrdinaryWageLine[];
  ordinaryHours: number;
  ordinaryHourly: number;
  ordinaryWeekly: number;
  /** The sentence every document must carry beneath the itemisation. */
  derivationNote: string;
  /** cl.2's own words, so the reader can check the claim. */
  authority: string;
  /** Rounding rule, stated because it is load-bearing at the cent. */
  roundingNote: string;
}

/**
 * THE ORDINARY WAGE, IN ONE PLACE. Every caller — the calculator, the documents,
 * the tests — must go through this, so the rounding discipline cannot diverge.
 *
 * Rounded ONCE, here, on the completed figure. Rounding the wage component
 * before the all-purpose allowances are added produced $16.50 where FWC
 * publishes $16.49 (red-team finding, 2026-08-03). cl.2 is explicit that an
 * apprentice's ordinary hourly rate is the WEEKLY rate — percentage plus the
 * cl.19.7(c) allowances — divided by 38, so there is no intermediate to round.
 *
 * Ruling 7: this rounded figure is what multipliers apply to. PACT does the same.
 */
export function ordinaryWage(baseHourlyUnrounded: number, allPurposePerHour = 0): number {
  return round2(baseHourlyUnrounded + allPurposePerHour);
}

/** cl.2: the definition, verbatim. Quoted rather than paraphrased on purpose. */
export const ALL_PURPOSE_DEFINITION =
  "all purposes means the payment will be included in the rate of pay of an employee who is " +
  "entitled to the allowance, when calculating any penalties or loadings or payment while " +
  "they are on annual leave (MA000020 cl.2).";

/**
 * Build the itemisation. `allPurposeAllowances` should carry ONLY allowances the
 * award marks all-purpose — anything else is not part of the ordinary wage and
 * must not appear here, or the document overstates the base for every penalty.
 */
export function ordinaryWageBreakdown({
  baseLabel = "Minimum award wage",
  baseClause = "19.7(b)",
  baseWeekly,
  baseHourly,
  allPurposeAllowances = [],
  ordinaryHours = 38,
  apprenticeStageNote,
}: {
  baseLabel?: string;
  baseClause?: string;
  baseWeekly?: number;
  baseHourly?: number;
  allPurposeAllowances?: Array<{
    label: string; clause?: string; perWeek?: number; perHour?: number;
    apprenticeShare?: number; note?: string;
  }>;
  ordinaryHours?: number;
  apprenticeStageNote?: string;
}): OrdinaryWageBreakdown {
  const lines: OrdinaryWageLine[] = [];

  const baseWk = baseWeekly ?? (baseHourly ?? 0) * ordinaryHours;
  lines.push({
    label: baseLabel, clause: baseClause, kind: "base",
    perWeek: round2(baseWk), perHour: round2(baseWk / ordinaryHours),
    note: apprenticeStageNote,
  });

  for (const a of allPurposeAllowances) {
    const share = a.apprenticeShare ?? 1;
    const wk = a.perWeek !== undefined ? a.perWeek * share : (a.perHour ?? 0) * share * ordinaryHours;
    lines.push({
      label: a.label, clause: a.clause, kind: "allPurpose",
      perWeek: a.perWeek !== undefined ? round2(wk) : undefined,
      perHour: round2(wk / ordinaryHours),
      apprenticeShare: share !== 1 ? share : undefined,
      note: a.note ?? (share !== 1
        ? `Apprentice share ${round2(share * 100)}% of the full allowance.`
        : undefined),
    });
  }

  // Sum the WEEKLY amounts and divide once, then round. Rounding each line and
  // summing the rounded figures drifts from the published weekly rate.
  const ordinaryWeekly = round2(lines.reduce((s, l) => s + (l.perWeek ?? l.perHour * ordinaryHours), 0));
  const ordinaryHourly = round2(ordinaryWeekly / ordinaryHours);

  return {
    lines, ordinaryHours, ordinaryHourly, ordinaryWeekly,
    derivationNote:
      `This ORDINARY WAGE of $${ordinaryHourly.toFixed(2)}/hour ($${ordinaryWeekly.toFixed(2)} per ` +
      `${ordinaryHours} ordinary hours) is the figure used to calculate overtime, penalty rates, ` +
      `shift loadings and annual leave loading. It is not the base wage alone — every all-purpose ` +
      `allowance listed above forms part of it.`,
    authority: ALL_PURPOSE_DEFINITION,
    roundingNote:
      `The ordinary hourly rate is rounded to the cent BEFORE any multiplier is applied, which ` +
      `is how Fair Work's Pay and Conditions Tool computes it. Applying a multiplier to the ` +
      `unrounded figure can differ by a cent per hour.`,
  };
}

/** Document types that must all show the same derivation. */
export type RateDocument = "quote" | "invoice" | "payslip";

/**
 * Framing for each document. The NUMBERS are identical; only the audience
 * changes, so the itemisation must never be dropped from one of them.
 */
export function documentFraming(doc: RateDocument): { heading: string; audience: string; why: string } {
  switch (doc) {
    case "quote":
      return {
        heading: "How this rate is built",
        audience: "host employer, before placement",
        why: "A quote is GENERAL — it prices a cohort, not a person. Showing the components lets the host see what moves if the apprentice's stage, trade or sector differs from the assumption.",
      };
    case "invoice":
      return {
        heading: "Ordinary wage used for this invoice",
        audience: "host employer, after the work",
        why: "The host is being charged penalties and overtime derived from this figure. Itemising it is what makes the invoice checkable against the award rather than something to be taken on trust.",
      };
    case "payslip":
      return {
        heading: "Your ordinary wage and how it is made up",
        audience: "the apprentice",
        why: "The apprentice can check their own rate against the award and the FWC pay guide. A payslip showing one number cannot be checked at all.",
      };
  }
}

/** Plain-text itemisation, for a PDF or an email body. */
export function renderBreakdown(b: OrdinaryWageBreakdown, doc: RateDocument): string {
  const f = documentFraming(doc);
  const w = (n?: number) => (n === undefined ? "".padStart(10) : `$${n.toFixed(2)}`.padStart(10));
  const rows = b.lines.map((l) =>
    `  ${l.label.padEnd(52).slice(0, 52)} ${(l.clause ? `cl.${l.clause}` : "").padEnd(12)}` +
    `${w(l.perWeek)} /wk ${w(l.perHour)} /hr`);
  return [
    f.heading.toUpperCase(),
    ...rows,
    `  ${"".padEnd(52)} ${"".padEnd(12)}${"─".repeat(10)}     ${"─".repeat(10)}`,
    `  ${"ORDINARY WAGE".padEnd(52)} ${"cl.2".padEnd(12)}${w(b.ordinaryWeekly)} /wk ${w(b.ordinaryHourly)} /hr`,
    "",
    `  ${b.derivationNote}`,
    "",
    `  ${b.authority}`,
  ].join("\n");
}
