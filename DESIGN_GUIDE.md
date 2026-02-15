# ZeroTask Design Guide

> A comprehensive, actionable UI/UX reference for building a premium AI-powered marketing SaaS.
> Based on deep study of Linear, Vercel, PostHog, Resend, Dub, Cal.com, and modern SaaS best practices.

---

## 1. Design Principles — 10 Rules for Premium SaaS UI

### 1. Hierarchy Through Spacing, Not Borders
Use whitespace and background contrast to separate sections. Borders make UIs feel cluttered. When you must use a border, use `border-neutral-200 dark:border-neutral-800` (subtle, not harsh).

```tsx
// ❌ Bad: borders everywhere
<div className="border border-gray-300 p-4">

// ✅ Good: background contrast + shadow
<div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm p-6">
```

### 2. Fewer Colors, More Shades
Limit your palette to 1 primary + 1 accent + neutrals. Use 9 shades of each. This is what Linear and Vercel do — they feel "designed" because every surface has the right shade.

### 3. Typography Does the Heavy Lifting
80% of your UI is text. Invest in font weight contrast (not size contrast). A `font-medium text-neutral-900` label next to `font-normal text-neutral-500` body text creates instant hierarchy without making anything bigger.

### 4. Density is a Feature
The best SaaS tools (Linear, Bloomberg, PostHog) are information-dense but not cluttered. The secret: consistent spacing scale + small base font (14px) + compact line heights.

### 5. Motion Should Be Invisible
If a user notices an animation, it's too much. Transitions should be 150-200ms, ease-out. No bouncing, no spring physics except on delightful micro-moments (like completing a task).

### 6. Every State Needs Design
Empty, loading, error, success, partial — design all five. The difference between amateur and premium is how loading and empty states look.

### 7. Keyboard-First, Mouse-Compatible
Add `⌘K` command palette. Every table row should be clickable. Focus rings should be visible and styled (`ring-2 ring-blue-500/40 ring-offset-2`).

### 8. Progressive Disclosure
Don't show everything at once. Use expandable cards, collapsible sections, hover-reveals. The dashboard should feel calm at first glance but powerful on exploration.

### 9. Consistent Radius Scale
Pick one border-radius strategy and stick to it. Recommendation for ZeroTask:
- Small elements (badges, pills): `rounded-md` (6px)
- Cards, inputs: `rounded-lg` (8px)  
- Modals, large cards: `rounded-xl` (12px)
- Full-round: pills and avatars only

### 10. Trust the Grid
Use a 4px base grid. All spacing should be multiples of 4. Tailwind's default spacing scale already does this. Never use arbitrary values like `p-[13px]`.

---

## 2. Color & Typography

### Color System

```css
/* ZeroTask Semantic Color Tokens */
:root {
  /* Primary — Cool blue-gray, not generic SaaS blue */
  --color-primary-50: #f0f4f8;
  --color-primary-100: #d9e2ec;
  --color-primary-200: #bcccdc;
  --color-primary-300: #9fb3c8;
  --color-primary-400: #829ab1;
  --color-primary-500: #627d98;
  --color-primary-600: #486581;
  --color-primary-700: #334e68;
  --color-primary-800: #243b53;
  --color-primary-900: #102a43;

  /* Accent — Warm amber for CTAs and highlights */
  --color-accent-400: #f6ad55;
  --color-accent-500: #ed8936;
  --color-accent-600: #dd6b20;

  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Surfaces (light mode) */
  --surface-0: #ffffff;        /* cards, modals */
  --surface-1: #f8fafc;        /* page background */
  --surface-2: #f1f5f9;        /* secondary surfaces */
  --surface-3: #e2e8f0;        /* hover states */

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --text-inverse: #ffffff;
}
```

**Contrast ratios:** All text must hit WCAG AA (4.5:1 for body, 3:1 for large text). `--text-secondary` on `--surface-0` = 4.6:1 ✓.

### Typography

