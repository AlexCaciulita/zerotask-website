# ZeroTask Deep Product Audit
**Date:** Feb 13, 2026 | **Auditor:** Product/Engineering Review | **App:** ZeroTask (AI App Marketing Platform)

---

## Executive Summary

ZeroTask is an ambitious all-in-one app marketing platform with **impressive breadth** — 12+ features spanning ASO, TikTok content, competitor analysis, review management, launch planning, influencer CRM, and landing pages. The UI design is polished with good dark mode support and the architecture is clean Next.js.

**The brutal truth:** It's currently a **beautiful demo with hardcoded data**. Nearly every page displays mock/hardcoded data with AI generation bolted on top. There's no persistence layer (everything is localStorage), no real data integrations, and no backend. A user who signs up would get an impressive first impression but quickly realize the "data" isn't real.

### What Makes It Good (Not Great)
- Clean, modern UI with thoughtful component design
- Smart model routing (Haiku for cheap tasks, Sonnet for creative)
- Real TikTok posting pipeline via Postiz
- Real App Store scraping via iTunes Search API
- Image generation via Gemini with retry logic
- App switching architecture is well-thought-out

### What Makes It "Another AI Wrapper"
- **All keyword data is hardcoded** — 50 fake keywords, not from any real source
- **Dashboard stats are editable text fields** — user manually types their own download numbers
- **No database** — everything in localStorage, lost on clear/new device
- **Reviews are hardcoded** — 50 fake reviews, not scraped
- **Competitor data is hardcoded** — Venn diagram numbers are made up
- **Influencer data is hardcoded** — 15 fake profiles
- **No auth** — anyone can use it, no user accounts
- **No real analytics connection** — no RevenueCat, App Store Connect, or Google Play Console integration

### The Gap Between ZeroTask and $500/mo Tools (AppTweak, Sensor Tower)
Those tools have: real keyword volume data from crawling millions of apps, historical ranking data, actual download estimates from panel data, automated competitor monitoring, A/B testing frameworks, and review aggregation from real app stores. ZeroTask has AI generating plausible-sounding content on top of fake data.

---

## Page-by-Page Audit

### 1. Homepage/Onboarding (`src/app/page.tsx`)

**Current Logic:** User pastes an App Store URL → fake animated audit runs (5 steps, ~800ms each) → shows results with growth score + critical issues + warnings + opportunities. Simultaneously calls AI for a real audit that replaces defaults if successful.

**What's Smart:**
- Great first impression — feels like a real product
- AI audit runs in background while animation plays (good UX pattern)
- Fallback to default results if AI fails (always shows something)
- Clean 3-phase state machine (input → auditing → results)

**What's Dumb/Broken:**
- **Doesn't actually scrape the URL.** The AI just gets the raw URL text and "infers from the URL pattern." The scraper (`/api/scrape`) exists but isn't used here!
- Default audit results are generic ("Title missing primary keyword") — same for every app
- Growth score defaults to 34 with no basis
- "Fix Everything Automatically" button just links to `/dashboard` — doesn't actually fix anything
- No URL validation — accepts any text

**What's Missing:**
- Actually scrape the app listing and pass real data to the AI
- Show real screenshots/icon from the scraped app
- Compare against category benchmarks with real data
- Email capture before showing results (lead gen!)
- Progress should show real scraping status, not fake animation

**Specific Improvements:**
1. Call `/api/scrape` with the URL, get real app data, pass to AI
2. Show the app icon + name + current rating in the results
3. Add email capture: "Enter email to save your audit and track progress"
4. Make "Fix Everything Automatically" actually apply AI-generated changes to copy/keywords

---

### 2. Dashboard (`src/app/dashboard/page.tsx`)

**Current Logic:** Shows growth score, 4 stat cards (downloads, revenue, rating, keywords), quick action buttons, and an activity feed. Stats are editable by clicking. Period filter (week/month/all). AI audit generates feed items.

**What's Smart:**
- Editable stat cards is a clever workaround for not having real data
- Activity feed with dismissible items
- Period toggle with calculated deltas
- Growth score formula weighs downloads, revenue, rating, and keywords

