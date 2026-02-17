import { NextRequest, NextResponse } from 'next/server';
import { createTikTokSlideshow, createTikTokSlideshowWithKey } from '@/lib/postiz';
import { authenticateRequest, isAuthError } from '@/lib/api-auth';
import { deductCredit, CreditExhaustedError, getServerCredits } from '@/lib/credits-server';
import { rateLimit, getImageRateLimit, rateLimitHeaders, type PlanTier } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // ── Authentication ──────────────────────────────────────────
    const auth = await authenticateRequest(req);
    if (isAuthError(auth)) return auth;

    // ── Rate Limiting ───────────────────────────────────────────
    const credits = await getServerCredits(auth.user.id);
    const plan = (credits.plan || 'free') as PlanTier;
    const rlResult = await rateLimit(auth.user.id, getImageRateLimit(plan));

    if (!rlResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.', retryAfter: Math.ceil((rlResult.reset - Date.now()) / 1000) },
        { status: 429, headers: rateLimitHeaders(rlResult) }
      );
    }

    // ── Parse + validate BEFORE deducting credits ──────────────
    const { imageUrls, caption, hashtags, apiKey, integrationId: bodyIntegrationId } = await req.json();

    const integrationId = bodyIntegrationId || process.env.POSTIZ_TIKTOK_INTEGRATION_ID;
    if (!integrationId) {
      return NextResponse.json(
        { error: 'TikTok integration not configured. Please connect your TikTok account in Settings.' },
        { status: 422 }
      );
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // ── Credit Deduction ────────────────────────────────────────
    try {
      await deductCredit(auth.user.id, 'TikTok slideshow post');
    } catch (error) {
      if (error instanceof CreditExhaustedError) {
        return NextResponse.json(
          {
            error: 'No credits remaining',
            nextReset: error.nextReset,
            upgradeUrl: '/pricing',
          },
          { status: 402 }
        );
      }
      throw error;
    }

    // Fetch each image URL and convert to buffer
    const buffers: Buffer[] = [];
    for (const url of imageUrls) {
      let fetchUrl = url;
      if (url.startsWith('/')) {
        const origin = req.nextUrl.origin;
        fetchUrl = `${origin}${url}`;
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to fetch image: ${url}` }, { status: 500 });
      }
      const arrayBuffer = await res.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    }

    // Use user's API key if provided, otherwise fall back to env var
    let result;
    if (apiKey) {
      result = await createTikTokSlideshowWithKey(
        buffers,
        caption || 'Check this out!',
        hashtags || ['fyp'],
        integrationId,
        apiKey,
        true
      );
    } else {
      result = await createTikTokSlideshow(
        buffers,
        caption || 'Check this out!',
        hashtags || ['fyp'],
        integrationId,
        true
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('TikTok post error:', error);
    const message = error instanceof Error ? error.message : 'Failed to post to TikTok';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
