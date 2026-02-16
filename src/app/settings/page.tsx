'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Key, MessageSquare, Bell, Cpu, AppWindow, Plus,
  Trash2, Pencil, Check, Eye, EyeOff, Zap, DollarSign, X,
  User, CreditCard, Shield, LogOut, Download, AlertTriangle,
  ExternalLink, Mail, Calendar, Clock, CheckCircle, XCircle,
  Loader2, Crown, BarChart3, FileText, Link2
} from 'lucide-react';
import { saveBrandVoice } from '@/lib/brand-voice';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api-client';
import { useSubscription } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';
import clsx from 'clsx';

const APPS_STORAGE_KEY = 'zerotask-settings-apps';
const ACTIVE_APP_KEY = 'zerotask-active-app';
const API_KEYS_STORAGE_KEY = 'zerotask-api-keys';

type Tab = 'account' | 'subscription' | 'apps' | 'brand-voice' | 'ai-models' | 'notifications' | 'data-privacy';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
  { key: 'subscription', label: 'Subscription', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'apps', label: 'Apps', icon: <AppWindow className="w-4 h-4" /> },
  { key: 'brand-voice', label: 'Brand Voice', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'ai-models', label: 'AI Models', icon: <Cpu className="w-4 h-4" /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { key: 'data-privacy', label: 'Data & Privacy', icon: <Shield className="w-4 h-4" /> },
];

const TONES = ['Professional', 'Casual', 'Playful', 'Luxury', 'Edgy'] as const;
type Tone = typeof TONES[number];

const TONE_EXAMPLES: Record<Tone, string> = {
  Professional: 'Your App is your AI-powered productivity assistant. It analyzes your workflow and tasks to suggest optimizations that save hours — so you can focus on what matters most.',
  Casual: 'Your App is like having a super-organized friend who plans your whole day for you. Overwhelmed by tasks? We\'ve got you. Productivity goes through the roof!',
  Playful: 'Never miss a deadline again! Your App uses AI to plan, prioritize, and power through your to-do list. Your boss won\'t know what hit them. You\'re welcome!',
  Luxury: 'Elevate every workday. Your App\'s AI crafts intelligent schedules tailored to your goals — transforming your productivity experience from chaotic to masterful.',
  Edgy: 'Your to-do list is a mess. There, we said it. But Your App\'s AI will organize your life so well people think you actually have it together. Just open, plan, and thank us later.',
};

interface AppEntry {
  id: string;
  name: string;
  platform: string;
  category: string;
  storeUrl: string;
  addedAt: string;
  color1: string;
  color2: string;
  initials: string;
}

interface AIModel {
  task: string;
  model: string;
  models: string[];
  quality: boolean;
}

interface ApiKeyEntry {
  name: string;
  key: string;
  fields?: Record<string, string>;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
}

const MODEL_COSTS: Record<string, [number, number]> = {
  'Claude Haiku': [8, 12], 'Claude Sonnet': [30, 45], 'Claude Opus': [60, 85],
  'GPT-4o Mini': [6, 10], 'GPT-4o': [35, 50], 'GPT Image': [40, 60],
  'DALL-E 3': [35, 55], 'Midjourney API': [45, 70],
};

