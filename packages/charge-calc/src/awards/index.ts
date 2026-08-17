export { getFinancialYear, checkRateFreshness } from './freshness.js';
export type { RateFreshness } from './freshness.js';

export {
  MAPDAwardZ,
  MAPDClassificationZ,
  MAPDPenaltyZ,
  MAPDWageAllowanceZ,
  MAPDExpenseAllowanceZ,
} from './mapd-types.js';
export type {
  MAPDAward,
  MAPDClassification,
  MAPDPenalty,
  MAPDWageAllowance,
  MAPDExpenseAllowance,
} from './mapd-types.js';

export {
  EmployeeRateTypeCodeZ,
  AwardClassificationZ,
  AwardPenaltyZ,
  AwardAllowanceZ,
  AwardSupplementZ,
  AwardSchemaZ,
} from './schema.js';
export type {
  EmployeeRateTypeCode,
  AwardClassification,
  AwardPenalty,
  AwardAllowance,
  AwardSupplement,
  AwardSchema,
} from './schema.js';

export {
  mapClassification,
  mapPenalty,
  mapIsAllPurpose,
  mapPaymentFrequency,
  mapWageAllowance,
  mapExpenseAllowance,
  filterApprenticeClassifications,
} from './mapd-mapper.js';

export { fetchCompleteAward } from './mapd-client.js';
export type { MAPDDataSource } from './mapd-client.js';

export {
  registerAward,
  getAward,
  listAwards,
  validateAward,
  clearAwardCache,
  loadAwardFromMAPD,
} from './registry.js';

export { awardToCalcConfig } from './converter.js';
export type { EmployeeAwardContext, CalcOverrides } from './converter.js';

export {
  casualPenaltyMultiplierForAward,
  CasualPenaltyConventionUnmodelled,
} from './casual-penalty-convention.js';
export type { CasualPenaltyResult } from './casual-penalty-convention.js';