**Font Stack:**
```css
/* Heading: Satoshi or General Sans — geometric, modern, distinctive */
--font-heading: 'Satoshi', 'General Sans', -apple-system, sans-serif;

/* Body: Inter or Geist — optimized for UI, excellent at small sizes */
--font-body: 'Geist', 'Inter', -apple-system, sans-serif;

/* Mono: JetBrains Mono or Geist Mono — for data, code, numbers */
--font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
```

**Type Scale (14px base for density):**
```
text-xs:   12px / 16px  — captions, metadata
text-sm:   14px / 20px  — body text, table cells (DEFAULT)
text-base: 16px / 24px  — section labels, card titles
text-lg:   18px / 28px  — page subtitles
text-xl:   20px / 28px  — page titles
text-2xl:  24px / 32px  — hero numbers, growth score
text-4xl:  36px / 40px  — landing page hero only
```

**Font Weight Usage:**
- `font-normal` (400): body text, descriptions
- `font-medium` (500): labels, table headers, nav items
- `font-semibold` (600): card titles, stat values
- `font-bold` (700): page titles, hero text ONLY

**Letter Spacing:**
- Headings: `tracking-tight` (-0.025em)
- Body: default (0)
- ALL-CAPS labels: `tracking-wider` (0.05em) + `text-xs` + `font-medium` + `text-neutral-500`

---

## 3. Layout Patterns

### Sidebar

```tsx
// 240px fixed sidebar — collapsible to 64px icon-only
<aside className="fixed left-0 top-0 h-screen w-60 bg-neutral-950 text-neutral-300 
  flex flex-col border-r border-neutral-800 transition-[width] duration-200">
  
  {/* Logo + App Switcher */}
  <div className="h-14 px-4 flex items-center border-b border-neutral-800">
    <Logo className="h-6" />
  </div>
  
  {/* Navigation */}
  <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
    <NavItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" active />
    <NavItem icon={Search} label="Keywords" href="/keywords" />
    <NavItem icon={PenTool} label="Copy Machine" href="/copy" />
    {/* ... */}
  </nav>
  
  {/* Bottom: User + Settings */}
  <div className="p-3 border-t border-neutral-800">
    <UserMenu />
  </div>
</aside>
```

**NavItem pattern (Linear-style):**
```tsx
<a className={cn(
  "flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors",
  active 
    ? "bg-neutral-800 text-white font-medium" 
    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
)}>
  <Icon className="h-4 w-4 shrink-0" />
  <span className="truncate">{label}</span>
  {badge && <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium">{badge}</span>}
</a>
```

### Content Area
```tsx
<main className="ml-60 min-h-screen bg-neutral-50 dark:bg-neutral-950">
  {/* Page Header */}
  <header className="sticky top-0 z-10 h-14 bg-white/80 dark:bg-neutral-950/80 
    backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 
    px-8 flex items-center justify-between">
    <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
    <div className="flex items-center gap-3">
      <CommandPaletteTrigger />
      <NotificationBell />
    </div>
  </header>
  
  {/* Page Content */}
  <div className="px-8 py-6 max-w-7xl">
    {children}
  </div>
</main>
```

### Card Pattern
```tsx
<div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 
  dark:border-neutral-800 p-5 hover:shadow-md transition-shadow duration-200">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
      {title}
    </h3>
    <button className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md 
      hover:bg-neutral-100 dark:hover:bg-neutral-800">
      <MoreHorizontal className="h-4 w-4" />
    </button>
  </div>
  {children}
</div>
```

### Data Table (PostHog/Linear-style)
```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-neutral-200 dark:border-neutral-800">
      <th className="text-left py-2.5 px-3 text-xs font-medium text-neutral-500 
        uppercase tracking-wider">Keyword</th>
      <th className="text-right py-2.5 px-3 text-xs font-medium text-neutral-500 
        uppercase tracking-wider">Rank</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
    <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer 
      transition-colors">
      <td className="py-2.5 px-3 font-medium text-neutral-900 dark:text-neutral-100">
        {keyword}
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums text-neutral-600">
        {rank}
      </td>
    </tr>
  </tbody>
</table>
```

