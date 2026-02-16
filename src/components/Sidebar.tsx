'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, Search, Video, Copy, Swords, Star,
  Rocket, Users, Globe, Settings, ChevronLeft, ChevronRight,
  Moon, Sun, ChevronDown, Plus, Check, FlaskConical, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useActiveApp } from '@/lib/useActiveApp';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscription';
import { LogOut, Crown } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Keywords', href: '/keywords', icon: Search },
  { label: 'TikTok Studio', href: '/tiktok', icon: Video },
  { label: 'Copy Machine', href: '/copy', icon: Copy },
  { label: 'Competitors', href: '/competitors', icon: Swords },
  { label: 'Reviews', href: '/reviews', icon: Star },
  { label: 'Launch', href: '/launch', icon: Rocket },
  { label: 'Influencers', href: '/influencers', icon: Users },
  { label: 'Landing Pages', href: '/landing', icon: Globe },
  { label: 'Scenarios', href: '/scenarios', icon: FlaskConical },
];

const bottomItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { app, apps, setActiveApp } = useActiveApp();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { isPro } = useSubscription();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAppOpen(false);
      }
    };
    if (appOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [appOpen]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Desktop Sidebar — always dark bg */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 h-screen z-40',
          'bg-neutral-950 border-r border-neutral-800',
          'transition-[width] duration-200 ease-out',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* App Switcher */}
        <div className="p-3 border-b border-neutral-800 relative" ref={dropdownRef}>
          <button
            onClick={() => setAppOpen(!appOpen)}
            className={cn(
              'flex items-center gap-2.5 w-full rounded-lg p-2',
              'hover:bg-neutral-800/50 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
              app.color1, app.color2
            )}>
              <span className="text-xs font-bold text-white">{app.initials}</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-neutral-100 truncate">{app.name}</p>
                  <p className="text-xs text-neutral-500">{app.platform} • {app.category}</p>
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 text-neutral-500 transition-transform',
                  appOpen && 'rotate-180'
                )} />
              </>
            )}
          </button>

          {/* Dropdown */}
          {appOpen && !collapsed && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
              {apps.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setActiveApp(a.id); setAppOpen(false); }}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors',
                    'hover:bg-neutral-800',
                    a.id === app.id && 'bg-emerald-500/10'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                    a.color1, a.color2
                  )}>
                    <span className="text-[10px] font-bold text-white">{a.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{a.name}</p>
                    <p className="text-xs text-neutral-500">{a.platform} • {a.category}</p>
                  </div>
                  {a.id === app.id && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                </button>
              ))}
              <div className="border-t border-neutral-700 mt-1 pt-1">
                <button
                  onClick={() => { setAppOpen(false); router.push('/settings'); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-neutral-800 transition-colors text-emerald-400"
                >
                  <div className="w-7 h-7 rounded-lg border-2 border-dashed border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium">Add App</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        {user && !isPro && !collapsed && (
          <div className="px-3 pt-3">
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.02]"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Pro
            </Link>
          </div>
        )}
        {user && !isPro && collapsed && (
          <div className="px-2 pt-3">
            <Link
              href="/pricing"
              className="flex items-center justify-center w-full p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
              title="Upgrade to Pro"
            >
              <Crown className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors',
                  collapsed && 'justify-center px-2',
                  active
                    ? 'bg-neutral-800 text-white font-medium'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                )}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-400 rounded-r-full" />
                )}
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-neutral-800 space-y-1">
          {/* Settings */}
          {bottomItems.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors',
                  collapsed && 'justify-center px-2',
                  active
                    ? 'bg-neutral-800 text-white font-medium'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* User + theme + collapse */}
          <div className={cn(
            'flex items-center pt-2',
            collapsed ? 'flex-col gap-2' : 'gap-2'
          )}>
            {/* User avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="text-sm text-neutral-400 truncate">{user?.email ?? 'Guest'}</span>
                {isPro && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PRO</span>
                )}
              </div>
            )}

            {/* Sign out */}
            {user && (
              <button
                onClick={signOut}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950 border-t border-neutral-800 flex items-center justify-around px-1 h-16"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[navItems[0], navItems[1], navItems[3], navItems[2], { label: 'More', href: '/settings', icon: Settings }].map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[44px] min-h-[44px] justify-center',
                active ? 'text-emerald-400' : 'text-neutral-500'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
