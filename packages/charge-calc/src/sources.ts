/**
 * Value-with-source architecture for charge-rate inputs.
 *
 * Per operator directive (R80.3#248, 2026-05-14): every numeric input the
 * calc engine consumes should be sourced from one of:
 *   - live API (Fair Work, MAPD, custom)
 *   - tenant preference (saved in tenant_settings)
 *   - placement record (calculated from the apprentice's actual placement)
 *   - trade average (per-tenant aggregate by trade code)
 *   - trade + apprentice-year average (per-tenant aggregate by trade + year)
 *   - host-employer agreed (locked in the placement contract)
 *   - manual entry (user types it in)
 *
 * The calc engine itself stays pure — it accepts resolved numbers. Resolvers
 * live in the consumer apps (R80.3, CRM7) and implement the host-side data
 * fetches. The operator's UI selects which source applies per parameter.
 */

import { z } from 'zod';

// ─── Source descriptors (discriminated union) ─────────────────────────

export const ManualSourceSchema = z.object({
  kind: z.literal('manual'),
  value: z.number(),
  note: z.string().optional(),
});

export const TenantPreferenceSourceSchema = z.object({
  kind: z.literal('tenant-preference'),
  preferenceKey: z.string(),
});

export const LiveApiSourceSchema = z.object({
  kind: z.literal('live-api'),
  api: z.enum(['fair-work', 'mapd', 'enterprise-agreement', 'custom']),
  /** API-specific lookup parameters (e.g. award code + classification) */
  params: z.record(z.string(), z.unknown()),
  /** Optional ISO date for as-of lookups (e.g. "what was the rate on 2026-04-01") */
  asOfDate: z.string().optional(),
});

export const PlacementDerivedSourceSchema = z.object({
  kind: z.literal('placement-derived'),
  placementId: z.uuid(),
  /** Which placement field to read (e.g. 'training_days_per_week', 'agreed_wage') */
  field: z.string(),
});

export const TradeAverageSourceSchema = z.object({
  kind: z.literal('trade-average'),
  tradeCode: z.string(),
  /** Optional tenant scoping — defaults to the caller's tenant */
  tenantId: z.uuid().optional(),
  /** Lookback window in months (default 12) */
  lookbackMonths: z.number().int().positive().optional(),
});

export const TradeYearAverageSourceSchema = z.object({
  kind: z.literal('trade-year-average'),
  tradeCode: z.string(),
  /** Apprentice year (1-indexed) — e.g. 1, 2, 3, 4 for a 4-year apprenticeship */
  apprenticeYear: z.number().int().min(1).max(8),
  tenantId: z.uuid().optional(),
  lookbackMonths: z.number().int().positive().optional(),
});

export const HostAgreedSourceSchema = z.object({
  kind: z.literal('host-agreed'),
  placementId: z.uuid(),
  /** Which agreement field to read (e.g. 'agreed_charge_rate', 'agreed_training_days') */
  field: z.string(),
});

export const ValueSourceSchema = z.discriminatedUnion('kind', [
  ManualSourceSchema,
  TenantPreferenceSourceSchema,
  LiveApiSourceSchema,
  PlacementDerivedSourceSchema,
  TradeAverageSourceSchema,
  TradeYearAverageSourceSchema,
  HostAgreedSourceSchema,
]);

export type ManualSource = z.infer<typeof ManualSourceSchema>;
export type TenantPreferenceSource = z.infer<typeof TenantPreferenceSourceSchema>;
export type LiveApiSource = z.infer<typeof LiveApiSourceSchema>;
export type PlacementDerivedSource = z.infer<typeof PlacementDerivedSourceSchema>;
export type TradeAverageSource = z.infer<typeof TradeAverageSourceSchema>;
export type TradeYearAverageSource = z.infer<typeof TradeYearAverageSourceSchema>;
export type HostAgreedSource = z.infer<typeof HostAgreedSourceSchema>;
export type ValueSource = z.infer<typeof ValueSourceSchema>;

// ─── Resolved value (what calculate() consumes) ───────────────────────

export interface ResolvedValue<T = number> {
  /** The resolved numeric value */
  value: T;
  /** The source descriptor that produced it */
  source: ValueSource;
  /** When the resolution happened */
  resolvedAt: Date;
  /** True if served from cache; false if a fresh fetch */
  fromCache: boolean;
  /** Human-readable explanation for audit trails (e.g. "MA000020 / EW Y3 / 2026-05-01") */
  trace: string;
  /** Optional warning surfaced to the UI (e.g. "rate is >90 days old") */
  warning?: string;
}

/**
 * Resolver contract. Implementations live in consumer apps (R80.3 / CRM7)
 * and wire to that app's Supabase client + Fair Work cache.
 *
 * The calc engine is unaware of resolvers — it takes resolved numbers.
 * UI components compose resolvers + the calc engine.
 */
export interface ValueResolver<T = number> {
  /** Resolve a single source descriptor to a concrete value */
  resolve(source: ValueSource): Promise<ResolvedValue<T>>;
  /** Optional: batch-resolve multiple sources in parallel */
  resolveMany?(sources: ValueSource[]): Promise<ResolvedValue<T>[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Type-guard helpers so consumer code can switch on source.kind without
 * importing the schemas.
 */
export const isManual = (s: ValueSource): s is ManualSource =>
  s.kind === 'manual';
export const isTenantPreference = (s: ValueSource): s is TenantPreferenceSource =>
  s.kind === 'tenant-preference';
export const isLiveApi = (s: ValueSource): s is LiveApiSource =>
  s.kind === 'live-api';
export const isPlacementDerived = (s: ValueSource): s is PlacementDerivedSource =>
  s.kind === 'placement-derived';
export const isTradeAverage = (s: ValueSource): s is TradeAverageSource =>
  s.kind === 'trade-average';
export const isTradeYearAverage = (s: ValueSource): s is TradeYearAverageSource =>
  s.kind === 'trade-year-average';
export const isHostAgreed = (s: ValueSource): s is HostAgreedSource =>
  s.kind === 'host-agreed';

/**
 * Wrap a manual value as a ResolvedValue without going through a resolver.
 * Useful for unit tests + the manual-entry UI path.
 */
export function manualValue(value: number, note?: string): ResolvedValue<number> {
  return {
    value,
    source: { kind: 'manual', value, note },
    resolvedAt: new Date(),
    fromCache: false,
    trace: note ? `manual: ${note}` : `manual: ${value}`,
  };
}

/**
 * Compose multiple resolvers into one — first non-null result wins.
 * Useful when an input has a fallback chain (e.g. "host-agreed THEN trade-average THEN tenant-preference").
 */
export function chainResolvers<T = number>(
  ...resolvers: ValueResolver<T>[]
): ValueResolver<T> {
  return {
    async resolve(source: ValueSource): Promise<ResolvedValue<T>> {
      let lastError: unknown = null;
      for (const r of resolvers) {
        try {
          return await r.resolve(source);
        } catch (e) {
          lastError = e;
        }
      }
      throw new Error(
        `chainResolvers: all ${resolvers.length} resolvers failed for source ${source.kind}: ${String(lastError)}`,
      );
    },
  };
}