**What's Dumb/Broken:**
- **Stats are completely fake and user-editable.** Downloads: 2847, Revenue: $4291 — just default numbers. User clicks and types new numbers. This is not analytics — it's a spreadsheet.
- Growth score calculation is flawed: `dlTrend * 0.3 + revTrend * 0.3 + ratingScore * 0.2 + kwScore * 0.2` — rating score is `rating/5` (absolute, not relative), mixing percentage changes with absolute ratios
- Default feed items reference "PixelPerfect" and "AI photo enhancer" — leftover from a photo editing app, not dating
- "Run Audit" makes an AI call but the system prompt asks for generic feed items — no actual data analysis
- Scenario note from What-If page shows but doesn't affect any calculations

**What's Missing:**
- **Real data connections:** App Store Connect API, Google Play Console, RevenueCat
- Trend charts (sparklines, line charts over time)
- Goal setting and progress tracking
- Automated alerts when metrics change significantly
- Comparison to category benchmarks

**Specific Improvements:**
1. Integrate App Store Connect API for real download/revenue data
2. Replace editable stat cards with read-only metrics from real sources
3. Fix default feed items to match the dating app context
4. Add sparkline charts to each stat card showing 7-day trends
5. Add "Today's Priority" section — one AI-recommended action

---

### 3. Keywords (`src/app/keywords/page.tsx`)

**Current Logic:** Shows 50 hardcoded keywords with volume, difficulty, rank, change, sparklines. Country multiplier for volume. What-If simulator for title/subtitle/keyword changes. AI simulation and AI keyword suggestions.

**What's Smart:**
- 50 well-researched keywords relevant to dating apps
- Country multiplier concept (volume varies by market)
- What-If simulator for metadata changes — this is the #1 feature AppTweak charges for
- AI keyword suggestions with reasoning
- Sortable columns with sparkline trends

**What's Dumb/Broken:**
- **All 50 keywords are hardcoded with fake data.** Volumes are made up (e.g., "rizz ai" at 120K — real volume is likely different). Ranks are fake. Changes are fake.
- Country multiplier is just a simple decimal (US=1.0, UK=0.28) — not real per-keyword data
- Sparklines are randomly generated on page load: `generateSparkline(base, trend)` just creates noise
- What-If simulator predictions are random: `Math.floor(Math.random() * 5) + 3` — literally random numbers
- AI simulation overrides the random predictions but has no real data to work from either
- No way to add/remove/track keywords
- "Tracked Since" dates are hardcoded

**What's Missing:**
- **Real keyword data.** Use App Store search suggest API (already have `getKeywordSuggestions` in scraper!) to get real autocomplete data
- Keyword tracking over time (actual rank checking)
- Keyword grouping/clustering
- Competitor keyword gap analysis
- Search Ads integration for actual volume data
- Export functionality
- Add/remove keywords

**Specific Improvements:**
1. Use the existing `getKeywordSuggestions` scraper to populate real suggestions
2. Add "Track Keyword" button to start monitoring rank changes
3. Store keyword history in a database to show real trends
4. Implement actual rank checking by searching the App Store and finding position
5. Add keyword clustering (group related terms)

---

### 4. TikTok Studio (`src/app/tiktok/page.tsx`)

**Current Logic:** 5 tabs — Hooks (AI-generated viral hook templates), Slideshow (generate 6 AI images + text overlay), Calendar (weekly content planner), Performance (mock analytics), What If (frequency simulator).

**What's Smart:**
- **The hook formula system is genuinely clever.** [Person] + [conflict] → [tool] is a proven viral formula
- Real image generation via Gemini API with retry logic
- Real TikTok posting via Postiz API (actually works!)
- Hook → Slideshow pipeline: click a hook, it auto-fills slideshow with AI-suggested styles
- Content calendar with drag states (Draft → Ready → Posted)
- "Generate & Post" one-click pipeline

