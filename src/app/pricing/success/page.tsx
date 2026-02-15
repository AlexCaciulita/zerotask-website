'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSubscription } from '@/lib/subscription';
import { Crown, PartyPopper, Check } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Store subscription status
    setSubscription({
      plan: 'pro',
      status: 'active',
      stripeCustomerId: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    window.dispatchEvent(new Event('subscription-updated'));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <Crown className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-2xl">
          <PartyPopper className="w-6 h-6 text-yellow-400" />
          <h1 className="text-3xl font-bold text-text-primary">Welcome to Pro!</h1>
          <PartyPopper className="w-6 h-6 text-yellow-400" />
        </div>

        <p className="text-text-secondary">
          You now have full access to every ZeroTask feature. Let&apos;s start growing your app.
        </p>

        <div className="bg-surface-card border border-border rounded-xl p-6 space-y-3 text-left">
          {['All features unlocked', '14-day free trial active', 'Cancel anytime from Settings'].map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-sm text-text-secondary">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-text-secondary">
          Redirecting to dashboard in {countdown}...
        </p>
      </div>
    </div>
  );
}
