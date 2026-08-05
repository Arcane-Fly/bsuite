/**
 * Calculator domain types — the shapes the charge-rate maths moves through.
 *
 * PORTED VERBATIM from R80.4 src/awards/calc-types.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy —
 * do not "fix" anything here without going back to R80.4 first.
 *
 * These live in src/r804/ rather than beside the component for the same
 * reason the engine modules do: the port carries them, and a type declared
 * inside a .tsx is a type the port has to re-derive.
 *
 * NOTHING HERE IS COSMETIC. Every field on CalcConfig changes a dollar figure,
 * and the units are the part people get wrong — so they are stated on the field
 * rather than left to the reader.
 */
import type { CombinedFunding } from "./funding.js";

/** How an allowance's amount is expressed. */
export type AllowanceType = "perHour" | "perDay" | "perWeek" | "percent" | "perKm";

/**
 * Whether an allowance is part of the ordinary rate or only paid for time
 * actually worked. This decides the DIVISOR, so getting it wrong moves the rate.
 */
export type AllowanceBasis = "allPurpose" | "workedOnly" | "reimbursement";

/**
 * SUPER AND WORKERS COMP FOLLOW THE SAME TEST (operator ruling 2026-08-03):
 * "if something forms part of a weekly ordinary wage then it attracts super.
 *  ~guaranteed each week = super. circumstance dependant or reimbursory no
 *  super." And: "WC usually applied in same way as super."
 *
 * So the basis decides it, and the basis is the thing to get right:
 *   allPurpose    guaranteed weekly, part of the ordinary wage  -> super + WC
 *   workedOnly    circumstance-dependent (meal on an OT night,
 *                 travel on a travel day)                       -> neither
 *   reimbursement not wages at all — restoring an out-of-pocket
 *                 cost (tool replacement, safety boots)          -> neither,
 *                 and excluded from the wage base entirely
 *
 * Overtime is the elective case: super on OT is a choice and is USUALLY NOT
 * taken, so `superOnOT` defaults false.
 */
/**
 * The DEFAULT super/WC treatment implied by an allowance's basis.
 *
 * OPERATOR RULING: "if something forms part of a weekly ordinary wage then it
 * attracts super. ~guaranteed each week = super. circumstance dependant or
 * reimbursory no super." And: "WC usually applied in same way as super."
 *
 * WIRED 2026-08-03. This was exported and tested but never called — dead code
 * that stated the rule while the engine's actual basis contradicted it. It is
 * now the default `superApplicable` for any allowance row that does not carry an
 * explicit election, so the ruling and the arithmetic cannot drift apart.
 */
export function accruesSuperAndWC(basis: AllowanceBasis): boolean {
  return basis === "allPurpose";
}

export interface AllowanceRow {
  /**
   * Quantity for a rate that needs one to become an hourly figure — currently
   * km per week for a perKm allowance. Without it the row cannot be costed.
   */
  qty?: number;
  /** The award's own note on the entitlement, carried through to the document. */
  note?: string;
  id: number | string;
  name: string;
  type: AllowanceType;
  /** In the unit named by `type`. A percent is 0-100, not 0-1. */
  amount: number;
  superApplicable: boolean;
  enabled: boolean;
  basis?: AllowanceBasis;
  /**
   * True only where the AWARD proportions this specific allowance for
   * apprentices (e.g. MA000020 cl.26.5 covers fares/travel and distant work
   * only). Not a blanket apprentice flag — see the note in calculate().
   */
  apprenticeProp?: boolean;
  /** Set by the clause engine when a rule REPLACES the adult amount. */
  _replaced?: boolean;
  _excluded?: boolean;
  clause?: string;
  /** "API" where the row came from MAPD rather than being hand-entered. */
  source?: string;
  /**
   * DISCRETIONARY allowance — not an award entitlement.
   *
   * Operator ruling 2026-08-03: "some host employers just add a site allowance
   * as a way to give people an unofficial discretionary pay increase. it can
   * take any number of forms so leave it available but elective."
   *
   * Because it is not an award allowance, no clause governs its treatment and
   * the three questions below are INDEPENDENT choices rather than a consequence
   * of the basis. Leaving them free is the point; inferring them would impose a
   * treatment the parties never agreed.
   */
  discretionary?: boolean;
  /** Include in the ORDINARY WAGE (so it flows into leave, training, PH). */
  inOrdinaryWage?: boolean;
  /** Attract superannuation. Independent of inOrdinaryWage for a discretionary row. */
  attractsSuper?: boolean;
  /** Be multiplied by overtime and penalty multipliers. */
  attractsPenalties?: boolean;
}

