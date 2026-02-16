'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './auth';
import { apiFetch } from './api-client';

interface SubscriptionState {
  plan: 'free' | 'pro' | 'creator';
  status: 'active' | 'canceled' | 'past_due' | 'expired' | 'none';
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
  } catch { /* ignore parse errors */ }
  return { plan: 'free', status: 'none', stripeCustomerId: null, expiresAt: null };
}

/**
 * Set subscription state in localStorage (used as cache).
 * The server is always the source of truth — this just prevents
 * flicker on page load while the server check is in flight.
 */
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

  const verifyFromServer = useCallback(async () => {
    if (!user) {
      setSub({ plan: 'free', status: 'none', stripeCustomerId: null, expiresAt: null });
      clearSubscription();
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch('/api/subscription');
      if (res.ok) {
        const data = await res.json();
        const serverSub: SubscriptionState = {
          plan: data.plan || 'free',
          status: data.status || 'none',
          stripeCustomerId: data.stripeCustomerId || null,
          expiresAt: data.expiresAt || null,
        };
        setSub(serverSub);
        // Cache in localStorage for instant load next time
        setSubscription(serverSub);
      } else {
        // Server check failed — fall back to cached value
        const cached = getStoredSubscription();
        setSub(cached);
      }
    } catch {
      // Network error — fall back to cached value
      const cached = getStoredSubscription();
      setSub(cached);
    }
    setLoading(false);
  }, [user]);

  // On mount or user change: load cached value instantly, then verify from server
  useEffect(() => {
    if (user) {
      // Show cached value immediately to prevent flicker
      const cached = getStoredSubscription();
      setSub(cached);
      setLoading(cached.plan === 'free' && cached.status === 'none');
    }
    verifyFromServer();
  }, [user, verifyFromServer]);

  // Listen for events (e.g., after checkout success redirect)
  useEffect(() => {
    const handler = () => verifyFromServer();
    window.addEventListener('storage', handler);
    window.addEventListener('subscription-updated', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('subscription-updated', handler);
    };
  }, [verifyFromServer]);

  const isPro = (sub.plan === 'pro' || sub.plan === 'creator') && (sub.status === 'active' || sub.status === 'canceled');
  const isCreator = sub.plan === 'creator' && (sub.status === 'active' || sub.status === 'canceled');
  const isActive = sub.status === 'active';

  return (
    <SubscriptionContext.Provider value={{ ...sub, loading, isPro, isCreator, isActive, refresh: verifyFromServer }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
