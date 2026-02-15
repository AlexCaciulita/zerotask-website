# ZeroTask — Build Specification

## Vision
An AI-powered app growth agent. Not a dashboard of tools — an autonomous marketing agent with a UI. The user adds their app, and ZeroTask does the rest.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom design system (NO shadcn — we want unique, not generic)
- **Database:** Supabase (Postgres + Auth + Realtime)
- **Hosting:** Cloudflare Pages (target, but dev locally first)
- **AI:** Mock AI calls for now (structured to plug in Claude/GPT later)
- **State:** React Server Components + client components where needed
- **Fonts:** Something distinctive — NOT Inter/Roboto/Space Grotesk

## Design Direction
- **Clean, white, polished** — luxury SaaS feel
- **NOT standard AI startup aesthetic** (no purple gradients, no generic dashboards)
- Think: Linear meets Notion meets a Bloomberg terminal's information density
- Crisp typography, generous whitespace, sharp accents
- Subtle animations on state changes, not gratuitous motion
- Dark mode support from day 1

## Architecture

### Three-Panel Layout
```
┌──────────┬──────────────────────────────────┐
│ SIDEBAR  │         MAIN CONTENT              │
│          │                                    │
│ Nav      │  Activity Feed / Drill-down views  │
│ App      │                                    │
│ Switcher │                                    │
│          ├──────────────────────────────────  │
│ Quick    │  Asset Library (collapsible)        │
│ Actions  │                                    │
└──────────┴──────────────────────────────────┘
```

### Pages / Routes

1. **`/` — Landing/Onboarding**
   - If no app added: "Paste your App Store or Google Play link" → instant audit
   - If app exists: redirect to `/dashboard`

2. **`/dashboard` — Main Hub**
   - Growth Score (prominent, always visible)
   - Activity Feed (cards: insights, alerts, generated assets, competitor moves)
   - Each card is expandable → drill-down without leaving the feed
   - Quick actions sidebar: Run Audit, Generate Copy, Plan Launch, Create Content

3. **`/keywords` — Keyword Deep Dive**
   - Full keyword table with search, filters, sorting
   - Historical ranking chart per keyword (mock data for now)
   - Competitor overlap visualization
   - "What if" simulator: preview metadata changes → estimated rank impact

4. **`/copy` — Copy Machine**
   - Generate copy for: App Store, Play Store, Apple Search Ads, Google UAC, Meta, TikTok, Reddit, Product Hunt
   - Platform selector tabs
   - Side-by-side variations
   - Edit inline, regenerate with instructions
   - Export formatted per platform

5. **`/tiktok` — TikTok Content Studio** (The Larry Workflow)
   - Slideshow creator: 6-slide carousel builder
   - Hook brainstorm tool (uses [person + conflict] formula)
   - Architecture locker: define scene once, vary styles
   - Image preview grid (6 slides)
   - Caption + hashtag generator
   - Content calendar: plan posts for the week
   - Performance tracker: views, likes, shares per post
   - Learning log: what worked, what didn't (auto-updated)

6. **`/competitors` — War Room**
   - Side-by-side comparison: your app vs competitors
   - Keyword overlap Venn diagram
   - Timeline of competitor changes
   - AI strategy analysis cards
   - Alert settings: notify when competitor updates listing

7. **`/reviews` — Review Intelligence**
   - Sentiment analysis dashboard (topic clusters, not just stars)
   - Competitor review mining
   - AI response drafts
   - Feature request extraction
   - Trend over time

8. **`/launch` — Launch Sequencer**
   - Timeline view: Week -2 → Launch → Week +2
   - Each step has status: Queued → In Progress → Done → Measured
   - Checklist items with AI-generated content attached
   - Covers: ASO, ads, communities, influencers, Product Hunt, social

9. **`/influencers` — Influencer Discovery**
   - Search by niche, platform, follower count
   - Mini CRM: contacted → responded → negotiating → deal → posted → results
   - AI-drafted outreach messages
   - Budget calculator (cash vs barter strategies)

10. **`/landing` — Landing Page Builder**
    - AI-generated landing page from app data
    - Template selector
    - Live preview
    - Export code or host on subdomain
    - UTM tracking built in

11. **`/settings` — Configuration**
    - App management (add/remove/switch apps)
    - API keys (OpenAI, Postiz, RevenueCat)
    - Notification preferences
    - AI model selection per task
    - Brand voice configuration

### "What If" Scenarios Built Into the UI

These are NOT hypothetical — build them as real interactive features:

1. **Keyword "What If" Simulator** (`/keywords`)
   - User changes title/subtitle → instantly see predicted rank changes
   - "What if I add 'AI' to my title?" → shows estimated impact on 10 keywords
   - Compare before/after side by side

2. **Budget "What If" Calculator** (`/dashboard`)
   - Slider: "If I spend $X/month on ads..."
   - Shows projected installs, trials, subscribers based on category benchmarks
   - Breaks down: $X on Apple Ads, $Y on Meta, $Z on TikTok content

3. **Launch Timing "What If"** (`/launch`)
   - "What if I launch on Tuesday vs Thursday?"
   - Shows historical Product Hunt data, App Store featuring patterns
   - Seasonal trends: "What if I wait until [holiday]?"

4. **Pricing "What If"** (`/dashboard`)
   - "What if I change from $4.99/mo to $9.99/mo?"
   - Shows elasticity estimates based on category data
   - Revenue projection curves

5. **Content "What If"** (`/tiktok`)
   - "What if I post 3x/day vs 1x/day?"
   - Shows projected reach based on TikTok algorithm patterns
   - Cost projection (API costs for image generation)

