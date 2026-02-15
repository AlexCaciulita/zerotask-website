'use client';

import { useState, useCallback, useRef } from 'react';
import { Copy, RefreshCw, Download, Apple, Play, Search, Target, Facebook, Music, MessageCircle, Rocket, Check, Sparkles, ChevronDown, FileText } from 'lucide-react';
import clsx from 'clsx';
import { getBrandVoice } from '@/lib/brand-voice';
import { useActiveApp } from '@/lib/useActiveApp';

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

const COPY_DATA: Record<string, Record<Voice, string[][]>> = {
  appstore: {
    Professional: [
      ['Wit Dating — AI Message Assistant', 'Write Better Dating Messages', 'Never run out of things to say on Hinge, Tinder & Bumble.', 'Wit Dating uses cutting-edge AI to craft personalized messages for dating apps. Get smart reply suggestions, conversation starters, and witty openers that actually get responses. Trusted by 500K+ users.', 'dating assistant,ai message writer,rizz ai,dating text helper,conversation helper'],
      ['Wit Dating: Smart Message Writer', 'AI-Powered Dating Replies', 'Your AI wingman for dating app conversations.', 'Elevate your dating app conversations with AI-driven message suggestions. From opening lines to witty replies, Wit Dating helps you write messages that get responses.', 'dating assistant,smart messages,ai dating helper,text writer,reply generator'],
      ['Wit Dating — Dating Text Helper', 'Better Messages, More Replies', 'The intelligent assistant that writes your dating app messages.', 'Wit Dating combines advanced AI with your personal style. Get opener suggestions, reply ideas, and conversation starters — all tailored to each match.', 'dating text helper,message writer,ai assistant,dating replies'],
    ],
    Casual: [
      ['Wit Dating — AI Message Writer', 'Stop Sending "Hey" ✨', 'Your dating app texts are about to get a serious upgrade. Just saying.', 'Ever stare at your phone for 20 min trying to write one Hinge message? Same. That\'s why we built Wit Dating — paste the convo, let AI do its thing, and boom. Perfect reply.', 'dating assistant,easy texts,quick replies,ai magic,message writer'],
      ['Wit Dating: Text Smarter', 'No More Awkward Openers, Seriously', 'The easiest way to write great dating app messages. You\'re welcome.', 'Look, we get it — writing dating messages shouldn\'t feel like homework. Wit Dating makes it stupid simple. AI openers? One tap. Reply suggestions? Done. Your matches will think you\'re actually witty.', 'simple texts,easy replies,message helper,dating writer,no ghosting'],
      ['Wit Dating — AI Dating Assistant', 'Paste. Generate. Send. That Simple.', 'Finally, a texting assistant that doesn\'t make your messages sound robotic.', 'We took all the stress out of dating app conversations and replaced it with AI that sounds like you. Smart replies, great openers, more dates — all without the anxiety.', 'dating assistant,ai texts,message helper,reply writer,quick texts'],
    ],
    Playful: [
      ['Wit Dating — AI Rizz Generator', 'Your Texts Called. They Want a Glow Up 💅', 'Warning: Side effects include excessive response rates.', 'Meet your new secret weapon for dating app conversations! 💕 Wit Dating\'s AI is basically a wingman living in your phone. Wave goodbye to getting ghosted, hello to great convos. Rizz not included (but basically).', 'rizz generator,text glow up,fun messages,ai wingman,dating texts'],
      ['Wit Dating: Glow Up Your Texts', 'Making "Hey" Messages Extinct 🦕', 'Your dating app texts are about to have a serious glow-up moment.', 'Ready to send messages so good your matches think you\'re a professional writer? Wit Dating\'s AI understands vibes. Flirty? Witty? Chill? Just pick a tone and watch the magic happen ✨', 'glow up,vibe text,message magic,text glow,fun replies'],
      ['Wit Dating — Texting Wizardry', 'Abracadabra, You\'ve Got a Reply 🔥', 'Actual sorcery for your dating app messages. We don\'t make the rules.', 'Why spend hours crafting one message when AI can write the perfect reply in seconds? Wit Dating turns your "meh" texts into "WHOA" faster than you can say hello 💝 Smart replies, great convos, real dates.', 'text wizard,magic reply,instant message,fun texting,sparks fly'],
    ],
    Luxury: [
      ['Wit Dating — AI Message Artisan', 'Where Intelligence Meets Conversation', 'Where artificial intelligence meets authentic expression.', 'Wit Dating represents the pinnacle of modern dating communication. Our proprietary AI models, trained on millions of successful conversations, craft messages that meet the exacting standards of discerning communicators. Every reply is curated.', 'luxury assistant,premium messaging,artistry ai,professional writing,elite'],
      ['Wit Dating: Premier Messaging', 'Refined Communication, Unmatched Quality', 'The discerning dater\'s essential communication companion.', 'Crafted for those who accept nothing less than exceptional conversation. Wit Dating\'s AI understands the subtle nuances of tone that separate magnetic messages from the mundane.', 'premier messaging,refined writing,exceptional quality,discerning,elite'],
      ['Wit Dating — Masterclass Messaging', 'Excellence in Every Message', 'Curated AI technology for the most sophisticated communicators.', 'Experience dating conversation reimagined through the lens of excellence. Wit Dating delivers museum-quality messages with the precision of a master wordsmith. Your conversations deserve nothing less.', 'masterclass,elite messaging,sophisticated,precision writing,excellence'],
    ],
  },
};

function generatePlatformCopy(platform: string, voice: Voice, fields: Field[]): string[][] {
  const tones: Record<Voice, string> = {
    Professional: 'professional',
    Casual: 'casual and friendly',
    Playful: 'fun and energetic',
    Luxury: 'premium and sophisticated',
  };
  
  return [0, 1, 2].map(variation => 
    fields.map(f => {
      const base = {
        Professional: [`Wit Dating: AI dating message assistant${variation > 0 ? ` — variation ${variation + 1}` : ''}`, `Write better messages on Hinge, Tinder & Bumble`, `Smart reply suggestions, openers, and conversation starters. Used by 500K+ daters.`],
        Casual: [`Wit Dating writes your dating messages${variation > 0 ? ` ✌️ v${variation + 1}` : ' ✌️'}`, `Never send "hey" on dating apps again`, `One tap and boom — perfect reply. AI openers, witty messages, more dates. No writer's block needed.`],
        Playful: [`Wit Dating = texting sorcery 🪄${variation > 0 ? ` (take ${variation + 1})` : ''}`, `Your dating app texts are about to have a glow-up moment 💅`, `Warning: Your matches will think you're actually charming. AI-powered message magic that turns "meh" into "OMG" ✨`],
        Luxury: [`Wit Dating — Where Intelligence Meets Conversation${variation > 0 ? ` (Edition ${variation + 1})` : ''}`, `Refined messaging for the discerning dater`, `Elite AI-crafted messages. For those who accept nothing less than exceptional conversation.`],
      };
      const texts = base[voice];
      const idx = fields.indexOf(f) % texts.length;
      return texts[idx].slice(0, f.limit + 50);
    })
  );
}

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

  const generateWithAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (platform === 'appstore' && COPY_DATA.appstore[voice]) return COPY_DATA.appstore[voice];
    return generatePlatformCopy(platform, voice, fields);
  };

  const currentVariations = getVariations();

  const handleEdit = (varIdx: number, fieldIdx: number, value: string) => {
    const key = `${platform}-${voice}`;
    const current = [...getVariations().map(v => [...v])];
    current[varIdx][fieldIdx] = value;
    setVariations(prev => ({ ...prev, [key]: current }));
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
    </div>
  );
}