**What's Dumb/Broken:**
- **Performance data is hardcoded.** Views, likes, shares — all fake. "234,200 views" for the first post — not real.
- Formula stats (avg views per formula) are hardcoded, not calculated from real data
- What-If frequency simulator is simplistic: `frequency * 30 * 8500 * (1 + (frequency - 1) * 0.15)` — magic numbers
- Calendar has no auto-scheduling, no best-time recommendations
- Only 6 slides per slideshow (TikTok allows more)
- Slide generation is sequential (6 API calls one at a time) — slow
- No video generation — only static image slideshows
- Text overlay only on slide 1

**What's Missing:**
- **TikTok Analytics API integration** for real performance data
- Auto-scheduling based on audience peak times
- A/B testing different hooks
- Trending audio/sound suggestions
- Video templates (not just slideshows)
- Caption optimization with hashtag research
- Batch content generation (generate a week's worth at once)
- Performance benchmarking against similar accounts

**Specific Improvements:**
1. Connect TikTok Analytics API for real view/engagement data
2. Add batch generation: "Generate 7 days of content" button
3. Parallel image generation (Promise.all with rate limiting)
4. Add trending hashtag research using TikTok API
5. Show best posting times based on niche data

---

### 5. Copy Machine (`src/app/copy/page.tsx`)

**Current Logic:** 8 platform tabs (App Store, Play Store, ASA, Google UAC, Meta, TikTok, Reddit, Product Hunt). 4 voice options. Shows 3 variations per platform. AI generation, per-variation regeneration, character limits with overflow warning.

**What's Smart:**
- **8 platform support is comprehensive** — most tools only do App Store/Play Store
- Character limit enforcement with visual indicators
- Voice/tone system (Professional, Casual, Playful, Luxury)
- In-place editing of generated copy
- Per-variation regeneration
- Export all functionality
- Pre-generated default copy for App Store (saves API calls)

**What's Dumb/Broken:**
- Non-App Store platforms use `generatePlatformCopy()` which returns the SAME generic text for every platform — just with variation numbers appended
- Copy doesn't use brand voice from Settings (tone is local to this page)
- No A/B test tracking (which variation performs better?)
- AI generation doesn't include current keywords or competitor insights
- "Export All" just copies to clipboard — no actual file export
- No localization support
- Reddit "body" field limited to 2000 chars is wrong (Reddit allows 40K)

**What's Missing:**
- **Localization** — generate copy in 20+ languages (huge for ASO)
- A/B test framework — track which copy variation gets more downloads
- Keyword density analyzer — check if target keywords are present
- Competitor copy comparison — show what competitors are saying
- Copy scoring — predict conversion rate
- Version history — track changes over time
- Direct App Store Connect publishing

**Specific Improvements:**
1. Feed tracked keywords into AI generation prompt for SEO optimization
2. Add keyword density checker on generated copy
3. Add localization: "Generate in 10 languages" button
4. Connect brand voice from Settings to AI generation
5. Add "Compare with Competitor" toggle showing side-by-side

---

### 6. Competitors (`src/app/competitors/page.tsx`)

**Current Logic:** 3 default competitors (Hinge, Bumble, Tinder) with side-by-side comparison, keyword Venn diagram, timeline of changes, AI strategy recommendations. Can add new competitors with AI analysis + real App Store scraping.

**What's Smart:**
- Venn diagram for keyword overlap is a great visualization
- Real App Store scraping when adding competitors (uses iTunes Search API)
- AI competitor analysis produces actionable strategy
- Change timeline concept
- Alert toggle per competitor

**What's Dumb/Broken:**
- **Default competitor data is hardcoded.** Hinge at "890K reviews, 100M+ downloads, 85 keywords, 28 shared" — all made up
- Venn diagram numbers are hardcoded (sharedKeywords, uniqueKeywords, yourUnique) — not from real analysis
- YOUR_APP stats are hardcoded (4.1 rating, 12.4K reviews, 2.1M downloads)
- Timeline events are hardcoded and specific dates (Feb 1, 2026)
- "Alerts On" toggle doesn't actually do anything — no monitoring system
- When scraping a real competitor, most fields stay at 0 (rating, keywords don't match the display format)
- The Venn diagram is CSS circles, not a real SVG — proportions are meaningless

**What's Missing:**
- **Automated monitoring** — check competitor listings daily for changes
- Real keyword overlap analysis by scraping both apps' metadata
- Feature comparison matrix
- Review sentiment comparison
- Download/revenue trend comparison (needs data.ai/Sensor Tower)
- Screenshot comparison
- Alert system (email/Telegram when competitor changes listing)

**Specific Improvements:**
1. When adding a competitor, scrape their real keywords from their App Store description
2. Calculate actual keyword overlap between your tracked keywords and competitor's
3. Make Venn diagram proportional (SVG with calculated radii)
4. Add periodic re-scraping to detect changes
5. Replace hardcoded YOUR_APP data with actual data from Settings/scraper

---

### 7. Reviews (`src/app/reviews/page.tsx`)

**Current Logic:** 50 hardcoded reviews with sentiment clustering (Crashes, Price, Quality, UI, Love It). Rating distribution chart. Feature request extraction. AI-powered response generation. "What If" churn analysis. Paste custom reviews.

**What's Smart:**
- **Sentiment clustering is the right UX** — topics, not just stars (AppFollow's key feature)
- Feature request extraction from reviews
- "What If" churn analysis (fix crashes → rating goes from 4.1 to 4.5)
- AI response generation per review
- Paste custom reviews feature
- Trend indicators per cluster (up/down/flat)

**What's Dumb/Broken:**
- **All 50 reviews are hardcoded.** Authors, dates, content — all fake.
- Churn analysis is hardcoded ("fix crashes → 4.1 to 4.5, +12% retention") — not calculated
- Feature requests are hardcoded with fake mention counts
- Rating distribution is hardcoded (not derived from actual review data)
- No connection to App Store reviews API (the scraper has `getAppReviews`!)
- AI analysis runs on the hardcoded reviews — garbage in, garbage out
- No sentiment timeline (are things getting better or worse?)

**What's Missing:**
- **Real review scraping** — use the existing `getAppReviews` scraper!
- Auto-reply integration (publish responses to App Store)
- Sentiment trend over time
- Review velocity tracking
- Competitor review comparison
- Review reply templates
- Automatic spam/fake review detection
- Review highlighting for screenshots (show best reviews in marketing)

**Specific Improvements:**
1. **Use the existing scraper!** `getAppReviews(appId)` already exists — wire it up
2. Derive rating distribution from actual scraped reviews
3. Derive sentiment clusters from AI analysis of real reviews
4. Calculate churn analysis dynamically based on actual cluster data
5. Add auto-scrape on page load for fresh reviews

---

### 8. Launch (`src/app/launch/page.tsx`)

**Current Logic:** 5-week launch sequencer (Week -2 through Week +2) with 25 steps. Each step has status cycling (queued → in-progress → done → measured), notes, AI-generated content. Product Hunt day comparison (Tuesday vs Thursday). Slide-over detail panel.

**What's Smart:**
- **The 5-week framework is genuinely useful** — this is how real launches work
- Status cycling UX is clean
- Product Hunt day comparison adds real value
- AI content regeneration per step
- Notes per step
- Progress bar and percentage

**What's Dumb/Broken:**
- All launch content is generic pre-written text — not dynamically generated for the actual app
- Product Hunt comparison data is hardcoded ("487 avg upvotes on Tuesday") — not from real data
- No integration with actual tools (Product Hunt API, App Store Connect, social media schedulers)
- Steps can't be reordered, added, or removed
- No dependencies between steps (e.g., "can't do X until Y is done")
- No target date system — just relative weeks
- AI content for dating app references "AI photo enhancer" in some places (wrong app context)

**What's Missing:**
- Custom launch plans (not everyone launches the same way)
- Step dependencies and blockers
- Calendar date assignment (actual dates, not just "Week -2")
- Team collaboration (assign steps to people)
- Integration with task management (export to Notion/Linear)
- Budget tracking per step
- Launch day countdown timer
- Post-launch analytics dashboard

**Specific Improvements:**
1. Add/remove/reorder steps
2. Assign calendar dates to each week
3. Add step dependencies (visually show blockers)
4. Add budget field per step with total tracking
5. Fix AI content to always use current app context

---

### 9. Influencers (`src/app/influencers/page.tsx`)

**Current Logic:** 15 hardcoded influencer profiles with grid and pipeline (Kanban) views. AI-generated DMs (3 variations). Budget what-if slider. AI suggestion to find new influencers.

**What's Smart:**
- **Pipeline/Kanban view is the right CRM pattern** (Discovered → Contacted → ... → Results)
- Budget what-if with projected reach/installs/CPI
- 3 AI DM variations per influencer
- Grid + Pipeline view toggle
- AI suggestion generates new influencer profiles

**What's Dumb/Broken:**
- **All 15 influencers are fake.** Names, handles, emails — all made up. "Jessica Chen @creativejess" doesn't exist.
- AI DMs reference "photo editing" and "filters" — **wrong app context** (should be dating)
- Budget projections use magic formula: `budget * 180 + budget * budget * 0.02` — no basis
- "Send Outreach" button does nothing
- Pipeline stages can't be changed (no drag-and-drop, no manual move)
- No actual influencer discovery (no TikTok/Instagram API integration)
- AI-suggested influencers are also fake (just plausible-sounding names)
- Outreach history is hardcoded strings

**What's Missing:**
- **Real influencer discovery** via TikTok/Instagram creator marketplace APIs
- Actual outreach sending (email integration, DM automation)
- Contract/agreement tracking
- Performance tracking (actual views/clicks from influencer posts)
- Content approval workflow
- Influencer comparison (engagement rates, CPM)
- Affiliate link/promo code tracking

**Specific Improvements:**
1. Fix all AI DMs to reference dating app, not photo editing
2. Add drag-and-drop between pipeline stages
3. Add manual stage advancement buttons
4. Integrate with email to send actual outreach
5. Add performance tracking fields (views, clicks, installs from each influencer)

---

### 10. Landing Pages (`src/app/landing/page.tsx`)

**Current Logic:** WYSIWYG-ish landing page builder with 3 templates (Minimal, Bold, Playful). Edit app name, tagline, description, CTA, store links, accent color. Privacy policy generator. UTM tracking builder. Host on ZeroTask toggle.

**What's Smart:**
- **Three template options is good for MVP**
- Live preview updates in real-time
- UTM builder is useful
- Auto-generated privacy policy
- Accent color picker
- Screenshot placeholders

**What's Dumb/Broken:**
- **"Export Code" doesn't export code** — it just shows a toast that says "Code copied!" but copies nothing
- Templates are hardcoded JSX in the page — no actual HTML export
- No real hosting — "Host on ZeroTask" toggle is cosmetic
- Screenshot slots are empty placeholders (can't upload actual screenshots)
- Features section always shows "AI Enhancement, Background Removal, Smart Filters" — **wrong app** (should be dating features)
- No mobile preview
- No custom sections
- Privacy policy is one-size-fits-all template

**What's Missing:**
- **Actual code export** (static HTML/CSS that can be deployed)
- Screenshot/image upload
- Custom sections (testimonials, pricing, FAQ)
- Mobile responsive preview
- Real hosting (deploy to Vercel, Netlify, or subdomain)
- Analytics integration (Plausible, PostHog)
- Custom domain support
- A/B testing different landing pages
- Social proof widgets (App Store rating, review quotes)

**Specific Improvements:**
1. Fix "Export Code" to actually generate and export HTML
2. Add image upload for screenshots
3. Fix features section to use app-specific features
4. Add mobile preview toggle
5. Add testimonial/review section using real reviews

---

### 11. What-If Scenarios (`src/app/scenarios/page.tsx`)

**Current Logic:** 4 simulators — Pricing Elasticity (price vs subscribers/revenue), Ad Budget Optimizer (5 channels with pie chart), Growth Projections (strategy level → 12-month forecast), Market Expansion (16 countries with opportunity scores).

**What's Smart:**
- **This is the most unique page** — no other tool has all these simulators together
- Pricing elasticity curve is useful for decision-making
- Ad budget optimizer with per-channel CPI and blended CPI
- "Apply to Strategy" saves choices and shows on Dashboard
- Market expansion with opportunity scoring is great for international strategy

**What's Dumb/Broken:**
- Pricing elasticity uses a simple power function: `base * (price/4.99)^(-1.8)` — not based on real data
- Channel CPI values are hardcoded constants (Apple: $1.5, Meta: $3.2) — not from real campaign data
- Country opportunity scores are hardcoded (US: 92, UK: 85) — no basis
- Growth projections use compound growth with arbitrary multipliers
- None of these simulations learn from actual data
- Category-specific context missing (dating app pricing is different from productivity)

**What's Missing:**
- Historical data to calibrate models
- Category benchmarks (what do dating apps typically charge?)
- A/B test pricing recommendations
- Seasonal trends in projections
- Competitor pricing comparison
- ROI calculator with actual cost inputs

**Specific Improvements:**
1. Add category-specific default values (dating app pricing benchmarks)
2. Allow entering actual campaign data to calibrate CPI
3. Add historical data input for growth projections
4. Show confidence intervals on projections
5. Add seasonal adjustment to growth models

---

### 12. Settings (`src/app/settings/page.tsx`)

**Current Logic:** 5 tabs — Apps (CRUD for connected apps), API Keys (display), Brand Voice (tone + guidelines), AI Models (model selection per task), Notifications, Monthly cost estimator.

**What's Smart:**
- **App management is well-implemented** — add, edit, delete, switch
- Brand voice with tone preview is nice
- AI model selection per task type is power-user feature
- Cost estimator in the sidebar is useful

**What's Dumb/Broken:**
- API keys are hardcoded display strings — can't actually enter/save keys
- Brand voice tone doesn't propagate to other pages (each page has its own tone)
- AI model selection is cosmetic — the actual code only uses "fast" and "smart" tiers
- Notification toggles don't do anything (no notification system)
- Cost estimator uses fake per-model costs
- No account management, no auth

**What's Missing:**
- Actual API key management (save to .env or encrypted storage)
- User authentication
- Team/workspace management
- Data export/import
- Billing integration
- Usage tracking/history
- Webhook configuration for alerts

**Specific Improvements:**
1. Make brand voice actually propagate to all AI generation calls
2. Wire up model selection to actual API calls
3. Add real API key storage (encrypted localStorage at minimum)
4. Add data export (download all settings + generated content)

---

### 13. AI Prompts (`src/lib/ai.ts`)

**Current Logic:** Central AI module using Anthropic SDK with two tiers (Haiku for fast, Sonnet for smart). Task-specific functions for copy, hooks, reviews, keywords, competitors, simulation.

**What's Smart:**
- **Two-tier model routing is cost-efficient** — Haiku for simple analysis, Sonnet for creative work
- Streaming support (though not used in any page)
- Structured prompt templates with app context injection
- JSON output parsing with markdown code block extraction

**What's Dumb/Broken:**
- **APP_CONTEXT always injects "Not provided" for description and keywords** — because they're never passed from the frontend
- Hook brainstorming prompt says "landlord" and "living room" examples — **wrong context** for dating app
- `analyzeReviews` runs on fake reviews, producing fake insights
- No system prompt consistency — some functions use APP_CONTEXT, some don't
- No prompt versioning or A/B testing
- Temperature 0.7 for everything — some tasks need lower (analysis) or higher (creative)
- No output validation — if AI returns malformed JSON, it silently fails

**What's Missing:**
- **Few-shot examples** in prompts (show the AI what good output looks like)
- Output schema validation (zod or similar)
- Prompt caching for repeated queries
- Rate limiting
- Cost tracking per request
- Fallback to alternative models on failure
- User feedback loop (was this output good? → fine-tune prompts)

**Specific Improvements:**
1. Fix APP_CONTEXT to actually include real app description/keywords from settings
2. Add few-shot examples to every prompt (especially copy generation)
3. Add output validation with zod schemas
4. Use temperature 0.3 for analysis, 0.9 for creative generation
5. Add error handling that returns helpful messages, not silent failures

---

### 14. Image Generation (`src/lib/image-gen.ts`)

**Current Logic:** Uses Gemini 2.5 Flash for image generation. Exponential backoff retry (4 retries). Sequential generation with 5s delays between slides.

**What's Smart:**
- Retry logic with exponential backoff for rate limits
- Prompt includes "iPhone photo, realistic lighting, portrait orientation" — good for TikTok
- 5s delay between slides to avoid RPM limits

**What's Dumb/Broken:**
- Sequential generation means 6 slides take ~35+ seconds
- Text overlay is just added to the prompt — AI rarely renders text correctly
- No style consistency between slides (each is an independent generation)
- No caching — regenerating creates new API calls
- `gemini-2.5-flash-image` — unclear if this is the right model name

**What's Missing:**
- Parallel generation with rate limiting
- Style/character consistency (use reference images or seed)
- Proper text overlay (generate image, then composite text via canvas)
- Image caching
- Image editing (crop, adjust, add text in-app)
- Video generation support

**Specific Improvements:**
1. Use `Promise.allSettled` with a concurrency limit of 2 for parallel generation
2. Implement canvas-based text overlay instead of relying on AI text rendering
3. Add image caching by prompt hash
4. Add image gallery/history

---

### 15. Sidebar (`src/components/Sidebar.tsx`)

**Current Logic:** Collapsible sidebar with 10 nav items, app switcher dropdown, dark mode toggle, mobile bottom nav (5 items).

**What's Smart:**
- App switcher in the sidebar is well-designed
- Collapse state for more screen space
- Mobile bottom nav with 5 key items
- Active state highlighting
- Custom events for app switching (`zerotask-apps-changed`)

**What's Dumb/Broken:**
- "What-If Scenarios" page is not in the nav
- Mobile nav only shows 5 items — 5 features are inaccessible on mobile
- No keyboard shortcuts
- No breadcrumbs in the sidebar
- Dark mode toggle doesn't persist (resets on page load)

**What's Missing:**
- Search command palette (Cmd+K)
- Notification badge on nav items
- "What's New" changelog indicator
- Mobile hamburger menu for all items
- Keyboard navigation

**Specific Improvements:**
1. Add "Scenarios" to nav items
2. Add mobile hamburger menu for all pages
3. Persist dark mode in localStorage
4. Add Cmd+K search/command palette

---

## Priority-Ranked Improvement List

### P0 — Critical (Without these, the product isn't viable)

1. **Add a database** — Replace all localStorage with Supabase/PlanetScale. Users lose everything when they clear browser data.
2. **Wire up real App Store data** — The scraper exists! Use it for onboarding, reviews, competitor data, and keyword research.
3. **Add authentication** — No user accounts means no data persistence, no multi-device, no teams.
4. **Fix hardcoded data** — Keywords, reviews, competitors, influencers, performance data are all fake. Either connect real sources or clearly label as examples.
5. **Fix wrong app context** — Multiple pages reference "photo editing" instead of the active app. Influencer DMs, landing page features, hook examples all need context-awareness.

### P1 — High (Core value proposition)

6. **Real keyword tracking** — Use App Store search suggest + rank checking to provide actual keyword data
7. **Real review scraping** — Wire up existing `getAppReviews()` to Reviews page
8. **Brand voice propagation** — Settings tone/guidelines should flow to all AI generations
9. **Landing page code export** — "Export Code" button should actually work
10. **Dashboard real data** — Connect at least one real data source (RevenueCat, App Store Connect)
11. **Competitor monitoring** — Auto-scrape competitors on a schedule, detect changes
12. **Fix AI prompts** — Add few-shot examples, proper temperatures, output validation

### P2 — Medium (Differentiation)

13. **Localization engine** — Generate copy in multiple languages
14. **A/B testing framework** — Track which copy/screenshots perform better
15. **Keyword clustering** — Group related keywords for strategy
16. **Batch TikTok generation** — Generate a week of content at once
17. **Parallel image generation** — Cut slideshow generation from 35s to ~12s
18. **Canvas-based text overlay** — Don't rely on AI to render text
19. **Launch plan customization** — Add/remove/reorder steps, assign dates
20. **Influencer pipeline management** — Drag-and-drop stages, actual outreach

### P3 — Nice to Have (Polish)

21. **Cmd+K command palette** — Power user navigation
22. **Dark mode persistence** — Save preference
23. **Mobile full navigation** — Hamburger menu
24. **Cost tracking** — Track actual AI API spend
25. **Data export** — Download all generated content
26. **Webhook alerts** — Notify on competitor changes, review spikes
27. **Custom landing page sections** — Testimonials, pricing, FAQ
28. **Video generation** — Not just static slideshows

---

## Quick Wins (< 30 min each)

1. **Fix "Export Code" on Landing Page** — Generate a simple HTML string from current state, copy to clipboard (15 min)
2. **Wire up `getAppReviews()` to Reviews page** — Already have the function, just call it on mount (20 min)
3. **Fix influencer DMs context** — Find/replace photo editing references with dating app context (10 min)
4. **Fix landing page features** — Replace "AI Enhancement, Background Removal, Smart Filters" with dating-relevant features from app data (10 min)
5. **Fix default feed items** — Change "PixelPerfect" and "AI photo enhancer" to dating-relevant examples (10 min)
6. **Add Scenarios to sidebar nav** — One line addition (2 min)
7. **Persist dark mode** — Save to localStorage, read on mount (10 min)
8. **Pass real app data to AI prompts** — Thread app description/keywords from settings into APP_CONTEXT (15 min)
9. **Add URL validation on onboarding** — Check if URL matches App Store/Play Store pattern (10 min)
10. **Use scraper on onboarding** — Call `/api/scrape` before AI audit for real data (20 min)

---

## Architectural Improvements (Bigger Changes)

### 1. Database Layer (2-3 days)
Add Supabase or PlanetScale. Tables needed:
- `users` — auth
- `apps` — user's connected apps
- `keywords` — tracked keywords with daily rank snapshots
- `competitors` — tracked competitors with change history
- `reviews` — scraped reviews with sentiment analysis
- `content` — generated copy, hooks, slideshows
- `influencers` — CRM data
- `launch_plans` — launch steps and status

### 2. Background Jobs (1-2 days)
Add a cron/queue system (Vercel Cron, Inngest, or Trigger.dev):
- Daily keyword rank checking
- Daily competitor listing scraping
- Daily review scraping
- Weekly performance report generation

### 3. Real Data Pipeline (3-5 days)
- App Store Connect API for download/revenue data
- Google Play Developer API for Android data
- RevenueCat API for subscription metrics
- TikTok Analytics API for content performance

### 4. Auth + Multi-tenancy (1-2 days)
- Add Clerk or NextAuth
- Scope all data to user/workspace
- Enable team collaboration

### 5. Prompt Engineering Overhaul (1-2 days)
- Add few-shot examples to every prompt
- Add zod output validation
- Implement prompt versioning
- Add A/B testing for prompts
- Task-specific temperatures
- Cost tracking per generation

---

## The "Holy Shit This Is Good" Checklist

What would make someone pay $49/mo for this instead of $500/mo for AppTweak:

- [ ] **Real keyword data that updates daily** — show actual rank changes, not random numbers
- [ ] **One-click competitor monitoring** — "Bumble just changed their title" alert in your inbox
- [ ] **AI that generates copy using YOUR real reviews and YOUR real keywords** — not generic text
- [ ] **TikTok content pipeline that actually tracks ROI** — "This hook generated 50K views and 200 installs"
- [ ] **Launch sequencer that integrates with your actual tools** — auto-post to Product Hunt, auto-start ads
- [ ] **Review responses that can be published directly** — not just drafted and copied
- [ ] **"Fix This" buttons that actually fix things** — click to update your App Store listing via API

The biggest gap isn't features — it's **real data vs. fake data**. Fix that and the product becomes genuinely useful. Everything else is polish.
