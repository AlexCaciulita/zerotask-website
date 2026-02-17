import { NextRequest, NextResponse } from 'next/server';
import { scrapeAppStore, searchAppStore, getAppReviews, getKeywordSuggestions } from '@/lib/scraper';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// Note: This route is intentionally unauthenticated because:
// 1. It only proxies the free public iTunes Search API (no paid keys exposed)
// 2. The onboarding page (/) needs it before the user has signed up
//
// However, we rate-limit by IP to prevent DDoS abuse.
export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP address (no user ID available)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const rlResult = await rateLimit(ip, {
      prefix: 'scrape-public',
      maxRequests: 20,
      windowSeconds: 60,
    });

    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'lookup': {
        const result = await scrapeAppStore(params.url);
        if (!result) return NextResponse.json({ error: 'App not found' }, { status: 404 });
        return NextResponse.json(result);
      }
      case 'search': {
        const results = await searchAppStore(params.term, params.limit);
        return NextResponse.json({ results });
      }
      case 'reviews': {
        const reviews = await getAppReviews(params.appId, params.page);
        return NextResponse.json({ reviews });
      }
      case 'keywords': {
        const suggestions = await getKeywordSuggestions(params.term);
        return NextResponse.json({ suggestions });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