---

## 4. Data Visualization

### Stat Cards (Dashboard Top Row)
```tsx
<div className="grid grid-cols-4 gap-4">
  <StatCard 
    label="Growth Score" 
    value="73" 
    suffix="/100"
    trend="+5" 
    trendDirection="up"
    sparklineData={[65, 68, 66, 70, 73]}
  />
</div>

// Implementation:
function StatCard({ label, value, suffix, trend, trendDirection, sparklineData }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 
      dark:border-neutral-800 p-5">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-neutral-900 
          dark:text-white tracking-tight">
          {value}
        </span>
        {suffix && <span className="text-sm text-neutral-400">{suffix}</span>}
        {trend && (
          <span className={cn(
            "text-xs font-medium ml-2 px-1.5 py-0.5 rounded-full",
            trendDirection === 'up' 
              ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10"
              : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
          )}>
            {trendDirection === 'up' ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      {/* Sparkline — tiny inline chart */}
      <div className="mt-3 h-8">
        <Sparkline data={sparklineData} color="var(--color-primary-500)" />
      </div>
    </div>
  );
}
```

### Chart Styling Rules
1. **No gridlines by default** — use light horizontal guides only (`stroke: var(--surface-2)`)
2. **Rounded line caps** — `strokeLinecap="round"` on all SVG lines
3. **Gradient fills** under area charts — fade from accent color to transparent
4. **Tooltip on hover** — `bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl`
5. **Use `tabular-nums`** on all numeric displays for alignment
6. **Library:** Recharts or Tremor (Tremor has Tailwind-native charts)

### Progress / Score Indicators
```tsx
// Circular progress for Growth Score
<svg viewBox="0 0 100 100" className="h-24 w-24">
  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" 
    className="text-neutral-200 dark:text-neutral-800" strokeWidth="8" />
  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
    className="text-emerald-500" strokeWidth="8" strokeLinecap="round"
    strokeDasharray={`${(score / 100) * 264} 264`}
    transform="rotate(-90 50 50)" />
</svg>

// Linear progress bar
<div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
  <div className="h-full bg-blue-500 rounded-full transition-[width] duration-500 ease-out"
    style={{ width: `${percent}%` }} />
</div>
```

---

## 5. AI UX Patterns

### Streaming Text (Copy Machine, Review Responses)
```tsx
// Typewriter effect for AI-generated content
function StreamingText({ text, isStreaming }) {
  return (
    <div className="relative">
      <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 
        whitespace-pre-wrap">
        {text}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 
            animate-pulse align-text-bottom" />
        )}
      </p>
    </div>
  );
}

// CSS for cursor blink
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.animate-cursor { animation: blink 0.8s steps(1) infinite; }
```

### AI Loading States
Never use a generic spinner for AI generation. Use contextual loading:

```tsx
// ✅ Premium: Skeleton with shimmer + status text
function AIGenerating({ stage }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent 
          animate-spin" />
        <span className="animate-pulse">{stage}</span>
      </div>
      {/* Skeleton lines */}
      <div className="space-y-2">
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-full 
          animate-shimmer" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-4/5 
          animate-shimmer [animation-delay:100ms]" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-3/5 
          animate-shimmer [animation-delay:200ms]" />
      </div>
    </div>
  );
}

// Stage progression:
// "Analyzing your app..." → "Researching keywords..." → "Crafting copy..." → "Polishing..."
```

```css
@keyframes shimmer {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
.animate-shimmer { animation: shimmer 1.5s ease-in-out infinite; }
```

