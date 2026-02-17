# ZeroTask App

## Project Overview
Next.js app marketing SaaS platform. Backend integrated with Supabase (auth + DB) and Stripe (payments).

**Stack**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Recharts, Lucide, Supabase, Stripe

## Session Continuity

Every Claude session must follow this protocol:

1. **Start of session**: Read this file (`CLAUDE.md`) and `memory/status.md` to understand project context and pick up where the last session left off.
2. **Check rules**: Read `.claude/rules/` for topic-specific context and workflow guidelines.
3. **During session**: Work on tasks, make decisions, and track progress.
4. **End of session**: When the user says "update memory", update `memory/status.md` with:
   - What was done this session
   - What's currently in progress
   - What should be tackled next
   - Any blockers or open questions

## Key Architecture
- Every page is `'use client'` — no SSR currently
- **Auth**: Supabase auth with Bearer token on all API routes (via `src/lib/api-auth.ts`)
- **Database**: Supabase with RLS on all 10 tables (35 policies). Webhook uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.
- **Payments**: Stripe subscriptions (Pro/Creator) + credit packs (10/50/100)
- **API Client**: All client-side fetches use `apiFetch()` from `src/lib/api-client.ts`
- **Key server files**: `src/lib/supabase-server.ts`, `src/lib/api-auth.ts`, `src/lib/api-client.ts`
- Design system uses Tailwind v4 `@theme inline` tokens in `globals.css`
- Fonts: Instrument Sans (body) + Instrument Serif (display headings)
- Sidebar hardcodes "PhotoMagic" app name
- Components: `Sidebar`, `FeedCard`, `PageHeader`, `GrowthScore`, `Badge`

## Pages (12)
`/` onboarding, `/dashboard`, `/keywords`, `/tiktok`, `/copy`, `/competitors`, `/reviews`, `/launch`, `/influencers`, `/landing`, `/settings`, `/scenarios` (orphaned — not in sidebar nav)

## Known Issues
- Global `*` CSS transition in globals.css (performance concern)
- Sidebar collapse doesn't adjust main content offset
- `/scenarios` page not linked in sidebar navigation
- Missing env var: POSTIZ_TIKTOK_INTEGRATION_ID
