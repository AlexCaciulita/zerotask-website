import { NextRequest, NextResponse } from 'next/server';
import { getAppReviews } from '@/lib/scraper';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { rateLimit, getScrapeRateLimit, rateLimitHeaders, type PlanTier } from '@/lib/rate-limit';
import { getServerCredits } from '@/lib/credits-server';
import { createFeedEvent } from '@/lib/feed-server';

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

    const { appId, country } = await req.json();
    if (!appId) return NextResponse.json({ error: 'appId required' }, { status: 400 });

    // Fetch multiple pages for more reviews
    const [p1, p2] = await Promise.all([
      getAppReviews(appId, 1),
      getAppReviews(appId, 2),
    ]);

    const allReviews = [...p1, ...p2];
    const reviews = allReviews.map((r, i) => ({
      id: `real-${i}`,
      author: r.author,
      rating: r.rating,
      title: r.title,
      text: r.content,
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
    }));

    // Fire-and-forget feed event
    if (reviews.length > 0) {
      createFeedEvent({
        user_id: auth.user.id,
        type: 'review',
        title: `${reviews.length} reviews fetched`,
        summary: `Fetched ${reviews.length} real App Store reviews.`,
        badge_label: `${reviews.length} new`,
        badge_variant: 'success',
      }).catch(() => {});
    }

    return NextResponse.json({ reviews, count: reviews.length });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
