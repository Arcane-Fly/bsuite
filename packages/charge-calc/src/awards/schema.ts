/**
 * Internal AwardSchema — Normalized Zod Types
 *
 * Our internal representation of award data, designed to be mapped FROM
 * MAPD API responses (see mapd-types.ts). Uses camelCase field names,
 * normalizes inconsistencies (e.g. is_all_purpose becomes boolean),
 * and converts penalty rates from percentages to decimal multipliers.
 *
 * The mapper (awards/mapper.ts — Task 5) converts between MAPD and
 * these types.
 */
import { z } from 'zod';

// ─── Employee Rate Type Codes ───────────────────────────────────────

/** MAPD API employee_rate_type_code values */
export const EmployeeRateTypeCodeZ = z.enum([
  'AD', // Adult
  'JN', // Junior
  'AP', // Apprentice (standard)
  'AA', // Adult Apprentice
  'TN', // Trainee
  'XT', // Exited Trainee
  'CA', // Cadet
]);
export type EmployeeRateTypeCode = z.infer<typeof EmployeeRateTypeCodeZ>;

// ─── Classification ─────────────────────────────────────────────────

export const AwardClassificationZ = z.object({
  classificationFixedId: z.number(),
  name: z.string(),
  parentClassification: z.string().nullable(),
  level: z.number().nullable(),
  employeeRateTypeCode: EmployeeRateTypeCodeZ.nullable(),
  baseRate: z.number().nullable(),
  baseRateType: z.string().nullable(),
  calculatedHourlyRate: z.number().nullable(),
  operativeFrom: z.string(),
  operativeTo: z.string().nullable(),
  clauseRef: z.string(),
});
export type AwardClassification = z.infer<typeof AwardClassificationZ>;

// ─── Penalty ────────────────────────────────────────────────────────

export const AwardPenaltyZ = z.object({
  penaltyFixedId: z.number(),
  description: z.string(),
  /** Multiplier as decimal (e.g. 1.5 for time-and-a-half). MAPD provides as percentage (150), we divide by 100. */
  rate: z.number().nullable(),
  calculatedValue: z.number().nullable(),
  employeeRateTypeCode: z.string().nullable(),
  clauseRef: z.string(),
  clauseDescription: z.string().nullable(),
  classificationLevel: z.number().nullable(),
});
export type AwardPenalty = z.infer<typeof AwardPenaltyZ>;

// ─── Allowance (wage + expense unified) ─────────────────────────────

export const AwardAllowanceZ = z.object({
  fixedId: z.number(),
  name: z.string(),
  amount: z.number().nullable(),
  rate: z.number().nullable(),
  rateUnit: z.string().nullable(),
  paymentFrequency: z.string().nullable(),
  /** Normalized to boolean. MAPD sends 1 (all purpose) / 2 (specific) or true/false — mapper normalizes. */
  isAllPurpose: z.boolean(),
  parentAllowance: z.string().nullable(),
  clauseRef: z.string(),
  type: z.enum(['wage', 'expense']),
});
export type AwardAllowance = z.infer<typeof AwardAllowanceZ>;

// ─── Supplement (manually-entered data not in MAPD API) ─────────────

/**
 * Wraps a Zod object schema so that a missing key or `undefined` input is
 * coerced to `{}` BEFORE parsing — which lets nested `.default()` values
 * cascade through and populate the returned object.
 *
 * Implementation note: uses Zod 4's `.prefault({})` (applied pre-parse) rather
 * than the earlier `z.preprocess((val) => val ?? {}, schema)` pattern. The
 * preprocess variant worked on Zod 4.3.x but silently broke on Zod 4.4.0+
 * because a missing object key no longer triggers `preprocess` — Zod raises
 * `nonoptional` on the missing field before the preprocess callback runs.
 * `.prefault({})` is the idiomatic Zod 4 replacement and cascades nested
 * `.default()` values correctly for missing-key, `undefined`, and partial-input
 * cases. (Explicit `null` still errors — callers must pass `undefined` or omit
 * the key.)
 *
 * The `as unknown as T` cast preserves the external API shape so existing call
 * sites and downstream `z.infer<typeof …>` consumers see no type drift.
 */
function withObjectDefaults<T extends z.ZodObject>(schema: T) {
  return schema.prefault({} as z.input<T>) as unknown as T;
}

const SpanOfHoursZ = z.object({
  start: z.string().default('06:00'),
  end: z.string().default('18:00'),
});

const HoursProvisionsZ = z.object({
  ordinaryHoursPerWeek: z.number().default(38),
  ordinaryHoursPerDay: z.number().default(7.6),
  ordinaryDaysPerWeek: z.number().default(5),
  dailyMaxOrdinary: z.number().nullable().default(null),
  weeklyMaxOrdinary: z.number().nullable().default(null),
  spanOfHours: withObjectDefaults(SpanOfHoursZ),
});

const LeaveProvisionsZ = z.object({
  annualLeaveDays: z.number().default(20),
  personalLeaveDays: z.number().default(10),
  communityServiceLeave: z.boolean().default(true),
  longServiceLeave: z.boolean().default(true),
  leaveLoadingPercent: z.number().default(17.5),
});

const ShiftLoadingZ = z.object({
  name: z.string(),
  multiplier: z.number(),
  conditions: z.string(),
});

export const AwardSupplementZ = withObjectDefaults(z.object({
  hoursProvisions: withObjectDefaults(HoursProvisionsZ),
  leaveProvisions: withObjectDefaults(LeaveProvisionsZ),
  shiftLoadings: z.array(ShiftLoadingZ).default([]),
}));
export type AwardSupplement = z.infer<typeof AwardSupplementZ>;

// ─── Full Award Schema ──────────────────────────────────────────────

export const AwardSchemaZ = z.object({
  code: z.string(),
  name: z.string(),
  awardFixedId: z.number(),
  publishedYear: z.string(),
  lastModified: z.string(),
  operativeFrom: z.string(),
  operativeTo: z.string().nullable(),
  classifications: z.array(AwardClassificationZ),
  penalties: z.array(AwardPenaltyZ),
  wageAllowances: z.array(AwardAllowanceZ),
  expenseAllowances: z.array(AwardAllowanceZ),
  supplement: AwardSupplementZ,
});
export type AwardSchema = z.infer<typeof AwardSchemaZ>;
