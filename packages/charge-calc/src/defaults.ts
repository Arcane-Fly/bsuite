import type { CalcConfig, PenaltyRate, AustralianState } from './types';

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
 * Returns the payroll tax rate for a given Australian state or territory.
 * Use this to populate CalcConfig.payrollTaxRate from state selection.
 */
export function getPayrollTaxRate(state: AustralianState): number {
  return PAYROLL_TAX_RATES[state];
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
