'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Star, TrendingUp, TrendingDown, MessageSquare, Lightbulb, Sparkles, ChevronRight, ChevronDown, ArrowRight, Bug, DollarSign, Image, HelpCircle, Heart, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { getBrandVoice } from '@/lib/brand-voice';
import { useActiveApp } from '@/lib/useActiveApp';
import { apiFetch } from '@/lib/api-client';

// --- Mock Reviews ---
const REVIEWS = [
  { id: 1, rating: 1, text: "App crashes every time I try to create a task. Completely unusable. I've tried reinstalling 3 times.", topics: ['Crashes'], date: '2026-02-10', author: 'frustrated_user22' },
  { id: 2, rating: 1, text: "Crashed on my iPhone 13 after the latest update. Lost all my saved templates. Very disappointed.", topics: ['Crashes'], date: '2026-02-09', author: 'jmiller88' },
  { id: 3, rating: 1, text: "Force closes when pasting content. Fix this ASAP!", topics: ['Crashes'], date: '2026-02-07', author: 'prodJenn' },
  { id: 4, rating: 2, text: "The app is okay but crashes frequently when generating suggestions on iPad.", topics: ['Crashes'], date: '2026-02-05', author: 'tabletUser' },
  { id: 5, rating: 1, text: "Keeps crashing mid-generation. I've lost great suggestions. Going back to doing it manually.", topics: ['Crashes'], date: '2026-02-03', author: 'mike_tasks' },
  { id: 6, rating: 2, text: "After the update it crashes on startup. Please fix urgently.", topics: ['Crashes'], date: '2026-01-30', author: 'earlyAdopter' },
  { id: 7, rating: 1, text: "Crash crash crash. That's all this app does now. Used to be great for managing tasks.", topics: ['Crashes'], date: '2026-01-28', author: 'loyalUser_gone' },
  { id: 8, rating: 2, text: "Random crashes when importing data from other apps. Lost my best workflow templates.", topics: ['Crashes'], date: '2026-01-25', author: 'dataBrowser' },
  { id: 9, rating: 2, text: "$9.99/month for a task assistant? Are you kidding me? Way too expensive.", topics: ['Subscription Price'], date: '2026-02-11', author: 'budgetMinded' },
  { id: 10, rating: 1, text: "The free version only gives 3 tasks a day. Everything useful is behind a paywall.", topics: ['Subscription Price'], date: '2026-02-08', author: 'freeTier_fan' },
  { id: 11, rating: 2, text: "I'd pay $4.99 but $9.99 is insane for a productivity tool. ChatGPT is cheaper!", topics: ['Subscription Price'], date: '2026-02-06', author: 'priceWatcher' },
  { id: 12, rating: 3, text: "Good app but the subscription price is hard to justify. Maybe offer a lifetime option?", topics: ['Subscription Price'], date: '2026-02-04', author: 'casual_user' },
  { id: 13, rating: 2, text: "Why did you raise the price? It was $4.99 last month. Not cool.", topics: ['Subscription Price'], date: '2026-02-01', author: 'longTimeUser' },
  { id: 14, rating: 2, text: "No way I'm paying monthly for basic task suggestions. Make the template generator free at least.", topics: ['Subscription Price'], date: '2026-01-29', author: 'taskLover' },
  { id: 15, rating: 3, text: "Decent app but the pricing model needs work. Too expensive for students who need it most.", topics: ['Subscription Price'], date: '2026-01-26', author: 'student_user' },
  { id: 16, rating: 2, text: "Output quality is inconsistent. Sometimes the AI suggests generic stuff I'd never use.", topics: ['Message Quality'], date: '2026-02-10', author: 'qualityMatters' },
  { id: 17, rating: 3, text: "Love the concept but suggested outputs don't always match my style. Please fix!", topics: ['Message Quality'], date: '2026-02-08', author: 'prefsMatter' },
  { id: 18, rating: 2, text: "Why can't I customize the tone more? The outputs sound too formal sometimes.", topics: ['Message Quality'], date: '2026-02-05', author: 'filterFan' },
  { id: 19, rating: 3, text: "Some suggestions are great but too many feel robotic. Needs better AI.", topics: ['Message Quality'], date: '2026-02-02', author: 'aiExpector' },
  { id: 20, rating: 2, text: "The AI doesn't understand context well. My team can tell it's AI-generated.", topics: ['Message Quality'], date: '2026-01-30', author: 'prefIgnored' },
  { id: 21, rating: 3, text: "Support for more integrations would be amazing. Currently only works well with a few apps.", topics: ['Message Quality'], date: '2026-01-27', author: 'integrationFan' },
  { id: 22, rating: 2, text: "I can't figure out how to import my data. The UI is so confusing.", topics: ['UI Confusion'], date: '2026-02-11', author: 'newUser_lost' },
  { id: 23, rating: 3, text: "Too many menus and options. It takes forever to get a simple suggestion.", topics: ['UI Confusion'], date: '2026-02-09', author: 'simpleUI_please' },
  { id: 24, rating: 2, text: "Where is the settings panel? I've been looking for 10 minutes.", topics: ['UI Confusion'], date: '2026-02-06', author: 'settingsWhere' },
  { id: 25, rating: 3, text: "The copy/paste workflow is clunky. I keep accidentally losing the generated content.", topics: ['UI Confusion'], date: '2026-02-03', author: 'accidentalLoss' },
  { id: 26, rating: 3, text: "UI needs a redesign. It's cluttered and overwhelming for a simple productivity tool.", topics: ['UI Confusion'], date: '2026-01-31', author: 'beginnerUser' },
  { id: 27, rating: 2, text: "Settings are buried 5 levels deep. Why is the output style preference hidden in advanced?", topics: ['UI Confusion'], date: '2026-01-28', author: 'settingsHunter' },
  { id: 28, rating: 5, text: "Best productivity assistant I've ever used! My output quality went through the roof.", topics: ['Love It'], date: '2026-02-12', author: 'happy_user' },
  { id: 29, rating: 5, text: "This app is AMAZING. I used to spend 20 min on a task. Now it takes 30 seconds.", topics: ['Love It'], date: '2026-02-11', author: 'convertedUser' },
  { id: 30, rating: 5, text: "Used this app for a project and finished hours early. This is the future of productivity!", topics: ['Love It'], date: '2026-02-10', author: 'timeSaverFan' },
  { id: 31, rating: 4, text: "Really solid app. The AI suggestions are way better than anything I'd come up with.", topics: ['Love It'], date: '2026-02-09', author: 'taskStarter' },
  { id: 32, rating: 5, text: "I struggle with planning and this app makes project management feel effortless. Worth every penny.", topics: ['Love It'], date: '2026-02-08', author: 'introvert_anna' },
  { id: 33, rating: 4, text: "Love the AI suggestions! They sound natural, not like a robot wrote them.", topics: ['Love It'], date: '2026-02-07', author: 'naturalOutput' },
  { id: 34, rating: 5, text: "Finally an app that helps me stay organized. No more missing deadlines!", topics: ['Love It'], date: '2026-02-06', author: 'organizedNow' },
  { id: 35, rating: 4, text: "Great app overall. The template suggestions are a game-changer for daily planning.", topics: ['Love It'], date: '2026-02-04', author: 'templateFan' },
  { id: 36, rating: 5, text: "My productivity went up 3x in two weeks. Can't recommend it enough!", topics: ['Love It'], date: '2026-02-02', author: 'successStory' },
  { id: 37, rating: 4, text: "Solid 4 stars. Would be 5 if output tone was more consistent. AI quality is fantastic.", topics: ['Love It', 'Message Quality'], date: '2026-01-31', author: 'almostPerfect' },
  { id: 38, rating: 5, text: "Recommended to all my colleagues! The AI suggestions are magic.", topics: ['Love It'], date: '2026-01-29', author: 'wordOfMouth' },
  { id: 39, rating: 4, text: "Very impressed with how it adapts to my style. Outputs actually sound like me.", topics: ['Love It'], date: '2026-01-27', author: 'styleFan' },
  { id: 40, rating: 5, text: "This is what productivity tools should be. Smart, quick, and natural. 10/10.", topics: ['Love It'], date: '2026-01-25', author: 'simplicity_wins' },
  { id: 41, rating: 3, text: "Decent app. Crashes sometimes and UI could be better, but the AI suggestions are solid.", topics: ['Crashes', 'UI Confusion'], date: '2026-02-10', author: 'mixed_feelings' },
  { id: 42, rating: 3, text: "Good concept, mediocre execution. Fix the bugs and you'll have a 5-star tool.", topics: ['Crashes'], date: '2026-02-07', author: 'potentialFan' },
  { id: 43, rating: 1, text: "Subscription expired and I lost access to ALL my saved templates. Terrible!", topics: ['Subscription Price'], date: '2026-02-04', author: 'dataLoss' },
  { id: 44, rating: 4, text: "Really good but please add calendar integration. Would make it perfect.", topics: ['Love It'], date: '2026-02-01', author: 'calendarWanter' },
  { id: 45, rating: 3, text: "AI suggestions are great but the app feels sluggish on older devices.", topics: ['Crashes'], date: '2026-01-29', author: 'oldPhone_user' },
  { id: 46, rating: 2, text: "The daily limit on free tier is way too restrictive. 3 tasks is nothing.", topics: ['Subscription Price'], date: '2026-01-26', author: 'limitHater' },
  { id: 47, rating: 4, text: "Great app! Just wish there was a widget for quick access from my home screen.", topics: ['Love It'], date: '2026-01-24', author: 'widgetWanter' },
  { id: 48, rating: 3, text: "Suggestions are good but I want more control over tone and length.", topics: ['UI Confusion'], date: '2026-01-22', author: 'filterControl' },
  { id: 49, rating: 2, text: "Tried to cancel subscription but the process is intentionally complicated. Dark pattern.", topics: ['Subscription Price'], date: '2026-01-20', author: 'cancelHell' },
  { id: 50, rating: 5, text: "Updated review: after the patch, it's perfect. Best productivity assistant, period.", topics: ['Love It'], date: '2026-01-18', author: 'updatedReview' },
];

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