/** Overtime is built from the received rate; penalties are multiples of full cost. */
export type PenaltyCategory = "overtime" | "penalty";

export interface PenaltyRow {
  id: string;
  label: string;
  mult: number;
  cat: PenaltyCategory;
}

export type ProfitType = "grossProfit" | "markup" | "margin";
export type OverheadType = "percent" | "flat";
/**
 * cl.8 establishes FOUR categories. Casual was absent from this type entirely,
 * so calculate() — the engine's one production entry point — could not price a
 * casual at all. Daily hire remains a flag on the engagement rather than a value
 * here, because it modifies the RATE (cl.19.3) rather than the leave/on-cost
 * model the way casual does.
 */
export type EmploymentType = "fullTime" | "partTime" | "casual";

/** "avg" shows the blended term figure; a number shows that apprenticeship year. */
export type YearSelection = number | "avg";

/**
 * The shift an employee would ORDINARILY be working, as a multiplier on the
 * ordinary wage. 1.0 is day shift — no loading.
 *
 * This drives MA000020 cl.31.2(c): annual leave is paid at the GREATER of the
 * 17.5% loading or the shift loading they would have received. So a general
 * building morning-shift worker (x1.25) beats the loading and is paid 1.25;
 * a civil afternoon/night 5-in-a-row worker (x1.15) does NOT beat it and is
 * paid 1.175.
 */
export type ShiftLoading = number;

export interface CalcConfig {
  /** Ordinary hourly WAGE for the year being costed. Excludes allowances. */
  wage: number;
  allowances: AllowanceRow[];
  /** Fractions, not percentages — 0.12 is 12%. */
  superRate: number;
  wcRate: number;
  /**
   * Assess workers comp on ALL wages rather than on the superannuation base.
   * OFF by default: the operator ruled WC follows super. Elected only where a
   * scheme's "wages" definition is broader than OTE.
   */
  wcOnAllWages?: boolean;
  leaveLoad: number;
  profitType: ProfitType;
  profitVal: number;
  ohType: OverheadType;
  ohVal: number;
  /** Days per week. Drives hours-per-day, which pro-rates leave for part-timers. */
  dpw: number;
  alDays: number;
  phDays: number;
  sickDays: number;
  /** Off-the-job training WEEKS for this year. Varies year to year. */
  trainWk: number;
  /**
   * Multiplier for the shift the employee would ordinarily work. 1.0 = day
   * shift. Used for the cl.31.2(c) greater-of test on annual leave.
   */
  shiftLoading?: ShiftLoading;
  /**
   * cl.31.1(b): for the NES additional week, a "shiftworker" means a CONTINUOUS
   * shiftworker — engaged on consecutive shifts across the 24 hours of at least
   * 6 consecutive days without interruption, and regularly rostered to them.
   * Entitles them to 5 weeks annual leave instead of 4.
   */
  continuousShiftworker?: boolean;
  autoWeeks: boolean;
  manualBw: number;
  appYears: number;
  superOnOT: boolean;
  empType: EmploymentType;
  workedPW: number;
  rdoIncluded: boolean;
  rdoAccrual: number;
  ptHours: number;
  /**
   * WHO is engaged. Drives cl.19.3 daily hire, which reaches WORKERS only —
   * never apprentices or trainees, who hold a training contract.
   */
  engagement?: "apprentice" | "trainee" | "worker";
  engagedAsDailyHire?: boolean;
  /**
   * Pro-rate leave day-counts to `dpw`. TRUE by default, because cl.11.2 gives a
   * part-timer "pro rata entitlements" and the NES expresses annual leave in
   * WEEKS. Set false only where the caller has already pro-rated the counts.
   */
  leaveIsProRated?: boolean;
  /** cl.19.2 leading hand. ALL PURPOSE — forms part of the ordinary wage. */
  leadingHand?: {
    personsInCharge: number;
    /** cl.19.1(a) weekly rate of the highest classification supervised. */
    highestSupervisedWeekly?: number;
    carpenterDiver?: boolean;
  };
  /** One resolved object across EVERY funding scheme. */
  funding: CombinedFunding;
  fundYearSel: YearSelection;
  study: number;
  ppe: number;
  penalties: PenaltyRow[];
  /**
   * The apprentice's SHARE of a proportioned allowance for this year, as a
   * fraction. This is percent_of_full_allowance — NOT a percent of the standard
   * rate, and NOT the wage percentage. Conflating them is the MA000020 trap:
   * wages run 50/60/75/90 while cl.26.5 allowances run 75/85/90/95.
   */
  allowanceFactor?: number;
  /** Sum of every year's ACTUAL billable hours. Never billableHours x years. */
  termHoursOverride?: number;
  /** Per-year billable hours, index 0 = year 1. */
  yearHours?: number[];
}

