/**
 * Rate limiting for API routes.
 *
 * Uses Upstash Redis in production (@upstash/ratelimit).
 * Falls back to in-memory Map for local development.
 *
 * Architecture:
 *   - Sliding window algorithm (smoothest UX, prevents boundary bursts)
 *   - Per-user rate limits (by user ID, not IP)
 *   - Tiered limits by plan (free < pro < creator)
 *   - Separate limits for AI, scraping, and read operations
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // timestamp in ms
}

// ── In-Memory Rate Limiter (Development) ────────────────────────
// Works for single-process dev server. NOT suitable for production
// on Vercel (each invocation is a separate process).

const memoryStore = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // Clean up expired entries every 60s

function inMemoryLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Periodically purge expired entries to prevent memory leak (#13 fix)
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = now;
    for (const [k, v] of memoryStore) {
      if (now > v.resetAt) memoryStore.delete(k);
    }
  }

  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  return { success: true, limit: maxRequests, remaining: maxRequests - entry.count, reset: entry.resetAt };
}

// ── Upstash Rate Limiter (Production) ───────────────────────────
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
// If not configured, falls back to in-memory.

let upstashAvailable: boolean | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RatelimitClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisClass: any = null;

async function tryLoadUpstash() {
  if (upstashAvailable !== null) return upstashAvailable;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    upstashAvailable = false;
    return false;
  }

  try {
    // Dynamic require — these packages are optional production dependencies.
    // Using require() instead of import() to avoid TypeScript module resolution errors
    // when the packages aren't installed (dev/preview environments).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RatelimitClass = require('@upstash/ratelimit').Ratelimit;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RedisClass = require('@upstash/redis').Redis;
    upstashAvailable = true;
    return true;
  } catch {
    // @upstash packages not installed — fall back to in-memory
    upstashAvailable = false;
    return false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const upstashLimiters = new Map<string, any>();

function getUpstashLimiter(prefix: string, maxRequests: number, windowSeconds: number) {
  const key = `${prefix}:${maxRequests}:${windowSeconds}`;
  if (upstashLimiters.has(key)) return upstashLimiters.get(key)!;

  if (!RatelimitClass || !RedisClass) throw new Error('Upstash not loaded');

  const redis = new RedisClass({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const limiter = new RatelimitClass({
    redis,
    limiter: RatelimitClass.slidingWindow(maxRequests, `${windowSeconds} s`),
    analytics: true,
    prefix: `ratelimit:${prefix}`,
  });

  upstashLimiters.set(key, limiter);
  return limiter;
}

// ── Public API ──────────────────────────────────────────────────

interface RateLimitConfig {
  prefix: string;
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Rate limit a request by user ID.
 * Tries Upstash first, falls back to in-memory.
 */
export async function rateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { prefix, maxRequests, windowSeconds } = config;
  const key = `${prefix}:${userId}`;

  const hasUpstash = await tryLoadUpstash();

  if (hasUpstash) {
    try {
      const limiter = getUpstashLimiter(prefix, maxRequests, windowSeconds);
      const result = await limiter.limit(userId);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (err) {
      console.warn('[rate-limit] Upstash error, falling back to in-memory:', err);
    }
  }

  // Fallback to in-memory
  return inMemoryLimit(key, maxRequests, windowSeconds * 1000);
}

// ── Preset Configurations ───────────────────────────────────────

export type PlanTier = 'free' | 'pro' | 'creator';

/**
 * AI generation rate limits (per minute).
 */
export function getAiRateLimit(plan: PlanTier): RateLimitConfig {
  const limits: Record<PlanTier, number> = {
    free: 3,      // 3 req/min (generous for lifetime credits)
    pro: 10,      // 10 req/min
    creator: 20,  // 20 req/min
  };
  return { prefix: 'ai', maxRequests: limits[plan] || 3, windowSeconds: 60 };
}

/**
 * Scraping rate limits (per minute).
 */
export function getScrapeRateLimit(plan: PlanTier): RateLimitConfig {
  const limits: Record<PlanTier, number> = {
    free: 5,
    pro: 10,
    creator: 20,
  };
  return { prefix: 'scrape', maxRequests: limits[plan] || 5, windowSeconds: 60 };
}

/**
 * Image generation rate limits (per minute).
 */
export function getImageRateLimit(plan: PlanTier): RateLimitConfig {
  const limits: Record<PlanTier, number> = {
    free: 2,
    pro: 5,
    creator: 10,
  };
  return { prefix: 'image', maxRequests: limits[plan] || 2, windowSeconds: 60 };
}

/**
 * General read operation rate limits (per minute).
 */
export function getReadRateLimit(): RateLimitConfig {
  return { prefix: 'read', maxRequests: 60, windowSeconds: 60 };
}

/**
 * Build rate limit response headers.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    'Retry-After': String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
  };
}
