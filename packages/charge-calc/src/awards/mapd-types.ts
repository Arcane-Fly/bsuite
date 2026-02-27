/**
 * MAPD API Response Zod Types
 *
 * These schemas map DIRECTLY to the FWC (Fair Work Commission) MAPD API
 * data dictionary response shapes. Field names match the API exactly
 * (snake_case). Do NOT rename fields here — use the internal AwardSchema
 * (schema.ts) for our normalized camelCase representation.
 *
 * @see https://www.fwc.gov.au/agreements-awards/awards/find-award/modern-awards-pay-database
 */
import { z } from 'zod';

// ─── Award (top-level award metadata) ───────────────────────────────

export const MAPDAwardZ = z.object({
  award_fixed_id: z.number(),
  award_id: z.number(),
  code: z.string(),
  name: z.string(),
  award_operative_from: z.string(),
  award_operative_to: z.string().nullable(),
  published_year: z.string(),
  version_number: z.number(),
  last_modified_datetime: z.string(),
});
export type MAPDAward = z.infer<typeof MAPDAwardZ>;

// ─── Classification (pay level / grade) ─────────────────────────────

export const MAPDClassificationZ = z.object({
  classification_fixed_id: z.number(),
  award_fixed_id: z.number(),
  classification: z.string(),
  parent_classification_name: z.string().nullable(),
  classification_level: z.number().nullable(),
  /** Employee rate type: AD=Adult, JN=Junior, AP=Apprentice, AA=Adult Apprentice, TN=Trainee, XT=Exited Trainee, CA=Cadet */
  employee_rate_type_code: z.string().nullable(),
  base_rate: z.number().nullable(),
  /** "Weekly" | "Hourly" */
  base_rate_type: z.string().nullable(),
  calculated_rate: z.number().nullable(),
  /** "Hourly" | "Weekly" */
  calculated_rate_type: z.string().nullable(),
  operative_from: z.string(),
  operative_to: z.string().nullable(),
  published_year: z.number(),
  clauses: z.string(),
});
export type MAPDClassification = z.infer<typeof MAPDClassificationZ>;

// ─── Penalty (overtime / weekend / public holiday multipliers) ──────

export const MAPDPenaltyZ = z.object({
  penalty_fixed_id: z.number(),
  award_fixed_id: z.number(),
  penalty_description: z.string(),
  /** Percentage multiplier — e.g. 150 = 1.5x, 200 = 2x */
  rate: z.number().nullable(),
  penalty_calculated_value: z.number().nullable(),
  employee_rate_type_code: z.string().nullable(),
  operative_from: z.string(),
  operative_to: z.string().nullable(),
  clauses: z.string(),
  clause_description: z.string().nullable(),
  classification_level: z.number().nullable(),
  published_year: z.number(),
});
export type MAPDPenalty = z.infer<typeof MAPDPenaltyZ>;

// ─── Wage Allowance ─────────────────────────────────────────────────

export const MAPDWageAllowanceZ = z.object({
  wage_allowance_fixed_id: z.number(),
  award_fixed_id: z.number(),
  allowance: z.string(),
  allowance_amount: z.number().nullable(),
  rate: z.number().nullable(),
  rate_unit: z.string().nullable(),
  /** "per week" | "per hour" | "per day" | "per shift" | "per annum" */
  payment_frequency: z.string().nullable(),
  /** MAPD API is inconsistent: sometimes boolean, sometimes number (1=all purpose, 2=specific) */
  is_all_purpose: z.union([z.boolean(), z.number()]),
  parent_allowance: z.string().nullable(),
  operative_from: z.string(),
  operative_to: z.string().nullable(),
  clauses: z.string(),
  published_year: z.number(),
});
export type MAPDWageAllowance = z.infer<typeof MAPDWageAllowanceZ>;

// ─── Expense Allowance ──────────────────────────────────────────────

export const MAPDExpenseAllowanceZ = z.object({
  expense_allowance_fixed_id: z.number(),
  award_fixed_id: z.number(),
  allowance: z.string(),
  allowance_amount: z.number().nullable(),
  /** "per week" | "per hour" | "per day" | "per shift" | "per annum" */
  payment_frequency: z.string().nullable(),
  /** MAPD API is inconsistent: sometimes boolean, sometimes number (1=all purpose, 2=specific) */
  is_all_purpose: z.union([z.boolean(), z.number()]),
  parent_allowance: z.string().nullable(),
  operative_from: z.string(),
  operative_to: z.string().nullable(),
  clauses: z.string(),
  published_year: z.number(),
});
export type MAPDExpenseAllowance = z.infer<typeof MAPDExpenseAllowanceZ>;
