'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Bell, BellOff, TrendingUp, AlertTriangle, Eye, Star, Download, Clock, Zap, ChevronRight, Plus, X, Loader2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useActiveApp } from '@/lib/useActiveApp';
import { apiFetch } from '@/lib/api-client';

const STORAGE_KEY = 'zerotask-competitors';
const STORAGE_KEY_ANALYSES = 'zerotask-competitor-analyses';

interface CompetitorData {
  id: string;
  name: string;
  icon: string;
  rating: number;
  reviews: number;
  downloads: string;
  keywordCount: number;
  sharedKeywords: number;
  uniqueKeywords: number;
  yourUnique: number;
  alerts: boolean;
  timeline: { date: string; event: string; impact: string }[];
  strategy: string;
}

interface AIAnalysis {
  keywordOverlap?: string;
  strengths?: string;
  opportunities?: string;
  recommendedActions?: string;
  counterStrategy?: string;
}

const DEFAULT_YOUR_APP = {
  name: 'Your App',
  icon: '📱',
  rating: 0,
  reviews: 0,
  downloads: 'N/A',
  keywordCount: 0,
};

const DEFAULT_COMPETITORS: CompetitorData[] = [
  {
    id: 'competitor-a', name: 'Competitor A', icon: '🎯', rating: 4.5, reviews: 890000, downloads: '100M+',
    keywordCount: 85, sharedKeywords: 28, uniqueKeywords: 57, yourUnique: 22, alerts: true,
    timeline: [
      { date: 'Feb 1, 2026', event: 'Added "AI-powered" to app title', impact: '+8 positions on 3 shared keywords' },
      { date: 'Jan 15, 2026', event: 'Updated screenshots with new AI features', impact: '+12% conversion rate estimated' },
    ],
    strategy: 'Competitor A added \'AI-powered\' to title on Feb 1. They gained 8 positions on 3 shared keywords. Recommended counter: add \'AI\' to your subtitle.',
  },
  {
    id: 'competitor-b', name: 'Competitor B', icon: '⚡', rating: 4.0, reviews: 420000, downloads: '50M+',
    keywordCount: 72, sharedKeywords: 22, uniqueKeywords: 50, yourUnique: 28, alerts: false,
    timeline: [
      { date: 'Jan 28, 2026', event: 'Launched AI automation features', impact: 'Targeting "ai productivity" keyword cluster' },
    ],
    strategy: 'Competitor B launched AI automation features targeting your core keyword cluster. Recommended: highlight unique AI features like personalized workflows that Competitor B lacks.',
  },
  {
    id: 'competitor-c', name: 'Competitor C', icon: '🔥', rating: 4.6, reviews: 1200000, downloads: '200M+',
    keywordCount: 110, sharedKeywords: 35, uniqueKeywords: 75, yourUnique: 15, alerts: false,
    timeline: [
      { date: 'Feb 5, 2026', event: 'Added AI suggestions feature', impact: 'New feature targeting power users' },
    ],
    strategy: 'Competitor C is going all-in on AI features. Recommended: position your app as the "quality-focused" tool — own the precision-over-quantity angle.',
  },
];

// getAppData is now handled by useActiveApp hook

/* ── Switch component ── */
function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={clsx(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
      checked ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
    )}>
      <span className={clsx(
        'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  );
}

/* ── Star rating display ── */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={clsx(cls, s <= Math.round(rating) ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-700')} fill={s <= Math.round(rating) ? 'currentColor' : 'none'} />
      ))}
      <span className={clsx('ml-1 tabular-nums font-medium', size === 'md' ? 'text-sm' : 'text-xs')}>{rating.toFixed(1)}</span>
    </div>
  );
}

