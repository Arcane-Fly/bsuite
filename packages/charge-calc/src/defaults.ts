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

export const DEFAULT_CONFIG: CalcConfig = {
  wage: 29.5,
  hoursPerWeek: 38,
  hoursPerDay: 7.6,
  daysPerWeek: 5,
  billableWeeks: 39,
  trainingWeeks: 5,
  apprenticeshipYears: 4,
  annualLeaveDays: 20,
  publicHolidayDays: 10,
  sickLeaveDays: 10,
  leaveLoadingPercent: 17.5,
  superRate: 0.12,
  superOnOT: false,
  wcRate: 0.047,
  payrollTaxRate: 0.0485,
  otOncostFactor: 0.12,
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
