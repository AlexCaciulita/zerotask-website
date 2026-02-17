'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Star, TrendingUp, MessageSquare, Lightbulb, Sparkles, ChevronRight, ChevronDown, ArrowRight, Bug, DollarSign, Image, HelpCircle, Heart, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { getBrandVoice } from '@/lib/brand-voice';
import { useActiveApp } from '@/lib/useActiveApp';
import { apiFetch } from '@/lib/api-client';
import EmptyState from '@/components/EmptyState';

type Review = { id: number; rating: number; text: string; topics: string[]; date: string; author: string };

const SENTIMENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  negative: { border: 'border-l-red-500', bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-700 dark:text-red-400' },
  mixed: { border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-400' },
  positive: { border: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-700 dark:text-emerald-400' },
};

function getSentiment(id: string): 'positive' | 'negative' | 'mixed' {
  if (id === 'Love It') return 'positive';
  if (id === 'Crashes' || id === 'Subscription Price') return 'negative';
  return 'mixed';
}

const CLUSTERS = [
  { id: 'Crashes', label: 'Crashes', icon: <Bug className="w-4 h-4" />, sentiment: 'negative' as const },
  { id: 'Subscription Price', label: 'Subscription Price', icon: <DollarSign className="w-4 h-4" />, sentiment: 'negative' as const },
  { id: 'Message Quality', label: 'Message Quality', icon: <Image className="w-4 h-4" />, sentiment: 'mixed' as const },
  { id: 'UI Confusion', label: 'UI Confusion', icon: <HelpCircle className="w-4 h-4" />, sentiment: 'mixed' as const },
  { id: 'Love It', label: 'Love It', icon: <Heart className="w-4 h-4" />, sentiment: 'positive' as const },
];

const AI_RESPONSES: Record<number, string> = {
  1: "Hi there, we're so sorry about the crashes you're experiencing! Our team is actively working on a fix that will be in our next update (v3.2.1). In the meantime, please try clearing the app cache in Settings > Storage. We'd love to make this right — reach out to support@yourapp.com.",
  2: "We sincerely apologize for the crashes after the update. We've identified the issue and a hotfix is rolling out this week. We hate that you lost your data — please contact us and we'll help recover what we can.",
  9: "Thank you for your feedback on pricing. We understand the concern and are actively exploring more flexible pricing options, including a lower-cost tier. Stay tuned for announcements soon!",
  10: "We hear you! We're working on expanding the free tier to include more features. Our goal is to make the app accessible to everyone while sustaining development.",
  16: "Thank you for flagging this! We've identified the tone consistency issue and improvements to our AI are coming in the next update. You deserve better suggestions!",
  22: "We appreciate the feedback on navigation! We're redesigning the main menu in our upcoming v4.0 update to make AI features more discoverable. A tutorial walkthrough is also being added.",
};

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />;

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={clsx('w-3.5 h-3.5', s <= rating ? 'text-amber-400' : 'text-neutral-200 dark:text-neutral-700')} fill={s <= rating ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { app, mounted } = useActiveApp();
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [showResponses, setShowResponses] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResponses, setAiResponses] = useState<Record<number, string>>(AI_RESPONSES);
  const [aiFeatures, setAiFeatures] = useState<{ feature: string; mentions: number; priority: string }[]>([]);
  const [aiClusters, setAiClusters] = useState<{ topic: string; count: number; avgRating: number; summary: string }[] | null>(null);
  const [regenResponseLoading, setRegenResponseLoading] = useState<number | null>(null);
  const [showPasteForm, setShowPasteForm] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteRating, setPasteRating] = useState(3);
  const [customReviews, setCustomReviews] = useState<Review[]>([]);
  const [realReviews, setRealReviews] = useState<Review[]>([]);
  const [fetchingReviews, setFetchingReviews] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem('zerotask-custom-reviews'); if (saved) setCustomReviews(JSON.parse(saved)); } catch {}
  }, []);

  // Auto-fetch real reviews when active app changes
  const [autoFetched, setAutoFetched] = useState(false);
  useEffect(() => {
    if (!mounted || !app || autoFetched || realReviews.length > 0) return;
    const appId = app.storeUrl?.match(/id(\d+)/)?.[1];
    if (!appId) return;
    setAutoFetched(true);
    setFetchingReviews(true);
    setFetchError(null);
    (async () => {
      try {
        const res = await apiFetch('/api/scrape/reviews', { method: 'POST', body: JSON.stringify({ appId }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch reviews');
        const mapped = (data.reviews || []).map((r: { id: string; author: string; rating: number; title: string; text: string; date: string }, i: number) => ({
          id: 2000 + i, rating: r.rating, text: r.title ? `${r.title} — ${r.text}` : r.text, topics: ['Real Review'], date: r.date, author: r.author
        }));
        setRealReviews(mapped);
      } catch (err: unknown) { setFetchError(err instanceof Error ? err.message : 'Failed to fetch reviews'); }
      finally { setFetchingReviews(false); }
    })();
  }, [mounted, app?.id]);

  const fetchRealReviews = useCallback(async () => {
    setFetchingReviews(true); setFetchError(null);
    try {
      let appId: string | null = app?.storeUrl?.match(/id(\d+)/)?.[1] || null;
      if (!appId) { appId = prompt('Enter App Store ID (e.g. 595287172 for Todoist):'); if (!appId) { setFetchingReviews(false); return; } }
      const res = await apiFetch('/api/scrape/reviews', { method: 'POST', body: JSON.stringify({ appId }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed to fetch reviews');
      const mapped = (data.reviews || []).map((r: { id: string; author: string; rating: number; title: string; text: string; date: string }, i: number) => ({ id: 2000 + i, rating: r.rating, text: r.title ? `${r.title} — ${r.text}` : r.text, topics: ['Real Review'], date: r.date, author: r.author }));
      setRealReviews(mapped);
    } catch (err: unknown) { setFetchError(err instanceof Error ? err.message : 'Failed to fetch reviews'); }
    finally { setFetchingReviews(false); }
  }, [app?.storeUrl]);

  const addCustomReview = useCallback(() => {
    if (!pasteText.trim()) return;
    const newReview = { id: 1000 + customReviews.length, rating: pasteRating, text: pasteText.trim(), topics: ['User Submitted'], date: new Date().toISOString().split('T')[0], author: 'pasted_review' };
    const updated = [newReview, ...customReviews]; setCustomReviews(updated); localStorage.setItem('zerotask-custom-reviews', JSON.stringify(updated)); setPasteText(''); setShowPasteForm(false);
  }, [pasteText, pasteRating, customReviews]);

  const allReviews = [...realReviews, ...customReviews];

  const analyzeWithAI = useCallback(async () => {
    setAiLoading(true); setAiError(null);
    try {
      const res = await apiFetch('/api/ai', { method: 'POST', body: JSON.stringify({ task: 'analyze-reviews', reviews: allReviews.map(r => ({ text: r.text, rating: r.rating, id: String(r.id) })), brandVoice: getBrandVoice() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'AI request failed');
      const result = data.result;
      if (result?.clusters) setAiClusters(result.clusters);
      if (result?.featureRequests) setAiFeatures(result.featureRequests.map((f: { feature: string; mentions?: number; priority?: string }) => ({ feature: f.feature, mentions: f.mentions || 0, priority: f.priority || 'Medium' })));
      if (result?.responseDrafts) { const newResponses = { ...aiResponses }; if (Array.isArray(result.responseDrafts)) { result.responseDrafts.forEach((d: { reviewId?: string; response?: string }) => { if (d.reviewId && d.response) newResponses[Number(d.reviewId)] = d.response; }); } setAiResponses(newResponses); }
    } catch (err: unknown) { setAiError(err instanceof Error ? err.message : 'AI analysis failed'); }
    finally { setAiLoading(false); }
  }, [aiResponses, allReviews]);

  const generateResponse = useCallback(async (reviewId: number) => {
    setRegenResponseLoading(reviewId);
    try {
      const review = allReviews.find(r => r.id === reviewId); if (!review) return;
      const res = await apiFetch('/api/ai', { method: 'POST', body: JSON.stringify({ task: 'freeform', tier: 'fast', prompt: `Write a professional, empathetic response to this negative app review. Be specific about the issue, show empathy, and offer a solution. Keep it under 200 words.\n\nReview (${review.rating}★): "${review.text}"`, brandVoice: getBrandVoice() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'AI request failed');
      setAiResponses(prev => ({ ...prev, [reviewId]: typeof data.result === 'string' ? data.result : JSON.stringify(data.result) }));
    } catch {} finally { setRegenResponseLoading(null); }
  }, [allReviews]);

  const clusterStats = useMemo(() =>
    CLUSTERS.map(c => {
      const matching = allReviews.filter(r => r.topics.includes(c.id));
      const avg = matching.length > 0 ? matching.reduce((s, r) => s + r.rating, 0) / matching.length : 0;
      return { ...c, count: matching.length, avg: avg.toFixed(1) };
    }), [allReviews]);

  const ratingDist = useMemo(() =>
    [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: allReviews.filter(r => r.rating === stars).length,
      color: stars >= 4 ? '#10b981' : stars === 3 ? '#fbbf24' : stars === 2 ? '#f97316' : '#ef4444',
    })), [allReviews]);
  const maxRating = Math.max(...ratingDist.map(r => r.count), 1);

  const displayReviews = selectedCluster ? allReviews.filter(r => r.topics.includes(selectedCluster)) : allReviews;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Reviews Intelligence</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Analyze sentiment, extract insights, and respond to reviews</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRealReviews} disabled={fetchingReviews}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
            {fetchingReviews ? <Spinner /> : <RefreshCw className="w-4 h-4" />} Fetch Real Reviews
          </button>
          <button onClick={() => setShowPasteForm(!showPasteForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            + Paste Reviews
          </button>
          <button onClick={analyzeWithAI} disabled={aiLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
            {aiLoading ? <Spinner /> : <Sparkles className="w-4 h-4" />} Analyze with AI
          </button>
        </div>
      </div>

      {aiError && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg">{aiError}</div>}
      {fetchError && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg">{fetchError}</div>}
      {realReviews.length > 0 && <div className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 rounded-lg">✅ Loaded {realReviews.length} real reviews from App Store</div>}

      {/* Paste form */}
      {showPasteForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Paste a Real Review</h3>
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={3} placeholder="Paste a review from the App Store or Play Store..."
            className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-transparent outline-none resize-none" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Rating:</span>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setPasteRating(s)}>
                  <Star className={clsx('w-5 h-5', s <= pasteRating ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600')} fill={s <= pasteRating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={() => setShowPasteForm(false)} className="px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">Cancel</button>
            <button onClick={addCustomReview} disabled={!pasteText.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">Add Review</button>
          </div>
        </div>
      )}

      {/* ── Rating Distribution (App Store style horizontal bars) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Rating Distribution</p>
          <div className="space-y-2.5">
            {ratingDist.map(r => (
              <div key={r.stars} className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-500 w-4 text-right tabular-nums">{r.stars}</span>
                <Star className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" />
                <div className="flex-1 h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.count / maxRating) * 100}%`, backgroundColor: r.color }} />
                </div>
                <span className="text-xs text-neutral-500 tabular-nums w-6 text-right">{r.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums">{allReviews.length > 0 ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1) : app?.rating?.toFixed(1) || '—'}</span>
            <div>
              <StarDisplay rating={allReviews.length > 0 ? Math.round(allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) : Math.round(app?.rating || 0)} />
              <p className="text-xs text-neutral-500 mt-0.5">{allReviews.length > 0 ? allReviews.length : app?.reviewCount?.toLocaleString() || '0'} ratings</p>
            </div>
          </div>
        </div>

        {/* What-If Analysis */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border-l-4 border-l-emerald-500 border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm mb-3">
            <Sparkles className="w-4 h-4" /> "What If" Churn Analysis
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">Fix <strong>"Crashes"</strong> (top complaint, 8 reviews):</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-center">
              <p className="text-xs text-neutral-500 mb-2">Projected Rating</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-neutral-400">4.1</span>
                <ArrowRight className="w-4 h-4 text-emerald-500" />
                <span className="text-xl font-bold text-emerald-600">4.5</span>
              </div>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-center">
              <p className="text-xs text-neutral-500 mb-2">Est. Retention Impact</p>
              <p className="text-xl font-bold text-emerald-600">+12%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sentiment Clusters with colored borders ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {clusterStats.map(c => {
          const sent = SENTIMENT_COLORS[c.sentiment];
          return (
            <button key={c.id} onClick={() => setSelectedCluster(selectedCluster === c.id ? null : c.id)} className={clsx(
              'bg-white dark:bg-neutral-900 rounded-xl border-l-4 border border-neutral-200 dark:border-neutral-800 p-4 text-left transition-all hover:shadow-sm',
              sent.border,
              selectedCluster === c.id && 'ring-1 ring-neutral-400 dark:ring-neutral-600'
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className={sent.text}>{c.icon}</span>
                {c.sentiment === 'negative' ? <TrendingUp className="w-3 h-3 text-red-400" /> : c.sentiment === 'positive' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : null}
              </div>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{c.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold tabular-nums">{c.count}</span>
                <span className="text-xs text-neutral-500">avg {c.avg}★</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── AI Analysis (expandable) ── */}
      {aiClusters && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <button onClick={() => setAiAnalysisOpen(!aiAnalysisOpen)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Sparkles className="w-4 h-4 text-emerald-500" /> AI Analysis Results
            </div>
            {aiAnalysisOpen ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
          </button>
          {aiAnalysisOpen && (
            <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiClusters.map(c => (
                  <div key={c.topic} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium">{c.topic}</h4>
                      <span className="text-xs text-neutral-500 tabular-nums">{c.count} reviews · {c.avgRating.toFixed(1)}★</span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{c.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Feature Requests ── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">
          <Lightbulb className="w-4 h-4 text-amber-500" /> Feature Requests
        </div>
        {aiFeatures.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-6">Run AI analysis to extract feature requests from your reviews.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {aiFeatures.sort((a, b) => b.mentions - a.mentions).map(f => (
              <div key={f.feature} className="flex items-start justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{f.feature}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-medium tabular-nums">
                      ↑ {f.mentions}
                    </span>
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-md font-medium',
                      f.priority === 'High' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                      f.priority === 'Medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                    )}>{f.priority}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reviews List ── */}
      {allReviews.length === 0 && !fetchingReviews ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews loaded"
          description="Connect your app to see real reviews, or enter an App Store URL above."
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {selectedCluster ? `${selectedCluster} Reviews` : 'All Reviews'} ({displayReviews.length})
            </p>
            <button onClick={() => setShowResponses(!showResponses)} className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              showResponses ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            )}>
              <MessageSquare className="w-3 h-3" /> {showResponses ? 'Hide' : 'Show'} AI Responses
            </button>
          </div>

          <div className="space-y-2">
            {displayReviews.map(r => {
              const sentiment = r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'mixed';
              const sent = SENTIMENT_COLORS[sentiment];
              return (
                <div key={r.id} className={clsx(
                  'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 border-l-4 rounded-xl p-4 hover:shadow-sm transition-shadow',
                  sent.border
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <StarDisplay rating={r.rating} />
                      <span className="text-xs text-neutral-400">@{r.author}</span>
                    </div>
                    <span className="text-xs text-neutral-400 tabular-nums">{r.date}</span>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{r.text}</p>
                  <div className="flex gap-1.5 mt-2">
                    {r.topics.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium">{t}</span>
                    ))}
                  </div>
                  {showResponses && aiResponses[r.id] && (
                    <div className="mt-3 pl-4 border-l-2 border-emerald-500">
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">AI-Generated Response</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{aiResponses[r.id]}</p>
                    </div>
                  )}
                  {r.rating <= 2 && !aiResponses[r.id] && (
                    <button onClick={() => generateResponse(r.id)} disabled={regenResponseLoading === r.id}
                      className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors">
                      {regenResponseLoading === r.id ? <Spinner /> : <Sparkles className="w-3 h-3" />} Generate Response
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