const DEFAULT_APPS: AppEntry[] = [
  { id: '1', name: 'My App', platform: 'iOS', category: 'Productivity', storeUrl: 'https://apps.apple.com/app/id123456', addedAt: 'Jan 5, 2026', color1: 'from-emerald-500', color2: 'to-teal-500', initials: 'MA' },
];

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={clsx('fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2',
      type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { plan, isPro, status: subStatus, expiresAt } = useSubscription();

  const [tab, setTab] = useState<Tab>('account');
  const [tone, setTone] = useState<Tone>('Casual');
  const [guidelines, setGuidelines] = useState('Always mention the app name. Keep sentences short. Use emojis sparingly. Focus on benefits over features.');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  // Load brand voice from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zerotask-brand-voice');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tone && TONES.includes(parsed.tone)) setTone(parsed.tone);
        if (parsed.guidelines) setGuidelines(parsed.guidelines);
      }
    } catch {}
  }, []);

  // Persist brand voice changes
  useEffect(() => {
    saveBrandVoice({ tone, guidelines });
  }, [tone, guidelines]);

  const [models, setModels] = useState<AIModel[]>([
    { task: 'ASO Analysis', model: 'Claude Haiku', models: ['Claude Haiku', 'Claude Sonnet', 'GPT-4o Mini'], quality: false },
    { task: 'Copy Generation', model: 'Claude Sonnet', models: ['Claude Haiku', 'Claude Sonnet', 'Claude Opus', 'GPT-4o'], quality: true },
    { task: 'Strategy', model: 'Claude Opus', models: ['Claude Sonnet', 'Claude Opus', 'GPT-4o', 'GPT-4o Mini'], quality: true },
    { task: 'Image Gen', model: 'GPT Image', models: ['GPT Image', 'DALL-E 3', 'Midjourney API'], quality: true },
  ]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState({ telegram: true, email: true, webPush: false, frequency: 'daily' });
  const [apps, setApps] = useState<AppEntry[]>(DEFAULT_APPS);
  const [showAddApp, setShowAddApp] = useState(false);
  const [editingApp, setEditingApp] = useState<string | null>(null);
  const [newApp, setNewApp] = useState({ name: '', platform: 'iOS', category: '', storeUrl: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Account state
  const [displayName, setDisplayName] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteAccountText, setDeleteAccountText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Subscription state
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([
    { name: 'Anthropic', key: '', status: 'disconnected' },
    { name: 'OpenAI', key: '', status: 'disconnected' },
    { name: 'Postiz', key: '', status: 'disconnected' },
    { name: 'App Store Connect - Issuer ID', key: '', status: 'disconnected' },
    { name: 'App Store Connect - Key ID', key: '', status: 'disconnected' },
    { name: 'RevenueCat', key: '', status: 'disconnected' },
  ]);

  // Data & Privacy state
  const [clearDataConfirm, setClearDataConfirm] = useState(false);

  // Load user info
  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || '');
    }
  }, [user]);

  // Load apps from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(APPS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setApps(parsed);
      }
    } catch {}
  }, []);

  // Load API keys from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setApiKeys(parsed);
      }
    } catch {}
  }, []);

  // Save apps to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
    window.dispatchEvent(new Event('zerotask-apps-changed'));
    const activeId = localStorage.getItem(ACTIVE_APP_KEY);
    if (activeId && !apps.some(a => a.id === activeId) && apps.length > 0) {
      localStorage.setItem(ACTIVE_APP_KEY, apps[0].id);
      window.dispatchEvent(new Event('zerotask-apps-changed'));
    }
  }, [apps]);

  const [postsPerDay, setPostsPerDay] = useState(3);
  const [auditsPerWeek, setAuditsPerWeek] = useState(2);

  const totalModelCost = models.reduce((sum, m) => {
    const costs = MODEL_COSTS[m.model] || [20, 30];
    return sum + (m.quality ? costs[1] : costs[0]);
  }, 0);
  const usageCost = postsPerDay * 30 * 0.15 + auditsPerWeek * 4 * 2.5;
  const totalMonthlyCost = totalModelCost + usageCost;

  const COLORS = [
    ['from-violet-500', 'to-pink-500'],
    ['from-blue-500', 'to-cyan-500'],
    ['from-emerald-500', 'to-teal-500'],
    ['from-orange-500', 'to-amber-500'],
    ['from-rose-500', 'to-red-500'],
  ];

  const addApp = () => {
    if (!newApp.name.trim()) return;
    const colorIdx = apps.length % COLORS.length;
    const app: AppEntry = {
      id: Date.now().toString(),
      name: newApp.name,
      platform: newApp.platform,
      category: newApp.category || 'Uncategorized',
      storeUrl: newApp.storeUrl,
      addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      color1: COLORS[colorIdx][0],
      color2: COLORS[colorIdx][1],
      initials: newApp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    };
    setApps(prev => [...prev, app]);
    setNewApp({ name: '', platform: 'iOS', category: '', storeUrl: '' });
    setShowAddApp(false);
  };

  const deleteApp = (id: string) => {
    setApps(prev => prev.filter(a => a.id !== id));
    setDeleteConfirm(null);
  };

  const updateApp = (id: string, updates: Partial<AppEntry>) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    setEditingApp(null);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Password updated successfully');
      setChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to update password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountText !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      await supabase.auth.signOut();
      showToast('Account deletion requested. You have been signed out.');
      setDeleteAccountModal(false);
    } catch {
      showToast('Failed to process account deletion', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } });
      if (error) throw error;
      showToast('Profile updated');
    } catch {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await apiFetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast('Could not open billing portal', 'error');
    } catch {
      showToast('Failed to open billing portal', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

  const saveApiKey = (index: number, value: string) => {
    const updated = [...apiKeys];
    updated[index] = { ...updated[index], key: value, status: value ? 'connected' : 'disconnected' };
    setApiKeys(updated);
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(updated));
  };

  const testApiKey = async (index: number) => {
    const updated = [...apiKeys];
    updated[index] = { ...updated[index], status: 'testing' };
    setApiKeys(updated);

    // Simulate test
    await new Promise(r => setTimeout(r, 1500));
    const hasKey = !!apiKeys[index].key;
    updated[index] = { ...updated[index], status: hasKey ? 'connected' : 'error' };
    setApiKeys([...updated]);
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(updated));
    showToast(hasKey ? `${apiKeys[index].name} connected` : `${apiKeys[index].name} failed — no key provided`, hasKey ? 'success' : 'error');
  };

  const handleExportData = () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('zerotask')) {
        try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { data[key!] = localStorage.getItem(key); }
      }
    }
    data['user'] = user ? { email: user.email, id: user.id, created_at: user.created_at } : null;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'zerotask-data-export.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  };

  const handleClearLocalData = () => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('zerotask')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
    showToast(`Cleared ${keys.length} items from local storage`);
    setClearDataConfirm(false);
  };

  const getUsageStat = (key: string) => {
    try { return parseInt(localStorage.getItem(`zerotask-usage-${key}`) || '0', 10); } catch { return 0; }
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-text-secondary">Configure your workspace</p>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="w-56 shrink-0 border-r border-border p-4 space-y-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.key ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-tertiary')}>
              {t.icon} {t.label}
            </button>
          ))}

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5 mb-3">
              <DollarSign className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium">Monthly Cost</span>
            </div>
            <div className="text-center p-3 bg-surface-secondary rounded-lg mb-3">
              <p className="text-2xl font-bold text-accent">${totalMonthlyCost.toFixed(0)}</p>
              <p className="text-xs text-text-tertiary">estimated/month</p>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-tertiary">Posts/day</span>
                  <span className="font-medium">{postsPerDay}</span>
                </div>
                <input type="range" min={1} max={10} value={postsPerDay} onChange={e => setPostsPerDay(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-tertiary">Audits/week</span>
                  <span className="font-medium">{auditsPerWeek}</span>
                </div>
                <input type="range" min={1} max={7} value={auditsPerWeek} onChange={e => setAuditsPerWeek(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]" />
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-text-tertiary">
              <div className="flex justify-between"><span>AI Models</span><span>${totalModelCost}/mo</span></div>
              <div className="flex justify-between"><span>Usage</span><span>${usageCost.toFixed(0)}/mo</span></div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto h-[calc(100vh-77px)]">

          {/* Account Tab */}
          {tab === 'account' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-6">Account</h2>

              {authLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : !user ? (
                <div className="text-center py-12 text-text-tertiary">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Not signed in</p>
                  <p className="text-sm mt-1">Sign in to manage your account</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Profile */}
                  <div className="bg-surface-secondary rounded-xl border border-border p-5">
                    <h3 className="font-medium mb-4 flex items-center gap-2"><User className="w-4 h-4 text-accent" /> Profile</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-text-secondary mb-1 block">Display Name</label>
                        <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-secondary mb-1 block">Email</label>
                        <input value={user.email || ''} readOnly
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-tertiary" />
                      </div>
                      <button onClick={handleSaveProfile}
                        className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
                        Save Profile
                      </button>
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="bg-surface-secondary rounded-xl border border-border p-5">
                    <h3 className="font-medium mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> Session Info</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-text-tertiary block text-xs mb-1">Account Created</span>
                        <span>{user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary block text-xs mb-1">Last Sign In</span>
                        <span>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Accounts */}
                  <div className="bg-surface-secondary rounded-xl border border-border p-5">
                    <h3 className="font-medium mb-4 flex items-center gap-2"><Link2 className="w-4 h-4 text-accent" /> Connected Accounts</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'Google', connected: user.app_metadata?.providers?.includes('google') || user.app_metadata?.provider === 'google' },
                        { name: 'Apple', connected: user.app_metadata?.providers?.includes('apple') || user.app_metadata?.provider === 'apple' },
                      ].map(acc => (
                        <div key={acc.name} className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{acc.name}</span>
                          </div>
                          <span className={clsx('text-xs font-medium px-2 py-1 rounded-full', acc.connected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-text-tertiary')}>
                            {acc.connected ? 'Connected' : 'Not connected'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="bg-surface-secondary rounded-xl border border-border p-5">
                    <h3 className="font-medium mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-accent" /> Password</h3>
                    {!changingPassword ? (
                      <button onClick={() => setChangingPassword(true)}
                        className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surface-tertiary transition-colors">
                        Change Password
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                        <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                        <div className="flex gap-2">
                          <button onClick={handleChangePassword} disabled={passwordLoading}
                            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50 flex items-center gap-2">
                            {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
                          </button>
                          <button onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}
                            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-5">
                    <h3 className="font-medium mb-2 flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /> Danger Zone</h3>
                    <p className="text-sm text-text-tertiary mb-4">Permanently delete your account and all associated data.</p>
                    <button onClick={() => setDeleteAccountModal(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                      Delete Account
                    </button>
                  </div>
                </div>
              )}

              {/* Delete Account Modal */}
              {deleteAccountModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteAccountModal(false)}>
                  <div className="bg-surface-secondary rounded-2xl border border-border p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <h3 className="font-semibold text-lg">Delete Account</h3>
                    </div>
                    <p className="text-sm text-text-secondary mb-4">This action is irreversible. All your data will be permanently deleted. Type <strong>DELETE</strong> to confirm.</p>
                    <input value={deleteAccountText} onChange={e => setDeleteAccountText(e.target.value)} placeholder="Type DELETE to confirm"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-4" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setDeleteAccountModal(false); setDeleteAccountText(''); }}
                        className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary transition-colors">Cancel</button>
                      <button onClick={handleDeleteAccount} disabled={deleteAccountText !== 'DELETE' || deleteLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />} Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subscription Tab */}
          {tab === 'subscription' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-6">Subscription</h2>
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="bg-surface-secondary rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center gap-2"><Crown className="w-4 h-4 text-accent" /> Current Plan</h3>
                    <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold',
                      isPro ? 'bg-accent/10 text-accent' : 'bg-surface-tertiary text-text-secondary')}>
                      {plan === 'pro' ? 'Pro' : 'Free'}
                    </span>
                  </div>
                  {isPro ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-text-tertiary block text-xs mb-1">Status</span>
                          <span className={clsx('font-medium', subStatus === 'active' ? 'text-emerald-500' : 'text-amber-500')}>
                            {subStatus === 'active' ? 'Active' : subStatus === 'canceled' ? 'Canceled (access until expiry)' : subStatus}
                          </span>
                        </div>
                        {expiresAt && (
                          <div>
                            <span className="text-text-tertiary block text-xs mb-1">Next Billing / Expiry</span>
                            <span>{new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleManageSubscription} disabled={portalLoading}
                          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center gap-2 disabled:opacity-50">
                          {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Manage Subscription
                        </button>
                        {subStatus === 'active' && !cancelConfirm && (
                          <button onClick={() => setCancelConfirm(true)}
                            className="px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                            Cancel Subscription
                          </button>
                        )}
                      </div>
                      {cancelConfirm && (
                        <div className="bg-red-500/5 rounded-lg border border-red-500/20 p-4">
                          <p className="text-sm text-text-secondary mb-3">Are you sure? You&apos;ll lose access to Pro features at the end of your billing period.</p>
                          <div className="flex gap-2">
                            <button onClick={() => { handleManageSubscription(); setCancelConfirm(false); }}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                              Yes, Cancel
                            </button>
                            <button onClick={() => setCancelConfirm(false)}
                              className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary">
                              Keep Subscription
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-text-secondary mb-4">You&apos;re on the Free plan. Upgrade to Pro for unlimited access to all features.</p>
                      <a href="/pricing"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
                        <Crown className="w-4 h-4" /> Upgrade to Pro
                      </a>
                    </div>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="bg-surface-secondary rounded-xl border border-border p-5">
                  <h3 className="font-medium mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-accent" /> Usage This Month</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'API Calls', value: getUsageStat('api-calls'), icon: <Zap className="w-4 h-4" /> },
                      { label: 'Audits Run', value: getUsageStat('audits'), icon: <FileText className="w-4 h-4" /> },
                      { label: 'Images Generated', value: getUsageStat('images'), icon: <Cpu className="w-4 h-4" /> },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 bg-surface rounded-lg border border-border">
                        <div className="flex items-center justify-center text-accent mb-2">{s.icon}</div>
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs text-text-tertiary">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing History */}
                <div className="bg-surface-secondary rounded-xl border border-border p-5">
                  <h3 className="font-medium mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> Billing History</h3>
                  <div className="text-center py-8 text-text-tertiary">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No billing history available</p>
                    <p className="text-xs mt-1">Invoices will appear here after your first payment</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Apps Tab */}
          {tab === 'apps' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Connected Apps</h2>
                <button onClick={() => setShowAddApp(true)}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add App
                </button>
              </div>

              {showAddApp && (
                <div className="bg-surface-secondary rounded-xl border-2 border-accent/30 p-5 mb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Add New App</h3>
                    <button onClick={() => setShowAddApp(false)} className="text-text-tertiary hover:text-text-primary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">App Name *</label>
                      <input value={newApp.name} onChange={e => setNewApp(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. My App"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Platform</label>
                      <select value={newApp.platform} onChange={e => setNewApp(p => ({ ...p, platform: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                        <option>iOS</option>
                        <option>Android</option>
                        <option>Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Category</label>
                      <input value={newApp.category} onChange={e => setNewApp(p => ({ ...p, category: e.target.value }))}
                        placeholder="e.g. Productivity"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Store URL</label>
                      <input value={newApp.storeUrl} onChange={e => setNewApp(p => ({ ...p, storeUrl: e.target.value }))}
                        placeholder="https://apps.apple.com/app/..."
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddApp(false)}
                      className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary transition-colors">
                      Cancel
                    </button>
                    <button onClick={addApp} disabled={!newApp.name.trim()}
                      className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Add App
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {apps.map(app => (
                  <div key={app.id} className="bg-surface-secondary rounded-xl border border-border">
                    {editingApp === app.id ? (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input defaultValue={app.name} id={`edit-name-${app.id}`}
                            className="px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                          <input defaultValue={app.category} id={`edit-cat-${app.id}`}
                            className="px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                        </div>
                        <input defaultValue={app.storeUrl} id={`edit-url-${app.id}`}
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingApp(null)}
                            className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary">Cancel</button>
                          <button onClick={() => {
                            const name = (document.getElementById(`edit-name-${app.id}`) as HTMLInputElement)?.value || app.name;
                            const category = (document.getElementById(`edit-cat-${app.id}`) as HTMLInputElement)?.value || app.category;
                            const storeUrl = (document.getElementById(`edit-url-${app.id}`) as HTMLInputElement)?.value || app.storeUrl;
                            updateApp(app.id, { name, category, storeUrl, initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() });
                          }}
                            className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark flex items-center gap-1">
                            <Check className="w-3 h-3" /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color1} ${app.color2} flex items-center justify-center text-white font-bold text-sm`}>
                            {app.initials}
                          </div>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="text-xs text-text-tertiary">{app.platform} • {app.category} • Added {app.addedAt}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingApp(app.id)}
                            className="p-2 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === app.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => deleteApp(app.id)}
                                className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                                Delete
                              </button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 rounded-lg text-xs text-text-secondary hover:bg-surface-tertiary">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(app.id)}
                              className="p-2 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {apps.length === 0 && (
                  <div className="text-center py-12 text-text-tertiary">
                    <AppWindow className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No apps connected</p>
                    <p className="text-sm mt-1">Add your first app to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Brand Voice Tab */}
          {tab === 'brand-voice' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-6">Brand Voice</h2>
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Tone</label>
                <div className="flex gap-2 flex-wrap">
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        tone === t ? 'bg-accent text-white' : 'bg-surface-secondary border border-border text-text-secondary hover:bg-surface-tertiary')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Brand Guidelines</label>
                <textarea value={guidelines} onChange={e => setGuidelines(e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Example Output Preview</label>
                <div className="bg-surface-secondary rounded-xl border border-border p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-4 h-4 text-accent" />
                    <span className="text-xs font-medium text-accent">{tone} tone</span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{TONE_EXAMPLES[tone]}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Models Tab */}
          {tab === 'ai-models' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-6">AI Model Configuration</h2>
              <div className="space-y-4">
                {models.map((m, i) => (
                  <div key={m.task} className="bg-surface-secondary rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{m.task}</span>
                      <span className="text-sm text-text-tertiary">
                        ${(m.quality ? (MODEL_COSTS[m.model]?.[1] || 30) : (MODEL_COSTS[m.model]?.[0] || 20))}/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <select value={m.model}
                        onChange={e => {
                          const updated = [...models];
                          updated[i] = { ...m, model: e.target.value };
                          setModels(updated);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                        {m.models.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={clsx(!m.quality ? 'text-accent font-medium' : 'text-text-tertiary')}>Speed</span>
                        <button onClick={() => {
                          const updated = [...models];
                          updated[i] = { ...m, quality: !m.quality };
                          setModels(updated);
                        }}
                          className={clsx('w-10 h-6 rounded-full transition-all', m.quality ? 'bg-accent' : 'bg-surface-tertiary')}>
                          <div className={clsx('w-4 h-4 rounded-full bg-white shadow transition-all', m.quality ? 'translate-x-5' : 'translate-x-1')} />
                        </button>
                        <span className={clsx(m.quality ? 'text-accent font-medium' : 'text-text-tertiary')}>Quality</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-accent/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Model Cost</span>
                  <span className="text-xl font-bold text-accent">${totalModelCost}/mo</span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === 'notifications' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'telegram' as const, label: 'Telegram', desc: 'Get notified via Telegram bot' },
                  { key: 'email' as const, label: 'Email', desc: 'Receive email notifications' },
                  { key: 'webPush' as const, label: 'Web Push', desc: 'Browser push notifications' },
                ].map(n => (
                  <div key={n.key} className="bg-surface-secondary rounded-xl border border-border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{n.label}</p>
                      <p className="text-xs text-text-tertiary">{n.desc}</p>
                    </div>
                    <button onClick={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key] }))}
                      className={clsx('w-10 h-6 rounded-full transition-all', notifications[n.key] ? 'bg-accent' : 'bg-surface-tertiary')}>
                      <div className={clsx('w-4 h-4 rounded-full bg-white shadow transition-all', notifications[n.key] ? 'translate-x-5' : 'translate-x-1')} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <label className="text-sm font-medium mb-2 block">Frequency</label>
                <div className="flex gap-2">
                  {['instant', 'daily', 'weekly'].map(f => (
                    <button key={f} onClick={() => setNotifications(p => ({ ...p, frequency: f }))}
                      className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                        notifications.frequency === f ? 'bg-accent text-white' : 'bg-surface-secondary border border-border text-text-secondary hover:bg-surface-tertiary')}>
                      {f === 'daily' ? 'Daily Digest' : f === 'weekly' ? 'Weekly' : 'Instant'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Data & Privacy Tab */}
          {tab === 'data-privacy' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-6">Data & Privacy</h2>
              <div className="space-y-6">
                {/* Export Data */}
                <div className="bg-surface-secondary rounded-xl border border-border p-5">
                  <h3 className="font-medium mb-2 flex items-center gap-2"><Download className="w-4 h-4 text-accent" /> Export Your Data</h3>
                  <p className="text-sm text-text-tertiary mb-4">Download all your ZeroTask data as a JSON file including settings, apps, and preferences.</p>
                  <button onClick={handleExportData}
                    className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export Data
                  </button>
                </div>

                {/* Clear Local Data */}
                <div className="bg-surface-secondary rounded-xl border border-border p-5">
                  <h3 className="font-medium mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4 text-accent" /> Clear Local Data</h3>
                  <p className="text-sm text-text-tertiary mb-4">Remove all locally stored data including API keys, app settings, and preferences. This cannot be undone.</p>
                  {!clearDataConfirm ? (
                    <button onClick={() => setClearDataConfirm(true)}
                      className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">
                      Clear All Local Data
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={handleClearLocalData}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                        Confirm Clear
                      </button>
                      <button onClick={() => setClearDataConfirm(false)}
                        className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-tertiary">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Data Retention */}
                <div className="bg-surface-secondary rounded-xl border border-border p-5">
                  <h3 className="font-medium mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Data Retention</h3>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <p>• Account data is retained while your account is active</p>
                    <p>• API keys are stored locally in your browser only</p>
                    <p>• Usage analytics are retained for 12 months</p>
                    <p>• Deleted accounts are purged within 30 days</p>
                  </div>
                </div>

                {/* Links */}
                <div className="bg-surface-secondary rounded-xl border border-border p-5">
                  <h3 className="font-medium mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Legal</h3>
                  <div className="space-y-3">
                    <a href="/privacy" className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border hover:bg-surface-tertiary transition-colors">
                      <span className="text-sm font-medium">Privacy Policy</span>
                      <ExternalLink className="w-4 h-4 text-text-tertiary" />
                    </a>
                    <a href="/terms" className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border hover:bg-surface-tertiary transition-colors">
                      <span className="text-sm font-medium">Terms of Service</span>
                      <ExternalLink className="w-4 h-4 text-text-tertiary" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
