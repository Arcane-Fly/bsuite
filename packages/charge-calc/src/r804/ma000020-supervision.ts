/**
 * MA000020 cl.19.2 — LEADING HANDS, and cl.43 — FOREPERSONS AND SUPERVISORS.
 *
 * PORTED VERBATIM from R80.4 src/awards/ma000020-supervision.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy —
 * do not "fix" anything here without going back to R80.4 first.
 *
 * This is a hard runtime dependency of calculate.ts (the reference engine),
 * not deferred "award-specific data" — calculate() imports leadingHandAmount
 * directly. forepersonRate/FOREPERSON_RATES travel with it because they share
 * this file upstream; nothing else in the port calls them yet.
 *
 * Both are ALL-PURPOSE, and cl.2 says so in the definition of the ordinary
 * hourly rate itself:
 *
 *   "for forepersons and supervisors in the metal and engineering construction
 *    sector, the relevant weekly rate specified in clause 43.2 divided by 38;
 *    for leading hands the amount calculated in accordance with clause 19.2(a)
 *    or 19.2(b) is included."
 *
 * So omitting them does not merely miss a line item — it understates the
 * ORDINARY WAGE, and therefore understates every penalty, overtime hour, shift
 * loading and leave payment derived from it. Both were absent until 2026-08-03.
 *
 * Neither ordinarily reaches an apprentice. They reach the WORKER path, which R8
 * also prices, so they are modelled rather than excluded.
 */

import { money, round2 } from "./round.js";

/* ── cl.19.2 — LEADING HANDS ───────────────────────────────────────────────── */

/**
 * cl.19.2(a): a percentage of the weekly rate in cl.19.1(a) of the HIGHEST
 * CLASSIFICATION SUPERVISED, or the employee's own rate, whichever is HIGHER.
 *
 * The "highest classification supervised" is the trap. Using the leading hand's
 * own rate is only correct when it is the greater of the two, and a leading hand
 * frequently supervises someone on a higher classification than their own.
 */
export const LEADING_HAND_BANDS = [
  { minPersons: 1, maxPersons: 1, pct: 2.4, label: "1 person" },
  { minPersons: 2, maxPersons: 5, pct: 5.3, label: "2–5 persons" },
  { minPersons: 6, maxPersons: 10, pct: 6.7, label: "6–10 persons" },
  { minPersons: 11, maxPersons: Infinity, pct: 9.0, label: "More than 10 persons" },
] as const;

export const LEADING_HAND = {
  clause: "19.2",
  allPurpose: true,
  ordinaryHours: 38,
  /** cl.19.2(b): daily hire multiplies by 52/50.4 before dividing. */
  dailyHireFactor: 52 / 50.4,
  /** cl.19.2(b): "provided that in the case of a carpenter-diver the divisor will be 31". */
  carpenterDiverDivisor: 31,
} as const;

export interface LeadingHandResult {
  perWeek: number;
  perHour: number;
  pct: number;
  band: string;
  baseWeeklyUsed: number;
  reason: string;
}

/**
 * The leading hand all-purpose amount.
 *
 * `highestSupervisedWeekly` is the cl.19.1(a) weekly rate of the highest
 * classification in the employee's charge; `ownWeekly` is their own. The award
 * takes the GREATER, which is why both are required rather than optional.
 */
export function leadingHandAmount({
  personsInCharge,
  highestSupervisedWeekly,
  ownWeekly,
  dailyHire = false,
  carpenterDiver = false,
}: {
  personsInCharge: number;
  highestSupervisedWeekly: number;
  ownWeekly: number;
  dailyHire?: boolean;
  carpenterDiver?: boolean;
}): LeadingHandResult {
  const nil = (reason: string): LeadingHandResult =>
    ({ perWeek: 0, perHour: 0, pct: 0, band: "n/a", baseWeeklyUsed: 0, reason });

  if (!Number.isFinite(personsInCharge) || personsInCharge < 1) {
    return nil("cl.19.2 applies to a person SPECIFICALLY APPOINTED as a leading hand with at least one person in their charge.");
  }

  const band = LEADING_HAND_BANDS.find(
    (b) => personsInCharge >= b.minPersons && personsInCharge <= b.maxPersons,
  ) ?? LEADING_HAND_BANDS[LEADING_HAND_BANDS.length - 1];

  // "of the highest classification supervised, or the employee's own rate,
  // whichever is the higher" — cl.19.2(a).
  const baseWeeklyUsed = Math.max(highestSupervisedWeekly, ownWeekly);
  const perWeek = round2(baseWeeklyUsed * (band.pct / 100));

  const divisor = carpenterDiver ? LEADING_HAND.carpenterDiverDivisor : LEADING_HAND.ordinaryHours;
  const perHour = round2(
    dailyHire
      ? (perWeek * LEADING_HAND.dailyHireFactor) / divisor
      : perWeek / divisor,
  );

  return {
    perWeek, perHour, pct: band.pct, band: band.label, baseWeeklyUsed,
    reason:
      `cl.19.2(a): ${band.pct}% of ${money(baseWeeklyUsed)}/wk (${band.label}) = $${perWeek}/wk` +
      (baseWeeklyUsed === highestSupervisedWeekly && highestSupervisedWeekly > ownWeekly
        ? " — calculated on the HIGHEST CLASSIFICATION SUPERVISED, which exceeds the leading hand's own rate."
        : " — calculated on the employee's own rate, which is the higher of the two.") +
      ` ALL PURPOSE (cl.2): forms part of the ordinary hourly rate, so every penalty and loading is calculated on it.` +
      (dailyHire ? ` cl.19.2(b): daily hire multiplies by 52/50.4 before dividing by ${divisor}.` : "") +
      (carpenterDiver ? ` Carpenter-diver divisor is 31, not 38 (cl.19.2(b)).` : ""),
  };
}

