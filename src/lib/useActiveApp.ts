'use client';

import { useState, useEffect, useCallback } from 'react';

const APPS_KEY = 'zerotask-settings-apps';
const ACTIVE_KEY = 'zerotask-active-app';

export interface AppEntry {
  id: string;
  name: string;
  platform: string;
  category: string;
  storeUrl: string;
  addedAt: string;
  color1: string;
  color2: string;
  initials: string;
  icon?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  developer?: string;
}

const DEFAULT_APP: AppEntry = {
  id: '1',
  name: 'My App',
  platform: 'iOS',
  category: 'General',
  storeUrl: '',
  addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  color1: 'from-emerald-500',
  color2: 'to-teal-500',
  initials: 'MA',
};

function loadApps(): AppEntry[] {
  if (typeof window === 'undefined') return [DEFAULT_APP];
  try {
    const saved = localStorage.getItem(APPS_KEY);
    if (saved) {
      const apps = JSON.parse(saved);
      if (Array.isArray(apps) && apps.length > 0) return apps;
    }
  } catch {}
  return [DEFAULT_APP];
}

function loadActiveId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {}
  return null;
}

export function useActiveApp() {
  const [apps, setApps] = useState<AppEntry[]>([DEFAULT_APP]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const a = loadApps();
    setApps(a);
    const id = loadActiveId();
    setActiveId(id && a.some(app => app.id === id) ? id : a[0]?.id || null);
    setMounted(true);

    // Listen for changes from other components
    const handler = () => {
      const a = loadApps();
      setApps(a);
      const id = loadActiveId();
      setActiveId(id && a.some(app => app.id === id) ? id : a[0]?.id || null);
    };
    window.addEventListener('storage', handler);
    window.addEventListener('zerotask-apps-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('zerotask-apps-changed', handler);
    };
  }, []);

  const app = apps.find(a => a.id === activeId) || apps[0] || DEFAULT_APP;

  const setActiveApp = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
    window.dispatchEvent(new Event('zerotask-apps-changed'));
  }, []);

  // Convert to appData format for AI calls — include all available fields
  const appData = {
    name: app.name,
    category: app.category,
    platform: app.platform.toLowerCase() as 'ios' | 'android' | 'both',
    description: app.description,
    keywords: (app as unknown as Record<string, unknown>).keywords as string[] | undefined,
    storeUrl: app.storeUrl,
    icon: app.icon,
    rating: app.rating,
    reviewCount: app.reviewCount,
    developer: app.developer,
  };

  return { app, apps, appData, setActiveApp, mounted };
}
