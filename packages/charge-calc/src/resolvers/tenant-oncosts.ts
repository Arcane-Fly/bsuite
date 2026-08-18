/**
 * Per-tenant on-cost resolution — superannuation and workers' compensation.
 *
 * Estate ledger M-1. Live measurement 2026-08-18 against the production
 * project: `charge_rate_snapshots` holds 13 snapshots with exactly ONE
 * distinct `super_rate` and ONE distinct `workers_comp_rate` between them.
 * Every quote in the estate carried the same two platform constants —
 * `DEFAULT_CONFIG.superRate` (0.12) and `DEFAULT_WC_RATE` (0.047) — because
 * no tenant-level on-cost column existed anywhere in `public`. Migration
 * `20260827010000_tenant_settings_oncost_config.sql` adds
 * `tenant_settings.super_rate / wc_rate / wic_code`; this module is the
 * reader, shared so crm7 and R80.4 cannot grow two disagreeing copies of it
 * the way `HARDCODED_PAYROLL_TAX_RATES` and `PAYROLL_TAX_RATES` once did.
 *
 * WHAT IT DELIBERATELY DOES NOT DO.
 *
 * 1. Payroll tax. Already state-resolved and snapshot-carried on both live
 *    quote paths, and apprentice/trainee RELIEF is a legislative rule about
 *    the EMPLOYEE, not a tenant preference. `payroll-tax-relief.ts` carries a
 *    precedence guard saying so in as many words: the relief check must stay
 *    the last word on the value handed to the calculator, and a tenant-scoped
 *    source must never be able to bypass it. So there is no `payrollTaxRate`
 *    in or out of this module.
 *
 * 2. Guess. A tenant with nothing configured gets the platform default AND a
 *    `fallbacks` entry naming what was missing. The number and the fact that
 *    it is not the tenant's own number travel together, so a UI can say
 *    "platform default" instead of presenting a constant as a negotiated rate.
 */
import type { CalcConfig } from '../types.js';
import { DEFAULT_CONFIG, deriveOtOncostFactor } from '../defaults.js';

/**
 * The three on-cost columns of `public.tenant_settings`, exactly as
 * PostgREST returns them. `numeric` arrives as a STRING from PostgREST when
 * it exceeds JS-safe precision and as a number otherwise, so both are
 * accepted and normalised — a `numeric` silently read as `"0.12"` and then
 * multiplied is how a rate becomes `NaN`.
 */
export interface TenantOncostSettingsRow {
  super_rate?: number | string | null;
  wc_rate?: number | string | null;
  wic_code?: string | null;
}

/** Where a resolved rate actually came from. */
export type OncostRateSource = 'tenant-setting' | 'wic-lookup' | 'platform-default';

export interface ResolvedTenantOncosts {
  /** Superannuation guarantee rate as a fraction (0.12 = 12%). */
  superRate: number;
  /** Workers' compensation premium rate as a fraction (0.047 = 4.7%). */
  wcRate: number;
  superRateSource: OncostRateSource;
  wcRateSource: OncostRateSource;
  /**
   * One human-readable line per value that did NOT come from the tenant's own
   * configuration. Empty when both rates are the tenant's own. Surface these;
   * do not swallow them.
   */
  fallbacks: string[];
}

export interface ResolveTenantOncostsInput {
  /** The tenant's `tenant_settings` row, or null/undefined when it has none. */
  settings?: TenantOncostSettingsRow | null;
  /**
   * `premium_rate` from `public.wic_rate_lookup` for this tenant's `wic_code`
   * and state, if the caller fetched it. A fraction, like the columns.
   * Consulted only when `settings.wc_rate` is not set — an explicitly
   * negotiated premium beats a scheme lookup.
   */
  wicPremiumRate?: number | string | null;
  /**
   * Platform fallbacks. Defaults to `DEFAULT_CONFIG`'s, which is the point of
   * the item: those constants stay the floor, they just stop being the only
   * thing a quote can carry.
   */
  defaults?: { superRate: number; wcRate: number };
}