### AI Variation Display (Copy Machine)
```tsx
// Side-by-side variations with selection
<div className="grid grid-cols-2 gap-4">
  {variations.map((v, i) => (
    <div key={i} className={cn(
      "relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-150",
      selected === i 
        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/5" 
        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-500">
          Variation {String.fromCharCode(65 + i)}
        </span>
        {selected === i && (
          <Check className="h-4 w-4 text-blue-500" />
        )}
      </div>
      <p className="text-sm text-neutral-800 dark:text-neutral-200">{v.text}</p>
      <div className="mt-3 flex gap-2">
        <button className="text-xs text-neutral-500 hover:text-neutral-700 
          flex items-center gap-1">
          <Copy className="h-3 w-3" /> Copy
        </button>
        <button className="text-xs text-neutral-500 hover:text-neutral-700 
          flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Regenerate
        </button>
      </div>
    </div>
  ))}
</div>
```

### AI Confidence / Quality Indicators
```tsx
// Quality score badge on AI-generated content
<span className={cn(
  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
  score >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
  score >= 60 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
  "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
)}>
  <span className="h-1.5 w-1.5 rounded-full bg-current" />
  {score}% match
</span>
```

### What Makes AI Output Feel Premium vs Cheap

| Premium | Cheap |
|---------|-------|
| Streaming text with cursor | Spinner → wall of text |
| Stage-based progress ("Analyzing competitors...") | Generic "Loading..." |
| Formatted output with sections, bullets, highlights | Raw paragraph dump |
| Subtle entrance animation per paragraph | No animation or jarring pop-in |
| Edit inline with diff view | Copy-paste only |
| Confidence indicators on suggestions | No quality signal |
| "Regenerate with instructions" option | One-shot only |

---

## 6. Micro-interactions

### Hover Effects
```css
/* Card lift on hover */
.card-hover {
  @apply transition-all duration-200;
}
.card-hover:hover {
  @apply shadow-md -translate-y-0.5;
}

/* Row highlight */
.row-hover {
  @apply transition-colors duration-100;
}
.row-hover:hover {
  @apply bg-neutral-50 dark:bg-neutral-800/30;
}

/* Button press */
.btn-press:active {
  @apply scale-[0.98] transition-transform duration-75;
}
```

### Toast Notifications
```tsx
// Sonner-style toast — bottom-right, stacked
function Toast({ title, description, type = 'default' }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl border 
      border-neutral-200 dark:border-neutral-800 p-4 w-80 
      animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="flex gap-3">
        {type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
        {type === 'error' && <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
          {description && (
            <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Use Sonner library** — it matches this pattern exactly and is the standard for Next.js apps.

### Skeleton Screens
```tsx
function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 
      dark:border-neutral-800 p-5 animate-pulse">
      <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4" />
        <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
      </div>
    </div>
  );
}
```

### Transitions
```js
// tailwind.config.js — extend with these
module.exports = {
  theme: {
    extend: {
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'scale-in': 'scale-in 150ms ease-out',
      },
    },
  },
};
```

### Command Palette (⌘K)
```tsx
// Must-have for power users — Linear's killer feature
// Use cmdk library (by Paco): https://cmdk.paco.me
<CommandDialog>
  <CommandInput placeholder="Search or jump to..." 
    className="border-none focus:ring-0 text-sm" />
  <CommandList>
    <CommandGroup heading="Pages">
      <CommandItem>Dashboard</CommandItem>
      <CommandItem>Keywords</CommandItem>
    </CommandGroup>
    <CommandGroup heading="Actions">
      <CommandItem>Run ASO Audit</CommandItem>
      <CommandItem>Generate Copy</CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

---

## 7. Dark Mode

### Architecture
Use CSS custom properties + Tailwind's `dark:` variant. **Never** invert colors — design dark mode as a separate, intentional palette.

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-elevated: #ffffff;
  --border-default: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
}

