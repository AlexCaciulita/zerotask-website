'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Beaker, DollarSign, BarChart3, TrendingUp, Globe, ChevronRight,
  Zap, Target, ArrowRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
  CartesianGrid
} from 'recharts';
import clsx from 'clsx';
import { saveScenario, getScenarios } from '@/lib/db';

// Pricing Elasticity
function pricingData(price: number) {
  const base = 10000;
  const elasticity = -1.8;
  const users = Math.max(100, Math.round(base * Math.pow(price / 4.99, elasticity)));
  const revenue = users * price;
  return Array.from({ length: 20 }, (_, i) => {
    const p = 0.99 + i * 1.5;
    const u = Math.max(50, Math.round(base * Math.pow(p / 4.99, elasticity)));
    return { price: `$${p.toFixed(2)}`, users: u, revenue: u * p, isSelected: Math.abs(p - price) < 0.75 };
  });
}

// Ad Budget
const AD_CHANNELS = ['Apple Ads', 'Meta', 'TikTok', 'Google UAC', 'Reddit'];
const CHANNEL_CPI = [1.5, 3.2, 2.8, 2.1, 4.5];
const CHANNEL_COLORS = ['#10b981', '#3b82f6', '#ec4899', '#f59e0b', '#ef4444'];

// Growth Projections
function growthData(multiplier: number) {
  return Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    current: Math.round(500 * Math.pow(1.08, i)),
    projected: Math.round(500 * Math.pow(1.08 + multiplier * 0.04, i)),
  }));
}

// Countries
const COUNTRIES = [
  { code: 'US', name: 'United States', score: 92, market: '$4.2B', competition: 'High' },
  { code: 'UK', name: 'United Kingdom', score: 85, market: '$890M', competition: 'Medium' },
  { code: 'DE', name: 'Germany', score: 78, market: '$720M', competition: 'Medium' },
  { code: 'JP', name: 'Japan', score: 88, market: '$1.8B', competition: 'High' },
  { code: 'BR', name: 'Brazil', score: 71, market: '$450M', competition: 'Low' },
  { code: 'IN', name: 'India', score: 65, market: '$380M', competition: 'Low' },
  { code: 'KR', name: 'South Korea', score: 82, market: '$650M', competition: 'Medium' },
  { code: 'FR', name: 'France', score: 76, market: '$580M', competition: 'Medium' },
  { code: 'AU', name: 'Australia', score: 80, market: '$420M', competition: 'Low' },
  { code: 'CA', name: 'Canada', score: 79, market: '$390M', competition: 'Low' },
  { code: 'MX', name: 'Mexico', score: 62, market: '$210M', competition: 'Low' },
  { code: 'IT', name: 'Italy', score: 70, market: '$340M', competition: 'Medium' },
  { code: 'ES', name: 'Spain', score: 68, market: '$280M', competition: 'Low' },
  { code: 'SE', name: 'Sweden', score: 74, market: '$180M', competition: 'Low' },
  { code: 'ID', name: 'Indonesia', score: 58, market: '$160M', competition: 'Low' },
  { code: 'TH', name: 'Thailand', score: 60, market: '$140M', competition: 'Low' },
];

