/**
 * Edge-compatible rate limiter for AI endpoints
 *
 * Uses an in-memory sliding window per user ID.
 * Limits are sourced from AI_CONFIG.rateLimits.
 *
 * Note: In-memory state resets on cold starts. For production
 * persistence, swap the Map for Upstash Redis or Supabase.
 */

import { AI_CONFIG } from './config';

interface RateLimitEntry {
  timestamps: number[];
  dailyCount: number;
  dailyResetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function now(): number {
  return Date.now();
}

function cleanOldTimestamps(entry: RateLimitEntry): void {
  const oneMinuteAgo = now() - 60_000;
  entry.timestamps = entry.timestamps.filter((t) => t > oneMinuteAgo);
}

function resetDailyIfNeeded(entry: RateLimitEntry): void {
  if (now() > entry.dailyResetAt) {
    entry.dailyCount = 0;
    entry.dailyResetAt = now() + 86_400_000; // 24 hours
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  reason?: string;
}

/**
 * Check and consume a rate limit token for the given user.
 * Returns whether the request is allowed.
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const { maxRequestsPerMinute, maxRequestsPerDay } = AI_CONFIG.rateLimits;

  let entry = store.get(userId);
  if (!entry) {
    entry = {
      timestamps: [],
      dailyCount: 0,
      dailyResetAt: now() + 86_400_000,
    };
    store.set(userId, entry);
  }

  resetDailyIfNeeded(entry);
  cleanOldTimestamps(entry);

  // Check daily limit
  if (entry.dailyCount >= maxRequestsPerDay) {
    const retryAfterMs = entry.dailyResetAt - now();
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
      reason: `Daily limit of ${maxRequestsPerDay} requests exceeded`,
    };
  }

  // Check per-minute limit
  if (entry.timestamps.length >= maxRequestsPerMinute) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + 60_000 - now();
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
      reason: `Rate limit of ${maxRequestsPerMinute} requests/minute exceeded`,
    };
  }

  // Allowed — consume a token
  entry.timestamps.push(now());
  entry.dailyCount += 1;

  return {
    allowed: true,
    remaining: maxRequestsPerMinute - entry.timestamps.length,
  };
}
