/**
 * Server-side credit enforcement for API routes.
 *
 * This module provides atomic credit deduction using Supabase service role key
 * to bypass RLS. It is the ONLY enforcement mechanism — client-side checks
 * in usage.ts are for UX only and are bypassable.
 *
 * Architecture:
 *   Layer 1: Rate Limiting (handled by rate-limit.ts)
 *   Layer 2: Credit Check + Atomic Deduction (THIS FILE)
 *   Layer 3: Soft Enforcement (bonus credit logic)
 *   Layer 4: Client UX (sidebar badge, toasts — handled client-side)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Singleton service client (#5 fix) ────────────────────────────
// Reuse a single client instead of creating one per function call.
let _serviceClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _serviceClient;
}

type Plan = 'free' | 'pro' | 'creator';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FREE_LIFETIME_CREDITS = 3;
const MAX_DEDUCT_RETRIES = 2;

export interface ServerCreditInfo {
  monthly: number;
  used: number;
  purchased: number;
  remaining: number;
  plan: string;
  billingCycleStart: string;
  bonusCreditUsed: boolean;
}

function getPlanAllocation(plan: Plan | string): number {
  switch (plan) {
    case 'creator': return 100;
    case 'pro': return 30;
    default: return 0; // Free users get lifetime credits via purchased_credits
  }
}

/**
 * Ensures a credit row exists for the user.
 * Uses upsert to prevent race condition when two concurrent requests
 * both try to create a row for the same new user (#4 fix).
 */
async function ensureCreditRow(userId: string): Promise<void> {
  const supabase = getServiceClient();
  const { data } = await supabase.from('credits').select('id').eq('user_id', userId).single();

  if (!data) {
    // New user — upsert to handle concurrent first-requests safely
    const { error } = await supabase.from('credits').upsert(
      {
        user_id: userId,
        plan: 'free',
        monthly_allocation: 0,
        used_this_month: 0,
        purchased_credits: FREE_LIFETIME_CREDITS,
        bonus_credit_used: false,
        billing_cycle_start: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

    // Only log welcome credits if we actually inserted (not a duplicate)
    if (!error) {
      // Check if this was a fresh insert by seeing if purchased_credits matches
      // what we just set (another concurrent request might have already inserted)
      const { data: freshRow } = await supabase
        .from('credits')
        .select('purchased_credits, created_at')
        .eq('user_id', userId)
        .single();

      // Only log if the row was just created (within last 2 seconds)
      const createdAt = freshRow?.created_at ? new Date(freshRow.created_at).getTime() : 0;
      if (Date.now() - createdAt < 2000) {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          type: 'welcome',
          amount: FREE_LIFETIME_CREDITS,
          balance_after: FREE_LIFETIME_CREDITS,
          description: `Welcome! ${FREE_LIFETIME_CREDITS} free credits to get started`,
        });
      }
    }
  }
}

/**
 * Check if the billing cycle needs resetting.
 * Uses Stripe's current_period_end if available, otherwise 30-day rolling.
 */
async function checkAndResetCycle(userId: string): Promise<void> {
  const supabase = getServiceClient();
  const { data } = await supabase.from('credits').select('*').eq('user_id', userId).single();
  if (!data) return;

  // Try to get Stripe billing period end
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  let shouldReset = false;

  if (subData?.current_period_end) {
    // Stripe-aligned: reset if we're past the billing period end
    const periodEnd = new Date(subData.current_period_end).getTime();
    if (Date.now() > periodEnd) {
      shouldReset = true;
    }
  } else {
    // Fallback: 30-day rolling window
    const cycleStart = new Date(data.billing_cycle_start).getTime();
    if (Date.now() - cycleStart > THIRTY_DAYS_MS) {
      shouldReset = true;
    }
  }

  if (shouldReset) {
    const allocation = getPlanAllocation(data.plan);
    await supabase.from('credits').update({
      used_this_month: 0,
      monthly_allocation: allocation,
      bonus_credit_used: false, // Reset bonus credit each cycle
      billing_cycle_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      type: 'monthly_reset',
      amount: allocation,
      balance_after: allocation + (data.purchased_credits || 0),
      description: `Monthly reset: ${allocation} credits (${data.plan} plan)`,
    });
  }
}

/**
 * Get current credit balance (server-side, no caching).
 */
export async function getServerCredits(userId: string): Promise<ServerCreditInfo> {
  await ensureCreditRow(userId);
  await checkAndResetCycle(userId);

  const supabase = getServiceClient();
  const { data, error } = await supabase.from('credits').select('*').eq('user_id', userId).single();

  if (error || !data) {
    return {
      monthly: 0,
      used: 0,
      purchased: FREE_LIFETIME_CREDITS,
      remaining: FREE_LIFETIME_CREDITS,
      plan: 'free',
      billingCycleStart: new Date().toISOString(),
      bonusCreditUsed: false,
    };
  }

  const remaining = Math.max(0, (data.monthly_allocation - data.used_this_month) + data.purchased_credits);
  return {
    monthly: data.monthly_allocation,
    used: data.used_this_month,
    purchased: data.purchased_credits,
    remaining,
    plan: data.plan,
    billingCycleStart: data.billing_cycle_start,
    bonusCreditUsed: data.bonus_credit_used ?? false,
  };
}

