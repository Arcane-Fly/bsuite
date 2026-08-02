/**
 * MAPD Award Data Mapper — Pure Mapping Functions
 *
 * Converts MAPD API response shapes (snake_case) into our internal
 * AwardSchema representation (camelCase). Every function here is pure
 * and deterministic — no side effects, no API calls.
 *
 * Key conversions:
 *  - penalty.rate: 150 -> 1.5 (percentage to decimal multiplier)
 *  - is_all_purpose: 1 or true -> true, 2 or false -> false
 *  - payment_frequency: "per week" -> "perWeek" etc.
 *  - employee_rate_type_code: passed through, validated by schema
 */
import type {
  MAPDClassification,
  MAPDPenalty,
  MAPDWageAllowance,
  MAPDExpenseAllowance,
} from './mapd-types.js';
import type { AwardClassification, AwardPenalty, AwardAllowance } from './schema.js';
import type { AllowanceType } from '../types.js';

/** Map MAPD classification to internal format */
export function mapClassification(raw: MAPDClassification): AwardClassification {
  return {
    classificationFixedId: raw.classification_fixed_id,
    name: raw.classification,
    parentClassification: raw.parent_classification_name,
    level: raw.classification_level,
    employeeRateTypeCode: raw.employee_rate_type_code as AwardClassification['employeeRateTypeCode'],
    baseRate: raw.base_rate,
    baseRateType: raw.base_rate_type,
    calculatedHourlyRate: raw.calculated_rate, // MAPD calculated_rate is always hourly
    operativeFrom: raw.operative_from,
    operativeTo: raw.operative_to,
    clauseRef: raw.clauses,
  };
}

/** Map MAPD penalty to internal format. Converts percentage rate to decimal multiplier. */
export function mapPenalty(raw: MAPDPenalty): AwardPenalty {
  return {
    penaltyFixedId: raw.penalty_fixed_id,
    description: raw.penalty_description,
    rate: raw.rate !== null ? raw.rate / 100 : null, // 150 -> 1.5
    calculatedValue: raw.penalty_calculated_value,
    employeeRateTypeCode: raw.employee_rate_type_code,
    clauseRef: raw.clauses,
    clauseDescription: raw.clause_description,
    classificationLevel: raw.classification_level,
  };
}

/** Normalize MAPD is_all_purpose to boolean. 1 or true = all-purpose. */
export function mapIsAllPurpose(val: boolean | number): boolean {
  if (typeof val === 'boolean') return val;
  return val === 1;
}

/** Map MAPD payment_frequency to CalcConfig AllowanceType */
export function mapPaymentFrequency(freq: string | null): AllowanceType {
  if (!freq) return 'perHour'; // default
  const lower = freq.toLowerCase().trim();
  if (lower.includes('hour')) return 'perHour';
  if (lower.includes('day')) return 'perDay';
  if (lower.includes('week')) return 'perWeek';
  if (lower.includes('annum') || lower.includes('year')) return 'perWeek'; // annualise to weekly
  return 'perHour'; // fallback
}

/** Map MAPD wage allowance to internal format */
export function mapWageAllowance(raw: MAPDWageAllowance): AwardAllowance {
  return {
    fixedId: raw.wage_allowance_fixed_id,
    name: raw.allowance,
    amount: raw.allowance_amount,
    rate: raw.rate,
    rateUnit: raw.rate_unit,
    paymentFrequency: raw.payment_frequency,
    isAllPurpose: mapIsAllPurpose(raw.is_all_purpose),
    parentAllowance: raw.parent_allowance,
    clauseRef: raw.clauses,
    type: 'wage',
  };
}

/** Map MAPD expense allowance to internal format */
export function mapExpenseAllowance(raw: MAPDExpenseAllowance): AwardAllowance {
  return {
    fixedId: raw.expense_allowance_fixed_id,
    name: raw.allowance,
    amount: raw.allowance_amount,
    rate: null, // expense allowances don't have rates
    rateUnit: null,
    paymentFrequency: raw.payment_frequency,
    isAllPurpose: mapIsAllPurpose(raw.is_all_purpose),
    parentAllowance: raw.parent_allowance,
    clauseRef: raw.clauses,
    type: 'expense',
  };
}

/** Filter classifications to just apprentice types (AP, AA) */
export function filterApprenticeClassifications(
  classifications: AwardClassification[],
): AwardClassification[] {
  return classifications.filter(
    (c) => c.employeeRateTypeCode === 'AP' || c.employeeRateTypeCode === 'AA',
  );
}
