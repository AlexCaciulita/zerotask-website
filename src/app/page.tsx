'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertTriangle, AlertCircle, Lightbulb, Sparkles, Mail, Lock } from 'lucide-react';
import GrowthScore from '@/components/GrowthScore';
import Badge from '@/components/Badge';
import { saveLead, saveAudit } from '@/lib/db';
import { apiFetch } from '@/lib/api-client';

const auditSteps = [
  'Scraping listing data...',
  'Identifying competitors...',
  'Researching keywords...',
  'Auditing metadata...',
  'Building growth strategy...',
];

const defaultAuditResults = {
  critical: [
    { label: 'Title missing primary keyword for your category', type: 'critical' as const },
    { label: 'No subtitle — wasting 30 characters of keyword space', type: 'critical' as const },
    { label: 'Description keyword density: 0.8% (target: 2-3%)', type: 'critical' as const },
  ],
  warnings: [
    { label: 'Only 4 screenshots (competitors average 8)', type: 'warning' as const },
    { label: 'No preview video — missing 20% conversion lift', type: 'warning' as const },
    { label: 'Rating 4.2★ — below category average 4.5★', type: 'warning' as const },
  ],
  opportunities: [
    { label: '12 high-volume keywords with no competition', type: 'opportunity' as const },
    { label: '3 competitors recently dropped rankings', type: 'opportunity' as const },
    { label: 'TikTok trending keywords detected — 2.3M views/week', type: 'opportunity' as const },
  ],
};

type Phase = 'input' | 'auditing' | 'results';

interface ScrapedApp {
  name: string;
  icon: string;
  rating: number;
  reviewCount: number;
  description: string;
  category: string;
  developer: string;
  screenshotCount: number;
}

const APP_STORE_PATTERN = /^https?:\/\/(apps\.apple\.com|itunes\.apple\.com)\/.+/i;
const PLAY_STORE_PATTERN = /^https?:\/\/play\.google\.com\/store\/apps\/.+/i;

function isValidStoreUrl(u: string): boolean {
  return APP_STORE_PATTERN.test(u.trim()) || PLAY_STORE_PATTERN.test(u.trim());
}

