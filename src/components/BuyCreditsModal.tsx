'use client';

import { useState } from 'react';
import { X, Sparkles, Zap, Crown } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const PACKS = [
  { id: '10' as const, credits: 10, price: 5, perCredit: 0.50, badge: null },
  { id: '50' as const, credits: 50, price: 25, perCredit: 0.50, badge: 'Popular' },
  { id: '100' as const, credits: 100, price: 45, perCredit: 0.45, badge: 'Best Value' },
];

interface BuyCreditsModalProps {
  onClose: () => void;
}

export default function BuyCreditsModal({ onClose }: BuyCreditsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (pack: '10' | '50' | '100') => {
    if (!user) return;
    setLoading(pack);
    try {
      const res = await fetch('/api/stripe/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack, userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Credit purchase error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-neutral-200 dark:border-neutral-800 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" /> Buy Credits
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Each credit = 1 slideshow generation. Credits never expire.
        </p>

        <div className="space-y-3">
          {PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => handlePurchase(pack.id)}
              disabled={loading !== null}
              className="w-full relative flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-violet-400 dark:hover:border-violet-500 transition-all hover:shadow-md disabled:opacity-50 group"
            >
              {pack.badge && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                  {pack.badge}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  {pack.credits === 100 ? <Crown className="w-5 h-5 text-violet-500" /> :
                   pack.credits === 50 ? <Sparkles className="w-5 h-5 text-violet-500" /> :
                   <Zap className="w-5 h-5 text-violet-500" />}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {pack.credits} Credits
                  </div>
                  <div className="text-xs text-neutral-500">
                    ${pack.perCredit.toFixed(2)}/credit
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  ${pack.price}
                </div>
                {loading === pack.id && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-500 border-t-transparent" />
                )}
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-neutral-400 text-center">
          One-time purchase • Secure checkout via Stripe
        </p>
      </div>
    </div>
  );
}