export default function ScenariosPage() {
  // Pricing
  const [price, setPrice] = useState(4.99);
  // Ad Budget
  const [adBudget, setAdBudget] = useState([300, 200, 150, 200, 50]);
  const totalAdBudget = adBudget.reduce((a, b) => a + b, 0);
  // Growth
  const [growthMultiplier, setGrowthMultiplier] = useState(2);
  // Countries
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Load saved scenarios from Supabase on mount
  useEffect(() => {
    const appId = typeof window !== 'undefined' ? (localStorage.getItem('zerotask-active-app') || 'default') : 'default';
    async function loadScenarios() {
      try {
        const data = await getScenarios(appId);
        if (data && data.length > 0) {
          // Apply latest scenario variables
          const latest = data[data.length - 1];
          const vars = latest.variables as Record<string, string> | null;
          if (vars) {
            if (vars.pricing) setPrice(parseFloat(vars.pricing));
            if (vars.adBudget) {
              // Keep current sliders, just note it's saved
            }
          }
        }
      } catch {}
    }
    loadScenarios();
  }, []);

  const saveToStrategy = useCallback((key: string, value: string, label: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem('zerotask-scenarios') || '{}');
      existing[key] = value;
      localStorage.setItem('zerotask-scenarios', JSON.stringify(existing));
      setSavedMessage(`✅ ${label} saved to strategy!`);
      setTimeout(() => setSavedMessage(null), 3000);
      // Persist to Supabase
      const appId = typeof window !== 'undefined' ? (localStorage.getItem('zerotask-active-app') || 'default') : 'default';
      saveScenario({ app_id: appId, title: label, variables: { [key]: value } }).catch(() => {});
    } catch {}
  }, []);

  const priceChartData = pricingData(price);
  const selectedPricePoint = priceChartData.find(d => d.isSelected) || priceChartData[3];

  const adPieData = AD_CHANNELS.map((name, i) => ({
    name, value: adBudget[i], installs: Math.round(adBudget[i] / CHANNEL_CPI[i]),
  }));
  const totalInstalls = adPieData.reduce((a, d) => a + d.installs, 0);

  const growthChartData = growthData(growthMultiplier);
  const growthStrategies = ['Organic only', 'Add paid ads', 'Add influencers', 'All channels', 'All + viral loop'];

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Beaker className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">What-If Scenarios</h1>
            <p className="text-sm text-text-secondary">Simulate strategies before committing</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        {/* 1. Pricing Elasticity */}
        <section className="bg-surface-secondary rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Pricing Elasticity</h2>
          </div>
          <div className="grid grid-cols-[1fr_280px] gap-6">
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="price" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98130" strokeWidth={2} name="Monthly Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Monthly Price</label>
                <input type="range" min={0.99} max={29.99} step={0.5} value={price} onChange={e => setPrice(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]" />
                <div className="flex justify-between text-xs text-text-tertiary mt-1">
                  <span>$0.99</span><span className="font-medium text-text-primary text-lg">${price.toFixed(2)}</span><span>$29.99</span>
                </div>
              </div>
              <div className="bg-surface rounded-lg p-3 border border-border">
                <p className="text-xs text-text-tertiary">Est. Subscribers</p>
                <p className="text-xl font-bold">{selectedPricePoint.users.toLocaleString()}</p>
              </div>
              <div className="bg-surface rounded-lg p-3 border border-border">
                <p className="text-xs text-text-tertiary">Est. Monthly Revenue</p>
                <p className="text-xl font-bold text-accent">${selectedPricePoint.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <button onClick={() => saveToStrategy('pricing', price.toFixed(2), `Pricing $${price.toFixed(2)}/mo`)}
                className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center justify-center gap-1.5">
                <ArrowRight className="w-4 h-4" /> Apply to Strategy
              </button>
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3">💡 Sweet spot: $4.99-$6.99 maximizes revenue in the Productivity category</p>
        </section>

        {/* 2. Ad Budget Optimizer */}
        <section className="bg-surface-secondary rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Ad Budget Optimizer</h2>
          </div>
          <div className="grid grid-cols-[1fr_280px] gap-6">
            <div>
              <div className="flex justify-center">
                <ResponsiveContainer width={300} height={280}>
                  <PieChart>
                    <Pie data={adPieData} dataKey="value" cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={2} label={((props: Record<string, unknown>) => `${props.name} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`) as any}>
                      {adPieData.map((_, i) => <Cell key={i} fill={CHANNEL_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-3">
              {AD_CHANNELS.map((ch, i) => (
                <div key={ch}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[i] }} />
                      {ch}
                    </span>
                    <span className="font-medium">${adBudget[i]}</span>
                  </div>
                  <input type="range" min={0} max={500} step={25} value={adBudget[i]}
                    onChange={e => { const n = [...adBudget]; n[i] = Number(e.target.value); setAdBudget(n); }}
                    className="w-full accent-[var(--color-accent)]" />
                </div>
              ))}
              <div className="bg-surface rounded-lg p-3 border border-border mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Total Budget</span>
                  <span className="font-bold">${totalAdBudget}/mo</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-text-tertiary">Projected Installs</span>
                  <span className="font-bold text-accent">{totalInstalls.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-text-tertiary">Blended CPI</span>
                  <span className="font-bold">${totalInstalls > 0 ? (totalAdBudget / totalInstalls).toFixed(2) : '0'}</span>
                </div>
              </div>
              <button onClick={() => saveToStrategy('adBudget', String(totalAdBudget), `Ad Budget $${totalAdBudget}/mo`)}
                className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center justify-center gap-1.5">
                <ArrowRight className="w-4 h-4" /> Apply to Strategy
              </button>
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3">💡 Apple Ads has the lowest CPI ($1.50) — consider allocating more budget there</p>
        </section>

        {/* 3. Growth Projections */}
        <section className="bg-surface-secondary rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Growth Projections</h2>
          </div>
          <div className="grid grid-cols-[1fr_280px] gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={growthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-tertiary)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="current" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Current Trajectory" dot={false} />
                <Line type="monotone" dataKey="projected" stroke="#10b981" strokeWidth={2} name="With Strategy" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              <label className="text-sm font-medium block">Strategy Level</label>
              {growthStrategies.map((s, i) => (
                <button key={s} onClick={() => setGrowthMultiplier(i)}
                  className={clsx('w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                    growthMultiplier === i ? 'bg-accent/10 text-accent font-medium border border-accent/30' : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary')}>
                  {s}
                </button>
              ))}
              <div className="bg-surface rounded-lg p-3 border border-border">
                <p className="text-xs text-text-tertiary">12-month projection</p>
                <p className="text-xl font-bold text-accent">
                  {growthChartData[11].projected.toLocaleString()} <span className="text-sm text-text-tertiary font-normal">MRR subscribers</span>
                </p>
                <p className="text-xs text-accent mt-1">
                  +{((growthChartData[11].projected / growthChartData[11].current - 1) * 100).toFixed(0)}% vs current trajectory
                </p>
              </div>
              <button onClick={() => saveToStrategy('growthStrategy', growthStrategies[growthMultiplier], `Growth: ${growthStrategies[growthMultiplier]}`)}
                className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center justify-center gap-1.5">
                <ArrowRight className="w-4 h-4" /> Apply to Strategy
              </button>
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3">💡 Adding influencer marketing shows the best ROI at your current stage</p>
        </section>

        {/* 4. Market Expansion */}
        <section className="bg-surface-secondary rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Market Expansion</h2>
          </div>
          <div className="grid grid-cols-[1fr_280px] gap-6">
            <div className="grid grid-cols-4 gap-2">
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => setSelectedCountry(c)}
                  className={clsx('p-3 rounded-lg text-left transition-all border',
                    selectedCountry?.code === c.code ? 'border-accent bg-accent/5' : 'border-border hover:bg-surface-tertiary bg-surface')}>
                  <p className="text-lg font-bold mb-0.5">{c.code}</p>
                  <p className="text-xs text-text-tertiary truncate">{c.name}</p>
                  <div className="mt-2 w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">{c.score}/100</p>
                </button>
              ))}
            </div>
            <div>
              {selectedCountry ? (
                <div className="space-y-3">
                  <div className="bg-surface rounded-lg p-4 border border-border">
                    <h3 className="font-semibold text-lg mb-1">{selectedCountry.name}</h3>
                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-tertiary">Opportunity Score</span>
                        <span className="font-bold text-accent">{selectedCountry.score}/100</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-tertiary">Market Size</span>
                        <span className="font-bold">{selectedCountry.market}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-tertiary">Competition</span>
                        <span className={clsx('font-bold',
                          selectedCountry.competition === 'High' ? 'text-red-400' : selectedCountry.competition === 'Medium' ? 'text-amber-400' : 'text-accent')}>
                          {selectedCountry.competition}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => saveToStrategy('market', selectedCountry.name, `Market: ${selectedCountry.name}`)}
                    className="w-full px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors flex items-center justify-center gap-1.5">
                    <ArrowRight className="w-4 h-4" /> Apply to Strategy
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
                  Click a country to see details
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-text-tertiary mt-3">💡 Japan has high opportunity (88/100) with strong Productivity app spending despite competition</p>
        </section>
      </div>

      {/* Toast */}
      {savedMessage && (
        <div className="fixed bottom-6 right-6 bg-accent text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-[slideUp_0.3s_ease-out] z-50">
          {savedMessage}
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
