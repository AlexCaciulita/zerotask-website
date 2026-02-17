'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Copy, RefreshCw, Download, Apple, Play, Search, Target, Facebook, Music, MessageCircle, Rocket, Check, Sparkles, ChevronDown, FileText, PenTool } from 'lucide-react';
import clsx from 'clsx';
import { getBrandVoice } from '@/lib/brand-voice';
import { useActiveApp } from '@/lib/useActiveApp';
import { apiFetch } from '@/lib/api-client';
import EmptyState from '@/components/EmptyState';

type Voice = 'Professional' | 'Casual' | 'Playful' | 'Luxury';
type Platform = typeof PLATFORMS[number]['id'];

const PLATFORMS = [
  { id: 'appstore', label: 'App Store', icon: <Apple className="w-4 h-4" /> },
  { id: 'playstore', label: 'Play Store', icon: <Play className="w-4 h-4" /> },
  { id: 'asa', label: 'Apple Search Ads', icon: <Search className="w-4 h-4" /> },
  { id: 'guac', label: 'Google UAC', icon: <Target className="w-4 h-4" /> },
  { id: 'meta', label: 'Meta Ads', icon: <Facebook className="w-4 h-4" /> },
  { id: 'tiktok', label: 'TikTok', icon: <Music className="w-4 h-4" /> },
  { id: 'reddit', label: 'Reddit', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'producthunt', label: 'Product Hunt', icon: <Rocket className="w-4 h-4" /> },
] as const;

const VOICES: Voice[] = ['Professional', 'Casual', 'Playful', 'Luxury'];

interface Field { label: string; limit: number; }

const PLATFORM_FIELDS: Record<string, Field[]> = {
  appstore: [
    { label: 'Title', limit: 30 },
    { label: 'Subtitle', limit: 30 },
    { label: 'Promotional Text', limit: 170 },
    { label: 'Description', limit: 4000 },
    { label: 'Keywords', limit: 100 },
  ],
  playstore: [
    { label: 'Title', limit: 30 },
    { label: 'Short Description', limit: 80 },
    { label: 'Full Description', limit: 4000 },
  ],
  asa: [
    { label: 'Headline', limit: 30 },
    { label: 'Description Line 1', limit: 90 },
    { label: 'Description Line 2', limit: 90 },
  ],
  guac: [
    { label: 'Headline', limit: 30 },
    { label: 'Description', limit: 90 },
    { label: 'Long Headline', limit: 90 },
  ],
  meta: [
    { label: 'Primary Text', limit: 125 },
    { label: 'Headline', limit: 40 },
    { label: 'Description', limit: 125 },
  ],
  tiktok: [
    { label: 'Ad Text', limit: 100 },
    { label: 'CTA Text', limit: 20 },
  ],
  reddit: [
    { label: 'Title', limit: 300 },
    { label: 'Body', limit: 2000 },
  ],
  producthunt: [
    { label: 'Tagline', limit: 60 },
    { label: 'Description', limit: 260 },
    { label: 'First Comment', limit: 1000 },
  ],
};

function charCountColor(len: number, limit: number): string {
  const ratio = len / limit;
  if (ratio >= 1) return 'text-red-500';
  if (ratio >= 0.85) return 'text-amber-500';
  return 'text-neutral-400';
}

function progressBarColor(len: number, limit: number): string {
  const ratio = len / limit;
  if (ratio >= 1) return 'bg-red-500';
  if (ratio >= 0.85) return 'bg-amber-500';
  if (ratio >= 0.7) return 'bg-amber-400';
  return 'bg-emerald-500';
}

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />;

