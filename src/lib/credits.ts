import { supabase } from './supabase';

const isBrowser = typeof window !== 'undefined';
const CACHE_KEY = 'zerotask-credits';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type Plan = 'free' | 'pro' | 'creator';

export interface CreditInfo {
  monthly: number;
  used: number;
  purchased: number;
  remaining: number;
  plan: string;
  billingCycleStart: string;
}

function getPlanAllocation(plan: Plan | string): number {
  switch (plan) {
    case 'creator': return 100;
    case 'pro': return 30;
    default: return 0;
  }
}

function cacheCredits(info: CreditInfo) {
  if (isBrowser) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...info, cachedAt: Date.now() }));
  }
}

function getCachedCredits(): CreditInfo | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache valid for 60 seconds
    if (Date.now() - parsed.cachedAt > 60000) return null;
    return parsed;
  } catch { return null; }
}

export function clearCreditsCache() {
  if (isBrowser) localStorage.removeItem(CACHE_KEY);
}

async function ensureCreditRow(userId: string, plan: Plan = 'pro'): Promise<void> {
  const { data } = await supabase.from('credits').select('id').eq('user_id', userId).single();
  if (!data) {
    await supabase.from('credits').insert({
      user_id: userId,
      plan,
      monthly_allocation: getPlanAllocation(plan),
      used_this_month: 0,
      purchased_credits: 0,
    });
  }
}

async function checkAndResetCycle(userId: string): Promise<boolean> {
  const { data } = await supabase.from('credits').select('*').eq('user_id', userId).single();
  if (!data) return false;

  const cycleStart = new Date(data.billing_cycle_start).getTime();
  if (Date.now() - cycleStart > THIRTY_DAYS_MS) {
    const allocation = getPlanAllocation(data.plan);
    await supabase.from('credits').update({
      used_this_month: 0,
      monthly_allocation: allocation,
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
    return true;
  }
  return false;
}

export async function getCredits(userId: string): Promise<CreditInfo> {
  // Try cache first
  const cached = getCachedCredits();
  if (cached) return cached;

  await ensureCreditRow(userId);
  await checkAndResetCycle(userId);

  const { data, error } = await supabase.from('credits').select('*').eq('user_id', userId).single();
  if (error || !data) {
    return { monthly: 30, used: 0, purchased: 0, remaining: 30, plan: 'pro', billingCycleStart: new Date().toISOString() };
  }

  const remaining = Math.max(0, (data.monthly_allocation - data.used_this_month) + data.purchased_credits);
  const info: CreditInfo = {
    monthly: data.monthly_allocation,
    used: data.used_this_month,
    purchased: data.purchased_credits,
    remaining,
    plan: data.plan,
    billingCycleStart: data.billing_cycle_start,
  };
  cacheCredits(info);
  return info;
}

export async function getCreditBalance(userId: string): Promise<number> {
  const info = await getCredits(userId);
  return info.remaining;
}

export async function useCredit(userId: string): Promise<CreditInfo> {
  clearCreditsCache();
  await ensureCreditRow(userId);
  await checkAndResetCycle(userId);

  const { data } = await supabase.from('credits').select('*').eq('user_id', userId).single();
  if (!data) throw new Error('Credit record not found');

  const remaining = (data.monthly_allocation - data.used_this_month) + data.purchased_credits;
  if (remaining <= 0) throw new Error('No credits remaining');

  // Deduct from monthly first, then purchased
  const monthlyRemaining = data.monthly_allocation - data.used_this_month;
  let newUsed = data.used_this_month;
  let newPurchased = data.purchased_credits;

  if (monthlyRemaining > 0) {
    newUsed = data.used_this_month + 1;
  } else {
    newPurchased = data.purchased_credits - 1;
  }

  await supabase.from('credits').update({
    used_this_month: newUsed,
    purchased_credits: newPurchased,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  const newRemaining = (data.monthly_allocation - newUsed) + newPurchased;
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'generation',
    amount: -1,
    balance_after: newRemaining,
    description: 'Slideshow generation',
  });

  const info: CreditInfo = {
    monthly: data.monthly_allocation,
    used: newUsed,
    purchased: newPurchased,
    remaining: newRemaining,
    plan: data.plan,
    billingCycleStart: data.billing_cycle_start,
  };
  cacheCredits(info);
  return info;
}

export async function purchaseCredits(userId: string, amount: number): Promise<CreditInfo> {
  clearCreditsCache();
  await ensureCreditRow(userId);

  const { data } = await supabase.from('credits').select('*').eq('user_id', userId).single();
  if (!data) throw new Error('Credit record not found');

  const newPurchased = data.purchased_credits + amount;
  await supabase.from('credits').update({
    purchased_credits: newPurchased,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  const newRemaining = (data.monthly_allocation - data.used_this_month) + newPurchased;
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'purchase',
    amount,
    balance_after: newRemaining,
    description: `Purchased ${amount} credits`,
  });

  const info: CreditInfo = {
    monthly: data.monthly_allocation,
    used: data.used_this_month,
    purchased: newPurchased,
    remaining: newRemaining,
    plan: data.plan,
    billingCycleStart: data.billing_cycle_start,
  };
  cacheCredits(info);
  return info;
}

export async function resetMonthlyCredits(userId: string, plan: Plan): Promise<CreditInfo> {
  clearCreditsCache();
  const allocation = getPlanAllocation(plan);

  await supabase.from('credits').upsert({
    user_id: userId,
    plan,
    monthly_allocation: allocation,
    used_this_month: 0,
    billing_cycle_start: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  const { data } = await supabase.from('credits').select('*').eq('user_id', userId).single();
  const purchased = data?.purchased_credits || 0;

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'monthly_reset',
    amount: allocation,
    balance_after: allocation + purchased,
    description: `Monthly reset: ${allocation} credits (${plan} plan)`,
  });

  const info: CreditInfo = {
    monthly: allocation,
    used: 0,
    purchased,
    remaining: allocation + purchased,
    plan,
    billingCycleStart: new Date().toISOString(),
  };
  cacheCredits(info);
  return info;
}
