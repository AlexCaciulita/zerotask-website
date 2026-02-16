'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Globe, Sparkles, ChevronDown, Check, RefreshCw } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getKeywords, saveKeyword } from '@/lib/db';
import { useActiveApp } from '@/lib/useActiveApp';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api-client';

// --- Sparkline persistence ---
const SPARKLINE_STORAGE_KEY = 'zerotask-keywords-sparklines';
const SPARKLINE_TS_KEY = 'zerotask-keywords-sparklines-ts';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const generateSparkline = (base: number, trend: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    v: Math.max(1, base + trend * i + Math.round((Math.random() - 0.5) * 10)),
  }));

type SparklinePoint = { v: number };
type StoredSparklines = Record<string, SparklinePoint[]>;

function loadOrGenerateSparklines(keywords: { keyword: string; rank: number; change: number }[], forceRefresh = false): StoredSparklines {
  if (typeof window === 'undefined') {
    const result: StoredSparklines = {};
    keywords.forEach(k => { result[k.keyword] = generateSparkline(k.rank, k.change > 0 ? -1 : 1); });
    return result;
  }

  const now = Date.now();
  const tsStr = localStorage.getItem(SPARKLINE_TS_KEY);
  const isStale = !tsStr || (now - Number(tsStr)) > ONE_DAY_MS;

  if (!forceRefresh && !isStale) {
    try {
      const stored = JSON.parse(localStorage.getItem(SPARKLINE_STORAGE_KEY) || '{}') as StoredSparklines;
      // Check all keywords exist
      const allPresent = keywords.every(k => stored[k.keyword]?.length);
      if (allPresent) return stored;
    } catch {}
  }

  // Generate fresh sparklines
  const result: StoredSparklines = {};
  // Preserve existing data if partial
  let existing: StoredSparklines = {};
  try { existing = JSON.parse(localStorage.getItem(SPARKLINE_STORAGE_KEY) || '{}'); } catch {}

  keywords.forEach(k => {
    if (!forceRefresh && !isStale && existing[k.keyword]?.length) {
      result[k.keyword] = existing[k.keyword];
    } else {
      result[k.keyword] = generateSparkline(k.rank, k.change > 0 ? -1 : 1);
    }
  });

  localStorage.setItem(SPARKLINE_STORAGE_KEY, JSON.stringify(result));
  localStorage.setItem(SPARKLINE_TS_KEY, String(now));
  return result;
}

function appendSparklineValue(keyword: string, newRank: number) {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem(SPARKLINE_STORAGE_KEY) || '{}') as StoredSparklines;
    if (stored[keyword]) {
      stored[keyword] = [...stored[keyword].slice(-11), { v: newRank }];
      localStorage.setItem(SPARKLINE_STORAGE_KEY, JSON.stringify(stored));
    }
  } catch {}
}

