'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import BuyCreditsModal from '@/components/BuyCreditsModal';

interface UsageMeterProps {
  used: number;
  limit: number;
  plan: 'free' | 'pro' | 'creator';
  purchased?: number;
}

export default function UsageMeter({ used, limit, plan, purchased = 0 }: UsageMeterProps) {
  const [showBuyModal, setShowBuyModal] = useState(false);

  if (plan === 'free') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        <span className="text-xs text-neutral-500">Slideshow generation requires a paid plan</span>
        <Link href="/pricing" className="text-xs font-medium text-emerald-500 hover:text-emerald-600 transition-colors">
          Upgrade →
        </Link>
      </div>
    );
  }

  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? (used / limit) * 100 : 100;
  const isLow = remaining < 5;
  const atLimit = remaining === 0;
  const barColor = atLimit
    ? 'bg-red-500'
    : isLow
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {remaining}/{limit} credits remaining
              {purchased > 0 && (
                <span className="ml-1.5 text-violet-500 dark:text-violet-400">
                  (+{purchased} purchased)
                </span>
              )}
            </span>
            {plan === 'creator' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium">
                Creator
              </span>
            )}
          </div>
          <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColor)}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
        {(atLimit || isLow) && (
          <button
            onClick={() => setShowBuyModal(true)}
            className={cn(
              'text-xs font-medium whitespace-nowrap transition-colors',
              'text-violet-500 hover:text-violet-600'
            )}
          >
            Buy more credits →
          </button>
        )}
      </div>
      {showBuyModal && <BuyCreditsModal onClose={() => setShowBuyModal(false)} />}
    </>
  );
}