const FEATURE_REQUESTS = [
  { feature: 'Keyboard extension for quick access', mentions: 18, priority: 'High' },
  { feature: 'More tone/style options', mentions: 14, priority: 'Medium' },
  { feature: 'Voice note transcription', mentions: 12, priority: 'Medium' },
  { feature: 'Lifetime purchase option', mentions: 28, priority: 'High' },
  { feature: 'Widget for quick task entry', mentions: 9, priority: 'Low' },
  { feature: 'Cloud sync for saved templates', mentions: 15, priority: 'High' },
  { feature: 'Team collaboration features', mentions: 22, priority: 'High' },
  { feature: 'Import from more platforms', mentions: 7, priority: 'Low' },
];

const RATING_DIST = [
  { stars: 5, count: 15, color: '#10b981' },
  { stars: 4, count: 8, color: '#34d399' },
  { stars: 3, count: 10, color: '#fbbf24' },
  { stars: 2, count: 12, color: '#f97316' },
  { stars: 1, count: 5, color: '#ef4444' },
];

const MAX_RATING = Math.max(...RATING_DIST.map(r => r.count));

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
  const [aiFeatures, setAiFeatures] = useState(FEATURE_REQUESTS);
  const [aiClusters, setAiClusters] = useState<{ topic: string; count: number; avgRating: number; summary: string }[] | null>(null);
  const [regenResponseLoading, setRegenResponseLoading] = useState<number | null>(null);
  const [showPasteForm, setShowPasteForm] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteRating, setPasteRating] = useState(3);
  const [customReviews, setCustomReviews] = useState<typeof REVIEWS>([]);
  const [realReviews, setRealReviews] = useState<typeof REVIEWS>([]);
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
  }, []);

  const addCustomReview = useCallback(() => {
    if (!pasteText.trim()) return;
    const newReview = { id: 1000 + customReviews.length, rating: pasteRating, text: pasteText.trim(), topics: ['User Submitted'], date: new Date().toISOString().split('T')[0], author: 'pasted_review' };
    const updated = [newReview, ...customReviews]; setCustomReviews(updated); localStorage.setItem('zerotask-custom-reviews', JSON.stringify(updated)); setPasteText(''); setShowPasteForm(false);
  }, [pasteText, pasteRating, customReviews]);

  const allReviews = [...realReviews, ...customReviews, ...REVIEWS];

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
      const review = REVIEWS.find(r => r.id === reviewId); if (!review) return;
      const res = await apiFetch('/api/ai', { method: 'POST', body: JSON.stringify({ task: 'freeform', tier: 'fast', prompt: `Write a professional, empathetic response to this negative app review. Be specific about the issue, show empathy, and offer a solution. Keep it under 200 words.\n\nReview (${review.rating}★): "${review.text}"`, brandVoice: getBrandVoice() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'AI request failed');
      setAiResponses(prev => ({ ...prev, [reviewId]: typeof data.result === 'string' ? data.result : JSON.stringify(data.result) }));
    } catch {} finally { setRegenResponseLoading(null); }
  }, []);

  const clusterStats = useMemo(() =>
    CLUSTERS.map(c => {
      const reviews = REVIEWS.filter(r => r.topics.includes(c.id));
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      return { ...c, count: reviews.length, avg: avg.toFixed(1) };
    }), []);

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
            {RATING_DIST.map(r => (
              <div key={r.stars} className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-500 w-4 text-right tabular-nums">{r.stars}</span>
                <Star className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" />
                <div className="flex-1 h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.count / MAX_RATING) * 100}%`, backgroundColor: r.color }} />
                </div>
                <span className="text-xs text-neutral-500 tabular-nums w-6 text-right">{r.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
            <span className="text-3xl font-bold tabular-nums">{app?.rating?.toFixed(1) || '4.1'}</span>
            <div>
              <StarDisplay rating={Math.round(app?.rating || 4)} />
              <p className="text-xs text-neutral-500 mt-0.5">{app?.reviewCount?.toLocaleString() || '50'} ratings</p>
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
      </div>

      {/* ── Reviews List ── */}
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
    </div>
  );
}
