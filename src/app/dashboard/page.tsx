'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Download, DollarSign, Star, Hash, Loader2, Check, X, Search, PenTool, Film, BarChart3, MessageSquare, CloudOff, RefreshCw, Inbox, Sunrise } from 'lucide-react';
import { useActiveApp } from '@/lib/useActiveApp';
import GrowthScore from '@/components/GrowthScore';
import FeedCard, { FeedItem } from '@/components/FeedCard';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api-client';
import { useDashboard } from '@/lib/useDashboard';
import { useBriefing } from '@/lib/useBriefing';

const STORAGE_KEY = 'zerotask-dashboard-feed';
const STORAGE_KEY_AUDIT_TIME = 'zerotask-dashboard-audit-time';
const STORAGE_KEY_SCENARIOS = 'zerotask-scenarios';
const STORAGE_KEY_STATS = 'zerotask-dashboard-stats';
const STORAGE_KEY_DELETED = 'zerotask-dashboard-deleted';

type Period = 'week' | 'month' | 'all';

interface StatValues {
  downloads: string;
  downloadsPrev: string;
  revenue: string;
  revenuePrev: string;
  rating: string;
  ratingPrev: string;
  keywords: string;
  keywordsPrev: string;
}

const emptyStatValues: StatValues = {
  downloads: '0', downloadsPrev: '0', revenue: '0', revenuePrev: '0',
  rating: '0', ratingPrev: '0', keywords: '0', keywordsPrev: '0',
};

const defaultStatValues: Record<Period, StatValues> = {
  week: { ...emptyStatValues },
  month: { ...emptyStatValues },
  all: { ...emptyStatValues },
};

const periodLabels: Record<Period, string> = { week: 'This Week', month: 'This Month', all: 'All Time' };

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.\-]/g, '')) || 0;
}

function calcChange(current: string, prev: string, prefix = '', suffix = ''): string {
  const c = parseNum(current);
  const p = parseNum(prev);
  if (p === 0) return '+0';
  const isPercent = !suffix;
  if (isPercent) {
    const pct = ((c - p) / p * 100).toFixed(0);
    return (c >= p ? '+' : '') + pct + '%';
  }
  const diff = (c - p).toFixed(suffix === '★' ? 1 : 0);
  return (c >= p ? '+' : '') + prefix + diff + suffix;
}

function calcGrowthScore(vals: StatValues): number {
  const dlTrend = parseNum(vals.downloadsPrev) > 0 ? (parseNum(vals.downloads) - parseNum(vals.downloadsPrev)) / parseNum(vals.downloadsPrev) : 0;
  const revTrend = parseNum(vals.revenuePrev) > 0 ? (parseNum(vals.revenue) - parseNum(vals.revenuePrev)) / parseNum(vals.revenuePrev) : 0;
  const ratingScore = parseNum(vals.rating) / 5;
  const kwScore = Math.min(parseNum(vals.keywords) / 200, 1);
  const raw = (dlTrend * 0.3 + revTrend * 0.3 + ratingScore * 0.2 + kwScore * 0.2) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getAppData() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('zerotask-settings-apps');
    if (saved) {
      const apps = JSON.parse(saved);
      if (apps.length > 0) {
        const activeId = localStorage.getItem('zerotask-active-app');
        const active = activeId ? apps.find((a: Record<string, string>) => a.id === activeId) : null;
        return active || apps[0];
      }
    }
  } catch {}
  return null;
}

// Sparkline SVG component
function Sparkline({ data, color = 'currentColor', className = '' }: { data: number[]; color?: string; className?: string }) {
  if (!data.length) return null;
  const width = 80;
  const height = 28;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Skeleton loading component
function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Strategy bar skeleton */}
      <div className="h-8 bg-surface-tertiary rounded-lg w-full" />
      
      {/* Period toggle skeleton */}
      <div className="flex gap-1">
        <div className="h-7 w-20 bg-surface-tertiary rounded-full" />
        <div className="h-7 w-24 bg-surface-tertiary rounded-full" />
        <div className="h-7 w-16 bg-surface-tertiary rounded-full" />
      </div>

      {/* Score + Stats skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 card p-6 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border-8 border-surface-tertiary" />
        </div>
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-surface-tertiary" />
                <div className="h-3 w-16 bg-surface-tertiary rounded" />
              </div>
              <div className="h-7 w-20 bg-surface-tertiary rounded" />
              <div className="h-5 w-14 bg-surface-tertiary rounded-full" />
              <div className="h-7 w-full bg-surface-tertiary rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="w-10 h-10 rounded-lg bg-surface-tertiary" />
        ))}
      </div>

      {/* Feed skeleton */}
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="card p-4 border-l-4 border-l-surface-tertiary">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-tertiary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-surface-tertiary rounded" />
                <div className="h-3 w-full bg-surface-tertiary rounded" />
                <div className="h-3 w-20 bg-surface-tertiary rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Feed items now come from useDashboard() hook — no hardcoded defaults