/**
 * Deduct one credit atomically. Returns updated credit info.
 *
 * Deduction priority:
 *   1. Monthly allocation credits (use first)
 *   2. Purchased credits (never expire, use second)
 *   3. Bonus credit (one free generation per cycle when at 0)
 *
 * Throws CreditExhaustedError if truly no credits remain.
 *
 * Uses optimistic locking: the update includes WHERE conditions that match
 * the values we read. If another request changed them, zero rows are updated
 * and we retry (up to MAX_DEDUCT_RETRIES times).
 */
export async function deductCredit(
  userId: string,
  description: string = 'AI generation',
  _retryCount: number = 0
): Promise<ServerCreditInfo> {
  if (_retryCount > MAX_DEDUCT_RETRIES) {
    throw new Error('Credit deduction failed after retries — high contention');
  }

  await ensureCreditRow(userId);
  await checkAndResetCycle(userId);

  const supabase = getServiceClient();

  // Read current state
  const { data, error: readErr } = await supabase
    .from('credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (readErr || !data) {
    throw new Error('Credit record not found');
  }

  const monthlyRemaining = data.monthly_allocation - data.used_this_month;
  const totalRemaining = monthlyRemaining + data.purchased_credits;

  // Determine deduction source
  let newUsed = data.used_this_month;
  let newPurchased = data.purchased_credits;
  let deductionSource: string;

  if (totalRemaining > 0) {
    // Normal deduction
    if (monthlyRemaining > 0) {
      newUsed = data.used_this_month + 1;
      deductionSource = 'monthly';
    } else {
      newPurchased = data.purchased_credits - 1;
      deductionSource = 'purchased';
    }
  } else if (!data.bonus_credit_used) {
    // Bonus credit: one free generation per cycle when at 0
    deductionSource = 'bonus';
    // Don't deduct anything, just mark bonus as used
  } else {
    // Truly out of credits
    throw new CreditExhaustedError(data.plan, data.billing_cycle_start);
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    used_this_month: newUsed,
    purchased_credits: newPurchased,
    updated_at: new Date().toISOString(),
  };

  if (deductionSource === 'bonus') {
    updatePayload.bonus_credit_used = true;
  }

  // Optimistic locking: WHERE conditions ensure no one else changed the values.
  // Use .select() to get the result back so we can check if any rows matched.
  const { data: updated, error: updateErr } = await supabase
    .from('credits')
    .update(updatePayload)
    .eq('user_id', userId)
    .eq('used_this_month', data.used_this_month)     // Optimistic lock
    .eq('purchased_credits', data.purchased_credits)  // Optimistic lock
    .select('id');

  if (updateErr) {
    throw new Error(`Credit update failed: ${updateErr.message}`);
  }

  // #1 fix: Check row count, not just error. If 0 rows matched,
  // another request changed the values — retry.
  if (!updated || updated.length === 0) {
    return deductCredit(userId, description, _retryCount + 1);
  }

  const newRemaining = Math.max(0, (data.monthly_allocation - newUsed) + newPurchased);

  // Log transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'generation',
    amount: deductionSource === 'bonus' ? 0 : -1,
    balance_after: newRemaining,
    description: deductionSource === 'bonus'
      ? `${description} (bonus credit - this one's on us!)`
      : `${description} (${deductionSource} credit)`,
  });

  return {
    monthly: data.monthly_allocation,
    used: newUsed,
    purchased: newPurchased,
    remaining: newRemaining,
    plan: data.plan,
    billingCycleStart: data.billing_cycle_start,
    bonusCreditUsed: deductionSource === 'bonus' ? true : (data.bonus_credit_used ?? false),
  };
}

/**
 * Custom error for credit exhaustion — includes upgrade info.
 */
export class CreditExhaustedError extends Error {
  public plan: string;
  public billingCycleStart: string;
  public nextReset: string;

  constructor(plan: string, billingCycleStart: string) {
    const nextReset = new Date(new Date(billingCycleStart).getTime() + THIRTY_DAYS_MS);
    super(`No credits remaining. Credits reset on ${nextReset.toLocaleDateString()}`);
    this.name = 'CreditExhaustedError';
    this.plan = plan;
    this.billingCycleStart = billingCycleStart;
    this.nextReset = nextReset.toISOString();
  }
}

/**
 * Get credit warning level for a user.
 * Returns null if no warning, or the threshold level.
 *
 * #6 fix: Handles free users (monthly === 0) and users with only
 * purchased credits by calculating based on remaining vs total pool.
 */
export function getCreditWarningLevel(credits: ServerCreditInfo): 'low' | 'critical' | 'depleted' | null {
  const total = credits.monthly + credits.purchased;
  if (total === 0) return credits.remaining === 0 ? 'depleted' : null;

  // Check depleted first (works for all plan types)
  if (credits.remaining === 0) return 'depleted';

  // For users with monthly credits, use usage-based percentage
  if (credits.monthly > 0) {
    const usagePercent = (credits.used / credits.monthly) * 100;
    if (usagePercent >= 90) return 'critical';
    if (usagePercent >= 75) return 'low';
    return null;
  }

  // For users with only purchased credits (free plan, or pro with monthly exhausted)
  // Use remaining-based thresholds
  const remainingPercent = (credits.remaining / total) * 100;
  if (remainingPercent <= 10) return 'critical';
  if (remainingPercent <= 25) return 'low';

  return null;
}
