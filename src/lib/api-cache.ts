/**
 * Simple in-memory cache with TTL for API route responses.
 * Avoids repeated external API calls (iTunes, App Store Connect) within a TTL window.
 *
 * TTL tiers:
 *   REALTIME = 0        — no cache (credits, auth)
 *   SHORT    = 60s      — feed events, dashboard aggregations
 *   MEDIUM   = 1 hour   — keyword suggestions, competitor search
 *   LONG     = 24 hours — review scraping, app metadata
 */

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Periodic cleanup to prevent memory leaks (same pattern as rate-limit.ts)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 120_000; // 2 minutes

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  }
}

export function getCached<T>(key: string): T | null {
  maybeCleanup();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  if (ttlMs <= 0) return; // Don't cache realtime data
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(keyPrefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}

// Named TTL constants for consistency across routes
export const CacheTTL = {
  SHORT: 60_000,        // 1 minute
  MEDIUM: 3_600_000,    // 1 hour
  LONG: 86_400_000,     // 24 hours
} as const;
