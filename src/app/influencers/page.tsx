'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Users, X, Send, DollarSign,
  TrendingUp, ChevronRight, Sparkles, GripVertical, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { getInfluencers as dbGetInfluencers, saveInfluencer, updateInfluencerStage } from '@/lib/db';
import { apiFetch } from '@/lib/api-client';
import EmptyState from '@/components/EmptyState';

type Platform = 'TikTok' | 'Instagram' | 'YouTube';
type PipelineStage = 'discovered' | 'contacted' | 'responded' | 'negotiating' | 'deal' | 'posted' | 'results';

interface Influencer {
  id: string; name: string; initials: string; color: string; platform: Platform;
  followers: string; followersNum: number; engagement: string; niche: string[];
  stage: PipelineStage; email: string; handle: string; outreachHistory: string[];
  cashOffer: number; aiDMs: string[];
}

const COLORS = ['bg-rose-500', 'bg-blue-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500', 'bg-lime-600', 'bg-red-500', 'bg-sky-500', 'bg-fuchsia-500', 'bg-emerald-500', 'bg-yellow-500'];

const STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'discovered', label: 'Discovered', color: 'bg-neutral-400' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-400' },
  { key: 'responded', label: 'Responded', color: 'bg-cyan-400' },
  { key: 'negotiating', label: 'Negotiating', color: 'bg-amber-400' },
  { key: 'deal', label: 'Deal', color: 'bg-emerald-500' },
  { key: 'posted', label: 'Posted', color: 'bg-purple-400' },
  { key: 'results', label: 'Results', color: 'bg-pink-400' },
];

