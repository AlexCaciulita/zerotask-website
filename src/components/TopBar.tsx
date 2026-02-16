'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import clsx from 'clsx';

type Theme = 'light' | 'dark' | 'system';

export default function TopBar() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('zerotask-theme') as Theme | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else if (t === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const setAndSave = (t: Theme) => {
    setTheme(t);
    localStorage.setItem('zerotask-theme', t);
    applyTheme(t);
  };

  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center justify-end px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-1 bg-surface-tertiary rounded-lg p-0.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setAndSave(opt.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              theme === opt.value
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
