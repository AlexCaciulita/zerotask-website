'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './auth';

interface SubscriptionState {
  plan: 'free' | 'pro' | 'creator';
  status: 'active' | 'canceled' | 'past_due' | 'none';
  stripeCustomerId: string | null;
  expiresAt: string | null;
}

interface SubscriptionContextType extends SubscriptionState {
  loading: boolean;
  isPro: boolean;
  isCreator: boolean;
  isActive: boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const STORAGE_KEY = 'zerotask_subscription';

function getStoredSubscription(): SubscriptionState {
  if (typeof window === 'undefined') return { plan: 'free', status: 'none', stripeCustomerId: null, expiresAt: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Check expiry
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        localStorage.removeItem(STORAGE_KEY);
        return { plan: 'free', status: 'none', stripeCustomerId: null, expiresAt: null };
      }
      return parsed;
    }
  } catch {}
  return { plan: 'free', status: 'none', stripeCustomerId: null, expiresAt: null };
}

export function setSubscription(data: SubscriptionState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export function clearSubscription() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionState>({ plan: 'free', status: 'none', stripeCustomerId: null, expiresAt: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const stored = getStoredSubscription();
    setSub(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [user, refresh]);

  // Listen for storage changes (e.g. after checkout success)
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    window.addEventListener('subscription-updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('subscription-updated', handler);
    };
  }, [refresh]);

  const isPro = (sub.plan === 'pro' || sub.plan === 'creator') && (sub.status === 'active' || sub.status === 'canceled');
  const isCreator = sub.plan === 'creator' && (sub.status === 'active' || sub.status === 'canceled');
  const isActive = sub.status === 'active';

  return (
    <SubscriptionContext.Provider value={{ ...sub, loading, isPro, isCreator, isActive, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
