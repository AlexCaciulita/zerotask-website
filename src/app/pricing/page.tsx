'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { Check, X, Crown, Sparkles, Shield, Zap, ArrowRight, Star, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const proFeatures = [
  'AI keyword optimization',
  'Competitor tracking & alerts',
  'Review sentiment analysis',
  'AI copywriting engine',
  '30 slideshow credits/month',
  'Influencer outreach CRM',
  'Launch sequencer',
  'App Store Connect analytics',
  'Growth scenarios & simulations',
  'Priority support',
];

const creatorFeatures = [
  'Everything in Pro',
  '100 slideshow credits/month',
  'Direct TikTok posting',
  'Priority AI generation',
  'Bulk content scheduling',
  'Advanced hashtag research',
  'Content calendar sync',
  'Performance analytics',
];

const comparisonFeatures = [
  { name: 'App audit & growth score', free: true, pro: true, creator: true, enterprise: true },
  { name: 'Keyword research & tracking', free: false, pro: true, creator: true, enterprise: true },
  { name: 'Competitor analysis', free: false, pro: true, creator: true, enterprise: true },
  { name: 'Review monitoring & analysis', free: false, pro: true, creator: true, enterprise: true },
  { name: 'AI-powered copy generation', free: false, pro: true, creator: true, enterprise: true },
  { name: 'Slideshow credits/month', free: false, pro: '30', creator: '100', enterprise: 'Unlimited' },
  { name: 'Auto-posting to TikTok (coming soon)', free: false, pro: false, creator: true, enterprise: true },
  { name: 'Influencer CRM', free: false, pro: true, creator: true, enterprise: true },
  { name: 'Launch sequencer', free: false, pro: true, creator: true, enterprise: true },
  { name: 'Bulk content scheduling', free: false, pro: false, creator: true, enterprise: true },
  { name: 'Advanced hashtag research', free: false, pro: false, creator: true, enterprise: true },
  { name: 'App Store Connect integration', free: false, pro: true, creator: true, enterprise: true },
  { name: 'Growth scenarios', free: false, pro: true, creator: true, enterprise: true },
  { name: 'Multi-app management', free: false, pro: false, creator: false, enterprise: true },
  { name: 'Team collaboration', free: false, pro: false, creator: false, enterprise: true },
  { name: 'API access', free: false, pro: false, creator: false, enterprise: true },
  { name: 'Dedicated account manager', free: false, pro: false, creator: false, enterprise: true },
];