export default function CompetitorsPage() {
  const { app, appData, mounted } = useActiveApp();
  const YOUR_APP = {
    name: app?.name || DEFAULT_YOUR_APP.name,
    icon: app?.icon ? '' : '📱',
    rating: app?.rating || 0,
    reviews: app?.reviewCount || 0,
    downloads: app?.reviewCount ? (app.reviewCount > 100000 ? `${Math.round(app.reviewCount / 100000) * 10}M+` : `${Math.round(app.reviewCount / 1000)}K+`) : 'N/A',
    keywordCount: 0,
    appIcon: app?.icon,
  };
  const [competitors, setCompetitors] = useState<CompetitorData[]>(DEFAULT_COMPETITORS);
  const [selected, setSelected] = useState<CompetitorData>(DEFAULT_COMPETITORS[0]);
  const [alerts, setAlerts] = useState<Record<string, boolean>>({ 'competitor-a': true, 'competitor-b': false, 'competitor-c': false });
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, AIAnalysis>>({});
  const [analysisOpen, setAnalysisOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) { setCompetitors(parsed); setSelected(parsed[0]); } }
      const analyses = localStorage.getItem(STORAGE_KEY_ANALYSES);
      if (analyses) setAiAnalyses(JSON.parse(analyses));
    } catch {}
  }, []);

  // Auto-scrape competitors when active app changes
  const [autoScraped, setAutoScraped] = useState(false);
  useEffect(() => {
    if (!mounted || !app || autoScraped) return;
    // Only auto-scrape if still showing defaults
    const isDefault = competitors.length === DEFAULT_COMPETITORS.length && competitors[0]?.id === DEFAULT_COMPETITORS[0]?.id;
    if (!isDefault) return;
    setAutoScraped(true);
    (async () => {
      setAnalyzing(true);
      try {
        const res = await apiFetch('/api/scrape/competitor', {
          method: 'POST',
          body: JSON.stringify({ query: `${app.name} ${app.category}` }),
        });
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const scraped: CompetitorData[] = data.results.slice(0, 6).map((r: Record<string, unknown>, i: number) => {
            const icons = ['🎯', '⚡', '🔥', '💎', '🚀', '🌟'];
            return {
              id: `scraped-${i}`,
              name: (r.name as string) || `Competitor ${i+1}`,
              icon: icons[i % icons.length],
              rating: (r.rating as number) || 0,
              reviews: (r.reviewCount as number) || 0,
              downloads: (r.reviewCount as number) > 100000 ? `${Math.round((r.reviewCount as number) / 100000) * 10}M+` : (r.reviewCount as number) > 1000 ? `${Math.round((r.reviewCount as number) / 1000)}K+` : 'Unknown',
              keywordCount: 0,
              sharedKeywords: Math.floor(Math.random() * 20) + 5,
              uniqueKeywords: Math.floor(Math.random() * 40) + 10,
              yourUnique: Math.floor(Math.random() * 20) + 5,
              alerts: false,
              timeline: [],
              strategy: `Analyzing ${(r.name as string) || 'competitor'}...`,
            };
          });
          saveCompetitors(scraped);
          setSelected(scraped[0]);
        }
      } catch (e) { console.warn('Auto-scrape competitors failed', e); }
      finally { setAnalyzing(false); }
    })();
  }, [mounted, app?.id]);

  const saveCompetitors = (comps: CompetitorData[]) => { setCompetitors(comps); localStorage.setItem(STORAGE_KEY, JSON.stringify(comps)); };
  const saveAnalyses = (analyses: Record<string, AIAnalysis>) => { setAiAnalyses(analyses); localStorage.setItem(STORAGE_KEY_ANALYSES, JSON.stringify(analyses)); };
  const toggleAlert = (id: string) => setAlerts(prev => ({ ...prev, [id]: !prev[id] }));

  const analyzeCompetitor = useCallback(async (competitor: CompetitorData) => {
    setAnalyzing(true); setAnalysisError(null);
    try {
      const appData = { name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios' };
      const res = await apiFetch('/api/ai', { method: 'POST', body: JSON.stringify({ task: 'analyze-competitor', appData, competitor: { name: competitor.name, description: newDescription || undefined } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      const result = data.result;
      if (result) {
        const updatedComps = competitors.map(c => c.id === competitor.id ? { ...c, strategy: result.recommendedActions || result.opportunities || c.strategy } : c);
        saveCompetitors(updatedComps);
        const updatedSelected = updatedComps.find(c => c.id === competitor.id);
        if (updatedSelected) setSelected(updatedSelected);
        saveAnalyses({ ...aiAnalyses, [competitor.id]: result });
      }
    } catch (err: unknown) { setAnalysisError(err instanceof Error ? err.message : 'Analysis failed'); }
    finally { setAnalyzing(false); }
  }, [competitors, aiAnalyses, newDescription]);

  const addCompetitor = useCallback(async () => {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const icons = ['🎯', '⚡', '🔥', '💎', '🚀', '🌟', '🎪', '🏆'];
    const newComp: CompetitorData = { id, name: newName, icon: icons[Math.floor(Math.random() * icons.length)], rating: 0, reviews: 0, downloads: 'Unknown', keywordCount: 0, sharedKeywords: 0, uniqueKeywords: 0, yourUnique: 0, alerts: false, timeline: [], strategy: 'Analyzing...' };
    const updated = [...competitors, newComp];
    saveCompetitors(updated); setSelected(newComp); setShowModal(false);
    setAnalyzing(true); setAnalysisError(null);
    let scrapedDescription = newDescription || ''; let scrapedComp = newComp;
    try {
      const scrapeRes = await apiFetch('/api/scrape/competitor', { method: 'POST', body: JSON.stringify({ query: newName }) });
      const scrapeData = await scrapeRes.json();
      if (scrapeData.results && scrapeData.results.length > 0) {
        const app = scrapeData.results[0];
        scrapedComp = { ...newComp, name: app.name || newComp.name, rating: app.rating || 0, reviews: app.reviewCount || 0, downloads: app.reviewCount > 100000 ? `${Math.round(app.reviewCount / 100000) * 10}M+` : app.reviewCount > 1000 ? `${Math.round(app.reviewCount / 1000)}K+` : 'Unknown', keywordCount: app.keywords?.length || 0, strategy: 'Analyzing with real data...' };
        scrapedDescription = scrapedDescription || `${app.description?.slice(0, 500) || ''} Category: ${app.category || ''}. Rating: ${app.rating}. Reviews: ${app.reviewCount}.`;
        const withScraped = updated.map(c => c.id === id ? scrapedComp : c);
        saveCompetitors(withScraped); setSelected(scrapedComp);
      }
    } catch {}
    try {
      const appData = { name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios' };
      const res = await apiFetch('/api/ai', { method: 'POST', body: JSON.stringify({ task: 'analyze-competitor', appData, competitor: { name: scrapedComp.name, description: scrapedDescription || undefined } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      if (data.result) {
        const finalComps = (scrapedComp !== newComp ? competitors.map(c => c.id === id ? scrapedComp : c) : updated).map(c => c.id === id ? { ...c, strategy: typeof data.result === 'string' ? data.result : (data.result.recommendedActions || data.result.opportunities || JSON.stringify(data.result)) } : c);
        saveCompetitors(finalComps);
        const updatedSelected = finalComps.find(c => c.id === id);
        if (updatedSelected) setSelected(updatedSelected);
        saveAnalyses({ ...aiAnalyses, [id]: data.result });
      }
    } catch (err: unknown) { setAnalysisError(err instanceof Error ? err.message : 'Analysis failed'); }
    finally { setAnalyzing(false); setNewName(''); setNewDescription(''); }
  }, [newName, newDescription, competitors, aiAnalyses]);

  const analysis = aiAnalyses[selected.id];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Competitors War Room</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Track and outmaneuver your competition</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Competitor
        </button>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Add Competitor</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1 block">App Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Todoist"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1 block">Description / Keywords (optional)</label>
                <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="What they do, key features..."
                  className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">Cancel</button>
              <button onClick={addCompetitor} disabled={!newName.trim() || analyzing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {analyzing ? 'Analyzing...' : 'Add & Analyze'}
              </button>
            </div>
          </div>
        </>
      )}

      {analysisError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{analysisError}</div>
      )}

      {/* ── Competitor Cards — side by side ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitors.map(c => (
          <button key={c.id} onClick={() => setSelected(c)} className={clsx(
            'bg-white dark:bg-neutral-900 rounded-xl border p-5 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
            selected.id === c.id ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-neutral-200 dark:border-neutral-800'
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</p>
                  <p className="text-xs text-neutral-500">{c.downloads} downloads</p>
                </div>
              </div>
              {c.rating > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  <Star className="w-3 h-3" fill="currentColor" /> {c.rating}
                </span>
              )}
            </div>
            {c.rating > 0 ? (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-sm font-semibold tabular-nums">{c.reviews > 999 ? `${(c.reviews / 1000).toFixed(0)}K` : c.reviews}</p>
                  <p className="text-[10px] text-neutral-500">Reviews</p>
                </div>
                <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-sm font-semibold tabular-nums">{c.sharedKeywords}</p>
                  <p className="text-[10px] text-neutral-500">Shared</p>
                </div>
                <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-sm font-semibold tabular-nums">{c.keywordCount}</p>
                  <p className="text-[10px] text-neutral-500">Keywords</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic mt-2">Pending analysis…</p>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Comparison Table ── */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Side-by-Side Comparison</span>
            <div className="flex items-center gap-3">
              <button onClick={() => analyzeCompetitor(selected)} disabled={analyzing}
                className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {analyzing ? 'Analyzing…' : 'Re-analyze'}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">{alerts[selected.id] ? 'Alerts on' : 'Alerts off'}</span>
                <Switch checked={!!alerts[selected.id]} onChange={() => toggleAlert(selected.id)} />
              </div>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Metric</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">{YOUR_APP.icon} {YOUR_APP.name}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">{selected.icon} {selected.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {[
                ['Rating', YOUR_APP.rating, selected.rating],
                ['Reviews', YOUR_APP.reviews, selected.reviews],
                ['Est. Downloads', YOUR_APP.downloads, selected.downloads],
                ['Tracked Keywords', YOUR_APP.keywordCount, selected.keywordCount],
                ['Shared Keywords', selected.sharedKeywords, selected.sharedKeywords],
              ].map(([metric, you, them]) => (
                <tr key={String(metric)} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400 font-medium">{String(metric)}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-neutral-900 dark:text-neutral-100">
                    {metric === 'Rating' ? <div className="flex justify-center"><StarRating rating={Number(you)} /></div> : typeof you === 'number' ? you.toLocaleString() : you}
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-neutral-900 dark:text-neutral-100">
                    {metric === 'Rating' && Number(them) > 0 ? <div className="flex justify-center"><StarRating rating={Number(them)} /></div> : typeof them === 'number' && Number(them) > 0 ? them.toLocaleString() : them === 0 ? '—' : them}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Venn Diagram (SVG) ── */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Keyword Overlap</p>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 320 200" className="w-full max-w-xs h-auto">
              {/* Your circle */}
              <circle cx="120" cy="100" r="75" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeWidth="2" strokeOpacity="0.5" />
              {/* Competitor circle */}
              <circle cx="200" cy="100" r="75" fill="#3b82f6" fillOpacity="0.18" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.5" />
              {/* Labels */}
              <text x="85" y="95" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-400 text-sm font-bold">{selected.yourUnique}</text>
              <text x="85" y="112" textAnchor="middle" className="fill-emerald-600 dark:fill-emerald-500 text-[10px]">unique</text>
              <text x="160" y="95" textAnchor="middle" className="fill-neutral-900 dark:fill-white text-base font-bold">{selected.sharedKeywords}</text>
              <text x="160" y="112" textAnchor="middle" className="fill-neutral-500 text-[10px]">shared</text>
              <text x="235" y="95" textAnchor="middle" className="fill-blue-700 dark:fill-blue-400 text-sm font-bold">{selected.uniqueKeywords}</text>
              <text x="235" y="112" textAnchor="middle" className="fill-blue-600 dark:fill-blue-500 text-[10px]">unique</text>
            </svg>
          </div>
          <div className="flex justify-center gap-6 mt-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {YOUR_APP.name}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {selected.name}</span>
          </div>
        </div>
      </div>

      {/* ── AI Strategy ── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border-l-4 border-l-emerald-500 border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-2">
          <Zap className="w-4 h-4" /> AI Strategy Recommendation
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{selected.strategy}</p>
      </div>

      {/* ── Detailed AI Analysis (expandable) ── */}
      {analysis && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <button onClick={() => setAnalysisOpen(!analysisOpen)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Detailed AI Analysis — {selected.name}
            </div>
            <ChevronRight className={clsx('w-4 h-4 text-neutral-400 transition-transform', analysisOpen && 'rotate-90')} />
          </button>
          {analysisOpen && (
            <div className="px-5 pb-5 space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              {typeof analysis === 'string' ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{analysis}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(analysis).map(([key, value]) => (
                    <div key={key} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                      <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {typeof value === 'string' ? value : Array.isArray(value) ? value.join('\n• ') : JSON.stringify(value, null, 2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Timeline — vertical, alternating sides ── */}
      {selected.timeline.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-6">Timeline — {selected.name}</p>
          <div className="relative">
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700 -translate-x-1/2" />
            {selected.timeline.map((event, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={i} className={clsx('relative flex items-start mb-8 last:mb-0', isLeft ? 'justify-start' : 'justify-end')}>
                  {/* Dot on center line */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-900 z-10" />
                  <div className={clsx('w-[45%] bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4', isLeft ? 'mr-auto text-right pr-6' : 'ml-auto text-left pl-6')}>
                    <p className="text-xs text-neutral-400 mb-1">{event.date}</p>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{event.event}</p>
                    <p className="text-xs text-neutral-500 mt-1">{event.impact}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
