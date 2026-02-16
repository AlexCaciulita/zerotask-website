'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Rocket, ChevronRight, ChevronDown, X, Calendar, BarChart3, Clock,
  CheckCircle2, Circle, Loader2, TrendingUp, Zap, ArrowRight, Sparkles, FileText
} from 'lucide-react';
import clsx from 'clsx';
import { getLaunchSteps, saveLaunchStep, updateLaunchStep as dbUpdateLaunchStep } from '@/lib/db';
import { apiFetch } from '@/lib/api-client';

type StepStatus = 'queued' | 'in-progress' | 'done' | 'measured';

interface Step {
  id: string;
  title: string;
  status: StepStatus;
  description: string;
  aiContent: string;
  notes?: string;
}

interface Week {
  label: string;
  key: string;
  steps: Step[];
}

const STORAGE_KEY = 'zerotask-launch-state';

const STATUS_CONFIG: Record<StepStatus, { icon: React.ReactNode; label: string; pillClass: string }> = {
  queued: { icon: <Circle className="w-3.5 h-3.5" />, label: 'Queued', pillClass: 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400' },
  'in-progress': { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: 'In Progress', pillClass: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
  done: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Done', pillClass: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
  measured: { icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Measured', pillClass: 'text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10' },
};

const STATUS_ORDER: StepStatus[] = ['queued', 'in-progress', 'done', 'measured'];

const DEFAULT_WEEKS: Week[] = [
  {
    label: 'Week -2', key: 'w-2',
    steps: [
      { id: '1', title: 'Finalize listing', status: 'done', description: 'Polish app store listing with optimized title, subtitle, and keyword field.', aiContent: 'Title: "My App — Smart Productivity Tool"\nSubtitle: "Get more done with AI-powered workflows"' },
      { id: '2', title: 'Generate ad creative', status: 'done', description: 'Create ad variations for Apple Search Ads, Meta, and TikTok campaigns.', aiContent: 'Ad Set 1 (Apple Search Ads):\nHeadline: "Stop Wasting Time — Let AI Handle Your Busywork"' },
      { id: '3', title: 'Build landing page', status: 'done', description: 'Create a conversion-optimized landing page.', aiContent: 'Landing page structure:\n1. Hero: "Work Smarter, Not Harder" + app mockup\n2. Feature grid\n3. Productivity stats\n4. Testimonials\n5. Download CTA' },
      { id: '4', title: 'Identify influencers', status: 'done', description: 'Find 15-20 micro-influencers in the productivity/tech niche.', aiContent: 'Top 5 identified:\n1. @prodcoach_jess (TikTok, 85K)\n2. @techlife_mike (Instagram, 120K)\n3. @workflow_queen (TikTok, 200K)' },
      { id: '5', title: 'Draft community posts', status: 'in-progress', description: 'Write posts for Reddit, Product Hunt, and Indie Hackers.', aiContent: 'Reddit Draft (r/productivity):\n"I built an AI assistant that automates your daily busywork — productivity went up 5x"' },
    ],
  },
  {
    label: 'Week -1', key: 'w-1',
    steps: [
      { id: '6', title: 'Send influencer outreach', status: 'in-progress', description: 'Send personalized DMs to identified influencers.', aiContent: 'DM Template:\n"Hey [name]! 👋 Love your content. We\'re building an AI productivity tool — want early access + lifetime premium?"' },
      { id: '7', title: 'Social teases', status: 'in-progress', description: 'Post teaser content building anticipation.', aiContent: 'Tweet thread:\n1/5: "What if AI could handle all your repetitive tasks for you? 🤔"' },
      { id: '8', title: 'Set up tracking', status: 'done', description: 'Configure analytics: RevenueCat, PostHog, UTM tracking.', aiContent: '✅ RevenueCat — subscription events\n✅ PostHog — user behavior\n✅ UTM params — campaign attribution' },
      { id: '9', title: 'Schedule Product Hunt', status: 'queued', description: 'Prepare Product Hunt listing with all assets.', aiContent: 'Product Hunt Listing:\nTagline: "AI that handles your busywork so you can focus on what matters"' },
      { id: '10', title: 'Prepare review requests', status: 'queued', description: 'Draft review request emails to beta testers.', aiContent: 'Email template:\nSubject: "Quick favor? 🙏 Our app is launching!"' },
    ],
  },
  {
    label: '🚀 Launch Day', key: 'launch',
    steps: [
      { id: '11', title: 'Product Hunt live', status: 'queued', description: 'Go live on Product Hunt. Respond to every comment within 15 min.', aiContent: 'Launch checklist:\n⬜ Post goes live at 12:01 AM PST\n⬜ Share link to supporters' },
      { id: '12', title: 'Community posts fire', status: 'queued', description: 'Publish all prepared community posts.', aiContent: 'Posting schedule:\n6:00 AM PST — Reddit r/SideProject\n7:00 AM PST — Reddit r/productivity' },
      { id: '13', title: 'Ads activate', status: 'queued', description: 'Launch Apple Search Ads and Meta campaigns.', aiContent: '🔵 Apple Search Ads — $50/day\n🟣 Meta Ads — $30/day\n🟡 TikTok — $20/day' },
      { id: '14', title: 'Social scheduled', status: 'queued', description: 'All pre-scheduled social media posts go live.', aiContent: '6 AM — "It\'s here! 🚀" tweet\n9 AM — Instagram carousel\n12 PM — Twitter thread' },
      { id: '15', title: 'Monitor & respond', status: 'queued', description: 'Active monitoring of all channels.', aiContent: '📊 Product Hunt rank + upvotes\n📊 App Store downloads\n📊 Social mentions & DMs' },
    ],
  },
  {
    label: 'Week +1', key: 'w+1',
    steps: [
      { id: '16', title: 'Analyze channels', status: 'queued', description: 'Deep analysis of which acquisition channels performed best.', aiContent: 'Channel analysis framework:\n1. Cost per install by channel\n2. Trial start rate by source' },
      { id: '17', title: 'Double down on winners', status: 'queued', description: 'Increase budget on top-performing channels.', aiContent: 'If CPI < $2.00 → Increase budget 50%\nIf CPI > $4 → Pause, reallocate' },
      { id: '18', title: 'Respond to reviews', status: 'queued', description: 'Reply to all App Store reviews.', aiContent: '⭐⭐⭐⭐⭐: "Thank you so much!"\n⭐: "We\'re sorry. Email support@myapp.app"' },
      { id: '19', title: 'Thank influencers', status: 'queued', description: 'Send thank you messages with performance metrics.', aiContent: '"Hey [name]! Your post got [X views, Y clicks]! 🙌"' },
      { id: '20', title: 'Post week 1 update', status: 'queued', description: 'Share week 1 metrics publicly.', aiContent: '"📊 Week 1 Numbers:\n• 2,400 downloads\n• 680 trial starts"' },
    ],
  },
  {
    label: 'Week +2', key: 'w+2',
    steps: [
      { id: '21', title: 'Keyword optimization', status: 'queued', description: 'Analyze keyword rankings and optimize metadata.', aiContent: '📈 Rising: "ai productivity assistant" — add to subtitle\n📉 Dropping: "task app free" — deprioritize' },
      { id: '22', title: 'A/B test screenshots', status: 'queued', description: 'Set up screenshot A/B tests.', aiContent: 'Test 1: Feature-focused vs Lifestyle\nTest 2: Dark vs Light background' },
      { id: '23', title: 'Refresh ad copy', status: 'queued', description: 'Create new ad variations based on performance data.', aiContent: 'Variation A: "Get things done so fast your team thinks you hired an assistant"' },
      { id: '24', title: 'Expand keywords', status: 'queued', description: 'Add new keyword opportunities.', aiContent: '1. "ai task planner" — Vol: 4,500, Diff: 28\n2. "smart workflow app" — Vol: 2,100' },
      { id: '25', title: 'Monitor competitors', status: 'queued', description: 'Track competitor responses to your launch.', aiContent: '🔍 Competitor A — No changes\n🔍 Competitor B — Updated subtitle' },
    ],
  },
];

const PH_COMPARISON = {
  tuesday: { avgUpvotes: 487, topPercent: 'Top 15%', avgComments: 64, featureChance: '22%', avgTraffic: '3,200' },
  thursday: { avgUpvotes: 623, topPercent: 'Top 10%', avgComments: 89, featureChance: '31%', avgTraffic: '4,800' },
};

import { useActiveApp } from '@/lib/useActiveApp';

export default function LaunchPage() {
  const { app, mounted } = useActiveApp();
  const getAppData = () => ({ name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios' });
  const [weeks, setWeeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [launchDay, setLaunchDay] = useState<'tuesday' | 'thursday'>('tuesday');
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [generatingContent, setGeneratingContent] = useState(false);
  const [aiContentOpen, setAiContentOpen] = useState(true);

  useEffect(() => {
    // Load localStorage immediately
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const state = JSON.parse(saved); if (state.weeks) setWeeks(state.weeks); if (state.notes) setStepNotes(state.notes); } } catch {}
    // Then load from Supabase
    const appId = typeof window !== 'undefined' ? (localStorage.getItem('zerotask-active-app') || 'default') : 'default';
    async function loadFromDb() {
      try {
        const data = await getLaunchSteps(appId);
        if (data && data.length > 0) {
          // Map DB rows back into weeks structure
          const newWeeks = DEFAULT_WEEKS.map(w => ({
            ...w,
            steps: w.steps.map(s => {
              const dbStep = data.find((d: Record<string, unknown>) => d.step_key === s.id);
              if (dbStep) {
                return {
                  ...s,
                  status: (dbStep.status as StepStatus) || s.status,
                  notes: (dbStep.notes as string) || s.notes,
                  aiContent: (dbStep.ai_content as string) || s.aiContent,
                };
              }
              return s;
            }),
          }));
          setWeeks(newWeeks);
          const notes: Record<string, string> = {};
          data.forEach((d: Record<string, unknown>) => {
            if (d.notes && d.step_key) notes[d.step_key as string] = d.notes as string;
          });
          if (Object.keys(notes).length > 0) setStepNotes(prev => ({ ...prev, ...notes }));
        } else {
          // Seed defaults
          for (const w of DEFAULT_WEEKS) {
            for (let i = 0; i < w.steps.length; i++) {
              const s = w.steps[i];
              await saveLaunchStep({
                app_id: appId, step_key: s.id, title: s.title,
                description: s.description, status: s.status,
                ai_content: s.aiContent, week_label: w.key, sort_order: i,
              });
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load launch steps from Supabase', e);
      }
    }
    loadFromDb();
  }, []);

  const saveState = (newWeeks: Week[], newNotes?: Record<string, string>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ weeks: newWeeks, notes: newNotes || stepNotes }));
  };

  const cycleStatus = useCallback((stepId: string) => {
    let newStatus: StepStatus = 'queued';
    const newWeeks = weeks.map(w => ({ ...w, steps: w.steps.map(s => { if (s.id !== stepId) return s; const nextIdx = (STATUS_ORDER.indexOf(s.status) + 1) % STATUS_ORDER.length; newStatus = STATUS_ORDER[nextIdx]; return { ...s, status: newStatus }; }) }));
    setWeeks(newWeeks); saveState(newWeeks);
    if (selectedStep?.id === stepId) { const step = newWeeks.flatMap(w => w.steps).find(s => s.id === stepId); if (step) setSelectedStep(step); }
    // Persist to Supabase - find db row by step_key
    const appId = typeof window !== 'undefined' ? (localStorage.getItem('zerotask-active-app') || 'default') : 'default';
    getLaunchSteps(appId).then(data => {
      const dbStep = data?.find((d: Record<string, unknown>) => d.step_key === stepId);
      if (dbStep) dbUpdateLaunchStep(dbStep.id as string, { status: newStatus });
    }).catch(() => {});
  }, [weeks, selectedStep, stepNotes]);

  const updateNotes = useCallback((stepId: string, notes: string) => {
    const newNotes = { ...stepNotes, [stepId]: notes }; setStepNotes(newNotes); saveState(weeks, newNotes);
    // Persist to Supabase
    const appId = typeof window !== 'undefined' ? (localStorage.getItem('zerotask-active-app') || 'default') : 'default';
    getLaunchSteps(appId).then(data => {
      const dbStep = data?.find((d: Record<string, unknown>) => d.step_key === stepId);
      if (dbStep) dbUpdateLaunchStep(dbStep.id as string, { notes });
    }).catch(() => {});
  }, [weeks, stepNotes]);

  const generateAIContent = useCallback(async (step: Step) => {
    setGeneratingContent(true);
    try {
      const appData = getAppData();
      const res = await apiFetch('/api/ai', { method: 'POST', body: JSON.stringify({ task: 'generate-launch-content', stepTitle: step.title, stepDescription: step.description, appData }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Generation failed');
      const content = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
      const newWeeks = weeks.map(w => ({ ...w, steps: w.steps.map(s => s.id === step.id ? { ...s, aiContent: content } : s) }));
      setWeeks(newWeeks); saveState(newWeeks);
      const updatedStep = newWeeks.flatMap(w => w.steps).find(s => s.id === step.id);
      if (updatedStep) setSelectedStep(updatedStep);
    } catch {} finally { setGeneratingContent(false); }
  }, [weeks, stepNotes]);

  const totalSteps = weeks.reduce((a, w) => a + w.steps.length, 0);
  const doneSteps = weeks.reduce((a, w) => a + w.steps.filter(s => s.status === 'done' || s.status === 'measured').length, 0);
  const progressPercent = Math.round((doneSteps / totalSteps) * 100);

  // Segmented progress per phase
  const phaseProgress = weeks.map(w => {
    const done = w.steps.filter(s => s.status === 'done' || s.status === 'measured').length;
    return { label: w.label, done, total: w.steps.length, pct: w.steps.length ? Math.round((done / w.steps.length) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Launch Sequencer</h1>
            <p className="text-sm text-neutral-500">{getAppData()?.name || 'Your App'} — 5-week launch plan</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold tabular-nums text-emerald-600">{progressPercent}%</span>
          <p className="text-xs text-neutral-500">{doneSteps}/{totalSteps} complete</p>
        </div>
      </div>

      {/* ── Segmented Progress Bar ── */}
      <div className="flex gap-1">
        {phaseProgress.map((p, i) => (
          <div key={i} className="flex-1">
            <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${p.pct}%` }} />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1 text-center truncate">{p.label}</p>
          </div>
        ))}
      </div>

      {/* ── Product Hunt Timing — mini bar chart ── */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Launch Timing — What If?</span>
        </div>
        <div className="flex gap-2 mb-4">
          {(['tuesday', 'thursday'] as const).map(day => (
            <button key={day} onClick={() => setLaunchDay(day)}
              className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                launchDay === day ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700')}>
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </button>
          ))}
        </div>
        {/* Mini bar comparison */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Avg Upvotes', tue: 487, thu: 623, key: 'avgUpvotes' as const },
            { label: 'Ranking', tue: 'Top 15%', thu: 'Top 10%', key: 'topPercent' as const },
            { label: 'Comments', tue: 64, thu: 89, key: 'avgComments' as const },
            { label: 'Feature %', tue: '22%', thu: '31%', key: 'featureChance' as const },
            { label: 'Traffic', tue: '3,200', thu: '4,800', key: 'avgTraffic' as const },
          ].map(item => {
            const val = PH_COMPARISON[launchDay][item.key];
            const isNumericCompare = typeof item.tue === 'number' && typeof item.thu === 'number';
            const tuePct = isNumericCompare ? ((item.tue as number) / Math.max(item.tue as number, item.thu as number)) * 100 : 50;
            const thuPct = isNumericCompare ? ((item.thu as number) / Math.max(item.tue as number, item.thu as number)) * 100 : 70;
            return (
              <div key={item.key} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">{item.label}</p>
                <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{val}</p>
                {isNumericCompare && (
                  <div className="flex gap-1 mt-2">
                    <div className="flex-1">
                      <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-neutral-400 rounded-full" style={{ width: `${tuePct}%` }} />
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-0.5">Tue</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${thuPct}%` }} />
                      </div>
                      <p className="text-[9px] text-emerald-600 mt-0.5">Thu</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {launchDay === 'thursday' && (
          <p className="text-xs text-emerald-600 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Thursday shows +28% more upvotes historically
          </p>
        )}
      </div>

      {/* ── Horizontal Swimlane Timeline ── */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[1200px]">
          {weeks.map((week) => (
            <div key={week.key} className="flex-1 min-w-[220px]">
              <div className={clsx('text-center mb-3 pb-2 border-b-2', week.key === 'launch' ? 'border-emerald-500' : 'border-neutral-200 dark:border-neutral-800')}>
                <span className={clsx('text-sm font-semibold', week.key === 'launch' ? 'text-emerald-600' : 'text-neutral-900 dark:text-neutral-100')}>
                  {week.label}
                </span>
              </div>
              <div className="space-y-2">
                {week.steps.map(step => {
                  const cfg = STATUS_CONFIG[step.status];
                  return (
                    <div key={step.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 hover:shadow-sm transition-all group cursor-pointer"
                      onClick={() => setSelectedStep(step)}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-tight">{step.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); cycleStatus(step.id); }}
                        className={clsx('inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium transition-opacity hover:opacity-80', cfg.pillClass)}>
                        {cfg.icon} {cfg.label}
                      </button>
                      {stepNotes[step.id] && (
                        <p className="text-[11px] text-neutral-400 mt-1.5 truncate flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {stepNotes[step.id]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Slide-over Panel ── */}
      {selectedStep && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSelectedStep(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 z-50 shadow-2xl overflow-y-auto animate-[slideIn_0.2s_ease-out]">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <button onClick={() => cycleStatus(selectedStep.id)}
                  className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80', STATUS_CONFIG[selectedStep.status].pillClass)}>
                  {STATUS_CONFIG[selectedStep.status].icon} {STATUS_CONFIG[selectedStep.status].label}
                  <span className="text-[10px] opacity-50 ml-1">click to change</span>
                </button>
                <button onClick={() => setSelectedStep(null)} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{selectedStep.title}</h2>
                <p className="text-sm text-neutral-500 mt-1">{selectedStep.description}</p>
              </div>

              {/* Notes with character count */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Notes</label>
                  <span className="text-[10px] tabular-nums text-neutral-400">{(stepNotes[selectedStep.id] || '').length}/500</span>
                </div>
                <textarea
                  value={stepNotes[selectedStep.id] || ''}
                  onChange={e => updateNotes(selectedStep.id, e.target.value)}
                  placeholder="Add your notes here…"
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                />
              </div>

              {/* AI Content — collapsible with mono font */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <button onClick={() => setAiContentOpen(!aiContentOpen)}
                  className="flex items-center gap-2 w-full text-left mb-3">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">AI-Generated Content</span>
                  {aiContentOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400 ml-auto" />}
                </button>
                {aiContentOpen && (
                  <pre className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 leading-relaxed font-mono text-xs">
                    {selectedStep.aiContent}
                  </pre>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => cycleStatus(selectedStep.id)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5">
                  <ArrowRight className="w-4 h-4" /> Mark {STATUS_ORDER[(STATUS_ORDER.indexOf(selectedStep.status) + 1) % STATUS_ORDER.length]}
                </button>
                <button onClick={() => generateAIContent(selectedStep)} disabled={generatingContent}
                  className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {generatingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generatingContent ? 'Generating…' : 'Regenerate'}
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
