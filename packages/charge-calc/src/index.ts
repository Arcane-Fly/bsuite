// @bsuite/charge-calc — shared charge-rate calculation engine

export * from './types.js';

export * from './calculate.js';

export * from './defaults.js';

export * from './billing.js';

export * from './utils.js';

export * from './awards/index.js';

export * from './boot/index.js';

export * from './sources.js';

export * from './resolvers/index.js';

export * from './rdo.js';

// Apprentice/trainee payroll tax RELIEF — typed exemption|rebate|none|unverified.
// Supersedes PAYROLL_TAX_EXEMPT_STATES / resolveEffectivePayrollTaxRate in
// defaults.ts, which modelled relief as a boolean and was wrong in every row.
export * from './payroll-tax-relief.js';

// apprentice_rate_configs percentage overlay — shared by crm7 and R80.3 so
// neither grows its own copy of "configRate = lowestAdult × wage_percentage,
// floored at the FWC rate" (lazy-hopping-nest plan, Amendment A.2).