const testimonials = [
  { name: 'Sarah K.', role: 'Indie Developer', text: 'ZeroTask helped me go from 50 to 2,000 daily downloads in 3 months. The keyword tool alone is worth 10x the price.', avatar: 'SK' },
  { name: 'Marcus T.', role: 'Growth Lead, FitApp', text: "We replaced 4 different tools with ZeroTask. The AI copy feature saves our team 15 hours a week.", avatar: 'MT' },
  { name: 'Priya R.', role: 'App Founder', text: "The competitor tracking showed us gaps we never knew existed. Our conversion rate doubled in 6 weeks.", avatar: 'PR' },
];

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel with one click from your settings. No questions asked, no hidden fees.' },
  { q: 'Is there a free trial?', a: 'Yes! Every Pro plan starts with a 14-day free trial. Full access, no credit card limitations.' },
  { q: 'What happens when my trial ends?', a: "You'll be charged $49/mo (or $39/mo annual). Cancel before the trial ends and you won't be charged at all." },
  { q: 'Can I switch plans later?', a: 'Of course. Upgrade, downgrade, or switch between monthly and annual at any time.' },
  { q: 'Do you offer refunds?', a: "Yes — we offer a 30-day money-back guarantee. If you're not happy, we'll refund you in full." },
  { q: 'How does this compare to other ASO tools?', a: 'Most ASO tools charge $200-500/mo for less features. ZeroTask bundles ASO, creative, influencer outreach, and analytics into one AI-powered platform for $49/mo.' },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = async (selectedPlan: 'pro' | 'creator' = 'pro') => {
    if (!user) {
      router.push('/auth');
      return;
    }
    try {
      const res = await apiFetch('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, userId: user.id, plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const proMonthly = annual ? 39 : 49;
  const creatorMonthly = annual ? 119 : 149;
  const monthlyPrice = proMonthly;

  return (
    <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Trusted by 2,000+ app developers
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight">
            Grow your app<br />
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">on autopilot</span>
          </h1>
          <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto">
            Stop juggling 5 different tools. ZeroTask is the all-in-one AI growth platform that handles ASO, creative, outreach, and analytics — so you can focus on building.
          </p>

          {/* Annual toggle */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <span className={cn('text-sm font-medium', !annual ? 'text-text-primary' : 'text-text-secondary')}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                annual ? 'bg-emerald-500' : 'bg-neutral-600'
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm',
                annual ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
            <span className={cn('text-sm font-medium', annual ? 'text-text-primary' : 'text-text-secondary')}>
              Annual <span className="text-emerald-400 font-semibold">Save 20%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20 -mt-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {/* Pro */}
          <div className="rounded-2xl border border-border bg-surface-card p-7 flex flex-col">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              Pro <Crown className="w-4 h-4 text-emerald-400" />
            </h3>
            <p className="text-sm text-text-secondary mt-1">Everything you need to grow</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-text-primary">${proMonthly}</span>
              <span className="text-text-secondary">/mo</span>
              {annual && <span className="ml-2 text-sm text-emerald-400 font-medium">billed annually</span>}
            </div>
            <ul className="mt-8 space-y-3 flex-1">
              {proFeatures.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('pro')}
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-text-secondary text-center mt-2">14-day free trial</p>
            <p className="text-xs text-emerald-500 text-center mt-1">+ Buy additional credits from $0.45/each</p>
          </div>

          {/* Creator — highlighted */}
          <div className="relative rounded-2xl border-2 border-violet-500 bg-surface-card p-7 flex flex-col shadow-xl shadow-violet-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full text-white text-xs font-semibold">
              BEST FOR CREATORS
            </div>
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              Creator <Sparkles className="w-4 h-4 text-violet-400" />
            </h3>
            <p className="text-sm text-text-secondary mt-1">Scale your content game</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-text-primary">${creatorMonthly}</span>
              <span className="text-text-secondary">/mo</span>
              {annual && <span className="ml-2 text-sm text-violet-400 font-medium">billed annually</span>}
            </div>
            <ul className="mt-8 space-y-3 flex-1">
              {creatorFeatures.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('creator')}
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-text-secondary text-center mt-2">14-day free trial</p>
            <p className="text-xs text-violet-400 text-center mt-1">+ Buy additional credits from $0.45/each</p>
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border border-border bg-surface-card p-7 flex flex-col opacity-75">
            <h3 className="text-lg font-semibold text-text-primary">Enterprise</h3>
            <p className="text-sm text-text-secondary mt-1">For teams & agencies</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-text-primary">$299</span>
              <span className="text-text-secondary">/mo</span>
            </div>
            <ul className="mt-8 space-y-3 flex-1">
              {['Everything in Creator', 'Multi-app management', 'Team collaboration', 'API access', 'Dedicated account manager', 'Custom integrations'].map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="mt-8 w-full py-3 rounded-xl border border-border text-text-secondary font-medium cursor-not-allowed"
            >
              Coming Soon — Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-10">Feature Comparison</h2>
          <div className="rounded-2xl border border-border bg-surface-card overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-surface-hover border-b border-border text-sm font-semibold text-text-primary">
              <div>Feature</div>
              <div className="text-center text-emerald-400">Pro</div>
              <div className="text-center text-violet-400">Creator</div>
              <div className="text-center">Enterprise</div>
            </div>
            {comparisonFeatures.map((f, i) => {
              const renderCell = (val: boolean | string) => {
                if (typeof val === 'string') return <span className="text-xs font-medium text-text-secondary">{val}</span>;
                return val ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-neutral-500 mx-auto" />;
              };
              return (
                <div key={f.name} className={cn('grid grid-cols-4 gap-4 px-6 py-3 text-sm', i % 2 === 0 && 'bg-surface-hover/50')}>
                  <div className="text-text-secondary">{f.name}</div>
                  <div className="text-center">{renderCell(f.pro)}</div>
                  <div className="text-center">{renderCell(f.creator)}</div>
                  <div className="text-center">{renderCell(f.enterprise)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Value prop */}
      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Why pay $500/mo elsewhere?</h2>
          <p className="text-text-secondary mb-8">Most app growth teams pay for 4-5 separate tools. ZeroTask replaces them all.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Zap, label: 'ASO Tools', old: '$150/mo', replacement: 'Keywords + Competitors' },
              { icon: Star, label: 'Review Tools', old: '$100/mo', replacement: 'Review Analysis' },
              { icon: Shield, label: 'Creative Suite', old: '$200/mo', replacement: 'AI Copy + TikTok Studio' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-border bg-surface-card p-5">
                <item.icon className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-text-primary">{item.label}</p>
                <p className="text-xl font-bold text-red-400 line-through">{item.old}</p>
                <p className="text-xs text-text-secondary mt-1">→ Included in ZeroTask Pro</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-10">Loved by app developers</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-2xl border border-border bg-surface-card p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-text-secondary mb-4">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-secondary">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-text-primary">{faq.q}</span>
                  <ChevronDown className={cn('w-4 h-4 text-text-secondary transition-transform', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-text-secondary">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Money-back guarantee */}
      <section className="px-4 pb-20">
        <div className="max-w-md mx-auto text-center">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <Shield className="w-8 h-8 text-emerald-400" />
            <div className="text-left">
              <p className="text-sm font-semibold text-text-primary">30-Day Money-Back Guarantee</p>
              <p className="text-xs text-text-secondary">Not happy? Full refund, no questions asked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto text-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-12">
          <h2 className="text-3xl font-bold text-text-primary">Ready to grow?</h2>
          <p className="mt-3 text-text-secondary">Start your 14-day free trial today. No credit card required.</p>
          <button
            onClick={() => handleCheckout('creator')}
            className="mt-8 inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-[1.02] text-lg"
          >
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