/**
 * Normalises a PostgREST numeric to a rate fraction, or returns null when the
 * value is absent or not usable as a rate.
 *
 * REFUSES rather than coerces: `null`, `''`, `NaN`, negative, and anything
 * above 1 all return null. Above 1 is the percent-pasted-into-a-fraction
 * mistake (12 meaning 12%), which would multiply a tenant's super bill by a
 * hundred. The DB has a CHECK constraint for the same reason; this is the
 * second line, for values that reach the calculator by some other path.
 */
function toRateFraction(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return n;
}

/**
 * Resolves a tenant's superannuation and workers' compensation rates.
 *
 * Precedence for workers' comp: explicit `tenant_settings.wc_rate` >
 * `wic_rate_lookup.premium_rate` for the tenant's `wic_code` > platform
 * default. Superannuation has no lookup tier — it is either the tenant's
 * configured rate or the platform default.
 */
export function resolveTenantOncosts(
  input: ResolveTenantOncostsInput = {},
): ResolvedTenantOncosts {
  const defaults = input.defaults ?? {
    superRate: DEFAULT_CONFIG.superRate,
    wcRate: DEFAULT_CONFIG.wcRate,
  };
  const settings = input.settings ?? null;
  const fallbacks: string[] = [];

  const tenantSuper = toRateFraction(settings?.super_rate);
  let superRate: number;
  let superRateSource: OncostRateSource;
  if (tenantSuper === null) {
    superRate = defaults.superRate;
    superRateSource = 'platform-default';
    fallbacks.push(
      `Superannuation: no tenant rate configured (tenant_settings.super_rate) — ` +
        `using the platform default of ${(defaults.superRate * 100).toFixed(2)}%.`,
    );
  } else {
    superRate = tenantSuper;
    superRateSource = 'tenant-setting';
  }

  const tenantWc = toRateFraction(settings?.wc_rate);
  const wicRate = toRateFraction(input.wicPremiumRate);
  let wcRate: number;
  let wcRateSource: OncostRateSource;
  if (tenantWc !== null) {
    wcRate = tenantWc;
    wcRateSource = 'tenant-setting';
  } else if (wicRate !== null) {
    wcRate = wicRate;
    wcRateSource = 'wic-lookup';
  } else {
    wcRate = defaults.wcRate;
    wcRateSource = 'platform-default';
    const hasCode = typeof settings?.wic_code === 'string' && settings.wic_code.trim() !== '';
    fallbacks.push(
      hasCode
        ? `Workers' compensation: WIC code ${settings?.wic_code?.trim()} is set but no ` +
            `premium rate was found for it — using the platform default of ` +
            `${(defaults.wcRate * 100).toFixed(2)}%.`
        : `Workers' compensation: no tenant rate or WIC code configured ` +
            `(tenant_settings.wc_rate / wic_code) — using the platform default of ` +
            `${(defaults.wcRate * 100).toFixed(2)}%.`,
    );
  }

  return { superRate, wcRate, superRateSource, wcRateSource, fallbacks };
}

/**
 * Applies resolved on-costs to a `CalcConfig`, returning a new config.
 *
 * `otOncostFactor` IS RECOMPUTED, and that is the whole reason this is a
 * function rather than a spread at the call site. `defaults.ts` says it
 * outright: "Exported so a caller that overrides `wcRate` or `payrollTaxRate`
 * can recompute a consistent overtime factor rather than leaving a stale one
 * behind." Setting `wcRate` on its own leaves the overtime oncost factor at
 * the platform figure, so a tenant on a 9% premium would still have overtime
 * priced at the sector-average 4.7% — the tenant rate would move ordinary
 * time and silently not move overtime. `payrollTaxRate` is read from `cfg`
 * unchanged, because payroll tax is not a tenant preference (see the module
 * doc comment).
 */
export function applyTenantOncosts(
  cfg: CalcConfig,
  oncosts: Pick<ResolvedTenantOncosts, 'superRate' | 'wcRate'>,
): CalcConfig {
  return {
    ...cfg,
    superRate: oncosts.superRate,
    wcRate: oncosts.wcRate,
    otOncostFactor: deriveOtOncostFactor({
      wcRate: oncosts.wcRate,
      payrollTaxRate: cfg.payrollTaxRate,
    }),
  };
}