export interface AllowanceDetail {
  /**
   * A per-km row with no distance entered. Its contribution is ZERO rather than
   * a fabricated per-hour figure, and the UI must surface this — a silent zero
   * is a missing cost, and a silent $/km-as-$/hr is a wrong one.
   */
  needsQuantity?: boolean;
  id: number | string;
  name: string;
  type: AllowanceType;
  basis: AllowanceBasis;
  /** Per PAID hour. */
  ph: number;
  annual: number;
  /** Contribution to the ordinary charge per BILLABLE hour. */
  chargePH: number;
  superApplicable: boolean;
  apprenticeProp: boolean;
  factorUsed: number;
}

export interface RateEntry {
  /**
   * Award-guaranteed minimum PAID hours for this kind of engagement (cl.30.2 and
   * friends). A rate without its minimum understates a short call-in — a one
   * hour Sunday attendance is a four hour bill.
   */
  minimumHours?: number;
  minimumClause?: string;
  cost: number;
  charge: number;
  /** Charge less the funding discount. Overtime never carries one. */
  funded: number;
  funding: number;
}

export interface CalcResult {
  isPT: boolean;
  effWorkedPW: number;
  effRdo: number;
  paidPW: number;
  hpdPaid: number;
  hpdWorked: number;
  paidHours: number;
  rdoHrsAnnual: number;
  /** Ordinary rate = wage + all-purpose allowances. */
  recv: number;
  /** recv, plus the cl.12.4 casual loading and/or the cl.19.3 daily-hire factor. */
  ordinaryHourlyRate?: number;
  isCasual?: boolean;
  /**
   * Impossible engagements the caller asked for and the engine refused. EMPTY on
   * a valid config. A non-empty array means the figures are correct but the
   * REQUEST was not — surface it before anything is quoted.
   */
  violations?: string[];
  dailyHire?: { ordinaryHourly: number; applied: boolean; reason: string };
  leadingHand?: { perWeek: number; perHour: number; pct: number; band: string; baseWeeklyUsed: number; reason: string } | null;
  allowPH: number;
  superBearing: number;
  allowanceDetails: AllowanceDetail[];
  workedOnlyAnnual: number;
  apAllowAnnual: number;
  baseWagesAnnual: number;
  workedDays: number;
  alWk: number;
  /** Leave day-counts actually used, after pro-rating. */
  effAlDays?: number;
  effPhDays?: number;
  effSickDays?: number;
  phWk: number;
  sickWk: number;
  bwAuto: number;
  bw: number;
  /** Billable hours for the year being costed. The divisor for every rate. */
  bHrs: number;
  workedBillHrs: number;
  trainHrs: number;
  annualWages: number;
  loadingCost: number;
  superAmt: number;
  superBase: number;
  wc: number;
  oh: number;
  totCost: number;
  ordCost: number;
  quoted: number;
  gpOrd: number;
  metrics: { margin: number; markup: number; grossProfit: number };
  oncWage: number;
  oncAL: number;
  oncLoad: number;
  oncPHol: number;
  oncSick: number;
  oncTrain: number;
  oncAllowances: number;
  oncStudy: number;
  oncPPE: number;
  oncSuper: number;
  oncWC: number;
  oncOH: number;
  totOnc: number;
  wcPH: number;
  superOTPH: number;
  /** Keyed by "ord" plus every penalty id. */
  rates: Record<string, RateEntry>;
  fundingPH: number;
  termPH: number;
  yearlyPH: number[];
  fundingTotal: number;
  totalOrdHrsApp: number;
  annualRevenue: number;
}

