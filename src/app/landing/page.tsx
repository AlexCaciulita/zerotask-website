'use client';

import { useState, useCallback } from 'react';
import {
  Layout, Palette, Code, Globe, Eye, Copy, Shield, Link2,
  Smartphone, Monitor, ExternalLink, Check, X, Image, Type, Download
} from 'lucide-react';
import clsx from 'clsx';

type Template = 'minimal' | 'bold' | 'playful';

const TEMPLATES: { key: Template; name: string; desc: string; accent: string }[] = [
  { key: 'minimal', name: 'Minimal', desc: 'Clean, whitespace-forward design', accent: 'bg-slate-900' },
  { key: 'bold', name: 'Bold', desc: 'High contrast, strong typography', accent: 'bg-violet-600' },
  { key: 'playful', name: 'Playful', desc: 'Rounded, colorful, friendly', accent: 'bg-pink-500' },
];

const ACCENT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899', '#0f172a'];

const PRIVACY_POLICY = (appName: string) => `Privacy Policy for ${appName}

Last updated: February 2026

${appName} ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our mobile application.

Information We Collect
• Account information (email, name) when you create an account
• Profile information and preferences you provide within the app
• Usage analytics (anonymous) to improve the app experience
• Device information (OS version, device model) for compatibility

How We Use Your Information
• To provide and improve our AI messaging assistant services
• To power AI-based message generation and conversation features
• To communicate important updates about the service
• To analyze usage patterns and improve user experience

Data Retention
• Data is processed and not stored on our servers unless you explicitly save them
• Account data is retained while your account is active
• You can request deletion of your data at any time

Contact Us
If you have questions about this Privacy Policy, contact us at privacy@${appName.toLowerCase().replace(/\s/g, '')}.app`;