const PLATFORM_BADGE: Record<Platform, { icon: string; bg: string }> = {
  TikTok: { icon: '♪', bg: 'bg-black text-white' },
  Instagram: { icon: '📷', bg: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' },
  YouTube: { icon: '▶', bg: 'bg-red-600 text-white' },
};

function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

const STORAGE_KEY = 'zerotask-influencers-ai';

import { useActiveApp } from '@/lib/useActiveApp';

export default function InfluencersPage() {
  const { app, mounted } = useActiveApp();
  const getAppData = () => ({ name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios' });
  const [view, setView] = useState<'grid' | 'pipeline'>('grid');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Influencer | null>(null);
  const [budget, setBudget] = useState(2000);
  const [dmIndex, setDmIndex] = useState(0);
  const [aiInfluencers, setAiInfluencers] = useState<Influencer[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [dbInfluencers, setDbInfluencers] = useState<Influencer[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) setAiInfluencers(parsed); } } catch {}
    // Load from Supabase
    async function loadFromDb() {
      try {
        const data = await dbGetInfluencers();
        if (data && data.length > 0) {
          const mapped: Influencer[] = data.map((d: Record<string, unknown>, i: number) => ({
            id: (d.id as string) || `db-${i}`,
            name: (d.name as string) || '',
            initials: ((d.name as string) || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
            color: COLORS[i % COLORS.length],
            platform: ((d.platform as string) || 'TikTok') as Platform,
            followers: formatFollowers((d.followers as number) || 0),
            followersNum: (d.followers as number) || 0,
            engagement: (d.engagement as string) || '3.0%',
            niche: Array.isArray(d.niche) ? d.niche : [],
            stage: ((d.stage as string) || 'discovered') as PipelineStage,
            email: (d.email as string) || '',
            handle: (d.handle as string) || '',
            outreachHistory: [],
            cashOffer: (d.cash_offer as number) || 0,
            aiDMs: [],
          }));
          setDbInfluencers(mapped);
        }
      } catch (e) {
        console.warn('Failed to load influencers from Supabase', e);
      }
      setDbLoaded(true);
    }
    loadFromDb();
  }, []);

  const suggestInfluencers = useCallback(async () => {
    setSuggestLoading(true); setSuggestError(null);
    try {
      const appData = getAppData();
      const res = await apiFetch('/api/ai', { method: 'POST', body: JSON.stringify({ task: 'suggest-influencers', appData, count: 8 }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed');
      interface AISuggestion { name?: string; handle?: string; platform?: string; followers?: string; followersNum?: number; engagement?: string; niche?: string | string[]; cashOffer?: number; dmDraft?: string }
      let results: AISuggestion[] = [];
      if (Array.isArray(data.result)) results = data.result;
      else if (typeof data.result === 'string') { const match = data.result.match(/\[[\s\S]*\]/); if (match) results = JSON.parse(match[0]); }
      const newInfluencers: Influencer[] = results.map((r: AISuggestion, i: number) => ({
        id: `ai-${Date.now()}-${i}`, name: r.name || `Influencer ${i + 1}`,
        initials: (r.name || 'AI').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        color: COLORS[i % COLORS.length], platform: (r.platform || 'TikTok') as Platform,
        followers: r.followers || '10K', followersNum: r.followersNum || 10000,
        engagement: r.engagement || '3.0%', niche: Array.isArray(r.niche) ? r.niche : [r.niche || 'General'],
        stage: 'discovered' as PipelineStage, email: '', handle: r.handle || `@${(r.name || 'user').toLowerCase().replace(/\s+/g, '')}`,
        outreachHistory: [], cashOffer: r.cashOffer || 0,
        aiDMs: [r.dmDraft || `Hey ${r.name}! We'd love to collaborate on promoting our app.`, '', ''],
      }));
      setAiInfluencers(newInfluencers); localStorage.setItem(STORAGE_KEY, JSON.stringify(newInfluencers));
    } catch (err: unknown) { setSuggestError(err instanceof Error ? err.message : 'Suggestion failed'); }
    finally { setSuggestLoading(false); }
  }, []);

  const baseInfluencers = dbLoaded && dbInfluencers.length > 0 ? dbInfluencers : [];
  const allInfluencers = [...baseInfluencers, ...aiInfluencers];
  const filtered = allInfluencers.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.platform.toLowerCase().includes(search.toLowerCase()) || i.niche.some(n => n.toLowerCase().includes(search.toLowerCase())));

  const projectedReach = Math.round(budget * 180 + budget * budget * 0.02);
  const projectedInstalls = Math.round(projectedReach * 0.012);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Influencer Discovery</h1>
            <p className="text-sm text-neutral-500">{allInfluencers.length} influencers tracked</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={suggestInfluencers} disabled={suggestLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {suggestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Suggest
          </button>
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            {(['grid', 'pipeline'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                view === v ? 'bg-white dark:bg-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}>
                {v === 'grid' ? 'Grid' : 'Pipeline'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, platform, or niche…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
      </div>

      {/* ── Budget Simulator ── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Budget Simulator</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500 w-8">$0</span>
          <div className="flex-1 relative">
            <input type="range" min={0} max={5000} step={100} value={budget} onChange={e => setBudget(Number(e.target.value))}
              className="w-full accent-emerald-500" />
            <div className="absolute -top-6 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md"
              style={{ left: `${(budget / 5000) * 100}%`, transform: 'translateX(-50%)' }}>
              ${budget.toLocaleString()}
            </div>
          </div>
          <span className="text-xs text-neutral-500 w-10">$5K</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-lg font-bold tabular-nums text-emerald-600">{(projectedReach / 1000).toFixed(0)}K</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Projected Reach</p>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-lg font-bold tabular-nums">{projectedInstalls.toLocaleString()}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Est. Installs</p>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-lg font-bold tabular-nums">${projectedInstalls > 0 ? (budget / projectedInstalls).toFixed(2) : '0'}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Cost/Install</p>
          </div>
        </div>
      </div>

      {suggestError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{suggestError}</div>}

      {/* ── Empty State ── */}
      {dbLoaded && !suggestLoading && allInfluencers.length === 0 && (
        <EmptyState
          icon={Users}
          title="No influencers yet"
          description="Use AI to discover influencers in your niche, or add them manually."
          actionLabel="Discover with AI"
          onAction={suggestInfluencers}
        />
      )}

      {/* ── Grid View ── */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inf => (
            <button key={inf.id} onClick={() => { setSelected(inf); setDmIndex(0); }}
              className="text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-center gap-3 mb-4">
                <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm', inf.color)}>
                  {inf.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{inf.name}</p>
                  <p className="text-xs text-neutral-500">{inf.handle}</p>
                </div>
                {/* Platform badge */}
                <span className={clsx('w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold', PLATFORM_BADGE[inf.platform].bg)}>
                  {PLATFORM_BADGE[inf.platform].icon}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-sm font-semibold tabular-nums">{inf.followers}</p>
                  <p className="text-[10px] text-neutral-500">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold tabular-nums text-emerald-600">{inf.engagement}</p>
                  <p className="text-[10px] text-neutral-500">Engage</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold tabular-nums">{inf.cashOffer > 0 ? `$${inf.cashOffer}` : 'Barter'}</p>
                  <p className="text-[10px] text-neutral-500">Offer</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inf.niche.map(n => (
                  <span key={n} className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-500 font-medium">{n}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Pipeline / Kanban View ── */}
      {view === 'pipeline' && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-[1400px]">
            {STAGES.map(stage => {
              const stageInfluencers = allInfluencers.filter(i => i.stage === stage.key);
              return (
                <div key={stage.key} className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={clsx('w-2 h-2 rounded-full', stage.color)} />
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{stage.label}</span>
                    <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full tabular-nums">{stageInfluencers.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[100px] bg-neutral-50 dark:bg-neutral-800/30 rounded-lg p-2 border border-dashed border-neutral-200 dark:border-neutral-700">
                    {stageInfluencers.map(inf => (
                      <button key={inf.id} onClick={() => { setSelected(inf); setDmIndex(0); }}
                        className="w-full text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 hover:shadow-sm transition-all group">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3 h-3 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold', inf.color)}>
                            {inf.initials}
                          </div>
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{inf.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1.5 pl-8">
                          <span className={clsx('w-4 h-4 rounded text-[8px] flex items-center justify-center font-bold', PLATFORM_BADGE[inf.platform].bg)}>
                            {PLATFORM_BADGE[inf.platform].icon}
                          </span>
                          <span>{inf.followers}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail Panel ── */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[500px] max-w-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 z-50 shadow-2xl overflow-y-auto animate-[slideIn_0.2s_ease-out]">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md', selected.color)}>
                    {selected.initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold', PLATFORM_BADGE[selected.platform].bg)}>
                        {selected.platform}
                      </span>
                      <span className="text-xs text-neutral-500">{selected.handle}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: selected.followers, label: 'Followers' },
                  { val: selected.engagement, label: 'Engagement', accent: true },
                  { val: selected.cashOffer > 0 ? `$${selected.cashOffer}` : 'Barter', label: 'Offer' },
                ].map(s => (
                  <div key={s.label} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-center">
                    <p className={clsx('text-lg font-bold tabular-nums', s.accent && 'text-emerald-600')}>{s.val}</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Contact */}
              {selected.email && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Contact</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{selected.email}</p>
                </div>
              )}

              {/* Outreach History */}
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">Outreach History</p>
                {selected.outreachHistory.length === 0 ? (
                  <p className="text-sm text-neutral-400 italic">No outreach yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {selected.outreachHistory.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        {h}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── AI DMs — chat bubble style ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">AI Outreach Drafts</span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <button key={i} onClick={() => setDmIndex(i)}
                        className={clsx('w-6 h-6 rounded-md text-xs font-medium transition-all',
                          dmIndex === i ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700')}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed shadow-sm">
                    {selected.aiDMs[dmIndex]}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5">
                  <Send className="w-4 h-4" /> Send Outreach
                </button>
                <button className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
