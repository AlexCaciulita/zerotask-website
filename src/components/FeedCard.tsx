'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search, BarChart3, PenTool, Smartphone, Star, Rocket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import Badge from './ui/Badge';
import { toast } from 'sonner';

export interface FeedItem {
  id: string;
  type: 'keyword' | 'competitor' | 'content' | 'review' | 'launch' | 'tiktok';
  title: string;
  summary: string;
  detail?: string;
  timestamp: string;
  action?: string;
  actionLabel?: string;
  badge?: { label: string; variant: 'success' | 'warning' | 'error' | 'info' };
}

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; border: string; bg: string; iconColor: string }> = {
  keyword:    { icon: Search,      border: 'border-l-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10',     iconColor: 'text-blue-500' },
  competitor: { icon: BarChart3,    border: 'border-l-amber-500',  bg: 'bg-amber-50 dark:bg-amber-500/10',   iconColor: 'text-amber-500' },
  content:    { icon: PenTool,      border: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-500' },
  tiktok:     { icon: Smartphone,   border: 'border-l-pink-500',   bg: 'bg-pink-50 dark:bg-pink-500/10',     iconColor: 'text-pink-500' },
  review:     { icon: Star,         border: 'border-l-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', iconColor: 'text-yellow-500' },
  launch:     { icon: Rocket,       border: 'border-l-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', iconColor: 'text-violet-500' },
};

const actionRoutes: Record<string, string | null> = {
  'View competitor analysis': '/competitors',
  'Review copy variations': '/copy',
  'Create similar content': '/tiktok',
  'Draft responses': '/reviews',
  'Open launch plan': '/launch',
  'View keyword history': '/keywords',
  'Preview creatives': '/copy',
  'View all hooks': '/tiktok',
  'Add to war room': '/competitors',
  'Extract quotes for ads': '/copy',
  'Create seasonal assets': '/tiktok',
  'View influencer CRM': '/influencers',
  'Fill content calendar': '/tiktok',
  'Adjust pricing strategy': '/scenarios',
  'View localization report': null,
};

interface FeedCardProps {
  item: FeedItem;
  onDelete?: (id: string) => void;
}

export default function FeedCard({ item, onDelete }: FeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const router = useRouter();

  const config = typeConfig[item.type] || typeConfig.keyword;
  const Icon = config.icon;

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded, item.detail]);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = item.actionLabel || '';

    if (label.toLowerCase().includes('add to tracked keywords')) {
      try {
        const existing = JSON.parse(localStorage.getItem('zerotask-tracked-keywords') || '[]');
        const keyword = item.title.replace(/[""]/g, '').replace(/ trending$/, '');
        if (!existing.includes(keyword)) {
          existing.push(keyword);
          localStorage.setItem('zerotask-tracked-keywords', JSON.stringify(existing));
        }
        toast.success(`Added "${keyword}" to tracked keywords`);
      } catch {
        toast.success('Added to tracked keywords');
      }
      return;
    }

    const route = actionRoutes[label];
    if (route) { router.push(route); return; }
    toast.info('Coming soon');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item.id);
  };

  return (
    <div
      className={clsx(
        'bg-surface border border-border rounded-xl border-l-4 cursor-pointer group relative',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5',
        'transition-all duration-200',
        config.border,
        expanded && 'ring-1 ring-accent/20'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-surface-tertiary text-text-tertiary hover:text-text-primary"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="p-4 flex items-start gap-3">
        {/* Icon circle */}
        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center shrink-0', config.bg)}>
          <Icon className={clsx('w-4 h-4', config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-semibold text-text-primary truncate">{item.title}</h4>
            {item.badge && <Badge variant={item.badge.variant}>{item.badge.label}</Badge>}
          </div>
          <p className="text-sm text-text-secondary line-clamp-2">{item.summary}</p>
          <p className="text-xs text-text-tertiary mt-1.5">{item.timestamp}</p>
        </div>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-text-tertiary shrink-0 transition-transform duration-200 mt-1',
            expanded && 'rotate-180'
          )}
        />
      </div>

      {/* Expandable content with smooth animation */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{ maxHeight: expanded ? contentHeight + 32 : 0, opacity: expanded ? 1 : 0 }}
      >
        <div ref={contentRef} className="px-4 pb-4 pt-0">
          <div className="pt-3 border-t border-border">
            {item.detail && <p className="text-sm text-text-secondary mb-3">{item.detail}</p>}
            {item.actionLabel && (
              <button
                onClick={handleAction}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                {item.actionLabel}
                <span className="text-xs">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
