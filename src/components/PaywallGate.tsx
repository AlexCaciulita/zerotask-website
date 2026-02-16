'use client';

import { useSubscription } from '@/lib/subscription';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';

export default function PaywallGate({ children }: { children: React.ReactNode }) {
  const { isPro, loading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPro) return <>{children}</>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Upgrade to Pro</h2>
          <p className="mt-2 text-text-secondary max-w-md mx-auto">
            Unlock all ZeroTask features — Keywords, Competitors, Reviews, AI Copy, TikTok Studio, Influencer CRM, and more.
          </p>
        </div>
        <div className="bg-surface-card border border-border rounded-xl p-6 text-left space-y-3">
          {['AI-powered keyword optimization', 'Competitor tracking & alerts', 'Review sentiment analysis', 'AI copywriting for listings', 'TikTok video studio', 'Influencer outreach CRM', 'Launch sequencer', 'App Store Connect analytics'].map(f => (
            <div key={f} className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-text-secondary">{f}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-3xl font-bold text-text-primary">$49<span className="text-lg font-normal text-text-secondary">/mo</span></p>
          <p className="text-sm text-text-secondary mt-1">14-day free trial • Cancel anytime</p>
        </div>
        <button
          onClick={() => router.push('/pricing')}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02]"
        >
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
