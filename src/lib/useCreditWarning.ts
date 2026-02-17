'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useCreditContext } from './credit-context';

const SESSION_KEY = 'zerotask-credit-warnings-shown';

/**
 * Shows progressive warning toasts when credits are running low.
 *
 * Warning levels:
 *   - low (75% used): Gentle info toast
 *   - critical (90% used): Warning toast
 *   - depleted (100% used): Error toast with upgrade CTA
 *
 * Each level only fires once per browser session (persisted in sessionStorage)
 * to avoid annoying users on page refreshes (#10 fix).
 */
export function useCreditWarning() {
  const { credits } = useCreditContext();

  useEffect(() => {
    if (!credits.warning) return;

    // Check sessionStorage to avoid re-showing on page refresh
    const shown = getShownWarnings();
    if (shown.has(credits.warning)) return;

    // Mark as shown before displaying
    shown.add(credits.warning);
    setShownWarnings(shown);

    switch (credits.warning) {
      case 'low':
        toast.info('Credits running low', {
          description: `You have ${credits.remaining} credits remaining this month.`,
          duration: 5000,
        });
        break;

      case 'critical':
        toast.warning('Credits almost depleted', {
          description: `Only ${credits.remaining} credit${credits.remaining === 1 ? '' : 's'} remaining. Consider upgrading your plan.`,
          duration: 8000,
          action: credits.plan === 'free' ? {
            label: 'Upgrade',
            onClick: () => { window.location.href = '/pricing'; },
          } : undefined,
        });
        break;

      case 'depleted':
        toast.error('No credits remaining', {
          description: credits.plan === 'free'
            ? 'Your free credits are used up. Upgrade to Pro for 30 credits/month.'
            : 'Your monthly credits are depleted. Buy a credit pack or wait for your next billing cycle.',
          duration: 12000,
          action: {
            label: credits.plan === 'free' ? 'Upgrade' : 'Buy Credits',
            onClick: () => { window.location.href = '/pricing'; },
          },
        });
        break;
    }
  }, [credits.warning, credits.remaining, credits.plan]);
}

function getShownWarnings(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setShownWarnings(shown: Set<string>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...shown]));
  } catch {
    // sessionStorage unavailable (e.g., private browsing edge cases)
  }
}
