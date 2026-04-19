/**
 * BSuite subscription tier taxonomy.
 *
 * Single source of truth for tier ranking + gating logic. Apps that need
 * to show/hide UI based on the user's tier should consume `tierSatisfies`
 * rather than comparing tier strings directly.
 *
 * Ranks:
 *   free        — 0  — unauthenticated or trial-only
 *   individual  — 1  — solo professional
 *   team        — 2  — multiple users, one org
 *   enterprise  — 3  — multi-org, custom integrations
 *   developer   — 100 — platform-level, bypasses all paid gates
 */

export type Tier = 'free' | 'individual' | 'team' | 'enterprise' | 'developer';

const TIER_RANK: Record<Tier, number> = {
  free: 0,
  individual: 1,
  team: 2,
  enterprise: 3,
  developer: 100,
};

/**
 * Returns true if `actual` meets or exceeds `required`.
 *
 * @example
 *   tierSatisfies('team', 'individual')  // true
 *   tierSatisfies('individual', 'team')  // false
 *   tierSatisfies('developer', 'enterprise') // true
 */
export function tierSatisfies(actual: Tier, required: Tier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required];
}

/** Returns the numeric rank for a tier — useful for custom comparisons. */
export function tierRank(tier: Tier): number {
  return TIER_RANK[tier];
}