const feedTypeFilters = ['All', 'Keywords', 'Competitors', 'Content', 'TikTok', 'Reviews', 'Launch'] as const;
const filterTypeMap: Record<string, string> = {
  Keywords: 'keyword', Competitors: 'competitor', Content: 'content', TikTok: 'tiktok', Reviews: 'review', Launch: 'launch',
};

const quickActions = [
  { label: 'Keywords', icon: Search, href: '/keywords' },
  { label: 'Copy', icon: PenTool, href: '/copy' },
  { label: 'TikTok', icon: Film, href: '/tiktok' },
  { label: 'Competitors', icon: BarChart3, href: '/competitors' },
  { label: 'Reviews', icon: MessageSquare, href: '/reviews' },
];

// Sparkline data populated from real analytics — empty by default
const emptySparklineData: Record<string, number[]> = {
  downloads: [],
  revenue: [],
  rating: [],
  keywords: [],
};

const ANALYTICS_CACHE_KEY = 'zerotask-analytics-cache';
const ANALYTICS_HISTORY_KEY = 'zerotask-analytics-history';
const ANALYTICS_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours between API refreshes

interface AnalyticsCache {
  timestamp: number;
  apps: Array<{ id: string; name: string; bundleId: string; sku: string }>;
  downloads?: { reports: Array<{ date: string; units: number; revenue: number }>; totalDownloads: number; totalRevenue: number };
  reviews?: { avgRating: number; count: number };
}

interface AnalyticsSnapshot {
  date: string; // YYYY-MM-DD
  downloads: number;
  revenue: number;
  rating: number;
  reviewCount: number;
}