.dark {
  --bg-primary: #0a0a0a;
  --bg-secondary: #0f0f0f;
  --bg-tertiary: #171717;
  --bg-elevated: #1a1a1a;
  --border-default: #262626;
  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
}
```

### Dark Mode Rules

1. **Background hierarchy:** `#0a0a0a` → `#0f0f0f` → `#171717` → `#1a1a1a` (not `#000`)
2. **Text:** `#fafafa` primary (not pure `#fff`), `#a3a3a3` secondary
3. **Borders:** `#262626` (visible but subtle)
4. **Colored elements:** Reduce saturation by ~10% and brightness by ~5% in dark mode
5. **Shadows:** Replace box-shadow with subtle border. Shadows don't work on dark backgrounds
6. **Charts:** Lighten data colors slightly for dark backgrounds
7. **Images/logos:** Provide light/dark variants or use `brightness(0.9)` filter

```tsx
// Toggle implementation
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
  className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
  <Sun className="h-4 w-4 hidden dark:block text-neutral-400" />
  <Moon className="h-4 w-4 block dark:hidden text-neutral-600" />
</button>

// Use next-themes library for SSR-safe theme switching
```

---

## 8. Mobile Patterns

### Responsive Breakpoint Strategy
```
sm:  640px  — phone landscape
md:  768px  — tablet portrait (sidebar collapses here)
lg:  1024px — tablet landscape / small desktop
xl:  1280px — standard desktop
2xl: 1536px — wide desktop
```

### Sidebar → Bottom Nav (Mobile)
```tsx
// Below md: sidebar becomes bottom tab bar
<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 
  bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 
  flex items-center justify-around h-16 px-2 pb-safe">
  <BottomNavItem icon={LayoutDashboard} label="Home" href="/dashboard" />
  <BottomNavItem icon={Search} label="Keywords" href="/keywords" />
  <BottomNavItem icon={PenTool} label="Copy" href="/copy" />
  <BottomNavItem icon={Film} label="TikTok" href="/tiktok" />
  <BottomNavItem icon={Menu} label="More" href="/menu" />
</nav>

// pb-safe for iPhone notch:
// Add to tailwind: { 'pb-safe': 'env(safe-area-inset-bottom)' }
```

### Responsive Cards
```tsx
// Stack on mobile, grid on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard />
</div>
```

### Mobile Table → Card List
```tsx
// Tables don't work on mobile. Transform to cards:
<div className="hidden md:block">
  <Table>{/* full table */}</Table>
</div>
<div className="md:hidden space-y-2">
  {data.map(row => (
    <div key={row.id} className="bg-white dark:bg-neutral-900 rounded-lg border 
      border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex justify-between items-start">
        <span className="font-medium text-sm">{row.keyword}</span>
        <span className="text-sm tabular-nums">{row.rank}</span>
      </div>
      <div className="flex gap-3 mt-1.5 text-xs text-neutral-500">
        <span>Vol: {row.volume}</span>
        <span>Diff: {row.difficulty}</span>
      </div>
    </div>
  ))}
</div>
```

### Touch Targets
Minimum 44×44px for all interactive elements on mobile. Use `min-h-[44px] min-w-[44px]` on buttons/links.

---

## 9. Specific Recommendations for ZeroTask

### `/dashboard` — Main Hub

**Current opportunity:** Make the Growth Score the emotional center of the app.

```tsx
// Hero stat — Growth Score with ring visualization
<div className="flex items-center gap-8 mb-8">
  <div className="relative">
    <svg viewBox="0 0 120 120" className="h-28 w-28">
      <circle cx="60" cy="60" r="52" fill="none" 
        className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="10" />
      <circle cx="60" cy="60" r="52" fill="none"
        className="stroke-emerald-500" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(73 / 100) * 327} 327`}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray 1s ease-out' }} />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-3xl font-bold tabular-nums">73</span>
      <span className="text-xs text-neutral-500">/ 100</span>
    </div>
  </div>
  <div>
    <h2 className="text-lg font-semibold">Growth Score</h2>
    <p className="text-sm text-neutral-500 mt-0.5">+5 points this week</p>
    <div className="flex gap-2 mt-3">
      <Pill color="amber">3 issues</Pill>
      <Pill color="emerald">12 optimized</Pill>
    </div>
  </div>
