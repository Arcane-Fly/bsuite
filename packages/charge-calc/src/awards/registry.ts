/**
 * API-backed Award Registry
 *
 * In-memory cache of assembled AwardSchema objects. The registry starts
 * empty and is populated by calling `loadAwardFromMAPD()` or
 * `registerAward()`. Calling code (R80.3, CRM7, edge functions) is
 * responsible for fetching and caching.
 */
import type { AwardSchema, AwardSupplement } from './schema.js';
import { AwardSchemaZ } from './schema.js';
import type { MAPDDataSource } from './mapd-client.js';
import { fetchCompleteAward } from './mapd-client.js';
import type { ZodError } from 'zod';

/** In-memory cache of assembled award schemas */
const awardCache = new Map<string, { award: AwardSchema; fetchedAt: Date }>();

/** Register a pre-assembled award (e.g., from Supabase cache or MAPD fetch) */
export function registerAward(award: AwardSchema): void {
  awardCache.set(award.code, { award, fetchedAt: new Date() });
}

/** Get a cached award by code. Returns undefined if not cached. */
export function getAward(code: string): AwardSchema | undefined {
  return awardCache.get(code)?.award;
}

/** List all cached award codes */
export function listAwards(): string[] {
  return Array.from(awardCache.keys());
}

/** Validate raw data against AwardSchemaZ */
export function validateAward(data: unknown): { success: boolean; errors?: ZodError } {
  const result = AwardSchemaZ.safeParse(data);
  if (result.success) return { success: true };
  return { success: false, errors: result.error };
}

/** Clear the cache (for testing) */
export function clearAwardCache(): void {
  awardCache.clear();
}

/**
 * Load an award from a MAPD data source into the registry.
 * Fetches all components, maps them, validates, and caches the result.
 */
export async function loadAwardFromMAPD(
  source: MAPDDataSource,
  awardCode: string,
  supplement?: Partial<AwardSupplement>,
): Promise<AwardSchema | null> {
  const award = await fetchCompleteAward(source, awardCode, supplement);
  if (!award) return null;
  registerAward(award);
  return award;
}