function getCachedAnalytics(): AnalyticsCache | null {
  try {
    const cached = localStorage.getItem(ANALYTICS_CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as AnalyticsCache;
    if (Date.now() - data.timestamp > ANALYTICS_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedAnalytics(data: AnalyticsCache) {
  try { localStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(data)); } catch {}
}

// Append daily snapshot to persistent history (keeps up to 365 days)
function appendAnalyticsHistory(snapshot: AnalyticsSnapshot) {
  try {
    const history: AnalyticsSnapshot[] = JSON.parse(localStorage.getItem(ANALYTICS_HISTORY_KEY) || '[]');
    // Don't duplicate same date
    const existing = history.findIndex(h => h.date === snapshot.date);
    if (existing >= 0) { history[existing] = snapshot; } else { history.push(snapshot); }
    // Keep last 365 days
    const trimmed = history.slice(-365);
    localStorage.setItem(ANALYTICS_HISTORY_KEY, JSON.stringify(trimmed));
    // Also persist to Supabase
    persistHistoryToSupabase(trimmed);
  } catch {}
}

async function persistHistoryToSupabase(history: AnalyticsSnapshot[]) {
  try {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('audits').upsert({
      id: '00000000-0000-0000-0000-analytics-hist',
      app_url: 'analytics-history',
      app_name: 'Analytics History',
      growth_score: 0,
      scraped_data: { history, updated_at: new Date().toISOString() },
    }, { onConflict: 'id' });
  } catch {}
}

async function loadHistoryFromSupabase(): Promise<AnalyticsSnapshot[]> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.from('audits').select('scraped_data').eq('id', '00000000-0000-0000-0000-analytics-hist').single();
    if (data?.scraped_data?.history) return data.scraped_data.history;
  } catch {}
  return [];
}

function getAnalyticsHistory(): AnalyticsSnapshot[] {
  try { return JSON.parse(localStorage.getItem(ANALYTICS_HISTORY_KEY) || '[]'); } catch { return []; }
}

function useAppStoreAnalytics() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsCache | null>(null);

  const fetchAnalytics = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCachedAnalytics();
      if (cached) { setAnalyticsData(cached); setConnected(true); return cached; }
    }

    setLoading(true);
    setError(null);
    try {
      // Check if configured
      const statusRes = await apiFetch('/api/analytics', { method: 'POST', body: JSON.stringify({ action: 'status' }) });
      if (!statusRes.ok) { setConnected(false); return null; }
      
      // Fetch apps
      const appsRes = await apiFetch('/api/analytics', { method: 'POST', body: JSON.stringify({ action: 'apps' }) });
      const appsData = await appsRes.json();
      if (!appsRes.ok) throw new Error(appsData.error);
      
      const apps = appsData.apps || [];
      const cache: AnalyticsCache = { timestamp: Date.now(), apps };

      if (apps.length > 0) {
        // Fetch reviews for first app
        try {
          const reviewsRes = await apiFetch('/api/analytics', { method: 'POST', body: JSON.stringify({ action: 'reviews', appId: apps[0].id }) });
          if (reviewsRes.ok) cache.reviews = await reviewsRes.json();
        } catch {}
      }

      setCachedAnalytics(cache);
      setAnalyticsData(cache);
      setConnected(true);

      // Save daily snapshot to history
      const today = new Date().toISOString().split('T')[0];
      appendAnalyticsHistory({
        date: today,
        downloads: cache.downloads?.totalDownloads || 0,
        revenue: cache.downloads?.totalRevenue || 0,
        rating: cache.reviews?.avgRating || 0,
        reviewCount: cache.reviews?.count || 0,
      });

      return cache;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      setError(msg);
      setConnected(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load history from Supabase on mount (fills localStorage if empty)
  useEffect(() => {
    const local = getAnalyticsHistory();
    if (local.length === 0) {
      loadHistoryFromSupabase().then(history => {
        if (history.length > 0) {
          try { localStorage.setItem(ANALYTICS_HISTORY_KEY, JSON.stringify(history)); } catch {}
        }
      });
    }
  }, []);

  return { loading, connected, error, analyticsData, fetchAnalytics, history: getAnalyticsHistory() };
}

// Editable stat card with sparkline
function StatCard({ label, icon: Icon, color, value, change, sparkData, onSave }: {
  label: string; icon: React.ComponentType<{ className?: string }>; color: string;
  value: string; change: string; sparkData: number[]; onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditVal(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    if (editVal.trim() && editVal !== value) onSave(editVal.trim());
  };

  const isPositive = change.startsWith('+');
  const isNegative = change.startsWith('-');
  const sparkColor = color.includes('blue') ? '#3b82f6' : color.includes('emerald') ? '#10b981' : color.includes('amber') ? '#f59e0b' : '#8b5cf6';

  return (
    <div
      className="glass-card p-4 cursor-pointer transition-all duration-200"
      onClick={() => { if (!editing) setEditing(true); }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      {editing ? (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditVal(value); setEditing(false); } }}
            className="w-full text-2xl font-bold bg-transparent border-b border-accent text-text-primary outline-none tabular-nums"
          />
          <button onClick={save} className="p-0.5 text-accent hover:text-accent-light"><Check className="w-4 h-4" /></button>
          <button onClick={() => { setEditVal(value); setEditing(false); }} className="p-0.5 text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <p className="text-2xl font-bold text-text-primary tabular-nums tracking-tight">{value}</p>
      )}
      <span className={`inline-flex items-center text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${
        isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
        isNegative ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
        'bg-neutral-100 text-text-tertiary dark:bg-neutral-800'
      }`}>
        {isPositive ? '↑' : isNegative ? '↓' : ''} {change}
      </span>
      <div className="mt-2">
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { app, appData: activeAppData, mounted } = useActiveApp();
  const { loading: analyticsLoading, connected: analyticsConnected, error: analyticsError, analyticsData, fetchAnalytics } = useAppStoreAnalytics();
  const { stats: dashboardStats, feedItems: dashboardFeedItems, loading: dashboardLoading } = useDashboard();
  const { briefing, dismiss: dismissBriefing } = useBriefing();
  const [liveSparklines, setLiveSparklines] = useState<Record<string, number[]>>(emptySparklineData);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);
  const [scenarioNote, setScenarioNote] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [statValues, setStatValues] = useState<Record<Period, StatValues>>(defaultStatValues);
  const [feedFilter, setFeedFilter] = useState('All');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [appDataLegacy, setAppDataLegacy] = useState<{ name?: string } | null>(null);

  // Populate feed from dashboard API
  useEffect(() => {
    if (dashboardFeedItems.length > 0) {
      const mapped: FeedItem[] = dashboardFeedItems.map(item => ({
        id: item.id,
        type: item.type as FeedItem['type'],
        title: item.title,
        summary: item.summary,
        detail: item.detail || '',
        timestamp: new Date(item.created_at).toLocaleDateString(),
        badge: { label: item.badge_label || '', variant: (item.badge_variant || 'success') as 'error' | 'warning' | 'success' },
        actionLabel: item.action_label || '',
      }));
      setFeedItems(mapped);
    }
  }, [dashboardFeedItems]);

  // Update keyword count from real dashboard stats
  useEffect(() => {
    if (dashboardStats.totalKeywords > 0) {
      setStatValues(prev => ({
        week: { ...prev.week, keywords: String(dashboardStats.totalKeywords) },
        month: { ...prev.month, keywords: String(dashboardStats.totalKeywords) },
        all: { ...prev.all, keywords: String(dashboardStats.totalKeywords) },
      }));
    }
  }, [dashboardStats.totalKeywords]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && feedItems.length === 0) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setFeedItems(parsed);
      }
      const time = localStorage.getItem(STORAGE_KEY_AUDIT_TIME);
      if (time) setLastAuditTime(time);

      const scenarios = localStorage.getItem(STORAGE_KEY_SCENARIOS);
      if (scenarios) {
        const s = JSON.parse(scenarios);
        const parts: string[] = [];
        if (s.pricing) parts.push(`Pricing: $${s.pricing}/mo`);
        if (s.adBudget) parts.push(`Ad Budget: $${s.adBudget}/mo`);
        if (s.growthStrategy) parts.push(`Growth: ${s.growthStrategy}`);
        if (s.market) parts.push(`Market: ${s.market}`);
        if (parts.length) setScenarioNote(parts.join(' • '));
      }

      const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        setStatValues(prev => ({ ...prev, ...parsed }));
      }

      const del = localStorage.getItem(STORAGE_KEY_DELETED);
      if (del) setDeletedIds(JSON.parse(del));

      setAppDataLegacy(getAppData());
    } catch {}
  }, []);

  const currentStats = statValues[period];
  const periodSuffix = period === 'week' ? ' this week' : period === 'month' ? ' this month' : ' all time';

  const statsConfig = [
    { key: 'downloads', label: 'Downloads', icon: Download, color: 'text-blue-500',
      display: Number(parseNum(currentStats.downloads)).toLocaleString(),
      change: calcChange(currentStats.downloads, currentStats.downloadsPrev) + periodSuffix },
    { key: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-emerald-500',
      display: '$' + Number(parseNum(currentStats.revenue)).toLocaleString(),
      change: calcChange(currentStats.revenue, currentStats.revenuePrev) + periodSuffix },
    { key: 'rating', label: 'Rating', icon: Star, color: 'text-amber-500',
      display: parseNum(currentStats.rating).toFixed(1) + '★',
      change: calcChange(currentStats.rating, currentStats.ratingPrev, '', '★').replace('%', '') + periodSuffix },
    { key: 'keywords', label: 'Keywords', icon: Hash, color: 'text-violet-500',
      display: Number(parseNum(currentStats.keywords)).toLocaleString(),
      change: calcChange(currentStats.keywords, currentStats.keywordsPrev) + periodSuffix },
  ];

  const growthScore = calcGrowthScore(currentStats);
  const prevScore = calcGrowthScore({
    downloads: currentStats.downloadsPrev, downloadsPrev: '0',
    revenue: currentStats.revenuePrev, revenuePrev: '0',
    rating: currentStats.ratingPrev, ratingPrev: '0',
    keywords: currentStats.keywordsPrev, keywordsPrev: '0',
  });
  const growthDelta = growthScore - prevScore;

  const handleStatSave = (key: string, val: string) => {
    setStatValues(prev => {
      const updated = { ...prev, [period]: { ...prev[period], [key]: val } };
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(updated));
      return updated;
    });
    showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} updated`, 'success');
  };

  const handleDeleteFeed = (id: string) => {
    const newDeleted = [...deletedIds, id];
    setDeletedIds(newDeleted);
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(newDeleted));
    showToast('Item dismissed', 'info');
  };

  const filteredFeed = feedItems
    .filter(item => !deletedIds.includes(item.id))
    .filter(item => feedFilter === 'All' || item.type === filterTypeMap[feedFilter]);

  const runAudit = useCallback(async () => {
    setIsAuditing(true);
    setAuditError(null);
    try {
      const ad = getAppData();
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ task: 'dashboard-audit', appData: ad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');

      let items: FeedItem[];
      if (Array.isArray(data.result)) {
        items = data.result;
      } else if (typeof data.result === 'string') {
        const match = data.result.match(/\[[\s\S]*\]/);
        items = match ? JSON.parse(match[0]) : [];
      } else {
        items = [];
      }

      if (items.length > 0) {
        setFeedItems(items);
        setDeletedIds([]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        localStorage.removeItem(STORAGE_KEY_DELETED);
        const now = new Date().toLocaleString();
        localStorage.setItem(STORAGE_KEY_AUDIT_TIME, now);
        setLastAuditTime(now);
        showToast('Audit complete — feed updated!', 'success');
      }
    } catch (err: unknown) {
      setAuditError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setIsAuditing(false);
    }
  }, [showToast]);

  const appName = app?.name || appDataLegacy?.name || 'Your App';

  // Update rating stat from real app data
  useEffect(() => {
    if (!mounted || !app) return;
    if (app.rating) {
      setStatValues(prev => ({
        ...prev,
        week: { ...prev.week, rating: app.rating!.toFixed(1), ratingPrev: prev.week.ratingPrev },
        month: { ...prev.month, rating: app.rating!.toFixed(1), ratingPrev: prev.month.ratingPrev },
        all: { ...prev.all, rating: app.rating!.toFixed(1), ratingPrev: prev.all.ratingPrev },
      }));
    }
  }, [mounted, app?.id, app?.rating]);

  // Fetch App Store Connect analytics on mount
  useEffect(() => {
    if (!mounted) return;
    fetchAnalytics();
  }, [mounted, fetchAnalytics]);

  // Update stats from analytics data
  useEffect(() => {
    if (!analyticsData) return;
    
    if (analyticsData.reviews && analyticsData.reviews.avgRating > 0) {
      setStatValues(prev => {
        const rating = analyticsData.reviews!.avgRating.toFixed(1);
        return {
          ...prev,
          week: { ...prev.week, rating },
          month: { ...prev.month, rating },
          all: { ...prev.all, rating },
        };
      });
    }

    if (analyticsData.downloads) {
      const reports = analyticsData.downloads.reports;
      const dlData = reports.map(r => r.units).reverse();
      const revData = reports.map(r => r.revenue).reverse();
      if (dlData.length > 0) {
        setLiveSparklines(prev => ({
          ...prev,
          downloads: dlData.slice(-7),
          revenue: revData.slice(-7),
        }));
        setStatValues(prev => ({
          ...prev,
          week: {
            ...prev.week,
            downloads: String(analyticsData.downloads!.totalDownloads),
            revenue: String(analyticsData.downloads!.totalRevenue.toFixed(0)),
          },
        }));
      }
    }
  }, [analyticsData]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        breadcrumbs={[{ label: appName }, { label: 'Dashboard' }]}
        actions={
          <div className="flex items-center gap-3">
            {lastAuditTime && (
              <span className="text-xs text-text-tertiary">Last audit: {lastAuditTime}</span>
            )}
            <button
              onClick={runAudit}
              disabled={isAuditing}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark flex items-center gap-1.5 disabled:opacity-50"
            >
              {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              {isAuditing ? 'Auditing...' : 'Run Audit'}
            </button>
          </div>
        }
      />

      {/* Skeleton while loading */}
      {(isAuditing || dashboardLoading) && <DashboardSkeleton />}

      {!isAuditing && !dashboardLoading && (
        <>
          {!appDataLegacy && !app && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm flex items-center justify-between">
              <span>No app configured yet. Set up your app to get personalized insights.</span>
              <button onClick={() => router.push('/settings')} className="text-accent font-medium hover:underline ml-2 whitespace-nowrap">Go to Settings →</button>
            </div>
          )}

          {auditError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {auditError}
            </div>
          )}

          {/* AI Morning Briefing */}
          {briefing && !briefing.read && briefing.content && (
            <div className="mb-4 glass-card p-4 relative">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Sunrise className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary mb-1">Morning Briefing</h3>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{briefing.content}</p>
                  {briefing.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {briefing.highlights.map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                          {h.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={dismissBriefing}
                  className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Active Strategy — thin bar */}
          {scenarioNote && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-accent/5 border border-accent/10 text-xs text-text-secondary flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-medium text-accent">Strategy:</span> {scenarioNote}
            </div>
          )}

          {/* App Store Connect Status */}
          {analyticsConnected === true && analyticsData && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
              <span>
                ✓ Connected to App Store Connect
                {analyticsData.apps.length > 0 && ` — ${analyticsData.apps.length} app${analyticsData.apps.length > 1 ? 's' : ''} found`}
                {analyticsData.apps.length === 0 && ' — No apps found in this account'}
              </span>
              <button onClick={() => fetchAnalytics(true)} disabled={analyticsLoading} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium">
                <RefreshCw className={`w-3 h-3 ${analyticsLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          )}
          {analyticsConnected === false && analyticsError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <CloudOff className="w-3.5 h-3.5 shrink-0" />
              <span>App Store Connect: {analyticsError}</span>
              <button onClick={() => fetchAnalytics(true)} className="ml-auto text-red-500 hover:text-red-700 font-medium">Retry</button>
            </div>
          )}
          {analyticsLoading && analyticsConnected === null && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Connecting to App Store Connect...</span>
            </div>
          )}

          {/* Period Toggle — pill group */}
          <div className="inline-flex items-center rounded-full glass p-0.5 mb-4">
            {(['week', 'month', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                  period === p
                    ? 'bg-accent/15 text-accent shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>

          {/* Score + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
            <div className="lg:col-span-2 glass-card p-6 flex items-center justify-center">
              <GrowthScore score={growthScore} delta={growthDelta} />
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statsConfig.map(s => (
                <StatCard
                  key={s.key}
                  label={s.label}
                  icon={s.icon}
                  color={s.color}
                  value={s.display}
                  change={s.change}
                  sparkData={liveSparklines[s.key] || []}
                  onSave={(val) => handleStatSave(s.key, val.replace(/[$,★]/g, ''))}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions — icon-only bar with tooltips */}
          <div className="flex items-center gap-1 mb-8">
            {quickActions.map(a => (
              <div key={a.href} className="relative group">
                <button
                  onClick={() => router.push(a.href)}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-all duration-150"
                >
                  <a.icon className="w-4 h-4" />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-md bg-neutral-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg">
                  {a.label}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-neutral-900" />
                </div>
              </div>
            ))}
          </div>

          {/* Activity Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Activity Feed</h2>
            </div>

            {/* Filter Tabs — segmented control */}
            <div className="inline-flex items-center rounded-full glass p-0.5 mb-4 flex-wrap">
              {feedTypeFilters.map(f => (
                <button
                  key={f}
                  onClick={() => setFeedFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                    feedFilter === f
                      ? 'bg-accent/15 text-accent shadow-sm'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredFeed.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-tertiary flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-text-tertiary" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-1">
                    {feedFilter === 'All' ? 'No activity yet' : `No ${feedFilter.toLowerCase()} items`}
                  </h3>
                  <p className="text-sm text-text-tertiary mb-4">
                    {feedFilter === 'All'
                      ? 'Run your first audit to discover insights about your app.'
                      : `No ${feedFilter.toLowerCase()} insights found. Try running an audit.`}
                  </p>
                  <button
                    onClick={runAudit}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Run your first audit
                  </button>
                </div>
              ) : (
                filteredFeed.map(item => (
                  <FeedCard key={item.id} item={item} onDelete={handleDeleteFeed} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
