import type { CalcConfig, PenaltyRate, AustralianState } from './types.js';

// ─── State Payroll Tax Rates ───
export const PAYROLL_TAX_RATES: Record<AustralianState, number> = {
  NSW: 0.0545,
  VIC: 0.0485,
  QLD: 0.0475,
  SA: 0.0495,
  WA: 0.055,
  TAS: 0.04,
  NT: 0.055,
  ACT: 0.0685,
};

/**
 * Returns the GENERAL payroll tax rate for a given Australian state or
 * territory — i.e. the headline state rate a non-exempt employer pays.
 *
 * NOT EXEMPTION-AWARE. This function has no idea whether the specific
 * employee is an exempt apprentice/trainee (see `PAYROLL_TAX_EXEMPT_STATES`
 * below) — it must never be assigned directly to a cost config's
 * `payrollTaxRate` (or equivalent) for an apprentice/trainee/junior worker.
 * For any employee with a `rateTypeCode`, use `resolveEffectivePayrollTaxRate()`
 * instead, passing this function's result as `generalStateRate`.
 */
export function getPayrollTaxRate(state: AustralianState): number {
  return PAYROLL_TAX_RATES[state];
}

// ─── Employee rate type codes (payroll tax) ───

/**
 * FWC employee_rate_type_code values used for apprentices and trainees, for
 * the purpose of resolving payroll tax exemption.
 *  AP = Standard apprentice (any age)
 *  AA = Adult apprentice (commenced 21+)
 *  TN = Trainee (under a training contract)
 *  JN = Junior (under minimum school-leaving age rules)
 *
 * Named `PayrollTaxRateTypeCode` (not `EmployeeRateTypeCode`) to avoid
 * colliding with the broader MAPD `EmployeeRateTypeCode` in
 * `./awards/schema.ts` (which also includes AD/XT/CA — codes with no
 * payroll-tax-exemption meaning). R80.3 re-exports this under its own
 * `EmployeeRateTypeCode` alias for its (narrower, tax-specific) local usage —
 * see `awardRulesEngine.ts`.
 *
 * Moved verbatim (values) from R80.3/src/services/awardRulesEngine.ts:40
 * (crm7#1265 / G2 unify-calc-paths) — crm7 could import `PAYROLL_TAX_RATES`
 * from this package but not the exemption logic that lived only in R80.3, so
 * crm7's charge path used a bare VIC rate for every worker in every state,
 * apprentice or not.
 */
export type PayrollTaxRateTypeCode = 'AP' | 'AA' | 'TN' | 'JN';

/**
 * States/territories where AP, AA, and/or TN employees are exempt from
 * payroll tax. Source: State Revenue legislation. Verify annually — rules
 * change.
 *
 * WA, VIC, NSW: full exemption for all three codes
 * QLD: exemption for AP and AA only
 * SA, TAS, ACT, NT: exemption for AP and AA only
 *
 * Moved verbatim from R80.3/src/services/awardRulesEngine.ts:408-417
 * (crm7#1265 / G2 unify-calc-paths). The per-state code lists are
 * deliberately NOT uniform — do not "tidy" this into a single shared list
 * per state; WA/VIC/NSW exempt TN, the rest do not.
 */
export const PAYROLL_TAX_EXEMPT_STATES: Partial<
  Record<AustralianState, ReadonlyArray<PayrollTaxRateTypeCode>>
> = {
  WA: ['AP', 'AA', 'TN'],
  VIC: ['AP', 'AA', 'TN'],
  NSW: ['AP', 'AA', 'TN'],
  QLD: ['AP', 'AA'],
  SA: ['AP', 'AA'],
  TAS: ['AP', 'AA'],
  ACT: ['AP', 'AA'],
  NT: ['AP', 'AA'],
};

/**
 * Resolve the EFFECTIVE payroll tax rate for a specific employee. Returns 0
 * if the state exempts the employee's rate type code, otherwise returns
 * `generalStateRate` unchanged.
 *
 * Moved verbatim (logic) from
 * R80.3/src/services/awardRulesEngine.ts:583-610 (crm7#1265 / G2
 * unify-calc-paths) — this is the collapse of the exemption table into the
 * same shared package that already owns `PAYROLL_TAX_RATES`, so the two
 * can't drift the way `HARDCODED_PAYROLL_TAX_RATES` and `PAYROLL_TAX_RATES`
 * used to (see R80.3's payrollTaxService.ts G2 comment).
 *
 * PRECEDENCE GUARD (carried from the original R80.3 doc comment — do not
 * weaken this): `generalStateRate` is a plain number — this function does
 * not know or care whether it came from the hardcoded fallback table, a DB
 * cache, or (future) a tenant's own accounting integration. The exemption
 * check below ALWAYS runs and ALWAYS wins for an exempt rateTypeCode/state
 * combination — an exempt apprentice/trainee is 0% even if the general rate
 * a future Xero-backed resolver reports for the org is non-zero. Exemption
 * is a legislative rule about the EMPLOYEE, not a property of the rate
 * SOURCE, so it must never be bypassed by changing where `generalStateRate`
 * comes from. Do not move this check "below" or "after" a rate-source
 * resolver — it must stay the LAST WORD on the value handed to the cost
 * calculator.
 *
 * @param state - Two-letter Australian state/territory
 * @param rateTypeCode - AP, AA, TN, or JN
 * @param generalStateRate - The standard state payroll tax rate (e.g. from
 *   `getPayrollTaxRate()` or a tenant-specific resolver) — NOT exemption-aware
 *   on its own.
 */