/* ─── Fair Work MAPD ───
   Shapes returned by api.fwc.gov.au, plus the fields this app DERIVES from them.
   Derived fields are underscore-prefixed so it is obvious at the call site which
   values came off the wire and which we computed — the distinction matters,
   because a derived hourly rate is our arithmetic, not the FWC's. */

/** How an apprenticeship year was obtained. Name inference is weak evidence. */
export interface YearProvenance {
  year: number | null;
  derivedFrom: string;
  classificationFixedId: number | string | null;
  /** False where the year was inferred from free text rather than read from an id. */
  stable: boolean;
}

/** A classification / pay rate row from the MAPD pay-rates endpoints. */
export interface MapdRateRow {
  classification?: string;
  classification_level?: number;
  parent_classification_name?: string;
  base_rate?: number;
  base_rate_type?: string;
  calculated_rate?: number;
  calculated_rate_type?: string;
  clause_description?: string;
  clauses?: string;
  employee_rate_type_code?: string;
  operative_from?: string;
  operative_to?: string;
  base_pay_rate_id?: string;
  classification_fixed_id?: number | string | null;
  /** DERIVED: hourly rate (weekly / 38 where the row is weekly). Null when the
   *  row's unit is unrecognised — deliberately NOT assumed to be hourly. */
  _hr?: number | null;
  /** DERIVED: apprenticeship year inferred from the classification text. */
  _yr?: number | null;
  /** DERIVED: how that year was obtained. Name inference is weak evidence. */
  _yrProv?: YearProvenance;
  /** DERIVED: cohort label parsed from the classification text. */
  _cohort?: string;
}

/** An expense/wage allowance row from the MAPD allowances endpoint. */
export interface MapdAllowanceRow {
  allowance?: string;
  allowance_amount?: number;
  payment_frequency?: string;
  clause_description?: string;
  clauses?: string;
  /** Live API sends a boolean; the dictionary sends 1/2 (wage) or 1/0 (expense). */
  is_all_purpose?: boolean | number;
  /** Present when the allowance is a PERCENTAGE rather than a dollar amount. */
  rate?: number | null;
  rate_unit?: string;
  wage_allowance_fixed_id?: number | string;
  expense_allowance_fixed_id?: number | string;
  operative_from?: string;
  operative_to?: string;
  /** DERIVED: mapped onto the calculator's own allowance type. */
  _type?: AllowanceType;
}

/** A penalty / loading row from the MAPD penalties endpoint. */
export interface MapdPenaltyRow {
  penalty_description?: string;
  clause_description?: string;
  penalty_fixed_id?: number | string;
  /** Percent of the ordinary hourly rate — 115 means 1.15x. */
  rate?: number | null;
  clauses?: string;
  operative_from?: string;
  operative_to?: string;
}

export interface MapdAward {
  code?: string;
  award_fixed_id?: number;
  name?: string;
  award_operative_from?: string;
  published_year?: number;
  version_number?: number;
}

/**
 * What the app holds after loading one award from MAPD.
 * Field names are short because they mirror the loader; `wa`/`ea` are the two
 * SEPARATE allowance endpoints (wage vs expense) and must not be merged before
 * mapping, because is_all_purpose means different things in each.
 */
export interface MapdPayload {
  /** Apprentice rate rows for the selected rate-type code, with derived fields. */
  ap: MapdRateRow[];
  /** Distinct parent_classification_name values found in `ap`. */
  cohorts: string[];
  /** Wage allowances. */
  wa: MapdAllowanceRow[];
  /** Expense allowances. */
  ea: MapdAllowanceRow[];
  pen: MapdPenaltyRow[];
}

/**
 * Resolve an allowance row's super/WC treatment: the explicit election if the
 * row carries one, otherwise the default implied by its basis.
 *
 * Explicit beats implied, because a host may guarantee a circumstance-dependent
 * allowance every week and thereby bring it into OTE — but the ELECTION has to
 * be recorded rather than inferred from the amount.
 */
export function resolveSuperApplicable(
  row: { basis?: AllowanceBasis; superApplicable?: boolean },
): boolean {
  if (typeof row.superApplicable === "boolean") return row.superApplicable;
  return accruesSuperAndWC(row.basis ?? "allPurpose");
}
