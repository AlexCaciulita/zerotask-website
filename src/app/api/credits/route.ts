import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { getServerCredits, getCreditWarningLevel } from '@/lib/credits-server';
import { rateLimit, getReadRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

// GET /api/credits — fetch current credit balance
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    // Light rate limit (60 req/min) since Sidebar polls this
    const rlResult = await rateLimit(auth.user.id, getReadRateLimit());
    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    const credits = await getServerCredits(auth.user.id);
    const warning = getCreditWarningLevel(credits);

    return NextResponse.json({
      remaining: credits.remaining,
      monthly: credits.monthly,
      purchased: credits.purchased,
      used: credits.used,
      plan: credits.plan,
      warning,
    });
  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}