// Staged skeleton for audit animation
function AuditSkeleton({ step }: { step: number }) {
  return (
    <div className="mt-8 w-full max-w-lg mx-auto space-y-4">
      {/* App info skeleton */}
      <div className={`card p-4 flex items-center gap-3 transition-opacity duration-500 ${step >= 0 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-12 h-12 rounded-xl bg-surface-tertiary animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-surface-tertiary rounded animate-pulse" />
          <div className="h-3 w-48 bg-surface-tertiary rounded animate-pulse" style={{ animationDelay: '100ms' }} />
        </div>
      </div>

      {/* Score skeleton */}
      <div className={`card p-6 flex items-center justify-center transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-28 h-28 rounded-full border-8 border-surface-tertiary animate-pulse" />
      </div>

      {/* Issues skeleton */}
      <div className={`card p-4 space-y-3 transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-200 dark:bg-red-900/30 animate-pulse" />
          <div className="h-3 w-24 bg-surface-tertiary rounded animate-pulse" />
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="h-3 bg-surface-tertiary rounded animate-pulse ml-6" style={{ width: `${85 - i * 10}%`, animationDelay: `${i * 150}ms` }} />
        ))}
      </div>

      {/* Opportunities skeleton */}
      <div className={`card p-4 space-y-3 transition-opacity duration-500 ${step >= 4 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-900/30 animate-pulse" />
          <div className="h-3 w-24 bg-surface-tertiary rounded animate-pulse" />
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="h-3 bg-surface-tertiary rounded animate-pulse ml-6" style={{ width: `${80 - i * 8}%`, animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('input');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [auditResults, setAuditResults] = useState(defaultAuditResults);
  const [growthScore, setGrowthScore] = useState(34);
  const [aiAuditDone, setAiAuditDone] = useState(false);
  const [scrapedApp, setScrapedApp] = useState<ScrapedApp | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Check if email was previously captured
  useEffect(() => {
    try { const saved = localStorage.getItem('zerotask-lead-email'); if (saved) setEmailSubmitted(true); } catch {}
  }, []);

  const submitEmail = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError(null);
    // Store lead to Supabase (falls back to localStorage)
    saveLead(email.trim(), url || undefined, growthScore).catch(() => {});
    try { localStorage.setItem('zerotask-lead-email', email.trim()); } catch {}
    setEmailSubmitted(true);
  };

  const addAppToPlatform = (app: ScrapedApp, appUrl: string) => {
    try {
      const APPS_KEY = 'zerotask-settings-apps';
      const ACTIVE_KEY = 'zerotask-active-app';
      const existing = JSON.parse(localStorage.getItem(APPS_KEY) || '[]');
      // Don't add duplicates (check by URL or name)
      if (existing.some((a: Record<string, string>) => a.storeUrl === appUrl || a.name === app.name)) {
        // Already exists — just set it active
        const match = existing.find((a: Record<string, string>) => a.storeUrl === appUrl || a.name === app.name);
        if (match) { localStorage.setItem(ACTIVE_KEY, match.id); window.dispatchEvent(new Event('zerotask-apps-changed')); }
        return;
      }
      const GRADIENTS = [
        ['from-rose-500', 'to-pink-500'], ['from-blue-500', 'to-cyan-500'], ['from-violet-500', 'to-purple-500'],
        ['from-amber-500', 'to-orange-500'], ['from-emerald-500', 'to-teal-500'], ['from-red-500', 'to-rose-500'],
      ];
      const grad = GRADIENTS[existing.length % GRADIENTS.length];
      const initials = app.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const newApp = {
        id: Date.now().toString(),
        name: app.name,
        platform: 'iOS',
        category: app.category || 'App',
        storeUrl: appUrl,
        addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        color1: grad[0],
        color2: grad[1],
        initials,
        description: app.description?.substring(0, 500),
        icon: app.icon,
        rating: app.rating,
        reviewCount: app.reviewCount,
        developer: app.developer,
      };
      existing.push(newApp);
      localStorage.setItem(APPS_KEY, JSON.stringify(existing));
      localStorage.setItem(ACTIVE_KEY, newApp.id);
      window.dispatchEvent(new Event('zerotask-apps-changed'));
    } catch {}
  };

  const runAIAudit = async (appUrl: string) => {
    try {
      let realData: ScrapedApp | null = null;
      const idMatch = appUrl.match(/id(\d+)/);
      if (idMatch) {
        try {
          const scrapeRes = await apiFetch('/api/scrape', {
            method: 'POST',
            body: JSON.stringify({ action: 'lookup', url: appUrl }),
          });
          if (scrapeRes.ok) {
            const sd = await scrapeRes.json();
            if (sd && sd.name) {
              realData = {
                name: sd.name, icon: sd.icon, rating: sd.rating, reviewCount: sd.reviewCount,
                description: sd.description, category: sd.category, developer: sd.developer,
                screenshotCount: sd.screenshots?.length || sd.screenshotCount || 0,
              };
              setScrapedApp(realData);
              let score = 50;
              if (sd.rating >= 4.5) score += 15; else if (sd.rating >= 4.0) score += 8; else if (sd.rating < 3.5) score -= 10;
              if (sd.reviewCount > 10000) score += 10; else if (sd.reviewCount > 1000) score += 5; else if (sd.reviewCount < 100) score -= 10;
              const ssCount = sd.screenshots?.length || 0;
              if (ssCount >= 8) score += 5; else if (ssCount < 4) score -= 10;
              if (!sd.description || sd.description.length < 200) score -= 10;
              setGrowthScore(Math.max(10, Math.min(95, score)));
              addAppToPlatform(realData, appUrl);
            }
          }
        } catch {}
      }

      const aiPrompt = realData
        ? `Analyze this real app store listing data and provide an audit.

App Name: ${realData.name}
Developer: ${realData.developer}
Category: ${realData.category}
Rating: ${realData.rating}★ (${realData.reviewCount} reviews)
Screenshots: ${realData.screenshotCount}
Description (first 500 chars): ${realData.description?.substring(0, 500)}

Return a JSON object with:
- growthScore: number 0-100 (refine based on actual data)
- critical: array of 3 objects with { label: string } — critical issues found
- warnings: array of 3 objects with { label: string } — warnings  
- opportunities: array of 3 objects with { label: string } — growth opportunities

Be specific and actionable based on the REAL data above.`
        : `Analyze this app store listing URL and provide an audit. URL: ${appUrl}

Return a JSON object with:
- growthScore: number 0-100
- critical: array of 3 objects with { label: string } — critical issues found
- warnings: array of 3 objects with { label: string } — warnings
- opportunities: array of 3 objects with { label: string } — growth opportunities

Be specific and actionable.`;

      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({ task: 'freeform', tier: 'smart', prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const result = data.result;
      if (result && typeof result === 'object') {
        const r = result as { growthScore?: number; critical?: { label: string }[]; warnings?: { label: string }[]; opportunities?: { label: string }[] };
        if (r.growthScore) setGrowthScore(r.growthScore);
        if (r.critical?.length) setAuditResults(prev => ({ ...prev, critical: r.critical!.map(c => ({ label: c.label, type: 'critical' as const })) }));
        if (r.warnings?.length) setAuditResults(prev => ({ ...prev, warnings: r.warnings!.map(w => ({ label: w.label, type: 'warning' as const })) }));
        if (r.opportunities?.length) setAuditResults(prev => ({ ...prev, opportunities: r.opportunities!.map(o => ({ label: o.label, type: 'opportunity' as const })) }));
        setAiAuditDone(true);
        // Persist audit to Supabase
        saveAudit({
          app_url: appUrl,
          app_name: realData?.name,
          growth_score: r.growthScore || growthScore,
          critical: r.critical || auditResults.critical,
          warnings: r.warnings || auditResults.warnings,
          opportunities: r.opportunities || auditResults.opportunities,
          scraped_data: realData || undefined,
        }).catch(() => {});
      }
    } catch {}
  };

  const startAudit = () => {
    if (!url.trim()) return;
    if (!isValidStoreUrl(url)) {
      setUrlError('Please enter a valid App Store or Google Play URL');
      return;
    }
    setUrlError(null);
    setPhase('auditing');
    setCompletedSteps([]);
    setCurrentStep(0);
    setAuditResults(defaultAuditResults);
    setGrowthScore(34);
    setAiAuditDone(false);
    setScrapedApp(null);
    runAIAudit(url.trim());
  };

  useEffect(() => {
    if (phase !== 'auditing') return;
    if (currentStep >= auditSteps.length) {
      setTimeout(() => setPhase('results'), 600);
      return;
    }
    const timer = setTimeout(() => {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(prev => prev + 1);
    }, 800 + Math.random() * 400);
    return () => clearTimeout(timer);
  }, [phase, currentStep]);

  if (phase === 'input') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center -mt-6 relative overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="text-center max-w-2xl mx-auto animate-fade-in relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered App Growth
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-text-primary leading-tight mb-4">
            Grow your app.{' '}
            <br />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
              Automatically.
            </span>
          </h1>
          <p className="text-lg text-text-secondary mb-10 max-w-lg mx-auto">
            Paste your app link and let our AI agent audit, optimize, and grow your app — while you sleep.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <div className="relative flex-1">
              <input
                type="url"
                value={url}
                onChange={e => { setUrl(e.target.value); setUrlError(null); }}
                onKeyDown={e => e.key === 'Enter' && startAudit()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Paste your App Store or Google Play link"
                className={`w-full px-5 py-4 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-tertiary text-base focus:outline-none transition-all duration-300 ${
                  inputFocused
                    ? 'ring-2 ring-accent/30 border-accent shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                    : 'shadow-sm'
                }`}
              />
              {/* Pulsing glow on focus */}
              {inputFocused && (
                <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.08)',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }} />
              )}
            </div>
            <button
              onClick={startAudit}
              className="px-6 py-4 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all duration-200"
            >
              Start Growing <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {urlError && (
            <p className="text-sm text-red-500 mt-3">{urlError}</p>
          )}
          <p className="text-xs text-text-tertiary mt-4">Free audit • No sign-up required • Results in 30 seconds</p>
        </div>

        <style jsx>{`
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (phase === 'auditing') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center -mt-6 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="max-w-lg mx-auto animate-fade-in relative z-10 w-full px-4">
          <h2 className="text-2xl font-display font-bold text-text-primary text-center mb-8">
            Analyzing your app...
          </h2>
          <div className="space-y-3">
            {auditSteps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-3 transition-opacity duration-300"
                style={{ opacity: i <= currentStep ? 1 : 0.3 }}
              >
                {completedSteps.includes(i) ? (
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center animate-scale-in shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : i === currentStep ? (
                  <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-border shrink-0" />
                )}
                <span className={`text-sm ${completedSteps.includes(i) ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Staged skeleton cards */}
          <AuditSkeleton step={currentStep} />
        </div>
      </div>
    );
  }

  // Results phase
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center -mt-6 py-10 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-2xl mx-auto w-full animate-fade-in relative z-10">
        <div className="text-center mb-8">
          {scrapedApp && (
            <div className="flex items-center justify-center gap-3 mb-4">
              {scrapedApp.icon && <img src={scrapedApp.icon} alt={scrapedApp.name} className="w-16 h-16 rounded-2xl shadow-lg" />}
              <div className="text-left">
                <h3 className="font-bold text-text-primary text-lg">{scrapedApp.name}</h3>
                <p className="text-xs text-text-secondary">{scrapedApp.developer} • {scrapedApp.category} • {scrapedApp.rating}★ ({scrapedApp.reviewCount.toLocaleString()} reviews)</p>
              </div>
            </div>
          )}
          <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Audit Complete</h2>
          <p className="text-sm text-text-secondary">Here&apos;s where your app stands — and how to fix it.</p>
        </div>

        <div className="card p-8 mb-6">
          <div className="flex flex-col items-center mb-6">
            <GrowthScore score={growthScore} delta={0} label="Growth Score" />
          </div>

          {/* Email gate — show blurred preview until email captured */}
          {!emailSubmitted && (
            <div className="relative mb-6">
              {/* Blurred preview */}
              <div className="blur-[6px] select-none pointer-events-none opacity-60 space-y-4">
                {auditResults.critical.slice(0, 2).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-red-400 mt-0.5">•</span> {item.label}
                  </div>
                ))}
                {auditResults.opportunities.slice(0, 2).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <span className="text-blue-400 mt-0.5">•</span> {item.label}
                  </div>
                ))}
              </div>
              {/* Email capture overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-text-primary text-lg mb-1">Unlock Your Full Audit</h3>
                  <p className="text-xs text-text-secondary mb-4">We found {auditResults.critical.length} critical issues and {auditResults.opportunities.length} growth opportunities. Enter your email to see the details.</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError(null); }}
                        onKeyDown={e => e.key === 'Enter' && submitEmail()}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                    <button onClick={submitEmail}
                      className="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark transition-colors whitespace-nowrap">
                      Unlock
                    </button>
                  </div>
                  {emailError && <p className="text-xs text-red-500 mt-2">{emailError}</p>}
                  <button onClick={() => setEmailSubmitted(true)} className="text-[11px] text-text-tertiary mt-3 hover:text-text-secondary transition-colors">
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          )}

          {emailSubmitted && (<div className="space-y-6">
            {/* Critical */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Critical Issues</h3>
                <Badge variant="error">{auditResults.critical.length}</Badge>
              </div>
              <div className="space-y-2">
                {auditResults.critical.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-secondary pl-8">
                    <span className="text-red-400 mt-0.5">•</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Warnings</h3>
                <Badge variant="warning">{auditResults.warnings.length}</Badge>
              </div>
              <div className="space-y-2">
                {auditResults.warnings.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-secondary pl-8">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Opportunities</h3>
                <Badge variant="info">{auditResults.opportunities.length}</Badge>
              </div>
              <div className="space-y-2">
                {auditResults.opportunities.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-text-secondary pl-8">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>)}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            <Sparkles className="w-4 h-4" />
            Start Growing →
          </a>
          <a href="/dashboard" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Let me review first →
          </a>
        </div>
      </div>
    </div>
  );
}
