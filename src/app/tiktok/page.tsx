'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Star, Heart, Zap, Calendar, BarChart3, Play, Clock, ChevronRight, ChevronLeft, Sparkles, Film, MessageSquare, Plus, X, Send, Rocket, Hash, Download, Link2, CheckCircle2, XCircle, Package, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import clsx from 'clsx';
import { getBrandVoice } from '@/lib/brand-voice';
import { getTikTokPosts, saveTikTokPost, updateTikTokPost, deleteTikTokPost } from '@/lib/db';
import { useActiveApp } from '@/lib/useActiveApp';
import { useSubscription } from '@/lib/subscription';
import { getUsageToday, canGenerate, incrementUsage } from '@/lib/usage';
import { apiFetch } from '@/lib/api-client';
import UsageMeter from '@/components/UsageMeter';
import BuyCreditsModal from '@/components/BuyCreditsModal';

// --- Tabs ---
const TABS = ['Hooks', 'Slideshow', 'Calendar', 'Performance', 'What If'] as const;
type Tab = typeof TABS[number];
const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Hooks: <Zap className="w-4 h-4" />,
  Slideshow: <Film className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  Performance: <BarChart3 className="w-4 h-4" />,
  'What If': <Sparkles className="w-4 h-4" />,
};

// --- TikTok Connection ---
type TikTokConnection = {
  type: 'postiz' | 'oauth';
  apiKey?: string;
  integrationId?: string;
  accountName?: string;
  connected: boolean;
};

function getTikTokConnection(): TikTokConnection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('zerotask-tiktok-connection');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveTikTokConnection(conn: TikTokConnection) {
  localStorage.setItem('zerotask-tiktok-connection', JSON.stringify(conn));
}

function removeTikTokConnection() {
  localStorage.removeItem('zerotask-tiktok-connection');
}

// --- Best posting times ---
function getBestPostingTimes(category?: string): string {
  const niche = (category || 'general').toLowerCase();
  if (niche.includes('lifestyle') || niche.includes('relationship')) {
    return '📅 Best times to post: Tuesday–Thursday, 7–9 PM or Saturday 11 AM–1 PM\n💡 Lifestyle content performs best in evening hours when people are relaxing.';
  }
  if (niche.includes('tech') || niche.includes('saas')) {
    return '📅 Best times to post: Tuesday–Thursday, 7–9 AM or 12–3 PM\n💡 Tech audiences are active during work breaks and morning commutes.';
  }
  if (niche.includes('fitness') || niche.includes('health')) {
    return '📅 Best times to post: Monday–Wednesday, 6–8 AM or 5–7 PM\n💡 Fitness content peaks around workout hours.';
  }
  return '📅 Best times to post: Tuesday–Thursday, 7–9 AM or 12–3 PM\n💡 Consistency matters more than perfect timing. Post when your audience is most active.';
}

// --- Hook Data ---
const FORMULAS = [
  '[Person] said I can\'t [action] until I showed them [tool]',
  'POV: You just discovered [tool] and your [thing] will never be the same',
  'I tried [competitor] for [time]. Then I found [tool].',
  'Stop [bad habit]. Do this instead with [tool]',
  'Day [N] of using [tool] to [goal] — results are insane',
];

const FORMULA_COLORS = ['border-l-blue-500', 'border-l-violet-500', 'border-l-amber-500', 'border-l-rose-500', 'border-l-emerald-500'];
const FORMULA_BG = ['bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-emerald-500'];

const HOOKS = [
  { id: 1, text: "My boss said I'm terrible at time management until I showed her this AI app", formula: 0, rating: 0, fav: false },
  { id: 2, text: "My coworker said my to-do lists were chaos until I started using this app", formula: 0, rating: 0, fav: false },
  { id: 3, text: "My friend saw my schedule and said I need professional help. So I got AI help", formula: 0, rating: 0, fav: false },
  { id: 4, text: "POV: You just discovered an AI that organizes your entire day for you", formula: 1, rating: 0, fav: false },
  { id: 5, text: "POV: Your productivity goes from 30% to 95% overnight", formula: 1, rating: 0, fav: false },
  { id: 6, text: "I used to miss every deadline. Then I found this app.", formula: 2, rating: 0, fav: false },
  { id: 7, text: "I used sticky notes for 6 months. Then AI planned my day for me.", formula: 2, rating: 0, fav: false },
  { id: 8, text: "Stop writing your to-do list manually. Do this instead", formula: 3, rating: 0, fav: false },
  { id: 9, text: "Day 7 of using AI to plan my tasks — my output went from 3 to 12 tasks per day", formula: 4, rating: 0, fav: false },
  { id: 10, text: "Day 30 of letting AI manage my schedule — I got promoted", formula: 4, rating: 0, fav: false },
];

// --- Calendar Data ---
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COMMON_TIMES = ['6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM'];
type PostStatus = 'Draft' | 'Ready' | 'Posted';
const STATUS_CYCLE: PostStatus[] = ['Draft', 'Ready', 'Posted'];
type CalendarPost = { id: string; day: number; title: string; status: PostStatus; time: string };
type CalendarData = Record<string, CalendarPost[]>;

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}

