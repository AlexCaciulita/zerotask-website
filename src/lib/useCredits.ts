'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from './api-client';
import { useAuth } from './auth';

export interface ClientCreditInfo {
  remaining: number;
  monthly: number;
  purchased: number;
  used: number;
  plan: string;
  warning: 'low' | 'critical' | 'depleted' | null;
}

const DEFAULT_CREDITS: ClientCreditInfo = {
  remaining: 0,
  monthly: 0,
  purchased: 0,
  used: 0,
  plan: 'free',
  warning: null,
};

const POLL_INTERVAL = 60_000; // Poll every 60 seconds

/**
 * Client-side hook to fetch and cache credit balance.
 * Polls /api/credits every 60s and exposes a manual refresh.
 * Pauses polling when the tab is backgrounded to avoid wasted API calls.
 *
 * This is for UI display only — enforcement is server-side.
 */
export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<ClientCreditInfo>(DEFAULT_CREDITS);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(DEFAULT_CREDITS);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        setCredits(data);
      }
    } catch {
      // Silently fail — this is just UI
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Start/stop polling helpers
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling
    intervalRef.current = setInterval(fetchCredits, POLL_INTERVAL);
  }, [fetchCredits]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial fetch + visibility-aware polling (#9 fix)
  useEffect(() => {
    fetchCredits();
    startPolling();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Refetch immediately when tab becomes visible, then resume polling
        fetchCredits();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchCredits, startPolling, stopPolling]);

  /**
   * Update credits from an API response that includes credit info.
   * Call this after any API call that returns a `credits` object.
   */
  const updateFromResponse = useCallback((creditData: Partial<ClientCreditInfo>) => {
    setCredits(prev => ({ ...prev, ...creditData }));
  }, []);

  return {
    credits,
    loading,
    refresh: fetchCredits,
    updateFromResponse,
  };
}
