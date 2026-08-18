/**
 * Public resolver surface — composed by R80.3 + CRM7 wages/training-days
 * pickers. Each resolver takes a data-access adapter at construction time;
 * the adapter is the seam where Supabase / Fair Work / MAPD calls happen.
 */

export type {
  TrainingDaysDataAccess,
  TrainingDaysResolverOptions,
} from './training-days.js';
export { TrainingDaysResolver } from './training-days.js';

export type {
  WageDataAccess,
  WageResolverOptions,
} from './wage.js';
export { WageResolver } from './wage.js';

// Per-tenant superannuation / workers' compensation (estate ledger M-1).
// Reads the tenant_settings columns added by
// supabase/migrations/20260827010000_tenant_settings_oncost_config.sql.
export type {
  TenantOncostSettingsRow,
  OncostRateSource,
  ResolvedTenantOncosts,
  ResolveTenantOncostsInput,
} from './tenant-oncosts.js';
export { resolveTenantOncosts, applyTenantOncosts } from './tenant-oncosts.js';
