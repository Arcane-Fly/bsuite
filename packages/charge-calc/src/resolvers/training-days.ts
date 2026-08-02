/**
 * Training-days resolver — implements the 5 source modes the operator named
 * (R80.3#248, 2026-05-14):
 *
 *   1. placement-derived  — read from the apprentice's placement record
 *   2. trade-average      — average across the GTO's apprentices in the same trade
 *   3. trade-year-average — average for trade + apprentice year
 *   4. flat-preference    — manual user preference (saved on tenant or per-user)
 *   5. host-agreed        — locked in the placement contract with the host
 *
 * The resolver is tenant-aware. It expects a `dataAccess` adapter passed at
 * construction time so the calc package stays Supabase-client-agnostic
 * (R80.3 + CRM7 each pass their own adapter wired to their supabase client).
 */

import type {
  ValueResolver,
  ValueSource,
  ResolvedValue,
} from '../sources.js';

/**
 * Adapter the resolver calls into. Implement in R80.3 + CRM7 against
 * the local supabase client. All methods return training-days-per-week (number).
 */
export interface TrainingDaysDataAccess {
  /** Read training_days_per_week from the placement record */
  fromPlacement(placementId: string): Promise<number | null>;
  /** Average training_days_per_week across all active placements with this trade */
  fromTradeAverage(
    tradeCode: string,
    opts: { tenantId?: string; lookbackMonths?: number },
  ): Promise<number | null>;
  /** Average training_days_per_week for trade + apprentice year */
  fromTradeYearAverage(
    tradeCode: string,
    apprenticeYear: number,
    opts: { tenantId?: string; lookbackMonths?: number },
  ): Promise<number | null>;
  /** Read tenant preference (flat default for the GTO) */
  fromTenantPreference(preferenceKey: string): Promise<number | null>;
  /** Read agreed value from the host-employer placement agreement */
  fromHostAgreement(
    placementId: string,
    field: string,
  ): Promise<number | null>;
}

export interface TrainingDaysResolverOptions {
  /** Cache responses in-memory for the duration of one calc render (default: true) */
  cacheWithinRender?: boolean;
}

export class TrainingDaysResolver implements ValueResolver<number> {
  private cache = new Map<string, ResolvedValue<number>>();
  private cacheEnabled: boolean;

  constructor(
    private readonly dataAccess: TrainingDaysDataAccess,
    opts: TrainingDaysResolverOptions = {},
  ) {
    this.cacheEnabled = opts.cacheWithinRender ?? true;
  }

  /** Clear cache — call between calc renders if data may have changed */
  resetCache(): void {
    this.cache.clear();
  }

  async resolve(source: ValueSource): Promise<ResolvedValue<number>> {
    const cacheKey = JSON.stringify(source);
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) return { ...cached, fromCache: true };
    }

    const resolved = await this.resolveUncached(source);
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, resolved);
    }
    return resolved;
  }

  private async resolveUncached(source: ValueSource): Promise<ResolvedValue<number>> {
    const resolvedAt = new Date();

    switch (source.kind) {
      case 'manual':
        return {
          value: source.value,
          source,
          resolvedAt,
          fromCache: false,
          trace: source.note
            ? `manual: ${source.value} days/wk — ${source.note}`
            : `manual: ${source.value} days/wk`,
        };

      case 'placement-derived': {
        const value = await this.dataAccess.fromPlacement(source.placementId);
        if (value == null) {
          throw new Error(
            `TrainingDaysResolver.placement-derived: placement ${source.placementId} has no training_days value`,
          );
        }
        return {
          value,
          source,
          resolvedAt,
          fromCache: false,
          trace: `placement ${source.placementId} → ${value} days/wk`,
        };
      }

      case 'trade-average': {
        const value = await this.dataAccess.fromTradeAverage(source.tradeCode, {
          tenantId: source.tenantId,
          lookbackMonths: source.lookbackMonths,
        });
        if (value == null) {
          throw new Error(
            `TrainingDaysResolver.trade-average: no data for trade ${source.tradeCode} (lookback ${source.lookbackMonths ?? 12}mo)`,
          );
        }
        const lookback = source.lookbackMonths ?? 12;
        return {
          value,
          source,
          resolvedAt,
          fromCache: false,
          trace: `trade-avg(${source.tradeCode}, ${lookback}mo) → ${value.toFixed(2)} days/wk`,
          warning:
            value < 0.5 || value > 5
              ? `unusual training-days value ${value.toFixed(2)} — verify trade data`
              : undefined,
        };
      }

      case 'trade-year-average': {
        const value = await this.dataAccess.fromTradeYearAverage(
          source.tradeCode,
          source.apprenticeYear,
          {
            tenantId: source.tenantId,
            lookbackMonths: source.lookbackMonths,
          },
        );
        if (value == null) {
          throw new Error(
            `TrainingDaysResolver.trade-year-average: no data for trade ${source.tradeCode} year ${source.apprenticeYear}`,
          );
        }
        const lookback = source.lookbackMonths ?? 12;
        return {
          value,
          source,
          resolvedAt,
          fromCache: false,
          trace: `trade-year-avg(${source.tradeCode}, Y${source.apprenticeYear}, ${lookback}mo) → ${value.toFixed(2)} days/wk`,
        };
      }

      case 'tenant-preference': {
        const value = await this.dataAccess.fromTenantPreference(source.preferenceKey);
        if (value == null) {
          throw new Error(
            `TrainingDaysResolver.tenant-preference: preference key '${source.preferenceKey}' not set on tenant`,
          );
        }
        return {
          value,
          source,
          resolvedAt,
          fromCache: false,
          trace: `tenant-pref(${source.preferenceKey}) → ${value} days/wk`,
        };
      }

      case 'host-agreed': {
        const value = await this.dataAccess.fromHostAgreement(
          source.placementId,
          source.field,
        );
        if (value == null) {
          throw new Error(
            `TrainingDaysResolver.host-agreed: agreement field '${source.field}' missing for placement ${source.placementId}`,
          );
        }
        return {
          value,
          source,
          resolvedAt,
          fromCache: false,
          trace: `host-agreed(${source.placementId}, ${source.field}) → ${value} days/wk`,
        };
      }

      case 'live-api':
        throw new Error(
          `TrainingDaysResolver: live-api source not applicable to training-days (use placement-derived or trade-average instead)`,
        );

      default: {
        // Exhaustiveness check — TS will error here if a new kind is added without a case.
        const _exhaustive: never = source;
        throw new Error(
          `TrainingDaysResolver: unhandled source kind: ${JSON.stringify(_exhaustive)}`,
        );
      }
    }
  }
}
