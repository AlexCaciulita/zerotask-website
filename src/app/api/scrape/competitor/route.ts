import { NextRequest, NextResponse } from 'next/server';
import { searchApps, lookupApp, extractAppIdFromUrl, type AppStoreData } from '@/lib/app-store-scraper';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { rateLimit, getScrapeRateLimit, rateLimitHeaders, type PlanTier } from '@/lib/rate-limit';
import { getServerCredits } from '@/lib/credits-server';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    // Rate limiting
    const credits = await getServerCredits(auth.user.id);
    const plan = (credits.plan || 'free') as PlanTier;
    const rlResult = await rateLimit(auth.user.id, getScrapeRateLimit(plan));
    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    let results: AppStoreData[] = [];

    // Check if it's a URL
    if (query.includes('apps.apple.com') || query.includes('itunes.apple.com')) {
      const appId = extractAppIdFromUrl(query);
      if (appId) {
        const app = await lookupApp(appId);
        if (app) results = [app];
      }
    }

    // Fall back to search
    if (results.length === 0) {
      results = await searchApps(query);
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'No apps found', results: [] });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Competitor scrape error:', err);
    return NextResponse.json({ error: 'Scraping failed' }, { status: 500 });
  }
}