export default function CopyPage() {
  const { app, mounted } = useActiveApp();
  const getActiveAppData = () => ({ name: app?.name || 'App', category: app?.category || 'General', platform: app?.platform?.toLowerCase() || 'ios', description: app?.description || '' });
  const [platform, setPlatform] = useState<string>('appstore');
  const [voice, setVoice] = useState<Voice>('Professional');
  const [variations, setVariations] = useState<Record<string, string[][]>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Load cached copy from localStorage on mount
  useEffect(() => {
    const cached: Record<string, string[][]> = {};
    for (const p of PLATFORMS) {
      for (const v of VOICES) {
        const key = `zerotask-copy-${p.id}-${v}`;
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cached[`${p.id}-${v}`] = parsed;
            }
          }
        } catch {
          // ignore corrupt cache entries
        }
      }
    }
    if (Object.keys(cached).length > 0) {
      setVariations(cached);
    }
  }, []);

  const generateWithAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          task: 'generate-copy',
          appData: getActiveAppData(),
          platform,
          tone: voice,
          brandVoice: getBrandVoice(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      const result = data.result;
      const fields = PLATFORM_FIELDS[platform];
      let parsed: string[][] = [];
      if (Array.isArray(result)) {
        parsed = result.map((v: Record<string, string>) => {
          const vals: string[] = [];
          for (const f of fields) {
            const key = f.label.toLowerCase().replace(/\s+/g, '');
            const match = Object.entries(v).find(([k]) => k.toLowerCase().replace(/\s+/g, '').includes(key) || key.includes(k.toLowerCase().replace(/\s+/g, '')));
            vals.push(match ? (Array.isArray(match[1]) ? match[1].join(', ') : String(match[1])) : '');
          }
          return vals;
        });
      }
      if (parsed.length > 0) {
        const key = `${platform}-${voice}`;
        setVariations(prev => ({ ...prev, [key]: parsed }));
        try {
          localStorage.setItem(`zerotask-copy-${platform}-${voice}`, JSON.stringify(parsed));
        } catch {
          // ignore storage errors
        }
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  }, [platform, voice]);

  const regenerateVariation = useCallback(async (varIdx: number) => {
    setRegenLoading(varIdx);
    try {
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          task: 'freeform',
          tier: 'smart',
          prompt: `Generate ONE variation of ${platform} listing copy for ${getActiveAppData().name} (${getActiveAppData().category} app). Tone: ${voice}. Fields needed: ${PLATFORM_FIELDS[platform].map(f => f.label).join(', ')}. Return as JSON object with those field names as keys.`,
          brandVoice: getBrandVoice(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      const result = data.result;
      const fields = PLATFORM_FIELDS[platform];
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        const vals: string[] = fields.map(f => {
          const key = f.label.toLowerCase().replace(/\s+/g, '');
          const match = Object.entries(result as Record<string, string>).find(([k]) => k.toLowerCase().replace(/\s+/g, '').includes(key) || key.includes(k.toLowerCase().replace(/\s+/g, '')));
          return match ? (Array.isArray(match[1]) ? match[1].join(', ') : String(match[1])) : '';
        });
        const key = `${platform}-${voice}`;
        const current = [...getVariations().map(v => [...v])];
        current[varIdx] = vals;
        setVariations(prev => ({ ...prev, [key]: current }));
        try {
          localStorage.setItem(`zerotask-copy-${platform}-${voice}`, JSON.stringify(current));
        } catch {
          // ignore storage errors
        }
      }
    } catch {
      // silent fail for single regen
    } finally {
      setRegenLoading(null);
    }
  }, [platform, voice]);

  const fields = PLATFORM_FIELDS[platform];
  
  const getVariations = (): string[][] => {
    const key = `${platform}-${voice}`;
    if (variations[key]) return variations[key];
    return [];
  };

  const currentVariations = getVariations();

  const handleEdit = (varIdx: number, fieldIdx: number, value: string) => {
    const key = `${platform}-${voice}`;
    const current = [...getVariations().map(v => [...v])];
    current[varIdx][fieldIdx] = value;
    setVariations(prev => ({ ...prev, [key]: current }));
    try {
      localStorage.setItem(`zerotask-copy-${platform}-${voice}`, JSON.stringify(current));
    } catch {
      // ignore storage errors
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const all = currentVariations.map((v, vi) =>
      `=== Variation ${vi + 1} ===\n` + fields.map((f, fi) => `${f.label}: ${v[fi]}`).join('\n')
    ).join('\n\n');
    navigator.clipboard.writeText(all);
    setCopiedId('export');
    setShowExportMenu(false);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadTxt = () => {
    const all = currentVariations.map((v, vi) =>
      `=== Variation ${vi + 1} ===\n` + fields.map((f, fi) => `${f.label}: ${v[fi]}`).join('\n')
    ).join('\n\n');
    const blob = new Blob([all], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-${voice}-copy.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Copy Machine</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Generate optimized copy for every platform</p>
        </div>
        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium rounded-lg transition-colors duration-150"
          >
            {copiedId === 'export' ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {copiedId === 'export' ? 'Copied!' : 'Export'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl z-20 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <button onClick={handleExportAll} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <Copy className="w-3.5 h-3.5" /> Copy All
              </button>
              <button onClick={handleDownloadTxt} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <FileText className="w-3.5 h-3.5" /> Download TXT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Platform Tabs - Segmented control style */}
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg overflow-x-auto">
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setPlatform(p.id)} className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-150 shrink-0',
              platform === p.id
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            )}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
        <button onClick={generateWithAI} disabled={aiLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap bg-emerald-500 hover:bg-emerald-600 text-white transition-all duration-150 shrink-0 disabled:opacity-50 active:scale-[0.98]">
          {aiLoading ? <Spinner /> : <Sparkles className="w-4 h-4" />} {aiLoading ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>
      {aiError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{aiError}</div>}

      {/* Tone Selector - Horizontal pills */}
      <div className="inline-flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
        {VOICES.map(v => (
          <button key={v} onClick={() => setVoice(v)} className={clsx(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
            voice === v
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          )}>{v}</button>
        ))}
      </div>

      {/* Variation Cards */}
      {currentVariations.length === 0 ? (
        <EmptyState
          icon={PenTool}
          title="No copy generated"
          description="Click Generate to create optimized copy for this platform using AI."
          actionLabel="Generate Copy"
          onAction={generateWithAI}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {currentVariations.map((variation, vi) => (
          <div key={vi} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Variation {String.fromCharCode(65 + vi)}</span>
              <button
                onClick={() => regenerateVariation(vi)}
                disabled={regenLoading === vi}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-emerald-500 transition-colors duration-150 px-2 py-1 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800"
                title="Regenerate with AI"
              >
                {regenLoading === vi ? <Spinner /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {fields.map((field, fi) => {
                const text = variation[fi] || '';
                const overLimit = text.length > field.limit;
                const id = `${vi}-${fi}`;
                const ratio = Math.min(1, text.length / field.limit);
                return (
                  <div key={fi}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{field.label}</label>
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs tabular-nums transition-colors duration-300', charCountColor(text.length, field.limit))}>{text.length}/{field.limit}</span>
                        <button onClick={() => handleCopy(text, id)} className="text-neutral-400 hover:text-emerald-500 transition-colors duration-150">
                          {copiedId === id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={text}
                      onChange={e => handleEdit(vi, fi, e.target.value)}
                      rows={field.limit > 200 ? 4 : field.limit > 50 ? 2 : 1}
                      className={clsx(
                        'w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-colors duration-150',
                        overLimit ? 'border-red-300 dark:border-red-800' : 'border-neutral-200 dark:border-neutral-700'
                      )}
                    />
                    {/* Character count progress bar */}
                    <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={clsx('h-full rounded-full transition-all duration-300', progressBarColor(text.length, field.limit))}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
