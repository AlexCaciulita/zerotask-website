'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Reusable empty state component with glass card styling.
 * Used across all pages when no data is available yet.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'glass-card flex flex-col items-center justify-center text-center py-16 px-8',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={cn(
            'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-accent text-white hover:bg-accent-dark transition-colors',
            'shadow-sm hover:shadow-md'
          )}
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && !actionHref && onAction && (
        <button
          onClick={onAction}
          className={cn(
            'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-accent text-white hover:bg-accent-dark transition-colors',
            'shadow-sm hover:shadow-md'
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