</div>
```

**Activity Feed:** Use a timeline layout with category-coded left borders:
```tsx
<div className="space-y-3">
  <FeedCard 
    borderColor="border-l-blue-500"
    icon={Sparkles}
    title="New copy variations generated"
    description="3 title options for 'fitness tracker' keyword"
    time="2h ago"
    actionLabel="Review"
  />
  <FeedCard 
    borderColor="border-l-amber-500" 
    icon={AlertTriangle}
    title="Competitor updated their listing"
    description="FitBuddy changed their subtitle and screenshots"
    time="5h ago"
    actionLabel="Compare"
  />
</div>

function FeedCard({ borderColor, icon: Icon, title, description, time, actionLabel }) {
  return (
    <div className={cn(
      "bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800",
      "border-l-4", borderColor,
      "p-4 hover:shadow-sm transition-shadow cursor-pointer"
    )}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
          <Icon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {title}
            </p>
            <span className="text-xs text-neutral-400 shrink-0 ml-2">{time}</span>
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}
```

### `/keywords` — Keyword Deep Dive

- **Sticky table header** with `sticky top-14 bg-white dark:bg-neutral-950 z-10`
- **Inline sparklines** in rank column showing 7-day trend
- **Color-coded difficulty:** Green (<30), Amber (30-60), Red (>60) using dot indicators
- **Quick filters** as pill tabs above table: `All | Tracking | Opportunities | Declining`
- **"What If" simulator:** Split-pane — left side is editable metadata preview, right side shows predicted rank changes with animated number transitions

### `/copy` — Copy Machine

- **Platform tabs** as segmented control: `rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5` with active tab as `bg-white dark:bg-neutral-900 shadow-sm rounded-md`
- **Character count** with color transition: green → amber → red as you approach limit
- **Side-by-side diff** when editing AI output (use green/red inline highlights)
- **"Tone" selector** as horizontal pill group: Professional / Casual / Urgent / Playful

### `/tiktok` — TikTok Content Studio

- **Slide carousel builder:** Horizontal scroll container with drag-to-reorder (use `@dnd-kit/sortable`)
- Each slide card: `aspect-[9/16] w-36` with image preview + overlay text
- **Hook brainstorm:** Display as swipeable cards, not a list
- **Calendar view:** Week view by default, each day shows post thumbnails. Use CSS Grid:
  ```tsx
  <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden">
    {days.map(day => (
      <div key={day} className="bg-white dark:bg-neutral-900 p-2 min-h-[120px]">
        <span className="text-xs font-medium text-neutral-500">{day.label}</span>
        {day.posts.map(post => (
          <div className="mt-1 aspect-[9/16] w-full rounded bg-neutral-100 
            dark:bg-neutral-800 overflow-hidden">
            <img src={post.thumbnail} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    ))}
  </div>
  ```

### `/competitors` — War Room

- **Side-by-side cards** with a dividing line: `grid grid-cols-2 divide-x`
- **Keyword overlap:** Venn diagram using SVG with semi-transparent fills
- **Timeline:** Vertical timeline with alternating left/right events, Linear-style
- **Diff view** for listing changes — use green/red highlights like GitHub

### `/reviews` — Review Intelligence

- **Sentiment donut chart** center: overall score, ring: topic breakdown
- **Topic clusters** as bubbles (size = volume, color = sentiment)
- **Review cards** with highlighted entity extraction (app features in blue pills)
- **Trend sparkline** next to each topic showing sentiment over time

### `/launch` — Launch Sequencer

- **Horizontal timeline** with swimlanes (ASO, Ads, Community, Social)
- Each item: pill-shaped, color-coded by status
- **Checklist drawer:** Slides in from right with task details + attached AI content
- Status progression animation: checkmark draws on completion

### Global Component Library Priorities

1. `<Button>` — primary, secondary, ghost, destructive variants
2. `<Badge>` — status colors, sizes  
3. `<Card>` — base card with optional header, footer, border-left accent
4. `<Table>` — sortable, filterable, with mobile card fallback
5. `<Modal>` / `<Drawer>` — with backdrop blur
6. `<Tabs>` — line tabs and segmented control variants
7. `<Tooltip>` — dark bg, 200ms delay, arrow
8. `<Skeleton>` — matching every component shape
9. `<EmptyState>` — illustration + title + description + CTA
10. `<CommandPalette>` — ⌘K global search

---

## 10. Inspiration Gallery

### Best-in-Class SaaS UIs
| Tool | What to Study | URL |
|------|---------------|-----|
| **Linear** | Keyboard navigation, sidebar, issue cards, speed | [linear.app](https://linear.app) |
| **Vercel** | Dashboard layout, deployment cards, dark mode | [vercel.com](https://vercel.com) |
| **PostHog** | Analytics charts, data tables, query builder | [posthog.com](https://posthog.com) |
| **Resend** | Minimalism, email editor, clean forms | [resend.com](https://resend.com) |
| **Dub** | Link cards, analytics views, QR code UI | [dub.co](https://dub.co) |
| **Cal.com** | Calendar UI, booking flow, settings pages | [cal.com](https://cal.com) |
| **Raycast** | Command palette, extensions, keyboard-first | [raycast.com](https://raycast.com) |
| **Notion** | Slash commands, blocks, inline editing | [notion.so](https://notion.so) |
| **Stripe** | Dashboard, data density, excellent dark mode | [dashboard.stripe.com](https://dashboard.stripe.com) |
| **Figma** | Toolbar, panel layout, collaborative features | [figma.com](https://figma.com) |

### Design Resources
| Resource | What It Offers |
|----------|---------------|
| [Refactoring UI](https://refactoringui.com) | Tactics-based design for developers |
| [Tailwind UI](https://tailwindui.com) | Component patterns (study, don't copy) |
| [Dribbble SaaS](https://dribbble.com/search/saas-dashboard) | Visual inspiration |
| [Mobbin](https://mobbin.com) | Real app screenshots |
| [UI Design Daily](https://uidesigndaily.com) | Daily component inspiration |
| [cmdk](https://cmdk.paco.me) | Command palette component |
| [Sonner](https://sonner.emilkowal.dev) | Toast notifications |
| [Tremor](https://tremor.so) | Tailwind-native charts |
| [Recharts](https://recharts.org) | React charting library |
| [Framer Motion](https://framer.com/motion) | Animation library |

### Key Libraries for ZeroTask
```json
{
  "dependencies": {
    "sonner": "^1.x",
    "cmdk": "^1.x",
    "@tremor/react": "^3.x",
    "framer-motion": "^11.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "next-themes": "^0.x",
    "lucide-react": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  }
}
```

---

## Quick Reference: The ZeroTask Design DNA

```
Font:     Satoshi (headings) + Geist (body) + Geist Mono (data)
Base:     14px body, 4px grid
Radius:   md → lg → xl (small → medium → large)
Motion:   150ms ease-out default, 200ms for layout shifts
Sidebar:  Dark (neutral-950), 240px, collapsible
Content:  Light bg (neutral-50), max-w-7xl, px-8
Cards:    White bg, rounded-xl, border + shadow-sm, p-5
Tables:   14px, hover rows, tabular-nums, sticky header
Colors:   Blue-gray primary, amber accent, semantic greens/reds
Dark:     #0a0a0a base, #1a1a1a elevated, #fafafa text
Mobile:   Bottom nav, cards instead of tables, 44px touch targets
AI:       Stream text, stage-based loading, variation cards, confidence badges
Must-have: ⌘K palette, Sonner toasts, skeleton screens, empty states
```