/* ── cl.43 — FOREPERSONS AND SUPERVISORS ───────────────────────────────────── */

/**
 * cl.43.1 — TWO gates, and both must pass:
 *   1. the METAL AND ENGINEERING CONSTRUCTION sector, and
 *   2. an employer with 30 OR MORE employees.
 *
 * "does not apply to any employer employing fewer than 30 employees" is an
 * unusual carve-out and easy to miss; applying cl.43 to a small employer
 * over-charges every supervised hour.
 */
export const FOREPERSON = {
  clause: "43",
  allPurpose: true,
  sector: "metal_engineering",
  minEmployees: 30,
  ordinaryHours: 38,
} as const;

/**
 * cl.43.2 weekly minimum rates — VERIFIED against live MAPD pay-rates
 * (MA000020, operative 2026-07-01) on 2026-08-03.
 *
 * These figures look inverted on a casual reading (3+ tradespersons pays LESS
 * than "other than 3+"; General foreperson pays LESS than Foreperson on both
 * columns). An earlier session treated that as a docx→markdown transposition
 * and refused to price. Live MAPD returns the SAME figures, and the same shape
 * holds back through 2020–2025 annual wage reviews. So it is the award, not a
 * conversion bug.
 *
 * "Supervision of other than 3 or more tradespersons" means the cohort that is
 * NOT "3 or more tradespersons excluding leading hands" — fewer than three
 * tradespersons, and/or a non-trades mix. The higher rate on that cohort is
 * published fact; do not "fix" it by swapping columns.
 */
export const FOREPERSON_RATES = {
  verified: true,
  source: "MAPD /awards/MA000020/pay-rates cl.43.2, operative 2026-07-01 (confirmed live 2026-08-03)",
  effectiveFrom: "2026-07-01",
  rows: [
    { classification: "Foreperson/supervisor", threeOrMoreTradespersons: 1202.00, otherwise: 1303.00 },
    { classification: "General foreperson/supervisor", threeOrMoreTradespersons: 1169.50, otherwise: 1275.50 },
  ],
} as const;



export interface ForepersonResult {
  applies: boolean;
  perWeek: number | null;
  perHour: number | null;
  verified: boolean;
  /** What must be true for cl.43 to reach this placement. Stated, not enforced. */
  conditions: readonly string[];
  reason: string;
}

/**
 * COST OF A FOREPERSON, IF cl.43 APPLIES.
 *
 * OPERATOR RULING 2026-08-03: "all r8 should do is calculate how much it would
 * cost if it was applied. not whether it applies."
 *
 * So this no longer GATES on the cl.43.1 conditions (metal and engineering
 * sector, 30+ employees). Deciding whether a clause reaches a placement is
 * interpretation — HR or the Head of Accounts, escalated to a lawyer for edge
 * cases. The calculator's job is to answer "what does it cost", and refusing to
 * answer because a condition might not be met makes it useless for the quote it
 * exists to produce.
 *
 * The conditions are still RETURNED, because a quote that prices a foreperson
 * without stating what has to be true for that to be right is a trap. They are
 * information for the reader, not a gate on the arithmetic.
 */
export function forepersonRate({
  classification,
  supervisesThreeOrMoreTradespersons,
  /** @deprecated No longer required — rates are MAPD-verified. Kept for call-site compatibility. */
  allowUnverified: _allowUnverified = false,
}: {
  classification: "Foreperson/supervisor" | "General foreperson/supervisor";
  supervisesThreeOrMoreTradespersons: boolean;
  allowUnverified?: boolean;
}): ForepersonResult {
  const row = FOREPERSON_RATES.rows.find((r) => r.classification === classification);
  if (!row) {
    return { applies: false, perWeek: null, perHour: null, verified: false, conditions: FOREPERSON_CONDITIONS,
      reason: `No cl.43.2 row for classification "${classification}".` };
  }

  const perWeek = supervisesThreeOrMoreTradespersons ? row.threeOrMoreTradespersons : row.otherwise;
  const perHour = round2(perWeek / FOREPERSON.ordinaryHours);
  const cohort = supervisesThreeOrMoreTradespersons
    ? "supervision of 3 or more tradespersons, excluding leading hands"
    : "supervision of other than 3 or more tradespersons, excluding leading hands";

  return {
    applies: true, perWeek, perHour,
    verified: true, conditions: FOREPERSON_CONDITIONS,
    reason:
      `cl.43.2: ${classification}, ${cohort} = $${perWeek}/wk ÷ ${FOREPERSON.ordinaryHours} ` +
      `= $${perHour}/hr. ALL PURPOSE per cl.2 — forms part of the ordinary wage; every penalty is calculated on it. ` +
      `Source: live MAPD pay-rates ${FOREPERSON_RATES.effectiveFrom} (verified ${FOREPERSON_RATES.verified}). ` +
      `Conditions for reach (not gated here): ${FOREPERSON_CONDITIONS.join(" ")}`,
  };
}

/**
 * What must be true for cl.43 to reach a placement. Returned with every quote so
 * the reader can check it — the calculator does not decide it.
 */
export const FOREPERSON_CONDITIONS = [
  "cl.43.1: the METAL AND ENGINEERING CONSTRUCTION sector.",
  "cl.43.1: an employer with 30 OR MORE employees — clause 43 \"does not apply to any employer employing fewer than 30 employees\".",
  "cl.43.3(a): a foreperson/supervisor is an employee (other than a leading hand) mainly engaged in the direct supervision of employees.",
  "cl.43.3(b): a GENERAL foreperson/supervisor directly supervises and coordinates at least 2 forepersons, but is not a site manager or departmental head.",
] as const;
