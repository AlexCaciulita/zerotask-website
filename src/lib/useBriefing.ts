'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api-client';
import { useAuth } from './auth';

export interface Briefing {
  id: string;
  content: string;
  highlights: { type: string; title: string; detail: string }[];
  generated_at: string;
  read: boolean;
}

/**
 * Client-side hook to fetch today's AI Morning Briefing.
 * Fetches once on mount — does not poll (briefings are daily).
 */
export function useBriefing() {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchBriefing() {
      try {
        const res = await apiFetch('/api/briefing');
        if (res.ok) {
          const data = await res.json();
          setBriefing(data);
          setError(null);
        } else if (res.status === 402) {
          // No credits — don't show error, just skip briefing
          setError(null);
        }
      } catch {
        setError('Failed to load briefing');
      } finally {
        setLoading(false);
      }
    }

    fetchBriefing();
  }, [user]);

  const markRead = useCallback(async () => {
    if (!briefing || briefing.id === 'empty') return;
    try {
      await apiFetch('/api/briefing', {
        method: 'PATCH',
        body: JSON.stringify({ id: briefing.id }),
      });
      setBriefing(prev => prev ? { ...prev, read: true } : null);
    } catch {
      // Non-critical
    }
  }, [briefing]);

  const dismiss = useCallback(() => {
    setBriefing(null);
    markRead();
  }, [markRead]);

  return { briefing, loading, error, markRead, dismiss };
}