const KEYWORDS_RAW = [
  { keyword: 'productivity app assistant', volume: 74000, difficulty: 45, rank: 2, change: 8, since: '2025-06-01' },
  { keyword: 'ai task manager', volume: 68000, difficulty: 42, rank: 3, change: 6, since: '2025-06-10' },
  { keyword: 'smart to-do list app', volume: 52000, difficulty: 38, rank: 2, change: 9, since: '2025-07-15' },
  { keyword: 'ai planner app', volume: 120000, difficulty: 55, rank: 4, change: 12, since: '2025-08-01' },
  { keyword: 'daily task organizer', volume: 45000, difficulty: 35, rank: 1, change: 7, since: '2025-09-20' },
  { keyword: 'ai productivity assistant', volume: 85000, difficulty: 50, rank: 3, change: 10, since: '2025-06-01' },
  { keyword: 'focus timer app', volume: 42000, difficulty: 32, rank: 2, change: 8, since: '2025-10-05' },
  { keyword: 'habit tracker with ai', volume: 58000, difficulty: 40, rank: 3, change: 5, since: '2025-08-12' },
  { keyword: 'workflow automation app', volume: 38000, difficulty: 36, rank: 1, change: 11, since: '2025-09-01' },
  { keyword: 'ai scheduling assistant', volume: 31000, difficulty: 30, rank: 2, change: 9, since: '2025-10-12' },
  { keyword: 'best productivity tools', volume: 95000, difficulty: 62, rank: 5, change: 4, since: '2025-05-20' },
  { keyword: 'task prioritization app', volume: 29000, difficulty: 28, rank: 1, change: 6, since: '2025-11-01' },
  { keyword: 'project management tool', volume: 67000, difficulty: 55, rank: 7, change: 3, since: '2025-07-08' },
  { keyword: 'ai note taking app', volume: 48000, difficulty: 38, rank: 4, change: 5, since: '2025-08-18' },
  { keyword: 'automated task planner', volume: 35000, difficulty: 33, rank: 2, change: 8, since: '2025-09-15' },
  { keyword: 'how to be more productive', volume: 110000, difficulty: 70, rank: 8, change: 2, since: '2025-05-15' },
  { keyword: 'smart reminder app', volume: 27000, difficulty: 29, rank: 1, change: 7, since: '2025-10-25' },
  { keyword: 'ai workflow optimizer', volume: 33000, difficulty: 31, rank: 2, change: 6, since: '2025-09-10' },
  { keyword: 'time tracking productivity', volume: 41000, difficulty: 44, rank: 6, change: 3, since: '2025-08-22' },
  { keyword: 'better task management', volume: 56000, difficulty: 48, rank: 5, change: 4, since: '2025-07-20' },
  { keyword: 'ai focus assistant', volume: 22000, difficulty: 25, rank: 1, change: 9, since: '2025-11-10' },
  { keyword: 'productivity coach ai', volume: 39000, difficulty: 37, rank: 3, change: 7, since: '2025-10-02' },
  { keyword: 'smart productivity app', volume: 18000, difficulty: 15, rank: 1, change: 12, since: '2025-10-25' },
  { keyword: 'intelligent task planner', volume: 25000, difficulty: 30, rank: 2, change: 8, since: '2025-09-08' },
  { keyword: 'deadline management app', volume: 44000, difficulty: 42, rank: 4, change: 5, since: '2025-08-05' },
  { keyword: 'best task manager app', volume: 62000, difficulty: 52, rank: 6, change: 3, since: '2025-05-01' },
  { keyword: 'ai powered to-do list', volume: 37000, difficulty: 34, rank: 2, change: 7, since: '2025-05-10' },
  { keyword: 'goal setting app', volume: 78000, difficulty: 58, rank: 9, change: 1, since: '2025-07-12' },
  { keyword: 'daily planner ideas', volume: 50000, difficulty: 46, rank: 5, change: 4, since: '2025-08-28' },
  { keyword: 'ai personal assistant app', volume: 46000, difficulty: 40, rank: 3, change: 6, since: '2025-09-22' },
  { keyword: 'time blocking app', volume: 34000, difficulty: 36, rank: 4, change: 5, since: '2025-06-15' },
  { keyword: 'ai calendar assistant', volume: 28000, difficulty: 32, rank: 2, change: 8, since: '2025-10-18' },
  { keyword: 'best planning apps', volume: 53000, difficulty: 45, rank: 6, change: 3, since: '2025-07-25' },
  { keyword: 'how to stop procrastinating', volume: 71000, difficulty: 55, rank: 7, change: 2, since: '2025-08-10' },
  { keyword: 'ai task generator', volume: 20000, difficulty: 22, rank: 1, change: 10, since: '2025-11-20' },
  { keyword: 'smart scheduling tool', volume: 16000, difficulty: 20, rank: 1, change: 9, since: '2025-10-28' },
  { keyword: 'best ai productivity tools', volume: 43000, difficulty: 39, rank: 3, change: 6, since: '2025-09-28' },
  { keyword: 'task automation helper', volume: 32000, difficulty: 28, rank: 2, change: 11, since: '2025-10-15' },
  { keyword: 'improve daily productivity', volume: 47000, difficulty: 43, rank: 5, change: 4, since: '2025-06-30' },
  { keyword: 'ai work assistant app', volume: 24000, difficulty: 26, rank: 1, change: 8, since: '2025-09-05' },
  { keyword: 'smart task tracker', volume: 30000, difficulty: 31, rank: 2, change: 7, since: '2025-10-22' },
  { keyword: 'project planning tips', volume: 36000, difficulty: 35, rank: 3, change: 6, since: '2025-08-15' },
  { keyword: 'ai workspace manager', volume: 40000, difficulty: 38, rank: 4, change: 5, since: '2025-09-18' },
  { keyword: 'automated daily planner', volume: 26000, difficulty: 27, rank: 2, change: 9, since: '2025-11-08' },
  { keyword: 'team task management app', volume: 55000, difficulty: 47, rank: 6, change: 3, since: '2025-05-25' },
  { keyword: 'first time productivity app', volume: 19000, difficulty: 23, rank: 1, change: 10, since: '2025-11-05' },
  { keyword: 'ai daily routine planner', volume: 21000, difficulty: 25, rank: 2, change: 8, since: '2025-10-30' },
  { keyword: 'goal tracker with reminders', volume: 15000, difficulty: 18, rank: 1, change: 11, since: '2025-11-15' },
  { keyword: 'ai productivity coach app', volume: 23000, difficulty: 24, rank: 1, change: 9, since: '2025-10-08' },
  { keyword: 'stop procrastinating app', volume: 38000, difficulty: 40, rank: 4, change: 6, since: '2025-07-30' },
];

