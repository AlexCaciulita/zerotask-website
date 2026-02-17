'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from './api-client';
import { useAuth } from './auth';

interface DashboardStats {
  totalKeywords: number;
  totalInfluencers: number;
  totalPosts: number;
  publishedPosts: number;
  launchStepsComplete: number;
  launchStepsTotal: number;
  latestGrowthScore: number | null;
}

export interface DashboardFeedItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  detail?: string;
  badge_label?: string;
  badge_variant?: string;
  action_label?: string;
  action_href?: string;
  read: boolean;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  feedItems: DashboardFeedItem[];
}

const DEFAULT_STATS: DashboardStats = {
  totalKeywords: 0,
  totalInfluencers: 0,
  totalPosts: 0,
  publishedPosts: 0,
  launchStepsComplete: 0,
  launchStepsTotal: 0,
  latestGrowthScore: null,
};

const POLL_INTERVAL = 60_000; // 60 seconds

/**
 * Client-side hook to fetch dashboard data.
 * Polls every 60s with visibility-aware pausing (same pattern as useCredits).
 */
export function useDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [feedItems, setFeedItems] = useState<DashboardFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user) {
      setStats(DEFAULT_STATS);
      setFeedItems([]);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch('/api/dashboard');
      if (res.ok) {
        const data: DashboardData = await res.json();
        setStats(data.stats);
        setFeedItems(data.feedItems);
        setError(null);
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(fetchDashboard, POLL_INTERVAL);
  }, [fetchDashboard]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    startPolling();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard();
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
  }, [fetchDashboard, startPolling, stopPolling]);

  return { stats, feedItems, loading, error, refresh: fetchDashboard };
}