export default function LandingPage() {
  const [template, setTemplate] = useState<Template>('minimal');
  const [appName, setAppName] = useState('My App');
  const [tagline, setTagline] = useState('Supercharge Your Productivity with AI');
  const [description, setDescription] = useState('AI-powered productivity assistant that helps you manage tasks, stay focused, and get more done every day.');
  const [ctaText, setCtaText] = useState('Download Free');
  const [appStoreUrl, setAppStoreUrl] = useState('https://apps.apple.com/app/myapp');
  const [playStoreUrl, setPlayStoreUrl] = useState('https://play.google.com/store/apps/details?id=com.myapp');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [hostOnZeroTask, setHostOnZeroTask] = useState(false);
  const [subdomain, setSubdomain] = useState('myapp');
  const [utmCampaign, setUtmCampaign] = useState('launch');
  const [utmSource, setUtmSource] = useState('product-hunt');
  const [utmMedium, setUtmMedium] = useState('referral');
  const [features, setFeatures] = useState([
    { name: 'AI Task Planner', desc: 'Automatically organize and prioritize your tasks' },
    { name: 'Smart Focus Mode', desc: 'Block distractions and stay in the zone' },
    { name: 'Progress Tracker', desc: 'AI-powered insights on your productivity' },
    { name: 'Daily Summaries', desc: 'Know exactly what you accomplished each day' },
  ]);
  const [toast, setToast] = useState('');

  const updateFeature = (idx: number, field: 'name' | 'desc', value: string) => {
    setFeatures(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };
  const addFeature = () => setFeatures(prev => [...prev, { name: 'New Feature', desc: 'Feature description' }]);
  const removeFeature = (idx: number) => setFeatures(prev => prev.filter((_, i) => i !== idx));

  const appendUtm = (url: string) => {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}utm_campaign=${encodeURIComponent(utmCampaign)}&utm_source=${encodeURIComponent(utmSource)}&utm_medium=${encodeURIComponent(utmMedium)}`;
  };

  const generateHTML = useCallback(() => {
    const appStoreLink = appendUtm(appStoreUrl);
    const playStoreLink = appendUtm(playStoreUrl);
    const featuresHTML = features.map((f, i) => {
      const emojis = ['✨', '💬', '🎯', '🔮', '🚀', '💡'];
      const emoji = emojis[i % emojis.length];
      if (template === 'bold') {
        return `<div style="padding:24px;border-radius:16px;border:2px solid ${accentColor}33"><h3 style="font-weight:700;font-size:18px;margin-bottom:8px">${f.name}</h3><p style="color:#64748b;font-size:14px">${f.desc}</p></div>`;
      }
      if (template === 'playful') {
        return `<div style="text-align:center;padding:24px;border-radius:16px;background:#f8fafc"><span style="font-size:30px;display:block;margin-bottom:12px">${emoji}</span><h3 style="font-weight:700;margin-bottom:4px">${f.name}</h3><p style="color:#64748b;font-size:14px">${f.desc}</p></div>`;
      }
      return `<div><div style="width:40px;height:40px;border-radius:8px;background:${accentColor}20;display:flex;align-items:center;justify-content:center;margin-bottom:12px"><div style="width:20px;height:20px;border-radius:4px;background:${accentColor}"></div></div><h3 style="font-weight:600;margin-bottom:4px">${f.name}</h3><p style="color:#64748b;font-size:14px">${f.desc}</p></div>`;
    }).join('\n            ');

    const privacySection = showPrivacy ? `
        <section id="privacy" style="max-width:700px;margin:60px auto 0;padding:40px 20px;border-top:1px solid #e2e8f0">
          <h2 style="font-size:24px;font-weight:700;margin-bottom:16px">Privacy Policy</h2>
          <pre style="white-space:pre-wrap;font-size:13px;color:#64748b;line-height:1.7;font-family:inherit">${PRIVACY_POLICY(appName)}</pre>
        </section>` : '';

    const storeButtons = `
            <div style="display:flex;gap:12px;${template === 'bold' ? '' : 'justify-content:center;'}margin-top:24px;flex-wrap:wrap">
              ${appStoreUrl ? `<a href="${appStoreLink}" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">🍎 App Store</a>` : ''}
              ${playStoreUrl ? `<a href="${playStoreLink}" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">▶️ Google Play</a>` : ''}
            </div>`;

    const cols = features.length <= 3 ? features.length : Math.min(features.length, 4);

    let bodyContent = '';
    if (template === 'bold') {
      bodyContent = `
        <div style="padding:48px;color:white;background:${accentColor}">
          <nav style="display:flex;justify-content:space-between;align-items:center;margin-bottom:48px;font-size:14px">
            <span style="font-weight:900;font-size:20px">${appName}</span>
            <div style="display:flex;gap:24px;opacity:0.7"><a href="#features" style="color:white;text-decoration:none">Features</a>${showPrivacy ? '<a href="#privacy" style="color:white;text-decoration:none">Privacy</a>' : ''}</div>
          </nav>
          <h1 style="font-size:clamp(28px,5vw,48px);font-weight:900;margin-bottom:16px;line-height:1.1">${tagline}</h1>
          <p style="font-size:18px;opacity:0.8;margin-bottom:32px;max-width:500px">${description}</p>
          <a href="${appStoreLink || playStoreLink}" style="display:inline-block;padding:12px 32px;border-radius:8px;background:white;color:${accentColor};font-weight:700;font-size:18px;text-decoration:none">${ctaText}</a>
          ${storeButtons.replace(/#0f172a/g, 'rgba(255,255,255,0.2)').replace(/color:white/g, 'color:white')}
        </div>
        <div style="padding:48px">
          <div id="features" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px">${featuresHTML}</div>
        </div>`;
    } else if (template === 'playful') {
      bodyContent = `
        <div style="padding:48px;text-align:center">
          <nav style="display:flex;justify-content:space-between;align-items:center;margin-bottom:48px;font-size:14px">
            <span style="font-weight:700;font-size:20px">✨ ${appName}</span>
            <div style="display:flex;gap:24px;color:#64748b"><a href="#features" style="color:inherit;text-decoration:none">Features</a>${showPrivacy ? '<a href="#privacy" style="color:inherit;text-decoration:none">Privacy</a>' : ''}</div>
          </nav>
          <div style="display:inline-block;padding:6px 16px;border-radius:999px;font-size:14px;font-weight:500;background:${accentColor}15;color:${accentColor};margin-bottom:24px">🎉 Now available on iOS & Android</div>
          <h1 style="font-size:clamp(28px,5vw,40px);font-weight:700;margin-bottom:16px;line-height:1.2">${tagline} <span style="color:${accentColor}">✨</span></h1>
          <p style="font-size:18px;color:#64748b;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto">${description}</p>
          <a href="${appStoreLink || playStoreLink}" style="display:inline-block;padding:16px 32px;border-radius:16px;background:${accentColor};color:white;font-weight:700;font-size:18px;text-decoration:none;box-shadow:0 4px 14px ${accentColor}40">${ctaText} →</a>
          ${storeButtons}
          <div id="features" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;margin-top:48px">${featuresHTML}</div>
        </div>`;
    } else {
      bodyContent = `
        <div style="padding:48px;text-align:center">
          <nav style="display:flex;justify-content:space-between;align-items:center;margin-bottom:64px;font-size:14px">
            <span style="font-weight:700;font-size:18px;color:${accentColor}">${appName}</span>
            <div style="display:flex;gap:24px;color:#64748b"><a href="#features" style="color:inherit;text-decoration:none">Features</a>${showPrivacy ? '<a href="#privacy" style="color:inherit;text-decoration:none">Privacy</a>' : ''}</div>
          </nav>
          <h1 style="font-size:clamp(28px,5vw,40px);font-weight:700;margin-bottom:16px;line-height:1.2;color:#0f172a">${tagline}</h1>
          <p style="font-size:18px;color:#64748b;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto">${description}</p>
          <a href="${appStoreLink || playStoreLink}" style="display:inline-block;padding:12px 32px;border-radius:8px;background:${accentColor};color:white;font-weight:500;font-size:18px;text-decoration:none">${ctaText}</a>
          ${storeButtons}
          <div id="features" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;margin-top:64px;text-align:left">${featuresHTML}</div>
        </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName} — ${tagline}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${appName} — ${tagline}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://placeholder.com/og-image.png">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; }
        a { transition: opacity 0.2s; }
        a:hover { opacity: 0.85; }
        @media (max-width: 640px) {
            div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
            h1 { font-size: 28px !important; }
        }
    </style>
</head>
<body>
    <div style="max-width:900px;margin:0 auto">
        ${bodyContent}
        ${privacySection}
        <footer style="text-align:center;padding:32px 20px;color:#94a3b8;font-size:13px">
          © ${new Date().getFullYear()} ${appName}. All rights reserved.${showPrivacy ? ' <a href="#privacy" style="color:#64748b;text-decoration:underline">Privacy Policy</a>' : ''}
        </footer>
    </div>
</body>
</html>`;
  }, [template, appName, tagline, description, ctaText, appStoreUrl, playStoreUrl, accentColor, showPrivacy, features, utmCampaign, utmSource, utmMedium]);

  const exportCode = useCallback(() => {
    const html = generateHTML();
    navigator.clipboard.writeText(html).then(() => showToast('HTML copied to clipboard!'));
  }, [generateHTML]);

  const downloadHTML = useCallback(() => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName.toLowerCase().replace(/\s+/g, '-')}-landing.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('HTML file downloaded!');
  }, [generateHTML, appName]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const utmUrl = `https://${subdomain}.zerotask.app?utm_campaign=${utmCampaign}&utm_source=${utmSource}&utm_medium=${utmMedium}`;

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-[fadeIn_0.2s]">
          <Check className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Layout className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Landing Page Builder</h1>
              <p className="text-sm text-text-secondary">Create a conversion-optimized landing page</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadHTML}
              className="px-4 py-2 bg-surface-tertiary text-text-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Download HTML
            </button>
            <button onClick={exportCode}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center gap-1.5">
              <Code className="w-4 h-4" /> Export Code
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Editor Panel */}
        <div className="w-[380px] shrink-0 border-r border-border overflow-y-auto h-[calc(100vh-77px)] p-5 space-y-5">
          {/* Template Picker */}
          <div>
            <label className="text-sm font-medium mb-2 block">Template</label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button key={t.key} onClick={() => setTemplate(t.key)}
                  className={clsx('rounded-lg border-2 p-3 text-center transition-all', template === t.key ? 'border-accent bg-accent/5' : 'border-border hover:border-border-light')}>
                  <div className={clsx('w-full h-12 rounded mb-2', t.accent)} />
                  <p className="text-xs font-medium">{t.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* App Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">App Name</label>
            <input value={appName} onChange={e => setAppName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>

          {/* Tagline */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tagline</label>
            <input value={tagline} onChange={e => setTagline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
          </div>

          {/* Screenshots */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Screenshots</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="aspect-[9/16] rounded-lg bg-surface-tertiary border border-dashed border-border flex items-center justify-center">
                  <Image className="w-5 h-5 text-text-tertiary" />
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium block">Features</label>
              <button onClick={addFeature} className="text-xs text-accent hover:underline">+ Add</button>
            </div>
            <div className="space-y-2">
              {features.map((f, i) => (
                <div key={i} className="bg-surface-secondary rounded-lg border border-border p-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input value={f.name} onChange={e => updateFeature(i, 'name', e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-surface border border-border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-accent/50" />
                    {features.length > 1 && (
                      <button onClick={() => removeFeature(i)} className="text-text-tertiary hover:text-red-400 p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input value={f.desc} onChange={e => updateFeature(i, 'desc', e.target.value)}
                    className="w-full px-2 py-1 rounded bg-surface border border-border text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent/50" />
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">CTA Button Text</label>
            <input value={ctaText} onChange={e => setCtaText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>

          {/* Store Links */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">App Store URL</label>
            <input value={appStoreUrl} onChange={e => setAppStoreUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Play Store URL</label>
            <input value={playStoreUrl} onChange={e => setPlayStoreUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>

          {/* Accent Color */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(c => (
                <button key={c} onClick={() => setAccentColor(c)}
                  className={clsx('w-8 h-8 rounded-full border-2 transition-all', accentColor === c ? 'border-text-primary scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Host on ZeroTask */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-medium">Host on ZeroTask</span>
            </div>
            <button onClick={() => setHostOnZeroTask(!hostOnZeroTask)}
              className={clsx('w-10 h-6 rounded-full transition-all', hostOnZeroTask ? 'bg-accent' : 'bg-surface-tertiary')}>
              <div className={clsx('w-4 h-4 rounded-full bg-white shadow transition-all', hostOnZeroTask ? 'translate-x-5' : 'translate-x-1')} />
            </button>
          </div>
          {hostOnZeroTask && (
            <div className="flex items-center gap-1 text-sm">
              <input value={subdomain} onChange={e => setSubdomain(e.target.value)}
                className="px-2 py-1.5 rounded-l-lg bg-surface-secondary border border-border text-sm focus:outline-none w-32" />
              <span className="px-2 py-1.5 bg-surface-tertiary border border-l-0 border-border rounded-r-lg text-text-tertiary text-sm">.zerotask.app</span>
            </div>
          )}

          {/* Privacy Policy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-medium">Privacy Policy</span>
            </div>
            <button onClick={() => setShowPrivacy(!showPrivacy)}
              className={clsx('w-10 h-6 rounded-full transition-all', showPrivacy ? 'bg-accent' : 'bg-surface-tertiary')}>
              <div className={clsx('w-4 h-4 rounded-full bg-white shadow transition-all', showPrivacy ? 'translate-x-5' : 'translate-x-1')} />
            </button>
          </div>
          {showPrivacy && (
            <pre className="text-xs text-text-secondary bg-surface-secondary rounded-lg p-3 border border-border whitespace-pre-wrap max-h-40 overflow-y-auto">
              {PRIVACY_POLICY(appName)}
            </pre>
          )}

          {/* UTM Tracking */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-medium">UTM Tracking</span>
            </div>
            <div className="space-y-2">
              <input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="Campaign"
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="Source"
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              <input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="Medium"
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div className="mt-2 p-2 bg-surface-secondary rounded-lg border border-border">
              <p className="text-xs text-text-tertiary mb-1">Preview URL</p>
              <p className="text-xs text-accent break-all font-mono">{utmUrl}</p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 bg-surface-tertiary p-6 overflow-y-auto h-[calc(100vh-77px)]">
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-border">
            {/* Template: Minimal */}
            {template === 'minimal' && (
              <div className="p-12 text-center">
                <nav className="flex justify-between items-center mb-16 text-sm">
                  <span className="font-bold text-lg" style={{ color: accentColor }}>{appName}</span>
                  <div className="flex gap-6 text-slate-500">
                    <span>Features</span><span>Pricing</span><span>About</span>
                  </div>
                </nav>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">{tagline}</h1>
                <p className="text-lg text-slate-500 mb-8 max-w-lg mx-auto">{description}</p>
                <button className="px-8 py-3 rounded-lg text-white font-medium text-lg" style={{ backgroundColor: accentColor }}>
                  {ctaText}
                </button>
                <div className="flex justify-center gap-4 mt-6">
                  <div className="w-32 h-10 bg-slate-900 dark:bg-slate-700 rounded-lg" />
                  <div className="w-32 h-10 bg-slate-900 dark:bg-slate-700 rounded-lg" />
                </div>
                <div className="flex justify-center gap-4 mt-12">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-36 h-64 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-8 mt-16 text-left">
                  {features.slice(0, 3).map(f => (
                    <div key={f.name}>
                      <div className="w-10 h-10 rounded-lg mb-3" style={{ backgroundColor: accentColor + '20' }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-5 h-5 rounded" style={{ backgroundColor: accentColor }} />
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{f.name}</h3>
                      <p className="text-sm text-slate-500">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template: Bold */}
            {template === 'bold' && (
              <div>
                <div className="p-12 text-white" style={{ backgroundColor: accentColor }}>
                  <nav className="flex justify-between items-center mb-12 text-sm">
                    <span className="font-black text-xl">{appName}</span>
                    <div className="flex gap-6 text-white/70">
                      <span>Features</span><span>Pricing</span><span>About</span>
                    </div>
                  </nav>
                  <h1 className="text-5xl font-black mb-4 leading-none">{tagline}</h1>
                  <p className="text-xl text-white/80 mb-8 max-w-lg">{description}</p>
                  <button className="px-8 py-3 rounded-lg bg-white font-bold text-lg" style={{ color: accentColor }}>
                    {ctaText}
                  </button>
                  <div className="flex gap-4 mt-6">
                    <div className="w-32 h-10 bg-white/20 rounded-lg" />
                    <div className="w-32 h-10 bg-white/20 rounded-lg" />
                  </div>
                </div>
                <div className="p-12">
                  <div className="flex justify-center gap-4 mb-12">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-36 h-64 rounded-xl" style={{ backgroundColor: accentColor + '15' }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-8">
                    {features.slice(0, 3).map(f => (
                      <div key={f.name} className="p-6 rounded-xl border-2" style={{ borderColor: accentColor + '30' }}>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">{f.name}</h3>
                        <p className="text-sm text-slate-500">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Template: Playful */}
            {template === 'playful' && (
              <div className="p-12">
                <nav className="flex justify-between items-center mb-12 text-sm">
                  <span className="font-bold text-xl">✨ {appName}</span>
                  <div className="flex gap-6 text-slate-500">
                    <span>Features</span><span>Pricing</span><span>About</span>
                  </div>
                </nav>
                <div className="text-center">
                  <div className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: accentColor + '15', color: accentColor }}>
                    🎉 Now available on iOS & Android
                  </div>
                  <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                    {tagline} <span style={{ color: accentColor }}>✨</span>
                  </h1>
                  <p className="text-lg text-slate-500 mb-8 max-w-lg mx-auto">{description}</p>
                  <button className="px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-lg" style={{ backgroundColor: accentColor }}>
                    {ctaText} →
                  </button>
                  <div className="flex justify-center gap-4 mt-6">
                    <div className="w-32 h-10 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
                    <div className="w-32 h-10 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-12">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-36 h-64 rounded-3xl shadow-md" style={{ backgroundColor: accentColor + '10' }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-6 mt-12">
                  {features.slice(0, 3).map((f, i) => {
                    const emojis = ['💬', '✨', '🎯', '🔮', '🚀', '💡'];
                    return (
                      <div key={f.name} className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-3xl mb-3 block">{emojis[i % emojis.length]}</span>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">{f.name}</h3>
                        <p className="text-sm text-slate-500">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
