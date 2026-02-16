import { NextRequest, NextResponse } from 'next/server';
import { getAppReviews } from '@/lib/scraper';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

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

    return NextResponse.json({ reviews, count: reviews.length });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
