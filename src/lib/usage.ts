// Usage tracking for TikTok slideshow generations
// Credit-based system with Supabase backend + localStorage cache

import { getCredits, useCredit, CreditInfo, clearCreditsCache } from './credits';

const isBrowser = typeof window !== 'undefined';

type Plan = 'free' | 'pro' | 'creator';

interface UsageResult {
  generations: number;
  limit: number;
  remaining: number;
  purchased: number;
}

// Cache key for quick local reads
const CREDIT_CACHE_KEY = 'zerotask-credit-usage';

function getCachedUsage(): UsageResult {
  if (!isBrowser) return { generations: 0, limit: 30, remaining: 30, purchased: 0 };
  try {
    const raw = localStorage.getItem(CREDIT_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { generations: 0, limit: 30, remaining: 30, purchased: 0 };
}

function setCachedUsage(result: UsageResult) {
  if (isBrowser) {
    localStorage.setItem(CREDIT_CACHE_KEY, JSON.stringify(result));
  }
}

function creditInfoToUsage(info: CreditInfo): UsageResult {
  return {
    generations: info.used,
    limit: info.monthly + info.purchased,
    remaining: info.remaining,
    purchased: info.purchased,
  };
}

export function getLimit(plan: Plan): number {
  switch (plan) {
    case 'free': return 0;
    case 'pro': return 30;
    case 'creator': return 100;
    default: return 0;
  }
}

export function canGenerate(plan: Plan): boolean {
  if (plan === 'free') return false;
  const usage = getCachedUsage();
  return usage.remaining > 0;
}

export function getUsageToday(plan: Plan): UsageResult {
  if (plan === 'free') return { generations: 0, limit: 0, remaining: 0, purchased: 0 };
  return getCachedUsage();
}

export function incrementUsage(): UsageResult {
  const usage = getCachedUsage();
  const updated = {
    ...usage,
    generations: usage.generations + 1,
    remaining: Math.max(0, usage.remaining - 1),
  };
  setCachedUsage(updated);
  return updated;
}

// Async version that syncs with Supabase
export async function syncCredits(userId: string): Promise<UsageResult> {
  clearCreditsCache();
  const info = await getCredits(userId);
  const result = creditInfoToUsage(info);
  setCachedUsage(result);
  return result;
}

export async function useCreditAsync(userId: string): Promise<UsageResult> {
  const info = await useCredit(userId);
  const result = creditInfoToUsage(info);
  setCachedUsage(result);
  return result;
}