function getWeekDates(weekKey: string): Date[] {
  const mon = new Date(weekKey + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function formatWeekRange(weekKey: string): string {
  const dates = getWeekDates(weekKey);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(dates[0])} — ${fmt(dates[6])}`;
}

function shiftWeek(weekKey: string, delta: number): string {
  const d = new Date(weekKey + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

function loadCalendar(): CalendarData {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('zerotask-tiktok-calendar') || '{}'); } catch { return {}; }
}

function saveCalendar(data: CalendarData) {
  localStorage.setItem('zerotask-tiktok-calendar', JSON.stringify(data));
}

const STATUS_COLORS = {
  Draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  Ready: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Posted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
};

const STATUS_BORDER = {
  Draft: 'border-l-neutral-300 dark:border-l-neutral-600',
  Ready: 'border-l-amber-400 dark:border-l-amber-500',
  Posted: 'border-l-emerald-400 dark:border-l-emerald-500',
};

// --- Performance Data ---
const PERF_POSTS = [
  { id: 1, title: 'Boss was SHOCKED by my productivity', views: 234200, likes: 18400, shares: 4200, comments: 890, formula: 'Person + Conflict', date: 'Feb 1' },
  { id: 2, title: 'POV: AI plans your entire workday', views: 142000, likes: 11200, shares: 2800, comments: 620, formula: 'POV Discovery', date: 'Feb 3' },
  { id: 3, title: 'Missed every deadline then found this app', views: 108000, likes: 8900, shares: 2100, comments: 480, formula: 'Competitor Switch', date: 'Feb 5' },
  { id: 4, title: 'Day 30 using AI for task management', views: 9800, likes: 720, shares: 180, comments: 45, formula: 'Day N Journey', date: 'Feb 6' },
  { id: 5, title: 'Stop using sticky notes for tasks', views: 8400, likes: 610, shares: 150, comments: 38, formula: 'Stop + Do This', date: 'Feb 7' },
  { id: 6, title: 'My team saw my AI-planned schedule', views: 7200, likes: 540, shares: 120, comments: 32, formula: 'Person + Conflict', date: 'Feb 8' },
  { id: 7, title: 'Schedule glow-up before vs after AI', views: 6100, likes: 450, shares: 95, comments: 28, formula: 'Before/After', date: 'Feb 9' },
  { id: 8, title: 'Best AI productivity hacks for work', views: 5300, likes: 380, shares: 82, comments: 22, formula: 'Tutorial', date: 'Feb 10' },
  { id: 9, title: 'Finished my tasks in 2 hours with AI', views: 4800, likes: 340, shares: 70, comments: 18, formula: 'Speed Demo', date: 'Feb 11' },
  { id: 10, title: 'Procrastinator productivity hack with AI', views: 3900, likes: 280, shares: 55, comments: 15, formula: 'Day N Journey', date: 'Feb 12' },
  { id: 11, title: 'My workflow before vs after AI', views: 3200, likes: 230, shares: 48, comments: 12, formula: 'Before/After', date: 'Jan 28' },
  { id: 12, title: 'AI planner vs manual planning', views: 2800, likes: 200, shares: 40, comments: 10, formula: 'Competitor Switch', date: 'Jan 29' },
  { id: 13, title: 'AI planning templates that work', views: 2100, likes: 150, shares: 32, comments: 8, formula: 'Tutorial', date: 'Jan 30' },
  { id: 14, title: 'Remote work productivity with AI help', views: 1800, likes: 130, shares: 25, comments: 6, formula: 'Before/After', date: 'Jan 31' },
  { id: 15, title: 'AI task suggestions tutorial', views: 1200, likes: 90, shares: 18, comments: 4, formula: 'Tutorial', date: 'Jan 27' },
];

const FORMULA_STATS = [
  { formula: 'Person + Conflict', avgViews: 120700, count: 2 },
  { formula: 'POV Discovery', avgViews: 142000, count: 1 },
  { formula: 'Competitor Switch', avgViews: 55400, count: 2 },
  { formula: 'Day N Journey', avgViews: 6850, count: 2 },
  { formula: 'Before/After', avgViews: 4367, count: 3 },
  { formula: 'Tutorial', avgViews: 3100, count: 3 },
];

const SLIDE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const CHART_GRADIENT_ID = 'viewsGradient';

const maxFormulaViews = Math.max(...FORMULA_STATS.map(f => f.avgViews));

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />;

// --- TikTok Connection Modal ---
function TikTokConnectionModal({ onClose, onConnected }: { onClose: () => void; onConnected: (conn: TikTokConnection) => void }) {
  const [apiKey, setApiKey] = useState('');
  const [integrationId, setIntegrationId] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string; accountName?: string } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch('/api/tiktok/test', {
        method: 'POST',
        body: JSON.stringify({ apiKey, integrationId }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.valid) {
        const conn: TikTokConnection = {
          type: 'postiz',
          apiKey,
          integrationId,
          accountName: data.accountName,
          connected: true,
        };
        saveTikTokConnection(conn);
        setTimeout(() => onConnected(conn), 1000);
      }
    } catch {
      setTestResult({ valid: false, error: 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Connect TikTok</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {/* Option A: Postiz */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 space-y-3 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Connect via Postiz</span>
          </div>
          <p className="text-xs text-neutral-500">Already use Postiz? Paste your API key to post directly.</p>
          <div>
            <label className="text-xs text-neutral-400">API Key</label>
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="pk_..."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400">TikTok Integration ID</label>
            <input
              value={integrationId}
              onChange={e => setIntegrationId(e.target.value)}
              placeholder="Integration ID from Postiz"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          <button
            onClick={testConnection}
            disabled={!apiKey || testing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-150 disabled:opacity-50"
          >
            {testing ? <Spinner /> : <Zap className="w-4 h-4" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <div className={clsx('flex items-center gap-1.5 text-sm', testResult.valid ? 'text-emerald-600' : 'text-red-500')}>
              {testResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.valid ? `Connected! ${testResult.accountName || ''}` : testResult.error || 'Failed'}
            </div>
          )}
        </div>

        {/* Option B: Direct TikTok (Coming Soon) */}
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 opacity-50">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-500">Connect directly via TikTok</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-medium">Coming Q2 2026</span>
          </div>
        </div>

        {/* Option C: Skip */}
        <button onClick={onClose} className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors py-2">
          I&apos;ll download and post manually →
        </button>
      </div>
    </div>
  );
}

export default function TikTokPage() {
  const { app, mounted } = useActiveApp();
  const { plan } = useSubscription();
  const [usage, setUsage] = useState(() => getUsageToday(plan));
  const canGen = canGenerate(plan);
  const getActiveAppData = () => ({ name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios', description: app?.description || '' });
  const [tab, setTab] = useState<Tab>('Hooks');
  const [hooks, setHooks] = useState(HOOKS);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [hooksError, setHooksError] = useState<string | null>(null);
  const [hoveredStar, setHoveredStar] = useState<{ id: number; star: number } | null>(null);

  // Slideshow state
  const [slideImages, setSlideImages] = useState<string[]>(Array(6).fill(''));
  const [slidesLoading, setSlidesLoading] = useState(false);
  const [slidesProgress, setSlidesProgress] = useState(0);
  const [slidesError, setSlidesError] = useState<string | null>(null);

  // TikTok posting state
  const [postCaption, setPostCaption] = useState('This AI plans your entire day for you 🔥');
  const [postHashtags, setPostHashtags] = useState(['productivity', 'aitools', 'taskmanagement', 'lifehack', 'fyp']);
  const [newHashtag, setNewHashtag] = useState('');
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [stylesLoading, setStylesLoading] = useState(false);
  const formulaScrollRef = useRef<HTMLDivElement>(null);

  // TikTok connection state
  const [tiktokConnection, setTiktokConnection] = useState<TikTokConnection | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  // Refresh usage when plan changes
  useEffect(() => {
    setUsage(getUsageToday(plan));
  }, [plan]);

  // Load connection on mount
  useEffect(() => {
    setTiktokConnection(getTikTokConnection());
  }, []);

  const isConnected = tiktokConnection?.connected === true;

  const generateHooks = useCallback(async () => {
    setHooksLoading(true);
    setHooksError(null);
    try {
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          task: 'brainstorm-hooks',
          appData: getActiveAppData(),
          count: 10,
          brandVoice: getBrandVoice(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      const result = data.result;
      if (Array.isArray(result)) {
        const newHooks = result.map((h: { text?: string; formula?: string; predictedScore?: number }, i: number) => ({
          id: 100 + i,
          text: h.text || '',
          formula: Math.min(i % FORMULAS.length, FORMULAS.length - 1),
          rating: 0,
          fav: false,
        }));
        setHooks(newHooks);
      }
    } catch (err: unknown) {
      setHooksError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setHooksLoading(false);
    }
  }, []);
  const [selectedFormula, setSelectedFormula] = useState(0);
  const [slideStyles, setSlideStyles] = useState(Array(6).fill(''));
  const [sceneDesc, setSceneDesc] = useState('A person sitting at a desk looking frustrated at their phone, then discovering the app and smiling');
  const [textOverlay, setTextOverlay] = useState('Wait for it... 🤯');
  const [frequency, setFrequency] = useState(2);

  // Calendar state
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [currentWeek, setCurrentWeek] = useState(() => getWeekKey(new Date()));
  const [editingPost, setEditingPost] = useState<{ day: number; post?: CalendarPost } | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('10:00 AM');
  const [formStatus, setFormStatus] = useState<PostStatus>('Draft');

  useEffect(() => {
    setCalendarData(loadCalendar());
    const appId = typeof window !== 'undefined' ? (localStorage.getItem('zerotask-active-app') || 'default') : 'default';
    async function loadFromDb() {
      try {
        const posts = await getTikTokPosts(appId);
        if (posts && posts.length > 0) {
          const cal: CalendarData = {};
          for (const p of posts) {
            const d = p.scheduled_date ? new Date(p.scheduled_date as string) : new Date();
            const wk = getWeekKey(d);
            const dayOfWeek = d.getDay();
            const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            if (!cal[wk]) cal[wk] = [];
            cal[wk].push({
              id: p.id as string,
              day: dayIdx,
              title: (p.title as string) || (p.hook as string) || '',
              status: ((p.status as string) || 'Draft') as PostStatus,
              time: (p.scheduled_time as string) || '10:00 AM',
            });
          }
          setCalendarData(cal);
          saveCalendar(cal);
        }
      } catch (e) {
        console.warn('Failed to load TikTok posts from Supabase', e);
      }
    }
    loadFromDb();
  }, []);

  const weekPosts = calendarData[currentWeek] || [];
  const postsByDay = (day: number) => weekPosts.filter(p => p.day === day);

  const updateCalendar = (fn: (posts: CalendarPost[]) => CalendarPost[]) => {
    setCalendarData(prev => {
      const next = { ...prev, [currentWeek]: fn(prev[currentWeek] || []) };
      saveCalendar(next);
      return next;
    });
  };

  const openAddPost = (day: number) => {
    setEditingPost({ day });
    setFormTitle('');
    setFormTime('10:00 AM');
    setFormStatus('Draft');
  };

  const openEditPost = (post: CalendarPost) => {
    setEditingPost({ day: post.day, post });
    setFormTitle(post.title);
    setFormTime(post.time);
    setFormStatus(post.status);
  };

  const savePost = async () => {
    if (!editingPost || !formTitle.trim()) return;
    const appId = typeof window !== 'undefined' ? (localStorage.getItem('zerotask-active-app') || 'default') : 'default';
    if (editingPost.post) {
      updateCalendar(posts => posts.map(p => p.id === editingPost.post!.id ? { ...p, title: formTitle, time: formTime, status: formStatus } : p));
      updateTikTokPost(editingPost.post.id, { title: formTitle, status: formStatus, scheduled_time: formTime }).catch(() => {});
    } else {
      const weekDates = getWeekDates(currentWeek);
      const scheduledDate = weekDates[editingPost.day].toISOString().slice(0, 10);
      const saved = await saveTikTokPost({ app_id: appId, title: formTitle, status: formStatus, scheduled_date: scheduledDate, scheduled_time: formTime });
      const newPost: CalendarPost = { id: saved?.id || Date.now().toString(), day: editingPost.day, title: formTitle, time: formTime, status: formStatus };
      updateCalendar(posts => [...posts, newPost]);
    }
    setEditingPost(null);
  };

  const deletePost = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateCalendar(posts => posts.filter(p => p.id !== id));
    deleteTikTokPost(id).catch(() => {});
  };

  const cycleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newStatus: PostStatus = 'Draft';
    updateCalendar(posts => posts.map(p => {
      if (p.id !== id) return p;
      newStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(p.status) + 1) % 3];
      return { ...p, status: newStatus };
    }));
    updateTikTokPost(id, { status: newStatus }).catch(() => {});
  };

  const totalPosts = weekPosts.length;
  const statusCounts = { Draft: weekPosts.filter(p => p.status === 'Draft').length, Ready: weekPosts.filter(p => p.status === 'Ready').length, Posted: weekPosts.filter(p => p.status === 'Posted').length };

  const generateSlides = useCallback(async () => {
    if (!canGenerate(plan)) return;
    const updated = incrementUsage();
    setUsage(getUsageToday(plan));
    setSlidesLoading(true);
    setSlidesError(null);
    setSlidesProgress(0);
    const newImages: string[] = [];
    const activeStyles = slideStyles.map((s, i) => s || `slide ${i + 1}, cinematic photography`);
    const totalSlides = activeStyles.length;

    for (let i = 0; i < totalSlides; i++) {
      try {
        setSlidesProgress(i + 1);
        const res = await apiFetch('/api/image', {
          method: 'POST',
          body: JSON.stringify({
            action: 'generate-slide',
            sceneDescription: sceneDesc,
            styleVariation: activeStyles[i],
            slideNumber: i + 1,
            ...(i === 0 && textOverlay ? { textOverlay } : {}),
          }),
        });
        const data = await res.json();
        if (data.image) {
          newImages.push(data.image);
        } else {
          newImages.push('');
          console.error(`Slide ${i + 1} failed:`, data.error);
        }
      } catch (err) {
        newImages.push('');
        console.error(`Slide ${i + 1} error:`, err);
      }
    }

    setSlideImages(newImages);
    setSlidesLoading(false);
    if (newImages.every(img => !img)) {
      setSlidesError('All slides failed to generate. Check your API key.');
    }
  }, [sceneDesc, slideStyles, textOverlay]);

  // Download package
  const downloadPackage = useCallback(async () => {
    const validImages = slideImages.filter(img => img);
    if (validImages.length === 0) return;

    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add images
      for (let i = 0; i < validImages.length; i++) {
        const imgUrl = validImages[i];
        try {
          const res = await fetch(imgUrl);
          const blob = await res.blob();
          zip.file(`slide-${i + 1}.png`, blob);
        } catch (err) {
          console.error(`Failed to fetch slide ${i + 1}:`, err);
        }
      }

      // Caption with hashtags
      const hashtagStr = postHashtags.map(h => `#${h}`).join(' ');
      const postingTimes = getBestPostingTimes(app?.category);
      const captionContent = `${postCaption}\n\n${hashtagStr}\n\n---\n${postingTimes}`;
      zip.file('caption.txt', captionContent);

      // Posting guide
      const guide = `📱 How to Post a TikTok Slideshow
=====================================

1. Open TikTok and tap the "+" button
2. Tap "Upload" (bottom right)
3. Select ALL slide images (slide-1.png through slide-${validImages.length}.png) in order
4. Tap "Next"
5. Choose "Slideshow" mode (not video)
6. Paste the caption from caption.txt
7. Add music if desired (trending sounds boost reach!)
8. Set privacy & post!

💡 Tips:
- Post during peak hours (see caption.txt for recommendations)
- Use all hashtags provided — they're optimized for reach
- Reply to comments within the first hour for algorithm boost
- Pin your best comment to encourage engagement
- Cross-post to Instagram Reels for extra reach
`;
      zip.file('posting-guide.txt', guide);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiktok-slideshow-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [slideImages, postCaption, postHashtags, app?.category]);

  const postToTikTok = useCallback(async (images?: string[]) => {
    const imagesToPost = images || slideImages.filter(img => img);
    if (imagesToPost.length === 0) return;
    setPosting(true);
    setPostResult(null);
    try {
      const body: Record<string, unknown> = { imageUrls: imagesToPost, caption: postCaption, hashtags: postHashtags };
      // Use user's connection credentials if available
      if (tiktokConnection?.type === 'postiz' && tiktokConnection.apiKey) {
        body.apiKey = tiktokConnection.apiKey;
        if (tiktokConnection.integrationId) body.integrationId = tiktokConnection.integrationId;
      }
      const res = await apiFetch('/api/tiktok/post', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setPostResult({ success: true, message: '✅ Posted as draft to TikTok!' });
      } else {
        setPostResult({ success: false, message: data.error || 'Failed to post' });
      }
    } catch (err) {
      setPostResult({ success: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setPosting(false);
    }
  }, [slideImages, postCaption, postHashtags, tiktokConnection]);

  const useHookForSlideshow = useCallback(async (hookText: string) => {
    setTab('Slideshow');
    setSceneDesc(`Visual storytelling sequence for TikTok hook: "${hookText}" — show the emotional journey from problem to discovery to transformation`);
    setTextOverlay(hookText);
    setStylesLoading(true);

    // Also generate hashtags
    try {
      const [stylesRes, hashtagsRes] = await Promise.all([
        apiFetch('/api/ai', {
          method: 'POST',
          body: JSON.stringify({ task: 'suggest-slide-styles', hookText, brandVoice: getBrandVoice() }),
        }),
        apiFetch('/api/ai', {
          method: 'POST',
          body: JSON.stringify({
            task: 'generate-hashtags',
            appData: getActiveAppData(),
            hookText,
            count: 12,
            brandVoice: getBrandVoice(),
          }),
        }),
      ]);

      const stylesData = await stylesRes.json();
      if (Array.isArray(stylesData.result) && stylesData.result.length >= 6) {
        setSlideStyles(stylesData.result.slice(0, 6));
      }

      const hashtagsData = await hashtagsRes.json();
      if (Array.isArray(hashtagsData.result)) {
        const tags = hashtagsData.result.map((t: string) => t.replace(/^#/, '').trim()).filter(Boolean);
        if (tags.length > 0) setPostHashtags(tags);
      }
    } catch (err) {
      console.error('Failed to get styles/hashtags:', err);
    } finally {
      setStylesLoading(false);
    }
  }, []);

  const generateAndPost = useCallback(async () => {
    setPipelineRunning(true);
    setPipelineStatus('Generating slides...');
    setSlidesLoading(true);
    setSlidesError(null);
    setSlidesProgress(0);
    const newImages: string[] = [];
    const activeStyles = slideStyles.map((s: string, i: number) => s || `slide ${i + 1}, cinematic photography`);

    for (let i = 0; i < activeStyles.length; i++) {
      setPipelineStatus(`Generating slides... (${i + 1}/6)`);
      setSlidesProgress(i + 1);
      try {
        const res = await apiFetch('/api/image', {
          method: 'POST',
          body: JSON.stringify({
            action: 'generate-slide',
            sceneDescription: sceneDesc,
            styleVariation: activeStyles[i],
            slideNumber: i + 1,
            ...(i === 0 && textOverlay ? { textOverlay } : {}),
          }),
        });
        const data = await res.json();
        newImages.push(data.image || '');
      } catch {
        newImages.push('');
      }
    }

    setSlideImages(newImages);
    setSlidesLoading(false);

    const validImages = newImages.filter(img => img);
    if (validImages.length === 0) {
      setPipelineStatus('❌ All slides failed to generate');
      setPipelineRunning(false);
      return;
    }

    setPipelineStatus('Uploading to TikTok...');
    await postToTikTok(validImages);
    setPipelineStatus('✅ Posted as draft!');
    setTimeout(() => setPipelineRunning(false), 3000);
  }, [sceneDesc, slideStyles, textOverlay, postToTikTok]);

  const rateHook = (id: number, rating: number) => setHooks(h => h.map(x => x.id === id ? { ...x, rating } : x));
  const toggleFav = (id: number) => setHooks(h => h.map(x => x.id === id ? { ...x, fav: !x.fav } : x));

  const projectedReach = Math.round(frequency * 30 * 8500 * (1 + (frequency - 1) * 0.15));

  const chartData = PERF_POSTS.map(p => ({ name: p.date, views: p.views })).reverse();

  const addHashtag = () => {
    const tag = newHashtag.replace(/^#/, '').trim();
    if (tag && !postHashtags.includes(tag)) {
      setPostHashtags([...postHashtags, tag]);
      setNewHashtag('');
    }
  };

  const removeHashtag = (tag: string) => {
    setPostHashtags(postHashtags.filter(t => t !== tag));
  };

  const disconnectTikTok = () => {
    removeTikTokConnection();
    setTiktokConnection(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">TikTok Content Studio</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Create, plan, and track viral content for {app?.name || 'your app'}</p>
        </div>
        {/* Connection status indicator */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" /> TikTok connected
                {tiktokConnection?.accountName && <span className="text-emerald-500">· {tiktokConnection.accountName}</span>}
              </span>
              <button onClick={disconnectTikTok} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">Disconnect</button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectionModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
            >
              <XCircle className="w-3 h-3" /> Not connected
            </button>
          )}
        </div>
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <TikTokConnectionModal
          onClose={() => setShowConnectionModal(false)}
          onConnected={(conn) => {
            setTiktokConnection(conn);
            setShowConnectionModal(false);
          }}
        />
      )}

      {/* Segmented Control Tabs */}
      <div className="inline-flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={clsx(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
            tab === t
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          )}>
            {TAB_ICONS[t]} {t}
          </button>
        ))}
      </div>

      {/* Hooks Tab */}
      {tab === 'Hooks' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={generateHooks} disabled={hooksLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-150 disabled:opacity-50 active:scale-[0.98]">
              {hooksLoading ? <Spinner /> : <Sparkles className="w-4 h-4" />} {hooksLoading ? 'Generating...' : 'Generate Hooks'}
            </button>
            {hooksError && <span className="text-sm text-red-500">{hooksError}</span>}
          </div>

          {/* Formula pills */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Formula Template</div>
            <div ref={formulaScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {FORMULAS.map((f, i) => (
                <button key={i} onClick={() => setSelectedFormula(i)} className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 border',
                  selectedFormula === i
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                )}>
                  <span className={clsx('w-2 h-2 rounded-full shrink-0', FORMULA_BG[i])} />
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Hook cards */}
          <div className="space-y-2">
            {hooks.filter(h => h.formula === selectedFormula).map(h => (
              <div key={h.id} className={clsx(
                'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg border-l-[3px] p-4 flex items-center gap-4 hover:shadow-sm transition-all duration-150',
                FORMULA_COLORS[h.formula] || 'border-l-neutral-300'
              )}>
                <button onClick={() => toggleFav(h.id)} className={clsx('shrink-0 transition-colors duration-150', h.fav ? 'text-red-500' : 'text-neutral-300 dark:text-neutral-600 hover:text-red-400')}>
                  <Heart className="w-4 h-4" fill={h.fav ? 'currentColor' : 'none'} />
                </button>
                <div className="flex-1 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">&ldquo;{h.text}&rdquo;</div>
                <button onClick={() => useHookForSlideshow(h.text)} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors duration-150 border border-violet-200 dark:border-violet-800">
                  <Film className="w-3 h-3" /> Slideshow
                </button>
                <div className="flex gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map(s => {
                    const isHovered = hoveredStar?.id === h.id && s <= hoveredStar.star;
                    const isFilled = s <= h.rating;
                    return (
                      <button
                        key={s}
                        onClick={() => rateHook(h.id, s)}
                        onMouseEnter={() => setHoveredStar({ id: h.id, star: s })}
                        onMouseLeave={() => setHoveredStar(null)}
                        className={clsx(
                          'transition-all duration-100 p-0.5',
                          isHovered || isFilled ? 'text-amber-400 scale-110' : 'text-neutral-200 dark:text-neutral-700 hover:text-amber-300'
                        )}
                      >
                        <Star className="w-3.5 h-3.5" fill={(isHovered || isFilled) ? 'currentColor' : 'none'} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slideshow Tab */}
      {tab === 'Slideshow' && (
        <div className="space-y-4">
          <UsageMeter used={usage.generations} limit={usage.limit} plan={plan} purchased={usage.purchased || 0} />
          <div className="flex items-center gap-3">
            <button onClick={generateSlides} disabled={slidesLoading || !canGen} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-150 disabled:opacity-50 active:scale-[0.98]">
              {slidesLoading ? <Spinner /> : <Film className="w-4 h-4" />}
              {slidesLoading ? `Generating slide ${slidesProgress}/6...` : plan === 'free' ? '🔒 Upgrade to Generate' : !canGen ? '🔒 No Credits' : 'Generate Slideshow'}
            </button>
            {!canGen && plan !== 'free' && (
              <button
                onClick={() => setShowBuyCredits(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white transition-all"
              >
                Buy more credits →
              </button>
            )}
            {slidesError && <span className="text-sm text-red-500">{slidesError}</span>}
            {slideImages.some(img => img) && !slidesLoading && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">✅ {slideImages.filter(img => img).length}/6 slides ready</span>
            )}
          </div>

          {/* Progress bar during generation */}
          {slidesLoading && (
            <div className="relative h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(slidesProgress / 6) * 100}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>
          )}

          {/* Slide preview cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {SLIDE_COLORS.map((color, i) => (
              <div key={i} className="relative group">
                <div className="aspect-[9/16] rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-white font-bold text-2xl relative overflow-hidden" style={{ backgroundColor: color }}>
                  {slideImages[i] ? (
                    <img src={slideImages[i]} alt={`Slide ${i + 1}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <>
                      {slidesLoading && slidesProgress === i + 1 ? <Spinner /> : <span className="text-white/60">{i + 1}</span>}
                    </>
                  )}
                  {i === 0 && textOverlay && (
                    <div className="absolute bottom-3 left-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs p-1.5 rounded-md text-center z-10">{textOverlay}</div>
                  )}
                </div>
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] font-semibold flex items-center justify-center shadow-sm z-10">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Scene/style controls */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Scene Description</label>
              <textarea value={sceneDesc} onChange={e => setSceneDesc(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-colors" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Text Overlay (Slide 1)</label>
              <input value={textOverlay} onChange={e => setTextOverlay(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SLIDE_COLORS.map((_, i) => (
                <div key={i}>
                  <label className="text-xs text-neutral-400">Slide {i + 1} Style</label>
                  <input value={slideStyles[i]} onChange={e => { const s = [...slideStyles]; s[i] = e.target.value; setSlideStyles(s); }} placeholder="e.g. cinematic, warm tones" className="mt-1 w-full px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-colors" />
                </div>
              ))}
            </div>
            {stylesLoading && (
              <div className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400">
                <Spinner /> Loading AI-suggested styles & hashtags...
              </div>
            )}
          </div>

          {/* Post/Download Section */}
          {slideImages.some(img => img) && !slidesLoading && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Publish
              </div>

              {/* Caption preview */}
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Caption</label>
                <textarea value={postCaption} onChange={e => setPostCaption(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-colors" />
              </div>

              {/* Editable hashtag pills */}
              <div>
                <label className="text-xs text-neutral-400 mb-2 block">Hashtags</label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {postHashtags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      <Hash className="w-3 h-3 text-neutral-400" />{tag}
                      <button onClick={() => removeHashtag(tag)} className="ml-0.5 text-neutral-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={newHashtag}
                    onChange={e => setNewHashtag(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
                    placeholder="Add tag..."
                    className="w-20 px-2 py-1 text-xs bg-transparent text-neutral-600 dark:text-neutral-400 outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                  />
                </div>
              </div>

              {/* Best time to post */}
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5" /> Best Time to Post
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500 whitespace-pre-line">{getBestPostingTimes(app?.category)}</p>
              </div>

              {/* Action buttons — Download primary, Post secondary */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={downloadPackage}
                  disabled={downloading}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-150 disabled:opacity-50 active:scale-[0.98] shadow-sm"
                >
                  {downloading ? <Spinner /> : <Package className="w-4 h-4" />}
                  {downloading ? 'Packaging...' : '📦 Download Package'}
                </button>

                {isConnected ? (
                  <button
                    onClick={() => postToTikTok()}
                    disabled={posting}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {posting ? <Spinner /> : <Rocket className="w-4 h-4" />}
                    {posting ? 'Posting...' : '🚀 Post to TikTok'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConnectionModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150"
                  >
                    <Link2 className="w-4 h-4" /> Connect TikTok →
                  </button>
                )}
              </div>

              {postResult && (
                <div className={clsx('text-sm', postResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                  {postResult.message}
                </div>
              )}
            </div>
          )}

          {/* Generate & Post Pipeline */}
          <div className="flex items-center gap-3">
            <button onClick={generateAndPost} disabled={pipelineRunning || slidesLoading || !isConnected || !canGen} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-pink-500 hover:from-emerald-600 hover:to-pink-600 text-white transition-all duration-150 disabled:opacity-50 active:scale-[0.98]">
              {pipelineRunning ? <Spinner /> : <Rocket className="w-4 h-4" />}
              {pipelineRunning ? pipelineStatus : 'Generate & Post'}
            </button>
            {!isConnected && !pipelineRunning && (
              <span className="text-xs text-neutral-400">Connect TikTok to use auto-post</span>
            )}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {tab === 'Calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentWeek(w => shiftWeek(w, -1))} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors duration-150">
                <ChevronLeft className="w-4 h-4 text-neutral-500" />
              </button>
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 min-w-[220px] text-center">{formatWeekRange(currentWeek)}</span>
              <button onClick={() => setCurrentWeek(w => shiftWeek(w, 1))} className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors duration-150">
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {totalPosts > 0 ? `${totalPosts} post${totalPosts !== 1 ? 's' : ''}: ${statusCounts.Posted} Posted, ${statusCounts.Ready} Ready, ${statusCounts.Draft} Draft` : 'No posts this week'}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-neutral-200 dark:divide-neutral-800">
              {DAYS.map((day, i) => {
                const dayPosts = postsByDay(i);
                const dates = getWeekDates(currentWeek);
                return (
                  <div key={day} className={clsx(
                    'min-h-[160px] p-3 transition-colors duration-150',
                    i > 0 && 'border-l border-neutral-200 dark:border-neutral-800'
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-medium text-neutral-500">{day}</span>
                        <span className="text-[10px] text-neutral-300 dark:text-neutral-600 ml-1">{dates[i].getDate()}</span>
                      </div>
                      <button onClick={() => openAddPost(i)} className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-150 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {dayPosts.length === 0 && (
                      <button onClick={() => openAddPost(i)} className="w-full h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-300 dark:text-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-400 transition-colors duration-150">
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                    <div className="space-y-1.5">
                      {dayPosts.map(post => (
                        <div key={post.id} onClick={() => openEditPost(post)} className={clsx(
                          'border-l-2 pl-2 py-1.5 rounded-r cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-150 group',
                          post.status === 'Posted' ? 'border-l-emerald-400' : STATUS_BORDER[post.status]
                        )}>
                          <div className="flex items-center justify-between">
                            <button onClick={(e) => cycleStatus(post.id, e)} className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors duration-150', STATUS_COLORS[post.status])}>{post.status}</button>
                            <button onClick={(e) => deletePost(post.id, e)} className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-400 transition-all duration-150"><X className="w-3 h-3" /></button>
                          </div>
                          <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 mt-0.5 leading-tight">{post.title}</div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5" />{post.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {editingPost !== null && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEditingPost(null)}>
              <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 w-full max-w-sm shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{editingPost.post ? 'Edit Post' : `Add Post — ${DAYS[editingPost.day]}`}</div>
                <div>
                  <label className="text-xs text-neutral-500">Title</label>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)} autoFocus placeholder="Post title..." className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500">Time</label>
                    <select value={formTime} onChange={e => setFormTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
                      {COMMON_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Status</label>
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value as PostStatus)} className="mt-1 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
                      <option>Draft</option><option>Ready</option><option>Posted</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingPost(null)} className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">Cancel</button>
                  <button onClick={savePost} disabled={!formTitle.trim()} className="px-4 py-1.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50">Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {tab === 'Performance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Views Over Time</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id={CHART_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => typeof v === 'number' ? v.toLocaleString() : v}
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="views" fill={`url(#${CHART_GRADIENT_ID})`} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {FORMULA_STATS.map(f => (
              <div key={f.formula} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-400 font-medium">{f.formula}</div>
                <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">{(f.avgViews / 1000).toFixed(1)}K <span className="text-xs font-normal text-neutral-400">avg views</span></div>
                <div className="text-xs text-neutral-500 mb-2">{f.count} posts</div>
                <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(f.avgViews / maxFormulaViews) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-sm">
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Post</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Views</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Likes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Shares</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Formula</th>
                  </tr>
                </thead>
                <tbody>
                  {PERF_POSTS.map((p, idx) => (
                    <tr key={p.id} className={clsx(
                      'border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition-colors duration-100 cursor-pointer',
                      idx % 2 === 1 && 'bg-neutral-50/50 dark:bg-neutral-800/10'
                    )}>
                      <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200 font-medium">{p.title}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">{p.views.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">{p.likes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">{p.shares.toLocaleString()}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">{p.formula}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* What If Tab */}
      {tab === 'What If' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            <Sparkles className="w-4 h-4" /> Content Frequency Simulator
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-neutral-600 dark:text-neutral-400">Posts per day</label>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md tabular-nums">{frequency}x</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={1}
                max={5}
                value={frequency}
                onChange={e => setFrequency(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
              />
              <div className="flex justify-between text-xs text-neutral-400 mt-1.5">
                <span>1x/day</span><span>2x</span><span>3x</span><span>4x</span><span>5x/day</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 text-center">
              <div className="text-xs text-neutral-400 font-medium">Monthly Posts</div>
              <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">{frequency * 30}</div>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 text-center">
              <div className="text-xs text-neutral-400 font-medium">Projected Reach</div>
              <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{(projectedReach / 1000).toFixed(0)}K</div>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 text-center">
              <div className="text-xs text-neutral-400 font-medium">Est. API Cost</div>
              <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">${(frequency * 30 * 0.12).toFixed(0)}</div>
            </div>
          </div>
        </div>
      )}
      {showBuyCredits && <BuyCreditsModal onClose={() => setShowBuyCredits(false)} />}
    </div>
  );
}
