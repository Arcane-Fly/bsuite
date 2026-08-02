/**
 * MAPD Data Source Interface + Award Assembler
 *
 * The charge-calc package does NOT call the MAPD API directly — that is
 * the edge function's job. This module defines the interface that
 * callers must implement and provides the assembly logic that converts
 * raw MAPD responses into our internal AwardSchema.
 */
import type {
  MAPDAward,
  MAPDClassification,
  MAPDPenalty,
  MAPDWageAllowance,
  MAPDExpenseAllowance,
} from './mapd-types.js';
import type { AwardSchema } from './schema.js';
import { AwardSupplementZ } from './schema.js';
import {
  mapClassification,
  mapPenalty,
  mapWageAllowance,
  mapExpenseAllowance,
} from './mapd-mapper.js';

/** Interface for fetching MAPD data -- implemented by edge function or test mock */
export interface MAPDDataSource {
  fetchAward(awardCode: string): Promise<MAPDAward | null>;
  fetchClassifications(awardCode: string): Promise<MAPDClassification[]>;
  fetchPenalties(awardCode: string): Promise<MAPDPenalty[]>;
  fetchWageAllowances(awardCode: string): Promise<MAPDWageAllowance[]>;
  fetchExpenseAllowances(awardCode: string): Promise<MAPDExpenseAllowance[]>;
}

/** Fetch complete award data from a MAPD data source and assemble into AwardSchema */
export async function fetchCompleteAward(
  source: MAPDDataSource,
  awardCode: string,
  supplement?: Record<string, unknown>,
): Promise<AwardSchema | null> {
  const award = await source.fetchAward(awardCode);
  if (!award) return null;

  const [classifications, penalties, wageAllowances, expenseAllowances] =
    await Promise.all([
      source.fetchClassifications(awardCode),
      source.fetchPenalties(awardCode),
      source.fetchWageAllowances(awardCode),
      source.fetchExpenseAllowances(awardCode),
    ]);

  return {
    code: award.code,
    name: award.name,
    awardFixedId: award.award_fixed_id,
    publishedYear: award.published_year,
    lastModified: award.last_modified_datetime,
    operativeFrom: award.award_operative_from,
    operativeTo: award.award_operative_to,
    classifications: classifications.map(mapClassification),
    penalties: penalties.map(mapPenalty),
    wageAllowances: wageAllowances.map(mapWageAllowance),
    expenseAllowances: expenseAllowances.map(mapExpenseAllowance),
    supplement: AwardSupplementZ.parse(supplement ?? {}),
  };
}
