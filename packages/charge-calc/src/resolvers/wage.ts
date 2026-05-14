/**
 * Wage resolver — pulls hourly wage from one of:
 *
 *   1. live-api (fair-work)        — Modern Award rate from Fair Work API (current or as-of date)
 *   2. live-api (enterprise-agreement) — EA rate from tenant's stored EA registry
 *   3. live-api (mapd)             — MAPD apprentice/trainee rate (federal AASS dataset)
 *   4. tenant-preference           — flat default for the GTO (e.g. paying above award)
 *   5. host-agreed                 — locked in the placement contract
 *   6. manual                      — user types it in
 *
 * Like training-days, the actual fetch logic lives in a `WageDataAccess`
 * adapter wired up by the consumer app (R80.3 already has fairWorkService.ts).
 */

import type {
  ValueResolver,
  ValueSource,
  ResolvedValue,
} from '../sources';

export interface WageDataAccess {
  /** Fetch a Modern Award classification rate from Fair Work */
  fromFairWork(params: {
    awardCode: string;
    classification: string;
    asOfDate?: string;
  }): Promise<{ rate: number; effectiveDate: string; sourceUrl?: string } | null>;

  /** Fetch a rate from a stored Enterprise Agreement */
  fromEnterpriseAgreement(params: {
    agreementId: string;
    classification: string;
    asOfDate?: string;
  }): Promise<{ rate: number; effectiveDate: string } | null>;

  /** Fetch a federal AASS / MAPD apprentice rate */
  fromMapd(params: {
    qualificationCode: string;
    apprenticeYear: number;
    asOfDate?: string;
  }): Promise<{ rate: number; effectiveDate: string } | null>;

  /** Read tenant preference */
  fromTenantPreference(preferenceKey: string): Promise<number | null>;

  /** Read agreed wage from placement contract */
  fromHostAgreement(placementId: string, field: string): Promise<number | null>;
}

export interface WageResolverOptions {
  cacheWithinRender?: boolean;
  /** Warn when fetched rate effective-date is older than this many days */
  staleAfterDays?: number;
}

export class WageResolver implements ValueResolver<number> {
  private cache = new Map<string, ResolvedValue<number>>();
  private cacheEnabled: boolean;
  private staleAfterDays: number;

  constructor(
    private readonly dataAccess: WageDataAccess,
    opts: WageResolverOptions = {},
  ) {
    this.cacheEnabled = opts.cacheWithinRender ?? true;
    this.staleAfterDays = opts.staleAfterDays ?? 90;
  }

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

  private staleWarning(effectiveDate: string): string | undefined {
    const effective = new Date(effectiveDate);
    const ageDays = Math.floor((Date.now() - effective.getTime()) / 86_400_000);
    if (ageDays > this.staleAfterDays) {
      return `rate is ${ageDays} days old (threshold ${this.staleAfterDays}d) — verify it hasn't been superseded by an annual review`;
    }
    return undefined;
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
            ? `manual: $${source.value.toFixed(2)}/hr — ${source.note}`
            : `manual: $${source.value.toFixed(2)}/hr`,
        };

      case 'live-api': {
        if (source.api === 'fair-work') {
          const awardCode = source.params['awardCode'] as string | undefined;
          const classification = source.params['classification'] as string | undefined;
          if (!awardCode || !classification) {
            throw new Error(
              `WageResolver.fair-work: missing required params { awardCode, classification }`,
            );
          }
          const result = await this.dataAccess.fromFairWork({
            awardCode,
            classification,
            asOfDate: source.asOfDate,
          });
          if (!result) {
            throw new Error(
              `WageResolver.fair-work: no rate for ${awardCode}/${classification}${source.asOfDate ? ` as-of ${source.asOfDate}` : ''}`,
            );
          }
          return {
            value: result.rate,
            source,
            resolvedAt,
            fromCache: false,
            trace: `fair-work(${awardCode}/${classification}) → $${result.rate.toFixed(2)}/hr (effective ${result.effectiveDate})`,
            warning: this.staleWarning(result.effectiveDate),
          };
        }

        if (source.api === 'enterprise-agreement') {
          const agreementId = source.params['agreementId'] as string | undefined;
          const classification = source.params['classification'] as string | undefined;
          if (!agreementId || !classification) {
            throw new Error(
              `WageResolver.enterprise-agreement: missing required params { agreementId, classification }`,
            );
          }
          const result = await this.dataAccess.fromEnterpriseAgreement({
            agreementId,
            classification,
            asOfDate: source.asOfDate,
          });
          if (!result) {
            throw new Error(
              `WageResolver.enterprise-agreement: no rate for ${agreementId}/${classification}`,
            );
          }
          return {
            value: result.rate,
            source,
            resolvedAt,
            fromCache: false,
            trace: `EA(${agreementId}/${classification}) → $${result.rate.toFixed(2)}/hr (effective ${result.effectiveDate})`,
            warning: this.staleWarning(result.effectiveDate),
          };
        }

        if (source.api === 'mapd') {
          const qualificationCode = source.params['qualificationCode'] as string | undefined;
          const apprenticeYear = source.params['apprenticeYear'] as number | undefined;
          if (!qualificationCode || !apprenticeYear) {
            throw new Error(
              `WageResolver.mapd: missing required params { qualificationCode, apprenticeYear }`,
            );
          }
          const result = await this.dataAccess.fromMapd({
            qualificationCode,
            apprenticeYear,
            asOfDate: source.asOfDate,
          });
          if (!result) {
            throw new Error(
              `WageResolver.mapd: no rate for ${qualificationCode} year ${apprenticeYear}`,
            );
          }
          return {
            value: result.rate,
            source,
            resolvedAt,
            fromCache: false,
            trace: `mapd(${qualificationCode}/Y${apprenticeYear}) → $${result.rate.toFixed(2)}/hr (effective ${result.effectiveDate})`,
            warning: this.staleWarning(result.effectiveDate),
          };
        }

        throw new Error(`WageResolver.live-api: unsupported api '${source.api}'`);
      }

      case 'tenant-preference': {
        const value = await this.dataAccess.fromTenantPreference(source.preferenceKey);
        if (value == null) {
          throw new Error(
            `WageResolver.tenant-preference: preference key '${source.preferenceKey}' not set`,
          );
        }
        return {
          value,
          source,
          resolvedAt,
          fromCache: false,
          trace: `tenant-pref(${source.preferenceKey}) → $${value.toFixed(2)}/hr`,
        };
      }

      case 'host-agreed': {
        const value = await this.dataAccess.fromHostAgreement(source.placementId, source.field);
        if (value == null) {
          throw new Error(
            `WageResolver.host-agreed: agreement field '${source.field}' missing for placement ${source.placementId}`,
          );
        }
        return {
          value,
          source,
          resolvedAt,
          fromCache: false,
          trace: `host-agreed(${source.placementId}, ${source.field}) → $${value.toFixed(2)}/hr`,
        };
      }

      case 'placement-derived':
      case 'trade-average':
      case 'trade-year-average':
        throw new Error(
          `WageResolver: source kind '${source.kind}' not applicable to wage (use live-api or host-agreed instead)`,
        );

      default: {
        const _exhaustive: never = source;
        throw new Error(
          `WageResolver: unhandled source kind: ${JSON.stringify(_exhaustive)}`,
        );
      }
    }
  }
}