export function resolveEffectivePayrollTaxRate(
  state: AustralianState,
  rateTypeCode: PayrollTaxRateTypeCode,
  generalStateRate: number,
): number {
  const exemptCodes = PAYROLL_TAX_EXEMPT_STATES[state] ?? [];
  return exemptCodes.includes(rateTypeCode) ? 0 : generalStateRate;
}

// ─── Default Training Weeks Per Year ───
export const DEFAULT_TRAINING_WEEKS_PER_YEAR: readonly number[] = [8, 6, 5, 4] as const;

export const DEFAULT_PENALTIES: PenaltyRate[] = [
  { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' },
  { id: 'ot20', label: 'Double Time', mult: 2.0, cat: 'overtime' },
  { id: 'ot25', label: 'Double Time & a Half', mult: 2.5, cat: 'overtime' },
  { id: 'ph', label: 'Public Holiday Worked', mult: 2.5, cat: 'penalty' },
  { id: 'night12', label: 'Night Shift (≤4 nights)', mult: 1.2, cat: 'penalty' },
  { id: 'night13', label: 'Night Shift (4+ weeks)', mult: 1.3, cat: 'penalty' },
  {
    id: 'satnight',
    label: 'Saturday Night Shift',
    mult: 1.5,
    cat: 'penalty',
  },
  {
    id: 'sunnight',
    label: 'Sunday Night Shift',
    mult: 2.0,
    cat: 'penalty',
  },
];

/**
 * The oncosts that overtime DOES carry.
 *
 * Overtime attracts only the levies charged on total wages — workers'
 * compensation premium and payroll tax. It carries none of the
 * per-ordinary-hour costs (annual leave, leave loading, sick leave, public
 * holidays, off-the-job training, study, PPE): an overtime hour accrues no
 * leave and consumes no training time. Superannuation is handled separately
 * and correctly by `superOnOT`, which defaults false, because overtime is not
 * ordinary time earnings (SGAA 1992 s.6(1); ATO SGR 2009/2).
 *
 * Exported so a caller that overrides `wcRate` or `payrollTaxRate` can
 * recompute a consistent overtime factor rather than leaving a stale one
 * behind. Payroll tax in particular ranges from 0% (under threshold) to about
 * 6.85% depending on state, so a fixed factor is wrong for most tenants.
 */
export function deriveOtOncostFactor(cfg: {
  wcRate: number;
  payrollTaxRate: number;
}): number {
  return cfg.wcRate + cfg.payrollTaxRate;
}

/** Workers' compensation rate used by DEFAULT_CONFIG (GTO sector average). */
const DEFAULT_WC_RATE = 0.047;
/** Payroll tax rate used by DEFAULT_CONFIG (Victoria; resolve per-state in real use). */
const DEFAULT_PAYROLL_TAX_RATE = 0.0485;

export const DEFAULT_CONFIG: CalcConfig = {
  wage: 29.5,
  hoursPerWeek: 38,
  hoursPerDay: 7.6,
  daysPerWeek: 5,
  billableWeeks: 39, // fallback only — use calculateBillableWeeks() for leave-adjusted value
  trainingWeeks: 5,
  apprenticeshipYears: 4,
  annualLeaveDays: 20,
  publicHolidayDays: 10,
  sickLeaveDays: 10,
  leaveLoadingPercent: 17.5,
  superRate: 0.12,
  superOnOT: false,
  wcRate: DEFAULT_WC_RATE,
  payrollTaxRate: DEFAULT_PAYROLL_TAX_RATE,
  // Derived, not magic. Overtime carries only the oncosts that are levied on
  // total wages — workers' compensation premium and payroll tax. It does NOT
  // carry the per-ordinary-hour costs (annual leave, leave loading, sick leave,
  // public holidays, off-the-job training, study, PPE), because overtime hours
  // earn no leave and consume no training time. Superannuation is excluded
  // separately and correctly by `superOnOT`, which defaults false — overtime is
  // not ordinary time earnings (SGAA 1992 s.6(1); ATO SGR 2009/2).
  //
  // This was a hardcoded 0.12 whose only documentation was the circular
  // "OT oncost factor (default 0.12)". It was inherited when the magic
  // constants were extracted, never derived. 0.12 against a real
  // wc + payroll tax of 0.0955 over-applies oncosts to overtime by 2.45
  // percentage points of pay, on every overtime hour of every quote.
  //
  // Deriving it from the two rates it is actually made of also means a tenant
  // in a different state — payroll tax ranges 0% (below threshold) to ~6.85% —
  // gets the right figure instead of a Victorian-shaped constant.
  otOncostFactor: deriveOtOncostFactor({
    wcRate: DEFAULT_WC_RATE,
    payrollTaxRate: DEFAULT_PAYROLL_TAX_RATE,
  }),
  penaltyOncostAdder: 0.15,
  overheadType: 'percent',
  overheadValue: 6.5,
  studyCost: 850,
  ppeCost: 350,
  trainingFeesAnnual: 0,
  marginType: 'flat',
  marginValue: 2.1,
  allowances: [],
  penalties: DEFAULT_PENALTIES,
  funding: {
    enabled: false,
    milestones: [],
    method: 'reduce',
    passPercentage: 100,
    apprenticeshipYears: 4,
  },
};