6. **Expansion "What If"** (`/keywords`)
   - "What if I localize to German/Japanese/Spanish?"
   - Shows keyword volume in those markets
   - Competitor density comparison
   - Estimated effort vs reward

7. **Churn "What If"** (`/reviews`)
   - "What if I fix the top complaint?"
   - Shows projected rating improvement
   - Estimated retention impact based on industry benchmarks

### Data Models (Supabase)

```sql
-- Core
apps (id, user_id, name, store_url, platform, icon_url, category, current_score, created_at)
app_metadata (id, app_id, title, subtitle, description, keywords, screenshots, version, scraped_at)

-- Keywords
keywords (id, app_id, term, volume, difficulty, current_rank, previous_rank, tracked_since)
keyword_history (id, keyword_id, rank, date)

-- Competitors
competitors (id, app_id, competitor_app_id, name, store_url, added_at)
competitor_changes (id, competitor_id, field_changed, old_value, new_value, detected_at)

-- Content
generated_assets (id, app_id, type, platform, content, metadata, created_at, performance_data)
-- types: ad_copy, social_post, slideshow, landing_page, email, review_response

-- TikTok
tiktok_posts (id, app_id, hook, caption, hashtags, slides_json, status, posted_at, views, likes, shares, comments)
tiktok_hooks (id, app_id, hook_text, formula_type, predicted_score, actual_views, created_at)

-- Reviews
reviews (id, app_id, source, rating, text, sentiment, topics, response, reviewed_at)

-- Influencers  
influencers (id, app_id, name, platform, handle, followers, niche, status, last_contacted, notes)

-- Launch
launch_plans (id, app_id, name, start_date, status, steps_json)

-- Activity
activity_feed (id, app_id, type, title, summary, data, actionable, action_type, created_at)

-- Settings
user_settings (id, user_id, brand_voice, preferred_models, notification_prefs, api_keys_encrypted)
```

### Mock Data Strategy
Since we don't have real API integrations yet, generate realistic mock data:
- Use a fake app "PhotoMagic" — AI photo editor
- 50 tracked keywords with realistic volumes and rankings
- 3 competitors with data
- 20 generated assets across platforms
- 15 TikTok posts with view counts following power law (1 viral, few good, most average)
- 50 reviews with mixed sentiment
- Activity feed with 2 weeks of mock entries

### AI Integration Points (Mocked for MVP)
Each AI call should be a utility function that currently returns mock data but is structured for real API calls later:

```typescript
// lib/ai.ts
export async function analyzeApp(storeUrl: string): Promise<AppAudit> { /* mock */ }
export async function generateKeywords(appData: AppData): Promise<Keyword[]> { /* mock */ }
export async function generateCopy(appData: AppData, platform: string): Promise<CopyVariation[]> { /* mock */ }
export async function brainstormHooks(appData: AppData, niche: string): Promise<Hook[]> { /* mock */ }
export async function generateSlideshow(hook: Hook, scene: SceneDescription): Promise<Slide[]> { /* mock */ }
export async function analyzeReviews(reviews: Review[]): Promise<ReviewAnalysis> { /* mock */ }
export async function suggestStrategy(appData: AppData, competitors: Competitor[]): Promise<Strategy> { /* mock */ }
export async function simulateKeywordChange(current: Metadata, proposed: Metadata): Promise<RankPrediction[]> { /* mock */ }
```

### Component Library (Build Custom)
Don't use shadcn. Build a minimal custom component set:
- `Card` — glass morphism subtle, not overdone
- `Score` — animated circular/arc progress for Growth Score
- `Feed` — virtual scrolling activity feed
- `Table` — sortable, filterable, with inline sparklines
- `Simulator` — before/after slider comparisons
- `Timeline` — horizontal launch sequencer
- `SlidePreview` — 6-slide grid with zoom
- `Chart` — use recharts or visx for data viz
- `Modal` — slide-over panels, not centered popups
- `Tabs` — platform selector with icons
- `Badge` — status indicators (🟢 🟡 🔴)
- `Command` — command palette (Cmd+K) for power users

### Key Interactions
1. **Onboarding flow**: Paste URL → loading animation with checkmarks → audit results → "Fix Everything" CTA
2. **Feed cards**: Compact by default → click to expand → action buttons revealed
3. **Keyword simulator**: Real-time preview as you type metadata changes
4. **TikTok studio**: Drag-and-drop slide reordering, live preview of text overlays
5. **Launch timeline**: Drag steps to reorder, click to expand details, progress bar

### Performance Requirements
- First paint < 1s
- All pages SSR or SSG where possible
- Images lazy loaded
- Virtual scrolling on long lists (feed, keywords, reviews)
- Optimistic UI updates

## Build Order (Overnight)
1. Next.js project setup + Tailwind + custom design tokens
2. Layout shell (sidebar + main content area)
3. Onboarding page (paste URL → audit animation → results)
4. Dashboard with Growth Score + Activity Feed
5. Keywords page with table + simulator
6. TikTok Content Studio
7. Copy Machine
8. Competitors War Room
9. Reviews Intelligence
10. Launch Sequencer
11. Influencers page
12. Landing Page Builder
13. Settings
14. Mock data seeding
15. Polish: animations, transitions, responsive

## Files to Reference
- `/home/alex_claudiu/clawd/zerotask/APP_MARKETING_PLATFORM.md` — full product spec
- `/home/alex_claudiu/clawd/skills/frontend-design/SKILL.md` — design guidelines