// Static version for SSR/initial render - sparklines added dynamically in component
const KEYWORDS_DATA_STATIC = KEYWORDS_RAW.map((k, i) => ({ ...k, id: i, sparkline: [] as SparklinePoint[] }));

const COUNTRY_MULTIPLIERS: Record<string, { label: string; flag: string; mult: number }> = {
  US: { label: 'United States', flag: '🇺🇸', mult: 1.0 },
  UK: { label: 'United Kingdom', flag: '🇬🇧', mult: 0.28 },
  DE: { label: 'Germany', flag: '🇩🇪', mult: 0.22 },
  JP: { label: 'Japan', flag: '🇯🇵', mult: 0.35 },
  BR: { label: 'Brazil', flag: '🇧🇷', mult: 0.18 },
};

type SortKey = 'keyword' | 'volume' | 'difficulty' | 'rank' | 'change';
type FilterType = 'all' | 'tracking' | 'opportunities' | 'declining';

function DifficultyDot({ value }: { value: number }) {
  const color = value >= 60
    ? 'bg-red-500'
    : value >= 35
    ? 'bg-amber-500'
    : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-1.5">
      <span className={clsx('w-2 h-2 rounded-full shrink-0', color)} />
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Sparkline({ data, color = '#10b981' }: { data: { v: number }[]; color?: string }) {
  return (
    <div className="w-20 h-7 inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} strokeLinecap="round" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />;

export default function KeywordsPage() {
  const { app, appData, mounted } = useActiveApp();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortAsc, setSortAsc] = useState(false);
  const [country, setCountry] = useState('US');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSimulator, setShowSimulator] = useState(false);
  const [simTitle, setSimTitle] = useState('');
  const [simSubtitle, setSimSubtitle] = useState('');
  const [simKeywords, setSimKeywords] = useState('');
  const [aiSimLoading, setAiSimLoading] = useState(false);
  const [aiSimError, setAiSimError] = useState<string | null>(null);
  const [aiSimResults, setAiSimResults] = useState<{ keyword: string; predictedRankChange: string; reasoning: string }[] | null>(null);
  const [aiSimRecommendation, setAiSimRecommendation] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestedKeywords, setSuggestedKeywords] = useState<{ keyword: string; estimatedVolume: string; difficulty: string; reasoning: string }[]>([]);
  const [realKeywordsLoading, setRealKeywordsLoading] = useState(false);
  const [realKeywords, setRealKeywords] = useState<string[]>([]);
  const [sparklines, setSparklines] = useState<StoredSparklines>({});

  const [dbKeywords, setDbKeywords] = useState<typeof KEYWORDS_DATA_STATIC | null>(null);

  // Load sparklines from localStorage on mount
  useEffect(() => {
    setSparklines(loadOrGenerateSparklines(KEYWORDS_RAW));
  }, []);

  // Set simulator defaults from active app
  const [simInited, setSimInited] = useState(false);
  useEffect(() => {
    if (!mounted || !app || simInited) return;
    setSimTitle(`${app.name} — ${app.category} App`);
    setSimSubtitle(`Best ${app.category} App`);
    setSimKeywords(app.name.toLowerCase().split(/\s+/).join(', '));
    setSimInited(true);
  }, [mounted, app?.id]);

  // Load keywords from Supabase, auto-research if empty
  const [autoResearched, setAutoResearched] = useState(false);
  useEffect(() => {
    if (!mounted || !app) return;
    const appId = app.id;
    async function loadKeywords() {
      try {
        const data = await getKeywords(appId);
        if (data && data.length > 0) {
          const mapped = data.map((k: Record<string, unknown>, i: number) => ({
            id: i,
            keyword: k.keyword as string,
            volume: (k.volume as number) || 0,
            difficulty: (k.difficulty as number) || 0,
            rank: (k.current_rank as number) || 1,
            change: 0,
            since: (k.created_at as string || '').slice(0, 10),
            sparkline: [] as SparklinePoint[],
          }));
          setDbKeywords(mapped);
        } else if (!autoResearched) {
          // Auto-research real keywords for this app
          setAutoResearched(true);
          setRealKeywordsLoading(true);
          try {
            const seeds = [app.name, app.category, ...app.name.split(/\s+/).filter((w: string) => w.length > 2)];
            const allSuggestions: string[] = [];
            for (const seed of seeds.slice(0, 4)) {
              try {
                const res = await apiFetch('/api/scrape/keywords', {
                  method: 'POST',
                  body: JSON.stringify({ term: seed.toLowerCase(), country }),
                });
                const data = await res.json();
                if (data.suggestions) allSuggestions.push(...data.suggestions);
              } catch {}
            }
            const unique = [...new Set(allSuggestions)];
            setRealKeywords(unique);
            // Save scraped keywords to Supabase and use AI for volume/difficulty
            if (unique.length > 0) {
              try {
                const res = await apiFetch('/api/ai', {
                  method: 'POST',
                  body: JSON.stringify({
                    task: 'suggest-keywords',
                    appData: { name: app.name, category: app.category, platform: app.platform?.toLowerCase() || 'ios', keywords: unique.slice(0, 20) },
                    realSuggestions: unique,
                    count: Math.min(unique.length, 30),
                  }),
                });
                const aiData = await res.json();
                if (Array.isArray(aiData.result)) {
                  setSuggestedKeywords(aiData.result);
                  // Save to Supabase
                  const mapped = aiData.result.map((k: { keyword: string; estimatedVolume?: string; difficulty?: string }, i: number) => {
                    const vol = parseInt(String(k.estimatedVolume || '0').replace(/[^0-9]/g, '')) || 1000;
                    const diff = parseInt(String(k.difficulty || '0').replace(/[^0-9]/g, '')) || 30;
                    saveKeyword({ app_id: appId, keyword: k.keyword, volume: vol, difficulty: diff, current_rank: i + 1 });
                    return { id: i, keyword: k.keyword, volume: vol, difficulty: diff, rank: i + 1, change: 0, since: new Date().toISOString().slice(0, 10), sparkline: [] as SparklinePoint[] };
                  });
                  setDbKeywords(mapped);
                }
              } catch {}
            }
          } catch {} finally { setRealKeywordsLoading(false); }
        }
      } catch (e) {
        console.warn('Failed to load keywords from Supabase', e);
      }
    }
    loadKeywords();
  }, [mounted, app?.id]);

  const refreshSparklines = useCallback(() => {
    setSparklines(loadOrGenerateSparklines(KEYWORDS_RAW, true));
  }, []);

  const KEYWORDS_DATA = useMemo(() => {
    const base = dbKeywords || KEYWORDS_DATA_STATIC;
    return base.map(k => ({
      ...k,
      sparkline: sparklines[k.keyword] || [],
    }));
  }, [sparklines, dbKeywords]);

  const simulateWithAI = useCallback(async () => {
    setAiSimLoading(true);
    setAiSimError(null);
    try {
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          task: 'simulate-keywords',
          appData: { name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios' },
          currentTitle: app?.name ? `${app.name} — ${app.category || 'Productivity'} App` : 'Your App — Productivity App',
          proposedTitle: simTitle,
          keywords: KEYWORDS_DATA.slice(0, 10).map(k => k.keyword),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      const result = data.result;
      if (result?.predictions) setAiSimResults(result.predictions);
      if (result?.overallRecommendation) setAiSimRecommendation(result.overallRecommendation);
    } catch (err: unknown) {
      setAiSimError(err instanceof Error ? err.message : 'AI simulation failed');
    } finally {
      setAiSimLoading(false);
    }
  }, [simTitle]);

  const suggestWithAI = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          task: 'suggest-keywords',
          appData: { name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios', keywords: simKeywords.split(',').map(k => k.trim()) },
          count: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      if (Array.isArray(data.result)) setSuggestedKeywords(data.result);
    } catch (err: unknown) {
      setSuggestError(err instanceof Error ? err.message : 'AI suggestion failed');
    } finally {
      setSuggestLoading(false);
    }
  }, [simKeywords]);

  const researchRealKeywords = useCallback(async () => {
    setRealKeywordsLoading(true);
    try {
      const _appData = { name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios' };
      const seeds = [_appData.name, _appData.category, ..._appData.name.split(/\s+/).filter((w: string) => w.length > 2)];
      const allSuggestions: string[] = [];
      for (const seed of seeds.slice(0, 4)) {
        try {
          const res = await apiFetch('/api/scrape/keywords', {
            method: 'POST',
            body: JSON.stringify({ term: seed.toLowerCase(), country }),
          });
          const data = await res.json();
          if (data.suggestions) allSuggestions.push(...data.suggestions);
        } catch {}
      }
      const unique = [...new Set(allSuggestions)];
      setRealKeywords(unique);
      if (unique.length > 0) {
        setSuggestLoading(true);
        try {
          const res = await apiFetch('/api/ai', {
            method: 'POST',
            body: JSON.stringify({
              task: 'suggest-keywords',
              appData: { ..._appData, keywords: unique.slice(0, 20) },
              realSuggestions: unique,
              count: 15,
            }),
          });
          const data = await res.json();
          if (Array.isArray(data.result)) setSuggestedKeywords(data.result);
        } catch {}
        setSuggestLoading(false);
      }
    } catch {}
    setRealKeywordsLoading(false);
  }, [country]);

  const mult = COUNTRY_MULTIPLIERS[country].mult;

  const filtered = useMemo(() => {
    let data = KEYWORDS_DATA.filter(k => k.keyword.toLowerCase().includes(search.toLowerCase()));
    
    // Apply filter
    if (filter === 'tracking') data = data.filter(k => k.rank <= 3);
    else if (filter === 'opportunities') data = data.filter(k => k.difficulty < 35 && k.rank > 2);
    else if (filter === 'declining') data = data.filter(k => k.change <= 2);
    
    data.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortAsc ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return data;
  }, [search, sortKey, sortAsc, filter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  // Simulator predictions
  const simPredictions = useMemo(() => {
    const titleWords = simTitle.toLowerCase().split(/\s+/);
    const kwWords = simKeywords.toLowerCase().split(/,\s*/);
    return KEYWORDS_DATA.slice(0, 10).map(k => {
      const inTitle = titleWords.some(w => k.keyword.includes(w));
      const inKw = kwWords.some(w => k.keyword.includes(w));
      let delta = 0;
      if (inTitle) delta += Math.floor(Math.random() * 5) + 3;
      if (inKw) delta += Math.floor(Math.random() * 3) + 1;
      return { ...k, predicted: Math.max(1, k.rank - delta), delta };
    });
  }, [simTitle, simKeywords]);

  const SortIcon = ({ col }: { col: SortKey }) => (
    sortKey === col
      ? (sortAsc ? <ArrowUp className="w-3 h-3 inline ml-0.5 text-emerald-500" /> : <ArrowDown className="w-3 h-3 inline ml-0.5 text-emerald-500" />)
      : <ArrowUpDown className="w-3 h-3 inline ml-0.5 opacity-0 group-hover:opacity-30 transition-opacity" />
  );

  const FILTERS: { id: FilterType; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: KEYWORDS_DATA.length },
    { id: 'tracking', label: 'Tracking', count: KEYWORDS_DATA.filter(k => k.rank <= 3).length },
    { id: 'opportunities', label: 'Opportunities', count: KEYWORDS_DATA.filter(k => k.difficulty < 35 && k.rank > 2).length },
    { id: 'declining', label: 'Declining', count: KEYWORDS_DATA.filter(k => k.change <= 2).length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Keywords</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Tracking {KEYWORDS_DATA.length} keywords for {app?.name || 'your app'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshSparklines}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all duration-150 active:scale-[0.98]"
            title="Refresh trend data"
          >
            <RefreshCw className="w-4 h-4" /> Trends
          </button>
          <button
            onClick={researchRealKeywords}
            disabled={realKeywordsLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-150 disabled:opacity-50 active:scale-[0.98]"
          >
            {realKeywordsLoading ? <Spinner /> : <Search className="w-4 h-4" />} {realKeywordsLoading ? 'Researching...' : 'Research Keywords'}
          </button>
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              showSimulator
                ? 'bg-emerald-500 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            )}
          >
            <Sparkles className="w-4 h-4" /> What If
          </button>
        </div>
      </div>

      {/* Simulator Panel - two column layout */}
      {showSimulator && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            <Sparkles className="w-4 h-4" /> Metadata "What If" Simulator
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Edit */}
            <div className="space-y-4">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Edit Metadata</div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Title</label>
                <input value={simTitle} onChange={e => setSimTitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Subtitle</label>
                <input value={simSubtitle} onChange={e => setSimSubtitle(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Keywords</label>
                <input value={simKeywords} onChange={e => setSimKeywords(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors" />
              </div>
              <div className="flex gap-2">
                <button onClick={simulateWithAI} disabled={aiSimLoading} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 flex items-center gap-1.5 active:scale-[0.98]">
                  {aiSimLoading ? <Spinner /> : <Sparkles className="w-4 h-4" />} {aiSimLoading ? 'Simulating...' : 'Simulate'}
                </button>
                <button onClick={suggestWithAI} disabled={suggestLoading} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 flex items-center gap-1.5 active:scale-[0.98]">
                  {suggestLoading ? <Spinner /> : <Sparkles className="w-4 h-4" />} {suggestLoading ? 'Suggesting...' : 'Suggest'}
                </button>
              </div>
              {aiSimError && <div className="text-sm text-red-500">{aiSimError}</div>}
              {suggestError && <div className="text-sm text-red-500">{suggestError}</div>}
            </div>

            {/* Right: Preview changes */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {aiSimResults ? 'AI-Predicted Impact' : 'Predicted Impact'}
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 space-y-1">
                {aiSimResults ? (
                  <>
                    {aiSimResults.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                        <span className="text-neutral-700 dark:text-neutral-300 truncate flex-1">{p.keyword}</span>
                        <span className={clsx('font-medium text-xs tabular-nums', String(p.predictedRankChange).includes('+') ? 'text-emerald-600 dark:text-emerald-400' : String(p.predictedRankChange).includes('-') ? 'text-red-500' : 'text-neutral-400')}>{p.predictedRankChange}</span>
                      </div>
                    ))}
                    {aiSimRecommendation && (
                      <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-400">
                        <strong>Recommendation:</strong> {aiSimRecommendation}
                      </div>
                    )}
                  </>
                ) : (
                  simPredictions.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                      <span className="text-neutral-700 dark:text-neutral-300 truncate flex-1">{p.keyword}</span>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className="text-neutral-400 text-xs">#{p.rank}</span>
                        <span className="text-neutral-300">→</span>
                        <span className={clsx('text-xs font-medium', p.delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400')}>#{p.predicted}</span>
                        {p.delta > 0 && <span className="text-emerald-500 text-[10px]">↑{p.delta}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Country + Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search keywords..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors"
            />
          </div>
          {/* Country selector with flag */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">{COUNTRY_MULTIPLIERS[country].flag}</span>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors"
            >
              {Object.entries(COUNTRY_MULTIPLIERS).map(([code, { label, flag }]) => (
                <option key={code} value={code}>{flag} {label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Filter pills */}
        <div className="inline-flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                filter === f.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              {f.label} <span className="text-neutral-400 ml-0.5">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Real App Store Keywords */}
      {realKeywords.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-400 mb-3">
            <Search className="w-4 h-4" /> App Store Autocomplete ({realKeywords.length} keywords)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {realKeywords.map((kw, i) => (
              <span key={i} className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggested Keywords */}
      {suggestedKeywords.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-3">
            <Sparkles className="w-4 h-4" /> AI-Suggested Keywords
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {suggestedKeywords.map((k, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                <div>
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{k.keyword}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{k.reasoning}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">{k.estimatedVolume}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">{k.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-sm">
                {([['keyword', 'Keyword'], ['volume', 'Volume'], ['difficulty', 'Difficulty'], ['rank', 'Rank'], ['change', 'Change']] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)} className="group px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 select-none transition-colors">
                    {label} <SortIcon col={key} />
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Trend</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Since</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, idx) => (
                <tr key={k.id} className={clsx(
                  'border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-emerald-50/50 dark:hover:bg-neutral-800/40 transition-colors duration-100 cursor-pointer',
                  idx % 2 === 1 && 'bg-neutral-50/50 dark:bg-neutral-800/10'
                )}>
                  <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{k.keyword}</td>
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400 tabular-nums">{Math.round(k.volume * mult).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><DifficultyDot value={k.difficulty} /></td>
                  <td className="px-4 py-2.5 font-mono text-neutral-700 dark:text-neutral-300 tabular-nums">#{k.rank}</td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('flex items-center gap-1 font-medium text-xs', k.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : k.change < 0 ? 'text-red-500' : 'text-neutral-400')}>
                      {k.change > 0 ? <TrendingUp className="w-3 h-3" /> : k.change < 0 ? <ArrowDown className="w-3 h-3" /> : null}
                      {k.change > 0 ? `+${k.change}` : k.change === 0 ? '—' : k.change}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><Sparkline data={k.sparkline} color={k.change > 5 ? '#10b981' : k.change <= 2 ? '#ef4444' : '#f59e0b'} /></td>
                  <td className="px-4 py-2.5 text-neutral-400 text-xs">{k.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}